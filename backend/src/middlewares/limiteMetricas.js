import { createHmac, randomBytes } from "node:crypto";
import { metricas } from "../services/index.js";
const { erroMetricas } = metricas;

function rede(ip = "unknown") {
    if (ip.startsWith("::ffff:") && ip.includes(".")) return ip.slice(7);
    if (!ip.includes(":")) return ip;
    const [left, right = ""] = ip.split("::"), a = left ? left.split(":") : [], b = right ? right.split(":") : [];
    return [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b]
        .slice(0, 4).map(v => parseInt(v, 16).toString(16)).join(":");
}
export function criarLimiteMetricas({ now = Date.now, maxEntries = 10000 } = {}) {
    const entries = new Map();
    // Segredo efêmero por processo; buckets expiram sem zerar quotas na virada da hora.
    const segredo = randomBytes(32);
    let sweep = 0;
    return (req, res, next) => {
        const time = now();
        if (time >= sweep) {
            for (const [key, entry] of entries) if (entry.until <= time) entries.delete(key);
            sweep = time + 1000;
        }
        const sessao = req.path.endsWith("/sessao");
        const quotas = [["rede", rede(req.ip), 600, 60000]];
        // Só assinatura/dia validados pelo servidor permitem reutilização.
        if (sessao && !req.metricasIdentidade) {
            quotas.push(["emissao_hora", rede(req.ip), 120, 3600000], ["emissao_minuto", rede(req.ip), 60, 60000]);
        }
        if (req.metricasIdentidade) quotas.push(["cookie", req.metricasToken, 30, 60000]);
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
