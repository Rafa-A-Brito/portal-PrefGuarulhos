import { afterEach, expect, test, vi } from "vitest";
import { emitirSessaoMetricas, registrarVisualizacao, excluirSessaoMetricas } from "../src/services/metricasPublicasApi";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
test("cliente relativo, sem JWT/refresh; sessão JSON e retirada sem corpo", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { dia: "2026-10-26", expiraEm: "2026-10-27T03:00:00Z" } }),
    { headers: { Date: "Mon, 26 Oct 2026 12:00:00 GMT" } }));
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.setItem("sessao-admin-teste", "preservar");
  expect((await emitirSessaoMetricas()).dia).toBe("2026-10-26");
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/metricas/visualizacoes/sessao");
  expect(options.credentials).toBe("same-origin");
  expect(options.headers).toEqual({ "X-Portal-Metricas": "1", "Content-Type": "application/json" });
  expect(options.body).toBe("{}");
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  await excluirSessaoMetricas();
  expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
  expect(sessionStorage.getItem("sessao-admin-teste")).toBe("preservar");
});
test.each([401, 403, 404, 429, 503])("HTTP %s não renova JWT, não faz logout nem repete sozinho", async status => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status, headers: { "Retry-After": "4" } }));
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.setItem("sessao-admin-teste", "preservar");
  await expect(registrarVisualizacao("uuid")).rejects.toMatchObject({ status, retryMs: 4000 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem("sessao-admin-teste")).toBe("preservar");
});
test("timeout e cancelamento liberam a requisição sem efeitos administrativos", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")), { once: true });
  })));
  const result = expect(emitirSessaoMetricas()).rejects.toMatchObject({ status: 0 });
  await vi.advanceTimersByTimeAsync(3000); await result;
  const controller = new AbortController();
  const canceled = expect(emitirSessaoMetricas(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  controller.abort(); await canceled;
});
