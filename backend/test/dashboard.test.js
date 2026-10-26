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
                    : by[0] === "situacao" ? [{ situacao: "DEMOLIDO", _count: { _all: 1 } }, { situacao: "PRESERVADO", _count: { _all: 3 } }]
                    : by[0] === "regiaoId" ? [{ regiaoId: "centro", _count: { _all: 2 } }, { regiaoId: "inativa", _count: { _all: 1 } }, { regiaoId: null, _count: { _all: 1 } }]
                    : [{ categoriaId: "cat", _count: { _all: 4 } }],
                findMany: async ({ where }) => {
                    assert.equal(where.OR.length, 2);
                    return empty ? [] : [{ id: "legado", nome: "Casarão da Nossa História", slug: "casarao-da-nossa-historia", status: "ARQUIVADO" }];
                },
            },
            categoria: { findMany: async () => [{ id: "cat", nome: "Histórico", slug: "historico" }, ...Array.from({length: 6}, (_, i) => ({ id: "zero" + i, nome: "Categoria " + i, slug: "categoria-" + i }))] },
            patrimonioCategoria: { groupBy: async () => empty ? [] : [{ categoriaId: "zero0", _count: { _all: 3 } }] },
            regiaoPatrimonio: { findMany: async () => [
                { id: "centro", nome: "Centro", slug: "centro", ativo: true },
                { id: "inativa", nome: "Região inativa", slug: "inativa", ativo: false },
                { id: "vazia", nome: "Região vazia", slug: "vazia", ativo: true },
            ] },
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
    assert.equal(result.porCategoria.length, 7);
    assert.equal(result.porCategoria.find(c => c.id === "zero0").quantidade, 0);
    assert.equal(result.porCategoria.find(c => c.id === "zero0").quantidadeSecundaria, 3);
    assert.equal(result.porSituacao.length, 6);
    assert.equal(result.porSituacao.find(s => s.situacao === "EM_RUINAS").quantidade, 0);
    assert.equal(result.porSituacao.reduce((n, s) => n + s.quantidade, 0), result.total);
    assert.equal(result.porRegiao.reduce((n, r) => n + r.quantidade, result.semRegiao), result.total);
    assert.equal(result.semRegiao, 1);
    assert.equal(result.porRegiao.find(r => !r.ativo).quantidade, 1);
    assert.equal(result.porRegiao.find(r => r.id === "vazia").quantidade, 0);
    assert.equal(result.porRegiao.some(r => r.id === null), false);
    assert.equal(result.legados.arquivados, 1);
    assert.equal(result.legados.itens[0].canonico, "casa-jose-mauricio");
});
test("dashboard vazio não inventa distribuição", async t => {
    snapshot(t, true); const result = await getDashboard();
    assert.equal(result.total, 0); assert.deepEqual(result.porBairro, []);
    for (const serie of [result.porCategoria, result.porSituacao, result.porRegiao]) assert.ok(serie.every(i => i.quantidade === 0));
    assert.equal(result.semRegiao, 0);
    assert.deepEqual(result.legados, { total: 0, arquivados: 0, itens: [] });
});
test("endpoint agregado exige autenticação e preserva acesso ADMIN/EDITOR", async t => {
    assert.equal((await fetch(url)).status, 401);
    snapshot(t); let role = "ADMIN";
    const id = randomUUID(); stub(t, prisma.user, "findUnique", async () => ({ id, role, authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }], tokenVersion: 0, isActive: true }));
    for (role of ["ADMIN", "EDITOR"]) {
        const response = await fetch(url, { headers: { authorization: "Bearer " + generateToken(id, 0, id) } });
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.success, true);
        assert.deepEqual(body.data, await getDashboard());
    }
});
