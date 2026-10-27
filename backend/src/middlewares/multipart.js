import busboy from "busboy";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import BadRequestError from "../errors/BadRequestError.js";
import BaseError from "../errors/BaseError.js";
import { logEvent } from "../utils/logger.js";

const invalido = () => new BadRequestError("Multipart inválido ou com campos duplicados.");
const grande = () => Object.assign(new BaseError("Arquivo ou corpo multipart excede o tamanho máximo permitido.", 413), { code: "FILE_TOO_LARGE" });

// Cada contrato escolhe campos, tipos, destino e limite; só o transporte é comum.
export default function multipart({ maxFileSize, fields = 24, fieldSize = 256 * 1024,
    overhead = 1024 * 1024, selecionar, validar, finalizar, opcional = false }) {
    return async (req, _res, next) => {
        const type = req.get("content-type") || "";
        if (!/^multipart\//i.test(type) && opcional) return next();
        if (!/^multipart\/form-data(?:;|$)/i.test(type)) return next(invalido());
        const maxBody = maxFileSize + overhead;
        if (Number(req.headers["content-length"]) > maxBody) { req.resume(); return next(grande()); }
        let parser;
        try {
            parser = busboy({ headers: req.headers, preservePath: true, defParamCharset: "utf8",
                limits: { fileSize: maxFileSize + 1, files: 1, fields, fieldSize, fieldNameSize: 100, parts: fields + 1, headerPairs: 100 } });
        } catch { return next(invalido()); }
        req.body = Object.create(null);
        const created = [], tasks = [], streams = new Set();
        let failure, total = 0, file;
        const fail = error => {
            if (failure) return;
            failure = error;
            req.unpipe(parser);
            req.resume();
            // Busboy pode estar emitindo um evento: destruir fora dessa pilha.
            queueMicrotask(() => {
                for (const stream of streams) stream.destroy(error);
                parser.destroy(error);
            });
        };
        const count = chunk => { total += chunk.length; if (total > maxBody) fail(grande()); };
        const aborted = () => fail(invalido());
        req.on("data", count);
        req.once("aborted", aborted);
        req.once("error", aborted);
        parser.on("field", (name, value, info) => {
            if (info.nameTruncated || info.valueTruncated || Object.hasOwn(req.body, name) ||
                ["__proto__", "constructor", "prototype"].includes(name) || name.length > 100) return fail(invalido());
            req.body[name] = value;
        });
        parser.on("file", (name, stream, info) => {
            streams.add(stream);
            stream.on("error", () => {});
            stream.once("limit", () => fail(grande()));
            const task = (async () => {
                const config = selecionar(name, info);
                if (failure) return;
                await fs.mkdir(config.pasta, { recursive: true });
                const [root, folder] = await Promise.all([fs.realpath(config.raiz), fs.realpath(config.pasta)]);
                if (folder !== path.join(root, path.relative(config.raiz, config.pasta))) throw invalido();
                const filename = `${randomUUID()}${config.ext}`;
                const destino = path.join(config.pasta, filename);
                let handle;
                let size = 0;
                try {
                    // Registrar apenas após criação exclusiva bem-sucedida.
                    handle = await fs.open(destino, "wx", 0o600);
                    created.push(destino);
                    for await (const chunk of stream) {
                        if (failure) throw failure;
                        size += chunk.length;
                        if (size > config.limite) throw grande();
                        // FileHandle.writeFile recebe só este chunk, nunca o corpo inteiro.
                        await handle.writeFile(chunk);
                    }
                    if (failure) throw failure;
                    if (!size || stream.truncated) throw invalido();
                    file = { fieldname: name, originalname: info.filename, filename,
                        path: destino, size, mimetype: config.mime, url: `${config.url}/${filename}`,
                        relativePath: `${path.basename(config.pasta)}/${filename}` };
                } finally { await handle?.close(); }
                await validar(file, config);
            })().catch(fail);
            tasks.push(task);
        });
        for (const event of ["filesLimit", "fieldsLimit", "partsLimit"]) parser.once(event, () => fail(invalido()));
        const closed = new Promise(resolve => {
            parser.once("error", () => fail(invalido()));
            parser.once("close", resolve);
        });
        req.pipe(parser);
        if (req.aborted) aborted();
        await closed;
        await Promise.all(tasks);
        req.off("data", count);
        req.off("aborted", aborted);
        req.off("error", aborted);
        try {
            if (failure) throw failure;
            await finalizar?.(req.body, file);
            req.file = file;
            return next();
        } catch (error) {
            for (const destino of created) {
                try { await fs.unlink(destino); }
                catch (cleanup) { if (cleanup.code !== "ENOENT") logEvent("error", "UPLOAD_CLEANUP_FAILED", {
                    operation: "limpar_upload", arquivo: path.basename(destino), pasta: path.basename(path.dirname(destino)),
                }, cleanup); }
            }
            delete req.file;
            next(error);
        }
    };
}
