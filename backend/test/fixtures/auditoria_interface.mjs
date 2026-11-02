// Executado em processos isolados pelo teste de contrato; nunca usa banco.
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { eventosAuditoria, listaAuditoriaFixture, responsavelFixture } from "../../../frontend/test/fixtures/auditoria.js";
const demo = process.env.MOCK_DATA === "true";
const json = v => JSON.parse(JSON.stringify(v));
let servico, prisma;
if (demo) {
    const { store } = await import("../../src/mock/store.js");
    store.users = [responsavelFixture];
    store.audit = eventosAuditoria.map(e => ({ id: e.id, userId: e.userId, action: e.action,
        entity: e.entity, entityId: e.entityId, oldValues: e.oldValues, newValues: e.newValues,
        createdAt: new Date(e.createdAt) }));
    servico = await import("../../src/mock/audit.js");
} else {
    ({ default: prisma } = await import("../../src/config/prisma.js"));
    prisma.auditLog.findUnique = async ({ where }) => eventosAuditoria.find(e => e.id === where.id);
    prisma.auditLog.findMany = async () => eventosAuditoria;
    prisma.auditLog.count = async () => eventosAuditoria.length;
    prisma.$transaction = async queries => Promise.all(queries);
    servico = await import("../../src/services/auditoriaService.js");
}
try {
    assert.deepEqual(json(await servico.listarAuditoria({ pagina: 1, limite: 20 })), listaAuditoriaFixture());
    for (const evento of eventosAuditoria) assert.deepEqual(json(await servico.detalharAuditoria(evento.id)), evento);
    console.log(demo ? "Contrato demo conferido" : "Contrato real com persistência substituída conferido");
} finally { await prisma?.$disconnect(); }
