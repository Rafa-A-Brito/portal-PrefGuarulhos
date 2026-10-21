import jwt from "jsonwebtoken";
import { z } from "zod";
import env from "../config/env.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";

export function generateToken(userId, tokenVersion, sessionId, { now = Date.now(), expiresAt } = {}) {
    if (!Number.isSafeInteger(tokenVersion) || tokenVersion < 0 || tokenVersion > 2147483647) {
        throw new TypeError("Versão de autenticação inválida para emissão de token.");
    }
    if (!z.uuid().safeParse(sessionId).success) throw new TypeError("Sessão inválida para emissão de token.");
    const issued = Math.floor(now / 1000);
    const expires = Math.min(issued + env.JWT_TTL_SECONDS, expiresAt ? Math.floor(expiresAt.getTime() / 1000) : Infinity);
    return jwt.sign({ tokenVersion, sid: sessionId, iat: issued, exp: expires }, env.JWT_SECRET, {
        algorithm: "HS256",
        subject: userId,
    });
}

export function verifyToken(token, { allowExpired = false, now = Date.now() } = {}) {
    let payload;
    try {
        payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"], ignoreExpiration: allowExpired, clockTimestamp: Math.floor(now / 1000) });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError("Token inválido ou expirado.");
        }
        throw error;
    }

    if (!payload || typeof payload !== "object" || !z.uuid().safeParse(payload.sub).success || !z.uuid().safeParse(payload.sid).success || !Number.isInteger(payload.exp) ||
        !Number.isSafeInteger(payload.tokenVersion) || payload.tokenVersion < 0 || payload.tokenVersion > 2147483647) {
        throw new UnauthorizedError("Token inválido ou expirado.");
    }
    return payload;
}
