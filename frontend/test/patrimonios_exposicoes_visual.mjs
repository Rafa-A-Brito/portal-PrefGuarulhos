// Regressão opt-in: executar de frontend com Chromium local. Sem backend ou escrita.
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

const zoom = false;
const pasta = path.resolve("../.cache/vis_5b_5", (process.argv.includes('--antes') ? 'antes' : 'depois')+(zoom?'_zoom':'')), origem = "http://127.0.0.1:5226";
const pessoas = [{ id: "pessoa-1", nome: "Responsável de ensaio", email: "responsavel@example.test", role: "ADMIN", ativo: true },
  { id: "pessoa-2", nome: "Pessoa afetada de ensaio", email: "pessoa.afetada@example.test", role: "EDITOR", ativo: false }];
const regioes = [{ id: "regiao-1", nome: "São João / Bonsucesso", slug: "sao-joao-bonsucesso", descricao: "Referência documental de ensaio.", ativo: true },
  { id: "regiao-2", nome: "Centro", slug: "centro", descricao: "", ativo: false }];
const paginas = { regioes: "/admin/regioes", historico: "/admin/auditoria", usuarios: "/admin/usuarios", dashboard: "/admin", feedback: "/admin/feedback", contato: "/contato" };
const resultados = [], requisicoes = [];


