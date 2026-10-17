import * as service from "../services/regiaoService.js";

export async function publicList(_req, res) {
    res.json({ success: true, data: await service.listarRegioesPublicas() });
}
export async function adminList(req, res) {
    res.json({ success: true, data: await service.listarRegioesAdmin(req.validatedQuery) });
}
export async function create(req, res) {
    res.status(201).json({ success: true, data: await service.salvarRegiao(null, req.body, req.user) });
}
export async function update(req, res) {
    res.json({ success: true, data: await service.salvarRegiao(req.validatedParams.id, req.body, req.user) });
}
