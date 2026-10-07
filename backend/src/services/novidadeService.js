import { criarConteudoService } from "./conteudoService.js";
import { createNovidadeSchema } from "../schemas/novidadeSchema.js";

export function serializarNovidade(item) {
    const { blocoDia, blocoMes, blocoLegenda, ctaRotulo, ctaUrl, ...resto } = item;
    return {
        ...resto,
        data: item.data.toISOString().slice(0, 10),
        bloco: { dia: blocoDia, mes: blocoMes, legenda: blocoLegenda },
        cta: ctaUrl ? { rotulo: ctaRotulo, url: ctaUrl } : null,
        fontes: item.fontes ?? [],
    };
}
export const novidadeService = criarConteudoService({
    model: "novidade", tabela: "novidade", schema: createNovidadeSchema,
    imagemObrigatoria: false,
    serializar: serializarNovidade,
    preparar: ({ bloco, cta, data, ...dados }) => ({
        ...dados,
        data: new Date(`${data}T00:00:00.000Z`),
        ...(bloco !== undefined && { blocoDia: bloco?.dia ?? null, blocoMes: bloco?.mes ?? null, blocoLegenda: bloco?.legenda ?? null }),
        ...(cta !== undefined && { ctaRotulo: cta?.rotulo ?? null, ctaUrl: cta?.url ?? null }),
    }),
    orderBy: [{ data: "desc" }, { id: "asc" }],
});
