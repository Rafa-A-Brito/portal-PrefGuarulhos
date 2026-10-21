import api from "./api";
import { normalizarReferencia } from "./patrimoniosApi";

export const EXTENSOES_REFERENCIA = [".pdf", ".doc", ".docx", ".odt", ".txt", ".md"];
export const TAMANHO_MAX_REFERENCIA_MB = 10;

export function validarArquivoReferencia(arquivo) {
  if (!arquivo || !EXTENSOES_REFERENCIA.some(ext => arquivo.name.toLowerCase().endsWith(ext))) {
    return `Formato não aceito. Use ${EXTENSOES_REFERENCIA.join(", ")}.`;
  }
  if (arquivo.size === 0) return "O arquivo está vazio.";
  if (arquivo.size > TAMANHO_MAX_REFERENCIA_MB * 1024 * 1024) return "O arquivo passa de 10 MB.";
  return null;
}

export function validarLinkReferencia(texto) {
  try {
    const url = new URL(texto.trim());
    return ["http:", "https:"].includes(url.protocol) ? null : "O link precisa começar com http:// ou https://.";
  } catch { return "Informe um link válido (ex.: https://drive.google.com/...)."; }
}

export async function enviarReferenciaPatrimonio(patrimonioId, { arquivo, url, descricao } = {}) {
  if (Boolean(arquivo) === Boolean(url)) throw new Error("Envie um arquivo ou um link, nunca ambos.");
  const problema = arquivo ? validarArquivoReferencia(arquivo) : validarLinkReferencia(url);
  if (problema) throw new Error(problema);
  const rota = `/admin/patrimonios/${patrimonioId}/referencias`;
  let resposta;
  if (arquivo) {
    const dados = new FormData();
    dados.append("arquivo", arquivo);
    if (descricao) dados.append("descricao", descricao);
    resposta = await api.post(rota, dados, {
      headers: { "Content-Type": "multipart/form-data" }, timeout: 60000,
    });
  } else {
    resposta = await api.post(rota, { url: url.trim(), ...(descricao && { descricao }) });
  }
  return normalizarReferencia(resposta.data.data);
}

export async function removerReferenciaPatrimonio(patrimonioId, referenciaId) {
  await api.delete(`/admin/patrimonios/${patrimonioId}/referencias/${referenciaId}`);
}
