import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, access, readdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

process.env.DATABASE_URL = "postgresql://localhost:5432/test_conteudo";
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
const uploads = await mkdtemp(path.join(os.tmpdir(), "lote03-test-"));
process.env.UPLOAD_DIR = uploads;
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
const { novidadeService } = await import("../src/services/novidadeService.js");
const { exposicaoService } = await import("../src/services/exposicaoService.js");
const schemas = await import("../src/schemas/novidadeSchema.js");
const { caminhoArquivoUpload, removerArquivoUpload } = await import("../src/utils/arquivoUpload.js");
const admin = { id: randomUUID(), role: "ADMIN", isActive: true };
const editor = { id: randomUUID(), role: "EDITOR", isActive: true };
const dadosNovidade = { titulo: "Notícia", tipo: "NOTICIA", tag: "Cultura", data: "2026-10-06", resumo: "Resumo", texto: "Texto" };
const dadosExpo = { titulo: "Mostra", artista: "Artista", local: "Centro", periodo: "Outubro", bio: "Biografia" };
const registro = (extra = {}) => ({
    ...dadosNovidade, id: randomUUID(), slug: "noticia", status: "RASCUNHO",
    data: new Date("2026-10-06T00:00:00Z"), fontes: [], imagemUrl: null,
    blocoDia: null, blocoMes: null, blocoLegenda: null, ctaRotulo: null, ctaUrl: null,
    createdBy: admin.id, updatedBy: null, ...extra,
});
const expo = (extra = {}) => ({ ...dadosExpo, id: randomUUID(), slug: "mostra", status: "RASCUNHO", imagemUrl: "/uploads/exposicoes/antiga.png", ...extra });
let server, base;
before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    // Diretório temporário criado exclusivamente por esta suíte.
    assert.ok(uploads.startsWith(path.join(os.tmpdir(), "lote03-test-")));
    await rm(uploads, { recursive: true, force: true });
});
function stub(t, target, method, implementation) {
    const original = target[method];
    target[method] = implementation;
    t.after(() => { target[method] = original; });
}
function banco(t, model, initial, fail = false) {
    let state = initial;
    const tx = {
        $queryRaw: async () => [],
        [model]: {
            findUnique: async () => state,
            update: async ({ data }) => {
                if (fail) throw new Error("Falha simulada no banco");
                state = { ...state, ...data };
                return state;
            },
            delete: async () => { state = null; },
        },
    };
    stub(t, prisma, "$transaction", async (callback) => callback(tx));
    stub(t, prisma[model], "findUnique", async () => state);
    return () => state;
}
function auth(t) {
    stub(t, prisma.user, "findUnique", async ({ where }) => where.id === admin.id ? admin : editor);
}
async function request(url, { user, method = "GET", body } = {}) {
    const multipart = body instanceof FormData;
    const response = await fetch(base + url, {
        method,
        headers: { ...(user && { authorization: `Bearer ${generateToken(user.id)}` }),
            ...(!multipart && body !== undefined && { "content-type": "application/json" }) },
        body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}
async function arquivo(pasta) {
    await mkdir(path.join(uploads, pasta), { recursive: true });
    const nome = `${randomUUID()}.png`;
    await writeFile(path.join(uploads, pasta, nome), "imagem");
    return `/uploads/${pasta}/${nome}`;
}
const existe = async (url) => access(caminhoArquivoUpload(url)).then(() => true, () => false);
function multipart(dados, comImagem = true) {
    const form = new FormData();
    for (const [key, value] of Object.entries(dados)) form.append(key, typeof value === "string" ? value : JSON.stringify(value));
    if (comImagem) form.append("imagem", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "imagem.png");
    return form;
}

test("Zod exige data real, resumo de notícia, UUID/query válidos e URLs HTTP", () => {
    assert.equal(schemas.createNovidadeSchema.safeParse(dadosNovidade).success, true);
    for (const item of [{ ...dadosNovidade, data: undefined }, { ...dadosNovidade, data: "2026-02-30" }, { ...dadosNovidade, resumo: "" }, { ...dadosNovidade, cta: { rotulo: "Abrir", url: "javascript:alert(1)" } }]) {
        assert.equal(schemas.createNovidadeSchema.safeParse(item).success, false);
    }
    assert.equal(schemas.createNovidadeSchema.safeParse({ ...dadosNovidade, tipo: "EVENTO", resumo: null }).success, true);
    assert.equal(schemas.conteudoIdParamsSchema.safeParse({ id: "invalido" }).success, false);
    assert.equal(schemas.listNovidadesQuerySchema.safeParse({ status: "RASCUNHO" }).success, false);
    assert.equal(schemas.listNovidadesQuerySchema.safeParse({ limite: 101 }).success, false);
    assert.equal(schemas.updateNovidadeSchema.safeParse({ slug: "novo" }).success, false);
});

test("API pública não exige autenticação e força PUBLICADO", async (t) => {
    for (const [model, route, item] of [["novidade", "/novidades", registro()], ["exposicao", "/exposicoes", expo()]]) {
        stub(t, prisma[model], "count", async ({ where }) => { assert.equal(where.status, "PUBLICADO"); return 1; });
        stub(t, prisma[model], "findMany", async ({ where }) => { assert.equal(where.status, "PUBLICADO"); return [item]; });
        const result = await request(route);
        assert.equal(result.status, 200);
        assert.equal(result.body.success, true);
        assert.equal(result.body.data.itens[0].createdBy, undefined);
        if (model === "novidade") assert.equal(result.body.data.itens[0].data, "2026-10-06");
    }
});

test("PATCH JSON mantém imagem/slug; bloco e CTA são aninhados na API", async (t) => {
    auth(t);
    const inicial = registro({ imagemUrl: "/uploads/novidades/antiga.png" });
    const state = banco(t, "novidade", inicial);
    const result = await request(`/admin/novidades/${inicial.id}`, { user: editor, method: "PATCH", body: { titulo: "Novo título", bloco: { dia: "06", mes: "OUT" }, cta: { rotulo: "Leia", url: "https://example.com" } } });
    assert.equal(result.status, 200);
    assert.equal(state().slug, inicial.slug);
    assert.equal(state().imagemUrl, inicial.imagemUrl);
    assert.equal(state().blocoDia, "06");
    assert.deepEqual(result.body.data.cta, { rotulo: "Leia", url: "https://example.com" });
    assert.equal(result.body.data.blocoDia, undefined);
});

test("PATCH de EVENTO para NOTICIA exige resumo após mesclar os campos", async (t) => {
    const inicial = registro({ tipo: "EVENTO", resumo: null });
    banco(t, "novidade", inicial);
    await assert.rejects(novidadeService.update(inicial.id, { tipo: "NOTICIA" }, null, editor), /Resumo/);
});

test("EDITOR só cria/edita rascunhos e ADMIN exclui item publicado", async (t) => {
    await assert.rejects(novidadeService.create({ ...dadosNovidade, status: "PUBLICADO" }, null, editor), { statusCode: 403 });
    const inicial = registro({ status: "PUBLICADO" });
    const state = banco(t, "novidade", inicial);
    await assert.rejects(novidadeService.update(inicial.id, { titulo: "Novo" }, null, editor), { statusCode: 403 });
    await assert.rejects(novidadeService.changeStatus(inicial.id, "ARQUIVADO", editor), { statusCode: 403 });
    await assert.rejects(novidadeService.remove(inicial.id, editor), { statusCode: 403 });
    await novidadeService.remove(inicial.id, admin);
    assert.equal(state(), null);
});

test("ADMIN publica/arquiva com timestamps e bloqueio do registro", async (t) => {
    const inicial = registro();
    banco(t, "novidade", inicial);
    const publicado = await novidadeService.changeStatus(inicial.id, "PUBLICADO", admin);
    assert.equal(publicado.status, "PUBLICADO");
    assert.ok(publicado.publicadoEm instanceof Date);
    const arquivado = await novidadeService.changeStatus(inicial.id, "ARQUIVADO", admin);
    assert.equal(arquivado.status, "ARQUIVADO");
    assert.ok(arquivado.arquivadoEm instanceof Date);
});

test("Exposição exige upload no POST; novidade aceita POST JSON sem imagem", async (t) => {
    auth(t);
    assert.equal((await request("/admin/exposicoes", { user: editor, method: "POST", body: dadosExpo })).status, 400);
    stub(t, prisma.novidade, "create", async ({ data }) => registro(data));
    const result = await request("/admin/novidades", { user: editor, method: "POST", body: dadosNovidade });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.imagemUrl, null);
    assert.equal(result.body.data.status, "RASCUNHO");
});

test("PATCH multipart sem arquivo mantém a imagem da exposição e recusa remoção", async (t) => {
    auth(t);
    const inicial = expo();
    banco(t, "exposicao", inicial);
    const result = await request(`/admin/exposicoes/${inicial.id}`, { user: editor, method: "PATCH", body: multipart({ titulo: "Outra mostra" }, false) });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.imagemUrl, inicial.imagemUrl);
    const remover = await request(`/admin/exposicoes/${inicial.id}`, { user: admin, method: "PATCH", body: { imagemUrl: null } });
    assert.equal(remover.status, 400);
});

