import { expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import Inicio from "../src/pages/Inicio/Inicio";
import Mapa from "../src/pages/Mapa/Mapa";

vi.mock("../src/hooks/useGoogleMaps", () => ({
  GOOGLE_MAPS_MAP_ID: "", useGoogleMaps: () => ({ configurado: false, pronto: false }),
}));
const conservacoes = [
  ["EM_RESTAURACAO", "Em restauração"], ["NECESSITA_RESTAURACAO", "Necessita restauração"],
  ["EM_RUINAS", "Em ruínas"], ["DEMOLIDO", "Demolido"],
];
const visitacoes = ["ABERTO", "ACESSO_PARCIAL", "TEMPORARIAMENTE_FECHADO", "SEM_VISITACAO_PUBLICA", "NAO_INFORMADO"];
const casos = conservacoes.flatMap(([situacao, rotulo]) => visitacoes.map(statusVisitacao => ({ situacao, rotulo, statusVisitacao })));
test("mapa sem foto ou com foto quebrada mantém imagem neutra na lista e no painel", () => {
  const item = { id: "sem-foto", nome: "Registro histórico", categoria: "historico", imagemPrincipal: "" };
  const erro = vi.spyOn(console, "error");
  try {
    const { container } = render(<MemoryRouter><PatrimoniosContext.Provider value={{ patrimonios: [item], selecionado: item, setSelecionado: vi.fn() }}>
      <Mapa />
    </PatrimoniosContext.Provider></MemoryRouter>);
    const imagens = container.querySelectorAll(".mapa-sidebar-item img,.mapa-detail-img");
    expect(imagens).toHaveLength(2);
    for (const imagem of imagens) {
      expect(imagem.getAttribute("src")).toBe("/imagem-indisponivel.svg");
      fireEvent.error(imagem);
      expect(imagem.getAttribute("src")).toBe("/imagem-indisponivel.svg");
    }
    expect(erro).not.toHaveBeenCalled();
  } finally { erro.mockRestore(); }
});
for (const tela of ["Home", "Mapa"]) {
  test.each(casos)(`${tela}: $situacao e $statusVisitacao permanecem independentes`, ({ situacao, rotulo, statusVisitacao }) => {
    const item = { id: "historico", nome: "Registro histórico", categoria: "historico", situacao, statusVisitacao, bairro: "Centro", imagemPrincipal: "/foto.jpg" };
    const contexto = { patrimonios: [item], categorias: { historico: 1 }, selecionado: item, setSelecionado: vi.fn() };
    const { container } = render(<MemoryRouter><PatrimoniosContext.Provider value={contexto}>
      {tela === "Home" ? <Inicio /> : <Mapa />}
    </PatrimoniosContext.Provider></MemoryRouter>);
    const restrito = !["ABERTO", "NAO_INFORMADO"].includes(statusVisitacao);
    const blocos = tela === "Home"
      ? container.querySelectorAll(".destaque-card")
      : container.querySelectorAll(".mapa-sidebar-item,.mockup-pin-card,.mapa-detail-panel");
    expect(blocos).toHaveLength(tela === "Home" ? 1 : 3);
    for (const bloco of blocos) {
      expect(within(bloco).getByText(rotulo)).toBeTruthy();
      expect(Boolean(bloco.querySelector(".visitacao-selo,.visitacao-aviso"))).toBe(restrito);
    }
    const ficha = container.querySelector(tela === "Home" ? ".destaque-link" : ".mapa-detail-actions a");
    expect(ficha.getAttribute("href")).toBe(tela === "Home" ? "/patrimonios?categoria=historico" : "/patrimonios/historico");
  });
}
