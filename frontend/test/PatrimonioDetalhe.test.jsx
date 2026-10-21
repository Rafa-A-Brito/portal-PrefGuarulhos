import { StrictMode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import PatrimonioDetalhe from "../src/pages/PatrimonioDetalhe/PatrimonioDetalhe";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import api from "../src/services/api";
import { criarUrlRota } from "../src/features/mapa/rota";
import { normalizarPatrimonio } from "../src/services/patrimoniosApi";
import { PATRIMONIOS_SEM_DESTINO } from "./fixtures/localizacaoPatrimonios";

const registro = {
  id: "uuid-privado", slug: "parque-teste", nome: "Parque de teste",
  descricaoResumida: "Resumo manual completo", descricao: "Descrição integral do bem",
  historia: "História do patrimônio", importanciaCultural: "Importância para a comunidade",
  categoria: { id: "cat", slug: "historico", nome: "Histórico" },
  categoriasAdicionais: [{ id: "cat-extra", slug: "ambiental", nome: "Ambiental" }],
  localizacao: { endereco: "Av. Paulo Faccini", numero: "S/N", complemento: "Portão principal", bairro: "Centro", cidade: "São Paulo", uf: "SP", cep: "01000-000", latitude: "-23.45", longitude: "-46.53" },
  detalhes: [
    { id: "d2", titulo: "Segunda seção", texto: "Segundo texto", ordem: 20 },
    { id: "d1", titulo: "Primeira seção", texto: "Primeiro texto", ordem: 10 },
  ],
  documentos: [
    { id: "doc-privado", titulo: "Inventário histórico", tipo: "ARQUIVO", url: "/uploads/referencias/inventario.pdf" },
    { id: "link-privado", descricao: "Prefeitura de Guarulhos", tipo: "LINK", url: "https://example.org/fonte" },
  ],
  imagens: [
    { id: "img1", url: "/uploads/patrimonios/capa.jpg", textoAlternativo: "Vista da entrada", principal: true },
    { id: "img2", url: "/uploads/patrimonios/jardim.jpg", textoAlternativo: "Jardim do parque", credito: "Acervo municipal" },
  ],
  rotas: [{ ordem: 1, rota: { slug: "rota-cultural", nome: "Caminho cultural", descricao: "Passeio pela memória" } }],
};

let get;
beforeEach(() => { get = vi.spyOn(api, "get"); });
afterEach(() => vi.restoreAllMocks());
const responder = (data = registro) => get.mockResolvedValue({ data: { data } });
function abrir(contexto = {}, strict = false) {
  const pagina = <MemoryRouter initialEntries={["/patrimonios/parque-teste"]}>
    <PatrimoniosContext.Provider value={{ patrimonios: [], setSelecionado: vi.fn(), ...contexto }}>
      <Link to="/patrimonios/outro">Outro patrimônio</Link>
      <Routes><Route path="/patrimonios/:id" element={<PatrimonioDetalhe />} /><Route path="/mapa" element={<p>Mapa de teste</p>} /></Routes>
    </PatrimoniosContext.Provider>
  </MemoryRouter>;
  return render(strict ? <StrictMode>{pagina}</StrictMode> : pagina);
}
async function carregado() {
  await screen.findByText("Descrição integral do bem");
}

test("acesso direto/F5 busca GET por slug e renderiza registro completo sem a listagem", async () => {
  responder();
  const view = abrir({ patrimonios: undefined, carregando: true, erro: "Lista indisponível" });
  await carregado();
  expect(get).toHaveBeenCalledExactlyOnceWith("/patrimonios/parque-teste");
  expect(screen.getByRole("heading", { name: registro.nome })).toBeTruthy();
  expect(screen.getByText(registro.descricaoResumida)).toBeTruthy();
  expect(screen.getByText("Ambiental")).toBeTruthy();
  expect(screen.getByText("Caminho cultural")).toBeTruthy();
  expect(screen.getByText("Passeio pela memória")).toBeTruthy();
  view.unmount();
  abrir();
  await carregado();
  expect(get).toHaveBeenCalledTimes(2);
});

test("loading acessível e placeholder do Context substituído sem mutar a lista", async () => {
  let resolver;
  get.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
  const lista = [{ id: registro.slug, nome: "Nome resumido", resumo: "Placeholder" }];
  abrir({ patrimonios: lista });
  expect(screen.getByRole("status").textContent).toContain("Carregando");
  expect(screen.getByText("Placeholder")).toBeTruthy();
  await act(async () => resolver({ data: { data: registro } }));
  await carregado();
  expect(screen.queryByText("Placeholder")).toBeNull();
  expect(lista[0]).toEqual({ id: registro.slug, nome: "Nome resumido", resumo: "Placeholder" });
});

test("loading sem placeholder e StrictMode não duplicam requisição", async () => {
  let resolver;
  get.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
  abrir({}, true);
  expect(screen.getByRole("status").textContent).toBe("Carregando patrimônio...");
  expect(get).toHaveBeenCalledTimes(1);
  await act(async () => resolver({ data: { data: registro } }));
  await carregado();
  expect(screen.queryByRole("status")).toBeNull();
  expect(get).toHaveBeenCalledTimes(1);
});

test("404 prevalece sobre placeholder antigo", async () => {
  get.mockRejectedValue({ response: { status: 404 } });
  abrir({ patrimonios: [{ id: registro.slug, nome: "Antigo" }] });
  expect(await screen.findByRole("heading", { name: "Patrimônio não encontrado" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
});

test("erro de rede mostra feedback e retry busca novamente sem mock local", async () => {
  get.mockRejectedValueOnce(new Error("Network Error"));
  responder();
  abrir();
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await carregado();
  expect(get).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("história, importância e seções editoriais respeitam ordem sem duplicação", async () => {
  responder(); abrir(); await carregado();
  const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(titulos.slice(0, 4)).toEqual(["História", "Importância cultural", "Primeira seção", "Segunda seção"]);
  expect(screen.getAllByText(registro.historia)).toHaveLength(1);
  expect(registro.detalhes[0].ordem).toBe(20);
});

test("campos vazios não inventam conteúdo, fatos ou ligações; fallback histórico não duplica", async () => {
  responder({ ...registro, detalhes: [], documentos: [], imagens: [], rotas: [], importanciaCultural: "" });
  abrir(); await carregado();
  expect(screen.getAllByText(registro.historia)).toHaveLength(1);
  for (const titulo of ["Fontes e referências", "Imagens", "Rotas culturais", "Em resumo", "Continue explorando", "Importância cultural"]) {
    expect(screen.queryByRole("heading", { name: titulo })).toBeNull();
  }
});

test("imagens usam URLs públicas, texto alternativo e crédito", async () => {
  responder(); abrir(); await carregado();
  expect(screen.getByRole("img", { name: "Vista da entrada" }).src).toBe("http://localhost:3333/uploads/patrimonios/capa.jpg");
  expect(screen.getByRole("img", { name: "Jardim do parque" }).src).toBe("http://localhost:3333/uploads/patrimonios/jardim.jpg");
  expect(screen.getByText("Acervo municipal")).toBeTruthy();
});

test("referências normalizadas aparecem uma vez com URLs públicas e links seguros", async () => {
  responder(); abrir(); await carregado();
  expect(screen.getAllByRole("heading", { name: "Fontes e referências" })).toHaveLength(1);
  expect(screen.getAllByText("Inventário histórico")).toHaveLength(1);
  const documento = screen.getByRole("link", { name: /Abrir documento/ });
  const externo = screen.getByRole("link", { name: /Abrir link/ });
  expect(documento.href).toBe("http://localhost:3333/uploads/referencias/inventario.pdf");
  expect(externo.href).toBe("https://example.org/fonte");
  for (const link of [documento, externo]) {
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
  }
  expect(document.body.textContent).not.toContain("doc-privado");
});

test("URL de referência com protocolo executável não vira link", async () => {
  responder({ ...registro, documentos: [{ descricao: "Fonte inválida", tipo: "LINK", url: "javascript:alert(1)" }] });
  abrir(); await carregado();
  expect(screen.getByText("Fonte inválida")).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Abrir link/ })).toBeNull();
});

test("endereço completo fora de Guarulhos e rota textual usam helper compartilhado", async () => {
  responder(); abrir(); await carregado();
  expect(screen.getByText("Av. Paulo Faccini, s/n — Portão principal")).toBeTruthy();
  expect(screen.getByText("São Paulo - SP")).toBeTruthy();
  expect(screen.getByText("CEP 01000-000")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Ver rota" }).href).toBe(criarUrlRota(normalizarPatrimonio(registro)));
});

test("demolido exibe referência histórica e usa coordenada, sem buscar nome histórico", async () => {
  responder({ ...registro, situacao: "DEMOLIDO" }); abrir(); await carregado();
  expect(screen.getByText("Localização aproximada / referência histórica")).toBeTruthy();
  const url = new URL(screen.getByRole("link", { name: "Ver local aproximado" }).href);
  expect(url.searchParams.get("destination")).toBe("-23.45,-46.53");
});

test.each(PATRIMONIOS_SEM_DESTINO)("$slug mostra aviso e documentação, sem destino legado ou ação vazia", async ({ slug, aviso }) => {
  responder({ ...registro, slug }); abrir(); await carregado();
  expect(screen.getByText(aviso)).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Ver rota|Ver local aproximado/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "Ver no mapa" })).toBeNull();
  expect(document.querySelector(".detalhe-actions")).toBeNull();
  expect(document.querySelector(".detalhe-endereco-card")).toBeNull();
  expect(document.querySelector(".detalhe-bairro")).toBeNull();
  expect(screen.getByText("Primeiro texto")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Fontes e referências" })).toBeTruthy();
});

test("sem localização não inventa município nem botão de rota", async () => {
  responder({ ...registro, localizacao: null }); abrir(); await carregado();
  expect(screen.queryByRole("link", { name: "Ver rota" })).toBeNull();
  expect(screen.queryByText("Guarulhos - SP")).toBeNull();
});

test("troca de slug ignora resposta atrasada do patrimônio anterior", async () => {
  let resolverAntigo;
  get.mockReturnValueOnce(new Promise((resolve) => { resolverAntigo = resolve; }));
  responder({ ...registro, slug: "outro", nome: "Outro bem" });
  abrir();
  fireEvent.click(screen.getByRole("link", { name: "Outro patrimônio" }));
  await screen.findByRole("heading", { name: "Outro bem" });
  await act(async () => resolverAntigo({ data: { data: registro } }));
  await waitFor(() => expect(screen.queryByRole("heading", { name: registro.nome })).toBeNull());
  expect(get).toHaveBeenCalledTimes(2);
});

const relacaoEditorial = {
  id: "uuid-editorial", ordem: 0, texto: "Relação funcional documentada entre os bens.",
  destino: { id: "uuid-destino", slug: "casa-amarela", nome: "Casa Amarela" },
};

test("detalhe consome destino da API sem listagem e navega usando slug público", async () => {
  get.mockResolvedValueOnce({ data: { data: { ...registro, ligacoes: [relacaoEditorial] } } });
  get.mockResolvedValueOnce({ data: { data: { ...registro, id: "uuid-destino", slug: "casa-amarela", nome: "Casa Amarela", ligacoes: [] } } });
  abrir(); await carregado();
  expect(screen.getByRole("region", { name: "Patrimônios relacionados" })).toBeTruthy();
  expect(screen.getByText(relacaoEditorial.texto)).toBeTruthy();
  expect(document.body.textContent).not.toContain("uuid-editorial");
  expect(document.body.textContent).not.toContain("uuid-destino");
  fireEvent.click(screen.getByRole("link", { name: "Conhecer patrimônio: Casa Amarela" }));
  await screen.findByRole("heading", { level: 1, name: "Casa Amarela" });
  expect(get).toHaveBeenLastCalledWith("/patrimonios/casa-amarela");
  expect(screen.queryByRole("region", { name: "Patrimônios relacionados" })).toBeNull();
});

test("sem ligações não deduz relacionados pela categoria nem renderiza fatos", async () => {
  responder({ ...registro, fatos: [{ rotulo: "Fato não aprovado", valor: "Ignorar" }], ligacoes: [] });
  abrir({ patrimonios: [{ id: "bem-mesma-categoria", nome: "Sugestão deduzida", categoria: "historico" }] });
  await carregado();
  expect(screen.queryByRole("region", { name: "Patrimônios relacionados" })).toBeNull();
  expect(screen.queryByText("Sugestão deduzida")).toBeNull();
  expect(screen.queryByText("Fato não aprovado")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Em resumo" })).toBeNull();
});

test("normalização preserva ligações e ordem retornadas, sem consumir fatos", () => {
  const ligacoes = [relacaoEditorial, { ...relacaoEditorial, id: "segunda", ordem: -1 }];
  const normalizado = normalizarPatrimonio({ ...registro, ligacoes, fatos: [{ rotulo: "Não usar" }] });
  expect(normalizado.ligacoes).toEqual(ligacoes);
  expect(normalizado.fatos).toBeUndefined();
  expect(normalizarPatrimonio({ ...registro, ligacoes: {} }).ligacoes).toEqual([]);
});

test("ligações preservam referência, endereço, rota e seleção do patrimônio no mapa", async () => {
  const setSelecionado = vi.fn();
  responder({ ...registro, ligacoes: [null, relacaoEditorial, { destino: null }] });
  abrir({ setSelecionado }); await carregado();
  expect(screen.getByRole("heading", { name: "Fontes e referências" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Abrir documento/ })).toBeTruthy();
  expect(screen.getByText("Av. Paulo Faccini, s/n — Portão principal")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Ver rota" }).href).toBe(criarUrlRota(normalizarPatrimonio(registro)));
  fireEvent.click(screen.getByRole("button", { name: "Ver no mapa" }));
  expect(setSelecionado).toHaveBeenCalledWith(expect.objectContaining({ id: registro.slug }));
  expect(screen.getByText("Mapa de teste")).toBeTruthy();
});

test.each(PATRIMONIOS_SEM_DESTINO)("relacionados não reativam endereço/mapa/rota para $slug", async ({ slug, aviso }) => {
  responder({ ...registro, slug, ligacoes: [relacaoEditorial] }); abrir(); await carregado();
  expect(screen.getByRole("region", { name: "Patrimônios relacionados" })).toBeTruthy();
  expect(screen.getByText(aviso)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Ver no mapa" })).toBeNull();
  expect(screen.queryByRole("link", { name: /Ver rota|Ver local aproximado/ })).toBeNull();
  expect(document.querySelector(".detalhe-endereco-card")).toBeNull();
});
