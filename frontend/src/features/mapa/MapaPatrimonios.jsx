import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { useChaveGoogleMaps } from "./useChaveGoogleMaps";
import { temCoordenadas } from "./coordenadas";
import { CATEGORIA_META } from "../categoriaMeta";

/**
 * Mapa dos patrimônios. Tem dois modos:
 *
 *   real    Google Maps de verdade, quando o backend devolve uma chave
 *           válida em GET /config/mapa (variável GOOGLE_MAPS_KEY no
 *           backend/.env).
 *   mockup  uma grade de cards no lugar do mapa, usada quando não existe
 *           chave, quando o Google recusa a chave, ou quando o dev força
 *           com VITE_USE_MOCK_MAP=true. Serve pra trabalhar no layout sem
 *           gastar cota da API.
 *
 * O componente não mostra os detalhes do patrimônio selecionado (nada de
 * InfoWindow do Google): quem faz isso é o painel lateral da página
 * pages/Mapa/Mapa.jsx. Aqui a seleção só destaca o pino e centraliza o
 * mapa nele.
 */
export default function MapaPatrimonios({ patrimonios, selecionado, onSelecionar }) {
  const { carregando, apiKey } = useChaveGoogleMaps();
  const [chaveRecusada, setChaveRecusada] = useState(false);
  const marcarChaveRecusada = useCallback(() => setChaveRecusada(true), []);

  if (carregando) {
    return <div className="map-loading">Carregando mapa...</div>;
  }

  if (!apiKey || chaveRecusada) {
    return (
      <MapaMockup
        patrimonios={patrimonios}
        selecionado={selecionado}
        onSelecionar={onSelecionar}
        aviso={
          chaveRecusada
            ? "O Google recusou a chave do mapa. Mostrando o modo mockup."
            : null
        }
      />
    );
  }

  return (
    <MapaGoogle
      apiKey={apiKey}
      patrimonios={patrimonios}
      selecionado={selecionado}
      onSelecionar={onSelecionar}
      onChaveRecusada={marcarChaveRecusada}
    />
  );
}

// ===========================================================================
// Modo real (Google Maps)
// ===========================================================================

const CENTRO_GUARULHOS = { lat: -23.4542, lng: -46.5268 };
const ZOOM_INICIAL = 13;
const ZOOM_AO_SELECIONAR = 16;

// Objetos criados fora do componente de propósito: se fossem criados
// dentro, seriam objetos novos a cada render, e o GoogleMap reaplicaria
// estilo e opções no mapa toda vez que alguém clicasse num pino.
const ESTILO_CONTAINER = {
  width: "100%",
  height: "100%",
  minHeight: "460px",
  borderRadius: "14px",
};

const OPCOES_MAPA = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  // Sem isso, clicar num restaurante ou ponto de ônibus do próprio Google
  // abre um balão por cima dos nossos pinos.
  clickableIcons: false,
  // Esconde mercados, hospitais, pontos de ônibus etc. Num mapa de
  // patrimônio eles só competem visualmente com os nossos pinos.
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
};

// O id precisa ser fixo: é ele que impede o script do Google de ser
// injetado duas vezes quando o usuário sai e volta pra página do mapa.
const ID_SCRIPT_GOOGLE = "google-maps-script";

// Cor usada só se aparecer uma categoria que não existe em CATEGORIA_META.
const COR_PADRAO = "#2B255C";

