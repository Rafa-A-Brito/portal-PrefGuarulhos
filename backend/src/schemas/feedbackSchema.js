import { z } from "zod";
import { TIPOS_FEEDBACK, diaCivil, DIA, erroFeedback } from "../utils/feedback.js";

function textoValido(value) {
    return [...value].every(c => {
        const n = c.codePointAt(0);
        return (n >= 32 || n === 10 || n === 9) && !(n >= 127 && n <= 159) && !(n >= 0xd800 && n <= 0xdfff);
    });
}
export const feedbackSchema = z.strictObject({
    tipo: z.enum(TIPOS_FEEDBACK),
    mensagem: z.string().transform(s => s.replace(/\r\n/g, "\n").normalize("NFC").trim())
        .refine(s => [...s].length >= 1 && [...s].length <= 2000 && textoValido(s)),
    avisoVersao: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
});
export const chaveFeedbackSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)
    .refine(s => Buffer.from(s, "base64url").length === 32 && Buffer.from(s, "base64url").toString("base64url") === s);
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
    const d = new Date(s + "T12:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= "1900-01-01";
});
const positivo = max => z.string().regex(/^[1-9]\d{0,4}$/).transform(Number).pipe(z.number().int().max(max));
const filtros = { inicio: data, fim: data, tipo: z.enum(TIPOS_FEEDBACK).optional() };
export const listaFeedbackSchema = z.strictObject({ ...filtros, pagina: positivo(10000).default(1), limite: positivo(100).default(20) });
export const resumoFeedbackSchema = z.strictObject({ ...filtros, granularidade: z.enum(["dia", "mes"]).default("dia") });
export const idFeedbackSchema = z.strictObject({ id: z.uuid().transform(s => s.toLowerCase()) });
export const vazioFeedbackSchema = z.strictObject({});
export function validarPeriodo(q, agora = new Date()) {
    if (q.fim < q.inicio || q.fim > diaCivil(agora) || (Date.parse(q.fim) - Date.parse(q.inicio)) / DIA >= 366) {
        throw erroFeedback(400, "BAD_REQUEST", "Período inválido: use até 366 dias civis, sem datas futuras.");
    }
    return q;
}
// Não repassa issues do Zod: propriedades desconhecidas também são texto não confiável.
export function validarFeedback(schema, input) {
    const r = schema.safeParse(input);
    if (!r.success) throw erroFeedback(400, "BAD_REQUEST", "Dados de feedback inválidos.");
    return r.data;
}
