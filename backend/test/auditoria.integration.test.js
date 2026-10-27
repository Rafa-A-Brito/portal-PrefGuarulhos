import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

test("PostgreSQL exclusivo: auditoria e negócio atômicos, senha, mídias e restauração de disco", {
    skip: !integrationDatabaseAvailable() && "Exige TEST_DATABASE_URL exclusivo *_test e TEST_DATABASE_EXCLUSIVE=1; mocks não comprovam rollback real.",
}, async t => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = "auditoria-integration-secret-with-32-characters";
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "audit-postgres-"));
    process.env.UPLOAD_ROOT = path.join(root, "novo"); process.env.UPLOAD_DIR = path.join(root, "legado");
    const { default: prisma } = await import("../src/config/prisma.js");
    const admins = await import("../src/services/adminService.js");
    const patrimonios = await import("../src/services/patrimonioService.js");
    const { salvarRegiao } = await import("../src/services/regiaoService.js");
    const { removerImagemPatrimonio } = await import("../src/services/imageService.js");
    const { deleteImagem } = await import("../src/services/midiaService.js");
    const { changePassword } = await import("../src/services/authService.js");
    const { hashPassword } = await import("../src/utils/password.js");
    const transaction = prisma.$transaction;
    let failAudit = false, admin, category, patrimonio, regiao;
    const images = [];
    // A escrita que falha é uma INSERT real: viola a FK do ator da auditoria.
    // O callback e as escritas de negócio continuam dentro da transação PostgreSQL.
    prisma.$transaction = (callback, options) => {
        if (!failAudit || typeof callback !== "function") return transaction.call(prisma, callback, options);
        return transaction.call(prisma, tx => callback(new Proxy(tx, { get(target, key) {
            if (key === "auditLog") return { create: args => target.auditLog.create({ ...args, data: { ...args.data, userId: randomUUID() } }) };
            return Reflect.get(target, key);
        } })), options);
    };
    try {
        const [db] = await prisma.$queryRaw`SELECT current_database() AS name`;
        assert.match(db.name, /_test$/);
        admin = await prisma.user.create({ data: { name: "Audit fixture", email: randomUUID() + "@audit.test", role: "ADMIN", passwordHash: await hashPassword("SenhaInicial123!") } });
        category = await prisma.categoria.create({ data: { nome: randomUUID(), slug: randomUUID() } });
        patrimonio = await prisma.patrimonio.create({ data: { nome: "Original", slug: randomUUID(), descricao: "Descrição", descricaoResumida: "Resumo", categoriaId: category.id, createdBy: admin.id } });
        const count = () => prisma.auditLog.count({ where: { userId: admin.id } });

        await t.test("edição sem mudança não cria evento; erro real na auditoria reverte usuário", async () => {
            await admins.updateAdmin(admin.id, { nome: admin.name }, admin); assert.equal(await count(), 0);
            failAudit = true;
            await assert.rejects(admins.updateAdmin(admin.id, { nome: "Não confirmar" }, admin), { code: "P2003" });
            assert.equal((await prisma.user.findUnique({ where: { id: admin.id } })).name, admin.name);
            assert.equal(await count(), 0); failAudit = false;
        });
        await t.test("cadastro de usuário e auditoria falham juntos", async () => {
            const email = randomUUID() + "@audit.test"; failAudit = true;
            await assert.rejects(admins.createAdmin({ nome: "Não confirmar", email, role: "EDITOR", password: "SenhaInicial123!" }, admin), { code: "P2003" });
            assert.equal(await prisma.user.findUnique({ where: { email } }), null); assert.equal(await count(), 0); failAudit = false;
        });
        await t.test("região preserva códigos e diffs; falha reverte sem duplicar eventos", async () => {
            regiao = await salvarRegiao(null, { nome: "Centro", slug: randomUUID(), descricao: null, ativo: true }, admin);
            await salvarRegiao(regiao.id, { descricao: "Fonte" }, admin);
            await salvarRegiao(regiao.id, { descricao: "Fonte" }, admin);
            const events = await prisma.auditLog.findMany({ where: { entityId: regiao.id }, orderBy: { createdAt: "asc" } });
            assert.deepEqual(events.map(row => row.action), ["REGIAO_CREATE", "REGIAO_UPDATE"]);
            assert.deepEqual(events[1].oldValues, { descricao: null }); assert.deepEqual(events[1].newValues, { descricao: "Fonte" });
            failAudit = true;
            await assert.rejects(salvarRegiao(regiao.id, { ativo: false }, admin), { code: "P2003" });
            assert.equal((await prisma.regiaoPatrimonio.findUnique({ where: { id: regiao.id } })).ativo, true);
            assert.equal(await count(), 2); failAudit = false;
        });
        await t.test("patrimônio reverte nome/localização/região e não cria evento de sucesso", async () => {
            failAudit = true;
            await assert.rejects(patrimonios.updatePatrimonio(patrimonio.id, { nome: "Não confirmar", regiaoId: regiao.id,
                localizacao: { endereco: "Rua de teste", bairro: "Centro", cidade: "Guarulhos", uf: "SP", latitude: -23, longitude: -46 } }, admin), { code: "P2003" });
            const current = await prisma.patrimonio.findUnique({ where: { id: patrimonio.id }, include: { localizacao: true } });
            assert.equal(current.nome, "Original"); assert.equal(current.regiaoId, null); assert.equal(current.localizacao, null);
            assert.equal(await count(), 2); failAudit = false;
        });
        await t.test("senha, versão e sessões são revertidas se a auditoria falha; sucesso não expõe segredos", async () => {
            const session = await prisma.authSession.create({ data: { userId: admin.id, tokenVersion: admin.tokenVersion, expiresAt: new Date(Date.now() + 3600000) } });
            failAudit = true;
            await assert.rejects(changePassword(admin.id, { senhaAtual: "SenhaInicial123!", novaSenha: "NovaSenhaSegura123!" }), { code: "P2003" });
            const current = await prisma.user.findUnique({ where: { id: admin.id } });
            assert.equal(current.passwordHash, admin.passwordHash); assert.equal(current.tokenVersion, admin.tokenVersion);
            assert.equal((await prisma.authSession.findUnique({ where: { id: session.id } })).revokedAt, null);
            failAudit = false;
            await changePassword(admin.id, { senhaAtual: "SenhaInicial123!", novaSenha: "NovaSenhaSegura123!" });
            const event = await prisma.auditLog.findFirst({ where: { userId: admin.id, action: "USER_PASSWORD_CHANGE" } });
            assert.equal(event.entityId, admin.id); assert.equal(event.oldValues, null); assert.equal(event.newValues, null);
            assert.doesNotMatch(JSON.stringify(event), /Senha|passwordHash|token/);
        });
        for (const legacy of [true, false]) await t.test(`mídia ${legacy ? "legada" : "nova"}: falha de INSERT da auditoria restaura registro e bytes; commit limpa quarentena`, async () => {
            const folder = path.join(legacy ? process.env.UPLOAD_DIR : process.env.UPLOAD_ROOT, legacy ? "patrimonios" : "imagens");
            await fs.mkdir(folder, { recursive: true });
            const filename = randomUUID() + ".png", file = path.join(folder, filename);
            await fs.writeFile(file, "Bytes preservados");
            const image = await prisma.patrimonioImagem.create({ data: { patrimonioId: patrimonio.id, url: (legacy ? "/uploads/patrimonios/" : "/api/uploads/imagens/") + filename, textoAlternativo: "Fixture" } });
            images.push(image.id);
            const remove = () => legacy ? removerImagemPatrimonio(image.id, admin) : deleteImagem(patrimonio.id, image.id, admin);
            const before = await count(); failAudit = true;
            await assert.rejects(remove(), { code: "P2003" });
            assert.ok(await prisma.patrimonioImagem.findUnique({ where: { id: image.id } }));
            assert.equal(await fs.readFile(file, "utf8"), "Bytes preservados"); assert.equal(await count(), before);
            failAudit = false; await remove();
            assert.equal(await prisma.patrimonioImagem.findUnique({ where: { id: image.id } }), null);
            await assert.rejects(fs.stat(file), { code: "ENOENT" });
            assert.equal((await fs.readdir(path.join(path.dirname(folder), ".quarentena"))).length, 0);
            const event = await prisma.auditLog.findFirst({ where: { entityId: image.id } });
            assert.equal(event.oldValues.patrimonioId, patrimonio.id); assert.equal(event.action, "IMAGEM_DELETE");
        });
    } finally {
        prisma.$transaction = transaction;
        if (admin) await prisma.auditLog.deleteMany({ where: { userId: admin.id } });
        if (images.length) await prisma.patrimonioImagem.deleteMany({ where: { id: { in: images } } });
        if (patrimonio) await prisma.patrimonio.delete({ where: { id: patrimonio.id } });
        if (regiao) await prisma.regiaoPatrimonio.delete({ where: { id: regiao.id } });
        if (category) await prisma.categoria.delete({ where: { id: category.id } });
        if (admin) await prisma.user.delete({ where: { id: admin.id } });
        await prisma.$disconnect();
        assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith("audit-postgres-"));
        await fs.rm(root, { recursive: true, force: true });
    }
});
