import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConhecaMais from "../src/pages/ConhecaMais/ConhecaMais";
import api from "../src/services/api";

vi.mock("../src/hooks/usePatrimoniosContext", () => ({
  usePatrimoniosContext: () => ({ estatisticas: {}, carregando: false }),
}));
const adapter = api.defaults.adapter;
let exposicoes;
beforeEach(() => {
  exposicoes = [];
  api.defaults.adapter = async config => ({ config, status: 200, headers: {},
    data: { success: true, data: { itens: config.url === "/exposicoes" ? exposicoes : [], paginacao: { totalPaginas: 1 } } },
  });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { api.defaults.adapter = adapter; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test.each([undefined, null, "", "   "])("exposição com imagem %s preserva conteúdo e usa alternativa neutra", async imagemUrl => {
  const erros = vi.spyOn(console, "error");
  exposicoes = [{ id: "expo", titulo: "Memórias", imagemUrl, bio: "História da cidade", ctaSaibaMais: "https://example.test/expo" }];
  render(<MemoryRouter><ConhecaMais /></MemoryRouter>);
  const titulo = await screen.findByRole("heading", { name: "Memórias" });
  const card = within(titulo.closest("article"));
  expect(card.getByRole("img", { name: "Imagem indisponível: Memórias" }).getAttribute("src")).toBe("/imagem-indisponivel.svg");
  expect(card.getByText("História da cidade")).toBeTruthy();
  expect(card.getByRole("link", { name: "Saiba mais" }).href).toBe("https://example.test/expo");
  expect(erros.mock.calls.some(args => args.join(" ").includes("empty string"))).toBe(false);
  expect(exposicoes[0].imagemUrl).toBe(imagemUrl);
});

test("URL válida conserva alternativa; falha de carregamento usa fallback sem repetir tentativa", async () => {
  exposicoes = [{ id: "expo", titulo: "Memórias", imagemUrl: "https://example.test/expo.jpg" }];
  render(<MemoryRouter><ConhecaMais /></MemoryRouter>);
  const img = await screen.findByRole("img", { name: "Memórias" });
  expect(img.getAttribute("src")).toBe("https://example.test/expo.jpg");
  fireEvent.error(img);
  expect(img.getAttribute("src")).toBe("/imagem-indisponivel.svg");
  expect(img.alt).toBe("Imagem indisponível: Memórias");
  fireEvent.error(img);
  expect(img.getAttribute("src")).toBe("/imagem-indisponivel.svg");
  expect(exposicoes[0].imagemUrl).toBe("https://example.test/expo.jpg");
});
