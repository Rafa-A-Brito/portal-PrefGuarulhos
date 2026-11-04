// API real opt-in; apenas perda de transporte após res.end de sucesso é injetada.
import assert from "node:assert/strict";
import process from "node:process";
import { URL } from "node:url";
import { createServer } from "node:http";
import pg from "pg";
assert.equal(process.env.HOMOLOGACAO_FEEDBACK_F4, "1");
const u = new URL(process.env.DATABASE_URL);
assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "5549"); assert.equal(u.pathname, "/portal_test"); assert.equal(u.username, "portal_api"); assert.equal(u.search, "");
const db = new pg.Client({ connectionString: u.href }); await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const r = (await db.query("SELECT current_database() banco,current_user papel")).rows[0];
  assert.deepEqual(r, { banco: "portal_test", papel: "portal_api" });
} finally { await db.query("ROLLBACK"); await db.end(); }
const { default: app } = await import("../../src/app.js");
let perder = false;
const server = createServer((req, res) => {
  process.send?.({ evento: "peer", ip: req.socket.remoteAddress });
  if (req.url === "/api/feedback" && req.method === "POST") {
    const end = res.end;
    res.end = function (...args) {
      process.send?.({ evento: "post", status: res.statusCode, jwt: Boolean(req.headers.authorization), cookie: Boolean(req.headers.cookie),
        origem: req.headers.origin, encaminhado: req.headers["x-forwarded-for"], proto: req.headers["x-forwarded-proto"] });
      if (perder && res.statusCode === 201) { perder = false; res.destroy(); return res; }
      return end.apply(this, args);
    };
  }
  app(req, res);
});
server.listen(3354, "0.0.0.0", () => process.send?.({ evento: "pronto" }));
process.on("message", m => {
  if (m === "perder") { perder = true; process.send?.({ evento: "perda_armada" }); }
  if (m === "parar") server.close(() => process.exit(0));
});
