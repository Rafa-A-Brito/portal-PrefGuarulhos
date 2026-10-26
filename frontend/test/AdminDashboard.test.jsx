import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "../src/features/admin/pages/AdminDashboard";
import GraficosDashboard from "../src/features/admin/components/GraficosDashboard";
import api from "../src/services/api";
import { dashboardFixture } from "./fixtures/dashboard";

const flags = vi.hoisted(() => ({ perfil: "ADMIN" }));
vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => ({ usuario: { nome: "Pessoa teste", perfil: flags.perfil } }) }));
const originalAdapter = api.defaults.adapter;
let fixture, calls;
beforeEach(() => {
  flags.perfil = "ADMIN"; fixture = dashboardFixture(); calls = [];
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ target, contentRect: { width: 560, height: 280 } }]); }
    unobserve() {} disconnect() {}
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 560, height: 280, top: 0, left: 0, bottom: 280, right: 560 });
  api.defaults.adapter = async config => {
    calls.push(config);
    return { config, data: { success: true, data: fixture }, status: 200, statusText: "OK", headers: {} };
  };
});
afterEach(() => { api.defaults.adapter = originalAdapter; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const montar = () => render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

test("consulta endpoint agregado e renderiza quatro gráficos reais com totais dinâmicos", async () => {
  const { container } = montar();
  expect(screen.getByRole("status").textContent).toMatch(/Carregando dados/);
  await screen.findByRole("heading", { name: "Situação de conservação" });
  expect(calls.map(c => [c.method, c.url])).toEqual([["get", "/admin/dashboard"]]);
  await waitFor(() => expect(container.querySelectorAll("svg.recharts-surface").length).toBe(4));
  expect(screen.getByText("8 registros · todos os status")).toBeTruthy();
  const conservacao = screen.getByRole("region", { name: "Situação de conservação" });
  expect(within(conservacao).getByRole("list").children.length).toBe(6);
  expect(within(conservacao).getByText("Total representado: 8")).toBeTruthy();
  const publicacao = screen.getByRole("region", { name: "Status de publicação" });
  const itens = within(publicacao).getByRole("list").children;
  expect([...itens].map(i => i.textContent)).toEqual(["Publicado5", "Rascunho1", "Arquivado2"]);
  expect(within(publicacao).getByText("Total representado: 8")).toBeTruthy();
  expect(screen.getByText("6 com região + 2 sem região = 8 patrimônios")).toBeTruthy();
  expect(screen.queryByText("Bairro que não é região")).toBeNull();
  expect(screen.getByText(/2 registros legados identificados/)).toBeTruthy();
  fireEvent.click(screen.getByText(/2 registros legados identificados/));
  expect(screen.getByText("Casarão da Nossa História")).toBeTruthy();
  expect(screen.getByText("Casarão do Sítio Ponte Alta")).toBeTruthy();
  const table = screen.getByRole("table");
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows.length).toBe(7);
  expect(rows.reduce((n, row) => n + Number(within(row).getAllByRole("cell")[0].textContent), 0)).toBe(8);
  expect(within(table).getByRole("row", { name: "Ferroviário 0 3" })).toBeTruthy();
  // Valores zero têm rótulo/tabela, mas não uma barra com largura inventada.
  expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBe(4);
  expect(container.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick").length).toBe(7);
});

test("erro oferece nova tentativa sem apresentar zeros inventados", async () => {
  const adapter = api.defaults.adapter;
  api.defaults.adapter = async () => { throw new Error("offline"); };
  montar();
  expect((await screen.findByRole("alert")).textContent).toMatch(/servidor/);
  expect(screen.queryByRole("heading", { name: "Nenhum patrimônio cadastrado" })).toBeNull();
  api.defaults.adapter = adapter;
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByRole("heading", { name: "Status de publicação" });
  expect(screen.queryByRole("alert")).toBeNull();
});

test("acervo vazio não desenha donuts com valores fictícios; EDITOR mantém acesso", async () => {
  flags.perfil = "EDITOR";
  fixture.total = fixture.PUBLICADO = fixture.RASCUNHO = fixture.ARQUIVADO = fixture.semRegiao = 0;
  fixture.legados = { total: 0, arquivados: 0, itens: [] };
  for (const serie of [fixture.porCategoria, fixture.porSituacao, fixture.porRegiao]) serie.forEach(i => { i.quantidade = 0; i.quantidadeSecundaria = 0; });
  const { container } = montar();
  await screen.findByRole("heading", { name: "Nenhum patrimônio cadastrado" });
  expect(container.querySelector("svg.recharts-surface")).toBeNull();
  expect(screen.queryByRole("link", { name: /Cadastrar administrador/ })).toBeNull();
});

test("todos sem região permanecem fora do radar e categorias vazias continuam visíveis", () => {
  fixture.porRegiao.forEach(r => { r.quantidade = 0; }); fixture.semRegiao = fixture.total;
  render(<GraficosDashboard dados={fixture} />);
  expect(screen.getByText("Nenhum patrimônio com região atribuída.")).toBeTruthy();
  expect(screen.getByText("0 com região + 8 sem região = 8 patrimônios")).toBeTruthy();
  expect(within(screen.getByRole("list", { name: "Quantidades: Distribuição por região" })).getAllByRole("listitem").length).toBe(3);
  expect(screen.getByRole("row", { name: "Histórico 0 4" })).toBeTruthy();
});

test("desmontagem cancela requisição pendente", async () => {
  let signal;
  api.defaults.adapter = config => { signal = config.signal; return new Promise(() => {}); };
  const { unmount } = montar();
  await waitFor(() => expect(signal).toBeTruthy());
  unmount(); expect(signal.aborted).toBe(true);
});
