import { executarOperacao } from "./metricas_operacao.js";
import { observarMetricas } from "../src/services/operacaoMetricasService.js";
await executarOperacao(client => {
    const url = new URL(process.env.METRICAS_HEALTH_URL);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/api/health") throw new Error("HEALTH_INVALIDO");
    return observarMetricas(client, { configurar: async () => (await import("../src/config/metricas.js")).configurarMetricas(), healthUrl: url.href });
});
