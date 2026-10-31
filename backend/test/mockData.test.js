import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { spawn, spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { tmpdir } from "node:os";
import http from "node:http";

const root = fileURLToPath(new URL("../", import.meta.url));
const realSecret = "real-environment-signing-value-for-isolation-tests";
function cleanEnv(extra = {}) {
    const env = { ...process.env, DOTENV_CONFIG_PATH: path.join(root, ".env-does-not-exist-demo-test") };
    for (const key of Object.keys(env)) if (/^(MOCK_DATA|NODE_ENV|DATABASE_URL|JWT_|AUTH_|UPLOAD_|METRICAS_|CORS_ORIGIN|PORT|TRUST_PROXY|LOGIN_RATE)/.test(key)) delete env[key];
    return { ...env, ...extra };
}
const run = (source, env = {}) => spawnSync(process.execPath, ["--input-type=module"], {
    input: source, encoding: "utf8", cwd: root, env: cleanEnv(env), timeout: 20000,
});

// Nenhum import de driver/client é permitido, nem sequer a construção do client.
const hooks = registerHooks({ resolve(specifier, context, next) {
    if (/^(@prisma\/|pg$|pg\/)/.test(specifier) || specifier.endsWith("/config/prisma.js")) throw new Error("Acesso real proibido no teste mock");
    return next(specifier, context);
} });
Object.assign(process.env, cleanEnv({ MOCK_DATA: "true", JWT_SECRET: realSecret,
    DATABASE_URL: "postgresql://invalid.invalid:1/never-connect", UPLOAD_DIR: path.join(root, "uploads-never-use-demo"),
    UPLOAD_ROOT: path.join(root, "uploads-never-use-demo"), LOGIN_RATE_IP_MAX: "1000" }));
process.env.DOTENV_CONFIG_PATH = path.join(root, ".env-does-not-exist-demo-test");
process.env.NODE_ENV = "test";
const { default: app } = await import("../src/app.js");
const { default: env } = await import("../src/config/env.js");
const { store, fixtureId } = await import("../src/mock/store.js");
const { hashPassword, verifyPassword } = await import("../src/utils/password.js");
const { logOutput } = await import("../src/utils/logger.js");
const { diaSaoPaulo } = await import("../src/utils/dataMetricas.js");
const logs = [], originalLog = logOutput.write;
logOutput.write = (_level, line) => logs.push(line);
let server, origin, admin, editor;
const originalFetch = globalThis.fetch;
before(async () => {
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    // Serviços mock não podem enviar requisições HTTP para outras origens.
    globalThis.fetch = (url, options) => {
        assert.equal(new URL(url).origin, origin, "Chamada externa proibida");
        return originalFetch(url, options);
    };
    admin = (await call("/api/auth/login", { method: "POST", body: { email: "admin@demo.invalid", password: "AdminDemo!2026" } })).body.data;
    editor = (await call("/api/auth/login", { method: "POST", body: { email: "editor@demo.invalid", password: "EditorDemo!2026" } })).body.data;
});
after(async () => {
    globalThis.fetch = originalFetch; logOutput.write = originalLog; hooks.deregister();
    await new Promise(resolve => server.close(resolve));
    // Caminho conferido antes da remoção recursiva; nunca usa a pasta real.
    assert.match(path.basename(env.UPLOAD_ROOT), /^memoria-viva-demo-/);
    assert.equal(path.dirname(path.resolve(env.UPLOAD_ROOT)), path.resolve(tmpdir()));
    assert.notEqual(path.resolve(env.UPLOAD_ROOT), path.join(root, "uploads"));
    await fs.rm(env.UPLOAD_ROOT, { recursive: true, force: true });
});
async function call(url, { method = "GET", token, body, headers = {} } = {}) {
    const options = { method, headers: {
        ...(token && { authorization: `Bearer ${token}` }), ...(body && !(body instanceof FormData) && { "content-type": "application/json" }), ...headers,
    }, ...(body !== undefined && { body: body instanceof FormData ? body : JSON.stringify(body) }) };
    // fetch não permite sobrescrever Host; http.request reproduz o proxy Vite.
    const response = headers.Host ? await new Promise((resolve, reject) => {
        const request = http.request(origin + url, options, res => {
            const chunks = [];
            res.on("data", chunk => chunks.push(chunk)); res.on("error", reject);
            res.on("end", () => resolve(new Response(res.statusCode === 204 ? null : Buffer.concat(chunks), {
                status: res.statusCode, headers: res.headers,
            })));
        });
        request.on("error", reject); request.end(options.body);
    }) : await fetch(origin + url, options);
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : text };
}
async function data(url, options) {
    const result = await call(url, options); assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body.data;
}
const adminOptions = () => ({ token: admin.token });
const purl = n => `/api/admin/patrimonios/${fixtureId(100 + n)}`;
const upload = (field, bytes, type, name, fields = {}) => {
    const form = new FormData(); form.append(field, new Blob([bytes], { type }), name);
    Object.entries(fields).forEach(([k, v]) => form.append(k, String(v))); return form;
};
const png = await fs.readFile(new URL("../src/mock/assets/demonstracao.png", import.meta.url));

