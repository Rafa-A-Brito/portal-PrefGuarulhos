import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { integrationDatabaseAvailable, assertTestDatabase } from "../scripts/assert-test-db.js";

test("PostgreSQL 17: transições de status invalidam sessões atomicamente", {
    skip: !integrationDatabaseAvailable() && "Exige PostgreSQL 17 descartável exclusivo.",
}, async t => {
    const destino = assertTestDatabase();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { default: prisma } = await import("../src/config/prisma.js");
    const { default: app } = await import("../src/app.js");
    const auth = await import("../src/services/authService.js");
    const admins = await import("../src/services/adminService.js");
    const { hashPassword } = await import("../src/utils/password.js");
    const { verifyToken } = await import("../src/utils/token.js");
    const senha = "SenhaSinteticaC21!", novaSenha = "OutraSenhaSinteticaC21!";
    const ids = [], transaction = prisma.$transaction;
    let server;
    async function ler(fn) {
        return transaction.call(prisma, async tx => {
            await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            return fn(tx);
        });
    }
    async function estado(id) {
        return ler(async tx => ({
            usuario: await tx.user.findUnique({ where: { id }, select: { id: true, isActive: true, tokenVersion: true, updatedAt: true } }),
            sessoes: await tx.authSession.findMany({ where: { userId: id }, orderBy: { id: "asc" },
                select: { id: true, tokenVersion: true, createdAt: true, expiresAt: true, revokedAt: true } }),
            refreshes: await tx.refreshToken.findMany({ where: { session: { userId: id } }, orderBy: { id: "asc" },
                select: { id: true, sessionId: true, createdAt: true, usedAt: true } }),
            auditoria: await tx.auditLog.findMany({ where: { entityId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: { userId: true, action: true, oldValues: true, newValues: true } }),
        }));
    }
    try {
        const [identidade] = await ler(tx => tx.$queryRaw`SELECT current_database() banco, current_setting('server_version_num')::int versao`);
        assert.equal(identidade.banco, destino.database);
        assert.ok(identidade.versao >= 170000 && identidade.versao < 180000);
        const passwordHash = await hashPassword(senha);
        async function usuario(subtest, role = "EDITOR") {
            const row = await prisma.user.create({ data: { name: "Conta fictícia C2.1", email: randomUUID() + "@example.invalid", role, passwordHash } });
            ids.push(row.id);
            if (subtest) subtest.after(async () => {
                await prisma.auditLog.deleteMany({ where: { entityId: row.id } });
                await prisma.user.deleteMany({ where: { id: row.id } });
            });
            return row;
        }
        const actor = await usuario(null, "ADMIN");
        server = app.listen(0, "127.0.0.1");
        await new Promise(resolve => server.once("listening", resolve));
        const base = `http://127.0.0.1:${server.address().port}/api`;
        let respostas = 0;
        async function http(route, method, body, token, status) {
            const response = await fetch(base + route, { method,
                headers: { "content-type": "application/json", ...(token && { authorization: "Bearer " + token }) },
                ...(body && { body: JSON.stringify(body) }),
            });
            respostas++;
            assert.equal(response.status, status, `${method} ${route}`);
            assert.equal(response.headers.get("cache-control"), "no-store");
            return (await response.json()).data;
        }
        const login = (user, password = senha) => http("/auth/login", "POST", { email: user.email, password }, null, 200);
        const actorPair = await login(actor);
        const status = (user, ativo) => http(`/admins/${user.id}/status`, "PATCH", { ativo }, actorPair.token, 200);
        const acesso = (pair, esperado = 200) => http("/admin/dashboard", "GET", null, pair.token, esperado);
        const refresh = (pair, esperado = 200) => http("/auth/refresh", "POST", { refreshToken: pair.refreshToken }, null, esperado);
        async function negados(pairs) {
            for (const pair of pairs) { await acesso(pair, 401); await refresh(pair, 401); }
        }

        for (const role of ["ADMIN", "EDITOR"]) await t.test(`${role}: múltiplas sessões, HTTP, versões, idempotência e isolamento`, async sub => {
            const user = await usuario(sub, role), outro = await usuario(sub);
            const a = await login(user), b = await login(user), c = await login(user), vizinho = await login(outro);
            const rotacionado = await refresh(a);
            await http("/auth/logout", "POST", { refreshToken: c.refreshToken }, null, 200);
            const inicial = await estado(user.id), alheio = await estado(outro.id);
            const revogada = inicial.sessoes.find(s => s.id === verifyToken(c.token).sid);
            assert.ok(revogada.revokedAt);
            await acesso(b);
            await http("/admins", "GET", null, b.token, role === "ADMIN" ? 200 : 403);
            await status(user, false);
            const inativo = await estado(user.id);
            assert.equal(inativo.usuario.tokenVersion, 1);
            assert.ok(inativo.sessoes.every(s => s.revokedAt));
            assert.deepEqual(inativo.sessoes.find(s => s.id === revogada.id), revogada);
            await negados([rotacionado, b, c]);
            await http("/auth/login", "POST", { email: user.email, password: senha }, null, 401);
            await status(user, false);
            assert.deepEqual(await estado(user.id), inativo);
            await status(user, true);
            const ativo = await estado(user.id);
            assert.equal(ativo.usuario.tokenVersion, 2);
            assert.deepEqual(ativo.sessoes, inativo.sessoes);
            await negados([a, rotacionado, b, c]);
            const novo = await login(user), renovado = await refresh(novo);
            assert.equal(verifyToken(novo.token).tokenVersion, 2);
            assert.equal(renovado.sessionExpiresAt, novo.sessionExpiresAt);
            await acesso(renovado);
            const antesRepetir = await estado(user.id);
            await status(user, true);
            assert.deepEqual(await estado(user.id), antesRepetir);
            await acesso(renovado);
            await acesso(vizinho);
            assert.deepEqual(await estado(outro.id), alheio);
            assert.deepEqual(ativo.auditoria, [
                { userId: actor.id, action: "USER_DEACTIVATE", oldValues: { isActive: true }, newValues: { isActive: false } },
                { userId: actor.id, action: "USER_ACTIVATE", oldValues: { isActive: false }, newValues: { isActive: true } },
            ]);
            assert.doesNotMatch(JSON.stringify(ativo.auditoria), /password|token|senha|hash/i);
        });

        for (const role of ["ADMIN", "EDITOR"]) await t.test(`${role}: reativação protege conta anteriormente inativa`, async sub => {
            const user = await usuario(sub, role), a = await login(user), b = await login(user);
            // Simula o estado histórico anterior à política, sem revogar nem incrementar.
            await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
            const legado = await estado(user.id);
            await status(user, false);
            assert.deepEqual(await estado(user.id), legado);
            await status(user, true);
            const reativado = await estado(user.id);
            assert.equal(reativado.usuario.tokenVersion, 1);
            assert.ok(reativado.sessoes.every(s => s.revokedAt));
            assert.deepEqual(reativado.auditoria.map(a => a.action), ["USER_ACTIVATE"]);
            await negados([a, b]);
            await acesso(await refresh(await login(user)));
        });

        // Falhas SQL reais, sem triggers, DDL ou alteração da implementação.
        for (const ativo of [false, true]) for (const falha of ["revogacao", "versao", "auditoria"]) {
            await t.test(`rollback integral: ativo=${ativo}, falha=${falha}`, async sub => {
                const user = await usuario(sub);
                await login(user); await login(user);
                await prisma.user.update({ where: { id: user.id }, data: { isActive: !ativo,
                    ...(falha === "versao" && { tokenVersion: 2147483647 }) } });
                const antes = await estado(user.id);
                prisma.$transaction = (fn, options) => transaction.call(prisma, tx => fn(new Proxy(tx, { get(target, key) {
                    if (key === "authSession" && falha === "revogacao") return { updateMany: async args => {
                        await target.authSession.updateMany(args);
                        return target.$queryRawUnsafe("SELECT CAST('falha_c21' AS integer)");
                    } };
                    if (key === "auditLog" && falha === "auditoria") return { create: args => target.auditLog.create({
                        ...args, data: { ...args.data, userId: randomUUID() },
                    }) };
                    return Reflect.get(target, key);
                } })), options);
                try { await assert.rejects(admins.changeAdminStatus(user.id, ativo, actor)); }
                finally { prisma.$transaction = transaction; }
                assert.deepEqual(await estado(user.id), antes);
            });
        }

        // Barreiras no ponto do lock real: a segunda operação tenta adquiri-lo
        // enquanto a primeira o possui. Nenhum sleep determina a ordem do ensaio.
        async function ordenadas(primeira, segunda) {
            const contexto = new AsyncLocalStorage();
            let liberar, adquiriu, tentou;
            const retida = new Promise(r => { liberar = r; });
            const adquirida = new Promise(r => { adquiriu = r; });
            const tentativa = new Promise(r => { tentou = r; });
            let timer;
            const prazo = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Barreira C2.1 não alcançada")), 8000); });
            prisma.$transaction = (fn, options) => {
                const ordem = contexto.getStore();
                return transaction.call(prisma, tx => fn(new Proxy(tx, { get(target, key) {
                    if (key !== "$queryRaw" || !ordem) return Reflect.get(target, key);
                    return async (...args) => {
                        if (ordem === 2) tentou();
                        const result = await target.$queryRaw(...args);
                        if (ordem === 1) { adquiriu(); await retida; }
                        return result;
                    };
                } })), { ...options, timeout: 15000 });
            };
            const settle = p => p.then(value => ({ status: "fulfilled", value }), reason => ({ status: "rejected", reason }));
            let a, b;
            try {
                a = settle(contexto.run(1, primeira));
                await Promise.race([adquirida, prazo]);
                b = settle(contexto.run(2, segunda));
                await Promise.race([tentativa, prazo]);
                liberar();
                return await Promise.all([a, b]);
            } finally {
                liberar(); clearTimeout(timer);
                await Promise.all([a, b]);
                prisma.$transaction = transaction;
            }
        }
        for (const operacao of ["login", "refresh", "senha"]) for (const statusPrimeiro of [false, true]) {
            await t.test(`concorrência ${operacao} × desativação: status primeiro=${statusPrimeiro}`, async sub => {
                const user = await usuario(sub), a = await login(user), b = await login(user);
                const op = () => operacao === "login" ? auth.login({ email: user.email, password: senha })
                    : operacao === "refresh" ? auth.refresh(a.refreshToken)
                        : auth.changePassword(user.id, { senhaAtual: senha, novaSenha });
                const desativar = () => admins.changeAdminStatus(user.id, false, actor);
                const outcomes = await ordenadas(statusPrimeiro ? desativar : op, statusPrimeiro ? op : desativar);
                const negocio = outcomes[statusPrimeiro ? 1 : 0], mudanca = outcomes[statusPrimeiro ? 0 : 1];
                assert.equal(mudanca.status, "fulfilled");
                assert.equal(negocio.status, statusPrimeiro ? "rejected" : "fulfilled");
                if (statusPrimeiro) assert.equal(negocio.reason.statusCode, operacao === "senha" ? 400 : 401);
                const inativo = await estado(user.id);
                assert.equal(inativo.usuario.isActive, false);
                assert.ok(inativo.sessoes.every(s => s.revokedAt));
                assert.equal(inativo.usuario.tokenVersion, operacao === "senha" && !statusPrimeiro ? 2 : 1);
                await status(user, true);
                const pares = [a, b];
                if (negocio.status === "fulfilled" && negocio.value?.token) pares.push(negocio.value);
                await negados(pares);
                await acesso(await refresh(await login(user, operacao === "senha" && !statusPrimeiro ? novaSenha : senha)));
            });
        }
        for (const [inicial, primeiro, segundo] of [[true, false, false], [false, true, true], [true, false, true], [false, true, false]]) {
            await t.test(`concorrência status ${inicial} → ${primeiro} → ${segundo}`, async sub => {
                const user = await usuario(sub), antigo = await login(user);
                if (!inicial) await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
                const outcomes = await ordenadas(() => admins.changeAdminStatus(user.id, primeiro, actor), () => admins.changeAdminStatus(user.id, segundo, actor));
                assert.ok(outcomes.every(o => o.status === "fulfilled"));
                const atual = await estado(user.id), transicoes = primeiro === segundo ? 1 : 2;
                assert.equal(atual.usuario.tokenVersion, transicoes);
                assert.equal(atual.usuario.isActive, segundo);
                assert.equal(atual.auditoria.length, transicoes);
                if (primeiro === segundo) assert.deepEqual(outcomes[0].value, outcomes[1].value);
                await negados([antigo]);
            });
        }
        for (const statusPrimeiro of [false, true]) await t.test(`refresh histórico × reativação: status primeiro=${statusPrimeiro}`, async sub => {
            const user = await usuario(sub), antigo = await login(user);
            await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
            const renovar = () => auth.refresh(antigo.refreshToken), reativar = () => admins.changeAdminStatus(user.id, true, actor);
            const results = await ordenadas(statusPrimeiro ? reativar : renovar, statusPrimeiro ? renovar : reativar);
            assert.equal(results[statusPrimeiro ? 0 : 1].status, "fulfilled");
            assert.equal(results[statusPrimeiro ? 1 : 0].status, "rejected");
            assert.equal(results[statusPrimeiro ? 1 : 0].reason.statusCode, 401);
            await negados([antigo]); await acesso(await refresh(await login(user)));
        });
        await t.test("autodesativação, auto-rebaixamento e último ADMIN concorrente preservados", async sub => {
            const antes = await estado(actor.id);
            await http(`/admins/${actor.id}/status`, "PATCH", { ativo: false }, actorPair.token, 409);
            await http(`/admins/${actor.id}`, "PATCH", { role: "EDITOR" }, actorPair.token, 409);
            assert.deepEqual(await estado(actor.id), antes);
            const outro = await usuario(sub, "ADMIN");
            const outcomes = await ordenadas(() => admins.changeAdminStatus(outro.id, false, actor), () => admins.changeAdminStatus(actor.id, false, outro));
            assert.equal(outcomes[0].status, "fulfilled");
            assert.equal(outcomes[1].status, "rejected");
            assert.equal(outcomes[1].reason.code, "LAST_ACTIVE_ADMIN");
            assert.deepEqual(await estado(actor.id), antes);
            await acesso(actorPair);
        });
        t.diagnostic(`C2.1: ${respostas} respostas HTTP conferidas; sem tokens nos diagnósticos.`);
    } finally {
        prisma.$transaction = transaction;
        if (server) await new Promise(resolve => server.close(resolve));
        await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        await prisma.$disconnect();
    }
});
