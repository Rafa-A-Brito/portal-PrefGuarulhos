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
    const { criarRegistroAcessos, accessSignals } = await import("../src/services/loginAccessService.js");
    const { security, securityDigest } = await import("../src/config/authSecurity.js");
    const { hashPassword } = await import("../src/utils/password.js");
    const { logOutput } = await import("../src/utils/logger.js");
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
        await t.test("login responde com o contrato atual mesmo quando o registro assíncrono falha", async () => {
            const { default: app } = await import("../src/app.js");
            const { loginAccesses } = await import("../src/services/loginAccessService.js");
            const original = loginAccesses.record;
            const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
            let release, started;
            const pending = new Promise(resolve => { release = resolve; });
            const began = new Promise(resolve => { started = resolve; });
            loginAccesses.record = async () => { started(); await pending; throw new Error("indisponibilidade simulada"); };
            try {
                await db.loginAccountLimit.deleteMany({ where: { key: securityDigest("login-account", email) } });
                const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
                    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }),
                });
                assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
                const body = await response.json(); assert.equal(body.success, true);
                assert.ok(body.data.token); assert.ok(body.data.refreshToken); assert.ok(body.data.sessionExpiresAt);
                await began; // A resposta já chegou enquanto o trabalho secundário segue pendente.
                release(); await new Promise(resolve => setImmediate(resolve));
            } finally { release(); loginAccesses.record = original; await new Promise(resolve => server.close(resolve)); }
        });
        const chrome = "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36";
        const firefox = "Mozilla/5.0 (Windows NT 10.0) Firefox/131.0";
        const signals = (ip, userAgent = chrome) => ({ ip, userAgent });
        const sent = [], logs = [], originalLog = logOutput.write;
        logOutput.write = (_level, line) => logs.push(line);
        const config = { ...security, AUTH_ALERT_ENABLED: true };
        const accesses = criarRegistroAcessos({ clock, config, locate: async () => null, transport: async message => sent.push(message) });
        try {
            await t.test("referência, navegador/rede conhecidos, troca só de IP/rede não alerta", async () => {
                assert.equal((await accesses.record(user.id, signals("192.0.2.1"))).suspicious, false);
                assert.equal((await accesses.record(user.id, signals("192.0.2.90"))).suspicious, false);
                assert.equal((await accesses.record(user.id, signals("198.51.100.3"))).suspicious, false);
                assert.equal((await accesses.record(user.id, signals("198.51.100.4", firefox))).suspicious, false);
                assert.equal(sent.length, 0);
                assert.deepEqual(accessSignals(signals("2001:db8:1:2::1")), accessSignals(signals("2001:0db8:0001:9::5")));
            });
            await t.test("suspeita, reserva concorrente/deduplicação, destinatário cadastrado e envio fora do login", async () => {
                const safari = "Mozilla/5.0 (iPhone) Safari/605.1";
                const rows = await Promise.all(Array.from({ length: 5 }, () => accesses.record(user.id, signals("203.0.113.7", safari))));
                assert.equal(rows.filter(r => r.suspicious).length, 1);
                assert.equal(rows.filter(r => r.deliveryState === "pending").length, 1);
                assert.equal(sent.length, 0);
                await Promise.all([accesses.deliver(), accesses.deliver()]);
                assert.equal(sent.length, 1); assert.equal(sent[0].to, email);
                assert.equal((await accesses.record(user.id, signals("203.0.114.1", "Mozilla (Linux) Edg/130.0"))).deliveryState, "none");
            });
            await t.test("localização e provedor indisponíveis; fila persiste e tenta de novo; cooldown", async () => {
                time += 86400001;
                const unavailable = criarRegistroAcessos({ clock, config, locate: async () => { throw new Error("senha-token-cookie"); },
                    transport: async () => { throw new Error("senha-token-cookie"); } });
                const row = await unavailable.record(user.id, signals("10.2.3.4", "Mozilla (Android) OPR/90.0"));
                assert.equal(row.suspicious, true); assert.equal(row.regionKey, null); assert.equal(row.deliveryState, "pending");
                await unavailable.deliver();
                const stored = await db.loginAccess.findUnique({ where: { id: row.id } });
                assert.equal(stored.deliveryState, "pending"); assert.equal(stored.attempts, 1);
                await db.loginAccess.update({ where: { id: row.id }, data: { availableAt: clock() } });
                await accesses.deliver(); assert.equal(sent.length, 2);
                assert.doesNotMatch(logs.join(""), /senha-token-cookie|203\.0\.113|Safari|password|refreshToken/);
            });
            await t.test("lease abandonada é recuperada por outra instância; envio falha após três tentativas", async () => {
                time += 86400001;
                const row = await accesses.record(user.id, signals("10.4.5.6", "Mozilla (Linux) Safari/605.1"));
                assert.equal(row.deliveryState, "pending");
                await db.loginAccess.update({ where: { id: row.id }, data: {
                    deliveryState: "sending", attempts: 1, lease: randomUUID(), availableAt: new Date(time - 1),
                } });
                time += 86400001;
                const waiting = await accesses.record(user.id, signals("10.9.8.7", "Mozilla (Macintosh) Edg/130.0"));
                assert.equal(waiting.deliveryState, "none"); // Uma pendência impede acumular avisos em dias diferentes.
                const otherWorker = criarRegistroAcessos({ clock, config, transport: async message => sent.push(message) });
                const count = sent.length;
                await Promise.all([otherWorker.deliver(), accesses.deliver()]);
                assert.equal(sent.length, count + 1); assert.equal(sent.at(-1).idempotencyKey, row.id);
                const delivered = await db.loginAccess.findUnique({ where: { id: row.id } });
                assert.equal(+delivered.noticeAt, time); // Intervalo começa na entrega efetiva, não na reserva antiga.
                time += 86400001;
                const next = await accesses.record(user.id, signals("10.5.6.7", "Mozilla (Windows) OPR/90.0"));
                assert.equal(next.deliveryState, "pending");
                const broken = criarRegistroAcessos({ clock, config, transport: async () => { throw new Error("offline"); } });
                for (let i = 1; i <= 3; i++) {
                    assert.equal(await broken.deliver(), true);
                    const stored = await db.loginAccess.findUnique({ where: { id: next.id } });
                    assert.equal(stored.attempts, i); assert.equal(stored.deliveryState, i === 3 ? "failed" : "pending");
                    if (i < 3) await db.loginAccess.update({ where: { id: next.id }, data: { availableAt: clock() } });
                }
                assert.equal(await broken.deliver(), false);
            });
            await t.test("região opcional combina com navegador; desativado não enfileira; retenção e limpeza", async () => {
                const regional = criarRegistroAcessos({ clock, config: { ...config, AUTH_ALERT_ENABLED: false }, locate: async () => "BR-SP" });
                await regional.record(user.id, signals("192.0.2.1"));
                const newRegion = criarRegistroAcessos({ clock, config: { ...config, AUTH_ALERT_ENABLED: false }, locate: async () => "BR-RJ" });
                const row = await newRegion.record(user.id, signals("192.0.2.1", "Mozilla (Macintosh) Firefox/131.0"));
                assert.equal(row.suspicious, true); assert.equal(row.deliveryState, "none");
                const serialized = JSON.stringify(row);
                assert.doesNotMatch(serialized, /192\.0\.2|Mozilla|BR-RJ|passwordHash|refreshToken|cookie/);
                await db.loginAccess.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
                await db.loginAccountLimit.updateMany({ where: { key: { in: keys } }, data: { expiresAt: new Date(0) } });
                await accesses.cleanup();
                assert.equal(await db.loginAccess.count({ where: { userId: user.id } }), 0);
                assert.equal(await db.loginAccountLimit.count({ where: { key: { in: keys } } }), 0);
            });
        } finally { logOutput.write = originalLog; }
    } finally {
        await db.user.delete({ where: { id: user.id } });
        await db.loginAccountLimit.deleteMany({ where: { key: { in: keys } } });
        await db.$disconnect();
    }
});
