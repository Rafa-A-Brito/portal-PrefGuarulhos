import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, useNavigate, useLocation } from "react-router-dom";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import Patrimonios from "../src/pages/Patrimonios/Patrimonios";
import Inicio from "../src/pages/Inicio/Inicio";
import Mapa from "../src/pages/Mapa/Mapa";

vi.mock("../src/services/regioesApi", () => ({ listarRegioes: () => Promise.resolve([{ id: "centro", slug: "centro", nome: "Centro" }]) }));
vi.mock("../src/hooks/useGoogleMaps", () => ({ GOOGLE_MAPS_MAP_ID: "", useGoogleMaps: () => ({ configurado: false, pronto: false }) }));

const itens = Array.from({ length: 9 }, (_, i) => ({
  id: `casa-${i + 1}`, nome: `Casa ${i + 1}`, bairro: "Centro", categoria: "historico",
  resumo: "Acervo publicado", situacao: i === 0 ? "DEMOLIDO" : "PRESERVADO",
  statusVisitacao: i === 0 ? "TEMPORARIAMENTE_FECHADO" : "NAO_INFORMADO",
  imagemPrincipal: "/casa.jpg", regiao: { slug: "centro" },
}));

function Navegacao() {
  const navigate = useNavigate();
  const location = useLocation();
  return <>
    <button onClick={() => navigate(-1)}>Voltar</button>
    <button onClick={() => navigate(1)}>Avançar</button>
    <button onClick={() => navigate(`${location.pathname}?busca=Casa+9&regiao=centro`)}>Pesquisar pela URL</button>
    <output data-testid="url">{location.pathname + location.search}</output>
  </>;
}
function Contexto({ children, valor }) {
  const [selecionado, setSelecionado] = useState(null);
  return <PatrimoniosContext.Provider value={{
    patrimonios: itens, categorias: { historico: itens.length }, carregando: false,
    erro: null, selecionado, setSelecionado, ...valor,
  }}>{children}</PatrimoniosContext.Provider>;
}
function abrir(elemento = <Patrimonios />, entrada = "/patrimonios", valor) {
  return render(<MemoryRouter initialEntries={[entrada]}><Contexto valor={valor}>
    <Navegacao />{elemento}
  </Contexto></MemoryRouter>);
}
const parametros = () => new URLSearchParams(screen.getByTestId("url").textContent.split("?")[1]);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

