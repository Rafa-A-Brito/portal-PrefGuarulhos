// Regressões visuais opt-in: executar a partir de frontend, sem backend/.env.
// Navegador Chromium local; somente fixtures GET. Evidências em .cache/vis_5b_2a.
// O ensaio de zoom nativo desta entrega usa o roteiro temporário documentado no relatório.
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
const pasta = path.resolve("../.cache/vis_5b_2a", process.argv.includes('--antes') ? 'antes' : zoom ? 'zoom_real' : 'depois'), origem = "http://127.0.0.1:5215";
const pessoas = [{ id: "pessoa-1", nome: "Responsável de ensaio", email: "responsavel@example.test", role: "ADMIN", ativo: true },
  { id: "pessoa-2", nome: "Pessoa afetada de ensaio", email: "pessoa.afetada@example.test", role: "EDITOR", ativo: false }];
const regioes = [{ id: "regiao-1", nome: "São João / Bonsucesso", slug: "sao-joao-bonsucesso", descricao: "Referência documental de ensaio.", ativo: true },
  { id: "regiao-2", nome: "Centro", slug: "centro", descricao: "", ativo: false }];
const paginas = { regioes: "/admin/regioes", historico: "/admin/auditoria", usuarios: "/admin/usuarios", dashboard: "/admin", feedback: "/admin/feedback", contato: "/contato" };
const resultados = [], requisicoes = [];


