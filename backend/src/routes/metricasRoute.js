import express, { Router } from "express";
import config from "../config/metricas.js";
import env from "../config/env.js";
import { criarLimiteMetricas } from "../middlewares/limiteMetricas.js";
import { emitirCookieMetricas, lerCookieMetricas, validarCookieMetricas, chaveVisualizacao, opcoesCookie } from "../services/cookieMetricasService.js";
import { metricas } from "../services/index.js";
import { sessaoMetricasSchema, visualizacaoSchema } from "../schemas/metricasSchema.js";

const { registrarVisualizacao, erroMetricas, indisponivel } = metricas;

export function criarRotasMetricas({ configuracao = config, registrar = registrarVisualizacao, now = () => new Date(), limitar = criarLimiteMetricas() } = {}) {
    const router = Router();
    router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
    router.use((req, _res, next) => {
        const retirada = req.method === "DELETE" && req.path === "/visualizacoes/sessao";
        if (!configuracao.coleta && !retirada) throw indisponivel();
        if (req.get("Origin") !== (configuracao.origem ?? env.CORS_ORIGIN) || req.get("X-Portal-Metricas") !== "1" || req.get("Sec-Fetch-Site") === "cross-site") {
            throw erroMetricas(403, "ORIGEM_INVALIDA", "Origem não autorizada.");
        }
        if (configuracao.coleta && (req.get("Host") !== new URL(configuracao.origem).host || req.secure !== configuracao.seguro)) {
            throw erroMetricas(403, "TRANSPORTE_INVALIDO", "Host ou transporte não autorizado.");
        }
        if (!retirada && !req.is("application/json")) throw erroMetricas(415, "JSON_OBRIGATORIO", "Envie application/json.");
        req.metricasToken = lerCookieMetricas(req.get("Cookie"), configuracao);
        req.metricasIdentidade = configuracao.coleta ? validarCookieMetricas(req.metricasToken, configuracao, now()) : null;
        next();
    });
    router.delete("/visualizacoes/sessao", (_req, res) => {
        // Permite retirada mesmo com coleta desabilitada e sem chaves configuradas.
        for (const seguro of [true, false]) res.clearCookie(seguro ? "__Host-portal_metricas" : "portal_metricas_local", opcoesCookie({ seguro }));
        res.status(204).end();
    });
    router.use(limitar);
    router.use(express.json({ limit: "2kb", inflate: false }));
    router.post("/visualizacoes/sessao", (req, res) => {
        sessaoMetricasSchema.parse(req.body);
        const result = emitirCookieMetricas(req.metricasToken, configuracao, now());
        res.cookie(configuracao.cookie, result.token, opcoesCookie(configuracao, result.expiraEm));
        res.json({ success: true, data: { dia: result.dia, expiraEm: result.expiraEm.toISOString() } });
    });
    router.post("/visualizacoes", async (req, res) => {
        const { patrimonioId } = visualizacaoSchema.parse(req.body);
        const identidade = validarCookieMetricas(req.metricasToken, configuracao, now());
        if (!identidade) throw erroMetricas(401, "PARTICIPACAO_EXPIRADA", "Participação ausente ou expirada.");
        await registrar({ patrimonioId, dia: identidade.dia, chaveVisitante: chaveVisualizacao(identidade, patrimonioId) });
        res.status(204).end();
    });
    // Impede que um caminho V2 desconhecido caia no parser global de 100 KB.
    router.use((_req, _res, next) => next(erroMetricas(404, "NOT_FOUND", "Recurso não encontrado.")));
    router.use((error, _req, res, next) => {
        if (error.status === 415) error = erroMetricas(415, "CODIFICACAO_NAO_SUPORTADA", "Codificação não suportada.");
        if (error.statusCode === 503) res.setHeader("Retry-After", "1");
        next(error);
    });
    return router;
}
export default criarRotasMetricas();
