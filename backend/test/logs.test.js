import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { before, after, test } from "node:test";
import { logEvent, logOutput, requestContext } from "../src/utils/logger.js";

process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/logs_test";
process.env.JWT_SECRET = "logs-test-secret-at-least-32-characters";
process.env.LOGIN_RATE_IP_MAX = "1000";
process.env.LOGIN_RATE_ACCOUNT_IP_MAX = "2";
const { default: prisma } = await import("../src/config/prisma.js");
const { default: app } = await import("../src/app.js");
const auth = await import("../src/services/authService.js");
const { hashPassword } = await import("../src/utils/password.js");
const { generateToken } = await import("../src/utils/token.js");
let server, base, user;
const password = "SenhaDeTeste123!";
before(async () => {
    user = { id: randomUUID(), name: "Equipe", email: "equipe@example.test", role: "ADMIN", isActive: true, tokenVersion: 0,
        passwordHash: await hashPassword(password), authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }] };
    server = app.listen(0); await new Promise(r => server.once("listening", r)); base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { await new Promise(r => server.close(r)); await prisma.$disconnect(); });
function stub(t, target, key, fn) { const original = target[key]; target[key] = fn; t.after(() => { target[key] = original; }); }
function logs(t) { const entries = []; stub(t, logOutput, "write", (_level, line) => { assert.equal(line.split("\n").length, 2); entries.push(JSON.parse(line)); }); return entries; }
async function post(route, body) { return fetch(base + route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
const secretError = () => Object.assign(new Error("postgresql://admin:senha@db/portal SELECT password_hash, tokenHash\nAuthorization: Bearer segredo\nC:\\privado"), { code: "ECONNREFUSED" });

test("JSON contém apenas campos permitidos, limita dados e ignora mensagens/stack/contextos sensíveis", t => {
    const entries = logs(t), requestId = randomUUID();
    requestContext.run({ requestId, req: { method: "GET", baseUrl: "/api/admin", route: { path: "/auditoria" } } }, () => {
        logEvent("error", "DATABASE_OPERATION_FAILED", { status: 500, password, token: "segredo", cookies: "segredo", authorization: "segredo",
            url: "postgresql://segredo", entity: "x".repeat(10000), userId: user.id }, secretError());
    });
    assert.equal(entries.length, 1); const entry = entries[0];
    assert.equal(entry.requestId, requestId); assert.equal(entry.route, "/api/admin/auditoria");
    assert.equal(entry.errorCode, "ECONNREFUSED"); assert.match(entry.timestamp, /Z$/);
    assert.ok(JSON.stringify(entry).length < 600);
    assert.doesNotMatch(JSON.stringify(entry), /senha|segredo|postgresql|SELECT|password|tokenHash|cookies|authorization|stack|privado/);
});

test("falha de saída do logger não lança nem altera a operação", t => {
    stub(t, logOutput, "write", () => { throw secretError(); });
    assert.doesNotThrow(() => logEvent("info", "LOGIN_SUCCEEDED", { userId: user.id }));
});

test("requestId gerado no servidor é consistente, sem query/cookie e sem atribuir JWT inválido", async t => {
    const entries = logs(t), supplied = randomUUID();
    const res = await fetch(base + "/admin/auditoria?token=segredo", { headers: { "X-Request-Id": supplied, authorization: "Bearer segredo", cookie: "segredo" } });
    assert.equal(res.status, 401); assert.notEqual(res.headers.get("x-request-id"), supplied);
    assert.match(res.headers.get("x-request-id"), /^[a-f\d-]{36}$/);
    assert.equal(entries.length, 1); assert.equal(entries[0].event, "AUTHENTICATION_DENIED");
    assert.equal(entries[0].requestId, res.headers.get("x-request-id")); assert.equal(Object.hasOwn(entries[0], "userId"), false);
    assert.doesNotMatch(JSON.stringify(entries), /segredo|cookie|Bearer|\?token/);
});

test("recusa de autorização usa somente usuário validado e não duplica", async t => {
    const entries = logs(t); stub(t, prisma.user, "findUnique", async () => ({ ...user, role: "EDITOR" }));
    const res = await fetch(base + "/admin/auditoria/" + randomUUID(), { headers: { authorization: "Bearer " + generateToken(user.id, 0, user.id) } });
    assert.equal(res.status, 403); assert.equal(entries.length, 1);
    assert.equal(entries[0].event, "AUTHORIZATION_DENIED"); assert.equal(entries[0].userId, user.id);
    assert.equal(entries[0].requestId, res.headers.get("x-request-id"));
});

test("login inválido/conta indisponível mantêm resposta genérica e limite gera um log sem e-mail/IP", async t => {
    const entries = logs(t); let unavailable = false;
    stub(t, prisma.user, "findUnique", async () => unavailable ? { ...user, isActive: false } : null);
    const email = randomUUID() + "@example.test";
    const a = await post("/auth/login", { email, password }); unavailable = true;
    const b = await post("/auth/login", { email, password });
    assert.equal(a.status, 401); assert.equal(b.status, 401); assert.deepEqual(await a.json(), await b.json());
    const c = await post("/auth/login", { email, password }); assert.equal(c.status, 429); assert.ok(c.headers.get("retry-after"));
    assert.deepEqual(entries.map(e => e.event), ["LOGIN_REJECTED", "LOGIN_REJECTED", "LOGIN_RATE_LIMITED"]);
    assert.equal(entries[2].requestId, c.headers.get("x-request-id"));
    assert.doesNotMatch(JSON.stringify(entries), /email|example|password|Senha|127\.0\.0\.1|ip"/);
});

test("erro interno/banco gera log seguro, resposta genérica e preserva requestId", async t => {
    const entries = logs(t); stub(t, prisma.user, "findUnique", async () => { throw secretError(); });
    const res = await fetch(base + "/admin/auditoria", { headers: { authorization: "Bearer " + generateToken(user.id, 0, user.id) } });
    assert.equal(res.status, 500); const body = await res.json();
    assert.equal(entries.length, 1); assert.equal(entries[0].event, "DATABASE_OPERATION_FAILED");
    assert.equal(entries[0].requestId, res.headers.get("x-request-id"));
    assert.doesNotMatch(JSON.stringify([entries, body]), /postgresql|SELECT|password_hash|tokenHash|senha|segredo|privado/);
});

test("login só emite sucesso depois do commit; falha no commit não emite sucesso", async t => {
    const entries = logs(t); let committed = false, fail = false;
    stub(t, prisma.user, "findUnique", async () => user);
    stub(t, prisma, "$transaction", async cb => {
        const result = await cb({ $queryRaw: async () => [], user: { findUnique: async () => user }, authSession: { create: async ({ data }) => data } });
        assert.equal(entries.length, committed ? 1 : 0);
        if (fail) throw secretError();
        committed = true; return result;
    });
    const pair = await auth.login({ email: user.email, password });
    assert.equal(committed, true); assert.equal(entries[0].event, "LOGIN_SUCCEEDED");
    assert.equal(entries[0].userId, user.id); assert.equal(entries.length, 1);
    fail = true; await assert.rejects(auth.login({ email: user.email, password }), { code: "ECONNREFUSED" });
    assert.equal(entries.filter(e => e.event === "LOGIN_SUCCEEDED").length, 1);
    const serialized = JSON.stringify(entries);
    for (const value of [pair.token, pair.refreshToken, user.passwordHash, password]) assert.equal(serialized.includes(value), false);
});

test("replay de refresh e logout registram revogação somente após commit e nada por logout sem efeito", async t => {
    const entries = logs(t), refreshToken = "a".repeat(43), session = { id: randomUUID(), userId: user.id };
    let committed = false, fail = false, count = 1;
    const stored = { id: randomUUID(), sessionId: session.id, session, usedAt: new Date() };
    stub(t, prisma.refreshToken, "findUnique", async () => stored);
    stub(t, prisma, "$transaction", async cb => {
        const result = await cb({ $queryRaw: async () => [], refreshToken: { findUnique: async () => stored },
            authSession: { updateMany: async () => ({ count }) } });
        if (fail) throw secretError(); committed = true; return result;
    });
    await assert.rejects(auth.refresh(refreshToken), { statusCode: 401 });
    assert.equal(committed, true); assert.equal(entries[0].event, "REFRESH_TOKEN_REUSED"); assert.equal(entries[0].revokedCount, 1);
    assert.equal(entries[0].userId, user.id);
    fail = true; await assert.rejects(auth.refresh(refreshToken), { code: "ECONNREFUSED" }); assert.equal(entries.length, 1);
    fail = false; await auth.logout(refreshToken); assert.equal(entries[1].event, "LOGOUT_SESSION_REVOKED");
    count = 0; await auth.logout(refreshToken); assert.equal(entries.length, 2);
    fail = true; await assert.rejects(auth.logout(refreshToken), { code: "ECONNREFUSED" }); assert.equal(entries.length, 2);
    const serialized = JSON.stringify(entries);
    assert.equal(serialized.includes(refreshToken), false); assert.equal(serialized.includes(createHash("sha256").update(refreshToken).digest("hex")), false);
});

test("troca de senha audita sem valores e loga revogação depois de commit; falha na auditoria não loga sucesso", async t => {
    const entries = logs(t); let failAudit = false, committed = false;
    stub(t, prisma.user, "findUnique", async () => user);
    stub(t, prisma, "$transaction", async cb => {
        const result = await cb({ $queryRaw: async () => [], user: { updateMany: async () => ({ count: 1 }) },
            authSession: { updateMany: async () => ({ count: 2 }) }, auditLog: { create: async ({ data }) => {
                assert.equal(data.action, "USER_PASSWORD_CHANGE"); assert.equal(data.userId, user.id); assert.equal(data.entityId, user.id);
                assert.equal(Object.hasOwn(data, "oldValues"), false); assert.equal(Object.hasOwn(data, "newValues"), false);
                if (failAudit) throw secretError(); return data;
            } } });
        committed = true; return result;
    });
    await auth.changePassword(user.id, { senhaAtual: password, novaSenha: "OutraSenhaSegura123!" });
    assert.equal(committed, true); assert.equal(entries[0].event, "SESSIONS_REVOKED"); assert.equal(entries[0].revokedCount, 2);
    committed = false; failAudit = true;
    await assert.rejects(auth.changePassword(user.id, { senhaAtual: password, novaSenha: "OutraSenhaSegura123!" }), { code: "ECONNREFUSED" });
    assert.equal(committed, false); assert.deepEqual(entries.map(e => e.event), ["SESSIONS_REVOKED", "AUDIT_WRITE_FAILED"]);
    assert.doesNotMatch(JSON.stringify(entries), /Senha|passwordHash|token|postgresql|SELECT/);
});
