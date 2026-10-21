import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../src/context/AuthContext";
import LoginAdmin from "../src/features/admin/pages/LoginAdmin";
import AdminSenha from "../src/features/admin/pages/AdminSenha";
import api from "../src/services/api";
import { CHAVE_SESSAO_MOCK } from "../src/context/authConstants.js";
import { prazoRetryAfter } from "../src/utils/retryAfter.js";
import { normalizarErro } from "../src/utils/erros.js";
import { extrairMensagemDeErro } from "../src/services/adminApi.js";
import RotaProtegida from "../src/features/admin/components/RotaProtegida";
import { useAuth } from "../src/hooks/useAuth";
import { useContext } from "react";
import { ErroModalProvider } from "../src/context/ErroModalContext";
import { ErroModalContext } from "../src/context/erroModalContextInstance";

vi.mock("../src/hooks/useErroModal", () => ({ useErroModal: () => ({ mostrarErro: vi.fn() }) }));
const originalAdapter = api.defaults.adapter;
const user = { id: "conta", name: "Pessoa", email: "pessoa@example.test", role: "ADMIN" };
const session = (token = "token-atual", sessionId = "sessao-atual") => sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify({ token, user, sessionId, refreshToken: "refresh-atual", sessionExpiresAt: new Date(Date.now() + 28800000).toISOString() }));
const responseError = (config, status, headers = {}) => ({ config, response: { status, headers, data: {} } });
const mount = (entry = "/admin/login") => render(<MemoryRouter initialEntries={[entry]}><AuthProvider><Routes>
  <Route path="/admin/login" element={<LoginAdmin />} /><Route element={<RotaProtegida />}><Route path="/admin/senha" element={<AdminSenha />} /></Route>
</Routes></AuthProvider></MemoryRouter>);
const fillLogin = () => {
  fireEvent.change(screen.getByLabelText("E-mail institucional"), { target: { value: "pessoa@example.test" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "SenhaInicial123!" } });
};
const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form"));
beforeEach(() => { sessionStorage.clear(); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Retry-After no fluxo real de login", () => {
  it("aceita segundos e data HTTP; ignora ausente, inválido e passado", () => {
    const now = Date.parse("2026-10-20T22:00:00Z");
    expect(prazoRetryAfter("7", now)).toBe(now + 7000);
    expect(prazoRetryAfter("Tue, 20 Oct 2026 22:00:20 GMT", now)).toBe(now + 20000);
    for (const value of [undefined, "", "amanhã", "-1", "1.5", "Infinity", "123x", "Tue, 20 Oct 2026 21:00:00 GMT"]) expect(prazoRetryAfter(value, now)).toBe(null);
  });

  it.each(["3", "Tue, 20 Oct 2026 22:00:03 GMT"])("429 com prazo %s bloqueia, libera sem repetir e limpa timers", async header => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-20T22:00:00Z"));
    const adapter = vi.fn(config => Promise.reject(responseError(config, 429, { "retry-after": header })));
    api.defaults.adapter = adapter;
    const view = mount(); fillLogin();
    await act(async () => { submit(); });
    expect(screen.getByRole("alert").textContent).toContain("Muitas tentativas");
    expect(screen.getByRole("alert").textContent).not.toContain("senha inválidos");
    expect(screen.getByRole("button", { name: "Entrar" }).disabled).toBe(true);
    await act(async () => { vi.advanceTimersByTime(3100); });
    expect(screen.getByRole("button", { name: "Entrar" }).disabled).toBe(false);
    expect(adapter).toHaveBeenCalledTimes(1);
    view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });

  it.each([undefined, "inválido"])("429 com cabeçalho %s orienta sem inventar prazo", async header => {
    api.defaults.adapter = config => Promise.reject(responseError(config, 429, { "retry-after": header }));
    mount(); fillLogin(); await act(async () => { submit(); });
    expect(screen.getByRole("alert").textContent).toContain("Muitas tentativas");
    expect(screen.getByRole("alert").textContent).not.toContain(" s.");
    expect(screen.getByRole("button", { name: "Entrar" }).disabled).toBe(false);
  });

  it("evita envios duplicados enquanto a requisição está pendente", async () => {
    let reject;
    const adapter = vi.fn(config => new Promise((_resolve, rejectPromise) => { reject = () => rejectPromise(responseError(config, 401)); }));
    api.defaults.adapter = adapter; mount(); fillLogin();
    const form = screen.getByRole("button", { name: "Entrar" }).closest("form");
    await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Validando acesso/ }).disabled).toBe(true);
    await act(async () => { reject(); });
    expect(screen.getByRole("alert").textContent).toBe("E-mail ou senha inválidos.");
  });
});

