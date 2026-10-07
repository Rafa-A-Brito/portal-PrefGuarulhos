// Importado dinamicamente somente em DEV, quando não há resposta HTTP.
import { noticiasSetembro, eventosOutubro, eventosNovembro, eventosDezembro } from "./novidadesMock";
import roberto from "../../assets/exposicoes/roberto_farias.jpg";
import coletiva from "../../assets/exposicoes/coletiva_bairros.jpg";
const imagens = import.meta.glob("../../assets/novidades/*", { eager: true, query: "?url", import: "default" });

function adaptar(items, mes) {
  return items.map((item) => ({
    ...item,
    tipo: item.tipo.toUpperCase(),
    data: item.data || `2026-${mes}-${(item.bloco.dia.match(/^\d+/)?.[0] || "1").padStart(2, "0")}`,
    imagem: imagens[`../../assets/novidades/${item.imagem?.split("/").pop()}`] || null,
  }));
}
export const conteudoMock = {
  novidades: [...adaptar(noticiasSetembro, "09"), ...adaptar(eventosOutubro, "10"), ...adaptar(eventosNovembro, "11"), ...adaptar(eventosDezembro, "12")]
    .sort((a, b) => b.data.localeCompare(a.data)),
  exposicoes: [
    { id: "demo-roberto", titulo: "Mostra individual — Roberto Farias", artista: "Roberto Faria", periodo: "Em cartaz", local: "Centro Cultural de Guarulhos", bio: "Conteúdo de demonstração.", imagem: roberto, ctaSaibaMais: "https://www.guarulhos.sp.gov.br" },
    { id: "demo-coletiva", titulo: "Coletiva de artistas dos bairros", artista: "Diversos artistas locais", periodo: "Próxima edição", local: "A definir", bio: "Conteúdo de demonstração.", imagem: coletiva, ctaSaibaMais: "https://www.guarulhos.sp.gov.br" },
  ],
};
