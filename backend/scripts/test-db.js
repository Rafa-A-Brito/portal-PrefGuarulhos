import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { assertTestDatabase } from "./assert-test-db.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const action = process.argv[2];
try {
    const target = assertTestDatabase();
    console.log("Banco exclusivo:", target);
    const childEnv = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL };
    function run(args, env = childEnv) {
        const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit" });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error("Comando falhou: " + (result.status ?? result.signal));
    }
    if (action === "migrate" || action === "status") {
        run(["node_modules/prisma/build/index.js", "migrate", action === "migrate" ? "deploy" : "status"]);
    } else if (action === "integrity") {
        const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
        try {
            await client.connect();
            await client.query((await readFile(path.join(root, "prisma/tests/integrity.sql"), "utf8")).replace(/^\\set ON_ERROR_STOP on\r?\n/m, ""));
            console.log("integrity.sql aprovado (ROLLBACK).");
        } finally { await client.end(); }
    } else if (action === "test") {
        const files = (await readdir(path.join(root, "test"))).filter(f => f.endsWith(".integration.test.js")).sort();
        run(["--test", "--test-concurrency=1", ...files.map(f => "test/" + f)], process.env);
    } else {
        throw new Error("Ação permitida: migrate, status, integrity ou test.");
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
