import { isDeepStrictEqual } from "node:util";
import { logFailure } from "./logger.js";

// Compatibilidade com REGIAO_CREATE/UPDATE e RegiaoPatrimonio já persistidos.
export const AUDIT_ENTITIES = Object.freeze({
    USER: "User", PATRIMONIO: "Patrimonio", IMAGEM: "PatrimonioImagem",
    DOCUMENTO: "PatrimonioDocumento", REGIAO: "RegiaoPatrimonio",
    FATO: "PatrimonioFato", LIGACAO: "PatrimonioLigacao", EXPOSICAO: "Exposicao", NOVIDADE: "Novidade",
});
export const AUDIT_ACTIONS = Object.freeze(Object.fromEntries([
    ...["USER", "PATRIMONIO", "IMAGEM", "DOCUMENTO", "REGIAO", "FATO", "LIGACAO", "EXPOSICAO", "NOVIDADE"]
        .flatMap(prefix => ["CREATE", "UPDATE", "DELETE"].map(verb => `${prefix}_${verb}`)),
    "USER_ACTIVATE", "USER_DEACTIVATE", "USER_PASSWORD_CHANGE", "PATRIMONIO_PUBLISH", "PATRIMONIO_ARCHIVE",
    "FATO_REORDER", "LIGACAO_REORDER", "EXPOSICAO_PUBLISH", "EXPOSICAO_ARCHIVE", "NOVIDADE_PUBLISH", "NOVIDADE_ARCHIVE",
].map(action => [action, action])));
const locationFields = ["endereco", "numero", "complemento", "bairro", "cidade", "uf", "cep", "latitude", "longitude"];
const urlFields = ["url", "imagemUrl", "ctaUrl", "ctaSaibaMais", "fonte"];
const fields = Object.freeze({
    User: ["name", "email", "role", "isActive"],
    RegiaoPatrimonio: ["nome", "slug", "descricao", "ativo"],
    Patrimonio: ["nome", "slug", "regiaoId", "numeroExibicao", "ordemExibicao", "descricao", "descricaoResumida", "historia", "importanciaCultural", "situacao", "status", "categoriaId", "categoriasAdicionais", "localizacao", "publicadoEm", "arquivadoEm"],
    PatrimonioImagem: ["patrimonioId", "titulo", "textoAlternativo", "credito", "fonte", "ordem", "principal", "url", "principais", "principaisSubstituidas"],
    PatrimonioDocumento: ["patrimonioId", "titulo", "descricao", "url", "tipo", "fonte", "dataDocumento", "mimeType"],
    PatrimonioFato: ["patrimonioId", "rotulo", "valor", "ordem", "itens"],
    PatrimonioLigacao: ["patrimonioOrigemId", "patrimonioDestinoId", "texto", "ordem", "itens"],
    Exposicao: ["slug", "titulo", "artista", "local", "periodo", "bio", "imagemUrl", "ctaSaibaMais", "status", "publicadoEm", "arquivadoEm"],
    Novidade: ["slug", "tipo", "tag", "data", "titulo", "resumo", "texto", "quando", "local", "imagemUrl", "blocoDia", "blocoMes", "blocoLegenda", "ctaRotulo", "ctaUrl", "fontes", "status", "publicadoEm", "arquivadoEm"],
});
function safeUrl(value) {
    if (value === null) return null;
    if (typeof value !== "string") return undefined;
    if (/^\/(?:api\/uploads|uploads|arquivos\/patrimonios|patrimonios|conheca-mais|mapa)(?:\/|$)/.test(value) && !value.includes("\\")) {
        const pathname = value.split(/[?#]/)[0];
        try { if (decodeURIComponent(pathname).split("/").some(part => [".", ".."].includes(part))) return undefined; }
        catch { return undefined; }
        return pathname;
    }
    try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) return undefined;
        url.username = ""; url.password = ""; url.search = ""; url.hash = "";
        return url.toString();
    } catch { return undefined; }
}
function scalar(value) {
    if (value === null || ["string", "boolean"].includes(typeof value)) return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value.toFixed === "function") return value.toFixed();
    return undefined;
}
function pick(source, allowed) {
    const result = {};
    for (const key of allowed) {
        if (!source || !Object.hasOwn(source, key) || source[key] === undefined) continue;
        const value = scalar(source[key]);
        if (value !== undefined) result[key] = value;
    }
    return result;
}
export function auditValues(entity, source) {
    if (!source) return {};
    const result = pick(source, fields[entity] ?? []);
    for (const key of urlFields) {
        if (!Object.hasOwn(result, key) || result[key] === null) continue;
        if (key === "fonte" && !/^[a-z][a-z\d+.-]*:|^\/|\\/i.test(result[key])) continue;
        const url = safeUrl(result[key]);
        if (url === undefined) delete result[key]; else result[key] = url;
    }
    if (entity === AUDIT_ENTITIES.PATRIMONIO) {
        if (Object.hasOwn(source, "localizacao")) result.localizacao = source.localizacao === null ? null : pick(source.localizacao, locationFields);
        if (Array.isArray(source.categoriasAdicionais)) result.categoriasAdicionais = source.categoriasAdicionais
            .map(item => typeof item === "string" ? item : item?.categoriaId ?? item?.categoria?.id ?? item?.id).filter(id => typeof id === "string").sort();
    }
    if ([AUDIT_ENTITIES.FATO, AUDIT_ENTITIES.LIGACAO].includes(entity) && Array.isArray(source.itens)) {
        result.itens = source.itens.map(item => pick(item, ["id", "ordem"])).sort((a, b) => a.id.localeCompare(b.id));
    }
    if (entity === AUDIT_ENTITIES.IMAGEM) for (const key of ["principais", "principaisSubstituidas"]) {
        if (Array.isArray(source[key])) result[key] = source[key].filter(id => typeof id === "string" && /^[a-f\d-]{36}$/i.test(id)).sort();
    }
    if (entity === AUDIT_ENTITIES.NOVIDADE && Array.isArray(source.fontes)) {
        result.fontes = source.fontes.map(item => {
            const fonte = pick(item, ["veiculo", "assunto"]);
            const url = safeUrl(item?.url);
            if (url !== undefined) fonte.url = url;
            return fonte;
        });
    }
    return result;
}

