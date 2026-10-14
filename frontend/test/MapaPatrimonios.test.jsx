import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useState, StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import Mapa from "../src/pages/Mapa/Mapa";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import { criarUrlRota } from "../src/features/mapa/rota";
import MapaPatrimonios from "../src/features/mapa/MapaPatrimonios";
import { SEM_DESTINO_C3 } from "./fixtures/localizacaoC3";
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

test("AdvancedMarker: clique sem InfoWindow, coordenadas Decimal, filtros e cleanup sem Marker legado", async () => {
  const warn = vi.spyOn(console, "warn");
  const first = item("1"), second = item("2", "-23.46");
  const onSelecionar = vi.fn();
  const view = render(<MapaPatrimonios patrimonios={[first, second, item("sem-posicao", "")]} onSelecionar={onSelecionar} />);
  await waitFor(() => expect(instances).toHaveLength(2));
  expect(state.options.mapId).toBe("project-map-id");
  const marker = instances[0];
  expect(marker.position).toEqual({ lat: -23.45, lng: -46.53 });
  expect(marker.title).toBe(first.nome);
  expect(marker.gmpClickable).toBe(true);
  expect(marker.firstChild).not.toBe(instances[1].firstChild);
  expect(marker.firstChild.width).toBe(30);
  act(() => marker.dispatchEvent(new Event("gmp-click")));
  expect(onSelecionar).toHaveBeenCalledExactlyOnceWith(first);
  expect(screen.queryByTestId("info")).toBeNull();
  view.rerender(<MapaPatrimonios patrimonios={[{ ...second, localizacao: { latitude: "-23.47", longitude: "-46.54" } }]} />);
  expect(marker.map).toBeNull();
  expect(instances[1].position).toEqual({ lat: -23.47, lng: -46.54 });
  expect(instances).toHaveLength(2);
  expect(state.map.setZoom).toHaveBeenCalledWith(15);
  act(() => marker.dispatchEvent(new Event("gmp-click")));
  expect(onSelecionar).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("info")).toBeNull();
  view.unmount();
  expect(instances.every(x => x.map === null && !x.childNodes.length)).toBe(true);
  expect(legacy).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

function MapaComContexto({ patrimonios }) {
  const [selecionado, setSelecionado] = useState(null);
  return <MemoryRouter><PatrimoniosContext.Provider value={{ patrimonios, selecionado, setSelecionado }}><Mapa /></PatrimoniosContext.Provider></MemoryRouter>;
}

test("sidebar e marker compartilham um único painel; mudar seleção e fechar", async () => {
  const first = { ...item("um"), endereco: "Rua Exemplo", numero: "s/n", complemento: "Entrada", cidade: "São Paulo", uf: "SP", cep: "01000-000" };
  const second = { ...item("dois"), situacao: "DEMOLIDO" };
  render(<MapaComContexto patrimonios={[first, second]} />);
  await waitFor(() => expect(instances).toHaveLength(2));
  act(() => screen.getByRole("button", { name: /Patrimônio um/ }).click());
  const panel = screen.getByRole("region", { name: "Patrimônio selecionado" });
  expect(within(panel).getByText("Rua Exemplo, s/n — Entrada")).toBeTruthy();
  expect(within(panel).getByText("São Paulo - SP")).toBeTruthy();
  expect(within(panel).getByText("CEP 01000-000")).toBeTruthy();
  expect(within(panel).getByRole("link", { name: "Ver rota" }).href).toBe(criarUrlRota(first));
  act(() => instances[1].dispatchEvent(new Event("gmp-click")));
  expect(screen.getAllByRole("region", { name: "Patrimônio selecionado" })).toHaveLength(1);
  expect(within(panel).getByRole("heading", { name: second.nome })).toBeTruthy();
  expect(within(panel).getByText("Localização aproximada / referência histórica")).toBeTruthy();
  expect(within(panel).getByRole("link", { name: "Ver local aproximado" }).href).toBe(criarUrlRota(second));
  expect(screen.queryByTestId("info")).toBeNull();
  act(() => screen.getByRole("button", { name: "Fechar detalhes" }).click());
  expect(screen.queryByRole("region", { name: "Patrimônio selecionado" })).toBeNull();
});

test("endereço sem coordenadas ainda oferece rota; sem ambos oculta ação", () => {
  const first = { ...item("endereco", ""), endereco: "Rua Exemplo", numero: "s/n", cidade: "São Paulo", uf: "SP" };
  render(<MapaComContexto patrimonios={[first, item("sem-local", "")]} />);
  act(() => screen.getByRole("button", { name: /Patrimônio endereco/ }).click());
  expect(screen.getByRole("link", { name: "Ver rota" }).href).toBe(criarUrlRota(first));
  act(() => screen.getByRole("button", { name: /Patrimônio sem-local/ }).click());
  expect(screen.queryByRole("link", { name: "Ver rota" })).toBeNull();
});

test.each(SEM_DESTINO_C3)("$slug permanece na lista/painel, sem marcador, endereço legado ou botão vazio", async ({ slug, aviso }) => {
  const semDestino = { ...item(slug), slug, endereco: "Rua legada", numero: "99", cidade: "Cidade legada", cep: "99999-999" };
  const normal = item("normal"), demolido = { ...item("demolido"), situacao: "DEMOLIDO" };
  render(<MapaComContexto patrimonios={[semDestino, normal, demolido]} />);
  await waitFor(() => expect(instances).toHaveLength(2));
  expect(instances.map(m => m.title)).toEqual([normal.nome, demolido.nome + " — Localização aproximada / referência histórica"]);
  act(() => screen.getByRole("button", { name: new RegExp(semDestino.nome) }).click());
  const panel = screen.getByRole("region", { name: "Patrimônio selecionado" });
  expect(within(panel).getByText(aviso)).toBeTruthy();
  expect(within(panel).getAllByRole("link")).toHaveLength(1);
  expect(within(panel).getByRole("link", { name: /Ver detalhes/ }).getAttribute("href")).toBe("/patrimonios/" + slug);
  expect(within(panel).queryByText(/Rua legada|Cidade legada|99999-999/)).toBeNull();
  expect(screen.getAllByRole("region", { name: "Patrimônio selecionado" })).toHaveLength(1);
  expect(screen.queryByTestId("info")).toBeNull();
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
