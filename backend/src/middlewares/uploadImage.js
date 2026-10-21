import path from "node:path";
import BadRequestError from "../errors/BadRequestError.js";
import BaseError from "../errors/BaseError.js";
import { detectarMimeImagem } from "../utils/imagemBinaria.js";
import { lerCabecalho } from "../utils/arquivos.js";
import { UPLOAD_DIR, UPLOAD_FOLDERS } from "../config/uploadDir.js";
import { PASTAS, LIMITES, URL_PREFIXO, UPLOAD_ROOT } from "../config/storage.js";
import multipart from "./multipart.js";

const MAX_SIZE = 10 * 1024 * 1024;
const TIPOS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

export function uploadImagem(pasta, { opcional = false, aceitarArquivo = false } = {}) {
    if (!UPLOAD_FOLDERS.includes(pasta) || pasta === "referencias") throw new Error("Pasta de upload inválida.");
    return multipart({
        opcional,
        maxFileSize: aceitarArquivo ? Math.max(MAX_SIZE, LIMITES.imagem) : MAX_SIZE,
        selecionar(name, info) {
            const arquivo = name === "arquivo" && aceitarArquivo;
            if (name !== "imagem" && !arquivo) throw new BadRequestError("Envie um arquivo no campo imagem.");
            const mime = info.mimeType;
            if (!TIPOS[mime] || (arquivo && mime === "image/gif")) {
                const error = new BaseError("Formato de imagem não suportado.", arquivo ? 415 : 400);
                if (arquivo) error.code = "UNSUPPORTED_MEDIA_TYPE";
                throw error;
            }
            return { pasta: arquivo ? PASTAS.imagem : path.join(UPLOAD_DIR, pasta),
                raiz: arquivo ? UPLOAD_ROOT : UPLOAD_DIR, ext: TIPOS[mime], mime,
                limite: arquivo ? LIMITES.imagem : MAX_SIZE,
                url: arquivo ? URL_PREFIXO.imagem : "/uploads/" + pasta };
        },
        async validar(file) {
            if (detectarMimeImagem(await lerCabecalho(file.path, 32)) !== file.mimetype) {
                const error = new BaseError("O conteúdo da imagem não corresponde ao formato declarado.", file.fieldname === "arquivo" ? 415 : 400);
                if (file.fieldname === "arquivo") error.code = "UNSUPPORTED_MEDIA_TYPE";
                throw error;
            }
        },
        finalizar(body, file) {
            if (!file && (!opcional || body.imagem)) throw new BadRequestError("Envie um arquivo no campo imagem.");
            if (opcional && body.imagem === "") delete body.imagem;
        },
    });
}
