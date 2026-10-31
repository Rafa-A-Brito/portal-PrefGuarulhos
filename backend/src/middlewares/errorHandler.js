import { Prisma } from "../config/prismaTypes.js";
import { ZodError } from "zod";
import BaseError from "../errors/BaseError.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { logFailure } from "../utils/logger.js";

export default function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    if (error instanceof ZodError) {
        error = new BadRequestError("Dados inválidos.", error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        })));
    } else if (Prisma.PrismaClientKnownRequestError && error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            error = new ConflictError("Já existe um registro com os dados únicos informados.");
        } else if (error.code === "P2025") {
            error = new NotFoundError();
        }
    } else if (error?.type === "entity.parse.failed") {
        error = new BadRequestError("JSON inválido.");
    } else if (error?.type === "entity.too.large") {
        error = new BaseError("Corpo da requisição muito grande.", 413);
    }

    if (!(error instanceof BaseError)) {
        const databaseError = error?.name?.startsWith("Prisma") || /^(P\d{4}|ECONNREFUSED|ECONNRESET|ETIMEDOUT)$/.test(error?.code ?? "");
        logFailure("error", databaseError ? "DATABASE_OPERATION_FAILED" : "INTERNAL_ERROR", { status: 500 }, error);
        error = new BaseError();
    }

    const login = req.route?.path === "/login" && req.method === "POST";
    if ([401, 403].includes(error.statusCode) || (error.statusCode === 429 && login)) {
        const event = error.statusCode === 429 ? "LOGIN_RATE_LIMITED" : error.statusCode === 403 ? "AUTHORIZATION_DENIED" : login ? "LOGIN_REJECTED" : "AUTHENTICATION_DENIED";
        logFailure("warn", event, { status: error.statusCode, reason: error.statusCode === 429 ? "rate_limit" : error.statusCode === 403 ? "authorization" : login ? "credentials" : "authentication" }, error);
    }

    const codes = { 400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT" };
    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details,
        error: { code: error.code ?? codes[error.statusCode] ?? "INTERNAL_ERROR", message: error.message },
    });
}
