import { z } from "zod";

export const referenciaParamsSchema = z.strictObject({ id: z.uuid(), referenciaId: z.uuid() });
export const referenciaBodySchema = z.strictObject({
    url: z.string().trim().max(4000).refine(value => {
        try { return ["http:", "https:"].includes(new URL(value).protocol); }
        catch { return false; }
    }, "Informe um link http:// ou https:// válido.").optional(),
    descricao: z.string().trim().max(300).optional(),
});

// URL, tipo, mimeType e patrimônio são identidade/conteúdo, não metadados.
export const updateReferenciaSchema = z.strictObject({
    titulo: z.string().trim().min(1).max(200).optional(),
    descricao: z.string().trim().max(300).nullable().optional(),
    fonte: z.string().trim().max(500).nullable().optional(),
    dataDocumento: z.union([z.iso.date().pipe(z.coerce.date()), z.date()]).nullable().optional(),
}).refine(data => Object.keys(data).length > 0, "Informe algum metadado para atualizar.");
