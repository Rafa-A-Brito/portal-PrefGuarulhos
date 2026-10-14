import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate, { validateParams } from "../middlewares/validate.js";
import { editorialController } from "../controllers/patrimonioEditorialController.js";
import { createFatoSchema, updateFatoSchema, createLigacaoSchema, updateLigacaoSchema, editorialParamsSchema, editorialItemParamsSchema, ordenarEditorialSchema } from "../schemas/patrimonioEditorialSchema.js";

const router = Router();
router.use(authenticate, authorize("ADMIN", "EDITOR"));
for (const [tipo, create, update] of [["fatos", createFatoSchema, updateFatoSchema], ["ligacoes", createLigacaoSchema, updateLigacaoSchema]]) {
    const controller = editorialController(tipo);
    const base = `/:id/${tipo}`;
    router.get(base, validateParams(editorialParamsSchema), controller.list);
    router.post(base, validateParams(editorialParamsSchema), validate(create), controller.create);
    router.patch(`${base}/ordem`, validateParams(editorialParamsSchema), validate(ordenarEditorialSchema), controller.reorder);
    router.patch(`${base}/:itemId`, validateParams(editorialItemParamsSchema), validate(update), controller.update);
    router.delete(`${base}/:itemId`, validateParams(editorialItemParamsSchema), controller.remove);
}
export default router;
