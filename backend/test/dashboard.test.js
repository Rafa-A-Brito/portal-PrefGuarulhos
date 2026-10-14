import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/dashboard_test";
process.env.JWT_SECRET = "dashboard-test-secret-with-at-least-32-characters";
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { getDashboard } = await import("../src/services/dashboardService.js");
const { generateToken } = await import("../src/utils/token.js");
let server, url;
before(async () => { server = app.listen(0); await new Promise(r => server.once("listening", r)); url = "http://127.0.0.1:" + server.address().port + "/api/admin/dashboard"; });
after(async () => { await new Promise(r => server.close(r)); await prisma.$disconnect(); });
function stub(t, target, key, fn) { const old = target[key]; target[key] = fn; t.after(() => { target[key] = old; }); }
function snapshot(t, empty = false) {
    stub(t, prisma, "$transaction", async (fn, options) => {
        assert.equal(options.isolationLevel, "RepeatableRead");
        let readonly = false;
        return fn({
            $executeRawUnsafe: async sql => { assert.equal(sql, "SET TRANSACTION READ ONLY"); readonly = true; },
            patrimonio: {
                count: async () => { assert.ok(readonly); return empty ? 0 : 4; },
                groupBy: async ({ by }) => empty ? [] : by[0] === "status"
                    ? [ { status: "PUBLICADO", _count: { _all: 2 } }, { status: "RASCUNHO", _count: { _all: 1 } }, { status: "ARQUIVADO", _count: { _all: 1 } } ]
                    : [{ categoriaId: "cat", _count: { _all: 4 } }],
            },
            categoria: { findMany: async () => [{ id: "cat", nome: "Histórico", slug: "historico" }] },
            localizacao: { groupBy: async () => empty ? [] : [ { bairro: " Centro ", _count: { _all: 1 } }, { bairro: "Centro", _count: { _all: 1 } }, { bairro: "", _count: { _all: 1 } } ] },
        });
    });
}
test("dashboard é coerente: todos os status, principal sem duplicação e sem bairro/localização", async t => {
    snapshot(t);
    const result = await getDashboard();
    assert.equal(result.total, 4); assert.equal(result.PUBLICADO, 2); assert.equal(result.RASCUNHO, 1); assert.equal(result.ARQUIVADO, 1);
    assert.deepEqual(result.porBairro, [{ bairro: "Centro", quantidade: 2 }, { bairro: "Não informado", quantidade: 2 }]);
    assert.equal(result.porCategoria.reduce((n, c) => n + c.quantidade, 0), result.total);
    assert.deepEqual(result.meta, { baseContagem: "TODOS_OS_STATUS", categoria: "PRINCIPAL", publicados: 2 });
});
test("dashboard vazio não inventa distribuição", async t => {
    snapshot(t, true); const result = await getDashboard();
    assert.equal(result.total, 0); assert.deepEqual(result.porBairro, []); assert.deepEqual(result.porCategoria, []);
});
test("endpoint agregado exige autenticação e preserva acesso ADMIN/EDITOR", async t => {
    assert.equal((await fetch(url)).status, 401);
    snapshot(t); let role = "ADMIN";
    const id = randomUUID(); stub(t, prisma.user, "findUnique", async () => ({ id, role, isActive: true }));
    for (role of ["ADMIN", "EDITOR"]) {
        const response = await fetch(url, { headers: { authorization: "Bearer " + generateToken(id) } });
        assert.equal(response.status, 200); assert.equal((await response.json()).data.total, 4);
    }
});
