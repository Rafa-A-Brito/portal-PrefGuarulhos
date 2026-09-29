import { Router } from "express";
import patrimonioRoutes from "./patrimonioRoutes.js";
import authRoutes from "./authRoutes.js";

const router = Router();

router.use("/patrimonios", patrimonioRoutes);
router.use("/usuarios", authRoutes);

export default router;
