import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const connectionString = process.env.MIGRATION_DATABASE_URL;
if (!connectionString) throw new Error("Variável inválida ou ausente: MIGRATION_DATABASE_URL.");
const cli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, "migrate", "deploy", "--config", "prisma.migrate.config.js"], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

// A API não precisa ler nem modificar o histórico de migrações.
const client = new pg.Client({ connectionString });
try {
    await client.connect();
    await client.query("REVOKE ALL ON TABLE public._prisma_migrations FROM portal_api");
} finally { await client.end(); }
