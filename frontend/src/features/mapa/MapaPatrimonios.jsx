import { GoogleMap } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/global.css";
import AdvancedMarker from "./AdvancedMarker";
import { GOOGLE_MAPS_MAP_ID, useGoogleMaps } from "../../hooks/useGoogleMaps";
import { classificarLocalizacao } from "./politicaLocalizacao";

const GUARULHOS_CENTER = { lat: -23.4542, lng: -46.5268 };
const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "460px",
  borderRadius: "14px",
};

export default function MapaPatrimonios({
  patrimonios = [],
  selecionado,
  onSelecionar = () => {},
}) {
  const [map, setMap] = useState(null);

  // Pontos sem destino validado ficam na lista, sem sugerir localização exata.
  const itensComPolitica = useMemo(
    () => patrimonios.map((item) => ({ item, politica: classificarLocalizacao(item) })),
    [patrimonios],
  );
  const marcadores = useMemo(
    () =>
      itensComPolitica
        .map(({ item, politica }) => ({ item, politica, posicao: politica.coordenadasMarcador }))
        .filter((marcador) => marcador.posicao),
    [itensComPolitica],
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
              itensComPolitica.map(({ item, politica }) => (
                <div
                  key={item.id}
                  className={`mockup-pin-card ${selecionado?.id === item.id ? "active" : ""}`}
                  onClick={() => onSelecionar?.(item)}
                >
                  <span className={`badge-categoria ${item.categoria}`}>
                    {item.categoria}
                  </span>
                  <h4>{item.nome}</h4>
                  {politica.aviso && <p>{politica.aviso}</p>}
                  {politica.exibirEndereco && <p>📍 {item.bairro}</p>}
                  {politica.exibirEndereco && item.cep && <p className="mockup-pin-cep">CEP {item.cep}</p>}
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
          mapId: GOOGLE_MAPS_MAP_ID,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {marcadores.map(({ item, posicao, politica }) => (
          <AdvancedMarker
            key={item.id}
            position={posicao}
            map={map}
            item={item}
            titulo={[item.nome, politica.aviso].filter(Boolean).join(" — ")}
            onSelecionar={onSelecionar}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
