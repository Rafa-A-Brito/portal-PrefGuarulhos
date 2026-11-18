import { afterEach, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import Inicio from "../src/pages/Inicio/Inicio";
import { heroDestaqueMock } from "../src/features/mocks/destaquesMock";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";

const itens = [
  { id: "com-imagem", nome: "Casa histórica", imagemPrincipal: "/casa.jpg" },
  { id: "sem-imagem", nome: "Bem sem imagem", imagemPrincipal: "" },
].map(item => ({ categoria: "historico", bairro: "Centro", ...item }));

function LocalAtual() {
  const location = useLocation();
  return <output data-testid="local">{location.pathname + location.search}</output>;
}
function inicio(patrimonios = itens, carregando = false) {
  return render(<MemoryRouter><PatrimoniosContext.Provider value={{ patrimonios, carregando }}>
    <Inicio /><LocalAtual />
  </PatrimoniosContext.Provider></MemoryRouter>);
}
afterEach(() => vi.restoreAllMocks());

test.each([itens, []].map(patrimonios => ({ patrimonios })))("card flutuante restaura o mock sem depender do catálogo: $patrimonios", ({ patrimonios }) => {
  const { container } = inicio(patrimonios);
  const card = container.querySelector(".hero-float-card");
  expect(within(card).getByText(heroDestaqueMock.nome)).toBeTruthy();
  expect(within(card).getByText(heroDestaqueMock.bairro)).toBeTruthy();
  expect(within(card).getByText(heroDestaqueMock.resumo)).toBeTruthy();
  expect([...card.querySelectorAll("img")].map(img => img.getAttribute("src"))).toEqual(heroDestaqueMock.imagens);
  expect(card.querySelector(".hfc-extra [aria-hidden]").textContent).toBe("+5");
  expect(within(card).getByRole("link").getAttribute("href")).toBe("/patrimonios");
  expect(card.querySelector(".situacao-selo,.visitacao-aviso")).toBeNull();
});

test("URLs vazias no card fixo são filtradas sem alterar o contador original", () => {
  const imagens = heroDestaqueMock.imagens;
  try {
    heroDestaqueMock.imagens = ["", null, undefined, "  ", ...imagens];
    const { container } = inicio();
    expect(container.querySelectorAll(".hfc-thumbs img")).toHaveLength(3);
    expect(container.querySelector(".hfc-extra [aria-hidden]").textContent).toBe("+5");
  } finally { heroDestaqueMock.imagens = imagens; }
});

test("pesquisa continua navegando com o termo digitado", async () => {
  const user = userEvent.setup(); inicio();
  await user.type(screen.getByRole("textbox", {name:"Buscar patrimônios no acervo"}), "Casa histórica");
  await user.click(screen.getByRole("button", {name:/^Buscar/}));
  expect(screen.getByTestId("local").textContent).toBe("/patrimonios?busca=Casa%20hist%C3%B3rica");
});

test("filtro de destaques usa categorias da API sem alterar o card fixo", async () => {
  const user = userEvent.setup();
  const patrimonios = [...itens, {...itens[0], id:"ambiental", nome:"Parque", categoria:"ambiental"}];
  render(<MemoryRouter><PatrimoniosContext.Provider value={{patrimonios, categorias:{historico:2,ambiental:1}}}><Inicio /></PatrimoniosContext.Provider></MemoryRouter>);
  document.querySelector(".destaques-track").scrollTo = vi.fn();
  await user.selectOptions(screen.getByRole("combobox"), "ambiental");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("heading", {name:"Parque"})).toBeTruthy();
  expect(screen.getByText(heroDestaqueMock.nome)).toBeTruthy();
});

test("destaque recebe foco por Tab e Enter mantém o destino de categoria", async () => {
  const user = userEvent.setup(); inicio();
  const link = screen.getByRole("link", { name: "Explorar Casa histórica" });
  for (let i = 0; i < 30 && document.activeElement !== link; i++) await user.tab();
  expect(document.activeElement).toBe(link);
  expect(link.getAttribute("href")).toBe("/patrimonios?categoria=historico");
  expect(link.querySelector("button, input, a")).toBeNull();
  await user.keyboard("{Enter}");
  expect(screen.getByTestId("local").textContent).toBe("/patrimonios?categoria=historico");
});

test("Favoritar continua independente e acessível sem navegar ao ativá-lo", async () => {
  const user = userEvent.setup(); inicio();
  const card = screen.getByRole("link", { name: "Explorar Casa histórica" }).closest("article");
  const link = within(card).getByRole("link");
  const favorito = within(card).getByRole("button", { name: "Adicionar Casa histórica aos favoritos" });
  link.focus(); await user.tab();
  expect(document.activeElement).toBe(favorito);
  expect(favorito.closest("a")).toBeNull();
  await user.keyboard("{Enter}");
  await user.click(favorito);
  expect(screen.getByTestId("local").textContent).toBe("/");
});

test.each(["", "   ", null, undefined])("imagem ausente (%s) não gera img vazia e mantém texto/link", imagemPrincipal => {
  const error = vi.spyOn(console, "error");
  inicio([{ ...itens[1], imagemPrincipal }]);
  const card = screen.getByRole("article");
  expect(card.querySelector("img").getAttribute("src")).toBe("/imagem-indisponivel.svg");
  expect(card.querySelector("img").getAttribute("alt")).toBe("Imagem indisponível: Bem sem imagem");
  expect(within(card).getByRole("link", { name: "Explorar Bem sem imagem" })).toBeTruthy();
  expect(within(card).getByText("Centro")).toBeTruthy();
  expect(error).not.toHaveBeenCalled();
});

test("imagem válida é mantida sem alterar a ordem recebida", () => {
  inicio();
  expect(screen.getByRole("img", { name: "Casa histórica" }).getAttribute("src")).toBe("/casa.jpg");
  expect(screen.getAllByRole("article").map(card => within(card).getByRole("heading").textContent))
    .toEqual(itens.map(item => item.nome));
});

test.each([
  ["Destaques anteriores", 400, 1000, 300, 164],
  ["Próximos destaques", 400, 1000, 300, 636],
  ["Destaques anteriores", 0, 1000, 300, 700],
  ["Próximos destaques", 700, 1000, 300, 0],
  ["Destaques anteriores", 100, 1000, 300, 0],
  ["Próximos destaques", 600, 1000, 300, 700],
  ["Destaques anteriores", 0, 300, 300, 0],
  ["Próximos destaques", 0, 300, 300, 0],
])("%s: posição %s, largura %s/%s resulta em %s", async (name, left, width, client, destino) => {
  const user = userEvent.setup(); const view = inicio();
  const track = view.container.querySelector(".destaques-track");
  Object.defineProperties(track, { scrollLeft: { value: left }, scrollWidth: { value: width }, clientWidth: { value: client } });
  track.scrollTo = vi.fn();
  screen.getByRole("button", { name }).focus();
  await user.keyboard("{Enter}");
  expect(track.scrollTo).toHaveBeenCalledWith({ left: destino, behavior: "smooth" });
});

test("carregamento e catálogo vazio não inventam destaques", () => {
  const view = inicio([], true);
  expect(view.container.querySelectorAll(".skeleton-card")).toHaveLength(6);
  expect(screen.queryByRole("article")).toBeNull();
  view.unmount(); inicio([]);
  expect(screen.queryByRole("article")).toBeNull();
});
