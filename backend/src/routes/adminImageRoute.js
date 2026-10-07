import { Router } from "express";
import descartarUploadEmFalha from "../middlewares/descartarUploadEmFalha.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { validateParams } from "../middlewares/validate.js";
import { patrimonioIdParamsSchema } from "../schemas/patrimonioSchema.js";
import { uploadImagem } from "../middlewares/uploadImage.js";
import { upload, remove } from "../controllers/adminImageController.js";
import { z } from "zod";

const router = Router();
const imagemParamsSchema = z.strictObject({ imagemId: z.uuid() });

router.use(authenticate, authorize("ADMIN", "EDITOR"));
router.post(
    "/patrimonios/:id/imagens",
    validateParams(patrimonioIdParamsSchema),
    uploadImagem("patrimonios"),
    upload
);
router.delete(
    "/patrimonios/imagens/:imagemId",
    authorize("ADMIN"),
    validateParams(imagemParamsSchema),
    remove
);

router.use(descartarUploadEmFalha);

export default router;
