import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { getDashboard } from "../services/dashboardService.js";
import metricas from "../config/metricas.js";
import { consultarMetricas } from "../services/dashboardMetricasService.js";

const router = Router();
router.get("/metricas", authenticate, authorize("ADMIN", "EDITOR"), async (req, res) => {
    res.json({ success: true, data: metricas.consulta ? await consultarMetricas(req.query)
        : { disponivel: false, motivo: "DESATIVADA" } });
});
router.get("/", authenticate, authorize("ADMIN", "EDITOR"), async (_req, res) => {
    res.json({ success: true, data: await getDashboard() });
});
export default router;
