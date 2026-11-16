// Cluster temporário exclusivo; não importa dotenv nem usa o banco da aplicação.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const bin = process.env.PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
const executable = name => path.join(bin, name + (process.platform === "win32" ? ".exe" : ""));
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "portal-visitacao-"));
const data = path.join(tmp, "pgdata"), passwordFile = path.join(tmp, "password");
const password = randomBytes(32).toString("hex");
const probe = net.createServer();
await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const connection = database => `postgresql://portal_test:${password}@127.0.0.1:${port}/${database}`;
const env = { ...process.env, MOCK_DATA: "false", DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unavailable",
    JWT_SECRET: "disposable-visitation-validation-with-32-characters",
    TEST_DATABASE_EXCLUSIVE: "1", PATRIMONIOS_PUBLIC_BASE_URL: "http://assets.example.test" };
const run = (command, args, extra = {}) => {
    const result = spawnSync(command, args, { cwd, env: { ...env, ...extra }, windowsHide: true, stdio: "inherit", timeout: 120000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Validação falhou: " + path.basename(command) + " (" + result.status + ").");
};
let started = false;
try {
    await fs.writeFile(passwordFile, password, { mode: 0o600 });
    run(executable("initdb"), ["-D", data, "-U", "portal_test", "-A", "scram-sha-256", "--pwfile=" + passwordFile, "--encoding=UTF8", "--no-locale"]);
    run(executable("pg_ctl"), ["-D", data, "-l", path.join(tmp, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port}`, "-w", "start"]);
    started = true;
    const admin = new pg.Client({ connectionString: connection("postgres") });
    await admin.connect();
    try {
        await admin.query("CREATE DATABASE portal_visitacao_template_test");
        run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma.migrate.config.js"], {
            MIGRATION_DATABASE_URL: connection("portal_visitacao_template_test"),
        });
        for (const [index, name] of ["visitacaoMigration", "adminPatrimonio", "initialLoad", "initialResearch"].entries()) {
            const database = `portal_visitacao_${index}_test`;
            await admin.query(`CREATE DATABASE ${database} TEMPLATE portal_visitacao_template_test`);
            run(process.execPath, ["--test", `test/${name}.integration.test.js`], { TEST_DATABASE_URL: connection(database) });
        }
    } finally { await admin.end(); }
} finally {
    if (started) run(executable("pg_ctl"), ["-D", data, "-m", "fast", "-w", "stop"]);
    if (path.dirname(path.resolve(tmp)) === path.resolve(os.tmpdir()) && path.basename(tmp).startsWith("portal-visitacao-")) {
        await fs.rm(tmp, { recursive: true, force: true });
    } else {
        console.error("Limpeza fora do diretório temporário recusada.");
        process.exitCode = 1;
    }
}
