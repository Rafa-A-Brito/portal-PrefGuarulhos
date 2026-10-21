import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const uploads = await fs.mkdtemp(path.join(os.tmpdir(), "referencias-test-"));
process.env.UPLOAD_DIR = uploads;
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/referencia_test";
process.env.JWT_SECRET = "referencia-test-secret-with-at-least-32-characters";
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
const { caminhoArquivoUpload, removerArquivoUpload } = await import("../src/utils/arquivoUpload.js");
const id = randomUUID(), outroId = randomUUID(), userId = randomUUID();
let server, base, documentos, patrimonio, role, failCreate, failDelete, writes;
before(async () => {
    await fs.mkdir(path.join(uploads, "referencias"));
    server = app.listen(0);
    await new Promise(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
    assert.equal(path.dirname(uploads), os.tmpdir());
    assert.ok(path.basename(uploads).startsWith("referencias-test-"));
    await fs.rm(uploads, { recursive: true, force: true });
});
function stub(t, target, method, implementation) {
    const original = target[method];
    target[method] = implementation;
    t.after(() => { target[method] = original; });
}
beforeEach(t => {
    documentos = []; role = "ADMIN"; failCreate = false; failDelete = false; writes = [];
    patrimonio = { id, status: "RASCUNHO", descricaoResumida: "Resumo manual preservado.", documentos, categoriasAdicionais: [] };
    stub(t, prisma.user, "findUnique", async () => ({ id: userId, role, isActive: true }));
    stub(t, prisma.patrimonio, "findUnique", async ({ where }) => where.id === id ? patrimonio : null);
    stub(t, prisma.patrimonioDocumento, "findMany", async ({ where }) => {
        const registro = documentos.find((documento) => documento.url === where.url);
        return registro ? [{ patrimonio: { status: patrimonio.status } }] : [];
    });
    stub(t, prisma, "$transaction", async callback => {
        const snapshot = [...documentos];
        try {
            return await callback({
                $queryRaw: async () => [],
                patrimonio: { findUnique: async ({ where }) => where.id === id ? patrimonio : null },
                patrimonioDocumento: {
                    create: async ({ data }) => {
                        if (failCreate) throw new Error("Falha simulada no banco");
                        const record = { id: randomUUID(), ...data };
                        documentos.push(record); writes.push(data);
                        return record;
                    },
                    findFirst: async ({ where }) => documentos.find(d => d.id === where.id && d.patrimonioId === where.patrimonioId) ?? null,
                    delete: async ({ where }) => {
                        if (failDelete) throw new Error("Falha simulada no delete");
                        const index = documentos.findIndex(d => d.id === where.id);
                        return documentos.splice(index, 1)[0];
                    },
                },
            });
        } catch (error) { documentos.splice(0, documentos.length, ...snapshot); throw error; }
    });
});
const headers = () => ({ authorization: `Bearer ${generateToken(userId)}` });
const route = pid => `${base}/api/admin/patrimonios/${pid}/referencias`;
const link = (data = { url: "https://example.org/fonte", descricao: "Fonte editorial" }, pid = id) => fetch(route(pid), { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
function form(ext = "txt", mime = "text/plain", contents = "Texto de referência", extra = {}) {
    const body = new FormData();
    body.append("arquivo", new Blob([contents], { type: mime }), `fonte.${ext}`);
    for (const [key, value] of Object.entries(extra)) body.append(key, value);
    return body;
}
const upload = (body = form(), pid = id) => fetch(route(pid), { method: "POST", headers: headers(), body });
const remove = (ref, pid = id) => fetch(`${route(pid)}/${ref}`, { method: "DELETE", headers: headers() });
const list = () => fs.readdir(path.join(uploads, "referencias"));

test("link é persistido em PatrimonioDocumento e detalhe admin devolve a mesma relação sem alterar resumo", async () => {
    const response = await link();
    assert.equal(response.status, 201);
    const { data } = await response.json();
    assert.deepEqual(data, { id: documentos[0].id, descricao: "Fonte editorial", nomeArquivo: null, url: "https://example.org/fonte", tipo: "LINK" });
    const detail = await fetch(`${base}/api/admin/patrimonios/${id}`, { headers: headers() });
    assert.equal(detail.status, 200);
    const payload = (await detail.json()).data;
    assert.equal(payload.documentos[0].id, data.id);
    assert.equal(payload.descricaoResumida, "Resumo manual preservado.");
    assert.equal(writes[0].patrimonioId, id);
    assert.ok(!Object.hasOwn(writes[0], "descricaoResumida"));
});
for (const url of ["texto", "ftp://example.org", "javascript:alert(1)", "data:text/plain,test", "", "/uploads/local.pdf"]) {
    test(`rejeita URL inválida: ${url}`, async () => { assert.equal((await link({ url })).status, 400); assert.equal(documentos.length, 0); });
}
for (const [ext, mime, content] of [
    ["pdf", "application/pdf", "%PDF-1.7\nfixture"],
    ["doc", "application/msword", Buffer.from("d0cf11e0a1b11ae100", "hex")],
    ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from("504b030400", "hex")],
    ["odt", "application/vnd.oasis.opendocument.text", Buffer.from("504b030400", "hex")],
    ["txt", "text/plain", "Fonte textual"], ["md", "text/markdown", "# Fonte"],
]) {
    test(`upload ${ext}: nome seguro, URL relativa, download e remoção`, async () => {
        const response = await upload(form(ext, mime, content, { descricao: "Acervo" }));
        assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
        const { data } = await response.json();
        assert.equal(data.tipo, "ARQUIVO"); assert.equal(data.nomeArquivo, `fonte.${ext}`);
        assert.match(data.url, new RegExp(`^/uploads/referencias/[0-9a-f-]+\\.${ext}$`));
        assert.equal(documentos[0].mimeType, mime);
        assert.equal((await fetch(base + data.url)).status, 401);
        const download = await fetch(base + data.url, { headers: headers() });
        assert.equal(download.status, 200);
        assert.equal(download.headers.get("content-disposition"), "attachment");
        assert.equal(download.headers.get("x-content-type-options"), "nosniff");
        assert.deepEqual(Buffer.from(await download.arrayBuffer()), Buffer.from(content));
        assert.equal((await remove(data.id)).status, 200);
        assert.equal((await fetch(base + data.url)).status, 404);
        assert.equal(documentos.length, 0);
        assert.equal(patrimonio.descricaoResumida, "Resumo manual preservado.");
    });
}
for (const [name, body, status] of [
    ["extensão proibida", () => form("exe", "application/octet-stream"), 400],
    ["MIME divergente", () => form("pdf", "image/png", "%PDF-1.7"), 400],
    ["assinatura inválida", () => form("pdf", "application/pdf", "Não é PDF"), 400],
    ["texto binário", () => form("txt", "text/plain", Buffer.from([0, 255])), 400],
    ["vazio", () => form("txt", "text/plain", ""), 400],
    ["acima de 10 MB", () => form("txt", "text/plain", "a".repeat(10 * 1024 * 1024 + 1)), 413],
    ["acima do limite do corpo", () => form("txt", "text/plain", "a".repeat(11 * 1024 * 1024)), 413],
    ["arquivo e URL", () => form("txt", "text/plain", "texto", { url: "https://example.org" }), 400],
    ["descrição longa", () => form("txt", "text/plain", "texto", { descricao: "a".repeat(301) }), 400],
    ["campo desconhecido", () => form("txt", "text/plain", "texto", { status: "PUBLICADO" }), 400],
    ["dois arquivos", () => { const body = form(); body.append("arquivo", new Blob(["texto"]), "outro.txt"); return body; }, 400],
]) {
    test(`rejeita ${name} e não deixa arquivo órfão`, async () => {
        const before = await list();
        assert.equal((await upload(body())).status, status);
        assert.deepEqual(await list(), before);
        assert.equal(documentos.length, 0);
    });
}
for (const [perfil, status, expected] of [
    ["ADMIN", "RASCUNHO", 201], ["ADMIN", "PUBLICADO", 201], ["ADMIN", "ARQUIVADO", 201],
    ["EDITOR", "RASCUNHO", 201], ["EDITOR", "PUBLICADO", 403], ["EDITOR", "ARQUIVADO", 403],
]) {
    test(`${perfil} adiciona em ${status}: ${expected}`, async () => {
        role = perfil; patrimonio.status = status;
        const before = await list();
        assert.equal((await link()).status, expected);
        const response = await upload();
        assert.equal(response.status, expected);
        if (expected !== 201) assert.deepEqual(await list(), before);
        else {
            const { data } = await response.json();
            role = "ADMIN"; assert.equal((await remove(data.id)).status, 200);
        }
    });
}
test("rotas exigem autenticação, UUID e ADMIN para remoção", async () => {
    assert.equal((await fetch(route(id), { method: "POST" })).status, 401);
    assert.equal((await link(undefined, "slug-invalido")).status, 400);
    const { data } = await (await link()).json();
    role = "EDITOR";
    assert.equal((await remove(data.id)).status, 403);
    assert.equal(documentos.length, 1);
    role = "ADMIN";
    assert.equal((await remove(data.id)).status, 200);
    assert.equal((await remove(data.id)).status, 404);
});
test("patrimônio inexistente e referência pertencente a outro bem retornam 404", async () => {
    const before = await list();
    assert.equal((await link(undefined, outroId)).status, 404);
    assert.equal((await upload(form(), outroId)).status, 404);
    assert.deepEqual(await list(), before);
    documentos.push({ id: randomUUID(), patrimonioId: outroId, url: "https://example.org" });
    assert.equal((await remove(documentos[0].id)).status, 404);
    assert.equal(documentos.length, 1);
});
test("falha no create limpa só o arquivo novo; falha no delete preserva arquivo e registro", async () => {
    const { data } = await (await upload()).json();
    const before = await list();
    failCreate = true;
    assert.equal((await upload()).status, 500);
    assert.deepEqual(await list(), before);
    failDelete = true;
    assert.equal((await remove(data.id)).status, 500);
    assert.deepEqual(await list(), before);
    assert.equal(documentos.length, 1);
    failDelete = false;
    assert.equal((await remove(data.id)).status, 200);
});
test("cleanup recusa traversal, URLs externas e arquivos não regulares", async () => {
    for (const url of ["/uploads/referencias/../fora.txt", "/uploads/referencias/%2e%2e.txt", "C:/fora.txt", "https://example.org/a.pdf", "/uploads/patrimonios/a.pdf"]) {
        assert.equal(caminhoArquivoUpload(url), null);
        assert.equal(await removerArquivoUpload(url), false);
    }
    const dir = path.join(uploads, "referencias", "diretorio.txt");
    await fs.mkdir(dir);
    assert.equal(await removerArquivoUpload("/uploads/referencias/diretorio.txt"), false);
    assert.ok((await fs.stat(dir)).isDirectory());
    await fs.rmdir(dir);
});
