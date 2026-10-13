import { test, expect, vi, afterEach } from "vitest";
import api from "../src/services/api";
import { validarArquivoReferencia, validarLinkReferencia, enviarReferenciaPatrimonio } from "../src/services/referenciasApi";
afterEach(() => vi.restoreAllMocks());
test.each(["pdf", "doc", "docx", "odt", "txt", "md"])("aceita arquivo %s", ext => {
  expect(validarArquivoReferencia(new File(["teste"], `fonte.${ext}`))).toBeNull();
});
test.each(["https://example.org/fonte", "http://example.org"])("aceita link %s", url => {
  expect(validarLinkReferencia(url)).toBeNull();
});
test.each(["javascript:alert(1)", "ftp://example.org", "texto", ""])("recusa link %s", url => {
  expect(validarLinkReferencia(url)).toBeTruthy();
});
test("recusa arquivo vazio, proibido e maior que 10 MB", () => {
  expect(validarArquivoReferencia(new File([], "vazio.txt"))).toContain("vazio");
  expect(validarArquivoReferencia(new File(["x"], "x.exe"))).toContain("Formato");
  expect(validarArquivoReferencia({ name: "x.pdf", size: 10 * 1024 * 1024 + 1 })).toContain("10 MB");
});
test("não envia arquivo e URL simultaneamente", async () => {
  const post = vi.spyOn(api, "post");
  await expect(enviarReferenciaPatrimonio("id", { arquivo: new File(["x"], "x.txt"), url: "https://example.org" })).rejects.toThrow("nunca ambos");
  expect(post).not.toHaveBeenCalled();
});
