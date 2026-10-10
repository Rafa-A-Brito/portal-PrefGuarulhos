import { afterEach, expect, test, vi } from "vitest";
import { renderHook } from "@testing-library/react";
const loader = vi.hoisted(() => vi.fn(() => ({ isLoaded: true, loadError: null })));
vi.mock("@react-google-maps/api", () => ({ useJsApiLoader: loader }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
test("loader compartilhado inclui marker e mantém opções estáveis; mapId vem do ambiente", async () => {
  vi.stubEnv("VITE_GOOGLE_MAPS_MAP_ID", "map-id-do-projeto");
  const { useGoogleMaps, GOOGLE_MAPS_MAP_ID } = await import("../src/hooks/useGoogleMaps");
  const { rerender } = renderHook(useGoogleMaps);
  const first = loader.mock.calls.at(-1)[0];
  rerender();
  expect(first.libraries).toEqual(["marker"]);
  expect(first.libraries).toBe(loader.mock.calls.at(-1)[0].libraries);
  expect(GOOGLE_MAPS_MAP_ID).toBe("map-id-do-projeto");
});
