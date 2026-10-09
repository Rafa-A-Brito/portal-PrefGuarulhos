import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  mostrarErro: vi.fn(), geo: vi.fn(), gerar: vi.fn(),
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
    localizacao: { endereco: "Rua Teste", numero: "393", complemento: "Acesso lateral", bairro: "Centro", cep: "07010-000", latitude: -23.4543, longitude: -46.5333 },
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
