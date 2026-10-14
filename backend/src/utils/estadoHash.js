import { createHash } from "node:crypto";

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(
        Object.keys(value).sort().map(key => [key, canonical(value[key])]),
    );
    return value;
}

export function hashEstado(value) {
    // Date/Decimal seguem a representação JSON do contrato, sem coerção de IDs.
    return createHash("sha256").update(JSON.stringify(canonical(JSON.parse(JSON.stringify(value))))).digest("hex");
}

export function ordenarRelacoes(value) {
    if (Array.isArray(value)) return value.map(ordenarRelacoes).sort((a, b) => hashEstado(a).localeCompare(hashEstado(b)));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, ordenarRelacoes(v)]));
    return value;
}
