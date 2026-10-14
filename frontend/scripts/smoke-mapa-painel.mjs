// Valida layout em navegador com mapa simulado, sem Google, backend ou banco.
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, access, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let binary;
for (const candidate of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(candidate); binary = candidate; break; } catch { /* Próximo navegador. */ }
}
if (!binary) throw new Error("Configure CHROME_PATH para Chrome/Edge.");
const profile = await mkdtemp(path.join(os.tmpdir(), "painel-smoke-"));
const pending = new Map();
const exceptions = [];
let vite, browser, ws, next = 0;
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++next;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error("Timeout: " + method)); }, 15000);
  pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  vite = await createServer({
    server: { host: "127.0.0.1", port: 5176, strictPort: true }, logLevel: "error",
    plugins: [{ name: "mapa-sem-rede", enforce: "pre",
      resolveId(source) { if (source.endsWith("hooks/useGoogleMaps")) return "\0smoke-maps-loader"; },
      load(id) { if (id === "\0smoke-maps-loader") return 'export const GOOGLE_MAPS_MAP_ID="smoke"; export function useGoogleMaps(){ return { configurado: false, pronto: false }; }'; },
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
  ws.onmessage = (event) => {
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
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error("Erro JavaScript na validação");
    return result.result.value;
  };
  await call("Page.navigate", { url: "http://127.0.0.1:5176/test/mapa-painel-smoke.html" });
  for (let i = 0; i < 60; i++) {
    if (await evaluate('document.querySelectorAll(".mapa-sidebar-item").length === 2')) break;
    await pause(500);
  }
  const resultados = [];
  for (const width of [1440, 880, 520, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const index of [0, 1]) {
      await evaluate(`document.querySelectorAll('.mapa-sidebar-item')[${index}].click()`);
      await pause(350);
      const layout = await evaluate(`(() => {
        const panel = document.querySelector('.mapa-detail-panel');
        panel.scrollIntoView({block: 'center'});
        const bounds = panel.getBoundingClientRect();
        const visible = (selector) => { const r = panel.querySelector(selector).getBoundingClientRect(); return r.left >= bounds.left && r.right <= bounds.right && r.top >= bounds.top && r.bottom <= bounds.bottom + 1; };
        return {
          panels: document.querySelectorAll('.mapa-detail-panel').length,
          duplicate: document.querySelectorAll('.info-window-card, .gm-style-iw, [role="dialog"]').length,
          bodyOverflow: document.documentElement.scrollWidth > innerWidth,
          panelOverflow: panel.scrollWidth > panel.clientWidth,
          closeVisible: visible('.mapa-detail-close'), imageVisible: visible('.mapa-detail-img'), actionsVisible: visible('.mapa-detail-actions'),
          mapOverflow: document.querySelector('.map-wrapper').scrollWidth > document.querySelector('.map-wrapper').clientWidth,
        };
      })()`);
      assert.deepEqual(layout, { panels: 1, duplicate: 0, bodyOverflow: false, panelOverflow: false, closeVisible: true, imageVisible: true, actionsVisible: true, mapOverflow: false }, `${width}px, item ${index}: ${JSON.stringify(layout)}`);
      const screenshot = await call("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(profile, `painel-${width}-${index}.png`), Buffer.from(screenshot.data, "base64"));
      await evaluate('document.querySelector(".mapa-detail-close").click()');
      await pause(50);
      assert.equal(await evaluate('document.querySelectorAll(".mapa-detail-panel").length'), 0);
    }
    resultados.push({ width, resultado: "PASS" });
  }
  assert.equal(exceptions.length, 0, "Sem exceções no navegador");
  console.log(JSON.stringify({ resultados, screenshots: profile, mapa: "simulado; sem chamadas externas" }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (ws?.readyState === WebSocket.OPEN) { try { await send("Browser.close"); } catch { /* Navegador já fechado. */ } ws.close(); }
  browser?.kill();
  await vite?.close();
}
