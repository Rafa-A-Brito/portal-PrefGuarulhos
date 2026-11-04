import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import http from "node:http";
import { registerHooks } from "node:module";
import express from "express";

process.env.MOCK_DATA = "true"; process.env.NODE_ENV = "test";
process.env.FEEDBACK_RECEBIMENTO_ATIVO = "true"; process.env.FEEDBACK_CONSULTA_ATIVA = "true";
process.env.CORS_ORIGIN = "http://localhost:5173";
const hooks = registerHooks({ resolve(s, c, next) {
    if (/^(@prisma\/|pg$|pg\/)/.test(s) || s.endsWith("/config/prisma.js")) throw new Error("Banco proibido na demo");
    return next(s, c);
} });
const { default: app } = await import("../src/app.js");
const { criarRotasFeedback } = await import("../src/routes/feedbackRoute.js");
const { default: config } = await import("../src/config/feedback.js");
const { default: errorHandler } = await import("../src/middlewares/errorHandler.js");
const { criarFeedbackMemoria } = await import("../src/mock/feedback.js");
const { logOutput } = await import("../src/utils/logger.js");
const { chaveDigest, DIA } = await import("../src/utils/feedback.js");
const { feedbackSchema, validarFeedback } = await import("../src/schemas/feedbackSchema.js");
const logs = [], original = logOutput.write; logOutput.write = (_l, s) => logs.push(s);
const dados = { feedback: [], recibosFeedback: new Map() };
const servico = criarFeedbackMemoria({ dados });
const isolated = express(); isolated.use("/api/feedback", criarRotasFeedback({ servico, limitar: (_q, _s, next) => next() })); isolated.use(errorHandler);
const servers = [app.listen(0, "127.0.0.1"), isolated.listen(0, "127.0.0.1")];
await Promise.all(servers.map(s => new Promise(r => s.once("listening", r))));
after(async () => { hooks.deregister(); logOutput.write = original; await Promise.all(servers.map(s => new Promise(r => s.close(r)))); });
const body = { tipo: "SUGESTAO", mensagem: "CANARIO_FEEDBACK_PRIVADO 🏛️", avisoVersao: "feedback-v1" };
const headers = { Host: "localhost:5173", Origin: "http://localhost:5173", "X-Portal-Feedback": "1", "Content-Type": "application/json" };
function call(path = "/api/feedback", { method = "POST", cabecalhos = {}, payload = JSON.stringify(body), server = servers[1], rawHeaders } = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request({ hostname: "127.0.0.1", port: server.address().port, path, method,
            headers: rawHeaders ?? { ...headers, "Idempotency-Key": randomBytes(32).toString("base64url"), ...cabecalhos } }, res => {
            const chunks = []; res.on("data", c => chunks.push(c)); res.on("end", () => {
                const text = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null });
            });
        }); request.on("error", reject); request.end(["GET", "OPTIONS"].includes(method) ? undefined : payload);
    });
}
test("HTTP demo: POST/replay normalizado, conflito, DTO sem texto/id e nenhum cookie", async () => {
    const chave = randomBytes(32).toString("base64url"), opts = { cabecalhos: { "Idempotency-Key": chave } };
    const a = await call(undefined, opts), b = await call(undefined, opts);
    assert.equal(a.status, 201); assert.equal(b.status, 200); assert.deepEqual(a.body, b.body);
    assert.deepEqual(Object.keys(a.body.data).sort(), ["demonstracao", "recebido", "recebidoEm"]);
    assert.equal(a.headers["set-cookie"], undefined); assert.equal(a.headers["cache-control"], "no-store");
    assert.equal((await call(undefined, { ...opts, payload: JSON.stringify({ ...body, mensagem: "Outro" }) })).status, 409);
});
test("origem, Host, propósito, Fetch Metadata e proxy não confiável", async () => {
    for (const cabecalhos of [{ Origin: "" }, { Origin: "null" }, { Origin: "https://evil.invalid" }, { Host: "evil.invalid" },
        { "X-Portal-Feedback": "0" }, { "Sec-Fetch-Site": "cross-site" }, { Host: "evil.invalid", "X-Forwarded-Host": "localhost:5173", "X-Forwarded-Proto": "https" }]) {
        const r = await call(undefined, { cabecalhos }); assert.equal(r.status, 403); assert.equal(r.headers["cache-control"], "no-store");
    }
    const r = await call(undefined, { rawHeaders: ["Host", "localhost:5173", "Origin", headers.Origin, "Origin", headers.Origin,
        "X-Portal-Feedback", "1", "Content-Type", "application/json"] }); assert.equal(r.status, 400);
});
test("JSON, mídia, compressão, 16 KB, extras, método e subcaminhos", async () => {
    for (const cabecalhos of [{ "Content-Type": "text/plain" }, { "Content-Type": "application/x-www-form-urlencoded" },
        { "Content-Type": "multipart/form-data" }, { "Content-Encoding": "gzip" }, { "Content-Type": "application/json; charset=latin1" }]) assert.equal((await call(undefined, { cabecalhos })).status, 415);
    for (const payload of ["{", "[]", "null", JSON.stringify({ ...body, [body.mensagem]: "extra" })]) assert.equal((await call(undefined, { payload })).status, 400);
    assert.equal((await call(undefined, { payload: JSON.stringify({ ...body, mensagem: "a".repeat(17000) }) })).status, 413);
    assert.equal((await call("/api/feedback/desconhecido", { payload: "a".repeat(17000) })).status, 404);
    assert.equal((await call(undefined, { method: "GET", payload: undefined })).status, 405);
    assert.equal((await call("/api/feedback?mensagem=privada")).status, 400);
});
test("preflight validado não grava e nunca cai no CORS geral", async () => {
    const antes = dados.feedback.length;
    const opts = { method: "OPTIONS", payload: undefined, server: servers[0], cabecalhos: {
        "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,idempotency-key,x-portal-feedback" } };
    assert.equal((await call(undefined, opts)).status, 204);
    assert.equal((await call(undefined, { ...opts, cabecalhos: { ...opts.cabecalhos, Origin: "https://evil.invalid" } })).status, 403);
    assert.equal(dados.feedback.length, antes);
});
test("ADMIN permite lista/detalhe/resumo; EDITOR/visitante/sessão inválida negados antes da consulta", async () => {
    async function login(email, senha) {
        const r = await call("/api/auth/login", { server: servers[0], payload: JSON.stringify({ email, password: senha }) });
        assert.equal(r.status, 200); return r.body.data.token;
    }
    const admin = await login("admin@demo.invalid", "AdminDemo!2026"), editor = await login("editor@demo.invalid", "EditorDemo!2026");
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const paths = [`/api/admin/feedback?inicio=${hoje}&fim=${hoje}`, `/api/admin/feedback/resumo?inicio=${hoje}&fim=${hoje}`, "/api/admin/feedback/d0000000-0000-4000-8000-000000001100"];
    for (const path of paths) {
        for (const [token, esperado] of [[null, 401], ["invalido", 401], [editor, 403], [admin, 200]]) {
            const r = await call(path, { method: "GET", payload: undefined, server: servers[0], cabecalhos: token ? { Authorization: `Bearer ${token}` } : {} });
            assert.equal(r.status, esperado, JSON.stringify(r.body)); assert.equal(r.headers["cache-control"], "private, no-store");
            if (esperado === 200) { assert.equal(r.body.data.demonstracao, true); if (r.body.data.itens) assert.equal(r.body.data.itens[0]?.mensagem, undefined); }
        }
    }
    assert.equal((await call(paths[2], { method: "PATCH", payload: "{}", server: servers[0], cabecalhos: { Authorization: `Bearer ${admin}` } })).status, 404);
});
test("memória serializa concorrência, respeita suspensão, expiração e remoção de recibo", async () => {
    let agora = new Date("2026-11-02T15:00:00Z");
    const cfg = { ...config }, local = { feedback: [], recibosFeedback: new Map() }, service = criarFeedbackMemoria({ dados: local, configuracao: cfg, now: () => agora });
    const chave = randomBytes(32).toString("base64url"), normalized = validarFeedback(feedbackSchema, body);
    const respostas = await Promise.all(Array.from({ length: 8 }, () => service.receber(normalized, chave)));
    assert.equal(respostas.filter(r => r.status === 201).length, 1); assert.equal(local.feedback.length, 1);
    cfg.recebimento = false; assert.equal((await service.receber(normalized, chave)).status, 200);
    await assert.rejects(service.receber(normalized, randomBytes(32).toString("base64url")), { code: "FEEDBACK_DESATIVADO" });
    agora = new Date(+agora + DIA); await assert.rejects(service.receber(normalized, chave), { code: "ENVIO_EXPIRADO" });
    local.recibosFeedback.delete(chaveDigest(chave)); cfg.recebimento = true;
    assert.equal((await service.receber(normalized, chave)).status, 201);
});
test("logs não carregam mensagem, chave, cookie, IP, headers ou query de feedback", () => {
    assert.doesNotMatch(logs.join(""), /CANARIO_FEEDBACK_PRIVADO|Idempotency-Key|192\.0\.2|mensagem=privada|AdminDemo!2026/);
});
