import { z } from "zod";

export const regiaoSlugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const campos = {
    nome: z.string().trim().min(1).max(100),
    descricao: z.string().trim().min(1).max(2000).nullable().optional(),
    ativo: z.boolean().optional(),
};
export const createRegiaoSchema = z.strictObject({ ...campos, slug: regiaoSlugSchema });
// Slug é identidade pública estável, não editável.
export const updateRegiaoSchema = z.strictObject(campos).partial()
    .refine(data => Object.keys(data).length > 0, "Informe algum campo para atualizar.");
export const regiaoParamsSchema = z.strictObject({ id: z.uuid() });
export const listRegioesSchema = z.strictObject({
    busca: z.string().trim().min(1).max(100).optional(),
    ativo: z.enum(["true", "false"]).transform(value => value === "true").optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
});
