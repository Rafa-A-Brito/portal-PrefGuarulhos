import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

process.env.DATABASE_URL = "postgresql://localhost:5432/test_admin_management";
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
const { Prisma } = await import("@prisma/client");
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const service = await import("../src/services/adminService.js");
const { generateToken } = await import("../src/utils/token.js");
const { hashPassword } = await import("../src/utils/password.js");
let server, base;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
});

const fields = ["id", "nome", "email", "role", "ativo", "criadoEm", "atualizadoEm"];
const selection = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true };
function user(name, role = "EDITOR", isActive = true) {
    return { id: randomUUID(), name, email: `${name.toLowerCase()}@example.test`, role, isActive,
        passwordHash: "secret-hash-never-returned", createdAt: new Date("2026-01-01Z"), updatedAt: new Date("2026-01-01Z") };
}
function safeDto(dto) {
    assert.deepEqual(Object.keys(dto).sort(), fields.slice().sort());
    assert.equal(typeof dto.criadoEm, "string");
    assert.equal(typeof dto.atualizadoEm, "string");
    assert.equal(JSON.stringify(dto).includes("secret-hash"), false);
}
function stub(t, target, method, implementation) {
    const original = target[method];
    target[method] = implementation;
    t.after(() => { target[method] = original; });
}
function setup(t, { actorRole = "ADMIN", otherRole = "EDITOR", otherActive = true } = {}) {
    const actor = user("Admin", actorRole);
    const other = user("Maria", otherRole, otherActive);
    const rows = [actor, other, user("Ana", "EDITOR", false)];
    let locked = false;
    let updates = 0;
    let lastList;
    const find = async ({ where }) => rows.find((row) => where.id
        ? row.id === where.id.toLowerCase() : row.email === where.email) ?? null;
    function matches(row, where = {}) {
        return (!where.role || row.role === where.role)
            && (where.isActive === undefined || row.isActive === where.isActive)
            && (!where.id?.not || row.id !== where.id.not)
            && (!where.OR || where.OR.some((condition) => Object.entries(condition).every(([field, filter]) => {
                assert.equal(filter.mode, "insensitive");
                return row[field].toLowerCase().includes(filter.contains.toLowerCase());
            })));
    }
    stub(t, prisma.user, "findUnique", find);
    stub(t, prisma.user, "count", async ({ where }) => rows.filter((row) => matches(row, where)).length);
    stub(t, prisma.user, "findMany", async (args) => {
        lastList = args;
        assert.deepEqual(args.select, selection);
        assert.deepEqual(args.orderBy, [{ name: "asc" }, { id: "asc" }]);
        return rows.filter((row) => matches(row, args.where))
            .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
            .slice(args.skip, args.skip + args.take);
    });
    const tx = { user: {
        findUnique: async (args) => { assert.ok(locked); assert.deepEqual(args.select, selection); return find(args); },
        count: async (args) => { assert.ok(locked); return prisma.user.count(args); },
        update: async ({ where, data, select }) => {
            assert.ok(locked);
            assert.deepEqual(select, selection);
            const row = await find({ where });
            if (data.email && rows.some((item) => item.id !== row.id && item.email === data.email)) {
                throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7.10.0" });
            }
            updates++;
            Object.assign(row, data, { updatedAt: new Date() });
            return row;
        },
    }, $queryRaw: async (strings, id) => {
        assert.match(strings.join("?"), /role = 'ADMIN' AND is_active = true/);
        assert.match(strings.join("?"), /ORDER BY id FOR UPDATE/);
        assert.equal(typeof id, "string");
        locked = true;
        return [];
    } };
    stub(t, prisma, "$transaction", async (callback, options) => {
        assert.equal(options.isolationLevel, "ReadCommitted");
        const snapshot = structuredClone(rows);
        try { return await callback(tx); }
        catch (error) { rows.splice(0, rows.length, ...snapshot); throw error; }
        finally { locked = false; }
    });
    return { actor, other, rows, token: generateToken(actor.id),
        get updates() { return updates; }, get lastList() { return lastList; } };
}
async function request(token, method = "GET", suffix = "", body) {
    const response = await fetch(`${base}/api/admins${suffix}`, {
        method, headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
        ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
}

for (const method of ["GET", "PATCH", "STATUS", "POST"]) {
    test(`${method}: exige token e ADMIN`, async (t) => {
        const mock = setup(t, { actorRole: "EDITOR" });
        const suffix = method === "PATCH" ? `/${mock.other.id}` : method === "STATUS" ? `/${mock.other.id}/status` : "";
        const verb = method === "STATUS" ? "PATCH" : method;
        assert.equal((await request(null, verb, suffix)).status, 401);
        assert.equal((await request(mock.token, verb, suffix)).status, 403);
        if (method === "GET") {
            assert.equal((await request(null, "GET", `/${mock.other.id}`)).status, 401);
            assert.equal((await request(mock.token, "GET", `/${mock.other.id}`)).status, 403);
        }
    });
}

test("lista ativos e inativos, pagina, filtra e busca nome/e-mail sem expor hash", async (t) => {
    const mock = setup(t);
    let result = await request(mock.token);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.itens.length, 3);
    assert.deepEqual(result.body.data.itens.map((item) => item.nome), ["Admin", "Ana", "Maria"]);
    assert.deepEqual(result.body.data.paginacao, { pagina: 1, limite: 20, total: 3, totalPaginas: 1 });
    result.body.data.itens.forEach(safeDto);
    assert.equal(mock.lastList.where.isActive, undefined);
    result = await request(mock.token, "GET", "?pagina=2&limite=1");
    assert.equal(result.body.data.itens[0].nome, "Ana");
    assert.deepEqual(result.body.data.paginacao, { pagina: 2, limite: 1, total: 3, totalPaginas: 3 });
    for (const query of ["busca=MARIA", "busca=MARIA%40EXAMPLE.TEST", "role=EDITOR&ativo=true"]) {
        result = await request(mock.token, "GET", `?${query}`);
        assert.deepEqual(result.body.data.itens.map((item) => item.id), [mock.other.id]);
    }
    result = await request(mock.token, "GET", "?ativo=false");
    assert.equal(result.body.data.itens[0].ativo, false);
    assert.equal(mock.lastList.where.isActive, false);
    result = await request(mock.token, "GET", "?role=ADMIN&ativo=false");
    assert.deepEqual(result.body.data.itens, []);
    assert.equal(result.body.data.paginacao.totalPaginas, 0);
    result = await request(mock.token, "GET", "?pagina=100");
    assert.deepEqual(result.body.data.itens, []);
});

test("consulta usuário inativo por UUID e nunca retorna credenciais", async (t) => {
    const mock = setup(t, { otherActive: false });
    const result = await request(mock.token, "GET", `/${mock.other.id}`);
    assert.equal(result.status, 200);
    safeDto(result.body.data);
    assert.equal(result.body.data.ativo, false);
});

test("valida UUID, usuário inexistente e filtros inválidos", async (t) => {
    const mock = setup(t);
    for (const [method, tail, body] of [["GET", "", undefined], ["PATCH", "", { nome: "Novo" }], ["PATCH", "/status", { ativo: false }]]) {
        assert.equal((await request(mock.token, method, `/invalido${tail}`, body)).status, 400);
        assert.equal((await request(mock.token, method, `/${randomUUID()}${tail}`, body)).status, 404);
    }
    for (const query of ["pagina=0", "pagina=1.5", "limite=101", "limite=0", "role=USER", "ativo=0", "ativo=", "ativo=TRUE", "busca=%20", "extra=1", "role=ADMIN&role=EDITOR"]) {
        assert.equal((await request(mock.token, "GET", `?${query}`)).status, 400, query);
    }
});

test("PATCH parcial preserva campos omitidos e normaliza nome/e-mail", async (t) => {
    const mock = setup(t);
    const original = { ...mock.other };
    let result = await request(mock.token, "PATCH", `/${mock.other.id}`, { nome: " Novo nome " });
    assert.equal(result.status, 200);
    safeDto(result.body.data);
    assert.equal(result.body.data.nome, "Novo nome");
    assert.equal(result.body.data.email, original.email);
    assert.equal(result.body.data.role, original.role);
    assert.equal(mock.other.passwordHash, original.passwordHash);
    result = await request(mock.token, "PATCH", `/${mock.other.id}`, { email: " NOVO@EXAMPLE.TEST " });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.email, "novo@example.test");
    assert.equal(result.body.data.nome, "Novo nome");
    result = await request(mock.token, "PATCH", `/${mock.actor.id}`, { nome: "Minha conta" });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.nome, "Minha conta");
});