function svgDoPino(cor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${cor}"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Monta todos os ícones uma vez só (normal e destacado, por categoria), com
// as mesmas cores da legenda, que vêm de CATEGORIA_META. Precisa do objeto
// google já carregado por causa do google.maps.Size.
function criarIcones(google) {
  const icones = {};
  const categorias = [...Object.keys(CATEGORIA_META), "padrao"];

  for (const categoria of categorias) {
    const url = svgDoPino(CATEGORIA_META[categoria]?.cor ?? COR_PADRAO);
    icones[categoria] = {
      normal: { url, scaledSize: new google.maps.Size(30, 40) },
      destaque: { url, scaledSize: new google.maps.Size(42, 56) },
    };
  }
  return icones;
}

function MapaGoogle({ apiKey, patrimonios, selecionado, onSelecionar, onChaveRecusada }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: ID_SCRIPT_GOOGLE,
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  });

  const [mapa, setMapa] = useState(null);

  // Chave inválida, sem a Maps JavaScript API ativada ou com um domínio
  // fora da lista de referenciadores não dispara loadError: o Google chama
  // esta função global. Sem tratar isso, o usuário só vê um mapa cinza.
  useEffect(() => {
    window.gm_authFailure = () => {
      console.error(
        "[Mapa] O Google recusou a chave. Confira no Google Cloud se a Maps " +
          "JavaScript API está ativada e se este endereço (" +
          window.location.origin +
          ") está na lista de referenciadores HTTP da chave.",
      );
      onChaveRecusada();
    };
    return () => {
      delete window.gm_authFailure;
    };
  }, [onChaveRecusada]);

  const icones = useMemo(
    () => (isLoaded ? criarIcones(window.google) : null),
    [isLoaded],
  );

  const pontos = useMemo(() => patrimonios.filter(temCoordenadas), [patrimonios]);

  // Uma "assinatura" da lista: os ids na ordem. O array de patrimônios
  // muda de referência sempre que a página re-renderiza o filtro, mas o
  // mapa só deve reenquadrar quando os pontos realmente mudarem.
  const assinaturaPontos = pontos.map((p) => p.id).join(",");

  useEffect(() => {
    if (!mapa || pontos.length === 0) return;

    if (pontos.length === 1) {
      mapa.setCenter(pontos[0].localizacao);
      mapa.setZoom(ZOOM_AO_SELECIONAR);
      return;
    }

    const limites = new window.google.maps.LatLngBounds();
    pontos.forEach((p) => limites.extend(p.localizacao));
    mapa.fitBounds(limites, 48);
    // pontos fica de fora de propósito: a assinatura já representa ele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, assinaturaPontos]);

  // Centraliza no patrimônio selecionado, seja pelo clique no pino, pela
  // lista lateral ou vindo do botão "Ver no mapa" da página de detalhe.
  const idSelecionado = selecionado?.id;
  useEffect(() => {
    if (!mapa || !temCoordenadas(selecionado)) return;
    mapa.panTo(selecionado.localizacao);
    if (mapa.getZoom() < ZOOM_AO_SELECIONAR) mapa.setZoom(ZOOM_AO_SELECIONAR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, idSelecionado]);

  const aoCarregar = useCallback((instancia) => setMapa(instancia), []);
  const aoDesmontar = useCallback(() => setMapa(null), []);

  if (loadError) {
    return (
      <div className="map-error">
        Não foi possível carregar o Google Maps. Verifique sua conexão.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="map-loading">Carregando mapa...</div>;
  }

  return (
    <div className="map-wrapper">
      <GoogleMap
        mapContainerStyle={ESTILO_CONTAINER}
        center={CENTRO_GUARULHOS}
        zoom={ZOOM_INICIAL}
        options={OPCOES_MAPA}
        onLoad={aoCarregar}
        onUnmount={aoDesmontar}
      >
        {pontos.map((item) => {
          const ativo = item.id === idSelecionado;
          const icone = icones[item.categoria] ?? icones.padrao;
          return (
            <MarkerF
              key={item.id}
              position={item.localizacao}
              title={item.nome}
              icon={ativo ? icone.destaque : icone.normal}
              zIndex={ativo ? 1000 : undefined}
              onClick={() => onSelecionar(item)}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}

// ===========================================================================
// Modo mockup (sem chave ou chave recusada)
// ===========================================================================

function MapaMockup({ patrimonios, selecionado, onSelecionar, aviso }) {
  return (
    <div className="map-wrapper">
      <div className="map-mockup-container">
        <div className="mockup-badge">
          <span className="mockup-dot" /> {aviso ?? "Modo mockup (sem chave do Google Maps)"}
        </div>

        <div className="mockup-grid">
          {patrimonios.length === 0 ? (
            <p className="mockup-empty">
              Nenhum patrimônio encontrado para os filtros selecionados.
            </p>
          ) : (
            patrimonios.map((item) => (
              <div
                key={item.id}
                className={`mockup-pin-card ${selecionado?.id === item.id ? "active" : ""}`}
                onClick={() => onSelecionar(item)}
              >
                <span className={`badge-categoria ${item.categoria}`}>
                  {item.categoria}
                </span>
                <h4>{item.nome}</h4>
                <p>📍 {item.bairro}</p>
                {item.cep && <p className="mockup-pin-cep">CEP {item.cep}</p>}
                <small>Nº {String(item.id).padStart(3, "0")}</small>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
