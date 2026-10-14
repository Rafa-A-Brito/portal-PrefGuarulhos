import { z } from "zod";

const ordem = z.number().int().min(0).max(2147483647);
const uuid = z.uuid().transform(value => value.toLowerCase());
const texto = max => z.string().trim().min(1).max(max);
const fato = z.strictObject({ rotulo: texto(200), valor: texto(10000), ordem: ordem.optional() });
const ligacao = z.strictObject({ patrimonioDestinoId: uuid, texto: texto(2000), ordem: ordem.optional() });
const naoVazio = schema => schema.partial().refine(data => Object.keys(data).length > 0, "Informe ao menos um campo.");
export const createFatoSchema = fato;
export const updateFatoSchema = naoVazio(fato);
export const createLigacaoSchema = ligacao;
export const updateLigacaoSchema = naoVazio(ligacao);
export const editorialParamsSchema = z.strictObject({ id: uuid });
export const editorialItemParamsSchema = editorialParamsSchema.extend({ itemId: uuid });
export const ordenarEditorialSchema = z.strictObject({ ids: z.array(uuid).max(1000)
    .refine(ids => new Set(ids).size === ids.length, "IDs repetidos.") });
