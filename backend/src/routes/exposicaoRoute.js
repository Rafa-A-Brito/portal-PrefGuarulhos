import { Router } from "express";
import { validateQuery } from "../middlewares/validate.js";
import { listExposicoesQuerySchema } from "../schemas/exposicaoSchema.js";
import { list } from "../controllers/exposicaoController.js";
const router = Router();
router.get("/", validateQuery(listExposicoesQuerySchema), list);
export default router;
