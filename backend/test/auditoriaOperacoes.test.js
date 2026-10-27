import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/audit_operations_test";
process.env.JWT_SECRET = "audit-operations-secret-with-32-characters";
const { default: prisma } = await import("../src/config/prisma.js");
const editorial = await import("../src/services/patrimonioEditorialService.js");
const { atualizarImagemPatrimonio } = await import("../src/services/imageService.js");
const refs = await import("../src/services/referenciaService.js");
const { exposicaoService } = await import("../src/services/exposicaoService.js");
const { novidadeService } = await import("../src/services/novidadeService.js");
const { listarAuditoria, detalharAuditoria } = await import("../src/services/auditoriaService.js");
after(() => prisma.$disconnect());
const user = { id: randomUUID(), role: "ADMIN" }, patrimonioId = randomUUID();
function stub(t, target, key, fn) { const original = target[key]; target[key] = fn; t.after(() => { target[key] = original; }); }
function transaction(t, tx) {
    const events = [];
    tx.auditLog = { create: async ({ data }) => { events.push(structuredClone(data)); return data; } };
    stub(t, prisma, "$transaction", async cb => cb(tx)); return events;
}
function matches(row, where) {
    return Object.entries(where).every(([key, value]) => key === "OR" ? value.some(filter => matches(row, filter))
        : value && typeof value === "object" && Object.hasOwn(value, "not") ? row[key] !== value.not : row[key] === value);
}

for (const tipo of ["fatos", "ligacoes"]) test(`${tipo}: CRUD e reordenação produzem um evento por requisição, com diffs e no-op`, async t => {
    let rows = [];
    const model = tipo === "fatos" ? "patrimonioFato" : "patrimonioLigacao";
    const parent = tipo === "fatos" ? "patrimonioId" : "patrimonioOrigemId";
    const tx = { $queryRaw: async () => [], patrimonio: {
        findUnique: async ({ where }) => ({ id: where.id, slug: "fixture-" + where.id, status: "RASCUNHO" }), update: async () => ({}),
    }, [model]: {
        findFirst: async ({ where }) => rows.find(row => matches(row, where)) ?? null,
        findMany: async ({ where }) => rows.filter(row => matches(row, where)).sort((a, b) => a.ordem - b.ordem).map(row => ({ ...row })),
        create: async ({ data }) => { const row = { id: randomUUID(), ...data }; rows.push(row); return row; },
        update: async ({ where, data }) => Object.assign(rows.find(row => row.id === where.id), data),
        delete: async ({ where }) => { rows = rows.filter(row => row.id !== where.id); },
    } };
    const events = transaction(t, tx);
    const body = n => tipo === "fatos" ? { rotulo: "Ano " + n, valor: "1900", ordem: n } : { patrimonioDestinoId: randomUUID(), texto: "Veja " + n, ordem: n };
    const first = await editorial.criarEditorial(tipo, patrimonioId, body(0), user);
    const second = await editorial.criarEditorial(tipo, patrimonioId, body(1), user);
    const field = tipo === "fatos" ? "valor" : "texto", prefix = tipo === "fatos" ? "FATO" : "LIGACAO";
    const old = first[field];
    await editorial.atualizarEditorial(tipo, patrimonioId, first.id, { [field]: "Novo" }, user);
    assert.deepEqual(events[2].oldValues, { [field]: old }); assert.deepEqual(events[2].newValues, { [field]: "Novo" });
    await editorial.atualizarEditorial(tipo, patrimonioId, first.id, { [field]: "Novo" }, user); assert.equal(events.length, 3);
    await editorial.ordenarEditorial(tipo, patrimonioId, { ids: [second.id, first.id] }, user);
    assert.equal(events[3].action, prefix + "_REORDER"); assert.equal(events[3].entityId, patrimonioId);
    const ordered = values => new Map(values.itens.map(row => [row.id, row.ordem]));
    assert.equal(ordered(events[3].oldValues).get(first.id), 0); assert.equal(ordered(events[3].newValues).get(first.id), 1);
    await editorial.ordenarEditorial(tipo, patrimonioId, { ids: [second.id, first.id] }, user); assert.equal(events.length, 4);
    await editorial.excluirEditorial(tipo, patrimonioId, first.id, user);
    assert.equal(events[4].oldValues[parent], patrimonioId); assert.equal(events[4].entityId, first.id);
    assert.deepEqual(events.map(e => e.action), [prefix + "_CREATE", prefix + "_CREATE", prefix + "_UPDATE", prefix + "_REORDER", prefix + "_DELETE"]);
    assert.ok(events.every(e => e.userId === user.id));
});

test("imagem principal e metadados: um evento identifica imagem, principal anterior e diferenças", async t => {
    const previous = randomUUID(), id = randomUUID();
    const rows = [{ id: previous, patrimonioId, principal: true }, { id, patrimonioId, principal: false, titulo: "Anterior", credito: "Acervo" }];
    const tx = { $queryRaw: async () => [], patrimonioImagem: {
        findUnique: async () => rows[1], findMany: async () => rows.filter(row => row.principal),
        updateMany: async () => { rows[0].principal = false; }, update: async ({ data }) => Object.assign(rows[1], data),
    } };
    const events = transaction(t, tx);
    await atualizarImagemPatrimonio(id, { titulo: "Nova legenda", principal: true, credito: null }, user);
    assert.equal(events.length, 1); assert.equal(events[0].entityId, id); assert.equal(events[0].userId, user.id);
    assert.deepEqual(events[0].oldValues, { titulo: "Anterior", credito: "Acervo", principal: false, principais: [previous] });
    assert.deepEqual(events[0].newValues, { titulo: "Nova legenda", credito: null, principal: true, principais: [id] });
    await atualizarImagemPatrimonio(id, { titulo: "Nova legenda", principal: true }, user); assert.equal(events.length, 1);
});

