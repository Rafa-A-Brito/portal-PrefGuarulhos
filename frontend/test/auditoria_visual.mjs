// Ensaio opt-in de interface com DTOs sintéticos conferidos no backend.
// Executar da pasta frontend. Sem backend, .env, proxy ou banco real.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { eventosAuditoria, listaAuditoriaFixture } from "./fixtures/auditoria.js";
const origin = "http://127.0.0.1:5189", output = path.resolve("../.cache/h1_visual");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, "chrome_"));
let binary;
for (const c of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(c); binary = c; break; } catch { /* Próximo. */ }
}
assert.ok(binary, "Chrome/Edge não encontrado");
let vite, browser, ws, seq = 0, estado = "dados";
const pendentes = new Map(), requests = [], exceptions = [], resultados = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq, timeout = setTimeout(() => { pendentes.delete(id); reject(new Error(method + " timeout")); }, 15000);
  pendentes.set(id, { resolve: v => { clearTimeout(timeout); resolve(v); }, reject: e => { clearTimeout(timeout); reject(e); } });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  vite = await createServer({ configFile: false, envDir: false, plugins: [react(), {
    name: "auditoria-fixtures", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        const url = new URL(req.url, origin); requests.push({ method: req.method, path: url.pathname });
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") { res.statusCode = 405; res.end("{}"); return; }
        let data;
        if (url.pathname === "/admin/auditoria") {
          if (estado === "erro") { res.statusCode = 503; res.end(JSON.stringify({ success: false, error: { code: "TEST_503" } })); return; }
          data = listaAuditoriaFixture(estado === "vazio" ? [] : eventosAuditoria);
        } else if (url.pathname.startsWith("/admin/auditoria/")) data = eventosAuditoria.find(e => url.pathname.endsWith(e.id));
        else if (["/categorias", "/regioes"].includes(url.pathname)) data = [];
        else if (url.pathname === "/patrimonios") data = { itens: [], paginacao: { totalPaginas: 0 } };
        else { res.statusCode = 404; res.end("{}"); return; }
        res.end(JSON.stringify({ success: true, data }));
      });
    },
  }], server: { host: "127.0.0.1", port: 5189, strictPort: true }, logLevel: "error",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origin + "/api"),
      "import.meta.env.VITE_METRICAS_ATIVAS": '"false"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' } });
  await vite.listen();
  browser = spawn(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let port, socket;
  for (let i = 0; i < 60; i++) { try { [port, socket] = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/); break; } catch { await pause(250); } }
  assert.ok(port, "Chrome não iniciou");
  ws = new WebSocket(`ws://127.0.0.1:${port}${socket}`);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pendentes.get(m.id); pendentes.delete(m.id); if (m.error) p?.reject(new Error(m.error.message)); else p?.resolve(m.result); }
    else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.text);
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const esperar = async expression => { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(100); }
    await writeFile(path.join(output, "falha.json"), JSON.stringify({ expression, requests, exceptions,
      pagina: await evaluate("({texto:document.body.innerText, foco:document.activeElement?.outerHTML})") }, null, 2));
    throw new Error("Condição não satisfeita: " + expression); };
  const tecla = async (key, code, n, modifiers = 0) => {
    await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: n, modifiers,
      ...(key === "Enter" && { text: "\r" }) });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: n, modifiers });
  };
  const captura = async (nome, width, modal = false) => {
    const { cssContentSize } = await call("Page.getLayoutMetrics");
    const s = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: !modal,
      ...(modal ? {} : { clip: { x: 0, y: 0, width, height: cssContentSize.height, scale: 1 } }) });
    await writeFile(path.join(output, nome + ".png"), Buffer.from(s.data, "base64"));
  };
  await call("Runtime.enable"); await call("Page.enable"); await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["https://*", "http://localhost/*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem('guarulhos.admin.sessao',JSON.stringify({token:'fixture',refreshToken:'fixture',sessionId:'fixture',sessionExpiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'${eventosAuditoria[0].userId}',email:'ana@example.test',name:'Ana — nome atual',role:'ADMIN'}}))` });
  for (const width of [1440, 390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: origin + "/admin/auditoria" });
    await esperar("document.body.innerText.includes('4 alterações registradas.')");
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, "Overflow da página");
    await captura("historico_" + width, width);
    const antes = requests.filter(r => /\/auditoria\//.test(r.path)).length;
    await evaluate("document.querySelector('[aria-label^=\"Detalhes da alteração\"]').focus()");
    await tecla("Enter", "Enter", 13);
    await esperar("document.querySelector('dialog')?.innerText.includes('Nome anterior')");
    assert.equal(requests.filter(r => /\/auditoria\//.test(r.path)).length, antes + 1);
    assert.equal(await evaluate("document.activeElement.id==='auditoria-detalhe-titulo'"), true);
    for (let i = 0; i < 5; i++) {
      await tecla("Tab", "Tab", 9);
      assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"), true, "Foco escapou do modal");
    }
    await tecla("Tab", "Tab", 9, 8);
    assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"), true);
    assert.equal(await evaluate("document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth"), true, "Overflow do modal");
    await captura("detalhe_" + width, width, true);
    await tecla("Escape", "Escape", 27); await esperar("!document.querySelector('dialog')");
    assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')?.startsWith('Detalhes da alteração')"), true);
    resultados.push({ width, overflow: false, focoModal: true, escape: true, focoRestaurado: true, detalheSobDemanda: true });
  }
  for (const status of ["vazio", "erro"]) {
    estado = status; await call("Page.navigate", { url: origin + "/admin/auditoria" });
    await esperar(`document.body.innerText.includes('${status === "vazio" ? "Nenhuma alteração registrada." : "O histórico está temporariamente indisponível."}')`);
    await captura("historico_" + status, 320);
  }
  assert.deepEqual(exceptions, []); assert.ok(requests.every(r => r.method === "GET"));
  await writeFile(path.join(output, "resultado.json"), JSON.stringify({ resultados, exceptions, requests, banco: "não acessado", dados: "fixtures sintéticas; sessão simulada" }, null, 2));
  console.log(JSON.stringify(resultados));
} finally {
  if (ws?.readyState === WebSocket.OPEN) { try { await send("Browser.close"); } catch { /* Já fechado. */ } ws.close(); }
  browser?.kill(); await vite?.close();
}
