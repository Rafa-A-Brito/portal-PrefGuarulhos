export function obterCoordenadas(patrimonio) {
  const localizacao = patrimonio?.localizacao;

  if (!localizacao) {
    return null;
  }

  const lat = Number(localizacao.latitude ?? localizacao.lat);

  const lng = Number(localizacao.longitude ?? localizacao.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
  };
}
