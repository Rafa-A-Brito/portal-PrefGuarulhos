import { createHash } from "node:crypto";
import BaseError from "../errors/BaseError.js";
import env from "../config/env.js";
import { rememberLogRoute, logFailure } from "../utils/logger.js";

function ipKey(ip = "unknown") {
    if (ip.startsWith("::ffff:") && ip.includes(".")) return ip.slice(7);
    if (!ip.includes(":")) return ip;
    // Agrupa IPv6 por /64 para impedir rotação trivial de endereços do cliente.
    const [left, right = ""] = ip.split("::");
    const a = left ? left.split(":") : [], b = right ? right.split(":") : [];
    return [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b]
        .slice(0, 4).map(part => Number.parseInt(part, 16).toString(16)).join(":");
}

export function criarLimitadorLogin({ windowMs = env.LOGIN_RATE_WINDOW_MS,
    ipMax = env.LOGIN_RATE_IP_MAX, accountMax = env.LOGIN_RATE_ACCOUNT_IP_MAX,
    now = Date.now, maxEntries = 10000 } = {}) {
    const ips = new Map(), accounts = new Map();
    let nextSweep = 0;
    return (req, res, next) => {
        rememberLogRoute(req);
        const time = now();
        if (time >= nextSweep) {
            for (const map of [ips, accounts]) for (const [key, entry] of map) if (entry.until <= time) map.delete(key);
            nextSweep = time + Math.min(windowMs, 60000);
        }
        const ip = ipKey(req.ip);
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const account = createHash("sha256").update(ip + "\0" + email).digest("hex");
        let retry = 0;
        for (const [map, key, max] of [[ips, ip, ipMax], [accounts, account, accountMax]]) {
            let entry = map.get(key);
            if (entry?.until <= time) { map.delete(key); entry = undefined; }
            if (!entry && map.size >= maxEntries) { retry = Math.max(retry, windowMs); continue; }
            if (!entry) { entry = { count: 0, until: time + windowMs }; map.set(key, entry); }
            if (++entry.count > max) retry = Math.max(retry, entry.until - time);
        }
        if (!retry) return next();
        res.setHeader("Retry-After", Math.max(1, Math.ceil(retry / 1000)));
        res.setHeader("Cache-Control", "no-store");
        const error = new BaseError("Muitas tentativas de login. Aguarde e tente novamente.", 429);
        error.code = "TOO_MANY_REQUESTS";
        logFailure("warn", req.route?.path === "/refresh" ? "AUTH_RATE_LIMITED" : "LOGIN_RATE_LIMITED", {
            status: 429, reason: "rate_limit", retryAfter: Math.max(1, Math.ceil(retry / 1000)),
        }, error);
        next(error);
    };
}

export default criarLimitadorLogin();
