import { useEffect, useSyncExternalStore } from "react";
import { participacao, metricasHabilitadas } from "../features/metricas/participacaoStore";
import { coletaMetricas } from "../features/metricas/coletaMetricas";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function useVisualizacaoPatrimonio(uuid, elegivel = false) {
  const escolha = useSyncExternalStore(participacao.assinar, participacao.obter);
  useEffect(() => {
    if (!metricasHabilitadas() || escolha !== "aceita" || !elegivel || !UUID.test(uuid ?? "")) return;
    let encerrado = false, acumulado = 0, iniciou = null, timer, virada, pedido, feito = false, operacao = 0;
    const visivel = () => document.visibilityState === "visible" && participacao.obter() === "aceita";
    function marcarVirada() {
      clearTimeout(virada);
      const prazo = coletaMetricas.prazo();
      if (!Number.isFinite(prazo)) return;
      virada = setTimeout(() => {
        pedido?.abort(); operacao++; clearTimeout(timer);
        feito = false; acumulado = 0; iniciou = null;
        agendar(); // Nova qualificação, nunca retry do evento de ontem.
      }, Math.max(0, prazo - Date.now()) + 1100);
    }
    async function enviar() {
      if (encerrado || !visivel()) return;
      acumulado = 2000; iniciou = null;
      const atual = ++operacao;
      pedido = new AbortController();
      try { await coletaMetricas.coletar(uuid.toLowerCase(), pedido.signal); }
      catch { /* Métricas não alteram o estado da ficha nem a sessão administrativa. */ }
      if (encerrado || atual !== operacao) return;
      feito = true; marcarVirada();
    }
    function agendar() {
      if (encerrado || feito || !visivel()) return;
      iniciou = performance.now();
      timer = setTimeout(enviar, Math.max(0, 2000 - acumulado));
    }
    function visibilidade() {
      clearTimeout(timer);
      if (iniciou !== null) acumulado = Math.min(2000, acumulado + performance.now() - iniciou);
      iniciou = null;
      pedido?.abort(); operacao++;
      agendar();
    }
    document.addEventListener("visibilitychange", visibilidade);
    agendar();
    return () => {
      encerrado = true; operacao++; clearTimeout(timer); clearTimeout(virada); pedido?.abort();
      document.removeEventListener("visibilitychange", visibilidade);
    };
  }, [uuid, elegivel, escolha]);
}