test("referências: inclusão, metadados, null e exclusão usam identidade da mídia e do patrimônio", async t => {
    let row;
    const tx = { $queryRaw: async () => [], patrimonio: { findUnique: async () => ({ id: patrimonioId, status: "RASCUNHO" }) }, patrimonioDocumento: {
        create: async ({ data }) => (row = { id: randomUUID(), ...data }), findFirst: async () => row,
        update: async ({ data }) => Object.assign(row, data), delete: async () => row,
    } };
    const events = transaction(t, tx);
    await refs.criarReferenciaPatrimonio(patrimonioId, null, { url: "https://example.test/fonte?token=segredo", descricao: "Fonte" }, user);
    await refs.atualizarReferenciaPatrimonio(patrimonioId, row.id, { descricao: null }, user);
    await refs.removerReferenciaPatrimonio(patrimonioId, row.id, user);
    assert.deepEqual(events.map(e => e.action), ["DOCUMENTO_CREATE", "DOCUMENTO_UPDATE", "DOCUMENTO_DELETE"]);
    assert.equal(events[0].newValues.patrimonioId, patrimonioId); assert.equal(events[2].oldValues.patrimonioId, patrimonioId);
    assert.deepEqual(events[1].oldValues, { descricao: "Fonte" }); assert.deepEqual(events[1].newValues, { descricao: null });
    assert.ok(events.every(e => e.entityId === row.id && e.userId === user.id)); assert.doesNotMatch(JSON.stringify(events), /segredo|token=/);
});

for (const model of ["exposicao", "novidade"]) test(`${model}: criação, edição, publicação, arquivamento e exclusão são auditados uma vez`, async t => {
    let row;
    const tx = { $queryRaw: async () => [], [model]: {
        create: async ({ data }) => (row = { id: randomUUID(),
            ...(model === "novidade" && { fontes: [], blocoDia: null, blocoMes: null, blocoLegenda: null, ctaRotulo: null, ctaUrl: null }),
            ...data }), findUnique: async () => row,
        update: async ({ data }) => Object.assign(row, data), delete: async () => row,
    } };
    const events = transaction(t, tx);
    const service = model === "exposicao" ? exposicaoService : novidadeService;
    const data = model === "exposicao" ? { titulo: "Mostra", artista: "Artista", local: "Centro", periodo: "Outubro", bio: "Biografia" }
        : { titulo: "Notícia", tipo: "NOTICIA", tag: "Cultura", data: "2026-10-26", resumo: "Resumo", texto: "Conteúdo" };
    await service.create(data, model === "exposicao" ? { url: "https://example.test/imagem.png" } : null, user);
    await service.update(row.id, { titulo: "Novo título" }, null, user);
    assert.deepEqual(events[1].oldValues, { titulo: data.titulo }); assert.deepEqual(events[1].newValues, { titulo: "Novo título" });
    await service.update(row.id, { titulo: "Novo título" }, null, user); assert.equal(events.length, 2);
    await service.changeStatus(row.id, "PUBLICADO", user); await service.changeStatus(row.id, "PUBLICADO", user);
    assert.equal(events.length, 3); await service.changeStatus(row.id, "ARQUIVADO", user); await service.remove(row.id, user);
    assert.deepEqual(events.map(e => e.action), ["CREATE", "UPDATE", "PUBLISH", "ARCHIVE", "DELETE"].map(v => model.toUpperCase() + "_" + v));
    assert.ok(events.every(e => e.entityId === row.id && e.userId === user.id));
});

test("detalhe de edição de mídia recupera patrimônio após exclusão sem repetir campos imutáveis no diff", async t => {
    const id = randomUUID();
    stub(t, prisma.auditLog, "findUnique", async () => ({ id: randomUUID(), user: null, userId: user.id, entity: "PatrimonioImagem", entityId: id, action: "IMAGEM_UPDATE", createdAt: new Date(), oldValues: { titulo: "Antes" }, newValues: { titulo: "Depois" } }));
    stub(t, prisma.patrimonioImagem, "findUnique", async () => null);
    stub(t, prisma.auditLog, "findFirst", async () => ({ oldValues: { patrimonioId }, newValues: null }));
    const result = await detalharAuditoria(randomUUID()); assert.deepEqual(result.registro, { id, patrimonioId });
    assert.deepEqual(result.oldValues, { titulo: "Antes" }); assert.deepEqual(result.newValues, { titulo: "Depois" });
});

test("listagem retorna resumo/identificação selecionados, sem valores nem objetos inteiros", async t => {
    const id = randomUUID();
    stub(t, prisma.auditLog, "count", async () => 1);
    stub(t, prisma.auditLog, "findMany", async () => [{ id, userId: user.id, user: { ...user, name: "Equipe", email: "equipe@example.test", passwordHash: "segredo" }, action: "IMAGEM_UPDATE", entity: "PatrimonioImagem", entityId: randomUUID(), createdAt: new Date(), oldValues: { segredo: true } }]);
    stub(t, prisma, "$transaction", queries => Promise.all(queries));
    const result = await listarAuditoria({}); assert.equal(result.itens[0].id, id); assert.match(result.itens[0].resumo, /Imagem/);
    assert.doesNotMatch(JSON.stringify(result), /passwordHash|segredo|oldValues/);
});
