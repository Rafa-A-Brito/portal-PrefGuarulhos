// Validações simples e reutilizáveis, sem depender de nenhuma biblioteca
// externa. A ideia é que cada função devolva uma mensagem de erro (string)
// quando algo está errado, ou null quando está tudo certo. Assim, quem
// chama só precisa filtrar os valores que não forem null.

export const PERFIS_VALIDOS = ["admin", "tecnico"];
export const CATEGORIAS_VALIDAS = [
  "arquitetonico",
  "imaterial",
  "natural",
  "documental",
];

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarUsuario(dados, { exigirSenha = true } = {}) {
  const erros = [];

  if (!dados.nome || !dados.nome.trim()) {
    erros.push("O nome é obrigatório.");
  }

  if (!dados.email || !REGEX_EMAIL.test(dados.email.trim())) {
    erros.push("Informe um e-mail válido.");
  }

  if (exigirSenha && (!dados.senha || dados.senha.length < 6)) {
    erros.push("A senha precisa ter pelo menos 6 caracteres.");
  }

  if (dados.perfil && !PERFIS_VALIDOS.includes(dados.perfil)) {
    erros.push(`Perfil precisa ser um destes: ${PERFIS_VALIDOS.join(", ")}.`);
  }

  return erros;
}

export function validarPatrimonio(dados) {
  const erros = [];

  if (!dados.nome || !dados.nome.trim()) {
    erros.push("O nome do patrimônio é obrigatório.");
  }

  if (!dados.categoria || !CATEGORIAS_VALIDAS.includes(dados.categoria)) {
    erros.push(
      `A categoria precisa ser uma destas: ${CATEGORIAS_VALIDAS.join(", ")}.`,
    );
  }

  if (!dados.bairro || !dados.bairro.trim()) {
    erros.push("O bairro é obrigatório.");
  }

  if (!dados.resumo || !dados.resumo.trim()) {
    erros.push("O resumo é obrigatório.");
  }

  if (dados.lat !== undefined && dados.lat !== null && dados.lat !== "") {
    const lat = Number(dados.lat);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      erros.push("Latitude inválida.");
    }
  }

  if (dados.lng !== undefined && dados.lng !== null && dados.lng !== "") {
    const lng = Number(dados.lng);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      erros.push("Longitude inválida.");
    }
  }

  return erros;
}
