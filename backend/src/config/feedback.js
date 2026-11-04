import "dotenv/config";
import { randomBytes } from "node:crypto";
import { MOCK_DATA } from "./runtime.js";

export function configurarFeedback(env = process.env) {
    try {
        for (const key of ["FEEDBACK_RECEBIMENTO_ATIVO", "FEEDBACK_CONSULTA_ATIVA"]) {
            if (env[key] !== undefined && !["true", "false"].includes(env[key])) throw new Error();
        }
        const config = { recebimento: env.FEEDBACK_RECEBIMENTO_ATIVO === "true", consulta: env.FEEDBACK_CONSULTA_ATIVA === "true",
            origem: null, seguro: true, chaves: [], atual: null, avisos: [] };
        // Sem configuração de ingestão, nem mesmo recibos são consultados.
        if (!config.recebimento && !env.FEEDBACK_CHAVES_JSON) return Object.freeze(config);
        const origem = new URL(env.FEEDBACK_ORIGEM);
        const local = env.FEEDBACK_TRANSPORTE === "http-local";
        if (origem.origin !== env.FEEDBACK_ORIGEM || origem.username || origem.password ||
            (local ? env.NODE_ENV === "production" || origem.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origem.hostname)
                : env.FEEDBACK_TRANSPORTE !== "https" || origem.protocol !== "https:")) throw new Error();
        const chaves = JSON.parse(env.FEEDBACK_CHAVES_JSON);
        if (!Array.isArray(chaves) || chaves.length < 1 || chaves.length > 4) throw new Error();
        const ids = new Set(), segredos = new Set();
        for (const c of chaves) {
            if (!c || Object.keys(c).sort().join() !== "id,segredo" || !/^[A-Za-z0-9_-]{1,40}$/.test(c.id) ||
                !/^[a-f0-9]{64}$/.test(c.segredo) || new Set(c.segredo).size < 8 ||
                c.segredo === env.JWT_SECRET || env.METRICAS_CHAVES_JSON?.includes(c.segredo) || ids.has(c.id) || segredos.has(c.segredo)) throw new Error();
            ids.add(c.id); segredos.add(c.segredo);
        }
        if (!ids.has(env.FEEDBACK_CHAVE_ATUAL)) throw new Error();
        const avisos = (env.FEEDBACK_AVISOS_ACEITOS ?? "").split(",");
        if (avisos.some(v => !/^[A-Za-z0-9_-]{1,40}$/.test(v))) throw new Error();
        return Object.freeze({ ...config, origem: origem.origin, seguro: !local, atual: env.FEEDBACK_CHAVE_ATUAL,
            chaves: Object.freeze(chaves.map(c => Object.freeze(c))), avisos: Object.freeze(avisos) });
    } catch {
        throw new Error("Configuração Feedback inválida: confira flags, origem, transporte, avisos e chaves próprias.");
    }
}

// Demo mantém flags explícitas; seus segredos nunca vêm da configuração real.
export default configurarFeedback(MOCK_DATA ? { ...process.env,
    FEEDBACK_ORIGEM: process.env.CORS_ORIGIN ?? "http://localhost:5173", FEEDBACK_TRANSPORTE: "http-local",
    FEEDBACK_CHAVE_ATUAL: "demo", FEEDBACK_AVISOS_ACEITOS: "feedback-v1",
    FEEDBACK_CHAVES_JSON: JSON.stringify([{ id: "demo", segredo: randomBytes(32).toString("hex") }]),
} : process.env);
