import * as service from "../services/adminService.js";

export async function createAdmin(req, res) {
    res.status(201).json({ success: true, data: await service.createAdmin(req.body) });
}

export async function listAdmins(req, res) {
    res.json({ success: true, data: await service.listAdmins(req.validatedQuery) });
}

export async function getAdmin(req, res) {
    res.json({ success: true, data: await service.getAdmin(req.validatedParams.id) });
}

export async function updateAdmin(req, res) {
    res.json({ success: true, data: await service.updateAdmin(req.validatedParams.id, req.body, req.user) });
}

export async function changeAdminStatus(req, res) {
    res.json({ success: true, data: await service.changeAdminStatus(req.validatedParams.id, req.body.ativo, req.user) });
}