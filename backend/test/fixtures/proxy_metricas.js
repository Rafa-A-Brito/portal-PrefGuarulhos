// Processo exclusivo do ensaio Docker: sem banco, sem dados reais, sem login.
import express from "express";
import { configurarMetricas } from "../../src/config/metricas.js";
import { criarRotasMetricas } from "../../src/routes/metricasRoute.js";
import errorHandler from "../../src/middlewares/errorHandler.js";
import { indisponivel } from "../../src/services/metricasService.js";
const app = express();
app.set("trust proxy", process.env.TRUST_PROXY_IPS.split(","));
const config = configurarMetricas({ METRICAS_COLETA_ATIVA: "true", METRICAS_COOKIE_MODO: "https", METRICAS_ORIGEM: process.env.TEST_METRICAS_ORIGEM,
    METRICAS_CHAVES_JSON: JSON.stringify([{ id: "fixture", desde: "2026-01-01", segredo: "af31509c86de2470b8f19d65c02e3a74b82f061c7a4d9352e610cf892dba4706" }]) });
app.get("/api/context", (req, res) => res.json({ ip: req.ip, protocol: req.protocol, host: req.get("host"), hostname: req.hostname, forwarded: req.get("forwarded") ?? null }));
app.get("/api/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));
app.use("/api/metricas", criarRotasMetricas({ configuracao: config, registrar: async ({ patrimonioId }) => {
    if (patrimonioId.startsWith("bbbbbbbb")) throw indisponivel();
} }));
app.post("/api/upload-fixture", express.raw({ type: "application/octet-stream", limit: "12mb" }), (req, res) => res.json({ bytes: req.body.length }));
app.use(errorHandler);
app.listen(3333, "0.0.0.0", () => console.log("Proxy fixture sem persistência iniciada."));
