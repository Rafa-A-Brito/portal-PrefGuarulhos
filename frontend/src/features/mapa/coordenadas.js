/**
 * Converte um valor vindo da API (number, string "−23.4543000" de Decimal do
 * Prisma, null, undefined, "") em número finito, ou null. Number("") e
 * Number(null) dão 0, que seria um ponto falso no oceano: por isso o
 * descarte explícito de vazio.
 */
function paraNumero(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string" && valor.trim() === "") return null;

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Coordenadas válidas de um patrimônio, ou null. Aceita os dois formatos:
 * { latitude, longitude } (backend) e { lat, lng } (já normalizado/mock).
 *
 * Todo marcador e todo link de rota devem passar por aqui: patrimônio sem
 * coordenadas continua na lista e nos filtros, mas não vira marcador.
 */
export function obterCoordenadas(patrimonio) {
  const localizacao = patrimonio?.localizacao;

  if (!localizacao) {
    return null;
  }

  const lat = paraNumero(localizacao.latitude ?? localizacao.lat);
  const lng = paraNumero(localizacao.longitude ?? localizacao.lng);

  if (lat === null || lng === null) {
    return null;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return { lat, lng };
}
