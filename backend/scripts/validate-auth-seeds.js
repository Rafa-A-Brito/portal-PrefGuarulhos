// Provisiona SOMENTE cluster e bancos descartáveis. Não lê DATABASE_URL/.env.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { Prisma } from "@prisma/client";

const bin = process.env.PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "portal-auth-seeds-"));
const data = path.join(tmp, "pgdata"), passwordFile = path.join(tmp, "password");
const password = randomBytes(32).toString("hex");
const probe = net.createServer();
await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const executable = name => path.join(bin, name + (process.platform === "win32" ? ".exe" : ""));
const run = (command, args, env = process.env) => {
    const result = spawnSync(command, args, { env, windowsHide: true, stdio: "inherit", timeout: 120000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Validação falhou: " + path.basename(command) + " (" + result.status + ").");
};
const cleanupArg = process.argv.find(arg => arg.startsWith("--cleanup-cluster="));
if (cleanupArg) {
    const stale = path.resolve(cleanupArg.slice("--cleanup-cluster=".length));
    if (path.dirname(stale) !== os.tmpdir() || !path.basename(stale).startsWith("portal-auth-seeds-") || await fs.realpath(stale) !== stale) throw new Error("Cluster descartável inválido.");
    run(executable("pg_ctl"), ["-D", path.join(stale, "pgdata"), "-m", "fast", "-w", "stop"]);
    await fs.rm(stale, { recursive: true, force: true });
}
let started = false;
try {
    await fs.writeFile(passwordFile, password, { mode: 0o600 });
    run(executable("initdb"), ["-D", data, "-U", "portal_test", "-A", "scram-sha-256", "--pwfile=" + passwordFile, "--encoding=UTF8", "--no-locale"]);
    started = true;
    run(executable("pg_ctl"), ["-D", data, "-l", path.join(tmp, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port}`, "-w", "start"]);
    const connection = database => `postgresql://portal_test:${password}@127.0.0.1:${port}/${database}`;
    const client = new pg.Client({ connectionString: connection("postgres") });
    await client.connect();
    try {
        for (const name of ["portal_auth_seeds_test", "portal_auth_team_test"]) await client.query(`CREATE DATABASE ${name}`);
    } finally { await client.end(); }
    for (const [database, config, key] of [["portal_auth_seeds_test", "prisma.migrate.config.js", "MIGRATION_DATABASE_URL"], ["portal_auth_team_test", "prisma.equipe.config.js", "EQUIPE_DATABASE_URL"]]) {
        const env = { ...process.env, [key]: connection(database), DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unavailable", JWT_SECRET: "disposable-validation-fixture-with-32-characters" };
        run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", config], env);
        const check = new pg.Client({ connectionString: connection(database) });
        await check.connect();
        try {
            const result = await check.query("SELECT column_default, is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='token_version'");
            if (result.rows.length !== 1 || result.rows[0].is_nullable !== "NO") throw new Error("Migração de versão ausente.");
            const columns = await check.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'");
            const available = new Set(columns.rows.map(row => `${row.table_name}.${row.column_name}`));
            const missing = Prisma.dmmf.datamodel.models.flatMap(model => model.fields
                .filter(field => field.kind !== "object" && !available.has(`${model.dbName || model.name}.${field.dbName || field.name}`))
                .map(field => `${model.dbName || model.name}.${field.dbName || field.name}`));
            if (missing.length) throw new Error("Colunas do schema ausentes: " + missing.join(", "));
            console.log("Migração token_version validada: " + database);
        } finally { await check.end(); }
    }
    const tests = ["refreshSessions", "authRevocation", "initialLoad", "initialResearch", "authPassword", "importSafety", "importPatrimonios", "syncPatrimonios", "importNovidades"];
    for (const [index, name] of tests.entries()) {
        const database = `portal_validation_${index}_test`;
        const admin = new pg.Client({ connectionString: connection("postgres") });
        await admin.connect();
        try { await admin.query(`CREATE DATABASE ${database} TEMPLATE portal_auth_seeds_test`); } finally { await admin.end(); }
        const env = { ...process.env, DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unavailable",
            TEST_DATABASE_URL: connection(database), TEST_DATABASE_EXCLUSIVE: "1",
            JWT_SECRET: "disposable-validation-fixture-with-32-characters", PATRIMONIOS_PUBLIC_BASE_URL: "http://assets.example.test", UPLOAD_DIR: path.join(tmp, "uploads"), UPLOAD_ROOT: path.join(tmp, "uploads") };
        run(process.execPath, ["--test", `test/${name}.integration.test.js`], env);
    }
} finally {
    if (started) run(executable("pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"]);
    if (path.dirname(tmp) === os.tmpdir() && path.basename(tmp).startsWith("portal-auth-seeds-")) await fs.rm(tmp, { recursive: true, force: true });
    else { console.error("Limpeza fora da pasta descartável recusada."); process.exitCode = 1; }
}
