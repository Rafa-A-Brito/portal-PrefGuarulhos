import prisma from "../config/prisma.js";

export function getAuthenticationUser(id, sessionId) {
    return prisma.user.findUnique({ where: { id },
        select: { id: true, name: true, email: true, role: true, isActive: true, tokenVersion: true,
            authSessions: { where: { id: sessionId }, select: { tokenVersion: true, expiresAt: true, revokedAt: true } } } });
}

export function getMediaPatrimonio(id) {
    return prisma.patrimonio.findUnique({ where: { id }, select: { id: true, status: true } });
}

export function listMediaOwners(model, url, editorial) {
    return prisma[model].findMany({ where: { [editorial ? "imagemUrl" : "url"]: url },
        select: editorial ? { status: true } : { patrimonio: { select: { status: true } } } });
}

export function listCategorias() {
    return prisma.categoria.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, slug: true, descricao: true } });
}
