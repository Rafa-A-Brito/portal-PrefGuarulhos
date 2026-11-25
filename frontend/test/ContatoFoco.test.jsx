import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import Contato from "../src/pages/Contato/Contato";

vi.mock("../src/utils/feedbackPublico", () => ({ feedbackAtivo: () => false }));
afterEach(cleanup);
it("Enter abre com foco em Fechar; Tab e Shift+Tab percorrem o painel e podem sair", async () => {
  const user = userEvent.setup(); render(<Contato />); const fab = screen.getByRole("button", { name: "Informações institucionais" });
  fab.focus(); await user.keyboard("{Enter}"); const fechar = screen.getByRole("button", { name: "Fechar informações" });
  expect(document.activeElement).toBe(fechar);
  expect(screen.getByRole("dialog").hasAttribute("aria-modal")).toBe(false); expect(document.body.style.overflow).not.toBe("hidden");
  await user.tab(); expect(document.activeElement.closest(".contato-pop")).not.toBeNull(); expect(document.activeElement.tagName).toBe("A");
  await user.tab(); expect(document.activeElement).toBe(fab);
  await user.tab({ shift: true }); expect(document.activeElement.tagName).toBe("A");
  await user.tab({ shift: true }); expect(document.activeElement).toBe(fechar);
  await user.tab({ shift: true }); expect(document.activeElement).toBe(screen.getByRole("link", { name: "Acessar Ouvidoria" }));
  await user.keyboard("{Escape}"); expect(screen.queryByRole("dialog")).toBeNull(); expect(document.activeElement).toBe(fab);
});
it.each(["fechar", "acionador"])("fechar por %s retorna ao FAB sem alterar rolagem", async modo => {
  const user = userEvent.setup(); render(<Contato />); const fab = screen.getByRole("button", { name: "Informações institucionais" }); await user.click(fab);
  const alvo = modo === "fechar" ? screen.getByRole("button", { name: "Fechar informações" }) : fab;
  alvo.focus(); await user.keyboard("{Enter}"); expect(document.activeElement).toBe(fab); expect(screen.queryByRole("dialog")).toBeNull();
});
it("desmontar remove o listener e não rouba foco da próxima tela", async () => {
  const user = userEvent.setup(); const view = render(<Contato />); await user.click(screen.getByRole("button", { name: "Informações institucionais" }));
  view.unmount(); render(<button>Destino</button>); const destino = screen.getByRole("button", { name: "Destino" }); destino.focus();
  await user.keyboard("{Escape}"); expect(document.activeElement).toBe(destino);
});
