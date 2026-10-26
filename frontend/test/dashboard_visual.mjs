// Validação visual isolada. Executar na pasta frontend: node test/dashboard_visual.mjs
// API inteiramente simulada; nenhum serviço/backend ou banco real é acessado.
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { dashboardFixture } from "./fixtures/dashboard.js";
const origin = "http://127.0.0.1:5187";
const output = path.resolve("../.cache/dashboard_visual");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, "chrome_"));
let binary;
for (const candidate of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(candidate); binary = candidate; break; } catch { /* Próximo navegador. */ }
}
assert.ok(binary, "Chrome/Edge não encontrado");
let vite, browser, ws, next = 0, estado = "dados";
const pending = new Map(), exceptions = [], requests = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++next;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error("Timeout: " + method)); }, 15000);
  pending.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  vite = await createServer({ server: { host: "127.0.0.1", port: 5187, strictPort: true }, logLevel: "error",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origin + "/api"), "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    plugins: [{ name: "dashboard-fixtures", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        requests.push({ method: req.method, path: req.url });
        res.setHeader("Content-Type", "application/json");
        if (req.method !== "GET") { res.statusCode = 405; res.end('{}'); return; }
        const pathname = new URL(req.url, origin).pathname;
        const data = pathname === "/admin/dashboard" ? dashboardFixture()
          : pathname === "/categorias" || pathname === "/regioes" ? [] : { itens: [], paginacao: { totalPaginas: 0 } };
        if (pathname === "/admin/dashboard" && estado === "vazio") {
          data.total = data.PUBLICADO = data.RASCUNHO = data.ARQUIVADO = data.semRegiao = 0;
          for (const serie of [data.porSituacao, data.porCategoria, data.porRegiao]) for (const item of serie) { item.quantidade = 0; if ('quantidadeSecundaria' in item) item.quantidadeSecundaria = 0; }
          data.legados = { total: 0, arquivados: 0, itens: [] }; data.meta.publicados = 0;
        }
        res.end(JSON.stringify({ success: true, data }));
      });
    } }],
  });
  await vite.listen();
  browser = spawn(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let port, socket;
  for (let i = 0; i < 60; i++) {
    try { [port, socket] = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/); break; } catch { await pause(500); }
  }
  assert.ok(port, "Navegador não iniciou");
  ws = new WebSocket("ws://127.0.0.1:" + port + socket);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id) { const h = pending.get(m.id); pending.delete(m.id); if (m.error) h?.reject(new Error(m.error.message)); else h?.resolve(m.result); }
    else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.text);
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call("Runtime.enable"); await call("Page.enable"); await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*://maps.googleapis.com/*", "*://maps.gstatic.com/*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem('guarulhos.admin.sessao', JSON.stringify({token:'fixture',refreshToken:'fixture',sessionId:'fixture',sessionExpiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'fixture',email:'fixture@example.invalid',name:'Revisão visual',role:'ADMIN'}}))` });
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!r.exceptionDetails, "Erro JavaScript na página"); return r.result.value;
  };
  const resultados = [];
  for (const width of [1440, 768, 390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: origin + "/admin" });
    let pronto = false;
    for (let i = 0; i < 200; i++) {
      if (await evaluate("document.querySelectorAll('svg.recharts-surface').length===4 && document.querySelectorAll('.recharts-sector').length===9 && document.querySelectorAll('.recharts-bar-rectangle').length===4")) { pronto = true; break; }
      await pause(100);
    }
    assert.ok(pronto, "Quatro gráficos não renderizaram");
    await call("Runtime.evaluate", { expression: "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))", awaitPromise: true });
    const medidas = await evaluate(`({ largura:innerWidth, conteudo:document.documentElement.scrollWidth, graficos:[...document.querySelectorAll('[data-slot=chart]')].map(e=>({largura:e.clientWidth,conteudo:e.scrollWidth})), texto:document.querySelector('.admin-content').innerText })`);
    assert.ok(medidas.conteudo <= width, "Overflow horizontal da página");
    assert.ok(medidas.graficos.every(g => g.largura > 0 && g.conteudo <= g.largura + 1), "Overflow dos gráficos");
    assert.match(medidas.texto, /6 com região \+ 2 sem região = 8 patrimônios/);
    assert.match(medidas.texto, /Histórico/);
    assert.equal(await evaluate("document.querySelectorAll('table tbody tr').length"), 7);
    assert.equal(await evaluate("[...document.querySelectorAll('[data-slot=card]')].every(e=>document.getElementById(e.getAttribute('aria-labelledby'))?.textContent)"), true);
    const { cssContentSize } = await call("Page.getLayoutMetrics");
    const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: cssContentSize.height, scale: 1 } });
    await writeFile(path.join(output, `dashboard_${width}.png`), Buffer.from(shot.data, "base64"));
    resultados.push({ width, overflow: false, graficos: medidas.graficos.length });
  }
  // Navegação por teclado dos gráficos e tooltip acessível do Recharts real.
  for (let indice = 0; indice < 4; indice++) {
    await evaluate(`document.querySelectorAll('svg.recharts-surface')[${indice}].focus()`);
    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await pause(200);
    const tooltip = await evaluate(`(() => { const card = document.querySelectorAll('[data-slot=card]')[${indice}]; const tip = card.querySelector('.recharts-tooltip-wrapper'); return { texto:tip?.innerText, visivel:tip && getComputedStyle(tip).visibility !== 'hidden' }; })()`);
    assert.ok(tooltip.visivel && /[0-9]/.test(tooltip.texto), "Tooltip por teclado ausente: " + indice);
    const esperado = ["Demolido\n1", "São João / Bonsucesso\nSão João / Bonsucesso\n3", "Arquitetônico\nArquitetônico\n3", "Rascunho\n1"][indice];
    assert.equal(tooltip.texto, esperado, "Tooltip deve corresponder à resposta da API de teste");
    const { cssContentSize } = await call("Page.getLayoutMetrics");
    const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 320, height: cssContentSize.height, scale: 1 } });
    await writeFile(path.join(output, `dashboard_tooltip_${indice}.png`), Buffer.from(shot.data, "base64"));
    resultados.push({ grafico: indice, tooltip: tooltip.texto, teclado: true });
  }
  for (const width of [1440, 390]) {
    estado = "vazio";
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: origin + "/admin" });
    let vazio = false;
    for (let i = 0; i < 100; i++) {
      vazio = await evaluate("document.body.innerText.includes('Nenhum patrimônio cadastrado')");
      if (vazio) break; await pause(100);
    }
    assert.ok(vazio); assert.equal(await evaluate("document.querySelectorAll('svg.recharts-surface').length"), 0);
    const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(path.join(output, `dashboard_vazio_${width}.png`), Buffer.from(shot.data, "base64"));
    resultados.push({ width, estado: "vazio", graficos: 0 });
  }
  assert.deepEqual(exceptions, []);
  assert.ok(requests.every(r => r.method === "GET"));
  await writeFile(path.join(output, "resultado.json"), JSON.stringify({ resultados, requests, exceptions, banco: "não acessado" }, null, 2));
  console.log(JSON.stringify({ resultados, screenshots: output, banco: "não acessado" }));
} finally {
  if (ws?.readyState === WebSocket.OPEN) { try { await send("Browser.close"); } catch { /* Já fechado. */ } ws.close(); }
  browser?.kill(); await vite?.close();
}
