import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import syncFs from "node:fs";
import path from "node:path";
import os from "node:os";

const uploads = await fs.mkdtemp(path.join(os.tmpdir(), "lote06-upload-"));
process.env.UPLOAD_DIR = uploads;
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/upload_test";
process.env.JWT_SECRET = "upload-test-secret-with-at-least-32-characters";
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
const admin = { id: randomUUID(), isActive: true, role: "ADMIN" };
const patrimonioId = randomUUID();
let server, base;
before(async () => {
    await fs.mkdir(path.join(uploads, "patrimonios"));
    server = app.listen(0);
    await new Promise(r => server.once("listening", r));
    base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
    await new Promise(r => server.close(r));
    await prisma.$disconnect();
    assert.ok(uploads.startsWith(path.join(os.tmpdir(), "lote06-upload-")));
    await fs.rm(uploads, { recursive: true, force: true });
});
function stub(t, target, method, implementation) {
    const original = target[method];
    target[method] = implementation;
    const restore = () => { target[method] = original; };
    t.after(restore);
    return { mock: { restore, mockImplementation: fn => { target[method] = fn; } } };
}
function auth(t, role = "ADMIN") {
    stub(t, prisma.user, "findUnique", async () => ({ ...admin, role }));
}
function form(extra = {}, double = false) {
    const data = new FormData();
    data.append("imagem", new Blob(["image-content"], { type: "image/png" }), "imagem.png");
    if (double) data.append("imagem", new Blob(["second"], { type: "image/png" }), "outra.png");
    for (const [key, value] of Object.entries(extra)) data.append(key, value);
    return data;
}
function upload(body = form()) {
    return fetch(base + "/api/admin/patrimonios/" + patrimonioId + "/imagens", {
        method: "POST", headers: { authorization: "Bearer " + generateToken(admin.id) }, body,
    });
}
const list = () => fs.readdir(path.join(uploads, "patrimonios"));

test("rotas de imagem existem e exigem autenticação; DELETE exige ADMIN", async t => {
    const route = "/api/admin/patrimonios/imagens/" + randomUUID();
    assert.equal((await fetch(base + route, { method: "DELETE" })).status, 401);
    assert.equal((await fetch(base + "/api/admin/patrimonios/" + patrimonioId + "/imagens", { method: "POST" })).status, 401);
    auth(t, "EDITOR");
    assert.equal((await fetch(base + route, { method: "DELETE", headers: { authorization: "Bearer " + generateToken(admin.id) } })).status, 403);
});

test("multipart com duas imagens remove o arquivo novo e preserva o preexistente", async t => {
    auth(t);
    const existing = path.join(uploads, "patrimonios", "anterior.png");
    await fs.writeFile(existing, "anterior");
    assert.equal((await upload(form({}, true))).status, 400);
    assert.deepEqual(await list(), ["anterior.png"]);
    assert.equal(await fs.readFile(existing, "utf8"), "anterior");
});

test("patrimônio inexistente e metadados inválidos limpam o upload", async t => {
    auth(t);
    const find = stub(t, prisma.patrimonio, "findUnique", async () => null);
    const missing = await upload();
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, "PATRIMONIO_NOT_FOUND");
    find.mock.mockImplementation(async () => ({ id: patrimonioId }));
    assert.equal((await upload(form({ titulo: "x".repeat(201) }))).status, 400);
    assert.deepEqual(await list(), ["anterior.png"]);
});

test("falha do Prisma descarta somente o upload novo", async t => {
    auth(t);
    stub(t, prisma.patrimonio, "findUnique", async () => ({ id: patrimonioId }));
    stub(t, prisma, "$transaction", async () => { throw new Error("falha simulada"); });
    assert.equal((await upload()).status, 500);
    assert.deepEqual(await list(), ["anterior.png"]);
});

test("falha de filesystem não mascara o 404 original", async t => {
    auth(t);
    stub(t, prisma.patrimonio, "findUnique", async () => null);
    const unlink = stub(t, fs, "unlink", async () => { throw Object.assign(new Error("negado"), { code: "EACCES" }); });
    const result = await upload();
    assert.equal(result.status, 404);
    assert.equal((await result.json()).error.code, "PATRIMONIO_NOT_FOUND");
    unlink.mock.restore();
    for (const name of await list()) if (name !== "anterior.png") await fs.unlink(path.join(uploads, "patrimonios", name));
});

test("cópia exclusiva não sobrescreve arquivo preexistente em colisão", async t => {
    auth(t);
    stub(t, syncFs, "writeFileSync", (_file, _content, options) => {
        assert.equal(options.flag, "wx");
        throw Object.assign(new Error("colisão"), { code: "EEXIST" });
    });
    assert.equal((await upload()).status, 500);
    assert.equal(await fs.readFile(path.join(uploads, "patrimonios", "anterior.png"), "utf8"), "anterior");
    assert.deepEqual(await list(), ["anterior.png"]);
});

test("upload bem-sucedido é público, DELETE remove registro e arquivo", async t => {
    auth(t);
    let record;
    stub(t, prisma.patrimonio, "findUnique", async () => ({ id: patrimonioId }));
    stub(t, prisma, "$transaction", async callback => callback({
        patrimonioImagem: { create: async ({ data }) => (record = { id: randomUUID(), ...data }) },
    }));
    const response = await upload();
    assert.equal(response.status, 201);
    const { data } = await response.json();
    assert.equal(await (await fetch(base + data.url)).text(), "image-content");
    stub(t, prisma.patrimonioImagem, "findUnique", async () => record);
    stub(t, prisma.patrimonioImagem, "delete", async () => record);
    assert.equal((await fetch(base + "/api/admin/patrimonios/imagens/" + data.id, {
        method: "DELETE", headers: { authorization: "Bearer " + generateToken(admin.id) },
    })).status, 200);
    assert.equal((await fetch(base + data.url)).status, 404);
});

test("Express serve as três pastas sem transformar arquivos em HTML", async () => {
    for (const folder of ["patrimonios", "exposicoes", "novidades"]) {
        await fs.mkdir(path.join(uploads, folder), { recursive: true });
        await fs.writeFile(path.join(uploads, folder, "publica.png"), folder);
        const response = await fetch(base + "/uploads/" + folder + "/publica.png");
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.match(response.headers.get("content-type"), /image\/png/);
        assert.equal(await response.text(), folder);
    }
});
