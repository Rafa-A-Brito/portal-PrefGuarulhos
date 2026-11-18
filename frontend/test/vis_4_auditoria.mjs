// Auditoria somente leitura: sessão e respostas sintéticas, sem backend/.env.
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { abrirBrowser, pausa } from "./fixtures/browser_feedback.mjs";
import { dashboardFixture } from "./fixtures/dashboard.js";
import { eventosAuditoria, listaAuditoriaFixture } from "./fixtures/auditoria.js";
import { listaFeedback, resumoFeedback } from "./fixtures/feedback_admin.js";

const pasta = path.resolve("../.cache/vis_4_auditoria"), origem = "http://127.0.0.1:5199";
const pessoas = [{ id: "pessoa-1", nome: "Responsável de ensaio", email: "responsavel@example.test", role: "ADMIN", ativo: true },
  { id: "pessoa-2", nome: "Pessoa afetada de ensaio", email: "pessoa.afetada@example.test", role: "EDITOR", ativo: false }];
const regioes = [{ id: "regiao-1", nome: "São João / Bonsucesso", slug: "sao-joao-bonsucesso", descricao: "Referência documental de ensaio.", ativo: true },
  { id: "regiao-2", nome: "Centro", slug: "centro", descricao: "", ativo: false }];
const paginas = { regioes: "/admin/regioes", historico: "/admin/auditoria", usuarios: "/admin/usuarios", dashboard: "/admin", feedback: "/admin/feedback", contato: "/contato" };
const resultados = [], requisicoes = [];
const somenteGraficos = process.argv.includes("--graficos");
const somenteFeedback = process.argv.includes("--feedback");
let servidor, browser;
await mkdir(pasta, { recursive: true });
try {
  servidor = await createServer({ configFile: false, envDir: false, logLevel: "error", cacheDir: path.join(pasta, "vite"),
    server: { host: "127.0.0.1", port: 5199, strictPort: true },
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origem + "/api"),
      "import.meta.env.VITE_FEEDBACK_ATIVO": '"true"', "import.meta.env.VITE_METRICAS_ATIVAS": '"false"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    plugins: [react(), { name: "vis-4-leitura", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        const url = new URL(req.url, origem), rota = url.pathname, q = Object.fromEntries(url.searchParams);
        requisicoes.push({ method: req.method, path: rota });
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") { res.statusCode = 405; res.end("{}"); return; }
        let data;
        const lista = itens => ({ itens, paginacao: { pagina: 1, total: itens.length, limite: 20, totalPaginas: 1 } });
        if (rota === "/admins") data = lista(pessoas);
        else if (rota.startsWith("/admins/")) data = pessoas.find(p => rota.endsWith(p.id));
        else if (rota === "/admin/regioes") data = lista(regioes);
        else if (rota === "/admin/auditoria") data = listaAuditoriaFixture();
        else if (rota.startsWith("/admin/auditoria/")) data = eventosAuditoria.find(e => rota.endsWith(e.id));
        else if (rota === "/admin/dashboard") data = dashboardFixture();
        else if (rota === "/admin/feedback/resumo") data = resumoFeedback(q);
        else if (rota === "/admin/feedback") data = listaFeedback({ ...q, pagina: Number(q.pagina), limite: Number(q.limite) });
        else if (rota.startsWith("/admin/feedback/")) data = { disponivel: true, registro: { id: rota.split("/").at(-1), tipo: "ELOGIO", createdAt: "2026-11-17T15:00:00Z", expiraEm: "2026-12-17T15:00:00Z", avisoVersao: "ensaio", mensagem: "Comentário de ensaio, sem envio real." } };
        else if (rota === "/patrimonios") data = lista([]);
        else if (["/regioes", "/categorias"].includes(rota)) data = [];
        if (!data) { res.statusCode = 404; res.end("{}"); return; }
        res.end(JSON.stringify({ success: true, data }));
      });
    } }],
  });
  await servidor.listen(); browser = await abrirBrowser(pasta);
  const { call, avaliar, navegar, largura, esperar, tecla, captura } = browser;
  await call("Network.setBlockedURLs", { urls: ["https://*", "http://localhost/*", "http://127.0.0.1:3333/*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem('guarulhos.admin.sessao',JSON.stringify({token:'fixture',refreshToken:'fixture',sessionId:'fixture',sessionExpiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'pessoa-1',email:'responsavel@example.test',name:'Responsável de ensaio',role:'ADMIN'}}))` });
  async function registrar(nome, width, modal = false) {
    if (!modal) await avaliar("window.scrollTo({top:0,behavior:'instant'})");
    await pausa(400);
    const dados = await avaliar(`(() => {
      const rgb = s => s.match(/[\\d.]+/g)?.map(Number);
      const lum = c => c.slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
      const estilos = [...document.querySelectorAll('.admin-content button,.admin-content input,.admin-content select,.admin-content textarea,.admin-sidebar a.active')].slice(0,40).map(e=>{
        const c=getComputedStyle(e), f=rgb(c.color), b=rgb(c.backgroundColor), a=f&&lum(f), z=b&&lum(b);
        return {texto:e.textContent.trim().slice(0,60)||e.closest('label')?.textContent.trim(),altura:e.getBoundingClientRect().height,borda:c.borderRadius,cor:c.color,fundo:c.backgroundColor,
          contraste:b&&(b[3]??1)===1?(Math.max(a,z)+.05)/(Math.min(a,z)+.05):null};
      });
      const alvos=[...document.querySelectorAll('input,select,textarea,fieldset,form,table,.admin-content,.contato-pop')].filter(e=>{
        const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1;
      }).map(e=>({tag:e.tagName,classe:e.className,direita:e.getBoundingClientRect().right}));
      const graficos=[...document.querySelectorAll('.recharts-wrapper')].map(e=>({largura:e.getBoundingClientRect().width,altura:e.getBoundingClientRect().height, caminhos:e.querySelectorAll('path').length, estrutura:e.innerHTML.slice(0,700),
        textosFora:[...e.querySelectorAll('text')].filter(t=>{const r=t.getBoundingClientRect(),p=e.getBoundingClientRect();return r.left<p.left-1||r.right>p.right+1||r.top<p.top-1||r.bottom>p.bottom+1;}).map(t=>t.textContent)}));
      return {overflow:document.documentElement.scrollWidth>innerWidth,larguraDocumento:document.documentElement.scrollWidth,alvos,estilos,graficos,
        foco:document.activeElement?.outerHTML.slice(0,400),dialogos:document.querySelectorAll('dialog,[role=dialog]').length};
    })()`);
    await captura(nome, modal); resultados.push({nome, largura:width,...dados});
  }
  for (const width of [320,390,768,1440]) {
    await largura(width);
    for (const [nome, rota] of Object.entries(paginas)) {
      if (somenteGraficos && nome !== "dashboard") continue;
      if (somenteFeedback && nome !== "feedback") continue;
      await navegar(origem + rota);
      if (nome === "regioes") await esperar("document.querySelector('.admin-regioes-lista li')");
      if (nome === "usuarios") await esperar("document.querySelector('.admin-usuarios-tabela tbody tr')");
      if (nome === "historico") await esperar("document.querySelector('[aria-label^=\"Detalhes da alteração\"]')");
      if (nome === "dashboard") await esperar("document.querySelectorAll('.recharts-wrapper').length === 4");
      if (nome === "feedback") await esperar("document.querySelector('[aria-label^=\"Detalhes de\"]')");
      if (nome === "contato") await esperar("document.querySelector('textarea')");
      if (nome === "dashboard") {
        for (let i = 0; i < 4; i++) {
          await avaliar(`document.querySelectorAll('.recharts-wrapper')[${i}].scrollIntoView()`);
          await pausa(650);
        }
      }
      await pausa(650); await registrar(`${nome}_${width}`, width);
      if (["regioes","usuarios"].includes(nome)) {
        const sel = nome === "regioes" ? '[aria-label^="Editar região"]' : '[aria-label^="Editar Pessoa"]';
        await avaliar(`document.querySelector(${JSON.stringify(sel)}).focus()`); await tecla("Enter","Enter",13);
        await esperar(nome === "regioes" ? "document.querySelector('.admin-regioes-campos')" : "document.querySelector('.admin-usuarios-campos')");
        await registrar(`${nome}_formulario_${width}`,width);
      }
      if (["historico","feedback"].includes(nome)) {
        const sel = nome === "historico" ? '[aria-label^="Detalhes da alteração"]' : '[aria-label^="Detalhes de"]';
        await avaliar(`document.querySelector(${JSON.stringify(sel)}).focus()`); await tecla("Enter","Enter",13);
        await esperar("document.querySelector('dialog') && !document.querySelector('dialog [role=status]')");
        if (nome === "feedback") await esperar("document.querySelector('[aria-label=\"Comentário completo\"]')");
        await registrar(`${nome}_modal_${width}`,width,true);
        await tecla("Escape","Escape",27);
      }
      if (nome === "contato") {
        await avaliar("document.querySelector('.contato-fab').focus()"); await tecla("Enter","Enter",13);
        await esperar("document.querySelector('.contato-pop')"); await registrar(`contato_info_${width}`,width,true);
        await tecla("Escape","Escape",27);
      }
    }
  }
  assert.ok(requisicoes.every(r=>r.method === "GET"), "Nenhuma gravação permitida no ensaio");
  assert.deepEqual(browser.erros, []);
  await writeFile(path.join(pasta,somenteGraficos ? "graficos.json" : somenteFeedback ? "feedback.json" : "resultado.json"), JSON.stringify({resultados,requisicoes,erros:browser.erros,dados:"Somente fixtures e sessão sintética; não homologa autenticação ou persistência"},null,2));
  console.log(JSON.stringify({capturas:resultados.length,overflow:resultados.filter(r=>r.overflow).map(r=>r.nome),somenteGet:true}));
} finally { await browser?.fechar(); await servidor?.close(); }