test("Upload inválido após gravação e falha de banco limpam somente a imagem nova", async (t) => {
    auth(t);
    const antiga = await arquivo("exposicoes");
    const inicial = expo({ imagemUrl: antiga });
    banco(t, "exposicao", inicial, true);
    const antes = (await readdir(path.join(uploads, "exposicoes"))).sort();
    for (const dados of [{ titulo: "" }, { titulo: "Nova" }]) {
        const result = await request(`/admin/exposicoes/${inicial.id}`, { user: admin, method: "PATCH", body: multipart(dados) });
        assert.ok([400, 500].includes(result.status));
        assert.deepEqual((await readdir(path.join(uploads, "exposicoes"))).sort(), antes);
        assert.equal(await existe(antiga), true);
    }
});

test("Troca confirma banco antes de limpar antiga; novidade permite remover imagem", async (t) => {
    const antiga = await arquivo("novidades");
    const nova = await arquivo("novidades");
    const inicial = registro({ imagemUrl: antiga });
    const state = banco(t, "novidade", inicial);
    const result = await novidadeService.update(inicial.id, { titulo: "Nova" }, { url: nova }, editor);
    assert.equal(state().imagemUrl, nova);
    assert.equal(result.imagemUrl, nova);
    assert.equal(await existe(antiga), false);
    assert.equal(await existe(nova), true);
    await novidadeService.update(inicial.id, { imagemUrl: null }, null, editor);
    assert.equal(state().imagemUrl, null);
    assert.equal(await existe(nova), false);
});

