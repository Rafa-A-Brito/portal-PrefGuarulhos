import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForcaSenha from "../src/features/admin/components/ForcaSenha";
import { avaliarForcaSenha } from "../src/utils/forcaSenha.js";
import AdminSenha from "../src/features/admin/pages/AdminSenha";
import AdminUsuarios from "../src/features/admin/pages/AdminUsuarios";
import api from "../src/services/api";
import { AuthProvider } from "../src/context/AuthContext";
import { MemoryRouter } from "react-router-dom";
import { CHAVE_SESSAO_MOCK } from "../src/context/authConstants.js";

vi.mock("../src/hooks/useErroModal", () => ({ useErroModal: () => ({ mostrarErro: vi.fn() }) }));
const adapterOriginal = api.defaults.adapter;
beforeEach(() => {
  api.defaults.adapter = vi.fn(config => Promise.reject(new Error(`Requisição inesperada: ${config.url}`)));
});
afterEach(() => { cleanup(); api.defaults.adapter = adapterOriginal; });
const forte = "TrilhaCultural#2025XyZ";

const montar = pagina => render(<MemoryRouter><AuthProvider>{pagina}</AuthProvider></MemoryRouter>);
const preencherTroca = senha => {
  fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: "SenhaAnterior123!" } });
  fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: senha } });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: senha } });
};

describe("força de senha", () => {
  it("distingue campos vazios, senhas fracas, médias e fortes", () => {
    expect(avaliarForcaSenha("").nivel).toBe("vazia");
    expect(avaliarForcaSenha("aaaaaaaaaaaa").nivel).toBe("fraca");
    expect(avaliarForcaSenha("TrilhaCultural42").nivel).toBe("media");
    expect(avaliarForcaSenha(forte).nivel).toBe("forte");
  });

  it("respeita os limites reais do backend em caracteres e bytes UTF-8", () => {
    expect(avaliarForcaSenha("Aa1!").atendeLimites).toBe(false);
    expect(avaliarForcaSenha("á".repeat(37)).atendeLimites).toBe(false);
    expect(avaliarForcaSenha(forte).atendeLimites).toBe(true);
  });

  it.each([
    ["a".repeat(11), 11, 11, false],
    ["a".repeat(12), 12, 12, true],
    ["a".repeat(72), 72, 72, true],
    ["a".repeat(73), 73, 73, false],
    ["é".repeat(36), 36, 72, true],
    ["é".repeat(37), 37, 74, false],
    ["🌳".repeat(11), 11, 44, false],
    ["🌳".repeat(12), 12, 48, true],
    ["🌳".repeat(18), 18, 72, true],
    ["🌳".repeat(19), 19, 76, false],
  ])("confere caracteres e bytes UTF-8 para %s", (senha, caracteres, bytes, atendeLimites) => {
    expect(avaliarForcaSenha(senha)).toMatchObject({ caracteres, bytes, atendeLimites });
  });

  it("não considera padrões óbvios ou repetições como fortes", () => {
    expect(avaliarForcaSenha("AAAA1234aaaa2026XYZ!").nivel).not.toBe("forte");
    expect(avaliarForcaSenha("A".repeat(28)).nivel).toBe("fraca");
  });

  it("usa progressbar acessível, sem mostrar a senha em texto", () => {
    const { rerender, container } = render(<ForcaSenha senha="" id="teste-forca" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    rerender(<ForcaSenha senha={forte} id="teste-forca" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("3");
    expect(screen.getByText("Forte")).toBeDefined();
    expect(container.textContent).not.toContain(forte);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Forte");
  });

  it("mostra força ao criar um usuário sem enviar a senha durante a digitação", async () => {
    api.defaults.adapter = vi.fn(config => Promise.resolve({ config, status: 200, headers: {},
      data: { data: { itens: [], paginacao: { pagina: 1, total: 0, totalPaginas: 1 } } } }));
    render(<MemoryRouter><AuthProvider><AdminUsuarios /></AuthProvider></MemoryRouter>);
    await screen.findByText("Nenhum usuário encontrado.");
    fireEvent.click(screen.getByRole("button", { name: "Novo usuário" }));
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: forte } });
    expect(screen.getByRole("progressbar", { name: "Força da senha" }).getAttribute("aria-valuenow")).toBe("3");
    expect(api.defaults.adapter.mock.calls.every(([config]) => config.method === "get")).toBe(true);
    expect(screen.getByLabelText("Senha").getAttribute("aria-describedby")).toBe("forca-senha-usuario");
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });

  it("integra o indicador apenas ao campo de senha nova na troca", () => {
    sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify({ token: "token", refreshToken: "refresh", sessionId: "sessao",
      sessionExpiresAt: new Date(Date.now() + 3600000).toISOString(), user: { id: "1", name: "Pessoa", email: "pessoa@test.dev", role: "ADMIN" } }));
    render(<MemoryRouter><AuthProvider><AdminSenha /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("progressbar", { name: "Força da senha" })).toBeDefined();
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: forte } });
    expect(screen.getByText("Forte")).toBeDefined();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(screen.getByLabelText("Nova senha").getAttribute("aria-describedby")).toBe("forca-senha-alteracao");
    expect(api.defaults.adapter).not.toHaveBeenCalled();
  });

  it.each(["curta", "é".repeat(37), "🌳".repeat(11)])("bloqueia troca fora dos limites: %s", async senha => {
    montar(<AdminSenha />); preencherTroca(senha);
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Alterar senha" }).closest("form"));
    });
    expect(screen.getByRole("alert").textContent).toContain("12 caracteres");
    expect(api.defaults.adapter).not.toHaveBeenCalled();
  });

  it("classificação Fraca não impede troca que atende à política existente", async () => {
    const adapter = vi.fn(config => Promise.resolve({ config, status: 200, headers: {}, data: { success: true } }));
    api.defaults.adapter = adapter;
    montar(<AdminSenha />); preencherTroca("a".repeat(12));
    expect(screen.getByText("Fraca")).toBeDefined();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Alterar senha" }).closest("form"));
    });
    expect(adapter).toHaveBeenCalledTimes(1);
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe("patch");
    expect(config.url).toBe("/auth/senha");
    expect(JSON.parse(config.data).novaSenha).toBe("a".repeat(12));
  });

  it("criação aceita senha Fraca válida sem enviar a avaliação", async () => {
    const adapter = vi.fn(config => Promise.resolve({ config, status: 200, headers: {}, data: {
      data: config.method === "get" ? { itens: [], paginacao: { pagina: 1, total: 0, totalPaginas: 1 } } : {},
    } }));
    api.defaults.adapter = adapter; montar(<AdminUsuarios />);
    await screen.findByText("Nenhum usuário encontrado.");
    fireEvent.click(screen.getByRole("button", { name: "Novo usuário" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Pessoa Teste" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "teste@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "a".repeat(12) } });
    expect(screen.getByText("Fraca")).toBeDefined();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Criar usuário" }).closest("form"));
    });
    const envios = adapter.mock.calls.map(([config]) => config).filter(config => config.method === "post");
    expect(envios).toHaveLength(1);
    expect(envios[0].url).toBe("/admins");
    expect(JSON.parse(envios[0].data)).toEqual({
      nome: "Pessoa Teste", email: "teste@example.test", role: "EDITOR", password: "a".repeat(12),
    });
  });
});
