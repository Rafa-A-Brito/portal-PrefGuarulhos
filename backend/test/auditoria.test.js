import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { Prisma } from "@prisma/client";
import { registrarAuditoria, auditValues, AUDIT_ACTIONS as A, AUDIT_ENTITIES as E } from "../src/utils/auditoria.js";
import { logOutput } from "../src/utils/logger.js";

process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/auditoria_test";
process.env.JWT_SECRET = "auditoria-test-secret-at-least-32-characters";
const { default: prisma } = await import("../src/config/prisma.js");
const { default: app } = await import("../src/app.js");
const users = await import("../src/services/adminService.js");
const { salvarRegiao } = await import("../src/services/regiaoService.js");
const { generateToken } = await import("../src/utils/token.js");
const actor = { id: randomUUID(), name: "Responsável", email: "admin@example.test", role: "ADMIN", isActive: true, tokenVersion: 0,
    authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }] };
let server, base;
before(async () => { server = app.listen(0); await new Promise(r => server.once("listening", r)); base = `http://127.0.0.1:${server.address().port}/api`; });
after(async () => { await new Promise(r => server.close(r)); await prisma.$disconnect(); });
function stub(t, target, method, fn) { const original = target[method]; target[method] = fn; t.after(() => { target[method] = original; }); }
function recorder() { const events = []; return { events, tx: { auditLog: { create: async ({ data }) => { events.push(data); return data; } } } }; }
const event = extra => ({ userId: actor.id, action: A.USER_UPDATE, entity: E.USER, entityId: randomUUID(), ...extra });

test("utilitário exige a transação, atribui ator/alvo e registra apenas diferenças permitidas", async () => {
    const { tx, events } = recorder();
    const data = event({ before: { name: "Maria", email: "m@example.test", role: "EDITOR", passwordHash: "hash-antigo", token: "segredo" },
        after: { name: "Mariana", email: "m@example.test", role: "ADMIN", passwordHash: "hash-novo", refreshToken: "segredo" } });
    await registrarAuditoria(tx, data);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { userId: actor.id, entityId: data.entityId, entity: E.USER, action: A.USER_UPDATE,
        oldValues: { name: "Maria", role: "EDITOR" }, newValues: { name: "Mariana", role: "ADMIN" } });
});

test("omissão, null e texto preenchido permanecem distintos; localização contém só diferenças", async () => {
    const { tx, events } = recorder();
    await registrarAuditoria(tx, event({ entity: E.PATRIMONIO, action: A.PATRIMONIO_UPDATE,
        before: { historia: "História", descricao: "Preservada", localizacao: { latitude: new Prisma.Decimal("-23.0000001"), bairro: "Centro" } },
        after: { historia: null, descricao: "Preservada", localizacao: { latitude: null, bairro: "Centro" } } }));
    assert.deepEqual(events[0].oldValues, { historia: "História", localizacao: { latitude: "-23.0000001" } });
    assert.deepEqual(events[0].newValues, { historia: null, localizacao: { latitude: null } });
    assert.deepEqual(auditValues(E.REGIAO, { nome: undefined, descricao: null }), { descricao: null });
    assert.deepEqual(auditValues(E.REGIAO, { nome: "", descricao: "" }), { nome: "", descricao: "" });
});

test("no-op ignora timestamps, segredos e ordenação de categorias", async () => {
    const { tx, events } = recorder();
    const ids = [randomUUID(), randomUUID()];
    const before = { nome: "Igreja", categoriasAdicionais: ids, updatedAt: new Date(0) };
    const after = { nome: "Igreja", categoriasAdicionais: ids.slice().reverse(), updatedAt: new Date(), password: "segredo" };
    assert.equal(await registrarAuditoria(tx, event({ entity: E.PATRIMONIO, action: A.PATRIMONIO_UPDATE, before, after })), null);
    assert.equal(events.length, 0);
});

test("criação/exclusão de mídia preservam identificação e datas sem binários/caminhos internos ou credenciais em URLs", async () => {
    const { tx, events } = recorder();
    const row = { id: randomUUID(), patrimonioId: randomUUID(), titulo: "Inventário", dataDocumento: new Date("2026-10-01Z"),
        url: "https://usuario:senha@example.test/fonte?token=segredo#segredo", path: "C:\\servidor\\privado", buffer: Buffer.from("binário"), mimeType: "application/pdf" };
    await registrarAuditoria(tx, event({ action: A.DOCUMENTO_CREATE, entity: E.DOCUMENTO, entityId: row.id, after: row }));
    await registrarAuditoria(tx, event({ action: A.DOCUMENTO_DELETE, entity: E.DOCUMENTO, entityId: row.id, before: row }));
    assert.equal(events[0].entityId, row.id); assert.equal(events[0].newValues.patrimonioId, row.patrimonioId);
    assert.equal(events[0].newValues.url, "https://example.test/fonte");
    assert.equal(events[0].newValues.dataDocumento, "2026-10-01T00:00:00.000Z");
    assert.deepEqual(events[0].newValues, events[1].oldValues);
    assert.equal(Object.hasOwn(events[0], "oldValues"), false); assert.equal(Object.hasOwn(events[1], "newValues"), false);
    assert.doesNotMatch(JSON.stringify(events), /senha|segredo|servidor|binário|buffer/);
    assert.deepEqual(auditValues(E.IMAGEM, { url: "file:///C:/privado/a.png" }), {});
    assert.deepEqual(auditValues(E.IMAGEM, { url: "/etc/passwd" }), {});
});

