import { montarResumo } from "../../../backend/src/utils/feedback.js";
export const idFeedback = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function resumoFeedback(q, total = "3", extra = {}) {
  const tipos = new Map([[q.tipo || "ELOGIO", total]]), periodo = q.fim.slice(0, q.granularidade === "mes" ? 7 : 10);
  return { ...montarResumo(q, new Date(q.fim + "T15:00:00Z"), tipos, new Map([[periodo, total]])), ...extra };
}
export function listaFeedback(q, total = 3) {
  const inicio = (q.pagina - 1) * q.limite;
  return { disponivel: true, meta: resumoFeedback({ ...q, granularidade: "dia" }).meta,
    itens: Array.from({ length: Math.min(q.limite, Math.max(0, total - inicio)) }, (_, i) => ({ id: idFeedback(total - inicio - i), tipo: q.tipo || "ELOGIO", createdAt: q.fim + "T14:00:00.000Z" })),
    paginacao: { pagina: q.pagina, limite: q.limite, total, totalPaginas: Math.ceil(total / q.limite) } };
}
