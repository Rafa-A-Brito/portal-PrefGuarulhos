import { emitirSessaoMetricas, registrarVisualizacao, excluirSessaoMetricas, ErroMetricas } from "../../services/metricasPublicasApi";
import { participacao, armazenamentoMetricas, metricasHabilitadas } from "./participacaoStore";

export const CHAVE_SESSAO_METRICAS = "portal-guarulhos:metricas:prazo:v1";
const LOCK = "portal-guarulhos:metricas:sessao:v1";
const abortar = () => new DOMException("Cancelado", "AbortError");
const esperar = (ms, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) return reject(abortar());
  const cancelar = () => { clearTimeout(timer); reject(abortar()); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", cancelar); resolve(); }, ms);
  signal.addEventListener("abort", cancelar, { once: true });
});

// Factory permite testar duas abas independentes com o mesmo storage/lock.
export function criarColetaMetricas({ preferencia = participacao, storage = armazenamentoMetricas,
  locks = navigator.locks, habilitada = metricasHabilitadas, now = () => Date.now(),
  api = { emitir: emitirSessaoMetricas, registrar: registrarVisualizacao, excluir: excluirSessaoMetricas } } = {}) {
  let memoria = null, soMemoria = false, fila = Promise.resolve();
  const tarefas = new Set(), enviados = new Set();
  let diaEnviados = "", geracaoAnterior = preferencia.geracao(), ativaAnterior = preferencia.obter() === "aceita";
  const ativa = () => habilitada() && preferencia.obter() === "aceita";
  function ler() {
    try {
      if (!soMemoria) memoria = JSON.parse(storage()?.getItem(CHAVE_SESSAO_METRICAS) ?? "null") ?? memoria;
    } catch { /* sessão em memória */ }
    return memoria?.geracao === preferencia.geracao() ? memoria : null;
  }
  function gravar(value) {
    memoria = value;
    try {
      const s = storage();
      if (!s) throw new Error();
      if (value) s.setItem(CHAVE_SESSAO_METRICAS, JSON.stringify(value));
      else s.removeItem(CHAVE_SESSAO_METRICAS);
      soMemoria = false;
    } catch { soMemoria = true; }
  }
  function serializar(fn, signal) {
    const executar = async () => {
      if (signal?.aborted) throw abortar();
      if (!locks?.request) return fn();
      let iniciou = false;
      try {
        return await locks.request(LOCK, { ...(signal && { signal }) }, () => { iniciou = true; return fn(); });
      } catch (error) {
        // Bloquear armazenamento também pode negar Web Locks. Só usar a fila
        // local se o callback nunca começou; nunca repetir uma emissão falha.
        if (error.name !== "SecurityError" || iniciou) throw error;
        if (signal?.aborted) throw abortar();
        return fn();
      }
    };
    const pedido = fila.then(executar, executar);
    fila = pedido.catch(() => {});
    return pedido;
  }
  function conferir(signal) {
    if (signal.aborted || !ativa()) throw abortar();
  }
  function validade(s) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s?.dia ?? "") && Number.isFinite(s.expiraLocal)
      && s.expiraLocal > now() && s.expiraLocal - now() <= 27 * 3600000;
  }
  async function sessao(signal) {
    return serializar(async () => {
      conferir(signal);
      const cache = ler();
      if (cache?.pausaAte > now()) throw new ErroMetricas(503);
      if (validade(cache)) return cache;
      const inicio = now();
      try {
        // Bootstrap não tem retry automático: resposta perdida pode ter emitido cookie.
        const result = await api.emitir(signal);
        conferir(signal);
        const prazo = Date.parse(result.expiraEm) - result.servidorEm;
        const s = { dia: result.dia, expiraEm: result.expiraEm,
          expiraLocal: now() + prazo - (now() - inicio) - 1000, geracao: preferencia.geracao() };
        if (!Number.isFinite(result.servidorEm) || !validade(s)) throw new ErroMetricas(0);
        gravar(s); return s;
      } catch (e) {
        if (e.name !== "AbortError") gravar({ geracao: preferencia.geracao(), pausaAte: now() + Math.max(60000, e.retryMs || 0) });
        throw e;
      }
    }, signal);
  }
  function interromper() { tarefas.forEach(c => c.abort()); }
  async function revogar() {
    interromper(); gravar(null); enviados.clear();
    try {
      await serializar(async () => {
        // Não remover uma sessão que foi aceita novamente enquanto aguardava o lock.
        if (preferencia.obter() === "aceita") return;
        await api.excluir();
      });
    } catch { /* a escolha local já impede novos eventos; cookie diário expira */ }
  }
  const desassinar = preferencia.assinar(() => {
    const atual = preferencia.obter() === "aceita", geracao = preferencia.geracao();
    if (!atual || geracao !== geracaoAnterior) interromper();
    if (ativaAnterior && !atual) void revogar();
    ativaAnterior = atual; geracaoAnterior = geracao;
  });
  async function coletar(uuid, signal) {
    const controller = new AbortController();
    const cancelar = () => controller.abort();
    if (signal?.aborted) throw abortar();
    signal?.addEventListener("abort", cancelar, { once: true }); tarefas.add(controller);
    const limiteTotal = setTimeout(cancelar, 20000); // Inclui espera por lock de outra aba.
    const sgn = controller.signal;
    try {
      const s = await sessao(sgn);
      if (diaEnviados !== s.dia) { enviados.clear(); diaEnviados = s.dia; }
      if (enviados.has(uuid)) return s;
      // Duas tentativas no máximo, sempre na mesma credencial/dia. Sem fila offline.
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        conferir(sgn);
        if (now() + 5000 >= s.expiraLocal || ler()?.dia !== s.dia) return s;
        try {
          await api.registrar(uuid, sgn);
          conferir(sgn); enviados.add(uuid); return s;
        } catch (e) {
          if (e.name === "AbortError") throw e;
          if (now() >= s.expiraLocal || ler()?.dia !== s.dia) return s;
          if (e.status === 401) {
            // Cookie bloqueado/perdido: não criar identidades repetidamente neste dia.
            gravar({ ...s, pausaAte: s.expiraLocal }); throw e;
          }
          const espera = Math.max(1000 + Math.random() * 250, e.retryMs || 0);
          if (![0, 429, 503].includes(e.status) || tentativa === 1 || espera > 10000 || now() + espera + 5000 >= s.expiraLocal) {
            gravar({ ...s, pausaAte: Math.max(now() + 60000, now() + (e.retryMs || 0)) }); throw e;
          }
          await esperar(espera, sgn);
        }
      }
    } finally { clearTimeout(limiteTotal); tarefas.delete(controller); signal?.removeEventListener("abort", cancelar); }
  }
  return { coletar, revogar, prazo: () => ler()?.expiraLocal,
    destruir: () => { interromper(); desassinar(); } };
}
export const coletaMetricas = criarColetaMetricas();
