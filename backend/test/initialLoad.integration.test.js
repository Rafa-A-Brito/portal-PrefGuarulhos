import { prepararLimpezaFixtures } from "./limpezaFixtures.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { assertTestDatabase } from "../scripts/assert-test-db.js";
import { executarCargaInicial, catalogoInicial, SEED_EMAIL } from "../prisma/carga-inicial.js";

test("PostgreSQL: carga, rollback, reexecução, edições, aliases e pesquisa preservados", {
    skip: !process.env.TEST_DATABASE_URL ? "Exige PostgreSQL descartável." : false,
}, async () => {
    assertTestDatabase();
    const { PrismaClient } = await import("@prisma/client"), { PrismaPg } = await import("@prisma/adapter-pg");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
    const limparFixtures = await prepararLimpezaFixtures(prisma);
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "initial-load-test-"));
    const email = randomUUID() + "@example.test";
    await prisma.user.create({ data: { email, name: "Responsável", passwordHash: "fixture-sem-login", role: "ADMIN" } });
    const database = decodeURIComponent(new URL(process.env.TEST_DATABASE_URL).pathname.slice(1));
    const options = { createdByEmail: email };
    const run = (extra = {}) => executarCargaInicial({ prisma, databaseUrl: process.env.TEST_DATABASE_URL, uploadDir, publicBaseUrl: "http://assets.example.test", options, ...extra });
    const state = async () => ({ patrimonios: await prisma.patrimonio.findMany({ include: { detalhes: true, imagens: true, localizacao: true, fatos: true, ligacoes: true }, orderBy: { id: "asc" } }),
        users: await prisma.user.count(), categories: await prisma.categoria.count(), logs: await prisma.auditLog.count() });
    try {
        const before = await state();
        const dry = await run();
        assert.equal(dry.criar, 34); assert.equal(dry.aplicados, 0);
        assert.deepEqual(await state(), before);
        assert.deepEqual(await fs.readdir(uploadDir), []);
        let first = true;
        const failedClient = { $transaction: (callback, config) => prisma.$transaction(async tx => {
            const result = await callback(tx);
            if (first) { first = false; throw new Error("falha simulada no commit"); }
            return result;
        }, config) };
        const applyOptions = { ...options, apply: true, confirmDb: database, expectedStateHash: dry.estado_hash };
        await assert.rejects(run({ prisma: failedClient, options: applyOptions }), /falha simulada/);
        assert.deepEqual(await state(), before);
        assert.deepEqual(await fs.readdir(path.join(uploadDir, "patrimonios")), []);
        const applied = await run({ options: applyOptions });
        assert.equal(applied.aplicados, 34);
        const loaded = await state();
        assert.ok(loaded.patrimonios.every(row => row.status === "RASCUNHO" && row.publicadoEm === null && row.detalhes.length));
        assert.equal((await prisma.user.findUnique({ where: { email: SEED_EMAIL } })).isActive, false);
        const target = loaded.patrimonios[0];
        await prisma.patrimonio.update({ where: { id: target.id }, data: { nome: "Nome administrativo", slug: "slug-administrativo-" + randomUUID(),
            descricao: "Texto administrativo preservado", status: "ARQUIVADO", arquivadoEm: new Date() } });
        const edited = await state();
        const { importPatrimonios } = await import("../prisma/import-patrimonios.js");
        const importerReview = await importPatrimonios({ prisma, databaseUrl: process.env.TEST_DATABASE_URL, uploadDir,
            options: { apply: false, status: "RASCUNHO", createdByEmail: email } });
        assert.equal(importerReview.criar, 0);
        assert.equal(importerReview.ignorar, 34);
        assert.deepEqual(await state(), edited);
        const repeat = await run();
        assert.equal(repeat.criar, 0); assert.equal(repeat.conflitos.length, 0);
        await run({ options: { ...applyOptions, expectedStateHash: repeat.estado_hash } });
        assert.deepEqual(await state(), edited);
        // A pesquisa usa o mesmo vínculo estável e não transforma a reexecução em update.
        const research = await run({ tipo: "research" });
        assert.equal(research.criar, 0); assert.equal(research.preservar, 33);
        assert.ok(research.pendencias.some(row => row.motivo === "ALIAS_CONSOLIDADO"));
        await run({ tipo: "research", options: { ...applyOptions, expectedStateHash: research.estado_hash } });
        assert.deepEqual(await state(), edited);
        const duplicate = await prisma.patrimonio.create({ data: { nome: "Conflito", slug: catalogoInicial().records[0].aliases[0], descricao: "Fixture", descricaoResumida: "Fixture",
            createdBy: target.createdBy, categoriaId: target.categoriaId } }).catch(() => null);
        if (duplicate) {
            const conflict = await run();
            assert.ok(conflict.conflitos.length);
            const snapshot = await state();
            await assert.rejects(run({ options: { ...applyOptions, expectedStateHash: conflict.estado_hash } }), /bloqueada/);
            assert.deepEqual(await state(), snapshot);
        }
    } finally {
        try { await limparFixtures(); } finally { await prisma.$disconnect(); }
        assert.equal(path.dirname(uploadDir), os.tmpdir()); assert.ok(path.basename(uploadDir).startsWith("initial-load-test-"));
        await fs.rm(uploadDir, { recursive: true, force: true });
    }
});
