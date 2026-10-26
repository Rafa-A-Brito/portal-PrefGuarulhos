import { createHmac, randomBytes } from "node:crypto";
import { erroMetricas } from "../services/metricasService.js";

function rede(ip = "unknown") {
    if (ip.startsWith("::ffff:") && ip.includes(".")) return ip.slice(7);
    if (!ip.includes(":")) return ip;
    const [left, right = ""] = ip.split("::"), a = left ? left.split(":") : [], b = right ? right.split(":") : [];
    return [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b]
        .slice(0, 4).map(v => parseInt(v, 16).toString(16)).join(":");
}
export function criarLimiteMetricas({ now = Date.now, maxEntries = 10000 } = {}) {
    const entries = new Map();
    let segredo = randomBytes(32), rotacao = now(), sweep = 0;
    return (req, res, next) => {
        const time = now();
        if (time - rotacao >= 3600000) { segredo = randomBytes(32); entries.clear(); rotacao = time; }
        if (time >= sweep) {
            for (const [key, entry] of entries) if (entry.until <= time) entries.delete(key);
            sweep = time + 1000;
        }
        const sessao = req.path.endsWith("/sessao");
        const quotas = [["rede", rede(req.ip), 300, 60000]];
        if (sessao) quotas.push(["emissao", rede(req.ip), 10, 3600000]);
        else if (req.metricasToken) quotas.push(["cookie", req.metricasToken, 30, 60000]);
        for (const [tipo, valor, max, janela] of quotas) {
            const key = createHmac("sha256", segredo).update(tipo + "\0" + valor).digest("hex");
            let e = entries.get(key);
            if (e && e.until <= time) { entries.delete(key); e = undefined; }
            if (!e && entries.size >= maxEntries) e = { count: max, until: time + janela };
            else if (!e) { e = { count: 0, until: time + janela }; entries.set(key, e); }
            if (++e.count > max) {
                res.setHeader("Retry-After", Math.max(1, Math.ceil((e.until - time) / 1000)));
                throw erroMetricas(429, "TOO_MANY_REQUESTS", "Aguarde antes de enviar novas métricas.");
            }
        }
        next();
    };
}
