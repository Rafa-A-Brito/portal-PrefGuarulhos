export function dashboardFixture() {
  return {
    total: 8, PUBLICADO: 5, RASCUNHO: 1, ARQUIVADO: 2,
    porSituacao: ["PRESERVADO", "DEMOLIDO", "EM_RESTAURACAO", "NECESSITA_RESTAURACAO", "EM_RUINAS", "NAO_INFORMADO"]
      .map((situacao, i) => ({ situacao, quantidade: [2, 1, 1, 1, 1, 2][i] })),
    porCategoria: ["Arquitetônico", "Imaterial", "Industrial", "Ambiental", "Ferroviário", "Educacional", "Histórico"]
      .map((nome, i) => ({ id: String(i), nome, slug: "categoria-" + i, quantidade: [3, 2, 1, 2, 0, 0, 0][i], quantidadeSecundaria: [0, 0, 0, 0, 3, 2, 4][i] })),
    porRegiao: ["Centro", "São João / Bonsucesso", "Cantareira"].map((nome, i) => ({ id: String(i), nome, slug: "regiao-" + i, ativo: true, quantidade: [2, 3, 1][i] })),
    semRegiao: 2, porBairro: [{ bairro: "Bairro que não é região", quantidade: 8 }],
    legados: { total: 2, arquivados: 2, itens: [
      { id: "legado1", nome: "Casarão da Nossa História", slug: "casarao-da-nossa-historia", status: "ARQUIVADO", canonico: "casa-jose-mauricio" },
      { id: "legado2", nome: "Casarão do Sítio Ponte Alta", slug: "casarao-do-sitio-ponte-alta", status: "ARQUIVADO", canonico: "casarao-da-familia-albertis" },
    ] },
    meta: { baseContagem: "TODOS_OS_STATUS", categoria: "PRINCIPAL", publicados: 5 },
  };
}
