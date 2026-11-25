import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import Mapa from "../src/pages/Mapa/Mapa";

vi.mock("../src/hooks/useGoogleMaps", () => ({
  GOOGLE_MAPS_MAP_ID: "", useGoogleMaps: () => ({ configurado: false, pronto: false }),
}));
const itens = [
  { id: "1", nome: "Casa antiga", categoria: "historico" },
  { id: "2", nome: "Parque", categoria: "ambiental" },
];
function pagina(extra = {}) {
  return <MemoryRouter><PatrimoniosContext.Provider value={{ patrimonios: itens, setSelecionado: vi.fn(), ...extra }}><Mapa /></PatrimoniosContext.Provider></MemoryRouter>;
}
const esperar = ms => act(() => vi.advanceTimersByTime(ms));
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

test("anuncia total, singular, vazio e limpeza sem mover foco", () => {
  render(pagina());
  const status = screen.getByRole("status"), campo = screen.getByPlaceholderText(/Pesquisar por nome/);
  expect(status.getAttribute("aria-atomic")).toBe("true");
  esperar(400); expect(status.textContent).toContain("2 patrimônios encontrados");
  campo.focus();
  for (const [busca, texto] of [["Casa", "1 patrimônio encontrado"], ["ausente", "Nenhum patrimônio encontrado"], ["", "2 patrimônios encontrados"]]) {
    fireEvent.change(campo, { target: { value: busca } });
    esperar(400); expect(status.textContent).toContain(texto); expect(document.activeElement).toBe(campo);
  }
});

test("espera a última tecla e não anuncia a lista inteira", () => {
  render(pagina()); esperar(400);
  const campo = screen.getByPlaceholderText(/Pesquisar por nome/), status = screen.getByRole("status");
  fireEvent.change(campo, { target: { value: "Ca" } }); esperar(300);
  fireEvent.change(campo, { target: { value: "Casa" } }); esperar(300);
  expect(status.textContent).toContain("2 patrimônios encontrados");
  esperar(100); expect(status.textContent).toContain("1 patrimônio encontrado");
  expect(status.textContent).not.toContain("Casa antiga");
  expect(screen.getAllByRole("status")).toHaveLength(1);
});

test("atualiza categoria e dados, sem confundir carregamento ou erro com vazio", () => {
  const { rerender, unmount } = render(pagina()); esperar(400);
  fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
  fireEvent.click(screen.getByRole("button", { name: "Ambiental" })); esperar(400);
  expect(screen.getByRole("status").textContent).toContain("1 patrimônio encontrado");
  rerender(pagina({ carregando: true }));
  expect(screen.getByRole("status").textContent).toContain("Carregando");
  rerender(pagina({ erro: "Falha de consulta" })); esperar(400);
  expect(screen.getByRole("status").textContent).toBe("");
  expect(screen.getByRole("alert").textContent).toContain("Falha de consulta");
  rerender(pagina({ patrimonios: [] })); esperar(400);
  expect(screen.getByRole("status").textContent).toContain("Nenhum patrimônio encontrado");
  unmount(); expect(vi.getTimerCount()).toBe(0);
});
