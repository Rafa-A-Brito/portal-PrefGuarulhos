import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertTestDatabase } from "../scripts/assert-test-db.js";
import { conectarOperacao } from "../scripts/metricas_operacao.js";
import { reterMetricas, registrarSonda } from "../src/services/operacaoMetricasService.js";

test("operação em cluster descartável: migration, retenção, cobertura, concorrência e privilégios", {
    skip: !process.env.METRICAS_OPERACAO_CLUSTER && "Exige cluster descartável exclusivo identificado e papel operacional.",
}, async t => {
    const target = assertTestDatabase();
    assert.equal(target.database, "portal_test"); assert.equal(target.hostname, "loopback");
    assert.equal(target.port, Number(process.env.METRICAS_TEST_PORT));
    const admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL }); await admin.connect(); t.after(() => admin.end());
    await admin.query("BEGIN READ ONLY");
    const { rows: [id] } = await admin.query("SELECT current_database() banco,system_identifier::text cluster FROM pg_control_system()");
    assert.equal(id.banco, "portal_test"); assert.equal(id.cluster, process.env.METRICAS_OPERACAO_CLUSTER);
    await admin.query("ROLLBACK");
    const normal = new URL(process.env.TEST_DATABASE_URL);
    for (const value of [process.env.SECURITY_API_DATABASE_URL, process.env.METRICAS_OPERACAO_URL]) {
        const u = new URL(value); assert.equal(u.host + u.pathname, normal.host + normal.pathname);
    }
    const op = await conectarOperacao(); t.after(() => op.end());
    const api = new pg.Client({ connectionString: process.env.SECURITY_API_DATABASE_URL }); await api.connect(); t.after(() => api.end());
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.SECURITY_API_DATABASE_URL }) }); t.after(() => prisma.$disconnect());
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = "operacao-integration-test-only-with-32-chars";
    const { registrarVisualizacao } = await import("../src/services/metricasService.js");
    const { consultarMetricas } = await import("../src/services/dashboardMetricasService.js");
    const { default: singleton } = await import("../src/config/prisma.js"); t.after(() => singleton.$disconnect());
    const agora = new Date("2026-10-27T12:12:00Z"), uuid = randomUUID(), cat = randomUUID(), user = randomUUID();
    const chave = n => createHash("sha256").update(uuid + n).digest("hex");
    const limparOperacao = async () => {
        await admin.query("DELETE FROM visualizacoes_unicas_dia WHERE patrimonio_id=$1", [uuid]);
        await admin.query("DELETE FROM visualizacoes_totais_dia WHERE patrimonio_id=$1", [uuid]);
        await admin.query("DELETE FROM sondas_metricas; DELETE FROM dias_metricas_conferidos; DELETE FROM operacao_metricas");
    };
    // Só roda em banco exclusivo: não apaga sondas ou checkpoints de outra execução.
    assert.equal((await admin.query("SELECT count(*)::int n FROM operacao_metricas")).rows[0].n, 0);
    t.afterEach(async () => { await admin.query("ROLLBACK; SELECT pg_advisory_unlock_all()"); await limparOperacao(); });
    try {
        await admin.query("INSERT INTO users(id,name,email,password_hash) VALUES($1,'Operação fixture',$2,'unused')", [user, user + "@example.test"]);
        await admin.query("INSERT INTO categoria(id,nome,slug) VALUES($1,$2,$2)", [cat, cat]);
        await admin.query("INSERT INTO patrimonio(id,name,slug,descricao,descricao_resumida,categoria_id,created_by,status) VALUES($1,$2,$2,'fixture','fixture',$3,$4,'PUBLICADO')", [uuid, uuid, cat, user]);
        const inserir = async (dia, n) => {
            for (let i = 0; i < n; i++) await admin.query("INSERT INTO visualizacoes_unicas_dia VALUES($1,$2,$3)", [dia, uuid, chave(i)]);
            await admin.query("INSERT INTO visualizacoes_totais_dia VALUES($1,$2,$3)", [dia, uuid, n]);
        };
        await t.test("onze migrations registradas, checksum integral e donos sem DDL para API/operação", async () => {
            const { rows } = await admin.query("SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name");
            assert.equal(rows.filter(r => r.finished_at && !r.rolled_back_at).length, 11);
            for (const r of rows) {
                assert.ok(r.finished_at || r.rolled_back_at);
                const sql = await readFile(new URL(`../prisma/migrations/${r.migration_name}/migration.sql`, import.meta.url));
                assert.equal(createHash("sha256").update(sql).digest("hex"), r.checksum);
            }
            assert.equal((await admin.query("SELECT tableowner FROM pg_tables WHERE tablename='operacao_metricas'")).rows[0].tableowner, "portal_migrator");
            for (const c of [api, op]) {
                const { rows: [r] } = await c.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user");
                assert.ok(Object.values(r).every(v => v === false));
                await assert.rejects(c.query("CREATE TABLE operacao_proibida(id int)"), { code: "42501" });
                await assert.rejects(c.query("SET ROLE portal_migrator"), { code: "42501" });
            }
            for (const sql of ["SELECT * FROM _prisma_migrations", "DELETE FROM visualizacoes_unicas_dia", "DELETE FROM visualizacoes_totais_dia", "UPDATE operacao_metricas SET id=1", "DELETE FROM sondas_metricas"]) await assert.rejects(api.query(sql), { code: "42501" });
            for (const sql of ["SELECT * FROM users", "UPDATE visualizacoes_totais_dia SET quantidade=0", "INSERT INTO visualizacoes_unicas_dia VALUES('2026-10-27',gen_random_uuid(),repeat('a',64))"]) await assert.rejects(op.query(sql), { code: "42501" });
            await assert.rejects(admin.query("INSERT INTO operacao_metricas(id) VALUES(2)"), { code: "23514" });
        });
        await t.test("divergência não altera contadores nem remove recibos", async () => {
            await inserir("2026-10-18", 2);
            await admin.query("UPDATE visualizacoes_totais_dia SET quantidade=3 WHERE patrimonio_id=$1", [uuid]);
            await assert.rejects(reterMetricas(op, { agora }), /RECONCILIACAO_DIVERGENTE/);
            assert.equal((await admin.query("SELECT count(*)::int n FROM visualizacoes_unicas_dia WHERE patrimonio_id=$1", [uuid])).rows[0].n, 2);
            assert.equal((await admin.query("SELECT count(*)::int n FROM dias_metricas_conferidos")).rows[0].n, 0);
            await limparOperacao();
        });
        await t.test("rollback após DELETE e selo; retomada em lotes sem recontar recibos parciais", async () => {
            await inserir("2026-10-19", 3);
            const falha = { query: async (sql, args) => { const result = await op.query(sql, args); if (sql.startsWith("DELETE FROM visualizacoes_unicas")) throw new Error("FALHA_INJETADA"); return result; } };
            await assert.rejects(reterMetricas(falha, { agora, lote: 1 }), /FALHA_INJETADA/);
            assert.equal((await admin.query("SELECT count(*)::int n FROM visualizacoes_unicas_dia")).rows[0].n, 3);
            assert.equal((await admin.query("SELECT count(*)::int n FROM dias_metricas_conferidos")).rows[0].n, 0);
            assert.equal((await reterMetricas(op, { agora, lote: 1, maxLotes: 1 })).estado, "PENDENTE");
            assert.equal((await admin.query("SELECT count(*)::int n FROM visualizacoes_unicas_dia")).rows[0].n, 2);
            assert.equal((await reterMetricas(op, { agora, lote: 1 })).estado, "CONCLUIDA");
            assert.equal((await admin.query("SELECT quantidade::text q FROM visualizacoes_totais_dia")).rows[0].q, "3");
            const repetida = await reterMetricas(op, { agora }); assert.equal(repetida.recibos, 0); assert.equal(repetida.estado, "CONCLUIDA");
            await assert.rejects(registrarVisualizacao({ dia: "2026-10-19", patrimonioId: uuid, chaveVisitante: chave(99) }, prisma), e => e.statusCode === 503);
            await limparOperacao();
        });
        await t.test("fronteiras inclusivas e expurgo de sondas por dia paulista", async () => {
            for (const dia of ["2025-09-26", "2025-09-27", "2026-10-19", "2026-10-20"]) await inserir(dia, 1);
            await registrarSonda(op, "DISPONIVEL", new Date("2025-09-27T02:55:00Z"));
            await registrarSonda(op, "DISPONIVEL", new Date("2025-09-27T03:00:00Z"));
            const r = await reterMetricas(op, { agora }); assert.equal(r.estado, "CONCLUIDA"); assert.equal(r.recibos, 3); assert.equal(r.agregados, 1); assert.equal(r.sondas, 1);
            assert.equal((await admin.query("SELECT dia::text d FROM visualizacoes_unicas_dia")).rows[0].d, "2026-10-20");
            assert.equal((await admin.query("SELECT min(dia)::text d FROM visualizacoes_totais_dia")).rows[0].d, "2025-09-27");
            await limparOperacao();
        });
        await t.test("lock da tarefa e conflito com coleta no mesmo dia; coleta atual permanece possível", async () => {
            await inserir("2026-10-19", 1);
            await admin.query("SELECT pg_advisory_lock(21400,1)");
            assert.equal((await reterMetricas(op, { agora })).estado, "EM_EXECUCAO");
            await admin.query("SELECT pg_advisory_unlock(21400,1)");
            await admin.query("BEGIN; SELECT pg_advisory_xact_lock_shared(21401,20261019)");
            const inicio = Date.now();
            await assert.rejects(reterMetricas(op, { agora }), { code: "55P03" }); assert.ok(Date.now() - inicio < 1800);
            await registrarVisualizacao({ dia: "2026-10-27", patrimonioId: uuid, chaveVisitante: chave(99) }, prisma);
            await admin.query("ROLLBACK");
            await admin.query("BEGIN; SELECT pg_advisory_xact_lock(21401,20261019)");
            await assert.rejects(registrarVisualizacao({ dia: "2026-10-19", patrimonioId: uuid, chaveVisitante: chave(99) }, prisma), e => e.statusCode === 503);
            await admin.query("ROLLBACK");
            assert.equal((await reterMetricas(op, { agora })).estado, "CONCLUIDA");
            assert.equal((await consultarMetricas({ inicio: "2026-10-27", fim: "2026-10-27" }, prisma, agora)).visualizacoes.totalRegistrado, "1");
            await limparOperacao();
        });
        await t.test("cobertura: estados, deduplicação, falha preservada, scheduler ausente e dia parcial", async () => {
            const janela = new Date("2026-10-27T03:00:00Z");
            await registrarSonda(op, "FALHA", janela);
            assert.equal((await registrarSonda(op, "DISPONIVEL", janela)).estado, "FALHA");
            await registrarSonda(op, "DESATIVADA", new Date("2026-10-27T03:05:00Z"));
            await registrarSonda(op, "DISPONIVEL", new Date("2026-10-27T03:10:00Z"));
            const dto = await consultarMetricas({ inicio: "2026-10-27", fim: "2026-10-27" }, prisma, new Date("2026-10-27T03:22:00Z"));
            assert.equal(dto.meta.cobertura, "SONDAGEM_5_MIN"); assert.equal(dto.meta.inicioColeta, null);
            assert.deepEqual(dto.meta.observacao.resumo, { esperadas: 4, disponiveis: 1, desativadas: 1, falhas: 1, desconhecidas: 1 });
            assert.equal(dto.meta.observacao.porDia[0].parcial, true); assert.equal(dto.visualizacoes.totalRegistrado, "0");
            const vazio = await consultarMetricas({ inicio: "2026-10-26", fim: "2026-10-26" }, prisma, agora);
            assert.equal(vazio.meta.observacao.porDia[0].estado, "SEM_OBSERVACAO"); assert.equal(vazio.meta.observacao.resumo.desconhecidas, 288);
            const virada = await consultarMetricas({ inicio: "2026-10-27", fim: "2026-10-27" }, prisma, new Date("2026-10-27T03:00:00Z"));
            assert.equal(virada.meta.observacao.resumo.esperadas, 0);
            const horarioVerao = await consultarMetricas({ inicio: "2018-11-04", fim: "2018-11-04" }, prisma, agora);
            assert.equal(horarioVerao.meta.observacao.resumo.esperadas, 276); // Dia paulista de 23 horas.
            await reterMetricas(op, { agora });
            // Uma linha remanescente de purga em lotes não restabelece cobertura fora do piso.
            await admin.query("INSERT INTO sondas_metricas VALUES('2025-09-26T03:00:00Z','2025-09-26T03:01:00Z','DISPONIVEL',1)");
            const fora = await consultarMetricas({ inicio: "2025-09-26", fim: "2025-09-26" }, prisma, agora);
            assert.equal(fora.meta.inicioDisponivel, "2025-09-27"); assert.equal(fora.meta.observacao.porDia[0].estado, "FORA_DA_RETENCAO");
            assert.equal(fora.meta.observacao.resumo.disponiveis, 0);
        });
    } finally {
        await admin.query("ROLLBACK; SELECT pg_advisory_unlock_all()"); await limparOperacao();
        await admin.query("DELETE FROM patrimonio WHERE id=$1", [uuid]); await admin.query("DELETE FROM categoria WHERE id=$1", [cat]); await admin.query("DELETE FROM users WHERE id=$1", [user]);
    }
});
