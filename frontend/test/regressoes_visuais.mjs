// Opt-in: app real com respostas HTTP sintéticas; sem backend, banco ou .env.
// De frontend: node test/regressoes_visuais.mjs [antes] [--pasta=caminho]
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { abrirBrowser, pausa } from "./fixtures/browser_feedback.mjs";

const antes = process.argv.includes("antes");
const destino = process.argv.find(arg => arg.startsWith("--pasta="))?.slice(8) ?? "../.cache/home_branca";
const pasta = path.resolve(destino, antes ? "antes" : "depois");
const origem = "http://127.0.0.1:5197";
const fotos = ["casa_da_candinha.jpg", "casa_amarela.jpg", "casarao_nossa_historia.jpg", "escola_crispiniano.jpg", "sanatorio_padre_bento.jpg"];
const base = {
  id: "ensaio-casa", slug: "ensaio-casa", nome: "Casa da Candinha", categoria: { slug: "historico", nome: "Histórico" },
  descricaoResumida: "Registro de ensaio visual para conferir a apresentação do acervo, suas imagens e as informações de conservação e visitação.",
  situacao: "EM_RESTAURACAO", statusVisitacao: "ACESSO_PARCIAL",
  localizacao: { bairro: "Bonsucesso" }, imagens: fotos.map(url => ({ url: "/uploads/" + url })),
};
let modo = "normal", servidor, browser;
const requisicoes = [], resultados = [];
const avisosImagem = [];
await mkdir(pasta, { recursive: true });
try {
  servidor = await createServer({ configFile: false, envDir: false, logLevel: "error", cacheDir: path.join(pasta, "vite"),
    server: { host: "127.0.0.1", port: 5197, strictPort: true },
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origem + "/api"),
      "import.meta.env.VITE_FEEDBACK_ATIVO": '"false"', "import.meta.env.VITE_METRICAS_ATIVAS": '"false"',
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    plugins: [react(), { name: "ensaio-visual-local", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        const rota = new URL(req.url, origem).pathname;
        requisicoes.push({ method: req.method, path: rota });
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") { res.statusCode = 405; res.end("{}"); return; }
        let data;
        if (rota === "/patrimonios") {
          let primeiro = modo === "longo" ? { ...base,
            nome: "NomeExtensoSemEspacos".repeat(12), localizacao: { bairro: "LocalizaçãoExtensa".repeat(15) },
            descricaoResumida: "Descrição extensa de ensaio. ".repeat(50), situacao: "DEMOLIDO",
            statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Motivo extenso de ensaio. ".repeat(70),
            previsaoReabertura: "2027-03-15",
          } : base;
          if (modo === "referencia") primeiro = { ...base, nome: "Antigo hospital municipal",
            localizacao: { bairro: "Centro, Guarulhos" }, descricaoResumida: "Um marco da história e da saúde pública da cidade.",
            situacao: "PRESERVADO", statusVisitacao: "NAO_INFORMADO",
            imagens: [...base.imagens, ...["capela_bonsucesso.png", "festa_bonsucesso.jpg", "bosque_maia.jpg"].map(url => ({ url: "/uploads/" + url }))] };
          if (modo === "sem_imagem") primeiro = { ...base, imagens: [{ url: "" }, { url: null }, { url: "   " }] };
          if (modo === "quebrada") primeiro = { ...base, imagens: [{ url: "/foto-inexistente-ensaio.jpg" }] };
          data = { itens: [primeiro, { ...base, id: "ensaio-2", slug: "ensaio-2", nome: "Casa Amarela", statusVisitacao: "SEM_VISITACAO_PUBLICA", imagens: [base.imagens[1]] },
            { ...base, id: "ensaio-3", slug: "ensaio-3", nome: "Registro histórico", statusVisitacao: "NAO_INFORMADO", situacao: "DEMOLIDO", imagens: [] }], paginacao: { totalPaginas: 1 } };
        } else if (["/regioes", "/categorias"].includes(rota)) data = [];
        else { res.statusCode = 404; res.end("{}"); return; }
        res.end(JSON.stringify({ success: true, data }));
      });
    } }],
  });
  await servidor.listen(); browser = await abrirBrowser(pasta, undefined, mensagem => {
    if (mensagem.method !== "Runtime.consoleAPICalled") return;
    const texto = mensagem.params.args.map(arg => arg.value ?? arg.description ?? "").join(" ");
    if (/empty string|src attribute/i.test(texto)) avisosImagem.push(texto);
  });
  const { avaliar, call, largura, navegar, esperar, captura, tecla } = browser;
  await call("Network.setBlockedURLs", { urls: ["https://*", "http://localhost/*", "http://127.0.0.1:3333/*"] });
  async function abrir(tela, width, zoom = 1) {
    // Reflow equivalente a zoom de página: metade do viewport CSS e escala 2.
    // CSS zoom isolado não atualiza media queries como o zoom do navegador.
    await largura(width / zoom);
    if (zoom === 2) await call("Emulation.setDeviceMetricsOverride", { width: width / zoom, height: 500, deviceScaleFactor: 2, mobile: false });
    await navegar(origem + (tela === "inicio" ? "/" : "/patrimonios"));
    await esperar(tela === "inicio" ? "document.querySelector('.hfc-head h3')?.textContent !== 'Conheça o patrimônio de Guarulhos'" : "document.querySelector('.plaqueta')");
    await avaliar("[...document.images].forEach(i => { i.loading = 'eager'; })");
    await esperar("[...document.querySelectorAll('img')].every(i => i.complete)");
    await pausa(650); // Finaliza as animações de entrada antes de medir geometria.
  }
  async function medir(tela, width, zoom = 1, sufixo = "") {
    const dados = await avaliar(`(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
      const resultado = { overflow: document.documentElement.scrollWidth > innerWidth,
        imagensVazias: [...document.images].filter(img => !img.getAttribute('src')?.trim()).length };
      if ('${tela}' === 'inicio') {
        const card = document.querySelector('.hero-float-card'), banner = document.querySelector('.hero'), miolo = document.querySelector('.hero-inner');
        const link = card.querySelector('.hfc-next');
        const areaLink = getComputedStyle(link, '::after');
        return {...resultado, card:rect(card), banner:rect(banner), miolo:rect(miolo), fundo:getComputedStyle(card).backgroundColor,
          link:rect(link), corSeta:getComputedStyle(link.querySelector('svg')).color, corLink:getComputedStyle(link).color,
          titulo:card.querySelector('h3').textContent,destino:link.getAttribute('href'),
          alvoLink:{width:parseFloat(areaLink.width),height:parseFloat(areaLink.height)},
          miniatura:card.querySelector('.hfc-thumbs img')?.getAttribute('src'),
          imagens:card.querySelectorAll('.hfc-thumbs img').length, extra:card.querySelector('.hfc-extra [aria-hidden]')?.textContent};
      }
      const botao = document.querySelector('.plaqueta .favorito-btn'), svg = botao.querySelector('svg');
      const selo = document.querySelector('.plaqueta .visitacao-selo');
      const a=rect(botao), b=rect(selo), css=getComputedStyle(botao), circulo=getComputedStyle(botao,'::before');
      return {...resultado, botao:a, icone:rect(svg), iconeCss:getComputedStyle(svg).width, larguraCss:css.width, alturaCss:css.height,
        circulo:circulo.width, fundo:css.backgroundColor, sobreposicao: a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y};
    })()`);
    if (!antes) {
      assert.equal(dados.overflow, false, `Overflow ${tela}/${width}/${zoom}`);
      assert.equal(dados.imagensVazias, 0, "Nenhuma img recebe src vazio ou ausente");
      if (tela === "inicio") {
        assert.ok(dados.card.x >= dados.banner.x && dados.card.right <= dados.banner.right + 1);
        assert.ok(dados.card.y >= dados.banner.y && dados.card.bottom <= dados.banner.bottom + 1);
        assert.ok(dados.card.width <= 264 + 1);
        assert.ok(dados.card.height <= 380 * zoom, "Card limitado mesmo com textos extensos");
        assert.equal(dados.fundo, "rgba(255, 255, 255, 0.64)");
        assert.ok(Math.abs(dados.card.right - dados.miolo.right) < 1, "Card alinhado à direita do conteúdo");
        assert.ok(dados.alvoLink.width >= 44 && dados.alvoLink.height >= 44, "Link mantém alvo acessível");
        assert.equal(dados.corSeta, dados.corLink, "Seta herda o contraste do link");
        assert.equal(dados.extra, "+5");
        assert.equal(dados.imagens, 3);
        assert.equal(dados.titulo, "Antigo hospital municipal");
        assert.equal(dados.destino, "/patrimonios");
      } else {
        assert.equal(dados.larguraCss, "44px"); assert.equal(dados.alturaCss, "44px");
        assert.equal(dados.circulo, "30px"); assert.equal(dados.iconeCss, "14px");
        assert.ok(Math.abs(dados.icone.width - 14) < 0.1);
        assert.equal(dados.sobreposicao, false, "Favorito não cobre visitação");
      }
    }
    const nome = `${tela}_${width}${zoom === 2 ? "_zoom_200" : ""}${sufixo}`;
    await captura(nome); resultados.push({ tela, largura: width, zoom, modo, ...dados, captura: nome + ".png" });
    if (tela === "inicio" && modo === "referencia" && width === 1440) {
      const clip = await avaliar("(() => { const r=document.querySelector('.hero-float-card').getBoundingClientRect(); return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()");
      const shot = await call("Page.captureScreenshot", {format:"png",captureBeyondViewport:true,clip});
      await writeFile(path.join(pasta,"card_referencia.png"),Buffer.from(shot.data,"base64"));
    }
  }
  for (const width of [320, 390, 768, 1440]) {
    for (const tela of ["inicio", "patrimonios"]) {
      await abrir(tela, width); await medir(tela, width);
        if (!antes && width === 1440) { await abrir(tela, width, 2); await medir(tela, width, 2); }
    }
  }
  if (!antes) {
    for (modo of ["referencia", "sem_imagem", "quebrada"]) {
      for (const width of [320,390,768,1440]) {
        await abrir("inicio",width); await medir("inicio",width,1,`_${modo}`);
      }
    }
    modo = "longo";
    for (const width of [320, 390, 768, 1440]) {
      await abrir("inicio", width); await medir("inicio", width, 1, "_textos_longos");
    }
    modo = "normal";
    for (const tela of ["inicio", "patrimonios"]) {
      await abrir(tela, 390);
      const seletor = tela === "inicio" ? ".hfc-next" : ".plaqueta .favorito-btn";
      await avaliar(`document.querySelector('${seletor}').focus()`);
      await tecla("Tab", "Tab", 9, 8); await tecla("Tab", "Tab", 9);
      assert.equal(await avaliar(`document.activeElement === document.querySelector('${seletor}')`), true);
      assert.equal(await avaliar(`document.querySelector('${seletor}').matches(':focus-visible')`), true);
      assert.notEqual(await avaliar(`getComputedStyle(document.querySelector('${seletor}')).outlineStyle`), "none");
      await captura(tela + "_foco_390");
      if (tela === "inicio") {
        const ponto = await avaliar("(() => { const e=document.querySelector('.hfc-next'); e.scrollIntoView({block:'center',behavior:'instant'}); const r=e.getBoundingClientRect(); return {x:r.x-5,y:r.y+r.height/2}; })()");
        assert.equal(await avaliar(`document.elementFromPoint(${ponto.x},${ponto.y}) === document.querySelector('.hfc-next')`),true,"Área extra do link recebe interação");
      }
      if (tela === "patrimonios") {
        const url = await avaliar("location.href"), anterior = await avaliar(`document.querySelector('${seletor}').getAttribute('aria-pressed')`);
        await tecla("Enter", "Enter", 13);
        assert.notEqual(await avaliar(`document.querySelector('${seletor}').getAttribute('aria-pressed')`), anterior);
        assert.equal(await avaliar("location.href"), url);
        await captura("patrimonios_favoritado_390");
        await tecla(" ", "Space", 32);
        assert.equal(await avaliar(`document.querySelector('${seletor}').getAttribute('aria-pressed')`), anterior);
        // Na lateral do alvo, fora do círculo visual de 30px.
        const { x, y } = await avaliar(`(() => { const r=document.querySelector('${seletor}').getBoundingClientRect(); return {x:r.x+2,y:r.y+r.height/2}; })()`);
        await call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await pausa(200); // Aguarda a transição de cor já existente no botão.
        assert.equal(await avaliar(`document.elementFromPoint(${x},${y}) === document.querySelector('${seletor}')`), true);
        assert.equal(await avaliar(`getComputedStyle(document.querySelector('${seletor}')).color`), "rgb(192, 38, 74)");
        await captura("patrimonios_hover_390");
        // Captura de página inteira pode alterar o scroll: recalcula o ponto.
        await avaliar(`document.querySelector('${seletor}').scrollIntoView({block:'center',behavior:'instant'})`);
        await pausa(100);
        const ponto = await avaliar(`(() => { const r=document.querySelector('${seletor}').getBoundingClientRect(); return {x:r.x+2,y:r.y+r.height/2}; })()`);
        assert.equal(await avaliar(`document.elementFromPoint(${ponto.x},${ponto.y}) === document.querySelector('${seletor}')`), true);
        await call("Input.dispatchMouseEvent", { type: "mousePressed", ...ponto, button: "left", clickCount: 1 });
        await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...ponto, button: "left", clickCount: 1 });
        await esperar(`document.querySelector('${seletor}').getAttribute('aria-pressed') !== '${anterior}'`);
        assert.notEqual(await avaliar(`document.querySelector('${seletor}').getAttribute('aria-pressed')`), anterior);
        assert.equal(await avaliar("location.href"), url);
      }
    }
  }
  assert.deepEqual(browser.erros, []); assert.ok(requisicoes.every(r => r.method === "GET"));
  if (!antes) assert.deepEqual(avisosImagem, [], "Aviso React de src vazio eliminado");
  await writeFile(path.join(pasta, "resultado.json"), JSON.stringify({ resultados, erros: browser.erros, avisosImagem, requisicoes, dados: "fixtures de ensaio; aplicação continua consumindo o acervo" }, null, 2));
  console.log(JSON.stringify({ cenarios: resultados.length, erros: browser.erros, somenteGet: true }));
} finally { await browser?.fechar(); await servidor?.close(); }
