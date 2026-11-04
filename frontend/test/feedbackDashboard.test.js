import { expect, it } from "vitest";
import { dataBr, dataHoraFeedback, dataIso, diaFeedback, filtrosFeedback, graficoSeguro, periodoFeedback, quantidadeFeedback, validarResumoFeedback, validarListaFeedback, validarDetalheFeedback } from "../src/features/admin/feedbackDashboard";
import { resumoFeedback, listaFeedback, idFeedback } from "./fixtures/feedback_admin";
const q = { inicio: "2026-10-05", fim: "2026-11-03", granularidade: "dia" };
it("datas BR e período usam São Paulo, inclusive virada UTC e DST histórico", () => {
  const agora = new Date("2026-11-04T02:00:00Z");
  expect(diaFeedback(agora)).toBe("2026-11-03");
  expect(periodoFeedback(agora)).toEqual({ inicio: "05/10/2026", fim: "03/11/2026", tipo: "", granularidade: "dia" });
  expect(filtrosFeedback(periodoFeedback(agora), agora)).toEqual(q);
  expect(dataHoraFeedback("2018-11-04T03:00:00Z")).toContain("04/11/2018, 01:00:00");
  expect(dataBr("2026-11")).toBe("11/2026"); expect(dataIso("29/02/2024")).toBe("2024-02-29");
});
it.each(["2026-11-03", "03/11/26", "31/02/2026", "29/02/2025", "00/01/2026", "01/13/2026", "01/01/1899", ""])('rejeita data inválida %s', s => expect(() => dataIso(s)).toThrow());
it("valida limite 366 dias e datas futuras", () => {
  const agora = new Date("2026-11-03T15:00:00Z"), form = { inicio: "03/11/2025", fim: "03/11/2026", granularidade: "dia", tipo: "" };
  expect(() => filtrosFeedback(form, agora)).not.toThrow();
  for (const patch of [{ inicio: "02/11/2025" }, { fim: "04/11/2026" }, { inicio: "04/11/2026" }, { tipo: "NOTA" }, { granularidade: "ano" }]) expect(() => filtrosFeedback({ ...form, ...patch }, agora)).toThrow();
});
it("aceita resumo F2 com dias/meses parciais e zeros legítimos", () => {
  for (const granularidade of ["dia", "mes"]) {
    const filtro = { ...q, granularidade }, r = resumoFeedback(filtro);
    expect(validarResumoFeedback(r, filtro)).toBe(r); expect(r.serie.at(-1).parcial).toBe(true);
    expect(validarResumoFeedback(resumoFeedback(filtro, "0"), filtro).total).toBe("0");
  }
});
it.each([r => { r.total = 3; }, r => { r.total = "03"; }, r => { r.total = "4"; }, r => { r.serie.pop(); }, r => { r.serie[0].quantidade = "1"; }, r => { r.porTipo.reverse(); }, r => { r.meta.fuso = "UTC"; }, r => { r.meta.inicio = "2026-10-06"; }, r => { r.serie[0].parcial = null; }])("recusa agregado inconsistente", mudar => {
  const r = resumoFeedback(q); mudar(r); expect(() => validarResumoFeedback(r, q)).toThrow();
});
it("BigInt permanece exato e desabilita gráfico sem arredondar", () => {
  const r = resumoFeedback(q, "9007199254740993");
  expect(validarResumoFeedback(r, q)).toBe(r); expect(graficoSeguro(r.porTipo)).toBe(false);
  expect(quantidadeFeedback(r.total)).toBe("9.007.199.254.740.993");
  expect(graficoSeguro([{ quantidade: "9007199254740991" }])).toBe(true);
});
it("lista verifica página, recorte, ordem e ausência de mensagem", () => {
  const p = { ...q, pagina: 2, limite: 20 }, r = listaFeedback(p, 21);
  expect(validarListaFeedback(r, p)).toBe(r);
  r.itens[0].mensagem = "Não deveria vir na lista"; expect(() => validarListaFeedback(r, p)).toThrow();
  const primeira = { ...p, pagina: 1 }, ordem = listaFeedback(primeira); ordem.itens.reverse(); expect(() => validarListaFeedback(ordem, primeira)).toThrow();
});
it("desativado nunca é zero e detalhe exige registro selecionado", () => {
  const d = { disponivel: false, motivo: "DESATIVADA", demonstracao: true };
  expect(validarResumoFeedback(d, q)).toBe(d); expect(validarListaFeedback(d, q)).toBe(d);
  expect(() => validarResumoFeedback({ disponivel: false }, q)).toThrow();
  const detalhe = { disponivel: true, registro: { id: idFeedback(1), tipo: "PROBLEMA", mensagem: "<img src=x>\n😀", createdAt: "2026-11-03T15:00:00Z", expiraEm: "2027-05-02T15:00:00Z", avisoVersao: "feedback-v1" } };
  expect(validarDetalheFeedback(detalhe, idFeedback(1))).toBe(detalhe);
  expect(() => validarDetalheFeedback(detalhe, idFeedback(2))).toThrow();
});
