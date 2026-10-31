import { createHash, randomBytes, randomUUID } from "node:crypto";
import env from "../config/env.js";
import { store } from "./store.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateToken } from "../utils/token.js";
import { logEvent } from "../utils/logger.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import { audit, clone, page, find, contains, byName } from "./helpers.js";

const hash = value => createHash("sha256").update(value).digest("hex");
const denied = () => new UnauthorizedError("Sessão inválida ou encerrada. Entre novamente.");
function credentials(user, session, time) {
    const refreshToken = randomBytes(32).toString("base64url");
    store.refreshTokens.push({ tokenHash: hash(refreshToken), sessionId: session.id, usedAt: null });
    return { token: generateToken(user.id, user.tokenVersion, session.id, { now: time, expiresAt: session.expiresAt }),
        refreshToken, sessionExpiresAt: session.expiresAt.toISOString(), user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
const lookup = token => typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token)
    ? store.refreshTokens.find(row => row.tokenHash === hash(token)) : undefined;
export async function login({ email, password }, { now = Date.now } = {}) {
    const user = store.users.find(user => user.email === email);
    const valid = await verifyPassword(password, user?.isActive ? user.passwordHash : store.users[0].passwordHash);
    if (!user?.isActive || !valid) throw new UnauthorizedError("E-mail ou senha incorretos.");
    const time = now(), session = { id: randomUUID(), userId: user.id, tokenVersion: user.tokenVersion,
        expiresAt: new Date(time + env.AUTH_SESSION_TTL_SECONDS * 1000), revokedAt: null };
    store.sessions.push(session);
    logEvent("info", "LOGIN_SUCCEEDED", { status: 200, userId: user.id });
    return credentials(user, session, time);
}
export async function refresh(token, { now = Date.now } = {}) {
    const stored = lookup(token), session = store.sessions.find(row => row.id === stored?.sessionId);
    if (!stored || !session) throw denied();
    const time = now();
    if (stored.usedAt) {
        session.revokedAt = new Date(time);
        logEvent("warn", "REFRESH_TOKEN_REUSED", { status: 401, userId: session.userId });
        throw denied();
    }
    const user = store.users.find(row => row.id === session.userId);
    if (!user?.isActive || session.revokedAt || session.expiresAt.getTime() <= time || session.tokenVersion !== user.tokenVersion) throw denied();
    stored.usedAt = new Date(time);
    return credentials(user, session, time);
}
export async function logout(token) {
    const stored = lookup(token), session = store.sessions.find(row => row.id === stored?.sessionId);
    if (session && !session.revokedAt) {
        session.revokedAt = new Date();
        logEvent("info", "LOGOUT_SESSION_REVOKED", { status: 200, userId: session.userId });
    }
}
export async function changePassword(id, { senhaAtual, novaSenha }) {
    const user = find(store.users, id);
    if (!user.isActive) throw new UnauthorizedError("Usuário indisponível.");
    if (!await verifyPassword(senhaAtual, user.passwordHash)) throw new BadRequestError("Senha atual incorreta.");
    if (senhaAtual === novaSenha) throw new BadRequestError("A nova senha deve ser diferente da atual.");
    user.passwordHash = await hashPassword(novaSenha);
    user.tokenVersion++;
    for (const session of store.sessions.filter(s => s.userId === id)) session.revokedAt = new Date();
    audit(user, "USER_PASSWORD_CHANGE", "User", id);
}
export async function getAuthenticationUser(id, sessionId) {
    const user = store.users.find(row => row.id === id);
    if (!user) return null;
    const { name, email, role, isActive, tokenVersion } = user;
    return { id, name, email, role, isActive, tokenVersion,
        authSessions: clone(store.sessions.filter(s => s.userId === id && s.id === sessionId)) };
}

const dto = u => ({ id: u.id, nome: u.name, email: u.email, role: u.role, ativo: u.isActive, criadoEm: u.createdAt, atualizadoEm: u.updatedAt });
const conflict = (code, message) => Object.assign(new ConflictError(message), { code });
function uniqueEmail(email, id) {
    if (store.users.some(u => u.email === email && u.id !== id)) throw conflict("ADMIN_ALREADY_EXISTS", "Já existe um administrador cadastrado com este e-mail.");
}
export async function createAdmin({ nome, email, role, password }, actor) {
    const passwordHash = await hashPassword(password);
    uniqueEmail(email);
    const user = { id: randomUUID(), name: nome, email, role, passwordHash, isActive: true, tokenVersion: 0, createdAt: new Date(), updatedAt: new Date() };
    store.users.push(user);
    audit(actor, "USER_CREATE", "User", user.id, null, user);
    return dto(user);
}
export async function listAdmins(q) {
    return page(store.users.filter(u => (!q.busca || contains(u.name, q.busca) || contains(u.email, q.busca)) &&
        (!q.role || q.role === u.role) && (q.ativo === undefined || q.ativo === u.isActive)).sort(byName).map(dto), q);
}
export async function getAdmin(id) { return dto(find(store.users, id, "Usuário não encontrado.")); }
function anotherAdmin(user) {
    if (user.role === "ADMIN" && user.isActive && !store.users.some(u => u.id !== user.id && u.role === "ADMIN" && u.isActive)) {
        throw conflict("LAST_ACTIVE_ADMIN", "É necessário manter pelo menos um administrador ativo.");
    }
}
export async function updateAdmin(id, data, actor) {
    const user = find(store.users, id), before = clone(user);
    if (data.role === "EDITOR") {
        if (id === actor.id) throw conflict("ADMIN_CANNOT_DEMOTE_SELF", "Você não pode rebaixar a própria conta.");
        anotherAdmin(user);
    }
    if (data.email !== undefined) uniqueEmail(data.email, id);
    Object.assign(user, { ...(data.nome !== undefined && { name: data.nome }), ...(data.email !== undefined && { email: data.email }),
        ...(data.role !== undefined && { role: data.role }), updatedAt: new Date() });
    audit(actor, "USER_UPDATE", "User", id, before, user);
    return dto(user);
}
export async function changeAdminStatus(id, ativo, actor) {
    const user = find(store.users, id), before = clone(user);
    if (!ativo) {
        if (id === actor.id) throw conflict("ADMIN_CANNOT_DEACTIVATE_SELF", "Você não pode desativar a própria conta.");
        anotherAdmin(user);
    }
    user.isActive = ativo; user.updatedAt = new Date();
    audit(actor, ativo ? "USER_ACTIVATE" : "USER_DEACTIVATE", "User", id, before, user);
    return dto(user);
}
