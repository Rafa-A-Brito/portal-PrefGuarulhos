import prisma from "../config/prisma.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import { verifyToken } from "../utils/token.js";
import { identifyLogUser, rememberLogRoute } from "../utils/logger.js";

export default async function authenticate(req, _res, next) {
    rememberLogRoute(req);
    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match) throw new UnauthorizedError();

    // Só emitir ACCESS_TOKEN_EXPIRED depois de validar assinatura e sessão.
    // Nenhum handler de negócio ou multipart executa antes desta decisão.
    const payload = verifyToken(match[1], { allowExpired: true });
    // A consulta fica fora do tratamento de erros do JWT.
    const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, role: true, isActive: true, tokenVersion: true,
            authSessions: { where: { id: payload.sid }, select: { tokenVersion: true, expiresAt: true, revokedAt: true } } },
    });

    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedError("Usuário indisponível.");
    }

    const session = user.authSessions?.[0];
    if (!session || session.revokedAt || session.tokenVersion !== user.tokenVersion || session.expiresAt <= new Date()) {
        throw new UnauthorizedError("Sessão encerrada. Entre novamente.");
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
        const error = new UnauthorizedError("Token de acesso expirado.");
        error.code = "ACCESS_TOKEN_EXPIRED";
        throw error;
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, tokenVersion: user.tokenVersion };
    identifyLogUser(user.id);
    next();
}