test("PATCH recusa senha, situação, campos desconhecidos e corpo vazio antes de escrever", async (t) => {
    const mock = setup(t);
    for (const body of [{}, { nome: " " }, { email: "invalido" }, { role: "USER" },
        ...["password", "passwordHash", "ativo", "isActive", "id", "name", "criadoEm", "extra"].map((key) => ({ nome: "Novo", [key]: "valor" }))]) {
        assert.equal((await request(mock.token, "PATCH", `/${mock.other.id}`, body)).status, 400);
    }
    for (const body of [{}, { ativo: "false" }, { ativo: 0 }, { ativo: null }, { ativo: false, nome: "Novo" }]) {
        assert.equal((await request(mock.token, "PATCH", `/${mock.other.id}/status`, body)).status, 400);
    }
    assert.equal(mock.updates, 0);
});

test("PATCH traduz P2002 para ADMIN_ALREADY_EXISTS e preserva registro", async (t) => {
    const mock = setup(t);
    const result = await request(mock.token, "PATCH", `/${mock.other.id}`, { email: mock.actor.email.toUpperCase() });
    assert.equal(result.status, 409);
    assert.equal(result.body.error.code, "ADMIN_ALREADY_EXISTS");
    assert.equal(mock.rows.find((row) => row.id === mock.other.id).email, "maria@example.test");
});

