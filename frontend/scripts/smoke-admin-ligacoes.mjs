// Admin real com API em memória. Não acessa backend/banco.
// Execute na pasta frontend: node scripts/smoke-admin-ligacoes.mjs
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const origin = "http://127.0.0.1:5179", output = path.resolve("../.cache/d1e-smoke");
const nomes = ["Estação Ferroviária de Guarulhos", "Casa Amarela", "Locomotiva Maria Fumaça nº 33"];
const slugs = ["estacao-ferroviaria-central-de-guarulhos", "casa-amarela-casa-do-chefe-da-estacao", "locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua"];
const categoria = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "historico", nome: "Histórico" };
const itens = nomes.map((nome, i) => ({ id: `11111111-1111-4111-8111-11111111111${i}`, slug: slugs[i], nome,
  categoria, categoriaId: categoria.id, situacao: "PRESERVADO", status: "PUBLICADO",
  descricaoResumida: "Patrimônio da memória ferroviária de Guarulhos.",
  descricao: "Fixture visual da seção editorial de patrimônios relacionados.",
  documentos: [], imagens: [],
  fatos: [], ligacoes: [],
}));
let ligacoes = [], writes = [], requests = [], etapa = "início";
const base = `/admin/patrimonios/${itens[0].id}/ligacoes`;
const initial = { id: "22222222-2222-4222-8222-222222222222", patrimonioDestinoId: itens[2].id, destino: itens[2], texto: "Memória do Tramway.", ordem: 0 };
const createdId = "33333333-3333-4333-8333-333333333333";
let binary;
for (const candidate of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(candidate); binary = candidate; break; } catch { /* Próximo navegador. */ }
}
if (!binary) throw new Error("Configure CHROME_PATH para Chrome/Edge.");
const profile = await mkdtemp(path.join(os.tmpdir(), "d1e-smoke-"));
await mkdir(output, { recursive: true });
let vite, browser, ws, next = 0;
const pending = new Map(), exceptions = [], resultados = [];
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++next, timer = setTimeout(() => { pending.delete(id); reject(new Error("Timeout: " + method)); }, 15000);
  pending.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  vite = await createServer({ server: { host: "127.0.0.1", port: 5179, strictPort: true }, logLevel: "error",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origin + "/api"),
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""', "import.meta.env.VITE_USE_MOCK_MAP": '"true"' },
    plugins: [{ name: "d1e-api-simulada", enforce: "pre", configureServer(server) {
      server.middlewares.use("/api", async (req, res) => {
        try {
          const url = new URL(req.url, origin), pathname = url.pathname;
          requests.push({ method: req.method, pathname });
          let raw = ""; for await (const chunk of req) raw += chunk;
          const body = raw ? JSON.parse(raw) : undefined;
          let data;
          if (req.method === "GET") {
            if (pathname === "/categorias") data = [categoria];
            else if (pathname === "/patrimonios") data = { itens: [], paginacao: { totalPaginas: 1 } };
            else if (pathname === "/admin/patrimonios") data = { itens: url.searchParams.has("busca") ? itens : [itens[0]], paginacao: { totalPaginas: 1 } };
            else if (pathname === base) data = ligacoes;
            else data = itens.find(p => pathname === "/admin/patrimonios/" + p.id);
          } else {
            assert.ok(pathname.startsWith(base)); writes.push({ method: req.method, pathname, body });
            if (req.method === "POST" && pathname === base) {
              assert.deepEqual(Object.keys(body).sort(), ["patrimonioDestinoId", "texto"]);
              data = { id: createdId, ...body, destino: itens.find(p => p.id === body.patrimonioDestinoId), ordem: ligacoes.length };
              ligacoes.push(data);
            } else if (req.method === "PATCH" && pathname === base + "/ordem") {
              ligacoes = body.ids.map((id, ordem) => ({ ...ligacoes.find(l => l.id === id), ordem })); data = ligacoes;
            } else if (req.method === "PATCH" && pathname === base + "/" + createdId) {
              assert.deepEqual(Object.keys(body), ["texto"]);
              data = ligacoes.find(l => l.id === createdId); Object.assign(data, body);
            } else if (req.method === "DELETE" && pathname === base + "/" + createdId) {
              ligacoes = ligacoes.filter(l => l.id !== createdId); data = { id: createdId };
            }
          }
          assert.ok(data, `Requisição inesperada: ${req.method} ${pathname}`);
          res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify({ success: true, data }));
        } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ message: error.message })); }
      });
    } }],
  });
  await vite.listen();
  browser = spawn(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let port, socket;
  for (let i = 0; i < 60; i++) {
    try { [port, socket] = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/); break; } catch { await pause(500); }
  }
  if (!port) throw new Error("Navegador não iniciou DevTools.");
  ws = new WebSocket("ws://127.0.0.1:" + port + socket);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id) { const h = pending.get(m.id); pending.delete(m.id); if (m.error) h?.reject(new Error(m.error.message)); else h?.resolve(m.result); }
    else if (m.method === "Runtime.exceptionThrown") exceptions.push(m);
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*://maps.googleapis.com/*", "*://maps.gstatic.com/*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem('guarulhos.admin.sessao', JSON.stringify({token:'simulado',user:{id:'admin-fixture',email:'smoke@example.invalid',name:'Admin Smoke',role:'ADMIN'}}))` });
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("Erro JavaScript no smoke");
    return r.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); }
    await writeFile(path.join(output, "falha.json"), JSON.stringify({ etapa, requests, writes, expression, tela: await evaluate("({url:location.href,texto:document.body.innerText,foco:document.activeElement.outerHTML})"), exceptions }, null, 2));
    throw new Error("Tela não ficou pronta: " + expression);
  };
  const key = async (key, code, windowsVirtualKeyCode) => {
    await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode,
      ...(key === "Enter" ? { text: "\r" } : key === " " ? { text: " " } : {}) });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
  };
  const tabTo = async predicate => {
    for (let i = 0; i < 180; i++) {
      if (await evaluate(`(() => {const e=document.activeElement; return ${predicate};})()`)) return;
      await key("Tab", "Tab", 9);
    }
    throw new Error("Controle inacessível por Tab: " + predicate);
  };
  const button = async name => { etapa = name; await tabTo(`e.tagName==='BUTTON' && (e.getAttribute('aria-label') || e.textContent.trim())===${JSON.stringify(name)}`); await key("Enter", "Enter", 13); };
  for (const width of [1440, 390, 320]) {
    ligacoes = [structuredClone(initial)]; writes = []; requests = [];
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: origin + "/admin/patrimonios" });
    await waitFor(`!!document.querySelector('button[aria-label="Editar ${nomes[0]}"]')`);
    await button("Editar " + nomes[0]);
    await waitFor("document.querySelectorAll('.admin-ligacoes-lista > li').length===1");
    await tabTo("e.tagName==='INPUT' && e.id.endsWith('-busca')");
    await call("Input.insertText", { text: "Casa" });
    await button("Buscar patrimônios");
    await waitFor("document.querySelectorAll('.admin-ligacoes input[type=radio]').length===1");
    await tabTo("e.matches('.admin-ligacoes input[type=radio]')");
    await key(" ", "Space", 32);
    await tabTo("e.matches('.admin-ligacoes textarea')");
    await call("Input.insertText", { text: "Casa do chefe da estação." });
    await button("Adicionar ligação");
    await waitFor("document.querySelectorAll('.admin-ligacoes-lista > li').length===2");
    assert.equal(ligacoes[1].id, createdId);
    await button("Editar relação com " + nomes[1]);
    // A edição transfere o foco para o texto; Ctrl+A substitui somente seu conteúdo.
    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
    await call("Input.insertText", { text: "Moradia vinculada à estação ferroviária." });
    await button("Salvar texto da ligação");
    await waitFor("document.querySelector('.admin-ligacoes').textContent.includes('Texto da ligação atualizado.')");
    assert.equal(ligacoes[1].id, createdId); assert.equal(ligacoes[1].texto, "Moradia vinculada à estação ferroviária.");
    await button("Mover " + nomes[1] + " para cima");
    assert.equal(writes.length, 2);
    await button("Salvar ordem");
    await waitFor("document.querySelector('.admin-ligacoes').textContent.includes('Ordem das ligações salva.')");
    assert.deepEqual(ligacoes.map(l => l.id), [createdId, initial.id]);
    await tabTo("e.matches('.admin-ligacoes button:not(:disabled)')");
    const focus = await evaluate("({visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth})");
    assert.equal(focus.visible,true); assert.equal(focus.outline,"solid"); assert.equal(focus.width,"3px");
    await evaluate("document.querySelector('.admin-ligacoes').scrollIntoView({block:'start'})");
    const overflow = await evaluate("document.documentElement.scrollWidth>innerWidth || document.querySelector('.admin-ligacoes').scrollWidth>document.querySelector('.admin-ligacoes').clientWidth");
    assert.equal(overflow, false);
    const shot = await call("Page.captureScreenshot", { format:"png" });
    await writeFile(path.join(output, `admin-ligacoes-${width}.png`), Buffer.from(shot.data,"base64"));
    await button("Excluir relação com " + nomes[1]);
    assert.equal(writes.length, 3);
    await button("Confirmar exclusão");
    await waitFor("document.querySelectorAll('.admin-ligacoes-lista > li').length===1");
    assert.deepEqual(writes.map(w => w.method), ["POST", "PATCH", "PATCH", "DELETE"]);
    assert.equal(ligacoes[0].id, initial.id); assert.equal(itens.length, 3);
    resultados.push({ width, resultado:"PASS", teclado:true, foco:true, criarEditarOrdenarExcluir:true, UUIDPreservado:true, overflow:false, writes });
  }
  assert.equal(exceptions.length,0);
  await writeFile(path.join(output,'resultado.json'),JSON.stringify({resultados,api:'simulada',banco:'não acessado',exceptions:0},null,2));
  console.log(JSON.stringify({resultado:'PASS',widths:resultados.map(r=>r.width),screenshots:output,banco:'não acessado'}));
} catch(error) { console.error(error.message); process.exitCode=1; }
finally {
  if (ws?.readyState===WebSocket.OPEN) { try { await send('Browser.close'); } catch { /* Já fechado. */ } ws.close(); }
  browser?.kill(); await vite?.close();
}
