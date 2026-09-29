import { Router } from "express";
import patrimonioRoutes from "./patrimonioRoutes.js";
import authRoutes from "./authRoutes.js";
import adminUsuarioRoutes from "./adminUsuarioRoutes.js";
import adminPatrimonioRoutes from "./adminPatrimonioRoutes.js";
import { exigirAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

// Rotas públicas, usadas pelo site e pela tela de login.
router.use("/patrimonios", patrimonioRoutes);
router.use("/usuarios", authRoutes);

// A partir daqui, tudo passa pelo exigirAdmin antes de chegar no
// controller. É por isso que o caminho já começa com "/admin": só de olhar
// a URL já dá pra saber que aquela rota é protegida.
router.use("/admin/usuarios", exigirAdmin, adminUsuarioRoutes);
router.use("/admin/patrimonios", exigirAdmin, adminPatrimonioRoutes);

export default router;