test("ausente, false e valores diferentes de true mantêm seleção/validação reais", () => {
    for (const flag of [undefined, "false", "TRUE", "1"]) {
        const config = flag === undefined ? {} : { MOCK_DATA: flag };
        const selection = run("const {MOCK_DATA}=await import('./src/config/runtime.js'); console.log(MOCK_DATA)", config);
        assert.equal(selection.status, 0, selection.stderr); assert.equal(selection.stdout.trim(), "false");
        const invalid = run("await import('./src/config/env.js')", config);
        assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /DATABASE_URL.*JWT_SECRET/);
    }
    const real = run(`import {registerHooks} from 'node:module';
        registerHooks({resolve(s,c,next){if(s.includes('/mock/'))throw Error('mock carregado no real');return next(s,c)}});
        const selected=await import('./src/services/index.js'); const actual=await import('./src/services/authService.js');
        if(selected.auth.login!==actual.login)throw Error('seleção incorreta');`,
    { MOCK_DATA: "false", DATABASE_URL: "postgresql://localhost:1/demo_selection_only", JWT_SECRET: realSecret });
    assert.equal(real.status, 0, real.stderr);
});

test("mock em production é recusado antes de configuração ou banco", () => {
    const result = run("await import('./src/app.js')", { MOCK_DATA: "true", NODE_ENV: "production" });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /MOCK_DATA=true não é permitido em production/);
});

