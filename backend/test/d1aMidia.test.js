import { mockAuditLog } from "./auditoriaFixture.js";
import assert from "node:assert/strict";
import { before, after, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "d1a-midia-"));
process.env.UPLOAD_DIR = root;
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/d1a_test";
process.env.JWT_SECRET = "d1a-midia-test-secret-at-least-32-characters";
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
const id = randomUUID(), userId = randomUUID();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH5sAAAAASUVORK5CYII=", "base64");
const jpeg = await fs.readFile(new URL("../src/uploads/patrimonios/bosque_maia.jpg", import.meta.url));
const webp = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");
const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
let server, base, imagens, documentos, role, status, failDelete, failCommit;
function stub(t, target, key, value) {
    const original = target[key]; target[key] = value;
    t.after(() => { target[key] = original; });
}
before(async () => {
    server = app.listen(0); await new Promise(r => server.once("listening", r));
    base = "http://127.0.0.1:" + server.address().port + "/api/admin/patrimonios";
});
after(async () => {
    await new Promise(r => server.close(r)); await prisma.$disconnect();
    assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith("d1a-midia-"));
    await fs.rm(root, { recursive: true, force: true });
});
beforeEach(t => {
    imagens = []; documentos = []; role = "ADMIN"; status = "RASCUNHO"; failDelete = false; failCommit = false;
    stub(t, prisma.user, "findUnique", async () => ({ id: userId, role, authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }], tokenVersion: 0, isActive: true }));
    const findParent = async ({ where }) => where.id === id ? { id, status } : null;
    stub(t, prisma.patrimonio, "findUnique", findParent);
    stub(t, prisma, "$transaction", async callback => {
        const before = structuredClone({ imagens, documentos });
        const model = getRows => ({
            create: async ({ data }) => { const row = { id: randomUUID(), ...data }; getRows().push(row); return row; },
            findMany: async ({ where }) => getRows().filter(r => r.patrimonioId === where.patrimonioId && (!where.principal || r.principal)),
            findUnique: async ({ where }) => getRows().find(r => r.id === where.id) ?? null,
            findFirst: async ({ where }) => getRows().find(r => r.id === where.id && r.patrimonioId === where.patrimonioId) ?? null,
            updateMany: async ({ where, data }) => { for (const row of getRows()) if (row.patrimonioId === where.patrimonioId && row.id !== where.id?.not) Object.assign(row, data); },
            update: async ({ where, data }) => Object.assign(getRows().find(r => r.id === where.id), data),
            delete: async ({ where }) => { if (failDelete) throw new Error("delete-falhou"); return getRows().splice(getRows().findIndex(r => r.id === where.id), 1)[0]; },
        });
        try {
            const result = await callback({ auditLog: mockAuditLog(),
                $queryRaw: async (sql, ...values) => sql.join("").includes("count(*)")
                    ? [{ total: [...imagens, ...documentos].filter(r => r.url === values[0]).length }] : [],
                patrimonio: { findUnique: findParent },
                patrimonioImagem: model(() => imagens), patrimonioDocumento: model(() => documentos),
            });
            if (failCommit) throw new Error("commit-falhou");
            return result;
        } catch (error) { imagens = before.imagens; documentos = before.documentos; throw error; }
    });
});
const headers = () => ({ authorization: "Bearer " + generateToken(userId, 0, userId) });
const imageRoute = mediaId => base + "/imagens/" + mediaId;
const refRoute = refId => base + "/" + id + "/referencias" + (refId ? "/" + refId : "");
async function upload(bytes = png, mime = "image/png") {
    const body = new FormData(); body.append("imagem", new Blob([bytes], { type: mime }), "teste.bin");
    return fetch(base + "/" + id + "/imagens", { method: "POST", headers: headers(), body });
}
const patch = (url, body) => fetch(url, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
const remove = url => fetch(url, { method: "DELETE", headers: headers() });
const disk = url => path.join(root, url.slice("/uploads/".length));

for (const [mime, bytes, ext] of [["image/jpeg", jpeg, "jpg"], ["image/png", png, "png"], ["image/webp", webp, "webp"], ["image/gif", gif, "gif"]]) {
    test("assinatura válida aceita " + mime + " com campo imagem e extensão derivada dos bytes/MIME", async () => {
        const response = await upload(bytes, mime); assert.equal(response.status, 201);
        const { data } = await response.json(); assert.ok(data.url.endsWith("." + ext));
        assert.deepEqual(await fs.readFile(disk(data.url)), bytes);
    });
}
for (const [bytes, mime] of [[png, "image/jpeg"], [jpeg, "image/png"], [gif, "image/webp"], [Buffer.from("<script>fake</script>"), "image/png"], [png.subarray(0, 4), "image/png"]]) {
    test("MIME forjado/assinatura inválida é rejeitado: " + mime + "/" + bytes.length, async () => {
        const before = await fs.readdir(path.join(root, "patrimonios"));
        assert.equal((await upload(bytes, mime)).status, 400);
        assert.equal(imagens.length, 0); assert.deepEqual(await fs.readdir(path.join(root, "patrimonios")), before);
    });
}
test("imagem acima de 10 MB continua rejeitada", async () => {
    assert.equal((await upload(Buffer.concat([png, Buffer.alloc(10 * 1024 * 1024)]))).status, 413);
});

for (const perfil of ["ADMIN", "EDITOR"]) for (const situacao of ["RASCUNHO", "PUBLICADO", "ARQUIVADO"]) {
    test(`${perfil}: POST/PATCH imagem preserva permissão em ${situacao}`, async () => {
        role = perfil; status = situacao;
        const response = await upload(); assert.equal(response.status, 201);
        const { data } = await response.json();
        imagens.push({ id: randomUUID(), patrimonioId: id, url: "/uploads/patrimonios/outra.png", principal: true });
        assert.equal((await patch(imageRoute(data.id), { titulo: "Título", textoAlternativo: "Novo alt", credito: null, fonte: "Acervo", ordem: 4, principal: true })).status, 200);
        assert.equal(imagens.filter(i => i.principal).length, 1);
        assert.equal(imagens[0].textoAlternativo, "Novo alt"); assert.equal(imagens[0].url, data.url);
        if (perfil === "EDITOR") assert.equal((await remove(imageRoute(data.id))).status, 403);
    });
}
test("PATCH imagem recusa campos de identidade, vazio e booleano coercivo", async () => {
    const { data } = await (await upload()).json();
    for (const body of [{}, { url: "/troca.png" }, { patrimonioId: randomUUID() }, { principal: "false" }, { ordem: -1 }, { textoAlternativo: "" }]) {
        assert.equal((await patch(imageRoute(data.id), body)).status, 400);
    }
});
for (const fail of ["delete", "commit"]) {
    test("quarentena restaura imagem se falhar " + fail, async () => {
        const { data } = await (await upload()).json();
        failDelete = fail === "delete"; failCommit = fail === "commit";
        assert.equal((await remove(imageRoute(data.id))).status, 500);
        assert.equal(imagens.length, 1); assert.deepEqual(await fs.readFile(disk(data.url)), png);
    });
}
test("falha de rename aborta exclusão; limpeza pós-commit falha conservando bytes privados", async t => {
    const { data } = await (await upload()).json();
    const originalRename = fs.rename;
    stub(t, fs, "rename", async () => { throw Object.assign(new Error("negado"), { code: "EACCES" }); });
    assert.equal((await remove(imageRoute(data.id))).status, 500);
    assert.equal(imagens.length, 1); assert.deepEqual(await fs.readFile(disk(data.url)), png);
    fs.rename = originalRename;
    stub(t, fs, "unlink", async () => { throw Object.assign(new Error("negado"), { code: "EACCES" }); });
    assert.equal((await remove(imageRoute(data.id))).status, 200);
    assert.equal(imagens.length, 0);
    const files = await fs.readdir(path.join(root, ".quarentena"));
    const quarantined = files.find(f => f.endsWith(path.basename(data.url)));
    assert.ok(quarantined); assert.deepEqual(await fs.readFile(path.join(root, ".quarentena", quarantined)), png);
});
test("URL compartilhada com legado permanece disponível ao excluir uma imagem", async () => {
    const { data } = await (await upload()).json();
    imagens.push({ ...imagens[0], id: randomUUID(), patrimonioId: randomUUID() });
    assert.equal((await remove(imageRoute(data.id))).status, 200);
    assert.equal(imagens.length, 1); assert.deepEqual(await fs.readFile(disk(data.url)), png);
});
test("quarentena não é servida publicamente e restauração não sobrescreve arquivo concorrente", async t => {
    const { data } = await (await upload()).json();
    const originalCopy = fs.copyFile;
    stub(t, fs, "copyFile", async (from, to, flags) => {
        await fs.writeFile(to, "concorrente"); return originalCopy(from, to, flags);
    });
    failCommit = true;
    assert.equal((await remove(imageRoute(data.id))).status, 500);
    assert.equal(await fs.readFile(disk(data.url), "utf8"), "concorrente");
    const files = await fs.readdir(path.join(root, ".quarentena"));
    const privateFile = files.find(f => f.endsWith(path.basename(data.url)));
    assert.ok(privateFile); assert.deepEqual(await fs.readFile(path.join(root, ".quarentena", privateFile)), png);
    assert.equal((await fetch(base.split("/api/")[0] + "/uploads/.quarentena/" + privateFile)).status, 404);
});
for (const tipo of ["LINK", "ARQUIVO"]) {
    test("PATCH referência " + tipo + " preserva URL/tipo e limita EDITOR ao rascunho", async () => {
        const ref = { id: randomUUID(), patrimonioId: id, tipo, url: tipo === "LINK" ? "https://example.org/fonte" : "/uploads/referencias/fonte.txt", titulo: "Fonte", descricao: "Antes" };
        documentos.push(ref); role = "EDITOR";
        const result = await patch(refRoute(ref.id), { titulo: "Título revisto", descricao: "Depois", fonte: null, dataDocumento: "2026-10-14" });
        assert.equal(result.status, 200); const { data } = await result.json();
        assert.equal(data.url, ref.url); assert.equal(data.tipo, tipo); assert.equal(data.descricao, "Depois");
        assert.equal(documentos[0].dataDocumento.toISOString(), "2026-10-14T00:00:00.000Z");
        for (const next of ["PUBLICADO", "ARQUIVADO"]) { status = next; assert.equal((await patch(refRoute(ref.id), { descricao: "Bloqueada" })).status, 403); }
        role = "ADMIN"; assert.equal((await patch(refRoute(ref.id), { dataDocumento: null })).status, 200);
        assert.equal((await patch(refRoute(ref.id), { url: "https://example.org/outra" })).status, 400);
        assert.equal((await patch(refRoute(ref.id), { dataDocumento: "2026-02-30" })).status, 400);
        assert.equal((await patch(refRoute(randomUUID()), { descricao: "Não existe" })).status, 404);
    });
}
test("rollback de commit da referência restaura registro e arquivo", async () => {
    const url = "/uploads/referencias/rollback.txt";
    await fs.mkdir(path.join(root, "referencias"), { recursive: true }); await fs.writeFile(disk(url), "Documento");
    documentos.push({ id: randomUUID(), patrimonioId: id, tipo: "ARQUIVO", url });
    failCommit = true;
    assert.equal((await remove(refRoute(documentos[0].id))).status, 500);
    assert.equal(documentos.length, 1); assert.equal(await fs.readFile(disk(url), "utf8"), "Documento");
});
