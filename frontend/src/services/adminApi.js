/**
 * Chamadas usadas só pelo painel admin. Separadas do fakeApi.js de
 * propósito: aqui as escritas mexem em dado de verdade e NÃO têm fallback
 * local. Se o backend estiver fora, a pessoa precisa saber na hora.
 *
 * Rotas do backend (todas exigem Bearer token; ver backend/src/routes):
 *   POST  /auth/login                     público
 *   PATCH /auth/senha                     ADMIN e EDITOR
 *   POST  /admins                         ADMIN
 *   GET   /admins e /admins/:id           ADMIN
 *   PATCH /admins/:id e /admins/:id/status ADMIN
 *   GET   /admin/patrimonios              ADMIN e EDITOR (todos os status)
 *   GET   /admin/patrimonios/:id          ADMIN e EDITOR (UUID)
 *   POST  /admin/patrimonios              ADMIN e EDITOR (nasce RASCUNHO)
 *   PATCH /admin/patrimonios/:id          ADMIN; EDITOR só em RASCUNHO
 *   PATCH /admin/patrimonios/:id/publicar ADMIN
 *   PATCH /admin/patrimonios/:id/arquivar ADMIN
 *   POST  /admin/patrimonios/:id/imagens  ADMIN e EDITOR (multipart/form-data)
 *   DELETE /admin/patrimonios/imagens/:imagemId  ADMIN
 *
 * Não há GET de imagens: elas vêm dentro do detalhe do patrimônio
 * (GET /admin/patrimonios/:id -> data.imagens).
 *
 * NÃO existem no backend: excluir usuários e excluir
 * patrimônio (só arquivar).
 */
import api from "./api";
import {
  buscarTodasAsPaginas,
  normalizarPatrimonio,
  resolverUrlPublica,
} from "./fakeApi";

// ===== Usuários =====

/** role: "ADMIN" | "EDITOR". A senha precisa ter 12+ caracteres. */
export async function criarUsuario({ nome, email, role, password }) {
  const { data } = await api.post("/admins", { nome, email, role, password });
  return data.data;
}

export async function listarUsuarios(params = {}, signal) {
  const { data } = await api.get("/admins", { params, signal });
  return data.data;
}

export async function buscarUsuario(id) {
  const { data } = await api.get(`/admins/${id}`);
  return data.data;
}

export async function atualizarUsuario(id, { nome, email, role }) {
  const { data } = await api.patch(`/admins/${id}`, { nome, email, role });
  return data.data;
}

export async function alterarStatusUsuario(id, ativo) {
  const { data } = await api.patch(`/admins/${id}/status`, { ativo });
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

// ===== Imagens do patrimônio =====

// Espelham backend/src/middlewares/uploadImage.js (tipos aceitos e limite de
// 10 MB). A validação do backend é a que vale (ele confere até a assinatura
// real do arquivo); aqui é só para avisar antes de gastar o upload.
export const TIPOS_IMAGEM_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const TAMANHO_MAXIMO_IMAGEM = 10 * 1024 * 1024;

/** Devolve o texto do problema, ou null se o arquivo pode ser enviado. */
export function validarArquivoImagem(arquivo) {
  if (!TIPOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
    return "Formato não suportado. Use JPG, PNG, WEBP ou GIF.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    return "A imagem deve ter no máximo 10 MB.";
  }
  return null;
}

/** Imagens do patrimônio, lidas do detalhe (URL pública já resolvida; capa primeiro). */
export async function listarImagensPatrimonio(uuid) {
  const detalhe = await buscarPatrimonioAdmin(uuid);
  return detalhe.imagens ?? [];
}

/**
 * Envia UMA imagem. O backend lê o arquivo no campo "imagem"; os demais
 * campos são opcionais e vão como texto no mesmo multipart:
 * titulo, textoAlternativo, credito, fonte, ordem, principal ("true"/"false").
 * Devolve a imagem criada { id, url, ordem, principal, ... }.
 */
export async function enviarImagemPatrimonio(uuid, arquivo, campos = {}) {
  const corpo = new FormData();
  corpo.append("imagem", arquivo);

  for (const nome of ["titulo", "textoAlternativo", "credito", "fonte"]) {
    const valor = campos[nome]?.trim();
    if (valor) corpo.append(nome, valor);
  }
  if (Number.isInteger(campos.ordem)) corpo.append("ordem", String(campos.ordem));
  if (campos.principal !== undefined) {
    corpo.append("principal", campos.principal ? "true" : "false");
  }

  // O api.js fixa Content-Type: application/json como padrão e o axios, vendo
  // JSON + FormData, converteria o FormData em JSON (o arquivo se perderia).
  // Declarar multipart/form-data faz o axios entregar o FormData intacto; o
  // navegador então acrescenta o boundary sozinho.
  // Timeout maior que o padrão (10 s): são até 10 MB por requisição.
  const { data } = await api.post(`/admin/patrimonios/${uuid}/imagens`, corpo, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });

  return { ...data.data, url: resolverUrlPublica(data.data.url) };
}

/** Só ADMIN (o backend responde 403 para EDITOR). Devolve { id }. */
export async function removerImagemPatrimonio(imagemId) {
  const { data } = await api.delete(`/admin/patrimonios/imagens/${imagemId}`);
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
