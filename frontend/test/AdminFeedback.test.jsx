import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminFeedback from "../src/features/admin/pages/AdminFeedback";
import App from "../src/App";
import api from "../src/services/api";
import { CHAVE_SESSAO_MOCK } from "../src/context/authConstants";
import { listaFeedback, resumoFeedback, idFeedback } from "./fixtures/feedback_admin";
vi.mock("../src/features/admin/components/FeedbackGraficos", () => ({ default: () => <div>Gráfico carregado</div> }));
const original = api.defaults.adapter;
const resposta = (config, data) => ({ config, status: 200, headers: {}, data: { success: true, data } });
const falha = (config, status) => Promise.reject({ config, response: { status, data: { error: { code: "TEST_ERROR", message: "SEGREDO_NAO_EXIBIR" } } } });
const montar = () => render(<MemoryRouter><AdminFeedback /></MemoryRouter>);
function adapter(fn) { const mock = vi.fn(config => fn(config)); api.defaults.adapter = mock; return mock; }
function padrao(c) {
  if (c.url === "/admin/feedback") return Promise.resolve(resposta(c, listaFeedback(c.params)));
  if (c.url === "/admin/feedback/resumo") return Promise.resolve(resposta(c, resumoFeedback(c.params)));
  if (c.url.startsWith("/admin/feedback/")) return Promise.resolve(resposta(c, { disponivel: true, registro: { id: c.url.split("/").at(-1), tipo: "ELOGIO", createdAt: "2026-11-03T15:00:00Z", expiraEm: "2027-05-02T15:00:00Z", mensagem: "<img src=x onerror=alert(1)>\nhttps://example.invalid\n😀", avisoVersao: "feedback-v1" } }));
  if (["/categorias", "/regioes"].includes(c.url)) return Promise.resolve(resposta(c, []));
  if (c.url === "/patrimonios") return Promise.resolve(resposta(c, { itens: [], paginacao: { totalPaginas: 0 } }));
  throw Error("Rota inesperada");
}
const modalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal"), fecharOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeEach(() => {
  sessionStorage.clear(); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); adapter(padrao);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
});
afterEach(() => {
  cleanup(); api.defaults.adapter = original; vi.useRealTimers(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/");
  if (modalOriginal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", modalOriginal); else delete HTMLDialogElement.prototype.showModal;
  if (fecharOriginal) Object.defineProperty(HTMLDialogElement.prototype, "close", fecharOriginal); else delete HTMLDialogElement.prototype.close;
});
it("duas consultas independentes, datas BR e detalhes somente sob demanda com texto seguro e foco", async () => {
  const spy = api.defaults.adapter, user = userEvent.setup(); montar();
  await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  expect(spy).toHaveBeenCalledTimes(2); expect(screen.getByLabelText("Data inicial").value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  const botao = screen.getAllByRole("button", { name: /Detalhes de Elogio/ })[0]; await user.click(botao);
  const modal = screen.getByRole("dialog"); await within(modal).findByText(/<img src=x/);
  expect(modal.querySelector("img,a,script")).toBeNull(); expect(spy).toHaveBeenCalledTimes(3);
  expect(document.activeElement).toBe(within(modal).getByRole("heading", { name: "Detalhes do feedback" }));
  fireEvent(modal, new Event("cancel", { cancelable: true })); expect(screen.queryByRole("dialog")).toBeNull(); expect(document.activeElement).toBe(botao);
});
it("paginação não repete resumo; filtros voltam à página 1 e atualizam ambos", async () => {
  const user = userEvent.setup(), spy = adapter(c => c.url === "/admin/feedback" ? Promise.resolve(resposta(c, listaFeedback(c.params, 21))) : padrao(c)); montar();
  await screen.findByText(/Página 1 de 2/); await user.click(screen.getByRole("button", { name: "Próxima" })); await screen.findByText(/Página 2 de 2/);
  expect(spy.mock.calls.filter(([c]) => c.url.endsWith("resumo"))).toHaveLength(1);
  await user.selectOptions(screen.getByLabelText("Tipo de feedback"), "PROBLEMA"); await user.selectOptions(screen.getByLabelText("Granularidade"), "mes");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" })); await screen.findByText(/Página 1 de 2/);
  expect(spy.mock.calls.at(-1)[0].params).toMatchObject({ tipo: "PROBLEMA", granularidade: "mes" });
  await user.click(screen.getByRole("button", { name: "Limpar filtros" })); await waitFor(() => expect(spy.mock.calls.at(-1)[0].params.tipo).toBeUndefined());
});
it.each([401, 403, 503, 429, 400])("trata %s sem fabricar total nem ecoar corpo", async status => {
  adapter(c => falha(c, status)); montar(); await screen.findAllByRole("alert");
  expect(screen.queryByRole("region", { name: "Feedbacks retidos no período" })).toBeNull(); expect(screen.queryByText(/SEGREDO_NAO_EXIBIR/)).toBeNull();
});
it("desativado e vazio são distintos, sem depender da flag pública", async () => {
  vi.stubEnv("VITE_FEEDBACK_ATIVO", "false");
  adapter(c => Promise.resolve(resposta(c, { disponivel: false, motivo: "DESATIVADA" }))); const view = montar();
  await screen.findByText(/Consulta de feedback desativada/); expect(screen.queryByRole("region", { name: "Feedbacks retidos no período" })).toBeNull(); view.unmount();
  adapter(c => Promise.resolve(resposta(c, c.url.endsWith("resumo") ? resumoFeedback(c.params, "0") : listaFeedback(c.params, 0)))); montar();
  await screen.findByText(/Nenhum feedback retido/); expect(screen.queryByText("Gráfico carregado")).toBeNull(); vi.unstubAllEnvs();
});
it("falha recuperável usa filtros aplicados e recuperação é explícita", async () => {
  let indisponivel = true; const spy = adapter(c => indisponivel ? falha(c, 503) : padrao(c)), user = userEvent.setup(); montar();
  await screen.findAllByRole("alert"); await user.selectOptions(screen.getByLabelText("Tipo de feedback"), "PROBLEMA"); indisponivel = false;
  await user.click(screen.getByRole("button", { name: "Atualizar dados" })); await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  expect(spy.mock.calls.at(-1)[0].params.tipo).toBeUndefined();
});
it("agrupa falhas equivalentes e recupera ambas as consultas com os filtros aplicados", async () => {
  let indisponivel = false;
  const spy = adapter(c => indisponivel ? falha(c, 503) : padrao(c));
  const user = userEvent.setup(); montar(); await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  await user.selectOptions(screen.getByLabelText("Tipo de feedback"), "PROBLEMA");
  indisponivel = true;
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await screen.findByRole("alert");
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: "Tentar novamente" })).toHaveLength(1);
  indisponivel = false;
  await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(spy.mock.calls.slice(-2).map(([c]) => c.url).sort()).toEqual(["/admin/feedback", "/admin/feedback/resumo"]);
  expect(spy.mock.calls.slice(-2).every(([c]) => c.params.tipo === "PROBLEMA")).toBe(true);
});
it.each(["/admin/feedback", "/admin/feedback/resumo"])("preserva resultado independente quando somente %s falha", async rota => {
  adapter(c => c.url === rota ? falha(c, 503) : padrao(c)); montar();
  await screen.findByRole("alert");
  if (rota.endsWith("resumo")) await screen.findByRole("region", { name: "Lista de feedbacks" });
  else await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: "Tentar novamente" })).toHaveLength(1);
});
it.each([[503, 429], [500, 502]])("mantém erros distintos %s/%s separados mesmo com mensagem genérica igual", async (lista, resumo) => {
  adapter(c => falha(c, c.url.endsWith("resumo") ? resumo : lista)); montar();
  await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
  expect(screen.getAllByRole("button", { name: "Tentar novamente" })).toHaveLength(2);
});
it("não agrupa falha antiga com resposta pendente de uma nova consulta", async () => {
  adapter(c => falha(c, 503)); montar(); await screen.findByRole("alert");
  const pendentes = [];
  adapter(c => new Promise(resolve => pendentes.push({ c, resolve })));
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect(pendentes).toHaveLength(2));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Carregando resumo…")).toBeDefined();
  expect(screen.getByText("Carregando lista…")).toBeDefined();
  await act(async () => { for (const p of pendentes) p.resolve(resposta(p.c, p.c.url.endsWith("resumo") ? resumoFeedback(p.c.params) : listaFeedback(p.c.params))); });
  await screen.findByRole("region", { name: "Feedbacks retidos no período" }); expect(screen.queryByRole("alert")).toBeNull();
});
it("cancela leituras antigas e impede respostas atrasadas", async () => {
  const pendentes = []; adapter(c => new Promise(resolve => pendentes.push({ c, resolve }))); montar();
  await waitFor(() => expect(pendentes).toHaveLength(2));
  fireEvent.change(screen.getByLabelText("Tipo de feedback"), { target: { value: "PROBLEMA" } }); fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(pendentes).toHaveLength(4)); expect(pendentes.slice(0, 2).every(p => p.c.signal.aborted)).toBe(true);
  await act(async () => { for (const p of pendentes.slice(2)) p.resolve(resposta(p.c, p.c.url.endsWith("resumo") ? resumoFeedback(p.c.params, "1") : listaFeedback(p.c.params, 1))); });
  await screen.findByText(/1 registros/);
  await act(async () => { for (const p of pendentes.slice(0, 2)) p.resolve(resposta(p.c, p.c.url.endsWith("resumo") ? resumoFeedback(p.c.params, "3") : listaFeedback(p.c.params, 3))); });
  expect(screen.queryByText(/3 registros/)).toBeNull();
});
it.each([404, 503])("detalhe %s pode ser fechado e não mostra comentário", async status => {
  adapter(c => /\/admin\/feedback\/[0-9]/.test(c.url) ? falha(c, status) : padrao(c)); const user = userEvent.setup(); montar();
  await screen.findAllByRole("button", { name: /Detalhes de/ }); await user.click(screen.getAllByRole("button", { name: /Detalhes de/ })[0]);
  await within(screen.getByRole("dialog")).findByRole("alert"); expect(screen.queryByText(/<img/)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Fechar detalhes" })); expect(screen.queryByRole("dialog")).toBeNull();
});
it("filtros inválidos não consultam a API e focalizam data", async () => {
  const spy = api.defaults.adapter; montar(); await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "31/02/2026" } }); fireEvent.submit(screen.getByRole("form"));
  expect(screen.getByRole("alert").textContent).toContain("data válida"); expect(spy).toHaveBeenCalledTimes(2); expect(document.activeElement).toBe(screen.getByLabelText("Data inicial"));
});
it("BigInt usa tabela exata, demo explícita e divergência não é corrigida artificialmente", async () => {
  adapter(c => Promise.resolve(resposta(c, c.url.endsWith("resumo") ? resumoFeedback(c.params, "9007199254740993", { demonstracao: true }) : listaFeedback(c.params)))); montar();
  await screen.findByText(/Demonstração: dados fictícios/); await screen.findAllByText("9.007.199.254.740.993");
  expect(screen.queryByText("Gráfico carregado")).toBeNull(); expect(screen.getByText(/Dados desatualizados/)).toBeDefined();
});
it.each(["ADMIN", "EDITOR", null])("rota e menu exigem ADMIN: %s", async role => {
  if (role) sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify({ token: "f4-test-token", refreshToken: "f4-refresh", sessionId: "f4-session", sessionExpiresAt: new Date(Date.now() + 3600000).toISOString(), user: { id: idFeedback(1), name: "Pessoa sintética", email: "f4@example.test", role } }));
  window.history.replaceState({}, "", "/admin/feedback"); const spy = api.defaults.adapter; render(<App />);
  if (role === "ADMIN") {
    await screen.findByRole("heading", { name: "Feedback do portal" }); expect(screen.getByRole("link", { name: "Feedback do portal" })).toBeDefined();
    await waitFor(() => expect(spy.mock.calls.some(([c]) => c.url === "/admin/feedback" && c.headers.Authorization === "Bearer f4-test-token")).toBe(true));
  } else {
    await screen.findByText(role ? /não tem permissão para acessar essa área/ : "Entrar no painel");
    expect(screen.queryByRole("link", { name: "Feedback do portal" })).toBeNull(); expect(spy.mock.calls.some(([c]) => c.url.startsWith("/admin/feedback"))).toBe(false);
  }
});

