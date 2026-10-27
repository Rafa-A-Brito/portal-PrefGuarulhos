import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { criarParticipacao, CHAVE_PARTICIPACAO, participacao } from "../src/features/metricas/participacaoStore";
import ParticipacaoMetricas from "../src/features/metricas/ParticipacaoMetricas";

beforeEach(() => {
  vi.stubEnv("VITE_METRICAS_ATIVAS", "true"); localStorage.clear();
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
test("sem escolha não participa; interface permite aceitar, revogar e recusar", () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal("fetch", fetchMock);
  render(<ParticipacaoMetricas />);
  fireEvent.click(screen.getByText("Métricas opcionais de visita"));
  expect(screen.getByRole("status").textContent).toContain("ainda não escolheu");
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Aceitar participação" }));
  expect(participacao.obter()).toBe("aceita");
  expect(fetchMock).not.toHaveBeenCalled(); // Aceite não emite cookie.
  fireEvent.click(screen.getByRole("button", { name: "Revogar participação" }));
  expect(participacao.obter()).toBe("recusada");
  expect(screen.getByRole("status").textContent).toContain("Nenhuma nova");
  const salvo = JSON.parse(localStorage.getItem(CHAVE_PARTICIPACAO));
  expect(Object.keys(salvo).sort()).toEqual(["escolha", "geracao", "versao"]);
});
test("GPC prevalece sobre aceite e impede adesão", () => {
  const p = criarParticipacao({ gpc: () => true });
  p.escolher("aceita"); expect(p.obter()).toBe("gpc");
  expect(JSON.parse(localStorage.getItem(CHAVE_PARTICIPACAO)).escolha).toBe("recusada");
});
test("storage bloqueado mantém apenas escolha em memória; nova instância não adere", () => {
  const p = criarParticipacao({ storage: () => null });
  p.escolher("aceita"); expect(p.obter()).toBe("aceita");
  expect(criarParticipacao({ storage: () => null }).obter()).toBe("pendente");
});
test("duas abas propagam revogação e clear; favoritos permanecem", () => {
  localStorage.setItem("portal-guarulhos:favoritos:v1", '["casa"]');
  const a = criarParticipacao(), b = criarParticipacao(); const listener = vi.fn();
  const stop = b.assinar(listener);
  a.escolher("aceita"); window.dispatchEvent(new StorageEvent("storage", { key: CHAVE_PARTICIPACAO }));
  expect(b.obter()).toBe("aceita");
  a.escolher("recusada"); window.dispatchEvent(new StorageEvent("storage", { key: CHAVE_PARTICIPACAO }));
  expect(b.obter()).toBe("recusada"); expect(listener).toHaveBeenCalled();
  expect(localStorage.getItem("portal-guarulhos:favoritos:v1")).toBe('["casa"]');
  localStorage.removeItem(CHAVE_PARTICIPACAO); window.dispatchEvent(new StorageEvent("storage", { key: null }));
  expect(b.obter()).toBe("pendente"); stop();
});
test("flag desligada oculta convite e não cria escolha", () => {
  vi.stubEnv("VITE_METRICAS_ATIVAS", "false");
  const { container } = render(<ParticipacaoMetricas />);
  expect(container.textContent).toBe(""); expect(participacao.obter()).toBe("pendente");
});
