import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import ImagemAdmin from "../src/features/admin/components/ImagemAdmin";
import api from "../src/services/api";

vi.mock("../src/services/api", () => ({
  default: { defaults: { baseURL: "http://localhost:3333/api" }, get: vi.fn() },
}));

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: new Blob(["imagem"], { type: "image/png" }) });
  URL.createObjectURL = vi.fn(() => "blob:autenticado");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

test("carrega imagem editorial do backend pelo cliente HTTP autenticado", async () => {
  render(<ImagemAdmin src="http://localhost:3333/uploads/exposicoes/teste.png" alt="Prévia" />);
  await waitFor(() => expect(screen.getByRole("img", { name: "Prévia" }).src).toContain("blob:autenticado"));
  expect(api.get).toHaveBeenCalledWith(
    "http://localhost:3333/uploads/exposicoes/teste.png",
    expect.objectContaining({ responseType: "blob", signal: expect.any(AbortSignal) }),
  );
});

test("não envia token a domínio externo e usa diretamente o arquivo local escolhido", () => {
  const { rerender } = render(<ImagemAdmin src="https://site-externo.example/foto.png" alt="Externo" />);
  expect(api.get).not.toHaveBeenCalled();
  rerender(<ImagemAdmin src="blob:local" alt="Nova imagem" />);
  expect(api.get).not.toHaveBeenCalled();
  expect(screen.getByRole("img", { name: "Nova imagem" }).getAttribute("src")).toBe("blob:local");
});

test.each(["/uploads/novidades/teste.png", `${window.location.origin}/uploads/novidades/teste.png`])("resolve %s na origem da API, sem prefixar /api", async src => {
  render(<ImagemAdmin src={src} alt="Prévia" />);
  await screen.findByRole("img");
  expect(api.get.mock.calls[0][0]).toBe("http://localhost:3333/uploads/novidades/teste.png");
});

test.each([
  "https://externo.example/uploads/exposicoes/teste.png",
  "http://localhost:3333.evil.example/uploads/exposicoes/teste.png",
  "http://usuario:senha@localhost:3333/uploads/exposicoes/teste.png",
  "http://localhost:3333/uploads/exposicoes/..%2Fprivado.png",
])("não usa o cliente autenticado para URL não permitida: %s", src => {
  render(<ImagemAdmin src={src} alt="Prévia" />);
  expect(api.get).not.toHaveBeenCalled();
});

test("troca de imagem aborta a anterior e descarta resposta atrasada", async () => {
  let resolver;
  api.get.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  const view = render(<ImagemAdmin src="/uploads/exposicoes/primeira.png" alt="Prévia" />);
  const sinal = api.get.mock.calls[0][1].signal;
  view.rerender(<ImagemAdmin src="/uploads/exposicoes/segunda.png" alt="Prévia" />);
  await screen.findByRole("img");
  expect(sinal.aborted).toBe(true);
  await act(async () => resolver({ data: new Blob(["antiga"]) }));
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:autenticado");
});

test("retornar à imagem anterior não reutiliza o Blob revogado", async () => {
  const view = render(<ImagemAdmin src="/uploads/exposicoes/primeira.png" alt="Prévia" />);
  await screen.findByRole("img");
  api.get.mockImplementation(() => new Promise(() => {}));
  view.rerender(<ImagemAdmin src="/uploads/exposicoes/segunda.png" alt="Prévia" />);
  view.rerender(<ImagemAdmin src="/uploads/exposicoes/primeira.png" alt="Prévia" />);
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("Carregando");
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
});

test("falha de autorização não recorre à URL pública", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  api.get.mockRejectedValue({ response: { status: 401 } });
  render(<ImagemAdmin src="/uploads/exposicoes/teste.png" alt="Prévia" />);
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Não foi possível"));
  expect(screen.queryByRole("img")).toBeNull();
});
