import { createHash, randomBytes, randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";
import env from "../config/env.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import BadRequestError from "../errors/BadRequestError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateToken } from "../utils/token.js";

const DUMMY_HASH = "$2b$12$Z/juidp1FLKNPXCpp9Zf9exflW34B7DM3r1JJgR/YeID/BuxgwhGG";
const hash = value => createHash("sha256").update(value).digest("hex");
const opaque = () => randomBytes(32).toString("base64url");
const validRefresh = value => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
const denied = () => new UnauthorizedError("Sessão inválida ou encerrada. Entre novamente.");
async function lockUser(tx, id) { await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`; }
function credentials(user, session, refreshToken, now) {
    return { token: generateToken(user.id, user.tokenVersion, session.id, { now, expiresAt: session.expiresAt }),
        refreshToken, sessionExpiresAt: session.expiresAt.toISOString(),
        user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function login({ email, password }, { now = Date.now } = {}) {
    const candidate = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, candidate?.isActive ? candidate.passwordHash : DUMMY_HASH);
    if (!candidate || !candidate.isActive || !valid) throw new UnauthorizedError("E-mail ou senha incorretos.");
    return prisma.$transaction(async tx => {
        await lockUser(tx, candidate.id);
        const user = await tx.user.findUnique({ where: { id: candidate.id } });
        if (!user?.isActive || user.passwordHash !== candidate.passwordHash || user.tokenVersion !== candidate.tokenVersion) throw denied();
        const time = now(), refreshToken = opaque();
        const session = await tx.authSession.create({ data: { id: randomUUID(), userId: user.id,
            tokenVersion: user.tokenVersion, createdAt: new Date(time), expiresAt: new Date(time + env.AUTH_SESSION_TTL_SECONDS * 1000),
            refreshTokens: { create: { tokenHash: hash(refreshToken), createdAt: new Date(time) } } } });
        return credentials(user, session, refreshToken, time);
    });
}

export async function refresh(refreshToken, { now = Date.now } = {}) {
    if (!validRefresh(refreshToken)) throw denied();
    const tokenHash = hash(refreshToken);
    const candidate = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { session: true } });
    if (!candidate) throw denied();
    const result = await prisma.$transaction(async tx => {
        await lockUser(tx, candidate.session.userId);
        const stored = await tx.refreshToken.findUnique({ where: { tokenHash }, include: { session: true } });
        if (!stored) return null;
        const session = stored.session, time = now();
        if (stored.usedAt) {
            // Não lançar dentro da transação: a revogação deve ser confirmada.
            await tx.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date(time) } });
            return null;
        }
        const user = await tx.user.findUnique({ where: { id: session.userId } });
        if (!user?.isActive || session.revokedAt || session.expiresAt.getTime() <= time || session.tokenVersion !== user.tokenVersion) return null;
        const nextToken = opaque();
        const consumed = await tx.refreshToken.updateMany({ where: { id: stored.id, usedAt: null }, data: { usedAt: new Date(time) } });
        if (consumed.count !== 1) return null;
        await tx.refreshToken.create({ data: { sessionId: session.id, tokenHash: hash(nextToken), createdAt: new Date(time) } });
        return credentials(user, session, nextToken, time);
    });
    if (!result) throw denied();
    return result;
}

export async function logout(refreshToken, { now = Date.now } = {}) {
    if (!validRefresh(refreshToken)) return;
    const candidate = await prisma.refreshToken.findUnique({ where: { tokenHash: hash(refreshToken) }, include: { session: true } });
    if (!candidate) return;
    await prisma.$transaction(async tx => {
        await lockUser(tx, candidate.session.userId);
        await tx.authSession.updateMany({ where: { id: candidate.sessionId, revokedAt: null }, data: { revokedAt: new Date(now()) } });
    });
}

export async function changePassword(userId, { senhaAtual, novaSenha }) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true, passwordHash: true, tokenVersion: true } });
    if (!user || !user.isActive) throw new UnauthorizedError("Usuário indisponível.");
    if (!(await verifyPassword(senhaAtual, user.passwordHash))) throw new BadRequestError("Senha atual incorreta.");
    if (senhaAtual === novaSenha) throw new BadRequestError("A nova senha deve ser diferente da atual.");
    const passwordHash = await hashPassword(novaSenha);
    await prisma.$transaction(async tx => {
        await lockUser(tx, userId);
        const result = await tx.user.updateMany({ where: { id: userId, isActive: true, passwordHash: user.passwordHash, tokenVersion: user.tokenVersion },
            data: { passwordHash, tokenVersion: { increment: 1 } } });
        if (result.count !== 1) throw new BadRequestError("Senha atual incorreta ou conta indisponível.");
        await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
}
