// Decimal(12,3), em metros, conforme o contrato do backend.
export function lerRaioProtecao(texto) {
  const valor = String(texto ?? "").trim();
  if (!valor) return null;
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(valor)) {
    throw new Error("Informe um raio positivo em metros, com at\u00e9 tr\u00eas casas decimais.");
  }
  const numero = Number(valor.replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0 || numero > 999999999.999) {
    throw new Error("O raio deve estar entre 0,001 e 999.999.999,999 metros.");
  }
  return numero;
}

export function dadosRaioProtecao(texto, original, criando) {
  const raio = lerRaioProtecao(texto);
  if (criando ? raio === null : raio === lerRaioProtecao(original)) return {};
  return { raioProtecaoEntornoMetros: raio };
}

export function formatarRaioProtecao(valor) {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0
    ? `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} m`
    : "";
}
