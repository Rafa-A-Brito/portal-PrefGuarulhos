import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";
import { importPatrimonios, parseArgs, LEGACY_SLUG_ALIASES } from "../prisma/import-patrimonios.js";
import { planSync, SYNC_INCLUDE } from "../prisma/sync-patrimonios.js";
import { PATRIMONIOS_SEED as seed } from "../prisma/patrimonioSeedData.js";
import { localizacaoSchema } from "../src/schemas/patrimonioSchema.js";
import { slugify } from "../src/utils/slug.js";

test("PostgreSQL sync: 36 registros, dry-run sem writes, rollback, relações, merges e idempotência", {
    skip: !integrationDatabaseAvailable() && "Configure banco exclusivo de teste.",
}, async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "patrimonio-sync-pg-"));
    const createdCategories = [];
    let author, route;
    try {
        author = await prisma.user.create({ data: { name: "Sync fixture", email: randomUUID() + "@example.test", passwordHash: "fixture", role: "ADMIN" } });
        for (const nome of new Set(seed.map(p => p.categoria))) {
            if (!await prisma.categoria.findUnique({ where: { nome } })) createdCategories.push(await prisma.categoria.create({ data: { nome, slug: slugify(nome) } }));
        }
        const categories = await prisma.categoria.findMany();
        const cat = nome => categories.find(c => c.nome === nome).id;
        const rows = [];
        for (const item of seed) rows.push(await prisma.patrimonio.create({ data: {
            nome: item.nome, slug: LEGACY_SLUG_ALIASES.get(slugify(item.nome)) ?? slugify(item.nome), descricao: "Antes do saneamento", descricaoResumida: "Antes", categoriaId: cat(item.categoria), createdBy: author.id,
            ...(item.nome === "Casa José Maurício" && { status: "PUBLICADO", publicadoEm: new Date("2025-07-01T12:00:00Z") }),
        } }));
        const casa = rows.find(p => p.nome === "Casa José Maurício");
        const duplicate = await prisma.patrimonio.create({ data: { nome: "Casarão da Nossa História", slug: "casarao-da-nossa-historia", descricao: "Duplicado", descricaoResumida: "Duplicado", categoriaId: cat("Arquitetônico"), createdBy: author.id, status: "PUBLICADO", publicadoEm: new Date(), localizacao: { create: { endereco: "Local arquivado", bairro: "Centro" } } } });
        await prisma.patrimonio.create({ data: { nome: "Casarão do Sítio Ponte Alta", slug: "casarao-do-sitio-ponte-alta", descricao: "Duplicado", descricaoResumida: "Duplicado", categoriaId: cat("Arquitetônico"), createdBy: author.id } });
        await prisma.patrimonioImagem.createMany({ data: [{ patrimonioId: casa.id, url: "/uploads/patrimonios/casa_jose_mauricio.jpg", textoAlternativo: "Capa existente", principal: true }, { patrimonioId: duplicate.id, url: "/uploads/patrimonios/casa_jose_mauricio.jpg", textoAlternativo: "Duplicada" }, { patrimonioId: duplicate.id, url: "/uploads/editorial.png", textoAlternativo: "Editorial", credito: "Crédito" }] });
        await prisma.patrimonioDocumento.create({ data: { patrimonioId: duplicate.id, titulo: "Inventário", url: "/inventario.pdf", tipo: "PDF", fonte: "Arquivo" } });
        await prisma.patrimonioDetalhe.create({ data: { patrimonioId: duplicate.id, titulo: "Nota editorial", texto: "Preservar este texto", ordem: 0 } });
        await prisma.patrimonioCategoria.create({ data: { patrimonioId: duplicate.id, categoriaId: cat("Ambiental") } });
        route = await prisma.rota.create({ data: { nome: "Rota sync", slug: randomUUID(), patrimonios: { create: { patrimonioId: duplicate.id, ordem: 1 } } } });
        const snapshot = () => prisma.patrimonio.findMany({ where: { createdBy: author.id }, include: SYNC_INCLUDE, orderBy: { id: "asc" } });
        const before = await snapshot();
        const plan = planSync({ source: seed, existing: before, categories });
        assert.deepEqual(plan.report.conflitos, []);
        assert.equal(plan.operations.length, 34);
        for (const op of plan.operations) {
            assert.deepEqual(localizacaoSchema.parse(op.locationCreate), op.locationCreate);
            for (const key of ["endereco", "numero", "bairro", "cep", "latitude", "longitude", "cidade", "uf"]) {
                assert.notEqual(op.locationCreate[key], undefined, op.current.nome + ": " + key);
                assert.notEqual(op.locationCreate[key], null, op.current.nome + ": " + key);
            }
        }
        const args = { prisma, databaseUrl, uploadDir };
        const dry = await importPatrimonios({ ...args, options: parseArgs(["--sync-patrimonios"]) });
        assert.deepEqual(dry.erros, []); assert.deepEqual(dry.conflitos, []);
        assert.equal(dry.fonte_canonica, 34); assert.equal(dry.merges_planejados, 2); assert.equal(dry.updates_planejados, 34);
        assert.deepEqual(await snapshot(), before); assert.deepEqual(await fs.readdir(uploadDir), []);
        const options = parseArgs(["--sync-patrimonios", "--apply", "--confirm-db=" + new URL(databaseUrl).pathname.slice(1), "--created-by-email=" + author.email]);
        // O último canônico incompleto bloqueia inclusive as 33 operações válidas anteriores.
        const incomplete = seed.map(item => ({ ...item }));
        delete incomplete.at(-1).cep;
        const blocked = await importPatrimonios({ ...args, source: incomplete, options });
        assert.equal(blocked.conflitos.length, 1);
        assert.match(blocked.conflitos[0].motivo, /cep/);
        assert.equal(blocked.aplicados, 0);
        assert.deepEqual(await snapshot(), before);
        assert.deepEqual(await fs.readdir(uploadDir), []);
        assert.equal(await prisma.auditLog.count({ where: { userId: author.id } }), 0);
        let failOnce = true;
        const failing = { $transaction: (callback, opts) => prisma.$transaction(async tx => { const result = await callback(tx); if (failOnce) { failOnce = false; throw new Error("rollback-real-sync"); } return result; }, opts) };
        await assert.rejects(importPatrimonios({ ...args, prisma: failing, options }), /rollback-real-sync/);
        assert.deepEqual(await snapshot(), before);
        assert.deepEqual(await fs.readdir(path.join(uploadDir, "patrimonios")), ["casa_jose_mauricio.jpg"]);
        assert.equal(await prisma.auditLog.count({ where: { userId: author.id } }), 0);
        // Duas execuções concorrentes: o lock serializa ou Serializable aborta uma delas.
        const concurrent = await Promise.allSettled([importPatrimonios({ ...args, options }), importPatrimonios({ ...args, options })]);
        assert.ok(concurrent.some(r => r.status === "fulfilled" && r.value.aplicados === 34));
        for (const result of concurrent) {
            if (result.status === "fulfilled") { assert.deepEqual(result.value.erros, []); assert.deepEqual(result.value.conflitos, []); }
            else assert.match(result.reason.message, /serializ|conflict|deadlock|P2034/i);
        }
        const after = await snapshot();
        assert.equal(after.length, 36); assert.equal(after.filter(p => p.status === "ARQUIVADO").length, 2);
        const canonical = after.find(p => p.id === casa.id);
        for (const key of ["id", "slug", "createdBy", "updatedBy", "status", "publicadoEm"]) assert.deepEqual(canonical[key], casa[key]);
        assert.equal(canonical.imagens.length, 2); assert.equal(canonical.imagens.filter(i => i.principal).length, 1);
        assert.ok(canonical.detalhes.some(d => d.titulo === "Nota editorial"));
        assert.equal(canonical.documentos.length, 1); assert.equal(canonical.categoriasAdicionais.length, 1); assert.equal(canonical.rotas[0].rotaId, route.id);
        assert.equal(after.find(p => p.id === duplicate.id).localizacao.endereco, "Local arquivado");
        assert.equal(after.find(p => p.nome === "Parque Ecológico do Tietê").localizacao.cidade, "São Paulo");
        assert.equal(after.find(p => p.nome === "Antigo Poço Municipal").status, "RASCUNHO");
        const repeat = await importPatrimonios({ ...args, options });
        assert.equal(repeat.aplicados, 0); assert.equal(repeat.updates_planejados, 0); assert.equal(repeat.merges_planejados, 0);
        assert.deepEqual(await snapshot(), after);
        assert.equal(await prisma.auditLog.count({ where: { userId: author.id } }), 34);
    } finally {
        if (route) await prisma.rota.delete({ where: { id: route.id } });
        if (author) {
            await prisma.auditLog.deleteMany({ where: { userId: author.id } });
            await prisma.patrimonio.deleteMany({ where: { createdBy: author.id } });
            await prisma.user.delete({ where: { id: author.id } });
        }
        for (const c of createdCategories) await prisma.categoria.delete({ where: { id: c.id } });
        await prisma.$disconnect();
        assert.ok(path.resolve(uploadDir).startsWith(path.join(os.tmpdir(), "patrimonio-sync-pg-")));
        await fs.rm(uploadDir, { recursive: true, force: true });
    }
});

