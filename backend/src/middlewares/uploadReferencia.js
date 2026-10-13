import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOAD_DIR } from "../config/uploadDir.js";
import BadRequestError from "../errors/BadRequestError.js";
import BaseError from "../errors/BaseError.js";

const MAX_SIZE = 10 * 1024 * 1024;
const MIMES = {
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".odt": ["application/vnd.oasis.opendocument.text"],
    ".txt": ["text/plain"],
    ".md": ["text/markdown", "text/x-markdown", "text/plain"],
};

function validarConteudo(buffer, ext) {
    if (ext === ".pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
    if (ext === ".doc") return buffer.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
    if ([".docx", ".odt"].includes(ext)) return buffer.subarray(0, 4).equals(Buffer.from("504b0304", "hex"));
    try { new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
    catch { return false; }
    return !buffer.includes(0);
}

async function processar(req, body, contentType) {
    let form;
    try { form = await new Response(body, { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new BadRequestError("Multipart inválido."); }
    const fields = {};
    let arquivo;
    for (const [key, value] of form) {
        if (key === "arquivo") {
            if (arquivo || typeof value === "string") throw new BadRequestError("Envie apenas um arquivo.");
            arquivo = value;
        } else {
            if (!["descricao", "url"].includes(key) || typeof value !== "string" || key in fields) {
                throw new BadRequestError("Campo de referência inválido ou duplicado.");
            }
            fields[key] = value;
        }
    }
    if (!arquivo || Object.hasOwn(fields, "url")) throw new BadRequestError("Envie um arquivo ou um link, nunca ambos.");
    if (!arquivo.size) throw new BadRequestError("O arquivo está vazio.");
    if (arquivo.size > MAX_SIZE) throw new BaseError("O arquivo deve ter no máximo 10 MB.", 413);
    const nome = arquivo.name;
    if (!nome || nome.length > 200 || /[\\/\x00-\x1f\x7f:]/.test(nome) || nome === "." || nome === "..") {
        throw new BadRequestError("Nome de arquivo inválido (máximo de 200 caracteres).");
    }
    const ext = path.extname(nome).toLowerCase();
    const mimes = MIMES[ext];
    if (!mimes) throw new BadRequestError("Use PDF, DOC, DOCX, ODT, TXT ou MD.");
    if (arquivo.type && arquivo.type !== "application/octet-stream" && !mimes.includes(arquivo.type)) {
        throw new BadRequestError("O tipo do arquivo não corresponde à extensão.");
    }
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    if (!validarConteudo(buffer, ext)) throw new BadRequestError("O conteúdo do arquivo não corresponde ao formato informado.");
    const pasta = path.join(UPLOAD_DIR, "referencias");
    await fs.mkdir(pasta, { recursive: true });
    const [raizReal, pastaReal] = await Promise.all([fs.realpath(UPLOAD_DIR), fs.realpath(pasta)]);
    if (pastaReal !== path.join(raizReal, "referencias")) throw new BadRequestError("Pasta de referências inválida.");
    const filename = `${randomUUID()}${ext}`;
    const destino = path.join(pasta, filename);
    const handle = await fs.open(destino, "wx", 0o600);
    req.file = { originalname: nome, filename, mimetype: mimes[0], size: buffer.length, url: `/uploads/referencias/${filename}` };
    try { await handle.writeFile(buffer); }
    finally { await handle.close(); }
    const stat = await fs.lstat(destino);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new BadRequestError("Arquivo de referência inválido.");
    req.body = fields;
}

// Parser próprio: o upload de imagens aceita outros campos, MIME e diretórios.
// Só grava depois de validar todo o multipart, inclusive campos duplicados.
export default function uploadReferencia(req, _res, next) {
    const contentType = req.get("content-type") || "";
    if (/^application\/json(?:;|$)/i.test(contentType)) return next();
    if (!/^multipart\/form-data;/i.test(contentType)) return next(new BadRequestError("Envie JSON ou multipart/form-data."));
    let chunks = [], total = 0, finished = false;
    req.on("data", chunk => {
        if (finished) return;
        total += chunk.length;
        if (total > MAX_SIZE + 64 * 1024) {
            finished = true;
            chunks = [];
            req.resume();
            return next(new BaseError("O upload deve ter no máximo 10 MB.", 413));
        }
        chunks.push(chunk);
    });
    req.on("error", error => { if (!finished) { finished = true; next(error); } });
    req.on("aborted", () => { finished = true; chunks = []; });
    req.on("end", () => {
        if (finished) return;
        finished = true;
        processar(req, Buffer.concat(chunks), contentType).then(() => next(), next);
    });
}