test("servidor real inicia só com MOCK_DATA=true, sem banco, client Prisma ou credenciais", async () => {
    const child = spawn(process.execPath, ["--input-type=module"], { cwd: root, env: cleanEnv({ MOCK_DATA: "true" }), stdio: ["pipe", "pipe", "pipe"] });
    child.stdin.end(`import {registerHooks} from 'node:module';
        registerHooks({resolve(s,c,next){if(/^(@prisma\\/|pg$)/.test(s)||s.endsWith('/config/prisma.js'))throw Error('banco carregado');return next(s,c)}});
        await import('./src/server.js');`);
    let stdout = "", stderr = "";
    child.stdout.on("data", b => { stdout += b; }); child.stderr.on("data", b => { stderr += b; });
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`Inicialização excedeu tempo: ${stderr}`)), 15000);
            child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Servidor encerrou: ${code} ${stderr}`)); });
            child.stdout.on("data", () => { if (stdout.includes("SERVER_STARTED")) { clearTimeout(timeout); resolve(); } });
        });
        const response = await originalFetch("http://localhost:3333/api/health"); assert.equal(response.status, 200);
        assert.match(stderr, /MODO DEMONSTRAÇÃO.*dados fictícios.*temporário/);
        assert.doesNotMatch(stdout + stderr, /AdminDemo|EditorDemo|password|refreshToken|JWT_SECRET/);
    } finally {
        if (child.exitCode === null && child.signalCode === null) {
            const exited = new Promise(resolve => child.once("exit", resolve)); child.kill(); await exited;
        }
    }
});

test("fixtures coerentes, bcrypt, diretórios e assinatura ignoram configurações reais", async () => {
    assert.equal(env.DATABASE_URL, undefined); assert.notEqual(env.JWT_SECRET, realSecret);
    assert.equal(store.patrimonios.length, 20); assert.equal(store.exposicoes.length, 24); assert.equal(store.novidades.length, 24);
    assert.notEqual(env.UPLOAD_ROOT, process.env.UPLOAD_ROOT); assert.equal(env.UPLOAD_ROOT, env.UPLOAD_DIR);
    assert.equal(await verifyPassword("AdminDemo!2026", store.users[0].passwordHash), true);
    assert.equal(await verifyPassword("outro-password", await hashPassword("Exemplo!2026-demo")), false);
    const ids = new Set(store.patrimonios.map(p => p.id));
    for (const p of store.patrimonios) {
        assert.match(p.id, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
        assert.ok(store.categorias.some(c => c.id === p.categoriaId));
        assert.ok(p.regiaoId === null || store.regioes.some(r => r.id === p.regiaoId));
        p.ligacoes.forEach(l => assert.ok(ids.has(l.patrimonioDestinoId)));
    }
});

test("login, conta inativa, permissões, cache e CORS preservados", async () => {
    assert.equal(admin.user.role, "ADMIN"); assert.equal(editor.user.role, "EDITOR");
    for (const [email, password] of [["inativo@demo.invalid", "InativoDemo!2026"], ["admin@demo.invalid", "senha-errada"], ["ausente@demo.invalid", "AdminDemo!2026"]]) {
        assert.equal((await call("/api/auth/login", { method: "POST", body: { email, password } })).status, 401);
    }
    assert.equal((await call("/api/admins")).status, 401);
    assert.equal((await call("/api/admins", { token: editor.token })).status, 403);
    assert.equal((await call("/api/admin/auditoria", { token: editor.token })).status, 403);
    assert.equal((await call(purl(12) + "/publicar", { method: "PATCH", token: editor.token })).status, 403);
    assert.equal((await call(purl(0), { method: "PATCH", token: editor.token, body: { nome: "Não permitido" } })).status, 403);
    const response = await call("/api/admin/dashboard", { token: editor.token, headers: { Origin: "http://localhost:5173" } });
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.equal((await call("/api/patrimonios?campoInvalido=1")).status, 400);
});

test("tokens reais, sessões inventadas e tokens demo em outro processo são recusados", async () => {
    const payload = jwt.decode(admin.token);
    const realToken = jwt.sign({ tokenVersion: 0, sid: payload.sid }, realSecret, { subject: admin.user.id, expiresIn: 300 });
    assert.equal((await call("/api/admin/dashboard", { token: realToken })).status, 401);
    const inventedSession = jwt.sign({ tokenVersion: 0, sid: fixtureId(9999) }, env.JWT_SECRET, { subject: admin.user.id, expiresIn: 300 });
    assert.equal((await call("/api/admin/dashboard", { token: inventedSession })).status, 401);
    const result = run(`const {verifyToken}=await import('./src/utils/token.js');
        try{verifyToken(process.env.TEST_ACCESS_TOKEN);process.exitCode=2}catch(e){if(e.statusCode!==401)throw e}`, {
        DATABASE_URL: "postgresql://localhost:1/not-used", JWT_SECRET: realSecret, TEST_ACCESS_TOKEN: admin.token,
    });
    assert.equal(result.status, 0, result.stderr);
    const restarted = run(`const {verifyToken}=await import('./src/utils/token.js');const {refresh}=await import('./src/mock/auth.js');
        try{verifyToken(process.env.TEST_ACCESS_TOKEN);process.exitCode=2}catch(e){if(e.statusCode!==401)throw e}
        try{await refresh(process.env.TEST_REFRESH_TOKEN);process.exitCode=3}catch(e){if(e.statusCode!==401)throw e}`, {
        MOCK_DATA: "true", TEST_ACCESS_TOKEN: admin.token, TEST_REFRESH_TOKEN: admin.refreshToken,
    });
    assert.equal(restarted.status, 0, restarted.stderr);
});

test("rate limit de login permanece ativo no mock", () => {
    const result = run(`import assert from 'node:assert/strict';
        const {default:app}=await import('./src/app.js');const server=app.listen(0,'127.0.0.1');
        await new Promise(resolve=>server.once('listening',resolve));
        try{const url='http://127.0.0.1:'+server.address().port+'/api/auth/login';
            const options={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@demo.invalid',password:'errada'})};
            assert.equal((await fetch(url,options)).status,401);
            const response=await fetch(url,options);assert.equal(response.status,429);assert.ok(response.headers.get('retry-after'));
        }finally{await new Promise(resolve=>server.close(resolve));}`, {
        MOCK_DATA: "true", LOGIN_RATE_ACCOUNT_IP_MAX: "1", LOGIN_RATE_IP_MAX: "2",
    });
    assert.equal(result.status, 0, result.stderr);
});

test("refresh rotativo, detecção de reuso, expiração e logout revogam acesso", async () => {
    const login = async () => (await data("/api/auth/login", { method: "POST", body: { email: "editor@demo.invalid", password: "EditorDemo!2026" } }));
    const first = await login();
    const next = await data("/api/auth/refresh", { method: "POST", body: { refreshToken: first.refreshToken } });
    assert.notEqual(next.refreshToken, first.refreshToken);
    assert.equal((await call("/api/auth/refresh", { method: "POST", body: { refreshToken: first.refreshToken } })).status, 401);
    assert.equal((await call("/api/admin/dashboard", { token: next.token })).status, 401);
    const last = await login();
    const decoded = jwt.decode(last.token);
    const expired = jwt.sign({ tokenVersion: 0, sid: decoded.sid, exp: Math.floor(Date.now() / 1000) - 1 }, env.JWT_SECRET, { subject: last.user.id });
    const failure = await call("/api/admin/dashboard", { token: expired });
    assert.equal(failure.status, 401); assert.equal(failure.body.error.code, "ACCESS_TOKEN_EXPIRED");
    assert.equal((await call("/api/auth/logout", { method: "POST", body: { refreshToken: last.refreshToken } })).status, 200);
    assert.equal((await call("/api/admin/dashboard", { token: last.token })).status, 401);
    assert.equal((await call("/api/auth/refresh", { method: "POST", body: { refreshToken: last.refreshToken } })).status, 401);
});

test("busca em seções, filtros combinados, categoria adicional, paginação e detalhes públicos", async () => {
    const first = await data("/api/patrimonios?limite=5"), second = await data("/api/patrimonios?limite=5&pagina=2");
    assert.equal(first.paginacao.total, 12); assert.equal(first.paginacao.totalPaginas, 3);
    assert.ok(first.itens.every(p => !second.itens.some(s => s.id === p.id))); assert.equal(first.itens[0].numeroExibicao, 1);
    assert.equal((await data("/api/patrimonios?busca=Mem%C3%B3ria%20imagin%C3%A1ria")).paginacao.total, 12);
    const filtered = await data("/api/patrimonios?categoria=cultura&bairro=Centro&situacao=PRESERVADO&numeroExibicao=1");
    assert.equal(filtered.itens.length, 1); assert.equal(filtered.itens[0].id, fixtureId(100));
    const regional = await data("/api/patrimonios?regiao=norte-demo"); assert.ok(regional.itens.every(p => p.regiao.slug === "norte-demo"));
    const detail = await data("/api/patrimonios/espaco-imaginario-1-demo");
    assert.equal(detail.fatos.length, 1); assert.equal(detail.ligacoes.length, 1); assert.ok(detail.detalhes.length);
    assert.equal(detail.createdBy, undefined); assert.equal(detail.status, undefined);
    assert.equal((await call("/api/patrimonios/espaco-imaginario-13-demo")).status, 404);
    assert.equal((await call("/api/patrimonios/espaco-imaginario-18-demo")).status, 404);
    assert.equal((await call("/api/patrimonios/inexistente")).status, 404);
});

test("escritas, validação de relações/localização/número e consistência do dashboard", async () => {
    const before = await data("/api/admin/dashboard", adminOptions());
    assert.equal(before.total, 20); assert.equal(before.PUBLICADO, 12); assert.equal(before.RASCUNHO, 5); assert.equal(before.ARQUIVADO, 3);
    assert.equal(before.porCategoria.reduce((n, c) => n + c.quantidade, 0), before.total);
    assert.equal(before.porBairro.reduce((n, c) => n + c.quantidade, 0), before.total);
    assert.equal(before.porRegiao.reduce((n, c) => n + c.quantidade, before.semRegiao), before.total);
    const update = { nome: "Rascunho fictício editado", categoriasAdicionais: [fixtureId(11)], localizacao: { latitude: null, longitude: null } };
    assert.equal((await call(purl(12), { method: "PATCH", token: editor.token, body: update })).status, 200);
    assert.equal((await data(purl(12), adminOptions())).nome, update.nome);
    for (const body of [{ categoriaId: fixtureId(9999) }, { regiaoId: fixtureId(9999) }, { numeroExibicao: 1 },
        { categoriaId: fixtureId(11) }, { localizacao: { latitude: -23.45 } }]) {
        assert.ok([400, 404, 409].includes((await call(purl(12), { method: "PATCH", token: admin.token, body })).status));
    }
    const created = await call("/api/admin/patrimonios", { method: "POST", token: editor.token, body: {
        nome: "Novo espaço fictício", descricao: "Conteúdo de teste", descricaoResumida: "Resumo de teste", categoriaId: fixtureId(10),
    } });
    assert.equal(created.status, 201); assert.equal(created.body.data.status, "RASCUNHO");
    const after = await data("/api/admin/dashboard", adminOptions());
    assert.equal(after.total, 21); assert.equal(after.RASCUNHO, 6);
    assert.equal((await data("/api/admin/patrimonios?limite=100", adminOptions())).paginacao.total, after.total);
});

test("publicação e arquivamento mudam listagem, ligações, mídia e contagens", async () => {
    const before = await data("/api/admin/dashboard", adminOptions());
    assert.equal((await call(purl(12) + "/publicar", { method: "PATCH", token: admin.token })).status, 200);
    assert.equal((await call("/api/patrimonios/espaco-imaginario-13-demo")).status, 200);
    assert.equal((await data("/api/patrimonios/espaco-imaginario-12-demo")).ligacoes.length, 1);
    const published = await data("/api/admin/dashboard", adminOptions());
    assert.equal(published.PUBLICADO, before.PUBLICADO + 1); assert.equal(published.total, before.total);
    assert.equal((await data("/api/patrimonios?limite=100")).paginacao.total, published.PUBLICADO);
    const media = (await data(purl(12), adminOptions())).imagens[0].url;
    assert.equal((await call(media)).status, 200);
    assert.equal((await call(purl(12) + "/arquivar", { method: "PATCH", token: admin.token })).status, 200);
    assert.equal((await call("/api/patrimonios/espaco-imaginario-13-demo")).status, 404);
    assert.equal((await data("/api/patrimonios/espaco-imaginario-12-demo")).ligacoes.length, 0);
    assert.equal((await call(media)).status, 401);
    const archived = await data("/api/admin/dashboard", adminOptions());
    assert.equal(archived.PUBLICADO, before.PUBLICADO); assert.equal(archived.ARQUIVADO, before.ARQUIVADO + 1);
});

test("gestão de usuários, unicidade, status e preservação do último ADMIN", async () => {
    assert.equal((await call(`/api/admins/${admin.user.id}/status`, { method: "PATCH", token: admin.token, body: { ativo: false } })).body.error.code, "ADMIN_CANNOT_DEACTIVATE_SELF");
    assert.equal((await call(`/api/admins/${admin.user.id}`, { method: "PATCH", token: admin.token, body: { role: "EDITOR" } })).body.error.code, "ADMIN_CANNOT_DEMOTE_SELF");
    const body = { nome: "Pessoa fictícia temporária", email: "temporaria@demo.invalid", role: "EDITOR", password: "Temporaria!2026" };
    const created = await call("/api/admins", { method: "POST", token: admin.token, body }); assert.equal(created.status, 201);
    const id = created.body.data.id;
    assert.equal((await call("/api/admins", { method: "POST", token: admin.token, body })).status, 409);
    assert.equal((await data(`/api/admins/${id}`, adminOptions())).passwordHash, undefined);
    assert.equal((await data("/api/admins?busca=temporaria&role=EDITOR&ativo=true", adminOptions())).itens.length, 1);
    const session = await data("/api/auth/login", { method: "POST", body: { email: body.email, password: body.password } });
    await data(`/api/admins/${id}/status`, { method: "PATCH", token: admin.token, body: { ativo: false } });
    assert.equal((await call("/api/admin/dashboard", { token: session.token })).status, 401);
    await data(`/api/admins/${id}/status`, { method: "PATCH", token: admin.token, body: { ativo: true } });
    assert.equal((await data(`/api/admins/${id}`, adminOptions())).ativo, true);
});

test("regiões, fatos, ligações e reordenação gravam estado e respeitam permissões", async () => {
    assert.equal((await call("/api/admin/regioes", { method: "POST", token: editor.token, body: { nome: "Teste", slug: "teste" } })).status, 403);
    const r = await call("/api/admin/regioes", { method: "POST", token: admin.token, body: { nome: "Região fictícia nova", slug: "nova-demo" } }); assert.equal(r.status, 201);
    await data(`/api/admin/regioes/${r.body.data.id}`, { method: "PATCH", token: admin.token, body: { ativo: false } });
    assert.ok(!(await data("/api/regioes")).some(i => i.id === r.body.data.id));
    assert.equal((await call(purl(13), { method: "PATCH", token: admin.token, body: { regiaoId: r.body.data.id } })).status, 409);
    const base = purl(13);
    const fact = await call(base + "/fatos", { method: "POST", token: editor.token, body: { rotulo: "Novo fato fictício", valor: "Teste" } }); assert.equal(fact.status, 201);
    const facts = await data(base + "/fatos", { token: editor.token });
    assert.equal((await call(base + "/fatos", { method: "POST", token: editor.token, body: { rotulo: "Colisão", valor: "Teste", ordem: 0 } })).status, 409);
    const ids = facts.map(f => f.id).reverse();
    assert.deepEqual((await data(base + "/fatos/ordem", { method: "PATCH", token: editor.token, body: { ids } })).map(f => f.id), ids);
    assert.equal((await call(base + "/ligacoes", { method: "POST", token: editor.token, body: { patrimonioDestinoId: fixtureId(113), texto: "Inválida" } })).status, 400);
    const link = await call(base + "/ligacoes", { method: "POST", token: editor.token, body: { patrimonioDestinoId: fixtureId(100), texto: "Ligação fictícia" } }); assert.equal(link.status, 201);
    await data(base + `/ligacoes/${link.body.data.id}`, { method: "PATCH", token: editor.token, body: { texto: "Editada" } });
    await data(base + `/ligacoes/${link.body.data.id}`, { method: "DELETE", token: editor.token });
    await data(base + `/fatos/${fact.body.data.id}`, { method: "DELETE", token: editor.token });
});

test("exposições e novidades paginam, editam, publicam, arquivam e removem", async () => {
    for (const kind of ["exposicoes", "novidades"]) {
        const first = await data(`/api/${kind}?limite=3`), second = await data(`/api/${kind}?limite=3&pagina=2`);
        assert.equal(first.paginacao.total, 20); assert.ok(first.itens.every(r => !second.itens.some(s => s.id === r.id)));
        const draft = (await data(`/api/admin/${kind}?status=RASCUNHO`, adminOptions())).itens[0];
        await data(`/api/admin/${kind}/${draft.id}`, { method: "PATCH", token: editor.token, body: { titulo: "Conteúdo fictício editado" } });
        await data(`/api/admin/${kind}/${draft.id}/publicar`, { method: "PATCH", token: admin.token });
        assert.equal((await data(`/api/${kind}?busca=Conte%C3%BAdo%20fict%C3%ADcio%20editado`)).itens.length, 1);
        assert.equal((await call(`/api/admin/${kind}/${draft.id}`, { method: "PATCH", token: editor.token, body: { titulo: "Proibido" } })).status, 403);
        await data(`/api/admin/${kind}/${draft.id}/arquivar`, { method: "PATCH", token: admin.token });
        assert.equal((await data(`/api/${kind}?busca=Conte%C3%BAdo%20fict%C3%ADcio%20editado`)).itens.length, 0);
        await data(`/api/admin/${kind}/${draft.id}`, { method: "DELETE", token: admin.token });
        assert.equal((await call(`/api/admin/${kind}/${draft.id}`, adminOptions())).status, 404);
    }
    const body = { titulo: "Exposição fictícia nova", artista: "Coletivo fictício", local: "Galeria inventada", periodo: "Demo", bio: "Biografia fictícia" };
    const created = await call("/api/admin/exposicoes", { method: "POST", token: editor.token, body: upload("imagem", png, "image/png", "demo.png", body) });
    assert.equal(created.status, 201); assert.equal((await call(created.body.data.imagemUrl)).status, 401);
    assert.equal((await call(created.body.data.imagemUrl, adminOptions())).status, 200);
    assert.equal((await call("/api/admin/novidades", { method: "POST", token: admin.token, body: { tipo: "NOTICIA", titulo: "Teste", tag: "Demo", data: "2026-01-01", texto: "Teste" } })).status, 400);
    const news = await call("/api/admin/novidades", { method: "POST", token: editor.token, body: { tipo: "EVENTO", titulo: "Evento fictício", tag: "Demo", data: "2026-01-01", texto: "Teste" } });
    assert.equal(news.status, 201);
});

test("arquivos locais, uploads legados e novos, acesso por status e isolamento de disco", async () => {
    const pub = await data("/api/patrimonios/espaco-imaginario-1-demo");
    assert.equal((await call(pub.imagens[0].url)).status, 200);
    const doc = await call(pub.documentos[0].url); assert.equal(doc.status, 200); assert.match(doc.body, /ficticio/);
    assert.equal(doc.headers.get("content-disposition"), "attachment");
    const privateDoc = (await data(purl(15), adminOptions())).documentos[0];
    assert.equal((await call(privateDoc.url)).status, 401); assert.equal((await call(privateDoc.url, { token: editor.token })).status, 200);
    const old = await call(purl(0) + "/imagens", { method: "POST", token: editor.token, body: upload("imagem", png, "image/png", "demo.png", { principal: true }) });
    assert.equal(old.status, 201); assert.equal((await call(old.body.data.url)).status, 200);
    assert.equal((await data(purl(0), adminOptions())).imagens.filter(i => i.principal).length, 1);
    const modern = await call(purl(13) + "/imagens", { method: "POST", token: editor.token, body: upload("arquivo", png, "image/png", "demo.png", { textoAlternativo: "Demo" }) });
    assert.equal(modern.status, 201); assert.match(modern.body.data.url, /^\/api\/uploads\/imagens\//);
    assert.equal((await call(modern.body.data.url)).status, 401); assert.equal((await call(modern.body.data.url, adminOptions())).status, 200);
    assert.equal((await call(purl(13) + "/imagens", { method: "POST", token: editor.token, body: upload("imagem", "HTML inválido", "image/png", "false.png") })).status, 400);
    assert.equal((await call(purl(13) + "/imagens", { method: "POST", token: editor.token, body: upload("arquivo", png, "image/png", "demo.png") })).status, 400);
    assert.equal((await call(purl(13) + "/imagens", { method: "POST", token: editor.token,
        body: upload("arquivo", new Uint8Array(6 * 1024 * 1024), "image/png", "grande.png", { textoAlternativo: "Demo" }) })).status, 413);
    const pdf = await call(purl(13) + "/documentos", { method: "POST", token: editor.token, body: upload("arquivo", "%PDF-1.4\n% demo ficticio\n%%EOF", "application/pdf", "demo.pdf", { titulo: "PDF fictício", tipo: "ARQUIVO" }) });
    assert.equal(pdf.status, 201); assert.equal((await call(pdf.body.data.url, { token: editor.token })).status, 200);
    const reference = await call(purl(13) + "/referencias", { method: "POST", token: editor.token, body: upload("arquivo", "Documento fictício", "text/plain", "demo.txt", { descricao: "Demo" }) });
    assert.equal(reference.status, 201); assert.equal((await call(reference.body.data.url, adminOptions())).status, 200);
    const badName = await call(purl(13) + "/referencias", { method: "POST", token: editor.token, body: upload("arquivo", "Fictício", "text/plain", "../fora.txt") }); assert.equal(badName.status, 400);
    assert.equal((await call("/api/uploads/imagens/..%5C..%5Csegredo.png")).status, 400);
    assert.equal((await call(purl(0) + "/documentos", { method: "POST", token: editor.token, body: upload("arquivo", "%PDF-", "application/pdf", "x.pdf", { titulo: "Teste", tipo: "ARQUIVO" }) })).status, 403);
    await data(purl(13) + `/documentos/${pdf.body.data.id}`, { method: "PATCH", token: editor.token, body: { titulo: "PDF fictício editado" } });
    await data(purl(13) + `/documentos/${pdf.body.data.id}`, { method: "DELETE", token: admin.token });
    assert.equal((await call(pdf.body.data.url, adminOptions())).status, 404);
    await data(`/api/admin/patrimonios/imagens/${old.body.data.id}`, { method: "DELETE", token: admin.token });
    assert.equal((await call(old.body.data.url)).status, 404);
    const files = await fs.readdir(path.join(env.UPLOAD_ROOT, "imagens")); assert.equal(files.length, 1);
    assert.equal(await fs.stat(path.join(root, "uploads-never-use-demo")).then(() => true, () => false), false);
});

test("métricas preservam origem/CSRF e contam identidade, patrimônio e dia em memória", async () => {
    // O proxy Vite existente preserva o Host do frontend (changeOrigin:false).
    const headers = { Origin: "http://localhost:5173", Host: "localhost:5173", "X-Portal-Metricas": "1" };
    assert.equal((await call("/api/metricas/visualizacoes/sessao", { method: "POST", body: {} })).status, 403);
    assert.equal((await call("/api/metricas/visualizacoes/sessao", { method: "POST", headers: { ...headers, Origin: "https://evil.invalid" }, body: {} })).status, 403);
    const wrongHost = await call("/api/metricas/visualizacoes/sessao", { method: "POST", headers: { ...headers, Host: "localhost:3333" }, body: {} });
    assert.equal(wrongHost.status, 403); assert.equal(wrongHost.body.error.code, "TRANSPORTE_INVALIDO");
    const session = await call("/api/metricas/visualizacoes/sessao", { method: "POST", headers, body: {} }); assert.equal(session.status, 200);
    const Cookie = session.headers.get("set-cookie").split(";")[0];
    const view = () => call("/api/metricas/visualizacoes", { method: "POST", headers: { ...headers, Cookie }, body: { patrimonioId: fixtureId(100) } });
    assert.equal((await view()).status, 204); assert.equal((await view()).status, 204);
    const day = diaSaoPaulo(new Date()), metrics = await data(`/api/admin/dashboard/metricas?inicio=${day}&fim=${day}`, adminOptions());
    assert.equal(metrics.visualizacoes.totalRegistrado, "1"); assert.equal(metrics.visualizacoes.porPatrimonio.itens[0].quantidade, "1");
    const { validarMetricas } = await import("../../frontend/src/features/admin/metricasDashboard.js");
    assert.equal(validarMetricas(metrics), metrics); assert.equal(metrics.meta.observacao.tipo, "NAO_INSTRUMENTADA");
    assert.equal((await call("/api/metricas/visualizacoes", { method: "POST", headers: { ...headers, Cookie }, body: { patrimonioId: fixtureId(113) } })).status, 404);
});

test("troca de senha revoga JWT e refresh e registra auditoria sem segredo", async () => {
    const result = await call("/api/auth/senha", { method: "PATCH", token: editor.token, body: { senhaAtual: "EditorDemo!2026", novaSenha: "EditorDemoNova!2026" } }); assert.equal(result.status, 200);
    assert.equal((await call("/api/admin/dashboard", { token: editor.token })).status, 401);
    assert.equal((await call("/api/auth/refresh", { method: "POST", body: { refreshToken: editor.refreshToken } })).status, 401);
    assert.equal((await call("/api/auth/login", { method: "POST", body: { email: "editor@demo.invalid", password: "EditorDemo!2026" } })).status, 401);
    assert.equal((await call("/api/auth/login", { method: "POST", body: { email: "editor@demo.invalid", password: "EditorDemoNova!2026" } })).status, 200);
    const events = await data("/api/admin/auditoria?action=USER_PASSWORD_CHANGE", adminOptions()); assert.equal(events.itens.length, 1);
    const detail = await data(`/api/admin/auditoria/${events.itens[0].id}`, adminOptions()); assert.equal(detail.oldValues, null); assert.equal(detail.newValues, null);
});

test("auditoria em memória tem filtros, detalhes, paginação e registros administrativos", async () => {
    const all = await data("/api/admin/auditoria?limite=100", adminOptions()); assert.ok(all.itens.length >= 20);
    const events = await data(`/api/admin/auditoria?entity=Patrimonio&entityId=${fixtureId(112)}&limite=1`, adminOptions());
    assert.ok(events.paginacao.total >= 3); assert.equal(events.itens.length, 1);
    const first = await data(`/api/admin/auditoria/${fixtureId(1000)}`, adminOptions()); assert.match(first.newValues.nome, /demonstração/);
    const updates = await data(`/api/admin/auditoria?action=PATRIMONIO_UPDATE&entityId=${fixtureId(112)}`, adminOptions());
    const changed = await data(`/api/admin/auditoria/${updates.itens[0].id}`, adminOptions());
    assert.equal(changed.newValues.descricao, undefined); assert.ok(changed.newValues.nome);
    assert.equal((await call(`/api/admin/auditoria/${fixtureId(9999)}`, adminOptions())).status, 404);
    const log = logs.join(""); assert.match(log, /MOCK_ADMIN_CHANGE/); assert.match(log, /AUTHORIZATION_DENIED/);
    for (const secret of ["AdminDemo!2026", "EditorDemo!2026", "EditorDemoNova!2026", admin.token, admin.refreshToken, env.JWT_SECRET]) assert.ok(!log.includes(secret));
});
