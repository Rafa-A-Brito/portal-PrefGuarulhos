import { test, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/metricas_test";
process.env.JWT_SECRET = "metricas-http-secret-at-least-32-characters";
process.env.METRICAS_COLETA_ATIVA = "false";
process.env.METRICAS_CONSULTA_ATIVA = "false";
const { configurarMetricas } = await import("../src/config/metricas.js");
const { criarRotasMetricas } = await import("../src/routes/metricasRoute.js");
const { default: errorHandler } = await import("../src/middlewares/errorHandler.js");
const { default: appReal } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
const { criarLimiteMetricas } = await import("../src/middlewares/limiteMetricas.js");
const { indisponivel } = await import("../src/services/metricasService.js");
after(() => prisma.$disconnect());
const config = configurarMetricas({ METRICAS_COLETA_ATIVA: "true", METRICAS_ORIGEM: "http://localhost:5173", METRICAS_COOKIE_MODO: "http-local",
    METRICAS_CHAVES_JSON: JSON.stringify([{ id: "teste", desde: "2026-01-01", segredo: "af31509c86de2470b8f19d65c02e3a74b82f061c7a4d9352e610cf892dba4706" }]) });
const headers = { "Content-Type": "application/json", Origin: config.origem, "X-Portal-Metricas": "1" };
async function servidor(app, fn) {
    const server = app.listen(0, "127.0.0.1"); await new Promise(r => server.once("listening", r));
    try { await fn("http://127.0.0.1:" + server.address().port); }
    finally { await new Promise(r => server.close(r)); }
}
test("HTTP: sessão não escreve, cookie obrigatório, origem, schemas, parser 2 KB e falha sem 204", async () => {
    const eventos = []; let falhar = false;
    const app = express();
    app.use("/api/metricas", criarRotasMetricas({ configuracao: config, registrar: async evento => {
        if (falhar) throw indisponivel(); eventos.push(evento);
    } }));
    app.use(express.json({ limit: "100kb" }));
    app.post("/fora", (req, res) => res.json({ tamanho: req.body.texto.length }));
    app.use(errorHandler);
    await servidor(app, async base => {
        const send = (path, body, extra = {}) => fetch(base + path, { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) });
        const sessao = await send("/api/metricas/visualizacoes/sessao", {});
        assert.equal(sessao.status, 200); assert.equal(eventos.length, 0);
        assert.match(sessao.headers.get("set-cookie"), /HttpOnly/);
        assert.match(sessao.headers.get("set-cookie"), /SameSite=Lax/);
        const Cookie = sessao.headers.get("set-cookie").split(";")[0];
        const evento = { patrimonioId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
        assert.equal((await send("/api/metricas/visualizacoes", evento)).status, 401);
        assert.equal((await send("/api/metricas/visualizacoes", evento, { Cookie, Origin: "http://malicioso.invalid" })).status, 403);
        assert.equal((await send("/api/metricas/visualizacoes", { ...evento, quantidade: 10 }, { Cookie })).status, 400);
        for (let i = 0; i < 2; i++) assert.equal((await send("/api/metricas/visualizacoes", evento, { Cookie })).status, 204);
        assert.deepEqual(eventos[0], eventos[1]); // A constraint PostgreSQL faz a deduplicação final.
        assert.equal((await send("/api/metricas/visualizacoes", { texto: "x".repeat(3000) }, { Cookie })).status, 413);
        const chunked = await new Promise((resolve, reject) => {
            const req = http.request(base + "/api/metricas/visualizacoes", { method: "POST", headers: { ...headers, Cookie } }, res => {
                res.resume(); res.on("end", () => resolve(res.statusCode));
            });
            req.on("error", reject); req.write('{"texto":"'); req.write("x".repeat(3000)); req.end('"}');
        });
        assert.equal(chunked, 413);
        assert.equal((await send("/api/metricas/visualizacoes", evento, { Cookie, "Content-Type": "text/plain" })).status, 415);
        assert.equal((await send("/api/metricas/visualizacoes", evento, { Cookie, Origin: "null" })).status, 403);
        assert.equal((await send("/api/metricas/visualizacoes", evento, { Cookie: Cookie + "adulterado" })).status, 401);
        assert.equal((await send("/fora", { texto: "x".repeat(3000) })).status, 200);
        falhar = true; const erro = await send("/api/metricas/visualizacoes", evento, { Cookie });
        assert.equal(erro.status, 503); assert.equal(erro.headers.get("Retry-After"), "1");
        assert.equal((await fetch(base + "/api/metricas/visualizacoes/sessao", { method: "DELETE", headers })).status, 204);
    });
});
test("aplicação real inicia com flags off, V1 intacta e consulta V2 exige ADMIN/EDITOR sem SQL V2", async t => {
    const old = prisma.user.findUnique;
    t.after(() => { prisma.user.findUnique = old; });
    let role = "ADMIN";
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    prisma.user.findUnique = async () => ({ id, role, isActive: true, tokenVersion: 0,
        authSessions: [{ tokenVersion: 0, expiresAt: new Date(Date.now() + 60000), revokedAt: null }] });
    await servidor(appReal, async base => {
        assert.equal((await fetch(base + "/api/health")).status, 200);
        assert.equal((await fetch(base + "/api/metricas/visualizacoes/sessao", { method: "POST", headers, body: "{}" })).status, 503);
        assert.equal((await fetch(base + "/api/admin/dashboard/metricas")).status, 401);
        assert.equal((await fetch(base + "/api/admin/dashboard")).status, 401);
        for (role of ["ADMIN", "EDITOR"]) {
            const response = await fetch(base + "/api/admin/dashboard/metricas", { headers: { Authorization: "Bearer " + generateToken(id, 0, id) } });
            assert.deepEqual(await response.json(), { success: true, data: { disponivel: false, motivo: "DESATIVADA" } });
        }
        role = "VISITANTE";
        assert.equal((await fetch(base + "/api/admin/dashboard/metricas", { headers: { Authorization: "Bearer " + generateToken(id, 0, id) } })).status, 403);
    });
});
test("limite de emissão, Retry-After e teto de cardinalidade", () => {
    const limit = criarLimiteMetricas({ now: () => 1000 }); const res = { setHeader: (k, v) => { assert.equal(k, "Retry-After"); assert.ok(v > 0); } };
    for (let i = 0; i < 10; i++) limit({ path: "/visualizacoes/sessao", ip: "127.0.0.1" }, res, () => {});
    assert.throws(() => limit({ path: "/visualizacoes/sessao", ip: "127.0.0.1" }, res, () => {}), e => e.statusCode === 429);
    assert.throws(() => criarLimiteMetricas({ maxEntries: 0 })({ path: "/visualizacoes", ip: "::1" }, res, () => {}), e => e.statusCode === 429);
});
