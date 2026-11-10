import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import { assertTestDatabase } from "../scripts/assert-test-db.js";

test("segurança de login em PostgreSQL descartável", { skip: !process.env.TEST_DATABASE_URL }, async t => {
    assertTestDatabase(); process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.MOCK_DATA = "false";
    process.env.JWT_SECRET = "auth-security-integration-fixture-47bfc32d";
    process.env.TRUST_PROXY_IPS = "127.0.0.1/32,::1/128";
    process.env.LOGIN_RATE_IP_MAX = "1000"; process.env.LOGIN_RATE_ACCOUNT_IP_MAX = "1000";
    process.env.LOGIN_ACCOUNT_FAILURES = "3"; process.env.LOGIN_ACCOUNT_WAIT_SECONDS = "2";
    process.env.LOGIN_ACCOUNT_MAX_WAIT_SECONDS = "4";
    const { default: db } = await import("../src/config/prisma.js");
    t.after(() => db.$disconnect());
    const { criarControleConta } = await import("../src/services/loginAccountService.js");
    const { securityDigest } = await import("../src/config/authSecurity.js");
    const { hashPassword } = await import("../src/utils/password.js");
    const email = randomUUID() + "@example.test", password = "IntegracaoSegura123!";
    const user = await db.user.create({ data: { email, name: "Teste", passwordHash: await hashPassword(password) } });
    const keys = [];
    let time = Date.now();
    const clock = () => new Date(time);
    const control = criarControleConta({ clock });
    async function ticket(address = randomUUID() + "@example.test") {
        const value = await control.begin(address); keys.push(value.key); return value;
    }
    async function api() {
        const child = fork(new URL("fixtures/auth_security_api.js", import.meta.url), { env: process.env, stdio: ["ignore", "ignore", "ignore", "ipc"] });
        const [{ port }] = await once(child, "message");
        return { child, post: (address, ip, correct = false) => fetch(`http://127.0.0.1:${port}/api/auth/login`, {
            method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip },
            body: JSON.stringify({ email: address, password: correct ? password : "incorreta" }),
        }), stop: async () => { child.send("stop"); await once(child, "exit"); } };
    }
    try {
        await t.test("IPs distintos compartilham falhas; contas distintas no mesmo IP; API reiniciada", async () => {
            let server = await api();
            const missing = randomUUID() + "@example.test";
            keys.push(securityDigest("login-account", email), securityDigest("login-account", missing));
            try {
                for (const address of [email, missing]) {
                    for (let i = 1; i <= 3; i++) {
                        const response = await server.post(address, `192.0.2.${i}`);
                        assert.equal(response.status, i === 3 ? 429 : 401);
                        const body = await response.json();
                        if (i === 3) {
                            assert.equal(body.error.code, "TOO_MANY_REQUESTS");
                            assert.equal(response.headers.get("retry-after"), "2");
                        }
                    }
                }
                const another = randomUUID() + "@example.test"; keys.push(securityDigest("login-account", another));
                assert.equal((await server.post(another, "192.0.2.3")).status, 401);
                await server.stop(); server = await api();
                assert.equal((await server.post(email, "198.51.100.20", true)).status, 429);
            } finally { await server.stop(); }
        });
        await t.test("concorrência entre instâncias, teto e bloqueados não estendem espera", async () => {
            const first = await ticket();
            const secondInstance = criarControleConta({ clock });
            const tickets = await Promise.all(Array.from({ length: 8 }, () => control.begin("race-" + email)));
            keys.push(tickets[0].key);
            await Promise.all(tickets.map((v, i) => (i % 2 ? secondInstance : control).finish(v, false)));
            let state = await db.loginAccountLimit.findUnique({ where: { key: tickets[0].key } });
            assert.equal(state.revision, 8n);
            const until = +state.blockedUntil, expires = +state.expiresAt;
            for (let i = 0; i < 10; i++) assert.equal((await control.begin("race-" + email)).retryAfter, 2);
            state = await db.loginAccountLimit.findUnique({ where: { key: tickets[0].key } });
            assert.equal(+state.blockedUntil, until); assert.equal(+state.expiresAt, expires); assert.equal(state.revision, 8n);
            time += 2001;
            const allowed = await control.begin("race-" + email);
            assert.equal(await control.finish(allowed, false), 4);
            assert.equal(await control.finish(first, true), 0);
        });
        await t.test("sucesso limpa só falhas observadas; sucesso concorrente não limpa duas vezes; expiração", async () => {
            const first = await ticket(); await control.finish(first, false);
            const address = "success-" + email;
            const a = await ticket(address); await control.finish(a, false);
            const [success1, success2, bad] = await Promise.all([ticket(address), ticket(address), ticket(address)]);
            await control.finish(bad, false);
            await Promise.all([control.finish(success1, true), control.finish(success2, true)]);
            let state = await db.loginAccountLimit.findUnique({ where: { key: a.key } });
            assert.equal(state.revision - state.cleared, 1n);
            time += 86400001;
            const fresh = await ticket(address); assert.notEqual(fresh.generation, a.generation);
            await control.finish(bad, false); // Resultado atrasado de geração expirada é ignorado.
            state = await db.loginAccountLimit.findUnique({ where: { key: a.key } });
            assert.equal(state.revision, 0n); assert.equal(fresh.retryAfter, 0);
            await control.finish(fresh, false);
            const good = await ticket(address); await control.finish(good, true);
            state = await db.loginAccountLimit.findUnique({ where: { key: a.key } });
            assert.equal(state.revision, state.cleared);
        });
    } finally {
        await db.user.delete({ where: { id: user.id } });
        await db.loginAccountLimit.deleteMany({ where: { key: { in: keys } } });
        await db.$disconnect();
    }
});
