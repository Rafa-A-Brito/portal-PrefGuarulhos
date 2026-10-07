import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const safeTestDatabase = integrationDatabaseAvailable();

test(
    "PostgreSQL: cadastro, gestão, status concorrente e bloqueio de JWT após desativação",
    {
        skip:
            !safeTestDatabase &&
            "Configure TEST_DATABASE_URL para um banco exclusivo *_test e TEST_DATABASE_EXCLUSIVE=1.",
    },
    async () => {
        process.env.DATABASE_URL = testDatabaseUrl;
        process.env.JWT_SECRET = "integration-test-secret-with-at-least-32-characters";

        const { default: app } = await import("../src/app.js");
        const { default: prisma } = await import("../src/config/prisma.js");
        const { hashPassword, verifyPassword } = await import("../src/utils/password.js");
        const { generateToken } = await import("../src/utils/token.js");

        let server;
        const createdIds = [];
        const startServer = async () => {
            server = app.listen(0);
            await new Promise((resolve) => server.once("listening", resolve));
            return `http://127.0.0.1:${server.address().port}`;
        };
        const stopServer = async () => {
            await new Promise((resolve) => server.close(resolve));
        };

        try {
            const bootstrap = await prisma.user.create({
                data: {
                    name: "Administrador de teste",
                    email: `bootstrap-${randomUUID()}@example.test`,
                    passwordHash: await hashPassword(randomUUID()),
                    role: "ADMIN",
                    isActive: true,
                },
                select: { id: true },
            });

            createdIds.push(bootstrap.id);
            const email = `novo-${randomUUID()}@example.test`;
            const password = "senha-de-teste-123";
            let baseUrl = await startServer();
            const createResponse = await fetch(`${baseUrl}/api/admins`, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${generateToken(bootstrap.id)}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({ nome: "Nova Editora", email, role: "EDITOR", password }),
            });
            const created = await createResponse.json();
            assert.equal(createResponse.status, 201);
            createdIds.push(created.data.id);
            assert.equal(created.data.ativo, true);
            assert.equal("passwordHash" in created.data, false);

            const stored = await prisma.user.findUnique({ where: { email } });
            assert.equal(stored.id, created.data.id);
            assert.equal(stored.isActive, true);
            assert.notEqual(stored.passwordHash, password);
            assert.equal(await verifyPassword(password, stored.passwordHash), true);

            const duplicateResponse = await fetch(`${baseUrl}/api/admins`, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${generateToken(bootstrap.id)}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({ nome: "Outra", email, role: "ADMIN", password }),
            });
            assert.equal(duplicateResponse.status, 409);
            assert.equal((await duplicateResponse.json()).error.code, "ADMIN_ALREADY_EXISTS");

            await stopServer();
            server = undefined;
            baseUrl = await startServer();
            const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const login = await loginResponse.json();
            assert.equal(loginResponse.status, 200);
            assert.equal(login.data.user.id, stored.id);

            const service = await import("../src/services/adminService.js");
            const adminToken = generateToken(bootstrap.id);
            const adminRequest = (path, method = "GET", data) => fetch(`${baseUrl}/api/admins${path}`, {
                method,
                headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
                ...(data && { body: JSON.stringify(data) }),
            });
            const list = await adminRequest(`?busca=${encodeURIComponent(email)}&role=EDITOR&ativo=true&limite=1`);
            assert.equal(list.status, 200);
            assert.deepEqual((await list.json()).data.itens.map((item) => item.id), [stored.id]);
            const edited = await adminRequest(`/${stored.id}`, "PATCH", { nome: "Nome atualizado", email: email.toUpperCase() });
            assert.equal(edited.status, 200);
            const editedBody = (await edited.json()).data;
            assert.equal(editedBody.nome, "Nome atualizado");
            assert.equal(editedBody.email, email);
            assert.equal("passwordHash" in editedBody, false);
            assert.ok(editedBody.criadoEm);
            assert.ok(editedBody.atualizadoEm);

            // Exercita locks reais: a segunda requisição lê o estado confirmado
            // pela primeira e não escreve uma segunda data de atualização.
            const statuses = await Promise.all([
                adminRequest(`/${stored.id}/status`, "PATCH", { ativo: false }),
                adminRequest(`/${stored.id}/status`, "PATCH", { ativo: false }),
            ]);
            assert.deepEqual(statuses.map((item) => item.status), [200, 200]);
            const statusBodies = await Promise.all(statuses.map((item) => item.json()));
            assert.deepEqual(statusBodies[0].data, statusBodies[1].data);
            assert.equal(statusBodies[0].data.ativo, false);
            const blocked = await fetch(`${baseUrl}/api/admins`, {
                headers: { authorization: `Bearer ${login.data.token}` },
            });
            assert.equal(blocked.status, 401);
            const blockedLogin = await fetch(`${baseUrl}/api/auth/login`, {
                method: "POST", headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            assert.equal(blockedLogin.status, 401);
            assert.equal((await adminRequest(`/${stored.id}/status`, "PATCH", { ativo: true })).status, 200);
            assert.equal((await adminRequest(`/${stored.id}`, "DELETE")).status, 404);

            // Reduções concorrentes de ADMINs diferentes devem sempre deixar um
            // ADMIN ativo, inclusive se ambos passaram por authenticate antes.
            await service.updateAdmin(stored.id, { role: "ADMIN" }, bootstrap);
            const outcomes = await Promise.allSettled([
                service.updateAdmin(bootstrap.id, { role: "EDITOR" }, { id: stored.id }),
                service.changeAdminStatus(stored.id, false, bootstrap),
            ]);
            for (const outcome of outcomes) {
                if (outcome.status === "rejected") {
                    assert.equal(outcome.reason.code, "LAST_ACTIVE_ADMIN");
                    assert.equal(outcome.reason.statusCode, 409);
                }
            }
            assert.ok(await prisma.user.count({ where: { role: "ADMIN", isActive: true } }) >= 1);
        } finally {
            if (server) await stopServer();
            await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
            await prisma.$disconnect();
        }
    }
);
