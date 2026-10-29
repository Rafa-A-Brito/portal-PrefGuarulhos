import { dashboard } from "../services/index.js";
const { getDashboard: getDashboardService } = dashboard;

export async function getDashboard(_req, res) {
    const resultado = await getDashboardService();
    res.json({ success: true, data: resultado });
}
