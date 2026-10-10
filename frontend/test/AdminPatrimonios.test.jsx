import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPatrimonios from "../src/features/admin/pages/AdminPatrimonios";
import api from "../src/services/api";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RotaProtegida from "../src/features/admin/components/RotaProtegida";
import { normalizarPatrimonio } from "../src/services/fakeApi";
import { montarEndereco, chaveEndereco } from "../src/services/maps";
import { CHAVE_SESSAO_MOCK } from "../src/context/authConstants";

const flags = vi.hoisted(() => ({
  perfil: "ADMIN", autenticado: true, demo: false, erroMaps: null,
  mostrarErro: vi.fn(), geo: vi.fn(), gerar: vi.fn(), cep: vi.fn(),
}));
vi.mock("../src/services/cepApi", async importOriginal => ({
  ...await importOriginal(), consultarCep: flags.cep,
}));
vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => ({ usuario: { perfil: flags.perfil }, autenticado: flags.autenticado, carregando: false }) }));
vi.mock("../src/hooks/useGoogleMaps", () => ({ useGoogleMaps: () => ({ erro: flags.erroMaps }) }));
vi.mock("../src/hooks/useErroModal", () => ({ useErroModal: () => ({ mostrarErro: flags.mostrarErro }) }));
vi.mock("../src/services/maps", async importOriginal => ({
  ...await importOriginal(),
  get GEOCODING_EM_MODO_DEMO() { return flags.demo; },
  geocodificarEndereco: flags.geo,
}));
vi.mock("../src/services/gemini", async importOriginal => ({
  ...await importOriginal(), gerarResumoDeArquivo: flags.gerar,
}));

const cats = [
  { id: "11111111-1111-4111-8111-111111111111", nome: "Arquitetônico", slug: "arquitetonico" },
  { id: "22222222-2222-4222-8222-222222222222", nome: "Histórico", slug: "historico" },
];
const id = "33333333-3333-4333-8333-333333333333";
const secondId = "44444444-4444-4444-8444-444444444444";
function fixture(uuid = id, nome = "Estação") {
  return {
    id: uuid, slug: "bem-" + uuid, nome, categoria: cats[0], categoriaId: cats[0].id,
    categoriasAdicionais: [cats[1]], status: "RASCUNHO", situacao: "PRESERVADO",
    descricao: "Descrição completa atual.", descricaoResumida: "Resumo editorial próprio.",
    historia: "História completa atual.", importanciaCultural: "Importância atual.",
    localizacao: { endereco: "Rua Teste", numero: "393", bairro: "Centro", cep: "07010-000", cidade: "São Paulo", uf: "SP", complemento: "Acesso lateral", latitude: "-23.4543000", longitude: "-46.5333000" },
    imagens: [{ id: "imagem-existente", url: "/uploads/patrimonios/existente.jpg", textoAlternativo: "Fachada existente", ordem: 0, principal: true }],
  };
}
let records, calls, hook;
const originalAdapter = api.defaults.adapter;
const clone = value => JSON.parse(JSON.stringify(value));
const reply = (config, data) => ({ data: { success: true, data }, status: 200, statusText: "OK", headers: {}, config });
function rejectApi(config, status, message) {
  throw Object.assign(new Error(message), { config, response: { status, data: { error: { message } } } });
}
beforeEach(() => {
  vi.clearAllMocks();
  flags.cep.mockReset().mockResolvedValue(postal);
  flags.perfil = "ADMIN"; flags.autenticado = true; flags.demo = false; flags.erroMaps = null;
  flags.geo.mockResolvedValue({ lat: -23.46, lng: -46.54 });
  flags.gerar.mockResolvedValue("Resumo gerado para revisão.");
  records = [fixture(), fixture(secondId, "Outro patrimônio")]; calls = []; hook = null;
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.defaults.adapter = async config => {
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    calls.push({ method: config.method, url: config.url, body });
    if (hook) { const intercepted = await hook(config); if (intercepted) return intercepted; }
    if (config.url === "/categorias") return reply(config, cats);
    if (config.url === "/admin/patrimonios" && config.method === "get") {
      return reply(config, { itens: records.map(p => {
        const item = clone(p);
        delete item.descricao; delete item.historia; delete item.importanciaCultural;
        return item;
      }), paginacao: { pagina: 1, totalPaginas: 1 } });
    }
    if (config.url === "/admin/patrimonios" && config.method === "post") {
      const created = { ...fixture("55555555-5555-4555-8555-555555555555", body.nome), ...body, categoria: cats.find(c => c.id === body.categoriaId), categoriasAdicionais: [], imagens: [] };
      records.push(created);
      return reply(config, { id: created.id });
    }
    const current = records.find(p => config.url === "/admin/patrimonios/" + p.id);
    if (current && config.method === "get") return reply(config, clone(current));
    if (current && config.method === "patch") {
      Object.assign(current, { ...body, localizacao: { ...current.localizacao, ...body.localizacao }, categoriasAdicionais: body.categoriasAdicionais.map(cid => cats.find(c => c.id === cid)) });
      return reply(config, clone(current));
    }
    const statusRecord = records.find(p => config.url.startsWith("/admin/patrimonios/" + p.id + "/"));
    if (statusRecord && config.method === "patch") {
      statusRecord.status = config.url.endsWith("/publicar") ? "PUBLICADO" : "ARQUIVADO";
      return reply(config, clone(statusRecord));
    }
    if (statusRecord && config.method === "post" && config.url.endsWith("/imagens")) {
      const image = { id: "imagem-nova", url: "/uploads/nova.png", textoAlternativo: body.get("textoAlternativo"), principal: body.get("principal") === "true", ordem: 1 };
      statusRecord.imagens.push(image);
      return reply(config, image);
    }
    if (config.method === "delete") {
      records.forEach(p => { p.imagens = p.imagens.filter(image => !config.url.endsWith(image.id)); });
      return reply(config, { id: config.url.split("/").at(-1) });
    }
    throw new Error("Requisição inesperada no teste: " + config.method + " " + config.url);
  };
});
afterEach(() => { api.defaults.adapter = originalAdapter; vi.restoreAllMocks(); });
async function load() {
  const user = userEvent.setup();
  render(<AdminPatrimonios />);
  await screen.findByRole("button", { name: /^Editar Estação/ });
  return user;
}
async function edit() {
  const user = await load();
  await user.click(screen.getByRole("button", { name: "Editar Estação" }));
  await screen.findByRole("heading", { name: "Editar patrimônio" });
  return user;
}

