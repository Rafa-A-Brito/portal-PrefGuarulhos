import { Router } from "express";
import { createAdmin, listAdmins, getAdmin, updateAdmin, changeAdminStatus } from "../controllers/adminController.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate, { validateParams, validateQuery } from "../middlewares/validate.js";
import { createAdminSchema, listAdminsQuerySchema, adminIdParamsSchema, updateAdminSchema, adminStatusSchema } from "../schemas/adminSchema.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));
router.post("/", validate(createAdminSchema), createAdmin);
router.get("/", validateQuery(listAdminsQuerySchema), listAdmins);
router.get("/:id", validateParams(adminIdParamsSchema), getAdmin);
router.patch("/:id", validateParams(adminIdParamsSchema), validate(updateAdminSchema), updateAdmin);
router.patch("/:id/status", validateParams(adminIdParamsSchema), validate(adminStatusSchema), changeAdminStatus);

export default router;