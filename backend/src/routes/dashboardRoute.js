import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { getDashboard } from "../services/dashboardService.js";

const router = Router();
router.get("/", authenticate, authorize("ADMIN", "EDITOR"), async (_req, res) => {
    res.json({ success: true, data: await getDashboard() });
});
export default router;
