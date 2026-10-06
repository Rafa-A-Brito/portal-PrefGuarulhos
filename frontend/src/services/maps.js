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
 * MODO DEMONSTRAÇÃO (padrão): sem VITE_GEOCODING_ATIVO=true NADA é enviado
 * ao Google e NENHUMA coordenada é inventada: geocodificarEndereco devolve
 * null. Quem salva decide o que fazer com isso (o admin salva sem
 * coordenadas e, se o endereço mudou, limpa as antigas).
 *
 * MODO REAL: usa google.maps.Geocoder (Maps JavaScript API), que permite
 * restringir a chave por domínio. O script é carregado por
 * hooks/useGoogleMaps.js (o mesmo do mapa público). Como o salvar pode ser
 * clicado antes de o script terminar de carregar, a geocodificação espera
 * (até um limite) o Geocoder existir em vez de falhar com "window.google
 * ausente". DECISÃO PENDENTE com o backend: geocodificar no front (como
 * aqui) ou numa rota do backend com chave de servidor, que é o mais seguro.
 * Não use a Geocoding REST com chave no navegador.
 */
import { ErroApp } from "../utils/erros";

const GEOCODING_ATIVO = import.meta.env.VITE_GEOCODING_ATIVO === "true";

export const GEOCODING_EM_MODO_DEMO = !GEOCODING_ATIVO;

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

const ESPERA_MAXIMA_MS = 10000; // quanto esperar o script do Maps carregar
const INTERVALO_MS = 150;

/**
 * Resolve quando google.maps.Geocoder existe; rejeita por tempo esgotado.
 * Não faz requisição nenhuma: só olha se o script (carregado pelo
 * useGoogleMaps) já terminou.
 */
function aguardarGeocoder() {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();

    const verificar = () => {
      const Geocoder = window.google?.maps?.Geocoder;

      if (Geocoder) {
        resolve(Geocoder);
        return;
      }

      if (Date.now() - inicio >= ESPERA_MAXIMA_MS) {
        reject(
          new ErroApp(
            "ERR-GEO-INDISPONIVEL",
            "O serviço de mapas não está disponível agora. Tente novamente em instantes.",
            "google.maps.Geocoder não encontrado (script do Maps não carregou a tempo)",
          ),
        );
        return;
      }

      setTimeout(verificar, INTERVALO_MS);
    };

    verificar();
  });
}

async function geocodificarComGoogle(consulta) {
  const Geocoder = await aguardarGeocoder();

  return new Promise((resolve, reject) => {
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
 * @returns {Promise<{lat: number, lng: number} | null>} null no modo
 *   demonstração (geocodificação desligada): não há coordenadas a devolver.
 */
export async function geocodificarEndereco(local) {
  if (GEOCODING_EM_MODO_DEMO) return null;

  const chave = chaveEndereco(local);

  if (cache.has(chave)) return cache.get(chave);

  const bruto = await geocodificarComGoogle(montarEndereco(local));

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
