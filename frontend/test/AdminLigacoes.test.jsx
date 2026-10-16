import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLigacoes from "../src/features/admin/components/AdminLigacoes";
import api from "../src/services/api";

const origem = "11111111-1111-4111-8111-111111111111";
const casa = { id: "22222222-2222-4222-8222-222222222222", nome: "Casa Amarela", slug: "casa-amarela", status: "PUBLICADO" };
const trem = { id: "33333333-3333-4333-8333-333333333333", nome: "Locomotiva", slug: "locomotiva", status: "RASCUNHO" };
const link = (destino, ordem) => ({ id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${ordem}`, patrimonioDestinoId: destino.id, destino, texto: `Relação com ${destino.nome}`, ordem });
const base = `/admin/patrimonios/${origem}/ligacoes`;
const adapter = api.defaults.adapter;
let lista, destinos, calls, failure, failGet, busy;
beforeEach(() => {
  lista = [link(casa, 0), link(trem, 1)]; destinos = [casa, trem]; calls = []; failure = null; failGet = false; busy = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.defaults.adapter = async config => {
    const body = config.data && JSON.parse(config.data);
    calls.push({ method: config.method, url: config.url, body, params: config.params });
    if (failure && (config.method !== "get" || failGet)) {
      throw Object.assign(new Error("segredo interno"), { config, response: { status: failure, data: { message: "stack trace interno" } } });
    }
    let data;
    if (config.url === "/admin/patrimonios") data = { itens: destinos, paginacao: { totalPaginas: 2 } };
    else if (config.method === "get") data = lista;
    else if (config.method === "post") {
      data = { ...link(destinos.find(p => p.id === body.patrimonioDestinoId), lista.length), texto: body.texto };
      lista = [...lista, data];
    } else if (config.method === "delete") { lista = lista.filter(l => !config.url.endsWith(l.id)); data = {}; }
    else if (config.url.endsWith("/ordem")) { lista = body.ids.map((id, ordem) => ({ ...lista.find(l => l.id === id), ordem })); data = lista; }
    else { lista = lista.map(l => config.url.endsWith(l.id) ? { ...l, ...body } : l); data = lista.find(l => config.url.endsWith(l.id)); }
    return { data: { success: true, data: structuredClone(data) }, status: 200, headers: {}, config };
  };
});
afterEach(() => { api.defaults.adapter = adapter; vi.restoreAllMocks(); });
async function load(props = {}) {
  const user = userEvent.setup();
  render(<AdminLigacoes patrimonioId={origem} status="PUBLICADO" perfil="ADMIN" onBusyChange={busy} {...props} />);
  await waitFor(() => expect(screen.queryByText("Carregando ligações…")).toBeNull());
  return user;
}
async function search(user) {
  await user.type(screen.getByLabelText("Buscar patrimônio relacionado"), "Casa");
  await user.click(screen.getByRole("button", { name: "Buscar patrimônios" }));
  await screen.findByText(/Resultados: página/);
}
const writes = () => calls.filter(c => c.method !== "get");

test("lista nomes/status/textos sem UUIDs, vazio e carregar", async () => {
  await load();
  expect(screen.getAllByRole("heading", { level: 3 }).map(e => e.textContent)).toEqual(["Casa Amarela", "Locomotiva"]);
  expect(screen.getByText("Publicado")).toBeTruthy(); expect(screen.getByText("Rascunho")).toBeTruthy();
  expect(screen.getByText("Relação com Casa Amarela")).toBeTruthy();
  expect(screen.queryByText(casa.id)).toBeNull();
});
test("cria no final sem enviar ordem nem PATCH patrimonial; atualiza a tela", async () => {
  lista = []; const user = await load();
  expect(screen.getByText("Nenhuma ligação cadastrada.")).toBeTruthy();
  await search(user);
  await user.click(screen.getByRole("radio", { name: /Casa Amarela/ }));
  await user.type(screen.getByLabelText("Texto da relação"), "Memória ferroviária.");
  await user.click(screen.getByRole("button", { name: "Adicionar ligação" }));
  await screen.findByText("Ligação adicionada.");
  expect(screen.getByRole("heading", { name: "Casa Amarela" })).toBeTruthy();
  expect(writes()).toEqual([{ method: "post", url: base, body: { patrimonioDestinoId: casa.id, texto: "Memória ferroviária." }, params: undefined }]);
  expect(busy.mock.calls).toEqual([[true], [false]]);
});
test("edita somente texto pelo UUID original, mantendo destino e outros itens", async () => {
  const original = lista[0].id; const user = await load();
  await user.click(screen.getByRole("button", { name: "Editar relação com Casa Amarela" }));
  const field = screen.getByLabelText("Texto da relação");
  expect(document.activeElement).toBe(field);
  await user.clear(field); await user.type(field, "Texto revisado.");
  await user.click(screen.getByRole("button", { name: "Salvar texto da ligação" }));
  await screen.findByText("Texto da ligação atualizado.");
  expect(lista[0].id).toBe(original); expect(lista[0].destino).toEqual(casa);
  expect(writes()[0]).toMatchObject({ method: "patch", url: `${base}/${original}`, body: { texto: "Texto revisado." } });
  expect(screen.getByText("Texto revisado.")).toBeTruthy(); expect(lista).toHaveLength(2);
});
test("confirma exclusão, permite cancelar e exclui só ligação", async () => {
  const original = lista[0].id; const user = await load();
  await user.click(screen.getByRole("button", { name: "Excluir relação com Casa Amarela" }));
  expect(writes()).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Cancelar exclusão" }));
  expect(writes()).toHaveLength(0); expect(screen.queryByText("Confirmar exclusão")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Excluir relação com Casa Amarela" }));
  await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  await screen.findByText("Ligação excluída. O patrimônio foi preservado.");
  expect(screen.queryByRole("heading", { name: "Casa Amarela" })).toBeNull();
  expect(destinos).toHaveLength(2);
  expect(writes()[0]).toMatchObject({ method: "delete", url: `${base}/${original}` });
});
test("reordenação explícita envia todos os UUIDs e preserva registros", async () => {
  const ids = lista.map(l => l.id); const user = await load();
  await user.click(screen.getByRole("button", { name: "Mover Casa Amarela para baixo" }));
  expect(writes()).toHaveLength(0);
  expect(screen.getAllByRole("heading", { level: 3 }).map(e => e.textContent)).toEqual(["Locomotiva", "Casa Amarela"]);
  await user.click(screen.getByRole("button", { name: "Salvar ordem" }));
  await screen.findByText("Ordem das ligações salva.");
  expect(writes()[0]).toMatchObject({ method: "patch", url: `${base}/ordem`, body: { ids: [...ids].reverse() } });
  expect(lista.map(l => l.id)).toEqual([...ids].reverse());
});
test("cancelar ordem não persiste e restaura sequência", async () => {
  const user = await load();
  await user.click(screen.getByRole("button", { name: "Mover Locomotiva para cima" }));
  await user.click(screen.getByRole("button", { name: "Cancelar ordem" }));
  expect(writes()).toHaveLength(0);
  expect(screen.getAllByRole("heading", { level: 3 })[0].textContent).toBe("Casa Amarela");
});
test("busca paginada exclui self, duplicado, legado por slug/UUID e arquivados", async () => {
  lista = [link(casa, 0)];
  destinos = [casa, trem, { ...casa, id: origem, nome: "Próprio" },
    { ...casa, id: "legado", slug: "casarao-da-nossa-historia", nome: "Legado slug" },
    { ...casa, id: "c6d445ab-7259-4196-b422-26d2a5069858", nome: "Legado UUID" },
    { ...casa, id: "arquivado", status: "ARQUIVADO", nome: "Arquivado" }];
  const user = await load(); await search(user);
  expect(screen.getAllByRole("radio")).toHaveLength(1);
  expect(screen.getByRole("radio", { name: /Locomotiva/ })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Próxima página de destinos" }));
  await screen.findByText(/Resultados: página 2/);
  expect(calls.at(-1).params).toEqual({ busca: "Casa", pagina: 2, limite: 20 });
});
test.each([["ADMIN", "PUBLICADO", true], ["ADMIN", "ARQUIVADO", true], ["EDITOR", "RASCUNHO", true], ["EDITOR", "PUBLICADO", false], ["EDITOR", "ARQUIVADO", false]])("permissões UX %s em %s = %s", async (perfil, status, allowed) => {
  const user = await load({ perfil, status });
  expect(Boolean(screen.queryByRole("button", { name: "Editar relação com Casa Amarela" }))).toBe(allowed);
  if (allowed) {
    await user.click(screen.getByRole("button", { name: "Editar relação com Casa Amarela" }));
    await user.click(screen.getByRole("button", { name: "Salvar texto da ligação" }));
    await screen.findByText("Texto da ligação atualizado."); expect(writes()).toHaveLength(1);
  } else expect(writes()).toHaveLength(0);
});
test.each([[400, /Confira o texto/], [401, /Sua sessão expirou/], [403, /Você não tem permissão/], [404, /não está mais disponível/], [409, /a ordem ter mudado/], [500, /Tente novamente em instantes/]])("erro %s seguro, sem mutação local e recuperação", async (status, message) => {
  const user = await load();
  await user.click(screen.getByRole("button", { name: "Editar relação com Casa Amarela" }));
  failure = status;
  await user.click(screen.getByRole("button", { name: "Salvar texto da ligação" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(message);
  expect(document.body.textContent).not.toMatch(/stack trace|segredo interno/);
  expect(lista[0].texto).toBe("Relação com Casa Amarela");
  failure = null;
  await user.click(screen.getByRole("button", { name: "Atualizar ligações" }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
test("409 ao reordenar exige atualizar e abandona ordem obsoleta", async () => {
  const user = await load();
  await user.click(screen.getByRole("button", { name: "Mover Locomotiva para cima" }));
  failure = 409;
  await user.click(screen.getByRole("button", { name: "Salvar ordem" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Salvar ordem" }).disabled).toBe(true);
  failure = null; lista = [lista[1]];
  await user.click(screen.getByRole("button", { name: "Atualizar ligações" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar ordem" })).toBeNull());
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
});
test("falha de leitura bloqueia escritas até recarregar", async () => {
  failure = 404; failGet = true; const user = await load();
  expect(screen.getByRole("alert")).toBeTruthy(); expect(screen.queryByText("Nenhuma ligação cadastrada.")).toBeNull();
  failure = null;
  await user.click(screen.getByRole("button", { name: "Atualizar ligações" }));
  await screen.findByRole("heading", { name: "Casa Amarela" });
});
test("teclado edita e cancela, texto é literal e limitado", async () => {
  const user = await load();
  const button = screen.getByRole("button", { name: "Editar relação com Casa Amarela" });
  button.focus(); await user.keyboard("{Enter}");
  const field = screen.getByLabelText("Texto da relação"); expect(field.maxLength).toBe(2000);
  fireEvent.change(field, { target: { value: "<script>alert(1)</script>" } });
  await user.tab(); await user.keyboard("{Enter}");
  await screen.findByText("Texto da ligação atualizado.");
  expect(within(screen.getAllByRole("listitem")[0]).getByText("<script>alert(1)</script>")).toBeTruthy();
  expect(document.querySelector(".admin-ligacoes script")).toBeNull();
});
