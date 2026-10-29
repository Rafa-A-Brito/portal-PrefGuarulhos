import { Router } from "express";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { dashboard, dashboardMetricas } from "../services/index.js";
import metricas from "../config/metricas.js";

const { getDashboard } = dashboard;
const { consultarMetricas } = dashboardMetricas;

const router = Router();
router.get("/metricas", authenticate, authorize("ADMIN", "EDITOR"), async (req, res) => {
    res.json({ success: true, data: metricas.consulta ? await consultarMetricas(req.query)
        : { disponivel: false, motivo: "DESATIVADA" } });
});
router.get("/", authenticate, authorize("ADMIN", "EDITOR"), async (_req, res) => {
    res.json({ success: true, data: await getDashboard() });
});
export default router;
