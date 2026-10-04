import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useCallback, useEffect, useState } from "react";
import "../../styles/global.css";

const GUARULHOS_CENTER = { lat: -23.4542, lng: -46.5268 };
const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "460px",
  borderRadius: "14px",
};

const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23D9D9D9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%235B5876' text-anchor='middle' dominant-baseline='middle'%3ESem imagem%3C/text%3E%3C/svg%3E";

// Cor do pino no mapa real, por categoria — espelha as cores dos badges/chips.
const COR_POR_CATEGORIA = {
  arquitetonico: "#1D6E96",
  imaterial: "#92590A",
  natural: "#146A2E",
  documental: "#56661F",
};

function pinIcon(categoria) {
  const cor = COR_POR_CATEGORIA[categoria] || "#2B255C";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${cor}"/>
      <circle cx="15" cy="15" r="6" fill="#fff"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize:
      typeof window !== "undefined" && window.google
        ? new window.google.maps.Size(30, 40)
        : undefined,
  };
}

export default function MapaPatrimonios({
  patrimonios = [],
  selecionado: selecionadoProp,
  onSelecionar,
}) {
  const [internalSelecionado, setInternalSelecionado] = useState(null);
  const selectedPatrimonio = onSelecionar
    ? selecionadoProp
    : internalSelecionado;
  const setSelectedPatrimonio = onSelecionar ?? setInternalSelecionado;

  const [map, setMap] = useState(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isMockMode = import.meta.env.VITE_USE_MOCK_MAP === "true" || !apiKey;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || "",
    preventGoogleFontsLoading: true,
  });

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);
  useEffect(() => {
    if (!isMockMode && map && patrimonios.length > 0 && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      let contemPontosValidos = false;

      patrimonios.forEach((item) => {
        // Valida se a localização e as coordenadas realmente existem antes de aplicar
        if (item.localizacao?.lat && item.localizacao?.lng) {
          bounds.extend({
            lat: item.localizacao.lat,
            lng: item.localizacao.lng,
          });
          contemPontosValidos = true;
        }
      });

      if (contemPontosValidos) {
        map.fitBounds(bounds);
        if (patrimonios.length === 1) map.setZoom(15);
      }
    }
  }, [map, patrimonios, isMockMode]);

  // ===== MODO MOCK — sem chave de API configurada =====
  if (isMockMode) {
    return (
      <div className="map-wrapper">
        <div className="map-mockup-container">
          <div className="mockup-badge">
            <span className="mockup-dot" /> Modo Desenvolvedor (Mockup Sem Custo
            de API)
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
                  className={`mockup-pin-card ${selectedPatrimonio?.id === item.id ? "active" : ""}`}
                  onClick={() => setSelectedPatrimonio(item)}
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

  // ===== MODO REAL — Google Maps API =====
  if (loadError)
    return <div className="map-error">Erro ao carregar a Google Maps API.</div>;
  if (!isLoaded) return <div className="map-loading">Carregando mapa...</div>;

  return (
    <div className="map-wrapper" style={{ height: "100%" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={GUARULHOS_CENTER}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {patrimonios.map((item) => (
          <MarkerF
            key={item.id}
            position={{ lat: item.localizacao.lat, lng: item.localizacao.lng }}
            title={item.nome}
            icon={pinIcon(item.categoria)}
            onClick={() => setSelectedPatrimonio(item)}
          />
        ))}

        {selectedPatrimonio && (
          <InfoWindowF
            position={{
              lat: selectedPatrimonio.localizacao.lat,
              lng: selectedPatrimonio.localizacao.lng,
            }}
            onCloseClick={() => setSelectedPatrimonio(null)}
          >
            <div className="info-window-card">
              <img
                src={selectedPatrimonio.imagemPrincipal}
                alt={selectedPatrimonio.nome}
                className="info-window-img"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMG;
                }}
              />
              <span
                className={`badge-categoria ${selectedPatrimonio.categoria}`}
              >
                {selectedPatrimonio.categoria}
              </span>
              <h3>{selectedPatrimonio.nome}</h3>
              <p className="info-window-bairro">
                📍 {selectedPatrimonio.bairro}
              </p>
              {selectedPatrimonio.endereco && (
                <p className="info-window-endereco">
                  {selectedPatrimonio.endereco}
                  {selectedPatrimonio.cep
                    ? ` – CEP ${selectedPatrimonio.cep}`
                    : ""}
                </p>
              )}
              <p className="info-window-resumo">{selectedPatrimonio.resumo}</p>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
