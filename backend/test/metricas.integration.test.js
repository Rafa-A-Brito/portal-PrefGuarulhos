import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertTestDatabase } from "../scripts/assert-test-db.js";

test("V2 PostgreSQL: identidade, deduplicação concorrente, rollback, FOR SHARE e consulta", {
    skip: !process.env.METRICAS_TEST_CLUSTER && "Exige cluster esperado e PostgreSQL descartável exclusivo já preparado.",
}, async t => {
    const target = assertTestDatabase();
    assert.equal(target.hostname, "loopback");
    assert.equal(target.port, Number(process.env.METRICAS_TEST_PORT));
    assert.equal(target.database, "portal_test");
    const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 3000 });
    t.after(() => client.end());
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const { rows: [identity] } = await client.query("SELECT current_database() banco, system_identifier::text cluster FROM pg_control_system()");
    assert.equal(identity.banco, target.database); assert.equal(identity.cluster, process.env.METRICAS_TEST_CLUSTER);
    await client.query("ROLLBACK");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = "metricas-integration-secret-at-least-32-characters";
    const { default: db } = await import("../src/config/prisma.js");
    t.after(() => db.$disconnect());
    const { registrarVisualizacao: registrar } = await import("../src/services/metricasService.js");
    const { consultarMetricas } = await import("../src/services/dashboardMetricasService.js");
    const key = randomUUID(), dia = "2026-10-26";
    const hash = v => createHash("sha256").update(v).digest("hex");
    const apiTarget = new URL(process.env.SECURITY_API_DATABASE_URL);
    const dbTarget = new URL(process.env.TEST_DATABASE_URL);
    assert.equal(apiTarget.host + apiTarget.pathname, dbTarget.host + dbTarget.pathname);
    assert.equal(apiTarget.username, "portal_api");
    const coletor = new PrismaClient({ adapter: new PrismaPg({ connectionString: apiTarget.href }) });
    t.after(() => coletor.$disconnect());
    const registrarVisualizacao = (evento, client = coletor) => registrar(evento, client);
    let user, cat, bem, privado, legado, segundo, regiao;
    try {
        user = await db.user.create({ data: { name: "Fixture V2", email: key + "@example.test", passwordHash: "unused" } });
        cat = await db.categoria.create({ data: { nome: key, slug: key } });
        const data = { nome: key, slug: key, descricao: "Fixture V2", descricaoResumida: "Fixture", categoriaId: cat.id, createdBy: user.id };
        bem = await db.patrimonio.create({ data: { ...data, status: "PUBLICADO" } });
        privado = await db.patrimonio.create({ data: { ...data, slug: key + "-privado", status: "RASCUNHO" } });
        legado = await db.patrimonio.create({ data: { ...data, slug: "casarao-da-nossa-historia", status: "PUBLICADO" } });
        regiao = await db.regiaoPatrimonio.create({ data: { nome: key, slug: key } });
        segundo = await db.patrimonio.create({ data: { ...data, slug: key + "-segundo", status: "PUBLICADO", regiaoId: regiao.id } });
        const evento = { patrimonioId: bem.id, dia, chaveVisitante: hash(key) };
        const resultados = await Promise.allSettled(Array.from({ length: 100 }, () => registrarVisualizacao(evento)));
        const aceitos = resultados.filter(r => r.status === "fulfilled").length;
        assert.ok(aceitos > 0);
        for (const r of resultados.filter(r => r.status === "rejected")) {
            assert.equal(r.reason.statusCode, 503); // Saturação respeita os timeouts curtos.
            await registrarVisualizacao(evento); // Retry explícito depois da rajada, mesma identidade.
        }
        const total = () => db.visualizacaoTotalDia.findUnique({ where: { dia_patrimonioId: { dia: new Date(dia), patrimonioId: bem.id } } });
        assert.equal((await total()).quantidade, 1n);
        assert.equal(await db.visualizacaoUnicaDia.count({ where: { patrimonioId: bem.id } }), 1);
        t.diagnostic(`100 tentativas simultâneas: ${aceitos} aceitas de imediato, ${100 - aceitos} indisponíveis/repetidas depois; 1 recibo, 1 visualização.`);
        for (const row of [privado, legado, { id: randomUUID() }]) {
            await assert.rejects(registrarVisualizacao({ ...evento, patrimonioId: row.id }), e => e.statusCode === 404);
        }
        // Falha depois do INSERT/incremento: prova de atomicidade real do PostgreSQL.
        const rollback = { $transaction: (fn, opts) => db.$transaction(async tx => { await fn(tx); throw new Error("falha-controlada"); }, opts) };
        await assert.rejects(registrarVisualizacao({ ...evento, chaveVisitante: hash(key + "rollback") }, rollback), e => e.statusCode === 503);
        assert.equal((await total()).quantidade, 1n);
        assert.equal(await db.visualizacaoUnicaDia.count({ where: { patrimonioId: bem.id } }), 1);
        // UPDATE pendente bloqueia FOR SHARE; timeout curto não deixa recibo parcial.
        await client.query("BEGIN");
        await client.query("UPDATE patrimonio SET name=name WHERE id=$1", [bem.id]);
        const inicio = Date.now();
        await assert.rejects(registrarVisualizacao({ ...evento, chaveVisitante: hash(key + "bloqueado") }), e => e.statusCode === 503);
        assert.ok(Date.now() - inicio < 1800);
        await client.query("ROLLBACK");
        assert.equal((await total()).quantidade, 1n);
        // Reciprocamente, FOR SHARE mantém a elegibilidade até o commit e impede UPDATE.
        await db.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM patrimonio WHERE id=${bem.id}::uuid FOR SHARE`;
            await client.query("BEGIN"); await client.query("SET LOCAL lock_timeout='200ms'");
            await assert.rejects(client.query("UPDATE patrimonio SET status='ARQUIVADO' WHERE id=$1", [bem.id]), e => e.code === "55P03");
            await client.query("ROLLBACK");
        });
        t.diagnostic("Contenção nas duas direções: timeout de lock 200 ms; nenhum incremento parcial.");
        await registrarVisualizacao({ ...evento, chaveVisitante: hash(key + "segunda") });
        await registrarVisualizacao({ ...evento, dia: "2026-10-27" });
        const dados = await consultarMetricas({ inicio: dia, fim: "2026-10-27", patrimonioId: bem.id }, db, new Date("2026-10-27T12:00:00Z"));
        assert.equal(dados.visualizacoes.totalRegistrado, "3");
        assert.equal(dados.visualizacoes.semRegiao, "3");
        assert.deepEqual(dados.visualizacoes.serie.map(s => s.quantidade), ["2", "1"]);
        await registrarVisualizacao({ ...evento, patrimonioId: segundo.id });
        let regional = await consultarMetricas({ inicio: dia, fim: dia, regiaoId: regiao.id }, coletor);
        assert.equal(regional.visualizacoes.totalRegistrado, "1");
        assert.equal(regional.visualizacoes.porRegiao[0].quantidade, "1");
        assert.equal(regional.visualizacoes.semRegiao, "0");
        await db.patrimonio.update({ where: { id: bem.id }, data: { regiaoId: regiao.id } });
        await db.regiaoPatrimonio.update({ where: { id: regiao.id }, data: { ativo: false } });
        regional = await consultarMetricas({ inicio: dia, fim: dia, regiaoId: regiao.id, limite: "1" }, coletor);
        assert.equal(regional.visualizacoes.totalRegistrado, "3");
        assert.equal(regional.visualizacoes.porPatrimonio.itens.length, 1);
        assert.equal(regional.visualizacoes.porPatrimonio.paginacao.total, 2);
        assert.equal(regional.visualizacoes.porRegiao[0].ativo, false);
        assert.equal(regional.visualizacoes.porRegiao[0].quantidade, "3");
        await assert.rejects(client.query("UPDATE visualizacoes_totais_dia SET quantidade=-1 WHERE patrimonio_id=$1", [bem.id]), e => e.code === "23514");
        await assert.rejects(client.query("DELETE FROM patrimonio WHERE id=$1", [bem.id]), e => e.code === "23503");
        t.diagnostic("Papel portal_api: ingestão e leitura sem DDL; UUIDs distintos, região atual/inativa, paginação e constraints conferidos.");
        await db.patrimonio.update({ where: { id: bem.id }, data: { status: "ARQUIVADO" } });
        await assert.rejects(registrarVisualizacao({ ...evento, chaveVisitante: hash(key + "arquivado") }), e => e.statusCode === 404);
        assert.equal((await consultarMetricas({ inicio: dia, fim: dia, patrimonioId: bem.id }, db)).visualizacoes.totalRegistrado, "2");
    } finally {
        await client.query("ROLLBACK");
        const ids = [bem, privado, legado, segundo].filter(Boolean).map(p => p.id);
        await db.visualizacaoUnicaDia.deleteMany({ where: { patrimonioId: { in: ids } } });
        await db.visualizacaoTotalDia.deleteMany({ where: { patrimonioId: { in: ids } } });
        await db.patrimonio.deleteMany({ where: { id: { in: ids } } });
        if (regiao) await db.regiaoPatrimonio.delete({ where: { id: regiao.id } });
        if (cat) await db.categoria.delete({ where: { id: cat.id } });
        if (user) await db.user.delete({ where: { id: user.id } });
    }
});
