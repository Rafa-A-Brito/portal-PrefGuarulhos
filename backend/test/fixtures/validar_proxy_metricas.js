// Executado exclusivamente na rede Docker do ensaio, sem banco ou confiança TLS global.
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { readFile } from "node:fs/promises";
const ca = await readFile("/certs/cert.pem");
function request(port, rota, { tls = true, method = "GET", headers = {}, body, chunked = false, ca } = {}) {
    return new Promise((resolve, reject) => {
        // Somente a rede dedicada do ensaio; nenhum proxy HTTP do ambiente.
        const req = (tls ? https : http).request({ hostname: port === 3337 ? "127.0.0.1" : "172.30.89.2", port: port === 8447 ? 443 : port === 8097 ? 80 : 3333, path: rota, method, agent: false,
            ...(tls && { ca, servername: "localhost" }), headers, timeout: 6000 }, res => {
            let text = ""; res.on("data", c => { text += c; }); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
        });
        req.on("error", reject); req.on("timeout", () => req.destroy(new Error("timeout")));
        if (chunked) { req.write(body.slice(0, 5)); req.end(body.slice(5)); } else req.end(body);
    });
}

const base = { ca, headers: { Host: "localhost:8447", Origin: "https://localhost:8447", "X-Portal-Metricas": "1", "Content-Type": "application/json" } };
        const post = (rota, body, headers = {}, extra = {}) => request(8447, rota, { ...base, method: "POST", body: JSON.stringify(body), headers: { ...base.headers, ...headers }, ...extra });
        const sessao = "/api/metricas/visualizacoes/sessao", evento = "/api/metricas/visualizacoes";
        const primeiro = await post(sessao, {}); assert.equal(primeiro.status, 200);
        const setCookie = primeiro.headers["set-cookie"][0];
        for (const pattern of [/^__Host-portal_metricas=/, /; Secure/, /; HttpOnly/, /; SameSite=Lax/, /; Path=\/;/]) assert.match(setCookie, pattern);
        assert.doesNotMatch(setCookie, /Domain=/i);
        const Cookie = setCookie.split(";")[0];
        assert.equal((await post(sessao, {}, { Cookie })).headers["set-cookie"][0].split(";")[0], Cookie);
        const ctx = JSON.parse((await request(8447, "/api/context", { ca, headers: { ...base.headers, "X-Forwarded-For": "203.0.113.99", "X-Forwarded-Proto": "http", "X-Forwarded-Host": "malicioso.invalid", Forwarded: "for=203.0.113.99;proto=http" } })).text);
        assert.notEqual(ctx.ip, "203.0.113.99"); assert.equal(ctx.protocol, "https"); assert.equal(ctx.host, "localhost:8447"); assert.equal(ctx.hostname, "localhost"); assert.equal(ctx.forwarded, null);
        const direto = await request(3337, sessao, { ...base, tls: false, method: "POST", body: "{}", headers: { ...base.headers, "X-Forwarded-Proto": "https", "X-Forwarded-For": "203.0.113.99" } });
        assert.equal(direto.status, 403); assert.equal(direto.headers["set-cookie"], undefined);
        const diretoCtx = JSON.parse((await request(3337, "/api/context", { tls: false, headers: { "X-Forwarded-Proto": "https", "X-Forwarded-For": "203.0.113.99" } })).text);
        assert.equal(diretoCtx.protocol, "http"); assert.notEqual(diretoCtx.ip, "203.0.113.99");
        assert.equal((await request(8097, sessao, { ...base, tls: false, method: "POST", body: "{}" })).status, 403);
        for (const headers of [{ Host: "malicioso.invalid" }, { Origin: "https://malicioso.invalid" }, { "Sec-Fetch-Site": "cross-site" }]) assert.equal((await post(sessao, {}, headers)).status, 403);
        assert.equal((await post(evento, { patrimonioId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, { Cookie })).status, 204);
        assert.equal((await post(evento, { patrimonioId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, { Cookie: Cookie + "x" })).status, 401);
        const falha = await post(evento, { patrimonioId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, { Cookie }); assert.equal(falha.status, 503); assert.equal(falha.headers["retry-after"], "1");
        assert.equal((await post(evento, { texto: "x".repeat(3000) }, { Cookie })).status, 413);
        assert.equal((await post(evento, { texto: "x".repeat(3000) }, { Cookie }, { chunked: true })).status, 413);
        const upload = await request(8447, "/api/upload-fixture", { ca, method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: Buffer.alloc(2 * 1024 * 1024) });
        assert.equal(upload.status, 200); assert.equal(JSON.parse(upload.text).bytes, 2 * 1024 * 1024);
        assert.equal((await request(8447, "/api/upload-fixture", { ca, method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: Buffer.alloc(13 * 1024 * 1024) })).status, 413);
        const burst = await Promise.all(Array.from({ length: 160 }, () => request(8447, "/api/metricas/desconhecida", base)));
        const bloqueadas = burst.filter(r => r.status === 429); assert.ok(bloqueadas.length > 0);
        assert.ok(bloqueadas.every(r => r.headers["retry-after"] === "1" && r.headers["cache-control"].includes("no-store")));
        assert.equal((await request(8447, "/api/health", { ca })).status, 200);
        console.log(JSON.stringify({ fonte: process.argv[2], tlsValidadoComCA: true, cookies: "Secure/HttpOnly/Lax/Host", spoofRecusado: true, corpo2k: true, uploads12m: true, limiteBorda429: bloqueadas.length }));
