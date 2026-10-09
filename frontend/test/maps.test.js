import { afterEach, expect, test, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

test("geocoding real usa cidade/UF carregadas e devolve par numérico arredondado sem rede", async () => {
  vi.stubEnv("VITE_GEOCODING_ATIVO", "true");
  vi.resetModules();
  const geocode = vi.fn((request, callback) => callback([{ geometry: { location: { lat: () => -23.48914001, lng: () => -46.52093001 } } }], "OK"));
  vi.stubGlobal("google", { maps: { Geocoder: class { geocode = geocode; } } });
  const { geocodificarEndereco } = await import("../src/services/maps");
  const local = { endereco: "Rodovia Parque", numero: "8055", bairro: "Engenheiro Goulart", cidade: "São Paulo", uf: "SP", cep: "03719-000" };
  expect(await geocodificarEndereco(local)).toEqual({ lat: -23.48914, lng: -46.52093 });
  expect(geocode.mock.calls[0][0]).toMatchObject({ address: expect.stringContaining("São Paulo - SP"), componentRestrictions: { locality: "São Paulo", administrativeArea: "SP", country: "BR" } });
});
