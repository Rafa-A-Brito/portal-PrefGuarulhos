// Ensaio nativo ou em runner descartável. Não inicia nem modifica o Compose publicado.
import assert from "node:assert/strict";
import { fork, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { assertTestDatabase } from "./assert-test-db.js";

assertTestDatabase();
assert.ok(process.env.TEST_NGINX_BIN, "Defina TEST_NGINX_BIN com binário oficial do Nginx.");
const root = fileURLToPath(new URL("../../", import.meta.url));
const folder = path.join(root, ".cache", "auth-proxy-" + process.pid);
await mkdir(path.join(folder, "logs"), { recursive: true });
await mkdir(path.join(folder, "temp"), { recursive: true });
const binary = path.resolve(process.env.TEST_NGINX_BIN);
const prefix = folder.replaceAll("\\", "/") + "/";
const child = fork(new URL("../test/fixtures/auth_security_proxy.js", import.meta.url), {
    env: { ...process.env, MOCK_DATA: "false", DATABASE_URL: process.env.TEST_DATABASE_URL,
        TRUST_PROXY_IPS: "127.0.0.1/32", LOGIN_RATE_IP_MAX: "10000", LOGIN_RATE_ACCOUNT_IP_MAX: "1000",
        AUTH_ALERT_ENABLED: "false" }, stdio: ["ignore", "ignore", "ignore", "ipc"],
});
const [{ port: apiPort }] = await once(child, "message");
const port = Number(process.env.TEST_PROXY_PORT ?? 18549);
const configPath = path.join(folder, "nginx.conf");
let running = false;
function nginx(args) {
    const result = spawnSync(binary, ["-p", prefix, "-c", configPath, ...args], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    return result.stderr.trim();
}
function request(route, { post = false, headers = {}, localAddress = "127.0.0.1" } = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port, path: route, method: post ? "POST" : "GET", agent: false,
            localAddress, headers: { "content-type": "application/json", ...headers }, timeout: 5000 }, res => {
            let text = ""; res.on("data", c => { text += c; });
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(text) }));
        });
        req.on("error", reject); req.on("timeout", () => req.destroy(new Error("Proxy timeout")));
        req.end(post ? "{}" : undefined);
    });
}
async function configure(source, trusted = false) {
    let conf = await readFile(path.join(root, source), "utf8");
    conf = conf.replace("listen 80;", `listen 127.0.0.1:${port};`)
        .replaceAll("http://backend:3333", `http://127.0.0.1:${apiPort}`)
        .replace(/access_log \/dev\/stdout \w+;/g, "access_log off;")
        .replaceAll("error_log /dev/null;", `error_log "${prefix}logs/error.log" crit;`);
    if (trusted) conf = conf.replace("# set_real_ip_from 192.0.2.10/32;", "set_real_ip_from 127.0.0.2/32;")
        .replace("# 192.0.2.10/32 1;", "127.0.0.2/32 1;");
    await writeFile(configPath, `error_log logs/error.log crit;\npid logs/nginx.pid;\nevents { worker_connections 1024; }\nhttp {\n${conf}\n}`);
    console.log(source + (trusted ? " (edge confiável)" : "") + ": " + nginx(["-t"]));
    const started = spawn(binary, ["-p", prefix, "-c", configPath], { stdio: "ignore", windowsHide: true });
    started.on("error", error => { throw error; });
    running = true;
    for (let i = 0; ; i++) {
        try { assert.equal((await request("/api/context")).status, 200); break; }
        catch (error) { if (i >= 100) throw error; await new Promise(r => setTimeout(r, 30)); }
    }
}
async function stop() {
    if (!running) return;
    nginx(["-s", "quit"]); running = false;
    for (let i = 0; i < 100; i++) {
        try { await request("/api/context"); await new Promise(r => setTimeout(r, 30)); }
        catch { return; }
    }
    throw new Error("Proxy não encerrou.");
}
try {
    for (const source of ["infra/nginx.conf", "frontend/nginx.conf"]) {
        await configure(source);
        const context = await request("/api/context", { headers: { "X-Forwarded-For": "198.51.100.99",
            "X-Real-IP": "198.51.100.99", "X-Forwarded-Proto": "https", Forwarded: "for=198.51.100.99;proto=https" } });
        assert.deepEqual(context.body, { ip: "127.0.0.1", realIp: "127.0.0.1", protocol: "http", forwarded: null });
        for (const [route, total, expectedRetry] of [["login", 70, "2"], ["refresh", 180, "1"]]) {
            const responses = await Promise.all(Array.from({ length: total }, (_, i) => request(`/api/auth/${route}`, {
                post: true, headers: { "X-Forwarded-For": `198.51.100.${i + 1}` },
            })));
            const blocked = responses.filter(r => r.status === 429);
            assert.ok(blocked.length > 0, route + " deve limitar mesmo com XFF variando");
            assert.ok(responses.some(r => r.status === 400), route + " preserva tráfego admitido");
            for (const r of blocked) {
                assert.equal(r.headers["retry-after"], expectedRetry);
                assert.equal(r.body.error.code, "TOO_MANY_REQUESTS"); assert.equal(r.body.success, false);
            }
            console.log(source + ": " + route + " " + blocked.length + "/" + total + " limitadas, XFF ignorado");
        }
        const responses = await Promise.all(Array.from({ length: 280 }, () => request("/api/health")));
        assert.ok(responses.some(r => r.status === 429)); assert.ok(responses.some(r => r.status === 200));
        await stop();
    }
    await configure("infra/nginx.conf", true);
    const headers = { "X-Forwarded-For": "198.51.100.22", "X-Forwarded-Proto": "https" };
    assert.deepEqual((await request("/api/context", { headers, localAddress: "127.0.0.2" })).body,
        { ip: "198.51.100.22", realIp: "198.51.100.22", protocol: "https", forwarded: null });
    assert.equal((await request("/api/context", { headers })).body.ip, "127.0.0.1");
    assert.equal((await request("/api/context", { headers })).body.protocol, "http");
    // Leitura do Compose efetivo não exige daemon e nunca imprime credenciais.
    const compose = spawnSync("docker", ["compose", "-f", path.join(root, "docker-compose.yml"), "config", "--format", "json"], {
        encoding: "utf8", windowsHide: true, env: { ...process.env, POSTGRES_PASSWORD: "disposable-test-only",
            TEST_POSTGRES_PASSWORD: "disposable-test-only",
            API_DB_PASSWORD: "disposable-test-only", MIGRATION_DB_PASSWORD: "disposable-test-only",
            AUTH_SECURITY_SECRET: "disposable-security-fixture-52b2178a", JWT_SECRET: "disposable-jwt-fixture-52b2178a-47bd" },
    });
    assert.equal(compose.status, 0, compose.stderr);
    const model = JSON.parse(compose.stdout);
    assert.equal(model.services.backend.ports, undefined);
    assert.ok(model.services.frontend.volumes.some(v => v.source.replaceAll("\\", "/").endsWith("/infra/nginx.conf") && v.target === "/etc/nginx/conf.d/default.conf"));
    console.log("OK: quotas, contratos, IP/protocolo, salto confiável e Compose sem porta de API publicada.");
} finally {
    await stop(); child.send("stop"); await once(child, "exit");
}