test("lápis busca pelo UUID, aguarda detalhe e abre edição completa com foco e imagens", async () => {
  let release;
  hook = config => config.url === "/admin/patrimonios/" + id
    ? new Promise(resolve => { release = () => resolve(reply(config, clone(records[0]))); })
    : null;
  const user = await load();
  await user.click(screen.getByRole("button", { name: "Editar Estação" }));
  expect(await screen.findByRole("status")).toHaveProperty("textContent", "Carregando patrimônio para edição…");
  expect(screen.queryByRole("heading", { name: "Editar patrimônio" })).toBeNull();
  expect(screen.getByRole("button", { name: "Editar Outro patrimônio" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Novo patrimônio" }).disabled).toBe(true);
  release();
  await screen.findByRole("heading", { name: "Editar patrimônio" });
  expect(calls.some(c => c.url === "/admin/patrimonios/" + id && c.method === "get")).toBe(true);
  expect(screen.getByLabelText("Nome").value).toBe("Estação");
  expect(screen.getByLabelText("Categoria").value).toBe(cats[0].id);
  expect(screen.getByLabelText("Histórico").checked).toBe(true);
  expect(screen.getByLabelText("Endereço").value).toBe("Rua Teste");
  expect(screen.getByLabelText("História (opcional)").value).toBe(records[0].historia);
  expect(screen.getByRole("img", { name: "Fachada existente" }).src).toBe("http://localhost:3333/uploads/patrimonios/existente.jpg");
  expect(document.activeElement).toBe(screen.getByLabelText("Nome"));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Novo patrimônio" })).toBeNull();
});

test("edição usa PATCH, preserva resumo editorial e imagens, normaliza Decimal e atualiza lista", async () => {
  flags.erroMaps = new Error("Maps indisponível");
  const user = await edit();
  await user.clear(screen.getByLabelText("Nome")); await user.type(screen.getByLabelText("Nome"), "Estação revisada");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByRole("button", { name: "Editar Estação revisada" });
  const patch = calls.find(c => c.method === "patch");
  expect(patch.url).toBe("/admin/patrimonios/" + id);
  expect(patch.body).toEqual({
    nome: "Estação revisada", descricao: records[0].descricao, descricaoResumida: "Resumo editorial próprio.",
    categoriaId: cats[0].id, categoriasAdicionais: [cats[1].id], situacao: "PRESERVADO",
    historia: "História completa atual.", importanciaCultural: "Importância atual.",
    localizacao: { endereco: "Rua Teste", numero: "393", complemento: "Acesso lateral", bairro: "Centro", cidade: "São Paulo", uf: "SP", cep: "07010-000", latitude: -23.4543, longitude: -46.5333 },
  });
  expect(calls.filter(c => c.method === "post")).toHaveLength(0);
  expect(calls.filter(c => c.url === "/admin/patrimonios" && c.method === "get").length).toBe(2);
  expect(records[0].imagens).toHaveLength(1);
  expect(flags.geo).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Editar patrimônio" })).toBeNull();
});

test.each([400, 401, 403, 404, 409])("erro %i ao salvar aparece e mantém formulário e imagens", async status => {
  const user = await edit();
  hook = config => { if (config.method === "patch") rejectApi(config, status, "Falha explícita " + status); };
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Falha explícita " + status);
  expect(screen.getByLabelText("Nome").value).toBe("Estação");
  expect(screen.getByRole("img", { name: "Fachada existente" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Salvar" }).disabled).toBe(false);
});

test("falha ao carregar outro detalhe é visível e preserva formulário e imagens atuais", async () => {
  const user = await edit();
  hook = config => { if (config.url.endsWith(secondId)) rejectApi(config, 404, "Patrimônio removido."); };
  await user.click(screen.getByRole("button", { name: "Editar Outro patrimônio" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Patrimônio removido.");
  expect(screen.getByLabelText("Nome").value).toBe("Estação");
  expect(screen.getByRole("img", { name: "Fachada existente" })).toBeTruthy();
  expect(flags.mostrarErro).toHaveBeenCalled();
});

test.each([
  ["ADMIN", "RASCUNHO", true], ["ADMIN", "PUBLICADO", true], ["ADMIN", "ARQUIVADO", true],
  ["EDITOR", "RASCUNHO", true], ["EDITOR", "PUBLICADO", false], ["EDITOR", "ARQUIVADO", false],
])("%s editando %s: permissão explícita = %s", async (perfil, status, allowed) => {
  flags.perfil = perfil; records[0].status = status;
  const user = await load();
  const button = screen.getByRole("button", { name: /^Editar Estação/ });
  expect(button.disabled).toBe(!allowed);
  if (!allowed) expect(button.getAttribute("aria-label")).toContain("editores só podem editar rascunhos");
  await user.click(button);
  if (allowed) await screen.findByRole("heading", { name: "Editar patrimônio" });
  else {
    expect(screen.queryByRole("heading", { name: "Editar patrimônio" })).toBeNull();
    expect(calls.some(c => c.url.endsWith(id))).toBe(false);
  }
  if (perfil === "EDITOR") {
    expect(screen.queryByRole("button", { name: /^Publicar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Arquivar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remover imagem:/ })).toBeNull();
  }
});

test("EDITOR recebe explicação se detalhe mudou para PUBLICADO após listagem", async () => {
  flags.perfil = "EDITOR";
  const user = await load(); records[0].status = "PUBLICADO";
  await user.click(screen.getByRole("button", { name: "Editar Estação" }));
  expect((await screen.findByRole("alert")).textContent).toContain("não está mais em rascunho");
  expect(screen.queryByRole("heading", { name: "Editar patrimônio" })).toBeNull();
});

test.each([false, true])("modo sem geocoding: endereço alterado=%s preserva ou limpa o par", async mudou => {
  flags.demo = true;
  const user = await edit();
  if (mudou) { await user.clear(screen.getByLabelText("Endereço")); await user.type(screen.getByLabelText("Endereço"), "Nova rua"); }
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(calls.some(c => c.method === "patch")).toBe(true));
  const loc = calls.find(c => c.method === "patch").body.localizacao;
  if (mudou) { expect(loc.latitude).toBeNull(); expect(loc.longitude).toBeNull(); }
  else { expect(loc).not.toHaveProperty("latitude"); expect(loc).not.toHaveProperty("longitude"); }
});

test("endereço alterado geocodifica com cidade existente; falha do Maps explica bloqueio", async () => {
  const user = await edit();
  await user.clear(screen.getByLabelText("Endereço")); await user.type(screen.getByLabelText("Endereço"), "Rua nova");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(calls.some(c => c.method === "patch")).toBe(true));
  expect(flags.geo).toHaveBeenCalledWith(expect.objectContaining({ cidade: "São Paulo", uf: "SP", endereco: "Rua nova" }));
  expect(calls.find(c => c.method === "patch").body.localizacao).toMatchObject({ latitude: -23.46, longitude: -46.54 });
});

test("Maps indisponível bloqueia somente quando precisa recalcular e informa erro", async () => {
  flags.erroMaps = new Error("Maps falhou");
  const user = await edit();
  await user.type(screen.getByLabelText("Endereço"), " alterada");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Google Maps");
  expect(calls.some(c => c.method === "patch")).toBe(false);
});

test("normalização mantém par zero e rejeita strings vazias/valores inválidos", () => {
  for (const latitude of [null, "", " ", "NaN"]) expect(normalizarPatrimonio({ ...fixture(), localizacao: { ...fixture().localizacao, latitude } }).localizacao).toBeNull();
  expect(normalizarPatrimonio({ ...fixture(), localizacao: { ...fixture().localizacao, latitude: "0", longitude: "0" } }).localizacao).toEqual({ lat: 0, lng: 0 });
  expect(montarEndereco(fixture().localizacao)).toContain("São Paulo - SP");
  expect(chaveEndereco(fixture().localizacao)).not.toBe(chaveEndereco({ ...fixture().localizacao, cidade: "Guarulhos" }));
});

test("publicar e arquivar confirmam, usam UUID e recarregam a lista; cancelar não envia", async () => {
  const user = await load();
  window.confirm.mockReturnValueOnce(false);
  await user.click(screen.getByRole("button", { name: "Publicar Estação" }));
  expect(calls.some(c => c.method === "patch")).toBe(false);
  await user.click(screen.getByRole("button", { name: "Publicar Estação" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Publicar Estação" })).toBeNull());
  await user.click(screen.getByRole("button", { name: "Arquivar Estação" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Arquivar Estação" })).toBeNull());
  expect(calls.filter(c => c.method === "patch").map(c => c.url)).toEqual(["/admin/patrimonios/" + id + "/publicar", "/admin/patrimonios/" + id + "/arquivar"]);
});

test("upload multipart preserva imagem anterior; operações bloqueiam troca de patrimônio; remoção usa ID da imagem", async () => {
  const user = await edit();
  const file = new File(["fixture"], "nova.png", { type: "image/png" });
  const form = screen.getByRole("heading", { name: "Editar patrimônio" }).closest("form");
  const input = form.querySelector('input[type="file"][accept*="image/png"]');
  await user.upload(input, file);
  let release;
  hook = config => config.method === "post" ? new Promise(resolve => { release = () => resolve(reply(config, { id: "imagem-nova", url: "/uploads/nova.png", textoAlternativo: "Estação", principal: false, ordem: 1 })); }) : null;
  await user.click(screen.getByRole("button", { name: "Enviar imagem" }));
  expect(screen.getByRole("button", { name: "Editar Outro patrimônio" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Novo patrimônio" }).disabled).toBe(true);
  release();
  await screen.findByRole("img", { name: "Estação" });
  expect(screen.getByRole("img", { name: "Fachada existente" })).toBeTruthy();
  const upload = calls.find(c => c.method === "post");
  expect(upload.url).toBe("/admin/patrimonios/" + id + "/imagens");
  expect(upload.body.get("imagem").name).toBe("nova.png");
  hook = null;
  await user.click(screen.getByRole("button", { name: "Remover imagem: Fachada existente" }));
  await waitFor(() => expect(screen.queryByRole("img", { name: "Fachada existente" })).toBeNull());
  expect(calls.find(c => c.method === "delete").url).toBe("/admin/patrimonios/imagens/imagem-existente");
});

test("novo usa POST e reabre edição; cancelar não grava", async () => {
  flags.demo = true;
  const user = await load();
  await user.click(screen.getByRole("button", { name: "Novo patrimônio" }));
  await user.type(screen.getByLabelText("Nome"), "Novo bem");
  await user.type(screen.getByLabelText("Bairro"), "Centro");
  await user.type(screen.getByLabelText("CEP"), "07010000");
  await user.type(screen.getByLabelText("Endereço"), "Rua");
  await user.type(screen.getByPlaceholderText("Escreva um resumo curto do patrimônio."), "Descrição nova");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByRole("heading", { name: "Editar patrimônio" });
  expect(calls.filter(c => c.method === "post")).toHaveLength(1);
  expect(screen.getByLabelText("Nome").value).toBe("Novo bem");
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("heading", { name: "Editar patrimônio" })).toBeNull();
  expect(calls.some(c => c.method === "patch")).toBe(false);
});

test("401 limpa a sessão; upload inválido é recusado antes de rede", async () => {
  const user = await edit();
  sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify({ token: "fixture" }));
  hook = config => { if (config.method === "patch") rejectApi(config, 401, "Sessão expirada."); };
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByRole("alert");
  expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).toBeNull();
  const form = screen.getByRole("heading", { name: "Editar patrimônio" }).closest("form");
  const input = form.querySelector('input[type="file"][accept*="image/png"]');
  await userEvent.setup({ applyAccept: false }).upload(input, new File(["x"], "bad.txt", { type: "text/plain" }));
  expect(within(form).getAllByRole("alert").some(el => el.textContent.includes("Formato não suportado"))).toBe(true);
  expect(calls.some(c => c.method === "post")).toBe(false);
});

test.each([["ADMIN", true], ["EDITOR", true], ["OUTRO", true], ["ADMIN", false]])("rota de patrimônios: perfil %s, autenticado %s", async (perfil, autenticado) => {
  flags.perfil = perfil; flags.autenticado = autenticado;
  render(<MemoryRouter initialEntries={["/admin/patrimonios"]}><Routes>
    <Route element={<RotaProtegida permissoes={["ADMIN", "EDITOR"]} />}>
      <Route path="/admin/patrimonios" element={<AdminPatrimonios />} />
    </Route>
    <Route path="/admin/login" element={<p>Login de teste</p>} />
  </Routes></MemoryRouter>);
  if (!autenticado) await screen.findByText("Login de teste");
  else if (perfil === "OUTRO") await screen.findByText(/não tem permissão para acessar/);
  else await screen.findByRole("button", { name: /^Editar Estação/ });
  if (!autenticado || perfil === "OUTRO") expect(calls).toHaveLength(0);
});

test("coordenadas zero fazem round-trip pelo formulário e PATCH sem geocodificação", async () => {
  records[0].localizacao.latitude = "0"; records[0].localizacao.longitude = "0";
  const user = await edit();
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(calls.some(c => c.method === "patch")).toBe(true));
  expect(calls.find(c => c.method === "patch").body.localizacao).toMatchObject({ latitude: 0, longitude: 0 });
  expect(flags.geo).not.toHaveBeenCalled();
});

test("troca de categoria principal remove duplicação nas adicionais", async () => {
  const user = await edit();
  await user.selectOptions(screen.getByLabelText("Categoria"), cats[1].id);
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(calls.some(c => c.method === "patch")).toBe(true));
  expect(calls.find(c => c.method === "patch").body).toMatchObject({ categoriaId: cats[1].id, categoriasAdicionais: [] });
});

test("resumo por arquivo usa fluxo existente, bloqueia troca durante geração e permite remover arquivo", async () => {
  const user = await edit();
  await user.click(screen.getByRole("tab", { name: "Enviar arquivo" }));
  const form = screen.getByRole("heading", { name: "Editar patrimônio" }).closest("form");
  const input = form.querySelector('input[type="file"][accept*=".txt"]');
  await user.upload(input, new File(["Texto"], "historia.txt", { type: "text/plain" }));
  expect(screen.getByText("historia.txt")).toBeTruthy();
  let release;
  flags.gerar.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  await user.click(screen.getByRole("button", { name: "Gerar resumo com IA" }));
  expect(screen.getByRole("button", { name: "Novo patrimônio" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Cancelar" }).disabled).toBe(true);
  release("Resumo revisável.");
  await waitFor(() => expect(screen.getByPlaceholderText("Escreva um resumo curto do patrimônio.").value).toBe("Resumo revisável."));
  await user.click(screen.getByRole("button", { name: "Remover arquivo" }));
  expect(screen.queryByText("historia.txt")).toBeNull();
  await user.click(screen.getByRole("tab", { name: "Escrever" }));
  expect(screen.getByPlaceholderText("Escreva um resumo curto do patrimônio.").value).toBe("Resumo revisável.");
});

test("erros de publicar e de upload são tratados e liberam os botões", async () => {
  const user = await load();
  hook = config => { if (config.method === "patch") rejectApi(config, 403, "Sem permissão."); };
  await user.click(screen.getByRole("button", { name: "Publicar Estação" }));
  await waitFor(() => expect(flags.mostrarErro).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Publicar Estação" }).disabled).toBe(false);
  hook = null;
  await user.click(screen.getByRole("button", { name: "Editar Estação" }));
  await screen.findByRole("heading", { name: "Editar patrimônio" });
  const form = screen.getByRole("heading", { name: "Editar patrimônio" }).closest("form");
  await user.upload(form.querySelector('input[type="file"][accept*="image/png"]'), new File(["fixture"], "nova.png", { type: "image/png" }));
  hook = config => { if (config.method === "post") rejectApi(config, 413, "Arquivo grande."); };
  await user.click(screen.getByRole("button", { name: "Enviar imagem" }));
  expect((await screen.findByRole("alert")).textContent).toContain("10 MB");
  expect(screen.getByRole("button", { name: "Enviar imagem" }).disabled).toBe(false);
  expect(screen.getByRole("img", { name: "Fachada existente" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Descartar imagem escolhida" }));
  expect(screen.queryByRole("button", { name: "Enviar imagem" })).toBeNull();
});

const postal = {
  cep: "07112000", endereco: "Rua Postal", bairro: "Bairro Postal", cidade: "Guarulhos", uf: "SP",
};
const postalB = {
  cep: "01001000", endereco: "Praça Postal", bairro: "Outro bairro", cidade: "São Paulo", uf: "SP",
};
const mensagemIndisponivel = "Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.";
async function esperarDebounce() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 520)); });
}
async function novo() {
  const user = await load();
  await user.click(screen.getByRole("button", { name: "Novo patrimônio" }));
  return user;
}
function digitarCep(cep = "07112-000") {
  fireEvent.change(screen.getByLabelText("CEP"), { target: { value: cep } });
}
function digitar(campo, valor) {
  fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });
}

test("CEP incompleto não consulta e CEP completo usa máscara/debounce sem repetir por foco", async () => {
  const user = await novo();
  digitarCep("07112-00");
  await esperarDebounce();
  expect(flags.cep).not.toHaveBeenCalled();
  digitarCep("07112000");
  expect(screen.getByLabelText("CEP").value).toBe("07112-000");
  expect(flags.cep).not.toHaveBeenCalled();
  await esperarDebounce();
  expect(flags.cep).toHaveBeenCalledTimes(1);
  expect(flags.cep).toHaveBeenCalledWith("07112000", { signal: expect.any(AbortSignal) });
  await user.click(screen.getByLabelText("Nome"));
  await user.click(screen.getByLabelText("CEP"));
  digitarCep("07112-000");
  await esperarDebounce();
  expect(flags.cep).toHaveBeenCalledTimes(1);
});

test("CEP preenche quatro campos, mantém número/complemento e não chama Maps ou save", async () => {
  await novo();
  digitar("Número", "42");
  digitar("Complemento", "Portão lateral");
  digitarCep();
  await esperarDebounce();
  for (const [campo, valor] of [["Endereço", postal.endereco], ["Bairro", postal.bairro], ["Cidade", postal.cidade], ["UF", postal.uf]]) {
    expect(screen.getByLabelText(campo).value).toBe(valor);
  }
  expect(screen.getByLabelText("Número").value).toBe("42");
  expect(screen.getByLabelText("Complemento").value).toBe("Portão lateral");
  expect(flags.geo).not.toHaveBeenCalled();
  expect(calls.some(c => ["post", "patch"].includes(c.method))).toBe(false);
});

test("consulta pendente mostra feedback sem bloquear digitação/cancelamento", async () => {
  flags.cep.mockImplementation(() => new Promise(() => {}));
  const user = await novo();
  digitarCep();
  await esperarDebounce();
  expect(screen.getByRole("status").textContent).toBe("Consultando CEP...");
  expect(screen.getByLabelText("CEP").getAttribute("aria-describedby")).toBe("patrimonio-cep-feedback");
  expect(screen.getByRole("button", { name: "Salvar" }).disabled).toBe(false);
  digitar("Endereço", "Correção durante consulta");
  expect(screen.getByLabelText("Endereço").value).toBe("Correção durante consulta");
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(flags.cep.mock.calls[0][1].signal.aborted).toBe(true);
});

test.each([
  ["CEP_NAO_ENCONTRADO", "CEP não encontrado. Preencha o endereço manualmente."],
  ["CEP_INDISPONIVEL", mensagemIndisponivel],
])("%s mostra feedback e permite criação manual", async (codigo, message) => {
  flags.cep.mockRejectedValueOnce(Object.assign(new Error(message), { codigo }));
  const user = await novo();
  digitarCep();
  await esperarDebounce();
  expect(screen.getByRole("status").textContent).toBe(message);
  digitar("Nome", "Cadastro manual");
  digitar("Endereço", "Rua manual");
  digitar("Bairro", "Bairro manual");
  fireEvent.change(screen.getByPlaceholderText("Escreva um resumo curto do patrimônio."), { target: { value: "Resumo manual." } });
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByRole("heading", { name: "Editar patrimônio" });
  expect(calls.find(c => c.method === "post").body.localizacao.endereco).toBe("Rua manual");
  expect(flags.mostrarErro).not.toHaveBeenCalled();
});

test("resposta A atrasada nunca preenche o CEP B; consulta A é abortada", async () => {
  let resolverA;
  flags.cep.mockImplementationOnce(() => new Promise(resolve => { resolverA = resolve; }))
    .mockResolvedValueOnce(postalB);
  await novo();
  digitarCep();
  await esperarDebounce();
  digitarCep("01001-000");
  expect(flags.cep.mock.calls[0][1].signal.aborted).toBe(true);
  await esperarDebounce();
  expect(screen.getByLabelText("Endereço").value).toBe(postalB.endereco);
  await act(async () => resolverA(postal));
  expect(screen.getByLabelText("Endereço").value).toBe(postalB.endereco);
  expect(screen.getByLabelText("CEP").value).toBe("01001-000");
});

test("trocas dentro do debounce fazem somente a consulta final", async () => {
  flags.cep.mockResolvedValueOnce(postalB);
  await novo();
  digitarCep();
  digitarCep("01001-000");
  await esperarDebounce();
  expect(flags.cep).toHaveBeenCalledTimes(1);
  expect(flags.cep.mock.calls[0][0]).toBe("01001000");
});

test("apagar parte do CEP invalida resposta pendente e limpa feedback", async () => {
  let resolver;
  flags.cep.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  await novo();
  digitarCep();
  await esperarDebounce();
  digitarCep("07112-00");
  expect(screen.queryByRole("status")).toBeNull();
  await act(async () => resolver(postal));
  expect(screen.getByLabelText("Endereço").value).toBe("");
  expect(flags.cep).toHaveBeenCalledTimes(1);
});

test("lápis não consulta CEP e alteração de CEP preserva endereço editorial, imagens e categorias", async () => {
  await edit();
  await esperarDebounce();
  expect(flags.cep).not.toHaveBeenCalled();
  digitarCep();
  await esperarDebounce();
  expect(flags.cep).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Endereço").value).toBe("Rua Teste");
  expect(screen.getByLabelText("Bairro").value).toBe("Centro");
  expect(screen.getByLabelText("Cidade").value).toBe("São Paulo");
  expect(screen.getByLabelText("Número").value).toBe("393");
  expect(screen.getByLabelText("Complemento").value).toBe("Acesso lateral");
  expect(screen.getByLabelText("Histórico").checked).toBe(true);
  expect(screen.getByRole("img", { name: "Fachada existente" })).toBeTruthy();
  expect(flags.geo).not.toHaveBeenCalled();
});

test("campos manuais antes/durante a consulta são preservados, inclusive campos apagados", async () => {
  let resolver;
  flags.cep.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  await novo();
  digitar("Endereço", "Nome histórico");
  digitar("Cidade", "Cidade editorial");
  digitarCep();
  await esperarDebounce();
  digitar("Bairro", "Bairro manual");
  digitar("Bairro", "");
  digitar("UF", "rj");
  await act(async () => resolver(postal));
  expect(screen.getByLabelText("Endereço").value).toBe("Nome histórico");
  expect(screen.getByLabelText("Bairro").value).toBe("");
  expect(screen.getByLabelText("Cidade").value).toBe("Cidade editorial");
  expect(screen.getByLabelText("UF").value).toBe("RJ");
});

test("repetir CEP preserva correções dos quatro campos; outro CEP só substitui campos automáticos", async () => {
  flags.cep.mockResolvedValueOnce(postal).mockResolvedValueOnce(postalB).mockResolvedValueOnce(postal);
  await novo();
  digitarCep();
  await esperarDebounce();
  digitar("Endereço", "Endereço revisado");
  digitarCep("01001-000");
  await esperarDebounce();
  expect(screen.getByLabelText("Endereço").value).toBe("Endereço revisado");
  expect(screen.getByLabelText("Bairro").value).toBe(postalB.bairro);
  expect(screen.getByLabelText("Cidade").value).toBe(postalB.cidade);
  digitar("Bairro", "Bairro revisado");
  digitar("Cidade", "Cidade revisada");
  digitar("UF", "mg");
  digitarCep("07112-000");
  await esperarDebounce();
  expect(screen.getByLabelText("Endereço").value).toBe("Endereço revisado");
  expect(screen.getByLabelText("Bairro").value).toBe("Bairro revisado");
  expect(screen.getByLabelText("Cidade").value).toBe("Cidade revisada");
  expect(screen.getByLabelText("UF").value).toBe("MG");
});

test.each(["cancelar", "novo", "editar", "desmontar"])("resposta pendente não vaza ao %s formulário", async acao => {
  let resolver;
  flags.cep.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  const user = await novo();
  digitarCep();
  await esperarDebounce();
  const signal = flags.cep.mock.calls[0][1].signal;
  if (acao === "cancelar") await user.click(screen.getByRole("button", { name: "Cancelar" }));
  if (acao === "novo") await user.click(screen.getByRole("button", { name: "Novo patrimônio" }));
  if (acao === "editar") {
    await user.click(screen.getByRole("button", { name: "Editar Estação" }));
    await screen.findByRole("heading", { name: "Editar patrimônio" });
  }
  if (acao === "desmontar") cleanup();
  expect(signal.aborted).toBe(true);
  await act(async () => resolver(postal));
  if (acao === "novo") expect(screen.getByLabelText("Endereço").value).toBe("");
  if (acao === "editar") expect(screen.getByLabelText("Endereço").value).toBe("Rua Teste");
  if (acao === "cancelar" || acao === "desmontar") expect(screen.queryByLabelText("Endereço")).toBeNull();
});

test("fechar antes do debounce não dispara consulta", async () => {
  const user = await novo();
  digitarCep();
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  await esperarDebounce();
  expect(flags.cep).not.toHaveBeenCalled();
});

test.each(["ADMIN", "EDITOR"])("%s cria com CEP, geocodifica só no save e faz PATCH posterior", async perfil => {
  flags.perfil = perfil;
  const user = await novo();
  digitar("Nome", "Bem com CEP");
  fireEvent.change(screen.getByPlaceholderText("Escreva um resumo curto do patrimônio."), { target: { value: "Descrição para teste." } });
  digitarCep();
  await esperarDebounce();
  digitar("Número", "80");
  digitar("Complemento", "Fundos");
  expect(flags.geo).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByRole("heading", { name: "Editar patrimônio" });
  expect(flags.geo).toHaveBeenCalledTimes(1);
  expect(flags.geo).toHaveBeenCalledWith(expect.objectContaining({ ...postal, cep: "07112-000", numero: "80" }));
  const post = calls.find(c => c.method === "post");
  expect(post.body.localizacao).toEqual({
    ...postal, cep: "07112-000", numero: "80", complemento: "Fundos", latitude: -23.46, longitude: -46.54,
  });
  expect(flags.cep).toHaveBeenCalledTimes(1);
  digitar("Nome", "Bem revisado");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByRole("button", { name: "Editar Bem revisado" });
  expect(calls.filter(c => c.method === "post")).toHaveLength(1);
  expect(calls.find(c => c.method === "patch").url).toBe("/admin/patrimonios/55555555-5555-4555-8555-555555555555");
  expect(flags.geo).toHaveBeenCalledTimes(1);
});

test("edição com campos vazios usa CEP e recalcula coordenadas apenas ao salvar PATCH", async () => {
  Object.assign(records[0].localizacao, { endereco: "", bairro: "" });
  const user = await edit();
  digitarCep();
  await esperarDebounce();
  expect(screen.getByLabelText("Endereço").value).toBe(postal.endereco);
  expect(flags.geo).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(calls.some(c => c.method === "patch")).toBe(true));
  expect(flags.geo).toHaveBeenCalledWith(expect.objectContaining({
    endereco: postal.endereco, bairro: postal.bairro, cidade: "São Paulo", uf: "SP", numero: "393",
  }));
  const patch = calls.find(c => c.method === "patch").body;
  expect(patch.localizacao).toMatchObject({ latitude: -23.46, longitude: -46.54 });
  expect(patch.descricaoResumida).toBe("Resumo editorial próprio.");
  expect(patch.categoriasAdicionais).toEqual([cats[1].id]);
  expect(records[0].imagens).toHaveLength(1);
});

test("consulta não altera coordenadas existentes quando CEP/endereço voltam ao original", async () => {
  flags.erroMaps = new Error("Maps indisponível");
  const user = await edit();
  digitarCep();
  await esperarDebounce();
  digitarCep("07010-000");
  await esperarDebounce();
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(calls.some(c => c.method === "patch")).toBe(true));
  expect(flags.geo).not.toHaveBeenCalled();
  expect(calls.find(c => c.method === "patch").body.localizacao).toMatchObject({ latitude: -23.4543, longitude: -46.5333 });
});

test("salvar cancela consulta pendente e resposta atrasada não altera formulário após falha no PATCH", async () => {
  let resolver;
  flags.cep.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  hook = config => { if (config.method === "patch") rejectApi(config, 409, "Conflito de teste."); };
  const user = await edit();
  digitarCep();
  await esperarDebounce();
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByText("Conflito de teste.");
  expect(flags.cep.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => resolver(postal));
  expect(screen.getByLabelText("Endereço").value).toBe("Rua Teste");
  expect(screen.getByLabelText("CEP").value).toBe("07112-000");
  expect(screen.queryByText("Consultando CEP...")).toBeNull();
});
