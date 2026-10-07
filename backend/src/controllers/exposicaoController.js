import { exposicaoService as service } from "../services/exposicaoService.js";
export async function list(_req, res) {
    res.json({ success: true, data: await service.list(_req.validatedQuery, true) });
}
