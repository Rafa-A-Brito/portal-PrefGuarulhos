import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { diaSaoPaulo, fimDiaSaoPaulo } from "../utils/dataMetricas.js";

const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
function chaveDoDia(config, dia) {
    return config.chaves.filter(c => c.desde <= dia).at(-1);
}
function derivar(chave, dia, finalidade) {
    return hmac(Buffer.from(chave.segredo, "hex"), JSON.stringify(["portal-metricas", 1, finalidade, dia]));
}
export function lerCookieMetricas(header, config) {
    const encontrados = String(header ?? "").split(";").map(s => s.trim()).filter(s => s.startsWith(config.cookie + "="));
    return encontrados.length === 1 ? encontrados[0].slice(config.cookie.length + 1) : null;
}
export function validarCookieMetricas(token, config, agora = new Date()) {
    if (typeof token !== "string" || token.length > 220) return null;
    const match = /^(v1)\.([a-zA-Z0-9_-]{1,20})\.(\d{4}-\d{2}-\d{2})\.([A-Za-z0-9_-]{43})\.([a-f0-9]{64})$/.exec(token);
    if (!match || match[3] !== diaSaoPaulo(agora)) return null;
    const chave = chaveDoDia(config, match[3]);
    if (!chave || chave.id !== match[2]) return null;
    const assinatura = hmac(derivar(chave, match[3], "cookie"), token.slice(0, token.lastIndexOf(".")));
    if (!timingSafeEqual(assinatura, Buffer.from(match[5], "hex"))) return null;
    return { dia: match[3], nonce: match[4], chave };
}
export function emitirCookieMetricas(anterior, config, agora = new Date()) {
    const dia = diaSaoPaulo(agora), chave = chaveDoDia(config, dia);
    let token = anterior;
    if (!validarCookieMetricas(token, config, agora)) {
        const corpo = `v1.${chave.id}.${dia}.${randomBytes(32).toString("base64url")}`;
        token = corpo + "." + hmac(derivar(chave, dia, "cookie"), corpo).toString("hex");
    }
    return { token, dia, expiraEm: fimDiaSaoPaulo(agora) };
}
export function chaveVisualizacao(identidade, patrimonioId) {
    return hmac(derivar(identidade.chave, identidade.dia, "deduplicacao"),
        JSON.stringify([identidade.nonce, patrimonioId.toLowerCase()])).toString("hex");
}
export function opcoesCookie(config, expiraEm) {
    return { httpOnly: true, secure: config.seguro, sameSite: "lax", path: "/", ...(expiraEm && { expires: expiraEm }) };
}
