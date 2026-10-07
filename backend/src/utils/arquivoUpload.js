import path from "node:path";
import { promises as fs } from "node:fs";

import { UPLOAD_DIR as raizUpload, UPLOAD_FOLDERS } from "../config/uploadDir.js";
const uploadPattern = new RegExp("^/uploads/(" + UPLOAD_FOLDERS.join("|") + ")/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|webp|gif)$");

// Somente arquivos diretamente nas pastas de upload permitidas. Não aceita URLs,
// percent-encoding, separadores extras, "." ou "..", nem caminhos absolutos.
export function caminhoArquivoUpload(url) {
    if (typeof url !== "string" || !uploadPattern.test(url)) return null;
    const destino = path.resolve(raizUpload, url.slice("/uploads/".length));
    const relativo = path.relative(raizUpload, destino);
    return relativo.startsWith("..") || path.isAbsolute(relativo) ? null : destino;
}

export async function removerArquivoUpload(url) {
    const destino = caminhoArquivoUpload(url);
    if (!destino) return false;
    try {
        const [raizReal, pastaReal] = await Promise.all([
            fs.realpath(raizUpload), fs.realpath(path.dirname(destino)),
        ]);
        // Recusa pastas redirecionadas por links simbólicos/junctions.
        if (pastaReal !== path.join(raizReal, path.basename(path.dirname(destino)))) return false;
        const stat = await fs.lstat(destino);
        if (!stat.isFile() || stat.isSymbolicLink()) return false;
        await fs.unlink(destino);
        return true;
    } catch (error) {
        if (error.code !== "ENOENT") console.error("Falha ao limpar imagem de conteúdo.", { code: error.code });
        // Uma falha de filesystem após COMMIT não pode invalidar o registro salvo.
        return false;
    }
}
