import { beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../src/App";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import { AuthContext } from "../src/context/AuthContextInstance";

vi.mock("../src/context/PatrimoniosContext", () => ({
  PatrimoniosProvider: ({ children }) => <PatrimoniosContext.Provider value={{ patrimonios: [], carregando: false }}>{children}</PatrimoniosContext.Provider>,
}));
vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }) => <AuthContext.Provider value={{ carregando: false, autenticado: false, usuario: null }}>{children}</AuthContext.Provider>,
}));
beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));

test.each(["/pagina-inexistente", "/admin/pagina-inexistente"])("rota real %s exibe 404 sem conteúdo administrativo", caminho => {
  window.history.replaceState(null, "", caminho);
  render(<App />);
  expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Voltar ao início" }).getAttribute("href")).toBe("/");
  expect(screen.getByRole("link", { name: "Ver patrimônios" }).getAttribute("href")).toBe("/patrimonios");
});

test("rota administrativa conhecida continua protegida e leva ao login", async () => {
  window.history.replaceState(null, "", "/admin/patrimonios");
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Entrar no painel" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Página não encontrada" })).toBeNull();
  expect(window.location.pathname).toBe("/admin/login");
});
