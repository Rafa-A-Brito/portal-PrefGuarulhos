export function metricasFixture(inicio = "2026-10-24", fim = "2026-10-26") {
  return { disponivel: true, meta: { versaoRegra: 1, fuso: "America/Sao_Paulo", inicio, fim,
    geradoEm: "2026-10-26T15:00:00Z", unidade: "IDENTIDADE_PATRIMONIO_DIA", elegibilidade: "PUBLICADO_CANONICO_NA_ACEITACAO",
    regiaoReferencia: "CADASTRO_ATUAL", granularidade: "dia", cobertura: "NAO_INSTRUMENTADA" },
  visualizacoes: { totalRegistrado: "12", semRegiao: "2",
    porPatrimonio: { itens: [
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nome: "Casa de teste", slug: "casa-teste", status: "PUBLICADO", quantidade: "7" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", nome: "Bem arquivado com histórico", slug: "bem-arquivado", status: "ARQUIVADO", quantidade: "5" },
    ], paginacao: { pagina: 1, limite: 10, total: 2 } },
    porRegiao: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", nome: "Centro", slug: "centro", ativo: true, quantidade: "10" }],
    serie: [{ data: "2026-10-24", quantidade: "7" }, { data: "2026-10-26", quantidade: "5" }],
  }, favoritos: { disponivel: false } };
}