test("auto-rebaixamento e auto-desativação retornam 409, inclusive UUID maiúsculo", async (t) => {
    const mock = setup(t);
    for (const id of [mock.actor.id, mock.actor.id.toUpperCase()]) {
        let result = await request(mock.token, "PATCH", `/${id}`, { role: "EDITOR" });
        assert.equal(result.status, 409);
        assert.equal(result.body.error.code, "ADMIN_CANNOT_DEMOTE_SELF");
        result = await request(mock.token, "PATCH", `/${id}/status`, { ativo: false });
        assert.equal(result.status, 409);
        assert.equal(result.body.error.code, "ADMIN_CANNOT_DEACTIVATE_SELF");
    }
    assert.equal(mock.updates, 0);
});

for (const operation of ["demote", "deactivate"]) {
    test(`último ADMIN ativo: ${operation} bloqueado dentro da transação`, async (t) => {
        const mock = setup(t, { otherRole: "ADMIN" });
        mock.actor.isActive = false; // Ator ficou indisponível após authenticate.
        await assert.rejects(operation === "demote"
            ? service.updateAdmin(mock.other.id, { role: "EDITOR" }, mock.actor)
            : service.changeAdminStatus(mock.other.id, false, mock.actor),
        { statusCode: 409, code: "LAST_ACTIVE_ADMIN" });
        assert.equal(mock.updates, 0);
    });
    test(`outro ADMIN pode sofrer ${operation} se restar um ADMIN ativo`, async (t) => {
        const mock = setup(t, { otherRole: "ADMIN" });
        const result = operation === "demote"
            ? await request(mock.token, "PATCH", `/${mock.other.id}`, { role: "EDITOR" })
            : await request(mock.token, "PATCH", `/${mock.other.id}/status`, { ativo: false });
        assert.equal(result.status, 200);
        safeDto(result.body.data);
        assert.equal(mock.rows.filter((row) => row.role === "ADMIN" && row.isActive).length, 1);
    });
}

test("ADMIN inativo não conta como disponível; rebaixá-lo não remove ADMIN ativo", async (t) => {
    const mock = setup(t, { otherRole: "ADMIN", otherActive: false });
    const result = await request(mock.token, "PATCH", `/${mock.other.id}`, { role: "EDITOR" });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.ativo, false);
    assert.equal(mock.actor.isActive, true);
});

test("status é idempotente, preserva atualizadoEm e permite reativação", async (t) => {
    const mock = setup(t);
    const target = `/${mock.other.id}/status`;
    let result = await request(mock.token, "PATCH", target, { ativo: true });
    assert.equal(result.status, 200);
    assert.equal(mock.updates, 0);
    result = await request(mock.token, "PATCH", target, { ativo: false });
    const first = result.body.data;
    result = await request(mock.token, "PATCH", target, { ativo: false });
    assert.deepEqual(result.body.data, first);
    assert.equal(mock.updates, 1);
    result = await request(mock.token, "PATCH", target, { ativo: true });
    assert.equal(result.body.data.ativo, true);
    assert.equal(mock.updates, 2);
});

test("desativação bloqueia login e JWT já emitido; rebaixamento retira autorização", async (t) => {
    const mock = setup(t, { otherRole: "ADMIN" });
    const password = "senha-segura-123";
    mock.other.passwordHash = await hashPassword(password);
    const login = () => fetch(`${base}/api/auth/login`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: mock.other.email, password }),
    });
    const logged = await login();
    assert.equal(logged.status, 200);
    const token = (await logged.json()).data.token;
    assert.equal((await request(token)).status, 200);
    assert.equal((await request(mock.token, "PATCH", `/${mock.other.id}/status`, { ativo: false })).status, 200);
    assert.equal((await login()).status, 401);
    assert.equal((await request(token)).status, 401);
    assert.equal((await request(mock.token, "PATCH", `/${mock.other.id}/status`, { ativo: true })).status, 200);
    assert.equal((await request(token)).status, 200);
    assert.equal((await request(mock.token, "PATCH", `/${mock.other.id}`, { role: "EDITOR" })).status, 200);
    assert.equal((await request(token)).status, 403);
});

test("DELETE não existe e não remove usuário", async (t) => {
    const mock = setup(t);
    assert.equal((await request(mock.token, "DELETE", `/${mock.other.id}`)).status, 404);
    assert.equal((await request(mock.token, "DELETE")).status, 404);
    assert.equal(mock.rows.length, 3);
    assert.equal(mock.updates, 0);
});