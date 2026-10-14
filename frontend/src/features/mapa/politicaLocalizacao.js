import { obterCoordenadas } from "./coordenadas";

// Política transitória pós-C2, até existir metadado estruturado de localização.
// Identidades do catálogo atual; nunca inferir destinos a partir de detalhes[].
const EXCECOES = new Map([
  ["antigo-poco-municipal", { tipo: "SEM_ROTA", aviso: "Localização em pesquisa" }],
  ["sitios-arqueologicos-das-lavras-velhas-do-geraldo", { tipo: "SEM_ROTA", aviso: "Referência territorial" }],
  ["cultura-e-presenca-indigena-wassu-cocal-e-krenak-pankararu", { tipo: "SEM_ROTA", aviso: "Referência territorial" }],
  ["festa-de-nossa-senhora-de-bonsucesso", { tipo: "REFERENCIA", aviso: "Local de realização / referência" }],
  ["dia-da-carpicao", { tipo: "REFERENCIA", aviso: "Local de realização / referência" }],
  ["corporacao-musical-banda-lira-de-guarulhos", { tipo: "REFERENCIA", aviso: "Local de referência" }],
]);

export function classificarLocalizacao(patrimonio) {
  let regra;
  if (!patrimonio) {
    regra = { tipo: "SEM_ROTA", aviso: "" };
  } else if (patrimonio.situacao === "DEMOLIDO") {
    regra = { tipo: "APROXIMADA", aviso: "Localização aproximada / referência histórica" };
  } else {
    // O adaptador público também usa o slug como id. Não comparar nomes livres.
    regra = EXCECOES.get(patrimonio.slug ?? patrimonio.id);
    if (!regra) {
      const categorias = [patrimonio.categoria, ...(patrimonio.categorias ?? [])];
      const imaterial = categorias.some((categoria) => (categoria?.slug ?? categoria) === "imaterial");
      regra = imaterial
        ? { tipo: "REFERENCIA", aviso: "Local de realização / referência" }
        : { tipo: "EXATA", aviso: "" };
    }
  }

  const permiteRota = regra.tipo === "EXATA" || regra.tipo === "APROXIMADA";
  return {
    ...regra,
    permiteRota,
    rotuloRota: permiteRota ? (regra.tipo === "APROXIMADA" ? "Ver local aproximado" : "Ver rota") : null,
    // Endereços/pontos legados não identificam uma sede, entrada ou local de
    // realização validado para SEM_ROTA/REFERENCIA. Preservar só na documentação.
    exibirEndereco: permiteRota,
    coordenadasMarcador: permiteRota ? obterCoordenadas(patrimonio) : null,
  };
}
