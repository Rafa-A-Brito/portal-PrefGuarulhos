import path from "node:path";
import { promises as fs } from "node:fs";

import { UPLOAD_DIR as raizUpload, UPLOAD_FOLDERS } from "../config/uploadDir.js";
import { PASTAS, URL_PREFIXO, UPLOAD_ROOT } from "../config/storage.js";
const referenciaPattern = /^\/uploads\/referencias\/[a-zA-Z0-9_-]+\.(pdf|doc|docx|odt|txt|md)$/;
const uploadPattern = new RegExp("^/uploads/(" + UPLOAD_FOLDERS.filter(pasta => pasta !== "referencias").join("|") + ")/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|webp|gif)$");

// Somente arquivos diretamente nas pastas de upload permitidas. Não aceita URLs,
// percent-encoding, separadores extras, "." ou "..", nem caminhos absolutos.
export function caminhoArquivoUpload(url) {
    if (typeof url !== "string") return null;
    for (const [tipo, prefixo] of Object.entries(URL_PREFIXO)) {
        if (!url.startsWith(`${prefixo}/`)) continue;
        const nome = url.slice(prefixo.length + 1);
        const extensoes = tipo === "imagem" ? "jpg|jpeg|png|webp|gif" : "pdf";
        if (!new RegExp(`^[a-zA-Z0-9_-]+\\.(${extensoes})$`).test(nome)) return null;
        return path.join(PASTAS[tipo], nome);
    }
    if (typeof url !== "string" || (!uploadPattern.test(url) && !referenciaPattern.test(url))) return null;
    const destino = path.resolve(raizUpload, url.slice("/uploads/".length));
    const relativo = path.relative(raizUpload, destino);
    return relativo.startsWith("..") || path.isAbsolute(relativo) ? null : destino;
}

export async function removerArquivoUpload(url) {
    const destino = caminhoArquivoUpload(url);
    if (!destino) return false;
    try {
        const raiz = url.startsWith("/api/uploads/") ? UPLOAD_ROOT : raizUpload;
        const [raizReal, pastaReal] = await Promise.all([
            fs.realpath(raiz), fs.realpath(path.dirname(destino)),
        ]);
        // Recusa pastas redirecionadas por links simbólicos/junctions.
        if (pastaReal !== path.join(raizReal, path.basename(path.dirname(destino)))) return false;
        const stat = await fs.lstat(destino);
        if (!stat.isFile() || stat.isSymbolicLink()) return false;
        await fs.unlink(destino);
        return true;
    } catch (error) {
        if (error.code !== "ENOENT") console.error("Falha ao limpar arquivo de upload.", { code: error.code });
        // Uma falha de filesystem após COMMIT não pode invalidar o registro salvo.
        return false;
    }
}
