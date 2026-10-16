// Página real com contrato público simulado; não acessa backend/banco.
// Execute na pasta frontend: node scripts/smoke-relacionados.mjs
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const origin = "http://127.0.0.1:5178", output = path.resolve("../.cache/d1d-smoke");
const nomes = ["Estação Ferroviária de Guarulhos", "Casa Amarela", "Locomotiva Maria Fumaça nº 33"];
const slugs = ["estacao-ferroviaria-central-de-guarulhos", "casa-amarela-casa-do-chefe-da-estacao", "locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua"];
const itens = nomes.map((nome, i) => ({ id: `uuid-smoke-${i}`, slug: slugs[i], nome,
  categoria: { slug: "historico", nome: "Histórico" }, situacao: "PRESERVADO",
  descricaoResumida: "Patrimônio da memória ferroviária de Guarulhos.",
  descricao: "Fixture visual da seção editorial de patrimônios relacionados.",
  documentos: [{ id: "doc-smoke", titulo: "Acervo documental", tipo: "LINK", url: "https://example.org/fonte" }],
  fatos: [], ligacoes: [],
}));
itens[0].ligacoes = [
  { id: "uuid-ligacao-1", ordem: 20, destino: { id: itens[1].id, slug: slugs[1], nome: nomes[1] }, texto: "Casa destinada originalmente à moradia do chefe da estação do Tramway da Cantareira." },
  { id: "invalida", destino: null, texto: "Não exibir" },
  { id: "uuid-ligacao-2", ordem: 0, destino: { id: itens[2].id, slug: slugs[2], nome: nomes[2] }, texto: "A locomotiva que lembra o Trenzinho de Guarulhos." },
];
let binary;
for (const candidate of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(candidate); binary = candidate; break; } catch { /* Próximo navegador. */ }
}
if (!binary) throw new Error("Configure CHROME_PATH para Chrome/Edge.");
const profile = await mkdtemp(path.join(os.tmpdir(), "d1d-smoke-"));
await mkdir(output, { recursive: true });
let vite, browser, ws, next = 0;
const pending = new Map(), exceptions = [], resultados = [];
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++next, timer = setTimeout(() => { pending.delete(id); reject(new Error("Timeout: " + method)); }, 15000);
  pending.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  vite = await createServer({ server: { host: "127.0.0.1", port: 5178, strictPort: true }, logLevel: "error",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origin + "/api") },
    plugins: [{ name: "d1d-api-simulada", enforce: "pre", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        assert.equal(req.method, "GET");
        const pathname = new URL(req.url, origin).pathname;
        // Listagem vazia demonstra que as ligações não dependem do Context.
        const data = pathname === "/patrimonios" ? { itens: [], paginacao: { totalPaginas: 1 } }
          : pathname === "/categorias" ? [] : itens.find(item => pathname === "/patrimonios/" + item.slug);
        res.setHeader("Content-Type", "application/json; charset=utf-8"); res.statusCode = data ? 200 : 404;
        res.end(JSON.stringify({ success: Boolean(data), data }));
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
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("Erro JavaScript no smoke");
    return r.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error("Tela não ficou pronta: " + expression);
  };
  for (const width of [1440, 390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: origin + "/patrimonios/" + slugs[0] });
    await waitFor('document.querySelectorAll(".patrimonio-relacionado-link").length === 2');
    const state = await evaluate(`(() => {
      const section=document.querySelector('.patrimonios-relacionados'); section.scrollIntoView({block:'center'});
      return {names:[...section.querySelectorAll('h3')].map(x=>x.textContent),
        hrefs:[...section.querySelectorAll('a')].map(x=>x.getAttribute('href')),
        textos:[...section.querySelectorAll('p')].map(x=>x.textContent),
        overflow:document.documentElement.scrollWidth>innerWidth || section.scrollWidth>section.clientWidth,
        hasUuid:document.body.innerText.includes('uuid-'), references:!!document.querySelector('.detalhe-referencias')};
    })()`);
    assert.deepEqual(state.names, nomes.slice(1)); assert.deepEqual(state.hrefs, slugs.slice(1).map(s=>'/patrimonios/'+s));
    assert.deepEqual(state.textos, itens[0].ligacoes.filter(l=>l.destino).map(l=>l.texto));
    assert.equal(state.overflow,false); assert.equal(state.hasUuid,false); assert.equal(state.references,true);
    let reached = false;
    for (let i = 0; i < 60; i++) {
      await call("Input.dispatchKeyEvent", { type:"keyDown", key:"Tab", code:"Tab", windowsVirtualKeyCode:9 });
      await call("Input.dispatchKeyEvent", { type:"keyUp", key:"Tab", code:"Tab", windowsVirtualKeyCode:9 });
      if (await evaluate("document.activeElement.matches('.patrimonio-relacionado-link')")) { reached=true; break; }
    }
    assert.equal(reached,true);
    const focus = await evaluate("({visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth})");
    assert.equal(focus.visible,true); assert.equal(focus.outline,"solid"); assert.equal(focus.width,"3px");
    await evaluate("document.querySelector('.patrimonios-relacionados').scrollIntoView({block:'center'})");
    const shot = await call("Page.captureScreenshot", { format:"png" });
    await writeFile(path.join(output, `relacionados-${width}.png`), Buffer.from(shot.data,"base64"));
    await call("Input.dispatchKeyEvent", { type:"keyDown", key:"Enter", code:"Enter", windowsVirtualKeyCode:13 });
    await call("Input.dispatchKeyEvent", { type:"keyUp", key:"Enter", code:"Enter", windowsVirtualKeyCode:13 });
    await waitFor(`document.querySelector('h1')?.textContent === ${JSON.stringify(nomes[1])}`);
    assert.equal(await evaluate("location.pathname"), '/patrimonios/'+slugs[1]);
    assert.equal(await evaluate("!!document.querySelector('.patrimonios-relacionados')"),false);
    resultados.push({ width, resultado:"PASS", cards:2, teclado:true, foco:true, navegacaoSlug:true, semSecaoVazia:true, overflow:false });
  }
  assert.equal(exceptions.length,0);
  await writeFile(path.join(output,'resultado.json'),JSON.stringify({resultados,api:'simulada',banco:'não acessado',exceptions:0},null,2));
  console.log(JSON.stringify({resultado:'PASS',widths:resultados.map(r=>r.width),screenshots:output,banco:'não acessado'}));
} catch(error) { console.error(error.message); process.exitCode=1; }
finally {
  if (ws?.readyState===WebSocket.OPEN) { try { await send('Browser.close'); } catch { /* Já fechado. */ } ws.close(); }
  browser?.kill(); await vite?.close();
}