describe("sessão e troca de senha", () => {
  it("troca de senha apos renovar conserva logout e confirmacao no guard real", async () => {
    session();
    api.defaults.adapter = async config => {
      if (config.url === "/auth/refresh") return { config, status: 200, headers: {}, data: { data: { token: "token-renovado", refreshToken: "refresh-renovado", sessionExpiresAt: new Date(Date.now() + 28800000).toISOString() } } };
      if (!config.repetidaAposRenovacao) return Promise.reject({ config, response: { status: 401, data: { error: { code: "ACCESS_TOKEN_EXPIRED" } } } });
      return { config, status: 200, headers: {}, data: { success: true } };
    };
    mount("/admin/senha"); await screen.findByLabelText("Senha atual");
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "SenhaInicial123!" } });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Alterar senha" }).closest("form")); });
    expect(await screen.findByText("Senha alterada com sucesso. Entre novamente para continuar.")).toBeDefined();
    expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).toBe(null);
  });

  it("401 em página pública também atualiza o contexto sem outro cliente HTTP", async () => {
    function Estado() { const { autenticado } = useAuth(); return <span>{autenticado ? "sessão ativa" : "sessão encerrada"}</span>; }
    session(); api.defaults.adapter = config => Promise.reject(responseError(config, 401));
    render(<AuthProvider><Estado /></AuthProvider>);
    await screen.findByText("sessão ativa");
    await act(async () => { await api.get("/admin/patrimonios").catch(() => {}); });
    expect(screen.getByText("sessão encerrada")).toBeDefined();
  });

  it("o modal existente não duplica mensagens de 401 já tratadas", async () => {
    function Reportar() {
      const { mostrarErro } = useContext(ErroModalContext);
      return <button onClick={() => mostrarErro({ sessaoTratada: true, response: { status: 401 } })}>Reportar</button>;
    }
    render(<ErroModalProvider><Reportar /></ErroModalProvider>);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reportar" })); });
    expect(screen.queryByText(/Sua sessão expirou/)).toBe(null);
    expect(screen.queryByRole("dialog")).toBe(null);
    expect(screen.queryByRole("alertdialog")).toBe(null);
  });

  it("resposta de troca atrasada preserva a sessão iniciada depois", async () => {
    session();
    let finish;
    api.defaults.adapter = config => new Promise(resolve => { finish = () => resolve({ config, data: { success: true }, status: 200, headers: {} }); });
    mount("/admin/senha"); await screen.findByLabelText("Senha atual");
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "SenhaInicial123!" } });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Alterar senha" }).closest("form")); });
    session("novo-token", "nova-sessao");
    await act(async () => { finish(); });
    expect(JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).token).toBe("novo-token");
    expect(screen.getByRole("heading", { name: "Alterar senha" })).toBeDefined();
  });

  it("a rota protegida preserva a confirmação durante logout e navegação", async () => {
    session();
    api.defaults.adapter = config => Promise.resolve({ config, data: { success: true }, status: 200, headers: {} });
    render(<MemoryRouter initialEntries={["/admin/senha"]}><AuthProvider><Routes>
      <Route element={<RotaProtegida />}><Route path="/admin/senha" element={<AdminSenha />} /></Route>
      <Route path="/admin/login" element={<LoginAdmin />} />
    </Routes></AuthProvider></MemoryRouter>);
    await screen.findByLabelText("Senha atual");
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "SenhaInicial123!" } });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Alterar senha" }).closest("form")); });
    expect(screen.getByRole("status").textContent).toBe("Senha alterada com sucesso. Entre novamente para continuar.");
  });

  it("troca encerra sessão local e mantém confirmação após redirecionar", async () => {
    session();
    const adapter = vi.fn(config => Promise.resolve({ data: { success: true }, status: 200, headers: {}, config }));
    api.defaults.adapter = adapter; mount("/admin/senha");
    await screen.findByLabelText("Senha atual");
    fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "SenhaInicial123!" } });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "NovaSenhaSegura123!" } });
    await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Alterar senha" }).closest("form")); });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).toBe(null);
    expect(screen.getByRole("status").textContent).toBe("Senha alterada com sucesso. Entre novamente para continuar.");
  });

  it("401 simultâneos causam um encerramento; resposta antiga não apaga sessão nova", async () => {
    const request = api.interceptors.request.handlers[0].fulfilled;
    const rejected = api.interceptors.response.handlers[0].rejected;
    const assign = vi.fn(); vi.stubGlobal("window", { location: { pathname: "/admin/patrimonios", assign } });
    session();
    const old = request({ headers: {}, url: "/admin/patrimonios" });
    session("token-novo", "sessao-nova");
    await expect(rejected(responseError(old, 401))).rejects.toBeDefined();
    expect(JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).token).toBe("token-novo");
    // Até um JWT idêntico de outro login no mesmo segundo tem identidade local nova.
    session("token-atual", "outra-sessao");
    await expect(rejected(responseError(old, 401))).rejects.toBeDefined();
    expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).not.toBe(null);
    const current = request({ headers: {}, url: "/admin/patrimonios" });
    await Promise.allSettled([rejected(responseError(current, 401)), rejected(responseError(current, 401))]);
    expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).toBe(null);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/admin/login?expirou=1");
  });

  it("401 do login, 403, upload e falha de rede não encerram a sessão", async () => {
    const request = api.interceptors.request.handlers[0].fulfilled;
    const rejected = api.interceptors.response.handlers[0].rejected;
    session();
    for (const [url, status] of [["/auth/login", 401], ["/admin/patrimonios", 403], ["/admin/imagens", 415], ["/admin/imagens", 413], ["/admin/imagens", 400]]) {
      const config = request({ headers: {}, url });
      await expect(rejected(responseError(config, status))).rejects.toBeDefined();
      expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).not.toBe(null);
    }
    await expect(rejected({ config: request({ headers: {}, url: "/admin" }), request: {}, message: "Network Error" })).rejects.toBeDefined();
    expect(sessionStorage.getItem(CHAVE_SESSAO_MOCK)).not.toBe(null);
  });
});

it("415 mantém mensagens consistentes em uploads e preserva mensagens de 400/413", () => {
  for (const status of [400, 413, 415]) {
    const error = { response: { status, data: {} } };
    expect(normalizarErro(error).mensagem.length).toBeGreaterThan(10);
    if (status === 415) expect(extrairMensagemDeErro(error)).toBe(normalizarErro(error).mensagem);
  }
  expect(normalizarErro({ response: { status: 415 } }).mensagem).toContain("formato ou o conteúdo");
});
