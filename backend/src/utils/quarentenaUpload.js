import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { UPLOAD_DIR } from "../config/uploadDir.js";
import { caminhoArquivoUpload } from "./arquivoUpload.js";

const raizQuarentena = path.join(UPLOAD_DIR, ".quarentena");
const inseguro = () => Object.assign(new Error("Caminho de mídia inseguro."), { code: "INVALID_MEDIA_PATH" });

async function validarPasta(pasta) {
    const raizReal = await fs.realpath(UPLOAD_DIR);
    if (await fs.realpath(pasta) !== path.join(raizReal, path.basename(pasta))) throw inseguro();
}

async function preparar(url) {
    const original = caminhoArquivoUpload(url);
    if (!original) return null; // URL externa/não gerenciada nunca é removida.
    try {
        await validarPasta(path.dirname(original));
        const stat = await fs.lstat(original);
        if (!stat.isFile() || stat.isSymbolicLink()) throw inseguro();
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
    await fs.mkdir(raizQuarentena, { recursive: true, mode: 0o700 });
    await validarPasta(raizQuarentena);
    const quarentena = path.join(raizQuarentena, `${randomUUID()}-${path.basename(original)}`);
    await fs.rename(original, quarentena);
    return { original, quarentena };
}

async function restaurar(arquivo) {
    await validarPasta(path.dirname(arquivo.original));
    await validarPasta(raizQuarentena);
    // Não sobrescrever arquivo que reapareceu. A cópia privada fica disponível
    // para recuperação se a restauração falhar, inclusive após erro de commit.
    await fs.copyFile(arquivo.quarentena, arquivo.original, fs.constants.COPYFILE_EXCL);
    await fs.unlink(arquivo.quarentena);
}

function pendencia(acao, arquivo, error) {
    console.error("Pendência de recuperação de mídia.", { acao, ...arquivo, code: error.code });
}

// A função recebida abre a transação, obtém os locks e só então chama preparar.
// A promise da transação precisa resolver (COMMIT) antes de remover os bytes.
export async function comQuarentenaUpload(operacao) {
    let arquivo;
    let result;
    try {
        result = await operacao(async url => { arquivo = await preparar(url); });
    } catch (error) {
        if (arquivo) {
            try { await restaurar(arquivo); }
            catch (restoreError) { pendencia("restaurar", arquivo, restoreError); }
        }
        throw error;
    }
    if (arquivo) {
        try {
            await validarPasta(raizQuarentena);
            await fs.unlink(arquivo.quarentena);
        } catch (error) { pendencia("limpar_apos_commit", arquivo, error); }
    }
    return result;
}

// Sync pode preservar uma imagem tanto no canônico quanto no legado arquivado.
// Nunca remover os bytes se outra relação ainda utiliza a mesma URL.
export async function uploadCompartilhado(tx, url) {
    const [row] = await tx.$queryRaw`
        SELECT (
            (SELECT count(*) FROM patrimonio_imagens WHERE url = ${url}) +
            (SELECT count(*) FROM patrimonio_documentos WHERE url = ${url}) +
            (SELECT count(*) FROM exposicao WHERE imagem_url = ${url}) +
            (SELECT count(*) FROM novidade WHERE imagem_url = ${url})
        ) AS total
    `;
    return Number(row?.total ?? 0) > 1;
}
