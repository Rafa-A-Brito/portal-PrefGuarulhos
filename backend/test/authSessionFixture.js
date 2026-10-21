import { randomUUID } from "node:crypto";
export function mockSessionWrites(t, prisma) {
    const replacements = [[prisma, "$transaction", async callback => callback(prisma)],
        [prisma, "$queryRaw", async () => []],
        [prisma.authSession, "create", async ({ data }) => ({ ...data, id: data.id || randomUUID() })],
        [prisma.authSession, "updateMany", async () => ({ count: 1 })]];
    for (const [target, key, fn] of replacements) {
        const original = target[key]; target[key] = fn; t.after(() => { target[key] = original; });
    }
}
export async function createFixtureSession(prisma, user) {
    await prisma.authSession.upsert({ where: { id: user.id }, update: {},
        create: { id: user.id, userId: user.id, tokenVersion: user.tokenVersion, expiresAt: new Date(Date.now() + 3600000) } });
}
