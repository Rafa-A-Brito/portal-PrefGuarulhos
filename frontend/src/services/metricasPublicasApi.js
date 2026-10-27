// Cliente público independente: não importa api.js, sessão administrativa ou JWT.
export class ErroMetricas extends Error {
  constructor(status, retryMs = 0) {
    super("Métricas indisponíveis.");
    this.status = status;
    this.retryMs = retryMs;
  }
}

async function requisitar(caminho, { method = "POST", body, signal } = {}) {
  const controller = new AbortController();
  const cancelar = () => controller.abort();
  if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
  signal?.addEventListener("abort", cancelar, { once: true });
  const timer = setTimeout(cancelar, 3000);
  try {
    const response = await fetch(`/api/metricas/visualizacoes${caminho}`, {
      method, credentials: "same-origin", cache: "no-store", redirect: "error",
      referrerPolicy: "no-referrer", signal: controller.signal,
      headers: { "X-Portal-Metricas": "1", ...(body !== undefined && { "Content-Type": "application/json" }) },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const retry = response.headers.get("Retry-After");
      const serverNow = Date.parse(response.headers.get("Date"));
      const retryMs = /^\d+$/.test(retry ?? "") ? Number(retry) * 1000
        : Math.max(0, Date.parse(retry) - (serverNow || Date.now()));
      throw new ErroMetricas(response.status, Number.isFinite(retryMs) ? retryMs : 0);
    }
    if (response.status === 204) return null;
    return { ...(await response.json()).data, servidorEm: Date.parse(response.headers.get("Date")) };
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
    if (error instanceof ErroMetricas) throw error;
    throw new ErroMetricas(0); // Rede/timeout: nunca logout ou refresh administrativo.
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancelar);
  }
}

export const emitirSessaoMetricas = signal => requisitar("/sessao", { body: {}, signal });
export const registrarVisualizacao = (patrimonioId, signal) => requisitar("", { body: { patrimonioId }, signal });
export const excluirSessaoMetricas = signal => requisitar("/sessao", { method: "DELETE", signal });
