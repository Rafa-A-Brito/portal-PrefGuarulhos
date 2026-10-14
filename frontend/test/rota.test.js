import { expect, test } from "vitest";
import { criarUrlRota, ehLocalAproximado } from "../src/features/mapa/rota";
import { formatarEndereco } from "../src/features/mapa/endereco";
import { classificarLocalizacao } from "../src/features/mapa/politicaLocalizacao";
import { SEM_DESTINO_C3 } from "./fixtures/localizacaoC3";
import { normalizarPatrimonio } from "../src/services/fakeApi";

const bem = {
  nome: "Parque Bosque Maia", endereco: "Av. Paulo Faccini", numero: "99",
  complemento: "Entrada principal", bairro: "Centro", cidade: "Guarulhos", uf: "SP",
  cep: "07115-260", localizacao: { lat: -23.45, lng: -46.53 },
};
const destino = (item) => new URL(criarUrlRota(item)).searchParams.get("destination");

test("destino completo, acentos, parâmetros codificados e nenhuma origem fixa", () => {
  const item = { ...bem, nome: "Praça São José & Memória" };
  const url = new URL(criarUrlRota(item));
  expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
  expect(url.searchParams.get("destination")).toBe("Praça São José & Memória, Av. Paulo Faccini, 99, Entrada principal, Centro, Guarulhos - SP, 07115-260, Brasil");
  expect([...url.searchParams.keys()]).toEqual(["api", "destination", "travelmode"]);
  expect(url.searchParams.get("api")).toBe("1");
  expect(url.searchParams.get("travelmode")).toBe("driving");
  expect(url.search).toContain("%26");
});
test.each(["s/n", "S/N", "s/nº", " S / N "])("%s mantém destino textual do POI mesmo com coordenadas", (numero) => {
  expect(destino({ ...bem, numero, complemento: "" })).toBe("Parque Bosque Maia, Av. Paulo Faccini, s/n, Centro, Guarulhos - SP, 07115-260, Brasil");
});
test.each([
  { bairro: "Centro" }, { cidade: "Guarulhos", uf: "SP" }, { cep: "07115-260" },
])("POI sem número usa o contexto geográfico disponível: %j", (contexto) => {
  expect(destino({ nome: bem.nome, endereco: bem.endereco, ...contexto, localizacao: bem.localizacao })).toContain("Parque Bosque Maia, Av. Paulo Faccini");
});
test("não força Guarulhos nem exige coordenadas para endereço utilizável", () => {
  expect(destino({ ...bem, cidade: "São Paulo", localizacao: null })).toContain("São Paulo - SP");
});
test.each([
  { lat: -23.45, lng: -46.53 }, { latitude: "-23.45", longitude: "-46.53" },
])("endereço insuficiente usa coordenadas válidas %j", (localizacao) => {
  expect(destino({ nome: "Bem histórico", bairro: "Centro", localizacao })).toBe("-23.45,-46.53");
});
test.each([null, {}, { nome: "Bem" }, { localizacao: { lat: "", lng: null } }, { localizacao: { lat: 91, lng: 0 } }])("sem destino utilizável não gera rota: %j", (item) => {
  expect(criarUrlRota(item)).toBeNull();
});
test("DEMOLIDO prefere coordenadas ao nome/endereço e identifica aproximação", () => {
  expect(destino({ ...bem, situacao: "DEMOLIDO" })).toBe("-23.45,-46.53");
  expect(destino({ situacao: "DEMOLIDO", localizacao: bem.localizacao })).toBe("-23.45,-46.53");
  expect(ehLocalAproximado({ situacao: "DEMOLIDO" })).toBe(true);
  expect(ehLocalAproximado({ categorias: ["historico", "imaterial"] })).toBe(false);
  expect(ehLocalAproximado({ categoria: "ambiental" })).toBe(false);
  expect(classificarLocalizacao({ situacao: "DEMOLIDO" })).toMatchObject({
    tipo: "APROXIMADA", rotuloRota: "Ver local aproximado", aviso: "Localização aproximada / referência histórica",
  });
});

test.each([
  "casarao-saraceni", "casarao-lima", "casarao-da-familia-albertis",
  "antiga-carbonell-fiacao-e-tecelagem-e-casaroes-gemeos-demolidos",
  "antiga-igreja-matriz-colonial-de-nossa-senhora-da-conceicao",
  "primitiva-igreja-de-nossa-senhora-do-rosario-dos-homens-pretos-1717",
])("sítio histórico %s não busca estabelecimento atual pelo nome", (slug) => {
  expect(destino({ ...bem, slug, situacao: "DEMOLIDO" })).toBe("-23.45,-46.53");
});

test.each([null, { lat: 91, lng: 0 }, { lat: "", lng: null }])("demolido sem coordenada utilizável usa só endereço histórico contextualizado: %j", (localizacao) => {
  const item = { ...bem, situacao: "DEMOLIDO", nome: "Casarão histórico", localizacao };
  expect(destino(item)).toBe("Av. Paulo Faccini, 99, Entrada principal, Centro, Guarulhos - SP, 07115-260, Brasil");
  expect(destino({ ...item, numero: "s/n" })).not.toContain(item.nome);
  expect(criarUrlRota({ ...item, cidade: "", uf: "", cep: "" })).toBeNull();
  expect(criarUrlRota({ ...item, endereco: "" })).toBeNull();
});

