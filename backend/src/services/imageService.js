import fs from "node:fs/promises";
import path from "node:path";

import env from "../config/env.js";
import prisma from "../config/prisma.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";

const uploadDir = env.UPLOAD_DIR;

// Apaga do disco um arquivo que o middleware de upload já gravou. Nunca lança:
// a limpeza é "melhor esforço" e não pode mascarar o erro original.
async function apagarArquivoUpload(url) {
    if (!url?.startsWith("/uploads/")) return;

    const relativePath = url.replace(/^\/uploads\//, "");
    await fs.unlink(path.join(uploadDir, relativePath)).catch(() => {});
}

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
        await apagarArquivoUpload(file.url);
        throw error;
    }
}

export async function removerImagemPatrimonio(id) {
    const imagem = await prisma.patrimonioImagem.findUnique({
        where: { id },
    });

    if (!imagem) {
        const error = new NotFoundError("Imagem não encontrada.");
        error.code = "IMAGEM_NOT_FOUND";
        throw error;
    }

    await prisma.patrimonioImagem.delete({
        where: { id },
    });

    await apagarArquivoUpload(imagem.url);

    return {
        id: imagem.id,
    };
}
