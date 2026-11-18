/** Conservação não determina visitação, interdição ou autorização de obras. */
const SITUACOES = Object.freeze({
  EM_RESTAURACAO: { rotulo: "Em restauração", estilo: "atencao" },
  NECESSITA_RESTAURACAO: { rotulo: "Necessita restauração", estilo: "atencao" },
  EM_RUINAS: { rotulo: "Em ruínas", estilo: "alerta" },
  DEMOLIDO: { rotulo: "Demolido", estilo: "historico" },
});

export function obterSituacaoVisual(situacao) {
  return Object.hasOwn(SITUACOES, situacao) ? SITUACOES[situacao] : null;
}
