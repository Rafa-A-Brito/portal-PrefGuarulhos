/**
 * Chamadas usadas só pelo painel admin. Separadas do fakeApi.js de
 * propósito: aqui as escritas mexem em dado de verdade e NÃO têm fallback
 * local. Se o backend estiver fora, a pessoa precisa saber na hora.
 *
 * Rotas do backend (todas exigem Bearer token; ver backend/src/routes):
 *   POST  /auth/login                     público
 *   PATCH /auth/senha                     ADMIN e EDITOR
 *   POST  /admins                         ADMIN
 *   GET   /admin/patrimonios              ADMIN e EDITOR (todos os status)
 *   GET   /admin/patrimonios/:id          ADMIN e EDITOR (UUID)
 *   POST  /admin/patrimonios              ADMIN e EDITOR (nasce RASCUNHO)
 *   PATCH /admin/patrimonios/:id          ADMIN; EDITOR só em RASCUNHO
 *   PATCH /admin/patrimonios/:id/publicar ADMIN
 *   PATCH /admin/patrimonios/:id/arquivar ADMIN
 *
 * NÃO existem no backend: listar/editar/excluir usuários, excluir
 * patrimônio (só arquivar) e upload de imagem.
 */
import api from "./api";
import { buscarTodasAsPaginas, normalizarPatrimonio } from "./fakeApi";

// ===== Usuários =====

/** role: "ADMIN" | "EDITOR". A senha precisa ter 12+ caracteres. */
export async function criarUsuario({ nome, email, role, password }) {
  const { data } = await api.post("/admins", { nome, email, role, password });
  return data.data;
}

export async function alterarSenha({ senhaAtual, novaSenha }) {
  await api.patch("/auth/senha", { senhaAtual, novaSenha });
}

// ===== Patrimônios =====

/** Lista TODOS os status (rascunho, publicado, arquivado). */
export async function listarPatrimoniosAdmin() {
  const itens = await buscarTodasAsPaginas("/admin/patrimonios");
  return itens.map(normalizarPatrimonio);
}

/** Detalhe completo (com descricao, historia...) pelo UUID. */
export async function buscarPatrimonioAdmin(uuid) {
  const { data } = await api.get(`/admin/patrimonios/${uuid}`);
  return normalizarPatrimonio(data.data);
}

export async function criarPatrimonio(dados) {
  const { data } = await api.post("/admin/patrimonios", dados);
  return data.data;
}

export async function atualizarPatrimonio(uuid, dados) {
  const { data } = await api.patch(`/admin/patrimonios/${uuid}`, dados);
  return data.data;
}

export async function publicarPatrimonio(uuid) {
  const { data } = await api.patch(`/admin/patrimonios/${uuid}/publicar`);
  return data.data;
}

export async function arquivarPatrimonio(uuid) {
  const { data } = await api.patch(`/admin/patrimonios/${uuid}/arquivar`);
  return data.data;
}

/**
 * Junta as mensagens de erro do backend num texto só. O formato é
 * { success:false, message, details:[{field,message}], error:{code,message} }.
 */
export function extrairMensagemDeErro(err) {
  const corpo = err.response?.data;

  if (corpo?.details?.length) {
    return corpo.details.map((d) => d.message).join(" ");
  }
  if (corpo?.message) return corpo.message;
  if (!err.response) return "Não foi possível falar com o servidor.";

  return "Algo deu errado. Tente novamente.";
}
