import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { validateParams, validateQuery } from "../middlewares/validate.js";
import { auditoriaParamsSchema, auditoriaQuerySchema } from "../schemas/auditoriaSchema.js";
import { list, detail } from "../controllers/auditoriaController.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));
router.get("/", validateQuery(auditoriaQuerySchema), list);
router.get("/:id", validateParams(auditoriaParamsSchema), detail);
export default router;
