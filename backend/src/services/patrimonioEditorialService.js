import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { createFatoSchema, updateFatoSchema, createLigacaoSchema, updateLigacaoSchema, ordenarEditorialSchema } from "../schemas/patrimonioEditorialSchema.js";
import { legadoEditorial } from "../utils/identidadeEditorial.js";

export const ordemEditorial = [{ ordem: "asc" }, { id: "asc" }];
export const fatoSelect = { id: true, rotulo: true, valor: true, ordem: true };
export const ligacaoSelect = { id: true, patrimonioDestinoId: true, texto: true, ordem: true,
    destino: { select: { id: true, slug: true, nome: true, status: true } } };
const tipos = {
    fatos: { model: "patrimonioFato", parent: "patrimonioId", select: fatoSelect, create: createFatoSchema, update: updateFatoSchema },
    ligacoes: { model: "patrimonioLigacao", parent: "patrimonioOrigemId", select: ligacaoSelect, create: createLigacaoSchema, update: updateLigacaoSchema },
};
function tipoDe(tipo) {
    if (!Object.hasOwn(tipos, tipo)) throw new BadRequestError("Recurso editorial inválido.");
    return tipos[tipo];
}
function autenticar(user) {
    if (!["ADMIN", "EDITOR"].includes(user?.role)) throw new ForbiddenError();
}
function exigirCanonico(p) {
    const legado = legadoEditorial(p);
    if (legado) throw new ConflictError(`Identidade consolidada: utilize ${legado.canonico}.`);
}
async function patrimonio(tx, id) {
    const p = await tx.patrimonio.findUnique({ where: { id }, select: { id: true, slug: true, status: true } });
    if (!p) throw new NotFoundError("Patrimônio não encontrado.");
    return p;
}
async function bloquear(tx, ids) {
    // Ordem global evita deadlock entre duas ligações em sentidos opostos.
    await tx.$queryRaw`SELECT id FROM patrimonio WHERE id IN (${Prisma.join([...new Set(ids)].map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`;
}
async function escrever(tipo, id, user, destinoId, operacao) {
    autenticar(user);
    const config = tipoDe(tipo);
    return prisma.$transaction(async tx => {
        await bloquear(tx, destinoId ? [id, destinoId] : [id]);
        const origem = await patrimonio(tx, id);
        if (user.role !== "ADMIN" && origem.status !== "RASCUNHO") throw new ForbiddenError("Editor pode editar somente rascunhos.");
        exigirCanonico(origem);
        if (destinoId) {
            const destino = await patrimonio(tx, destinoId);
            exigirCanonico(destino);
            if (origem.id === destino.id) throw new BadRequestError("O patrimônio não pode ter ligação consigo mesmo.");
        }
        const result = await operacao(tx[config.model], config);
        await tx.patrimonio.update({ where: { id }, data: { updatedBy: user.id } });
        return result;
    });
}
export async function listarEditorial(tipo, id, user) {
    autenticar(user);
    const c = tipoDe(tipo);
    return prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        await patrimonio(tx, id);
        return tx[c.model].findMany({ where: { [c.parent]: id }, select: c.select, orderBy: ordemEditorial });
    }, { isolationLevel: "RepeatableRead" });
}
export async function criarEditorial(tipo, id, input, user) {
    const data = tipoDe(tipo).create.parse(input);
    return escrever(tipo, id, user, data.patrimonioDestinoId, async (model, c) => {
        const where = { [c.parent]: id };
        if (data.ordem === undefined) {
            const last = await model.findFirst({ where, orderBy: { ordem: "desc" }, select: { ordem: true } });
            data.ordem = (last?.ordem ?? -1) + 1;
            if (data.ordem > 2147483647) throw new ConflictError("Reordene os itens antes de adicionar outro.");
        }
        await validarColisoes(model, where, data);
        return model.create({ data: { ...where, ...data }, select: c.select });
    });
}
async function item(model, where, itemId) {
    const current = await model.findFirst({ where: { ...where, id: itemId } });
    if (!current) throw new NotFoundError("Item não encontrado neste patrimônio.");
    return current;
}
async function validarColisoes(model, where, data, itemId) {
    const OR = [];
    if (data.ordem !== undefined) OR.push({ ordem: data.ordem });
    if (data.patrimonioDestinoId) OR.push({ patrimonioDestinoId: data.patrimonioDestinoId });
    if (OR.length && await model.findFirst({ where: { ...where, ...(itemId && { id: { not: itemId } }), OR } })) {
        throw new ConflictError("Ordem ou destino já utilizado neste patrimônio.");
    }
}
export async function atualizarEditorial(tipo, id, itemId, input, user) {
    const data = tipoDe(tipo).update.parse(input);
    return escrever(tipo, id, user, data.patrimonioDestinoId, async (model, c) => {
        const where = { [c.parent]: id };
        await item(model, where, itemId);
        await validarColisoes(model, where, data, itemId);
        return model.update({ where: { id: itemId }, data, select: c.select });
    });
}
export async function excluirEditorial(tipo, id, itemId, user) {
    return escrever(tipo, id, user, null, async (model, c) => {
        await item(model, { [c.parent]: id }, itemId);
        await model.delete({ where: { id: itemId } });
        return { id: itemId };
    });
}
export async function ordenarEditorial(tipo, id, input, user) {
    const { ids } = ordenarEditorialSchema.parse(input);
    return escrever(tipo, id, user, null, async (model, c) => {
        const where = { [c.parent]: id };
        const rows = await model.findMany({ where, select: { id: true, ordem: true } });
        const existentes = new Set(rows.map(r => r.id));
        if (ids.length !== rows.length || ids.some(key => !existentes.has(key))) throw new ConflictError("Informe exatamente todos os IDs atuais, na ordem desejada.");
        // Espaços livres não negativos evitam colisões temporárias nos índices
        // imediatos, inclusive quando uma ordem anterior é INT_MAX. IDs preservados.
        const usados = new Set(rows.map(r => r.ordem));
        let livre = 0;
        for (const key of ids) {
            while (usados.has(livre) || livre < ids.length) livre++;
            await model.update({ where: { id: key }, data: { ordem: livre } });
            usados.add(livre++);
        }
        for (const [ordem, key] of ids.entries()) await model.update({ where: { id: key }, data: { ordem } });
        return model.findMany({ where, select: c.select, orderBy: ordemEditorial });
    });
}
