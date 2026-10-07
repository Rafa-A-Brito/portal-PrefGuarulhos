import { Router } from "express";
import { validateQuery } from "../middlewares/validate.js";
import { listNovidadesQuerySchema } from "../schemas/novidadeSchema.js";
import { list } from "../controllers/novidadeController.js";
const router = Router();
router.get("/", validateQuery(listNovidadesQuerySchema), list);
export default router;
