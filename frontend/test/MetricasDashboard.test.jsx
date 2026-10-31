import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MetricasDashboard from "../src/features/admin/components/MetricasDashboard";
import AdminDashboard from "../src/features/admin/pages/AdminDashboard";
import api from "../src/services/api";
import { metricasFixture } from "./fixtures/metricas_dashboard";
import { dashboardFixture } from "./fixtures/dashboard";

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ usuario: { nome: "Editor", perfil: "EDITOR" } }),
}));
const original = api.defaults.adapter;
let calls, resposta, falhar;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
  calls = [];
  falhar = false;
  resposta = null;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(fn) {
        this.fn = fn;
      }
      observe(target) {
        this.fn([{ target, contentRect: { width: 560, height: 360 } }]);
      }
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width: 560,
    height: 360,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 560,
    bottom: 360,
  });
  api.defaults.adapter = async (c) => {
    calls.push(c);
    let data;
    if (c.url === "/admin/dashboard") data = dashboardFixture();
    else if (c.url === "/admin/dashboard/metricas") {
      if (falhar) throw new Error("offline");
      data = resposta ?? metricasFixture(c.params.inicio, c.params.fim);
    } else
      data = {
        itens:
          c.url === "/admin/regioes"
            ? metricasFixture().visualizacoes.porRegiao
            : metricasFixture().visualizacoes.porPatrimonio.itens,
      };
    return {
      config: c,
      data: { success: true, data },
      status: 200,
      statusText: "OK",
      headers: {},
    };
  };
});
afterEach(() => {
  api.defaults.adapter = original;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const pronto = () =>
  screen.findByRole("heading", { name: "Patrimônios mais visualizados" });
const chamadas = () =>
  calls.filter((c) => c.url === "/admin/dashboard/metricas");

test("contrato administrativo, três gráficos reais, totais, cobertura, tabela e dia parcial", async () => {
  sessionStorage.setItem(
    "guarulhos.admin.sessao",
    JSON.stringify({ token: "fixture-admin" }),
  );
  const { container } = render(<MetricasDashboard />);
  expect(screen.getByRole("status").textContent).toContain("Carregando");
  await pronto();
  expect(chamadas()[0].params).toEqual({
    inicio: "2026-09-27",
    fim: "2026-10-26",
    pagina: 1,
    limite: 10,
  });
  expect(chamadas()[0].signal).toBeInstanceOf(AbortSignal);
  expect(chamadas()[0].headers.get("Authorization")).toBe(
    "Bearer fixture-admin",
  );
  expect(screen.getByText(/Total registrado/).textContent).toContain("12");
  expect(screen.getByText(/Cobertura não instrumentada/)).toBeTruthy();
  expect(screen.getByText(/Não representa visitantes únicos/)).toBeTruthy();
  expect(screen.getByText(/Dia 26\/10\/2026 parcial/)).toBeTruthy();
  expect(screen.getByText("Sem região: 2")).toBeTruthy();
  expect(
    screen.getByText("Favoritos globais indisponíveis nesta fase."),
  ).toBeTruthy();
  expect(
    screen.getByRole("row", { name: "26/10/2026 (parcial) 5" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("row", { name: "25/10/2026 Sem dado disponível" }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(container.querySelectorAll("svg.recharts-surface").length).toBe(3),
  );
  const ranking = screen.getByRole("region", {
    name: "Patrimônios mais visualizados",
  });
  const svg = ranking.querySelector("svg.recharts-surface");
  fireEvent.focus(svg);
  fireEvent.keyDown(svg, { key: "ArrowRight" });
  await waitFor(() =>
    expect(
      ranking.querySelector(".recharts-tooltip-wrapper").textContent,
    ).toMatch(/Casa de teste|Bem arquivado/),
  );
  expect(
    ranking
      .querySelector('.recharts-tooltip-wrapper [role="status"]')
      .getAttribute("aria-live"),
  ).toBe("polite");
});
test.each([false, "zero", "ausente", "rede"])(
  "estado %s é separado de dados válidos",
  async (modo) => {
    if (modo === false) resposta = { disponivel: false, motivo: "DESATIVADA" };
    if (modo === "zero") {
      resposta = metricasFixture("2026-09-27");
      resposta.visualizacoes = {
        totalRegistrado: "0",
        semRegiao: "0",
        porRegiao: [],
        serie: [],
        porPatrimonio: {
          itens: [],
          paginacao: { pagina: 1, limite: 10, total: 0 },
        },
      };
    }
    if (modo === "ausente") resposta = {};
    if (modo === "rede") falhar = true;
    const { container } = render(<MetricasDashboard />);
    if (modo === false)
      await screen.findByText("Métricas ainda não habilitadas");
    else if (modo === "zero")
      await screen.findByText(/Nenhum evento registrado/);
    else {
      await screen.findByRole("alert");
      expect(screen.queryByText(/Nenhum evento registrado/)).toBeNull();
    }
    expect(container.querySelector("svg.recharts-surface")).toBeNull();
    resposta = null;
    falhar = false;
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar visualizações" }),
    );
    await pronto();
  },
);
test("período inválido não consulta; filtros omitem granularidade e são mutuamente exclusivos", async () => {
  render(<MetricasDashboard />);
  await pronto();
  fireEvent.change(screen.getByLabelText("Data inicial"), {
    target: { value: "2024-01-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  expect(screen.getByRole("alert").textContent).toContain("366");
  expect(chamadas()).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Data inicial"), {
    target: { value: "2026-10-24" },
  });
  fireEvent.click(screen.getByText("Filtrar por patrimônio ou região"));
  fireEvent.click(screen.getByRole("button", { name: "Buscar patrimônio" }));
  await screen.findByRole("option", { name: "Casa de teste (PUBLICADO)" });
  fireEvent.change(screen.getByLabelText("Patrimônio (opcional)"), {
    target: {
      value: metricasFixture().visualizacoes.porPatrimonio.itens[0].id,
    },
  });
  fireEvent.change(screen.getByLabelText("Região (opcional)"), {
    target: { value: "sem-regiao" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await pronto();
  expect(chamadas().at(-1).params).toMatchObject({
    inicio: "2026-10-24",
    pagina: 1,
    semRegiao: "true",
    patrimonioId: expect.any(String),
  });
  expect(chamadas().at(-1).params).not.toHaveProperty("regiaoId");
  expect(chamadas().at(-1).params).not.toHaveProperty("granularidade");
  fireEvent.click(screen.getByRole("button", { name: "Buscar região" }));
  await screen.findByRole("option", { name: "Centro" });
  fireEvent.change(screen.getByLabelText("Região (opcional)"), {
    target: { value: metricasFixture().visualizacoes.porRegiao[0].id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await pronto();
  expect(chamadas().at(-1).params).toHaveProperty("regiaoId");
  expect(chamadas().at(-1).params).not.toHaveProperty("semRegiao");
});
test("paginação mantém o total do período; segunda página não vira total global", async () => {
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = async (c) => {
    const r = await originalAdapter(c);
    if (c.url.endsWith("/metricas")) {
      const all = Array.from({ length: 12 }, (_, i) => ({
        id: "id" + i,
        nome: "Bem " + i,
        quantidade: "1",
      }));
      r.data.data.visualizacoes.porPatrimonio = {
        itens: all.slice((c.params.pagina - 1) * 10, c.params.pagina * 10),
        paginacao: { pagina: c.params.pagina, limite: 10, total: 12 },
      };
    }
    return r;
  };
  render(<MetricasDashboard />);
  await pronto();
  fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
  await screen.findByText(/página 2 de 2/);
  expect(chamadas().at(-1).params.pagina).toBe(2);
  expect(screen.getByText(/Total registrado/).textContent).toContain("12");
  expect(
    within(
      screen.getByRole("table", { name: /Ranking desta página/ }),
    ).getAllByRole("row"),
  ).toHaveLength(3);
});
test("valores acima do limite seguro aparecem exatos e não desenham gráficos", async () => {
  resposta = metricasFixture("2026-09-27");
  const v = resposta.visualizacoes,
    grande = "9007199254740993";
  v.totalRegistrado = grande;
  v.semRegiao = "0";
  v.porRegiao[0].quantidade = grande;
  v.serie = [{ data: "2026-10-26", quantidade: grande }];
  v.porPatrimonio.itens = [{ ...v.porPatrimonio.itens[0], quantidade: grande }];
  v.porPatrimonio.paginacao.total = 1;
  const { container } = render(<MetricasDashboard />);
  await pronto();
  expect(screen.getAllByText("9.007.199.254.740.993").length).toBe(4);
  expect(screen.getAllByText(/Gráfico não exibido/)).toHaveLength(3);
  expect(container.querySelector("svg.recharts-surface")).toBeNull();
});
test("V1 permanece com quatro gráficos quando V2 falha; carregamento sob demanda", async () => {
  falhar = true;
  const { container } = render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Situação de conservação" });
  expect(chamadas()).toHaveLength(0);
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar visualizações" }),
  );
  await screen.findByRole("alert");
  expect(container.querySelectorAll("svg.recharts-surface")).toHaveLength(4);
  expect(calls.filter((c) => c.url === "/admin/dashboard")).toHaveLength(1);
});
test("desmontagem cancela a consulta V2", async () => {
  let signal;
  api.defaults.adapter = (c) => {
    signal = c.signal;
    return new Promise(() => {});
  };
  const view = render(<MetricasDashboard />);
  await waitFor(() => expect(signal).toBeTruthy());
  view.unmount();
  expect(signal.aborted).toBe(true);
});

test("cobertura observada distingue falha, coleta desativada e ausência; preserva gráficos e totais", async () => {
  resposta = metricasFixture("2026-09-27");
  const resumo = {
    esperadas: 4,
    disponiveis: 1,
    desativadas: 1,
    falhas: 1,
    desconhecidas: 1,
  };
  Object.assign(resposta.meta, {
    cobertura: "SONDAGEM_5_MIN",
    inicioDisponivel: "2025-09-26",
    observacao: {
      inicioObservacao: "2026-10-26T03:00:00Z",
      resumo,
      porDia: [
        { data: "2026-10-26", parcial: true, estado: "PARCIAL", ...resumo },
      ],
    },
  });
  const { container } = render(<MetricasDashboard />);
  await pronto();
  expect(screen.getByText(/Cobertura por sondagem/)).toBeTruthy();
  expect(
    screen.getByText(/coleta desativada: 1; falhas: 1; sem observação: 1/),
  ).toBeTruthy();
  expect(screen.getByText(/Início da coleta não certificado/)).toBeTruthy();
  expect(
    screen.getByText(/dados anteriores a 26\/09\/2025 indisponíveis/),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Cobertura diária"));
  expect(
    screen.getByRole("row", {
      name: "26/10/2026 (parcial) Cobertura parcial 4 1 1 1 1",
    }),
  ).toBeTruthy();
  expect(screen.getByText(/Total registrado/).textContent).toContain("12");
  expect(container.querySelectorAll("svg.recharts-surface")).toHaveLength(3);
});
