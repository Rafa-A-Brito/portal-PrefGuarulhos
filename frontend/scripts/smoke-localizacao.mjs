// Telas reais com API/mapa simulados. Não conecta ao backend nem ao banco.
// Execute: node scripts/smoke-localizacao.mjs (CHROME_PATH opcional).
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { SEM_DESTINO_C3 } from "../test/fixtures/localizacaoC3.js";

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const origin = "http://127.0.0.1:5177";
const output = path.resolve("../.cache/c3-smoke");
const image = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#d9e7dc"/></svg>');
const casos = [
  { slug: "parque-ecologico-do-tiete", nome: "Parque Ecológico do Tietê", tipo: "EXATA", aviso: "" },
  { slug: "casarao-saraceni", nome: "Casarão Saraceni", tipo: "APROXIMADA", aviso: "Localização aproximada / referência histórica" },
  ...SEM_DESTINO_C3.map(c => ({ ...c, nome: c.slug })),
];
const itens = casos.map((c, i) => ({
  id: "fixture-" + i, slug: c.slug, nome: c.nome,
  situacao: c.tipo === "APROXIMADA" ? "DEMOLIDO" : "PRESERVADO",
  categoria: { id: "cat", slug: "historico", nome: "Histórico" },
  descricaoResumida: "Registro de teste visual da política de localização.",
  descricao: "Conteúdo descritivo preservado no detalhe.",
  localizacao: { endereco: "Rua de referência", numero: "s/n", bairro: "Bairro de teste", cidade: "São Paulo", uf: "SP", cep: "01000-000", latitude: "-23.45", longitude: "-46.53" },
  imagens: [{ url: image, textoAlternativo: "Imagem de teste", principal: true }],
  detalhes: [{ titulo: "Documentação", texto: "Nota documental preservada.", ordem: 0 }],
}));
let binary;
for (const candidate of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(candidate); binary = candidate; break; } catch { /* Próximo navegador. */ }
}
if (!binary) throw new Error("Configure CHROME_PATH para Chrome/Edge.");
const profile = await mkdtemp(path.join(os.tmpdir(), "c3-smoke-"));
await mkdir(output, { recursive: true });
const pending = new Map(), exceptions = [], resultados = [];
let vite, browser, ws, next = 0;
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++next;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error("Timeout: " + method)); }, 15000);
  pending.set(id, {
    resolve: value => { clearTimeout(timer); resolve(value); },
    reject: error => { clearTimeout(timer); reject(error); },
  });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  vite = await createServer({
    server: { host: "127.0.0.1", port: 5177, strictPort: true }, logLevel: "error",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origin + "/api") },
    plugins: [{ name: "c3-api-mapa-simulados", enforce: "pre",
      resolveId(source) { if (source.endsWith("hooks/useGoogleMaps")) return "\0c3-maps-loader"; },
      load(id) { if (id === "\0c3-maps-loader") return 'export const GOOGLE_MAPS_MAP_ID="smoke"; export function useGoogleMaps(){return {configurado:false,pronto:false};}'; },
      configureServer(server) {
        server.middlewares.use("/api", (req, res) => {
          assert.equal(req.method, "GET", "Smoke só admite leitura das fixtures");
          const pathname = new URL(req.url, origin).pathname;
          const data = pathname === "/patrimonios"
            ? { itens, paginacao: { totalPaginas: 1 } }
            : itens.find(item => pathname === "/patrimonios/" + item.slug);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.statusCode = data ? 200 : 404;
          res.end(JSON.stringify({ success: Boolean(data), data }));
        });
      },
    }],
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
    const message = JSON.parse(event.data);
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id);
      if (message.error) handler?.reject(new Error(message.error.message)); else handler?.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown") exceptions.push(message);
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call("Runtime.enable");
  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error("Erro JavaScript na validação");
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(150); }
    throw new Error("Tela não ficou pronta: " + expression);
  };
  for (const width of [1440, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: origin + "/mapa" });
    await waitFor('document.querySelectorAll(".mapa-sidebar-item").length === 8');
    for (const [index, caso] of casos.entries()) {
      await evaluate(`document.querySelectorAll('.mapa-sidebar-item')[${index}].click()`);
      await waitFor(`document.querySelector('.mapa-detail-body h3')?.textContent === ${JSON.stringify(caso.nome)}`);
      const state = await evaluate(`(() => {
        const panel = document.querySelector('.mapa-detail-panel');
        panel.scrollIntoView({block:'center'});
        const link = panel.querySelector('a[target="_blank"]');
        return { panels:document.querySelectorAll('.mapa-detail-panel').length,
          duplicate:document.querySelectorAll('.info-window-card,.gm-style-iw').length,
          overflow:document.documentElement.scrollWidth > innerWidth || panel.scrollWidth > panel.clientWidth,
          href:link?.href ?? null, label:link?.textContent.trim() ?? null,
          aviso:panel.querySelector('.local-aproximado')?.textContent ?? '',
          address:!!panel.querySelector('.mapa-detail-endereco') };
      })()`);
      assert.equal(state.panels, 1); assert.equal(state.duplicate, 0); assert.equal(state.overflow, false);
      assert.equal(state.aviso, caso.aviso);
      const roteavel = ["EXATA", "APROXIMADA"].includes(caso.tipo);
      assert.equal(state.address, roteavel);
      if (roteavel) {
        const destino = new URL(state.href).searchParams.get("destination");
        if (caso.tipo === "APROXIMADA") { assert.equal(destino, "-23.45,-46.53"); assert.equal(state.label, "Ver local aproximado"); }
        else { assert.ok(destino.includes("São Paulo - SP")); assert.ok(!destino.includes("Guarulhos")); assert.equal(state.label, "Ver rota"); }
      } else { assert.equal(state.href, null); assert.equal(state.label, null); }
      const shot = await call("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(output, `mapa-${width}-${index}.png`), Buffer.from(shot.data, "base64"));
      resultados.push({ tela: "/mapa", width, slug: caso.slug, resultado: "PASS" });
    }
    for (const [index, caso] of casos.entries()) {
      await call("Page.navigate", { url: origin + "/patrimonios/" + caso.slug });
      await waitFor(`document.querySelector('.detalhe-hero h1')?.textContent === ${JSON.stringify(caso.nome)} && !document.querySelector('[role="status"]')`);
      const state = await evaluate(`(() => {
        document.querySelector('.detalhe-content').scrollIntoView({block:'center'});
        const link = document.querySelector('.detalhe-actions a');
        return { href:link?.href ?? null, label:link?.textContent.trim() ?? null,
          aviso:document.querySelector('.local-aproximado')?.textContent ?? '',
          actions:!!document.querySelector('.detalhe-actions'),
          overflow:document.documentElement.scrollWidth > innerWidth,
          documentation:document.body.textContent.includes('Nota documental preservada.') };
      })()`);
      assert.equal(state.aviso, caso.aviso); assert.equal(state.documentation, true); assert.equal(state.overflow, false);
      const roteavel = ["EXATA", "APROXIMADA"].includes(caso.tipo);
      assert.equal(state.actions, roteavel); assert.equal(Boolean(state.href), roteavel);
      if (roteavel) assert.equal(state.label, caso.tipo === "APROXIMADA" ? "Ver local aproximado" : "Ver rota");
      const shot = await call("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(output, `detalhe-${width}-${index}.png`), Buffer.from(shot.data, "base64"));
      resultados.push({ tela: "/patrimonios/:slug", width, slug: caso.slug, resultado: "PASS" });
    }
  }
  assert.equal(exceptions.length, 0, "Sem exceções no navegador");
  await writeFile(path.join(output, "resultado.json"), JSON.stringify({ resultados, api: "simulada", mapa: "simulado", banco: "não acessado" }, null, 2));
  console.log(JSON.stringify({ checks: resultados.length, resultado: "PASS", screenshots: output, api: "simulada", mapa: "simulado", banco: "não acessado" }));
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  if (ws?.readyState === WebSocket.OPEN) { try { await send("Browser.close"); } catch { /* Navegador já fechado. */ } ws.close(); }
  browser?.kill(); await vite?.close();
}
