import { createFixtureSession } from "./authSessionFixture.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { assertTestDatabase } from "../scripts/assert-test-db.js";

test("PostgreSQL: troca revoga todos os JWTs, preserva atomicidade e emite versão atual", {
    skip: !process.env.TEST_DATABASE_URL ? "Exige PostgreSQL descartável." : false,
}, async () => {
    assertTestDatabase();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { default: prisma } = await import("../src/config/prisma.js");
    const { default: app } = await import("../src/app.js");
    const { hashPassword, verifyPassword } = await import("../src/utils/password.js");
    const { generateToken, verifyToken } = await import("../src/utils/token.js");
    const { changePassword } = await import("../src/services/authService.js");
    const user = await prisma.user.create({ data: { name: "Revogação", email: randomUUID() + "@example.test",
        passwordHash: await hashPassword("SenhaInicial123!"), role: "ADMIN" } });
        await createFixtureSession(prisma, user);
    const server = app.listen(0); await new Promise(resolve => server.once("listening", resolve));
    const base = "http://127.0.0.1:" + server.address().port + "/api";
    const request = (token, senhaAtual = "SenhaInicial123!", novaSenha = "NovaSenhaSegura123!") => fetch(base + "/auth/senha", { method: "PATCH",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ senhaAtual, novaSenha }) });
    try {
        const tokens = [generateToken(user.id, 0, user.id), jwt.sign({ sid: user.id, tokenVersion: 0, jti: randomUUID() }, process.env.JWT_SECRET, { algorithm: "HS256", subject: user.id, expiresIn: 900 })];
        assert.equal((await request(tokens[0], "errada")).status, 400);
        assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).tokenVersion, 0);
        for (const tokenVersion of [undefined, -1, 0.5, "0", null, 2147483648]) {
            const bad = jwt.sign(tokenVersion === undefined ? { sid: user.id } : { sid: user.id, tokenVersion }, process.env.JWT_SECRET, { subject: user.id, algorithm: "HS256", expiresIn: 900 });
            assert.equal((await request(bad)).status, 401);
        }
        assert.equal((await request(tokens[0])).status, 200);
        const stored = await prisma.user.findUnique({ where: { id: user.id } });
        assert.equal(stored.tokenVersion, 1);
        for (const token of tokens) assert.equal((await request(token, "NovaSenhaSegura123!", "TerceiraSenhaSegura123!")).status, 401);
        const response = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "NovaSenhaSegura123!" }) });
        assert.equal(response.status, 200);
        const current = (await response.json()).data.token;
        assert.equal(verifyToken(current).tokenVersion, 1);
        // Duas trocas concorrentes só podem confirmar uma senha/versão.
        const results = await Promise.allSettled([changePassword(user.id, { senhaAtual: "NovaSenhaSegura123!", novaSenha: "TerceiraSenhaSegura123!" }),
            changePassword(user.id, { senhaAtual: "NovaSenhaSegura123!", novaSenha: "QuartaSenhaSegura123!" })]);
        assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
        assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).tokenVersion, 2);
        assert.equal((await request(current, "NovaSenhaSegura123!", "QuintaSenhaSegura123!")).status, 401);
        const last = await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: 2147483647 } });
        const validPassword = await verifyPassword("TerceiraSenhaSegura123!", last.passwordHash) ? "TerceiraSenhaSegura123!" : "QuartaSenhaSegura123!";
        // O overflow força falha real no UPDATE único: hash e versão devem ficar intactos.
        await assert.rejects(changePassword(user.id, { senhaAtual: validPassword, novaSenha: "SenhaNaoPersistida123!" }));
        const afterFailure = await prisma.user.findUnique({ where: { id: user.id } });
        assert.equal(afterFailure.passwordHash, last.passwordHash);
        assert.equal(afterFailure.tokenVersion, last.tokenVersion);
    } finally { await prisma.user.delete({ where: { id: user.id } }); await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
});
