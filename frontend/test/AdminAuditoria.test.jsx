import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminAuditoria from "../src/features/admin/pages/AdminAuditoria";
import App from "../src/App";
import api from "../src/services/api";
import { CHAVE_SESSAO_MOCK } from "../src/context/authConstants";
import { eventosAuditoria as eventos, idAuditoriaFixture as id, listaAuditoriaFixture as lista } from "./fixtures/auditoria";

const original = api.defaults.adapter;
const modalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const fecharOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
const resposta = (config, data) => ({ config, status: 200, headers: {}, data: { success: true, data } });
const falha = (config, status) => Promise.reject({ config, response: { status, data: { error: { code: "TEST_ERROR" } } } });
const montar = () => render(<MemoryRouter><AdminAuditoria /></MemoryRouter>);
function adapter(fn) {
  const mock = vi.fn(config => fn(config)); api.defaults.adapter = mock; return mock;
}
function padrao(config) {
  if (config.url === "/admin/auditoria") return Promise.resolve(resposta(config, lista()));
  const evento = eventos.find(e => config.url === `/admin/auditoria/${e.id}`);
  if (evento) return Promise.resolve(resposta(config, evento));
  if (config.url === "/admins") return Promise.resolve(resposta(config, { itens: [{ id: id(1), nome: "Ana — nome atual", email: "ana@example.test" }], paginacao: { total: 1 } }));
  // Catálogos públicos carregados pelo App, sem rede real.
  if (["/categorias", "/regioes"].includes(config.url)) return Promise.resolve(resposta(config, []));
  if (config.url === "/patrimonios") return Promise.resolve(resposta(config, { itens: [], paginacao: { totalPaginas: 0 } }));
  return Promise.reject(new Error("Requisição inesperada: " + config.url));
}
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  sessionStorage.clear(); adapter(padrao);
  // jsdom não implementa o algoritmo de foco/modal do navegador. O ensaio
  // visual verifica showModal, Escape e Tab no Chromium real.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
});
afterEach(() => {
  cleanup();
  api.defaults.adapter = original; vi.restoreAllMocks(); window.history.replaceState({}, "", "/");
  if (modalOriginal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", modalOriginal); else delete HTMLDialogElement.prototype.showModal;
  if (fecharOriginal) Object.defineProperty(HTMLDialogElement.prototype, "close", fecharOriginal); else delete HTMLDialogElement.prototype.close;
});

it("lista paginada real, ordem preservada e detalhes somente sob demanda", async () => {
  let pendente;
  const spy = adapter(c => c.url.endsWith(id(10)) ? new Promise(resolve => { pendente = { c, resolve }; }) : padrao(c));
  const user = userEvent.setup(); montar();
  expect(screen.getByRole("status").textContent).toContain("Carregando");
  await screen.findByText("4 alterações registradas.");
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][0].params).toEqual({ pagina: 1, limite: 20 });
  expect(screen.getAllByRole("row")[1].textContent).toContain("31/10/2026");
  const botao = screen.getByRole("button", { name: "Detalhes da alteração " + id(10) });
  await user.click(botao);
  const modal = screen.getByRole("dialog");
  expect(within(modal).getByRole("status").textContent).toContain("Carregando");
  await act(async () => pendente.resolve(resposta(pendente.c, eventos[0])));
  await within(modal).findByText("Nome anterior");
  expect(spy).toHaveBeenCalledTimes(2);
  expect(within(modal).getByText(/Ana — nome atual alterou usuário/)).toBeDefined();
  expect(within(modal).getByText(/cadastro atual/)).toBeDefined();
  expect(document.activeElement).toBe(within(modal).getByRole("heading"));
  fireEvent(modal, new Event("cancel", { bubbles: false, cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(document.activeElement).toBe(botao);
});

it.each([["USER_DEACTIVATE", true, false, "Conta administrativa desativada"], ["USER_ACTIVATE", false, true, "Conta administrativa ativada"]])(
  "detalhe %s separa ator e alvo e não inventa identidade ou sessões", async (action, antes, depois, titulo) => {
    const evento = { ...eventos[0], action, oldValues: { isActive: antes }, newValues: { isActive: depois } };
    adapter(c => c.url === "/admin/auditoria" ? Promise.resolve(resposta(c, lista([evento]))) : Promise.resolve(resposta(c, evento)));
    montar(); await screen.findByText("1 alterações registradas.");
    fireEvent.click(screen.getByRole("button", { name: /Detalhes da alteração/ }));
    const modal = within(screen.getByRole("dialog")); await modal.findByText(titulo);
    const responsavel = modal.getByText("Quem realizou?").closest("div");
    const alvo = modal.getByText("Quem ou o que foi afetado?").closest("div");
    expect(responsavel.textContent).toContain("Ana — nome atual");
    expect(alvo.textContent).toContain(id(2)); expect(alvo.textContent).toContain("Nome do alvo não informado");
    expect(alvo.textContent).not.toContain("Ana");
    const comparacao = modal.getByRole("region", { name: "Comparação de valores" });
    expect(comparacao.textContent).toContain("Situação da conta");
    expect(within(comparacao).getAllByRole("cell").map(c => c.textContent)).toEqual(antes ? ["Ativa", "Desativada"] : ["Desativada", "Ativa"]);
    expect(modal.getByText("Quando aconteceu? · America/Sao_Paulo").closest("div").textContent).toContain("12:20:00");
    expect(screen.getByRole("dialog").textContent).not.toMatch(/IP:|Sessão:|Página visitada:|revokedAt/);
  });

it("troca página usando total do servidor e aplica filtros voltando à primeira", async () => {
  const user = userEvent.setup();
  const spy = adapter(c => Promise.resolve(resposta(c, lista([eventos[0]], c.params.pagina, 41)))); montar();
  await screen.findByText("41 alterações registradas.");
  await user.click(screen.getByRole("button", { name: "Próxima" }));
  await screen.findByText("Página 2 de 3 · 41 alterações");
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2018-11-04" } });
  fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2018-11-04" } });
  await user.selectOptions(screen.getByLabelText("Tipo de ação"), "REGIAO_UPDATE");
  await user.selectOptions(screen.getByLabelText("Seção/recurso"), "RegiaoPatrimonio");
  fireEvent.change(screen.getByLabelText("Responsável (UUID, opcional)"), { target: { value: id(1) } });
  fireEvent.change(screen.getByLabelText("ID do registro alvo (UUID)"), { target: { value: id(3) } });
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await waitFor(() => expect(spy.mock.calls.at(-1)[0].params).toEqual({ pagina: 1, limite: 20,
    inicio: "2018-11-04T03:00:00.000Z", fim: "2018-11-05T01:59:59.999Z", action: "REGIAO_UPDATE", entity: "RegiaoPatrimonio", userId: id(1), entityId: id(3) }));
});

it("busca nome/e-mail em admins e envia somente UUID à auditoria", async () => {
  const user = userEvent.setup(); const spy = api.defaults.adapter; montar();
  await screen.findByText("4 alterações registradas.");
  await user.type(screen.getByLabelText("Buscar responsável por nome ou e-mail"), "ana");
  await user.click(screen.getByRole("button", { name: "Buscar responsável" }));
  await screen.findByRole("option", { name: "Ana — nome atual · ana@example.test" });
  expect(spy.mock.calls.at(-1)[0].params).toEqual({ busca: "ana", pagina: 1, limite: 20 });
  await user.selectOptions(screen.getByLabelText("Selecionar responsável"), id(1));
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await waitFor(() => expect(spy.mock.calls.at(-1)[0].params).toEqual({ userId: id(1), pagina: 1, limite: 20 }));
});

it.each([401, 403, 503])("lista trata HTTP %s sem mostrar zero ou detalhe antigo", async status => {
  adapter(c => falha(c, status)); montar();
  const erro = await screen.findByRole("alert");
  expect(erro.textContent).toMatch(status === 401 ? /sessão expirou/ : status === 403 ? /permissão/ : /indisponível/);
  expect(screen.queryByText(/0 alterações/)).toBeNull();
  expect(!!screen.queryByRole("button", { name: "Tentar novamente" })).toBe(status === 503);
});
it("503 recuperável repete os filtros aplicados, não o formulário ainda não aplicado", async () => {
  const user = userEvent.setup(); let erro = true;
  const spy = adapter(c => erro ? falha(c, 503) : padrao(c)); montar(); await screen.findByRole("alert");
  await user.selectOptions(screen.getByLabelText("Seção/recurso"), "User"); erro = false;
  await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByText("4 alterações registradas."); expect(spy.mock.calls.at(-1)[0].params).toEqual({ pagina: 1, limite: 20 });
});
it.each([404, 503])("detalhe trata HTTP %s e permite fechar", async status => {
  const user = userEvent.setup(); adapter(c => c.url === "/admin/auditoria" ? padrao(c) : falha(c, status)); montar();
  await screen.findByText("4 alterações registradas.");
  await user.click(screen.getAllByRole("button", { name: /Detalhes da alteração/ })[0]);
  expect((await within(screen.getByRole("dialog")).findByRole("alert")).textContent).toMatch(status === 404 ? /não encontrado/ : /indisponível/);
  await user.click(screen.getByRole("button", { name: "Fechar detalhes" })); expect(screen.queryByRole("dialog")).toBeNull();
});
it("distingue lista vazia de filtros sem resultados e rejeita período inválido", async () => {
  const user = userEvent.setup(); const spy = adapter(c => Promise.resolve(resposta(c, lista([])))); montar();
  await screen.findByText("Nenhuma alteração registrada.");
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-10-31" } });
  fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-10-01" } });
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  expect(screen.getByRole("alert").textContent).toContain("fim"); expect(spy).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-10-31" } });
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" })); await screen.findByText("Nenhuma alteração encontrada para estes filtros.");
  await user.click(screen.getByRole("button", { name: "Limpar filtros" })); await screen.findByText("Nenhuma alteração registrada.");
});
it("cancela consultas antigas, ignora resposta atrasada e cancela ao desmontar", async () => {
  const pendentes = [];
  adapter(c => new Promise(resolve => pendentes.push({ c, resolve })));
  const user = userEvent.setup(); const view = montar(); await waitFor(() => expect(pendentes).toHaveLength(1));
  await user.selectOptions(screen.getByLabelText("Seção/recurso"), "User");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await waitFor(() => expect(pendentes).toHaveLength(2)); expect(pendentes[0].c.signal.aborted).toBe(true);
  await act(async () => { pendentes[1].resolve(resposta(pendentes[1].c, lista([eventos[0]]))); });
  await screen.findByText("1 alterações registradas nos filtros aplicados.");
  await act(async () => { pendentes[0].resolve(resposta(pendentes[0].c, lista())); });
  expect(screen.queryByText("4 alterações registradas.")).toBeNull(); view.unmount(); expect(pendentes[1].c.signal.aborted).toBe(true);
});
it("fechar detalhe cancela request sem substituir o evento seguinte", async () => {
  const user = userEvent.setup(); let pendente;
  adapter(c => c.url.endsWith(id(10)) ? new Promise(resolve => { pendente = { c, resolve }; }) : padrao(c)); montar();
  await screen.findByText("4 alterações registradas."); await user.click(screen.getAllByRole("button", { name: /Detalhes da alteração/ })[0]);
  await waitFor(() => expect(pendente).toBeDefined()); await user.click(screen.getByRole("button", { name: "Fechar detalhes" }));
  expect(pendente.c.signal.aborted).toBe(true);
  await user.click(screen.getAllByRole("button", { name: /Detalhes da alteração/ })[1]);
  await within(screen.getByRole("dialog")).findByText("Texto vazio");
  await act(async () => pendente.resolve(resposta(pendente.c, eventos[0])));
  expect(within(screen.getByRole("dialog")).queryByText("Nome anterior")).toBeNull();
});
it("texto malicioso não vira HTML e senha não exibe campos mesmo em DTO impróprio", async () => {
  const user = userEvent.setup();
  adapter(c => c.url.endsWith(id(10)) ? Promise.resolve(resposta(c, { ...eventos[0], newValues: { name: "<img src=x onerror=alert(1)>", passwordHash: "NUNCA" } }))
    : c.url.endsWith(id(13)) ? Promise.resolve(resposta(c, { ...eventos[3], oldValues: { password: "NUNCA" } })) : padrao(c)); montar();
  await screen.findByText("4 alterações registradas."); await user.click(screen.getAllByRole("button", { name: /Detalhes da alteração/ })[0]);
  await within(screen.getByRole("dialog")).findAllByText("<img src=x onerror=alert(1)>"); expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
  expect(screen.queryByText(/NUNCA/)).toBeNull(); await user.click(screen.getByRole("button", { name: "Fechar detalhes" }));
  await user.click(screen.getAllByRole("button", { name: /Detalhes da alteração/ })[3]);
  await screen.findByText("Valores de senha nunca são apresentados."); expect(screen.queryByText(/NUNCA/)).toBeNull();
});

it.each(["ADMIN", "EDITOR", null])("rota real do App protege histórico para %s e menu condiz", async role => {
  if (role) sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify({ token: "h1-test-token", refreshToken: "h1-test-refresh", sessionId: "h1-test-session",
    sessionExpiresAt: new Date(Date.now() + 3600000).toISOString(), user: { id: id(1), name: "Pessoa", email: "p@example.test", role } }));
  window.history.replaceState({}, "", "/admin/auditoria");
  const spy = api.defaults.adapter; render(<App />);
  if (role === "ADMIN") {
    await screen.findByRole("heading", { name: "Histórico de alterações" });
    expect(screen.getByRole("link", { name: "Histórico de alterações" }).getAttribute("href")).toBe("/admin/auditoria");
    await waitFor(() => expect(spy.mock.calls.some(([c]) => c.url === "/admin/auditoria" && c.headers.Authorization === "Bearer h1-test-token")).toBe(true));
  } else {
    await screen.findByText(role ? /não tem permissão para acessar essa área/ : "Entrar no painel");
    expect(screen.queryByRole("link", { name: "Histórico de alterações" })).toBeNull();
    expect(spy.mock.calls.some(([c]) => c.url.startsWith("/admin/auditoria"))).toBe(false);
  }
});
