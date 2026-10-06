import { criarImagemPatrimonio, removerImagemPatrimonio } from "../services/imagemService.js";

export async function upload(req, res) {
    const imagem = await criarImagemPatrimonio(
        req.validatedParams.id,
        req.file,
        req.body,
        req.user,
    );
    res.status(201).json({ success: true, data: imagem });
}

export async function remove(req, res) {
    res.json({ success: true, data: await removerImagemPatrimonio(req.validatedParams.imagemId) });
}
