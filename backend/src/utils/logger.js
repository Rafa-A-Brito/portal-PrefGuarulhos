import { AsyncLocalStorage } from "node:async_hooks";

export const requestContext = new AsyncLocalStorage();
const loggedErrors = new WeakSet();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeCodes = /^(P\d{4}|EACCES|EPERM|ENOENT|EEXIST|ENOSPC|EIO|ECONNREFUSED|ECONNRESET|ETIMEDOUT|INVALID_MEDIA_PATH|[0-9A-Z]{5})$/;
const errorTypes = new Set(["Error", "TypeError", "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError", "PrismaClientInitializationError", "PrismaClientValidationError", "DriverAdapterError"]);
const contextCodes = new Set(["reason", "operation", "entity", "action"]);
const idFields = new Set(["userId", "entityId", "patrimonioId", "midiaId"]);
const reasons = new Set(["credentials", "rate_limit", "authentication", "authorization", "refresh_reuse", "password_change"]);
const operations = new Set(["limpar_upload", "mover_quarentena", "restaurar_quarentena", "limpar_quarentena", "restaurar", "limpar_apos_commit", "criar_imagem", "criar_documento", "validacao_metadados"]);
// Writable pode sinalizar EPIPE de forma assíncrona, além de lançar em write().
for (const stream of [process.stdout, process.stderr]) stream.on("error", () => {});

// Lista positiva: nunca inclui message, stack, meta, SQL ou objetos de erro.
export function safeError(error) {
    return {
        errorType: errorTypes.has(error?.name) ? error.name : "Error",
        ...(typeof error?.code === "string" && safeCodes.test(error.code) && { errorCode: error.code }),
    };
}

// O sink é substituível nos testes; falhas de stdout/stderr não podem mudar o
// resultado do negócio ou esconder o erro original.
export const logOutput = {
    write(level, line) {
        const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
        stream.write(line, () => {});
    },
};

export function logEvent(level, event, context = {}, error) {
    try {
        const scope = requestContext.getStore();
        const req = scope?.req;
        const route = req?.route?.path;
        const data = {
            timestamp: new Date().toISOString(), level,
            event: /^[A-Z][A-Z0-9_]{0,79}$/.test(event) ? event : "LOG_EVENT",
            requestId: scope?.requestId ?? null,
            method: req?.method ?? null,
            route: (typeof route === "string" ? `${req.baseUrl || scope?.routeBase || ""}${route}` : scope?.routeBase ?? "").replace(/[^A-Za-z0-9_/:.*-]/g, "").slice(0, 240) || null,
            status: Number.isInteger(context.status) ? context.status : null,
        };
        const userId = scope?.userId;
        if (uuid.test(userId ?? "")) data.userId = userId;
        for (const [key, value] of Object.entries(context)) {
            if (idFields.has(key) && uuid.test(value ?? "")) data[key] = value;
            if (contextCodes.has(key) && typeof value === "string") {
                if (key === "reason" && reasons.has(value)) data[key] = value;
                if (key === "operation" && operations.has(value)) data[key] = value;
                if (["entity", "action"].includes(key) && /^[A-Za-z_]{1,100}$/.test(value)) data[key] = value;
            }
            if (["revokedCount", "retryAfter"].includes(key) && Number.isSafeInteger(value) && value >= 0) data[key] = value;
            if (key === "origem" && operations.has(value)) data[key] = value;
            if (key === "registroExcluido" && typeof value === "boolean") data[key] = value;
            if (key === "pasta" && ["imagens", "documentos", "patrimonios", "referencias", "exposicoes", "novidades"].includes(value)) data[key] = value;
            if (key === "armazenamento" && ["midia", "legado"].includes(value)) data[key] = value;
            // Somente nomes controlados de arquivos gerados pela API.
            if (["arquivo", "quarentena"].includes(key) && typeof value === "string" && /^[a-f0-9-]{36,110}\.[a-z0-9]{2,5}$/i.test(value)) data[key] = value;
        }
        if (error) Object.assign(data, safeError(error));
        const write = () => {
            try { logOutput.write(level, JSON.stringify(data) + "\n"); }
            catch { /* O sink não pode alterar uma operação confirmada ou seu erro. */ }
        };
        // Falhas secundárias de disco podem acompanhar um 400, 500 ou até um
        // commit bem-sucedido. Quando não há status explícito, aguarda a resposta.
        if (req?.res && data.status === null && !req.res.writableFinished) {
            const finish = () => {
                req.res.off("finish", finish); req.res.off("close", finish);
                data.status = req.res.headersSent ? req.res.statusCode : 499;
                write();
            };
            req.res.once("finish", finish); req.res.once("close", finish);
        } else write();
    } catch { /* Uma falha secundária de observabilidade não altera o negócio. */ }
}

export function identifyLogUser(userId) {
    const scope = requestContext.getStore();
    if (scope && uuid.test(userId ?? "")) scope.userId = userId;
}

export function rememberLogRoute(req) {
    const scope = requestContext.getStore();
    if (scope) scope.routeBase = req.baseUrl;
}

export function logFailure(level, event, context, error) {
    if (error && typeof error === "object") {
        if (loggedErrors.has(error)) return;
        loggedErrors.add(error);
    }
    logEvent(level, event, context, error);
}
