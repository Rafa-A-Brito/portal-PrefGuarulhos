import { z } from "zod";

export const passwordSchema = z.string().refine(
    (value) => Array.from(value).length >= 12,
    "A senha deve ter pelo menos 12 caracteres."
).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "A senha deve ter no máximo 72 bytes em UTF-8."
);

const adminFields = z.strictObject({
    nome: z.string().trim().min(1, "Informe o nome.").max(100),
    email: z.string().trim().pipe(z.email("Informe um e-mail válido.").max(254))
        .transform((email) => email.toLowerCase()),
    role: z.enum(["ADMIN", "EDITOR"]),
});

export const createAdminSchema = adminFields.extend({ password: passwordSchema });
export const updateAdminSchema = adminFields.partial()
    .refine((data) => Object.values(data).some((value) => value !== undefined), "Informe algum campo para atualizar.");
export const adminIdParamsSchema = z.strictObject({ id: z.uuid() });
export const adminStatusSchema = z.strictObject({ ativo: z.boolean() });
export const listAdminsQuerySchema = z.strictObject({
    busca: z.string().trim().min(1).max(254).optional(),
    role: z.enum(["ADMIN", "EDITOR"]).optional(),
    ativo: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
});