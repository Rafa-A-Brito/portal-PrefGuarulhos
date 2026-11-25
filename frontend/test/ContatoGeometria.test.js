import { describe, expect, it } from "vitest";
import { faixaLivre } from "../src/pages/Contato/faixaLivre";

describe("faixas livres das superfícies do Contato", () => {
  it("preserva a posição original sem obstáculos", () => {
    expect(faixaLivre(68, 992, 52, 924, [])).toEqual({ top: 924, maxHeight: 924 });
  });
  it("retira o FAB do textarea que atravessa o rodapé da viewport", () => {
    expect(faixaLivre(122, 992, 52, 924, [[771, 1002]])).toEqual({ top: 719, maxHeight: 649 });
  });
  it("mantém margem do campo e escolhe a menor mudança de posição", () => {
    expect(faixaLivre(68, 444, 52, 376, [[182, 413]])).toEqual({ top: 130, maxHeight: 114 });
  });
  it("limita o painel à faixa maior quando não cabe inteiro no zoom", () => {
    expect(faixaLivre(68, 444, 248, 115, [[197, 255], [368, 436]])).toEqual({ top: 68, maxHeight: 129 });
  });
  it("une obstáculos sobrepostos sem modificar os dados recebidos", () => {
    const obstaculos = [[250, 320], [150, 280]];
    expect(faixaLivre(100, 500, 100, 170, obstaculos)).toEqual({ top: 320, maxHeight: 180 });
    expect(obstaculos).toEqual([[250, 320], [150, 280]]);
  });
  it("ignora obstáculos fora da viewport e reconhece ausência de espaço", () => {
    expect(faixaLivre(100, 500, 100, 200, [[-30, 0], [600, 700]])).toEqual({ top: 200, maxHeight: 400 });
    expect(faixaLivre(100, 500, 100, 200, [[0, 600]])).toBeNull();
  });
});
