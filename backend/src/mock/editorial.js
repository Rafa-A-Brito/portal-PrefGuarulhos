import { randomUUID } from "node:crypto";
import { getRow } from "./catalog.js";
import { clone, find, role, editable, audit, byOrder } from "./helpers.js";
import { createFatoSchema, updateFatoSchema, createLigacaoSchema, updateLigacaoSchema, ordenarEditorialSchema } from "../schemas/patrimonioEditorialSchema.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import { legadoEditorial } from "../utils/identidadeEditorial.js";

function config(tipo) {
    if (tipo === "fatos") return { create: createFatoSchema, update: updateFatoSchema, prefix: "FATO", entity: "PatrimonioFato", parent: "patrimonioId" };
    if (tipo === "ligacoes") return { create: createLigacaoSchema, update: updateLigacaoSchema, prefix: "LIGACAO", entity: "PatrimonioLigacao", parent: "patrimonioOrigemId" };
    throw new BadRequestError("Recurso editorial inválido.");
}
function dto(tipo, row) {
    if (tipo === "fatos") return clone(row);
    const d = getRow(row.patrimonioDestinoId);
    return { ...clone(row), destino: { id: d.id, slug: d.slug, nome: d.nome, status: d.status } };
}
function validate(tipo, p, data, currentId) {
    if (data.patrimonioDestinoId) {
        canonical(getRow(data.patrimonioDestinoId));
        if (p.id === data.patrimonioDestinoId) throw new BadRequestError("O patrimônio não pode ter ligação consigo mesmo.");
    }
    if (p[tipo].some(r => r.id !== currentId && ((data.ordem !== undefined && r.ordem === data.ordem) ||
        (data.patrimonioDestinoId && data.patrimonioDestinoId === r.patrimonioDestinoId)))) throw new ConflictError("Ordem ou destino já utilizado neste patrimônio.");
}
function canonical(p) {
    const legacy = legadoEditorial(p);
    if (legacy) throw new ConflictError(`Identidade consolidada: utilize ${legacy.canonico}.`);
}
function record(c, p, user, verb, id, before, after) {
    audit(user, `${c.prefix}_${verb}`, c.entity, id, before && { ...before, [c.parent]: p.id }, after && { ...after, [c.parent]: p.id });
    p.updatedBy = user.id; p.updatedAt = new Date();
}
export async function listarEditorial(tipo, id, user) {
    role(user); config(tipo);
    return getRow(id)[tipo].map(r => dto(tipo, r)).sort(byOrder);
}
export async function criarEditorial(tipo, id, input, user) {
    const c = config(tipo), data = c.create.parse(input), p = getRow(id); editable(p, user); canonical(p);
    data.ordem ??= Math.max(-1, ...p[tipo].map(r => r.ordem)) + 1;
    if (data.ordem > 2147483647) throw new ConflictError("Reordene os itens antes de adicionar outro.");
    validate(tipo, p, data);
    const row = { id: randomUUID(), ...data }; p[tipo].push(row);
    record(c, p, user, "CREATE", row.id, null, row); return dto(tipo, row);
}
export async function atualizarEditorial(tipo, id, itemId, input, user) {
    const c = config(tipo), data = c.update.parse(input), p = getRow(id); editable(p, user); canonical(p);
    const row = find(p[tipo], itemId, "Item não encontrado neste patrimônio."), before = clone(row);
    validate(tipo, p, data, itemId); Object.assign(row, data);
    record(c, p, user, "UPDATE", itemId, before, row); return dto(tipo, row);
}
export async function excluirEditorial(tipo, id, itemId, user) {
    const c = config(tipo), p = getRow(id); editable(p, user); canonical(p);
    const row = find(p[tipo], itemId, "Item não encontrado neste patrimônio.");
    p[tipo] = p[tipo].filter(r => r.id !== itemId);
    record(c, p, user, "DELETE", itemId, row); return { id: itemId };
}
export async function ordenarEditorial(tipo, id, input, user) {
    const c = config(tipo), { ids } = ordenarEditorialSchema.parse(input), p = getRow(id); editable(p, user); canonical(p);
    if (ids.length !== p[tipo].length || ids.some(id => !p[tipo].some(r => r.id === id))) throw new ConflictError("Informe exatamente todos os IDs atuais, na ordem desejada.");
    const before = { itens: clone(p[tipo]) };
    ids.forEach((id, ordem) => { find(p[tipo], id).ordem = ordem; });
    record(c, p, user, "REORDER", id, before, { itens: p[tipo] });
    return listarEditorial(tipo, id, user);
}