let servidor, browser; let falha = "normal";
const itens=Array.from({length:5},(_,i)=>({id:'a0000000-0000-4000-8000-00000000000'+i,slug:'ensaio-'+i,nome:'Patrimônio de ensaio '+(i+1),categoria:{slug:'historico',nome:'Histórico'},situacao:i===0?'DEMOLIDO':'EM_RESTAURACAO',statusVisitacao:i===0?'TEMPORARIAMENTE_FECHADO':'ACESSO_PARCIAL',descricaoResumida:'Descrição do acervo para auditoria de acessibilidade.',descricao:'História e memória da cidade.',motivoRestricao:'Restrição de ensaio, sem informação sobre acesso real.',previsaoReabertura:'2027-03-15',imagens:i===1?[]:[{url:'/uploads/casa_da_candinha.jpg'},{url:'/imagem-inexistente.jpg'}],localizacao:{bairro:'Centro',latitude:-23.45,longitude:-46.53},detalhes:[{titulo:'História',texto:'Memória cultural de Guarulhos.',icone:'historia'}]}));
const noticias=[{id:'noticia-1',slug:'noticia-1',tipo:'NOTICIA',titulo:'Notícia de ensaio',resumo:'Informações culturais de ensaio.',texto:'Texto completo para leitura.',data:'2026-11-20',status:'PUBLICADO',fontes:[]}];
const exposicoes=[{id:'expo-1',titulo:'Exposição de ensaio',artista:'Artista de ensaio',bio:'Acervo cultural.',local:'Centro',periodo:'Novembro',status:'PUBLICADO',imagemUrl:''}];
await mkdir(pasta, { recursive: true });
try {
  servidor = await createServer({ configFile: false, envDir: false, logLevel: "error", cacheDir: path.join(pasta, "vite"),
    server: { host: "127.0.0.1", port: 5215, strictPort: true },
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
  function contraste(a,b){const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
  async function registrar(nome,dados={},modal=false){
    await pausa(300);
    const medidas=await avaliar(`({largura:innerWidth,dpr:devicePixelRatio,escala:visualViewport.scale,overflow:document.documentElement.scrollWidth>innerWidth,foco:document.activeElement?.outerHTML.slice(0,350)})`);
    await captura(nome,modal);resultados.push({nome,...medidas,...dados});
  }
  for(const w of (zoom?[1440]:[320,390,768,1440])){
    if(!zoom)await largura(w);
    for(const [nome,rota,sel] of [['inicio','/','.searchbar'],['catalogo','/patrimonios','.mapa-search'],['mapa','/mapa','.mapa-search'],['navbar','/','.navbar-busca']]){
      await navegar(origem+rota);await esperar('document.querySelector("main")');
      if(nome==='navbar'){await esperar('document.querySelector(".navbar-search-btn")');await avaliar('document.querySelector(".navbar-search-btn").focus()');await tecla('Enter','Enter',13);}
      await esperar(`document.querySelector('${sel} input')`);
      const medir=()=>avaliar(`(()=>{const e=document.querySelector('${sel}'),c=getComputedStyle(e),r=e.getBoundingClientRect();return {outline:c.outlineStyle,cor:c.outlineColor,espessura:c.outlineWidth,offset:c.outlineOffset,fundo:c.backgroundColor,x:r.x,y:r.y,w:r.width,h:r.height}})()`);
      await avaliar('document.activeElement.blur()');const normal=await medir();
      await tecla('Tab','Tab',9);await avaliar(`document.querySelector('${sel} input').focus()`);const foco=await medir();
      if(!antes){assert.equal(foco.outline,'solid');assert.equal(foco.espessura,'3px');assert.ok(Math.abs(foco.w-normal.w)<0.1);assert.ok(Math.abs(foco.h-normal.h)<0.1);}
      foco.contraste=contraste(foco.cor,foco.fundo);
      if(!antes)assert.ok(foco.contraste>=3);
      await registrar(nome+'_foco_'+w,{normal,foco});
      if(nome==='navbar'){await avaliar('document.querySelector(".navbar-busca-fechar").focus()');await tecla('Enter','Enter',13);await esperar('document.activeElement.matches(".navbar-search-btn")');}
    }
    await navegar(origem+'/conheca-mais/detalhes');await esperar('document.querySelector(".detalhes-item")');
    await avaliar('window.scrollTo(0,400)');await pausa(400);
    if(w<1100||zoom){
      await avaliar('document.querySelector(".detalhes-atalho").focus()');await tecla('Enter','Enter',13);await esperar('document.querySelector(".detalhes-painel")');await pausa(300);
      const abertura=await avaliar('({foco:document.activeElement.className,modal:!!document.querySelector("dialog:modal"),overflow:document.body.style.overflow})');
      const passos=[];for(let i=0;i<5;i++){await tecla('Tab','Tab',9);passos.push(await avaliar('({classe:document.activeElement.className,dentro:!!document.activeElement.closest(".detalhes-painel")})'));}
      if(!antes){assert.ok(abertura.modal);assert.equal(abertura.foco,'detalhes-painel-fechar');assert.ok(passos.every(p=>p.dentro));}
      await registrar('noticias_modal_'+w,{abertura,passos},true);
      await tecla('Escape','Escape',27);await esperar('!document.querySelector(".detalhes-painel")');
      if(!antes){
        assert.ok(await avaliar('document.activeElement.matches(".detalhes-atalho")'));
        assert.equal(await avaliar('document.body.style.overflow'),'');
        await tecla('Enter','Enter',13);await esperar('document.querySelector("dialog:modal")');
        await tecla('Tab','Tab',9,8);assert.ok(await avaliar('document.activeElement.matches(".detalhes-painel a:last-child") || document.activeElement.matches(".detalhes-painel a")'));
        await tecla('Tab','Tab',9);assert.ok(await avaliar('document.activeElement.matches(".detalhes-painel-fechar")'));
        await avaliar('document.querySelector(".navbar-search-btn").focus()');assert.ok(await avaliar('!!document.activeElement.closest(".detalhes-painel")'));
        await tecla('Enter','Enter',13);await esperar('!document.querySelector("dialog:modal")');
        await tecla('Enter','Enter',13);await esperar('document.querySelector("dialog:modal")');
        await tecla('Tab','Tab',9);await tecla('Enter','Enter',13);await esperar('location.hash==="#noticia-1" && !document.querySelector("dialog")');
        assert.equal(await avaliar('document.body.style.overflow'),'');
        await registrar('noticias_ancora_'+w,{teclado:'Tab, Shift+Tab, Enter, Escape; fundo inerte'});
      }
    }else await registrar('noticias_desktop_'+w);
    for(const [nome,rota,botao] of [['contato','/contato',null],['regioes','/admin/regioes','[aria-label^="Editar região"]'],['exposicoes','/admin/exposicoes',null],['novidades','/admin/novidades',null],['patrimonios','/admin/patrimonios',null]]){
      await navegar(origem+rota);
      if(nome!=='contato'){
        const expr=botao?`document.querySelector('${botao}')`:`document.querySelector('button[aria-label^="Editar"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar')`;
        await esperar(expr);await avaliar(`(${expr}).click()`);
      }
      await esperar('document.querySelector("textarea")');await pausa(300);
      if(!antes && nome==='patrimonios'){
        await esperar('document.querySelector(".organizacao-editorial-nova:not(:disabled)")');
        await avaliar('document.querySelector(".organizacao-editorial-nova").click()');
        await esperar('document.querySelector("#organizacao-nova-regiao textarea")');
      }
      const areas=await avaliar(`(()=>{return [...document.querySelectorAll('textarea')].filter(e=>e.getClientRects().length).map(e=>{e.focus();e.value=Array.from({length:60},(_,i)=>'Linha '+i+' de conteúdo extenso para leitura.').join(String.fromCharCode(10));e.setSelectionRange(e.value.length,e.value.length);e.scrollTop=e.scrollHeight;const c=getComputedStyle(e);return {id:e.id,resize:c.resize,overflow:c.overflowY,altura:e.clientHeight,conteudo:e.scrollHeight,rolagem:e.scrollTop,maxLength:e.maxLength}})})()`);
      if(!antes)assert.ok(areas.every(a=>a.resize==='none'&&a.overflow==='auto'&&a.rolagem>0));
      await registrar(nome+'_textarea_'+w,{areas});
      if(!antes){
        const qtd=await avaliar('document.querySelectorAll("textarea").length');const teclado=[];
        for(let i=0;i<qtd;i++){
          const campo=await avaliar(`(()=>{const e=document.querySelectorAll('textarea')[${i}];if(!e.getClientRects().length||e.matches(':disabled'))return null;e.focus();e.select();return {limite:e.maxLength,id:e.id}})()`);
          if(!campo)continue;
          const texto=Array.from({length:90},(_,n)=>'Linha '+n+' para leitura.').join('\n').slice(0,campo.limite>0?campo.limite:2000);
          await call('Input.insertText',{text:texto});await tecla('Home','Home',36,2);await pausa(50);
          const topo=await avaliar('document.activeElement.scrollTop');await tecla('End','End',35,2);await pausa(50);
          const fim=await avaliar(`(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),c=getComputedStyle(e);return {tag:e.tagName,valor:e.value,cursor:e.selectionEnd,padding:parseFloat(c.paddingBottom),linha:parseFloat(c.lineHeight)||parseFloat(c.fontSize)*1.5,rolagem:e.scrollTop,max:e.scrollHeight-e.clientHeight,foco:e.matches(':focus-visible'),rect:{x:r.x,y:r.y,w:r.width,h:r.height}}})()`);
          assert.equal(fim.tag,'TEXTAREA');assert.equal(fim.valor,texto);assert.ok(fim.foco);assert.equal(fim.cursor,texto.length);assert.ok(fim.rolagem>topo);assert.ok(fim.max-fim.rolagem<fim.padding+fim.linha,JSON.stringify(fim));
          if(i===0)await captura(nome+'_fim_texto_'+w,true);
          await tecla('Tab','Tab',9);assert.ok(await avaliar('document.activeElement.tagName!=="BODY"'));
          teclado.push({id:campo.id,topo,fim:{...fim,valor:fim.valor.length}});
        }
        await registrar(nome+'_texto_teclado_'+w,{teclado},true);
      }
    }
  }
  assert.ok(requisicoes.every(r=>r.method==='GET'));assert.deepEqual(browser.erros,[]);
  await writeFile(path.join(pasta,'resultado.json'),JSON.stringify({resultados,requisicoes,erros:browser.erros},null,2));console.log(JSON.stringify({capturas:resultados.length,antes,zoom}));
}finally{await browser?.fechar();await servidor?.close();}
