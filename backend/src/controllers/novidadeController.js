import { novidadeService as service } from "../services/novidadeService.js";
export async function list(_req, res) {
    res.json({ success: true, data: await service.list(_req.validatedQuery, true) });
}
