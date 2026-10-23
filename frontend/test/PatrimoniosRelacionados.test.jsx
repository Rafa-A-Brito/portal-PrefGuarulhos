import { expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PatrimoniosRelacionados from "../src/pages/PatrimonioDetalhe/PatrimoniosRelacionados";
import imagemAlternativa from "../src/assets/patrimonios/back_image.png";

const ligacao = {
  id: "uuid-ligacao-nao-publico", ordem: 1,
  destino: { id: "uuid-destino-nao-publico", slug: "casa-amarela", nome: "Casa Amarela" },
  texto: "Casa destinada à moradia do chefe da estação.",
};
const abrir = (ligacoes, patrimonios = []) => render(<MemoryRouter><PatrimoniosRelacionados ligacoes={ligacoes} patrimonios={patrimonios} /></MemoryRouter>);

test.each([undefined, null, [], {}, "inválido", [null], [{ id: "legado-numerico", texto: "Antigo mock" }]])(
  "sem ligações válidas (%j) não exibe seção vazia", valor => {
    abrir(valor);
    expect(screen.queryByRole("region", { name: "Patrimônios relacionados" })).toBeNull();
  },
);

test("uma ligação mostra capa alternativa e nome clicáveis pelo slug, sem texto editorial ou UUIDs", () => {
  abrir([ligacao]);
  const section = screen.getByRole("region", { name: "Patrimônios relacionados" });
  expect(within(section).getByRole("heading", { level: 3, name: "Casa Amarela" })).toBeTruthy();
  expect(within(section).queryByText(ligacao.texto)).toBeNull();
  const imagem = section.querySelector("img");
  expect(imagem.getAttribute("src")).toBe(imagemAlternativa);
  expect(imagem.closest("a")).toBe(within(section).getByRole("link"));
  expect(ligacao.texto).toBe("Casa destinada à moradia do chefe da estação.");
  expect(within(section).getByRole("link", { name: "Conhecer patrimônio: Casa Amarela" }).getAttribute("href")).toBe("/patrimonios/casa-amarela");
  expect(section.textContent).not.toContain("uuid-");
  expect(within(section).getAllByRole("link")).toHaveLength(1);
});

test("preserva sequência da API, sem ordenar por ordem/nome nem mutar o array", () => {
  const dados = Object.freeze([
    { ...ligacao, ordem: 20 },
    { id: "outra", ordem: 0, destino: { slug: "antigo-paco", nome: "Antigo Paço" }, texto: "Outra relação editorial." },
  ]);
  abrir(dados);
  expect(screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent)).toEqual(["Casa Amarela", "Antigo Paço"]);
  expect(dados[0].ordem).toBe(20);
});

test.each([null, {}, { slug: "casa-amarela" }, { nome: "Casa" }, { slug: "", nome: "Casa" },
  { slug: 42, nome: "Casa" }, { slug: "../admin", nome: "Casa" }, { slug: "https://externo.test", nome: "Casa" },
  { slug: "casa-amarela?x=1", nome: "Casa" }, { slug: "casa-amarela", nome: " " }, { slug: "casa-amarela", nome: {} }])(
  "ignora destino inválido %j e mantém os demais itens", destino => {
    abrir([{ ...ligacao, id: "invalida", destino }, ligacao]);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/patrimonios/casa-amarela");
  },
);

test("link participa da navegação por teclado com nome acessível específico", async () => {
  const user = userEvent.setup(); abrir([ligacao]);
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "Conhecer patrimônio: Casa Amarela" }));
});

test("texto editorial não é renderizado nem executado como HTML", () => {
  const texto = '<img src=x onerror="alert(1)">';
  abrir([{ ...ligacao, texto }]);
  expect(screen.queryByText(texto)).toBeNull();
  expect(document.querySelector("[onerror]")).toBeNull();
  expect(screen.queryByRole("img")).toBeNull();
});

test("catálogo fornece apenas a capa da ligação existente, com alternativa em caso de erro", () => {
  abrir([ligacao], [
    { slug: "casa-amarela", imagemPrincipal: "/casa.jpg" },
    { slug: "nao-relacionado", nome: "Bem não relacionado", imagemPrincipal: "/outro.jpg" },
  ]);
  const imagem = screen.getByRole("link").querySelector("img");
  expect(imagem.getAttribute("src")).toBe("/casa.jpg");
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  fireEvent.error(imagem);
  expect(imagem.getAttribute("src")).toBe(imagemAlternativa);
  fireEvent.error(imagem);
  expect(imagem.getAttribute("src")).toBe(imagemAlternativa);
});
