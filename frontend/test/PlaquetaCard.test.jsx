import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlaquetaCard from "../src/features/mapa/PlaquetaCard";
import { PATRIMONIOS_SEM_DESTINO } from "./fixtures/localizacaoPatrimonios";

const bem = { id: "bem", nome: "Patrimônio", categoria: "historico", bairro: "Bairro legado", cep: "99999-999", imagemPrincipal: "/imagem.jpg" };
function abrir(item) { render(<MemoryRouter><PlaquetaCard item={item} /></MemoryRouter>); }

test.each(PATRIMONIOS_SEM_DESTINO)("card $slug não reapresenta bairro/CEP como endereço exclusivo", ({ slug, aviso }) => {
  abrir({ ...bem, id: slug, slug });
  expect(screen.getByText(aviso)).toBeTruthy();
  expect(screen.queryByText("Bairro legado")).toBeNull();
  expect(screen.queryByText("CEP 99999-999")).toBeNull();
  expect(screen.getByRole("link", { name: /Ver detalhes/ }).getAttribute("href")).toBe("/patrimonios/" + slug);
});

test("card normal mantém bairro e CEP", () => {
  abrir(bem);
  expect(screen.getByText("Bairro legado")).toBeTruthy();
  expect(screen.getByText("99999-999")).toBeTruthy();
});

test("card demolido indica referência histórica", () => {
  abrir({ ...bem, situacao: "DEMOLIDO" });
  expect(screen.getByText("Localização aproximada / referência histórica")).toBeTruthy();
});

test.each([
  ["TEMPORARIAMENTE_FECHADO", "Fechado"],
  ["ACESSO_PARCIAL", "Acesso parcial"],
  ["SEM_VISITACAO_PUBLICA", "Sem visitação pública"],
])("card %s exibe selo com texto/ícone e mantém o favorito acionável", (statusVisitacao, texto) => {
  abrir({ ...bem, statusVisitacao });
  const selo = screen.getByText(texto);
  expect(selo.closest("figure")).toBeTruthy();
  expect(selo.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  const favorito = screen.getByRole("button", { name: /Patrimônio.*favoritos/ });
  const anterior = favorito.getAttribute("aria-pressed");
  fireEvent.click(favorito);
  expect(favorito.getAttribute("aria-pressed")).not.toBe(anterior);
});

test.each([undefined, "NAO_INFORMADO", "ABERTO"])("card com visitação %s não tem selo", statusVisitacao => {
  const { container } = render(<MemoryRouter><PlaquetaCard item={{ ...bem, statusVisitacao }} /></MemoryRouter>);
  expect(container.querySelector(".visitacao-selo")).toBeNull();
});
