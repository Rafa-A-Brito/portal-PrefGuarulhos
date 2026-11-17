export const STATUS_VISITACAO = [
  { valor: "NAO_INFORMADO", rotulo: "Não informado" },
  { valor: "ABERTO", rotulo: "Aberto" },
  { valor: "ACESSO_PARCIAL", rotulo: "Acesso parcial" },
  { valor: "TEMPORARIAMENTE_FECHADO", rotulo: "Temporariamente fechado" },
  { valor: "SEM_VISITACAO_PUBLICA", rotulo: "Sem visitação pública" },
];

export function restricaoVisitacao(status) {
  switch (status) {
    case "TEMPORARIAMENTE_FECHADO":
      return { selo: "Fechado", aviso: "Temporariamente fechado para visitação" };
    case "ACESSO_PARCIAL":
      return { selo: "Acesso parcial", aviso: "Acesso parcial" };
    case "SEM_VISITACAO_PUBLICA":
      return { selo: "Sem visitação pública", aviso: "Sem visitação pública" };
    default:
      return null;
  }
}

// O valor da API representa um dia civil: não converter para Date/fuso local.
export function formatarPrevisaoReabertura(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor ?? "")) return "";
  return valor.split("-").reverse().join("/");
}
