import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { after, before, beforeEach, test } from "node:test";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "midia-publica-test-"));
process.env.UPLOAD_DIR = root;
process.env.UPLOAD_ROOT = root;
process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/midia_publica_test";
process.env.JWT_SECRET = "midia-publica-secret-with-at-least-32-characters";
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
const { PATRIMONIOS_IMAGE_DIR } = await import("../src/config/arquivos.js");
const fixtures = [
    { tipo: "patrimonios", url: "/uploads/patrimonios/fachada_histórica.png", model: "patrimonioImagem", mime: "image/png", attachment: false },
    { tipo: "referencias", url: "/uploads/referencias/fonte_acervo.txt", model: "patrimonioDocumento", mime: "text/plain", attachment: true },
    { tipo: "imagens", url: `/api/uploads/imagens/${randomUUID()}.png`, model: "patrimonioImagem", mime: "image/png", attachment: false },
    { tipo: "documentos", url: `/api/uploads/documentos/${randomUUID()}.pdf`, model: "patrimonioDocumento", mime: "application/pdf", attachment: false },
];
const bytes = Buffer.from("fixture de mídia");
let server, base, status, user, registros, consultas;
const userId = randomUUID();
const token = () => ({ authorization: `Bearer ${generateToken(userId, 0, userId)}` });
function stub(t, target, method, implementation) {
    const original = target[method];
    target[method] = implementation;
    t.after(() => { target[method] = original; });
}

for (const fixture of fixtures) {
    test(`${fixture.tipo}: URL compartilhada independe da ordem dos vínculos`, async t => {
        for (const statuses of [["RASCUNHO", "PUBLICADO"], ["PUBLICADO", "ARQUIVADO"], ["ARQUIVADO", "RASCUNHO"]]) {
            stub(t, prisma[fixture.model], "findMany", async () => statuses.map(status => ({ patrimonio: { status } })));
            const expected = statuses.includes("PUBLICADO") ? 200 : 401;
            for (const method of ["GET", "HEAD"]) {
                const response = await fetch(base + fixture.url, { method });
                assert.equal(response.status, expected);
                await response.arrayBuffer();
            }
            assert.equal((await fetch(base + fixture.url, { headers: token() })).status, 200);
        }
    });
}
before(async () => {
    for (const folder of ["patrimonios", "referencias", "imagens", "documentos", "exposicoes", "novidades"]) {
        await fs.mkdir(path.join(root, folder));
    }
    for (const fixture of fixtures) await fs.writeFile(path.join(root, fixture.tipo, path.basename(fixture.url)), bytes);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach((t) => {
    status = "PUBLICADO";
    user = { id: userId, role: "ADMIN", authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }], tokenVersion: 0, isActive: true };
    registros = new Set(fixtures.map((fixture) => fixture.url));
    consultas = [];
    stub(t, prisma.user, "findUnique", async () => user);
    for (const model of ["patrimonioImagem", "patrimonioDocumento"]) {
        stub(t, prisma[model], "findMany", async ({ where, select }) => {
            consultas.push({ model, url: where.url });
            assert.deepEqual(select, { patrimonio: { select: { status: true } } });
            return registros.has(where.url) ? [{ patrimonio: { status } }] : [];
        });
    }
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("midia-publica-test-"));
    await fs.rm(root, { recursive: true, force: true });
});

for (const fixture of fixtures) {
    test(`${fixture.tipo}: publicado é público, com MIME, nosniff e cache sem persistência`, async () => {
        const response = await fetch(base + fixture.url);
        assert.equal(response.status, 200);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
        assert.ok(response.headers.get("content-type").startsWith(fixture.mime));
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.match(response.headers.get("vary"), /Authorization/);
        assert.equal(response.headers.get("etag"), null);
        assert.equal(response.headers.get("content-disposition").startsWith("attachment"), fixture.attachment);
        assert.deepEqual(consultas, [{ model: fixture.model, url: fixture.url }]);
    });
    for (const situacao of ["RASCUNHO", "ARQUIVADO"]) {
        test(`${fixture.tipo}: ${situacao} recusa visitante, inclusive HEAD e requisição condicional`, async () => {
            status = situacao;
            for (const options of [{}, { method: "HEAD" }, { headers: { "If-None-Match": "*", "If-Modified-Since": new Date().toUTCString() } }]) {
                const response = await fetch(base + fixture.url, options);
                assert.equal(response.status, 401);
                assert.equal(response.headers.get("cache-control"), "private, no-store");
            }
        });
        for (const role of ["ADMIN", "EDITOR"]) {
            test(`${fixture.tipo}: ${role} ativo lê ${situacao}`, async () => {
                status = situacao; user.role = role;
                const response = await fetch(base + fixture.url, { headers: token() });
                assert.equal(response.status, 200);
                assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
                assert.equal(response.headers.get("cache-control"), "private, no-store");
            });
        }
    }
    test(`${fixture.tipo}: token inválido/malformado, usuário desativado e ausente são recusados`, async () => {
        for (const situacao of ["PUBLICADO", "RASCUNHO"]) {
            status = situacao;
            for (const authorization of ["Bearer inválido", "Basic abc", "Bearer", ""]) {
                assert.equal((await fetch(base + fixture.url, { headers: { authorization } })).status, 401);
            }
            user.isActive = false;
            assert.equal((await fetch(base + fixture.url, { headers: token() })).status, 401);
            user = null;
            assert.equal((await fetch(base + fixture.url, { headers: token() })).status, 401);
            user = { id: userId, role: "ADMIN", authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }], tokenVersion: 0, isActive: true };
        }
    });
    test(`${fixture.tipo}: usuário autenticado sem papel permitido recebe 403`, async () => {
        status = "ARQUIVADO"; user.role = "VISITANTE";
        const response = await fetch(base + fixture.url, { headers: token() });
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, "FORBIDDEN");
    });
    test(`${fixture.tipo}: arquivo no disco sem registro retorna 404 para visitante e ADMIN`, async () => {
        registros.clear();
        for (const headers of [undefined, token()]) {
            assert.equal((await fetch(base + fixture.url, { headers })).status, 404);
        }
    });
    test(`${fixture.tipo}: registro sem arquivo no disco retorna 404`, async () => {
        const missing = fixture.url.replace(path.basename(fixture.url), `${randomUUID()}${path.extname(fixture.url)}`);
        registros.add(missing);
        assert.equal((await fetch(base + missing)).status, 404);
    });
    test(`${fixture.tipo}: arquivar bloqueia novas requisições anônimas à mesma URL`, async () => {
        assert.equal((await fetch(base + fixture.url)).status, 200);
        status = "ARQUIVADO";
        assert.equal((await fetch(base + fixture.url)).status, 401);
        assert.equal((await fetch(base + fixture.url, { headers: token() })).status, 200);
    });
}

