import { executarOperacao } from "./metricas_operacao.js";
import { reterMetricas } from "../src/services/operacaoMetricasService.js";
await executarOperacao(client => reterMetricas(client));
