import { useJsApiLoader } from "@react-google-maps/api";

/**
 * Único ponto do front que carrega o Google Maps JavaScript API.
 *
 * Quem usa: o mapa público (/mapa) e o formulário de patrimônios do admin
 * (/admin/patrimonios, para o geocoding). Os dois chamam este hook, então
 * o script é injetado UMA vez, com o mesmo id e as mesmas opções. Se cada
 * tela configurasse o loader por conta própria, o @react-google-maps/api
 * reclamaria de opções diferentes e o script poderia ser carregado duas vezes.
 *
 * REGRA: não chame useJsApiLoader em nenhum outro lugar. Se um dia for
 * preciso outra biblioteca do Maps (ex.: "places"), acrescente em
 * BIBLIOTECAS aqui, nunca numa tela.
 *
 * Retorno:
 *   - configurado: há chave e o modo mock não foi forçado. Sem isso o mapa
 *     usa o mockup e o geocoding real não pode rodar.
 *   - pronto: o script carregou e google.maps está disponível.
 *   - erro: o script falhou (chave inválida, rede, restrição de domínio).
 *
 * Observação de consumo: carregar o script não gera cobrança por si só;
 * a cobrança vem de instanciar o mapa e de chamar o Geocoder.
 */
export const GOOGLE_MAPS_ID = "google-map-script";

// Constante FORA do hook: o loader compara as opções por referência.
const BIBLIOTECAS = ["marker"];

// DEMO_MAP_ID permite desenvolvimento; configure o ID do projeto no build de produção.
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

const CHAVE = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const GOOGLE_MAPS_CONFIGURADO =
  import.meta.env.VITE_USE_MOCK_MAP !== "true" && Boolean(CHAVE);

export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_ID,
    googleMapsApiKey: CHAVE,
    libraries: BIBLIOTECAS,
    preventGoogleFontsLoading: true,
  });

  const configurado = GOOGLE_MAPS_CONFIGURADO;

  return {
    configurado,
    pronto: configurado && isLoaded && !loadError,
    erro: configurado ? (loadError ?? null) : null,
  };
}
