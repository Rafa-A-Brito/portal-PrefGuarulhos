import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { test, after } from "node:test";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-deletion-security-"));
const legacyRoot = path.join(root, "legado"), newRoot = path.join(root, "novo");
process.env.UPLOAD_DIR = legacyRoot;
process.env.UPLOAD_ROOT = newRoot;
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/security_test";
process.env.JWT_SECRET = "security-deletion-fixture-with-32-characters";
const { default: prisma } = await import("../src/config/prisma.js");
const { removerImagemPatrimonio } = await import("../src/services/imageService.js");
const { deleteImagem } = await import("../src/services/midiaService.js");
const admin = { role: "ADMIN" };
after(async () => {
    await prisma.$disconnect();
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("image-deletion-security-"));
    await fs.rm(root, { recursive: true, force: true });
});

for (const prefix of ["/api/uploads/imagens", "/uploads/patrimonios"]) {
    for (const route of ["alternativa", "aninhada"]) {
        for (const scenario of ["excluir", "compartilhado", "rollback"]) {
            test(`${route}: ${prefix} ${scenario}`, async t => {
                const storageRoot = prefix.startsWith("/api/") ? newRoot : legacyRoot;
                const folder = path.join(storageRoot, path.basename(prefix));
                await fs.mkdir(folder, { recursive: true });
                const name = randomUUID() + ".png", file = path.join(folder, name);
                await fs.writeFile(file, "bytes originais");
                const row = { id: randomUUID(), patrimonioId: randomUUID(), url: prefix + "/" + name };
                const tx = {
                    $queryRaw: async () => [{ total: scenario === "compartilhado" ? 2 : 1 }],
                    patrimonio: { findUnique: async () => ({ id: row.patrimonioId, status: "RASCUNHO" }) },
                    patrimonioImagem: { findUnique: async () => row, findFirst: async () => row, delete: async () => row },
                };
                const originalTx = prisma.$transaction, originalFind = prisma.patrimonio.findUnique;
                prisma.patrimonio.findUnique = tx.patrimonio.findUnique;
                prisma.$transaction = async callback => {
                    const result = await callback(tx);
                    if (scenario !== "compartilhado") assert.equal((await fs.readdir(path.join(storageRoot, ".quarentena"))).length, 1);
                    if (scenario === "rollback") throw new Error("commit recusado");
                    return result;
                };
                t.after(() => { prisma.$transaction = originalTx; prisma.patrimonio.findUnique = originalFind; });
                const run = () => route === "alternativa" ? removerImagemPatrimonio(row.id, admin) : deleteImagem(row.patrimonioId, row.id, admin);
                if (scenario === "rollback") await assert.rejects(run(), /commit recusado/);
                else await run();
                if (scenario === "excluir") await assert.rejects(fs.stat(file), { code: "ENOENT" });
                else assert.equal(await fs.readFile(file, "utf8"), "bytes originais");
            });
        }
    }
}
