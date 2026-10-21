import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const apiUrl = process.env.SECURITY_API_DATABASE_URL;
const migrationUrl = process.env.SECURITY_MIGRATION_DATABASE_URL;
test("PostgreSQL descartável: API faz CRUD, sem DDL, superusuário ou associação privilegiada", {
    skip: !apiUrl || !migrationUrl ? "Defina SECURITY_API_DATABASE_URL e SECURITY_MIGRATION_DATABASE_URL em banco descartável." : false,
}, async () => {
    const apiConfig = new URL(apiUrl), migrationConfig = new URL(migrationUrl);
    assert.equal(process.env.SECURITY_TEST_DATABASE_EXCLUSIVE, "1", "Exige confirmação de banco exclusivo descartável.");
    assert.match(decodeURIComponent(apiConfig.pathname), /_test$/);
    assert.equal(apiConfig.host + apiConfig.pathname, migrationConfig.host + migrationConfig.pathname);
    assert.equal(decodeURIComponent(apiConfig.username), "portal_api");
    assert.equal(decodeURIComponent(migrationConfig.username), "portal_migrator");
    const api = new pg.Client({ connectionString: apiUrl }), migration = new pg.Client({ connectionString: migrationUrl });
    const table = "security_fixture_" + randomUUID().replaceAll("-", "");
    let created = false;
    try {
        await Promise.all([api.connect(), migration.connect()]);
        const { rows: [role] } = await api.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user");
        assert.deepEqual(Object.values(role), [false, false, false, false, false]);
        assert.equal((await api.query("SELECT pg_has_role(current_user, 'portal_migrator', 'MEMBER') AS member")).rows[0].member, false);
        assert.equal((await api.query("SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS allowed")).rows[0].allowed, false);
        await migration.query(`CREATE TABLE public.${table} (id SERIAL PRIMARY KEY, value text NOT NULL)`);
        created = true;
        await api.query(`INSERT INTO public.${table} (value) VALUES ('fixture')`);
        assert.equal((await api.query(`SELECT value FROM public.${table}`)).rows[0].value, "fixture");
        await api.query(`UPDATE public.${table} SET value = 'atualizada'`);
        for (const sql of [`ALTER TABLE public.${table} ADD COLUMN proibida text`, `DROP TABLE public.${table}`,
            `CREATE TABLE public.${table}_proibida (id int)`, "SET ROLE portal_migrator"]) {
            await assert.rejects(api.query(sql), { code: "42501" });
        }
        await api.query(`DELETE FROM public.${table}`);
        assert.equal((await api.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count, 0);
    } finally {
        // Só a fixture de nome aleatório criada neste teste, em banco _test autorizado.
        if (created) await migration.query(`DROP TABLE public.${table}`);
        await Promise.all([api.end(), migration.end()]);
    }
});
