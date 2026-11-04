import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, access, copyFile } from "node:fs/promises";
import { createHash, randomBytes, X509Certificate } from "node:crypto";
import path from "node:path";
export function dockerFeedback(args) {
  const r = spawnSync("docker", args, { encoding: "utf8", windowsHide: true });
  assert.equal(r.status, 0, "Comando Docker F4 falhou"); return r.stdout;
}
export async function prepararProxy(raiz, pasta, projeto) {
  const cert = path.join(pasta, "cert.pem"), key = path.join(pasta, "key.pem");
  try { await access(cert); } catch {
    const r = spawnSync("C:/Program Files/Git/usr/bin/openssl.exe", ["req", "-config", "C:/Program Files/Git/usr/ssl/openssl.cnf", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key.replaceAll("\\", "/"), "-out", cert.replaceAll("\\", "/"), "-days", "2", "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { windowsHide: true, encoding: "utf8" });
    await writeFile(path.join(pasta, "openssl.log"), r.stderr || "");
    assert.equal(r.status, 0, "Certificado exclusivamente temporário não gerado");
  }
  const pem = await readFile(cert), spki = createHash("sha256").update(new X509Certificate(pem).publicKey.export({ type: "spki", format: "der" })).digest("base64");
  const nome = projeto + "_proxy_" + randomBytes(3).toString("hex"), imagem = "integration_backend_frontend-frontend:latest";
  // Docker Desktop anuncia A e AAAA; os servidores locais deste ensaio escutam IPv4.
  const gateway = dockerFeedback(["run", "--rm", "--entrypoint", "getent", imagem, "ahostsv4", "host.docker.internal"]).trim().split(/\s+/)[0];
  assert.match(gateway, /^\d+\.\d+\.\d+\.\d+$/);
  assert.equal(dockerFeedback(["ps", "-aq", "--filter", "name=^/" + nome + "$"]).trim(), "", "Não reutilizar container proxy");
  const configs = [];
  for (const fonte of ["infra/nginx.conf", "frontend/nginx.conf"]) {
    const texto = (await readFile(path.join(raiz, fonte), "utf8")).replaceAll("http://backend:3333", `http://${gateway}:3354`)
      .replace("listen 80;", "listen 8445 ssl;\n    ssl_certificate /f4/cert.pem;\n    ssl_certificate_key /f4/key.pem;\n    ssl_protocols TLSv1.2 TLSv1.3;")
      .replace("try_files $uri $uri/ /index.html;", `proxy_pass http://${gateway}:5195;\n        proxy_http_version 1.1;\n        proxy_set_header Host $http_host;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection upgrade;`)
      .replace("expires 7d;", `proxy_pass http://${gateway}:5195;\n        proxy_set_header Host $http_host;`);
    const destino = path.join(pasta, fonte.startsWith("infra") ? "nginx_infra.conf" : "nginx_frontend.conf");
    await writeFile(destino, texto); configs.push(destino);
    dockerFeedback(["run", "--rm", "--entrypoint", "nginx", "-v", destino + ":/etc/nginx/conf.d/default.conf:ro", "-v", pasta + ":/f4:ro", imagem, "-t"]);
  }
  assert.equal((await readFile(configs[0], "utf8")).replaceAll("\r", ""), (await readFile(configs[1], "utf8")).replaceAll("\r", ""));
  dockerFeedback(["run", "-d", "--name", nome, "--label", "portal.feedback.f4=" + projeto, "-p", "127.0.0.1:8445:8445", "-p", "127.0.0.1:9225:9223", "-v", configs[0] + ":/etc/nginx/conf.d/default.conf:ro", "-v", pasta + ":/f4:ro", imagem]);
  for (const file of ["feedback_browser_linux.cjs", "feedback_https_linux.cjs"]) await copyFile(path.join(raiz, "frontend/test/fixtures", file), path.join(pasta, file));
  await writeFile(path.join(pasta, "cdp.json"), "null");
  const navegador = nome + "_browser";
  dockerFeedback(["run", "-d", "--name", navegador, "--label", "portal.feedback.f4=" + projeto, "--network", "container:" + nome, "-v", pasta + ":/f4", "portal-v214c-navegador:test", "node", "/f4/feedback_browser_linux.cjs", spki]);
  let cdp;
  for (let i = 0; i < 100; i++) { cdp = JSON.parse(await readFile(path.join(pasta, "cdp.json"))); if (cdp) break; await new Promise(r => setTimeout(r, 200)); }
  assert.ok(cdp);
  return { nome, spki, pem, cdp: `ws://127.0.0.1:9225${cdp.socket}`,
    http: q => { const r = spawnSync("docker", ["exec", "-i", navegador, "node", "/f4/feedback_https_linux.cjs"], { input: JSON.stringify(q), encoding: "utf8", windowsHide: true }); assert.equal(r.status, 0, "Cliente TLS isolado: " + r.stderr); return JSON.parse(r.stdout); },
    parar: async () => { const c = JSON.parse(dockerFeedback(["inspect", nome]))[0]; assert.equal(c.Config.Labels["portal.feedback.f4"], projeto); const logs = dockerFeedback(["logs", nome]); await writeFile(path.join(pasta, "proxy.log"), logs); dockerFeedback(["stop", navegador]); dockerFeedback(["stop", nome]); return logs; } };
}
