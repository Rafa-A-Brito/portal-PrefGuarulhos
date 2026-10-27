import { expect, test } from "vitest";
import { diaPaulista, periodoInicial, validarPeriodo, validarMetricas, quantidadeGrafica, quantidadeExata, serieComLacunas } from "../src/features/admin/metricasDashboard";
import { metricasFixture } from "./fixtures/metricas_dashboard";

test("dia paulista e período inclusivo nas duas faces da meia-noite", () => {
  expect(diaPaulista(new Date("2026-10-27T02:59:59Z"))).toBe("2026-10-26");
  expect(diaPaulista(new Date("2026-10-27T03:00:00Z"))).toBe("2026-10-27");
  expect(periodoInicial(new Date("2026-10-27T02:59:59Z"))).toEqual({ inicio: "2026-09-27", fim: "2026-10-26" });
  expect(validarPeriodo({ inicio: "2024-01-01", fim: "2024-12-31" }, "2026-01-01")).toBe("");
  expect(validarPeriodo({ inicio: "2024-01-01", fim: "2025-01-01" }, "2026-01-01")).toContain("366");
  expect(validarPeriodo({ inicio: "2026-02-30", fim: "2026-03-01" })).toContain("válidas");
  expect(validarPeriodo({ inicio: "2026-10-27", fim: "2026-10-27" }, "2026-10-26")).toContain("futuras");
});
test("BigInt fica exato e só é convertido se for seguro", () => {
  expect(quantidadeGrafica("9007199254740991")).toBe(Number.MAX_SAFE_INTEGER);
  expect(quantidadeGrafica("9007199254740992")).toBeNull();
  expect(quantidadeExata("9007199254740993")).toBe("9.007.199.254.740.993");
  expect(quantidadeGrafica("0")).toBe(0); expect(quantidadeGrafica(null)).toBeNull();
  expect(() => quantidadeExata(10)).toThrow();
});
test("lacuna é null; DTO incoerente/incompleto não vira zero", () => {
  const d = metricasFixture(); validarMetricas(d);
  expect(serieComLacunas(d)).toEqual([{ data: "2026-10-24", quantidade: "7" }, { data: "2026-10-25", quantidade: null }, { data: "2026-10-26", quantidade: "5" }]);
  expect(() => validarMetricas(undefined)).toThrow();
  d.visualizacoes.semRegiao = "3"; expect(() => validarMetricas(d)).toThrow();
  expect(validarMetricas({ disponivel: false })).toEqual({ disponivel: false });
});
