export const CHAVE_PARTICIPACAO = "portal-guarulhos:metricas:participacao:v1";
export const metricasHabilitadas = () => import.meta.env.VITE_METRICAS_ATIVAS === "true";
export function armazenamentoMetricas() {
  try { return window.localStorage; } catch { return null; }
}

export function criarParticipacao({ storage = armazenamentoMetricas, alvo = window, gpc = () => navigator.globalPrivacyControl === true } = {}) {
  let estado, soMemoria = false;
  const listeners = new Set();
  function ler() {
    try {
      const value = JSON.parse(storage()?.getItem(CHAVE_PARTICIPACAO) ?? "null");
      return value?.versao === 1 && ["aceita", "recusada"].includes(value.escolha) && typeof value.geracao === "string"
        ? value : { escolha: "pendente", geracao: "" };
    } catch { return { escolha: "pendente", geracao: "" }; }
  }
  const obter = () => {
    estado ??= ler();
    return gpc() ? "gpc" : estado.escolha;
  };
  function atualizar(evento) {
    if (evento?.type === "storage" && evento.key !== null && evento.key !== CHAVE_PARTICIPACAO) return;
    if (!soMemoria || evento?.type === "storage") estado = ler();
    listeners.forEach(fn => fn());
  }
  function escolher(escolha) {
    if (!["aceita", "recusada"].includes(escolha)) return;
    if (gpc()) escolha = "recusada";
    estado = { versao: 1, escolha, geracao: crypto.randomUUID() };
    try {
      const s = storage();
      if (!s) throw new Error();
      s.setItem(CHAVE_PARTICIPACAO, JSON.stringify(estado)); soMemoria = false;
    } catch { soMemoria = true; }
    listeners.forEach(fn => fn());
  }
  return { obter, escolher, geracao: () => { obter(); return estado.geracao; },
    assinar(fn) {
      if (!listeners.size) {
        alvo.addEventListener("storage", atualizar); alvo.addEventListener("focus", atualizar);
        alvo.addEventListener("pageshow", atualizar);
        alvo.document?.addEventListener("visibilitychange", atualizar);
      }
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
        if (!listeners.size) {
          alvo.removeEventListener("storage", atualizar); alvo.removeEventListener("focus", atualizar);
          alvo.removeEventListener("pageshow", atualizar);
          alvo.document?.removeEventListener("visibilitychange", atualizar);
        }
      };
    },
  };
}
export const participacao = criarParticipacao();