// Snapshot permitido em memória, antes da escrita. URLs originais servem apenas
// à comparação: uma mudança em query removida ainda precisa gerar ocorrência.
// registrarAuditoria sempre reaplica auditValues antes de persistir.
export function auditSnapshot(entity, source) {
    const snapshot = auditValues(entity, source);
    for (const key of urlFields) {
        if (fields[entity]?.includes(key) && Object.hasOwn(source ?? {}, key) && source[key] !== undefined) snapshot[key] = scalar(source[key]);
    }
    if (entity === AUDIT_ENTITIES.NOVIDADE && Array.isArray(source?.fontes)) snapshot.fontes = source.fontes.map(item => pick(item, ["veiculo", "assunto", "url"]));
    return snapshot;
}

function removeUnchanged(oldValues, newValues, rawOld, rawNew) {
    for (const key of new Set([...Object.keys(oldValues), ...Object.keys(newValues)])) {
        const old = oldValues[key], next = newValues[key];
        if (old && next && !Array.isArray(old) && !Array.isArray(next) && typeof old === "object" && typeof next === "object") {
            removeUnchanged(old, next, rawOld?.[key], rawNew?.[key]);
            if (!Object.keys(old).length && !Object.keys(next).length) { delete oldValues[key]; delete newValues[key]; }
        } else if (Object.hasOwn(oldValues, key) === Object.hasOwn(newValues, key) && isDeepStrictEqual(old, next) && isDeepStrictEqual(rawOld?.[key], rawNew?.[key])) {
            delete oldValues[key]; delete newValues[key];
        }
    }
}

export async function imagensPrincipais(tx, patrimonioId) {
    const rows = await tx.patrimonioImagem.findMany({ where: { patrimonioId, principal: true }, select: { id: true } });
    return rows.map(row => row.id).sort();
}

// Sanitização e diferenças compartilhadas pelas persistências real e em memória.
export function prepararValoresAuditoria(entity, before, after) {
    const oldValues = auditValues(entity, before), newValues = auditValues(entity, after);
    if (before && after) {
        const oldSnapshot = auditSnapshot(entity, before), newSnapshot = auditSnapshot(entity, after);
        if (isDeepStrictEqual(oldSnapshot, newSnapshot)) return null;
        removeUnchanged(oldValues, newValues, oldSnapshot, newSnapshot);
    }
    return { oldValues, newValues };
}

// Não abre transação e não absorve falhas: o chamador deve passar o client da
// transação da própria escrita. Erros do log operacional são isolados pelo logger.
export async function registrarAuditoria(tx, { userId, action, entity, entityId, before, after }) {
    if (!Object.hasOwn(AUDIT_ACTIONS, action) || !Object.values(AUDIT_ENTITIES).includes(entity)) throw new TypeError("Evento de auditoria inválido.");
    if (!userId || !entityId) throw new TypeError("Responsável e entidade são obrigatórios.");
    const values = prepararValoresAuditoria(entity, before, after);
    if (!values) return null;
    const { oldValues, newValues } = values;
    try {
        return await tx.auditLog.create({ data: {
            userId, action, entity, entityId,
            ...(Object.keys(oldValues).length && { oldValues }),
            ...(Object.keys(newValues).length && { newValues }),
        } });
    } catch (error) {
        logFailure("error", "AUDIT_WRITE_FAILED", { userId, action, entity, entityId, status: 500 }, error);
        throw error;
    }
}
