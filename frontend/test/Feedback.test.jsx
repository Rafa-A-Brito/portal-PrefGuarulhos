import { StrictMode } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Feedback from "../src/pages/Feedback/Feedback";
import Contato from "../src/pages/Contato/Contato";
import { feedbackSchema } from "../../backend/src/schemas/feedbackSchema.js";
import Footer from "../src/components/Footer/Footer";
import { JANELA_FEEDBACK } from "../src/utils/feedbackPublico";

beforeEach(() => { vi.stubEnv("VITE_FEEDBACK_ATIVO", "true"); vi.stubEnv("VITE_METRICAS_ATIVAS", "false"); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const sucesso = (status = 201, demonstracao = false) => new Response(JSON.stringify({ success: true,
  data: { recebido: true, recebidoEm: "2026-11-03T12:00:00.000Z", ...(demonstracao && { demonstracao: true }) } }), { status });
const erro = (status, code, retry) => new Response(JSON.stringify({ error: { code, message: "CANARIO_SERVIDOR" } }), { status, headers: retry ? { "Retry-After": retry } : {} });
const abrir = (strict = false) => render(<MemoryRouter>{strict ? <StrictMode><Contato /></StrictMode> : <Contato />}</MemoryRouter>);
function preencher(tipo = "Sugestão", mensagem = "  Busca mais clara 🏛️\r\nOutro parágrafo.  ") {
  fireEvent.click(screen.getByRole("radio", { name: tipo }));
  fireEvent.change(screen.getByLabelText(/Comentário \(obrigatório\)/), { target: { value: mensagem } });
}
const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Enviar feedback" }));
const status = () => screen.getByRole("status").textContent;

test("flag falsa oculta link e formulário, acesso direto informa indisponibilidade", () => {
  vi.stubEnv("VITE_FEEDBACK_ATIVO", "false"); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  render(<MemoryRouter><Contato /><Footer /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Feedback indisponível" })).toBeDefined();
  expect(screen.queryByRole("form")).toBeNull(); expect(screen.queryByRole("link", { name: "Avaliar o portal" })).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
test("link discreto, três tipos sem seleção inicial, campos e aviso provisório", () => {
  render(<MemoryRouter><Contato /><Footer /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "Avaliar o portal" }).getAttribute("href")).toBe("/contato");
  expect(screen.getAllByRole("radio")).toHaveLength(3); expect(screen.getAllByRole("radio").every(r => !r.checked)).toBe(true);
  expect(screen.getByText(/ainda sem aprovação institucional/)).toBeDefined();
  expect(screen.getByText(/não gera protocolo/)).toBeDefined();
  expect(screen.queryByLabelText(/E-mail|Nome completo|Nota|Anexo/)).toBeNull();
});
test("rota antiga redireciona ao único formulário no Contato e preserva canais institucionais", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  render(<MemoryRouter initialEntries={["/feedback"]}><Routes>
    <Route path="/feedback" element={<Feedback />} /><Route path="/contato" element={<Contato />} />
  </Routes></MemoryRouter>);
  await screen.findByRole("heading", { name: "Fale conosco" });
  expect(screen.getAllByRole("form")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "patrimonio.cultural@guarulhos.sp.gov.br" }).getAttribute("href")).toBe("mailto:patrimonio.cultural@guarulhos.sp.gov.br");
  expect(screen.getByRole("link", { name: "Acessar Fala.BR" })).toBeDefined();
  expect(screen.getByRole("link", { name: "Acessar Ouvidoria" })).toBeDefined();
  expect(fetchMock).not.toHaveBeenCalled();
});
test("Contato envia somente o contrato F1–F4 sem nome, e-mail, cookie ou JWT", async () => {
  const fetchMock = vi.fn().mockResolvedValue(sucesso()); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher("Sugestão", "  Melhorar a busca  "); enviar();
  await waitFor(() => expect(status()).toContain("Feedback recebido."));
  const [url, request] = fetchMock.mock.calls[0], payload = JSON.parse(request.body);
  expect(url).toBe("/api/feedback");
  expect(payload).toEqual({ tipo: "SUGESTAO", mensagem: "Melhorar a busca", avisoVersao: "feedback-v1" });
  expect(feedbackSchema.safeParse(payload).success).toBe(true);
  expect(request.credentials).toBe("omit"); expect(request.headers.Authorization).toBeUndefined();
  expect(request.headers["X-Portal-Feedback"]).toBe("1"); expect(request.headers["Idempotency-Key"]).toMatch(/^[A-Za-z0-9_-]{43}$/);
});
test("validação obrigatória anuncia erros associados e foca primeiro campo", () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); abrir(); enviar();
  expect(status()).toContain("Revise os campos"); expect(document.activeElement).toBe(screen.getAllByRole("radio")[0]);
  expect(screen.getAllByRole("radio")[0].getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toContain("feedback-mensagem-erro");
  fireEvent.click(screen.getByRole("radio", { name: "Elogio" })); enviar();
  expect(document.activeElement).toBe(screen.getByRole("textbox")); expect(fetchMock).not.toHaveBeenCalled();
});
test("colagem Unicode/NFC, limite e ausência de maxlength UTF-16", () => {
  abrir(); preencher("Elogio", "e\u0301😀");
  expect(screen.getByText("2 / 2.000 caracteres após a normalização.")).toBeDefined();
  expect(screen.getByRole("textbox").hasAttribute("maxlength")).toBe(false);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "😀".repeat(2001) } }); enviar();
  expect(screen.getByText(/Use até 2.000/)).toBeDefined(); expect(document.activeElement).toBe(screen.getByRole("textbox"));
});
test.each(["Elogio", "Sugestão", "Problema de uso"])("envio explícito %s confirma 201 e limpa somente após confirmação", async tipo => {
  let resolver; const fetchMock = vi.fn().mockImplementation(() => new Promise(r => { resolver = r; })); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(tipo); expect(fetchMock).not.toHaveBeenCalled(); enviar();
  expect(status()).toBe("Enviando feedback…"); expect(screen.getByRole("textbox").value).not.toBe("");
  expect(screen.getByRole("textbox").readOnly).toBe(true);
  await act(async () => resolver(sucesso()));
  expect(status()).toContain("Feedback recebido."); expect(screen.getByRole("textbox").value).toBe("");
  expect(screen.getAllByRole("radio").every(r => !r.checked)).toBe(true); expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(screen.getByRole("status"));
});
test("StrictMode, digitação e duplo submit não geram envios adicionais", async () => {
  let resolver; const fetchMock = vi.fn().mockImplementation(() => new Promise(r => { resolver = r; })); vi.stubGlobal("fetch", fetchMock);
  const random = vi.spyOn(crypto, "getRandomValues"); abrir(true); preencher();
  expect(fetchMock).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  const form = screen.getByRole("form"); fireEvent.submit(form); fireEvent.submit(form);
  expect(fetchMock).toHaveBeenCalledTimes(1); expect(random).toHaveBeenCalledTimes(1);
  await act(async () => resolver(sucesso()));
});
test("rede incerta mantém memória e replay 200 conserva payload/chave, favoritos e sessão", async () => {
  localStorage.setItem("portal-guarulhos:favoritos:v1", '["casa"]'); sessionStorage.setItem("sessao-protegida", "inalterada");
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("rede")).mockResolvedValueOnce(sucesso(200)); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(); enviar(); await waitFor(() => expect(status()).toContain("Não foi possível confirmar"));
  expect(screen.getByRole("textbox").readOnly).toBe(true); expect(screen.getByText(/Ao sair, fechar ou recarregar/)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Reenviar o mesmo feedback" }));
  await waitFor(() => expect(status()).toContain("Feedback recebido."));
  const [a, b] = fetchMock.mock.calls.map(c => c[1]); expect(a.body).toBe(b.body); expect(a.headers).toEqual(b.headers);
  expect(storage).not.toHaveBeenCalled(); expect(localStorage.getItem("portal-guarulhos:favoritos:v1")).toBe('["casa"]');
  expect(sessionStorage.getItem("sessao-protegida")).toBe("inalterada");
});
test("timeout não presume rollback e não aceita resposta tardia como confirmação", async () => {
  vi.useFakeTimers(); let resolver; const fetchMock = vi.fn().mockImplementation(() => new Promise(r => { resolver = r; })); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(); enviar(); await act(async () => vi.advanceTimersByTimeAsync(15000));
  expect(status()).toContain("Não foi possível confirmar"); expect(screen.getByRole("textbox").value).not.toBe("");
  await act(async () => resolver(sucesso())); expect(status()).toContain("Não foi possível confirmar"); expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("edição após incerteza exige confirmação e novo envio continua explícito", async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("rede")).mockResolvedValueOnce(sucesso()); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(); enviar(); await waitFor(() => expect(status()).toContain("Não foi possível confirmar"));
  const antes = screen.getByRole("textbox").value;
  fireEvent.click(screen.getByRole("button", { name: "Editar ou abandonar esta tentativa" }));
  expect(screen.getByRole("heading", { name: "A tentativa anterior pode ter sido recebida" })).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Manter a tentativa atual" })); expect(screen.getByRole("textbox").readOnly).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Editar ou abandonar esta tentativa" }));
  fireEvent.click(screen.getByRole("button", { name: "Entendi, voltar ao comentário" }));
  expect(screen.getByRole("textbox").value).toBe(antes); expect(screen.getByRole("textbox").readOnly).toBe(false); expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Comentário revisado" } }); enviar();
  await waitFor(() => expect(status()).toContain("Feedback recebido."));
  expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).not.toBe(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]);
});
test("24 horas encerram replay e nova submissão depende de decisão explícita", async () => {
  vi.useFakeTimers(); const fetchMock = vi.fn().mockRejectedValue(new TypeError("rede")); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(); enviar(); await act(async () => {});
  await act(async () => { vi.setSystemTime(Date.now() + JANELA_FEEDBACK); await vi.advanceTimersByTimeAsync(1000); });
  expect(status()).toContain("garantia de repetição de 24 horas terminou"); expect(screen.queryByRole("button", { name: "Reenviar o mesmo feedback" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Preparar uma nova submissão" }));
  fireEvent.click(screen.getByRole("button", { name: "Entendi, voltar ao comentário" }));
  expect(fetchMock).toHaveBeenCalledTimes(1); expect(screen.getByRole("button", { name: "Enviar feedback" })).toBeDefined();
});
test.each([[400, "BAD_REQUEST", "Revise o tipo"], [409, "CHAVE_REUTILIZADA", "chave já está associada"],
  [413, "BODY_TOO_LARGE", "Reduza o comentário"], [415, "JSON_OBRIGATORIO", "formato do envio"],
  [503, "FEEDBACK_DESATIVADO", "está desativado"], [503, "FEEDBACK_INDISPONIVEL", "serviço de feedback está indisponível"]])("HTTP %s %s preserva comentário e não ecoa erro", async (httpStatus, codigo, texto) => {
  const fetchMock = vi.fn().mockResolvedValue(erro(httpStatus, codigo)); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(); enviar(); await waitFor(() => expect(status()).toContain(texto));
  expect(screen.getByRole("textbox").value).not.toBe(""); expect(document.body.textContent).not.toContain("CANARIO_SERVIDOR"); expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("aviso desatualizado preserva conteúdo e não muda versão nem reenvia", async () => {
  const fetchMock = vi.fn().mockResolvedValue(erro(409, "AVISO_DESATUALIZADO")); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(); enviar(); await waitFor(() => expect(status()).toContain("aviso de privacidade mudou"));
  expect(screen.queryByRole("button", { name: "Reenviar o mesmo feedback" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Editar ou abandonar esta tentativa" }));
  fireEvent.click(screen.getByRole("button", { name: "Entendi, voltar ao comentário" }));
  expect(screen.getByRole("button", { name: "Enviar feedback" }).disabled).toBe(true); expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).avisoVersao).toBe("feedback-v1");
});
test.each([429, 503])("Retry-After %s bloqueia clique sem retry automático", async httpStatus => {
  vi.useFakeTimers(); const fetchMock = vi.fn().mockResolvedValue(erro(httpStatus, httpStatus === 429 ? "TOO_MANY_REQUESTS" : "FEEDBACK_INDISPONIVEL", "5")); vi.stubGlobal("fetch", fetchMock);
  abrir(); preencher(); enviar(); await act(async () => {});
  expect(screen.getByRole("button", { name: "Reenviar o mesmo feedback" }).disabled).toBe(true);
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(screen.getByRole("button", { name: "Reenviar o mesmo feedback" }).disabled).toBe(false); expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("demo informa recebimento em memória; teclado e status acessíveis", async () => {
  const user = userEvent.setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sucesso(201, true))); abrir();
  screen.getAllByRole("radio")[0].focus(); await user.keyboard("[Space]");
  expect(screen.getByRole("radio", { name: "Elogio" }).checked).toBe(true);
  await user.tab(); expect(document.activeElement).toBe(screen.getByRole("textbox")); await user.type(screen.getByRole("textbox"), "Bom portal");
  await user.tab(); expect(document.activeElement).toBe(screen.getByRole("button", { name: "Enviar feedback" })); await user.keyboard("[Enter]");
  await waitFor(() => expect(status()).toContain("apenas em memória")); expect(status()).toContain("não houve gravação persistente");
});
test("desmontagem cancela espera sem envio extra ou persistência de rascunho", async () => {
  const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {})); vi.stubGlobal("fetch", fetchMock);
  const r = abrir(); preencher(); enviar(); r.unmount();
  await act(async () => {}); expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true); expect(fetchMock).toHaveBeenCalledTimes(1);
});
