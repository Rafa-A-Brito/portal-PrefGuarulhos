import { expect, test } from "vitest";
import { dadosRaioProtecao, lerRaioProtecao, formatarRaioProtecao } from "../src/features/raioProtecao";
import { normalizarPatrimonio } from "../src/services/patrimoniosApi";

test("contrato de raio: limites, precisao e PATCH", () => {
  expect(dadosRaioProtecao("", null, true)).toEqual({});
  expect(dadosRaioProtecao("100,000", "100", false)).toEqual({});
  expect(dadosRaioProtecao("", "100", false)).toEqual({ raioProtecaoEntornoMetros: null });
  expect(dadosRaioProtecao("125,5", "100", false)).toEqual({ raioProtecaoEntornoMetros: 125.5 });
  for (const valor of ["0,001", "999999999,999", "100.125"]) expect(lerRaioProtecao(valor)).toBeGreaterThan(0);
  for (const valor of ["0", "-1", "1,0001", "1.000,5", "1000000000", "1e2", "NaN"]) expect(() => lerRaioProtecao(valor)).toThrow();
  expect(formatarRaioProtecao(125.375)).toBe("125,375 m");
  expect(formatarRaioProtecao(null)).toBe("");
});

test("normalizacao preserva raio numerico e null", () => {
  for (const raio of [100, 125.5, null, undefined]) {
    expect(normalizarPatrimonio({ id: "ficticio", slug: "espaco-imaginario-1-demo", categoria: { slug: "historico" }, raioProtecaoEntornoMetros: raio }).raioProtecaoEntornoMetros).toBe(raio ?? null);
  }
});
