import express, { Router } from "express";
import config from "../config/feedback.js";
import { criarControllerFeedback } from "../controllers/feedbackController.js";
import { criarLimiteFeedback } from "../middlewares/limiteFeedback.js";
import { desativado, erroFeedback } from "../utils/feedback.js";

export function falhaFeedback(error, _req, res, next) {
    if (error?.type === "entity.parse.failed") error = erroFeedback(400, "BAD_REQUEST", "JSON inválido.");
    if (error?.type === "entity.too.large") error = erroFeedback(413, "BODY_TOO_LARGE", "Corpo acima de 16 KB.");
    if (error?.status === 415) error = erroFeedback(415, "CODIFICACAO_NAO_SUPORTADA", "Codificação não suportada.");
    if (error?.code === "FEEDBACK_INDISPONIVEL") res.setHeader("Retry-After", "5");
    next(error);
}
export function criarRotasFeedback({ configuracao = config, servico, limitar = criarLimiteFeedback() } = {}) {
    const router = Router(), controller = criarControllerFeedback(servico);
    router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
    router.use((req, _res, next) => {
        if (req.path !== "/") throw erroFeedback(404, "NOT_FOUND", "Recurso não encontrado.");
        if (!["POST", "OPTIONS"].includes(req.method)) throw erroFeedback(405, "METHOD_NOT_ALLOWED", "Método não permitido.");
        const nomes = new Set(), protegidos = new Set(["host", "origin", "content-type", "content-length", "content-encoding", "transfer-encoding",
            "idempotency-key", "x-portal-feedback", "sec-fetch-site", "x-forwarded-host", "x-forwarded-proto", "access-control-request-method", "access-control-request-headers"]);
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const nome = req.rawHeaders[i].toLowerCase();
            if (protegidos.has(nome) && nomes.has(nome)) throw erroFeedback(400, "BAD_REQUEST", "Cabeçalhos ambíguos.");
            nomes.add(nome);
        }
        if (!configuracao.origem) throw desativado();
        if (req.get("Origin") !== configuracao.origem || req.get("Sec-Fetch-Site") === "cross-site") throw erroFeedback(403, "ORIGEM_INVALIDA", "Origem não autorizada.");
        if (req.get("Host") !== new URL(configuracao.origem).host || req.secure !== configuracao.seguro) throw erroFeedback(403, "TRANSPORTE_INVALIDO", "Host ou transporte não autorizado.");
        next();
    });
    router.options("/", (req, res) => {
        const headers = (req.get("Access-Control-Request-Headers") ?? "").toLowerCase().split(",").map(s => s.trim());
        const permitidos = ["content-type", "idempotency-key", "x-portal-feedback"];
        if (req.get("Access-Control-Request-Method") !== "POST" || !permitidos.every(h => headers.includes(h)) || headers.some(h => !permitidos.includes(h))) {
            throw erroFeedback(403, "ORIGEM_INVALIDA", "Preflight não autorizado.");
        }
        res.setHeader("Access-Control-Allow-Origin", configuracao.origem);
        res.setHeader("Access-Control-Allow-Methods", "POST");
        res.setHeader("Access-Control-Allow-Headers", permitidos.join(", "));
        res.vary("Origin"); res.vary("Access-Control-Request-Headers"); res.status(204).end();
    });
    router.use((req, res, next) => {
        if (req.get("X-Portal-Feedback") !== "1") throw erroFeedback(403, "ORIGEM_INVALIDA", "Finalidade não autorizada.");
        res.setHeader("Access-Control-Allow-Origin", configuracao.origem); res.vary("Origin");
        next();
    });
    router.use(limitar);
    router.use((req, _res, next) => {
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.get("Content-Type") ?? "") ||
            ![undefined, "identity"].includes(req.get("Content-Encoding"))) throw erroFeedback(415, "JSON_OBRIGATORIO", "Envie JSON UTF-8 sem compressão.");
        next();
    });
    router.use(express.json({ limit: "16kb", inflate: false, strict: true }));
    router.post("/", controller.receber);
    router.use(falhaFeedback);
    return router;
}
export default criarRotasFeedback();
