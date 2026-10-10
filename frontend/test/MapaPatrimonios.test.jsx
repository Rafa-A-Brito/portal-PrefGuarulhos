import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect, StrictMode } from "react";
import MapaPatrimonios from "../src/features/mapa/MapaPatrimonios";
const state = vi.hoisted(() => ({ map: { fitBounds: vi.fn(), setZoom: vi.fn() }, options: null }));
vi.mock("../src/hooks/useGoogleMaps", () => ({ GOOGLE_MAPS_MAP_ID: "project-map-id", useGoogleMaps: () => ({ configurado: true, pronto: true }) }));
vi.mock("@react-google-maps/api", () => ({
  GoogleMap: ({ children, onLoad, onUnmount, options }) => {
    state.options = options;
    useEffect(() => { onLoad(state.map); return onUnmount; }, [onLoad, onUnmount]);
    return <div data-testid="map">{children}</div>;
  },
  InfoWindowF: ({ children, onCloseClick, position }) => <div data-testid="info" data-position={JSON.stringify(position)}><button onClick={onCloseClick}>Fechar</button>{children}</div>,
}));
const instances = [];
class MarkerElement extends HTMLElement {
  constructor(options) { super(); Object.assign(this, options); instances.push(this); }
}
customElements.define("test-advanced-marker", MarkerElement);
const legacy = vi.fn(() => { throw new Error("Legacy Marker não deve ser utilizado"); });
const item = (id, lat="-23.45") => ({ id, nome: "Patrimônio " + id, categoria: "historico", bairro: "Centro", imagemPrincipal: "/imagem.jpg", resumo: "Resumo do backend", localizacao: { latitude: lat, longitude: "-46.53" } });
beforeEach(() => {
  instances.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal("google", { maps: { Marker: legacy, marker: { AdvancedMarkerElement: MarkerElement }, LatLngBounds: class { extend = vi.fn(); } } });
});
afterEach(() => vi.unstubAllGlobals());

test("AdvancedMarker: clique, InfoWindow, coordenadas Decimal, filtros e cleanup sem Marker legado", async () => {
  const warn = vi.spyOn(console, "warn");
  const first = item("1"), second = item("2", "-23.46");
  const view = render(<MapaPatrimonios patrimonios={[first, second, item("sem-posicao", "")]} />);
  await waitFor(() => expect(instances).toHaveLength(2));
  expect(state.options.mapId).toBe("project-map-id");
  const marker = instances[0];
  expect(marker.position).toEqual({ lat: -23.45, lng: -46.53 });
  expect(marker.title).toBe(first.nome);
  expect(marker.gmpClickable).toBe(true);
  expect(marker.firstChild).not.toBe(instances[1].firstChild);
  expect(marker.firstChild.width).toBe(30);
  act(() => marker.dispatchEvent(new Event("gmp-click")));
  expect(screen.getByRole("heading", { name: first.nome })).toBeTruthy();
  expect(screen.getByTestId("info").dataset.position).toBe(JSON.stringify(marker.position));
  act(() => screen.getByRole("button", { name: "Fechar" }).click());
  expect(screen.queryByTestId("info")).toBeNull();
  view.rerender(<MapaPatrimonios patrimonios={[{ ...second, localizacao: { latitude: "-23.47", longitude: "-46.54" } }]} />);
  expect(marker.map).toBeNull();
  expect(instances[1].position).toEqual({ lat: -23.47, lng: -46.54 });
  expect(instances).toHaveLength(2);
  expect(state.map.setZoom).toHaveBeenCalledWith(15);
  act(() => marker.dispatchEvent(new Event("gmp-click")));
  expect(screen.queryByTestId("info")).toBeNull();
  view.unmount();
  expect(instances.every(x => x.map === null && !x.childNodes.length)).toBe(true);
  expect(legacy).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

test("seleção controlada devolve o patrimônio correto; StrictMode remove todos os listeners", async () => {
  const onSelecionar = vi.fn();
  const selected = item("controlado");
  const view = render(<StrictMode><MapaPatrimonios patrimonios={[selected]} selecionado={selected} onSelecionar={onSelecionar} /></StrictMode>);
  await waitFor(() => expect(instances.some(x => x.map)).toBe(true));
  const live = instances.find(x => x.map);
  act(() => live.dispatchEvent(new Event("gmp-click")));
  expect(onSelecionar).toHaveBeenCalledWith(selected);
  view.unmount();
  onSelecionar.mockClear();
  for (const marker of instances) marker.dispatchEvent(new Event("gmp-click"));
  expect(onSelecionar).not.toHaveBeenCalled();
});
