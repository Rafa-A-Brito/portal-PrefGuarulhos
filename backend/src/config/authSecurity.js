import { createHmac } from "node:crypto";
import { z } from "zod";
import env, { segredoJwtValido } from "./env.js";

const parsed = z.object({
    AUTH_SECURITY_SECRET: z.string().min(32).refine(segredoJwtValido).optional(),
    LOGIN_ACCOUNT_FAILURES: z.coerce.number().int().min(2).max(100).default(5),
    LOGIN_ACCOUNT_WAIT_SECONDS: z.coerce.number().int().min(1).max(900).default(30),
    LOGIN_ACCOUNT_MAX_WAIT_SECONDS: z.coerce.number().int().min(1).max(3600).default(900),
    LOGIN_ACCOUNT_TTL_SECONDS: z.coerce.number().int().min(3600).max(604800).default(86400),
}).safeParse(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== "")));
if (!parsed.success) throw new Error("Configuração de segurança inválida: " + parsed.error.issues.map(i => i.path.join(".")).join(", "));
export const security = parsed.data;
if (security.LOGIN_ACCOUNT_MAX_WAIT_SECONDS < security.LOGIN_ACCOUNT_WAIT_SECONDS) {
    throw new Error("Teto de espera menor que a espera inicial.");
}
// Domínios separados; todas as instâncias devem usar o mesmo segredo estável.
export function securityDigest(domain, value) {
    return createHmac("sha256", security.AUTH_SECURITY_SECRET ?? env.JWT_SECRET)
        .update(domain + "\0" + value).digest("hex");
}
