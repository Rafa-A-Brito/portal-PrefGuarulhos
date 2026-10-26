import prisma from "../config/prisma.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import { auditSnapshot, registrarAuditoria, AUDIT_ACTIONS as A, AUDIT_ENTITIES as E } from "../utils/auditoria.js";

export const regiaoPublicSelect = { id: true, nome: true, slug: true };
export const regiaoAdminSelect = { ...regiaoPublicSelect, ativo: true };
const orderBy = [{ nome: "asc" }, { id: "asc" }];

export async function listarRegioesPublicas() {
    return prisma.regiaoPatrimonio.findMany({ where: { ativo: true }, select: regiaoPublicSelect, orderBy });
}
export async function listarRegioesAdmin({ busca, ativo, pagina, limite }) {
    const where = {
        ...(ativo !== undefined && { ativo }),
        ...(busca && { OR: [{ nome: { contains: busca, mode: "insensitive" } }, { slug: { contains: busca, mode: "insensitive" } }] }),
    };
    const [total, itens] = await prisma.$transaction([
        prisma.regiaoPatrimonio.count({ where }),
        prisma.regiaoPatrimonio.findMany({ where, orderBy, skip: (pagina - 1) * limite, take: limite }),
    ]);
    return { itens, paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) } };
}

// Mesmo lock para atribuir uma referência e para inativá-la. A validação ocorre
// depois da espera pelo lock, e ele permanece até o commit da escrita patrimonial.
export async function validarAtribuicaoRegiao(tx, id) {
    if (id === null || id === undefined) return;
    await tx.$queryRaw`SELECT id FROM regioes_patrimonio WHERE id = ${id}::uuid FOR UPDATE`;
    const regiao = await tx.regiaoPatrimonio.findUnique({ where: { id } });
    if (!regiao) throw new NotFoundError("Região não encontrada.");
    if (!regiao.ativo) throw new ConflictError("A região está inativa. Selecione uma região ativa.");
}

export async function salvarRegiao(id, data, user) {
    if (user.role !== "ADMIN") throw new ForbiddenError("Somente ADMIN pode administrar regiões.");
    try {
        return await prisma.$transaction(async tx => {
            let before = null;
            if (id) {
                await tx.$queryRaw`SELECT id FROM regioes_patrimonio WHERE id = ${id}::uuid FOR UPDATE`;
                before = await tx.regiaoPatrimonio.findUnique({ where: { id } });
                if (!before) throw new NotFoundError("Região não encontrada.");
            }
            if (before) before = auditSnapshot(E.REGIAO, before);
            const row = id
                ? await tx.regiaoPatrimonio.update({ where: { id }, data })
                : await tx.regiaoPatrimonio.create({ data });
            await registrarAuditoria(tx, { userId: user.id, action: id ? A.REGIAO_UPDATE : A.REGIAO_CREATE,
                entity: E.REGIAO, entityId: row.id, before, after: row });
            return row;
        });
    } catch (error) {
        if (error.code === "P2002") throw new ConflictError("Já existe uma região com este slug.");
        throw error;
    }
}
