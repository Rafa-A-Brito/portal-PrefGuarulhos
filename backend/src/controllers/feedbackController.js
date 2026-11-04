import { feedback } from "../services/index.js";
import { feedbackSchema, chaveFeedbackSchema, listaFeedbackSchema, resumoFeedbackSchema, idFeedbackSchema,
    vazioFeedbackSchema, validarFeedback, validarPeriodo } from "../schemas/feedbackSchema.js";

export function criarControllerFeedback(servico = feedback) {
    return {
        async receber(req, res) {
            validarFeedback(vazioFeedbackSchema, req.query);
            const body = validarFeedback(feedbackSchema, req.body), chave = validarFeedback(chaveFeedbackSchema, req.get("Idempotency-Key"));
            const r = await servico.receber(body, chave);
            res.status(r.status).json({ success: true, data: r.data });
        },
        async listar(req, res) {
            const q = validarPeriodo(validarFeedback(listaFeedbackSchema, req.query));
            res.json({ success: true, data: await servico.listar(q) });
        },
        async resumir(req, res) {
            const q = validarPeriodo(validarFeedback(resumoFeedbackSchema, req.query));
            res.json({ success: true, data: await servico.resumir(q) });
        },
        async detalhar(req, res) {
            validarFeedback(vazioFeedbackSchema, req.query);
            const { id } = validarFeedback(idFeedbackSchema, req.params);
            res.json({ success: true, data: await servico.detalhar(id) });
        },
    };
}
