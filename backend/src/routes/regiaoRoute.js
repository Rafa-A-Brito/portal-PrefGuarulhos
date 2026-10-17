import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate, { validateParams, validateQuery } from "../middlewares/validate.js";
import { createRegiaoSchema, updateRegiaoSchema, regiaoParamsSchema, listRegioesSchema } from "../schemas/regiaoSchema.js";
import * as controller from "../controllers/regiaoController.js";

export const publicRegiaoRoutes = Router();
publicRegiaoRoutes.get("/", controller.publicList);
export const adminRegiaoRoutes = Router();
adminRegiaoRoutes.use(authenticate, authorize("ADMIN", "EDITOR"));
adminRegiaoRoutes.get("/", validateQuery(listRegioesSchema), controller.adminList);
adminRegiaoRoutes.post("/", authorize("ADMIN"), validate(createRegiaoSchema), controller.create);
adminRegiaoRoutes.patch("/:id", authorize("ADMIN"), validateParams(regiaoParamsSchema), validate(updateRegiaoSchema), controller.update);
