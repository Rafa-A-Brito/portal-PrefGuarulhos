import { afterEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import GraficosDashboard from "../src/features/admin/components/GraficosDashboard";
import { dashboardFixture } from "./fixtures/dashboard";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
test("os quatro SVGs interativos preservam nomes e conteúdo após atualizar os dados", async () => {
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ target, contentRect: { width: 560, height: 280 } }]); }
    unobserve() {} disconnect() {}
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 560, height: 280, top: 0, left: 0, bottom: 280, right: 560 });
  const dados = dashboardFixture();
  const { rerender } = render(<GraficosDashboard dados={dados} />);
  const nomes = ["Situação de conservação", "Distribuição por região", "Categorias principais", "Status de publicação"];
  async function conferir() {
    await waitFor(() => expect(screen.getAllByRole("application")).toHaveLength(4));
    for (const nome of nomes) {
      const grafico = screen.getByRole("application", { name: nome });
      expect(grafico.tagName.toLowerCase()).toBe("svg");
      expect(grafico.getAttribute("tabindex")).toBe("0");
    }
    expect(screen.getByRole("table", { name: /Quantidades por categoria/ })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Quantidades: Distribuição por região" })).toBeTruthy();
  }
  await conferir();
  rerender(<GraficosDashboard dados={{ ...dados, total: dados.total + 1, porRegiao: dados.porRegiao.map((r, i) => ({ ...r, quantidade: r.quantidade + (i === 0 ? 1 : 0) })) }} />);
  await conferir();
});
