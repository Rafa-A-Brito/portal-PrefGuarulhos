// D2B: aplicação real, API exclusivamente em memória; nunca conecta ao banco.
// Execute na pasta frontend: node scripts/smoke-d2b.mjs
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const origin = "http://127.0.0.1:5181", output = path.resolve("../.cache/d2b-smoke");
const nomes = ["Estação Ferroviária de Guarulhos", "Casa Amarela", "Locomotiva Maria Fumaça nº 33"];
const slugs = ["estacao-ferroviaria-central-de-guarulhos", "casa-amarela-casa-do-chefe-da-estacao", "locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua"];
const categoria = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "historico", nome: "Histórico" };
const itens = nomes.map((nome, i) => ({ id: `11111111-1111-4111-8111-11111111111${i}`, slug: slugs[i], nome,
  categoria, categoriaId: categoria.id, situacao: "PRESERVADO", status: "PUBLICADO",
  descricaoResumida: "Patrimônio da memória ferroviária de Guarulhos.",
  descricao: "Fixture visual da seção editorial de patrimônios relacionados.",
  localizacao: { endereco: 'Rua de demonstração', numero: '10', bairro: 'Bairro de demonstração', cidade: 'Guarulhos', uf: 'SP', cep: '07000-000', latitude: -23.46, longitude: -46.53 },
  documentos: [], imagens: [],
  fatos: [], ligacoes: [],
}));
let ligacoes = [], writes = [], requests = [], etapa = "início";
let regioes = [], regionalWrites = [], propertyWrites = [];
const regionId = '44444444-4444-4444-8444-444444444444';
const snapshot = structuredClone(itens);
const regionDTO = () => regioes.find(r => r.id === itens[0].regiaoId) ?? null;
const withRegion = p => ({ ...p, regiao: p.regiaoId === regionId ? regionDTO() : null });
const loc = { endereco: 'Rua de demonstração', numero: '10', bairro: 'Bairro de demonstração', cidade: 'Guarulhos', uf: 'SP', cep: '07000-000', latitude: -23.46, longitude: -46.53 };
const publicItems = () => [
  ...itens.map((p, i) => ({ ...withRegion(p), localizacao: loc,
    detalhes: [{ titulo: 'História', texto: 'História documentada da fixture.', icone: 'historia' }, { titulo: 'Arquitetura', texto: 'Descrição arquitetônica de demonstração.', icone: 'arquitetura' }],
    imagens: i === 0 ? [{ id: 'imagem-fixture', url: '/src/assets/patrimonios/sanatorio_padre_bento.jpg', alt: 'Imagem de demonstração' }] : [],
    documentos: [{ id: 'doc-fixture', titulo: 'Referência documental', tipo: 'LINK', url: 'https://example.invalid/fonte' }],
    ligacoes: i === 0 ? ligacoes : [],
  })),
  ...[
    ['casarao-saraceni', 'Casarão histórico', 'DEMOLIDO'],
    ['festa-de-nossa-senhora-de-bonsucesso', 'Festa de Bonsucesso', 'PRESERVADO'],
    ['antigo-poco-municipal', 'Antigo Poço', 'PRESERVADO'],
  ].map(([slug, nome, situacao], i) => ({ ...itens[1], id: `55555555-5555-4555-8555-55555555555${i}`, slug, nome, situacao, localizacao: loc,
    numeroExibicao: 20 + i, regiao: regionDTO(), ligacoes: [] })),
];
const base = `/admin/patrimonios/${itens[0].id}/ligacoes`;
const initial = { id: "22222222-2222-4222-8222-222222222222", patrimonioDestinoId: itens[2].id, destino: itens[2], texto: "Memória do Tramway.", ordem: 0 };
const createdId = "33333333-3333-4333-8333-333333333333";
let binary;
for (const candidate of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean)) {
  try { await access(candidate); binary = candidate; break; } catch { /* Próximo navegador. */ }
}
if (!binary) throw new Error("Configure CHROME_PATH para Chrome/Edge.");
const profile = await mkdtemp(path.join(os.tmpdir(), "d2b-smoke-"));
await mkdir(output, { recursive: true });
let vite, browser, ws, next = 0;
const pending = new Map(), exceptions = [], resultados = [];
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++next, timer = setTimeout(() => { pending.delete(id); reject(new Error("Timeout: " + method)); }, 15000);
  pending.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
