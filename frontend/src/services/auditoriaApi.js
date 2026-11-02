import api from "./api";

export async function listarAuditoria(params, signal) {
  const { data } = await api.get("/admin/auditoria", { params, signal });
  const lista = data?.data;
  const p = lista?.paginacao;
  if (data?.success !== true || !Array.isArray(lista?.itens) || !p ||
    ![p.pagina, p.limite, p.total, p.totalPaginas].every(Number.isSafeInteger) ||
    p.pagina < 1 || p.limite < 1 || p.limite > 100 || p.total < 0 || p.totalPaginas !== Math.ceil(p.total / p.limite) ||
    p.pagina !== params.pagina || p.limite !== params.limite || lista.itens.length > p.limite) {
    throw new Error("Resposta de auditoria inválida.");
  }
  return lista;
}

export async function buscarAuditoria(id, signal) {
  const { data } = await api.get(`/admin/auditoria/${encodeURIComponent(id)}`, { signal });
  if (data?.success !== true || data.data?.id !== id) throw new Error("Resposta de auditoria inválida.");
  return data.data;
}

export function erroAuditoria(erro) {
  const status = erro.response?.status;
  return { status, mensagem: ({
    400: "Confira os filtros enviados.",
    401: "Sua sessão expirou. Entre novamente para consultar o histórico.",
    403: "Você não tem permissão para consultar o histórico.",
    404: "Evento de auditoria não encontrado.",
    503: "O histórico está temporariamente indisponível.",
  })[status] || "Não foi possível consultar o histórico. Tente novamente." };
}
