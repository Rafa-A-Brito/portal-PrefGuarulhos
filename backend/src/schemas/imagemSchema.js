import { z } from "zod";

export const imagemParamsSchema = z.strictObject({ imagemId: z.uuid() });
export const updateImagemSchema = z.strictObject({
    titulo: z.string().trim().max(200).nullable().optional(),
    textoAlternativo: z.string().trim().min(1).max(300).optional(),
    credito: z.string().trim().max(200).nullable().optional(),
    fonte: z.string().trim().max(500).nullable().optional(),
    ordem: z.number().int().min(0).max(2147483647).optional(),
    principal: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, "Informe algum metadado para atualizar.");
