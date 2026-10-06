import fs from "node:fs/promises";
import path from "node:path";

import prisma from "../config/prisma.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";

const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

export async function criarImagemPatrimonio(patrimonioId, file, data = {}, user) {
    if (!file) {
        throw new BadRequestError("Envie um arquivo de imagem.");
    }

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

    const titulo = data.titulo?.trim() || null;

    const alt = data.textoAlternativo?.trim() || titulo || file.originalname;

    const credito = data.credito?.trim() || null;

    const fonte = data.fonte?.trim() || null;

    await fs.mkdir(patrimonioUploadDir, { recursive: true });

    const result = await prisma.$transaction(async (tx) => {
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

    return result;
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

    if (imagem.url.startsWith("/uploads/")) {
        const relativePath = imagem.url.replace(/^\/uploads\//, "");

        const filePath = path.join(uploadDir, relativePath);

        await fs.unlink(filePath).catch(() => {});
    }

    return {
        id: imagem.id,
    };
}
