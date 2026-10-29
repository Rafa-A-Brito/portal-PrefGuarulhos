import { referencia } from "../services/index.js";
const { criarReferenciaPatrimonio, removerReferenciaPatrimonio, atualizarReferenciaPatrimonio } = referencia;

export async function create(req, res) {
    const referencia = await criarReferenciaPatrimonio(req.validatedParams.id, req.file, req.body, req.user);
    req.uploadPersistido = true;
    res.status(201).json({ success: true, data: referencia });
}

export async function remove(req, res) {
    const { id, referenciaId } = req.validatedParams;
    res.json({ success: true, data: await removerReferenciaPatrimonio(id, referenciaId, req.user) });
}

export async function update(req, res) {
    const { id, referenciaId } = req.validatedParams;
    res.json({ success: true, data: await atualizarReferenciaPatrimonio(id, referenciaId, req.body, req.user) });
}
