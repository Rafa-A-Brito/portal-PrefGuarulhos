import prisma from "../config/prisma.js";
import NotFoundError from "../errors/NotFoundError.js";

export async function getHero(pagina) {
    const hero = await prisma.siteHero.findFirst({ where: { pagina, ativo: true } });
    if (!hero) {
        const error = new NotFoundError("Hero não encontrado.");
        error.code = "SITE_HERO_NOT_FOUND";
        throw error;
    }
    return hero;
}

export async function listHeroes() {
    return prisma.siteHero.findMany({ where: { ativo: true }, orderBy: { pagina: "asc" } });
}
