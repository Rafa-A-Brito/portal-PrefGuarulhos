import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { erroFeedback } from "../utils/feedback.js";

export function redeFeedback(ip = "") {
    let value = ip.toLowerCase();
    if (value.startsWith("::ffff:") && isIP(value.slice(7)) === 4) return value.slice(7);
    if (isIP(value) === 4) return value;
    if (isIP(value) !== 6) return "unknown";
    if (value.includes(".")) {
        const pos = value.lastIndexOf(":"), n = value.slice(pos + 1).split(".").map(Number);
        value = value.slice(0, pos + 1) + ((n[0] << 8) + n[1]).toString(16) + ":" + ((n[2] << 8) + n[3]).toString(16);
    }
    const [left, right = ""] = value.split("::"), a = left ? left.split(":") : [], b = right ? right.split(":") : [];
    const parts = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b].map(v => parseInt(v, 16));
    if (parts.slice(0, 5).every(n => n === 0) && parts[5] === 65535) return [parts[6] >> 8, parts[6] & 255, parts[7] >> 8, parts[7] & 255].join(".");
    return parts.slice(0, 4).map(n => n.toString(16)).join(":");
}
export function criarLimiteFeedback({ now = Date.now, maxEntries = 10000 } = {}) {
    const entries = new Map(), segredo = randomBytes(32);
    let sweep = 0, global = { ate: 0, n: 0 };
    return (req, res, next) => {
        const time = now();
        if (time >= sweep) {
            for (const [key, e] of entries) if (e.ate <= time) entries.delete(key);
            sweep = time + 1000;
        }
        const negar = ate => {
            res.setHeader("Retry-After", String(Math.max(1, Math.ceil((ate - time) / 1000))));
            throw erroFeedback(429, "TOO_MANY_REQUESTS", "Aguarde antes de reenviar feedback.");
        };
        if (global.ate <= time) global = { ate: time + 60000, n: 0 };
        if (++global.n > 60) negar(global.ate);
        const key = createHmac("sha256", segredo).update(redeFeedback(req.ip)).digest("hex");
        let e = entries.get(key);
        if (!e || e.ate <= time) {
            if (!e && entries.size >= maxEntries) negar(time + 60000);
            e = { ate: time + 3600000, hora: 0, minuto: 0, minutoAte: time + 60000 }; entries.set(key, e);
        }
        if (e.minutoAte <= time) { e.minuto = 0; e.minutoAte = time + 60000; }
        e.hora++; e.minuto++;
        if (e.hora > 20) negar(e.ate);
        if (e.minuto > 5) negar(e.minutoAte);
        next();
    };
}
