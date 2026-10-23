import assert from "node:assert/strict";
import { after, test } from "node:test";

// Segurança: testes de HTTP sem banco real. Essas rotas falham na validação
// ou na autenticação antes de qualquer operação de persistência.
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/portal_cache_test";
process.env.JWT_SECRET = "fixture-segura-de-cache-com-mais-de-32-caracteres";
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
});

test("erros de login, token e acesso administrativo não são armazenáveis", async () => {
    const cases = [
        ["/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 400],
        ["/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 400],
        ["/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 400],
        ["/api/auth/senha", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }, 401],
        ["/api/admins", {}, 401],
        ["/api/admin/patrimonios", {}, 401],
        ["/api/admin/novidades", {}, 401],
        ["/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }, 400],
        ["/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "a".repeat(110000) }) }, 413],
        ["/api/auth/inexistente", {}, 404],
    ];
    for (const [path, options, status] of cases) {
        const response = await fetch(base + path, options);
        assert.equal(response.status, status, path);
        assert.match(response.headers.get("cache-control") ?? "", /\bno-store\b/i, path);
        await response.arrayBuffer();
    }
});

test("o healthcheck público conserva o contrato", async () => {
    const response = await fetch(base + "/api/health");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), null);
    assert.deepEqual(await response.json(), { success: true, data: { status: "ok" } });
});
