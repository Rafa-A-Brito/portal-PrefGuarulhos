/**
 * Geocodificação: transforma o ENDEREÇO digitado no cadastro de patrimônio
 * em latitude/longitude, sem o usuário ver ou digitar coordenadas.
 *
 * CONSUMO / CRÉDITOS (veja ADMIN.md):
 *  - só é chamada ao SALVAR (nunca a cada tecla digitada);
 *  - só é chamada de novo se o endereço mudou (o cadastro guarda as
 *    coordenadas e reaproveita);
 *  - resultados ficam em cache em memória durante a sessão;
 *  - falhas não entram no cache.
 *
 * MODO DEMONSTRAÇÃO (padrão): sem VITE_GEOCODING_ATIVO=true as coordenadas
 * são SIMULADAS perto do centro de Guarulhos, só para o fluxo funcionar sem
 * chave nem custo. Nada é enviado ao Google.
 *
 * MODO REAL: usa google.maps.Geocoder (Maps JavaScript API), que permite
 * restringir a chave por domínio. Exige que o script do Google Maps já
 * esteja carregado na página. DECISÃO PENDENTE com o backend: geocodificar
 * no front (como aqui) ou numa rota do backend com chave de servidor, que é
 * o mais seguro. Não use a Geocoding REST com chave no navegador.
 */
import { ErroApp } from "../utils/erros";

const GEOCODING_ATIVO = import.meta.env.VITE_GEOCODING_ATIVO === "true";

export const GEOCODING_EM_MODO_DEMO = !GEOCODING_ATIVO;

const CENTRO_GUARULHOS = { lat: -23.4543, lng: -46.5333 };

// Caixa aproximada do município, só para barrar resultados de outra cidade.
const LIMITES_GUARULHOS = {
  latMin: -23.6,
  latMax: -23.2,
  lngMin: -46.75,
  lngMax: -46.25,
};

const cache = new Map();

function normalizar(valor) {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Chave estável do endereço: serve de cache e para saber se ele mudou. */
export function chaveEndereco({ cep, endereco, numero, bairro }) {
  const cepNumeros = String(cep ?? "").replace(/\D/g, "");
  return [cepNumeros, endereco, numero, bairro].map(normalizar).join("|");
}

export function montarEndereco({ endereco, numero, bairro, cep }) {
  return [
    [endereco, numero].filter(Boolean).join(", "),
    bairro,
    "Guarulhos - SP",
    cep,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

function arredondar(valor) {
  return Math.round(valor * 1e7) / 1e7; // DECIMAL(10,7) no banco
}

function dentroDeGuarulhos({ lat, lng }) {
  return (
    lat >= LIMITES_GUARULHOS.latMin &&
    lat <= LIMITES_GUARULHOS.latMax &&
    lng >= LIMITES_GUARULHOS.lngMin &&
    lng <= LIMITES_GUARULHOS.lngMax
  );
}

function coordenadasDeDemonstracao(chave) {
  let h = 0;
  for (const caractere of chave) h = (h * 31 + caractere.charCodeAt(0)) >>> 0;

  const deslocLat = ((h % 600) - 300) / 10000; // até ±0,03°
  const deslocLng = (((h >> 8) % 600) - 300) / 10000;

  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          lat: CENTRO_GUARULHOS.lat + deslocLat,
          lng: CENTRO_GUARULHOS.lng + deslocLng,
        }),
      500,
    ),
  );
}

function geocodificarComGoogle(consulta) {
  return new Promise((resolve, reject) => {
    const Geocoder = window.google?.maps?.Geocoder;

    if (!Geocoder) {
      reject(
        new ErroApp(
          "ERR-GEO-INDISPONIVEL",
          "O serviço de mapas não está disponível agora. Tente novamente em instantes.",
          "google.maps.Geocoder não encontrado (script do Maps não carregado?)",
        ),
      );
      return;
    }

    new Geocoder().geocode(
      {
        address: consulta,
        componentRestrictions: {
          country: "BR",
          administrativeArea: "SP",
          locality: "Guarulhos",
        },
      },
      (resultados, status) => {
        if (status === "OK" && resultados?.[0]) {
          const ponto = resultados[0].geometry.location;
          resolve({ lat: ponto.lat(), lng: ponto.lng() });
        } else if (status === "ZERO_RESULTS") {
          reject(
            new ErroApp(
              "ERR-GEO-SEM-RESULTADO",
              "Não encontramos esse endereço. Confira o CEP, a rua e o bairro.",
              status,
            ),
          );
        } else {
          reject(
            new ErroApp(
              `ERR-GEO-${status}`,
              "Não foi possível localizar o endereço agora. Tente novamente em instantes.",
              status,
            ),
          );
        }
      },
    );
  });
}

/**
 * @param {{cep: string, endereco: string, numero?: string, bairro: string}} local
 * @returns {Promise<{lat: number, lng: number}>}
 */
export async function geocodificarEndereco(local) {
  const chave = chaveEndereco(local);

  if (cache.has(chave)) return cache.get(chave);

  const bruto = GEOCODING_ATIVO
    ? await geocodificarComGoogle(montarEndereco(local))
    : await coordenadasDeDemonstracao(chave);

  const coordenadas = {
    lat: arredondar(bruto.lat),
    lng: arredondar(bruto.lng),
  };

  if (!dentroDeGuarulhos(coordenadas)) {
    throw new ErroApp(
      "ERR-GEO-FORA-DA-CIDADE",
      "O endereço informado não parece ficar em Guarulhos. Confira os dados.",
      `lat=${coordenadas.lat} lng=${coordenadas.lng}`,
    );
  }

  cache.set(chave, coordenadas);
  return coordenadas;
}
