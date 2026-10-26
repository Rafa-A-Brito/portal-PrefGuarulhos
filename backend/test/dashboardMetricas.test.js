import { test, after } from "node:test";
import assert from "node:assert/strict";
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/metricas_test";
process.env.JWT_SECRET = "metricas-admin-secret-at-least-32-characters";
process.env.METRICAS_COLETA_ATIVA = "false";
process.env.METRICAS_CONSULTA_ATIVA = "true";
const { default: app } = await import("../src/app.js");
const { default: db } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
after(() => db.$disconnect());

test("consulta habilitada: contrato HTTP, BigInt decimal, filtros e transação somente leitura", async t => {
    const oldTransaction = db.$transaction, oldUser = db.user.findUnique;
    t.after(() => { db.$transaction = oldTransaction; db.user.findUnique = oldUser; });
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    let falhar = false, chamadas = 0, ativo = true;
    db.user.findUnique = async () => ({ id, role: "EDITOR", isActive: ativo, tokenVersion: 0,
        authSessions: [{ tokenVersion: 0, expiresAt: new Date(Date.now() + 60000), revokedAt: null }] });
    db.$transaction = async (fn, options) => {
        chamadas++;
        if (falhar) throw new Error("indisponibilidade simulada");
        assert.equal(options.isolationLevel, "RepeatableRead");
        const commands = [], results = [
            [{ quantidade: "9007199254740993", bens: 1 }],
            [{ id, nome: "Fixture", slug: "fixture", status: "ARQUIVADO", quantidade: "9007199254740993" }],
            [{ id: null, nome: null, slug: null, ativo: null, quantidade: "9007199254740993" }],
            [{ data: "2026-01-01", quantidade: "9007199254740993" }],
        ];
        const data = await fn({ $executeRawUnsafe: async sql => { commands.push(sql); }, $queryRaw: async (strings, ...values) => {
            assert.match(strings.join("?"), /SELECT/);
            assert.ok(values.flatMap(v => v.values ?? [v]).includes("2026-01-01")); return results.shift();
        } });
        assert.equal(commands[0], "SET TRANSACTION READ ONLY");
        assert.equal(results.length, 0);
        return data;
    };
    const server = app.listen(0, "127.0.0.1"); await new Promise(r => server.once("listening", r));
    try {
        const base = "http://127.0.0.1:" + server.address().port + "/api/admin/dashboard/metricas";
        const headers = { Authorization: "Bearer " + generateToken(id, 0, id) };
        const response = await fetch(base + "?inicio=2026-01-01&fim=2026-01-01&semRegiao=true", { headers });
        assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /no-store/);
        const { success, data } = await response.json();
        assert.equal(success, true); assert.equal(data.visualizacoes.totalRegistrado, "9007199254740993");
        assert.equal(data.visualizacoes.semRegiao, data.visualizacoes.totalRegistrado);
        assert.deepEqual(data.visualizacoes.porRegiao, []); assert.equal(data.visualizacoes.porPatrimonio.paginacao.total, 1);
        assert.equal(data.meta.cobertura, "NAO_INSTRUMENTADA"); assert.equal(data.favoritos.disponivel, false);
        for (const query of ["", "?inicio=2026-02-30&fim=2026-03-01", "?inicio=2024-01-01&fim=2026-01-01", "?inicio=2999-01-01&fim=2999-01-01",
            "?inicio=2026-01-01&fim=2026-01-01&regiaoId=" + id + "&semRegiao=true", "?inicio=2026-01-01&fim=2026-01-01&granularidade=mes"]) {
            assert.equal((await fetch(base + query, { headers })).status, 400);
        }
        assert.equal(chamadas, 1); // Falhas de contrato recusadas antes do banco.
        falhar = true;
        assert.equal((await fetch(base + "?inicio=2026-01-01&fim=2026-01-01", { headers })).status, 503);
        ativo = false;
        assert.equal((await fetch(base, { headers })).status, 401);
    } finally { await new Promise(r => server.close(r)); }
});
