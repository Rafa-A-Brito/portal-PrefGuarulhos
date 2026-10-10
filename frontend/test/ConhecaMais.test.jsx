import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConhecaMais from "../src/pages/ConhecaMais/ConhecaMais";
import ConhecaMaisDetalhes from "../src/pages/ConheceMaisDetalhes/ConhecaMaisDetalhes";
import { listarNovidades } from "../src/services/conteudoApi";
import api from "../src/services/api";
import * as editorial from "../src/features/mocks/novidadesMock";
vi.mock("../src/hooks/usePatrimoniosContext", () => ({ usePatrimoniosContext: () => ({ estatisticas: {}, carregando: false }) }));
const items = [editorial.noticiasSetembro, editorial.eventosOutubro, editorial.eventosNovembro, editorial.eventosDezembro].flatMap((group, index) => group.map((item, i) => ({
  ...item, id: 'uuid-' + index + '-' + i, slug: item.id, titulo: "API: " + item.titulo, tipo: item.tipo.toUpperCase(),
  data: item.data || '2026-' + (9 + index).toString().padStart(2, '0') + '-' + (item.bloco.dia.match(/^\d+/)?.[0] || '1').padStart(2,'0'),
  imagemUrl: item.imagem ? '/uploads/novidades/existente.jpg' : null,
})));
const original = api.defaults.adapter;
let calls;
beforeEach(() => {
  calls = [];
  api.defaults.adapter = async config => {
    calls.push(config.url);
    return { config, status: 200, headers: {}, data: { success: true, data: { itens: config.url === "/novidades" ? items : [], paginacao: { totalPaginas: 1 } } } };
  };
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { api.defaults.adapter = original; vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

test("Conheça Mais renderiza os 16 itens obtidos pela API e links para os IDs reais", async () => {
  render(<MemoryRouter><ConhecaMais /></MemoryRouter>);
  for (const item of items) expect(await screen.findByText(item.titulo)).toBeTruthy();
  expect(calls).toContain("/novidades");
  expect(screen.getAllByText("Leia mais")[0].getAttribute("href")).toContain("#uuid-");
  expect(screen.queryByText(editorial.noticiasSetembro[0].titulo)).toBeNull();
});

test("Detalhes renderiza texto, bloco, quando/local, imagens, CTA/fontes e hash após carga da API", async () => {
  render(<MemoryRouter initialEntries={["/conheca-mais/detalhes#" + items[0].id]}><ConhecaMaisDetalhes /></MemoryRouter>);
  await screen.findByRole("heading", { name: items[0].titulo });
  for (const item of items) {
    const article = document.getElementById(item.id);
    expect(article?.textContent).toContain(item.texto);
    expect(article.textContent).toContain(item.bloco.dia);
    if (item.quando) expect(article.textContent).toContain(item.quando);
    if (item.local) expect(article.textContent).toContain(item.local);
    if (item.cta) expect(article.querySelector('.btn-solid').href).toBe(item.cta.url);
    for (const f of item.fontes) expect([...article.querySelectorAll('a')].some(a => a.href === f.url)).toBe(true);
    if (item.imagemUrl) expect(article.querySelector('img').src).toContain('/uploads/novidades/');
  }
  await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
});

test("API vazia não é substituída por mock; falha de rede em produção é propagada", async () => {
  api.defaults.adapter = async config => ({ config, status: 200, data: { data: { itens: [] } } });
  expect(await listarNovidades()).toEqual([]);
  vi.stubEnv("DEV", false);
  api.defaults.adapter = async () => { throw Object.assign(new Error("offline"), { code: "ERR_NETWORK" }); };
  await expect(listarNovidades()).rejects.toThrow("offline");
});
