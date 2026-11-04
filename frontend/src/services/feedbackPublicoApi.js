import { feedbackAtivo, prepararFeedback, tamanhoCorpo, LIMITE_CORPO, envioExpirou } from "../utils/feedbackPublico";

const codigos = new Set(["BAD_REQUEST", "ORIGEM_INVALIDA", "TRANSPORTE_INVALIDO", "CHAVE_REUTILIZADA", "ENVIO_EXPIRADO",
  "AVISO_DESATUALIZADO", "BODY_TOO_LARGE", "JSON_OBRIGATORIO", "CODIFICACAO_NAO_SUPORTADA", "TOO_MANY_REQUESTS",
  "FEEDBACK_DESATIVADO", "FEEDBACK_INDISPONIVEL", "INTERNAL_ERROR"]);
export class ErroFeedbackPublico extends Error {
  constructor(status, codigo, retryMs = 0) {
    super("Não foi possível confirmar o recebimento do feedback.");
    this.name = "ErroFeedbackPublico"; this.status = status; this.codigo = codigo; this.retryMs = retryMs;
  }
}
export function gerarChaveFeedback() {
  if (!globalThis.crypto?.getRandomValues) throw new ErroFeedbackPublico(0, "PREPARACAO_INDISPONIVEL");
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export function criarEnvioFeedback(tipo, mensagem) {
  const { payload, corpo, erros } = prepararFeedback(tipo, mensagem);
  if (Object.keys(erros).length) throw new ErroFeedbackPublico(400, "BAD_REQUEST");
  return Object.freeze({ payload, corpo, chave: gerarChaveFeedback(), iniciadoEm: Date.now(), inicioMonotono: performance.now() });
}
function esperaServidor(response) {
  const retry = response.headers.get("Retry-After"), serverDate = Date.parse(response.headers.get("Date"));
  const ms = /^\d+$/.test(retry ?? "") ? Number(retry) * 1000 : Date.parse(retry) - (Number.isFinite(serverDate) ? serverDate : Date.now());
  return Number.isFinite(ms) ? Math.max(0, ms) : 0;
}
function confirmacaoValida(json) {
  const d = json?.data;
  return json?.success === true && d && !Array.isArray(d) && d.recebido === true &&
    typeof d.recebidoEm === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(d.recebidoEm) &&
    Number.isFinite(Date.parse(d.recebidoEm)) && new Date(d.recebidoEm).toISOString() === d.recebidoEm &&
    (!Object.hasOwn(d, "demonstracao") || d.demonstracao === true) &&
    Object.keys(d).every(k => ["recebido", "recebidoEm", "demonstracao"].includes(k));
}
// Cliente isolado: nenhum import de api.js, sessão, métricas ou armazenamento.
export async function enviarFeedback(envio, { signal, timeoutMs = 15000 } = {}) {
  if (!feedbackAtivo()) throw new ErroFeedbackPublico(503, "FEEDBACK_DESATIVADO");
  if (envioExpirou(envio)) throw new ErroFeedbackPublico(409, "ENVIO_EXPIRADO");
  if (typeof envio.corpo !== "string" || tamanhoCorpo(envio.corpo) > LIMITE_CORPO) throw new ErroFeedbackPublico(413, "BODY_TOO_LARGE");
  const preparado = prepararFeedback(envio.payload.tipo, envio.payload.mensagem);
  if (Object.keys(preparado.erros).length || preparado.corpo !== envio.corpo ||
      !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(envio.chave)) throw new ErroFeedbackPublico(400, "BAD_REQUEST");
  if (signal?.aborted) throw new ErroFeedbackPublico(0, "RESULTADO_INCERTO");
  const controller = new AbortController();
  let interromper;
  const interrupcao = new Promise((_, reject) => {
    interromper = () => { controller.abort(); reject(new ErroFeedbackPublico(0, "RESULTADO_INCERTO")); };
  });
  signal?.addEventListener("abort", interromper, { once: true });
  const timer = setTimeout(interromper, timeoutMs);
  try {
    return await Promise.race([interrupcao, (async () => {
      const response = await fetch("/api/feedback", {
        method: "POST", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "X-Portal-Feedback": "1", "Idempotency-Key": envio.chave },
        body: envio.corpo,
      });
      const retryMs = esperaServidor(response);
      const json = await response.json().catch(() => null);
      if ([200, 201].includes(response.status)) {
        if (!confirmacaoValida(json)) throw new ErroFeedbackPublico(0, "RESULTADO_INCERTO", retryMs);
        return { recebido: true, recebidoEm: json.data.recebidoEm, demonstracao: json.data.demonstracao === true };
      }
      const codigo = codigos.has(json?.error?.code) ? json.error.code : "RESPOSTA_INESPERADA";
      throw new ErroFeedbackPublico(response.status, codigo, retryMs);
    })()]);
  } catch (error) {
    if (error instanceof ErroFeedbackPublico) throw error;
    throw new ErroFeedbackPublico(0, "RESULTADO_INCERTO");
  } finally {
    clearTimeout(timer); signal?.removeEventListener("abort", interromper);
  }
}
