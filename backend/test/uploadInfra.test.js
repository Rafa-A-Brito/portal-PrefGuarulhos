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
const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH5sAAAAASUVORK5CYII=",
    "base64"
);
let server, base;
before(async () => {
    await fs.mkdir(path.join(uploads, "patrimonios"));
    server = app.listen(0);
    await new Promise((r) => server.once("listening", r));
    base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
    await new Promise((r) => server.close(r));
    await prisma.$disconnect();
    assert.ok(uploads.startsWith(path.join(os.tmpdir(), "lote06-upload-")));
    await fs.rm(uploads, { recursive: true, force: true });
});
function stub(t, target, method, implementation) {
    const original = target[method];
    target[method] = implementation;
    const restore = () => {
        target[method] = original;
    };
    t.after(restore);
    return {
        mock: {
            restore,
            mockImplementation: (fn) => {
                target[method] = fn;
            },
        },
    };
}
function auth(t, role = "ADMIN") {
    stub(t, prisma.user, "findUnique", async () => ({ ...admin, role }));
    stub(t, prisma.patrimonio, "findUnique", async () => ({
        id: patrimonioId,
        status: "RASCUNHO",
    }));
    stub(t, prisma, "$queryRaw", async () => []);
}
function form(extra = {}, double = false) {
    const data = new FormData();
    data.append("imagem", new Blob([png], { type: "image/png" }), "imagem.png");
    if (double) data.append("imagem", new Blob([png], { type: "image/png" }), "outra.png");
    for (const [key, value] of Object.entries(extra)) data.append(key, value);
    return data;
}
function upload(body = form()) {
    return fetch(base + "/api/admin/patrimonios/" + patrimonioId + "/imagens", {
        method: "POST",
        headers: { authorization: "Bearer " + generateToken(admin.id) },
        body,
    });
}
const list = () => fs.readdir(path.join(uploads, "patrimonios"));

test("rotas de imagem existem e exigem autenticação; DELETE exige ADMIN", async (t) => {
    const route = "/api/admin/patrimonios/imagens/" + randomUUID();
    assert.equal((await fetch(base + route, { method: "DELETE" })).status, 401);
    assert.equal(
        (
            await fetch(base + "/api/admin/patrimonios/" + patrimonioId + "/imagens", {
                method: "POST",
            })
        ).status,
        401
    );
    auth(t, "EDITOR");
    assert.equal(
        (
            await fetch(base + route, {
                method: "DELETE",
                headers: { authorization: "Bearer " + generateToken(admin.id) },
            })
        ).status,
        403
    );
});

test("multipart com duas imagens remove o arquivo novo e preserva o preexistente", async (t) => {
    auth(t);
    const existing = path.join(uploads, "patrimonios", "anterior.png");
    await fs.writeFile(existing, "anterior");
    assert.equal((await upload(form({}, true))).status, 400);
    assert.deepEqual(await list(), ["anterior.png"]);
    assert.equal(await fs.readFile(existing, "utf8"), "anterior");
});

test("patrimônio inexistente e metadados inválidos limpam o upload", async (t) => {
    auth(t);
    const find = stub(t, prisma.patrimonio, "findUnique", async () => null);
    const missing = await upload();
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, "PATRIMONIO_NOT_FOUND");
    find.mock.mockImplementation(async () => ({ id: patrimonioId }));
    assert.equal((await upload(form({ titulo: "x".repeat(201) }))).status, 400);
    assert.deepEqual(await list(), ["anterior.png"]);
});

test("falha do Prisma descarta somente o upload novo", async (t) => {
    auth(t);
    stub(t, prisma.patrimonio, "findUnique", async () => ({ id: patrimonioId }));
    stub(t, prisma, "$transaction", async () => {
        throw new Error("falha simulada");
    });
    assert.equal((await upload()).status, 500);
    assert.deepEqual(await list(), ["anterior.png"]);
});

test("falha de filesystem não mascara o 404 original", async (t) => {
    auth(t);
    stub(t, prisma.patrimonio, "findUnique", async () => null);
    const unlink = stub(t, fs, "unlink", async () => {
        throw Object.assign(new Error("negado"), { code: "EACCES" });
    });
    const result = await upload();
    assert.equal(result.status, 404);
    assert.equal((await result.json()).error.code, "PATRIMONIO_NOT_FOUND");
    unlink.mock.restore();
    for (const name of await list())
        if (name !== "anterior.png") await fs.unlink(path.join(uploads, "patrimonios", name));
});

test("cópia exclusiva não sobrescreve arquivo preexistente em colisão", async (t) => {
    auth(t);
    stub(t, syncFs, "writeFileSync", (_file, _content, options) => {
        assert.equal(options.flag, "wx");
        throw Object.assign(new Error("colisão"), { code: "EEXIST" });
    });
    assert.equal((await upload()).status, 500);
    assert.equal(
        await fs.readFile(path.join(uploads, "patrimonios", "anterior.png"), "utf8"),
        "anterior"
    );
    assert.deepEqual(await list(), ["anterior.png"]);
});

