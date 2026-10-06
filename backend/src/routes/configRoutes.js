import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

// Lista pública de categorias (usada pelos filtros e pelo formulário do painel).
router.get("/", async (_req, res) => {
    const categorias = await prisma.categoria.findMany({
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, slug: true, descricao: true },
    });
    res.json({ success: true, data: categorias });
});

export default router;
