import { Router } from "express";
import * as adminUsuarioController from "../controllers/adminUsuarioController.js";

const router = Router();

router.get("/", adminUsuarioController.listar);
router.post("/", adminUsuarioController.criar);
router.put("/:id", adminUsuarioController.atualizar);
router.delete("/:id", adminUsuarioController.excluir);

export default router;
