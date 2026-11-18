import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminUsuarios from "../src/features/admin/pages/AdminUsuarios";
import { ErroModalProvider } from "../src/context/ErroModalContext";
import * as api from "../src/services/adminApi";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => ({ usuario: { id: "admin" }, atualizarUsuario: vi.fn() }) }));
vi.mock("../src/services/adminApi", () => ({ listarUsuarios: vi.fn(), buscarUsuario: vi.fn(), extrairMensagemDeErro: () => "Falha" }));
const pessoa = { id: "pessoa", nome: "Pessoa de teste", email: "pessoa@example.test", role: "EDITOR", ativo: true };
beforeEach(() => {
  api.listarUsuarios.mockResolvedValue({ itens: [pessoa], paginacao: { totalPaginas: 1, total: 1 } });
  api.buscarUsuario.mockResolvedValue(pessoa);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function montar() {
  render(<ErroModalProvider><AdminUsuarios /></ErroModalProvider>);
  return { user: userEvent.setup(), editar: await screen.findByRole("button", { name: "Editar Pessoa de teste" }) };
}
it("foca o nome depois da consulta e retorna ao editar após cancelar", async () => {
  let resolver;
  api.buscarUsuario.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
  const { user, editar } = await montar();
  editar.focus(); await user.keyboard("{Enter}");
  expect(editar.disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Carregando dados");
  await act(async () => resolver(pessoa));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Nome")));
  await user.tab(); expect(document.activeElement).toBe(screen.getByLabelText("E-mail"));
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(document.activeElement).toBe(editar);
});
it("novo usuário recebe foco e devolve ao botão original", async () => {
  const { user } = await montar();
  const novo = screen.getByRole("button", { name: /Novo usuário/ });
  await user.click(novo);
  expect(document.activeElement).toBe(screen.getByLabelText("Nome"));
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(document.activeElement).toBe(novo);
});
it("falha de abertura mantém o modal de erro e restaura seu acionador ao fechar", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.buscarUsuario.mockRejectedValue(new Error("Falha de ensaio"));
  const { user, editar } = await montar();
  await user.click(editar);
  await screen.findByRole("alertdialog");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fechar" }));
  await user.keyboard("{Escape}");
  expect(document.activeElement).toBe(editar);
  expect(screen.queryByLabelText("Nome")).toBeNull();
});
it("não tenta restaurar foco em acionador removido pelo filtro", async () => {
  const { user, editar } = await montar();
  await user.click(editar);
  api.listarUsuarios.mockResolvedValue({ itens: [], paginacao: { totalPaginas: 0, total: 0 } });
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  await screen.findByText("Nenhum usuário encontrado.");
  expect(editar.isConnected).toBe(false);
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByLabelText("Nome")).toBeNull();
  expect(document.activeElement).not.toBe(editar);
});
