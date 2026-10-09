import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";
import { importPatrimonios, parseArgs } from "../prisma/import-patrimonios.js";
import { PATRIMONIOS_SEED } from "../prisma/patrimonioSeedData.js";
import { slugify } from "../src/utils/slug.js";

test("PostgreSQL: importador dry-run, apply, idempotência, preservação e rollback real", {
    skip: !integrationDatabaseAvailable() && "Configure banco exclusivo de teste.",
}, async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "lote06-pg-import-"));
    const uploadDir = path.join(root, "runtime");
    const createdCategories = [];
    let author;
    try {
        author = await prisma.user.create({ data: { name: "Autor teste", email: randomUUID() + "@example.test", passwordHash: "hash-apenas-fixture", role: "ADMIN", isActive: true } });
        for (const nome of new Set(PATRIMONIOS_SEED.map(p => p.categoria))) {
            const existing = await prisma.categoria.findUnique({ where: { nome } });
            if (!existing) createdCategories.push(await prisma.categoria.create({ data: { nome, slug: slugify(nome) } }));
        }
        const category = await prisma.categoria.findUnique({ where: { nome: PATRIMONIOS_SEED[0].categoria } });
        const preserved = await prisma.patrimonio.create({ data: {
            nome: "Conteúdo administrativo preservado", slug: slugify(PATRIMONIOS_SEED[0].nome),
            descricao: "Texto exclusivo do administrador", descricaoResumida: "Não sobrescrever",
            categoriaId: category.id, createdBy: author.id, status: "PUBLICADO", publicadoEm: new Date(),
        } });
        const options = parseArgs(["--apply", "--confirm-db=" + new URL(databaseUrl).pathname.slice(1), "--created-by-email=" + author.email]);
        const args = { prisma, databaseUrl, uploadDir };
        function cli(flags) {
            const result = spawnSync(process.execPath, ["prisma/import-patrimonios.js", ...flags, "--json"], {
                cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8",
                env: { ...process.env, DATABASE_URL: databaseUrl, UPLOAD_DIR: uploadDir, JWT_SECRET: "" },
            });
            assert.equal(result.status, 0, result.stderr + result.stdout);
            return JSON.parse(result.stdout);
        }
        const applyFlags = ["--apply", "--confirm-db=" + options.confirmDb, "--created-by-email=" + author.email];
        const before = await prisma.patrimonio.count();
        const dry = cli(["--dry-run"]);
        assert.equal(dry.criar, 33);
        assert.equal(dry.ignorar, 1);
        assert.deepEqual(dry.erros, []);
        assert.equal(await prisma.patrimonio.count(), before);
        await assert.rejects(fs.access(uploadDir), { code: "ENOENT" });
        const applied = cli(applyFlags);
        assert.deepEqual(applied.erros, []);
        assert.equal(applied.criados, 33);
        const all = await prisma.patrimonio.findMany({ where: { createdBy: author.id }, include: { imagens: true, detalhes: true, localizacao: true }, orderBy: { id: "asc" } });
        assert.equal(all.filter(p => p.status === "RASCUNHO").length, 33);
        const repeat = cli(applyFlags);
        assert.equal(repeat.criados, 0);
        assert.equal(repeat.ignorar, 34);
        assert.deepEqual(await prisma.patrimonio.findUnique({ where: { id: preserved.id } }), preserved);
        assert.deepEqual(await prisma.patrimonio.findMany({ where: { createdBy: author.id }, include: { imagens: true, detalhes: true, localizacao: true }, orderBy: { id: "asc" } }), all);
        const sourceDir = path.join(root, "source");
        await fs.mkdir(sourceDir);
        await fs.writeFile(path.join(sourceDir, "rollback.png"), "rollback-image");
        const failingPrisma = {
            user: prisma.user, categoria: prisma.categoria, patrimonio: prisma.patrimonio,
            $transaction: callback => prisma.$transaction(async tx => {
                await callback(tx);
                throw new Error("rollback-real");
            }),
        };
        const rollback = await importPatrimonios({
            ...args, prisma: failingPrisma, options, sourceDir,
            source: [{ ...PATRIMONIOS_SEED[0], nome: "Teste rollback " + randomUUID(), imagem: "rollback.png" }],
        });
        assert.equal(rollback.erros[0].motivo, "rollback-real");
        assert.equal(await prisma.patrimonio.count(), before + 33);
        await assert.rejects(fs.access(path.join(uploadDir, "patrimonios", "rollback.png")), { code: "ENOENT" });
        console.log("Importador: dry-run 33 criar/1 ignorar; apply 33 criados; repetição 34 ignorados; rollback real aprovado.");
    } finally {
        if (author) {
            for (const p of await prisma.patrimonio.findMany({ where: { createdBy: author.id }, select: { id: true } })) {
                await prisma.patrimonio.delete({ where: { id: p.id } });
            }
            await prisma.user.delete({ where: { id: author.id } });
        }
        for (const c of createdCategories) await prisma.categoria.delete({ where: { id: c.id } });
        await prisma.$disconnect();
        assert.ok(root.startsWith(path.join(os.tmpdir(), "lote06-pg-import-")));
        await fs.rm(root, { recursive: true, force: true });
    }
});
