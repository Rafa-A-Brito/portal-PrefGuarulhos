import { mockAuditLog } from "./auditoriaFixture.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";

process.env.DATABASE_URL = "postgresql://localhost:5432/test_patrimonio";
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
const { default: app } = await import("../src/app.js");
const { default: prisma } = await import("../src/config/prisma.js");
const { generateToken } = await import("../src/utils/token.js");
const schemas = await import("../src/schemas/patrimonioSchema.js");
const service = await import("../src/services/patrimonioService.js");
let server, base;
before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
});
const admin = { id: randomUUID(), role: "ADMIN", authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }], tokenVersion: 0, isActive: true };
const editor = { id: randomUUID(), role: "EDITOR", authSessions: [{ tokenVersion: 0, expiresAt: new Date("2037-01-01"), revokedAt: null }], tokenVersion: 0, isActive: true };
function stub(t, target, method, implementation) {
    const original = target[method];
    target[method] = implementation;
    t.after(() => {
        target[method] = original;
    });
}
const record = (extra = {}) => ({
    id: randomUUID(),
    nome: "Igreja",
    slug: "igreja",
    descricao: "Descrição",
    descricaoResumida: "Resumo",
    categoriaId: randomUUID(),
    situacao: "PRESERVADO",
    statusVisitacao: "NAO_INFORMADO",
    motivoRestricao: null,
    previsaoReabertura: null,
    status: "RASCUNHO",
    historia: null,
    importanciaCultural: null,
    localizacao: null,
    publicadoEm: null,
    arquivadoEm: null,
    imagens: [{ id: randomUUID() }],
    documentos: [{ id: randomUUID() }],
    ...extra,
});
function database(t, initial = record()) {
    let state = initial;
    const writes = [];
    let locks = 0;
    const events = [];
    const tx = { auditLog: mockAuditLog(events),
        $executeRaw: async (query) => {
            assert.match(query.join(""), /pg_advisory_xact_lock\(73033, 1\)/);
            return 1;
        },
        $queryRaw: async () => {
            locks++;
            return [];
        },
        categoria: { findUnique: async ({ where }) => ({ id: where.id }) },
        patrimonio: {
            aggregate: async () => ({ _max: {
                numeroExibicao: state?.numeroExibicao ?? null,
                ordemExibicao: state?.ordemExibicao ?? null,
            } }),
            findUnique: async () => state,
            update: async ({ data }) => {
                writes.push(data);
                const { localizacao, ...fields } = data;
                state = { ...state, ...fields };
                if (localizacao)
                    state.localizacao = localizacao.create ?? {
                        ...state.localizacao,
                        ...localizacao.update,
                    };
                return state;
            },
        },
    };
    stub(t, prisma, "$transaction", async (fn) => fn(tx));
    stub(t, prisma.patrimonio, "findUnique", async () => state);
    stub(t, prisma.user, "findUnique", async ({ where }) =>
        where.id === admin.id ? admin : editor
    );
    return { tx, writes, events, state: () => state, locks: () => locks };
}
async function request(path, { user, method = "GET", body } = {}) {
    const response = await fetch(`${base}${path}`, {
        method,
        headers: {
            ...(user && { authorization: `Bearer ${generateToken(user.id, 0, user.id)}` }),
            ...(body !== undefined && { "content-type": "application/json" }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
}

test("schemas parciais não introduzem defaults e recusam campos vazios/protegidos", () => {
    assert.deepEqual(schemas.updatePatrimonioSchema.parse({ nome: " Novo " }), { nome: "Novo" });
    assert.deepEqual(schemas.updatePatrimonioSchema.parse({ localizacao: { bairro: "Centro" } }), {
        localizacao: { bairro: "Centro" },
    });
    for (const body of [
        {},
        { localizacao: {} },
        { nome: " " },
        { categoriaId: "123" },
        { localizacao: { latitude: 91 } },
        ...[
            "id",
            "slug",
            "status",
            "createdBy",
            "updatedBy",
            "createdAt",
            "updatedAt",
            "publicadoEm",
            "arquivadoEm",
            "imagens",
            "documentos",
        ].map((key) => ({ [key]: "x" })),
        { localizacao: { id: randomUUID() } },
    ]) {
        assert.equal(
            schemas.updatePatrimonioSchema.safeParse(body).success,
            false,
            JSON.stringify(body)
        );
    }
    assert.equal(
        schemas.adminListPatrimoniosQuerySchema.safeParse({ status: "OUTRO" }).success,
        false
    );
    assert.equal(
        schemas.listPatrimoniosQuerySchema.safeParse({ status: "RASCUNHO" }).success,
        false
    );
});

test("visitação valida enum, texto simples e dias reais, sem defaults no PATCH", () => {
    const valid = { nome: "Bem", descricao: "Descrição", descricaoResumida: "Resumo", categoriaId: randomUUID() };
    assert.equal(schemas.createPatrimonioSchema.parse({ ...valid, situacao: "EM_RESTAURACAO" }).statusVisitacao, "NAO_INFORMADO");
    for (const statusVisitacao of ["ABERTO", "ACESSO_PARCIAL", "TEMPORARIAMENTE_FECHADO", "SEM_VISITACAO_PUBLICA", "NAO_INFORMADO"]) {
        assert.equal(schemas.createPatrimonioSchema.parse({ ...valid, statusVisitacao }).statusVisitacao, statusVisitacao);
    }
    for (const previsaoReabertura of ["2028-02-29", "2027-03-15", "0001-01-01", "9999-12-31"]) {
        assert.equal(schemas.updatePatrimonioSchema.parse({ previsaoReabertura }).previsaoReabertura, previsaoReabertura);
    }
    for (const body of [
        { statusVisitacao: "FECHADO" }, { statusVisitacao: null },
        { motivoRestricao: " " }, { motivoRestricao: "x".repeat(2001) }, { motivoRestricao: {} },
        ...["2027-02-29", "2026-04-31", "1900-02-29", "0000-01-01", "2027-13-01", "2027-00-10", "2027-01-00", "2027-2-01", "15/03/2027", "2027-03-15T00:00:00Z", " 2027-03-15", 123]
            .map(previsaoReabertura => ({ previsaoReabertura })),
    ]) {
        assert.equal(schemas.updatePatrimonioSchema.safeParse(body).success, false, JSON.stringify(body));
        assert.equal(schemas.createPatrimonioSchema.safeParse({ ...valid, ...body }).success, false, JSON.stringify(body));
    }
    assert.deepEqual(schemas.updatePatrimonioSchema.parse({ motivoRestricao: " <b>Reforma</b> " }), { motivoRestricao: "<b>Reforma</b>" });
    assert.deepEqual(schemas.updatePatrimonioSchema.parse({ motivoRestricao: null, previsaoReabertura: null }), { motivoRestricao: null, previsaoReabertura: null });
});

test("cadastro administrativo grava visitação explícita e não deduz fechamento da conservação", async (t) => {
    const db = database(t);
    db.tx.patrimonio.findUnique = async () => null;
    db.tx.patrimonio.create = async ({ data }) => record(data);
    const body = { nome: "Espaço fictício", descricao: "Descrição", descricaoResumida: "Resumo", categoriaId: randomUUID(), situacao: "EM_RESTAURACAO" };
    for (const visitacao of [{}, { statusVisitacao: "TEMPORARIAMENTE_FECHADO" }, {
        statusVisitacao: "ACESSO_PARCIAL", motivoRestricao: "Obras", previsaoReabertura: "2028-02-29",
    }]) {
        const result = await request("/admin/patrimonios", { user: editor, method: "POST", body: { ...body, ...visitacao } });
        assert.equal(result.status, 201);
        assert.equal(result.body.data.statusVisitacao, visitacao.statusVisitacao ?? "NAO_INFORMADO");
        assert.equal(result.body.data.previsaoReabertura, visitacao.previsaoReabertura ?? null);
        assert.equal(result.body.data.motivoRestricao, visitacao.motivoRestricao ?? null);
        assert.equal(result.body.data.situacao, "EM_RESTAURACAO");
        assert.equal(result.body.data.status, "RASCUNHO");
        assert.equal(db.events.at(-1).newValues.statusVisitacao, result.body.data.statusVisitacao);
    }
});

test("PATCH preserva visitação omitida, permite null e audita restrições sem exigir motivo ou previsão", async (t) => {
    const db = database(t, record({ statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Reforma", previsaoReabertura: new Date("2027-03-15T00:00:00.000Z") }));
    const url = `/admin/patrimonios/${db.state().id}`;
    const patch = body => request(url, { user: editor, method: "PATCH", body });
    const partial = await patch({ nome: "Nome revisado", situacao: "PRESERVADO" });
    assert.equal(partial.status, 200);
    assert.equal(partial.body.data.statusVisitacao, "TEMPORARIAMENTE_FECHADO");
    assert.equal(partial.body.data.motivoRestricao, "Reforma");
    assert.equal(partial.body.data.previsaoReabertura, "2027-03-15");
    for (const key of ["statusVisitacao", "motivoRestricao", "previsaoReabertura"]) assert.equal(Object.hasOwn(db.writes.at(-1), key), false);
    assert.equal((await patch({ motivoRestricao: null })).status, 200);
    assert.equal(db.state().motivoRestricao, null);
    assert.equal(db.state().previsaoReabertura.toISOString(), "2027-03-15T00:00:00.000Z");
    assert.equal((await patch({ previsaoReabertura: null })).status, 200);
    assert.equal(db.events.at(-1).oldValues.previsaoReabertura, "2027-03-15");
    assert.equal(db.events.at(-1).newValues.previsaoReabertura, null);
    for (const statusVisitacao of ["ACESSO_PARCIAL", "SEM_VISITACAO_PUBLICA", "TEMPORARIAMENTE_FECHADO"]) {
        assert.equal((await patch({ statusVisitacao })).status, 200);
        assert.equal(db.state().motivoRestricao, null);
        assert.equal(db.state().previsaoReabertura, null);
    }
    const result = await patch({ motivoRestricao: " Reforma ", previsaoReabertura: "2028-02-29" });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.previsaoReabertura, "2028-02-29");
    assert.equal(result.body.data.motivoRestricao, "Reforma");
    assert.equal(db.writes.at(-1).previsaoReabertura.toISOString(), "2028-02-29T00:00:00.000Z");
    assert.equal(db.events.at(-1).newValues.previsaoReabertura, "2028-02-29");
    const before = db.writes.length;
    assert.equal((await patch({ previsaoReabertura: "2027-02-29" })).status, 400);
    assert.equal((await patch({ statusVisitacao: "INVALIDO" })).status, 400);
    assert.equal(db.writes.length, before);
});

test("ABERTO e NAO_INFORMADO limpam o aviso na mesma escrita e na auditoria", async (t) => {
    const db = database(t, record({ status: "PUBLICADO", situacao: "EM_RESTAURACAO" }));
    const url = `/admin/patrimonios/${db.state().id}`;
    const patch = body => request(url, { user: admin, method: "PATCH", body });
    for (const statusVisitacao of ["ABERTO", "NAO_INFORMADO"]) {
        await patch({ statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Reforma", previsaoReabertura: "2027-03-15" });
        const before = db.writes.length;
        const result = await patch({ statusVisitacao, motivoRestricao: "Aviso antigo", previsaoReabertura: "2027-03-15" });
        assert.equal(result.status, 200);
        assert.equal(db.writes.length, before + 1);
        assert.deepEqual(db.writes.at(-1), { statusVisitacao, motivoRestricao: null, previsaoReabertura: null, updatedBy: admin.id });
        assert.equal(result.body.data.motivoRestricao, null);
        assert.equal(result.body.data.previsaoReabertura, null);
        assert.equal(result.body.data.status, "PUBLICADO");
        assert.equal(result.body.data.situacao, "EM_RESTAURACAO");
        assert.deepEqual(db.events.at(-1).oldValues, { statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Reforma", previsaoReabertura: "2027-03-15" });
        assert.deepEqual(db.events.at(-1).newValues, { statusVisitacao, motivoRestricao: null, previsaoReabertura: null });
    }
});

test("publicado e fechado permanece na lista e no detalhe públicos com data sem horário", async (t) => {
    const db = database(t, record({ status: "PUBLICADO", situacao: "EM_RESTAURACAO", statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Reforma", previsaoReabertura: new Date("2020-03-15T00:00:00.000Z") }));
    const verify = ({ where, select }) => {
        assert.equal(where.status, "PUBLICADO");
        assert.equal(Object.hasOwn(where, "statusVisitacao"), false);
        for (const field of ["statusVisitacao", "motivoRestricao", "previsaoReabertura"]) assert.equal(select[field], true);
        return db.state().status === where.status ? db.state() : null;
    };
    stub(t, prisma.patrimonio, "findFirst", async args => verify(args));
    stub(t, prisma.patrimonio, "findMany", async args => verify(args) ? [db.state()] : []);
    stub(t, prisma.patrimonio, "count", async ({ where }) => Number(db.state().status === where.status));
    const list = await request("/patrimonios");
    const detail = await request(`/patrimonios/${db.state().slug}`);
    assert.equal(list.status, 200); assert.equal(detail.status, 200);
    assert.equal(list.body.data.paginacao.total, 1);
    for (const result of [list.body.data.itens[0], detail.body.data]) {
        assert.equal(result.statusVisitacao, "TEMPORARIAMENTE_FECHADO");
        assert.equal(result.motivoRestricao, "Reforma");
        assert.equal(result.previsaoReabertura, "2020-03-15");
    }
    db.state().status = "RASCUNHO";
    assert.equal((await request("/patrimonios")).body.data.itens.length, 0);
    assert.equal((await request(`/patrimonios/${db.state().slug}`)).status, 404);
});

test("listagem administrativa reutiliza filtros, paginação e ordenação estável em todos os status", async (t) => {
    database(t);
    let args;
    let countWhere;
    stub(t, prisma.patrimonio, "count", async ({ where }) => {
        countWhere = where;
        return 0;
    });
    stub(t, prisma.patrimonio, "findMany", async (input) => {
        args = input;
        return [];
    });
    for (const status of [undefined, "RASCUNHO", "PUBLICADO", "ARQUIVADO"]) {
        const result = await request(
            `/admin/patrimonios?busca=igreja&categoria=Religioso&bairro=Centro&situacao=PRESERVADO&pagina=2&limite=5${status ? `&status=${status}` : ""}`,
            { user: editor }
        );
        assert.equal(result.status, 200);
        assert.equal(args.where.status, status);
        assert.deepEqual(countWhere, args.where);
        assert.equal(args.where.OR.length, 8);
        assert.equal(args.where.OR[0].nome.contains, "igreja");
        assert.equal(args.where.AND[0].OR[0].categoria.OR[0].nome.equals, "Religioso");
        assert.equal(args.where.AND[0].OR[0].categoria.OR[1].slug.equals, "Religioso");
        assert.equal(
            args.where.AND[0].OR[1].categoriasAdicionais.some.categoria.OR[0].nome.equals,
            "Religioso"
        );
        assert.equal(args.where.localizacao.is.bairro.equals, "Centro");
        assert.equal(args.where.situacao, "PRESERVADO");
        assert.equal(args.skip, 5);
        assert.equal(args.take, 5);
        assert.deepEqual(args.orderBy, [{ ordemExibicao: { sort: "asc", nulls: "last" } }, { nome: "asc" }, { id: "asc" }]);
        assert.deepEqual(result.body.data, {
            itens: [],
            paginacao: { pagina: 2, limite: 5, total: 0, totalPaginas: 0 },
        });
    }
});

test("detalhes administrativos incluem relações e aceitam qualquer status por UUID textual", async (t) => {
    stub(t, prisma.user, "findUnique", async () => editor);
    let current;
    stub(t, prisma.patrimonio, "findUnique", async ({ where, include }) => {
        assert.equal(where.id, current.id);
        assert.equal(include.categoria, true);
        assert.equal(include.localizacao, true);
        assert.ok(include.imagens && include.documentos);
        return current;
    });
    for (const status of ["RASCUNHO", "PUBLICADO", "ARQUIVADO"]) {
        current = record({ status });
        const result = await request(`/admin/patrimonios/${current.id}`, { user: editor });
        assert.equal(result.status, 200);
        assert.equal(result.body.data.status, status);
    }
});

test("edição preserva slug, campos omitidos e mídias, registra updatedBy", async (t) => {
    const original = record();
    const db = database(t, original);
    const result = await request(`/admin/patrimonios/${original.id}`, {
        user: editor,
        method: "PATCH",
        body: { nome: "Novo" },
    });
    assert.equal(result.status, 200);
    assert.deepEqual(db.state(), { ...original, nome: "Novo", updatedBy: editor.id });
    assert.deepEqual(db.writes[0], { nome: "Novo", updatedBy: editor.id });
    assert.equal(db.locks(), 1);
});

test("localização pode ser criada e atualizada parcialmente, validando coordenadas finais", async (t) => {
    const db = database(t);
    const id = db.state().id;
    await assert.rejects(
        service.updatePatrimonio(id, { localizacao: { bairro: "Centro" } }, admin)
    );
    await assert.rejects(
        service.updatePatrimonio(
            id,
            { localizacao: { endereco: "Rua", bairro: "Centro", latitude: 1 } },
            admin
        )
    );
    assert.equal(db.writes.length, 0);
    await service.updatePatrimonio(
        id,
        { localizacao: { endereco: "Rua", bairro: "Centro", latitude: 1, longitude: 2 } },
        admin
    );
    assert.equal(db.state().localizacao.cidade, "Guarulhos");
    assert.equal(db.state().localizacao.uf, "SP");
    await service.updatePatrimonio(id, { localizacao: { cidade: "Outra", uf: "RJ" } }, admin);
    // O contrato atual exige o par no PATCH, mesmo com coordenadas já salvas.
    const antes = db.writes.length;
    await assert.rejects(
        service.updatePatrimonio(
            id,
            schemas.updatePatrimonioSchema.parse({ localizacao: { latitude: 3 } }),
            admin
        ),
        { statusCode: 400, message: "Informe latitude e longitude juntas." }
    );
    assert.equal(db.writes.length, antes);
    await service.updatePatrimonio(
        id,
        schemas.updatePatrimonioSchema.parse({ localizacao: { latitude: 3, longitude: 2 } }),
        admin
    );
    assert.deepEqual(db.state().localizacao, {
        endereco: "Rua",
        bairro: "Centro",
        cidade: "Outra",
        uf: "RJ",
        latitude: 3,
        longitude: 2,
    });
});

test("localização Prisma Decimal e campos opcionais nulos são validados sem sobrescrever omitidos", async (t) => {
    const { Prisma } = await import("@prisma/client");
    const db = database(
        t,
        record({
            localizacao: {
                id: randomUUID(),
                patrimonioId: randomUUID(),
                endereco: "Rua",
                bairro: "Centro",
                cidade: "Guarulhos",
                uf: "SP",
                numero: null,
                cep: null,
                latitude: new Prisma.Decimal(1),
                longitude: new Prisma.Decimal(2),
            },
        })
    );
    await service.updatePatrimonio(db.state().id, { localizacao: { bairro: "Novo" } }, admin);
    assert.deepEqual(db.writes[0].localizacao, { update: { bairro: "Novo" } });
});

test("categoria inexistente retorna 400 e não escreve", async (t) => {
    const db = database(t);
    db.tx.categoria.findUnique = async () => null;
    const result = await request(`/admin/patrimonios/${db.state().id}`, {
        user: admin,
        method: "PATCH",
        body: { categoriaId: randomUUID() },
    });
    assert.equal(result.status, 400);
    assert.equal(db.writes.length, 0);
});

test("EDITOR não edita publicados/arquivados; ADMIN edita ambos", async (t) => {
    const db = database(t);
    for (const status of ["PUBLICADO", "ARQUIVADO"]) {
        db.state().status = status;
        const path = `/admin/patrimonios/${db.state().id}`;
        assert.equal(
            (await request(path, { user: editor, method: "PATCH", body: { nome: "Novo" } })).status,
            403
        );
        assert.equal(
            (await request(path, { user: admin, method: "PATCH", body: { nome: "Novo" } })).status,
            200
        );
    }
});

test("publicar, arquivar e republicar mantêm datas, autoria, mídias e visibilidade pública", async (t) => {
    const original = record();
    const db = database(t, original);
    stub(t, prisma.patrimonio, "findFirst", async ({ where }) =>
        db.state().status === where.status ? db.state() : null
    );
    stub(t, prisma.patrimonio, "count", async ({ where }) =>
        Number(db.state().status === where.status)
    );
    stub(t, prisma.patrimonio, "findMany", async ({ where }) =>
        db.state().status === where.status ? [db.state()] : []
    );
    for (const action of ["publicar", "arquivar", "publicar"]) {
        const start = Date.now();
        const response = await request(`/admin/patrimonios/${original.id}/${action}`, {
            user: admin,
            method: "PATCH",
        });
        assert.equal(response.status, 200);
        const current = db.state();
        const published = action === "publicar";
        const date = published ? current.publicadoEm : current.arquivadoEm;
        assert.ok(date.getTime() >= start && date.getTime() <= Date.now());
        if (published) assert.equal(current.arquivadoEm, null);
        else assert.ok(current.publicadoEm instanceof Date);
        assert.equal(current.updatedBy, admin.id);
        assert.deepEqual(current.imagens, original.imagens);
        assert.deepEqual(current.documentos, original.documentos);
        const writes = db.writes.length;
        const snapshot = { ...current };
        await request(`/admin/patrimonios/${original.id}/${action}`, {
            user: admin,
            method: "PATCH",
        });
        assert.equal(db.writes.length, writes);
        assert.deepEqual(db.state(), snapshot);
        assert.equal((await request("/patrimonios/igreja")).status, published ? 200 : 404);
        assert.equal((await request("/patrimonios")).body.data.itens.length, published ? 1 : 0);
    }
    assert.equal((await request("/patrimonios?status=RASCUNHO")).status, 400);
});

test("arquiva rascunho preservando data de publicação nula; publicação valida cadastro", async (t) => {
    const db = database(t, record({ descricao: "" }));
    const path = `/admin/patrimonios/${db.state().id}`;
    assert.equal((await request(`${path}/publicar`, { user: admin, method: "PATCH" })).status, 400);
    assert.equal(db.writes.length, 0);
    assert.equal((await request(`${path}/arquivar`, { user: admin, method: "PATCH" })).status, 200);
    assert.equal(db.state().publicadoEm, null);
});

test("rotas exigem login, UUID válido, existência e ADMIN nas transições", async (t) => {
    const db = database(t, null);
    const id = randomUUID();
    for (const [method, suffix, body] of [
        ["GET", "", undefined],
        ["PATCH", "", { nome: "Novo" }],
        ["PATCH", "/publicar", undefined],
        ["PATCH", "/arquivar", undefined],
    ]) {
        assert.equal(
            (await request(`/admin/patrimonios/${id}${suffix}`, { method, body })).status,
            401
        );
        assert.equal(
            (await request(`/admin/patrimonios/123${suffix}`, { user: admin, method, body }))
                .status,
            400
        );
        assert.equal(
            (await request(`/admin/patrimonios/${id}${suffix}`, { user: admin, method, body }))
                .status,
            404
        );
    }
    assert.equal((await request("/admin/patrimonios")).status, 401);
    for (const action of ["publicar", "arquivar"]) {
        assert.equal(
            (await request(`/admin/patrimonios/${id}/${action}`, { user: editor, method: "PATCH" }))
                .status,
            403
        );
    }
    assert.equal(db.writes.length, 0);
});

test("Swagger expõe endpoints, autenticação e schemas", async () => {
    const { body } = await request("/docs.json");
    assert.equal(body.openapi, "3.0.3");
    assert.ok(body.paths["/api/admin/patrimonios/{id}"].patch);
    assert.ok(body.paths["/api/admin/patrimonios/{id}/publicar"].patch.security);
    assert.equal((await fetch(`${base}/docs`)).status, 200);
});

test("falhas internas do Prisma não expõem mensagens do banco", async (t) => {
    const db = database(t);
    const { Prisma } = await import("@prisma/client");
    db.tx.patrimonio.update = async () => {
        throw new Prisma.PrismaClientKnownRequestError("detalhe interno secreto", {
            code: "P2010",
            clientVersion: "7.10.0",
        });
    };
    stub(t, console, "error", () => {});
    const result = await request(`/admin/patrimonios/${db.state().id}`, {
        user: admin,
        method: "PATCH",
        body: { nome: "Novo" },
    });
    assert.equal(result.status, 500);
    assert.equal(result.body.error.code, "INTERNAL_ERROR");
    assert.equal(JSON.stringify(result.body).includes("secreto"), false);
});

test("PATCH preserva coordenadas omitidas, limpa null/null e aceita zero sem alterar o contrato", async (t) => {
    const db = database(t, record({
        localizacao: {
            endereco: "Rua", bairro: "Centro", cidade: "Guarulhos", uf: "SP",
            latitude: -23.4628, longitude: -46.5333,
        },
    }));
    const url = `/admin/patrimonios/${db.state().id}`;
    const patch = (localizacao) => request(url, { user: editor, method: "PATCH", body: { localizacao } });

    assert.equal((await patch({ bairro: "Outro" })).status, 200);
    assert.equal(db.state().localizacao.latitude, -23.4628);
    assert.equal(db.state().localizacao.longitude, -46.5333);
    assert.deepEqual(db.writes.at(-1).localizacao, { update: { bairro: "Outro" } });

    assert.equal((await patch({ endereco: "Rua nova", latitude: null, longitude: null })).status, 200);
    assert.equal(db.state().localizacao.latitude, null);
    assert.equal(db.state().localizacao.longitude, null);
    assert.deepEqual(db.writes.at(-1).localizacao, {
        update: { endereco: "Rua nova", latitude: null, longitude: null },
    });
    assert.equal((await patch({ bairro: "Centro" })).status, 200);
    assert.equal(db.state().localizacao.latitude, null);
    assert.equal(db.state().localizacao.longitude, null);

    assert.equal((await patch({ latitude: 0, longitude: 0 })).status, 200);
    assert.equal(db.state().localizacao.latitude, 0);
    assert.equal(db.state().localizacao.longitude, 0);

    const antes = db.writes.length;
    for (const localizacao of [
        { latitude: 1 }, { longitude: 1 }, { latitude: null }, { longitude: null },
        { latitude: null, longitude: 2 }, { latitude: 1, longitude: null },
        { latitude: 91, longitude: 2 }, { latitude: 1, longitude: -181 },
    ]) {
        assert.equal((await patch(localizacao)).status, 400, JSON.stringify(localizacao));
    }
    assert.equal(db.writes.length, antes);
    assert.equal(db.state().localizacao.latitude, 0);
    assert.equal(db.state().localizacao.longitude, 0);
    assert.equal(schemas.localizacaoSchema.safeParse({
        endereco: "Rua", bairro: "Centro", latitude: null, longitude: null,
    }).success, false, "null continua proibido no cadastro");
});
