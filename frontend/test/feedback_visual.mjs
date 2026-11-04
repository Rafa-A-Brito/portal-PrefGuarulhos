// Ensaio opt-in: Vite e HTTP inteiramente sintéticos; nenhum backend/DB/proxy/.env real.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const output = path.resolve("../.cache/feedback_f3/visual"), origin = "http://127.0.0.1:5193";
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, "chrome_"));
let binary;
for (const candidato of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]) {
  try { await access(candidato); binary = candidato; break; } catch { /* Próximo navegador local. */ }
}
assert.ok(binary, "Chrome/Edge local obrigatório");
const recibos = new Map(), envios = [], resultados = [], exceptions = [], navegacoes = [];
let modo = "normal", browser, ws, seq = 0;
const servers = [], pendentes = new Map();
const pause = ms => new Promise(r => setTimeout(r, ms));
async function servidor(porta, ativo) {
  const serverOrigin = `http://127.0.0.1:${porta}`;
  const vite = await createServer({ configFile: false, envDir: false, logLevel: "error", server: { host: "127.0.0.1", port: porta, strictPort: true },
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(serverOrigin + "/api"), "import.meta.env.VITE_FEEDBACK_ATIVO": JSON.stringify(String(ativo)),
      "import.meta.env.VITE_METRICAS_ATIVAS": '"false"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""', "import.meta.env.VITE_USE_MOCK_MAP": '"true"' },
    plugins: [react(), { name: "feedback-fixtures", configureServer(server) {
      server.middlewares.use("/api", async (req, res) => {
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        const pathname = new URL(req.url, serverOrigin).pathname;
        if (pathname === "/feedback" && req.method === "POST") {
          const chunks = []; for await (const chunk of req) chunks.push(chunk);
          const corpo = Buffer.concat(chunks).toString("utf8"), chave = req.headers["idempotency-key"];
          assert.equal(req.headers.authorization, undefined); assert.equal(req.headers.cookie, undefined);
          assert.equal(req.headers.origin, serverOrigin); assert.equal(req.headers["x-portal-feedback"], "1");
          assert.match(chave, /^[A-Za-z0-9_-]{43}$/); assert.equal(Buffer.byteLength(corpo) <= 16384, true);
          envios.push({ corpo, chave });
          const existente = recibos.get(chave);
          if (existente) assert.equal(existente.corpo, corpo);
          const recibo = existente ?? { corpo, recebidoEm: new Date().toISOString() }; recibos.set(chave, recibo);
          if (modo === "incerto") { res.destroy(); return; }
          res.statusCode = existente ? 200 : 201;
          res.end(JSON.stringify({ success: true, data: { recebido: true, recebidoEm: recibo.recebidoEm, ...(modo === "demo" && { demonstracao: true }) } })); return;
        }
        if (req.method !== "GET") { res.statusCode = 405; res.end("{}"); return; }
        const data = ["/categorias", "/regioes"].includes(pathname) ? [] : { itens: [], paginacao: { total: 0, totalPaginas: 0 } };
        res.end(JSON.stringify({ success: true, data }));
      });
    } }],
  });
  servers.push(vite); await vite.listen();
}
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq, timeout = setTimeout(() => { pendentes.delete(id); reject(Error(method + " timeout")); }, 15000);
  pendentes.set(id, { resolve: r => { clearTimeout(timeout); resolve(r); }, reject: e => { clearTimeout(timeout); reject(e); } });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  await servidor(5193, true); await servidor(5194, false);
  browser = spawn(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let port, socket;
  for (let i = 0; i < 60; i++) { try { [port, socket] = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/); break; } catch { await pause(250); } }
  assert.ok(port, "Navegador não iniciou"); ws = new WebSocket(`ws://127.0.0.1:${port}${socket}`);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pendentes.get(m.id); pendentes.delete(m.id); if (m.error) p?.reject(Error(m.error.message)); else p?.resolve(m.result); }
    else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.text);
    else if (m.method === "Page.frameRequestedNavigation") navegacoes.push(m.params.url);
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const esperar = async expression => {
    for (let i = 0; i < 150; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    await writeFile(path.join(output, "falha.json"), JSON.stringify({ expression, exceptions, texto: await evaluate("document.body.innerText") }, null, 2));
    throw Error("Condição não satisfeita: " + expression);
  };
  const tecla = async (key, code, n, modifiers = 0) => {
    await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: n, modifiers, ...(key === "Enter" && { text: "\r" }) });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: n, modifiers });
  };
  const captura = async (nome, width) => {
    await evaluate("window.scrollTo(0,0)"); await pause(100);
    const { cssContentSize } = await call("Page.getLayoutMetrics");
    const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: cssContentSize.height, scale: 1 } });
    await writeFile(path.join(output, nome + ".png"), Buffer.from(shot.data, "base64"));
  };
  const preencher = async (texto = "Cafe\u0301 e busca clara.\nSegundo parágrafo 🏛️") => {
    await evaluate(`document.querySelector('input[value="SUGESTAO"]').click();
      {const e=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(texto)});e.dispatchEvent(new Event('input',{bubbles:true}));}`);
  };
  await call("Runtime.enable"); await call("Page.enable"); await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["https://*", "http://localhost/*", "http://127.0.0.1:3333/*"] });
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: "http://127.0.0.1:5194/feedback" });
  await esperar("document.body.innerText.includes('Feedback indisponível')");
  assert.equal(await evaluate("document.querySelector('form')===null && document.querySelector('footer a[href=\"/feedback\"]')===null"), true);
  await captura("feedback_desativado_390", 390); resultados.push({ flagFalsa: true, formulario: false, link: false, envios: envios.length });
  for (const width of [1440, 390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: origin + "/feedback" });
    await esperar("document.querySelector('textarea') && document.querySelector('footer a[href=\"/feedback\"]')");
    await pause(400);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, "Overflow " + width);
    assert.equal(await evaluate("[...document.querySelectorAll('input[type=radio]')].every(e=>!e.checked)"), true);
    assert.equal(envios.length, 0, "Nenhum envio ao abrir ou redimensionar");
    await captura("feedback_" + width, width);
    // Teclado: envio inválido leva ao primeiro radio; escolha, Tab, comentário e botão.
    await evaluate("document.querySelector('button[type=submit]').focus()"); await tecla("Enter", "Enter", 13);
    await esperar("document.activeElement?.type==='radio'");
    await tecla(" ", "Space", 32); await tecla("Tab", "Tab", 9);
    assert.equal(await evaluate("document.activeElement.tagName==='TEXTAREA'"), true);
    const foco = await evaluate("getComputedStyle(document.activeElement).outlineWidth"); assert.notEqual(foco, "0px");
    await call("Input.insertText", { text: "Texto colado: e\u0301 😀\nparágrafo" });
    await esperar("document.querySelector('textarea').value.includes('Texto colado')");
    await tecla("Tab", "Tab", 9); assert.equal(await evaluate("document.activeElement.type==='submit'"), true);
    resultados.push({ width, overflow: false, teclado: true, focoVisivel: true });
  }
  // Zoom CSS 200% no formulário e reflow equivalente de página a 720 CSS px.
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: origin + "/feedback" }); await esperar("document.querySelector('textarea')");
  await evaluate("document.querySelector('section[aria-labelledby=feedback-titulo]').style.zoom='2'");
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth && document.querySelector('textarea').getBoundingClientRect().right<=innerWidth"), true);
  await captura("feedback_zoom_200", 1440); resultados.push({ zoomCssFormulario: "200%", overflow: false });
  await call("Emulation.setDeviceMetricsOverride", { width: 720, height: 1000, deviceScaleFactor: 2, mobile: false });
  await call("Page.navigate", { url: origin + "/feedback" }); await esperar("document.querySelector('textarea')");
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true); resultados.push({ reflow: 720, escala: 2, overflow: false });
  // Fluxo real do browser contra fixture HTTP: resposta perdida e repetição exata.
  await call("Emulation.setDeviceMetricsOverride", { width: 320, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: origin + "/feedback" }); await esperar("document.querySelector('textarea')");
  await evaluate("document.cookie='feedback_fixture=nao_enviar; path=/';localStorage.setItem('portal-guarulhos:favoritos:v1','[\"casa\"]')");
  modo = "incerto"; await preencher(); await evaluate("document.querySelector('button[type=submit]').click()");
  await esperar("document.querySelector('[role=status]').textContent.includes('Não foi possível confirmar')");
  assert.equal(envios.length, 1); assert.equal(await evaluate("document.querySelector('textarea').readOnly"), true);
  await captura("feedback_incerto_320", 320);
  modo = "normal"; await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reenviar o mesmo feedback').click()");
  await esperar("document.querySelector('[role=status]').textContent.includes('Feedback recebido.')");
  assert.equal(envios.length, 2); assert.deepEqual(envios[0], envios[1]);
  assert.equal(await evaluate("document.querySelector('textarea').value"), "");
  assert.equal(await evaluate("localStorage.getItem('portal-guarulhos:favoritos:v1')"), '["casa"]');
  resultados.push({ respostaPerdida: true, replayIdentico: true, semCookieOuJwt: true, favoritosPreservados: true });
  await call("Page.navigate", { url: origin + "/feedback" }); await esperar("document.querySelector('textarea')");
  modo = "demo"; await preencher("Demonstração sintética."); await evaluate("document.querySelector('button[type=submit]').click()");
  await esperar("document.querySelector('[role=status]').textContent.includes('apenas em memória')");
  await captura("feedback_demo_320", 320); resultados.push({ demoExplicita: true });
  // Rota existente e mailto preservados; nenhum POST de Contato.
  await call("Page.navigate", { url: origin + "/contato" }); await esperar("document.querySelector('#nome')");
  await evaluate(`for(const [id,value] of [['nome','Pessoa fictícia'],['email','fixture@example.invalid'],['mensagem','Mensagem sintética de contato']]){
    const e=document.getElementById(id),proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await evaluate("document.querySelector('.contato-submit').click()");
  for (let i = 0; i < 30 && !navegacoes.some(url => url.startsWith('mailto:')); i++) await pause(100);
  assert.ok(navegacoes.some(url => url.startsWith("mailto:patrimonio.cultural@guarulhos.sp.gov.br?subject=") && decodeURIComponent(url).includes("Mensagem sintética de contato")), "Contato mantém mailto");
  const antes = envios.length;
  await evaluate("document.querySelector('footer a[href=\"/feedback\"]').click()");
  await esperar("location.pathname==='/feedback' && document.querySelector('textarea')"); assert.equal(envios.length, antes);
  resultados.push({ contatoMailto: true, linkFooterRotaReal: true });
  assert.deepEqual(exceptions, []);
  // Não grava conteúdo/chaves nos resultados, apenas as verificações agregadas.
  await writeFile(path.join(output, "resultado.json"), JSON.stringify({ resultados, exceptions, totalPostSinteticos: envios.length, banco: "não acessado", limitacao: "viewports/zoom simulados; sem leitor de tela ou aparelho físico" }, null, 2));
  console.log(JSON.stringify(resultados));
} finally {
  if (ws?.readyState === WebSocket.OPEN) { try { await send("Browser.close"); } catch { /* Já fechado. */ } ws.close(); }
  browser?.kill(); await Promise.all(servers.map(s => s.close()));
}
