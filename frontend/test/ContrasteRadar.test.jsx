import { afterEach, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import GraficosDashboard from "../src/features/admin/components/GraficosDashboard";
import { dashboardFixture } from "./fixtures/dashboard";

function luminancia(rgb) {
  return rgb.map(v => v / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((total, v, i) => total + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contraste(a, b) {
  const valores = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (valores[0] + 0.05) / (valores[1] + 0.05);
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test("escala radial mantém valores e contraste sobre o fundo e a área preenchida", async () => {
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ target, contentRect: { width: 560, height: 280 } }]); }
    unobserve() {} disconnect() {}
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 560, height: 280, top: 0, left: 0, bottom: 280, right: 560 });
  const { container } = render(<GraficosDashboard dados={dashboardFixture()} />);
  await waitFor(() => expect(container.querySelectorAll(".recharts-polar-radius-axis-tick text").length).toBeGreaterThan(0));
  const ticks = [...container.querySelectorAll(".recharts-polar-radius-axis-tick text")];
  expect(ticks.map(e => e.textContent)).toEqual(["0", "1", "2", "3"]);
  for (const tick of ticks) {
    const cor = tick.getAttribute("fill");
    const fill = /^#[a-f\d]{3}$/i.test(cor) ? "#" + [...cor.slice(1)].map(c => c + c).join("") : cor;
    expect(fill).toMatch(/^#[a-f\d]{6}$/i);
    const rgb = fill.match(/[a-f\d]{2}/gi).map(c => parseInt(c, 16));
    for (const fundo of [[255, 255, 255], [216.5, 212.25, 232.25]]) {
      expect(contraste(rgb, fundo)).toBeGreaterThanOrEqual(4.5);
    }
    // Recharts pode pintar a área semitransparente depois do eixo.
    const sobArea = rgb.map((v, i) => v * 0.75 + [101, 84, 164][i] * 0.25);
    expect(contraste(sobArea, [216.5, 212.25, 232.25])).toBeGreaterThanOrEqual(4.5);
  }
  expect(container.querySelectorAll("svg.recharts-surface")).toHaveLength(4);
  expect(container.querySelector(".recharts-radar-polygon")).toBeTruthy();
});
