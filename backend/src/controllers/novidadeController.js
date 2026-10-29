import { novidade } from "../services/index.js";
const { novidadeService: service } = novidade;
export async function list(_req, res) {
    res.json({ success: true, data: await service.list(_req.validatedQuery, true) });
}
