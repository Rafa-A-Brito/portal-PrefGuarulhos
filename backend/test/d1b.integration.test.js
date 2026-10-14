import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

test("D1B PostgreSQL: CRUD, permissões, relações, transações e constraints", { skip: !integrationDatabaseAvailable() && "Exige banco descartável exclusivo." }, async t => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = "d1b-secret-for-integration-tests-only";
    const { default: prisma } = await import("../src/config/prisma.js");
    const { default: app } = await import("../src/app.js");
    const { generateToken } = await import("../src/utils/token.js");
    const service = await import("../src/services/patrimonioEditorialService.js");
    const { getPatrimonioBySlug, getAdminPatrimonio, changePatrimonioStatus } = await import("../src/services/patrimonioService.js");
    const { LEGADOS_EDITORIAIS } = await import("../src/utils/identidadeEditorial.js");
    const sql = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await sql.connect();
    assert.match((await sql.query("SELECT current_database() AS db")).rows[0].db, /_test$/);
    const key = randomUUID();
    let admin, editor, category, server;
    const transaction = prisma.$transaction;
    try {
        admin = await prisma.user.create({ data: { name: "D1B admin", email: key + "@admin.test", passwordHash: "unused", role: "ADMIN" } });
        editor = await prisma.user.create({ data: { name: "D1B editor", email: key + "@editor.test", passwordHash: "unused", role: "EDITOR" } });
        category = await prisma.categoria.create({ data: { nome: "D1B " + key, slug: "d1b-" + key } });
        const make = (extra = {}) => prisma.patrimonio.create({ data: { nome: "Bem D1B " + key, slug: randomUUID(), descricao: "Descrição preservada", descricaoResumida: "Resumo preservado", categoriaId: category.id, createdBy: admin.id, ...extra } });
        const origin = await make(), published = await make({ status: "PUBLICADO" }), draft = await make(), archived = await make({ status: "ARQUIVADO" });
        server = app.listen(0); await new Promise(resolve => server.once("listening", resolve));
        const base = "http://127.0.0.1:" + server.address().port + "/api";
        const request = async (path, { method = "GET", data, user = admin } = {}) => {
            const response = await fetch(base + path, { method, headers: { ...(user && { authorization: "Bearer " + generateToken(user.id) }), ...(data && { "content-type": "application/json" }) }, ...(data && { body: JSON.stringify(data) }) });
            return { status: response.status, body: await response.json() };
        };
        const route = (tipo, id = origin.id, suffix = "") => `/admin/patrimonios/${id}/${tipo}${suffix}`;
        let first, second;
        await t.test("fatos: criar/listar/atualizar preserva detalhes e registra autor", async () => {
            await prisma.patrimonioDetalhe.create({ data: { patrimonioId: origin.id, titulo: "Detalhe", texto: "Preservar", ordem: 0 } });
            const created = await request(route("fatos"), { method: "POST", user: editor, data: { rotulo: "Ano", valor: "1900" } });
            assert.equal(created.status, 201); first = created.body.data;
            assert.equal(first.ordem, 0);
            second = await service.criarEditorial("fatos", origin.id, { rotulo: "Material", valor: "Taipa" }, admin);
            assert.equal(second.ordem, 1);
            const updated = await request(route("fatos", origin.id, "/" + first.id), { method: "PATCH", data: { valor: "1910" }, user: editor });
            assert.equal(updated.status, 200); assert.equal(updated.body.data.id, first.id);
            const list = await request(route("fatos"), { user: editor });
            assert.deepEqual(list.body.data.map(f => f.valor), ["1910", "Taipa"]);
            const parent = await getAdminPatrimonio(origin.id);
            assert.equal(parent.detalhes[0].texto, "Preservar"); assert.equal(parent.fatos.length, 2); assert.equal(parent.updatedBy, editor.id);
        });
        await t.test("fatos: reordenar troca posições sem recriar IDs; colisões e lista incompleta retornam 409", async () => {
            let r = await request(route("fatos", origin.id, "/ordem"), { method: "PATCH", data: { ids: [second.id, first.id] } });
            assert.equal(r.status, 200); assert.deepEqual(r.body.data.map(f => [f.id, f.ordem]), [[second.id, 0], [first.id, 1]]);
            r = await request(route("fatos", origin.id, "/" + first.id), { method: "PATCH", data: { ordem: 0 } }); assert.equal(r.status, 409);
            r = await request(route("fatos", origin.id, "/ordem"), { method: "PATCH", data: { ids: [first.id] } }); assert.equal(r.status, 409);
        });
        await t.test("fatos: ordem INT_MAX pode ser reordenada sem overflow; exclusão preserva os demais", async () => {
            await service.atualizarEditorial("fatos", origin.id, first.id, { ordem: 2147483647 }, admin);
            await assert.rejects(service.criarEditorial("fatos", origin.id, { rotulo: "x", valor: "y" }, admin), { statusCode: 409 });
            await service.ordenarEditorial("fatos", origin.id, { ids: [first.id, second.id] }, admin);
            const r = await request(route("fatos", origin.id, "/" + second.id), { method: "DELETE", user: editor });
            assert.equal(r.status, 200); assert.equal(await prisma.patrimonioFato.count({ where: { patrimonioId: origin.id } }), 1);
        });
        await t.test("autenticação, validação, pai/item inexistente e propriedade do item", async () => {
            assert.equal((await request(route("fatos"), { user: null })).status, 401);
            assert.equal((await request(route("fatos", "invalido"))).status, 400);
            assert.equal((await request(route("fatos", randomUUID()))).status, 404);
            assert.equal((await request(route("fatos"), { method: "POST", data: { rotulo: " ", valor: "x" } })).status, 400);
            assert.equal((await request(route("fatos", published.id, "/" + first.id), { method: "DELETE" })).status, 404);
            assert.equal((await request(route("fatos", origin.id, "/" + randomUUID()), { method: "PATCH", data: { valor: "x" } })).status, 404);
        });
        await t.test("ADMIN/EDITOR seguem a edição patrimonial em todos os status e operações", async () => {
            for (const parent of [published, archived]) {
                const f = await service.criarEditorial("fatos", parent.id, { rotulo: "x", valor: "y" }, admin);
                const link = await service.criarEditorial("ligacoes", parent.id, { patrimonioDestinoId: origin.id, texto: "Referência" }, admin);
                for (const [tipo, item] of [["fatos", f], ["ligacoes", link]]) {
                    assert.equal((await request(route(tipo, parent.id), { user: editor })).status, 200);
                    for (const [method, suffix, data] of [["POST", "", tipo === "fatos" ? { rotulo: "x", valor: "y" } : { patrimonioDestinoId: draft.id, texto: "x" }], ["PATCH", "/" + item.id, { ordem: 5 }], ["DELETE", "/" + item.id], ["PATCH", "/ordem", { ids: [item.id] }]]) {
                        assert.equal((await request(route(tipo, parent.id, suffix), { method, data, user: editor })).status, 403);
                    }
                    await service.atualizarEditorial(tipo, parent.id, item.id, { ordem: 5 }, admin);
                    await service.excluirEditorial(tipo, parent.id, item.id, admin);
                }
            }
        });
        let linkPublished, linkDraft, linkArchived;
        await t.test("ligações: criar e listar destinos publicado/rascunho/arquivado no admin", async () => {
            const r = await request(route("ligacoes"), { method: "POST", data: { patrimonioDestinoId: published.id, texto: "Veja publicado" }, user: editor });
            assert.equal(r.status, 201); linkPublished = r.body.data;
            linkDraft = await service.criarEditorial("ligacoes", origin.id, { patrimonioDestinoId: draft.id, texto: "Veja rascunho" }, admin);
            linkArchived = await service.criarEditorial("ligacoes", origin.id, { patrimonioDestinoId: archived.id, texto: "Veja arquivo" }, admin);
            const list = await request(route("ligacoes"));
            assert.deepEqual(list.body.data.map(l => l.destino.status), ["PUBLICADO", "RASCUNHO", "ARQUIVADO"]);
            const detail = await getAdminPatrimonio(origin.id); assert.equal(detail.ligacoes.length, 3);
        });
        await t.test("ligações: rejeita autorrelação, duplicata, ordem ocupada, origem/destino inexistente", async () => {
            for (const [data, code] of [[{ patrimonioDestinoId: origin.id, texto: "Self" }, 400], [{ patrimonioDestinoId: published.id, texto: "Repetido" }, 409], [{ patrimonioDestinoId: randomUUID(), texto: "Ausente" }, 404]]) {
                assert.equal((await request(route("ligacoes"), { method: "POST", data })).status, code);
            }
            assert.equal((await request(route("ligacoes", randomUUID()), { method: "POST", data: { patrimonioDestinoId: published.id, texto: "x" } })).status, 404);
            assert.equal((await request(route("ligacoes", origin.id, "/" + linkDraft.id), { method: "PATCH", data: { ordem: 0 } })).status, 409);
        });
        await t.test("ligações: atualizar destino/texto, reordenar e excluir com vínculo verificado", async () => {
            const other = await make();
            let r = await request(route("ligacoes", origin.id, "/" + linkDraft.id), { method: "PATCH", user: editor, data: { patrimonioDestinoId: other.id, texto: "Alterado" } });
            assert.equal(r.status, 200); assert.equal(r.body.data.destino.id, other.id);
            r = await request(route("ligacoes", origin.id, "/ordem"), { method: "PATCH", user: editor, data: { ids: [linkArchived.id, linkPublished.id, linkDraft.id] } });
            assert.equal(r.status, 200); assert.equal(r.body.data[0].id, linkArchived.id);
            assert.equal((await request(route("ligacoes", other.id, "/" + linkDraft.id), { method: "DELETE" })).status, 404);
            await service.excluirEditorial("ligacoes", origin.id, linkDraft.id, editor);
        });
        await t.test("público filtra destinos e preserva campos antigos; arquivamento oculta sem destruir", async () => {
            await service.criarEditorial("ligacoes", origin.id, { patrimonioDestinoId: draft.id, texto: "Rascunho oculto" }, admin);
            await prisma.patrimonio.update({ where: { id: origin.id }, data: { status: "PUBLICADO" } });
            let r = await request("/patrimonios/" + origin.slug, { user: null });
            assert.equal(r.status, 200); assert.deepEqual(r.body.data.ligacoes.map(l => l.destino.id), [published.id]);
            assert.equal("status" in r.body.data.ligacoes[0].destino, false);
            assert.equal(r.body.data.descricao, "Descrição preservada"); assert.equal(r.body.data.detalhes[0].texto, "Preservar");
            for (const campo of ["imagens", "documentos", "rotas", "categoriasAdicionais", "fatos", "ligacoes"]) assert.ok(Array.isArray(r.body.data[campo]));
            await changePatrimonioStatus(published.id, "ARQUIVADO", admin);
            assert.equal((await getPatrimonioBySlug(origin.slug)).ligacoes.length, 0);
            assert.equal((await getAdminPatrimonio(origin.id)).ligacoes.length, 3);
            await changePatrimonioStatus(published.id, "PUBLICADO", admin);
            assert.equal((await getPatrimonioBySlug(origin.slug)).ligacoes.length, 1);
            await changePatrimonioStatus(origin.id, "ARQUIVADO", admin);
            assert.equal((await request("/patrimonios/" + origin.slug, { user: null })).status, 404);
        });
        await t.test("identidades Casa José/Albertis: legados rejeitados e nunca expostos como relacionados", async () => {
            for (const legacy of LEGADOS_EDITORIAIS) {
                const canonical = await make({ slug: legacy.canonico, status: "PUBLICADO" });
                const old = await make({ id: legacy.id, slug: legacy.slug, status: "ARQUIVADO" });
                for (const [source, target] of [[canonical, old], [old, canonical]]) {
                    await assert.rejects(service.criarEditorial("ligacoes", source.id, { patrimonioDestinoId: target.id, texto: "Mesmo bem" }, admin), error => error.statusCode === 409 && error.message.includes(legacy.canonico));
                }
                await assert.rejects(service.criarEditorial("ligacoes", canonical.id, { patrimonioDestinoId: canonical.id, texto: "Self após consolidação" }, admin), { statusCode: 400 });
                // Mesmo um legado publicado por SQL externo não vaza no detalhe público.
                await prisma.patrimonio.update({ where: { id: old.id }, data: { status: "PUBLICADO" } });
                await prisma.patrimonioLigacao.create({ data: { patrimonioOrigemId: canonical.id, patrimonioDestinoId: old.id, texto: "Simulação de dado externo", ordem: 0 } });
                assert.deepEqual((await getPatrimonioBySlug(canonical.slug)).ligacoes, []);
            }
        });
        await t.test("rollback desfaz criação, exclusão, atualização e ordem, inclusive autor do pai", async () => {
            const parent = await make();
            const f1 = await service.criarEditorial("fatos", parent.id, { rotulo: "A", valor: "a" }, admin);
            const f2 = await service.criarEditorial("fatos", parent.id, { rotulo: "B", valor: "b" }, admin);
            const l = await service.criarEditorial("ligacoes", parent.id, { patrimonioDestinoId: draft.id, texto: "x" }, admin);
            const l2 = await service.criarEditorial("ligacoes", parent.id, { patrimonioDestinoId: published.id, texto: "y" }, admin);
            const before = await getAdminPatrimonio(parent.id);
            prisma.$transaction = callback => transaction.call(prisma, async tx => { await callback(tx); throw Error("rollback-d1b"); });
            try {
                for (const action of [
                    () => service.criarEditorial("fatos", parent.id, { rotulo: "C", valor: "c" }, editor),
                    () => service.atualizarEditorial("fatos", parent.id, f1.id, { valor: "alterado" }, editor),
                    () => service.excluirEditorial("fatos", parent.id, f1.id, editor),
                    () => service.ordenarEditorial("fatos", parent.id, { ids: [f2.id, f1.id] }, editor),
                    () => service.atualizarEditorial("ligacoes", parent.id, l.id, { texto: "alterado" }, editor),
                    () => service.excluirEditorial("ligacoes", parent.id, l.id, editor),
                    () => service.criarEditorial("ligacoes", parent.id, { patrimonioDestinoId: archived.id, texto: "Novo" }, editor),
                    () => service.ordenarEditorial("ligacoes", parent.id, { ids: [l2.id, l.id] }, editor),
                ]) await assert.rejects(action(), /rollback-d1b/);
            } finally { prisma.$transaction = transaction; }
            assert.deepEqual(await getAdminPatrimonio(parent.id), before);
        });
        await t.test("concorrência serializa ordens e ligações em sentidos opostos", async () => {
            const a = await make(), b = await make();
            const results = await Promise.allSettled([1, 2].map(n => service.criarEditorial("fatos", a.id, { rotulo: "n", valor: String(n), ordem: 0 }, admin)));
            assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
            assert.equal(results.find(r => r.status === "rejected").reason.statusCode, 409);
            const links = await Promise.all([[a, b], [b, a]].map(([source, target]) => service.criarEditorial("ligacoes", source.id, { patrimonioDestinoId: target.id, texto: "Sentido editorial" }, admin)));
            assert.equal(links.length, 2);
        });
        await t.test("constraints SQL: FK, ordem negativa/duplicada, vazio, tamanho, self e par duplicado", async () => {
            const a = await make(), b = await make();
            const factSql = "INSERT INTO patrimonio_fatos(patrimonio_id,rotulo,valor,ordem) VALUES($1,$2,$3,$4)";
            const linkSql = "INSERT INTO patrimonio_ligacoes(patrimonio_origem_id,patrimonio_destino_id,texto,ordem) VALUES($1,$2,$3,$4)";
            const fails = async (query, args, code) => assert.rejects(sql.query(query, args), e => e.code === code);
            await sql.query(factSql, [a.id, "R", "V", 0]);
            await fails(factSql, [a.id, "R", "V", 0], "23505");
            await fails(factSql, [a.id, "R", "V", -1], "23514");
            await fails(factSql, [a.id, "\n\t", "V", 1], "23514");
            await fails(factSql, [a.id, "R", "x".repeat(10001), 1], "23514");
            await fails(factSql, [randomUUID(), "R", "V", 1], "23503");
            await sql.query(linkSql, [a.id, b.id, "x", 0]);
            await fails(linkSql, [a.id, b.id, "x", 1], "23505");
            await fails(linkSql, [a.id, published.id, "x", 0], "23505");
            await fails(linkSql, [a.id, a.id, "x", 1], "23514");
            await fails(linkSql, [b.id, a.id, "x", -1], "23514");
            await fails(linkSql, [b.id, a.id, " ", 0], "23514");
            await fails(linkSql, [b.id, randomUUID(), "x", 0], "23503");
            await fails(linkSql, [randomUUID(), b.id, "x", 0], "23503");
            await fails(linkSql, [b.id, a.id, "x".repeat(2001), 0], "22001");
        });
        await t.test("exclusão física elimina fatos e ligações de ambas as pontas por CASCADE", async () => {
            const a = await make(), b = await make();
            await service.criarEditorial("fatos", a.id, { rotulo: "R", valor: "V" }, admin);
            for (const [source, target] of [[a, b], [b, a]]) await service.criarEditorial("ligacoes", source.id, { patrimonioDestinoId: target.id, texto: "x" }, admin);
            await prisma.patrimonio.delete({ where: { id: a.id } });
            assert.equal(await prisma.patrimonioFato.count({ where: { patrimonioId: a.id } }), 0);
            assert.equal(await prisma.patrimonioLigacao.count({ where: { OR: [{ patrimonioOrigemId: a.id }, { patrimonioDestinoId: a.id }] } }), 0);
            assert.ok(await prisma.patrimonio.findUnique({ where: { id: b.id } }));
        });
    } finally {
        prisma.$transaction = transaction;
        if (server) await new Promise(resolve => server.close(resolve));
        if (admin) await prisma.patrimonio.deleteMany({ where: { createdBy: admin.id } });
        if (category) await prisma.categoria.delete({ where: { id: category.id } });
        if (editor) await prisma.user.delete({ where: { id: editor.id } });
        if (admin) await prisma.user.delete({ where: { id: admin.id } });
        await sql.end(); await prisma.$disconnect();
    }
});
