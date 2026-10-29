import { auditoria } from "../services/index.js";
const { listarAuditoria, detalharAuditoria } = auditoria;

export async function list(req, res) {
    res.json({ success: true, data: await listarAuditoria(req.validatedQuery) });
}
export async function detail(req, res) {
    res.json({ success: true, data: await detalharAuditoria(req.validatedParams.id) });
}
