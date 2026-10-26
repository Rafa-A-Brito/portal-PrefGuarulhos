import "dotenv/config";
import { diaSaoPaulo } from "../utils/dataMetricas.js";

// Configuração independente: desligada não exige nem interpreta segredos V2.
export function configurarMetricas(env = process.env, agora = new Date()) {
    for (const key of ["METRICAS_COLETA_ATIVA", "METRICAS_CONSULTA_ATIVA"]) {
        if (env[key] !== undefined && !["true", "false"].includes(env[key])) throw new Error(`Configuração inválida: ${key}`);
    }
    const config = { coleta: env.METRICAS_COLETA_ATIVA === "true", consulta: env.METRICAS_CONSULTA_ATIVA === "true" };
    if (!config.coleta) return Object.freeze(config);
    try {
        const origem = new URL(env.METRICAS_ORIGEM);
        const local = env.METRICAS_COOKIE_MODO === "http-local";
        if (origem.origin !== env.METRICAS_ORIGEM || origem.username || origem.password) throw new Error();
        if (local ? (env.NODE_ENV === "production" || origem.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(origem.hostname))
            : (env.METRICAS_COOKIE_MODO !== "https" || origem.protocol !== "https:")) throw new Error();
        const chaves = JSON.parse(env.METRICAS_CHAVES_JSON);
        if (!Array.isArray(chaves) || chaves.length < 1 || chaves.length > 4) throw new Error();
        const ids = new Set(), datas = new Set();
        for (const c of chaves) {
            if (Object.keys(c).sort().join() !== "desde,id,segredo" || !/^[a-zA-Z0-9_-]{1,20}$/.test(c.id) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(c.desde) || new Date(c.desde).toISOString().slice(0, 10) !== c.desde ||
                !/^[a-f0-9]{64}$/.test(c.segredo) || new Set(c.segredo).size < 8 || c.segredo === env.JWT_SECRET ||
                ids.has(c.id) || datas.has(c.desde)) throw new Error();
            ids.add(c.id); datas.add(c.desde);
        }
        if (!chaves.some(c => c.desde <= diaSaoPaulo(agora))) throw new Error();
        return Object.freeze({ ...config, origem: origem.origin, seguro: !local,
            cookie: local ? "portal_metricas_local" : "__Host-portal_metricas",
            chaves: Object.freeze(chaves.map(c => Object.freeze({ ...c })).sort((a, b) => a.desde.localeCompare(b.desde))) });
    } catch {
        // Nunca incluir conteúdo de env/segredos no erro de inicialização.
        throw new Error("Configuração V2 inválida: confira METRICAS_ORIGEM, METRICAS_COOKIE_MODO e METRICAS_CHAVES_JSON.");
    }
}

export default configurarMetricas();
