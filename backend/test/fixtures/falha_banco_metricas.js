import assert from "node:assert/strict";
import https from "node:https";
import { readFile, writeFile } from "node:fs/promises";
assert.equal(process.env.HOMOLOGACAO_METRICAS_EXCLUSIVA, "1");
const s = JSON.parse(await readFile("/evidencias/privado.json", "utf8")), ca = await readFile("/evidencias/ca.pem");
const modo = process.argv[2];
function pedir(rota, body, cookie) {
    return new Promise((resolve, reject) => {
        const req = https.request("https://portal.test" + rota, { ca, timeout: 6500, method: body ? "POST" : "GET",
            headers: { Origin: "https://portal.test", "X-Portal-Metricas": "1", "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) } }, res => {
            res.resume(); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers }));
        }); req.on("error", reject); req.on("timeout", () => req.destroy(new Error("timeout"))); req.end(body && JSON.stringify(body));
    });
}
if (modo === "indisponivel") {
    const sessao = await pedir("/api/metricas/visualizacoes/sessao", {}); assert.equal(sessao.status, 200);
    const cookie = sessao.headers["set-cookie"][0].split(";")[0];
    const inicio = performance.now();
    const evento = await pedir("/api/metricas/visualizacoes", { patrimonioId: s.fixture.bens[1] }, cookie);
    assert.equal(evento.status, 503); assert.ok(evento.headers["retry-after"]);
    assert.equal((await pedir("/")).status, 200); assert.equal((await pedir("/api/health")).status, 200);
    const r = { evento: 503, duracaoMs: performance.now() - inicio, pagina: 200, health: 200, retryGravacao: false };
    await writeFile("/evidencias/banco_indisponivel.json", JSON.stringify(r, null, 2)); console.log(JSON.stringify(r));
} else {
    assert.equal(modo, "recuperado"); assert.equal((await pedir("/api/patrimonios")).status, 200);
    console.log("Conexão recuperada por leitura pública 200; nenhuma gravação foi reenviada.");
}
