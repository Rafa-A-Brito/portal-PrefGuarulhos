import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

const safe = integrationDatabaseAvailable();
const testUrl = process.env.TEST_DATABASE_URL;
test("PostgreSQL dashboard V1: seis situações, regiões e secundárias sem duplicar o total", {
    skip: !safe && "Exige banco descartável *_test exclusivo.",
}, async () => {
    process.env.DATABASE_URL = testUrl;
    process.env.JWT_SECRET = "dashboard-integration-secret-at-least-32-characters";
    const { default: prisma } = await import("../src/config/prisma.js");
    const { getDashboard } = await import("../src/services/dashboardService.js");
    const key = randomUUID();
    const ids = [], categorias = [], regioes = [];
    let user, server;
    try {
        const identity = await prisma.$transaction(async tx => {
            await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            return tx.$queryRawUnsafe("SELECT current_database() AS banco");
        });
        assert.ok(identity[0].banco.endsWith("_test"));
        assert.notEqual(identity[0].banco, "patrimonio_guarulhos");
        const antes = await getDashboard();
        user = await prisma.user.create({ data: { name: "Fixture dashboard", email: key + "@example.test", passwordHash: "unused", role: "ADMIN" } });
        for (let i = 0; i < 7; i++) categorias.push(await prisma.categoria.create({ data: { nome: `${key}-cat-${i}`, slug: `${key}-cat-${i}` } }));
        for (let i = 0; i < 4; i++) regioes.push(await prisma.regiaoPatrimonio.create({ data: { nome: `${key}-reg-${i}`, slug: `${key}-reg-${i}`, ativo: i !== 1 } }));
        const situacoes = ["PRESERVADO", "DEMOLIDO", "EM_RESTAURACAO", "NECESSITA_RESTAURACAO", "EM_RUINAS", "NAO_INFORMADO"];
        for (let i = 0; i < 6; i++) {
            const row = await prisma.patrimonio.create({ data: {
                nome: `${key}-${i}`, slug: `${key}-${i}`, descricao: "Fixture", descricaoResumida: "Fixture",
                createdBy: user.id, categoriaId: categorias[0].id, situacao: situacoes[i],
                status: ["PUBLICADO", "RASCUNHO", "ARQUIVADO"][i % 3],
                regiaoId: i < 4 ? regioes[i % 3].id : null,
                categoriasAdicionais: { create: [{ categoriaId: categorias[1].id }, { categoriaId: categorias[2].id }] },
            } });
            ids.push(row.id);
        }
        const depois = await getDashboard();
        assert.equal(depois.total, antes.total + 6);
        for (const status of ["PUBLICADO", "RASCUNHO", "ARQUIVADO"]) assert.equal(depois[status], antes[status] + 2);
        for (const situacao of situacoes) assert.equal(depois.porSituacao.find(s => s.situacao === situacao).quantidade,
            antes.porSituacao.find(s => s.situacao === situacao).quantidade + 1);
        for (const [i, r] of regioes.entries()) assert.equal(depois.porRegiao.find(g => g.id === r.id).quantidade, [2, 1, 1, 0][i]);
        assert.equal(depois.semRegiao, antes.semRegiao + 2);
        assert.equal(depois.porCategoria.find(c => c.id === categorias[0].id).quantidade, 6);
        for (const c of categorias.slice(1)) assert.equal(depois.porCategoria.find(g => g.id === c.id).quantidade, 0);
        for (const c of categorias.slice(1, 3)) assert.equal(depois.porCategoria.find(g => g.id === c.id).quantidadeSecundaria, 6);
        for (const serie of [depois.porSituacao, depois.porCategoria, depois.porBairro]) assert.equal(serie.reduce((n, g) => n + g.quantidade, 0), depois.total);
        assert.equal(depois.porRegiao.reduce((n, g) => n + g.quantidade, depois.semRegiao), depois.total);
        // Contrato HTTP com autenticação e agregações reais no banco descartável.
        const { default: app } = await import("../src/app.js");
        const { generateToken } = await import("../src/utils/token.js");
        const session = await prisma.authSession.create({ data: {
            userId: user.id, tokenVersion: user.tokenVersion, expiresAt: new Date(Date.now() + 60000),
        } });
        server = app.listen(0, "127.0.0.1");
        await new Promise(resolve => server.once("listening", resolve));
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/dashboard`, {
            headers: { authorization: "Bearer " + generateToken(user.id, user.tokenVersion, session.id) },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, data: depois });
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        // Somente UUIDs gerados por esta execução no destino descartável conferido.
        if (ids.length) await prisma.patrimonio.deleteMany({ where: { id: { in: ids } } });
        if (regioes.length) await prisma.regiaoPatrimonio.deleteMany({ where: { id: { in: regioes.map(r => r.id) } } });
        if (categorias.length) await prisma.categoria.deleteMany({ where: { id: { in: categorias.map(c => c.id) } } });
        if (user) await prisma.user.delete({ where: { id: user.id } });
        await prisma.$disconnect();
    }
});
