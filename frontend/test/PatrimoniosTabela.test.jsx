import { afterEach, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPatrimonios from "../src/features/admin/pages/AdminPatrimonios";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => ({ usuario: { perfil: "ADMIN" } }) }));
vi.mock("../src/hooks/useErroModal", () => ({ useErroModal: () => ({ mostrarErro: vi.fn() }) }));
vi.mock("../src/services/patrimoniosApi", () => ({ listarCategorias: async () => [] }));
vi.mock("../src/services/adminApi", () => ({ listarPatrimoniosAdmin: async () => [
  { uuid: "bem", nome: "Estação", categoria: "historico", bairro: "Centro", status: "RASCUNHO" },
] }));
afterEach(() => vi.restoreAllMocks());

test("região de rolagem preserva colunas e torna cada ação focada visível sem executá-la", async () => {
  const rolar = vi.fn();
  const original = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = rolar;
  try {
    const user = userEvent.setup();
    render(<AdminPatrimonios />);
    const regiao = await screen.findByRole("region", { name: "Lista de patrimônios" });
    expect(regiao.tabIndex).toBe(0);
    expect(within(regiao).getAllByRole("columnheader").map(e => e.textContent || e.getAttribute("aria-label")))
      .toEqual(["Nome", "Categoria", "Bairro", "Status", "Ações"]);
    regiao.focus();
    for (const nome of ["Editar Estação", "Publicar Estação", "Arquivar Estação"]) {
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: nome }));
      expect(rolar).toHaveBeenLastCalledWith({ block: "nearest", inline: "nearest" });
    }
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Publicar Estação" }));
    expect(within(regiao).getByText("Rascunho")).toBeTruthy();
  } finally { Element.prototype.scrollIntoView = original; }
});
