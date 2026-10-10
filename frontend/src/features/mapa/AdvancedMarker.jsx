import { useEffect, useRef } from "react";

const COR_POR_CATEGORIA = {
  arquitetonico: "#1D6E96",
  historico: "#7A3E9D",
  imaterial: "#92590A",
  ambiental: "#146A2E",
  ferroviario: "#8A2D2D",
  educacional: "#0F766E",
  industrial: "#56661F",
};


// Um DOM próprio por marcador: o Google move os filhos, não os clona.
function criarPino(categoria) {
  const cor = COR_POR_CATEGORIA[categoria] || "#2B255C";
  const img = document.createElement("img");
  img.width = 30;
  img.height = 40;
  img.alt = "";
  img.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="' + cor + '"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>'
  );
  return img;
}

export default function AdvancedMarker({ map, position, item, onSelecionar }) {
  const markerRef = useRef(null);
  const clickRef = useRef(null);
  useEffect(() => { clickRef.current = () => onSelecionar(item); }, [onSelecionar, item]);
  useEffect(() => {
    if (!map) return;
    const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, gmpClickable: true });
    const click = () => clickRef.current?.();
    marker.addEventListener("gmp-click", click);
    markerRef.current = marker;
    return () => {
      marker.removeEventListener("gmp-click", click);
      marker.map = null;
      marker.replaceChildren();
      markerRef.current = null;
    };
  }, [map]);
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.position = { lat: position.lat, lng: position.lng };
    markerRef.current.title = item.nome;
    markerRef.current.replaceChildren(criarPino(item.categoria));
  }, [map, position.lat, position.lng, item.nome, item.categoria]);
  return null;
}
