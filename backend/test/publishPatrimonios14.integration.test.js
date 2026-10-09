import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";
import { PUBLICATION_SLUGS, parsePublicationArgs, publishPatrimonios14 } from "../scripts/publish-patrimonios-14.js";

const safeDatabase = integrationDatabaseAvailable();
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const include = { localizacao: true, imagens: true, detalhes: true, documentos: true, rotas: true, categoriasAdicionais: true };

test("PostgreSQL publicação dos 14: preflight, rollback integral, service administrativo e preservação do Poço", {
    skip: !safeDatabase && "Configure banco exclusivo de teste.",
}, async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = "publication-integration-secret-at-least-32-characters";
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
    const readOnly = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl, options: "-c default_transaction_read_only=on" }) });
    let author, creator, category, extraCategory, route;
    let writes = 0, failAt = 0;
    const observed = prisma.$extends({ query: { patrimonio: { async update({ args, query }) {
        writes++;
        if (failAt && writes === failAt) throw new Error("falha-injetada-publicacao");
        return query(args);
    } } } });
    try {
        author = await prisma.user.create({ data: { name: "Publisher", email: randomUUID() + "@example.test", passwordHash: "fixture", role: "ADMIN" } });
        creator = await prisma.user.create({ data: { name: "Creator", email: randomUUID() + "@example.test", passwordHash: "fixture", role: "EDITOR" } });
        category = await prisma.categoria.create({ data: { nome: randomUUID(), slug: randomUUID() } });
        extraCategory = await prisma.categoria.create({ data: { nome: randomUUID(), slug: randomUUID() } });
        const make = (slug, status = "RASCUNHO") => prisma.patrimonio.create({ data: {
            nome: slug, slug, descricao: "Descrição preservada", descricaoResumida: "Resumo preservado",
            historia: "História preservada", importanciaCultural: "Importância preservada", situacao: "PRESERVADO",
            categoriaId: category.id, createdBy: creator.id, updatedBy: creator.id, status,
            ...(status === "PUBLICADO" && { publicadoEm: new Date("2025-01-01T12:00:00Z") }),
            ...(status === "ARQUIVADO" && { arquivadoEm: new Date("2025-01-01T12:00:00Z") }),
        } });
        const selected = [];
        for (const slug of PUBLICATION_SLUGS) selected.push(await make(slug));
        const poco = await make("antigo-poco-municipal");
        for (let n = 0; n < 19; n++) await make("publicado-" + n, "PUBLICADO");
        for (let n = 0; n < 2; n++) await make("arquivado-" + n, "ARQUIVADO");
        const first = selected[0], last = selected.at(-1);
        await prisma.localizacao.create({ data: { patrimonioId: first.id, endereco: "Rua", bairro: "Centro", numero: "1", cep: "07010-000", latitude: -23.4, longitude: -46.5 } });
        await prisma.patrimonioImagem.create({ data: { patrimonioId: first.id, url: "/uploads/editorial.jpg", textoAlternativo: "Editorial", principal: true } });
        await prisma.patrimonioDetalhe.create({ data: { patrimonioId: first.id, titulo: "Nota", texto: "Preservar", ordem: 0 } });
        await prisma.patrimonioDocumento.create({ data: { patrimonioId: first.id, titulo: "Documento", url: "/doc.pdf", tipo: "PDF" } });
        await prisma.patrimonioCategoria.create({ data: { patrimonioId: first.id, categoriaId: extraCategory.id } });
        route = await prisma.rota.create({ data: { nome: "Rota", slug: randomUUID(), patrimonios: { create: { patrimonioId: first.id, ordem: 1 } } } });
        const snapshot = () => prisma.patrimonio.findMany({ include, orderBy: { id: "asc" } });
        const before = await snapshot();
        const dryOptions = parsePublicationArgs(["--created-by-email=" + author.email]);
        const applyOptions = parsePublicationArgs(["--created-by-email=" + author.email, "--apply", "--confirm-db=patrimonio_guarulhos"]);
        const run = (options = applyOptions, client = observed) => publishPatrimonios14({ prisma: client, options });
        const dry = await run(dryOptions, readOnly);
        assert.equal(dry.modo, "dry-run"); assert.equal(dry.aplicados, 0); assert.equal(dry.selecionados, 14);
        assert.deepEqual(dry.antes, { PUBLICADO: 19, RASCUNHO: 15, ARQUIVADO: 2 });
        assert.deepEqual(dry.previsto, { PUBLICADO: 33, RASCUNHO: 1, ARQUIVADO: 2 });
        assert.deepEqual(dry.itens.map(p => p.slug), [...PUBLICATION_SLUGS]);
        assert.deepEqual(await snapshot(), before);

        async function blocked(pattern, options = applyOptions) {
            writes = 0;
            const state = await snapshot();
            await assert.rejects(run(options), pattern);
            assert.equal(writes, 0, "preflight precisa bloquear antes da primeira escrita");
            assert.deepEqual(await snapshot(), state);
        }
        for (const status of ["PUBLICADO", "ARQUIVADO"]) {
            await prisma.patrimonio.update({ where: { id: last.id }, data: { status } });
            await blocked(/RASCUNHO/);
        }
        await prisma.patrimonio.update({ where: { id: last.id }, data: { status: "RASCUNHO", slug: "ausente-da-lista" } });
        await blocked(/RASCUNHO/);
        await prisma.patrimonio.update({ where: { id: last.id }, data: { slug: last.slug } });
        await prisma.patrimonio.update({ where: { id: poco.id }, data: { status: "PUBLICADO" } });
        await blocked(/Poço/);
        await prisma.patrimonio.update({ where: { id: poco.id }, data: { status: "RASCUNHO" } });
        // O próprio service da API rejeita cadastro inválido antes de escrever o primeiro item.
        await prisma.patrimonio.update({ where: { id: last.id }, data: { descricao: "" } });
        await blocked();
        await assert.rejects(run(dryOptions, readOnly));
        await prisma.patrimonio.update({ where: { id: last.id }, data: { descricao: last.descricao } });
        await blocked(/ADMIN/, { ...applyOptions, createdByEmail: creator.email });
        await blocked(/ADMIN/, { ...applyOptions, createdByEmail: "ausente@example.test" });
        await prisma.user.update({ where: { id: author.id }, data: { isActive: false } });
        await blocked(/ADMIN/);
        await prisma.user.update({ where: { id: author.id }, data: { isActive: true } });
        const extra = await make("rascunho-fora-da-lista");
        await blocked(/Contagem/);
        await prisma.patrimonio.delete({ where: { id: extra.id } });

        const restored = await snapshot();
        writes = 0; failAt = 8;
        await assert.rejects(run(), /falha-injetada-publicacao/);
        assert.equal(writes, 8); assert.deepEqual(await snapshot(), restored);
        failAt = 0; writes = 0;
        const start = Date.now();
        const result = await run();
        assert.equal(result.aplicados, 14); assert.equal(writes, 14);
        assert.deepEqual(result.depois, { PUBLICADO: 33, RASCUNHO: 1, ARQUIVADO: 2 });
        const after = await snapshot();
        const mutable = new Set(["status", "publicadoEm", "arquivadoEm", "updatedBy", "updatedAt"]);
        const preserved = p => Object.fromEntries(Object.entries(p).filter(([key]) => !mutable.has(key)));
        for (const current of after) {
            const old = restored.find(p => p.id === current.id);
            if (PUBLICATION_SLUGS.includes(current.slug)) {
                assert.equal(current.status, "PUBLICADO"); assert.equal(current.updatedBy, author.id);
                assert.ok(current.publicadoEm.getTime() >= start && current.publicadoEm.getTime() <= Date.now());
                assert.equal(current.arquivadoEm, null);
                assert.deepEqual(preserved(current), preserved(old));
            } else assert.deepEqual(current, old);
        }
        assert.equal(after.find(p => p.id === poco.id).status, "RASCUNHO");
        assert.equal(await prisma.auditLog.count({ where: { userId: author.id } }), 0, "Service atual não gera AuditLog de publicação");
        await blocked(/RASCUNHO/); // Segunda execução não republica nem renova datas.
    } finally {
        if (route) await prisma.rota.delete({ where: { id: route.id } });
        if (creator) await prisma.patrimonio.deleteMany({ where: { createdBy: creator.id } });
        if (extraCategory) await prisma.categoria.delete({ where: { id: extraCategory.id } });
        if (category) await prisma.categoria.delete({ where: { id: category.id } });
        if (author) await prisma.user.delete({ where: { id: author.id } });
        if (creator) await prisma.user.delete({ where: { id: creator.id } });
        await readOnly.$disconnect();
        await prisma.$disconnect();
    }
});
