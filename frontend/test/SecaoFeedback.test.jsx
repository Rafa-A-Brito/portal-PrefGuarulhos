import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "../src/features/admin/pages/AdminDashboard";
import SecaoFeedback from "../src/features/admin/components/SecaoFeedback";
import api from "../src/services/api";
import { dashboardFixture } from "./fixtures/dashboard";
import { resumoFeedback } from "./fixtures/feedback_admin";

const auth = vi.hoisted(() => ({ perfil: "ADMIN" }));
vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => ({ usuario: auth.perfil ? { perfil: auth.perfil, nome: "Pessoa sintética" } : null }) }));
vi.mock("../src/features/admin/components/GraficosDashboard", () => ({ default: () => <p>Gráficos do acervo disponíveis</p> }));
vi.mock("../src/features/admin/components/FeedbackGraficos", () => ({ default: ({ temporal }) => <p>{temporal ? "Gráfico temporal" : "Gráfico de tipos"}</p> }));
const original = api.defaults.adapter;
const resposta = (config, data) => ({ config, status: 200, headers: {}, data: { success: true, data } });
function padrao(c) {
  return Promise.resolve(resposta(c, c.url === "/admin/dashboard" ? dashboardFixture() : resumoFeedback(c.params, "5")));
}
const montar = () => render(<MemoryRouter><SecaoFeedback /></MemoryRouter>);
const dashboard = () => render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
beforeEach(() => { auth.perfil = "ADMIN"; vi.setSystemTime(new Date("2026-11-26T15:02:00Z")); api.defaults.adapter = vi.fn(padrao); });
afterEach(() => { api.defaults.adapter = original; vi.useRealTimers(); vi.restoreAllMocks(); });

