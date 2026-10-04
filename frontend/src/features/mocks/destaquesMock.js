import CAPELA_BONSUCESSO_IMG from "../../assets/capela_bonsucesso.png";
import SANATORIO_IMG from "../../assets/sanatorio_padre_bento.jpg";
import FESTA_BONSUCESSO_IMG from "../../assets/festa_bonsucesso.jpg";

/**
 * Conteúdo específico do Hero da Home — não faz parte do catálogo de
 * patrimônios (esse vem de features/mocks/patrimoniosMock.js, a mesma
 * fonte usada pela página de Patrimônios/Mapa). Aqui fica só o card em
 * destaque flutuante.
 */
export const heroDestaqueMock = {
  nome: "Antigo hospital municipal",
  bairro: "Centro, Guarulhos",
  resumo: "Um marco da história e da saúde pública da cidade.",
  imagens: [FESTA_BONSUCESSO_IMG, CAPELA_BONSUCESSO_IMG, SANATORIO_IMG],
  extra: 5,
};
