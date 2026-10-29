import { store } from "./store.js";
import { page } from "./helpers.js";
import BaseError from "../errors/BaseError.js";
import { consultaMetricasSchema } from "../schemas/metricasSchema.js";
import { diaSaoPaulo } from "../utils/dataMetricas.js";
import { legadoEditorial } from "../utils/identidadeEditorial.js";

export const erroMetricas = (status, code, message) => Object.assign(new BaseError(message, status), { code });
export const indisponivel = () => erroMetricas(503, "COLETA_INDISPONIVEL", "Métricas temporariamente indisponíveis.");
export async function registrarVisualizacao({ patrimonioId, dia, chaveVisitante }) {
    if (!store.patrimonios.some(p => p.id === patrimonioId && p.status === "PUBLICADO" && !legadoEditorial(p))) throw erroMetricas(404, "NOT_FOUND", "Patrimônio indisponível.");
    if (!store.views.some(v => v.patrimonioId === patrimonioId && v.dia === dia && v.chaveVisitante === chaveVisitante)) store.views.push({ patrimonioId, dia, chaveVisitante });
}
export async function consultarMetricas(query, _db, agora = new Date()) {
    const q = consultaMetricasSchema.parse(query);
    if (q.fim > diaSaoPaulo(agora)) throw erroMetricas(400, "BAD_REQUEST", "Período futuro não permitido.");
    const rows = store.views.map(v => ({ ...v, p: store.patrimonios.find(p => p.id === v.patrimonioId) })).filter(v =>
        v.dia >= q.inicio && v.dia <= q.fim && (!q.patrimonioId || q.patrimonioId === v.p.id) &&
        (!q.regiaoId || q.regiaoId === v.p.regiaoId) && (!q.semRegiao || v.p.regiaoId === null));
    const bens = [...new Set(rows.map(v => v.p.id))].map(id => {
        const p = rows.find(v => v.p.id === id).p;
        return { id, nome: p.nome, slug: p.slug, status: p.status, quantidade: String(rows.filter(v => v.p.id === id).length) };
    }).sort((a, b) => Number(b.quantidade) - Number(a.quantidade) || a.id.localeCompare(b.id));
    const regional = [...store.regioes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const paginated = page(bens, q);
    return { disponivel: true, meta: { versaoRegra: 1, fuso: "America/Sao_Paulo", inicio: q.inicio, fim: q.fim, geradoEm: agora.toISOString(),
        unidade: "IDENTIDADE_PATRIMONIO_DIA", elegibilidade: "PUBLICADO_CANONICO_NA_ACEITACAO", regiaoReferencia: "CADASTRO_ATUAL", cobertura: "NAO_INSTRUMENTADA", granularidade: "dia",
        inicioColeta: null, inicioObservacao: null, inicioDisponivel: null,
        observacao: { tipo: "NAO_INSTRUMENTADA", inicioColeta: null, inicioObservacao: null, inicioDisponivel: null,
            ultimaRetencaoEm: null, porDia: [], resumo: { esperadas: 0, disponiveis: 0, desativadas: 0, falhas: 0, desconhecidas: 0 } } },
        visualizacoes: { totalRegistrado: String(rows.length), porPatrimonio: { itens: paginated.itens, paginacao: { pagina: q.pagina, limite: q.limite, total: bens.length } },
            porRegiao: regional.filter(r => rows.some(v => v.p.regiaoId === r.id)).map(({ id, nome, slug, ativo }) => ({ id, nome, slug, ativo, quantidade: String(rows.filter(v => v.p.regiaoId === id).length) })),
            semRegiao: String(rows.filter(v => v.p.regiaoId === null).length),
            serie: [...new Set(rows.map(v => v.dia))].sort().map(data => ({ data, quantidade: String(rows.filter(v => v.dia === data).length) })) }, favoritos: { disponivel: false } };
}
