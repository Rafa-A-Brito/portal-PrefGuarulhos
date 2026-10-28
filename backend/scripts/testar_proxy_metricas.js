// Ensaio isolado. Nunca monta .env ou conecta ao PostgreSQL.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import https from "node:https";

const root = fileURLToPath(new URL("../../", import.meta.url));
const nome = "portal_metricas_proxy_test_" + process.pid;
const pasta = path.join(root, ".cache", nome);
const nginxImage = process.env.TEST_NGINX_IMAGE;
const nodeImage = process.env.TEST_BACKEND_IMAGE;
const criados = [];
let redeCriada = false;
function docker(args) {
    const result = spawnSync("docker", args, { encoding: "utf8", windowsHide: true, maxBuffer: 1000000 });
    if (result.status !== 0) throw new Error("Docker: " + result.stderr);
    return (result.stdout ?? "") + (result.stderr ?? "");
}
function request(port, rota, { tls = true, method = "GET", headers = {}, body, chunked = false, ca } = {}) {
    return new Promise((resolve, reject) => {
        // Destinos exclusivamente loopback: não encaminhar o ensaio a proxy HTTP do host.
        const req = (tls ? https : http).request({ hostname: "127.0.0.1", port, path: rota, method, agent: false,
            ...(tls && { ca, servername: "localhost" }), headers, timeout: 6000 }, res => {
            let text = ""; res.on("data", c => { text += c; }); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
        });
        req.on("error", reject); req.on("timeout", () => req.destroy(new Error("timeout")));
        if (chunked) { req.write(body.slice(0, 5)); req.end(body.slice(5)); } else req.end(body);
    });
}
async function main() {
    assert.equal(process.env.PROXY_METRICAS_TEST_EXCLUSIVE, "1"); assert.ok(nginxImage && nodeImage);
    await mkdir(pasta, { recursive: true });
    const opensslConfig = path.join(pasta, "openssl.cnf");
    await writeFile(opensslConfig, "[req]\ndistinguished_name=dn\n[dn]\n");
    const openssl = process.env.TEST_OPENSSL ?? (process.platform === "win32" ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl");
    const cert = spawnSync(openssl, ["req", "-config", opensslConfig, "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost",
        "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1", "-addext", "basicConstraints=critical,CA:TRUE",
        "-addext", "keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign", "-addext", "extendedKeyUsage=serverAuth",
        "-keyout", path.join(pasta, "key.pem"), "-out", path.join(pasta, "cert.pem")], { encoding: "utf8", windowsHide: true });
    assert.equal(cert.status, 0, "OpenSSL local necessário para certificado de teste: " + (cert.stderr ?? cert.error?.message));
    docker(["network", "create", "--subnet", "172.30.89.0/29", nome]); redeCriada = true;
    const backend = nome + "_backend";
    docker(["run", "-d", "--name", backend, "--network", nome, "--network-alias", "backend", "--ip", "172.30.89.3",
        "--read-only", "--tmpfs", "/tmp", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "-p", "127.0.0.1:3337:3333",
        "--mount", `type=bind,source=${path.join(pasta, "cert.pem")},target=/certs/cert.pem,readonly`,
        "--mount", `type=bind,source=${path.join(root, "backend/src")},target=/app/src,readonly`,
        "--mount", `type=bind,source=${path.join(root, "backend/node_modules")},target=/app/node_modules,readonly`,
        "--mount", `type=bind,source=${path.join(root, "backend/test/fixtures")},target=/app/test/fixtures,readonly`,
        "--mount", `type=bind,source=${path.join(root, "backend/package.json")},target=/app/package.json,readonly`, "-w", "/app", "-u", "node",
        "-e", "DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/proxy_test", "-e", "JWT_SECRET=proxy-fixture-only-with-at-least-32-characters",
        "-e", "METRICAS_COLETA_ATIVA=false", "-e", "METRICAS_CONSULTA_ATIVA=false", "-e", "TRUST_PROXY_IPS=172.30.89.2",
        "-e", "DOTENV_CONFIG_PATH=/tmp/inexistente.env", "-e", "TEST_METRICAS_ORIGEM=https://localhost:8447", nodeImage,
        "node", "test/fixtures/proxy_metricas.js"]); criados.push(backend);
    // Nenhum .env montado; URL sentinela e fixture não usam persistência.
    for (let i = 0; ; i++) {
        try { assert.equal((await request(3337, "/api/health", { tls: false })).status, 200); break; }
        catch (e) { if (i >= 120) throw e; await new Promise(r => setTimeout(r, 250)); }
    }
    const resultados = [];
    for (const fonte of ["infra/nginx.conf", "frontend/nginx.conf"]) {
        const original = await readFile(path.join(root, fonte), "utf8");
        // Somente no temporário: terminação TLS com certificado local de teste.
        const conf = original.replace("listen 80;", "listen 80;\n    listen 443 ssl;\n    ssl_certificate /certs/cert.pem;\n    ssl_certificate_key /certs/key.pem;");
        await writeFile(path.join(pasta, "default.conf"), conf);
        const edge = nome + "_nginx_" + resultados.length;
        docker(["run", "-d", "--name", edge, "--network", nome, "--ip", "172.30.89.2", "-p", "127.0.0.1:8097:80", "-p", "127.0.0.1:8447:443",
            "--mount", `type=bind,source=${path.join(pasta, "default.conf")},target=/etc/nginx/conf.d/default.conf,readonly`,
            "--mount", `type=bind,source=${pasta},target=/certs,readonly`, nginxImage]); criados.push(edge);
        const sintaxe = docker(["exec", edge, "nginx", "-t"]); console.log(fonte + ": " + sintaxe.trim());
        const resultado = JSON.parse(docker(["exec", backend, "node", "test/fixtures/validar_proxy_metricas.js", fonte]));
        resultados.push(resultado);
        docker(["rm", "-f", edge]); criados.splice(criados.indexOf(edge), 1);
    }
    await writeFile(path.join(pasta, "resultado.json"), JSON.stringify(resultados, null, 2));
    console.log(JSON.stringify({ resultados, evidencias: path.relative(root, pasta) }, null, 2));
}
try { await main(); }
catch (error) {
    console.error(error.message);
    for (const c of criados) { try { console.error(docker(["logs", "--tail", "30", c])); } catch { /* Container pode já ter encerrado. */ } }
    process.exitCode = 1;
}
finally {
    for (const c of criados.reverse()) { try { docker(["rm", "-f", c]); } catch { process.exitCode = 1; } }
    if (redeCriada) { try { docker(["network", "rm", nome]); } catch { process.exitCode = 1; } }
}
