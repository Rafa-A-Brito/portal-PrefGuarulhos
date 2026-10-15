import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { integrationDatabaseAvailable } from '../scripts/assert-test-db.js';
import { importarEditorial } from '../prisma/import-editorial-curado.js';
import { EDITORIAL_CURADO, SLUGS_CANONICOS } from '../prisma/data/patrimonioEditorialCurado.js';
import { hashEstado, ordenarRelacoes } from '../src/utils/estadoHash.js';

test('D1C PostgreSQL: importador editorial isolado e transacional', { skip: !integrationDatabaseAvailable() && 'Exige PostgreSQL descartável exclusivo.' }, async t => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'd1c-secret-for-integration-tests-only';
    const { default: prisma } = await import('../src/config/prisma.js');
    const sql = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await sql.connect();
    const db = (await sql.query('SELECT current_database() AS db')).rows[0].db;
    assert.match(db, /_test$/);
    let admin, editor, category;
    const ids = [];
    const dry = (manifesto = EDITORIAL_CURADO) => importarEditorial({ prisma, manifesto });
    const apply = (hash, manifesto = EDITORIAL_CURADO, client = prisma, author = admin) => importarEditorial({ prisma: client, manifesto,
        options: { apply: true, expectedStateHash: hash, authorId: author.id, confirmDatabase: db } });
    const snapshot = async () => {
        const tables = (await sql.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
        const result = {};
        for (const { tablename } of tables) {
            if (['patrimonio_fatos', 'patrimonio_ligacoes', 'audit_log'].includes(tablename)) continue;
            assert.match(tablename, /^[a-z0-9_]+$/);
            result[tablename] = hashEstado(ordenarRelacoes((await sql.query(`SELECT * FROM "${tablename}"`)).rows));
        }
        return result;
    };
    try {
        admin = await prisma.user.create({ data: { name: 'D1C admin', email: randomUUID() + '@d1c.test', passwordHash: 'unused', role: 'ADMIN' } });
        editor = await prisma.user.create({ data: { name: 'D1C editor', email: randomUUID() + '@d1c.test', passwordHash: 'unused', role: 'EDITOR' } });
        category = await prisma.categoria.create({ data: { nome: 'D1C ' + randomUUID(), slug: randomUUID() } });
        for (const slug of SLUGS_CANONICOS) {
            const row = await prisma.patrimonio.create({ data: { nome: 'Fixture D1C', slug, descricao: 'Preservar', descricaoResumida: 'Preservar', categoriaId: category.id, createdBy: admin.id, status: 'PUBLICADO' } });
            ids.push(row.id);
        }
        await prisma.patrimonioDetalhe.create({ data: { patrimonioId: ids[0], titulo: 'C2 preservado (fixture)', texto: 'Não substituir', ordem: 0 } });
        const before = await snapshot();
        let first;
        await t.test('dry-run READ ONLY não grava; plano possui somente 14 ligações', async () => {
            first = await dry();
            assert.equal(first.somente_leitura, true); assert.equal(first.creates, 14); assert.equal(first.applied, 0);
            assert.equal(first.conflicts.length, 0);
            assert.equal(await prisma.patrimonioLigacao.count(), 0); assert.equal(await prisma.patrimonioFato.count(), 0);
            assert.equal(await prisma.auditLog.count({ where: { userId: admin.id } }), 0);
        });
        await t.test('hash antigo e EDITOR em publicado bloqueiam antes de gravar', async () => {
            assert.equal((await apply('0'.repeat(64))).conflicts[0].motivo, 'ESTADO_DESATUALIZADO');
            assert.equal((await apply(first.estado_hash, EDITORIAL_CURADO, prisma, editor)).conflicts[0].motivo, 'AUTOR_SEM_PERMISSAO');
            assert.equal(await prisma.patrimonioLigacao.count(), 0);
        });
        await t.test('falha de auditoria reverte linha editorial e transação inteira', async () => {
            const failing = { $transaction: (cb, options) => prisma.$transaction(tx => cb(new Proxy(tx, { get(target, prop) {
                if (prop === 'auditLog') return { ...target.auditLog, create: async () => { throw new Error('falha auditoria simulada'); } };
                return Reflect.get(target, prop);
            } })), options) };
            await assert.rejects(apply(first.estado_hash, EDITORIAL_CURADO, failing), /falha auditoria/);
            assert.equal(await prisma.patrimonioLigacao.count(), 0); assert.equal(await prisma.auditLog.count({ where: { userId: admin.id } }), 0);
        });
        await t.test('colisão de ordem impede lote completo e preserva item administrativo', async () => {
            const d = first.diff[0].depois;
            const extra = await prisma.patrimonioLigacao.create({ data: { ...d, texto: 'Admin ocupa ordem' } });
            const collision = await dry();
            assert.ok(collision.conflicts.some(c => c.motivo === 'COLISAO_ORDEM'));
            assert.equal((await apply(collision.estado_hash)).applied, 0);
            assert.equal((await prisma.patrimonioLigacao.findUnique({ where: { id: extra.id } })).texto, 'Admin ocupa ordem');
            await prisma.patrimonioLigacao.delete({ where: { id: extra.id } });
        });
        await t.test('criação auditada e reexecução preservam UUIDs e não duplicam', async () => {
            const current = await dry();
            const result = await apply(current.estado_hash);
            assert.equal(result.applied, 14);
            assert.equal(await prisma.auditLog.count({ where: { userId: admin.id } }), 14);
            const uuids = (await prisma.patrimonioLigacao.findMany({ orderBy: { id: 'asc' } })).map(r => r.id);
            const second = await dry(); assert.equal(second.unchanged, 14); assert.equal(second.creates + second.updates + second.conflicts.length, 0);
            assert.equal((await apply(second.estado_hash)).applied, 0);
            assert.deepEqual((await prisma.patrimonioLigacao.findMany({ orderBy: { id: 'asc' } })).map(r => r.id), uuids);
        });
        await t.test('revisão inequívoca atualiza sem trocar UUID; edição manual bloqueia', async () => {
            const revised = structuredClone(EDITORIAL_CURADO); revised.ligacoes[0].texto += ' Revisão de fixture.';
            const draft = await dry(revised), id = draft.diff[0].antes.id;
            assert.equal(draft.updates, 1); assert.equal((await apply(draft.estado_hash, revised)).applied, 1);
            assert.equal((await dry(revised)).diff[0].depois.id, id);
            await prisma.patrimonioLigacao.update({ where: { id }, data: { texto: 'Edição do administrador' } });
            const edited = await dry(revised);
            assert.ok(edited.conflicts.some(c => c.motivo === 'CONTEUDO_ADMINISTRATIVO_ALTERADO'));
            assert.equal((await apply(edited.estado_hash, revised)).applied, 0);
            await prisma.patrimonioLigacao.update({ where: { id }, data: { texto: revised.ligacoes[0].texto } });
        });
        await t.test('extra administrativo mantém conteúdo/UUID; mudança invalida hash aprovado', async () => {
            const current = await dry();
            const p = current.diff[0].depois.patrimonioOrigemId;
            const extra = await prisma.patrimonioFato.create({ data: { patrimonioId: p, rotulo: 'Admin', valor: 'Não apagar', ordem: 90 } });
            assert.equal((await apply(current.estado_hash)).conflicts[0].motivo, 'ESTADO_DESATUALIZADO');
            const next = await dry(); assert.ok(next.preservados.includes(extra.id));
            assert.equal((await apply(next.estado_hash)).applied, 1); // reverte apenas a revisão gerenciada anterior
            assert.deepEqual(await prisma.patrimonioFato.findUnique({ where: { id: extra.id } }), extra);
        });
        await t.test('fato de fixture: mesma identidade preserva UUID em atualização e idempotência', async () => {
            const manifest = { fatos: [{ patrimonioSlug: SLUGS_CANONICOS[0], chave: 'fixture', rotulo: 'Fixture', valor: 'Somente teste', ordem: 0,
                aprovacao: 'APROVAR', auditoriaId: 'fixture', fonteApoio: [{ arquivo: 'test/d1c.integration.test.js', trecho: 'Não é conteúdo aprovado para produção.' }] }], ligacoes: [] };
            const initial = await dry(manifest); assert.equal(initial.creates, 1);
            const created = await apply(initial.estado_hash, manifest); assert.equal(created.applied, 1);
            const id = created.diff[0].id;
            manifest.fatos[0].valor = 'Fixture revista';
            const revised = await dry(manifest); assert.equal(revised.updates, 1);
            await apply(revised.estado_hash, manifest);
            const last = await dry(manifest); assert.equal(last.unchanged, 1); assert.equal(last.diff[0].depois.id, id);
        });
        await t.test('todas as tabelas preexistentes mantêm checksum, exceto auditoria autorizada', async () => {
            assert.deepEqual(await snapshot(), before);
        });
    } finally {
        if (admin) await prisma.auditLog.deleteMany({ where: { userId: admin.id } });
        if (ids.length) await prisma.patrimonio.deleteMany({ where: { id: { in: ids } } });
        if (category) await prisma.categoria.delete({ where: { id: category.id } });
        if (editor) await prisma.user.delete({ where: { id: editor.id } });
        if (admin) await prisma.user.delete({ where: { id: admin.id } });
        await sql.end(); await prisma.$disconnect();
    }
});
