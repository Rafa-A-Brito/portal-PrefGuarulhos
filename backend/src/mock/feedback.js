import { randomUUID } from "node:crypto";
import config from "../config/feedback.js";
import { store } from "./store.js";
import { chaveDigest, conteudoDigest, confirmarRecibo, validarNovo, desativado, erroFeedback,
    inicioDia, proximoDia, diaCivil, metaFeedback, montarResumo, DIA } from "../utils/feedback.js";
import { validarPeriodo } from "../schemas/feedbackSchema.js";

export function criarFeedbackMemoria({ dados = { feedback: [], recibosFeedback: new Map() }, configuracao = config, now = () => new Date() } = {}) {
    let fila = Promise.resolve();
    const demo = value => ({ ...value, demonstracao: true });
    const desabilitada = () => demo({ disponivel: false, motivo: "DESATIVADA" });
    const resumoItem = r => ({ id: r.id, tipo: r.tipo, createdAt: r.createdAt });
    function receber(body, chave) {
        const operacao = fila.then(() => {
            if (!configuracao.chaves.length) throw desativado();
            const agora = now(), digest = chaveDigest(chave), recibo = dados.recibosFeedback.get(digest);
            if (recibo) { const r = confirmarRecibo(recibo, body, configuracao, agora); return { ...r, data: demo(r.data) }; }
            validarNovo(body, configuracao);
            const conteudo = conteudoDigest(body, configuracao.atual, configuracao), id = randomUUID();
            dados.feedback.push({ id, ...body, createdAt: agora, expiraEm: new Date(+agora + 180 * DIA) });
            dados.recibosFeedback.set(digest, { conteudoDigest: conteudo, versaoChave: configuracao.atual,
                feedbackId: id, recebidoEm: agora, expiraEm: new Date(+agora + DIA) });
            return { status: 201, data: demo({ recebido: true, recebidoEm: agora.toISOString() }) };
        });
        fila = operacao.catch(() => {}); return operacao;
    }
    function recorte(q, agora) {
        validarPeriodo(q, agora);
        const inicio = inicioDia(q.inicio), fim = inicioDia(proximoDia(q.fim));
        return dados.feedback.filter(r => r.createdAt >= inicio && r.createdAt < fim && r.expiraEm > agora && (!q.tipo || r.tipo === q.tipo))
            .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    }
    async function listar(q) {
        if (!configuracao.consulta) return desabilitada();
        const agora = now(), rows = recorte(q, agora), total = rows.length;
        return demo({ disponivel: true, meta: metaFeedback(q, agora), itens: rows.slice((q.pagina - 1) * q.limite, q.pagina * q.limite).map(resumoItem),
            paginacao: { pagina: q.pagina, limite: q.limite, total, totalPaginas: Math.ceil(total / q.limite) } });
    }
    async function resumir(q) {
        if (!configuracao.consulta) return desabilitada();
        const agora = now(), tipos = new Map(), periodos = new Map();
        for (const r of recorte(q, agora)) {
            const periodo = diaCivil(r.createdAt).slice(0, q.granularidade === "mes" ? 7 : 10);
            tipos.set(r.tipo, (tipos.get(r.tipo) ?? 0n) + 1n); periodos.set(periodo, (periodos.get(periodo) ?? 0n) + 1n);
        }
        return demo(montarResumo(q, agora, tipos, periodos));
    }
    async function detalhar(id) {
        if (!configuracao.consulta) return desabilitada();
        const agora = now(), r = dados.feedback.find(r => r.id === id && r.expiraEm > agora);
        if (!r) throw erroFeedback(404, "NOT_FOUND", "Feedback não encontrado.");
        return demo({ disponivel: true, registro: { ...resumoItem(r), mensagem: r.mensagem, avisoVersao: r.avisoVersao, expiraEm: r.expiraEm } });
    }
    return { receber, listar, resumir, detalhar };
}
export const { receber, listar, resumir, detalhar } = criarFeedbackMemoria({ dados: store });