test.each(SEM_DESTINO_C3)("$slug: ignora endereço/ponto legado e texto documental na navegação", ({ slug, tipo, aviso }) => {
  const item = Object.freeze({ ...bem, slug, situacao: "PRESERVADO", detalhes: [
    { titulo: "Destino validado", texto: "Rua Corina, 94, CEP 07110-180. https://maps.google.com/" },
  ] });
  expect(criarUrlRota(item)).toBeNull();
  expect(classificarLocalizacao(item)).toMatchObject({ tipo, aviso, permiteRota: false, rotuloRota: null, coordenadasMarcador: null, exibirEndereco: false });
  // Compatibilidade com o id público já normalizado pelo frontend.
  expect(criarUrlRota({ ...item, slug: undefined, id: slug })).toBeNull();
  expect(classificarLocalizacao({ ...item, detalhes: [] })).toEqual(classificarLocalizacao(item));
});

test.each(SEM_DESTINO_C3)("contrato público de $slug mantém a exceção após normalização", ({ slug, tipo }) => {
  // API: id UUID distinto do slug. Frontend: id/slug públicos iguais e UUID separado.
  const payload = {
    id: "00000000-0000-4000-8000-000000000001", slug, nome: "Nome editorial alterado",
    categoria: { id: "categoria", nome: "Histórico", slug: "historico" },
    categoriasAdicionais: [],
    localizacao: { endereco: "Rua legada", numero: "99", cidade: "Guarulhos", uf: "SP", latitude: "-23.45", longitude: "-46.53" },
  };
  const normalizado = normalizarPatrimonio(payload);
  expect(normalizado).toMatchObject({ id: slug, slug, uuid: payload.id, categoria: "historico", categorias: ["historico"] });
  expect(classificarLocalizacao(payload).tipo).toBe(tipo);
  expect(classificarLocalizacao(normalizado).tipo).toBe(tipo);
  expect(criarUrlRota(normalizado)).toBeNull();
});

test.each([true, false])("contrato normalizado reconhece imaterial na categoria principal=%s", (principal) => {
  const imaterial = { id: "cat-imaterial", nome: "Imaterial", slug: "imaterial" };
  const historico = { id: "cat-historico", nome: "Histórico", slug: "historico" };
  const item = normalizarPatrimonio({
    id: "00000000-0000-4000-8000-000000000002", slug: "outro-imaterial", nome: "Outra manifestação",
    categoria: principal ? imaterial : historico,
    categoriasAdicionais: principal ? [] : [imaterial],
    localizacao: { endereco: "Rua legada", cidade: "Guarulhos", uf: "SP", latitude: "-23.45", longitude: "-46.53" },
  });
  expect(item.categoria).toBe(principal ? "imaterial" : "historico");
  expect(item.categorias).toEqual(principal ? ["imaterial"] : ["historico", "imaterial"]);
  expect(classificarLocalizacao(item).tipo).toBe("REFERENCIA");
  expect(criarUrlRota(item)).toBeNull();
});

test.each([
  { categoria: "imaterial" }, { categoria: "imaterial", categorias: [] },
  { categoria: "historico", categorias: ["imaterial"] }, { categoria: { slug: "imaterial" } },
])("outros imateriais também exigem referência estruturada: %j", (categorias) => {
  const item = { ...bem, ...categorias };
  expect(classificarLocalizacao(item).tipo).toBe("REFERENCIA");
  expect(criarUrlRota(item)).toBeNull();
});

test("preservado não infere política de texto livre ou semelhança de nome", () => {
  const item = { ...bem, nome: "Antigo Poço Municipal", detalhes: [{ texto: "DEMOLIDO, referência territorial, SEM_ROTA" }] };
  expect(classificarLocalizacao(item).tipo).toBe("EXATA");
  expect(destino(item)).toContain("Antigo Poço Municipal, Av. Paulo Faccini");
});

test("Parque Ecológico do Tietê conserva São Paulo/SP", () => {
  const item = { ...bem, nome: "Parque Ecológico do Tietê", slug: "parque-ecologico-do-tiete", cidade: "São Paulo", uf: "SP", numero: "s/n", situacao: "PRESERVADO" };
  expect(destino(item)).toContain("São Paulo - SP");
  expect(destino(item)).not.toContain("Guarulhos");
});

test.each([
  ["e-e-dulce-breves-neves", -23.4292107, -46.5225716],
  ["escola-estadual-conselheiro-crispiniano", -23.4620705, -46.5342217],
  ["escola-estadual-capistrano-de-abreu", -23.4666004, -46.5313988],
])("%s mantém fallback SEDUC sem prometer portão de entrada", (slug, lat, lng) => {
  const item = { slug, categoria: "educacional", situacao: "PRESERVADO", localizacao: { latitude: String(lat), longitude: String(lng) } };
  expect(destino(item)).toBe(lat + "," + lng);
  expect(classificarLocalizacao(item)).toMatchObject({ tipo: "EXATA", aviso: "", rotuloRota: "Ver rota" });
});
test("endereço exibe todas as linhas sem valores vazios ou cidade inventada", () => {
  expect(formatarEndereco({ ...bem, numero: "S/N" })).toEqual([
    "Av. Paulo Faccini, s/n — Entrada principal", "Centro", "Guarulhos - SP", "CEP 07115-260",
  ]);
  expect(formatarEndereco({ endereco: " Rua  Exemplo, ", numero: null, complemento: "undefined", cidade: "null" })).toEqual(["Rua Exemplo"]);
  expect(formatarEndereco(null)).toEqual([]);
});
