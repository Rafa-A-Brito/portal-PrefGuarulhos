import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { hashPassword } from "../utils/password.js";

const userSelect = {
    id: true, name: true, email: true, role: true, isActive: true,
    createdAt: true, updatedAt: true,
};

function toAdmin(user) {
    return {
        id: user.id, nome: user.name, email: user.email, role: user.role,
        ativo: user.isActive, criadoEm: user.createdAt, atualizadoEm: user.updatedAt,
    };
}

function conflict(code, message) {
    const error = new ConflictError(message);
    error.code = code;
    return error;
}

function handleWriteError(error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("ADMIN_ALREADY_EXISTS", "Já existe um administrador cadastrado com este e-mail.");
    }
    throw error;
}

async function findUser(id, client = prisma) {
    const user = await client.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    return user;
}

export async function createAdmin({ nome, email, role, password }) {
    try {
        const user = await prisma.user.create({
            data: {
                name: nome, email, role,
                passwordHash: await hashPassword(password), isActive: true,
            },
            select: userSelect,
        });
        return toAdmin(user);
    } catch (error) {
        handleWriteError(error);
    }
}

export async function listAdmins({ busca, role, ativo, pagina = 1, limite = 20 }) {
    const where = {
        ...(busca && { OR: [
            { name: { contains: busca, mode: "insensitive" } },
            { email: { contains: busca, mode: "insensitive" } },
        ] }),
        ...(role && { role }),
        ...(ativo !== undefined && { isActive: ativo }),
    };
    const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where, skip: (pagina - 1) * limite, take: limite,
            orderBy: [{ name: "asc" }, { id: "asc" }], select: userSelect,
        }),
    ]);
    return {
        itens: users.map(toAdmin),
        paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
    };
}

export async function getAdmin(id) {
    return toAdmin(await findUser(id));
}

async function lockUsers(transaction, id) {
    // Todas as edições/status bloqueiam o mesmo conjunto de ADMINs ativos e o alvo,
    // em ordem de UUID para evitar inversão de locks. Bloquear só o alvo permitiria
    // que duas requisições removessem ADMINs distintos ao mesmo tempo.
    await transaction.$queryRaw`
        SELECT id FROM users
        WHERE (role = 'ADMIN' AND is_active = true) OR id = ${id}::uuid
        ORDER BY id FOR UPDATE
    `;
    // READ COMMITTED garante uma leitura nova após a espera pelo lock.
    return findUser(id, transaction);
}

async function ensureAnotherAdmin(transaction, current) {
    if (current.role !== "ADMIN" || !current.isActive) return;
    const remaining = await transaction.user.count({
        where: { role: "ADMIN", isActive: true, id: { not: current.id } },
    });
    if (remaining === 0) {
        throw conflict("LAST_ACTIVE_ADMIN", "É necessário manter pelo menos um administrador ativo.");
    }
}

export async function updateAdmin(id, { nome, email, role }, actor) {
    try {
        return await prisma.$transaction(async (transaction) => {
            const current = await lockUsers(transaction, id);
            if (current.id === actor.id && role === "EDITOR") {
                throw conflict("ADMIN_CANNOT_DEMOTE_SELF", "Você não pode rebaixar a própria conta.");
            }
            if (role === "EDITOR") await ensureAnotherAdmin(transaction, current);
            const updated = await transaction.user.update({
                where: { id },
                data: {
                    ...(nome !== undefined && { name: nome }),
                    ...(email !== undefined && { email }),
                    ...(role !== undefined && { role }),
                },
                select: userSelect,
            });
            return toAdmin(updated);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error) {
        handleWriteError(error);
    }
}

export async function changeAdminStatus(id, ativo, actor) {
    return prisma.$transaction(async (transaction) => {
        const current = await lockUsers(transaction, id);
        if (current.id === actor.id && !ativo) {
            throw conflict("ADMIN_CANNOT_DEACTIVATE_SELF", "Você não pode desativar a própria conta.");
        }
        if (current.isActive === ativo) return toAdmin(current);
        if (!ativo) await ensureAnotherAdmin(transaction, current);
        return toAdmin(await transaction.user.update({
            where: { id }, data: { isActive: ativo }, select: userSelect,
        }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}