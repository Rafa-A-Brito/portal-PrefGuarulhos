// Regressões opt-in de contraste computado em Chromium local. Executar a partir de frontend.
// Quatro larguras; fixtures GET sem backend/.env. Zoom nativo: roteiro isolado documentado no relatório.
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
const pasta = path.resolve("../.cache/vis_5b_3", (process.argv.includes('--antes') ? 'antes' : 'depois')+(zoom?'_zoom':'')), origem = "http://127.0.0.1:5221";
const pessoas = [{ id: "pessoa-1", nome: "Responsável de ensaio", email: "responsavel@example.test", role: "ADMIN", ativo: true },
  { id: "pessoa-2", nome: "Pessoa afetada de ensaio", email: "pessoa.afetada@example.test", role: "EDITOR", ativo: false }];
const regioes = [{ id: "regiao-1", nome: "São João / Bonsucesso", slug: "sao-joao-bonsucesso", descricao: "Referência documental de ensaio.", ativo: true },
  { id: "regiao-2", nome: "Centro", slug: "centro", descricao: "", ativo: false }];
const paginas = { regioes: "/admin/regioes", historico: "/admin/auditoria", usuarios: "/admin/usuarios", dashboard: "/admin", feedback: "/admin/feedback", contato: "/contato" };
const resultados = [], requisicoes = [];


