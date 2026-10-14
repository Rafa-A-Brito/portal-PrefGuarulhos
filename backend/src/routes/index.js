import { Router } from "express";
import authRoutes from "./authRoute.js";
import adminRoutes from "./adminRoute.js";
import adminReferenciaRoutes from "./adminReferenciaRoute.js";
import adminImageRoutes from "./adminImageRoute.js";
import adminPatrimonioRoutes from "./adminPatrimonioRoute.js";
import patrimonioRoutes from "./patrimonioRoute.js";
import categoriaRoutes from "./configRoutes.js";
import dashboardRoutes from "./dashboardRoute.js";
import patrimonioEditorialRoutes from "./patrimonioEditorialRoute.js";

import exposicaoRoutes from "./exposicaoRoute.js";
import novidadeRoutes from "./novidadeRoute.js";
import adminExposicaoRoutes from "./adminExposicaoRoute.js";
import adminNovidadeRoutes from "./adminNovidadeRoute.js";

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
router.use("/admin/patrimonios", adminPatrimonioRoutes);
router.use("/admin/patrimonios", patrimonioEditorialRoutes);
router.use("/admin/dashboard", dashboardRoutes);
router.use("/admin", adminImageRoutes);
router.use("/admin", adminReferenciaRoutes);

export default router;
