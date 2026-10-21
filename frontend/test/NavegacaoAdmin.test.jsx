import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "../src/components/Navbar/NavBar";
import { AuthProvider } from "../src/context/AuthContext";
import { AuthContext } from "../src/context/AuthContextInstance";
import { ErroModalProvider } from "../src/context/ErroModalContext";
import { CHAVE_SESSAO_MOCK } from "../src/context/authConstants";
import AdminLayout from "../src/features/admin/components/AdminLayout";
import RotaProtegida from "../src/features/admin/components/RotaProtegida";
import LoginAdmin from "../src/features/admin/pages/LoginAdmin";
import api from "../src/services/api";

const adapterOriginal = api.defaults.adapter;
const usuario = role => ({ id: "conta", name: "Pessoa", email: "pessoa@example.test", role });
const credenciais = role => ({
  token: "acesso-atual", refreshToken: "renovacao-atual",
  sessionExpiresAt: new Date(Date.now() + 3600000).toISOString(), user: usuario(role),
});
const lerSessao = () => JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MOCK));
const salvarSessao = (role = "ADMIN", campos = {}) => {
  const sessao = { ...credenciais(role), sessionId: "sessao-local", ...campos };
  sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify(sessao));
  return sessao;
};
const resposta = (config, data = {}) => ({ config, status: 200, headers: {}, data: { success: true, data } });
const recusar = (config, code = "UNAUTHORIZED") => Promise.reject({
  config, response: { status: 401, data: { error: { code } } },
});