let servidor, browser; let falha = "normal";
const itens=Array.from({length:5},(_,i)=>({id:'a0000000-0000-4000-8000-00000000000'+i,slug:'ensaio-'+i,nome:'Patrimônio de ensaio '+(i+1),categoria:{slug:'historico',nome:'Histórico'},situacao:i===0?'DEMOLIDO':'EM_RESTAURACAO',statusVisitacao:i===0?'TEMPORARIAMENTE_FECHADO':'ACESSO_PARCIAL',descricaoResumida:'Descrição do acervo para auditoria de acessibilidade.',descricao:'História e memória da cidade.',motivoRestricao:'Restrição de ensaio, sem informação sobre acesso real.',previsaoReabertura:'2027-03-15',imagens:i===1?[]:[{url:'/uploads/casa_da_candinha.jpg'},{url:'/imagem-inexistente.jpg'}],localizacao:{bairro:'Centro',latitude:-23.45,longitude:-46.53},detalhes:[{titulo:'História',texto:'Memória cultural de Guarulhos.',icone:'historia'}]}));
const noticias=[{id:'noticia-1',slug:'noticia-1',tipo:'NOTICIA',tag:'Cultura',titulo:'Notícia de ensaio',resumo:'Informações culturais de ensaio.',texto:'Texto completo para leitura.',data:'2026-11-20',status:'PUBLICADO',fontes:[]}];
const exposicoes=[{id:'expo-1',titulo:'Exposição de ensaio',artista:'Artista de ensaio',bio:'Acervo cultural.',local:'Centro',periodo:'Novembro',status:'PUBLICADO',imagemUrl:''}];
await mkdir(pasta, { recursive: true });
try {
  servidor = await createServer({ configFile: false, envDir: false, logLevel: "error", cacheDir: path.join(pasta, "vite"),
    server: { host: "127.0.0.1", port: 5221, strictPort: true },
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
  const { call, navegar, largura, esperar, tecla, captura } = browser;
  await call("Network.setBlockedURLs", { urls: ["https://*", "http://localhost/*", "http://127.0.0.1:3333/*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `if(location.pathname.endsWith('/login'))sessionStorage.clear();else sessionStorage.setItem('guarulhos.admin.sessao',JSON.stringify({token:'fixture',refreshToken:'fixture',sessionId:'fixture',sessionExpiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'pessoa-1',email:'responsavel@example.test',name:'Responsável de ensaio',role:'ADMIN'}}))` });

const avaliar=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const antes=process.argv.includes('--antes');
  const medir = async (sel, fundoEspecial) => avaliar(String.raw`(()=>{
    const sel=${JSON.stringify(sel)}, e=document.querySelector(sel);if(!e)throw Error('Ausente: '+sel);
    const c=getComputedStyle(e),r=e.getBoundingClientRect();
    const rgba=s=>s.match(/[\d.]+/g).map(Number), comp=(a,b)=>a.slice(0,3).map((v,i)=>v*(a[3]??1)+b[i]*(1-(a[3]??1)));
    const lum=a=>a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const chain=[];for(let n=e;n;n=n.parentElement)chain.unshift(n);
    let bg=[255,255,255];for(const n of chain)bg=comp(rgba(getComputedStyle(n).backgroundColor),bg);
    if(${JSON.stringify(fundoEspecial??null)})bg=rgba(${JSON.stringify(fundoEspecial??null)});
    let fg=comp(rgba(e instanceof SVGElement?c.fill:c.color),bg);
    const brightness=c.filter.match(/brightness\(([\d.]+)\)/);if(brightness){fg=fg.map(v=>Math.min(255,v*Number(brightness[1])));bg=bg.map(v=>Math.min(255,v*Number(brightness[1])));}
    return {sel,texto:e.textContent.trim().slice(0,90),cor:c.color,fill:c.fill,fundo:bg,frente:fg,contraste:ratio(fg,bg),borda:c.borderColor,sombra:c.boxShadow,outline:c.outline,offset:c.outlineOffset,bordaContraste:ratio(rgba(c.borderTopColor),bg),outlineContraste:ratio(rgba(c.outlineColor),bg),foco:e.matches(':focus-visible'),disabled:e.disabled,opacidade:c.opacity,fonte:c.fontSize,peso:c.fontWeight,filter:c.filter,rect:{x:r.x,y:r.y,w:r.width,h:r.height},viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio,scale:visualViewport.scale},overflow:document.documentElement.scrollWidth>innerWidth};
  })()`);
  async function focar(sel){await tecla('Tab','Tab',9);await avaliar(`document.querySelector(${JSON.stringify(sel)}).focus()`);await pausa(750);}
  async function registrar(nome,sel,{fundo,min=4.5,checar=true,viewport=true}={}){
    const m=await medir(sel,fundo);resultados.push({nome,...m});
    await captura(nome,viewport);await writeFile(path.join(pasta,'resultado.json'),JSON.stringify({resultados,requisicoes,erros:browser.erros},null,2));
    if(!antes&&checar)assert.ok(m.contraste>=min,nome+': '+m.contraste);
    assert.ok(!m.overflow,nome+' overflow');return m;
  }
  async function hover(sel){
    await avaliar(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center',behavior:'instant'})`);await pausa(750);
    const r=await avaliar(`(()=>{let r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...r});await pausa(750);
  }
  async function estados(nome,sel,w){
    await avaliar(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center',behavior:'instant'})`);await pausa(750);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});await pausa(200);
    await registrar(nome+'_normal_'+w,sel);await hover(sel);await registrar(nome+'_hover_'+w,sel);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});await focar(sel);await registrar(nome+'_foco_'+w,sel);
  }
  for(const w of zoom?[1440]:[320,390,768,1440]){
    if(!zoom)await largura(w);
    await navegar(origem+'/');await esperar('document.querySelector(".searchbar button")');await pausa(800);
    await estados('buscar','.searchbar button',w);
    await navegar(origem+'/patrimonios');await esperar('document.querySelector(".plaqueta .verlink")');await pausa(800);
    await estados('favoritos','.btn-favoritos',w);
    await avaliar('document.querySelector(".btn-favoritos").click()');await pausa(250);await registrar('favoritos_ativo_'+w,'.btn-favoritos');
    await avaliar('document.querySelector(".btn-favoritos").click()');await esperar('document.querySelector(".plaqueta .verlink")');
    await estados('detalhes','.plaqueta .verlink',w);
    await navegar(origem+'/admin/login?senhaAlterada');await esperar('document.querySelector(".admin-login-submit")');await pausa(600);
    await estados('entrar','.admin-login-submit',w);
    await registrar('login_verde_'+w,'.admin-login-overline');
    await registrar('login_sucesso_'+w,'.admin-login-erro-alteracao');
    await focar('#email');await registrar('login_label_foco_'+w,'label[for="email"]');
    await avaliar('document.querySelector(".admin-login-submit").click()');await pausa(750);
    await registrar('login_erro_'+w,'.admin-login-field-erro');
    // Apenas representação de disabled; nenhum envio de credenciais.
    await avaliar('document.querySelector(".admin-login-submit").disabled=true');await pausa(750);await registrar('entrar_disabled_'+w,'.admin-login-submit',{checar:false});
    await navegar(origem+'/conheca-mais');await esperar('document.querySelector(".expo-card-body .periodo")');await pausa(800);
    await registrar('conheca_periodo_'+w,'.expo-card-body .periodo');
    await registrar('conheca_tag_'+w,'.novidade-tag');
    await estados('conheca_link','.noticia-link',w);
    for(let i=1;i<=3;i++){
      const s='.missao-item:nth-child('+i+')';await hover(s);
      const bg=await avaliar(`getComputedStyle(document.querySelector(${JSON.stringify(s)}),'::before').backgroundColor`);
      await registrar('missao_'+i+'_hover_'+w,s+' p',{fundo:bg});
    }
    await navegar(origem+'/admin/usuarios');await esperar('document.querySelector(".admin-form input[type=search]")');await pausa(800);
    const s='.admin-form input[type=search]';
    await registrar('usuarios_normal_'+w,s,{checar:false});await focar(s);
    const foco=await registrar('usuarios_foco_'+w,s,{checar:false});
    if(!antes)assert.ok(foco.foco&&foco.outlineContraste>=3&&!foco.outline.includes('transparent'));
    await avaliar(`document.querySelector(${JSON.stringify(s)}).setAttribute('aria-invalid','true')`);
    const erro=await registrar('usuarios_erro_foco_'+w,s,{checar:false});if(!antes)assert.ok(erro.outlineContraste>=3&&erro.borda!==foco.borda);
    await avaliar(`document.querySelector(${JSON.stringify(s)}).disabled=true`);await pausa(750);await registrar('usuarios_disabled_'+w,s,{checar:false});
    await navegar(origem+'/admin');await esperar('document.querySelector(".recharts-polar-radius-axis-tick text")');await pausa(800);
    await avaliar('document.querySelector(".recharts-radar").closest(".recharts-wrapper").scrollIntoView({block:"center",behavior:"instant"})');await pausa(750);
    const ticks=await avaliar('[...document.querySelectorAll(".recharts-polar-radius-axis-tick text")].map(e=>({t:e.textContent,fill:getComputedStyle(e).fill}))');assert.ok(ticks.length>0);
    await registrar('radar_'+w,'.recharts-polar-radius-axis-tick text');
    await registrar('radar_regiao_'+w,'.recharts-polar-angle-axis text');
    // A malha pode ser recoberta pela área do radar (25%); confira esse fundo também.
    await registrar('radar_preenchimento_'+w,'.recharts-polar-radius-axis-tick text',{fundo:'rgb(216.5,212.25,232.25)'});
    await avaliar('document.querySelectorAll("[data-slot=chart]")[2].scrollIntoView({block:"center",behavior:"instant"})');await esperar('document.querySelector(".recharts-cartesian-axis-tick-value")');await pausa(750);
    await registrar('eixo_barras_'+w,'.recharts-cartesian-axis-tick-value');
    console.log('Concluída largura '+w+(zoom?' zoom nativo':''));
  }
  assert.ok(requisicoes.every(r=>r.method==='GET'));assert.deepEqual(browser.erros,[]);
  console.log(JSON.stringify({registros:resultados.length,antes,zoom}));
}finally{await browser?.fechar();await servidor?.close();}
