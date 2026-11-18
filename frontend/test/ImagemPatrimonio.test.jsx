import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ImagemPatrimonio from "../src/components/ImagemPatrimonio";

test.each([undefined, null, "", "   ", 123, {}, "null", "undefined", "#", "https://", "javascript:alert(1)", "data:text/html,erro"])("imagem ausente ou inválida (%s) usa ilustração neutra", src => {
  render(<ImagemPatrimonio src={src} alt="Casa" />);
  expect(screen.getByRole("img", { name: "Imagem indisponível: Casa" }).getAttribute("src"))
    .toBe("/imagem-indisponivel.svg");
});

test.each(["/foto.jpg", "https://example.test/foto.jpg", "./foto.jpg", "data:image/png;base64,AA==", "blob:https://example.test/imagem"])("URL válida é mantida e aparada: %s", src => {
  render(<ImagemPatrimonio src={`  ${src}  `} alt="Casa" />);
  expect(screen.getByRole("img").getAttribute("src")).toBe(src);
});

test("erro não repete requisição do fallback e nova imagem pode carregar", () => {
  const view = render(<ImagemPatrimonio src="/invalida.jpg" alt="Casa" />);
  const img = screen.getByRole("img");
  fireEvent.error(img);
  expect(img.getAttribute("src")).toBe("/imagem-indisponivel.svg");
  const setAttribute = vi.spyOn(img, "setAttribute");
  fireEvent.error(img);
  expect(setAttribute).not.toHaveBeenCalled();
  view.rerender(<ImagemPatrimonio src="/nova.jpg" alt="Estação" />);
  expect(screen.getByRole("img", { name: "Estação" }).getAttribute("src")).toBe("/nova.jpg");
});
