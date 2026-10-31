import { randomUUID } from "node:crypto";
import { store } from "./store.js";
import { clone, page, find, contains, editable, role, audit } from "./helpers.js";
import { createExposicaoSchema } from "../schemas/exposicaoSchema.js";
import { createNovidadeSchema } from "../schemas/novidadeSchema.js";
import { slugify } from "../utils/slug.js";
import { removerArquivoUpload } from "../utils/arquivoUpload.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import { removeFile } from "./media.js";

export function contentService(kind) {
    const rows = store[kind], exposition = kind === "exposicoes", schema = exposition ? createExposicaoSchema : createNovidadeSchema;
    const prefix = exposition ? "EXPOSICAO" : "NOVIDADE", entity = exposition ? "Exposicao" : "Novidade";
    function dto(row, publico) {
        const result = clone(row);
        if (!exposition) result.bloco = { dia: row.bloco?.dia ?? null, mes: row.bloco?.mes ?? null, legenda: row.bloco?.legenda ?? null };
        if (publico) { delete result.createdBy; delete result.updatedBy; }
        return result;
    }
    function validate(body, file, current, user) {
        role(user);
        if (current) editable(current, user);
        if (user.role === "EDITOR" && body.status && body.status !== "RASCUNHO") throw new ForbiddenError("Editor cria e edita somente rascunhos.");
        if (file && body.imagemUrl === null) throw new BadRequestError("Escolha entre substituir e remover a imagem.");
        const { id: _id, slug: _slug, createdBy: _cb, updatedBy: _ub, createdAt: _ca, updatedAt: _ua,
            publicadoEm: _p, arquivadoEm: _a, imagemUrl: _img, ...existing } = current ?? {};
        const { imagemUrl: _remove, ...changes } = body;
        const data = schema.parse({ ...existing, ...changes });
        const imagemUrl = file?.url ?? (body.imagemUrl === null ? null : current?.imagemUrl ?? null);
        if (exposition && !imagemUrl) throw new BadRequestError("Envie a imagem da exposição.");
        return { ...data, imagemUrl };
    }
    function statusFields(row, previous) {
        if (row.status === previous?.status) return;
        row.publicadoEm = row.status === "PUBLICADO" ? new Date() : previous?.publicadoEm ?? null;
        row.arquivadoEm = row.status === "ARQUIVADO" ? new Date() : null;
    }
    return {
        async list(q, publico = false) {
            const result = rows.filter(r => (publico ? r.status === "PUBLICADO" : !q.status || r.status === q.status) &&
                (!q.tipo || q.tipo === r.tipo) && (!q.busca || contains(r.titulo, q.busca)))
                .sort((a, b) => exposition ? (b.publicadoEm?.getTime() ?? -Infinity) - (a.publicadoEm?.getTime() ?? -Infinity) || b.createdAt - a.createdAt || a.id.localeCompare(b.id)
                    : b.data.localeCompare(a.data) || a.id.localeCompare(b.id));
            return page(result.map(r => dto(r, publico)), q);
        },
        async detail(id) { return dto(find(rows, id, "Conteúdo não encontrado.")); },
        async create(body, file, user) {
            const data = validate(body, file, null, user), base = slugify(data.titulo).slice(0, 180);
            const row = { id: randomUUID(), slug: rows.some(r => r.slug === base) ? `${base}-${randomUUID()}` : base,
                ...(exposition ? { ctaSaibaMais: null } : { resumo: null, quando: null, local: null, bloco: null, cta: null, fontes: [] }),
                ...data, status: data.status ?? "RASCUNHO", createdBy: user.id, updatedBy: null, createdAt: new Date(), updatedAt: new Date() };
            statusFields(row); rows.push(row);
            audit(user, `${prefix}_CREATE`, entity, row.id, null, row); return dto(row);
        },
        async update(id, body, file, user) {
            if (!Object.keys(body).length && !file) throw new BadRequestError("Informe algum campo para atualizar.");
            const row = find(rows, id, "Conteúdo não encontrado."), before = clone(row);
            const data = validate(body, file, row, user);
            // Falha de filesystem não pode deixar um registro que aponta para arquivo removido.
            if (before.imagemUrl !== data.imagemUrl && !rows.some(r => r.id !== id && r.imagemUrl === before.imagemUrl)) await removerArquivoUpload(before.imagemUrl);
            Object.assign(row, data, { updatedBy: user.id, updatedAt: new Date() }); statusFields(row, before);
            const verb = row.status !== before.status && row.status === "PUBLICADO" ? "PUBLISH" : row.status !== before.status && row.status === "ARQUIVADO" ? "ARCHIVE" : "UPDATE";
            audit(user, `${prefix}_${verb}`, entity, id, before, row); return dto(row);
        },
        async changeStatus(id, status, user) { role(user, true); return this.update(id, { status }, null, user); },
        async remove(id, user) {
            role(user, true); const row = find(rows, id, "Conteúdo não encontrado.");
            await removeFile(row);
            rows.splice(rows.indexOf(row), 1); audit(user, `${prefix}_DELETE`, entity, id, row); return { id };
        },
    };
}
