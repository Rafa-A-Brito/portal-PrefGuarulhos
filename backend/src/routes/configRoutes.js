import { Router } from "express";
import { access } from "../services/index.js";

const router = Router();

// Lista pública de categorias (usada pelos filtros e pelo formulário do painel).
router.get("/", async (_req, res) => {
    const categorias = await access.listCategorias();
    res.json({ success: true, data: categorias });
});

export default router;
