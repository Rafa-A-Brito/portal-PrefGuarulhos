// Opt-in F4. API/SQL reais; sem fixtures de resposta no ensaio principal.
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readFile, writeFile, stat } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import pg from "../../backend/node_modules/pg/lib/index.js";
import { abrirBrowser, pausa } from "./fixtures/browser_feedback.mjs";
import { prepararProxy, dockerFeedback } from "./fixtures/proxy_feedback.mjs";
import { diaFeedback, dataBr } from "../src/features/admin/feedbackDashboard.js";
import { descartarFeedback, conferirDestinoFeedback } from "../../backend/scripts/descartar_feedback.js";

assert.equal(process.env.HOMOLOGACAO_FEEDBACK_F4, "1");
const raiz = fileURLToPath(new URL("../../", import.meta.url)), pasta = path.join(raiz, ".cache/feedback_f4");
const privado = path.join(pasta, "privado.json"), s = JSON.parse(await readFile(privado));
assert.equal(s.validado, true); assert.equal(s.fixtures, "CONCLUIDA");
const u = new URL(s.env.TEST_DATABASE_URL);
assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "5549"); assert.equal(u.pathname, "/portal_test"); assert.equal(u.search, "");
assert.ok((await stat(path.join(pasta, "antes_browser.dump"))).size > 0);
async function leitura(sql, params = []) {
  const db = new pg.Client({ connectionString: u.href }); await db.connect();
  try { await db.query("BEGIN READ ONLY"); return (await db.query(sql, params)).rows; }
  finally { await db.query("ROLLBACK"); await db.end(); }
}
const [identidade] = await leitura("SELECT system_identifier::text cluster,current_database() banco FROM pg_control_system()");
assert.equal(identidade.cluster, s.cluster); assert.equal(identidade.banco, "portal_test");
const container = JSON.parse(dockerFeedback(["inspect", s.container]))[0];
assert.equal(container.Config.Labels["com.docker.compose.project"], s.env.TEST_COMPOSE_PROJECT); assert.ok(container.Mounts.some(m => m.Name === s.volume));
const salvar = () => writeFile(privado, JSON.stringify(s, null, 2));
s.hmac ??= randomBytes(32).toString("hex"); s.etapas ??= {}; await salvar();
async function etapa(nome, fn) {
  if (s.etapas[nome] === "CONCLUIDA") return;
  assert.equal(s.etapas[nome], undefined, "Não repetir escrita falha/incerta: " + nome);
  s.etapas[nome] = "INICIADA"; await salvar(); await fn(); s.etapas[nome] = "CONCLUIDA"; await salvar();
}
const origem = "https://127.0.0.1:8445", posts = [], rede = [], resultados = [], chavesEnsaio = new Set();
const somenteProxy = process.argv[2] === "proxy";
const somenteVisual = process.argv[2] === "visual";
let api, vite, proxy, browser, parado = false, sequenciaApi = 0;
async function iniciarApi(recebimento = true, consulta = true, trust = "127.0.0.1,::1") {
  if (api) { const antiga = api; api = null; antiga.kill(); await new Promise(r => antiga.once("exit", r)); }
  const log = createWriteStream(path.join(pasta, `api_${++sequenciaApi}.log`), { flags: "a" });
  const child = fork(path.join(raiz, "backend/test/fixtures/feedback_f4_api.mjs"), [], { cwd: path.join(raiz, "backend"), execPath: process.execPath, windowsHide: true,
    env: { ...s.env, HOMOLOGACAO_FEEDBACK_F4: "1", DATABASE_URL: s.env.SECURITY_API_DATABASE_URL, CORS_ORIGIN: origem, TRUST_PROXY_IPS: trust,
      JWT_TTL_SECONDS: "60", FEEDBACK_RECEBIMENTO_ATIVO: String(recebimento), FEEDBACK_CONSULTA_ATIVA: String(consulta), FEEDBACK_ORIGEM: origem, FEEDBACK_TRANSPORTE: "https",
      FEEDBACK_AVISOS_ACEITOS: "feedback-v1", FEEDBACK_CHAVE_ATUAL: "f4", FEEDBACK_CHAVES_JSON: JSON.stringify([{ id: "f4", segredo: s.hmac }]) }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  child.stdout.pipe(log); child.stderr.pipe(log); api = child;
  child.on("message", m => { if (m.evento === "post") posts.push(m); if (m.evento === "peer") s.peer = m.ip; });
  await new Promise((resolve, reject) => { child.on("message", m => { if (m.evento === "pronto") resolve(); }); child.once("exit", () => reject(Error("API não iniciou"))); });
}
async function http(rota, { method = "GET", body, headers = {} } = {}) {
  if (headers["Idempotency-Key"]) chavesEnsaio.add(headers["Idempotency-Key"]);
  const resposta = proxy.http({ rota, method, body, headers });
  // spawnSync finalizou o transporte; libera o event loop para receber a evidência IPC da API.
  await pausa(25); return resposta;
}
try {
  await iniciarApi();
  vite = await createServer({ root: path.join(raiz, "frontend"), configFile: false, envDir: false, logLevel: "error", plugins: [react()],
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api"), "import.meta.env.VITE_FEEDBACK_ATIVO": '"true"', "import.meta.env.VITE_METRICAS_ATIVAS": '"false"', "import.meta.env.VITE_USE_MOCK_MAP": '"true"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    server: { host: "0.0.0.0", port: 5195, strictPort: true, allowedHosts: ["127.0.0.1"] } }); await vite.listen();
  proxy = await prepararProxy(raiz, pasta, s.env.TEST_COMPOSE_PROJECT);
  for (let i = 0; i < 40; i++) { try { await http("/api/feedback"); break; } catch (e) { if (i === 39) throw e; await pausa(250); } }
  assert.equal((await http("/api/feedback")).status, 405);
  // Descobre o peer real do Docker Desktop antes de qualquer POST, sem ampliar sub-rede confiável.
  await http("/api/categorias"); await pausa(100);
  assert.ok(s.peer); await iniciarApi(true, true, s.peer); const trust = s.peer;
  browser = await abrirBrowser(pasta, proxy.spki, m => {
    if (m.method === "Network.requestWillBeSent" && m.params.request.url === origem + "/api/feedback" && m.params.request.method === "POST") rede.push(m.params.request);
  }, proxy.cdp);
  const { avaliar, esperar, navegar, botao, campo, tecla, captura, largura } = browser;
  const nav = rota => navegar(origem + rota);
  const pronto = () => esperar("document.querySelector('[aria-label=\"Lista de feedbacks\"]') && !document.body.innerText.includes('Carregando resumo') && !document.body.innerText.includes('Carregando lista')");
  const apiBrowser = (rota, auth = true) => avaliar(`(async()=>{const sessao=JSON.parse(sessionStorage.getItem('guarulhos.admin.sessao')||'null');const r=await fetch('/api'+${JSON.stringify(rota)},{headers:${auth}?{Authorization:'Bearer '+sessao?.token}:{}});return {status:r.status,data:await r.json(),cache:r.headers.get('cache-control')};})()`);
  async function login(role) {
    await nav("/admin/login"); await esperar("document.querySelector('#email')"); await campo("#email", role + "@f4.example.test"); await campo("#senha", s.senha);
    await avaliar("document.querySelector('form').requestSubmit()"); await esperar(`location.pathname!=='/admin/login' && JSON.parse(sessionStorage.getItem('guarulhos.admin.sessao')||'null')?.user.role===${JSON.stringify(role.toUpperCase())}`);
    await nav("/admin/feedback");
  }
  if (somenteVisual) {
    await login("admin"); await pronto();
    const total = (await leitura("SELECT count(*)::text total FROM feedback WHERE expira_em>clock_timestamp()"))[0].total;
    assert.ok(await avaliar(`document.body.innerText.includes('Total: ${total}')`));
    const estabilizar = async () => {
      await esperar("document.querySelectorAll('.recharts-surface').length===2");
      for (let i = 0; i < 2; i++) { await avaliar(`document.querySelectorAll('.recharts-surface')[${i}].scrollIntoView()`); await pausa(300); }
      await avaliar("scrollTo(0,0)"); await pausa(400);
      assert.ok(await avaliar("[...document.querySelectorAll('.recharts-surface')].every(e=>e.getBoundingClientRect().width>0)"));
    };
    for (const width of [1440, 390, 320]) {
      await largura(width); await estabilizar();
      assert.ok(await avaliar("document.documentElement.scrollWidth<=innerWidth")); await captura("admin_final_" + width);
    }
    await browser.call("Emulation.setDeviceMetricsOverride", { width: 720, height: 900, deviceScaleFactor: 2, mobile: false }); await estabilizar();
    assert.ok(await avaliar("document.documentElement.scrollWidth<=innerWidth")); await captura("zoom_final_200");
    const cores = await avaliar("(()=>{const b=document.querySelector('form .btn-solid'),p=document.querySelector('.admin-content p');return {botao:getComputedStyle(b).color,fundoBotao:getComputedStyle(b).backgroundColor,texto:getComputedStyle(p).color,fundo:getComputedStyle(document.querySelector('.admin-shell')).backgroundColor}})()");
    const luminancia = cor => cor.match(/\d+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const contraste = (a,b) => { const x=luminancia(a),y=luminancia(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
    const razoes = { botao: contraste(cores.botao,cores.fundoBotao), texto: contraste(cores.texto,cores.fundo) };
    assert.ok(razoes.botao>=4.5 && razoes.texto>=4.5);
    await writeFile(path.join(pasta,"visual_final.json"),JSON.stringify({total,cores,contraste:razoes,viewports:[1440,390,320],reflow200:true,graficosCarregados:true},null,2));
    console.log(JSON.stringify({visual:true,total,contraste:razoes}));
  }
  if (!somenteProxy && !somenteVisual) {
  const textos = ["Elogio sintético F4: navegação clara. 😀", "Sugestão sintética F4: preservar parágrafos.\nCafe\u0301.", "Problema sintético F4: <img src=x onerror=alert(1)>\nhttps://example.invalid\n" + "Texto longo de teste. ".repeat(70)];
  await largura(1440);
  // Retomada delimitada da falha IPv6 de transporte: autorização explícita, uma única vez.
  if (s.etapas.tres_envios === "INICIADA" && process.env.F4_REPETIR_SUGESTAO_503 === "1") {
    assert.equal(s.retomadaSugestao, undefined, "A autorização anterior já foi consumida");
    const rows = await leitura("SELECT tipo,mensagem FROM feedback ORDER BY created_at");
    assert.deepEqual(rows, [{ tipo: "ELOGIO", mensagem: textos[0] }]);
    assert.equal((await leitura("SELECT count(*)::int n FROM feedback_recibo"))[0].n, 1);
    s.retomadaSugestao = true; delete s.etapas.tres_envios; await salvar();
  }
  await etapa("tres_envios", async () => {
    assert.equal((await leitura("SELECT count(*)::int n FROM feedback"))[0].n, s.retomadaSugestao ? 1 : 0);
    for (const [i, tipo] of ["ELOGIO", "SUGESTAO", "PROBLEMA"].entries()) {
      if (i === 0 && s.retomadaSugestao) continue;
      await nav("/feedback"); await esperar("document.querySelector('textarea')"); const antes = posts.length;
      await avaliar(`document.cookie='f4_cookie=nao_enviar;path=/;Secure';document.querySelector('input[value="${tipo}"]').click()`);
      await campo("textarea", textos[i]); assert.equal(posts.length, antes); await botao("Enviar feedback");
      await esperar("document.querySelector('[role=status]').textContent.includes('Feedback recebido.')");
      assert.equal(posts.at(-1).status, 201);
    }
    const rows = await leitura("SELECT tipo,mensagem FROM feedback ORDER BY created_at"); assert.equal(rows.length, 3);
    for (let i = 0; i < 3; i++) assert.equal(rows[i].mensagem, textos[i].normalize("NFC").trim());
  }); resultados.push({ tresTiposPersistidos: true });
  await etapa("perda_replay", async () => {
    await nav("/feedback"); await esperar("document.querySelector('textarea')");
    api.send("perder"); await new Promise(resolve => { const listener = m => { if (m.evento === "perda_armada") { api.off("message", listener); resolve(); } }; api.on("message", listener); });
    await avaliar("document.querySelector('input[value=ELOGIO]').click()"); await campo("textarea", "Resposta perdida sintética F4 após COMMIT."); await botao("Enviar feedback");
    await esperar("[...document.querySelectorAll('button')].some(b=>b.textContent==='Reenviar o mesmo feedback')");
    assert.equal((await leitura("SELECT count(*)::int n FROM feedback"))[0].n, 4);
    const anterior = rede.at(-1); await botao("Reenviar o mesmo feedback"); await esperar("document.querySelector('[role=status]').textContent.includes('Feedback recebido.')");
    assert.equal(posts.at(-1).status, 200); assert.equal(anterior.postData, rede.at(-1).postData);
    assert.equal(anterior.headers["Idempotency-Key"], rede.at(-1).headers["Idempotency-Key"]);
    assert.deepEqual((await leitura("SELECT (SELECT count(*)::int FROM feedback) feedback,(SELECT count(*)::int FROM feedback_recibo) recibos"))[0], { feedback: 4, recibos: 4 });
  }); resultados.push({ perdaAposCommit: true, replay200: true, feedback: 4, recibos: 4 });
  assert.ok(posts.every(p => !p.cookie && !p.jwt && p.origem === origem && p.proto === "https"));
  resultados.push({ publicoSemJwtCookie: true, httpsCertificadoTemporario: true, peerConfiavel: trust });
  await login("admin"); await pronto();
  assert.ok(await avaliar("document.body.innerText.includes('Total: 4')"));
  const hoje = diaFeedback(), query = `?inicio=${hoje}&fim=${hoje}`, resumoReal = await apiBrowser("/admin/feedback/resumo" + query);
  assert.equal(resumoReal.status, 200); assert.equal(resumoReal.data.data.total, "4");
  const soma = a => a.reduce((n, r) => n + BigInt(r.quantidade), 0n); assert.equal(soma(resumoReal.data.data.porTipo), 4n); assert.equal(soma(resumoReal.data.data.serie), 4n);
  const registros = await leitura('SELECT id,tipo,mensagem,created_at FROM feedback ORDER BY created_at DESC,id DESC');
  for (const width of [1440, 390, 320]) {
    await largura(width); await pausa(400); assert.equal(await avaliar("document.documentElement.scrollWidth<=innerWidth"), true);
    await avaliar("document.querySelectorAll('[role=region]').forEach(e=>e.scrollLeft=0)"); await captura("admin_" + width);
    const label = await avaliar("document.querySelector('[aria-label=\"Lista de feedbacks\"] button').getAttribute('aria-label')");
    await avaliar("document.querySelector('[aria-label=\"Lista de feedbacks\"] button').focus()"); await tecla("Enter", "Enter", 13); await esperar("document.querySelector('[aria-label=\"Comentário completo\"]')");
    assert.equal(await avaliar("document.querySelector('[aria-label=\"Comentário completo\"]').textContent"), registros[0].mensagem);
    for (let i = 0; i < 4; i++) { await tecla("Tab", "Tab", 9); assert.equal(await avaliar("document.querySelector('dialog').contains(document.activeElement)"), true); }
    await tecla("Tab", "Tab", 9, 8); assert.equal(await avaliar("document.querySelector('dialog').contains(document.activeElement)"), true);
    await captura("detalhe_" + width, true); await tecla("Escape", "Escape", 27); await esperar("!document.querySelector('dialog')"); assert.equal(await avaliar("document.activeElement.getAttribute('aria-label')"), label);
  }
  await avaliar("[...document.querySelectorAll('[aria-label=\"Lista de feedbacks\"] button')][1].click()"); await esperar("document.querySelector('[aria-label=\"Comentário completo\"]')");
  assert.equal(await avaliar("document.querySelector('[aria-label=\"Comentário completo\"]').textContent"), registros[1].mensagem);
  assert.equal(await avaliar("document.querySelector('dialog').querySelector('img,script,a,iframe')===null"), true); await captura("mensagem_longa_320", true); await botao("Fechar detalhes");
  // Reflow equivalente a viewport 1440 ampliado a 200%, com 720 pixels CSS e escala 2.
  await browser.call("Emulation.setDeviceMetricsOverride", { width: 720, height: 900, deviceScaleFactor: 2, mobile: false }); await pausa(500);
  assert.equal(await avaliar("document.documentElement.scrollWidth<=innerWidth"), true); await captura("zoom_200"); await largura(1440);
  await campo('form[aria-label="Filtros de feedback"] select', "SUGESTAO"); await botao("Aplicar filtros"); await pronto(); assert.equal(await avaliar("document.body.innerText.includes('Total: 1')"), true);
  await campo('form[aria-label="Filtros de feedback"] label:nth-child(4) select', "mes"); await botao("Aplicar filtros"); await pronto();
  assert.ok(await avaliar("document.body.innerText.includes('(parcial)')"));
  // Datas BR vazias sem inventar contagem; a API consulta o intervalo anterior ao ensaio.
  const ontem = new Date(Date.parse(hoje + "T12:00:00Z") - 86400000).toISOString().slice(0, 10);
  await campo('form input', dataBr(ontem)); await campo('form label:nth-child(2) input', dataBr(ontem)); await botao("Aplicar filtros");
  await esperar("document.body.innerText.includes('Nenhum feedback retido')"); await captura("vazio"); await botao("Limpar filtros"); await pronto();
  // Fixtures SQL delimitadas para paginação e expiração; backup e cluster conferidos antes.
  await etapa("paginacao_expiracao", async () => {
    const db = new pg.Client({ connectionString: u.href }); await db.connect();
    try { await db.query("BEGIN");
      await db.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,created_at,expira_em) SELECT 'SUGESTAO','Paginação sintética F4 '||n,'feedback-v1',clock_timestamp()-interval '1 day',clock_timestamp()+interval '179 days' FROM generate_series(1,21) n");
      await db.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,created_at,expira_em) VALUES('PROBLEMA','Expirado sintético F4','feedback-v1',clock_timestamp()-interval '2 days',clock_timestamp()-interval '1 second')");
      await db.query("COMMIT");
    } finally { await db.end(); }
  });
  await botao("Atualizar dados"); await pronto(); assert.equal(await avaliar("document.body.innerText.includes('Total: 25')"), true);
  await botao("Próxima"); await esperar("document.body.innerText.includes('Página 2 de 2')");
  assert.equal(await avaliar("document.querySelectorAll('[aria-label=\"Lista de feedbacks\"] tbody tr').length"), 5); assert.ok(await avaliar("document.body.innerText.includes('Total: 25')"));
  await botao("Anterior"); await pronto(); resultados.push({ filtrosBR: true, pagina2: 5, totalRetido: 25, expiradoExcluido: true, detalheSql: true, xssInerte: true });
  const exp = (await leitura("SELECT id FROM feedback WHERE mensagem='Expirado sintético F4'"))[0];
  if (exp) assert.equal((await apiBrowser("/admin/feedback/" + exp.id)).status, 404);
  await iniciarApi(false, true, trust); await botao("Atualizar dados"); await pronto(); assert.ok(await avaliar("document.body.innerText.includes('Total: 25')"));
  await iniciarApi(false, false, trust); await botao("Atualizar dados"); await esperar("document.body.innerText.includes('Consulta de feedback desativada')");
  assert.equal(await avaliar("document.body.innerText.includes('Total:')"), false); await captura("consulta_desativada");
  await iniciarApi(true, true, trust); await botao("Atualizar dados"); await pronto();
  // Expiração natural do JWT: usa refresh real existente, sem alterar autenticação.
  const vencimento = await avaliar("JSON.parse(atob(JSON.parse(sessionStorage.getItem('guarulhos.admin.sessao')).token.split('.')[1])).exp");
  while (Date.now() < vencimento * 1000 + 1000) await pausa(1000);
  await botao("Atualizar dados"); await pronto(); assert.ok((await leitura("SELECT count(*)::int n FROM refresh_tokens WHERE used_at IS NOT NULL"))[0].n > 0);
  resultados.push({ refreshReal: true, consultaIndependenteRecebimento: true, flagsDesligadas: true });
  // Queda física do PostgreSQL: apenas o container com identidade já conferida.
  dockerFeedback(["stop", s.container]); parado = true; await botao("Atualizar dados");
  await esperar("document.querySelector('[role=alert]')", 30000); assert.equal(await avaliar("document.body.innerText.includes('Total:')"), false); await captura("banco_indisponivel");
  dockerFeedback(["start", s.container]); parado = false;
  for (let i = 0; i < 40; i++) { try { await leitura("SELECT 1"); break; } catch { await pausa(250); } }
  assert.equal((await leitura("SELECT system_identifier::text cluster FROM pg_control_system()"))[0].cluster, s.cluster);
  await botao("Atualizar dados"); await pronto(); resultados.push({ bancoParadoRecuperado: true });
  assert.equal((await apiBrowser("/admin/auditoria?pagina=1&limite=20")).status, 200);
  assert.equal((await apiBrowser("/admin/dashboard")).status, 200);
  assert.equal((await apiBrowser("/admin/dashboard/metricas")).data.data.disponivel, false);
  await botao("Sair"); await esperar("location.pathname==='/admin/login'");
  assert.equal((await apiBrowser("/admin/feedback" + query, false)).status, 401);
  await login("editor"); await esperar("document.body.innerText.includes('não tem permissão')");
  for (const rota of ["/admin/feedback" + query, "/admin/feedback/resumo" + query, "/admin/feedback/" + registros[0].id]) assert.equal((await apiBrowser(rota)).status, 403);
  assert.equal(await avaliar("document.querySelector('a[href=\"/admin/feedback\"]')===null"), true); await botao("Sair");
  resultados.push({ admin200: true, visitante401: true, editor403: true, historicoV1V2: true, logoutReal: true });
  await etapa("descarte", async () => {
    const op = new pg.Client({ connectionString: s.env.FEEDBACK_OPERACAO_URL }); await op.connect();
    try { await conferirDestinoFeedback(op, { FEEDBACK_OPERACAO_URL: s.env.FEEDBACK_OPERACAO_URL, FEEDBACK_OPERACAO_HOST: "127.0.0.1", FEEDBACK_OPERACAO_PORTA: "5549", FEEDBACK_OPERACAO_BANCO: "portal_test", FEEDBACK_OPERACAO_CLUSTER: s.cluster });
      const previa = await descartarFeedback(op); assert.equal(previa.feedback, "1"); const removidos = await descartarFeedback(op, { executar: true }); assert.equal(removidos.feedback, "1");
    } finally { await op.end(); }
  });
  await writeFile(path.join(pasta, "browser_concluido.json"), JSON.stringify({ identidade, resultados, erros: browser.erros }, null, 2));
  }
  if (!somenteVisual) {
  // Respostas do proxy: código real da API, corpo/host/origem e spoofing.
  await pausa(12000);
  const chave = randomBytes(32).toString("base64url"), corpo = JSON.stringify({ tipo: "ELOGIO", mensagem: "Canário privado F4 proxy", avisoVersao: "feedback-v1" });
  const headers = { "Content-Type": "application/json", Origin: origem, "X-Portal-Feedback": "1", "Idempotency-Key": chave, "X-Forwarded-For": "198.51.100.99", "X-Forwarded-Proto": "http", "X-Forwarded-Host": "forjado.invalid", Forwarded: "for=198.51.100.99", Authorization: "Bearer NAO_ENVIAR", Cookie: "segredo=NAO_ENVIAR" };
  if (somenteProxy && s.etapas.proxy_post === "INICIADA") {
    // O POST/replay/conflito concluíram; falhou somente a leitura prematura da evidência IPC.
    // Confere a persistência, preserva o envio e não repete seu INSERT.
    assert.deepEqual(s.proxyRespostas, [201, 200, 409], "Retomada exige respostas previamente conferidas e registradas");
    const r = await leitura("SELECT f.id FROM feedback f JOIN feedback_recibo r ON r.feedback_id=f.id WHERE f.mensagem='Canário privado F4 proxy'");
    assert.equal(r.length, 1); s.etapas.proxy_post = "CONCLUIDA"; s.retomadaProxySomenteLeitura = true; await salvar();
  }
  await etapa("proxy_post", async () => {
    assert.equal((await http("/api/feedback", { method: "POST", headers, body: corpo })).status, 201);
    assert.equal((await http("/api/feedback", { method: "POST", headers, body: corpo })).status, 200);
    assert.equal((await http("/api/feedback", { method: "POST", headers, body: corpo.replace("Canário", "Outro") })).status, 409);
    s.proxyRespostas = [201, 200, 409]; await salvar();
    assert.ok(posts.at(-1).encaminhado !== "198.51.100.99"); assert.ok(posts.every(p => !p.cookie && !p.jwt));
  });
  await etapa("recibo_expirado", async () => {
    const corpoExpiracao = JSON.stringify({ tipo: "PROBLEMA", mensagem: "Recibo sintético F4 dedicado à expiração.", avisoVersao: "feedback-v1" });
    const h = { ...headers, "Idempotency-Key": randomBytes(32).toString("base64url") };
    assert.equal((await http("/api/feedback", { method: "POST", headers: h, body: corpoExpiracao })).status, 201);
    assert.ok(posts.at(-1).encaminhado !== "198.51.100.99"); assert.ok(posts.every(p => !p.cookie && !p.jwt));
    // Janela vencida sintética no recibo específico, sem alterar conteúdo de produção.
    const digest = createHash("sha256").update(Buffer.from(h["Idempotency-Key"], "base64url")).digest("hex"), db = new pg.Client({ connectionString: u.href }); await db.connect();
    try { await db.query("BEGIN"); await db.query("UPDATE feedback_recibo SET recebido_em=clock_timestamp()-interval '25 hours',expira_em=clock_timestamp()-interval '1 hour' WHERE chave_digest=$1", [digest]); await db.query("COMMIT"); }
    finally { await db.end(); }
    const expirado = await http("/api/feedback", { method: "POST", headers: h, body: corpoExpiracao }); assert.equal(expirado.status, 409); assert.equal(expirado.json.error.code, "ENVIO_EXPIRADO");
  });
  let limitado;
  for (let i = 0; i < 8; i++) { const r = await http("/api/feedback", { method: "POST", headers, body: "{}" }); if (r.status === 429) { limitado = r; break; } }
  assert.equal(limitado.status, 429); assert.ok(limitado.headers["retry-after"]);
  assert.equal((await http("/api/feedback/subcaminho?segredo=NAO_LOGAR")).status, 404);
  assert.equal((await http("/api/feedback?segredo=NAO_LOGAR", { method: "POST" })).status, 400);
  assert.equal((await http("/api/feedback", { method: "POST", headers: { ...headers, "Content-Length": "17000" }, body: "x".repeat(17000) })).status, 413);
  // Aguarda quota de borda; processo de API reiniciado com recebimento suspenso, consulta continua disponível.
  await iniciarApi(false, true, trust); await pausa(60000);
  assert.equal((await http("/api/feedback", { method: "POST", headers: { ...headers, "Idempotency-Key": randomBytes(32).toString("base64url") }, body: corpo })).status, 503);
  resultados.push({ proxy201: true, proxy200: true, proxy409: true, proxy429: true, proxy503: true, corpo413: true, subcaminho404: true, proxySpoofingBloqueado: true, reciboExpirado409: true, descarteReal: true });
  assert.deepEqual(browser.erros, []);
  const logs = await proxy.parar(); proxy = null;
  for (const segredo of [...chavesEnsaio, "Canário", "Recibo sintético", "NAO_ENVIAR", "NAO_LOGAR"]) assert.ok(!logs.includes(segredo));
  const final = (await leitura("SELECT (SELECT count(*)::int FROM feedback) feedback,(SELECT count(*)::int FROM feedback_recibo) recibos"))[0];
  await writeFile(path.join(pasta, "integrado.json"), JSON.stringify({ identidade, resultados, final, errosBrowser: browser.erros, limite: "Viewports e reflow 200% simulados; sem zoom nativo, leitor de tela ou aparelho físico" }, null, 2));
  console.log(JSON.stringify({ resultados, final }));
  }
} finally {
  if (parado) dockerFeedback(["start", s.container]);
  await browser?.fechar(); await vite?.close(); api?.kill(); await proxy?.parar();
}