test("senha registra somente ocorrência e campos de autenticação nunca são serializados", async () => {
    const { tx, events } = recorder();
    await registrarAuditoria(tx, event({ action: A.USER_PASSWORD_CHANGE }));
    assert.equal(Object.hasOwn(events[0], "oldValues"), false); assert.equal(Object.hasOwn(events[0], "newValues"), false);
    assert.deepEqual(auditValues(E.USER, { password: "senha", senhaAtual: "senha", novaSenha: "senha", passwordHash: "hash", token: "token", refreshToken: "refresh", tokenHash: "hash", cookies: "cookie", authorization: "Bearer segredo" }), {});
});

test("alteração somente em parâmetros removidos de URL ainda registra ocorrência sem segredos", async () => {
    const { tx, events } = recorder();
    await registrarAuditoria(tx, event({ action: A.DOCUMENTO_UPDATE, entity: E.DOCUMENTO,
        before: { fonte: "https://example.test/fonte?token=antigo" }, after: { fonte: "https://example.test/fonte?token=novo" } }));
    assert.equal(events.length, 1); assert.deepEqual(events[0].oldValues, { fonte: "https://example.test/fonte" });
    assert.deepEqual(events[0].newValues, { fonte: "https://example.test/fonte" });
    assert.doesNotMatch(JSON.stringify(events), /token=|antigo|novo/);
});

test("falha na auditoria propaga o mesmo erro mesmo com logger quebrado", async t => {
    const error = new Error("SQL e credenciais que não devem aparecer");
    stub(t, logOutput, "write", () => { throw new Error("sink indisponível"); });
    await assert.rejects(registrarAuditoria({ auditLog: { create: async () => { throw error; } } }, event({ after: { name: "Novo" } })), e => e === error);
});

test("região mantém códigos existentes, não duplica e ignora edição idêntica", async t => {
    const { tx, events } = recorder(); let row;
    tx.$queryRaw = async () => [];
    tx.regiaoPatrimonio = {
        create: async ({ data }) => (row = { id: randomUUID(), ...data }), findUnique: async () => row,
        update: async ({ data }) => (row = { ...row, ...data }),
    };
    stub(t, prisma, "$transaction", async cb => cb(tx));
    await salvarRegiao(null, { nome: "Centro", slug: "centro", descricao: null, ativo: true }, actor);
    await salvarRegiao(row.id, { descricao: "Referência" }, actor);
    await salvarRegiao(row.id, { descricao: "Referência" }, actor);
    assert.deepEqual(events.map(e => e.action), ["REGIAO_CREATE", "REGIAO_UPDATE"]);
    assert.ok(events.every(e => e.entity === "RegiaoPatrimonio" && e.userId === actor.id));
    assert.deepEqual(events[1].oldValues, { descricao: null }); assert.deepEqual(events[1].newValues, { descricao: "Referência" });
});

test("edição própria e de outro usuário distinguem responsável do alvo; perfil gera um só evento", async t => {
    const { tx, events } = recorder(); let row = { ...actor };
    tx.$queryRaw = async () => [];
    tx.user = { findUnique: async () => row, count: async () => 2,
        update: async ({ data }) => (row = { ...row, ...data }) };
    stub(t, prisma, "$transaction", async cb => cb(tx));
    await users.updateAdmin(actor.id, { nome: "Nome novo" }, actor);
    assert.equal(events[0].entityId, actor.id); assert.equal(events[0].userId, actor.id);
    row = { id: randomUUID(), name: "Maria", email: "m@example.test", role: "EDITOR", isActive: true };
    await users.updateAdmin(row.id, { nome: "Mariana", email: "mariana@example.test", role: "ADMIN" }, actor);
    assert.equal(events.length, 2); assert.equal(events[1].entityId, row.id); assert.equal(events[1].userId, actor.id);
    assert.deepEqual(events[1].oldValues, { name: "Maria", email: "m@example.test", role: "EDITOR" });
    await users.updateAdmin(row.id, { nome: "Mariana" }, actor); assert.equal(events.length, 2);
    await users.changeAdminStatus(row.id, false, actor); await users.changeAdminStatus(row.id, false, actor);
    await users.changeAdminStatus(row.id, true, actor);
    assert.deepEqual(events.slice(2).map(e => e.action), [A.USER_DEACTIVATE, A.USER_ACTIVATE]);
});

