// Escolhe a faixa vertical livre mais próxima da posição original.
// Quando o painel não cabe inteiro, devolve a maior faixa para rolagem interna.
export function faixaLivre(inicio, fim, altura, preferido, obstaculos) {
  const faixas = [];
  let cursor = inicio;
  for (const [topo, base] of [...obstaculos].sort((a, b) => a[0] - b[0])) {
    if (topo > cursor) faixas.push([cursor, Math.min(topo, fim)]);
    cursor = Math.max(cursor, base);
    if (cursor >= fim) break;
  }
  if (cursor < fim) faixas.push([cursor, fim]);
  const livres = faixas.filter(([a, b]) => b > a);
  const inteiras = livres.filter(([a, b]) => b - a >= altura);
  const candidatas = inteiras.length ? inteiras : livres;
  return candidatas.map(([a, b]) => ({
    top: Math.max(a, Math.min(preferido, b - Math.min(altura, b - a))),
    maxHeight: b - a,
  })).sort((a, b) =>
    (inteiras.length ? 0 : b.maxHeight - a.maxHeight) ||
    Math.abs(a.top - preferido) - Math.abs(b.top - preferido),
  )[0] ?? null;
}
