import { Router } from "express";
import * as patrimonioController from "../controllers/patrimonioController.js";

const router = Router();

router.get("/", patrimonioController.listar);
router.get("/:id", patrimonioController.buscarPorId);

export default router;
