/**
 * Chamadas de API usadas só pelo painel admin. Ficam separadas do
 * fakeApi.js de propósito: fakeApi.js é lido pelo site público inteiro e
 * tem aquele fallback pra dados locais quando o backend está fora, mas as
 * funções daqui embaixo mexem em dado de verdade (criar, editar, apagar),
 * então não faz sentido nenhum ter um "fallback local" pra uma escrita. Se
 * o backend estiver fora, a pessoa que está no admin precisa saber disso
 * na hora, não continuar clicando em "salvar" achando que funcionou.
 */
import api from "./api";

// ===== Usuários =====

export async function listarUsuarios() {
  const { data } = await api.get("/admin/usuarios");
  return data;
}

export async function criarUsuario(dados) {
  const { data } = await api.post("/admin/usuarios", dados);
  return data;
}

export async function atualizarUsuario(id, dados) {
  const { data } = await api.put(`/admin/usuarios/${id}`, dados);
  return data;
}

export async function excluirUsuario(id) {
  await api.delete(`/admin/usuarios/${id}`);
}

// ===== Patrimônios =====

export async function criarPatrimonio(dados) {
  const { data } = await api.post("/admin/patrimonios", dados);
  return data;
}

export async function atualizarPatrimonio(id, dados) {
  const { data } = await api.put(`/admin/patrimonios/${id}`, dados);
  return data;
}

export async function excluirPatrimonio(id) {
  await api.delete(`/admin/patrimonios/${id}`);
}

/**
 * Junta as mensagens de erro que vêm do backend (erro único em "erro", ou
 * uma lista em "erros", dependendo da rota) num texto só, pronto pra
 * mostrar pro usuário. Fica aqui porque toda tela de formulário do admin
 * precisa fazer exatamente essa mesma coisa.
 */
export function extrairMensagemDeErro(err) {
  const corpo = err.response?.data;

  if (corpo?.erros?.length) return corpo.erros.join(" ");
  if (corpo?.erro) return corpo.erro;
  if (!err.response) return "Não foi possível falar com o servidor.";

  return "Algo deu errado. Tente novamente.";
}
