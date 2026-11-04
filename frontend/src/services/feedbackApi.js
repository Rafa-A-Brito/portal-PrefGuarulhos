import api from "./api";
import { validarDetalheFeedback, validarListaFeedback, validarResumoFeedback } from "../features/admin/feedbackDashboard";

async function consultar(caminho, params, signal) {
  const { data } = await api.get(caminho, { params, signal, headers: { "Cache-Control": "no-store" } });
  if (data?.success !== true) throw new Error("Resposta de Feedback inválida.");
  return data.data;
}
export async function listarFeedback(params, signal) { return validarListaFeedback(await consultar("/admin/feedback", params, signal), params); }
export async function resumirFeedback(params, signal) { return validarResumoFeedback(await consultar("/admin/feedback/resumo", params, signal), params); }
export async function detalharFeedback(id, signal) { return validarDetalheFeedback(await consultar(`/admin/feedback/${encodeURIComponent(id)}`, undefined, signal), id); }
export function erroFeedbackAdmin(error) {
  const status = error.response?.status;
  return { status, mensagem: ({
    400: "Confira os filtros e o período informado.",
    401: "Sua sessão expirou. Entre novamente para consultar o feedback.",
    403: "Acesso negado: somente administradores podem consultar o feedback.",
    404: "Este feedback foi excluído, expirou ou não está disponível.",
    429: "Limite temporário de consultas. Aguarde e tente novamente.",
    503: "O serviço de feedback está temporariamente indisponível.",
  })[status] || "Não foi possível consultar o feedback. Nenhum total foi estimado. Tente novamente." };
}
