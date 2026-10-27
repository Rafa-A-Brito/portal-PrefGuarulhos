import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { criarColetaMetricas, CHAVE_SESSAO_METRICAS } from "../src/features/metricas/coletaMetricas";
import { criarParticipacao } from "../src/features/metricas/participacaoStore";
import { ErroMetricas } from "../src/services/metricasPublicasApi";

const fim = "2026-10-27T03:00:00Z";
const instancias = [];
function criar(opcoes = {}) {
  const preferencia = opcoes.preferencia ?? criarParticipacao();
  if (!opcoes.preferencia) preferencia.escolher("aceita");
  const api = { emitir: vi.fn(async () => ({ dia: "2026-10-26", expiraEm: fim, servidorEm: Date.now() })),
    registrar: vi.fn(async () => null), excluir: vi.fn(async () => null) };
  const coleta = criarColetaMetricas({ preferencia, api, habilitada: () => true, ...opcoes });
  instancias.push(coleta); return { coleta, api, preferencia };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T12:00:00Z")); localStorage.clear(); });
afterEach(() => { instancias.splice(0).forEach(c => c.destruir()); vi.useRealTimers(); });

test("reutiliza sessão entre fichas e suprime refetch do mesmo UUID no dia", async () => {
  const { coleta, api } = criar();
  for (let i = 0; i < 15; i++) await coleta.coletar(`uuid-${i}`);
  await coleta.coletar("uuid-0");
  expect(api.emitir).toHaveBeenCalledTimes(1); expect(api.registrar).toHaveBeenCalledTimes(15);
  const salvo = JSON.parse(localStorage.getItem(CHAVE_SESSAO_METRICAS));
  expect(Object.keys(salvo).sort()).toEqual(["dia", "expiraEm", "expiraLocal", "geracao"]);
});
test("duas abas com Web Locks compartilham um bootstrap, sem compartilhar token", async () => {
  let fila = Promise.resolve();
  const locks = { request: vi.fn((_name, _opts, fn) => { const p = fila.then(fn); fila = p.catch(() => {}); return p; }) };
  const a = criar({ locks });
  const b = criar({ locks, preferencia: criarParticipacao(), api: a.api });
  await Promise.all([a.coleta.coletar("mesmo"), b.coleta.coletar("mesmo")]);
  expect(a.api.emitir).toHaveBeenCalledTimes(1);
  // Cada aba pode enviar; a constraint backend garante um efeito por credencial.
  expect(a.api.registrar).toHaveBeenCalledTimes(2);
});
test("fallback sem Web Locks ainda reutiliza prazo; sem storage funciona em memória", async () => {
  const { coleta, api } = criar({ locks: undefined, storage: () => null });
  await coleta.coletar("a"); await coleta.coletar("b");
  expect(api.emitir).toHaveBeenCalledTimes(1);
});
test("falha de gravação não ressuscita metadata antiga em cada ficha", async () => {
  const s = { getItem: () => '{"geracao":"antiga","expiraLocal":0}', setItem: () => { throw new Error("quota"); } };
  const { coleta, api } = criar({ storage: () => s });
  await coleta.coletar("a"); await coleta.coletar("b");
  expect(api.emitir).toHaveBeenCalledTimes(1);
});
test("cookies bloqueados/perdidos: 401 suspende o dia sem novos bootstraps", async () => {
  const { coleta, api } = criar(); api.registrar.mockRejectedValue(new ErroMetricas(401));
  await expect(coleta.coletar("a")).rejects.toMatchObject({ status: 401 });
  await expect(coleta.coletar("b")).rejects.toMatchObject({ status: 503 });
  expect(api.emitir).toHaveBeenCalledTimes(1); expect(api.registrar).toHaveBeenCalledTimes(1);
});
test.each([0, 503, 429])("falha %s repete evento uma vez, na mesma sessão", async status => {
  const { coleta, api } = criar(); api.registrar.mockRejectedValueOnce(new ErroMetricas(status, 2000));
  const result = coleta.coletar("a"); await vi.advanceTimersByTimeAsync(2500); await result;
  expect(api.registrar).toHaveBeenCalledTimes(2); expect(api.emitir).toHaveBeenCalledTimes(1);
});
test.each([403, 404])("falha terminal %s não repete evento", async status => {
  const { coleta, api } = criar(); api.registrar.mockRejectedValue(new ErroMetricas(status));
  await expect(coleta.coletar("a")).rejects.toMatchObject({ status });
  expect(api.registrar).toHaveBeenCalledTimes(1);
});
test("Retry-After longo não é encurtado; falha de bootstrap não tem retry automático", async () => {
  const a = criar(); a.api.registrar.mockRejectedValue(new ErroMetricas(429, 60000));
  await expect(a.coleta.coletar("a")).rejects.toMatchObject({ status: 429 });
  expect(a.api.registrar).toHaveBeenCalledTimes(1);
  const b = criar(); b.api.emitir.mockRejectedValue(new ErroMetricas(503));
  await expect(b.coleta.coletar("b")).rejects.toMatchObject({ status: 503 });
  await expect(b.coleta.coletar("b")).rejects.toMatchObject({ status: 503 });
  expect(b.api.emitir).toHaveBeenCalledTimes(1);
});
test("perto da meia-noite não envia; próxima sessão usa novo dia sem replay antigo", async () => {
  vi.setSystemTime(new Date("2026-10-27T02:59:57Z"));
  const { coleta, api } = criar(); await coleta.coletar("ontem");
  expect(api.registrar).not.toHaveBeenCalled();
  vi.setSystemTime(new Date("2026-10-27T03:00:02Z"));
  api.emitir.mockResolvedValue({ dia: "2026-10-27", expiraEm: "2026-10-28T03:00:00Z", servidorEm: Date.now() });
  await coleta.coletar("hoje");
  expect(api.registrar).toHaveBeenCalledExactlyOnceWith("hoje", expect.any(AbortSignal));
});
test("revogação cancela operação e remove sessão sem alterar estado local de favoritos", async () => {
  const { coleta, api, preferencia } = criar();
  api.registrar.mockImplementation((_id, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
  }));
  const pending = expect(coleta.coletar("a")).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(0);
  preferencia.escolher("recusada"); await pending; await vi.advanceTimersByTimeAsync(0);
  expect(api.excluir).toHaveBeenCalledTimes(1); expect(localStorage.getItem(CHAVE_SESSAO_METRICAS)).toBeNull();
});
