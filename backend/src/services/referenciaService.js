import prisma from "../config/prisma.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { referenciaBodySchema, updateReferenciaSchema } from "../schemas/referenciaSchema.js";
import { removerArquivoUpload } from "../utils/arquivoUpload.js";
import { comQuarentenaUpload, uploadCompartilhado } from "../utils/quarentenaUpload.js";

export function referenciaDTO(documento) {
    return {
        id: documento.id,
        descricao: documento.descricao ?? "",
        nomeArquivo: documento.tipo === "ARQUIVO" ? documento.titulo : null,
        url: documento.url,
        tipo: documento.tipo,
    };
}

async function patrimonioBloqueado(tx, id) {
    // Mesmo bloqueio das edições/transições: EDITOR não anexa durante publicação.
    await tx.$queryRaw`SELECT id FROM patrimonio WHERE id = ${id}::uuid FOR UPDATE`;
    const patrimonio = await tx.patrimonio.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!patrimonio) throw new NotFoundError("Patrimônio não encontrado.");
    return patrimonio;
}

export async function criarReferenciaPatrimonio(id, file, input, user) {
    try {
        const data = referenciaBodySchema.parse(input);
        if (Boolean(file) === Boolean(data.url)) throw new BadRequestError("Envie um arquivo ou um link, nunca ambos.");
        return await prisma.$transaction(async tx => {
            const patrimonio = await patrimonioBloqueado(tx, id);
            if (user.role !== "ADMIN" && (user.role !== "EDITOR" || patrimonio.status !== "RASCUNHO")) {
                throw new ForbiddenError("Editor pode adicionar referências somente em rascunhos.");
            }
            const documento = await tx.patrimonioDocumento.create({ data: {
                patrimonioId: id,
                titulo: file ? file.originalname : new URL(data.url).hostname.slice(0, 200),
                descricao: data.descricao || null,
                url: file ? file.url : data.url,
                tipo: file ? "ARQUIVO" : "LINK",
                mimeType: file?.mimetype ?? null,
                fonte: !file && data.url.length <= 500 ? data.url : null,
            } });
            return referenciaDTO(documento);
        });
    } catch (error) {
        if (file) await removerArquivoUpload(file.url);
        throw error;
    }
}

export async function removerReferenciaPatrimonio(id, referenciaId, user) {
    if (user.role !== "ADMIN") throw new ForbiddenError();
    return comQuarentenaUpload(preparar => prisma.$transaction(async tx => {
        await patrimonioBloqueado(tx, id);
        const current = await tx.patrimonioDocumento.findFirst({ where: { id: referenciaId, patrimonioId: id } });
        if (!current) throw new NotFoundError("Referência não encontrada neste patrimônio.");
        if (current.url.startsWith("/uploads/referencias/") && !await uploadCompartilhado(tx, current.url)) await preparar(current.url);
        await tx.patrimonioDocumento.delete({ where: { id: current.id } });
        return { id: current.id };
    }));
}

export async function atualizarReferenciaPatrimonio(id, referenciaId, input, user) {
    const data = updateReferenciaSchema.parse(input);
    return prisma.$transaction(async tx => {
        const patrimonio = await patrimonioBloqueado(tx, id);
        if (user.role !== "ADMIN" && (user.role !== "EDITOR" || patrimonio.status !== "RASCUNHO")) {
            throw new ForbiddenError("Editor pode editar referências somente em rascunhos.");
        }
        const current = await tx.patrimonioDocumento.findFirst({ where: { id: referenciaId, patrimonioId: id } });
        if (!current) throw new NotFoundError("Referência não encontrada neste patrimônio.");
        const updated = await tx.patrimonioDocumento.update({ where: { id: current.id }, data });
        return referenciaDTO(updated);
    });
}