test("criação obtém ator do backend e não gera sucesso se a escrita falha", async t => {
    const { tx, events } = recorder();
    tx.user = { create: async ({ data }) => ({ id: randomUUID(), ...data }) };
    stub(t, prisma, "$transaction", async cb => cb(tx));
    const data = { nome: "Conta", email: "conta@example.test", role: "EDITOR", password: "SenhaSegura123!", userId: randomUUID() };
    await users.createAdmin(data, actor); assert.equal(events[0].userId, actor.id);
    assert.deepEqual(events[0].newValues, { name: "Conta", email: "conta@example.test", role: "EDITOR", isActive: true });
    tx.user.create = async () => { throw new Error("escrita recusada"); };
    await assert.rejects(users.createAdmin(data, actor), /escrita recusada/); assert.equal(events.length, 1);
});

function apiFixture(t, role = "ADMIN", active = true) {
    let query;
    stub(t, prisma.user, "findUnique", async () => ({ ...actor, role, isActive: active }));
    stub(t, prisma.auditLog, "count", async () => 0);
    stub(t, prisma.auditLog, "findMany", async args => { query = args; return []; });
    stub(t, prisma.auditLog, "findUnique", async () => null);
    stub(t, prisma, "$transaction", async (queries, options) => { assert.equal(options.isolationLevel, "RepeatableRead"); return Promise.all(queries); });
    const token = generateToken(actor.id, 0, actor.id);
    return { query: () => query, call: (path = "", auth = token) => fetch(base + "/admin/auditoria" + path, { headers: auth ? { authorization: "Bearer " + auth } : {} }) };
}

test("consulta ADMIN: defaults, filtros, ordem estável, limite e ausência de valores na lista", async t => {
    const f = apiFixture(t); let res = await f.call();
    assert.equal(res.status, 200); assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal((await res.json()).data.itens.length, 0);
    assert.equal(f.query().take, 20); assert.equal(f.query().skip, 0);
    assert.deepEqual(f.query().orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
    assert.equal(Object.hasOwn(f.query().select, "oldValues"), false);
    const id = randomUUID();
    res = await f.call(`?userId=${actor.id}&entity=Patrimonio&entityId=${id}&action=PATRIMONIO_UPDATE&inicio=2026-10-01T00:00:00Z&fim=2026-10-26T23:59:59Z&pagina=3&limite=100`);
    assert.equal(res.status, 200); assert.equal(f.query().skip, 200); assert.equal(f.query().take, 100);
    assert.deepEqual(f.query().where, { userId: actor.id, entity: "Patrimonio", entityId: id, action: "PATRIMONIO_UPDATE",
        createdAt: { gte: new Date("2026-10-01Z"), lte: new Date("2026-10-26T23:59:59Z") } });
});

for (const [role, active, auth, status] of [["EDITOR", true, true, 403], ["ADMIN", false, true, 401], ["ADMIN", true, false, 401]]) {
    test(`consulta e detalhe recusam role=${role}, ativo=${active}, autenticação=${auth}`, async t => {
        const f = apiFixture(t, role, active);
        for (const path of ["", "/" + randomUUID()]) {
            const res = await f.call(path, auth ? undefined : null);
            assert.equal(res.status, status); assert.equal(res.headers.get("cache-control"), "private, no-store");
        }
    });
}

test("consulta recusa parâmetros inválidos e retorna 404 para evento inexistente", async t => {
    const f = apiFixture(t);
    for (const q of ["pagina=0", "pagina=-1", "pagina=1.1", "pagina=1000001", "limite=101", "limite=", "pagina=1&pagina=2", "userId=inválido", "entityId=abc", "action[]=USER_CREATE", "action=bad%0Avalue", "inicio=2026-02-30T00:00:00Z", "inicio=2026-01-01", "inicio=2026-10-02T00:00:00Z&fim=2026-10-01T00:00:00Z", "extra=valor"]) {
        assert.equal((await f.call("?" + q)).status, 400, q);
    }
    assert.equal((await f.call("/abc")).status, 400);
    assert.equal((await f.call("/" + randomUUID())).status, 404);
});

test("detalhe filtra campos antigos e trata responsável ausente", async t => {
    const f = apiFixture(t); const id = randomUUID();
    stub(t, prisma.auditLog, "findUnique", async () => ({ id, userId: null, user: null, action: A.USER_UPDATE, entity: E.USER, entityId: randomUUID(), createdAt: new Date(),
        oldValues: { name: "Antigo", passwordHash: "segredo", token: "segredo" }, newValues: { name: "Novo", password: "segredo" } }));
    const res = await f.call("/" + id); assert.equal(res.status, 200);
    const body = await res.json(); assert.equal(body.data.user, null);
    assert.deepEqual(body.data.oldValues, { name: "Antigo" }); assert.deepEqual(body.data.newValues, { name: "Novo" });
    assert.doesNotMatch(JSON.stringify(body), /segredo|password|token/);
});

test("erros do parser na auditoria também recebem Cache-Control privado e requestId", async () => {
    const res = await fetch(base + "/admin/auditoria", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    assert.equal(res.status, 400); assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.match(res.headers.get("x-request-id"), /^[a-f\d-]{36}$/);
});