// Cobertura de filtros detalhados transferida da visão geral compacta.
it("aplica período/tipo/mês, atualiza filtros aplicados e limpa para os 30 dias iniciais", async () => {
  vi.setSystemTime(new Date("2026-11-26T15:02:00Z"));
  const user = userEvent.setup(), spy = api.defaults.adapter; montar(); await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "01/11/2026" } });
  await user.selectOptions(screen.getByLabelText("Tipo de feedback"), "PROBLEMA");
  await user.selectOptions(screen.getByLabelText("Granularidade"), "mes");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" })); await screen.findByRole("row", { name: "Problema 3" });
  expect(spy.mock.calls.at(-1)[0].params).toEqual({ inicio: "2026-11-01", fim: "2026-11-26", tipo: "PROBLEMA", granularidade: "mes" });
  await user.selectOptions(screen.getByLabelText("Tipo de feedback"), "ELOGIO");
  await user.click(screen.getByRole("button", { name: "Atualizar dados" })); await screen.findByRole("row", { name: "Problema 3" });
  expect(spy.mock.calls.at(-1)[0].params.tipo).toBe("PROBLEMA");
  await user.click(screen.getByRole("button", { name: "Limpar filtros" })); await screen.findByRole("row", { name: "Elogio 3" });
  expect(spy.mock.calls.at(-1)[0].params).toEqual({ inicio: "2026-10-28", fim: "2026-11-26", granularidade: "dia" });
});
it.each([["31/02/2026", "26/11/2026"], ["01/01/2025", "26/11/2026"], ["26/11/2026", "27/11/2026"]])("rejeita período %s–%s, associa erro acessível e foca campo sem consultar", async (inicio, fim) => {
  vi.setSystemTime(new Date("2026-11-26T15:02:00Z"));
  const spy = api.defaults.adapter; montar(); await screen.findByRole("region", { name: "Feedbacks retidos no período" });
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText("Data final"), { target: { value: fim } });
  fireEvent.submit(screen.getByRole("form"));
  const erro = screen.getByRole("alert"), input = screen.getByLabelText("Data inicial");
  expect(input.getAttribute("aria-describedby").split(" ")).toContain(erro.id); expect(document.activeElement).toBe(input); expect(spy).toHaveBeenCalledTimes(2);
});
