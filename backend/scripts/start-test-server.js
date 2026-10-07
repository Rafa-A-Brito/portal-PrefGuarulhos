import { spawnSync } from "node:child_process";
import { assertTestDatabase } from "./assert-test-db.js";

// Apenas compose.test.yml usa este entrypoint; a validação ocorre antes da migration.
assertTestDatabase();
const result = spawnSync(process.execPath, ["scripts/test-db.js", "migrate"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
await import("../src/server.js");
