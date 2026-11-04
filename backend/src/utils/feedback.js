import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import BaseError from "../errors/BaseError.js";

export const TIPOS_FEEDBACK = ["ELOGIO", "SUGESTAO", "PROBLEMA"];
export const DIA = 86400000;
export const FUSO = "America/Sao_Paulo";
const formato = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
export function diaCivil(agora) {
    const p = Object.fromEntries(formato.formatToParts(agora).map(p => [p.type, p.value]));
    return `${p.year}-${p.month}-${p.day}`;
}
export const proximoDia = dia => new Date(Date.parse(dia + "T12:00:00Z") + DIA).toISOString().slice(0, 10);
// Primeiro instante do dia civil, inclusive quando a meia-noite não existe (DST).
export function inicioDia(dia) {
    const centro = Date.parse(dia + "T12:00:00Z");
    let a = centro - 2 * DIA, b = centro + 2 * DIA;
    while (b - a > 1) {
        const meio = Math.floor((a + b) / 2);
        if (diaCivil(new Date(meio)) < dia) a = meio; else b = meio;
    }
    return new Date(b);
}
export function erroFeedback(status, code, message) {
    const e = new BaseError(message, status); e.code = code; return e;
}
export const desativado = () => erroFeedback(503, "FEEDBACK_DESATIVADO", "Recebimento de feedback desativado.");
export const indisponivel = () => erroFeedback(503, "FEEDBACK_INDISPONIVEL", "Não foi possível confirmar a operação de feedback.");
export const chaveDigest = chave => createHash("sha256").update(Buffer.from(chave, "base64url")).digest("hex");
export function conteudoDigest(body, versao, config) {
    const chave = config.chaves.find(c => c.id === versao);
    if (!chave) throw indisponivel();
    return createHmac("sha256", Buffer.from(chave.segredo, "hex"))
        .update(JSON.stringify([1, body.tipo, body.mensagem, body.avisoVersao])).digest("hex");
}
export function confirmarRecibo(recibo, body, config, agora) {
    if (recibo.expiraEm <= agora) throw erroFeedback(409, "ENVIO_EXPIRADO", "A janela de confirmação deste envio expirou.");
    const digest = conteudoDigest(body, recibo.versaoChave, config);
    if (!timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(recibo.conteudoDigest, "hex"))) {
        throw erroFeedback(409, "CHAVE_REUTILIZADA", "A chave já foi utilizada para outro conteúdo.");
    }
    return { status: 200, data: { recebido: true, recebidoEm: recibo.recebidoEm.toISOString() } };
}
export function validarNovo(body, config) {
    if (!config.recebimento) throw desativado();
    if (!config.avisos.includes(body.avisoVersao)) throw erroFeedback(409, "AVISO_DESATUALIZADO", "Revise o aviso de privacidade antes de enviar.");
}
export function metaFeedback(q, agora) {
    return { inicio: q.inicio, fim: q.fim, tipo: q.tipo ?? null, fuso: FUSO, geradoEm: agora.toISOString(),
        base: "REGISTROS_RETIDOS", unidade: "FEEDBACK_RECEBIDO", retencaoDias: 180,
        recorteLimitadoPorRetencao: inicioDia(q.inicio).getTime() < agora.getTime() - 180 * DIA,
        ...(q.granularidade && { granularidade: q.granularidade }) };
}
export function montarResumo(q, agora, tipos, periodos) {
    const hoje = diaCivil(agora), piso = diaCivil(new Date(agora.getTime() - 180 * DIA)), serie = new Map();
    for (let dia = q.inicio; dia <= q.fim; dia = proximoDia(dia)) {
        const periodo = q.granularidade === "mes" ? dia.slice(0, 7) : dia;
        const parcial = dia === hoje || dia === piso || (q.granularidade === "mes" &&
            ((dia === q.inicio && !dia.endsWith("-01")) || (dia === q.fim && proximoDia(dia).slice(0, 7) === periodo)));
        serie.set(periodo, { periodo, quantidade: String(periodos.get(periodo) ?? 0), parcial: parcial || serie.get(periodo)?.parcial || false });
    }
    const porTipo = TIPOS_FEEDBACK.map(tipo => ({ tipo, quantidade: String(tipos.get(tipo) ?? 0) }));
    return { disponivel: true, meta: metaFeedback(q, agora), total: porTipo.reduce((n, r) => n + BigInt(r.quantidade), 0n).toString(),
        porTipo, serie: [...serie.values()], notas: { disponivel: false } };
}
