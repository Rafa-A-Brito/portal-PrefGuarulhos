import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";
const safeDatabase = integrationDatabaseAvailable();

test("PostgreSQL: referências reutilizam documentos, respeitam status e preservam resumo manual", {
    skip: !safeDatabase && "Configure banco descartável *_test e TEST_DATABASE_EXCLUSIVE=1.",
}, async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = "integration-reference-secret-with-at-least-32-characters";
    const { default: prisma } = await import("../src/config/prisma.js");
    const ref = await import("../src/services/referenciaService.js");
    const service = await import("../src/services/patrimonioService.js");
    const key = randomUUID();
    let user, categoria, patrimonio;
    try {
        user = await prisma.user.create({ data: { name: "Teste referência", email: `${key}@example.test`, passwordHash: "unused", role: "ADMIN" } });
        categoria = await prisma.categoria.create({ data: { nome: key, slug: key } });
        patrimonio = await service.createPatrimonio({ nome: key, descricao: "Descrição completa", descricaoResumida: "Resumo manual independente.", categoriaId: categoria.id }, user.id);
        const editor = { ...user, role: "EDITOR" };
        const link = await ref.criarReferenciaPatrimonio(patrimonio.id, null, { url: "https://example.org/acervo", descricao: "Fonte primária" }, editor);
        assert.equal(link.tipo, "LINK");
        assert.equal(await prisma.patrimonioDocumento.count({ where: { patrimonioId: patrimonio.id } }), 1);
        let detail = await service.getAdminPatrimonio(patrimonio.id);
        assert.equal(detail.documentos[0].id, link.id);
        assert.equal(detail.descricaoResumida, "Resumo manual independente.");
        await service.updatePatrimonio(patrimonio.id, { descricao: "Descrição revisada" }, user);
        assert.equal((await service.getAdminPatrimonio(patrimonio.id)).descricaoResumida, "Resumo manual independente.");
        await assert.rejects(ref.removerReferenciaPatrimonio(patrimonio.id, link.id, editor), { statusCode: 403 });
        await assert.rejects(ref.removerReferenciaPatrimonio(patrimonio.id, randomUUID(), user), { statusCode: 404 });
        await service.changePatrimonioStatus(patrimonio.id, "PUBLICADO", user);
        assert.equal((await service.getPatrimonioBySlug(patrimonio.slug)).documentos[0].id, link.id);
        await assert.rejects(ref.criarReferenciaPatrimonio(patrimonio.id, null, { url: "https://example.org" }, editor), { statusCode: 403 });
        await service.changePatrimonioStatus(patrimonio.id, "ARQUIVADO", user);
        await assert.rejects(ref.criarReferenciaPatrimonio(patrimonio.id, null, { url: "https://example.org" }, editor), { statusCode: 403 });
        await ref.removerReferenciaPatrimonio(patrimonio.id, link.id, user);
        detail = await service.getAdminPatrimonio(patrimonio.id);
        assert.equal(detail.documentos.length, 0);
        assert.equal(detail.descricaoResumida, "Resumo manual independente.");
    } finally {
        try {
            if (patrimonio) await prisma.patrimonio.delete({ where: { id: patrimonio.id } });
            if (categoria) await prisma.categoria.delete({ where: { id: categoria.id } });
            if (user) await prisma.user.delete({ where: { id: user.id } });
        } finally { await prisma.$disconnect(); }
    }
});
