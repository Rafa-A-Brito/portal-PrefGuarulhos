import assert from "node:assert/strict";
import { assertTestDatabase } from "../scripts/assert-test-db.js";

// Cargas de teste criam também autor técnico e categorias. Limpar somente
// os IDs novos impede que uma suíte contamine a seguinte, mesmo se falhar.
export async function prepararLimpezaFixtures(prisma) {
    const target = assertTestDatabase();
    const [{ banco }] = await prisma.$queryRaw`SELECT current_database() AS banco`;
    assert.equal(banco, target.database);
    const models = ["auditLog", "novidade", "patrimonio", "categoria", "user"];
    const anteriores = new Map();
    for (const model of models) {
        anteriores.set(model, new Set((await prisma[model].findMany({ select: { id: true } })).map(row => row.id)));
    }
    return async () => {
        assert.deepEqual(assertTestDatabase(), target);
        await prisma.$transaction(async tx => {
            for (const model of models) {
                const novos = (await tx[model].findMany({ select: { id: true } }))
                    .filter(row => !anteriores.get(model).has(row.id)).map(row => row.id);
                if (novos.length) await tx[model].deleteMany({ where: { id: { in: novos } } });
            }
        });
    };
}
