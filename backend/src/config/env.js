import "dotenv/config";
import { UPLOAD_DIR } from "./uploadDir.js";
import { z } from "zod";
import { isIP } from "node:net";

export function segredoJwtValido(value) {
    const normal = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return value.trim().length >= 32 && !/(substitua|placeholder|change.?me|replace.?me|your.?secret|seu.?segredo|segredo.?aleatorio|super.?secret|jwt.?secret|secret.?key)/.test(normal) &&
        !/^(.)\1+$/.test(value) && !normal.includes("0123456789") && !normal.includes("1234567890");
}

function proxiesValidos(value) {
    return !value || value.split(",").every(item => {
        const [ip, prefix, extra] = item.trim().split("/");
        const version = isIP(ip);
        return version && !extra && (prefix === undefined || (/^\d+$/.test(prefix) && Number(prefix) <= (version === 4 ? 32 : 128)));
    });
}

const result = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    CORS_ORIGIN: z.url().default("http://localhost:5173"),
    JWT_SECRET: z.string().min(32).refine(segredoJwtValido),
    TRUST_PROXY_IPS: z.string().trim().default("").refine(proxiesValidos),
    LOGIN_RATE_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(900000),
    LOGIN_RATE_IP_MAX: z.coerce.number().int().min(1).max(10000).default(100),
    LOGIN_RATE_ACCOUNT_IP_MAX: z.coerce.number().int().min(1).max(1000).default(10),
    JWT_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(300),
    AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(86400).default(28800),
    UPLOAD_ROOT: z.string().trim().min(1).default(UPLOAD_DIR),
    UPLOAD_MAX_IMAGE_BYTES: z.coerce.number().int().min(1).default(5 * 1024 * 1024),
    UPLOAD_MAX_DOCUMENT_BYTES: z.coerce.number().int().min(1).default(10 * 1024 * 1024),
}).safeParse(process.env);

if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Variáveis de ambiente inválidas: ${fields.join(", ")}.`);
}

export default { ...result.data, UPLOAD_DIR };
