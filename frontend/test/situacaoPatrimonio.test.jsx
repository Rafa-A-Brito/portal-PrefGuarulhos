import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlaquetaCard from "../src/features/mapa/PlaquetaCard";
import { obterSituacaoVisual } from "../src/features/patrimonio/situacao";

const situacoes = [
  ["EM_RESTAURACAO", "Em restauração"],
  ["NECESSITA_RESTAURACAO", "Necessita restauração"],
  ["EM_RUINAS", "Em ruínas"],
  ["DEMOLIDO", "Demolido"],
];
const visitacoes = [
  ["TEMPORARIAMENTE_FECHADO", "Fechado"],
  ["ACESSO_PARCIAL", "Acesso parcial"],
  ["SEM_VISITACAO_PUBLICA", "Sem visitação pública"],
  ["NAO_INFORMADO", null],
  ["ABERTO", null],
];
test.each(situacoes.flatMap(([situacao, rotulo]) =>
  visitacoes.map(([statusVisitacao, selo]) => ({ situacao, rotulo, statusVisitacao, selo })),
))("$situacao + $statusVisitacao preserva conservação, visitação e ficha", ({ situacao, rotulo, statusVisitacao, selo }) => {
  const { container } = render(<MemoryRouter><PlaquetaCard item={{
    id: "historico", nome: "Acervo", categoria: "historico", situacao, statusVisitacao,
  }} /></MemoryRouter>);
  expect(screen.getByText(rotulo)).toBeTruthy();
  if (selo) expect(screen.getByText(selo)).toBeTruthy();
  else expect(container.querySelector(".visitacao-selo")).toBeNull();
  expect(screen.getByRole("link", { name: /Ver detalhes/ }).getAttribute("href")).toBe("/patrimonios/historico");
  expect(screen.getByRole("button", { name: /favoritos/ })).toBeTruthy();
});

test.each([undefined, null, "PRESERVADO", "DESCONHECIDO", "toString", "__proto__"])(
  "situação %s não inventa alerta de conservação", situacao => {
    expect(obterSituacaoVisual(situacao)).toBeNull();
  },
);