try {
  vite = await createServer({ server: { host: "127.0.0.1", port: 5181, strictPort: true }, logLevel: "error",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origin + "/api"),
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""', "import.meta.env.VITE_USE_MOCK_MAP": '"true"' },
    plugins: [{ name: "d2b-api-simulada", enforce: "pre", configureServer(server) {
      server.middlewares.use("/api", async (req, res) => {
        try {
          const url = new URL(req.url, origin), pathname = url.pathname;
          requests.push({ method: req.method, pathname });
          let raw = ""; for await (const chunk of req) raw += chunk;
          const body = raw ? JSON.parse(raw) : undefined;
          let data;
          if (req.method === "GET") {
            if (pathname === "/categorias") data = [categoria];
            else if (pathname === '/regioes') data = regioes.filter(r => r.ativo).map(({ id, nome, slug }) => ({ id, nome, slug }));
            else if (pathname === '/admin/regioes') data = { itens: regioes.filter(r => (!url.searchParams.has('ativo') || r.ativo === (url.searchParams.get('ativo') === 'true')) && (!url.searchParams.get('busca') || r.nome.includes(url.searchParams.get('busca')))), paginacao: { pagina: 1, totalPaginas: 1 } };
            else if (pathname === "/patrimonios") data = { itens: publicItems(), paginacao: { totalPaginas: 1 } };
            else if (pathname === "/admin/patrimonios") data = { itens: (url.searchParams.has("busca") ? itens : [itens[0]]).map(withRegion), paginacao: { totalPaginas: 1 } };
            else if (pathname === base) data = ligacoes;
            else if (pathname.startsWith('/patrimonios/')) data = publicItems().find(p => pathname === '/patrimonios/' + p.slug);
            else { const p = itens.find(p => pathname === "/admin/patrimonios/" + p.id); data = p && withRegion(p); }
          } else if (pathname.startsWith('/admin/regioes')) {
            regionalWrites.push({ method: req.method, pathname, body });
            if (req.method === 'POST') { data = { id: regionId, ...body }; regioes.push(data); }
            else if (req.method === 'PATCH' && pathname === '/admin/regioes/' + regionId) { assert.ok(!('slug' in body)); data = regioes[0]; Object.assign(data, body); }
          } else if (req.method === 'PATCH' && pathname === '/admin/patrimonios/' + itens[0].id) {
            assert.ok(!('ligacoes' in body)); assert.ok(!('fatos' in body));
            propertyWrites.push(body); Object.assign(itens[0], body); data = withRegion(itens[0]);
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
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*://maps.googleapis.com/*", "*://maps.gstatic.com/*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `if(!sessionStorage.getItem('guarulhos.admin.sessao'))sessionStorage.setItem('guarulhos.admin.sessao', JSON.stringify({token:'simulado',user:{id:'admin-fixture',email:'smoke@example.invalid',name:'Admin Smoke',role:'ADMIN'}}))` });
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
  const fill = async (label, text) => {
    await tabTo(`['INPUT','TEXTAREA'].includes(e.tagName) && e.closest('label')?.textContent.trim()===${JSON.stringify(label)}`);
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await key('Backspace', 'Backspace', 8);
    if (text) await call('Input.insertText', { text });
  };
  const shot = async (name, width, selector) => {
    if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
    await pause(250);
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false, `overflow: ${name}/${width}`);
    const r = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(output, `${name}-${width}.png`), Buffer.from(r.data, 'base64'));
  };
  const openProperty = async () => {
    await call('Page.navigate', { url: origin + '/admin/patrimonios' });
    await waitFor(`!!document.querySelector('button[aria-label="Editar ${nomes[0]}"]')`);
    await button('Editar ' + nomes[0]);
    await waitFor(`!!document.querySelector('.organizacao-editorial select:not(:disabled)')`);
  };
  for (const width of [1440, 390, 320]) {
    ligacoes = [structuredClone(initial)]; writes = []; requests = [];
    regioes = []; regionalWrites = []; propertyWrites = [];
    itens.splice(0, itens.length, ...structuredClone(snapshot));
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    etapa = 'Catálogo vazio';
    await call('Page.navigate', { url: origin + '/admin/regioes' });
    await waitFor(`document.body.innerText.includes('O catálogo pode permanecer vazio.')`);
    await button('Nova região');
    await fill('Nome da região', 'Região de demonstração');
    await fill('Slug', 'regiao-demonstracao');
    await fill('Descrição e referência documental', 'Fixture fictícia de teste. Não é taxonomia oficial.');
    await button('Salvar região');
    await waitFor(`document.querySelectorAll('.admin-regioes-lista > li').length===1`);
    await shot('catalogo', width, '.admin-regioes');
    await openProperty();
    await tabTo(`e.matches('.organizacao-editorial select')`);
    await key('ArrowDown', 'ArrowDown', 40); await key('Tab', 'Tab', 9);
    await fill('Número de exibição', '12');
    await fill('Ordem de exibição', '0');
    await shot('organizacao', width, '.organizacao-editorial');
    await button('Salvar');
    await waitFor(`!document.querySelector('.organizacao-editorial')`);
    assert.equal(itens[0].regiaoId, regionId); assert.equal(itens[0].numeroExibicao, 12); assert.equal(itens[0].ordemExibicao, 0);

    etapa = 'Filtro e número público';
    await call('Page.navigate', { url: origin + '/patrimonios' });
    await waitFor(`document.querySelectorAll('.plaqueta').length===4 && !!document.querySelector('.filtros-editoriais select')`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.plaqueta h3')].map(e=>e.textContent)`), publicItems().slice(0, 4).map(p=>p.nome));
    await tabTo(`e.matches('.filtros-editoriais select')`);
    await key('ArrowDown', 'ArrowDown', 40); await key('Tab', 'Tab', 9);
    await waitFor(`location.search.includes('regiao=regiao-demonstracao')`);
    await fill('Número de exibição', '12');
    await waitFor(`document.querySelectorAll('.plaqueta').length===1`);
    assert.equal(await evaluate(`document.querySelector('.plaqueta h3').textContent`), nomes[0]);
    assert.ok(await evaluate(`document.querySelector('.plaqueta').textContent.includes('Nº 12')`));
    await shot('filtro-publico', width, '.filtros-editoriais');
    await tabTo(`e.matches('.verlink')`); await key('Enter', 'Enter', 13);
    await waitFor(`document.querySelectorAll('.acordeao-gatilho').length===2`);
    assert.equal(await evaluate('location.pathname'), '/patrimonios/' + slugs[0]);
    assert.ok(await evaluate(`document.querySelector('.detalhe-hero').textContent.includes('Nº 12')`));
    assert.ok(await evaluate(`!!document.querySelector('.detalhe-endereco-card') && !!document.querySelector('.detalhe-actions a')`));
    assert.ok(await evaluate(`!!document.querySelector('.detalhe-galeria') && !!document.querySelector('.detalhe-referencias')`));
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.acordeao-gatilho')].map(e=>e.getAttribute('aria-expanded'))`), ['true', 'false']);
    await button('Arquitetura');
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.acordeao-gatilho')].map(e=>e.getAttribute('aria-expanded'))`), ['true', 'true']);
    await shot('detalhe', width, '.detalhe-hero');
    await shot('accordion', width, '.acordeao');
    await tabTo(`e.matches('.patrimonio-relacionado-link')`);
    assert.ok(await evaluate(`document.activeElement.matches(':focus-visible')`));
    await key('Enter', 'Enter', 13);
    await waitFor(`document.querySelector('h1')?.textContent===${JSON.stringify(nomes[2])}`);
    assert.equal(await evaluate('location.pathname'), '/patrimonios/' + slugs[2]);
    for (const [slug, route] of [['casarao-saraceni', true], ['festa-de-nossa-senhora-de-bonsucesso', false], ['antigo-poco-municipal', false]]) {
      etapa = 'C3: ' + slug;
      await call('Page.navigate', { url: origin + '/patrimonios/' + slug });
      await waitFor(`!!document.querySelector('.local-aproximado')`);
      assert.equal(await evaluate(`!!document.querySelector('.detalhe-endereco-card')`), route);
      assert.equal(await evaluate(`!!document.querySelector('.detalhe-actions')`), route);
      if (route) {
        const href = await evaluate(`document.querySelector('.detalhe-actions a').href`);
        assert.equal(new URL(href).searchParams.get('destination'), `${loc.latitude},${loc.longitude}`);
      }
      assert.ok(await evaluate(`document.querySelector('.detalhe-hero').textContent.includes('Região de demonstração')`));
      await shot(slug, width, '.detalhe-hero');
    }
    await call('Page.navigate', { url: origin + '/mapa' });
    await waitFor(`!!document.querySelector('.mapa-layout, .mapa-search')`);
    await shot('mapa', width);

    etapa = 'Região inativa preservada';
    await call('Page.navigate', { url: origin + '/admin/regioes' });
    await waitFor(`document.querySelectorAll('.admin-regioes-lista > li').length===1`);
    await button('Editar região Região de demonstração');
    await tabTo(`e.matches('.admin-regioes input[type=checkbox]')`); await key(' ', 'Space', 32);
    await button('Salvar região');
    await waitFor(`document.querySelector('.admin-regioes-lista').textContent.includes('Inativa')`);
    await openProperty();
    assert.ok(await evaluate(`document.querySelector('.organizacao-editorial select').selectedOptions[0].textContent.includes('inativa')`));
    await fill('Número de exibição', '13'); await button('Salvar');
    await waitFor(`!document.querySelector('.organizacao-editorial')`);
    assert.ok(!('regiaoId' in propertyWrites.at(-1))); assert.equal(itens[0].regiaoId, regionId);
    await openProperty();
    await tabTo(`e.matches('.organizacao-editorial select')`); await key('Home', 'Home', 36); await key('Tab', 'Tab', 9);
    await fill('Número de exibição', ''); await fill('Ordem de exibição', '');
    await button('Salvar'); await waitFor(`!document.querySelector('.organizacao-editorial')`);
    for (const field of ['regiaoId', 'numeroExibicao', 'ordemExibicao']) assert.equal(itens[0][field], null);

    // Regressão D1E completa, na mesma aplicação e por teclado.
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
    const capture = await call("Page.captureScreenshot", { format:"png" });
    await writeFile(path.join(output, `admin-ligacoes-${width}.png`), Buffer.from(capture.data,"base64"));
    await button("Excluir relação com " + nomes[1]);
    assert.equal(writes.length, 3);
    await button("Confirmar exclusão");
    await waitFor("document.querySelectorAll('.admin-ligacoes-lista > li').length===1");
    assert.deepEqual(writes.map(w => w.method), ["POST", "PATCH", "PATCH", "DELETE"]);
    assert.equal(ligacoes[0].id, initial.id); assert.equal(itens.length, 3);
    await evaluate(`sessionStorage.setItem('guarulhos.admin.sessao',JSON.stringify({token:'simulado',user:{id:'editor-fixture',name:'Editor Smoke',email:'editor@example.invalid',role:'EDITOR'}}))`);
    await call('Page.navigate', { url: origin + '/admin/patrimonios' });
    await waitFor(`!!document.querySelector('.admin-sidebar')`);
    assert.equal(await evaluate(`!!document.querySelector('a[href="/admin/regioes"]')`), false);
    await shot('editor', width, '.admin-content');
    await evaluate(`sessionStorage.removeItem('guarulhos.admin.sessao')`);
    resultados.push({ width, resultado:"PASS", teclado:true, foco:true, D2:true, C3:true, D1D:true, D1E:true, accordion:true, mapa:true, editorSemGestao:true, UUIDPreservado:true, overflow:false, writes, regionalWrites, propertyWrites });
  }
  assert.equal(exceptions.length,0);
  await writeFile(path.join(output,'resultado.json'),JSON.stringify({resultados,api:'simulada',banco:'não acessado',exceptions:0},null,2));
  console.log(JSON.stringify({resultado:'PASS',widths:resultados.map(r=>r.width),screenshots:output,banco:'não acessado'}));
} catch(error) { console.error(error.message); process.exitCode=1; }
finally {
  if (ws?.readyState===WebSocket.OPEN) { try { await send('Browser.close'); } catch { /* Já fechado. */ } ws.close(); }
  browser?.kill(); await vite?.close();
}
