// Smoke real via Chrome DevTools, sem acessar API/backend ou geocoding.
// Execute: node scripts/smoke-mapa.mjs (CHROME_PATH opcional).
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(r => setTimeout(r, ms));
const paths = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean);
let binary;
for (const p of paths) { try { await access(p); binary=p; break; } catch { /* Próximo navegador. */ } }
if (!binary) throw new Error("Configure CHROME_PATH para Chrome/Edge.");
const profile = await mkdtemp(path.join(os.tmpdir(), "mapa-smoke-"));
let vite, browser, ws;
const pending = new Map(), messages = [];
let next = 0;
const send = (method, params={}, sessionId) => new Promise((resolve,reject) => {
  const id=++next;
  const timer=setTimeout(()=>{pending.delete(id);reject(new Error("Timeout CDP: " + method));},15000);
  pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
  ws.send(JSON.stringify({id,method,params,...(sessionId && {sessionId})}));
});
try {
  vite=await createServer({server:{host:"127.0.0.1",port:5175,strictPort:true},logLevel:"error"});
  await vite.listen();
  browser=spawn(binary,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{windowsHide:true,stdio:"ignore"});
  let port, socket;
  for(let i=0;i<60;i++){try{[port,socket]=(await readFile(path.join(profile,"DevToolsActivePort"),"utf8")).trim().split(/\r?\n/);break;}catch{await pause(500);}}
  if(!port) throw new Error("Navegador não iniciou DevTools.");
  ws=new WebSocket("ws://127.0.0.1:"+port+socket);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p?.reject(new Error(msg.error.message));else p?.resolve(msg.result);}else if(["Runtime.consoleAPICalled","Runtime.exceptionThrown","Log.entryAdded"].includes(msg.method)) messages.push(msg);};
  const {targetId}=await send("Target.createTarget",{url:"about:blank"});
  const {sessionId}=await send("Target.attachToTarget",{targetId,flatten:true});
  const call=(m,p)=>send(m,p,sessionId);
  await call("Runtime.enable");await call("Log.enable");
  const evaluate=async expression=>{const r=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error("Erro JavaScript no smoke");return r.result.value;};
  await call("Page.navigate",{url:"http://localhost:5175/test/mapa-smoke.html"});
  let count=0;
  for(let i=0;i<90;i++){count=await evaluate('document.querySelectorAll("gmp-advanced-marker").length');if(count===2)break;await pause(500);}
  assert.equal(count,2,"API real deve exibir dois Advanced Markers");
  const first=await evaluate('(()=>{const m=document.querySelector("gmp-advanced-marker");window.savedMarker=m;return {title:m.title,lat:m.position.lat,lng:m.position.lng,clickable:m.gmpClickable};})()');
  assert.deepEqual(first,{title:"Primeiro patrimônio",lat:-23.4543,lng:-46.5333,clickable:true});
  // Clique real do navegador nas coordenadas do marcador.
  const xy=await evaluate('(()=>{const r=document.querySelector("gmp-advanced-marker").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  await call("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...xy});
  await call("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...xy});
  await pause(1000);
  assert.equal(await evaluate('window.smoke.selected'),"smoke-1");
  assert.equal(await evaluate('!!document.querySelector(".info-window-card")'),true);
  await call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('window.smoke.filter()');await pause(1000);
  assert.equal(await evaluate('document.querySelectorAll("gmp-advanced-marker").length'),1);
  assert.equal(await evaluate('window.savedMarker.map === null'),true);
  await evaluate('window.smoke.unmount()');await pause(300);
  assert.equal(await evaluate('document.querySelectorAll("gmp-advanced-marker").length'),0);
  assert.equal(messages.some(m=>/google\.maps\.Marker.*deprecated/.test(JSON.stringify(m))),false);
  const failures=messages.filter(m=>m.method==="Runtime.exceptionThrown" || /ApiNotActivatedMapError|InvalidKeyMapError|RefererNotAllowedMapError/.test(JSON.stringify(m)));
  assert.equal(failures.length,0,"Console sem falhas da API Google");
  console.log(JSON.stringify({resultado:"PASS",api:"Google Maps real",marcadores:2,clique:true,infoWindow:true,filtro:true,responsivo:"390px",cleanup:true,warningMarkerDeprecated:false,excecoes:failures.length}));
} catch(error) {
  // Nunca imprimir mensagens de rede completas: podem conter a chave da API.
  console.error("Smoke falhou:",error.message);
  console.error("Eventos de console:",messages.length,"; erros Google:",JSON.stringify(messages).match(/\b[A-Za-z]+MapError\b/g)||[]);
  process.exitCode=1;
} finally {
  if(ws?.readyState===WebSocket.OPEN){try{await send("Browser.close");}catch{/* Pode fechar antes da resposta. */}ws.close();}
  browser?.kill();await vite?.close();
}
