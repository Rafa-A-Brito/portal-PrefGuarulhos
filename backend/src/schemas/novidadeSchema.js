import { z } from "zod";
import { texto, textoOpcional, urlHttp, statusSchema, listConteudoQuerySchema, jsonMultipart } from "./conteudoSchema.js";
export { conteudoIdParamsSchema, statusConteudoSchema } from "./conteudoSchema.js";

export const tipoNovidadeSchema = z.enum(["NOTICIA", "EVENTO"]);
const fields = z.strictObject({
    tipo: tipoNovidadeSchema,
    tag: texto(100),
    data: z.iso.date("Informe uma data válida no formato YYYY-MM-DD."),
    titulo: texto(200),
    resumo: textoOpcional(2000),
    texto: texto(),
    quando: textoOpcional(250),
    local: textoOpcional(250),
    bloco: jsonMultipart(z.strictObject({
        dia: textoOpcional(30),
        mes: textoOpcional(30),
        legenda: textoOpcional(150),
    }).nullable().optional()),
    cta: jsonMultipart(z.strictObject({ rotulo: texto(150), url: urlHttp }).nullable().optional()),
    fontes: jsonMultipart(z.array(z.strictObject({
        veiculo: texto(200),
        assunto: textoOpcional(500),
        url: urlHttp,
    })).max(50).optional()),
    status: statusSchema.optional(),
});
export const createNovidadeSchema = fields.superRefine((data, ctx) => {
    if (data.tipo === "NOTICIA" && !data.resumo?.trim()) {
        ctx.addIssue({ code: "custom", path: ["resumo"], message: "Resumo é obrigatório para notícia." });
    }
});
export const updateNovidadeSchema = fields.partial().extend({
    imagemUrl: jsonMultipart(z.null().optional()),
});
export const listNovidadesQuerySchema = listConteudoQuerySchema.extend({ tipo: tipoNovidadeSchema.optional() });
export const adminListNovidadesQuerySchema = listNovidadesQuerySchema.extend({ status: statusSchema.optional() });
