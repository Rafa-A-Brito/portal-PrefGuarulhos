import { criarConteudoService } from "./conteudoService.js";
import { createExposicaoSchema } from "../schemas/exposicaoSchema.js";

export const exposicaoService = criarConteudoService({
    model: "exposicao", tabela: "exposicao", schema: createExposicaoSchema,
    imagemObrigatoria: true,
    serializar: (item) => ({ ...item }),
    preparar: (dados) => ({ ...dados }),
    orderBy: [{ publicadoEm: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }],
});
