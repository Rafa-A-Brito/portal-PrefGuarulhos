import { image } from "../services/index.js";
const {
    criarImagemPatrimonio,
    removerImagemPatrimonio,
    atualizarImagemPatrimonio,
} = image;

export async function upload(req, res) {
    const imagem = await criarImagemPatrimonio(
        req.validatedParams.id,
        req.file,
        req.body,
        req.user
    );
    req.uploadPersistido = true;
    res.status(201).json({ success: true, data: imagem });
}

export async function remove(req, res) {
    res.json({
        success: true,
        data: await removerImagemPatrimonio(req.validatedParams.imagemId, req.user),
    });
}

export async function update(req, res) {
    res.json({
        success: true,
        data: await atualizarImagemPatrimonio(req.validatedParams.imagemId, req.body, req.user),
    });
}
