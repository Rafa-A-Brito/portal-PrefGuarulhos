// Opt-in: somente fixtures HTTP locais; sem backend, .env, proxy ou banco.
// Da pasta frontend: node test/ui_f1_visual.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { abrirBrowser, pausa } from "./fixtures/browser_feedback.mjs";
import { eventosAuditoria, listaAuditoriaFixture, idAuditoriaFixture as id } from "./fixtures/auditoria.js";
import { dashboardFixture } from "./fixtures/dashboard.js";
import { metricasFixture } from "./fixtures/metricas_dashboard.js";
import { listaFeedback, resumoFeedback } from "./fixtures/feedback_admin.js";

const pasta = path.resolve("../.cache/ui_f1/admin_visual"), origem = "http://127.0.0.1:5195";
const eventos = [...eventosAuditoria, { ...eventosAuditoria[0], id: id(14), action: "USER_DEACTIVATE",
  oldValues: { isActive: true }, newValues: { isActive: false } },
{ ...eventosAuditoria[2], id: id(15), action: "D1C_EDITORIAL_IMPORT", oldValues: null, newValues: null }];
const requisicoes = [], resultados = [];
let modo = "normal", browser, servidor;
await mkdir(pasta, { recursive: true });
try {
  servidor = await createServer({ configFile: false, envDir: false, logLevel: "error", cacheDir: path.join(pasta, "vite"),
    server: { host: "127.0.0.1", port: 5195, strictPort: true },
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(origem + "/api"), "import.meta.env.VITE_FEEDBACK_ATIVO": '"false"',
      "import.meta.env.VITE_METRICAS_ATIVAS": '"false"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""' },
    plugins: [react(), { name: "ui-f1-fixtures", configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        const url = new URL(req.url, origem), rota = url.pathname, q = Object.fromEntries(url.searchParams);
        requisicoes.push({ method: req.method, path: rota });
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        if (req.method !== "GET") { res.statusCode = 405; res.end("{}"); return; }
        let data;
        if (rota === "/admin/auditoria") data = listaAuditoriaFixture(eventos);
        else if (rota.startsWith("/admin/auditoria/")) data = eventos.find(e => rota.endsWith(e.id));
        else if (rota === "/admin/dashboard") data = dashboardFixture();
        else if (rota === "/admin/dashboard/metricas") {
          data = metricasFixture(q.inicio, q.fim); data.meta.geradoEm = q.fim + "T15:00:00Z";
          data.visualizacoes.serie = [{ data: q.inicio, quantidade: "7" }, { data: q.fim, quantidade: "5" }];
        } else if (rota === "/admin/feedback/resumo") data = modo === "desativado" ? { disponivel: false, motivo: "DESATIVADA" } : resumoFeedback(q);
        else if (rota === "/admin/feedback") data = modo === "desativado" ? { disponivel: false, motivo: "DESATIVADA" } : listaFeedback({ ...q, pagina: Number(q.pagina), limite: Number(q.limite) });
        else if (rota.startsWith("/admin/feedback/")) data = { disponivel: true, registro: { id: rota.split("/").at(-1), tipo: "ELOGIO", createdAt: new Date().toISOString(),
          expiraEm: new Date(Date.now() + 86400000).toISOString(), mensagem: "Comentário sintético para conferir a leitura em telas menores.", avisoVersao: "feedback-v1" } };
        else if (rota === "/admin/regioes") data = { itens: [
          { id: id(20), nome: "Centro", slug: "centro", descricao: "Referência documental sintética para o catálogo de regiões.", ativo: true },
          { id: id(21), nome: "São João / Bonsucesso", slug: "sao-joao-bonsucesso", descricao: "Descrição longa de demonstração para conferir alinhamento e quebra de texto sem alterar vínculos.", ativo: false },
        ], paginacao: { pagina: 1, limite: 20, total: 2, totalPaginas: 1 } };
        else if (rota === "/admins") data = { itens: [{ id: id(1), nome: "Ana — nome atual", email: "ana@example.test", role: "ADMIN", ativo: true }], paginacao: { pagina: 1, limite: 20, total: 1, totalPaginas: 1 } };
        else if (["/categorias", "/regioes"].includes(rota)) data = [];
        else if (rota === "/patrimonios") data = { itens: [], paginacao: { totalPaginas: 0 } };
        else { res.statusCode = 404; res.end("{}"); return; }
        res.end(JSON.stringify({ success: true, data }));
      });
    } }],
  });
  await servidor.listen(); browser = await abrirBrowser(pasta);
  const { call, avaliar, esperar, navegar, botao, largura, captura, tecla } = browser;
  await call("Network.setBlockedURLs", { urls: ["https://*", "http://localhost/*", "http://127.0.0.1:3333/*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem('guarulhos.admin.sessao',JSON.stringify({token:'fixture-ui-f1',refreshToken:'fixture-ui-f1',sessionId:'fixture',sessionExpiresAt:new Date(Date.now()+3600000).toISOString(),user:{id:'${id(1)}',email:'ana@example.test',name:'Ana — nome atual',role:'ADMIN'}}))` });
  async function conferir(nome, width, modal = false) {
    await pausa(250);
    assert.equal(await avaliar("document.documentElement.scrollWidth <= innerWidth"), true, `Overflow ${nome}/${width}`);
    if (modal) assert.equal(await avaliar("document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth"), true, "Overflow modal");
    await captura(nome + "_" + width, modal); resultados.push({ tela: nome, largura: width, overflow: false });
  }
  for (const width of [1440, 768, 390, 320]) {
    await largura(width); await navegar(origem + "/admin/regioes");
    await esperar("document.querySelector('.admin-regioes-lista li')");
    const campo = ".admin-regioes-busca input";
    assert.equal(await avaliar(`getComputedStyle(document.querySelector('${campo}')).borderTopWidth`), "1px");
    await avaliar(`document.querySelector('${campo}').focus()`); await tecla("Tab", "Tab", 9, 8); await tecla("Tab", "Tab", 9);
    assert.equal(await avaliar(`getComputedStyle(document.querySelector('${campo}')).outlineWidth`), "3px");
    await conferir("regioes", width); await botao("Nova região");
    await esperar("document.querySelector('.admin-regioes-campos input')===document.activeElement"); await conferir("regiao_formulario", width);
    await navegar(origem + "/admin/auditoria"); await esperar("document.body.innerText.includes('6 alterações registradas.')");
    assert.equal(await avaliar("document.querySelector('[aria-label=\"Lista de alterações\"]').innerText.includes('Ação não identificada')"), false);
    await conferir("historico", width);
    await avaliar(`document.querySelector('[aria-label="Detalhes da alteração ${id(14)}"]').click()`);
    await esperar("document.querySelector('dialog')?.innerText.includes('Conta administrativa desativada')");
    await conferir("historico_detalhe", width, true);
    for (let i = 0; i < 6; i++) { await tecla("Tab", "Tab", 9); assert.equal(await avaliar("document.querySelector('dialog').contains(document.activeElement)"), true); }
    await tecla("Escape", "Escape", 27); await esperar("!document.querySelector('dialog')");
    await navegar(origem + "/admin/feedback"); await esperar("document.querySelector('[aria-label=\"Lista de feedbacks\"]')");
    await conferir("feedback_admin", width); await botao("Detalhes");
    await esperar("document.querySelector('dialog')?.innerText.includes('Comentário sintético')"); await conferir("feedback_detalhe", width, true);
    await botao("Fechar detalhes"); modo = "desativado"; await botao("Atualizar dados");
    await esperar("document.body.innerText.includes('Consulta de feedback desativada')"); await conferir("feedback_desativado", width); modo = "normal";
    await navegar(origem + "/admin"); await esperar("document.querySelector('[aria-label=\"Visualizações qualificadas V2\"]')");
    await botao("Consultar visualizações"); await esperar("document.body.innerText.includes('Comparativo regional') || document.querySelector('[aria-label=\"Comparativo regional de visualizações\"]')");
    assert.equal(await avaliar("document.querySelectorAll('[aria-label=\"Visualizações qualificadas V2\"] .recharts-surface').length"), 3);
    await conferir("dashboard_v2", width); const antes = requisicoes.length;
    await botao("Recolher visualizações"); await pausa(150); assert.equal(requisicoes.length, antes);
    await navegar(origem + "/admin/usuarios"); await esperar("document.querySelector('.admin-usuarios-tabela')"); await conferir("usuarios", width);
  }
  assert.deepEqual(browser.erros, []); assert.ok(requisicoes.every(r => r.method === "GET"));
  await writeFile(path.join(pasta, "resultado.json"), JSON.stringify({ resultados, requisicoes, erros: browser.erros, dados: "somente fixtures; sem banco" }, null, 2));
  console.log(JSON.stringify({ capturas: resultados.length, larguras: [1440, 768, 390, 320], erros: browser.erros, somenteGet: true }));
} finally { await browser?.fechar(); await servidor?.close(); }
