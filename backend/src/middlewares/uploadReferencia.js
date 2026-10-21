import { createReadStream } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "../config/uploadDir.js";
import { lerCabecalho } from "../utils/arquivos.js";
import BadRequestError from "../errors/BadRequestError.js";
import multipart from "./multipart.js";

const MIMES = {
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".odt": ["application/vnd.oasis.opendocument.text"],
    ".txt": ["text/plain"],
    ".md": ["text/markdown", "text/x-markdown", "text/plain"],
};


async function validarConteudo(file, { ext }) {
    const buffer = await lerCabecalho(file.path);
    let valido;
    if (ext === ".pdf") valido = buffer.subarray(0, 5).toString() === "%PDF-";
    else if (ext === ".doc") valido = buffer.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
    else if ([".docx", ".odt"].includes(ext)) valido = buffer.subarray(0, 4).equals(Buffer.from("504b0304", "hex"));
    else {
        valido = true;
        const decoder = new TextDecoder("utf-8", { fatal: true });
        try {
            for await (const chunk of createReadStream(file.path)) {
                if (chunk.includes(0)) { valido = false; break; }
                decoder.decode(chunk, { stream: true });
            }
            decoder.decode();
        } catch { valido = false; }
    }
    if (!valido) throw new BadRequestError("O conteúdo do arquivo não corresponde ao formato informado.");
}

const upload = multipart({
    maxFileSize: 10 * 1024 * 1024, fields: 2, fieldSize: 16 * 1024, overhead: 64 * 1024,
    selecionar(name, info) {
        if (name !== "arquivo") throw new BadRequestError("Envie apenas um arquivo.");
        const nome = info.filename;
        if (!nome || nome.length > 200 || /[\\/\x00-\x1f\x7f:]/.test(nome) || nome === "." || nome === "..") {
            throw new BadRequestError("Nome de arquivo inválido (máximo de 200 caracteres).");
        }
        const ext = path.extname(nome).toLowerCase(), mimes = MIMES[ext];
        if (!mimes) throw new BadRequestError("Use PDF, DOC, DOCX, ODT, TXT ou MD.");
        if (info.mimeType && info.mimeType !== "application/octet-stream" && !mimes.includes(info.mimeType)) {
            throw new BadRequestError("O tipo do arquivo não corresponde à extensão.");
        }
        return { raiz: UPLOAD_DIR, pasta: path.join(UPLOAD_DIR, "referencias"), ext,
            mime: mimes[0], limite: 10 * 1024 * 1024, url: "/uploads/referencias" };
    },
    validar: validarConteudo,
    finalizar(fields, file) {
        if (Object.keys(fields).some(key => !["descricao", "url"].includes(key))) throw new BadRequestError("Campo de referência inválido ou duplicado.");
        if (!file || Object.hasOwn(fields, "url")) throw new BadRequestError("Envie um arquivo ou um link, nunca ambos.");
    },
});

export default function uploadReferencia(req, res, next) {
    if (/^application\/json(?:;|$)/i.test(req.get("content-type") || "")) return next();
    return upload(req, res, next);
}
