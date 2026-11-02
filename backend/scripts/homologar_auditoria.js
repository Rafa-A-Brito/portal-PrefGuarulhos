// Opt-in H2: somente o projeto/volume novos declarados abaixo. Nunca lê .env.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcrypt";

const root = fileURLToPath(new URL("../../", import.meta.url));
const out = path.join(root, ".cache/h2"), arquivo = path.join(out, "privado.json");
const projeto = "portal_h2_20261101_test", porta = "5439";
assert.equal(process.env.HOMOLOGACAO_H2_EXCLUSIVA, "1");
function executar(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { cwd: root, windowsHide: true, encoding: "utf8", maxBuffer: 8e6, ...opts });
    if (r.status !== 0) throw new Error("Etapa falhou: " + cmd + " " + (r.stderr ?? r.error?.message ?? ""));
    return r.stdout;
}
const docker = args => executar("docker", args);
const salvar = s => writeFile(arquivo, JSON.stringify(s, null, 2));
async function identificar(s) {
    const u = new URL(s.env.TEST_DATABASE_URL);
    assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, porta); assert.equal(u.pathname, "/portal_test");
    const c = new pg.Client({ connectionString: u.href }); await c.connect();
    try {
        await c.query("BEGIN READ ONLY");
        const { rows: [id] } = await c.query("SELECT current_database() banco,current_user papel,system_identifier::text cluster,inet_server_port() porta,current_setting('server_version') versao FROM pg_control_system()");
        assert.equal(id.banco, "portal_test"); assert.equal(id.papel, "portal_test"); assert.equal(id.porta, 5432); assert.match(id.versao, /^17\./);
        if (s.cluster) assert.equal(id.cluster, s.cluster);
        await c.query("ROLLBACK"); console.log(JSON.stringify({ host: u.hostname, portaPublicada: porta, ...id }));
        return { c, id };
    } catch (e) { await c.end(); throw e; }
}
async function main() {
    const etapa = process.argv[2];
    if (etapa === "preparar") {
        await mkdir(out, { recursive: true }); await assert.rejects(access(arquivo));
        assert.ok(!docker(["volume", "ls", "--format", "{{.Name}}"]).split(/\r?\n/).includes(projeto + "_pg_test"));
        assert.ok(!docker(["ps", "-a", "--format", "{{.Names}}"]).includes(projeto));
        const env = { TEST_POSTGRES_PORT: porta, TEST_DATABASE_EXCLUSIVE: "1", SECURITY_TEST_DATABASE_EXCLUSIVE: "1",
            DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/isolated_test", JWT_SECRET: randomBytes(32).toString("hex"),
            MOCK_DATA: "false", DOTENV_CONFIG_PATH: path.join(out, "nao_existe.env"), METRICAS_COLETA_ATIVA: "false", METRICAS_CONSULTA_ATIVA: "false", NODE_OPTIONS: "--use-system-ca" };
        for (const k of ["TEST_POSTGRES_PASSWORD", "TEST_API_PASSWORD", "TEST_MIGRATION_PASSWORD", "TEST_METRICAS_PASSWORD"]) env[k] = randomBytes(24).toString("hex");
        for (const [k, role, pw] of [["TEST_DATABASE_URL", "portal_test", "TEST_POSTGRES_PASSWORD"], ["SECURITY_API_DATABASE_URL", "portal_api", "TEST_API_PASSWORD"], ["SECURITY_MIGRATION_DATABASE_URL", "portal_migrator", "TEST_MIGRATION_PASSWORD"], ["METRICAS_OPERACAO_URL", "portal_metricas_operador", "TEST_METRICAS_PASSWORD"]]) env[k] = `postgresql://${role}:${env[pw]}@127.0.0.1:${porta}/portal_test`;
        const s = { env }; await salvar(s);
        executar("docker", ["compose", "-f", "compose.metricas.test.yml", "-p", projeto, "up", "-d", "--wait", "db_test"], { env: { ...process.env, ...env } });
        const info = JSON.parse(docker(["inspect", projeto + "-db_test-1"]))[0];
        assert.deepEqual(info.HostConfig.PortBindings["5432/tcp"], [{ HostIp: "127.0.0.1", HostPort: porta }]);
        assert.equal(info.Mounts.find(m => m.Destination === "/var/lib/postgresql/data").Name, projeto + "_pg_test");
        const { c, id } = await identificar(s);
        try {
            await c.query("BEGIN READ ONLY");
            assert.equal((await c.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 0);
            assert.equal((await c.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()")).rows[0].n, 0);
            await c.query("ROLLBACK"); s.cluster = id.cluster; await salvar(s);
            await writeFile(path.join(out, "destino.json"), JSON.stringify({ projeto, host: "127.0.0.1", porta, volume: projeto + "_pg_test", ...id }, null, 2));
        } finally { await c.end(); }
        return;
    }
    const s = JSON.parse(await readFile(arquivo, "utf8"));
    const { c } = await identificar(s);
    if (etapa === "validar") {
        await c.end(); assert.equal(s.validado, undefined);
        executar(process.execPath, ["scripts/validar_metricas_test.js"], { cwd: path.join(root, "backend"), env: { ...process.env, ...s.env, METRICAS_TEST_CLUSTER: s.cluster }, stdio: "inherit" });
        s.validado = true; return salvar(s);
    }
    try {
        assert.equal(s.validado, true);
        if (etapa === "conferir") {
            await c.query("BEGIN READ ONLY");
            try {
                const migrations = (await c.query("SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name")).rows;
                assert.equal(migrations.length, 11);
                for (const m of migrations) {
                    assert.ok(m.finished_at && !m.rolled_back_at);
                    assert.match(m.migration_name, /^[a-zA-Z0-9_]+$/);
                    const bytes = await readFile(path.join(root, "backend/prisma/migrations", m.migration_name, "migration.sql"));
                    assert.equal(createHash("sha256").update(bytes).digest("hex"), m.checksum);
                }
                const contagens = (await c.query("SELECT (SELECT count(*)::int FROM audit_log) eventos,(SELECT count(*)::int FROM patrimonio) bens,(SELECT count(*)::int FROM users) usuarios")).rows[0];
                const acoes = (await c.query("SELECT action,count(*)::int quantidade FROM audit_log GROUP BY action ORDER BY action")).rows;
                const papeis = (await c.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,has_database_privilege(rolname,current_database(),'CREATE') cria_banco,has_schema_privilege(rolname,'public','CREATE') cria_schema FROM pg_roles WHERE rolname IN ('portal_migrator','portal_api','portal_metricas_operador') ORDER BY rolname")).rows;
                for (const p of papeis) { assert.ok(!p.rolsuper && !p.rolcreatedb && !p.rolcreaterole); if (p.rolname !== "portal_migrator") assert.ok(!p.cria_banco && !p.cria_schema); }
                const resultado = { cluster: s.cluster, contagens, acoes, papeis, migrations };
                await writeFile(path.join(out, "final.json"), JSON.stringify(resultado, null, 2));
                console.log(JSON.stringify(resultado));
            } finally { await c.query("ROLLBACK"); }
            return;
        }
        if (etapa === "fixtures") {
            assert.equal(s.fixture, undefined);
            await c.query("BEGIN READ ONLY");
            assert.equal((await c.query("SELECT count(*)::int n FROM patrimonio")).rows[0].n, 0);
            await c.query("ROLLBACK");
            // Backup do descartável já migrado, antes das fixtures. Nunca saída no terminal.
            const backup = executar("docker", ["exec", projeto + "-db_test-1", "pg_dump", "-U", "portal_test", "-d", "portal_test", "--no-owner"]);
            await writeFile(path.join(out, "antes_fixtures.sql"), backup);
            const f = { senha: randomBytes(18).toString("hex"), admin: randomUUID(), editor: randomUUID(), outro: randomUUID(), categoria: randomUUID() };
            await c.query("BEGIN");
            try {
                const hash = await bcrypt.hash(f.senha, 10);
                for (const [key, role] of [["admin", "ADMIN"], ["editor", "EDITOR"], ["outro", "ADMIN"]]) await c.query("INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)", [f[key], "H2 " + key, key + "@h2.example.test", hash, role]);
                await c.query("INSERT INTO categoria(id,nome,slug) VALUES($1,'Categoria sintética H2','categoria-sintetica-h2')", [f.categoria]);
                await c.query("COMMIT"); s.fixture = f; await salvar(s); console.log("Fixtures mínimas: dois ADMIN, um EDITOR e categoria sintética.");
            } catch (e) { await c.query("ROLLBACK"); throw e; }
            return;
        }
        throw new Error("Etapa desconhecida");
    } finally { await c.end(); }
}
main().catch(e => { console.error(e.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[URL omitida]")); process.exitCode = 1; });
