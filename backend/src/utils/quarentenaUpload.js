import { caminhoArquivoUpload } from "./arquivoUpload.js";
import { moverParaQuarentena, restaurarDaQuarentena, apagarArquivoGerenciado } from "./arquivos.js";

function pendencia(acao, arquivo, error) {
    console.error("Pendência de recuperação de mídia.", { acao, ...arquivo, code: error.code });
}

// A função recebida abre a transação, obtém os locks e só então chama preparar.
// A promise da transação precisa resolver (COMMIT) antes de remover os bytes.
export async function comQuarentenaUpload(operacao) {
    let arquivo;
    let result;
    try {
        result = await operacao(async url => { arquivo = await moverParaQuarentena(caminhoArquivoUpload(url)); });
    } catch (error) {
        if (arquivo) {
            try { await restaurarDaQuarentena(arquivo); }
            catch (restoreError) { pendencia("restaurar", arquivo, restoreError); }
        }
        throw error;
    }
    if (arquivo) {
        try {
            await apagarArquivoGerenciado(arquivo.quarentena);
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
