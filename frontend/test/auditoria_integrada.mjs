// H2 opt-in: navegador, Express e PostgreSQL reais, sem interceptação de respostas.
// Preparar/validar/fixtures: backend/scripts/homologar_auditoria.js.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, access } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import pg from "../../backend/node_modules/pg/lib/index.js";
import { auditValues } from "../../backend/src/utils/auditoria.js";
import { formatarAuditoria, filtrosAuditoria } from "../src/features/admin/formatarAuditoria.js";

assert.equal(process.env.HOMOLOGACAO_H2_EXCLUSIVA, "1");
const root = fileURLToPath(new URL("../../", import.meta.url)), out = path.join(root, ".cache/h2");
const privado = path.join(out, "privado.json"), s = JSON.parse(await readFile(privado, "utf8"));
assert.equal(s.validado, true); assert.ok(s.fixture); const f = s.fixture;
const u = new URL(s.env.TEST_DATABASE_URL);
assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "5439"); assert.equal(u.pathname, "/portal_test");
const db = new pg.Client({ connectionString: u.href }); await db.connect();
db.on("error", () => { /* Indisponibilidade planejada no cenário extra, sem repetição de escrita. */ });
async function sql(query, params = []) {
  await db.query("BEGIN READ ONLY");
  try { return (await db.query(query, params)).rows; } finally { await db.query("ROLLBACK"); }
}
const [identidade] = await sql("SELECT current_database() banco,current_user papel,system_identifier::text cluster FROM pg_control_system()");
assert.equal(identidade.banco, "portal_test"); assert.equal(identidade.papel, "portal_test"); assert.equal(identidade.cluster, s.cluster);
const salvar = () => writeFile(privado, JSON.stringify(s, null, 2));
const pausa = ms => new Promise(r => setTimeout(r, ms));
const origem = "http://127.0.0.1:5190", evidencias = [], trafego = [], erros = [];
let backend, browser, vite, ws, seq = 0, sessao;
const pendentes = new Map();
function cmd(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pendentes.delete(id); reject(new Error("CDP timeout: " + method)); }, 20000);
    pendentes.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
  });
}
const call = (m, p) => cmd(m, p, sessao);
async function avaliar(expression) {
  const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  assert.ok(!r.exceptionDetails, r.exceptionDetails?.text); return r.result.value;
}
async function esperar(expr, tempo = 20000) {
  const fim = Date.now() + tempo;
  while (Date.now() < fim) { if (await avaliar(expr)) return; await pausa(100); }
  throw new Error("Condição não alcançada: " + expr);
}
async function navegar(rota) { await call("Page.navigate", { url: origem + rota }); await esperar("document.readyState==='complete' && !!document.querySelector('#root')?.children.length"); }
async function botao(texto) { await esperar(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(texto)})`); await avaliar(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(texto)}).click()`); }
async function campo(seletor, valor) {
  await avaliar(`(()=>{const e=document.querySelector(${JSON.stringify(seletor)});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
}
async function tecla(key, code, n, modifiers = 0) {
  await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: n, modifiers, ...(key === "Enter" && { text: "\r" }) });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: n, modifiers });
}
async function captura(nome, modal = false) {
  const { cssContentSize } = await call("Page.getLayoutMetrics");
  const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: !modal,
    ...(modal ? {} : { clip: { x: 0, y: 0, width: await avaliar("innerWidth"), height: cssContentSize.height, scale: 1 } }) });
  await writeFile(path.join(out, nome + ".png"), Buffer.from(shot.data, "base64"));
}
async function api(rota, method = "GET", body, auth = true) {
  return avaliar(`(async()=>{const t=JSON.parse(sessionStorage.getItem('guarulhos.admin.sessao')||'null')?.token;
    const r=await fetch(${JSON.stringify("/api" + rota)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json',...(${auth}&&t?{Authorization:'Bearer '+t}:{})},${body === undefined ? "" : "body:" + JSON.stringify(JSON.stringify(body))}});
    return {status:r.status,cache:r.headers.get('cache-control'),body:r.status===204?null:await r.json()};})()`);
}
async function login(role) {
  await navegar("/admin/login"); await esperar("!!document.querySelector('#email')");
  await campo("#email", role + "@h2.example.test"); await campo("#senha", s.senhaAtual?.[role] ?? f.senha);
  await avaliar("document.querySelector('form').requestSubmit()");
  await esperar(`location.pathname!=='/admin/login' && JSON.parse(sessionStorage.getItem('guarulhos.admin.sessao')||'null')?.user?.email===${JSON.stringify(role + "@h2.example.test")}`);
  await navegar("/admin"); await esperar("!!document.querySelector('h1')");
}
async function mutacao(chave, rota, method, body) {
  s.operacoes ??= {};
  if (s.operacoes[chave]) { assert.equal(s.operacoes[chave].estado, "CONCLUIDA", "Não repete escrita falha/incerta: " + chave); return s.operacoes[chave].data; }
  s.operacoes[chave] = { estado: "INICIADA" }; await salvar();
  const r = await api(rota, method, body);
  if (r.status < 200 || r.status >= 300) { s.operacoes[chave] = { estado: "FALHA", status: r.status }; await salvar(); throw new Error("Mutação " + chave + ": " + r.status + " " + JSON.stringify(r.body)); }
  s.operacoes[chave] = { estado: "CONCLUIDA", data: r.body?.data ?? null }; await salvar();
  return s.operacoes[chave].data;
}
async function detalhe(id) {
  const r = await api("/admin/auditoria/" + id); assert.equal(r.status, 200); assert.match(r.cache, /private/); assert.match(r.cache, /no-store/); return r.body.data;
}
async function filtrarAlvo(id) {
  await botao("Limpar filtros"); await esperar("!!document.querySelector('table')");
  await campo("details input", id); await botao("Aplicar filtros");
  await esperar("document.body.innerText.includes('alterações registradas nos filtros aplicados') && !document.body.innerText.includes('Carregando histórico')");
}
async function abrir(id) {
  await esperar(`!!document.querySelector('[aria-label="Detalhes da alteração ${id}"]')`);
  await avaliar(`document.querySelector('[aria-label="Detalhes da alteração ${id}"]').focus()`);
  await tecla("Enter", "Enter", 13);
  await esperar("!!document.querySelector('dialog') && !document.querySelector('dialog').innerText.includes('Carregando alteração')");
}
async function conferirModal(dto) {
  const formatado = formatarAuditoria(dto), texto = await avaliar("document.querySelector('dialog').textContent");
  assert.ok(texto.includes(formatado.frase));
  for (const l of formatado.linhas) { assert.ok(texto.includes(l.campo)); assert.ok(texto.includes(l.anterior)); assert.ok(texto.includes(l.novo)); }
  assert.equal(await avaliar("document.querySelector('dialog').querySelector('script,img,iframe')===null"), true);
  assert.doesNotMatch(texto, /SEGREDO_H2|token_privado|senha_privada/);
  evidencias.push({ evento: dto.id, action: dto.action, entity: dto.entity, frase: formatado.frase, campos: formatado.linhas });
}
async function extras() {
  const bem = s.operacoes.bem.data;
  await navegar("/admin/auditoria"); await esperar("!!document.querySelector('table')");
  await campo("input[type=search]", "admin@h2.example.test"); await botao("Buscar responsável");
  await esperar("[...document.querySelectorAll('option')].some(o=>o.textContent.includes('admin@h2.example.test'))");
  await campo("fieldset select", f.admin); await botao("Aplicar filtros");
  await esperar("!!document.querySelector('table') && !document.body.innerText.includes('Carregando histórico')");
  assert.ok(trafego.some(t => t.query.includes("userId=" + f.admin)));
  const [longo] = await sql("SELECT id FROM audit_log WHERE entity_id=$1 AND action='PATRIMONIO_UPDATE' AND new_values->>'historia' LIKE 'Conteúdo longo%'", [bem.id]);
  await filtrarAlvo(bem.id);
  // Uma consulta real aguarda lock; fechar o modal aborta o consumidor, sem troca de DTO.
  await db.query("BEGIN"); await db.query("LOCK TABLE audit_log IN ACCESS EXCLUSIVE MODE");
  try {
    await avaliar(`document.querySelector('[aria-label="Detalhes da alteração ${longo.id}"]').click()`);
    await esperar("document.querySelector('dialog')?.innerText.includes('Carregando alteração')");
    await captura("carregando", true); await botao("Fechar detalhes");
  } finally { await db.query("ROLLBACK"); }
  const outro = (await sql("SELECT id FROM audit_log WHERE entity_id=$1 AND action='PATRIMONIO_CREATE'", [bem.id]))[0];
  await abrir(outro.id); await conferirModal(await detalhe(outro.id));
  await pausa(500); assert.ok(!(await avaliar("document.querySelector('dialog').textContent")).includes("Conteúdo longo"));
  await botao("Fechar detalhes");
  // Remoção exclusiva da fixture sintética: cenário legítimo de 404 após lista carregada.
  if (!s.evento404Removido) {
    await filtrarAlvo(f.outro);
    const id = s.legados.ids.removivel;
    assert.equal((await sql("SELECT count(*)::int n FROM audit_log WHERE id=$1 AND user_id IS NULL", [id]))[0].n, 1);
    await db.query("BEGIN");
    try { const r = await db.query("DELETE FROM audit_log WHERE id=$1 AND user_id IS NULL RETURNING id", [id]); assert.equal(r.rowCount, 1); await db.query("COMMIT"); }
    catch (e) { await db.query("ROLLBACK"); throw e; }
    s.evento404Removido = true; await salvar();
    await abrir(id); await esperar("document.querySelector('dialog')?.textContent.includes('Evento de auditoria não encontrado')"); await captura("evento_404", true); await botao("Fechar detalhes");
  }
  const capturas = [];
  for (const width of [1440, 390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await botao("Limpar filtros"); await esperar("!!document.querySelector('table')"); await captura("historico_final_" + width);
    await filtrarAlvo(bem.id); await abrir(longo.id);
    await avaliar("document.querySelector('dialog').scrollTop=0"); await captura("detalhe_final_" + width, true);
    const medidas = await avaliar(`(()=>{const d=document.querySelector('dialog'),r=d.querySelector('[aria-label="Comparação de valores"]');r.scrollLeft=r.scrollWidth;d.scrollTop=d.scrollHeight;return {modalRola:d.scrollHeight>d.clientHeight,tabelaRola:r.scrollWidth>r.clientWidth,scroll:r.scrollLeft};})()`);
    if (width < 600) assert.ok(medidas.tabelaRola && medidas.scroll > 0);
    capturas.push({ width, ...medidas }); await captura("detalhe_rolagem_" + width, true); await botao("Fechar detalhes");
  }
  // Contraste dos textos específicos H1 com suas superfícies brancas, cálculo sRGB.
  const contraste = (a, b) => {
    const lum = hex => hex.match(/\w\w/g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  };
  const contrastes = { textoModal: contraste("252638", "ffffff"), nota: contraste("505466", "ffffff"), foco: contraste("6558a6", "ffffff") };
  const botoes = await avaliar("[...document.querySelectorAll('main button:not(:disabled),.admin-content button:not(:disabled)')].filter(b=>b.classList.contains('btn-solid')||b.classList.contains('btn-outline')).map(b=>({texto:b.textContent,cor:getComputedStyle(b).color,fundo:getComputedStyle(b).backgroundColor}))");
  const hex = rgb => rgb.match(/\d+/g).slice(0, 3).map(v => Number(v).toString(16).padStart(2, "0")).join("");
  const contrasteBotoes = botoes.map(b => ({ ...b, contraste: contraste(hex(b.cor), hex(b.fundo)) }));
  await writeFile(path.join(out, "contraste.json"), JSON.stringify({ contrastes, botoes: contrasteBotoes }, null, 2));
  assert.ok(contrastes.textoModal >= 4.5 && contrastes.nota >= 4.5 && contrastes.foco >= 3);
  assert.ok(contrasteBotoes.length > 0 && contrasteBotoes.every(b => b.contraste >= 4.5));
  // Indisponibilidade real: somente o container PostgreSQL H2, nunca Compose normal.
  const nome = "portal_h2_20261101_test-db_test-1";
  const docker = args => { const r = spawnSync("docker", args, { windowsHide: true, encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
  const info = JSON.parse(docker(["inspect", nome]))[0];
  assert.deepEqual(info.HostConfig.PortBindings["5432/tcp"], [{ HostIp: "127.0.0.1", HostPort: "5439" }]);
  assert.equal(info.Mounts.find(m => m.Destination === "/var/lib/postgresql/data").Name, "portal_h2_20261101_test_pg_test");
  docker(["stop", nome]);
  try {
    const r = await api("/admin/auditoria"); assert.equal(r.status, 500); assert.match(r.cache, /private.*no-store/);
    assert.equal(r.body.error.code, "INTERNAL_ERROR");
    await botao("Limpar filtros"); await esperar("document.body.innerText.includes('Não foi possível consultar o histórico')"); await captura("indisponivel_500");
  } finally { docker(["start", nome]); }
  await pausa(3000);
  const reaberto = new pg.Client({ connectionString: u.href }); await reaberto.connect();
  try { await reaberto.query("BEGIN READ ONLY"); const { rows: [id] } = await reaberto.query("SELECT system_identifier::text cluster FROM pg_control_system()"); assert.equal(id.cluster, s.cluster); await reaberto.query("ROLLBACK"); } finally { await reaberto.end(); }
  await botao("Tentar novamente"); await esperar("!!document.querySelector('table')");
  await writeFile(path.join(out, "extras.json"), JSON.stringify({ capturas, contrastes, contrasteBotoes, loading: true, cancelamento: true, estado404: s.evento404Removido, estado500: true, recuperacao: true, trafego, erros }, null, 2));
  console.log("H2 adicionais: loading, cancelamento, 404, 500 real, recuperação e rolagem aprovados.");
}
async function main() {
  const log = createWriteStream(path.join(out, "api.log"), { flags: "a" });
  backend = spawn(process.execPath, ["--input-type=module", "-e", "import app from './src/app.js'; const s=app.listen(0,'127.0.0.1',()=>console.log('H2_PORT='+s.address().port));"], {
    cwd: path.join(root, "backend"), windowsHide: true, env: { ...process.env, ...s.env, NODE_ENV: "test", DATABASE_URL: s.env.SECURITY_API_DATABASE_URL,
      JWT_TTL_SECONDS: "180", CORS_ORIGIN: origem, TRUST_PROXY_IPS: "", UPLOAD_ROOT: path.join(out, "uploads"), UPLOAD_DIR: path.join(out, "uploads") }, stdio: ["ignore", "pipe", "pipe"],
  });
  backend.stdout.pipe(log, { end: false }); backend.stderr.pipe(log, { end: false });
  const portaApi = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("API não iniciou")), 15000);
    backend.stdout.on("data", b => { const m = /H2_PORT=(\d+)/.exec(b.toString()); if (m) { clearTimeout(timer); resolve(m[1]); } });
    backend.once("exit", () => { clearTimeout(timer); reject(new Error("API encerrou")); });
  });
  vite = await createServer({ root: path.join(root, "frontend"), configFile: false, envDir: false, plugins: [react()], logLevel: "error",
    define: { "import.meta.env.VITE_API_BASE_URL": '"/api"', "import.meta.env.VITE_METRICAS_ATIVAS": '"false"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    server: { host: "127.0.0.1", port: 5190, strictPort: true, proxy: { "/api": { target: "http://127.0.0.1:" + portaApi } } } });
  await vite.listen();
  let binary;
  for (const p of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) { try { await access(p); binary = p; break; } catch { /* Próximo. */ } }
  assert.ok(binary); const profile = await mkdtemp(path.join(out, "browser_"));
  browser = spawn(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let port, socket;
  for (let i = 0; i < 100; i++) { try { [port, socket] = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/); break; } catch { await pausa(200); } }
  assert.ok(port); ws = new WebSocket(`ws://127.0.0.1:${port}${socket}`);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pendentes.get(m.id); pendentes.delete(m.id); m.error ? p?.reject(new Error(m.error.message)) : p?.resolve(m.result); }
    if (m.method === "Runtime.exceptionThrown") erros.push(m.params.exceptionDetails.text);
    if (m.method === "Network.responseReceived" && m.params.response.url.startsWith(origem + "/api/")) {
      const r = m.params.response; trafego.push({ rota: new URL(r.url).pathname, query: new URL(r.url).search, status: r.status });
    }
  };
  const { targetId } = await cmd("Target.createTarget", { url: "about:blank" });
  ({ sessionId: sessao } = await cmd("Target.attachToTarget", { targetId, flatten: true }));
  await call("Page.enable"); await call("Network.enable"); await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await login("admin"); console.log("Login ADMIN real concluído");
  if (process.argv[2] === "extras") return extras();
  await navegar("/admin/auditoria"); await esperar("!document.body.innerText.includes('Carregando histórico') && document.body.innerText.includes('alterações registradas')");
  const inicial = await api("/admin/auditoria"); assert.equal(inicial.status, 200);
  const regiao = await mutacao("regiao", "/admin/regioes", "POST", { nome: "Região sintética H2", slug: "regiao-sintetica-h2", descricao: null });
  const bem = await mutacao("bem", "/admin/patrimonios", "POST", { nome: "Bem sintético H2", descricao: "Descrição exclusiva do teste H2.", descricaoResumida: "Resumo H2", categoriaId: f.categoria, regiaoId: regiao.id, ordemExibicao: 0 });
  await mutacao("bem_editar", "/admin/patrimonios/" + bem.id, "PATCH", { nome: "Bem sintético H2 editado", historia: "Conteúdo longo sintético. ".repeat(120) + "<img src=x onerror=alert('H2')>" });
  await mutacao("publicar", `/admin/patrimonios/${bem.id}/publicar`, "PATCH", {});
  await mutacao("arquivar", `/admin/patrimonios/${bem.id}/arquivar`, "PATCH", {});
  const fato1 = await mutacao("fato1", `/admin/patrimonios/${bem.id}/fatos`, "POST", { rotulo: "Fato H2 A", valor: "Valor inicial", ordem: 0 });
  const fato2 = await mutacao("fato2", `/admin/patrimonios/${bem.id}/fatos`, "POST", { rotulo: "Fato H2 B", valor: "Valor B", ordem: 1 });
  await mutacao("fato_editar", `/admin/patrimonios/${bem.id}/fatos/${fato1.id}`, "PATCH", { valor: "Valor alterado" });
  await mutacao("fato_ordem", `/admin/patrimonios/${bem.id}/fatos/ordem`, "PATCH", { ids: [fato2.id, fato1.id] });
  await mutacao("fato_excluir", `/admin/patrimonios/${bem.id}/fatos/${fato1.id}`, "DELETE");
  await mutacao("regiao_editar", "/admin/regioes/" + regiao.id, "PATCH", { descricao: "Descrição regional H2", ativo: false });
  await mutacao("usuario_editar", "/admins/" + f.outro, "PATCH", { nome: "Outro ADMIN atualizado H2" });
  // Lista longa real: alterações distintas na fixture, não eventos fabricados na interface.
  for (let i = 0; i < 15; i++) await mutacao("regiao_lote_" + i, "/admin/regioes/" + regiao.id, "PATCH", { descricao: "Revisão sintética de região H2 " + i });
  await mutacao("ator_renomear", "/admins/" + f.admin, "PATCH", { nome: "ADMIN H2 — cadastro atual" });
  console.log("Operações de negócio confirmadas; conferindo AuditLog");
  if (!s.legados) {
    s.legados = { estado: "INICIADA" }; await salvar();
    await db.query("BEGIN");
    try {
      const casos = [
        ["sem_ator", null, "REGIAO_UPDATE", "RegiaoPatrimonio", regiao.id, { descricao: null, ativo: true }, { descricao: "", ativo: false }],
        ["desconhecida", null, "ACAO_LEGADA_H2", "RecursoAntigo", randomUUID(), { token: "SEGREDO_H2" }, { passwordHash: "SEGREDO_H2" }],
        ["url_igual", f.admin, "DOCUMENTO_UPDATE", "PatrimonioDocumento", randomUUID(), { patrimonioId: bem.id, url: "https://u:senha_privada@example.test/doc?token_privado=1" }, { patrimonioId: bem.id, url: "https://u:senha_privada@example.test/doc?token_privado=2" }],
        ["tipos", f.admin, "PATRIMONIO_UPDATE", "Patrimonio", bem.id, { historia: null, ordemExibicao: 0 }, { historia: "", importanciaCultural: "Só valor novo", token: "SEGREDO_H2" }],
        ["removivel", null, "USER_UPDATE", "User", f.outro, { name: "Anterior" }, { name: "Posterior" }],
      ];
      const ids = {};
      for (const [key, ator, action, entity, entityId, oldValues, newValues] of casos) {
        ids[key] = randomUUID(); await db.query("INSERT INTO audit_log(id,user_id,action,entity,entity_id,old_values,new_values) VALUES($1,$2,$3,$4,$5,$6,$7)", [ids[key], ator, action, entity, entityId, oldValues, newValues]);
      }
      await db.query("COMMIT"); s.legados = { estado: "CONCLUIDA", ids }; await salvar();
    } catch (e) { await db.query("ROLLBACK"); throw e; }
  }
  assert.equal(s.legados.estado, "CONCLUIDA");
  await navegar("/admin/auditoria"); await esperar("!!document.querySelector('table')");
  const rows = await sql('SELECT id,user_id AS "userId",action,entity,entity_id AS "entityId",old_values AS "oldValues",new_values AS "newValues",created_at AS "createdAt" FROM audit_log ORDER BY created_at DESC,id DESC');
  const lista = await api("/admin/auditoria?limite=100");
  assert.equal(lista.body.data.paginacao.total, rows.length);
  const itens = [...lista.body.data.itens];
  for (let pagina = 2; pagina <= lista.body.data.paginacao.totalPaginas; pagina++) {
    const r = await api(`/admin/auditoria?limite=100&pagina=${pagina}`); assert.equal(r.status, 200); itens.push(...r.body.data.itens);
  }
  assert.deepEqual(itens.map(r => r.id), rows.map(r => r.id));
  assert.ok(itens.every(r => !Object.hasOwn(r, "oldValues") && !Object.hasOwn(r, "newValues")));
  for (const row of rows) {
    const dto = await detalhe(row.id);
    assert.deepEqual(dto.oldValues, row.oldValues === null || row.action === "USER_PASSWORD_CHANGE" ? null : auditValues(row.entity, row.oldValues));
    assert.deepEqual(dto.newValues, row.newValues === null || row.action === "USER_PASSWORD_CHANGE" ? null : auditValues(row.entity, row.newValues));
    assert.equal(dto.entityId, row.entityId); assert.equal(dto.userId, row.userId);
    if (row.userId === f.admin) assert.equal(dto.user.name, "ADMIN H2 — cadastro atual");
  }
  await botao("Próxima"); await esperar("document.body.innerText.includes('Página 2 de')");
  await campo("form select", "PATRIMONIO_UPDATE"); await botao("Aplicar filtros");
  await esperar("document.body.innerText.includes('Página 1 de') && !!document.querySelector('table')");
  assert.ok(trafego.some(t => t.query.includes("action=PATRIMONIO_UPDATE") && t.query.includes("pagina=1")));
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const filtros = filtrosAuditoria({ inicio: hoje, fim: hoje, userId: f.admin, action: "REGIAO_UPDATE", entity: "RegiaoPatrimonio" });
  const filtrado = await api("/admin/auditoria?" + new URLSearchParams({ ...filtros, limite: "100" }));
  assert.equal(filtrado.body.data.paginacao.total, rows.filter(r => r.userId === f.admin && r.action === "REGIAO_UPDATE").length);
  await botao("Limpar filtros");
  await campo("input[type=date]", hoje); await campo("label:nth-child(2) input[type=date]", hoje);
  await campo("fieldset > label input", f.admin); await campo("form select", "REGIAO_UPDATE");
  await avaliar("(()=>{const e=document.querySelectorAll('form select')[1];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'RegiaoPatrimonio');e.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await botao("Aplicar filtros"); await esperar("!!document.querySelector('table') && !document.body.innerText.includes('Carregando histórico')");
  const contagemFiltrada = filtrado.body.data.paginacao.total;
  assert.ok((await avaliar("document.body.innerText")).includes(contagemFiltrada + " alterações registradas nos filtros aplicados"));
  // Cada caso chega ao modal pela lista real filtrada pelo alvo.
  for (const row of rows.filter(r => (r.userId === f.admin || Object.values(s.legados.ids).includes(r.id)) &&
    (r.entity !== "RegiaoPatrimonio" || r.action === "REGIAO_CREATE" || r.newValues?.ativo === false))) {
    if (row.id === s.legados.ids.removivel) continue;
    await filtrarAlvo(row.entityId); await abrir(row.id); await conferirModal(await detalhe(row.id)); await botao("Fechar detalhes");
  }
  assert.equal(await avaliar("window.__h2xss === undefined"), true);
  for (const width of [1440, 390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await botao("Limpar filtros"); await esperar("!!document.querySelector('table')");
    assert.equal(await avaliar("document.documentElement.scrollWidth <= innerWidth"), true); await captura("historico_" + width);
    const longo = rows.find(r => r.action === "PATRIMONIO_UPDATE" && r.newValues?.historia?.includes("Conteúdo longo"));
    await filtrarAlvo(bem.id); await abrir(longo.id); await conferirModal(await detalhe(longo.id));
    for (let i = 0; i < 5; i++) { await tecla("Tab", "Tab", 9); assert.equal(await avaliar("document.querySelector('dialog').contains(document.activeElement)"), true); }
    await tecla("Tab", "Tab", 9, 8); assert.equal(await avaliar("document.querySelector('dialog').contains(document.activeElement)"), true);
    assert.equal(await avaliar("document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth"), true);
    await captura("detalhe_" + width, true); await tecla("Escape", "Escape", 27); await esperar("!document.querySelector('dialog')");
    assert.equal(await avaliar("document.activeElement.getAttribute('aria-label')?.startsWith('Detalhes da alteração')"), true);
  }
  await filtrarAlvo(randomUUID()); await esperar("document.body.innerText.includes('Nenhuma alteração encontrada')"); await captura("vazio");
  // Token realmente expira; o Axios deve renovar contra o backend e persistir a rotação SQL.
  const antesRefresh = (await sql("SELECT count(*)::int n FROM refresh_tokens WHERE used_at IS NOT NULL"))[0].n;
  const expira = await avaliar("JSON.parse(atob(JSON.parse(sessionStorage.getItem('guarulhos.admin.sessao')).token.split('.')[1])).exp");
  console.log("Aguardando expiração real do token de teste (TTL 180 s)");
  while (Date.now() < expira * 1000 + 1200) await pausa(Math.min(1000, expira * 1000 + 1200 - Date.now()));
  const vencido = await api("/admin/auditoria"); assert.equal(vencido.status, 401); assert.equal(vencido.body.error.code, "ACCESS_TOKEN_EXPIRED");
  await botao("Limpar filtros"); await esperar("!!document.querySelector('table')");
  assert.ok((await sql("SELECT count(*)::int n FROM refresh_tokens WHERE used_at IS NOT NULL"))[0].n > antesRefresh);
  await navegar("/admin/auditoria"); await esperar("!!document.querySelector('table')");
  const v1 = await api("/admin/dashboard"), v2 = await api("/admin/dashboard/metricas");
  assert.equal(v1.body.data.total, 1); assert.equal(v2.body.data.disponivel, false);
  await botao("Sair"); await esperar("location.pathname==='/admin/login'");
  const anon = await api("/admin/auditoria", "GET", undefined, false); assert.equal(anon.status, 401); assert.match(anon.cache, /private.*no-store/);
  await login("editor"); await navegar("/admin/auditoria"); await esperar("document.body.innerText.includes('não tem permissão')");
  assert.equal(await avaliar("[...document.querySelectorAll('a')].some(a=>a.textContent==='Histórico de alterações')"), false);
  for (const rota of ["/admin/auditoria", "/admin/auditoria/" + rows[0].id]) { const r = await api(rota); assert.equal(r.status, 403); assert.match(r.cache, /private.*no-store/); }
  await botao("Sair"); await esperar("location.pathname==='/admin/login'"); await login("outro");
  if (!s.operacoes.senha) {
    s.novaSenha ??= randomUUID() + "H2!"; await salvar();
    await mutacao("senha", "/auth/senha", "PATCH", { senhaAtual: f.senha, novaSenha: s.novaSenha });
    s.senhaAtual = { outro: s.novaSenha }; await salvar();
    await navegar("/admin/auditoria"); await esperar("location.pathname==='/admin/login'");
  } else {
    assert.equal(s.operacoes.senha.estado, "CONCLUIDA", "Não repete troca de senha falha/incerta");
    await botao("Sair"); await esperar("location.pathname==='/admin/login'");
  }
  await login("admin"); await navegar("/admin/auditoria"); await esperar("!!document.querySelector('table')");
  const [senha] = await sql("SELECT id,old_values,new_values FROM audit_log WHERE action='USER_PASSWORD_CHANGE' AND user_id=$1", [f.outro]);
  assert.equal(senha.old_values, null); assert.equal(senha.new_values, null); await filtrarAlvo(f.outro); await abrir(senha.id); await conferirModal(await detalhe(senha.id)); await botao("Fechar detalhes");
  const [final] = await sql("SELECT (SELECT count(*)::int FROM audit_log) eventos,(SELECT count(*)::int FROM patrimonio) bens,(SELECT count(*)::int FROM _prisma_migrations WHERE finished_at IS NOT NULL) migrations");
  assert.deepEqual(erros, []);
  await writeFile(path.join(out, "navegador.json"), JSON.stringify({ identidade, final, evidencias, trafego, erros, persistencia: "PostgreSQL real exclusivo; API real; autenticação real", flags: false }, null, 2));
  console.log(JSON.stringify({ final, modaisConferidos: evidencias.length, erros }));
}
try { await main(); }
catch (e) { await writeFile(path.join(out, "falha_navegador.json"), JSON.stringify({ erro: e.message, evidencias, trafego, erros }, null, 2)); throw e; }
finally {
  if (ws?.readyState === WebSocket.OPEN) { try { await cmd("Browser.close"); } catch { /* Encerrado. */ } ws.close(); }
  browser?.kill(); await vite?.close(); backend?.kill(); await db.end();
}
