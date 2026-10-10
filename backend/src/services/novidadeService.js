import { criarConteudoService } from "./conteudoService.js";
import { createNovidadeSchema } from "../schemas/novidadeSchema.js";

import { prepararNovidade, serializarNovidade } from "../utils/novidadeData.js";
export { serializarNovidade } from "../utils/novidadeData.js";

export const novidadeService = criarConteudoService({
    model: "novidade", tabela: "novidade", schema: createNovidadeSchema,
    imagemObrigatoria: false,
    serializar: serializarNovidade,
    preparar: prepararNovidade,
    orderBy: [{ data: "desc" }, { id: "asc" }],
});
