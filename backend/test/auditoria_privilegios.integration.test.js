import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const cluster = process.env.AUDITORIA_TEST_CLUSTER;
test("S3-A1: AuditLog com portal_api efetivo em PostgreSQL 17 descartável", {
    skip: !cluster && "Exige AUDITORIA_TEST_CLUSTER e banco novo exclusivo, provisionado para S3-A1.",
}, async t => {
    assert.equal(process.env.TEST_DATABASE_EXCLUSIVE, "1");
    assert.equal(process.env.SECURITY_TEST_DATABASE_EXCLUSIVE, "1");
    const urls = [process.env.TEST_DATABASE_URL, process.env.SECURITY_MIGRATION_DATABASE_URL, process.env.SECURITY_API_DATABASE_URL];
    const configs = urls.map(value => new URL(value));
    for (const config of configs) {
        assert.equal(config.hostname, "127.0.0.1");
        assert.match(config.pathname, /^\/[a-z0-9_]+_test$/);
        assert.equal(config.host + config.pathname, configs[0].host + configs[0].pathname);
    }
    assert.equal(configs[1].username, "portal_migrator");
    assert.equal(configs[2].username, "portal_api");
    const [fixture, owner, api] = urls.map(connectionString => new pg.Client({ connectionString }));
    const sql = await readFile(new URL("../scripts/sql/permissoes_auditoria.sql", import.meta.url), "utf8");
    const ids = [], eventos = [];
    let prisma, server, identidadeConfirmada = false;
    async function aplicar() {
        try { await owner.query(sql); }
        catch (error) { await owner.query("ROLLBACK"); throw error; }
    }
    async function isolada(client, fn) {
        await client.query("BEGIN");
        try { return await fn(); }
        finally { await client.query("ROLLBACK"); }
    }
    const acl = async () => (await fixture.query(`SELECT relacl::text FROM pg_class WHERE oid='public.audit_log'::regclass`)).rows;
    async function restrita() {
        const { rows: [row] } = await api.query(`SELECT current_user papel,
            has_table_privilege(current_user, 'public.audit_log', 'SELECT') leitura,
            has_table_privilege(current_user, 'public.audit_log', 'INSERT') insercao,
            has_table_privilege(current_user, 'public.audit_log', 'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') mutacao,
            has_any_column_privilege(current_user, 'public.audit_log', 'UPDATE,REFERENCES') coluna,
            has_table_privilege(current_user, 'public.audit_log', 'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION') concessao`);
        assert.deepEqual(row, { papel: "portal_api", leitura: true, insercao: true, mutacao: false, coluna: false, concessao: false });
        assert.equal((await fixture.query(`SELECT count(*)::int n FROM pg_class c, LATERAL aclexplode(c.relacl) a
            WHERE c.oid='public.audit_log'::regclass AND a.grantee=0`)).rows[0].n, 0);
    }
    try {
        await fixture.connect();
        await fixture.query("BEGIN READ ONLY");
        const { rows: [id] } = await fixture.query(`SELECT system_identifier::text cluster, current_database() banco,
            current_setting('server_version_num')::int versao FROM pg_control_system()`);
        assert.equal(id.cluster, cluster);
        assert.equal("/" + id.banco, configs[0].pathname);
        assert.ok(id.versao >= 170000 && id.versao < 180000);
        await fixture.query("COMMIT");
        identidadeConfirmada = true;
        await Promise.all([owner.connect(), api.connect()]);

        await t.test("idempotência, PUBLIC, grants por coluna e defaults das demais tabelas", async () => {
            const outros = async () => ({
                tabelas: (await fixture.query(`SELECT oid,relacl::text FROM pg_class
                    WHERE relnamespace='public'::regnamespace AND oid<>'public.audit_log'::regclass ORDER BY oid`)).rows,
                defaults: (await fixture.query("SELECT oid,defaclacl::text FROM pg_default_acl ORDER BY oid")).rows,
            });
            const antes = await outros();
            await owner.query("GRANT UPDATE, DELETE, TRUNCATE ON public.audit_log TO PUBLIC, portal_api");
            await owner.query("GRANT UPDATE (action), REFERENCES (id) ON public.audit_log TO PUBLIC, portal_api");
            await owner.query("GRANT SELECT, INSERT ON public.audit_log TO portal_api WITH GRANT OPTION");
            await aplicar(); await restrita();
            const primeira = await acl();
            await aplicar(); await restrita();
            assert.deepEqual(await acl(), primeira);
            assert.deepEqual(await outros(), antes);
        });

        for (const opcoes of ["INHERIT TRUE, SET FALSE", "INHERIT FALSE, SET TRUE", "INHERIT FALSE, SET FALSE"]) {
            await t.test(`recusa membership mesmo com ${opcoes}`, async () => {
                const antes = await acl();
                await fixture.query(`GRANT portal_migrator TO portal_api WITH ${opcoes}`);
                try { await assert.rejects(aplicar(), /membership/); }
                finally { await fixture.query("REVOKE portal_migrator FROM portal_api"); }
                assert.deepEqual(await acl(), antes);
                await restrita();
            });
        }
        await t.test("recusa ownership e CREATE via PUBLIC sem alterar ACLs", async () => {
            const antes = await acl();
            await fixture.query("ALTER TABLE public.audit_log OWNER TO portal_api");
            try { await assert.rejects(aplicar(), /ownership/); }
            finally { await fixture.query("ALTER TABLE public.audit_log OWNER TO portal_migrator"); }
            // ALTER OWNER pode reescrever ACLs; a política é restaurada explicitamente.
            await aplicar();
            assert.deepEqual(await acl(), antes);
            await fixture.query("GRANT CREATE ON SCHEMA public TO PUBLIC");
            try { await assert.rejects(aplicar(), /DDL/); }
            finally { await fixture.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC"); }
            assert.deepEqual(await acl(), antes);
        });

        const negativas = [
            "UPDATE public.audit_log SET action='forjada'",
            "DELETE FROM public.audit_log", "TRUNCATE public.audit_log",
            "ALTER TABLE public.audit_log ADD COLUMN proibida text",
            "ALTER TABLE public.audit_log OWNER TO portal_api",
            "ALTER TABLE public.audit_log DISABLE TRIGGER ALL",
            "DROP TABLE public.audit_log", "CREATE TABLE public.s3a1_proibida (id int)",
            "SET ROLE portal_migrator", "SET SESSION AUTHORIZATION portal_migrator",
            "ALTER ROLE portal_api SUPERUSER", "GRANT portal_migrator TO portal_api",
        ];
        for (const comando of negativas) await t.test(`API nega ${comando}`, async () => {
            await isolada(api, () => assert.rejects(api.query(comando), { code: "42501" }));
            assert.equal((await api.query("SELECT current_user papel")).rows[0].papel, "portal_api");
        });
        await t.test("API não pode conceder UPDATE a si própria", async () => {
            // PostgreSQL pode responder WARNING sem erro para GRANT sem grant option.
            await isolada(api, async () => { await api.query("GRANT UPDATE ON public.audit_log TO portal_api"); await restrita(); });
        });
        await t.test("recriação recebe defaults amplos e requer reaplicação antes de servir", async () => {
            // Ensaio inteiro revertido: preserva OID, FKs, dados e índices originais.
            await isolada(owner, async () => {
                await owner.query("ALTER TABLE public.audit_log RENAME TO audit_log_s3a1_original");
                await owner.query("CREATE TABLE public.audit_log (LIKE public.audit_log_s3a1_original INCLUDING ALL)");
                assert.equal((await owner.query("SELECT has_table_privilege('portal_api','public.audit_log','UPDATE') p")).rows[0].p, true);
                // O script já possui transação; aqui executamos seu corpo dentro do ensaio.
                await owner.query(sql.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""));
                assert.equal((await owner.query("SELECT has_table_privilege('portal_api','public.audit_log','UPDATE,DELETE,TRUNCATE') p")).rows[0].p, false);
            });
            await restrita();
        });

        // Serviços e HTTP usam exclusivamente portal_api. Só fixtures/limpeza usam DBA.
        process.env.DATABASE_URL = urls[2];
        ({ default: prisma } = await import("../src/config/prisma.js"));
        const { default: app } = await import("../src/app.js");
        const { hashPassword } = await import("../src/utils/password.js");
        const admins = await import("../src/services/adminService.js");
        const senha = "SenhaSinteticaS3A1!", hash = await hashPassword(senha);
        async function usuario(role) {
            const userId = randomUUID(), email = userId + "@example.invalid";
            await fixture.query(`INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,'Fixture S3-A1',$2,$3,$4)`, [userId, email, hash, role]);
            ids.push(userId); return { id: userId, email, role };
        }
        const actor = await usuario("ADMIN"), editor = await usuario("EDITOR");
        assert.equal((await prisma.$queryRaw`SELECT current_user papel`)[0].papel, "portal_api");
        server = app.listen(0, "127.0.0.1");
        await new Promise(resolve => server.once("listening", resolve));
        async function http(route, method, body, token, status) {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
                method, headers: { "content-type": "application/json", ...(token && { authorization: "Bearer " + token }) },
                ...(body && { body: JSON.stringify(body) }),
            });
            assert.equal(response.status, status, `${method} ${route}`);
            if (route.startsWith("/admin/auditoria")) assert.equal(response.headers.get("cache-control"), "private, no-store");
            return (await response.json()).data;
        }
        const login = user => http("/auth/login", "POST", { email: user.email, password: senha }, null, 200);
        const actorPair = await login(actor), editorPair = await login(editor);
        const estado = async () => ({
            usuario: (await fixture.query("SELECT * FROM users WHERE id=$1", [editor.id])).rows,
            sessoes: (await fixture.query("SELECT * FROM auth_sessions WHERE user_id=$1 ORDER BY id", [editor.id])).rows,
            refreshes: (await fixture.query("SELECT r.* FROM refresh_tokens r JOIN auth_sessions s ON s.id=r.session_id WHERE s.user_id=$1 ORDER BY r.id", [editor.id])).rows,
            eventos: (await fixture.query("SELECT * FROM audit_log WHERE entity_id=$1 ORDER BY id", [editor.id])).rows,
        });
        await t.test("INSERT transacional e consulta H1/H2 ADMIN, com EDITOR negado", async () => {
            await admins.updateAdmin(editor.id, { nome: "Conta atualizada S3-A1" }, actor);
            const lista = await http(`/admin/auditoria?entityId=${editor.id}`, "GET", null, actorPair.token, 200);
            assert.equal(lista.paginacao.total, 1);
            const evento = lista.itens[0]; eventos.push(evento.id);
            const detalhe = await http(`/admin/auditoria/${evento.id}`, "GET", null, actorPair.token, 200);
            assert.equal(detalhe.action, "USER_UPDATE");
            assert.equal(detalhe.newValues.name, "Conta atualizada S3-A1");
            assert.equal(detalhe.user.id, actor.id);
            assert.doesNotMatch(JSON.stringify(detalhe), /password_hash|passwordHash|tokenVersion/);
            await http("/admin/auditoria", "GET", null, editorPair.token, 403);
            await http(`/admin/auditoria/${evento.id}`, "GET", null, editorPair.token, 403);
        });
        await t.test("falha real de INSERT reverte negócio, versão, sessões e auditoria C2.1", async () => {
            const antes = await estado();
            await owner.query("REVOKE INSERT ON public.audit_log FROM portal_api");
            try {
                await assert.rejects(api.query(`INSERT INTO audit_log (action,entity,entity_id) VALUES ('USER_UPDATE','User',$1)`, [editor.id]), { code: "42501" });
                await assert.rejects(admins.changeAdminStatus(editor.id, false, actor));
                assert.deepEqual(await estado(), antes);
                await assert.rejects(admins.updateAdmin(editor.id, { nome: "Não deve persistir" }, actor));
                assert.deepEqual(await estado(), antes);
            } finally { await aplicar(); }
            await restrita();
        });
        await t.test("C2.1 desativação/reativação, no-op e refresh antigo continuam protegidos", async () => {
            const status = ativo => http(`/admins/${editor.id}/status`, "PATCH", { ativo }, actorPair.token, 200);
            await status(false);
            const inativo = await estado();
            assert.equal(inativo.usuario[0].token_version, 1);
            assert.ok(inativo.sessoes.every(s => s.revoked_at));
            await status(false); assert.deepEqual(await estado(), inativo);
            await status(true);
            const ativo = await estado();
            assert.equal(ativo.usuario[0].token_version, 2);
            assert.deepEqual(ativo.sessoes, inativo.sessoes);
            assert.deepEqual(ativo.eventos.map(e => e.action).sort(), ["USER_ACTIVATE", "USER_DEACTIVATE", "USER_UPDATE"]);
            await http("/admin/dashboard", "GET", null, editorPair.token, 401);
            await http("/auth/refresh", "POST", { refreshToken: editorPair.refreshToken }, null, 401);
            await http("/admin/dashboard", "GET", null, (await login(editor)).token, 200);
        });
        await t.test("limite explícito: DELETE do usuário pode nulificar ator pela FK", async () => {
            const ator = await usuario("EDITOR");
            await isolada(api, async () => {
                const { rows: [evento] } = await api.query(`INSERT INTO audit_log (user_id,action,entity,entity_id)
                    VALUES ($1,'USER_UPDATE','User',$1) RETURNING id`, [ator.id]);
                await api.query("DELETE FROM users WHERE id=$1", [ator.id]);
                assert.equal((await api.query("SELECT user_id FROM audit_log WHERE id=$1", [evento.id])).rows[0].user_id, null);
            });
        });
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        await prisma?.$disconnect();
        if (identidadeConfirmada && ids.length) {
            await fixture.query("DELETE FROM audit_log WHERE entity_id=ANY($1::uuid[]) OR id=ANY($2::uuid[])", [ids, eventos]);
            await fixture.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
        }
        await Promise.all([fixture.end(), owner.end(), api.end()]);
    }
});
