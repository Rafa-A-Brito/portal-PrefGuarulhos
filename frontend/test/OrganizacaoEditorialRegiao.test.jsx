import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import OrganizacaoEditorial from "../src/features/admin/components/OrganizacaoEditorial";
import api from "../src/services/api";

const original = api.defaults.adapter;
const existente = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nome: "Zona Leste", slug: "zona-leste", ativo: true };
let ativas, writes, post;
const ok = (config, data) => ({ config, status: 200, statusText: "OK", headers: {}, data: { success: true, data } });
const falha = (config, status) => { throw Object.assign(new Error("INTERNAL SECRET"), { config, response: { status, data: { message: "INTERNAL SECRET" } } }); };

// O formulário pai (como em AdminPatrimonios): a seção está DENTRO de um <form>.
function Host({ podeCriarRegiao, onSubmit }) {
  const [f, setF] = useState({ regiaoId: "", regiaoAtual: null, numeroExibicao: "", ordemExibicao: "", resumo: "" });
  return <form onSubmit={e => { e.preventDefault(); onSubmit(f); }}>
    <label>Resumo do patrimônio<input value={f.resumo} onChange={e => setF({ ...f, resumo: e.target.value })} /></label>
    <OrganizacaoEditorial formulario={f} atualizar={(c, v) => setF(x => ({ ...x, [c]: v }))} podeCriarRegiao={podeCriarRegiao} />
    <output data-testid="estado">{JSON.stringify({ r: f.regiaoId, n: f.numeroExibicao, s: f.resumo })}</output>
    <button type="submit">Salvar patrimônio</button>
  </form>;
}
beforeEach(() => {
  ativas = [structuredClone(existente)]; writes = []; post = (config, body) => ok(config, { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", descricao: null, ...body });
  api.defaults.adapter = async config => {
    if (config.method === "get") return ok(config, { itens: structuredClone(ativas), paginacao: { pagina: 1, totalPaginas: 1 } });
    const body = JSON.parse(config.data); writes.push({ method: config.method, url: config.url, body });
    return post(config, body);
  };
});
afterEach(() => { cleanup(); api.defaults.adapter = original; vi.restoreAllMocks(); });
const estado = () => JSON.parse(screen.getByTestId("estado").textContent);
async function pronto(props = { podeCriarRegiao: true }, onSubmit = vi.fn()) {
  const user = userEvent.setup(); render(<Host {...props} onSubmit={onSubmit} />);
  await waitFor(() => expect(screen.getByLabelText("Região").disabled).toBe(false));
  return { user, onSubmit };
}

test("EDITOR (sem permissão) não vê o botão e continua selecionando regiões existentes", async () => {
  const { user } = await pronto({ podeCriarRegiao: false });
  expect(screen.queryByRole("button", { name: "+ Nova região" })).toBeNull();
  await user.selectOptions(screen.getByLabelText("Região"), existente.id);
  expect(estado().r).toBe(existente.id);
  expect(screen.getByRole("option", { name: "Não informada" })).toBeTruthy();
});
test("por padrão (sem a prop) o botão não aparece", async () => {
  await pronto({});
  expect(screen.queryByRole("button", { name: "+ Nova região" })).toBeNull();
});
test("catálogo vazio: ADMIN vê a opção Não informada, a dica e o botão; nenhuma região é criada sozinha", async () => {
  ativas = [];
  await pronto();
  expect(screen.getByRole("option", { name: "Não informada" })).toBeTruthy();
  expect(screen.getByText(/Nenhuma região ativa cadastrada/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "+ Nova região" })).toBeTruthy();
  expect(writes).toHaveLength(0);
});
test("ADMIN cria: slug sugerido, ativa por padrão, opção nova selecionada e demais campos preservados", async () => {
  const { user, onSubmit } = await pronto();
  await user.type(screen.getByLabelText("Resumo do patrimônio"), "Texto em edição");
  await user.type(screen.getByLabelText("Número de exibição"), "7");
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  const grupo = screen.getByRole("group", { name: "Nova região" });
  expect(grupo.closest("form")).toBe(screen.getByRole("button", { name: "Salvar patrimônio" }).closest("form")); // dentro do form pai…
  expect(grupo.querySelector("form")).toBeNull(); // …sem <form> aninhado
  expect(document.activeElement).toBe(within(grupo).getByLabelText("Nome da região"));
  expect(within(grupo).getByLabelText("Região ativa").checked).toBe(true);
  await user.type(within(grupo).getByLabelText("Nome da região"), "Praça São José");
  expect(within(grupo).getByLabelText("Slug da região").value).toBe("praca-sao-jose");
  await user.type(within(grupo).getByLabelText("Descrição (opcional)"), "  Fonte X  ");
  await user.click(within(grupo).getByRole("button", { name: "Salvar região" }));
  await waitFor(() => expect(screen.queryByRole("group", { name: "Nova região" })).toBeNull());
  expect(writes).toEqual([{ method: "post", url: "/admin/regioes", body: { nome: "Praça São José", slug: "praca-sao-jose", descricao: "Fonte X", ativo: true } }]);
  expect(screen.getByRole("option", { name: /Praça São José/ })).toBeTruthy();
  expect(screen.getByRole("option", { name: /Zona Leste/ })).toBeTruthy();
  expect(screen.getByRole("option", { name: "Não informada" })).toBeTruthy();
  expect(estado()).toEqual({ r: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", n: "7", s: "Texto em edição" });
  expect(screen.getByLabelText("Região").value).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  expect(onSubmit).not.toHaveBeenCalled(); // o patrimônio não foi enviado
});
test("Enter nos campos da região salva a região e NÃO envia o formulário do patrimônio", async () => {
  const { user, onSubmit } = await pronto();
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.type(screen.getByLabelText("Nome da região"), "Centro{Enter}");
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(onSubmit).not.toHaveBeenCalled();
});
test("cancelar (botão ou Esc) preserva tudo, não grava e devolve o foco ao botão", async () => {
  const { user } = await pronto();
  await user.type(screen.getByLabelText("Resumo do patrimônio"), "Mantido");
  await user.selectOptions(screen.getByLabelText("Região"), existente.id);
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.type(screen.getByLabelText("Nome da região"), "Rascunho");
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  await waitFor(() => expect(screen.queryByRole("group", { name: "Nova região" })).toBeNull());
  expect(estado()).toMatchObject({ r: existente.id, s: "Mantido" });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Nova região" })));
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("group", { name: "Nova região" })).toBeNull());
  expect(writes).toHaveLength(0);
});
test("validação local: nome vazio e slug inválido não chamam a API", async () => {
  const { user } = await pronto();
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  expect((await screen.findByRole("alert")).textContent).toContain("nome");
  await user.type(screen.getByLabelText("Nome da região"), "Ok");
  await user.clear(screen.getByLabelText("Slug da região")); await user.type(screen.getByLabelText("Slug da região"), "Slug Inválido!");
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  expect(screen.getByRole("alert").textContent).toContain("slug");
  expect(writes).toHaveLength(0);
});
test.each([400, 401, 403, 409, 500])("erro %s: mensagem segura, painel e dados preservados, formulário pai intacto", async status => {
  post = config => falha(config, status);
  const { user } = await pronto();
  await user.type(screen.getByLabelText("Resumo do patrimônio"), "Mantido");
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.type(screen.getByLabelText("Nome da região"), "Centro");
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  const alerta = await screen.findByRole("alert");
  expect(alerta.textContent).not.toContain("INTERNAL SECRET");
  expect(screen.getByLabelText("Nome da região").value).toBe("Centro");
  expect(screen.getByLabelText("Slug da região").value).toBe("centro");
  expect(estado()).toMatchObject({ r: "", s: "Mantido" });
  expect(writes).toHaveLength(1); // sem repetir a escrita
  expect(screen.getByRole("button", { name: "Salvar região" }).disabled).toBe(false); // pode corrigir e tentar de novo
});
test("região criada como inativa não é selecionada nem listada como opção", async () => {
  const { user } = await pronto();
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.type(screen.getByLabelText("Nome da região"), "Arquivada");
  await user.click(screen.getByLabelText("Região ativa"));
  await user.click(screen.getByRole("button", { name: "Salvar região" }));
  await screen.findByText(/cadastrada como inativa/);
  expect(estado().r).toBe("");
  expect(screen.queryByRole("option", { name: /Arquivada/ })).toBeNull();
  expect(writes[0].body.ativo).toBe(false);
});
test("duplo clique em Salvar região grava uma única vez", async () => {
  let liberar; post = (config, body) => new Promise(res => { liberar = () => res(ok(config, { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", ...body })); });
  const { user } = await pronto();
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.type(screen.getByLabelText("Nome da região"), "Centro");
  const salvar = screen.getByRole("button", { name: "Salvar região" });
  await user.click(salvar); await user.click(salvar);
  expect(writes).toHaveLength(1);
  liberar(); await waitFor(() => expect(screen.queryByRole("group", { name: "Nova região" })).toBeNull());
});

test("Enter no botão Cancelar fecha o cadastro sem criar região nem salvar patrimônio", async () => {
  const { user, onSubmit } = await pronto();
  await user.click(screen.getByRole("button", { name: "+ Nova região" }));
  await user.type(screen.getByLabelText("Nome da região"), "Rascunho");
  const cancelar = within(screen.getByRole("group", { name: "Nova região" })).getByRole("button", { name: "Cancelar" });
  cancelar.focus();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(screen.queryByRole("group", { name: "Nova região" })).toBeNull());
  expect(writes).toHaveLength(0);
  expect(onSubmit).not.toHaveBeenCalled();
});
