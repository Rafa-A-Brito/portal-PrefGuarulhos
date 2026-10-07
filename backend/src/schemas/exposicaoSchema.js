import { z } from "zod";
import { texto, urlHttp, statusSchema, listConteudoQuerySchema } from "./conteudoSchema.js";
export { conteudoIdParamsSchema, statusConteudoSchema } from "./conteudoSchema.js";

export const createExposicaoSchema = z.strictObject({
    titulo: texto(200),
    artista: texto(200),
    local: texto(250),
    periodo: texto(200),
    bio: texto(),
    ctaSaibaMais: z.union([urlHttp, z.literal("")]).nullable().optional(),
    status: statusSchema.optional(),
});
export const updateExposicaoSchema = createExposicaoSchema.partial();
export const listExposicoesQuerySchema = listConteudoQuerySchema;
export const adminListExposicoesQuerySchema = listConteudoQuerySchema.extend({ status: statusSchema.optional() });
