import { afterEach, beforeEach, expect, test, vi } from "vitest";

let consultarCep, normalizarCep, transporte;
const resposta = {
  cep: "07112-000", logradouro: " Rua Postal ", bairro: " Centro ",
  localidade: " Guarulhos ", uf: "SP", complemento: "Não importar",
};
const ok = dados => ({ ok: true, json: async () => dados });

beforeEach(async () => {
  vi.resetModules();
  ({ consultarCep, normalizarCep } = await import("../src/services/cepApi"));
  transporte = vi.fn().mockResolvedValue(ok(resposta));
  vi.stubGlobal("fetch", transporte);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test.each(["", "07112", "07112-00", "071120000"])("CEP incompleto/inválido %s não faz HTTP", async cep => {
  await expect(consultarCep(cep)).rejects.toMatchObject({ codigo: "CEP_INVALIDO" });
  expect(transporte).not.toHaveBeenCalled();
});

test("normaliza CEP formatado e retorna apenas os campos postais permitidos", async () => {
  expect(normalizarCep(" 07112-000 ")).toBe("07112000");
  expect(normalizarCep(null)).toBe("");
  await expect(consultarCep("07112-000")).resolves.toEqual({
    cep: "07112000", endereco: "Rua Postal", bairro: "Centro", cidade: "Guarulhos", uf: "SP",
  });
  expect(transporte).toHaveBeenCalledWith("https://viacep.com.br/ws/07112000/json/", {
    signal: expect.any(AbortSignal), credentials: "omit",
  });
});

test("cache em memória aceita CEP com e sem máscara e não expõe objeto mutável", async () => {
  const primeiro = await consultarCep("07112-000");
  primeiro.endereco = "Alteração externa";
  expect((await consultarCep("07112000")).endereco).toBe("Rua Postal");
  expect(transporte).toHaveBeenCalledTimes(1);
});

test.each([true, "true"])("CEP inexistente (erro=%s) dá feedback e não entra no cache", async erro => {
  transporte.mockResolvedValueOnce(ok({ erro }));
  await expect(consultarCep("07112000")).rejects.toMatchObject({
    codigo: "CEP_NAO_ENCONTRADO", message: "CEP não encontrado. Preencha o endereço manualmente.",
  });
  await expect(consultarCep("07112000")).resolves.toMatchObject({ endereco: "Rua Postal" });
  expect(transporte).toHaveBeenCalledTimes(2);
});

test.each(["HTTP", "rede", "JSON", "contrato"])("falha de %s permite nova consulta e não entra no cache", async tipo => {
  if (tipo === "HTTP") transporte.mockResolvedValueOnce({ ok: false, status: 503 });
  if (tipo === "rede") transporte.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  if (tipo === "JSON") transporte.mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError("JSON"); } });
  if (tipo === "contrato") transporte.mockResolvedValueOnce(ok({ ...resposta, cep: "01001-000" }));
  await expect(consultarCep("07112000")).rejects.toMatchObject({
    codigo: "CEP_INDISPONIVEL",
    message: "Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.",
  });
  await expect(consultarCep("07112000")).resolves.toMatchObject({ cep: "07112000" });
  expect(transporte).toHaveBeenCalledTimes(2);
});

test("timeout aborta o transporte e oferece preenchimento manual", async () => {
  vi.useFakeTimers();
  transporte.mockImplementationOnce((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  const pendente = expect(consultarCep("07112000")).rejects.toMatchObject({ codigo: "CEP_INDISPONIVEL" });
  await vi.advanceTimersByTimeAsync(8000);
  await pendente;
  expect(transporte.mock.calls[0][1].signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

test("cancelamento externo aborta a requisição sem virar falha de rede", async () => {
  const controller = new AbortController();
  transporte.mockImplementationOnce((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  const pendente = expect(consultarCep("07112000", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  controller.abort();
  await pendente;
  expect(transporte.mock.calls[0][1].signal.aborted).toBe(true);
});

test("signal já cancelado não faz HTTP nem entrega resultado em cache", async () => {
  await consultarCep("07112000");
  const controller = new AbortController();
  controller.abort();
  await expect(consultarCep("07112000", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  expect(transporte).toHaveBeenCalledTimes(1);
});

test("resposta posterior ao cancelamento não contamina o cache", async () => {
  let resolver;
  transporte.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  const controller = new AbortController();
  const pendente = expect(consultarCep("07112000", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  controller.abort();
  resolver(ok(resposta));
  await pendente;
  await consultarCep("07112000");
  expect(transporte).toHaveBeenCalledTimes(2);
});

test("respeita cidade/UF de outra região e aceita CEP sem logradouro/bairro", async () => {
  transporte.mockResolvedValueOnce(ok({ ...resposta, logradouro: "", bairro: "", localidade: "Belo Horizonte", uf: "MG" }));
  await expect(consultarCep("07112000")).resolves.toEqual({
    cep: "07112000", endereco: "", bairro: "", cidade: "Belo Horizonte", uf: "MG",
  });
});