test("DELETE apaga registro publicado e depois a imagem", async (t) => {
    const imagemUrl = await arquivo("exposicoes");
    const inicial = expo({ imagemUrl, status: "PUBLICADO" });
    const state = banco(t, "exposicao", inicial);
    await exposicaoService.remove(inicial.id, admin);
    assert.equal(state(), null);
    assert.equal(await existe(imagemUrl), false);
});

test("Limpeza recusa traversal, URLs externas e pastas fora do lote", async () => {
    for (const url of ["/uploads/exposicoes/../segredo.png", "/uploads/novidades/%2e%2e/segredo.png", "/uploads/desconhecida/a.png", "https://example.com/uploads/novidades/a.png", "/uploads/exposicoes/a/../../a.png", "/uploads/novidades/..\\a.png"]) {
        assert.equal(caminhoArquivoUpload(url), null);
        assert.equal(await removerArquivoUpload(url), false);
    }
});

test("Upload de exposição fica disponível pela URL devolvida, sem autenticação", async (t) => {
    auth(t);
    stub(t, prisma.exposicao, "create", async ({ data }) => ({ id: randomUUID(), ...data }));
    const result = await request("/admin/exposicoes", { user: editor, method: "POST", body: multipart(dadosExpo) });
    assert.equal(result.status, 201);
    assert.match(result.body.data.imagemUrl, /^\/uploads\/exposicoes\//);
    const response = await fetch(base.replace(/\/api$/, "") + result.body.data.imagemUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /image\/png/);
    assert.equal((await response.arrayBuffer()).byteLength, 8);
});

test("Novidade aceita multipart sem arquivo; upload recusado por permissão não deixa órfão", async (t) => {
    auth(t);
    stub(t, prisma.novidade, "create", async ({ data }) => registro(data));
    const criada = await request("/admin/novidades", { user: editor, method: "POST", body: multipart(dadosNovidade, false) });
    assert.equal(criada.status, 201);
    assert.equal(criada.body.data.imagemUrl, null);
    const antiga = await arquivo("novidades");
    const inicial = registro({ status: "PUBLICADO", imagemUrl: antiga });
    banco(t, "novidade", inicial);
    const antes = (await readdir(path.join(uploads, "novidades"))).sort();
    const result = await request(`/admin/novidades/${inicial.id}`, { user: editor, method: "PATCH", body: multipart({ titulo: "Negado" }) });
    assert.equal(result.status, 403);
    assert.deepEqual((await readdir(path.join(uploads, "novidades"))).sort(), antes);
    assert.equal(await existe(antiga), true);
});
