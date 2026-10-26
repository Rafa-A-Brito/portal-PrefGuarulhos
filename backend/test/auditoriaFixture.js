import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Delegate da mesma transação dos doubles existentes. Não simula atomicidade
// PostgreSQL; a comprovação de rollback fica na suíte de integração exclusiva.
export function mockAuditLog(events = []) {
    return { create: async ({ data }) => {
        assert.ok(data.userId, "Auditoria exige o responsável autenticado");
        assert.ok(data.entityId, "Auditoria exige o registro afetado");
        for (const values of [data.oldValues, data.newValues]) {
            for (const field of ["password", "passwordHash", "senhaAtual", "novaSenha", "token", "refreshToken", "tokenHash", "tokenVersion"]) {
                assert.equal(Object.hasOwn(values ?? {}, field), false);
            }
        }
        const row = { id: randomUUID(), ...structuredClone(data) };
        events.push(row);
        return row;
    } };
}
export function mockPrismaAudit(t, prisma) {
    const events = [];
    const original = prisma.auditLog.create;
    prisma.auditLog.create = mockAuditLog(events).create;
    t.after(() => { prisma.auditLog.create = original; });
    return events;
}