test.each([
  ["catálogo", <Patrimonios />, "/patrimonios", /Buscar patrimônios por nome/],
  ["mapa", <Mapa />, "/mapa", /Pesquisar patrimônios no mapa/],
])("%s acompanha URL, voltar e avançar sem desmontar", async (_, elemento, caminho, nome) => {
  abrir(elemento, `${caminho}?busca=Casa+1`);
  const busca = screen.getByRole("textbox", { name: nome });
  expect(busca.value).toBe("Casa 1");
  fireEvent.click(screen.getByRole("button", { name: "Pesquisar pela URL" }));
  expect(busca.value).toBe("Casa 9");
  expect(screen.queryByRole("heading", { name: "Casa 1" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  await waitFor(() => expect(busca.value).toBe("Casa 1"));
  fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
  await waitFor(() => expect(busca.value).toBe("Casa 9"));
});

test("digitação substitui a entrada atual, preserva filtros e reinicia paginação", () => {
  abrir(<Patrimonios />, "/patrimonios?categoria=historico&regiao=centro&pagina=2&origem=teste");
  expect(screen.getByRole("heading", { name: "Casa 5" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Pesquisar pela URL" }));
  const busca = screen.getByRole("textbox", { name: /Buscar patrimônios por nome/ });
  fireEvent.change(busca, { target: { value: "Casa 2" } });
  fireEvent.change(busca, { target: { value: "Casa 3" } });
  expect(parametros().get("regiao")).toBe("centro");
  expect(parametros().has("pagina")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  expect(parametros().get("pagina")).toBe("2");
  expect(parametros().get("origem")).toBe("teste");
  expect(parametros().get("categoria")).toBe("historico");
  expect(busca.value).toBe("");
  expect(screen.getByRole("heading", { name: "Casa 5" })).toBeTruthy();
});

test("página e região acompanham histórico; favorito não navega", async () => {
  const user = userEvent.setup(); abrir();
  await user.click(screen.getByRole("button", { name: "Próxima página" }));
  expect(parametros().get("pagina")).toBe("2");
  const regioes = await screen.findByRole("group", { name: "Filtrar por região" });
  const centro = within(regioes).getByRole("button", { name: /^Centro/ });
  expect(within(centro).getByText("9")).toBeTruthy();
  await user.click(centro);
  expect(parametros().has("pagina")).toBe(false);
  expect(parametros().get("regiao")).toBe("centro");
  await user.click(screen.getByRole("button", { name: "Voltar" }));
  expect(screen.getByRole("heading", { name: "Casa 5" })).toBeTruthy();
  expect(parametros().has("regiao")).toBe(false);
  const url = screen.getByTestId("url").textContent;
  await user.click(screen.getByRole("button", { name: "Adicionar Casa 5 aos favoritos" }));
  expect(screen.getByTestId("url").textContent).toBe(url);
  await user.click(screen.getByRole("button", { name: /Somente favoritos/ }));
  expect(parametros().get("favoritos")).toBe("1");
  expect(parametros().has("pagina")).toBe(false);
  expect(screen.getAllByRole("article")).toHaveLength(1);
});

test.each(["-2", "abc", "1.5", "99999999999999999999", "999"])("página inválida ou excedente %s mantém resultados", pagina => {
  abrir(<Patrimonios />, `/patrimonios?pagina=${pagina}`);
  expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { current: "page" })).toBeTruthy();
});

test("home mantém ordem editorial e estados nos destaques da API, separados do mock", () => {
  abrir(<Inicio />, "/");
  const hero = screen.getByRole("complementary");
  expect(within(hero).getByText("Antigo hospital municipal")).toBeTruthy();
  expect(within(hero).queryByText("Demolido")).toBeNull();
  const primeiro = screen.getAllByRole("article")[0];
  expect(within(primeiro).getByRole("heading", {name:"Casa 1"})).toBeTruthy();
  expect(within(primeiro).getByText("Demolido")).toBeTruthy();
  expect(within(primeiro).getByText("Fechado")).toBeTruthy();
});

test.each([
  [{ patrimonios: [] }, "Nenhum patrimônio disponível para exibir."],
  [{ patrimonios: [], carregando: true }, null],
  [{ erro: "Acervo indisponível" }, "Acervo indisponível"],
])("home trata estados do acervo mantendo o card fixo: %j", (valor, texto) => {
  abrir(<Inicio />, "/", valor);
  if (texto) expect(screen.getByText(texto)).toBeTruthy();
  else expect(document.querySelectorAll(".skeleton-card")).toHaveLength(6);
  expect(screen.queryByRole("link", { name: /^Conhecer Casa/ })).toBeNull();
  expect(screen.getByText("Antigo hospital municipal")).toBeTruthy();
});

test("mapa alternativo seleciona por teclado e mantém conservação e visitação no painel", async () => {
  const user = userEvent.setup(); abrir(<Mapa />, "/mapa");
  const botao = screen.getAllByRole("button", { name: /Casa 1/ }).find(el => el.classList.contains("mockup-pin-card"));
  botao.focus();
  await user.keyboard("{Enter}");
  const painel = screen.getByRole("region", { name: "Patrimônio selecionado" });
  expect(within(painel).getByText("Demolido")).toBeTruthy();
  expect(within(painel).getByText("Fechado")).toBeTruthy();
  expect(within(painel).getByRole("link", { name: /Ver detalhes/ }).getAttribute("href")).toBe("/patrimonios/casa-1");
  expect(botao.getAttribute("aria-pressed")).toBe("true");
});
