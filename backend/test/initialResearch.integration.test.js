import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { assertTestDatabase } from "../scripts/assert-test-db.js";
import { executarCargaInicial, catalogoInicial } from "../prisma/carga-inicial.js";

test("PostgreSQL: pesquisa em banco vazio usa detalhes atuais e preserva assets originais", {
    skip: !process.env.TEST_DATABASE_URL ? "Exige PostgreSQL descartável." : false,
}, async () => {
    assertTestDatabase();
    const { PrismaClient } = await import("@prisma/client"), { PrismaPg } = await import("@prisma/adapter-pg");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "initial-research-test-"));
    const email = randomUUID() + "@example.test";
    const catalog = catalogoInicial("research");
    const hashes = async () => Promise.all(catalog.records.map(async row => createHash("sha256").update(await fs.readFile(row.image.source)).digest("hex")));
    const assetsBefore = await hashes();
    try {
        await prisma.user.create({ data: { name: "Responsável", email, role: "EDITOR", passwordHash: "fixture" } });
        const database = new URL(process.env.TEST_DATABASE_URL).pathname.slice(1);
        const options = { createdByEmail: email };
        const run = extra => executarCargaInicial({ prisma, databaseUrl: process.env.TEST_DATABASE_URL, tipo: "research", uploadDir, publicBaseUrl: "http://assets.example.test", options, ...extra });
        const dry = await run({});
        assert.equal(dry.criar, 33);
        assert.equal(await prisma.patrimonio.count(), 0);
        const applied = await run({ options: { ...options, apply: true, confirmDb: database, expectedStateHash: dry.estado_hash } });
        assert.equal(applied.aplicados, 33);
        const rows = await prisma.patrimonio.findMany({ include: { detalhes: true, imagens: true, fatos: true, ligacoes: true } });
        assert.ok(rows.every(row => row.descricao.trim() && row.detalhes.length && row.status === "RASCUNHO"));
        assert.ok(rows.every(row => Number.isInteger(row.numeroExibicao) && Number.isInteger(row.ordemExibicao)));
        assert.equal(rows.filter(row => row.nome === "Casa José Maurício").length, 1);
        assert.ok(rows.every(row => row.imagens[0].url.startsWith("http://assets.example.test/arquivos/patrimonios/")));
        assert.deepEqual(await fs.readdir(uploadDir), []);
        assert.deepEqual(await hashes(), assetsBefore);
    } finally {
        await prisma.$disconnect();
        assert.equal(path.dirname(uploadDir), os.tmpdir()); assert.ok(path.basename(uploadDir).startsWith("initial-research-test-"));
        await fs.rm(uploadDir, { recursive: true, force: true });
    }
});
