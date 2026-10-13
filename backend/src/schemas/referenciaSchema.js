import { z } from "zod";

export const referenciaParamsSchema = z.strictObject({ id: z.uuid(), referenciaId: z.uuid() });
export const referenciaBodySchema = z.strictObject({
    url: z.string().trim().max(4000).refine(value => {
        try { return ["http:", "https:"].includes(new URL(value).protocol); }
        catch { return false; }
    }, "Informe um link http:// ou https:// válido.").optional(),
    descricao: z.string().trim().max(300).optional(),
});
