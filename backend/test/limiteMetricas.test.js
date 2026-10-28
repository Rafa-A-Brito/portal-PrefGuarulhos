import { test, after } from "node:test";
import assert from "node:assert/strict";
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/limite_test";
process.env.JWT_SECRET = "limite-fixture-secret-with-at-least-32-characters";
const { criarLimiteMetricas } = await import("../src/middlewares/limiteMetricas.js");
const { default: db } = await import("../src/config/prisma.js");
after(() => db.$disconnect());

test("NAT: quatro turmas de 30 identidades/hora; reutilização assinada não gasta emissão", () => {
    let agora = 1000, retry;
    const limite = criarLimiteMetricas({ now: () => agora });
    const res = { setHeader: (_k, v) => { retry = v; } };
    const nova = { path: "/visualizacoes/sessao", ip: "192.0.2.10" };
    for (let turma = 0; turma < 4; turma++) {
        for (let i = 0; i < 30; i++) limite(nova, res, () => {});
        for (let i = 0; i < 30; i++) limite({ ...nova, metricasIdentidade: { dia: "2026-10-27" }, metricasToken: "aluno-" + turma + "-" + i }, res, () => {});
        agora += 60001;
    }
    assert.throws(() => limite(nova, res, () => {}), e => e.statusCode === 429);
    assert.ok(retry > 3000);
    limite({ ...nova, metricasIdentidade: {}, metricasToken: "aluno-0-0" }, res, () => {});
    assert.throws(() => limite({ ...nova, metricasToken: "forjado" }, res, () => {}), e => e.statusCode === 429);
    agora = 3601001; limite(nova, res, () => {});
});
test("limites de rajada, credencial, IPv6 /64 e capacidade falham fechados", () => {
    let agora = 0;
    const limite = criarLimiteMetricas({ now: () => agora });
    const res = { setHeader() {} };
    const r = { path: "/visualizacoes/sessao", ip: "2001:db8:1:2::1" };
    for (let i = 0; i < 60; i++) limite(r, res, () => {});
    assert.throws(() => limite({ ...r, ip: "2001:0db8:0001:0002::ff" }, res, () => {}), e => e.statusCode === 429);
    const cookie = { ...r, metricasIdentidade: {}, metricasToken: "valido" };
    for (let i = 0; i < 30; i++) limite(cookie, res, () => {});
    assert.throws(() => limite(cookie, res, () => {}), e => e.statusCode === 429);
    agora = 60001; limite(cookie, res, () => {});
    assert.throws(() => criarLimiteMetricas({ maxEntries: 0 })(r, res, () => {}), e => e.statusCode === 429);
});
