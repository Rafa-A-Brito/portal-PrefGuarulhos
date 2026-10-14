import { Router } from "express";
import descartarUploadEmFalha from "../middlewares/descartarUploadEmFalha.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate, { validateParams } from "../middlewares/validate.js";
import { patrimonioIdParamsSchema } from "../schemas/patrimonioSchema.js";
import { uploadImagem } from "../middlewares/uploadImage.js";
import { upload, remove, update } from "../controllers/adminImageController.js";
import { imagemParamsSchema, updateImagemSchema } from "../schemas/imagemSchema.js";

const router = Router();

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
router.patch("/patrimonios/imagens/:imagemId", validateParams(imagemParamsSchema), validate(updateImagemSchema), update);

router.use(descartarUploadEmFalha);

export default router;
