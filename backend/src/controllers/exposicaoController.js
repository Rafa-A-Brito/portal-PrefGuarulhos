import { exposicao } from "../services/index.js";
const { exposicaoService: service } = exposicao;
export async function list(_req, res) {
    res.json({ success: true, data: await service.list(_req.validatedQuery, true) });
}