let servidor, browser; let falha = "normal";
const itens=Array.from({length:5},(_,i)=>({id:'a0000000-0000-4000-8000-00000000000'+i,slug:'ensaio-'+i,nome:'Patrimônio de ensaio '+(i+1),status:'RASCUNHO',categoria:{slug:'historico',nome:'Histórico'},situacao:i===0?'DEMOLIDO':'EM_RESTAURACAO',statusVisitacao:i===0?'TEMPORARIAMENTE_FECHADO':'ACESSO_PARCIAL',descricaoResumida:'Descrição do acervo para auditoria de acessibilidade.',descricao:'História e memória da cidade.',motivoRestricao:'Restrição de ensaio, sem informação sobre acesso real.',previsaoReabertura:'2027-03-15',imagens:i===1?[]:[{url:'/uploads/casa_da_candinha.jpg'},{url:'/imagem-inexistente.jpg'}],localizacao:{bairro:'Centro',latitude:-23.45,longitude:-46.53},detalhes:[{titulo:'História',texto:'Memória cultural de Guarulhos.',icone:'historia'}]}));
const noticias=[{id:'noticia-1',slug:'noticia-1',tipo:'NOTICIA',titulo:'Notícia de ensaio',resumo:'Informações culturais de ensaio.',texto:'Texto completo para leitura.',data:'2026-11-20',status:'PUBLICADO',fontes:[]}];
const exposicoesBase=[{id:'expo-1',titulo:'Exposição de ensaio',artista:'Artista de ensaio',bio:'Acervo cultural.',local:'Centro',periodo:'Novembro',status:'PUBLICADO',imagemUrl:''}];
const exposicoes = [undefined,null,'','/imagem-indisponivel.svg','/imagem-quebrada.jpg'].map((imagemUrl,i)=>({...exposicoesBase[0],id:'expo-'+i,titulo:'Exposição '+i,imagemUrl,ctaSaibaMais:'https://example.test/expo-'+i}));
await mkdir(pasta, { recursive: true });
try {
  servidor = await createServer({ configFile: false, envDir: false, logLevel: "error", cacheDir: path.join(pasta, "vite"),
    server: { host: "127.0.0.1", port: 5226, strictPort: true },
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origem + "/api"),
      "import.meta.env.VITE_FEEDBACK_ATIVO": '"true"', "import.meta.env.VITE_METRICAS_ATIVAS": '"false"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    plugins: [react(), { name: "vis-4-leitura", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        const url = new URL(req.url, origem), rota = url.pathname, q = Object.fromEntries(url.searchParams);
        requisicoes.push({ method: req.method, path: rota });
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") { res.statusCode = 405; res.end("{}"); return; }
        if(rota === '/admin/feedback' || rota === '/admin/feedback/resumo') {
          const resumo=rota.endsWith('/resumo');
          const status=falha==='ambas'?503:falha==='resumo'&&resumo?503:falha==='lista'&&!resumo?503:falha==='diferentes'?(resumo?503:429):0;
          if(status){res.statusCode=status;res.end(JSON.stringify({success:false,error:{message:'Falha sintética'}}));return;}
        }
        let data;
        const lista = itens => ({ itens, paginacao: { pagina: 1, total: itens.length, limite: 20, totalPaginas: 1 } });
        if(falha==='erro' && rota!=='/categorias' && rota!=='/regioes'){res.statusCode=503;res.end(JSON.stringify({success:false,error:{message:'Indisponibilidade de ensaio'}}));return;}
        if(rota==='/patrimonios' || rota==='/admin/patrimonios') data=lista(falha==='vazio'?[]:itens);
        else if(rota.startsWith('/patrimonios/') || rota.startsWith('/admin/patrimonios/')) data=itens.find(i=>rota.endsWith(i.id)||rota.endsWith(i.slug)) || [];
        else if(rota==='/exposicoes'||rota==='/admin/exposicoes') data=lista(exposicoes);
        else if(rota==='/novidades'||rota==='/admin/novidades') data=lista(noticias);
        else if(rota.startsWith('/admin/exposicoes/')) data=exposicoes[0];
        else if(rota.startsWith('/admin/novidades/')) data=noticias[0];
        else if (rota === "/admins") data = lista(falha==='vazio'?[]:pessoas);
        else if (rota.startsWith("/admins/")) data = pessoas.find(p => rota.endsWith(p.id));
        else if (rota === "/admin/regioes") data = lista(falha==='vazio'?[]:regioes);
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
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `if(!location.pathname.endsWith('/login'))sessionStorage.setItem('guarulhos.admin.sessao',JSON.stringify({token:'fixture',refreshToken:'fixture',sessionId:'fixture',sessionExpiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'pessoa-1',email:'responsavel@example.test',name:'Responsável de ensaio',role:'ADMIN'}}))` });
  const antes=process.argv.includes('--antes');
  const consoleErros=[];
  // O helper registra exceções; avisos React são consultados pelo Log/Runtime.
  await call('Runtime.enable');
  await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__avisos=[];const original=console.error;console.error=(...args)=>{window.__avisos.push(args.map(String).join(' '));original(...args);};`});
  async function registrar(nome) {
    await pausa(750);
    const m=await avaliar(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};const t=document.querySelector('.admin-table');const w=document.querySelector('.admin-patrimonios-tabela');const a=document.activeElement;return {viewport:innerWidth,dpr:devicePixelRatio,scale:visualViewport.scale,documento:document.documentElement.scrollWidth,tabela:t&&rect(t),wrapper:w&&{...rect(w),scrollWidth:w.scrollWidth,scrollLeft:w.scrollLeft},foco:{tag:a.tagName,nome:a.getAttribute('aria-label'),visible:a.matches(':focus-visible'),...rect(a)},imagens:[...document.querySelectorAll('.expo-card img')].map(i=>({src:i.getAttribute('src'),alt:i.alt,complete:i.complete,naturalWidth:i.naturalWidth})),avisos:window.__avisos}})()`);
    resultados.push({nome,...m});
    await captura(nome,true);
    if(!antes) assert.ok(m.documento<=m.viewport, nome+' overflow '+m.documento);
    return m;
  }
  for(const w of zoom?[1440]:[320,390,768,1440]) {
    if(!zoom) await largura(w);
    await navegar(origem+'/admin/patrimonios');
    await esperar("document.querySelectorAll('.admin-table tbody tr').length===5");
    await avaliar("document.querySelector('.admin-table').scrollIntoView({block:'center'})");
    await registrar('lista_'+w);
    if(!antes) {
      await avaliar("document.querySelector('.admin-patrimonios-tabela').focus()");
      await tecla('ArrowRight','ArrowRight',39);
      await tecla('Tab','Tab',9);
      let m=await registrar('acao_'+w);
      assert.match(m.foco.nome,/Editar/);
      assert.ok(m.foco.x>=0 && m.foco.right<=m.viewport);
      await tecla('Tab','Tab',9); await tecla('Tab','Tab',9);
      m=await registrar('ultima_acao_'+w); assert.match(m.foco.nome,/Arquivar/);
      assert.ok(m.foco.x>=m.wrapper.x && m.foco.right<=m.wrapper.right,'ação recortada pelo contêiner');
    }
    await avaliar("document.querySelector('button[title=Editar]').focus()");
    await tecla('Enter','Enter',13);
    await esperar("document.querySelector('.admin-form input')");
    await registrar('editor_'+w);
    if(!antes) {
      await avaliar("document.querySelector('.admin-patrimonios-tabela').focus()");
      await tecla('Tab','Tab',9); await tecla('Tab','Tab',9); await tecla('Tab','Tab',9);
      const m=await registrar('editor_acoes_'+w);
      assert.match(m.foco.nome,/Arquivar/);
      assert.ok(m.foco.x>=m.wrapper.x && m.foco.right<=m.wrapper.right);
      assert.equal(await avaliar("(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()"),true);
    }
    await navegar(origem+'/conheca-mais');
    await esperar("document.querySelectorAll('.expo-card').length===5");
    for(let i=0;i<5;i++) {
      await avaliar(`document.querySelectorAll('.expo-card')[${i}].scrollIntoView({block:'center'})`);
      await pausa(500);
      const m=await registrar('exposicao_'+i+'_'+w);
      if(!antes) { assert.ok(m.imagens[i].src);assert.ok(m.imagens[i].naturalWidth>0);assert.equal(m.avisos.some(s=>s.includes('empty string')),false); }
    }
  }
  await writeFile(path.join(pasta,'resultado.json'),JSON.stringify({resultados,erros:browser.erros,requisicoes,consoleErros},null,2));
  assert.equal(requisicoes.some(r=>r.method!=='GET'),false);
  console.log(JSON.stringify({pasta,registros:resultados.length,erros:browser.erros}));
} finally {await browser?.fechar();await servidor?.close();}
