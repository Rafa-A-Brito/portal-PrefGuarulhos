import multipart from "./multipart.js";
import BaseError from "../errors/BaseError.js";
import BadRequestError from "../errors/BadRequestError.js";
import { LIMITES, PASTAS, UPLOAD_ROOT, URL_PREFIXO } from "../config/storage.js";
import { TIPOS_DOCUMENTO, TIPOS_IMAGEM, detectarMimeReal, lerCabecalho } from "../utils/arquivos.js";

export default function uploadArquivo(tipo) {
    const tipos = tipo === "imagem" ? TIPOS_IMAGEM : TIPOS_DOCUMENTO;
    return multipart({
        maxFileSize: LIMITES[tipo], fields: 12, fieldSize: 16 * 1024, overhead: 256 * 1024,
        selecionar(name, info) {
            if (name !== "arquivo") throw new BadRequestError("Envie um arquivo no campo arquivo.");
            if (!tipos[info.mimeType]) {
                throw Object.assign(new BaseError("Formato não suportado.", 415), { code: "UNSUPPORTED_MEDIA_TYPE" });
            }
            return { pasta: PASTAS[tipo], raiz: UPLOAD_ROOT, ext: tipos[info.mimeType], mime: info.mimeType,
                limite: LIMITES[tipo], url: URL_PREFIXO[tipo] };
        },
        async validar(file) {
            if (detectarMimeReal(await lerCabecalho(file.path)) !== file.mimetype) {
                throw Object.assign(new BaseError("O conteúdo do arquivo não corresponde a um formato suportado.", 415), { code: "UNSUPPORTED_MEDIA_TYPE" });
            }
        },
    });
}
