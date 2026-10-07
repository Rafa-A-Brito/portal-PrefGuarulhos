import { exposicaoService as service } from "../services/exposicaoService.js";

export async function list(req, res) {
    res.json({ success: true, data: await service.list(req.validatedQuery) });
}
export async function detail(req, res) {
    res.json({ success: true, data: await service.detail(req.validatedParams.id) });
}
export async function create(req, res) {
    const data = await service.create(req.body, req.file, req.user);
    req.uploadPersistido = true;
    res.status(201).json({ success: true, data });
}
export async function update(req, res) {
    const data = await service.update(req.validatedParams.id, req.body, req.file, req.user);
    req.uploadPersistido = true;
    res.json({ success: true, data });
}
export async function publish(req, res) {
    res.json({ success: true, data: await service.changeStatus(req.validatedParams.id, "PUBLICADO", req.user) });
}
export async function archive(req, res) {
    res.json({ success: true, data: await service.changeStatus(req.validatedParams.id, "ARQUIVADO", req.user) });
}
export async function remove(req, res) {
    res.json({ success: true, data: await service.remove(req.validatedParams.id, req.user) });
}
