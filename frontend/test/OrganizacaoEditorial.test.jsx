import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminRegioes from "../src/features/admin/pages/AdminRegioes";
import Patrimonios from "../src/pages/Patrimonios/Patrimonios";
import MetadataEditorial from "../src/components/MetadataEditorial/MetadataEditorial";
import { normalizarPatrimonio } from "../src/services/patrimoniosApi";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import api from "../src/services/api";

const auth = vi.hoisted(() => ({ perfil: "ADMIN" }));
vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => ({ usuario: { perfil: auth.perfil } }) }));
const original = api.defaults.adapter;
let regions, writes, failed;
const region = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nome: "Região de teste", slug: "regiao-teste", descricao: "Fonte documental", ativo: true };
beforeEach(() => {
  auth.perfil = "ADMIN"; regions = []; writes = []; failed = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.defaults.adapter = async config => {
    let data;
    if (config.method === "get") {
      if (config.url === "/regioes") data = regions.filter(r => r.ativo);
      else {
        const found = regions.filter(r => !config.params?.busca || r.nome.includes(config.params.busca));
        data = { itens: structuredClone(found), paginacao: { pagina: 1, totalPaginas: 1 } };
      }
    } else {
      const body = JSON.parse(config.data);
      writes.push({ method: config.method, url: config.url, body });
      if (failed) throw Object.assign(new Error("INTERNAL SECRET"), { config, response: { status: failed, data: { message: "INTERNAL SECRET" } } });
      if (config.method === "post") { data = { id: region.id, ...body }; regions.push(data); }
      else { data = regions.find(r => config.url.endsWith(r.id)); Object.assign(data, body); }
    }
    return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data } };
  };
});
afterEach(() => { api.defaults.adapter = original; vi.restoreAllMocks(); });

