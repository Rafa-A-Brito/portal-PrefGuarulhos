/**
 * Utilitários do modal de erro (ErroModal).
 *
 * - ErroApp: erro "nosso" (validação, geocodificação, arquivo...), com um
 *   código próprio e uma mensagem segura para mostrar ao usuário.
 * - sanitizar: tira de um texto técnico o que nunca pode aparecer numa
 *   tela nem num print (tokens, senhas, chaves, query strings).
 * - normalizarErro: transforma QUALQUER coisa lançada (axios, Error,
 *   string...) num objeto padrão que o ErroModal sabe mostrar.
 *
 * Regra de ouro: a MENSAGEM é genérica e amigável (vai para o usuário); os
 * dados técnicos (código, origem, status, referência) servem para o dev
 * achar o problema a partir de um print.
 */

export class ErroApp extends Error {
  constructor(codigo, mensagemUsuario, detalhe = "") {
    super(detalhe || mensagemUsuario);
    this.name = "ErroApp";
    this.codigo = codigo;
    this.mensagemUsuario = mensagemUsuario;
  }
}

export function sanitizar(texto) {
  return String(texto ?? "")
    .replace(/Bearer\s+[\w.~+/=-]+/gi, "Bearer ***")
    .replace(
      /(senha|password|token|authorization|api[-_ ]?key)(["']?\s*[:=]\s*["']?)[^\s,"'&}]+/gi,
      "$1$2***",
    )
    .replace(/\?[^\s"')]+/g, "?…")
    .slice(0, 300);
}

const MENSAGENS_HTTP = {
  400: "Os dados enviados não foram aceitos. Confira o formulário e tente novamente.",
  401: "Sua sessão expirou ou o acesso não foi reconhecido. Entre novamente.",
  403: "Sua conta não tem permissão para realizar esta ação.",
  404: "Não encontramos o que você procurava.",
  409: "Esses dados entram em conflito com algo que já existe.",
  413: "O arquivo enviado é grande demais.",
  429: "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.",
};

const MENSAGEM_PADRAO =
  "Algo não saiu como esperado. Tente novamente em instantes.";

function gerarReferencia() {
  const tempo = Date.now().toString(36).slice(-4).toUpperCase();
  const sorte = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `E-${tempo}${sorte}`;
}

export function normalizarErro(
  err,
  { origem = "não informada", mensagem } = {},
) {
  const status = err?.response?.status ?? null;

  let codigo = "ERR-APP";
  let msgUsuario = MENSAGEM_PADRAO;
  let podeSerSubstituida = true;

  if (err instanceof ErroApp) {
    codigo = err.codigo;
    msgUsuario = err.mensagemUsuario;
    podeSerSubstituida = false;
  } else if (err?.code === "ECONNABORTED") {
    codigo = "ERR-TIMEOUT";
    msgUsuario = "O servidor demorou demais para responder. Tente novamente.";
    podeSerSubstituida = false;
  } else if (err?.request && !err?.response) {
    codigo = "ERR-REDE";
    msgUsuario =
      "Não foi possível falar com o servidor. Confira sua conexão e tente novamente.";
    podeSerSubstituida = false;
  } else if (status) {
    codigo = `ERR-HTTP-${status}`;
    if (MENSAGENS_HTTP[status]) {
      msgUsuario = MENSAGENS_HTTP[status];
      podeSerSubstituida = false;
    } else if (status >= 500) {
      msgUsuario =
        "O servidor encontrou um problema. Tente novamente em instantes.";
    }
  }

  if (mensagem && podeSerSubstituida) msgUsuario = mensagem;

  const bruto =
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.response?.data?.erro ||
    err?.message ||
    String(err ?? "");

  return {
    id: gerarReferencia(),
    codigo,
    mensagem: msgUsuario,
    origem,
    status,
    quando: new Date().toISOString(),
    detalhe: sanitizar(bruto),
  };
}
