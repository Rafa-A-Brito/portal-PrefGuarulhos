import { listarAuditoria, detalharAuditoria } from "../services/auditoriaService.js";

export async function list(req, res) {
    res.json({ success: true, data: await listarAuditoria(req.validatedQuery) });
}
export async function detail(req, res) {
    res.json({ success: true, data: await detalharAuditoria(req.validatedParams.id) });
}
