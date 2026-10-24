import { prepararLimpezaFixtures } from "./limpezaFixtures.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertTestDatabase } from "../scripts/assert-test-db.js";
import { importPatrimonios, parseArgs } from "../prisma/import-patrimonios.js";
import { importNovidades, loadSource } from "../scripts/import-novidades.js";

test("PostgreSQL: lotes revisados, backfills, rollback, concorrência e novidades", {
    skip: !process.env.TEST_DATABASE_URL ? "Exige PostgreSQL descartável." : false,
}, async () => {
    assertTestDatabase();
    const { PrismaClient } = await import("@prisma/client"), { PrismaPg } = await import("@prisma/adapter-pg");
    const databaseUrl = process.env.TEST_DATABASE_URL, database = new URL(databaseUrl).pathname.slice(1);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    const limparFixtures = await prepararLimpezaFixtures(prisma);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "import-safety-test-"));
    const sourceDir = path.join(root, "source"), uploadDir = path.join(root, "uploads");
    await fs.mkdir(sourceDir); await fs.writeFile(path.join(sourceDir, "fixture.png"), "bytes da fixture");
    const author = await prisma.user.create({ data: { name: "Importador", email: randomUUID() + "@example.test", role: "ADMIN", passwordHash: "fixture" } });
    const category = await prisma.categoria.create({ data: { nome: "Categoria " + randomUUID(), slug: "categoria-" + randomUUID() } });
    const options = { ...parseArgs([]), createdByEmail: author.email };
    const source = [{ nome: "Casa fixture " + randomUUID(), descricao: "Descrição existente da fixture", descricaoResumida: "Resumo da fixture", categoria: category.nome, imagem: "fixture.png" }];
    const run = (extra = {}) => importPatrimonios({ prisma, databaseUrl, options, source, sourceDir, uploadDir, ...extra });
    try {
        const dry = await run(); assert.equal(dry.criar, 1); assert.equal(await prisma.patrimonio.count(), 0);
        const apply = { ...options, apply: true, confirmDb: database, expectedStateHash: dry.estado_hash };
        await assert.rejects(run({ options: { ...apply, expectedStateHash: undefined } }), /hash/);
        const badSource = [...source, { ...source[0], nome: "Inválida", categoria: "Ausente" }];
        const badDry = await run({ source: badSource });
        const blocked = await run({ source: badSource, options: { ...apply, expectedStateHash: badDry.estado_hash } });
        assert.ok(blocked.erros.length); assert.equal(await prisma.patrimonio.count(), 0);
        const actualTransaction = prisma.$transaction.bind(prisma);
        let abort = true;
        const failClient = { $transaction: (callback, config) => actualTransaction(async tx => {
            const value = await callback(tx); if (abort) { abort = false; throw new Error("commit abortado"); } return value;
        }, config) };
        await assert.rejects(run({ prisma: failClient, options: apply }), /commit abortado/);
        assert.equal(await prisma.patrimonio.count(), 0);
        assert.deepEqual(await fs.readdir(path.join(uploadDir, "patrimonios")), []);
        const parallel = await Promise.allSettled([run({ options: apply }), run({ options: apply })]);
        assert.equal(await prisma.patrimonio.count(), 1);
        assert.ok(parallel.some(result => result.status === "fulfilled" && result.value.criados === 1));
        const row = await prisma.patrimonio.findFirst();
        assert.equal(row.status, "RASCUNHO");
        await prisma.patrimonio.update({ where: { id: row.id }, data: { nome: "Nome administrativo alterado", slug: "slug-editado-" + randomUUID(), status: "ARQUIVADO", descricao: "Preservar edição", arquivadoEm: new Date() } });
        const reexec = await run();
        const repeat = await run({ options: { ...apply, expectedStateHash: reexec.estado_hash } });
        assert.equal(repeat.criados, 0);
        assert.equal((await prisma.patrimonio.findUnique({ where: { id: row.id } })).descricao, "Preservar edição");
        for (const mode of ["backfillLocation", "backfillDetails"]) {
            const item = { ...source[0], endereco: "Rua da fixture", bairro: "Centro", detalhes: [{ titulo: "Título da fonte", texto: "Texto da fonte" }] };
            const opts = { ...options, [mode]: true };
            const review = await run({ source: [item], options: opts });
            const result = await run({ source: [item], options: { ...opts, apply: true, confirmDb: database, expectedStateHash: review.estado_hash } });
            assert.equal(mode === "backfillLocation" ? result.localizacoesVinculadas : result.detalhesVinculados, 1);
        }
        const preserved = await prisma.patrimonio.findUnique({ where: { id: row.id }, include: { detalhes: true, localizacao: true } });
        assert.equal(preserved.status, "ARQUIVADO"); assert.equal(preserved.detalhes[0].texto, "Texto da fonte");
        // Uma edição entre revisão e aplicação bloqueia o plano inteiro.
        const review = await run();
        await prisma.patrimonio.update({ where: { id: row.id }, data: { descricaoResumida: "Edição posterior" } });
        const stale = await run({ options: { ...apply, expectedStateHash: review.estado_hash } });
        assert.ok(stale.conflitos.some(conflict => conflict.motivo === "ESTADO_DESATUALIZADO"));
        const items = await loadSource();
        const novidadeOptions = { createdByEmail: author.email, status: "RASCUNHO", apply: false };
        const news = extra => importNovidades({ prisma, database, items, uploadsDir: uploadDir, options: novidadeOptions, ...extra });
        const newsDry = await news({}); assert.equal(newsDry.aplicados, 0);
        const newsApply = { ...novidadeOptions, apply: true, confirmDb: database, expectedStateHash: newsDry.estado_hash };
        const newsFail = { $transaction: (callback, config) => actualTransaction(async tx => {
            const result = await callback(tx); if (!abort) { abort = true; throw new Error("novidades revertidas"); } return result;
        }, config) };
        await assert.rejects(news({ prisma: newsFail, options: newsApply }), /novidades revertidas/);
        assert.equal(await prisma.novidade.count(), 0);
        assert.deepEqual(await fs.readdir(path.join(uploadDir, "novidades")), []);
        assert.equal((await news({ options: newsApply })).aplicados, 16);
        const newsRepeat = await news({});
        assert.equal((await news({ options: { ...newsApply, expectedStateHash: newsRepeat.estado_hash } })).aplicados, 0);
        assert.equal(await prisma.novidade.count(), 16);
    } finally {
        try { await limparFixtures(); } finally { await prisma.$disconnect(); }
        assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith("import-safety-test-"));
        await fs.rm(root, { recursive: true, force: true });
    }
});
