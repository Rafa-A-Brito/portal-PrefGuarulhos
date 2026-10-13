import { Router } from "express";
import authRoutes from "./authRoute.js";
import adminRoutes from "./adminRoute.js";
import adminReferenciaRoutes from "./adminReferenciaRoute.js";
import adminImageRoutes from "./adminImageRoute.js";
import adminPatrimonioRoutes from "./adminPatrimonioRoute.js";
import dashboardRoutes from "./dashboardRoute.js";
import patrimonioRoutes from "./patrimonioRoute.js";
import categoriaRoutes from "./configRoutes.js";

import exposicaoRoutes from "./exposicaoRoute.js";
import novidadeRoutes from "./novidadeRoute.js";
import adminExposicaoRoutes from "./adminExposicaoRoute.js";
import adminNovidadeRoutes from "./adminNovidadeRoute.js";
import { servirArquivo } from "../controllers/midiaPublicaController.js";
import authenticateOpcional from "../middlewares/authenticateOpcional.js";
import { validateParams } from "../middlewares/validate.js";
import { arquivoParamsSchema } from "../schemas/midiaSchema.js";

const router = Router();
router.use("/exposicoes", exposicaoRoutes);
router.use("/novidades", novidadeRoutes);
router.use("/admin/exposicoes", adminExposicaoRoutes);
router.use("/admin/novidades", adminNovidadeRoutes);

router.get("/", (_req, res) => {
    res.json({
        success: true,
        data: { name: "Portal Cultural de Guarulhos API", version: "1.0.0" },
    });
});

router.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
});

router.use("/auth", authRoutes);
router.use("/admins", adminRoutes);
router.use("/patrimonios", patrimonioRoutes);
router.use("/categorias", categoriaRoutes);
router.use("/admin/dashboard", dashboardRoutes);
router.use("/admin/patrimonios", adminPatrimonioRoutes);
router.use("/admin", adminImageRoutes);
router.use("/admin", adminReferenciaRoutes);

// Mídias são entregues por rota própria, com checagem do status do patrimônio,
// em vez de expor a pasta uploads inteira com express.static.
router.get("/uploads/:tipo/:arquivo", authenticateOpcional, validateParams(arquivoParamsSchema), servirArquivo);

export default router;
