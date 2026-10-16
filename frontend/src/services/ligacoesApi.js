import api from "./api";

const base = id => `/admin/patrimonios/${id}/ligacoes`;
export async function listarLigacoes(id, signal) {
  return (await api.get(base(id), { signal })).data.data;
}
export async function buscarDestinos(busca, pagina, signal) {
  return (await api.get("/admin/patrimonios", {
    params: { busca, pagina, limite: 20 }, signal,
  })).data.data;
}
export async function criarLigacao(id, patrimonioDestinoId, texto) {
  return (await api.post(base(id), { patrimonioDestinoId, texto })).data.data;
}
export async function editarLigacao(id, ligacaoId, texto) {
  return (await api.patch(`${base(id)}/${ligacaoId}`, { texto })).data.data;
}
export async function excluirLigacao(id, ligacaoId) {
  return (await api.delete(`${base(id)}/${ligacaoId}`)).data.data;
}
export async function ordenarLigacoes(id, ids) {
  return (await api.patch(`${base(id)}/ordem`, { ids })).data.data;
}
