// Navegador real + Express real + PostgreSQL exclusivo. Não intercepta respostas HTTP.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import https from "node:https";
import pg from "pg";

assert.equal(process.env.HOMOLOGACAO_METRICAS_EXCLUSIVA, "1");
const estado = JSON.parse(await readFile("/evidencias/privado.json", "utf8"));
const f = estado.fixture, origem = "https://portal.test", evidencias = [], trafego = [];
const url = new URL(process.env.TEST_DATABASE_URL);
assert.equal(url.hostname, "db_test"); assert.equal(url.port, "5432"); assert.equal(url.pathname, "/portal_test");
const db = new pg.Client({ connectionString: url.href });
await db.connect();
await db.query("BEGIN READ ONLY");
const { rows: [identidade] } = await db.query("SELECT current_database() banco,current_user papel,system_identifier::text cluster FROM pg_control_system()");
assert.equal(identidade.banco, "portal_test"); assert.equal(identidade.papel, "portal_test"); assert.equal(identidade.cluster, process.env.METRICAS_TEST_CLUSTER);
await db.query("ROLLBACK");
const pausa = ms => new Promise(r => setTimeout(r, ms));
let browser, ws, seq = 0;
const pendentes = new Map();
function cmd(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
        const id = ++seq, timer = setTimeout(() => { pendentes.delete(id); reject(new Error("CDP timeout: " + method)); }, 20000);
        pendentes.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    });
}
async function sql(text, args = []) {
    await db.query("BEGIN READ ONLY");
    try { return (await db.query(text, args)).rows; } finally { await db.query("ROLLBACK"); }
}
const total = async () => (await sql("SELECT COALESCE(sum(quantidade),0)::text n FROM visualizacoes_totais_dia"))[0].n;
async function novaAba(contexto, script) {
    const { targetId } = await cmd("Target.createTarget", { url: "about:blank", browserContextId: contexto });
    const { sessionId } = await cmd("Target.attachToTarget", { targetId, flatten: true });
    const call = (m, p) => cmd(m, p, sessionId);
    await call("Page.enable"); await call("Network.enable"); await call("Runtime.enable");
    if (script) await call("Page.addScriptToEvaluateOnNewDocument", { source: script });
    const evaluate = async expression => {
        const r = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
        assert.ok(!r.exceptionDetails, "Avaliação no navegador: " + r.exceptionDetails?.text); return r.result.value;
    };
    const wait = async (expr, timeout = 20000) => {
        const inicio = Date.now(); while (Date.now() - inicio < timeout) { if (await evaluate(expr)) return; await pausa(100); }
        throw new Error("Condição não alcançada: " + expr);
    };
    const navegar = async rota => {
        await call("Page.navigate", { url: origem + rota }); await wait("document.readyState==='complete' && !!document.querySelector('#root')?.children.length");
    };
    const botao = async nome => { await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(nome)})`); await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(nome)}).click()`); };
    const painel = async () => {
        await wait("[...document.querySelectorAll('summary')].some(e=>e.textContent==='Métricas opcionais de visita')");
        await evaluate("[...document.querySelectorAll('summary')].find(e=>e.textContent==='Métricas opcionais de visita').focus()");
        await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    };
    const captura = async nome => {
        const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
        await writeFile("/evidencias/" + nome + ".png", Buffer.from(shot.data, "base64"));
    };
    return { targetId, sessionId, call, evaluate, wait, navegar, botao, painel, captura };
}
async function aguardarTotal(n) {
    for (let i = 0; i < 100; i++) { if (await total() === String(n)) return; await pausa(100); }
    assert.equal(await total(), String(n));
}
async function consultar(a, rota, opts = {}) {
    return a.evaluate(`(async()=>{const r=await fetch(${JSON.stringify(rota)},${JSON.stringify(opts)});return {status:r.status,body:r.status===204?null:await r.json()}})()`);
}
const post = patrimonioId => ({ method: "POST", headers: { "Content-Type": "application/json", "X-Portal-Metricas": "1" }, body: JSON.stringify({ patrimonioId }) });
async function login(a, role) {
    await a.navegar("/admin/login"); await a.wait("!!document.querySelector('#email')");
    for (const [id, value] of [["email", role + "@example.test"], ["senha", f.senha]]) {
        await a.evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    }
    await a.evaluate("document.querySelector('form').requestSubmit()");
    await a.wait("location.pathname==='/admin' && document.querySelectorAll('svg.recharts-surface').length===4");
}
async function main() {
    const bloqueado = process.argv[2] === "navegador-bloqueado";
    const adminSomente = process.argv[2] === "navegador-admin";
    const retomar = process.argv[2] === "navegador-retomar" || adminSomente;
    assert.equal(await total(), adminSomente || bloqueado ? "3" : retomar ? "1" : "0", "Retomada exige exatamente o checkpoint conferido; não limpa nem repete automaticamente.");
    if (retomar) {
        let anterior;
        try { anterior = JSON.parse(await readFile("/evidencias/navegador.json", "utf8")); }
        catch { anterior = JSON.parse(await readFile("/evidencias/navegador_parcial.json", "utf8")); }
        evidencias.push(...anterior.evidencias.filter(e => !adminSomente || !e.caso.startsWith("dashboard_") && e.caso !== "GPC_favoritos_mobile_estatisticas_protegidas"));
        trafego.push(...anterior.trafego);
    }
    await mkdir("/home/node/.pki/nssdb", { recursive: true });
    for (const args of [["-N", "--empty-password", "-d", "sql:/home/node/.pki/nssdb"], ["-A", "-d", "sql:/home/node/.pki/nssdb", "-n", "Portal ensaio", "-t", "C,,", "-i", "/evidencias/ca.pem"]]) {
        const r = spawnSync("certutil", args, { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr);
    }
    // A CA fica somente no HOME efêmero do container. Validação TLS nunca é desabilitada.
    const ca = await readFile("/evidencias/ca.pem");
    await new Promise((resolve, reject) => https.get(origem + "/api/health", { ca }, res => { assert.equal(res.statusCode, 200); res.resume(); res.on("end", resolve); }).on("error", reject));
    const profile = "/evidencias/chromium_" + Date.now();
    if (bloqueado) {
        await mkdir(profile + "/Default", { recursive: true });
        await writeFile(profile + "/Default/Preferences", JSON.stringify({ profile: { default_content_setting_values: { cookies: 2 } } }));
    }
    browser = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--no-first-run", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { stdio: "ignore" });
    let port, socket;
    for (let i = 0; i < 100; i++) { try { [port, socket] = (await readFile(profile + "/DevToolsActivePort", "utf8")).trim().split(/\r?\n/); break; } catch { await pausa(200); } }
    assert.ok(port); ws = new WebSocket("ws://127.0.0.1:" + port + socket);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.id) { const p = pendentes.get(m.id); pendentes.delete(m.id); m.error ? p?.reject(new Error(m.error.message)) : p?.resolve(m.result); }
        if (m.method === "Network.responseReceived" && m.params.response.url.startsWith(origem + "/api/")) {
            const r = m.params.response; trafego.push({ rota: new URL(r.url).pathname, status: r.status, tls: r.securityDetails?.issuer });
        }
    };
    const { browserContextId: ctx } = bloqueado ? {} : await cmd("Target.createBrowserContext");
    const a = await novaAba(ctx); await a.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    if (bloqueado) {
        await cmd("Target.activateTarget", { targetId: a.targetId });
        await a.navegar("/patrimonios/patrimonio-teste-2"); await a.painel(); await a.botao("Aceitar participação");
        await pausa(5000);
        await a.captura("cookies_bloqueados");
        console.log(JSON.stringify(await a.evaluate("({visibilidade:document.visibilityState,titulo:document.querySelector('h1')?.textContent,escolha:document.querySelector('details [role=status]')?.textContent})")));
        assert.ok(trafego.some(r => r.rota === "/api/metricas/visualizacoes" && r.status === 401));
        assert.equal((await a.call("Network.getCookies", { urls: [origem] })).cookies.length, 0);
        assert.equal(await total(), "3");
        assert.equal(await a.evaluate("!!document.querySelector('[role=alertdialog]')"), false);
        const antes = trafego.filter(r => r.rota.endsWith("visualizacoes/sessao")).length;
        await pausa(3000); assert.equal(trafego.filter(r => r.rota.endsWith("visualizacoes/sessao")).length, antes);
        await a.captura("cookies_bloqueados");
        await writeFile("/evidencias/cookies_bloqueados.json", JSON.stringify({ cookies: 0, eventosNovos: 0, semLoop: true, trafego }, null, 2));
        console.log("Cookies bloqueados pela preferência real do Chromium: 401, nenhum incremento ou loop; ficha continua disponível."); return;
    }
    let cookie;
    if (!retomar) {
    await a.navegar("/patrimonios/patrimonio-teste-1"); await a.wait("document.querySelector('h1')?.textContent.includes('Patrimônio de teste 1')");
    await pausa(2400); assert.equal(await total(), "0");
    assert.ok(!(await a.call("Network.getCookies", { urls: [origem] })).cookies.some(c => c.name.includes("metricas")));
    assert.equal(trafego.filter(r => r.rota.startsWith("/api/metricas")).length, 0);
    await a.painel(); await a.botao("Recusar participação"); await pausa(2200); assert.equal(await total(), "0");
    await a.botao("Aceitar participação"); await aguardarTotal(1);
    cookie = (await a.call("Network.getCookies", { urls: [origem] })).cookies.find(c => c.name === "__Host-portal_metricas");
    assert.ok(cookie?.secure && cookie.httpOnly && cookie.sameSite === "Lax" && cookie.path === "/");
    assert.equal(await a.evaluate("document.cookie.includes('portal_metricas')"), false);
    assert.ok(trafego.some(r => r.rota === "/api/metricas/visualizacoes" && r.status === 204 && r.tls === "Portal homologacao CA"));
    await a.captura("participacao_desktop");
    await a.call("Page.reload"); await pausa(3000); assert.equal(await total(), "1");
    const b = await novaAba(ctx); await b.navegar("/patrimonios/patrimonio-teste-1"); await pausa(3000);
    assert.equal(await total(), "1");
    assert.equal((await sql("SELECT count(*)::int n FROM visualizacoes_unicas_dia"))[0].n, 1);
    assert.equal(trafego.filter(r => r.rota.endsWith("visualizacoes/sessao") && r.status === 200).length, 1);
    evidencias.push({ caso: "adesao_recusa_qualificacao_reload_duas_abas", recibos: 1, total: "1", emissoes: 1, tls: "CA efêmera validada" });
    await cmd("Target.closeTarget", { targetId: b.targetId });
    }
    if (!adminSomente) {
    await a.navegar("/patrimonios/patrimonio-teste-2");
    await a.wait("document.querySelector('h1')?.textContent.includes('Patrimônio de teste 2')");
    if (retomar) { await a.painel(); await a.botao("Aceitar participação"); }
    const fundo = await novaAba(ctx);
    await cmd("Target.activateTarget", { targetId: fundo.targetId });
    const oculta = await a.evaluate("document.visibilityState");
    assert.equal(oculta, "hidden");
    await pausa(2400); assert.equal(await total(), "1");
    await cmd("Target.activateTarget", { targetId: a.targetId }); await a.wait("document.visibilityState==='visible'"); await aguardarTotal(2);
    await cmd("Target.closeTarget", { targetId: fundo.targetId });
    cookie ??= (await a.call("Network.getCookies", { urls: [origem] })).cookies.find(c => c.name === "__Host-portal_metricas");
    evidencias.push({ caso: "aba_oculta_antes_de_2s", oculta, retomada: "uma qualificação" });
    await a.navegar("/patrimonios/patrimonio-teste-3"); await aguardarTotal(3);
    for (const id of [f.bens[3], f.bens[4], f.bens[5], "11111111-1111-4111-8111-111111111111"]) assert.equal((await consultar(a, "/api/metricas/visualizacoes", post(id))).status, 404);
    assert.equal(await total(), "3");
    // Cookie adulterado permanece HttpOnly e não contamina o estado administrativo.
    await a.call("Network.setCookie", { name: cookie.name, value: cookie.value.slice(0, -1) + (cookie.value.endsWith("a") ? "b" : "a"), url: origem, secure: true, httpOnly: true, sameSite: "Lax", path: "/" });
    assert.equal((await consultar(a, "/api/metricas/visualizacoes", post(f.bens[0]))).status, 401);
    await a.call("Network.setCookie", { name: cookie.name, value: cookie.value, url: origem, secure: true, httpOnly: true, sameSite: "Lax", path: "/", expires: cookie.expires });
    await a.painel(); await a.botao("Revogar participação");
    await pausa(500); assert.ok(!(await a.call("Network.getCookies", { urls: [origem] })).cookies.some(c => c.name === cookie.name));
    await a.navegar("/patrimonios/patrimonio-teste-1"); await pausa(2300); assert.equal(await total(), "3");
    evidencias.push({ caso: "elegibilidade_cookie_adulterado_revogacao", recusados: 4, total: "3", cookieRemovido: true });
    const { browserContextId: gpcCtx } = await cmd("Target.createBrowserContext");
    const gpc = await novaAba(gpcCtx, "Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true})");
    await gpc.navegar("/patrimonios/patrimonio-teste-1"); await gpc.painel();
    assert.equal(await gpc.evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='Aceitar participação').disabled"), true);
    await pausa(2300); assert.equal(await total(), "3"); await cmd("Target.disposeBrowserContext", { browserContextId: gpcCtx });
    // Mudança editorial controlada somente nos UUIDs desta fixture: histórico permanece.
    await db.query("BEGIN");
    await db.query("UPDATE patrimonio SET status='ARQUIVADO',regiao_id=$2 WHERE id=$1", [f.bens[0], f.regioes[2]]); await db.query("COMMIT");
    }
    for (const role of ["admin", "editor"]) {
        const { browserContextId: adminCtx } = await cmd("Target.createBrowserContext");
        const admin = await novaAba(adminCtx); await login(admin, role); await admin.botao("Consultar visualizações");
        const section = "document.querySelector('section[aria-label=\"Visualizações qualificadas V2\"]')";
        await admin.wait(`${section}?.querySelectorAll('svg.recharts-surface').length===3`);
        const response = await admin.evaluate("(async()=>{const s=JSON.parse(sessionStorage.getItem('guarulhos.admin.sessao'));const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'});const dia=fmt.format(new Date()),inicio=fmt.format(new Date(Date.now()-29*86400000));return (await fetch('/api/admin/dashboard/metricas?inicio='+inicio+'&fim='+dia,{headers:{Authorization:'Bearer '+s.token}})).json()})()");
        assert.equal(response.success, true); assert.equal(response.data.visualizacoes.totalRegistrado, await total());
        await writeFile("/evidencias/dashboard_" + role + ".json", JSON.stringify(response, null, 2));
        assert.equal(response.data.visualizacoes.semRegiao, "1");
        assert.equal(response.data.visualizacoes.porPatrimonio.itens.find(p => p.id === f.bens[0]).status, "ARQUIVADO");
        assert.equal(response.data.visualizacoes.porRegiao.find(r => r.id === f.regioes[2]).quantidade, "1");
        for (const width of role === "admin" ? [1440, 390] : [390]) {
            await admin.call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 }); await pausa(300);
            assert.equal(await admin.evaluate("document.documentElement.scrollWidth<=innerWidth"), true);
            assert.equal(await admin.evaluate("document.querySelectorAll('svg.recharts-surface').length"), 7);
            await admin.evaluate(`${section}.scrollIntoView()`); await admin.captura("dashboard_" + role + "_" + width);
        }
        const tips = [];
        for (let i = 0; i < 3; i++) {
            await admin.evaluate(`${section}.querySelectorAll('svg.recharts-surface')[${i}].focus()`);
            let tip;
            for (let k = 0; k < 35; k++) {
                await admin.call("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
                await admin.call("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }); await pausa(50);
                tip = await admin.evaluate(`${section}.querySelectorAll('.recharts-tooltip-wrapper')[${i}]?.innerText`);
                if (tip && /[0-9]/.test(tip)) break;
            }
            assert.ok(tip && /[0-9]/.test(tip), "Tooltip " + i); tips.push(tip);
        }
        await admin.navegar("/patrimonios/patrimonio-teste-2"); await admin.painel(); await admin.botao("Aceitar participação"); await pausa(2500);
        assert.equal(await total(), "3");
        evidencias.push({ caso: "dashboard_" + role, total: "3", semRegiao: "1", graficosV1: 4, graficosV2: 3, tooltips: tips, membroEquipeNaoContado: true });
        await cmd("Target.disposeBrowserContext", { browserContextId: adminCtx });
    }
    await a.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await a.navegar("/"); await a.wait("!!document.querySelector('.favorito-btn')");
    await a.evaluate("document.querySelector('.favorito-btn').click()");
    const favoritos = await a.evaluate("localStorage.getItem('portal-guarulhos:favoritos:v1')"); assert.ok(JSON.parse(favoritos).length);
    await a.call("Page.reload"); await a.wait("!!document.querySelector('.favorito-btn')");
    assert.equal(await a.evaluate("localStorage.getItem('portal-guarulhos:favoritos:v1')"), favoritos);
    await a.painel(); await a.captura("participacao_mobile");
    assert.equal((await consultar(a, "/api/admin/dashboard/metricas?inicio=2026-10-27&fim=2026-10-27")).status, 401);
    evidencias.push({ caso: "GPC_favoritos_mobile_estatisticas_protegidas", favoritosPersistidos: true, total: await total() });
    await writeFile("/evidencias/navegador.json", JSON.stringify({ identidade, evidencias, trafego }, null, 2));
    console.log(JSON.stringify(evidencias, null, 2));
}
try { await main(); }
catch (error) {
    await writeFile("/evidencias/navegador_parcial.json", JSON.stringify({ evidencias, trafego, erro: error.message }, null, 2));
    console.error(error.stack); process.exitCode = 1;
} finally {
    if (ws?.readyState === WebSocket.OPEN) { try { await cmd("Browser.close"); } catch { /* Já encerrado. */ } ws.close(); }
    browser?.kill(); await db.end();
}
