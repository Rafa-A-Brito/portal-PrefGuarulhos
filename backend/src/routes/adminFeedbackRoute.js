import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { criarControllerFeedback } from "../controllers/feedbackController.js";
import { falhaFeedback } from "./feedbackRoute.js";

const router = Router(), controller = criarControllerFeedback();
router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
router.use(authenticate, authorize("ADMIN"));
router.get("/", controller.listar);
router.get("/resumo", controller.resumir);
router.get("/:id", controller.detalhar);
router.use(falhaFeedback);
export default router;
