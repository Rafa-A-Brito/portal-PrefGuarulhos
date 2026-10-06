import { GoogleMap, InfoWindowF, MarkerF } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/global.css";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { obterCoordenadas } from "./coordenadas";

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
// Chaves = slugs reais do banco (ver categoriaMeta.js).
const COR_POR_CATEGORIA = {
  arquitetonico: "#1D6E96",
  historico: "#7A3E9D",
  imaterial: "#92590A",
  ambiental: "#146A2E",
  ferroviario: "#8A2D2D",
  educacional: "#0F766E",
  industrial: "#56661F",
};

// Um ícone por categoria, criado uma vez: gerar um objeto novo a cada render
// faria todo marcador redesenhar o ícone sem necessidade.
const cacheIcones = new Map();

function pinIcon(categoria) {
  if (!window.google?.maps) return undefined;

  if (!cacheIcones.has(categoria)) {
    const cor = COR_POR_CATEGORIA[categoria] || "#2B255C";
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${cor}"/>
      <circle cx="15" cy="15" r="6" fill="#fff"/>
    </svg>`;
    cacheIcones.set(categoria, {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(30, 40),
    });
  }

  return cacheIcones.get(categoria);
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

  // Só entram no mapa patrimônios com coordenadas válidas. Os demais seguem
  // na lista e nos filtros (que usam "patrimonios"), mas não viram marcador.
  const marcadores = useMemo(
    () =>
      patrimonios
        .map((item) => ({ item, posicao: obterCoordenadas(item) }))
        .filter((marcador) => marcador.posicao),
    [patrimonios],
  );

  // Loader único do Google Maps (o mesmo do geocoding no admin).
  const { configurado, pronto, erro: loadError } = useGoogleMaps();
  const isMockMode = !configurado;

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Reenquadra o mapa quando o mapa carrega ou a lista filtrada muda.
  // Dependências: map (instância), marcadores (muda com os filtros) e o modo.
  useEffect(() => {
    if (isMockMode || !map || marcadores.length === 0 || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();
    marcadores.forEach(({ posicao }) => bounds.extend(posicao));

    map.fitBounds(bounds);
    if (marcadores.length === 1) map.setZoom(15);
  }, [map, marcadores, isMockMode]);

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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== MODO REAL — Google Maps API =====
  const posicaoSelecionada = obterCoordenadas(selectedPatrimonio);

  if (loadError)
    return <div className="map-error">Erro ao carregar a Google Maps API.</div>;
  if (!pronto) return <div className="map-loading">Carregando mapa...</div>;

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
        {marcadores.map(({ item, posicao }) => (
          <MarkerF
            key={item.id}
            position={posicao}
            title={item.nome}
            icon={pinIcon(item.categoria)}
            onClick={() => setSelectedPatrimonio(item)}
          />
        ))}

        {selectedPatrimonio && posicaoSelecionada && (
          <InfoWindowF
            position={posicaoSelecionada}
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
