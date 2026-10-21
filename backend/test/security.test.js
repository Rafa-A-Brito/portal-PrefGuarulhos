import assert from "node:assert/strict";
import { test, after } from "node:test";
import { spawnSync } from "node:child_process";
import bcrypt from "bcrypt";
import { createRequire } from "node:module";

process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/security_test";
process.env.JWT_SECRET = "security-regression-fixture-with-32-characters";
process.env.TRUST_PROXY_IPS = "";
process.env.LOGIN_RATE_ACCOUNT_IP_MAX = "2";
const { criarLimitadorLogin } = await import("../src/middlewares/loginLimiter.js");
const { login } = await import("../src/services/authService.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { default: app } = await import("../src/app.js");
const server = app.listen(0);
await new Promise(resolve => server.once("listening", resolve));
const base = "http://127.0.0.1:" + server.address().port;
after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });

function attempt(limiter, ip, email) {
    const headers = {};
    let error;
    limiter({ ip, body: { email } }, { setHeader: (key, value) => { headers[key] = value; } }, value => { error = value; });
    return { headers, error };
}

test("limite conta/IP normaliza e-mail, Retry-After decresce e janela expira", () => {
    let time = 0;
    const limiter = criarLimitadorLogin({ ipMax: 20, accountMax: 2, windowMs: 10000, now: () => time });
    assert.equal(attempt(limiter, "192.0.2.1", "User@example.test").error, undefined);
    assert.equal(attempt(limiter, "192.0.2.1", " user@example.test ").error, undefined);
    assert.equal(attempt(limiter, "192.0.2.2", "user@example.test").error, undefined);
    time = 1500;
    const blocked = attempt(limiter, "192.0.2.1", "USER@example.test");
    assert.equal(blocked.error.statusCode, 429);
    assert.equal(blocked.headers["Retry-After"], 9);
    time = 10000;
    assert.equal(attempt(limiter, "192.0.2.1", "user@example.test").error, undefined);
});

test("limite por IP impede alternância de contas e agrupa IPv6 /64", () => {
    const limiter = criarLimitadorLogin({ ipMax: 2, accountMax: 2 });
    assert.equal(attempt(limiter, "2001:db8:1:2::1", "a@example.test").error, undefined);
    assert.equal(attempt(limiter, "2001:db8:1:2::2", "b@example.test").error, undefined);
    assert.equal(attempt(limiter, "2001:db8:1:2::3", "c@example.test").error.statusCode, 429);
    assert.equal(attempt(limiter, "2001:db8:1:3::1", "c@example.test").error, undefined);
});

test("armazenamento limitado não libera tentativas quando está cheio", () => {
    const limiter = criarLimitadorLogin({ maxEntries: 1 });
    assert.equal(attempt(limiter, "192.0.2.1", "a@example.test").error, undefined);
    assert.equal(attempt(limiter, "192.0.2.2", "b@example.test").error.statusCode, 429);
});

test("inexistente e inativo comparam hash fictício custo 12; mensagem genérica", async t => {
    const originalFind = prisma.user.findUnique;
    t.after(() => { prisma.user.findUnique = originalFind; });
    const compared = [];
    t.mock.method(bcrypt, "compare", async (password, hash) => { compared.push({ password, hash }); return false; });
    for (const user of [null, { isActive: false, passwordHash: "hash-inativo" }, { isActive: true, passwordHash: "hash-ativo" }]) {
        prisma.user.findUnique = async () => user;
        await assert.rejects(login({ email: "user@example.test", password: "incorreta" }), { message: "E-mail ou senha incorretos.", statusCode: 401 });
    }
    assert.equal(compared.length, 3);
    assert.equal(compared[0].hash, compared[1].hash);
    assert.match(compared[0].hash, /^\$2b\$12\$/);
    assert.equal(compared[2].hash, "hash-ativo");
});

test("login HTTP retorna envelope 429 e ignora XFF de acesso direto", async t => {
    const original = prisma.user.findUnique;
    prisma.user.findUnique = async () => null;
    t.after(() => { prisma.user.findUnique = original; });
    t.mock.method(bcrypt, "compare", async () => false);
    for (let i = 0; i < 3; i++) {
        const response = await fetch(base + "/api/auth/login", { method: "POST",
            headers: { "Content-Type": "application/json", "X-Forwarded-For": "192.0.2." + (i + 1), Origin: "http://localhost:5173" },
            body: JSON.stringify({ email: "http@example.test", password: "incorreta" }) });
        assert.equal(response.status, i < 2 ? 401 : 429);
        const body = await response.json();
        assert.equal(body.success, false);
        if (i === 2) {
            assert.equal(body.error.code, "TOO_MANY_REQUESTS");
            assert.ok(Number(response.headers.get("retry-after")) > 0);
            assert.match(response.headers.get("access-control-expose-headers"), /Retry-After/);
        }
    }
});

test("proxy confiável usa o cliente à direita sem aceitar IP anterior injetado", async t => {
    const originalFind = prisma.user.findUnique, originalProxy = app.get("trust proxy");
    app.set("trust proxy", ["127.0.0.1/32", "::1/128"]);
    prisma.user.findUnique = async () => null;
    t.after(() => { prisma.user.findUnique = originalFind; app.set("trust proxy", originalProxy); });
    t.mock.method(bcrypt, "compare", async () => false);
    for (let i = 0; i < 3; i++) {
        const response = await fetch(base + "/api/auth/login", { method: "POST", headers: {
            "Content-Type": "application/json", "X-Forwarded-For": `198.51.100.${i + 1}, 192.0.2.20`,
        }, body: JSON.stringify({ email: "proxy@example.test", password: "incorreta" }) });
        assert.equal(response.status, i < 2 ? 401 : 429);
        await response.arrayBuffer();
    }
});

test("proxy-addr corrigido não converte sub-rede IPv6 em confiança em todo IPv4", () => {
    const proxyaddr = createRequire(import.meta.url)("proxy-addr");
    for (const subnet of ["::ffff:10.0.0.0/8", "::/1"]) {
        const trust = proxyaddr.compile([subnet]);
        assert.equal(trust("198.51.100.1"), false);
    }
});

test("Swagger, JS e CORS mantêm acesso com cabeçalhos seguros sem CSP/CORP global", async () => {
    for (const route of ["/api/docs/", "/api/docs/swagger-ui-bundle.js", "/api/docs.json"]) {
        const response = await fetch(base + route, { headers: { Origin: "http://localhost:5173" } });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.equal(response.headers.get("x-powered-by"), null);
        assert.equal(response.headers.get("content-security-policy"), null);
        assert.equal(response.headers.get("cross-origin-resource-policy"), null);
        assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
        await response.arrayBuffer();
    }
});

test("JWT recusa placeholders e erros não revelam valores; proxy só aceita IP/CIDR", () => {
    const config = new URL("../src/config/env.js", import.meta.url).href;
    for (const JWT_SECRET of ["SUBSTITUA_POR_SEGREDO_ALEATORIO_COM_32_OU_MAIS_CARACTERES", "change-me-".repeat(5), "a".repeat(40), "curto"]) {
        const result = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(config)})`],
            { encoding: "utf8", env: { ...process.env, JWT_SECRET } });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /JWT_SECRET/);
        assert.ok(!result.stderr.includes(JWT_SECRET));
    }
    for (const TRUST_PROXY_IPS of ["true", "1", "0.0.0.0/99"]) {
        const result = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(config)})`],
            { encoding: "utf8", env: { ...process.env, TRUST_PROXY_IPS } });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /TRUST_PROXY_IPS/);
    }
});
