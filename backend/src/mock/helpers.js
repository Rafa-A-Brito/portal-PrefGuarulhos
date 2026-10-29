import { randomUUID } from "node:crypto";
import { store } from "./store.js";
import NotFoundError from "../errors/NotFoundError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import { prepararValoresAuditoria } from "../utils/auditoria.js";
import { prepararNovidade } from "../utils/novidadeData.js";
import { logEvent } from "../utils/logger.js";

export const clone = value => structuredClone(value);
export const contains = (value, search) => String(value ?? "").toLocaleLowerCase("pt-BR").includes(String(search).toLocaleLowerCase("pt-BR"));
export const equals = (a, b) => String(a).toLocaleLowerCase("pt-BR") === String(b).toLocaleLowerCase("pt-BR");
export const byName = (a, b) => (a.nome ?? a.name).localeCompare(b.nome ?? b.name, "pt-BR") || a.id.localeCompare(b.id);
export const byOrder = (a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id);
export function page(rows, { pagina = 1, limite = 20 } = {}) {
    return { itens: clone(rows.slice((pagina - 1) * limite, pagina * limite)),
        paginacao: { pagina, limite, total: rows.length, totalPaginas: Math.ceil(rows.length / limite) } };
}
export function find(rows, id, message = "Registro não encontrado.", code) {
    const row = rows.find(item => item.id === id);
    if (!row) throw Object.assign(new NotFoundError(message), code ? { code } : {});
    return row;
}
export function role(user, admin = false) {
    if (!user || !["ADMIN", "EDITOR"].includes(user.role) || (admin && user.role !== "ADMIN")) throw new ForbiddenError();
}
export function editable(row, user) {
    role(user);
    if (user.role === "EDITOR" && row.status !== "RASCUNHO") throw new ForbiddenError("Editor pode editar somente rascunhos.");
}
export function audit(user, action, entity, entityId, before, after) {
    const normalized = value => value && entity === "Novidade" ? prepararNovidade(value) : value;
    const values = prepararValoresAuditoria(entity, normalized(before), normalized(after));
    if (!values) return;
    const oldValues = Object.keys(values.oldValues).length ? values.oldValues : null;
    const newValues = Object.keys(values.newValues).length ? values.newValues : null;
    store.audit.push({ id: randomUUID(), userId: typeof user === "string" ? user : user.id, action, entity, entityId,
        oldValues: clone(oldValues), newValues: clone(newValues), createdAt: new Date() });
    logEvent("info", "MOCK_ADMIN_CHANGE", { userId: typeof user === "string" ? user : user.id, action, entity, entityId });
}
