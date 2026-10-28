// Trilho CI/local: somente banco de teste novo, isolado e com bootstrap já executado.
import "dotenv/config";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import pg from "pg";
import { assertTestDatabase } from "./assert-test-db.js";

async function main() {
    const target = assertTestDatabase();
    assert.equal(target.database, "portal_test"); assert.equal(target.hostname, "loopback");
    assert.equal(target.port, Number(process.env.TEST_POSTGRES_PORT));
    const principal = new URL(process.env.TEST_DATABASE_URL);
    for (const [key, role] of [["SECURITY_MIGRATION_DATABASE_URL", "portal_migrator"], ["SECURITY_API_DATABASE_URL", "portal_api"], ["METRICAS_OPERACAO_URL", "portal_metricas_operador"]]) {
        const u = new URL(process.env[key]);
        assert.equal(u.host + u.pathname, principal.host + principal.pathname); assert.equal(u.username, role); assert.equal(u.search, "");
    }
    assert.equal(process.env.TEST_DATABASE_EXCLUSIVE, "1"); assert.equal(process.env.SECURITY_TEST_DATABASE_EXCLUSIVE, "1");
    const admin = new pg.Client({ connectionString: principal.href }); await admin.connect();
    let cluster;
    try {
        await admin.query("BEGIN READ ONLY");
        const { rows: [id] } = await admin.query(`SELECT current_database() banco,current_user papel,system_identifier::text cluster,
            inet_server_port() porta,(SELECT count(*)::int FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()) outras FROM pg_control_system()`);
        assert.equal(id.banco, "portal_test"); assert.equal(id.papel, "portal_test"); assert.equal(id.porta, 5432); assert.equal(id.outras, 0);
        assert.equal((await admin.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 0, "Exige banco novo: não repete trilho em banco usado.");
        const { rows: roles } = await admin.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname IN ('portal_api','portal_migrator','portal_metricas_operador') ORDER BY rolname");
        assert.equal(roles.length, 3); assert.ok(roles.every(r => !r.rolsuper && !r.rolcreatedb && !r.rolcreaterole));
        cluster = id.cluster;
        if (process.env.METRICAS_TEST_CLUSTER) assert.equal(cluster, process.env.METRICAS_TEST_CLUSTER);
        await admin.query("ROLLBACK");
        console.log(JSON.stringify({ destino: target, cluster, executorBootstrap: id.papel, tabelasIniciais: 0, outrasSessoes: 0 }));
    } finally { await admin.end(); }
    const env = { ...process.env, METRICAS_TEST_CLUSTER: cluster, METRICAS_TEST_PORT: String(target.port),
        METRICAS_OPERACAO_CLUSTER: cluster, METRICAS_OPERACAO_HOST: principal.hostname,
        METRICAS_OPERACAO_PORTA: String(target.port), METRICAS_OPERACAO_BANCO: target.database,
        METRICAS_COLETA_ATIVA: "false", METRICAS_CONSULTA_ATIVA: "false" };
    function run(args, childEnv = env) {
        const result = spawnSync(process.execPath, args, { env: childEnv, stdio: "inherit", windowsHide: true });
        if (result.error || result.status !== 0) throw new Error("ETAPA_FALHOU");
    }
    const migrator = new pg.Client({ connectionString: env.SECURITY_MIGRATION_DATABASE_URL }); await migrator.connect();
    try {
        await migrator.query("BEGIN READ ONLY");
        const { rows: [r] } = await migrator.query("SELECT current_user papel,current_database() banco,has_database_privilege(current_user,current_database(),'CREATE') ddl");
        assert.deepEqual(r, { papel: "portal_migrator", banco: "portal_test", ddl: true });
        await migrator.query("ROLLBACK");
    } finally { await migrator.end(); }
    // Não resolve/reset/repara migrations automaticamente. Qualquer falha encerra o trilho.
    for (let i = 0; i < 2; i++) run(["node_modules/prisma/build/index.js", "migrate", "deploy"], { ...env, DATABASE_URL: env.SECURITY_MIGRATION_DATABASE_URL });
    const owner = new pg.Client({ connectionString: env.SECURITY_MIGRATION_DATABASE_URL }); await owner.connect();
    try {
        await owner.query("BEGIN READ ONLY");
        const { rows } = await owner.query("SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name");
        const pastas = (await readdir("prisma/migrations")).filter(n => /^\d/.test(n)).sort();
        assert.equal(rows.length, 11); assert.deepEqual(rows.map(r => r.migration_name), pastas);
        for (const r of rows) {
            assert.ok(r.finished_at); assert.equal(r.rolled_back_at, null);
            assert.equal(r.checksum, createHash("sha256").update(await readFile(`prisma/migrations/${r.migration_name}/migration.sql`)).digest("hex"));
        }
        await owner.query("ROLLBACK"); console.log("11 migrations concluídas na primeira tentativa, checksums iguais; repetição sem pendências.");
        await owner.query(await readFile("scripts/sql/permissoes_metricas.sql", "utf8"));
    } finally { await owner.end(); }
    run(["scripts/run-suite.js"]);
    run(["scripts/test-db.js", "integrity"]);
    const op = new pg.Client({ connectionString: env.METRICAS_OPERACAO_URL }); await op.connect();
    try { await op.query(await readFile("prisma/tests/integrity_metricas.sql", "utf8")); }
    finally { await op.end(); }
    console.log("Trilho isolado concluído: bootstrap, deploy, papéis, V1/V2 e integridade.");
}
main().catch(() => { console.error("VALIDACAO_METRICAS_TEST_FALHOU: conferir evidências acima; não repetir escritas falhas nem reparar automaticamente."); process.exitCode = 1; });
