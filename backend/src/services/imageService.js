import { removerArquivoUpload } from "../utils/arquivoUpload.js";
import prisma from "../config/prisma.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import { updateImagemSchema } from "../schemas/imagemSchema.js";
import { comQuarentenaUpload, uploadCompartilhado } from "../utils/quarentenaUpload.js";

// Limites das colunas em patrimonio_imagens (schema.prisma). Validar aqui
// devolve 400 com mensagem clara em vez de estourar no banco como 500.
function textoOpcional(valor, max, rotulo) {
    const texto = typeof valor === "string" ? valor.trim() : "";

    if (texto.length > max) {
        throw new BadRequestError(`${rotulo} deve ter no máximo ${max} caracteres.`);
    }

    return texto || null;
}

export async function criarImagemPatrimonio(patrimonioId, file, data = {}, user) {
    if (!file) {
        throw new BadRequestError("Envie um arquivo de imagem.");
    }

    // O middleware uploadImagem já gravou o arquivo no disco ANTES de este
    // service rodar. Qualquer falha daqui para baixo (patrimônio inexistente,
    // campo inválido, erro no banco) precisa apagá-lo, senão ele fica órfão
    // em /uploads sem nenhuma linha no banco apontando para ele.
    try {
        const patrimonio = await prisma.patrimonio.findUnique({
            where: { id: patrimonioId },
            select: { id: true },
        });

        if (!patrimonio) {
            const error = new NotFoundError("Patrimônio não encontrado.");
            error.code = "PATRIMONIO_NOT_FOUND";
            throw error;
        }

        const principal = String(data.principal ?? "false") === "true";

        const ordem = Number.isInteger(Number(data.ordem)) ? Number(data.ordem) : 0;
        if (ordem < 0) throw new BadRequestError("A ordem da imagem não pode ser negativa.");

        const titulo = textoOpcional(data.titulo, 200, "O título");
        const textoAlternativo = textoOpcional(data.textoAlternativo, 300, "O texto alternativo");
        const credito = textoOpcional(data.credito, 200, "O crédito");
        const fonte = textoOpcional(data.fonte, 500, "A fonte");

        const alt = textoAlternativo || titulo || file.originalname.slice(0, 300);

        return await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM patrimonio WHERE id = ${patrimonioId}::uuid FOR UPDATE`;
            if (principal) {
                await tx.patrimonioImagem.updateMany({
                    where: { patrimonioId },
                    data: { principal: false },
                });
            }

            return tx.patrimonioImagem.create({
                data: {
                    patrimonioId,
                    url: file.url,
                    titulo,
                    textoAlternativo: alt,
                    credito,
                    fonte,
                    ordem,
                    principal,
                },
            });
        });
    } catch (error) {
        await removerArquivoUpload(file.url);
        throw error;
    }
}

async function exigirImagem(tx, id) {
    const imagem = await tx.patrimonioImagem.findUnique({ where: { id } });
    if (!imagem) {
        const error = new NotFoundError("Imagem não encontrada.");
        error.code = "IMAGEM_NOT_FOUND";
        throw error;
    }

    return imagem;
}

async function bloquearImagem(tx, id) {
    const imagem = await exigirImagem(tx, id);
    await tx.$queryRaw`SELECT id FROM patrimonio WHERE id = ${imagem.patrimonioId}::uuid FOR UPDATE`;
    return exigirImagem(tx, id);
}

export async function atualizarImagemPatrimonio(id, input, user) {
    // Conserva a política de criação atual: EDITOR também pode editar imagens
    // em PUBLICADO/ARQUIVADO. Não adota silenciosamente a restrição da equipe.
    if (!["ADMIN", "EDITOR"].includes(user?.role)) throw new ForbiddenError();
    const data = updateImagemSchema.parse(input);
    return prisma.$transaction(async tx => {
        const imagem = await bloquearImagem(tx, id);
        if (data.principal === true) {
            await tx.patrimonioImagem.updateMany({ where: { patrimonioId: imagem.patrimonioId, id: { not: id } }, data: { principal: false } });
        }
        return tx.patrimonioImagem.update({ where: { id }, data });
    });
}

export async function removerImagemPatrimonio(id, user) {
    if (user?.role !== "ADMIN") throw new ForbiddenError();
    return comQuarentenaUpload(preparar => prisma.$transaction(async tx => {
        const imagem = await bloquearImagem(tx, id);
        if (imagem.url.startsWith("/uploads/patrimonios/") && !await uploadCompartilhado(tx, imagem.url)) await preparar(imagem.url);
        await tx.patrimonioImagem.delete({ where: { id } });
        return { id: imagem.id };
    }));
}
