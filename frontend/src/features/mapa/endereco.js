function limpar(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor).replace(/^[,\s]+|[,\s]+$/g, "").replace(/\s+/g, " ");
  return /^(null|undefined)$/i.test(texto) ? "" : texto;
}

export function camposEndereco(patrimonio) {
  const campos = Object.fromEntries(
    ["endereco", "numero", "complemento", "bairro", "cidade", "uf", "cep"]
      .map((campo) => [campo, limpar(patrimonio?.[campo])]),
  );
  if (/^s\s*\/\s*n[º°o.]?$/i.test(campos.numero)) campos.numero = "s/n";
  return campos;
}

export function formatarEndereco(patrimonio) {
  const { endereco, numero, complemento, bairro, cidade, uf, cep } = camposEndereco(patrimonio);
  const logradouro = [endereco, numero].filter(Boolean).join(", ");
  return [
    [logradouro, complemento].filter(Boolean).join(" — "),
    bairro,
    [cidade, uf].filter(Boolean).join(" - "),
    cep && `CEP ${cep}`,
  ].filter(Boolean);
}
