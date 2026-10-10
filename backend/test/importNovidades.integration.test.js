import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { integrationDatabaseAvailable, databaseIdentity } from "../scripts/assert-test-db.js";
const safe = integrationDatabaseAvailable();
const url = process.env.TEST_DATABASE_URL;

test("PostgreSQL: importação editorial atômica, idempotente, permissões e GET público 16/16", { skip: !safe && "Exige PostgreSQL descartável *_test." }, async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = "integration-test-secret-with-at-least-32-characters";
    const uploads = await mkdtemp(path.join(os.tmpdir(), "novidades-import-test-"));
    process.env.UPLOAD_DIR = uploads;
    const { default: prisma } = await import("../src/config/prisma.js");
    const { default: app } = await import("../src/app.js");
    const { loadSource, importNovidades } = await import("../scripts/import-novidades.js");
    const { serializarNovidade } = await import("../src/utils/novidadeData.js");
    const items = await loadSource();
    const database = databaseIdentity(url).database;
    const email = randomUUID() + "@example.test";
    const editorEmail = randomUUID() + "@example.test";
    let admin, editor, server;
    const options = { apply: false, status: "PUBLICADO", createdByEmail: email };
    const run = (extra={}, client=prisma) => importNovidades({ prisma: client, options: { ...options, ...extra }, database, items, uploadsDir: uploads });
    const apply = { apply: true, confirmDb: database };
    try {
        admin = await prisma.user.create({ data: { name: "Importador", email, role: "ADMIN", passwordHash: "not-login", isActive: true } });
        editor = await prisma.user.create({ data: { name: "Editor", email: editorEmail, role: "EDITOR", passwordHash: "not-login", isActive: true } });
        const before = await prisma.novidade.count();
        const dry = await run();
        assert.equal(dry.criar, 16); assert.equal(dry.aplicados, 0);
        assert.equal(await prisma.novidade.count(), before);
        assert.deepEqual(await readdir(uploads), []);
        await assert.rejects(run({ ...apply, createdByEmail: "missing@example.test" }), /ADMIN\/EDITOR ativo/);
        await assert.rejects(run({ ...apply, createdByEmail: editorEmail }), /Somente ADMIN/);
        assert.equal((await run({ createdByEmail: editorEmail, status: "RASCUNHO" })).criar, 16);
        await prisma.user.update({ where: { id: editor.id }, data: { isActive: false } });
        await assert.rejects(run({ createdByEmail: editorEmail, status: "RASCUNHO" }), /ativo/);
        // Conflito no último item impede inclusive a criação do primeiro.
        const conflict = await prisma.novidade.create({ data: { ...items[15].record, slug: items[15].slug, texto: "Conteúdo administrativo", createdBy: admin.id } });
        const blocked = await run(apply);
        assert.equal(blocked.conflitos, 1); assert.equal(blocked.aplicados, 0);
        assert.equal(await prisma.novidade.count(), before + 1);
        assert.equal((await prisma.novidade.findUnique({ where: { id: conflict.id } })).texto, "Conteúdo administrativo");
        await prisma.novidade.delete({ where: { id: conflict.id } });
        // Falha real de FK após escritas anteriores: o PostgreSQL desfaz tudo.
        let writes = 0;
        const failing = prisma.$extends({ query: { novidade: { async create({ args, query }) {
            if (++writes === 5) args.data.createdBy = randomUUID();
            return query(args);
        } } } });
        await assert.rejects(run(apply, failing));
        assert.equal(await prisma.novidade.count(), before);
        const result = await run(apply);
        assert.equal(result.aplicados, 16);
        const records = await prisma.novidade.findMany({ where: { createdBy: admin.id } });
        assert.equal(records.length, 16);
        assert.ok(records.every(x => x.status === "PUBLICADO" && x.publicadoEm && x.createdBy === admin.id));
        for (const item of items) if (item.asset) assert.deepEqual(await readFile(path.join(uploads, "novidades", item.asset.filename)), item.asset.bytes);
        const snapshot = records.map(x => ({ id: x.id, slug: x.slug, createdAt: x.createdAt, updatedAt: x.updatedAt, createdBy: x.createdBy }));
        assert.equal((await run()).ignorar, 16);
        assert.equal((await run(apply)).aplicados, 0);
        assert.deepEqual((await prisma.novidade.findMany({ where: { createdBy: admin.id } })).map(x => ({ id: x.id, slug: x.slug, createdAt: x.createdAt, updatedAt: x.updatedAt, createdBy: x.createdBy })), snapshot);
        server = app.listen(0);
        await new Promise(resolve => server.once("listening", resolve));
        const base = "http://127.0.0.1:" + server.address().port;
        const response = await fetch(base + "/api/novidades?limite=100");
        assert.equal(response.status, 200);
        const body = await response.json();
        for (const item of items) {
            const dto = body.data.itens.find(x => x.slug === item.slug);
            assert.ok(dto, item.slug);
            const expected = serializarNovidade(item.record);
            for (const key of Object.keys(expected)) assert.deepEqual(dto[key], expected[key], item.slug + ":" + key);
            assert.equal("createdBy" in dto, false);
            if (dto.imagemUrl) assert.equal((await fetch(base + dto.imagemUrl)).status, 200);
        }
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        if (admin) await prisma.novidade.deleteMany({ where: { createdBy: admin.id } });
        if (admin) await prisma.user.delete({ where: { id: admin.id } });
        if (editor) await prisma.user.delete({ where: { id: editor.id } });
        await prisma.$disconnect();
    }
});
