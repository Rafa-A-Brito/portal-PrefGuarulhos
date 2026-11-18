// Validação de apresentação: não altera os dados nem o contrato da API.
export function normalizarUrlImagem(valor) {
  if (typeof valor !== "string") return "";
  const url = valor.trim();
  if (!url || /^(null|undefined)$/i.test(url) || url.startsWith("#")) return "";
  try {
    const { protocol } = new URL(url, "https://imagem.local/");
    if (["http:", "https:", "blob:"].includes(protocol)) return url;
    if (protocol === "data:" && /^data:image\/[a-z0-9.+-]+[;,]/i.test(url)) return url;
  } catch { /* URL malformada: o componente apresenta a imagem neutra. */ }
  return "";
}
