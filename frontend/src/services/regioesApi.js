import api from "./api";

export async function listarRegioes(signal) {
  const { data } = await api.get("/regioes", { signal });
  return data.data;
}
export async function listarRegioesAdmin(params = {}, signal) {
  const { data } = await api.get("/admin/regioes", { params, signal });
  return data.data;
}
export async function listarRegioesAtivasAdmin(signal) {
  const itens = [];
  let pagina = 1;
  let totalPaginas;
  do {
    const result = await listarRegioesAdmin({ ativo: true, pagina, limite: 100 }, signal);
    itens.push(...result.itens);
    totalPaginas = result.paginacao.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);
  return itens;
}
export async function criarRegiao(dados) {
  const { data } = await api.post("/admin/regioes", dados);
  return data.data;
}
export async function atualizarRegiao(id, dados) {
  const { data } = await api.patch(`/admin/regioes/${id}`, dados);
  return data.data;
}
export function erroRegiao(error) {
  return ({
    400: "Revise o nome, slug e descrição informados.",
    401: "Sua sessão expirou. Entre novamente.",
    403: "Você não tem permissão para administrar regiões.",
    404: "A região não está mais disponível. Atualize a lista.",
    409: "O slug já está em uso ou a região mudou. Atualize a lista e revise os dados.",
  })[error.response?.status] ?? "Não foi possível carregar ou salvar regiões. Tente novamente.";
}
