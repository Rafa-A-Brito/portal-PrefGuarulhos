import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export const pausa = ms => new Promise(r => setTimeout(r, ms));
export async function abrirBrowser(pasta, spki, evento = () => {}, remoto) {
  await mkdir(pasta, { recursive: true }); const perfil = await mkdtemp(path.join(pasta, "browser_"));
  let binario;
  for (const b of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]) { try { await access(b); binario = b; break; } catch { /* Outro navegador. */ } }
  assert.ok(remoto || binario, "Navegador obrigatório");
  const processo = !remoto && spawn(binario, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + perfil, ...(spki ? ["--ignore-certificate-errors-spki-list=" + spki] : []), "about:blank"], { windowsHide: true, stdio: "ignore" });
  let porta, socket;
  for (let i = 0; !remoto && i < 80; i++) { try { [porta, socket] = (await readFile(path.join(perfil, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/); break; } catch { await pausa(250); } }
  assert.ok(remoto || porta); const ws = new WebSocket(remoto || `ws://127.0.0.1:${porta}${socket}`);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0; const pendentes = new Map(), erros = [];
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pendentes.delete(id); reject(Error("CDP timeout: " + method)); }, 20000);
    pendentes.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
  });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pendentes.get(m.id); pendentes.delete(m.id); if (m.error) p?.reject(Error(m.error.message)); else p?.resolve(m.result); }
    else { if (m.method === "Runtime.exceptionThrown") erros.push(m.params.exceptionDetails.text); evento(m); } };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  const avaliar = async expression => { const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true }); assert.ok(!r.exceptionDetails, r.exceptionDetails?.text); return r.result.value; };
  const esperar = async (expr, tempo = 25000) => { const fim = Date.now() + tempo; while (Date.now() < fim) { if (await avaliar(`Boolean(${expr})`)) return; await pausa(100); } await writeFile(path.join(pasta, "falha_dom.txt"), await avaliar("document.body.innerText")); throw Error("Espera: " + expr); };
  const navegar = async url => { await call("Page.navigate", { url }); await esperar("document.readyState==='complete' && document.querySelector('#root')?.children.length"); };
  const botao = async nome => { await esperar(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(nome)} && !b.disabled)`); await avaliar(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(nome)}).click()`); };
  const campo = (seletor, valor) => avaliar(`(()=>{const e=document.querySelector(${JSON.stringify(seletor)}), p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
  const tecla = async (key, code, n, modifiers = 0) => { await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: n, modifiers, ...(key === "Enter" && { text: "\r" }) }); await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: n, modifiers }); };
  const largura = width => call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  const captura = async (nome, modal = false) => { const { cssContentSize } = await call("Page.getLayoutMetrics"); const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: !modal, ...(modal ? {} : { clip: { x: 0, y: 0, width: await avaliar("innerWidth"), height: cssContentSize.height, scale: 1 } }) }); await writeFile(path.join(pasta, nome + ".png"), Buffer.from(shot.data, "base64")); };
  await call("Runtime.enable"); await call("Page.enable"); await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*://fonts.googleapis.com/*", "*://fonts.gstatic.com/*", "*://maps.googleapis.com/*", "http://localhost:3333/*"] });
  return { call, avaliar, esperar, navegar, botao, campo, tecla, largura, captura, erros, fechar: async () => { try { await send("Browser.close"); } catch { /* Encerrado. */ } ws.close(); if (processo) processo.kill(); } };
}