test("PostgreSQL sync: upsert com patch de quatro campos e create completo preserva localização editorial", {
    skip: !integrationDatabaseAvailable() && "Configure banco exclusivo de teste.",
}, async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    let author, category;
    try {
        author = await prisma.user.create({ data: { name: "Location fixture", email: randomUUID() + "@example.test", passwordHash: "fixture", role: "ADMIN" } });
        category = await prisma.categoria.create({ data: { nome: "Location " + randomUUID(), slug: randomUUID() } });
        const item = seed.find(p => p.nome === "Estação Ferroviária de Guarulhos");
        const current = await prisma.patrimonio.create({ data: {
            nome: item.nome, slug: randomUUID(), descricao: "Fixture", descricaoResumida: "Fixture", categoriaId: category.id, createdBy: author.id,
            localizacao: { create: { endereco: item.endereco, bairro: item.bairro, cidade: "São Paulo", uf: "SP", complemento: "Preservar nota editorial" } },
        }, include: SYNC_INCLUDE });
        const source = [{ nome: item.nome, numero: item.numero, cep: item.cep, latitude: item.latitude, longitude: item.longitude }];
        const args = { prisma, databaseUrl, source };
        const dryOptions = parseArgs(["--sync-patrimonios"]);
        const snapshot = () => prisma.patrimonio.findUnique({ where: { id: current.id }, include: SYNC_INCLUDE });
        const dry = await importPatrimonios({ ...args, options: dryOptions });
        assert.deepEqual(dry.erros, []); assert.deepEqual(dry.conflitos, []);
        assert.deepEqual(dry.itens[0].diff.map(d => d.campo), ["localizacao.numero", "localizacao.cep", "localizacao.latitude", "localizacao.longitude"]);
        assert.equal(dry.aplicados, 0);
        assert.deepEqual(await snapshot(), current);
        const plan = planSync({ source, existing: [current], categories: [category] });
        assert.deepEqual(Object.keys(plan.operations[0].location), ["numero", "cep", "latitude", "longitude"]);
        assert.equal(plan.operations[0].locationCreate.endereco, current.localizacao.endereco);
        assert.equal(plan.operations[0].locationCreate.cidade, "São Paulo");
        const applied = await importPatrimonios({ ...args, options: parseArgs(["--sync-patrimonios", "--apply", "--confirm-db=" + new URL(databaseUrl).pathname.slice(1), "--created-by-email=" + author.email]) });
        assert.deepEqual(applied.erros, []); assert.deepEqual(applied.conflitos, []);
        assert.equal(applied.aplicados, 1);
        const after = await snapshot();
        for (const key of ["id", "patrimonioId", "endereco", "bairro", "cidade", "uf", "complemento"]) assert.deepEqual(after.localizacao[key], current.localizacao[key], key);
        for (const key of ["numero", "cep"]) assert.equal(after.localizacao[key], item[key]);
        for (const key of ["latitude", "longitude"]) assert.equal(Number(after.localizacao[key]), item[key]);
        const repeat = await importPatrimonios({ ...args, options: dryOptions });
        assert.deepEqual(repeat.erros, []); assert.deepEqual(repeat.conflitos, []);
        assert.equal(repeat.updates_planejados, 0); assert.equal(repeat.aplicados, 0);
        assert.deepEqual(repeat.itens[0].diff, []);
        assert.deepEqual(await snapshot(), after);
        assert.equal(await prisma.auditLog.count({ where: { userId: author.id } }), 1);
    } finally {
        if (author) {
            await prisma.auditLog.deleteMany({ where: { userId: author.id } });
            await prisma.patrimonio.deleteMany({ where: { createdBy: author.id } });
            await prisma.user.delete({ where: { id: author.id } });
        }
        if (category) await prisma.categoria.delete({ where: { id: category.id } });
        await prisma.$disconnect();
    }
});
