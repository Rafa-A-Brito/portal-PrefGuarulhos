import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

const safe = integrationDatabaseAvailable();
const testUrl = process.env.TEST_DATABASE_URL;
test("PostgreSQL D1A: busca/detalhes, mídia transacional, LINK, null/null e fotografia concorrente", {
    skip: !safe && "Exige banco descartável *_test exclusivo.",
}, async () => {
    process.env.DATABASE_URL = testUrl;
    process.env.JWT_SECRET = "d1a-integration-secret-at-least-32-characters";
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "d1a-integration-"));
    process.env.UPLOAD_DIR = root;
    const { default: prisma } = await import("../src/config/prisma.js");
    const { listPatrimonios, updatePatrimonio } = await import("../src/services/patrimonioService.js");
    const { criarImagemPatrimonio, atualizarImagemPatrimonio, removerImagemPatrimonio } = await import("../src/services/imageService.js");
    const { criarReferenciaPatrimonio, atualizarReferenciaPatrimonio } = await import("../src/services/referenciaService.js");
    const { getDashboard } = await import("../src/services/dashboardService.js");
    const key = randomUUID();
    let user, categoria, adicional;
    const transaction = prisma.$transaction;
    try {
        const [identity] = await prisma.$queryRawUnsafe("SELECT current_database() AS name");
        assert.ok(identity.name.endsWith("_test")); assert.notEqual(identity.name, "patrimonio_guarulhos");
        user = await prisma.user.create({ data: { name: "D1A teste", email: key + "@example.test", passwordHash: "unused", role: "ADMIN" } });
        categoria = await prisma.categoria.create({ data: { nome: "Categoria Principal " + key, slug: "principal-" + key } });
        adicional = await prisma.categoria.create({ data: { nome: "Categoria Adicional " + key, slug: "adicional-" + key } });
        const data = { nome: "Bem teste " + key, slug: "bem-" + key, descricao: "Descrição suficiente para teste", descricaoResumida: "Resumo do teste", categoriaId: categoria.id, createdBy: user.id, status: "PUBLICADO" };
        const bem = await prisma.patrimonio.create({ data: { ...data,
            categoriasAdicionais: { create: { categoriaId: adicional.id } },
            detalhes: { create: { titulo: "Título exclusivo " + key, texto: "Texto exclusivo " + key } },
            localizacao: { create: { endereco: "Rua de teste", bairro: "Centro", cidade: "São Paulo", uf: "SP", latitude: -23.4, longitude: -46.5 } },
        } });
        await prisma.patrimonio.create({ data: { ...data, slug: "rascunho-" + key, status: "RASCUNHO" } });
        await prisma.patrimonio.create({ data: { ...data, slug: "arquivado-" + key, status: "ARQUIVADO" } });
        for (const categoriaFiltro of [categoria.nome.toUpperCase(), categoria.slug, adicional.nome, adicional.slug.toUpperCase()]) {
            const result = await listPatrimonios({ categoria: categoriaFiltro, pagina: 1, limite: 10 });
            assert.deepEqual(result.itens.map(p => p.id), [bem.id]); assert.equal(result.paginacao.total, 1);
        }
        for (const busca of [categoria.nome, categoria.slug, adicional.nome, adicional.slug, "Título exclusivo " + key, "Texto exclusivo " + key]) {
            const result = await listPatrimonios({ busca, pagina: 1, limite: 10 });
            assert.deepEqual(result.itens.map(p => p.id), [bem.id]);
        }
        const absent = await listPatrimonios({ busca: "Texto exclusivo " + key, categoria: "categoria-inexistente", pagina: 1, limite: 10 });
        assert.equal(absent.paginacao.total, 0);
        await updatePatrimonio(bem.id, { localizacao: { latitude: null, longitude: null } }, user);
        const local = await prisma.localizacao.findUnique({ where: { patrimonioId: bem.id } });
        assert.equal(local.latitude, null); assert.equal(local.longitude, null); assert.equal(local.cidade, "São Paulo");

        await fs.mkdir(path.join(root, "patrimonios"));
        const filename = randomUUID() + ".png", filePath = path.join(root, "patrimonios", filename);
        await fs.writeFile(filePath, Buffer.from("89504e470d0a1a0a", "hex"));
        const image = await criarImagemPatrimonio(bem.id, { url: "/uploads/patrimonios/" + filename, originalname: "teste.png" }, { principal: "true" }, user);
        await atualizarImagemPatrimonio(image.id, { textoAlternativo: "Alt atualizado", credito: null }, { ...user, role: "EDITOR" });
        assert.equal((await prisma.patrimonioImagem.findUnique({ where: { id: image.id } })).textoAlternativo, "Alt atualizado");
        // Falha depois do DELETE real dentro da transação: rollback do PostgreSQL
        // deve ser acompanhado de restauração dos bytes pelo wrapper de mídia.
        prisma.$transaction = (callback, options) => transaction.call(prisma, async tx => { await callback(tx); throw new Error("falha-apos-delete"); }, options);
        await assert.rejects(removerImagemPatrimonio(image.id, user), /falha-apos-delete/);
        prisma.$transaction = transaction;
        assert.ok(await prisma.patrimonioImagem.findUnique({ where: { id: image.id } })); assert.ok(await fs.stat(filePath));
        await removerImagemPatrimonio(image.id, user);
        assert.equal(await prisma.patrimonioImagem.count({ where: { id: image.id } }), 0); await assert.rejects(fs.stat(filePath), { code: "ENOENT" });

        const link = await criarReferenciaPatrimonio(bem.id, null, { url: "https://example.org/fonte", descricao: "Fonte" }, user);
        const updated = await atualizarReferenciaPatrimonio(bem.id, link.id, { descricao: "Fonte revisada", dataDocumento: "2026-10-14" }, user);
        assert.equal(updated.tipo, "LINK"); assert.equal(updated.url, link.url);
        await assert.rejects(atualizarReferenciaPatrimonio(bem.id, link.id, { descricao: "Editor" }, { ...user, role: "EDITOR" }), /rascunhos/);

        const beforeTotal = await prisma.patrimonio.count();
        let inserted = false;
        // Escreve em outra conexão após count(), enquanto a fotografia permanece
        // aberta. Os groupBy seguintes não podem incluir esse novo patrimônio.
        prisma.$transaction = (callback, options) => transaction.call(prisma, async tx => {
            const model = new Proxy(tx.patrimonio, { get(target, prop) {
                if (prop === "count") return async (...args) => {
                    const count = await target.count(...args);
                    await prisma.patrimonio.create({ data: { ...data, slug: "concorrente-" + key } }); inserted = true;
                    return count;
                };
                const value = target[prop]; return typeof value === "function" ? value.bind(target) : value;
            } });
            return callback(new Proxy(tx, { get(target, prop) { return prop === "patrimonio" ? model : target[prop]; } }));
        }, options);
        const dashboard = await getDashboard();
        prisma.$transaction = transaction;
        assert.equal(inserted, true); assert.equal(dashboard.total, beforeTotal);
        assert.equal(dashboard.RASCUNHO + dashboard.PUBLICADO + dashboard.ARQUIVADO, beforeTotal);
        assert.equal(dashboard.porCategoria.reduce((n, c) => n + c.quantidade, 0), beforeTotal);
        assert.equal(dashboard.porBairro.reduce((n, b) => n + b.quantidade, 0), beforeTotal);
        assert.equal(await prisma.patrimonio.count(), beforeTotal + 1);
    } finally {
        prisma.$transaction = transaction;
        if (user) { await prisma.auditLog.deleteMany({ where: { userId: user.id } }); await prisma.patrimonio.deleteMany({ where: { createdBy: user.id } }); await prisma.user.delete({ where: { id: user.id } }); }
        if (categoria) await prisma.categoria.delete({ where: { id: categoria.id } });
        if (adicional) await prisma.categoria.delete({ where: { id: adicional.id } });
        await prisma.$disconnect();
        assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith("d1a-integration-"));
        await fs.rm(root, { recursive: true, force: true });
    }
});
