import { StrictMode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, renderHook, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useVisualizacaoPatrimonio } from "../src/hooks/useVisualizacaoPatrimonio";
import { participacao, CHAVE_PARTICIPACAO } from "../src/features/metricas/participacaoStore";
import PatrimonioDetalhe from "../src/pages/PatrimonioDetalhe/PatrimonioDetalhe";
import { AuthContext } from "../src/context/AuthContextInstance";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import api from "../src/services/api";

const UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", OUTRO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let fetchMock, visibilidade;
const eventos = () => fetchMock.mock.calls.filter(([url]) => url === "/api/metricas/visualizacoes");
const sessoes = () => fetchMock.mock.calls.filter(([url, o]) => url.endsWith("/sessao") && o.method === "POST");
const avancar = async ms => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
  vi.stubEnv("VITE_METRICAS_ATIVAS", "true");
  fetchMock = vi.fn(async (url, options) => url.endsWith("/sessao") && options.method === "POST"
    ? new Response(JSON.stringify({ success: true, data: { dia: "2026-10-26", expiraEm: "2026-10-27T03:00:00Z" } }), { headers: { Date: new Date().toUTCString() } })
    : new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear(); window.dispatchEvent(new StorageEvent("storage", { key: null }));
  await vi.advanceTimersByTimeAsync(0); fetchMock.mockClear();
  visibilidade = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
test.each(["pendente", "recusada"])("participação %s não emite cookie nem evento", async escolha => {
  if (escolha === "recusada") participacao.escolher(escolha);
  renderHook(() => useVisualizacaoPatrimonio(UUID, true)); await avancar(10000);
  expect(fetchMock).not.toHaveBeenCalled();
});
test("flag desligada e UUID de mock não coletam mesmo com adesão", async () => {
  participacao.escolher("aceita"); vi.stubEnv("VITE_METRICAS_ATIVAS", "false");
  const a = renderHook(() => useVisualizacaoPatrimonio(UUID, true)); await avancar(5000); a.unmount();
  vi.stubEnv("VITE_METRICAS_ATIVAS", "true");
  renderHook(() => useVisualizacaoPatrimonio("mock-1", true)); await avancar(5000);
  expect(fetchMock).not.toHaveBeenCalled();
});
test("StrictMode, refetch e re-render não repetem visualização; exige 2 segundos", async () => {
  participacao.escolher("aceita");
  const view = renderHook(({ uuid }) => useVisualizacaoPatrimonio(uuid, true), { initialProps: { uuid: UUID }, wrapper: StrictMode });
  await avancar(1999); expect(fetchMock).not.toHaveBeenCalled();
  await avancar(1); expect(eventos()).toHaveLength(1); expect(sessoes()).toHaveLength(1);
  view.rerender({ uuid: UUID }); await avancar(10000); expect(eventos()).toHaveLength(1);
  view.unmount(); renderHook(() => useVisualizacaoPatrimonio(UUID, true));
  await avancar(2000); expect(eventos()).toHaveLength(1); expect(sessoes()).toHaveLength(1);
});
test("visibilidade acumula só tempo visível; troca UUID e desmontagem cancelam", async () => {
  participacao.escolher("aceita");
  const view = renderHook(({ uuid }) => useVisualizacaoPatrimonio(uuid, true), { initialProps: { uuid: UUID } });
  await avancar(1000);
  visibilidade.mockReturnValue("hidden"); act(() => document.dispatchEvent(new Event("visibilitychange")));
  await avancar(60000); expect(fetchMock).not.toHaveBeenCalled();
  visibilidade.mockReturnValue("visible"); act(() => document.dispatchEvent(new Event("visibilitychange")));
  await avancar(999); expect(fetchMock).not.toHaveBeenCalled();
  await avancar(1); expect(eventos()).toHaveLength(1);
  view.rerender({ uuid: OUTRO }); await avancar(1999); view.unmount(); await avancar(5000);
  expect(eventos()).toHaveLength(1);
});
test("revogação em outra aba cancela qualificação", async () => {
  participacao.escolher("aceita"); renderHook(() => useVisualizacaoPatrimonio(UUID, true)); await avancar(1000);
  localStorage.setItem(CHAVE_PARTICIPACAO, JSON.stringify({ versao: 1, escolha: "recusada", geracao: "outra-aba" }));
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: CHAVE_PARTICIPACAO })));
  await avancar(3000); expect(eventos()).toHaveLength(0); expect(sessoes()).toHaveLength(0);
});
test("meia-noite exige nova qualificação da ficha ainda visível", async () => {
  vi.setSystemTime(new Date("2026-10-27T02:59:50Z"));
  fetchMock.mockImplementation(async (url, options) => {
    if (!url.endsWith("/sessao") || options.method !== "POST") return new Response(null, { status: 204 });
    const novoDia = Date.now() >= Date.parse("2026-10-27T03:00:00Z");
    return new Response(JSON.stringify({ data: { dia: novoDia ? "2026-10-27" : "2026-10-26",
      expiraEm: novoDia ? "2026-10-28T03:00:00Z" : "2026-10-27T03:00:00Z" } }), { headers: { Date: new Date().toUTCString() } });
  });
  participacao.escolher("aceita"); renderHook(() => useVisualizacaoPatrimonio(UUID, true));
  await avancar(2000); expect(eventos()).toHaveLength(1);
  await avancar(8000); expect(eventos()).toHaveLength(1);
  await avancar(2200); expect(eventos()).toHaveLength(2); expect(sessoes()).toHaveLength(2);
});

const detalhe = { id: UUID, slug: "teste", nome: "Bem confirmado", descricao: "Texto confirmado", categoria: { slug: "historico" } };
function abrir({ usuario = null, carregando = false, preview = false } = {}) {
  return render(<MemoryRouter initialEntries={["/patrimonios/teste" + (preview ? "?preview=true" : "")]}>
    <AuthContext.Provider value={{ usuario, carregando }}>
      <PatrimoniosContext.Provider value={{ patrimonios: [{ id: "teste", uuid: UUID, nome: "Item provisório mock" }], setSelecionado: vi.fn() }}>
        <Routes><Route path="/patrimonios/:id" element={<PatrimonioDetalhe />} /></Routes>
      </PatrimoniosContext.Provider>
    </AuthContext.Provider>
  </MemoryRouter>);
}
test("ficha real: provisório com UUID não conta; só detalhe confirmado", async () => {
  participacao.escolher("aceita"); let resolver;
  vi.spyOn(api, "get").mockReturnValue(new Promise(resolve => { resolver = resolve; }));
  abrir(); await avancar(5000); expect(fetchMock).not.toHaveBeenCalled();
  await act(async () => resolver({ data: { data: detalhe } }));
  expect(screen.getByRole("heading", { name: "Bem confirmado" })).toBeTruthy();
  await avancar(2000); expect(JSON.parse(eventos()[0][1].body)).toEqual({ patrimonioId: UUID });
});
test.each(["ADMIN", "EDITOR", "loading", "preview", "erro", "404"])("ficha %s não coleta", async caso => {
  participacao.escolher("aceita");
  const get = vi.spyOn(api, "get");
  if (caso === "erro") get.mockRejectedValue(new Error("offline"));
  else if (caso === "404") get.mockRejectedValue({ response: { status: 404 } });
  else get.mockResolvedValue({ data: { data: detalhe } });
  abrir({ usuario: ["ADMIN", "EDITOR"].includes(caso) ? { perfil: caso } : null,
    carregando: caso === "loading", preview: caso === "preview" });
  await avancar(10000); expect(fetchMock).not.toHaveBeenCalled();
});
