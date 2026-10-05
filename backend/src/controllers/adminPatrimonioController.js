import * as service from "../services/patrimonioService.js";

export async function list(req, res) {
    res.json({ success: true, data: await service.listAdminPatrimonios(req.validatedQuery) });
}

export async function detail(req, res) {
    res.json({ success: true, data: await service.getAdminPatrimonio(req.validatedParams.id) });
}

export async function update(req, res) {
<<<<<<< HEAD
    res.json({
        success: true,
        data: await service.updatePatrimonio(req.validatedParams.id, req.body, req.user),
    });
}

export async function publish(req, res) {
    res.json({
        success: true,
        data: await service.changePatrimonioStatus(req.validatedParams.id, "PUBLICADO", req.user),
    });
}

export async function archive(req, res) {
    res.json({
        success: true,
        data: await service.changePatrimonioStatus(req.validatedParams.id, "ARQUIVADO", req.user),
    });
=======
    res.json({ success: true, data: await service.updatePatrimonio(req.validatedParams.id, req.body, req.user) });
}

export async function publish(req, res) {
    res.json({ success: true, data: await service.changePatrimonioStatus(req.validatedParams.id, "PUBLICADO", req.user) });
}

export async function archive(req, res) {
    res.json({ success: true, data: await service.changePatrimonioStatus(req.validatedParams.id, "ARQUIVADO", req.user) });
>>>>>>> 8f80d6bcedb0b22b49adffb83b6fa999d0463237
}
