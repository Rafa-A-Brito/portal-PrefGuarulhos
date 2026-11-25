import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import ConhecaMaisDetalhes from "../src/pages/ConhecaMaisDetalhes/ConhecaMaisDetalhes";
import { useConteudoPublico } from "../src/hooks/useConteudoPublico";

vi.mock("../src/hooks/useConteudoPublico");
const originalModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
const originalScroll = Element.prototype.scrollIntoView;
let desktop;
const itens = [1, 2].map(i => ({ id: `noticia-${i}`, titulo: `Notícia ${i}`, data: "2026-11-20", tipo: "NOTICIA", texto: "Conteúdo", bloco: { dia: "20", mes: "NOV" }, fontes: [] }));
function Localizacao() { return <output data-testid="hash">{useLocation().hash}</output>; }
const montar = () => render(<MemoryRouter><ConhecaMaisDetalhes /><Localizacao /></MemoryRouter>);
beforeEach(() => {
  useConteudoPublico.mockReturnValue({ itens, carregando: false, erro: null });
  desktop = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("matchMedia", q => q.includes("1100px") ? desktop : { matches: true });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("scrollY", 400);
  Element.prototype.scrollIntoView = vi.fn();
  // JSDOM não implementa a camada modal/inert. O roteiro de navegador cobre isso.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
});
afterEach(() => {
  cleanup(); document.body.style.overflow = ""; vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalScroll) Element.prototype.scrollIntoView = originalScroll; else delete Element.prototype.scrollIntoView;
  if (originalModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalModal); else delete HTMLDialogElement.prototype.showModal;
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose); else delete HTMLDialogElement.prototype.close;
});
async function abrir() {
  const user = userEvent.setup(); fireEvent.scroll(window);
  const acionador = screen.getByRole("button", { name: /Abrir índice/ });
  acionador.focus(); await user.keyboard("{Enter}");
  return { user, acionador, modal: screen.getByRole("dialog", { name: "Nesta página" }) };
}
it("Enter abre com foco no fechamento; Tab e Shift+Tab contornam os limites do painel", async () => {
  montar(); const { user, modal } = await abrir();
  const fechar = within(modal).getByRole("button", { name: "Fechar índice" });
  const links = within(modal).getAllByRole("link");
  expect(document.activeElement).toBe(fechar); expect(modal.open).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  await user.tab({ shift: true }); expect(document.activeElement).toBe(links.at(-1));
  await user.tab(); expect(document.activeElement).toBe(fechar);
  await user.tab(); expect(document.activeElement).toBe(links[0]);
  expect(modal.querySelector(".detalhes-painel-fundo").tabIndex).toBe(-1);
});
it.each(["cancel", "botao", "fundo"])("fecha por %s, restaura foco e o overflow anterior", async modo => {
  document.body.style.overflow = "scroll"; montar(); const { user, modal, acionador } = await abrir();
  if (modo === "cancel") fireEvent(modal, new Event("cancel", { cancelable: true }));
  else if (modo === "botao") await user.click(within(modal).getByRole("button", { name: "Fechar índice" }));
  else fireEvent.click(modal.querySelector(".detalhes-painel-fundo"));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(document.activeElement).toBe(acionador);
  expect(document.body.style.overflow).toBe("scroll");
});
it("o link mantém a âncora da notícia, fecha o painel e permite nova abertura", async () => {
  montar(); const { user, modal, acionador } = await abrir();
  await user.click(within(modal).getAllByRole("link")[1]);
  expect(screen.getByTestId("hash").textContent).toBe("#noticia-2");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull(); expect(document.activeElement).toBe(acionador);
  await user.keyboard("{Enter}"); expect(screen.getByRole("dialog").open).toBe(true);
});
it("índice vazio mantém fechamento acessível e Tab no único controle", async () => {
  useConteudoPublico.mockReturnValue({ itens: [], carregando: false, erro: null });
  montar(); const { user, modal } = await abrir(); const fechar = within(modal).getByRole("button", { name: "Fechar índice" });
  await user.tab(); expect(document.activeElement).toBe(fechar);
  await user.tab({ shift: true }); expect(document.activeElement).toBe(fechar);
});
it("ao mudar para desktop fecha e remove o listener; desmontagem também restaura rolagem", async () => {
  const view = montar(); await abrir();
  const listener = desktop.addEventListener.mock.calls[0][1];
  desktop.matches = true;
  act(() => listener({ matches: true }));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(document.body.style.overflow).toBe("");
  expect(desktop.removeEventListener).toHaveBeenCalledWith("change", listener);
  expect(document.activeElement).toBe(document.querySelector(".detalhes-rail a"));
  desktop.matches = false;
  await abrir(); view.unmount(); expect(document.body.style.overflow).toBe("");
});
