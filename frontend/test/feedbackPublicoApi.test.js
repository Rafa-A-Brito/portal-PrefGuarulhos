import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { feedbackSchema } from "../../backend/src/schemas/feedbackSchema.js";
import { criarEnvioFeedback, enviarFeedback, gerarChaveFeedback } from "../src/services/feedbackPublicoApi";
import { prepararFeedback, contarComentario, tamanhoCorpo, JANELA_FEEDBACK, envioExpirou } from "../src/utils/feedbackPublico";

beforeEach(() => { vi.stubEnv("VITE_FEEDBACK_ATIVO", "true"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
const confirmacao = (status = 201, extra = {}) => new Response(JSON.stringify({ success: true,
  data: { recebido: true, recebidoEm: "2026-11-03T12:00:00.000Z", ...extra } }), { status });

test.each([
  "  Cafe\u0301\r\nsegundo parágrafo 🏛️  ", "😀".repeat(2000), "😀".repeat(2001), "e\u0301".repeat(2000),
  "\ttexto\t", "linha\n\nlinha", "a\tb", "\r\n", "\u0000", "a\rb", "\u007f", "\u0085", "\ud800", "a\udfff", "  ",
  "a".repeat(2000), "a".repeat(2001), "<script>alert('texto')</script>", "\u00a0texto\ufeff", "a\u001fb",
])("normalização e aceitação equivalem ao schema F2: caso %#", mensagem => {
  const local = prepararFeedback("SUGESTAO", mensagem);
  const real = feedbackSchema.safeParse({ tipo: "SUGESTAO", mensagem, avisoVersao: "feedback-v1" });
  expect(Object.keys(local.erros).length === 0).toBe(real.success);
  if (real.success) expect(local.payload).toEqual(real.data);
});
test("contador usa pontos de código após NFC/trim, sem cortar parágrafos; corpo em UTF-8", () => {
  expect(contarComentario("  e\u0301😀\r\nx  ")).toBe(4);
  expect(prepararFeedback("", "").erros).toEqual({ tipo: "Escolha um tipo de feedback.", mensagem: "Escreva um comentário." });
  expect(tamanhoCorpo("😀")).toBe(4);
  const valid = prepararFeedback("ELOGIO", "😀".repeat(2000));
  expect(tamanhoCorpo(valid.corpo)).toBeLessThanOrEqual(16384);
  expect(Object.keys(prepararFeedback("ELOGIO", "😀".repeat(5000)).erros)).toContain("mensagem");
});
test("Web Crypto gera exatamente 32 bytes, base64url canônica sem padding", () => {
  const random = vi.spyOn(crypto, "getRandomValues");
  const chave = gerarChaveFeedback();
  expect(random).toHaveBeenCalledTimes(1); expect(random.mock.calls[0][0].byteLength).toBe(32);
  expect(chave).toMatch(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/);
  expect(atob(chave.replaceAll("-", "+").replaceAll("_", "/") + "=").length).toBe(32);
  vi.stubGlobal("crypto", {}); expect(gerarChaveFeedback).toThrow();
});
test.each([200, 201])("HTTP %s válido: fetch relativo sem JWT, cookies, Origin manual ou refresh", async status => {
  const fetchMock = vi.fn().mockResolvedValue(confirmacao(status)); vi.stubGlobal("fetch", fetchMock);
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const envio = criarEnvioFeedback("SUGESTAO", "  Busca\r\nmais clara  ");
  expect(Object.isFrozen(envio)).toBe(true); expect(Object.isFrozen(envio.payload)).toBe(true);
  await expect(enviarFeedback(envio)).resolves.toMatchObject({ recebido: true, demonstracao: false });
  const [url, options] = fetchMock.mock.calls[0]; expect(url).toBe("/api/feedback");
  expect(options).toMatchObject({ method: "POST", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" });
  expect(options.headers).toEqual({ "Content-Type": "application/json", "X-Portal-Feedback": "1", "Idempotency-Key": envio.chave });
  expect(options.body).toBe(envio.corpo); expect(JSON.parse(options.body).mensagem).toBe("Busca\nmais clara");
  expect(fetchMock).toHaveBeenCalledTimes(1); expect(storage).not.toHaveBeenCalled();
});
test.each([undefined, "false", "TRUE", "1"])("flag %s impede envio mesmo no cliente", async value => {
  vi.stubEnv("VITE_FEEDBACK_ATIVO", value); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  await expect(enviarFeedback(criarEnvioFeedback("ELOGIO", "Bom"))).rejects.toMatchObject({ codigo: "FEEDBACK_DESATIVADO" });
  expect(fetchMock).not.toHaveBeenCalled();
});
test("corpo >16 KB e envio adulterado são recusados antes da rede", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); const envio = criarEnvioFeedback("ELOGIO", "Bom");
  await expect(enviarFeedback({ ...envio, corpo: "x".repeat(16385) })).rejects.toMatchObject({ status: 413 });
  await expect(enviarFeedback({ ...envio, chave: "a".repeat(43) })).rejects.toMatchObject({ status: 400 });
  await expect(enviarFeedback({ ...envio, corpo: "{}" })).rejects.toMatchObject({ status: 400 });
  expect(fetchMock).not.toHaveBeenCalled();
});
test.each([
  { success: true, data: { recebido: false } }, { success: false }, { success: true, data: { recebido: true, recebidoEm: "inválida" } },
  { success: true, data: { recebido: true, recebidoEm: "2026-02-30T12:00:00.000Z" } },
  { success: true, data: { recebido: true, recebidoEm: "2026-11-03T12:00:00.000Z", demonstracao: false } },
  { success: true, data: { recebido: true, recebidoEm: "2026-11-03T12:00:00.000Z", mensagem: "não ecoar" } },
])("resposta de sucesso inválida é resultado incerto %#", async json => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(json), { status: 201 })));
  await expect(enviarFeedback(criarEnvioFeedback("ELOGIO", "Bom"))).rejects.toMatchObject({ codigo: "RESULTADO_INCERTO" });
});
test.each([202, 204])("HTTP %s não comprova recebimento", async status => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
  await expect(enviarFeedback(criarEnvioFeedback("ELOGIO", "Bom"))).rejects.toMatchObject({ status });
});
test.each([[400, "BAD_REQUEST"], [409, "AVISO_DESATUALIZADO"], [409, "CHAVE_REUTILIZADA"], [409, "ENVIO_EXPIRADO"],
  [413, "BODY_TOO_LARGE"], [415, "JSON_OBRIGATORIO"], [429, "TOO_MANY_REQUESTS"], [503, "FEEDBACK_DESATIVADO"], [503, "FEEDBACK_INDISPONIVEL"]])("HTTP %s %s não ecoa mensagem arbitrária", async (status, codigo) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "CANARIO_PRIVADO", error: { code: codigo, message: "CANARIO_PRIVADO" } }), { status, headers: { "Retry-After": "5" } }));
  vi.stubGlobal("fetch", fetchMock);
  try { await enviarFeedback(criarEnvioFeedback("ELOGIO", "Bom")); throw Error("deveria recusar"); }
  catch (e) { expect(e).toMatchObject({ status, codigo, retryMs: 5000 }); expect(e.message).not.toContain("CANARIO"); }
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("Retry-After em data usa Date do servidor; código arbitrário não é exposto", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "CANARIO_PRIVADO" } }), {
    status: 503, headers: { Date: "Tue, 03 Nov 2026 12:00:00 GMT", "Retry-After": "Tue, 03 Nov 2026 12:00:08 GMT" },
  })));
  await expect(enviarFeedback(criarEnvioFeedback("ELOGIO", "Bom"))).rejects.toMatchObject({ codigo: "RESPOSTA_INESPERADA", retryMs: 8000 });
});
test("timeout após possível commit preserva objeto; replay usa mesmos bytes e chave", async () => {
  vi.useFakeTimers(); let responder;
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise(r => { responder = r; })).mockResolvedValueOnce(confirmacao(200)); vi.stubGlobal("fetch", fetchMock);
  const envio = criarEnvioFeedback("SUGESTAO", "e\u0301\r\n😀"), anterior = { ...envio };
  const erro = expect(enviarFeedback(envio)).rejects.toMatchObject({ codigo: "RESULTADO_INCERTO" });
  await vi.advanceTimersByTimeAsync(15000); await erro;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true); expect(envio).toEqual(anterior);
  responder(confirmacao(201)); await Promise.resolve(); // resposta tardia não muda o resultado já encerrado.
  await expect(enviarFeedback(envio)).resolves.toMatchObject({ recebido: true });
  expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body);
  expect(fetchMock.mock.calls[0][1].headers).toEqual(fetchMock.mock.calls[1][1].headers);
});
test("falha de rede e abort são incertos, sem retry automático", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("CANARIO_REDE")); vi.stubGlobal("fetch", fetchMock);
  const envio = criarEnvioFeedback("ELOGIO", "Bom");
  await expect(enviarFeedback(envio)).rejects.toMatchObject({ codigo: "RESULTADO_INCERTO" });
  const controller = new AbortController(); controller.abort();
  await expect(enviarFeedback(envio, { signal: controller.signal })).rejects.toMatchObject({ codigo: "RESULTADO_INCERTO" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("janela de 24 horas é local conservadora e não é renovada no replay", async () => {
  vi.useFakeTimers(); const envio = criarEnvioFeedback("ELOGIO", "Bom"); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  expect(envioExpirou(envio, envio.iniciadoEm, envio.inicioMonotono + JANELA_FEEDBACK)).toBe(true);
  vi.setSystemTime(envio.iniciadoEm + JANELA_FEEDBACK);
  await expect(enviarFeedback(envio)).rejects.toMatchObject({ codigo: "ENVIO_EXPIRADO" }); expect(fetchMock).not.toHaveBeenCalled();
});
test("demo só é confirmada pelo marcador explícito da F2", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(confirmacao(201, { demonstracao: true })));
  await expect(enviarFeedback(criarEnvioFeedback("ELOGIO", "Bom"))).resolves.toMatchObject({ demonstracao: true });
});
