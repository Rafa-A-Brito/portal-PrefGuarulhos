import { z } from "zod";

const uuid = z.uuid().transform(value => value.toLowerCase());
const code = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,99}$/);
const date = z.iso.datetime({ offset: true }).transform(value => new Date(value));
// Limite da página evita overflow no OFFSET; strings vazias, arrays e objetos
// não são convertidos silenciosamente em números.
const positive = max => z.string().regex(/^[1-9]\d{0,8}$/).transform(Number).pipe(z.number().int().max(max));
export const auditoriaParamsSchema = z.strictObject({ id: uuid });
export const auditoriaQuerySchema = z.strictObject({
    userId: uuid.optional(), action: code.optional(), entity: code.optional(), entityId: uuid.optional(),
    inicio: date.optional(), fim: date.optional(),
    pagina: positive(1000000).default(1), limite: positive(100).default(20),
}).refine(q => !q.inicio || !q.fim || q.inicio <= q.fim, { path: ["fim"], message: "O fim deve ser igual ou posterior ao início." });
