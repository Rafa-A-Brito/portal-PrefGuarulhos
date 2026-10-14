import { listarEditorial, criarEditorial, atualizarEditorial, excluirEditorial, ordenarEditorial } from "../services/patrimonioEditorialService.js";

export function editorialController(tipo) {
    return {
        list: async (req, res) => res.json({ success: true, data: await listarEditorial(tipo, req.validatedParams.id, req.user) }),
        create: async (req, res) => res.status(201).json({ success: true, data: await criarEditorial(tipo, req.validatedParams.id, req.body, req.user) }),
        update: async (req, res) => res.json({ success: true, data: await atualizarEditorial(tipo, req.validatedParams.id, req.validatedParams.itemId, req.body, req.user) }),
        remove: async (req, res) => res.json({ success: true, data: await excluirEditorial(tipo, req.validatedParams.id, req.validatedParams.itemId, req.user) }),
        reorder: async (req, res) => res.json({ success: true, data: await ordenarEditorial(tipo, req.validatedParams.id, req.body, req.user) }),
    };
}