test("D2 normalização mantém null/zero, identidade slug/UUID e ligações", () => {
  const links = [{ id: "ligacao", destino: { slug: "outro" } }];
  const p = normalizarPatrimonio({ id: "uuid", slug: "publico", nome: "Bem", categoria: { slug: "historico" }, regiaoId: region.id, regiao: region, numeroExibicao: 12, ordemExibicao: 0, ligacoes: links });
  expect(p).toMatchObject({ id: "publico", uuid: "uuid", regiaoId: region.id, numeroExibicao: 12, ordemExibicao: 0 });
  expect(p.ligacoes).toBe(links);
  const empty = normalizarPatrimonio({ id: "uuid", slug: "publico", categoria: { slug: "historico" } });
  expect(empty).toMatchObject({ regiao: null, regiaoId: null, numeroExibicao: null, ordemExibicao: null });
});
test("D2 metadata não inventa número nem expõe prioridade/UUID/rota", () => {
  const view = render(<MetadataEditorial item={{ numeroExibicao: null, ordemExibicao: 0 }} />);
  expect(view.container.textContent).toBe("");
  view.rerender(<MetadataEditorial item={{ numeroExibicao: 12, ordemExibicao: 999, regiao: region }} />);
  expect(screen.getByText("Nº 12")).toBeTruthy(); expect(screen.getByText("Região: Região de teste")).toBeTruthy();
  expect(view.container.textContent).not.toContain("999"); expect(view.container.textContent).not.toContain(region.id);
  expect(view.container.querySelector("a")).toBeNull();
});
test("D2 catálogo vazio; ADMIN cria, edita sem mudar slug e inativa/reativa", async () => {
  const user = userEvent.setup(); render(<AdminRegioes />);
  await screen.findByText(/Nenhuma região encontrada/);
  await user.click(screen.getByRole("button", { name: "Nova região" }));
  expect(document.activeElement).toBe(screen.getByLabelText("Nome da região"));
  await user.type(screen.getByLabelText("Nome da região"), region.nome);
  await user.type(screen.getByLabelText("Slug"), region.slug);
  await user.type(screen.getByLabelText("Descrição e referência documental"), region.descricao);
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  await screen.findByRole("heading", { name: region.nome });
  await user.click(screen.getByRole("button", { name: "Editar região " + region.nome }));
  expect(screen.queryByLabelText("Slug")).toBeNull();
  await user.clear(screen.getByLabelText("Nome da região")); await user.type(screen.getByLabelText("Nome da região"), "Nome revisado");
  await user.clear(screen.getByLabelText("Descrição e referência documental"));
  await user.click(screen.getByLabelText("Região ativa"));
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  await screen.findByText(/Inativa · regiao-teste/);
  expect(writes[1]).toEqual({ method: "patch", url: `/admin/regioes/${region.id}`, body: { nome: "Nome revisado", descricao: null, ativo: false } });
  expect(regions[0].slug).toBe(region.slug);
  await user.click(screen.getByRole("button", { name: "Editar região Nome revisado" }));
  await user.click(screen.getByLabelText("Região ativa"));
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  await screen.findByText(/Ativa · regiao-teste/);
});
test("D2 EDITOR não tem interface de gestão nem executa mutação regional", () => {
  auth.perfil = "EDITOR"; render(<AdminRegioes />);
  expect(screen.getByRole("alert").textContent).toContain("Somente ADMIN");
  expect(screen.queryByRole("button", { name: "Nova região" })).toBeNull(); expect(writes).toHaveLength(0);
});
test.each([400, 401, 403, 404, 409, 500])("D2 erro %s regional tem mensagem segura e não repete escrita", async status => {
  regions = [structuredClone(region)]; failed = status;
  const user = userEvent.setup(); render(<AdminRegioes />);
  await user.click(await screen.findByRole("button", { name: "Editar região " + region.nome }));
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  expect((await screen.findByRole("alert")).textContent).not.toContain("INTERNAL SECRET");
  expect(writes).toHaveLength(1);
  if ([401, 403, 404, 409].includes(status)) expect(screen.getByRole("button", { name: "Salvar região" }).closest("fieldset").disabled).toBe(true);
});
const items = [
  { id: "z-priorizado", nome: "Z priorizado", numeroExibicao: 12, ordemExibicao: 0, regiao: region },
  { id: "a-sem-prioridade", nome: "A sem prioridade", numeroExibicao: null, ordemExibicao: null },
  { id: "m-regional", nome: "M regional", numeroExibicao: 7, ordemExibicao: 0, regiao: region },
].map(p => ({ categoria: "historico", categorias: ["historico"], bairro: "Teste", endereco: "Rua", cep: "07010-000", resumo: "Resumo", imagemPrincipal: "/fixture.jpg", ...p }));
function listing(url = "/patrimonios") {
  return render(<MemoryRouter initialEntries={[url]}><PatrimoniosContext.Provider value={{ patrimonios: items, carregando: false, erro: null, setSelecionado: vi.fn() }}><Patrimonios /></PatrimoniosContext.Provider></MemoryRouter>);
}
test("D2 filtros locais preservam ordem da API e número exato não é busca textual", async () => {
  regions = [region]; const user = userEvent.setup(); listing();
  const nomes = () => screen.getAllByRole("article").map(el => within(el).getByRole("heading").textContent);
  expect(nomes()).toEqual(items.map(p => p.nome));
  await user.selectOptions(await screen.findByLabelText("Região"), region.slug);
  expect(nomes()).toEqual(["Z priorizado", "M regional"]);
  await user.type(screen.getByLabelText("Número do patrimônio"), "7");
  expect(nomes()).toEqual(["M regional"]);
  await user.click(screen.getByRole("button", { name: "Limpar filtros editoriais" }));
  expect(nomes()).toEqual(items.map(p => p.nome));
});
test("D2 catálogo vazio não exibe seletor; filtro de URL pode ser limpo", async () => {
  const user = userEvent.setup(); listing("/patrimonios?regiao=regiao-teste");
  await waitFor(() => expect(screen.queryByLabelText("Região")).toBeNull());
  expect(screen.getAllByRole("article")).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Limpar filtros editoriais" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
});
