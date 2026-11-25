import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminConteudo from "../src/features/admin/components/AdminConteudo";
import { ErroModalProvider } from "../src/context/ErroModalContext";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => ({ usuario: { perfil: "ADMIN" } }) }));
const item = { id: "item", titulo: "Conteúdo de ensaio", artista: "Artista", local: "Centro", periodo: "Novembro", bio: "Biografia", tipo: "NOTICIA", tag: "Cultura", data: "2026-11-20", resumo: "Resumo", texto: "Texto", fontes: [], status: "RASCUNHO" };
let api;
beforeEach(() => {
  api = { listar: vi.fn().mockResolvedValue([item]), detalhe: vi.fn().mockResolvedValue(item), criar: vi.fn().mockResolvedValue(item), atualizar: vi.fn().mockResolvedValue(item) };
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function montar(tipo) {
  const view = render(<ErroModalProvider><AdminConteudo tipo={tipo} api={api} /></ErroModalProvider>);
  return { ...view, user: userEvent.setup(), editar: await screen.findByRole("button", { name: "Editar Conteúdo de ensaio" }), campo: () => screen.getByLabelText(tipo === "novidades" ? "Tipo" : "Título") };
}
for (const tipo of ["exposicoes", "novidades"]) {
  it(`${tipo}: edição aguarda a consulta, foca o primeiro campo e retorna ao cancelar`, async () => {
    let resolver; api.detalhe.mockReturnValue(new Promise(r => { resolver = r; }));
    const { user, editar, campo } = await montar(tipo);
    editar.focus(); await user.keyboard("{Enter}"); expect(editar.disabled).toBe(true); expect(screen.queryByLabelText("Título")).toBeNull();
    await act(async () => resolver(item)); await waitFor(() => expect(document.activeElement).toBe(campo()));
    await user.tab(); expect(document.activeElement).toBe(screen.getByLabelText(tipo === "novidades" ? "Título" : "Artista"));
    await user.tab({ shift: true }); expect(document.activeElement).toBe(campo());
    await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(document.activeElement).toBe(editar);
  });
  it(`${tipo}: criação e reabertura focam o formulário e devolvem a Novo conteúdo`, async () => {
    const { user, campo } = await montar(tipo); const novo = screen.getByRole("button", { name: "Novo conteúdo" });
    await user.click(novo); expect(document.activeElement).toBe(campo());
    await user.click(novo); expect(document.activeElement).toBe(campo());
    await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(document.activeElement).toBe(novo); expect(api.detalhe).not.toHaveBeenCalled();
  });
  it(`${tipo}: erro de abertura conserva o alerta e restaura o Editar habilitado`, async () => {
    api.detalhe.mockRejectedValue(new Error("Falha sintética")); const { user, editar } = await montar(tipo);
    await user.click(editar); await screen.findByRole("alertdialog");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fechar" })));
    await user.keyboard("{Escape}"); expect(document.activeElement).toBe(editar); expect(editar.disabled).toBe(false);
  });
  it(`${tipo}: acionador removido por filtro retorna à busca, sem interferir na digitação`, async () => {
    const { user, editar } = await montar(tipo); await user.click(editar);
    const busca = screen.getByLabelText("Buscar título"); await user.type(busca, "inexistente"); expect(document.activeElement).toBe(busca); expect(editar.isConnected).toBe(false);
    await user.click(screen.getByRole("button", { name: "Cancelar" })); expect(document.activeElement).toBe(busca);
  });
  it(`${tipo}: filtro removendo o acionador durante consulta com erro usa retorno lógico`, async () => {
    let rejeitar; api.detalhe.mockReturnValue(new Promise((_, r) => { rejeitar = r; })); const { user, editar } = await montar(tipo);
    await user.click(editar); const busca = screen.getByLabelText("Buscar título"); await user.type(busca, "inexistente");
    await act(async () => rejeitar(new Error("Falha sintética"))); await screen.findByRole("alertdialog"); await waitFor(() => expect(document.activeElement.textContent).toBe("Fechar"));
    await user.keyboard("{Escape}"); expect(document.activeElement).toBe(busca);
  });
  it(`${tipo}: salvar mantém dados e retorna à busca se a lista atualizada remove o acionador`, async () => {
    const { user, editar } = await montar(tipo); await user.click(editar); api.listar.mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Salvar" })); await waitFor(() => expect(screen.queryByLabelText("Título")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Buscar título"))); expect(api.atualizar).toHaveBeenCalledWith("item", expect.objectContaining({ titulo: item.titulo }), null);
  });
  it(`${tipo}: erro ao salvar preserva o formulário e devolve foco a Salvar`, async () => {
    api.atualizar.mockRejectedValue(new Error("Falha sintética")); const { user, editar } = await montar(tipo); await user.click(editar);
    await user.click(screen.getByRole("button", { name: "Salvar" })); await screen.findByRole("alertdialog"); await waitFor(() => expect(document.activeElement.textContent).toBe("Fechar"));
    await user.keyboard("{Escape}"); expect(document.activeElement).toBe(screen.getByRole("button", { name: "Salvar" })); expect(screen.getByLabelText("Título").value).toBe(item.titulo);
  });
}
