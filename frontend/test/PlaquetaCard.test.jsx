import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlaquetaCard from "../src/features/mapa/PlaquetaCard";
import { SEM_DESTINO_C3 } from "./fixtures/localizacaoC3";

const bem = { id: "bem", nome: "Patrimônio", categoria: "historico", bairro: "Bairro legado", cep: "99999-999", imagemPrincipal: "/imagem.jpg" };
function abrir(item) { render(<MemoryRouter><PlaquetaCard item={item} /></MemoryRouter>); }

test.each(SEM_DESTINO_C3)("card $slug não reapresenta bairro/CEP como endereço exclusivo", ({ slug, aviso }) => {
  abrir({ ...bem, id: slug, slug });
  expect(screen.getByText(aviso)).toBeTruthy();
  expect(screen.queryByText("Bairro legado")).toBeNull();
  expect(screen.queryByText("CEP 99999-999")).toBeNull();
  expect(screen.getByRole("link", { name: /Ver detalhes/ }).getAttribute("href")).toBe("/patrimonios/" + slug);
});

test("card normal mantém bairro e CEP", () => {
  abrir(bem);
  expect(screen.getByText("Bairro legado")).toBeTruthy();
  expect(screen.getByText("CEP 99999-999")).toBeTruthy();
});

test("card demolido indica referência histórica", () => {
  abrir({ ...bem, situacao: "DEMOLIDO" });
  expect(screen.getByText("Localização aproximada / referência histórica")).toBeTruthy();
});
