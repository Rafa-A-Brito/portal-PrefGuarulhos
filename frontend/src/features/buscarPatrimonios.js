/**
 * Busca/filtro compartilhado entre a página de Patrimônios e a de Mapa —
 * casa o termo digitado com nome, bairro e endereço (substring) e também
 * com o CEP (comparando só os dígitos, então funciona com ou sem hífen e
 * mesmo digitando o CEP incompleto, ex.: "07011" já encontra "07011-040").
 */
const REGEX_DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizarTexto(valor) {
  return (valor ?? "")
    .toString()
    .normalize("NFD")
    .replace(REGEX_DIACRITICOS, "")
    .toLowerCase();
}

function apenasDigitos(valor) {
  return (valor ?? "").toString().replace(/\D/g, "");
}

export function filtrarPatrimonios(patrimonios, { categoria, busca } = {}) {
  const termo = normalizarTexto(busca?.trim());
  const termoDigitos = apenasDigitos(busca);

  return patrimonios.filter((item) => {
    const passaCategoria =
      !categoria || categoria === "todos" || item.categoria === categoria;

    if (!passaCategoria) return false;
    if (!termo) return true;

    const casaTexto =
      normalizarTexto(item.nome).includes(termo) ||
      normalizarTexto(item.bairro).includes(termo) ||
      normalizarTexto(item.endereco).includes(termo);

    const casaCep =
      termoDigitos.length >= 3 &&
      apenasDigitos(item.cep).startsWith(termoDigitos);

    return casaTexto || casaCep;
  });
}