test("upload de rascunho exige token para leitura, DELETE remove registro e arquivo", async (t) => {
    auth(t);
    let record;
    stub(t, prisma.patrimonio, "findUnique", async () => ({ id: patrimonioId }));
    stub(t, prisma, "$transaction", async (callback) =>
        callback({
            $queryRaw: async () => [],
            patrimonioImagem: {
                create: async ({ data }) => (record = { id: randomUUID(), ...data }),
                findUnique: async () => record,
                delete: async () => record,
            },
        })
    );
    const response = await upload();
    assert.equal(response.status, 201);
    const { data } = await response.json();
    assert.deepEqual(Buffer.from(await (await fetch(base + data.url)).arrayBuffer()), png);
    stub(t, prisma.patrimonioImagem, "findUnique", async () => record);
    stub(t, prisma.patrimonioImagem, "delete", async () => {
        const deleted = record;
        record = null;
        return deleted;
    });
    assert.equal(
        (
            await fetch(base + "/api/admin/patrimonios/imagens/" + data.id, {
                method: "DELETE",
                headers: { authorization: "Bearer " + generateToken(admin.id) },
            })
        ).status,
        200
    );
    assert.equal((await fetch(base + data.url)).status, 404);
});

test("Express mantém exposição e novidade estáticas sem transformar arquivos em HTML", async () => {
    for (const folder of ["exposicoes", "novidades"]) {
        await fs.mkdir(path.join(uploads, folder), { recursive: true });
        await fs.writeFile(path.join(uploads, folder, "publica.png"), folder);
        const response = await fetch(base + "/uploads/" + folder + "/publica.png");
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.match(response.headers.get("content-type"), /image\/png/);
        assert.equal(await response.text(), folder);
    }
});

test("campo arquivo mantém validação de assinatura, metadados obrigatórios e URL da origem", async (t) => {
    auth(t);
    stub(t, prisma, "$transaction", async (callback) => callback(prisma));
    let saved;
    stub(
        t,
        prisma.patrimonioImagem,
        "create",
        async ({ data }) => (saved = { id: randomUUID(), ...data })
    );
    const imageDir = path.join(uploads, "imagens");
    const data = (bytes, alt) => {
        const body = new FormData();
        body.append("arquivo", new Blob([bytes], { type: "image/png" }), "imagem.png");
        if (alt !== undefined) body.append("textoAlternativo", alt);
        return body;
    };
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal((await upload(data(png))).status, 400);
    assert.deepEqual(await fs.readdir(imageDir), []);
    assert.equal((await upload(data("conteudo invalido", "Alt"))).status, 415);
    assert.deepEqual(await fs.readdir(imageDir), []);
    const duplicate = data(png, "Alt");
    duplicate.append("arquivo", new Blob([png], { type: "image/png" }), "outra.png");
    assert.equal((await upload(duplicate)).status, 400);
    assert.deepEqual(await fs.readdir(imageDir), []);
    const response = await upload(data(png, "Alt"));
    assert.equal(response.status, 201);
    assert.equal(saved.textoAlternativo, "Alt");
    assert.ok(saved.url.startsWith("/api/uploads/imagens/"));
    assert.deepEqual(await fs.readFile(path.join(imageDir, path.basename(saved.url))), png);
});

test("imagem legada conserva GIF e texto derivado sem permitir EDITOR após publicação", async (t) => {
    auth(t);
    const body = () => {
        const data = new FormData();
        data.append("imagem", new Blob(["GIF89a"], { type: "image/gif" }), "legado.gif");
        return data;
    };
    let record;
    stub(t, prisma, "$transaction", async (callback) => callback(prisma));
    stub(
        t,
        prisma.patrimonioImagem,
        "create",
        async ({ data }) => (record = { id: randomUUID(), ...data })
    );
    assert.equal((await upload(body())).status, 201);
    assert.equal(record.textoAlternativo, "legado.gif");
    assert.ok(record.url.endsWith(".gif"));
    const before = await list();
    stub(t, prisma.user, "findUnique", async () => ({ ...admin, role: "EDITOR" }));
    let locked = false;
    const tx = {
        $queryRaw: async () => {
            locked = true;
        },
        patrimonio: {
            findUnique: async () => {
                assert.equal(locked, true);
                return { id: patrimonioId, status: "PUBLICADO" };
            },
        },
        patrimonioImagem: { create: async () => assert.fail("Não gravar após publicação") },
    };
    stub(t, prisma, "$transaction", async (callback) => callback(tx));
    assert.equal((await upload(body())).status, 403);
    assert.deepEqual(await list(), before);
});

test("exclusão legada restaura arquivo se houver rollback após o DELETE", async (t) => {
    auth(t);
    const name = "rollback.png";
    await fs.writeFile(path.join(uploads, "patrimonios", name), "original");
    const record = { id: randomUUID(), patrimonioId, url: `/uploads/patrimonios/${name}` };
    stub(t, prisma.patrimonioImagem, "findUnique", async () => record);
    stub(t, prisma.patrimonioImagem, "findFirst", async () => record);
    stub(t, prisma.patrimonioImagem, "delete", async () => record);
    stub(t, prisma, "$transaction", async (callback) => {
        await callback(prisma);
        await assert.rejects(fs.stat(path.join(uploads, "patrimonios", name)), { code: "ENOENT" });
        throw new Error("Commit recusado");
    });
    const response = await fetch(base + "/api/admin/patrimonios/imagens/" + record.id, {
        method: "DELETE",
        headers: { authorization: "Bearer " + generateToken(admin.id) },
    });
    assert.equal(response.status, 500);
    assert.equal(await fs.readFile(path.join(uploads, "patrimonios", name), "utf8"), "original");
});
