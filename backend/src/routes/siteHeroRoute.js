import { Router } from "express";
import { list, detail } from "../controllers/siteHeroController.js";
import { z } from "zod";
import { validateParams } from "../middlewares/validate.js";

const router = Router();
const paramsSchema = z.strictObject({ pagina: z.string().trim().min(1).max(50).regex(/^[a-z0-9-]+$/) });

router.get("/", list);
router.get("/:pagina", validateParams(paramsSchema), detail);

export default router;
