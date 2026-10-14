import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

test("PostgreSQL: URLs antigas consultam vínculo, status e usuário ativo após publicar/arquivar", {
    skip: !integrationDatabaseAvailable() && "Configure PostgreSQL exclusivo *_test e TEST_DATABASE_EXCLUSIVE=1; controle real não executado.",
    timeout: 30000,
}, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "midia-publica-pg-test-"));
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.UPLOAD_DIR = root;
    process.env.UPLOAD_ROOT = root;
    process.env.JWT_SECRET = "midia-publica-integration-secret-at-least-32-characters";
    const { default: prisma } = await import("../src/config/prisma.js");
    const { default: app } = await import("../src/app.js");
    const { generateToken } = await import("../src/utils/token.js");
    const key = randomUUID();
    let admin, editor, categoria, patrimonio, server;
    try {
        admin = await prisma.user.create({ data: { name: "Admin mídia", email: `${key}-admin@example.test`, passwordHash: "unused", role: "ADMIN" } });
        editor = await prisma.user.create({ data: { name: "Editor mídia", email: `${key}-editor@example.test`, passwordHash: "unused", role: "EDITOR" } });
        categoria = await prisma.categoria.create({ data: { nome: key, slug: key } });
        patrimonio = await prisma.patrimonio.create({ data: {
            nome: key, slug: key, descricao: "Descrição da fixture", descricaoResumida: "Resumo da fixture",
            categoriaId: categoria.id, createdBy: admin.id,
        } });
        const cases = [
            { folder: "patrimonios", url: `/uploads/patrimonios/${key}.png`, model: "patrimonioImagem" },
            { folder: "referencias", url: `/uploads/referencias/${key}.txt`, model: "patrimonioDocumento" },
        ];
        for (const item of cases) {
            await fs.mkdir(path.join(root, item.folder));
            await fs.writeFile(path.join(root, item.folder, path.basename(item.url)), "fixture");
            await prisma[item.model].create({ data: {
                patrimonioId: patrimonio.id, url: item.url,
                ...(item.model === "patrimonioImagem" ? { textoAlternativo: "Fixture" } : { titulo: "Fixture", tipo: "ARQUIVO" }),
            } });
        }
        server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        const headers = (user) => ({ authorization: `Bearer ${generateToken(user.id)}` });
        for (const item of cases) {
            assert.equal((await fetch(base + item.url)).status, 401);
            for (const user of [admin, editor]) assert.equal((await fetch(base + item.url, { headers: headers(user) })).status, 200);
        }
        const change = (action) => fetch(`${base}/api/admin/patrimonios/${patrimonio.id}/${action}`, {
            method: "PATCH", headers: { ...headers(admin), "content-type": "application/json" }, body: "{}",
        });
        assert.equal((await change("publicar")).status, 200);
        for (const item of cases) {
            const response = await fetch(base + item.url);
            assert.equal(response.status, 200);
            assert.equal(response.headers.get("cache-control"), "private, no-store");
            assert.equal(await response.text(), "fixture");
        }
        assert.equal((await change("arquivar")).status, 200);
        for (const item of cases) {
            assert.equal((await fetch(base + item.url)).status, 401);
            assert.equal((await fetch(base + item.url, { headers: headers(editor) })).status, 200);
        }
        await prisma.user.update({ where: { id: editor.id }, data: { isActive: false } });
        for (const item of cases) assert.equal((await fetch(base + item.url, { headers: headers(editor) })).status, 401);
        const orphan = `/uploads/patrimonios/${randomUUID()}.png`;
        await fs.writeFile(path.join(root, "patrimonios", path.basename(orphan)), "sem vínculo");
        assert.equal((await fetch(base + orphan)).status, 404);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        try {
            // Apenas fixtures criadas neste teste, no banco distinto e exclusivo.
            if (patrimonio) await prisma.patrimonio.delete({ where: { id: patrimonio.id } });
            if (categoria) await prisma.categoria.delete({ where: { id: categoria.id } });
            if (editor) await prisma.user.delete({ where: { id: editor.id } });
            if (admin) await prisma.user.delete({ where: { id: admin.id } });
        } finally {
            await prisma.$disconnect();
            assert.equal(path.dirname(root), os.tmpdir());
            assert.ok(path.basename(root).startsWith("midia-publica-pg-test-"));
            await fs.rm(root, { recursive: true, force: true });
        }
    }
});
