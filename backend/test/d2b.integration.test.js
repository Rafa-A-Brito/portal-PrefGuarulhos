import { createFixtureSession } from "./authSessionFixture.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

test("D2B PostgreSQL: catálogo, patrimônio, constraints e concorrência", { skip: !integrationDatabaseAvailable() && "Exige banco descartável exclusivo." }, async t => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = "d2b-secret-exclusivo-de-testes-descartaveis";
    const { default: prisma } = await import("../src/config/prisma.js");
    const { default: app } = await import("../src/app.js");
    const { generateToken } = await import("../src/utils/token.js");
    const service = await import("../src/services/patrimonioService.js");
    const regional = await import("../src/services/regiaoService.js");
    const sql = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await sql.connect(); assert.match((await sql.query("SELECT current_database() db")).rows[0].db, /_test$/);
    const key = "d2b-" + randomUUID();
    let admin, editor, category, server;
    const regions = [];
    try {
        admin = await prisma.user.create({ data: { name: key, email: key + "@admin.test", passwordHash: "unused", role: "ADMIN" } });
        await createFixtureSession(prisma, admin);
        editor = await prisma.user.create({ data: { name: key, email: key + "@editor.test", passwordHash: "unused", role: "EDITOR" } });
        await createFixtureSession(prisma, editor);
        category = await prisma.categoria.create({ data: { nome: key, slug: key } });
        const body = extra => ({ nome: key, descricao: "Descrição preservada", descricaoResumida: "Resumo", categoriaId: category.id, ...extra });
        const make = extra => prisma.patrimonio.create({ data: { ...body(extra), createdBy: admin.id, slug: randomUUID() } });
        const a = await make({ status: "PUBLICADO" }), b = await make({ status: "RASCUNHO" }), c = await make({ status: "ARQUIVADO" });
        server = app.listen(0); await new Promise(resolve => server.once("listening", resolve));
        const request = async (url, { method = "GET", data, user = admin } = {}) => {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/api` + url, { method, headers: { ...(user && { authorization: "Bearer " + generateToken(user.id, user.tokenVersion, user.id) }), ...(data && { "content-type": "application/json" }) }, ...(data && { body: JSON.stringify(data) }) });
            return { status: response.status, body: await response.json() };
        };
        const patch = (p, data, user = admin) => request("/admin/patrimonios/" + p.id, { method: "PATCH", data, user });
        let region;
        await t.test("catálogo vazio, auth, ADMIN cria com auditoria e EDITOR só consulta", async () => {
            assert.deepEqual((await request("/regioes", { user: null })).body.data, []);
            const data = { nome: "Região fixture " + key, slug: key, descricao: "Fonte de teste" };
            assert.equal((await request("/admin/regioes", { method: "POST", data, user: editor })).status, 403);
            assert.equal((await request("/admin/regioes", { user: null })).status, 401);
            const result = await request("/admin/regioes", { method: "POST", data });
            assert.equal(result.status, 201); region = result.body.data; regions.push(region.id);
            assert.equal(region.ativo, true);
            assert.equal(await prisma.auditLog.count({ where: { entityId: region.id, action: "REGIAO_CREATE", userId: admin.id } }), 1);
            const pub = (await request("/regioes", { user: null })).body.data;
            assert.deepEqual(Object.keys(pub[0]).sort(), ["id", "nome", "slug"]);
            assert.equal((await request("/admin/regioes?busca=" + key, { user: editor })).body.data.itens[0].id, region.id);
            assert.equal((await request("/admin/regioes", { method: "POST", data })).status, 409);
            assert.equal((await request("/admin/regioes", { method: "POST", data: { ...data, nome: " " } })).status, 400);
        });
        await t.test("atribuição sem Localizacao, DTO público/admin, prioridade zero e NULL", async () => {
            const r = await patch(a, { regiaoId: region.id, numeroExibicao: 12, ordemExibicao: 0 });
            assert.equal(r.status, 200); assert.equal(r.body.data.regiao.ativo, true);
            assert.equal(r.body.data.localizacao, null);
            const pub = (await request("/patrimonios/" + a.slug, { user: null })).body.data;
            assert.deepEqual(pub.regiao, { id: region.id, nome: region.nome, slug: region.slug });
            assert.equal(pub.regiaoId, undefined); assert.equal(pub.numeroExibicao, 12); assert.equal(pub.ordemExibicao, 0);
            assert.equal((await patch(a, { descricaoResumida: "Outro resumo" })).body.data.numeroExibicao, 12);
            assert.equal((await patch(a, { numeroExibicao: null, ordemExibicao: null })).status, 200);
            const result = await service.getAdminPatrimonio(a.id);
            assert.equal(result.numeroExibicao, null); assert.equal(result.ordemExibicao, null); assert.equal(result.regiaoId, region.id);
        });
        await t.test("permissões patrimoniais e publicação sem D2", async () => {
            for (const p of [a, c]) assert.equal((await patch(p, { ordemExibicao: 1 }, editor)).status, 403);
            assert.equal((await patch(b, { regiaoId: region.id, ordemExibicao: 0 }, editor)).status, 200);
            assert.equal((await patch(c, { ordemExibicao: 0 })).status, 200);
            const d = await make({}); await service.changePatrimonioStatus(d.id, "PUBLICADO", admin);
            assert.equal((await service.getAdminPatrimonio(d.id)).regiaoId, null);
        });
        await t.test("catálogo estável e inativação: vínculo preservado, nova atribuição bloqueada", async () => {
            const path = "/admin/regioes/" + region.id;
            assert.equal((await request(path, { method: "PATCH", data: { slug: "outro" } })).status, 400);
            assert.equal((await request(path, { method: "PATCH", data: { ativo: false }, user: editor })).status, 403);
            const r = await request(path, { method: "PATCH", data: { nome: "Nome alterado", ativo: false, descricao: null } });
            assert.equal(r.status, 200); assert.equal(r.body.data.slug, key); assert.equal(r.body.data.descricao, null);
            assert.deepEqual((await request("/regioes", { user: null })).body.data, []);
            assert.equal((await patch(a, { descricaoResumida: "Preserva vínculo inativo" })).status, 200);
            assert.equal((await service.getAdminPatrimonio(a.id)).regiaoId, region.id);
            assert.equal((await patch(a, { regiaoId: region.id })).status, 409);
            assert.equal((await patch(c, { regiaoId: region.id })).status, 409);
            assert.equal((await patch(c, { regiaoId: randomUUID() })).status, 404);
            assert.equal((await patch(b, { regiaoId: null }, editor)).status, 200);
            assert.equal((await request("/admin/regioes?ativo=false", { user: editor })).body.data.itens[0].id, region.id);
            assert.equal((await request(path, { method: "DELETE" })).status, 404);
            const logs = await prisma.auditLog.findMany({ where: { entityId: region.id }, orderBy: { createdAt: "asc" } });
            assert.equal(logs.length, 2); assert.equal(logs[1].oldValues.ativo, true); assert.equal(logs[1].newValues.ativo, false);
            await regional.salvarRegiao(region.id, { ativo: true }, admin);
        });
        await t.test("SQL constraints: número único incluindo arquivo, prioridades repetidas, FK e RESTRICT", async () => {
            const update = (id, column, value) => sql.query(`UPDATE patrimonio SET ${column}=$1 WHERE id=$2`, [value, id]);
            await update(c.id, "numero_exibicao", 1);
            for (const value of [0, -1]) await assert.rejects(update(b.id, "numero_exibicao", value), { code: "23514" });
            await assert.rejects(update(b.id, "numero_exibicao", 1), { code: "23505" });
            assert.equal((await patch(b, { numeroExibicao: 1 })).status, 409);
            await assert.rejects(update(a.id, "ordem_exibicao", -1), { code: "23514" });
            await update(a.id, "ordem_exibicao", 0); await update(b.id, "ordem_exibicao", 0);
            await update(a.id, "numero_exibicao", null); await update(b.id, "numero_exibicao", null);
            await assert.rejects(update(b.id, "regiao_id", randomUUID()), { code: "23503" });
            await assert.rejects(sql.query("DELETE FROM regioes_patrimonio WHERE id=$1", [region.id]), error => ["23001", "23503"].includes(error.code));
            for (const data of [{ numeroExibicao: "" }, { ordemExibicao: "" }, { numeroExibicao: 2147483648 }, { ordemExibicao: 1.2 }]) assert.equal((await patch(a, data)).status, 400);
            assert.equal((await patch(a, { numeroExibicao: 2147483647 })).status, 200);
        });
        await t.test("filtros AND e ordenação estável antes de paginar, todas NULL equivalem ao comportamento anterior", async () => {
            const name = "Filtro " + key;
            const x = await make({ nome: name, status: "PUBLICADO", ordemExibicao: 2, regiaoId: region.id, numeroExibicao: 77 });
            const y = await make({ nome: name, status: "PUBLICADO", ordemExibicao: 0, regiaoId: region.id });
            const z = await make({ nome: name + " A", status: "PUBLICADO" });
            let r = await request(`/patrimonios?busca=${encodeURIComponent(name)}&limite=1`, { user: null });
            assert.equal(r.body.data.itens[0].id, y.id);
            r = await request(`/patrimonios?busca=${encodeURIComponent(name)}&regiao=${key}&categoria=${key}&numeroExibicao=77`, { user: null });
            assert.deepEqual(r.body.data.itens.map(p => p.id), [x.id]);
            await regional.salvarRegiao(region.id, { ativo: false }, admin);
            assert.equal((await request(`/patrimonios?regiao=${key}&numeroExibicao=77`, { user: null })).body.data.itens[0].id, x.id);
            for (const p of [x, y, z]) await patch(p, { ordemExibicao: null });
            const expected = await prisma.patrimonio.findMany({ where: { nome: { startsWith: name }, status: "PUBLICADO" }, orderBy: [{ nome: "asc" }, { id: "asc" }], select: { id: true } });
            r = await request(`/patrimonios?busca=${encodeURIComponent(name)}`, { user: null });
            assert.deepEqual(r.body.data.itens.map(p => p.id), expected.map(p => p.id));
        });
        await t.test("concorrência: exatamente um de dois números iguais é salvo", async () => {
            const results = await Promise.all([patch(a, { numeroExibicao: 99 }), patch(b, { numeroExibicao: 99 })]);
            assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
        });
        await t.test("concorrência: inativação bloqueia atribuição que aguarda o lock", async () => {
            await sql.query("BEGIN");
            try {
                await sql.query("UPDATE regioes_patrimonio SET ativo=false WHERE id=$1", [region.id]);
                let settled = false;
                const writing = patch(b, { regiaoId: region.id }).then(r => { settled = true; return r; });
                // Aguarda a evidência de bloqueio no PostgreSQL, não apenas um sleep fixo.
                let blocked = false;
                for (let i = 0; i < 100 && !blocked; i++) {
                    await sql.query("SELECT pg_stat_clear_snapshot()");
                    const waiters = await sql.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%regioes_patrimonio%'");
                    blocked = waiters.rows[0].n > 0;
                    if (!blocked) await new Promise(resolve => setTimeout(resolve, 20));
                }
                assert.equal(blocked, true); assert.equal(settled, false);
                await sql.query("COMMIT");
                assert.equal((await writing).status, 409);
                assert.equal((await service.getAdminPatrimonio(b.id)).regiaoId, null);
            } finally { await sql.query("ROLLBACK"); }
        });
        await t.test("falha de auditoria reverte mutação regional", async () => {
            const original = await prisma.regiaoPatrimonio.findUnique({ where: { id: region.id } });
            await assert.rejects(regional.salvarRegiao(region.id, { nome: "Não persistir" }, { id: randomUUID(), role: "ADMIN" }));
            assert.deepEqual(await prisma.regiaoPatrimonio.findUnique({ where: { id: region.id } }), original);
        });
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        if (admin) {
            await prisma.patrimonio.deleteMany({ where: { createdBy: admin.id } });
            await prisma.auditLog.deleteMany({ where: { userId: admin.id } });
        }
        await prisma.regiaoPatrimonio.deleteMany({ where: { id: { in: regions } } });
        if (category) await prisma.categoria.delete({ where: { id: category.id } });
        if (editor) await prisma.user.delete({ where: { id: editor.id } });
        if (admin) await prisma.user.delete({ where: { id: admin.id } });
        await sql.end(); await prisma.$disconnect();
    }
});
