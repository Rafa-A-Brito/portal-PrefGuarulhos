// Opt-in: somente respostas locais de ensaio, sem backend ou .env.
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { abrirBrowser, pausa } from "./fixtures/browser_feedback.mjs";

const pasta = path.resolve("../.cache/vis_3");
const origem = "http://127.0.0.1:5198";
const estados = [
  ["DEMOLIDO", "TEMPORARIAMENTE_FECHADO"],
  ["NECESSITA_RESTAURACAO", "SEM_VISITACAO_PUBLICA"],
  ["EM_RUINAS", "ACESSO_PARCIAL"],
  ["EM_RESTAURACAO", "ABERTO"],
  ["DEMOLIDO", "NAO_INFORMADO"],
];
const itens = estados.map(([situacao, statusVisitacao], i) => ({
  id: `vis-${i}`, slug: `vis-${i}`, nome: `Patrimônio de ensaio ${i + 1}`,
  categoria: { slug: "historico", nome: "Histórico" }, situacao, statusVisitacao,
  descricaoResumida: "Registro de ensaio para verificar conservação e visitação independentes.",
  descricao: "Fotografia preservada como referência do acervo histórico.",
  motivoRestricao: "MotivoExtensoSemEspacos".repeat(8), previsaoReabertura: "2027-03-15",
  imagens: [{ url: "/uploads/casa_da_candinha.jpg" }],
  localizacao: { bairro: "Bonsucesso", latitude: -23.45, longitude: -46.53 },
}));
let servidor, browser;
const resultados = [], requisicoes = [];
await mkdir(pasta, { recursive: true });
try {
  servidor = await createServer({ configFile: false, envDir: false, logLevel: "error", cacheDir: path.join(pasta, "vite"),
    server: { host: "127.0.0.1", port: 5198, strictPort: true },
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origem + "/api"),
      "import.meta.env.VITE_FEEDBACK_ATIVO": '"false"', "import.meta.env.VITE_METRICAS_ATIVAS": '"false"',
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    plugins: [react(), { name: "vis-3-local", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        const rota = new URL(req.url, origem).pathname;
        requisicoes.push({ method: req.method, path: rota });
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") { res.statusCode = 405; res.end("{}"); return; }
        let data;
        if (rota === "/patrimonios") data = { itens, paginacao: { totalPaginas: 1 } };
        else if (rota.startsWith("/patrimonios/")) data = itens.find(item => rota.endsWith("/" + item.slug));
        else if (["/regioes", "/categorias"].includes(rota)) data = [];
        if (!data) { res.statusCode = 404; res.end("{}"); return; }
        res.end(JSON.stringify({ success: true, data }));
      });
    } }],
  });
  await servidor.listen(); browser = await abrirBrowser(pasta);
  const { call, avaliar, largura, navegar, esperar, captura, tecla } = browser;
  await call("Network.setBlockedURLs", { urls: ["https://*", "http://localhost/*", "http://127.0.0.1:3333/*"] });
  const telas = { inicio: "/", patrimonios: "/patrimonios", detalhe: "/patrimonios/vis-0", mapa: "/mapa" };
  for (const width of [320, 390, 768, 1440]) {
    for (const [tela, rota] of Object.entries(telas)) {
      await largura(width); await navegar(origem + rota);
      await esperar("document.querySelector('.situacao-selo')");
      // Carrega também imagens fora da área visível antes da captura integral.
      await avaliar("[...document.images].forEach(i => { i.loading = 'eager'; })");
      await esperar("[...document.images].every(i => i.complete)"); await pausa(650);
      if (tela === "mapa") {
        await avaliar("document.querySelector('.mapa-sidebar-item').focus()");
        await tecla("Enter", "Enter", 13); await esperar("document.querySelector('.mapa-detail-panel')");
      }
      await avaliar("window.scrollTo({top:0,behavior:'instant'})");
      await pausa(650); // Painel animado e cabeçalho fixo estabilizados para a captura.
      const dados = await avaliar(`(() => {
        const rect = e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
        const colide = (a,b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
        const caixas = [...document.querySelectorAll('.hero-float-card,.destaque-card,.plaqueta,.detalhe-hero-info,.mapa-sidebar-item,.mockup-pin-card,.mapa-detail-panel')];
        const sobreposicoes = caixas.flatMap(c => {
          const selos = [...c.querySelectorAll('.situacao-selo,.visitacao-selo,.visitacao-aviso')];
          const botoes = [...c.querySelectorAll('.favorito-btn,.mapa-detail-close')];
          return selos.flatMap((s,i) => [...selos.slice(i+1),...botoes].filter(b=>colide(rect(s),rect(b))).map(()=>c.className));
        });
        const rgb = valor => valor.match(/[\\d.]+/g).map(Number);
        const luminancia = cor => cor.slice(0,3).map(n => n/255).map(n=> n<=0.04045 ? n/12.92 : ((n+0.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[0.2126,0.7152,0.0722][i],0);
        const fundo = e => {
          if (!e) return [255,255,255]; // Pior caso claro sob a camada escura da Home.
          const cor=rgb(getComputedStyle(e).backgroundColor), alpha=cor[3] ?? 1;
          if (alpha === 1) return cor;
          const pai=fundo(e.parentElement); return cor.slice(0,3).map((n,i)=>n*alpha+pai[i]*(1-alpha));
        };
        const cores = [...document.querySelectorAll('.situacao-selo,.visitacao-selo,.visitacao-aviso')].map(s => {
          const css=getComputedStyle(s), a=luminancia(rgb(css.color)), b=luminancia(fundo(s));
          return {texto:s.textContent,color:css.color,background:css.backgroundColor,contraste:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
        });
        const opacidade = [...document.querySelectorAll('.plaqueta figure img,.destaque-card figure img,.mapa-detail-img')].map(i=>getComputedStyle(i).opacity);
        const botao = document.querySelector('.plaque-grid .favorito-btn');
        const oclusoesMapa = [...document.querySelectorAll('.mockup-pin-card')].flatMap(c =>
          [...document.querySelectorAll('.mapa-legenda,.mapa-detail-panel')].filter(e=>colide(rect(c),rect(e))).map(e=>e.className));
        return {overflow:document.documentElement.scrollWidth>innerWidth, sobreposicoes, cores, opacidade,
          oclusoesMapa,
          demolidos:[...document.querySelectorAll('.situacao-selo')].filter(e=>e.textContent==='Demolido').length,
          favorito:botao ? {alvo:rect(botao).width,circulo:getComputedStyle(botao,'::before').width,icone:getComputedStyle(botao.querySelector('svg')).width} : null};
      })()`);
      assert.equal(dados.overflow, false, `Overflow ${tela}/${width}`);
      assert.deepEqual(dados.sobreposicoes, [], `Selos sobrepostos ${tela}/${width}`);
      assert.deepEqual(dados.oclusoesMapa, [], `Cards do mapa encobertos ${tela}/${width}`);
      assert.ok(dados.demolidos > 0, `Demolidos visíveis ${tela}`);
      assert.ok(dados.opacidade.every(o => o === "1"));
      assert.ok(dados.cores.every(c => c.contraste >= 4.5), `Contraste textual ${tela}/${width}`);
      if (dados.favorito) { assert.equal(dados.favorito.circulo, "30px"); assert.equal(dados.favorito.icone, "14px"); }
      if (tela === "patrimonios") {
        assert.equal(await avaliar("document.querySelectorAll('.plaqueta').length"), 4);
        assert.match(await avaliar("document.querySelector('.section-head h2').textContent"), /5 bens encontrados/);
      }
      const nome = `${tela}_${width}`; await captura(nome);
      resultados.push({ tela, largura: width, ...dados, captura: nome + ".png" });
      if (tela === "patrimonios") {
        await avaliar("document.querySelector('[aria-label=\"Próxima página\"]').click()");
        await esperar("document.querySelectorAll('.plaqueta').length === 1"); await pausa(650);
        assert.equal(await avaliar("document.querySelector('.plaqueta .situacao-selo')?.textContent"), "Demolido");
        assert.equal(await avaliar("document.querySelector('.plaqueta .visitacao-selo')"), null);
        await captura(`patrimonios_pagina_2_${width}`);
      }
    }
  }
  // Todos os estados de visitação no detalhe: dados ausentes/aberto não viram restrição.
  for (let i = 0; i < itens.length; i++) {
    await largura(320); await navegar(origem + "/patrimonios/vis-" + i);
    await esperar(`document.querySelector('.detalhe-hero-info h1')?.textContent === '${itens[i].nome}'`);
    await avaliar("window.scrollTo({top:0,behavior:'instant'})");
    await pausa(650);
    assert.equal(await avaliar("Boolean(document.querySelector('.visitacao-aviso'))"), i < 3);
    if (i < 3) assert.equal(await avaliar("document.querySelector('.visitacao-aviso time')?.textContent"), "15/03/2027");
    await captura(`detalhe_visitacao_${itens[i].statusVisitacao}_320`);
  }
  await navegar(origem + "/mapa"); await esperar("document.querySelector('.mockup-pin-card')");
  await avaliar("document.querySelector('.mockup-pin-card').focus()");
  await tecla("Tab", "Tab", 9, 8); await tecla("Tab", "Tab", 9);
  assert.equal(await avaliar("document.activeElement.matches('.mockup-pin-card:focus-visible')"), true);
  await captura("mapa_foco_320", true); await tecla("Enter", "Enter", 13);
  await esperar("document.querySelector('.mapa-detail-panel')");
  assert.deepEqual(browser.erros, []); assert.ok(requisicoes.every(r => r.method === "GET"));
  await writeFile(path.join(pasta, "resultado.json"), JSON.stringify({ resultados, erros: browser.erros, requisicoes, dados: "Somente fixtures de ensaio; sem API real ou Google Maps" }, null, 2));
  console.log(JSON.stringify({ cenarios: resultados.length, detalhes: 5, teclado: true, erros: browser.erros }));
} finally { await browser?.fechar(); await servidor?.close(); }
