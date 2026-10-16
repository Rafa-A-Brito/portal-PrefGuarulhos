import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SecoesAcordeao from "../src/pages/PatrimonioDetalhe/SecoesAcordeao";

const secoes = [
  { titulo: "História", icone: "historia", texto: "Texto A\n\nSegundo parágrafo A" },
  { titulo: "Arquitetura", icone: "arquitetura", texto: "Texto B" },
  { titulo: "Memória", icone: "inexistente", texto: "Texto C" },
];
const botao = (nome) => screen.getByRole("button", { name: nome });

test("primeira seção abre por padrão e as demais começam fechadas", () => {
  render(<SecoesAcordeao secoes={secoes} />);
  expect(botao("História").getAttribute("aria-expanded")).toBe("true");
  expect(botao("Arquitetura").getAttribute("aria-expanded")).toBe("false");
  expect(botao("Memória").getAttribute("aria-expanded")).toBe("false");
  const fechado = document.getElementById(botao("Arquitetura").getAttribute("aria-controls"));
  expect(fechado.hasAttribute("inert")).toBe(true);
  expect(fechado.getAttribute("aria-hidden")).toBe("true");
});

test("várias seções ficam abertas ao mesmo tempo e cada uma fecha sozinha", async () => {
  const user = userEvent.setup();
  render(<SecoesAcordeao secoes={secoes} />);
  await user.click(botao("Arquitetura"));
  expect(botao("História").getAttribute("aria-expanded")).toBe("true");
  expect(botao("Arquitetura").getAttribute("aria-expanded")).toBe("true");
  const aberto = document.getElementById(botao("Arquitetura").getAttribute("aria-controls"));
  expect(aberto.hasAttribute("inert")).toBe(false);
  expect(aberto.getAttribute("aria-hidden")).toBe("false");
  await user.click(botao("História"));
  expect(botao("História").getAttribute("aria-expanded")).toBe("false");
  expect(botao("Arquitetura").getAttribute("aria-expanded")).toBe("true");
});

test("teclado (Tab + Enter/Espaço) alterna a seção e aria-controls aponta para o painel", async () => {
  const user = userEvent.setup();
  render(<SecoesAcordeao secoes={secoes} />);
  await user.tab();
  expect(document.activeElement).toBe(botao("História"));
  await user.tab();
  await user.keyboard("{Enter}");
  expect(botao("Arquitetura").getAttribute("aria-expanded")).toBe("true");
  await user.keyboard(" ");
  expect(botao("Arquitetura").getAttribute("aria-expanded")).toBe("false");
  const painel = document.getElementById(botao("História").getAttribute("aria-controls"));
  expect(painel.textContent).toContain("Segundo parágrafo A");
});

test("título é h2 e o texto é renderizado como texto, em parágrafos", () => {
  render(<SecoesAcordeao secoes={[{ titulo: "X", texto: "<b>não</b>\n\nfim" }]} />);
  expect(screen.getByRole("heading", { level: 2, name: "X" })).toBeTruthy();
  expect(screen.getByText("<b>não</b>")).toBeTruthy();
});
