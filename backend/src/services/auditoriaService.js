import prisma from "../config/prisma.js";
import NotFoundError from "../errors/NotFoundError.js";
import { auditValues, AUDIT_ENTITIES as E, AUDIT_ACTIONS as A } from "../utils/auditoria.js";

const select = {
    id: true, userId: true, action: true, entity: true, entityId: true, createdAt: true,
    user: { select: { id: true, name: true, email: true } },
};
const entities = { USER: "Usuário", PATRIMONIO: "Patrimônio", IMAGEM: "Imagem", DOCUMENTO: "Documento", REGIAO: "Região", FATO: "Fato", LIGACAO: "Ligação", EXPOSICAO: "Exposição", NOVIDADE: "Novidade" };
const verbs = { CREATE: "criação", UPDATE: "edição", DELETE: "exclusão", PUBLISH: "publicação", ARCHIVE: "arquivamento", ACTIVATE: "ativação", DEACTIVATE: "desativação", REORDER: "reordenação", PASSWORD_CHANGE: "troca de senha" };
function resumo(row) {
    const [prefix, ...verb] = row.action.split("_");
    return { id: row.id, userId: row.userId, action: row.action, entity: row.entity, entityId: row.entityId, createdAt: row.createdAt,
        user: row.user ? { id: row.user.id, name: row.user.name, email: row.user.email } : null,
        resumo: entities[prefix] && verbs[verb.join("_")] ? `${entities[prefix]}: ${verbs[verb.join("_")]}` : "Atividade administrativa registrada" };
}

async function identificarRegistro(row, oldValues, newValues) {
    const registro = { id: row.entityId };
    // Identificação é separada dos valores alterados: um PATCH de legenda não
    // precisa repetir o patrimônio imutável em oldValues/newValues.
    const model = { [E.IMAGEM]: "patrimonioImagem", [E.DOCUMENTO]: "patrimonioDocumento", [E.FATO]: "patrimonioFato", [E.LIGACAO]: "patrimonioLigacao" }[row.entity];
    if (!model) return registro;
    if (row.action.endsWith("_REORDER")) return { ...registro, patrimonioId: row.entityId };
    const key = row.entity === E.LIGACAO ? "patrimonioOrigemId" : "patrimonioId";
    let parent = newValues?.[key] ?? oldValues?.[key];
    if (!parent) {
        const current = await prisma[model].findUnique({ where: { id: row.entityId }, select: { [key]: true } });
        parent = current?.[key];
    }
    if (!parent) {
        const prefix = Object.keys(E).find(key => E[key] === row.entity);
        const origin = await prisma.auditLog.findFirst({ where: { entity: row.entity, entityId: row.entityId,
            action: { in: [A[`${prefix}_CREATE`], A[`${prefix}_DELETE`]] } },
        select: { oldValues: true, newValues: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
        parent = origin?.newValues?.[key] ?? origin?.oldValues?.[key];
    }
    return { ...registro, patrimonioId: typeof parent === "string" && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(parent) ? parent : null };
}

export async function listarAuditoria({ userId, action, entity, entityId, inicio, fim, pagina = 1, limite = 20 }) {
    const where = {
        ...(userId && { userId }), ...(action && { action }), ...(entity && { entity }), ...(entityId && { entityId }),
        ...((inicio || fim) && { createdAt: { ...(inicio && { gte: inicio }), ...(fim && { lte: fim }) } }),
    };
    const [total, itens] = await prisma.$transaction([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({ where, select, skip: (pagina - 1) * limite, take: limite,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    ], { isolationLevel: "RepeatableRead" });
    return { itens: itens.map(resumo), paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) } };
}
export async function detalharAuditoria(id) {
    const row = await prisma.auditLog.findUnique({ where: { id }, select: { ...select, oldValues: true, newValues: true } });
    if (!row) throw new NotFoundError("Evento de auditoria não encontrado.");
    // Também aplica a lista permitida aos eventos antigos; o banco permanece intacto.
    const oldValues = row.oldValues === null || row.action === A.USER_PASSWORD_CHANGE ? null : auditValues(row.entity, row.oldValues);
    const newValues = row.newValues === null || row.action === A.USER_PASSWORD_CHANGE ? null : auditValues(row.entity, row.newValues);
    return { ...resumo(row), registro: await identificarRegistro(row, oldValues, newValues), oldValues, newValues };
}
