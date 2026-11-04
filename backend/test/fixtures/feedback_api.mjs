// Processo real usado exclusivamente pela integração F2; não é servidor operacional.
import assert from "node:assert/strict";
import process from "node:process";
import { URL } from "node:url";
assert.equal(process.env.FEEDBACK_TEST_EXCLUSIVE, "1");
const u = new URL(process.env.DATABASE_URL);
assert.equal(u.pathname, "/portal_test"); assert.equal(u.hostname, "127.0.0.1");
assert.equal(u.port, process.env.TEST_POSTGRES_PORT); assert.equal(u.search, "");
const { default: app } = await import("../../src/app.js");
const server = app.listen(0, "127.0.0.1", () => process.send({ porta: server.address().port }));
process.on("message", m => { if (m === "parar") server.close(() => process.exit(0)); });
