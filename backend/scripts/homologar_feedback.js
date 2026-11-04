// Trilho F2: destino novo, identificado, exclusivo; nenhuma recuperação automática.
import assert from "node:assert/strict";
import { readFile, readdir, writeFile, stat, mkdir, open } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import pg from "pg";
import { assertTestDatabase } from "./assert-test-db.js";

const pasta = new URL("../../.cache/feedback_f2/", import.meta.url);
async function main(acao = process.argv[2]) {
    const e = process.env;
    assert.equal(e.FEEDBACK_TEST_EXCLUSIVE, "1"); assert.equal(e.SECURITY_TEST_DATABASE_EXCLUSIVE, "1");
    const target = assertTestDatabase(); assert.equal(target.hostname, "loopback"); assert.equal(target.database, "portal_test");
    assert.equal(target.port, Number(e.TEST_POSTGRES_PORT)); assert.match(e.TEST_COMPOSE_PROJECT, /^portal_feedback_f2_[a-z0-9_]+$/);
    const principal = new URL(e.TEST_DATABASE_URL); assert.equal(principal.search, ""); assert.equal(principal.username, "portal_test");
    for (const [key, papel] of [["SECURITY_API_DATABASE_URL", "portal_api"], ["SECURITY_MIGRATION_DATABASE_URL", "portal_migrator"],
        ["METRICAS_OPERACAO_URL", "portal_metricas_operador"], ["FEEDBACK_OPERACAO_URL", "portal_feedback_operador"]]) {
        const u = new URL(e[key]); assert.equal(u.host + u.pathname, principal.host + principal.pathname); assert.equal(u.search, ""); assert.equal(u.username, papel);
    }
    if (acao === "completo") {
        // Compose deve ter sido criado explicitamente pelo chamador a partir de volume novo.
        const executarDocker = args => {
            const r = spawnSync("docker", args, { encoding: "utf8", windowsHide: true });
            assert.equal(r.status, 0, "Falha na conferência Docker"); return JSON.parse(r.stdout)[0];
        };
        const c = executarDocker(["inspect", `${e.TEST_COMPOSE_PROJECT}-db_test-1`]);
        const volume = `${e.TEST_COMPOSE_PROJECT}_pg_feedback_test`, v = executarDocker(["volume", "inspect", volume]);
        assert.equal(c.Config.Labels["com.docker.compose.project"], e.TEST_COMPOSE_PROJECT);
        assert.equal(v.Labels["com.docker.compose.project"], e.TEST_COMPOSE_PROJECT);
        assert.ok(c.Mounts.some(m => m.Name === volume && m.Destination === "/var/lib/postgresql/data"));
        await mkdir(pasta, { recursive: true });
        await writeFile(new URL("docker.json", pasta), JSON.stringify({ project: e.TEST_COMPOSE_PROJECT, container: c.Id, volume, image: c.Image, ports: c.NetworkSettings.Ports }), { flag: "wx" });
        await main("identificar"); await main("migrar");
        const arquivo = await open(new URL("antes_fixtures.dump", pasta), "wx");
        try {
            const r = spawnSync("docker", ["exec", c.Id, "pg_dump", "-U", "portal_test", "-d", "portal_test", "-Fc"], { stdio: ["ignore", arquivo.fd, "pipe"], windowsHide: true });
            assert.equal(r.status, 0, "Backup F2 falhou; não iniciar fixtures.");
        } finally { await arquivo.close(); }
        await main("suite"); await main("integridade"); return;
    }
    const docker = JSON.parse(await readFile(new URL("docker.json", pasta)));
    assert.equal(docker.project, e.TEST_COMPOSE_PROJECT);
    assert.equal(docker.ports["5432/tcp"][0].HostIp, "127.0.0.1"); assert.equal(docker.ports["5432/tcp"][0].HostPort, String(target.port));
    const admin = new pg.Client({ connectionString: principal.href }); await admin.connect();
    let identidade;
    try {
        await admin.query("BEGIN READ ONLY");
        const { rows: [r] } = await admin.query(`SELECT current_database() banco,current_user papel,system_identifier::text cluster,
            current_setting('server_version_num')::int versao, inet_server_port() porta,
            (SELECT count(*)::int FROM pg_tables WHERE schemaname='public') tabelas FROM pg_control_system()`);
        assert.equal(r.banco, "portal_test"); assert.equal(r.papel, "portal_test"); assert.equal(r.porta, 5432); assert.ok(r.versao >= 170000 && r.versao < 180000);
        const roles = (await admin.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname IN ('portal_api','portal_migrator','portal_metricas_operador','portal_feedback_operador') ORDER BY rolname")).rows;
        assert.equal(roles.length, 4); assert.ok(roles.every(r => !r.rolsuper && !r.rolcreatedb && !r.rolcreaterole && !r.rolbypassrls));
        if (acao === "identificar") {
            assert.equal(r.tabelas, 0, "Exige banco vazio, sem reaproveitar F2/H2/S1.");
            identidade = { ...r, host: principal.hostname, portaPublicada: target.port, projeto: e.TEST_COMPOSE_PROJECT, volume: docker.volume, papeis: roles.map(r => r.rolname) };
            await writeFile(new URL("identidade.json", pasta), JSON.stringify(identidade, null, 2), { flag: "wx" });
            console.log(JSON.stringify(identidade)); return;
        }
        identidade = JSON.parse(await readFile(new URL("identidade.json", pasta)));
        assert.equal(r.cluster, identidade.cluster); assert.equal(identidade.projeto, e.TEST_COMPOSE_PROJECT);
        if (acao === "migrar") assert.equal(r.tabelas, 0, "Não repete migrations após falha.");
    } finally { await admin.query("ROLLBACK"); await admin.end(); }
    const env = { ...e, METRICAS_TEST_CLUSTER: identidade.cluster, METRICAS_TEST_PORT: String(target.port),
        METRICAS_OPERACAO_CLUSTER: identidade.cluster, METRICAS_OPERACAO_HOST: principal.hostname, METRICAS_OPERACAO_PORTA: String(target.port), METRICAS_OPERACAO_BANCO: target.database,
        FEEDBACK_TEST_CLUSTER: identidade.cluster, FEEDBACK_OPERACAO_CLUSTER: identidade.cluster, FEEDBACK_OPERACAO_HOST: principal.hostname,
        FEEDBACK_OPERACAO_PORTA: String(target.port), FEEDBACK_OPERACAO_BANCO: target.database,
        FEEDBACK_RECEBIMENTO_ATIVO: "false", FEEDBACK_CONSULTA_ATIVA: "false", METRICAS_COLETA_ATIVA: "false", METRICAS_CONSULTA_ATIVA: "false" };
    function run(args, childEnv = env) {
        const r = spawnSync(process.execPath, args, { env: childEnv, stdio: "inherit", windowsHide: true });
        if (r.error || r.status !== 0) throw new Error("ETAPA_F2_FALHOU");
    }
    if (acao === "migrar") {
        for (let i = 0; i < 2; i++) run(["node_modules/prisma/build/index.js", "migrate", "deploy"], { ...env, DATABASE_URL: e.SECURITY_MIGRATION_DATABASE_URL });
        const owner = new pg.Client({ connectionString: e.SECURITY_MIGRATION_DATABASE_URL }); await owner.connect();
        try {
            await owner.query(await readFile(new URL("sql/permissoes_metricas.sql", import.meta.url), "utf8"));
            await owner.query(await readFile(new URL("sql/permissoes_feedback.sql", import.meta.url), "utf8"));
        } finally { await owner.end(); }
    } else if (["testes", "suite"].includes(acao)) {
        const backup = await stat(new URL("antes_fixtures.dump", pasta)); assert.ok(backup.size > 0);
        run(acao === "suite" ? ["scripts/run-suite.js"] : ["--test", "--test-concurrency=1", "test/feedback.test.js", "test/feedbackSeguranca.test.js", "test/feedback.integration.test.js"]);
    } else if (acao !== "integridade") throw new Error("Etapa inválida");
    const owner = new pg.Client({ connectionString: e.SECURITY_MIGRATION_DATABASE_URL }); await owner.connect();
    try {
        await owner.query("BEGIN READ ONLY");
        const rows = (await owner.query("SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name")).rows;
        const dirs = (await readdir("prisma/migrations")).filter(n => /^\d/.test(n)).sort();
        assert.equal(rows.length, 12); assert.deepEqual(rows.map(r => r.migration_name), dirs);
        for (const r of rows) {
            assert.ok(r.finished_at && !r.rolled_back_at);
            assert.equal(r.checksum, createHash("sha256").update(await readFile(`prisma/migrations/${r.migration_name}/migration.sql`)).digest("hex"));
        }
        console.log("12 migrations: nomes, integridade e checksums conferidos.");
    } finally { await owner.query("ROLLBACK"); await owner.end(); }
    if (acao === "integridade") {
        run(["scripts/test-db.js", "integrity"]);
        const op = new pg.Client({ connectionString: e.METRICAS_OPERACAO_URL }); await op.connect();
        try { await op.query(await readFile("prisma/tests/integrity_metricas.sql", "utf8")); }
        finally { await op.end(); }
        const leitor = new pg.Client({ connectionString: e.SECURITY_MIGRATION_DATABASE_URL }); await leitor.connect();
        try { await leitor.query(await readFile("prisma/tests/integrity_feedback.sql", "utf8")); }
        finally { await leitor.end(); }
        console.log("Integridade SQL histórica, V2 e Feedback aprovada.");
    }
}
main().catch(error => { console.error("F2_FALHOU: nenhuma repetição de escrita autorizada.", error.code ?? error.message); process.exitCode = 1; });
