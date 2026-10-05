/**
 * Patrimônios cadastrados pelo painel admin podem não ter latitude e
 * longitude (os campos são opcionais no formulário). Quando isso acontece,
 * o backend devolve localizacao: { lat: null, lng: null }. Qualquer lugar
 * que coloque o patrimônio no mapa ou monte um link de rota precisa passar
 * por aqui antes, senão o Google Maps recebe null e quebra.
 */
export function temCoordenadas(patrimonio) {
  const lat = patrimonio?.localizacao?.lat;
  const lng = patrimonio?.localizacao?.lng;
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function urlRotaGoogleMaps(patrimonio) {
  if (!temCoordenadas(patrimonio)) return null;
  const { lat, lng } = patrimonio.localizacao;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
