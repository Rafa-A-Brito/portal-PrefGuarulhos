/**
 * Camada do front para a IA (Gemini). Segue o IA.md:
 *  - a chave do Gemini NUNCA fica aqui nem em VITE_*; quem chama o Gemini é
 *    o BACKEND. O front só envia o arquivo ao backend e recebe o texto;
 *  - a IA gera um RASCUNHO: o texto cai num campo editável e a pessoa revisa
 *    antes de salvar (informação de patrimônio precisa ser conferida);
 *  - nada de chamada automática: só ao clicar em "Gerar resumo com IA";
 *  - o mesmo arquivo não é enviado duas vezes na mesma sessão (cache).
 *
 * MODO DEMONSTRAÇÃO (padrão): sem VITE_IA_RESUMO_ATIVA=true não existe IA.
 * Para .txt e .md devolve o início do próprio texto do arquivo; para .pdf
 * devolve um aviso. Nada sai do navegador.
 *
 * MODO REAL: depende de um endpoint do backend que ainda não existe. O
 * contrato PROPOSTO está comentado em resumoViaBackend, para a equipe
 * confirmar antes de implementar.
 */
import { ErroApp } from "../utils/erros";
// import api from "./api";

const IA_ATIVA = import.meta.env.VITE_IA_RESUMO_ATIVA === "true";

export const IA_EM_MODO_DEMO = !IA_ATIVA;

export const TAMANHO_MAX_ARQUIVO_RESUMO = 5 * 1024 * 1024; // 5 MB
export const EXTENSOES_RESUMO = [".txt", ".md", ".pdf"];

const cache = new Map();

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retorna um texto de erro (para mostrar no campo) ou null se estiver ok. */
export function validarArquivoResumo(arquivo) {
  const nome = arquivo.name.toLowerCase();

  if (!EXTENSOES_RESUMO.some((ext) => nome.endsWith(ext))) {
    return "Use um arquivo .txt, .md ou .pdf.";
  }

  if (arquivo.size > TAMANHO_MAX_ARQUIVO_RESUMO) {
    return "O arquivo pode ter no máximo 5 MB.";
  }

  if (arquivo.size === 0) {
    return "O arquivo está vazio.";
  }

  return null;
}

function cortar(texto, limite) {
  if (texto.length <= limite) return texto;

  const trecho = texto.slice(0, limite - 1);
  const ponto = trecho.lastIndexOf(". ");

  if (ponto > limite * 0.5) return trecho.slice(0, ponto + 1);

  const espaco = trecho.lastIndexOf(" ");
  return `${trecho.slice(0, espaco > 0 ? espaco : limite - 1).trim()}…`;
}

async function resumoDeDemonstracao(arquivo, limite) {
  await esperar(700);

  const nome = arquivo.name.toLowerCase();

  if (nome.endsWith(".txt") || nome.endsWith(".md")) {
    const texto = (await arquivo.text()).replace(/\s+/g, " ").trim();

    if (!texto) {
      throw new ErroApp(
        "ERR-ARQUIVO-VAZIO",
        "Não encontramos texto nesse arquivo. Tente outro.",
      );
    }

    return cortar(texto, limite);
  }

  return (
    `[Demonstração] O conteúdo de "${arquivo.name}" será lido e resumido ` +
    "pelo Gemini no backend. Escreva ou cole o resumo aqui."
  );
}

/*
 * CONTRATO PROPOSTO (confirmar com a equipe do backend; não existe ainda):
 *
 *   POST /api/ia/resumo-patrimonio        (multipart/form-data, só ADMIN)
 *     campo "arquivo": o .txt / .md / .pdf
 *     campo "limite":  máximo de caracteres do resumo
 *   200 -> { success: true, data: { resumo: "..." } }
 *
 * O backend valida o tipo pelo conteúdo, limita o tamanho, extrai o texto,
 * trata o documento como DADO (nunca como instrução) no prompt, chama o
 * Gemini e devolve só o texto validado.
 *
 * async function resumoViaBackend(arquivo, limite) {
 *   const corpo = new FormData();
 *   corpo.append("arquivo", arquivo);
 *   corpo.append("limite", String(limite));
 *   const { data } = await api.post("/ia/resumo-patrimonio", corpo, {
 *     timeout: 60000,
 *   });
 *   return data.resumo;
 * }
 */
async function resumoViaBackend() {
  throw new ErroApp(
    "ERR-IA-NAO-IMPLEMENTADA",
    "O resumo com IA ainda não está disponível. Escreva o texto manualmente.",
    "resumoViaBackend sem endpoint definido",
  );
}

export async function gerarResumoDeArquivo(arquivo, { limite = 600 } = {}) {
  const chave = `${arquivo.name}:${arquivo.size}:${arquivo.lastModified}:${limite}`;

  if (cache.has(chave)) return cache.get(chave);

  const resumo = IA_ATIVA
    ? await resumoViaBackend(arquivo, limite)
    : await resumoDeDemonstracao(arquivo, limite);

  cache.set(chave, resumo);
  return resumo;
}
