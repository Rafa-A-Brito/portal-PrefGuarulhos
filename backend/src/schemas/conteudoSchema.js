import { z } from "zod";
import { StatusPublicacao } from "@prisma/client";

export const texto = (max = 20000) => z.string().trim().min(1).max(max);
export const textoOpcional = (max = 20000) => z.string().trim().max(max).nullable().optional();
export const urlHttp = z.url().refine((value) => /^https?:\/\//i.test(value), "Use uma URL HTTP ou HTTPS.");
export const statusSchema = z.enum(Object.values(StatusPublicacao));
export const conteudoIdParamsSchema = z.strictObject({ id: z.uuid() });
export const statusConteudoSchema = z.strictObject({}).optional();
export const listConteudoQuerySchema = z.strictObject({
    busca: texto(200).optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
});

// Multipart transporta os objetos como JSON; o mesmo schema aceita JSON nativo.
export const jsonMultipart = (schema) => z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return value; }
}, schema);
