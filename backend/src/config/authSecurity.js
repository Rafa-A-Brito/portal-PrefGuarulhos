import { createHmac } from "node:crypto";
import { z } from "zod";
import env, { segredoJwtValido } from "./env.js";

const parsed = z.object({
    AUTH_SECURITY_SECRET: z.string().min(32).refine(segredoJwtValido).optional(),
    LOGIN_ACCOUNT_FAILURES: z.coerce.number().int().min(2).max(100).default(5),
    LOGIN_ACCOUNT_WAIT_SECONDS: z.coerce.number().int().min(1).max(900).default(30),
    LOGIN_ACCOUNT_MAX_WAIT_SECONDS: z.coerce.number().int().min(1).max(3600).default(900),
    LOGIN_ACCOUNT_TTL_SECONDS: z.coerce.number().int().min(3600).max(604800).default(86400),
    AUTH_ACCESS_RETENTION_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    AUTH_ALERT_COOLDOWN_SECONDS: z.coerce.number().int().min(60).max(604800).default(86400),
    AUTH_ALERT_ENABLED: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
    AUTH_ALERT_URL: z.url({ protocol: /^https$/ }).optional(),
    AUTH_ALERT_TOKEN: z.string().min(16).optional(),
    AUTH_LOCATION_URL: z.url({ protocol: /^https$/ }).optional(),
}).safeParse(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== "")));
if (!parsed.success) throw new Error("Configuração de segurança inválida: " + parsed.error.issues.map(i => i.path.join(".")).join(", "));
export const security = parsed.data;
if (security.LOGIN_ACCOUNT_MAX_WAIT_SECONDS < security.LOGIN_ACCOUNT_WAIT_SECONDS ||
    security.AUTH_ACCESS_RETENTION_DAYS * 86400 < security.AUTH_ALERT_COOLDOWN_SECONDS ||
    (security.AUTH_ALERT_ENABLED && (!security.AUTH_ALERT_URL || !security.AUTH_ALERT_TOKEN))) {
    throw new Error("Configuração de espera, retenção/cooldown ou provedor de alerta inválida.");
}
// Domínios separados; todas as instâncias devem usar o mesmo segredo estável.
export function securityDigest(domain, value) {
    return createHmac("sha256", security.AUTH_SECURITY_SECRET ?? env.JWT_SECRET)
        .update(domain + "\0" + value).digest("hex");
}