test("ADMIN consulta somente resumo, inicia com 30 dias de São Paulo e mostra tabelas, atualização e link", async () => {
  const spy = api.defaults.adapter; dashboard();
  const secao = screen.getByRole("region", { name: "Feedback e participação do público" });
  expect(within(secao).getByRole("status").textContent).toContain("Carregando resumo");
  await within(secao).findByText("Gráfico temporal");
  expect(spy.mock.calls.map(([c]) => c.url).sort()).toEqual(["/admin/dashboard", "/admin/feedback/resumo"]);
  const consulta = spy.mock.calls.find(([c]) => c.url.endsWith("resumo"))[0];
  expect(consulta.params).toEqual({ inicio: "2026-10-28", fim: "2026-11-26", granularidade: "dia" });
  expect(within(secao).getByLabelText("Data inicial").value).toBe("28/10/2026");
  expect(within(secao).getByRole("row", { name: "Elogio 5" })).toBeTruthy();
  expect(within(secao).getByRole("row", { name: "Sugestão 0" })).toBeTruthy();
  expect(within(secao).getByRole("row", { name: "Problema 0" })).toBeTruthy();
  expect(within(secao).getByText(/Resumo consultado em/).textContent).toContain("26/11/2026, 12:00:00");
  expect(within(secao).getByRole("link").getAttribute("href")).toBe("/admin/feedback");
});
test.each(["EDITOR", null])("perfil %s não monta seção nem dispara requisição de Feedback", async perfil => {
  auth.perfil = perfil; const spy = api.defaults.adapter; dashboard(); await screen.findByText("Gráficos do acervo disponíveis");
  expect(screen.queryByRole("region", { name: "Feedback e participação do público" })).toBeNull();
  expect(spy.mock.calls.map(([c]) => c.url)).toEqual(["/admin/dashboard"]);
});
test.each([401, 403, 503, "rede"])("falha %s não inventa zero, expõe corpo nem compromete acervo/métricas", async status => {
  api.defaults.adapter = vi.fn(c => c.url === "/admin/dashboard" ? padrao(c) : Promise.reject(status === "rede" ? Error("SEGREDO") : { config: c, response: { status, data: { message: "SEGREDO" } } }));
  dashboard(); await screen.findByRole("alert"); await screen.findByText("Gráficos do acervo disponíveis");
  expect(screen.getByRole("button", { name: "Consultar visualizações" })).toBeTruthy();
  expect(screen.queryByText(/Total:/)).toBeNull(); expect(screen.queryByText(/SEGREDO/)).toBeNull();
  expect(Boolean(screen.queryByRole("button", { name: "Tentar novamente" }))).toBe(![401, 403].includes(status));
});
test("desativação e vazio legítimo são diferentes e independentes da flag pública", async () => {
  vi.stubEnv("VITE_FEEDBACK_ATIVO", "false");
  api.defaults.adapter = c => Promise.resolve(resposta(c, { disponivel: false, motivo: "DESATIVADA" }));
  const view = montar(); await screen.findByText(/Consulta de feedback desativada/); expect(screen.queryByText(/Total:/)).toBeNull();
  api.defaults.adapter = c => Promise.resolve(resposta(c, resumoFeedback(c.params, "0")));
  fireEvent.click(screen.getByRole("button", { name: "Atualizar dados" })); await screen.findByText(/Nenhum feedback retido/);
  expect(screen.getByText(/Total:/).textContent).toBe("Total: 0"); expect(screen.queryByText("Gráfico temporal")).toBeNull();
  view.unmount(); vi.unstubAllEnvs();
});
test("aplica período/tipo/mês, atualiza filtros aplicados e limpa para os 30 dias iniciais", async () => {
  const user = userEvent.setup(), spy = api.defaults.adapter; montar(); await screen.findByText(/Total:/);
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "01/11/2026" } });
  await user.selectOptions(screen.getByLabelText("Tipo de feedback"), "PROBLEMA");
  await user.selectOptions(screen.getByLabelText("Granularidade"), "mes");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" })); await screen.findByRole("row", { name: "Problema 5" });
  expect(spy.mock.calls.at(-1)[0].params).toEqual({ inicio: "2026-11-01", fim: "2026-11-26", tipo: "PROBLEMA", granularidade: "mes" });
  await user.selectOptions(screen.getByLabelText("Tipo de feedback"), "ELOGIO");
  await user.click(screen.getByRole("button", { name: "Atualizar dados" })); await screen.findByRole("row", { name: "Problema 5" });
  expect(spy.mock.calls.at(-1)[0].params.tipo).toBe("PROBLEMA");
  await user.click(screen.getByRole("button", { name: "Limpar filtros" })); await screen.findByRole("row", { name: "Elogio 5" });
  expect(spy.mock.calls.at(-1)[0].params).toEqual({ inicio: "2026-10-28", fim: "2026-11-26", granularidade: "dia" });
});
test.each([["31/02/2026", "26/11/2026"], ["01/01/2025", "26/11/2026"], ["26/11/2026", "27/11/2026"]])("rejeita período %s–%s, associa erro acessível e foca campo sem consultar", async (inicio, fim) => {
  const spy = api.defaults.adapter; montar(); await screen.findByText(/Total:/);
  fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText("Data final"), { target: { value: fim } });
  fireEvent.submit(screen.getByRole("form"));
  const erro = screen.getByRole("alert"), input = screen.getByLabelText("Data inicial");
  expect(input.getAttribute("aria-describedby").split(" ")).toContain(erro.id); expect(document.activeElement).toBe(input); expect(spy).toHaveBeenCalledTimes(1);
});
test("cancela leitura antiga e desmontagem, ignora resposta atrasada e oculta fotografia anterior", async () => {
  const pendentes = []; api.defaults.adapter = c => new Promise(resolve => pendentes.push({ c, resolve }));
  const view = montar(); await waitFor(() => expect(pendentes).toHaveLength(1));
  fireEvent.change(screen.getByLabelText("Tipo de feedback"), { target: { value: "SUGESTAO" } });fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(pendentes).toHaveLength(2));expect(pendentes[0].c.signal.aborted).toBe(true);
  await act(async () => pendentes[1].resolve(resposta(pendentes[1].c, resumoFeedback(pendentes[1].c.params, "2"))));await screen.findByRole("row", { name: "Sugestão 2" });
  await act(async () => pendentes[0].resolve(resposta(pendentes[0].c, resumoFeedback(pendentes[0].c.params, "99"))));expect(screen.queryByText("99")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Atualizar dados" }));expect(screen.queryByText(/Total:/)).toBeNull();
  await waitFor(() => expect(pendentes).toHaveLength(3));view.unmount();expect(pendentes[2].c.signal.aborted).toBe(true);
});
test("erro de atualização remove total antigo e recuperação mantém recorte aplicado", async () => {
  montar();await screen.findByText(/Total:/);
  api.defaults.adapter = c => Promise.reject({ config: c, response: { status: 503 } });
  fireEvent.click(screen.getByRole("button", { name: "Atualizar dados" }));await screen.findByRole("alert");expect(screen.queryByText(/Total:/)).toBeNull();
  api.defaults.adapter = vi.fn(padrao);fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));await screen.findByText(/Total:/);
  expect(api.defaults.adapter.mock.calls[0][0].params.inicio).toBe("2026-10-28");
});
test("preserva BigInt, retenção e marca dados antigos, sem arredondar gráficos", async () => {
  api.defaults.adapter = c => { const d = resumoFeedback(c.params, "9007199254740993");d.meta.recorteLimitadoPorRetencao = true; d.meta.geradoEm = "2026-11-26T14:00:00Z";return Promise.resolve(resposta(c,d)); };
  montar();await screen.findAllByText("9.007.199.254.740.993");expect(screen.queryByText("Gráfico temporal")).toBeNull();
  expect(screen.getByText(/Período limitado pela retenção de 180/)).toBeTruthy();expect(screen.getByText(/Dados desatualizados/)).toBeTruthy();
});
test("resumo inconsistente falha sem publicar total inventado", async () => {
  api.defaults.adapter = c => Promise.resolve(resposta(c,{ ...resumoFeedback(c.params), total: "9" }));montar();await screen.findByRole("alert");expect(screen.queryByText(/Total:/)).toBeNull();
});
