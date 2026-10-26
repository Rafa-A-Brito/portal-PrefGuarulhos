import { z } from "zod";
export const sessaoMetricasSchema = z.strictObject({});
export const visualizacaoSchema = z.strictObject({ patrimonioId: z.uuid().transform(v => v.toLowerCase()) });
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
    const d = new Date(v); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
});
export const consultaMetricasSchema = z.strictObject({
    inicio: data, fim: data,
    patrimonioId: z.uuid().optional(), regiaoId: z.uuid().optional(),
    semRegiao: z.literal("true").optional(),
    pagina: z.coerce.number().int().min(1).max(10000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
}).refine(v => v.inicio <= v.fim && (new Date(v.fim) - new Date(v.inicio)) / 86400000 < 366,
    { message: "Período inválido; máximo 366 dias." })
    .refine(v => !(v.regiaoId && v.semRegiao), { message: "Filtros regionais mutuamente exclusivos." });
