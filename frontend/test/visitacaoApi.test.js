import { afterEach, expect, test, vi } from "vitest";
import api from "../src/services/api";
import { buscarPatrimonioPorId, listarPatrimonios, normalizarPatrimonio } from "../src/services/patrimoniosApi";
import { formatarPrevisaoReabertura } from "../src/features/visitacao";

afterEach(() => vi.restoreAllMocks());
const fixture = {
  id: "uuid-ficticio", slug: "espaco-imaginario-2-demo", nome: "Espaço fictício", categoria: { id: "cat", slug: "historico" },
  statusVisitacao: "TEMPORARIAMENTE_FECHADO", motivoRestricao: "Reforma do espaço fictício", previsaoReabertura: "2027-03-15",
};

test("listagem e detalhe repassam os três campos da API", async () => {
  vi.spyOn(api, "get").mockImplementation(async url => ({ data: { data: url === "/patrimonios"
    ? { itens: [fixture], paginacao: { pagina: 1, totalPaginas: 1 } } : fixture } }));
  for (const item of [(await listarPatrimonios())[0], await buscarPatrimonioPorId(fixture.slug)]) {
    expect(item).toMatchObject({ statusVisitacao: fixture.statusVisitacao, motivoRestricao: fixture.motivoRestricao, previsaoReabertura: fixture.previsaoReabertura });
  }
});

test("registro antigo é desconhecido; mock achatado e previsão vazia são preservados", () => {
  expect(normalizarPatrimonio({ ...fixture, statusVisitacao: undefined, motivoRestricao: undefined, previsaoReabertura: undefined }))
    .toMatchObject({ statusVisitacao: "NAO_INFORMADO", motivoRestricao: null, previsaoReabertura: null });
  expect(normalizarPatrimonio({ ...fixture, previsaoReabertura: "" }).previsaoReabertura).toBe("");
  const mock = { ...fixture, categoria: "historico" };
  expect(normalizarPatrimonio(mock)).toBe(mock);
});

test("dia civil é formatado sem criação de Date nem deslocamento de fuso", () => {
  expect(formatarPrevisaoReabertura("2027-03-15")).toBe("15/03/2027");
  expect(formatarPrevisaoReabertura("2028-02-29")).toBe("29/02/2028");
  for (const value of [null, undefined, "", "2027-03-15T00:00:00Z"]) expect(formatarPrevisaoReabertura(value)).toBe("");
});