test("tentativas de traversal, subpastas e pasta privada não chegam ao banco nem ao static", async () => {
    for (const url of [
        "/uploads/patrimonios/..%2Fnovidades%2Fpublica.png", "/uploads/referencias/..%5Cfora.txt",
        "/uploads/patrimonios/subpasta/publica.png", "/uploads/referencias/.oculto.txt",
        "/uploads/patrimonios/arquivo.pdf", "/uploads/referencias/imagem.png",
        "/uploads/.quarentena/arquivo.txt", "/api/uploads/imagens/..%2Farquivo.png",
        "/api/uploads/documentos/subpasta/arquivo.pdf", "/uploads/patrimonios", "/uploads/referencias/",
    ]) {
        const response = await fetch(base + url);
        assert.ok([400, 404].includes(response.status), url);
    }
    assert.deepEqual(consultas, []);
});

test("junction/symlink da pasta autorizada para outra pasta é recusado", async () => {
    const folder = path.join(root, "patrimonios"), original = path.join(root, "patrimonios-original");
    const outside = path.join(root, "fora");
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, path.basename(fixtures[0].url)), "conteúdo externo");
    await fs.rename(folder, original);
    let created = false;
    try {
        await fs.symlink(outside, folder, process.platform === "win32" ? "junction" : "dir");
        created = true;
        assert.equal((await fetch(base + fixtures[0].url)).status, 404);
    } finally {
        if (created) await fs.unlink(folder);
        await fs.rename(original, folder);
    }
});

test("symlink de arquivo é recusado antes de abrir o descritor", async (t) => {
    const lstat = fs.lstat;
    stub(t, fs, "lstat", async (file) => {
        const stat = await lstat(file);
        stat.isSymbolicLink = () => true;
        return stat;
    });
    stub(t, fs, "open", async () => assert.fail("Não abrir symlink"));
    for (const fixture of fixtures) assert.equal((await fetch(base + fixture.url)).status, 404);
});

test("exposições, novidades e arquivos da pesquisa permanecem públicos sem consultar o banco", async () => {
    for (const folder of ["exposicoes", "novidades"]) {
        await fs.writeFile(path.join(root, folder, "publica.png"), bytes);
        const response = await fetch(`${base}/uploads/${folder}/publica.png`);
        assert.equal(response.status, 200);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    }
    const name = "casa_jose_mauricio.jpg";
    const response = await fetch(`${base}/arquivos/patrimonios/${name}`);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(path.join(PATRIMONIOS_IMAGE_DIR, name)));
    assert.deepEqual(consultas, []);
});

test("falhas de banco/autenticação e leitura não são convertidas em 404 ou visitante", async (t) => {
    t.mock.method(console, "error", () => {});
    stub(t, prisma.user, "findUnique", async () => { throw new Error("Banco indisponível"); });
    assert.equal((await fetch(base + fixtures[0].url, { headers: token() })).status, 500);
    stub(t, prisma.patrimonioImagem, "findMany", async () => { throw new Error("Banco indisponível"); });
    assert.equal((await fetch(base + fixtures[0].url)).status, 500);
    stub(t, fs, "open", async () => { throw Object.assign(new Error("Permissão negada"), { code: "EACCES" }); });
    assert.equal((await fetch(base + fixtures[1].url)).status, 500);
});

for (const depoisDosHeaders of [false, true]) {
    test(`erro de stream ${depoisDosHeaders ? "após bytes encerra resposta" : "antes dos bytes passa ao errorHandler"}`, async (t) => {
        t.mock.method(console, "error", () => {});
        const open = fs.open;
        stub(t, fs, "open", async (...args) => {
            const file = await open(...args);
            return {
                stat: () => file.stat(), close: () => file.close(),
                createReadStream() {
                    let started = false;
                    const stream = new Readable({ read() {
                        if (started) return;
                        started = true;
                        const error = Object.assign(new Error("Falha de leitura"), { code: "EIO" });
                        if (depoisDosHeaders) { this.push(Buffer.from("abc")); setImmediate(() => this.destroy(error)); }
                        else this.destroy(error);
                    } });
                    stream.once("close", () => file.close());
                    return stream;
                },
            };
        });
        if (depoisDosHeaders) {
            await assert.rejects(async () => {
                const response = await fetch(base + fixtures[0].url);
                await response.arrayBuffer();
            }, /terminated|fetch failed/);
        } else {
            const response = await fetch(base + fixtures[0].url);
            assert.equal(response.status, 500);
            assert.equal((await response.json()).error.code, "INTERNAL_ERROR");
        }
    });
}
