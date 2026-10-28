import assert from "node:assert/strict";
import https from "node:https";
import pg from "pg";
import { readFile, writeFile } from "node:fs/promises";
import { configurarMetricas } from "../../src/config/metricas.js";
import { emitirCookieMetricas } from "../../src/services/cookieMetricasService.js";
assert.equal(process.env.HOMOLOGACAO_METRICAS_EXCLUSIVA, "1");
const s = JSON.parse(await readFile("/evidencias/privado.json", "utf8")), ca = await readFile("/evidencias/ca.pem");
const u = new URL(process.env.TEST_DATABASE_URL); assert.equal(u.hostname, "db_test"); assert.equal(u.pathname, "/portal_test");
const db = new pg.Client({ connectionString: u.href }); await db.connect();
async function pedir(path, { body = {}, cookie, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request("https://portal.test" + path, { ca, servername: "portal.test", method: "POST", timeout: 6000,
            headers: { Origin: "https://portal.test", "Content-Type": "application/json", "X-Portal-Metricas": "1", ...(cookie && { Cookie: cookie }), ...headers } }, res => {
            let text = ""; res.on("data", c => { text += c; }); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
        }); req.on("error", reject); req.on("timeout", () => req.destroy(new Error("timeout"))); req.end(JSON.stringify(body));
    });
}
try {
    await db.query("BEGIN READ ONLY");
    assert.equal((await db.query("SELECT system_identifier::text cluster FROM pg_control_system()")).rows[0].cluster, s.cluster);
    const antes = (await db.query("SELECT sum(quantidade)::text total FROM visualizacoes_totais_dia")).rows[0].total;
    await db.query("ROLLBACK");
    const config = configurarMetricas();
    const passado = new Date(Date.now() - 86400000);
    const expirado = config.cookie + "=" + emitirCookieMetricas(null, config, passado).token;
    assert.equal((await pedir("/api/metricas/visualizacoes", { cookie: expirado, body: { patrimonioId: s.fixture.bens[1] } })).status, 401);
    const sessao = await pedir("/api/metricas/visualizacoes/sessao"); assert.equal(sessao.status, 200);
    const cookie = sessao.headers["set-cookie"][0].split(";")[0];
    await db.query("BEGIN"); await db.query("UPDATE patrimonio SET name=name WHERE id=$1", [s.fixture.bens[1]]);
    const inicio = performance.now();
    const bloqueada = await pedir("/api/metricas/visualizacoes", { cookie, body: { patrimonioId: s.fixture.bens[1] } });
    const demora = performance.now() - inicio;
    assert.equal(bloqueada.status, 503); assert.ok(demora < 1800); assert.ok(bloqueada.headers["retry-after"]);
    await db.query("ROLLBACK");
    // Não reenvia a gravação que falhou: a verificação de recuperação é somente leitura.
    for (const headers of [{ Origin: "https://fora.invalid" }, { Host: "fora.invalid" }, { "Sec-Fetch-Site": "cross-site" }]) {
        assert.equal((await pedir("/api/metricas/visualizacoes/sessao", { headers })).status, 403);
    }
    const forjada = await pedir("/api/metricas/visualizacoes/sessao", { cookie, headers: { "X-Forwarded-For": "1.2.3.4", "X-Forwarded-Proto": "http", "X-Forwarded-Host": "fora.invalid", Forwarded: "for=1.2.3.4;proto=http" } });
    assert.equal(forjada.status, 200); assert.equal(forjada.headers["set-cookie"][0].split(";")[0], cookie);
    const codigos = [];
    for (let i = 0; i < 35; i++) codigos.push((await pedir("/api/metricas/visualizacoes/sessao", { cookie })).status);
    assert.ok(codigos.includes(429));
    await db.query("BEGIN READ ONLY");
    const depois = (await db.query("SELECT sum(quantidade)::text total FROM visualizacoes_totais_dia")).rows[0].total;
    assert.equal(depois, antes); await db.query("ROLLBACK");
    const resultado = { cookieExpirado: 401, lockTimeout: { status: 503, duracaoMs: demora }, origemHostCrossSite: 403, headersForjados: "sobrescritos", quotaCredencial: codigos, totalAntes: antes, totalDepois: depois };
    await writeFile("/evidencias/falhas_http.json", JSON.stringify(resultado, null, 2)); console.log(JSON.stringify(resultado));
} finally { await db.query("ROLLBACK"); await db.end(); }
