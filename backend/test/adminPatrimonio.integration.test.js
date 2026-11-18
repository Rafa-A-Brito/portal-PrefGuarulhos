import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const safeDatabase = integrationDatabaseAvailable();

test("PostgreSQL: edição, localização, transições concorrentes e visibilidade pública", {
    skip: !safeDatabase && "Configure TEST_DATABASE_URL para um banco exclusivo *_test e TEST_DATABASE_EXCLUSIVE=1.",
}, async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = "integration-test-secret-with-at-least-32-characters";
    const { default: prisma } = await import("../src/config/prisma.js");
    const service = await import("../src/services/patrimonioService.js");
    const key = randomUUID();
    let user, categoria, categoriaAdicional, patrimonio;
    try {
        user = await prisma.user.create({ data: { name: "Teste patrimônio", email: `${key}@example.test`, passwordHash: "unused", role: "ADMIN" } });
        categoria = await prisma.categoria.create({ data: { nome: key, slug: key } });
        categoriaAdicional = await prisma.categoria.create({ data: { nome: `${key}-adicional`, slug: `${key}-adicional` } });
        patrimonio = await service.createPatrimonio({ nome: key, descricao: "Descrição", descricaoResumida: "Resumo", categoriaId: categoria.id, categoriasAdicionais: [categoriaAdicional.id] }, user.id);
        assert.equal(patrimonio.statusVisitacao, "NAO_INFORMADO");
        assert.equal(patrimonio.motivoRestricao, null);
        assert.equal(patrimonio.previsaoReabertura, null);
        assert.equal(patrimonio.raioProtecaoEntornoMetros, null);
        const creationLog = await prisma.auditLog.findFirst({ where: { entityId: patrimonio.id, action: "PATRIMONIO_CREATE" } });
        assert.equal(creationLog.newValues.raioProtecaoEntornoMetros, null);
        const id = patrimonio.id;
        await service.updatePatrimonio(id, { raioProtecaoEntornoMetros: 125.375 }, user);
        assert.equal((await service.getAdminPatrimonio(id)).raioProtecaoEntornoMetros, 125.375);
        const originalSlug = patrimonio.slug;
        await assert.rejects(service.getPatrimonioBySlug(originalSlug), { statusCode: 404 });
        await service.updatePatrimonio(id, { nome: `${key} editado`, localizacao: { endereco: "Rua", bairro: "Centro", latitude: -23, longitude: -46 } }, user);
        await assert.rejects(
            service.updatePatrimonio(id, { localizacao: { latitude: -24 } }, user),
            { statusCode: 400 }
        );
        await service.updatePatrimonio(id, { localizacao: { latitude: -24, longitude: -46 } }, user);
        const edited = await service.getAdminPatrimonio(id);
        assert.deepEqual(edited.categoriasAdicionais.map((item) => item.id), [categoriaAdicional.id]);
        assert.equal(edited.raioProtecaoEntornoMetros, 125.375);
        const radiusLog = await prisma.auditLog.findFirst({ where: { entityId: id, action: "PATRIMONIO_UPDATE" }, orderBy: { createdAt: "asc" } });
        assert.equal(radiusLog.oldValues.raioProtecaoEntornoMetros, null);
        assert.equal(radiusLog.newValues.raioProtecaoEntornoMetros, 125.375);
        assert.equal(edited.slug, originalSlug);
        assert.equal(edited.localizacao.latitude.toNumber(), -24);
        assert.equal(edited.localizacao.longitude.toNumber(), -46);
        assert.equal(edited.updatedBy, user.id);
        await assert.rejects(service.updatePatrimonio(id, { categoriaId: categoriaAdicional.id }, user), { statusCode: 400 });
        await assert.rejects(service.updatePatrimonio(id, { categoriasAdicionais: [randomUUID()] }, user), { statusCode: 400 });
        assert.deepEqual((await service.getAdminPatrimonio(id)).categoriasAdicionais.map((item) => item.id), [categoriaAdicional.id]);
        await service.updatePatrimonio(id, { categoriasAdicionais: [] }, user);
        assert.deepEqual((await service.getAdminPatrimonio(id)).categoriasAdicionais, []);
        await service.updatePatrimonio(id, { categoriasAdicionais: [categoriaAdicional.id] }, user);
        assert.deepEqual((await service.getAdminPatrimonio(id)).categoriasAdicionais.map((item) => item.id), [categoriaAdicional.id]);
        await assert.rejects(service.updatePatrimonio(id, { nome: "Não persistir", categoriaId: randomUUID() }, user), { statusCode: 400 });
        assert.equal((await service.getAdminPatrimonio(id)).nome, `${key} editado`);

        const { updatePatrimonioSchema } = await import("../src/schemas/patrimonioSchema.js");
        await service.updatePatrimonio(id, updatePatrimonioSchema.parse({
            statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Reforma", previsaoReabertura: "2028-02-29",
        }), user);
        const partial = await service.updatePatrimonio(id, { descricaoResumida: "Resumo revisado" }, user);
        assert.equal(partial.statusVisitacao, "TEMPORARIAMENTE_FECHADO");
        assert.equal(partial.motivoRestricao, "Reforma");
        assert.equal(partial.previsaoReabertura, "2028-02-29");
        assert.equal((await prisma.patrimonio.findUnique({ where: { id } })).previsaoReabertura.toISOString(), "2028-02-29T00:00:00.000Z");

        // Duas publicações simultâneas devem observar a mesma data após o bloqueio da linha.
        const published = await Promise.all([
            service.changePatrimonioStatus(id, "PUBLICADO", user),
            service.changePatrimonioStatus(id, "PUBLICADO", user),
        ]);
        assert.equal(published[0].publicadoEm.getTime(), published[1].publicadoEm.getTime());
        assert.equal(published[0].updatedAt.getTime(), published[1].updatedAt.getTime());
        assert.equal((await service.getPatrimonioBySlug(originalSlug)).id, id);
        assert.equal((await service.getPatrimonioBySlug(originalSlug)).raioProtecaoEntornoMetros, 125.375);
        await service.updatePatrimonio(id, { raioProtecaoEntornoMetros: null }, user);
        assert.equal((await service.getPatrimonioBySlug(originalSlug)).raioProtecaoEntornoMetros, null);
        assert.deepEqual((await service.getPatrimonioBySlug(originalSlug)).categoriasAdicionais.map((item) => item.id), [categoriaAdicional.id]);
        assert.equal((await service.listPatrimonios({ busca: key, pagina: 1, limite: 20 })).itens.length, 1);
        for (const dto of [await service.getPatrimonioBySlug(originalSlug),
            (await service.listPatrimonios({ busca: key, pagina: 1, limite: 20 })).itens[0]]) {
            assert.equal(dto.statusVisitacao, "TEMPORARIAMENTE_FECHADO");
            assert.equal(dto.motivoRestricao, "Reforma");
            assert.equal(dto.previsaoReabertura, "2028-02-29");
        }
        await service.updatePatrimonio(id, { statusVisitacao: "ABERTO" }, user);
        const reopened = await prisma.patrimonio.findUnique({ where: { id } });
        assert.equal(reopened.statusVisitacao, "ABERTO");
        assert.equal(reopened.motivoRestricao, null);
        assert.equal(reopened.previsaoReabertura, null);
        const logs = await prisma.auditLog.findMany({ where: { entityId: id, action: "PATRIMONIO_UPDATE" } });
        const reopeningLog = logs.find(log => log.newValues.statusVisitacao === "ABERTO");
        assert.deepEqual(reopeningLog.oldValues, { statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Reforma", previsaoReabertura: "2028-02-29" });
        assert.deepEqual(reopeningLog.newValues, { statusVisitacao: "ABERTO", motivoRestricao: null, previsaoReabertura: null });
        await assert.rejects(service.updatePatrimonio(id, { nome: "Proibido" }, { id: user.id, role: "EDITOR" }), { statusCode: 403 });

        const archived = await service.changePatrimonioStatus(id, "ARQUIVADO", user);
        assert.equal(archived.publicadoEm.getTime(), published[0].publicadoEm.getTime());
        assert.ok(archived.arquivadoEm);
        await assert.rejects(service.getPatrimonioBySlug(originalSlug), { statusCode: 404 });
        assert.equal((await service.listPatrimonios({ busca: key, pagina: 1, limite: 20 })).itens.length, 0);
        const repeated = await service.changePatrimonioStatus(id, "ARQUIVADO", user);
        assert.equal(repeated.arquivadoEm.getTime(), archived.arquivadoEm.getTime());
        assert.equal(repeated.updatedAt.getTime(), archived.updatedAt.getTime());
        const republished = await service.changePatrimonioStatus(id, "PUBLICADO", user);
        assert.equal(republished.arquivadoEm, null);
        assert.ok(republished.publicadoEm >= published[0].publicadoEm);
        assert.equal((await service.getPatrimonioBySlug(originalSlug)).id, id);
        assert.equal((await service.getPatrimonioBySlug(originalSlug)).raioProtecaoEntornoMetros, null);
    } finally {
        // Remove somente os registros criados por este teste no banco exclusivo.
        try {
            if (patrimonio) await prisma.patrimonio.delete({ where: { id: patrimonio.id } });
            if (categoriaAdicional) await prisma.categoria.delete({ where: { id: categoriaAdicional.id } });
            if (categoria) await prisma.categoria.delete({ where: { id: categoria.id } });
            if (user) await prisma.user.delete({ where: { id: user.id } });
        } finally {
            await prisma.$disconnect();
        }
    }
});
