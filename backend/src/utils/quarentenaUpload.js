import { caminhoArquivoUpload } from "./arquivoUpload.js";
import { moverParaQuarentena, restaurarDaQuarentena, apagarArquivoGerenciado, registrarPendenciaArquivo } from "./arquivos.js";

function pendencia(acao, arquivo, error) {
    registrarPendenciaArquivo(acao, arquivo, error);
}

// A função recebida abre a transação, obtém os locks e só então chama preparar.
// A promise da transação precisa resolver (COMMIT) antes de remover os bytes.
export async function comQuarentenaUpload(operacao) {
    let arquivo;
    let result;
    try {
        result = await operacao(async url => {
            const original = caminhoArquivoUpload(url);
            try { arquivo = await moverParaQuarentena(original); }
            catch (error) { pendencia("mover_quarentena", { original, registroExcluido: false }, error); throw error; }
        });
    } catch (error) {
        if (arquivo) {
            try { await restaurarDaQuarentena(arquivo); }
            catch (restoreError) { pendencia("restaurar", { ...arquivo, registroExcluido: false }, restoreError); }
        }
        throw error;
    }
    if (arquivo) {
        try {
            await apagarArquivoGerenciado(arquivo.quarentena);
        } catch (error) { pendencia("limpar_apos_commit", { ...arquivo, registroExcluido: true }, error); }
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
