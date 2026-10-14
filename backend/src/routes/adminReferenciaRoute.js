import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate, { validateParams } from "../middlewares/validate.js";
import descartarUploadEmFalha from "../middlewares/descartarUploadEmFalha.js";
import uploadReferencia from "../middlewares/uploadReferencia.js";
import { patrimonioIdParamsSchema } from "../schemas/patrimonioSchema.js";
import { referenciaParamsSchema, updateReferenciaSchema } from "../schemas/referenciaSchema.js";
import { create, remove, update } from "../controllers/adminReferenciaController.js";

const router = Router();
router.use(authenticate, authorize("ADMIN", "EDITOR"));
router.post("/patrimonios/:id/referencias", validateParams(patrimonioIdParamsSchema), uploadReferencia, create);
router.delete("/patrimonios/:id/referencias/:referenciaId", authorize("ADMIN"), validateParams(referenciaParamsSchema), remove);
router.patch("/patrimonios/:id/referencias/:referenciaId", validateParams(referenciaParamsSchema), validate(updateReferenciaSchema), update);
router.use(descartarUploadEmFalha);
export default router;