function abrir(entry = "/") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ErroModalProvider><AuthProvider><Routes>
        <Route path="/" element={<><Navbar /><h1>Site público</h1><Link to="/admin/login">Abrir login diretamente</Link></>} />
        <Route path="/admin/login" element={<LoginAdmin />} />
        <Route element={<RotaProtegida permissoes={["ADMIN", "EDITOR"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<h1>Painel de teste</h1>} />
            <Route path="/admin/patrimonios" element={<h1>Acervo de teste</h1>} />
            <Route element={<RotaProtegida permissoes={["ADMIN"]} />}>
              <Route path="/admin/usuarios" element={<h1>Gestão de contas</h1>} />
            </Route>
          </Route>
        </Route>
      </Routes></AuthProvider></ErroModalProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  // Nunca permitir que estes testes alcancem o backend real.
  api.defaults.adapter = vi.fn(config => Promise.reject(new Error(`Requisição inesperada: ${config.url}`)));
});
afterEach(() => {
  cleanup();
  api.defaults.adapter = adapterOriginal;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("navegação entre site e administração", () => {
  it("visitante entra pelo formulário de login", async () => {
    const user = userEvent.setup(); abrir();
    const acesso = screen.getByRole("link", { name: "Área administrativa" });
    expect(acesso.getAttribute("href")).toBe("/admin/login");
    await user.click(acesso);
    expect(screen.getByRole("heading", { name: "Entrar no painel" })).toBeDefined();
    expect(screen.queryByRole("progressbar", { name: "Força da senha" })).toBeNull();
    expect(api.defaults.adapter).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "EDITOR"])("%s faz login, volta ao site e retorna sem novas credenciais", async role => {
    const user = userEvent.setup();
    const adapter = vi.fn(config => config.url === "/auth/login"
      ? Promise.resolve(resposta(config, credenciais(role)))
      : Promise.reject(new Error(`Requisição inesperada: ${config.url}`)));
    api.defaults.adapter = adapter; abrir("/admin/login");
    await user.type(screen.getByLabelText("E-mail institucional"), "pessoa@example.test");
    await user.type(screen.getByLabelText("Senha"), "SenhaDeTeste123!");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByRole("heading", { name: "Painel de teste" });
    const sessao = sessionStorage.getItem(CHAVE_SESSAO_MOCK);
    expect(lerSessao().user.role).toBe(role);
    expect(!!screen.queryByRole("link", { name: "Usuários" })).toBe(role === "ADMIN");

    await user.click(screen.getByRole("link", { name: "Voltar ao site" }));
    expect(screen.getByRole("heading", { name: "Site público" })).toBeDefined();
    expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).toBe(sessao);
    expect(screen.getByRole("link", { name: "Área administrativa" }).getAttribute("href")).toBe("/admin");
    await user.click(screen.getByRole("link", { name: "Área administrativa" }));
    expect(screen.getByRole("heading", { name: "Painel de teste" })).toBeDefined();
    expect(screen.queryByLabelText("Senha")).toBeNull();
    expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).toBe(sessao);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it.each(["ADMIN", "EDITOR"])("%s com sessão salva não vê o formulário ao abrir /admin/login", async role => {
    const sessao = salvarSessao(role); abrir("/admin/login");
    await screen.findByRole("heading", { name: "Painel de teste" });
    expect(screen.queryByLabelText("Senha")).toBeNull();
    expect(lerSessao()).toEqual(sessao);
    expect(api.defaults.adapter).not.toHaveBeenCalled();
  });

  it("aguarda a restauração da sessão antes de mostrar formulário ou redirecionar", () => {
    render(<MemoryRouter><ErroModalProvider>
      <AuthContext.Provider value={{ carregando: true, autenticado: false }}><LoginAdmin /></AuthContext.Provider>
    </ErroModalProvider></MemoryRouter>);
    expect(screen.getByRole("status").textContent).toBe("Verificando sessão...");
    expect(screen.queryByLabelText("Senha")).toBeNull();
  });

  it("Navbar só aponta ao painel após concluir a restauração da sessão", () => {
    const pagina = carregando => <MemoryRouter>
      <AuthContext.Provider value={{ carregando, autenticado: true }}><Navbar /></AuthContext.Provider>
    </MemoryRouter>;
    const { rerender } = render(pagina(true));
    expect(screen.getByRole("link", { name: "Área administrativa" }).getAttribute("href")).toBe("/admin/login");
    rerender(pagina(false));
    expect(screen.getByRole("link", { name: "Área administrativa" }).getAttribute("href")).toBe("/admin");
  });

  it("sessão expirada no armazenamento exige novo login", async () => {
    salvarSessao("ADMIN", { sessionExpiresAt: new Date(Date.now() - 1000).toISOString() });
    abrir("/admin");
    await screen.findByRole("heading", { name: "Entrar no painel" });
    expect(lerSessao()).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Sua sessão expirou");
    expect(api.defaults.adapter).not.toHaveBeenCalled();
  });

  it("expiração enquanto navega no site atualiza o acesso administrativo", async () => {
    vi.useFakeTimers();
    salvarSessao("EDITOR", { sessionExpiresAt: new Date(Date.now() + 5000).toISOString() });
    abrir("/admin");
    fireEvent.click(screen.getByRole("link", { name: "Voltar ao site" }));
    expect(screen.getByRole("link", { name: "Área administrativa" }).getAttribute("href")).toBe("/admin");
    await act(async () => { vi.advanceTimersByTime(5001); });
    expect(lerSessao()).toBeNull();
    expect(screen.getByRole("link", { name: "Área administrativa" }).getAttribute("href")).toBe("/admin/login");
    fireEvent.click(screen.getByRole("link", { name: "Área administrativa" }));
    expect(screen.getByLabelText("Senha")).toBeDefined();
  });

  it("401 de sessão revogada limpa o contexto e exige login ao retornar", async () => {
    const user = userEvent.setup(); salvarSessao(); abrir("/admin");
    await user.click(screen.getByRole("link", { name: "Voltar ao site" }));
    const adapter = vi.fn(config => recusar(config)); api.defaults.adapter = adapter;
    await act(async () => { await api.get("/admin/patrimonios").catch(() => {}); });
    expect(lerSessao()).toBeNull();
    expect(screen.getByRole("link", { name: "Área administrativa" }).getAttribute("href")).toBe("/admin/login");
    await user.click(screen.getByRole("link", { name: "Área administrativa" }));
    expect(screen.getByLabelText("Senha")).toBeDefined();
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("JWT vencido com sessão válida renova e permite voltar ao painel", async () => {
    const user = userEvent.setup(); const sessao = salvarSessao(); abrir("/admin");
    await user.click(screen.getByRole("link", { name: "Voltar ao site" }));
    const adapter = vi.fn(config => {
      if (config.url === "/auth/refresh") return Promise.resolve(resposta(config, {
        token: "acesso-renovado", refreshToken: "renovacao-nova", sessionExpiresAt: sessao.sessionExpiresAt,
      }));
      return config.repetidaAposRenovacao ? Promise.resolve(resposta(config)) : recusar(config, "ACCESS_TOKEN_EXPIRED");
    });
    api.defaults.adapter = adapter;
    await act(async () => { await api.get("/admin/patrimonios"); });
    expect(lerSessao()).toEqual({ ...sessao, token: "acesso-renovado", refreshToken: "renovacao-nova" });
    await user.click(screen.getByRole("link", { name: "Área administrativa" }));
    expect(screen.getByRole("heading", { name: "Painel de teste" })).toBeDefined();
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      "/admin/patrimonios", "/auth/refresh", "/admin/patrimonios",
    ]);
    expect(adapter.mock.calls[1][0].headers.Authorization).toBeUndefined();
    expect(adapter.mock.calls[2][0].headers.Authorization).toBe("Bearer acesso-renovado");
  });

  it.each(["ADMIN", "EDITOR"])("Sair de %s solicita revogação e não permite retornar autenticado", async role => {
    const user = userEvent.setup(); const sessao = salvarSessao(role);
    const adapter = vi.fn(config => Promise.resolve(resposta(config)));
    api.defaults.adapter = adapter; abrir("/admin");
    await user.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByRole("heading", { name: "Entrar no painel" });
    expect(lerSessao()).toBeNull();
    expect(adapter).toHaveBeenCalledTimes(1);
    const config = adapter.mock.calls[0][0];
    expect(config.url).toBe("/auth/logout");
    expect(JSON.parse(config.data)).toEqual({ refreshToken: sessao.refreshToken });
    expect(config.headers.Authorization).toBeUndefined();
    await user.click(screen.getByRole("link", { name: "Voltar ao site" }));
    expect(screen.getByRole("link", { name: "Área administrativa" }).getAttribute("href")).toBe("/admin/login");
  });

  it("EDITOR continua impedido de acessar gestão de usuários diretamente", () => {
    salvarSessao("EDITOR"); abrir("/admin/usuarios");
    expect(screen.getByText(/não tem permissão para acessar essa área/)).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Gestão de contas" })).toBeNull();
  });
});
