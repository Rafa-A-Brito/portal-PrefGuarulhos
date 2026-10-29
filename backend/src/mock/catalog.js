import { randomUUID } from "node:crypto";
import { store } from "./store.js";
import { clone, page, find, contains, equals, byName, editable, role, audit, byOrder } from "./helpers.js";
import { createPatrimonioSchema, localizacaoSchema } from "../schemas/patrimonioSchema.js";
import { SituacaoPatrimonio } from "../config/prismaTypes.js";
import { slugify } from "../utils/slug.js";
import BadRequestError from "../errors/BadRequestError.js";
import NotFoundError from "../errors/NotFoundError.js";
import ConflictError from "../errors/ConflictError.js";
import { legadoEditorial } from "../utils/identidadeEditorial.js";

export const getRow = id => find(store.patrimonios, id, "Patrimônio não encontrado.", "PATRIMONIO_NOT_FOUND");
const category = id => find(store.categorias, id, "Categoria não encontrada.", "CATEGORIA_NOT_FOUND");
const summaryCategory = c => ({ id: c.id, nome: c.nome, slug: c.slug });
function region(id, admin) {
    const r = store.regioes.find(row => row.id === id);
    return r ? { id: r.id, nome: r.nome, slug: r.slug, ...(admin && { ativo: r.ativo }) } : null;
}
export function patrimonioDto(row, admin = true, detail = true) {
    const categoria = category(row.categoriaId);
    const data = { numeroExibicao: row.numeroExibicao, ordemExibicao: row.ordemExibicao, regiao: region(row.regiaoId, admin),
        id: row.id, nome: row.nome, slug: row.slug, descricaoResumida: row.descricaoResumida, situacao: row.situacao,
        publicadoEm: row.publicadoEm, categoria: detail ? clone(categoria) : summaryCategory(categoria),
        categoriasAdicionais: row.categoriasAdicionais.map(category).sort(byName).map(admin && detail ? clone : summaryCategory),
        localizacao: clone(row.localizacao), imagens: clone([...row.imagens].sort((a, b) => Number(b.principal) - Number(a.principal) || byOrder(a, b))) };
    if (!detail) data.imagens = data.imagens.slice(0, 1).map(({ id, url, titulo, textoAlternativo, principal }) => ({ id, url, titulo, textoAlternativo, principal }));
    if (detail) Object.assign(data, { descricao: row.descricao, historia: row.historia, importanciaCultural: row.importanciaCultural,
        updatedAt: row.updatedAt, detalhes: clone(row.detalhes), documentos: clone(row.documentos), fatos: clone([...row.fatos].sort(byOrder)),
        ligacoes: row.ligacoes.map(l => ({ ...clone(l), destino: store.patrimonios.find(p => p.id === l.patrimonioDestinoId) }))
            .filter(l => admin || (l.destino?.status === "PUBLICADO" && !legadoEditorial(l.destino))).sort(byOrder)
            .map(l => ({ ...l, destino: { id: l.destino.id, nome: l.destino.nome, slug: l.destino.slug, ...(admin && { status: l.destino.status }) } })),
        ...(!admin && { rotas: clone(row.rotas) }) });
    if (admin) Object.assign(data, { regiaoId: row.regiaoId, status: row.status, arquivadoEm: row.arquivadoEm,
        ...(detail && { categoriaId: row.categoriaId, createdBy: row.createdBy, updatedBy: row.updatedBy, createdAt: row.createdAt }) });
    if (!admin && detail) {
        data.imagens = data.imagens.map(({ id, url, titulo, textoAlternativo, credito, fonte, ordem, principal }) =>
            ({ id, url, titulo, textoAlternativo, credito, fonte, ordem, principal }));
        data.documentos = data.documentos.map(({ id, titulo, descricao, url, tipo, fonte, dataDocumento, mimeType }) =>
            ({ id, titulo, descricao, url, tipo, fonte, dataDocumento, mimeType }));
    }
    return data;
}
function list(q, admin) {
    const rows = store.patrimonios.filter(p => {
        const cats = [category(p.categoriaId), ...p.categoriasAdicionais.map(category)];
        return (admin ? !q.status || p.status === q.status : p.status === "PUBLICADO") &&
            (!q.busca || [p.nome, p.descricao, p.descricaoResumida, p.historia, p.importanciaCultural,
                ...p.detalhes.flatMap(d => [d.titulo, d.texto]), ...cats.flatMap(c => [c.nome, c.slug])].some(t => contains(t, q.busca))) &&
            (!q.categoria || cats.some(c => equals(c.nome, q.categoria) || equals(c.slug, q.categoria))) &&
            (!q.situacao || p.situacao === q.situacao) && (!q.bairro || equals(p.localizacao?.bairro, q.bairro)) &&
            (!q.regiao || region(p.regiaoId)?.slug === q.regiao) && (q.numeroExibicao === undefined || p.numeroExibicao === q.numeroExibicao);
    }).sort((a, b) => (a.ordemExibicao ?? Infinity) - (b.ordemExibicao ?? Infinity) || byName(a, b));
    return page(rows.map(p => patrimonioDto(p, admin, false)), q);
}
export async function listPatrimonios(q) { return list(q, false); }
export async function listAdminPatrimonios(q) { return list(q, true); }
export async function getAdminPatrimonio(id) { return patrimonioDto(getRow(id)); }
export async function getPatrimonioBySlug(slug) {
    const row = store.patrimonios.find(p => p.slug === slug && p.status === "PUBLICADO");
    if (!row) throw Object.assign(new NotFoundError("Patrimônio não encontrado."), { code: "PATRIMONIO_NOT_FOUND" });
    return patrimonioDto(row, false);
}
function validateRelations(data, current) {
    const principal = data.categoriaId ?? current?.categoriaId;
    category(principal);
    const extras = data.categoriasAdicionais ?? current?.categoriasAdicionais ?? [];
    if (extras.includes(principal)) throw new BadRequestError("A categoria principal não deve estar entre as adicionais.");
    extras.forEach(category);
    if (data.regiaoId != null) {
        const r = find(store.regioes, data.regiaoId, "Região não encontrada.");
        if (!r.ativo) throw new ConflictError("A região está inativa. Selecione uma região ativa.");
    }
    if (data.numeroExibicao != null && store.patrimonios.some(p => p.id !== current?.id && p.numeroExibicao === data.numeroExibicao)) {
        throw new ConflictError("Número de exibição já utilizado, inclusive por um patrimônio arquivado.");
    }
}
export async function createPatrimonio(input, createdBy) {
    const data = createPatrimonioSchema.parse(input);
    validateRelations(data);
    const base = slugify(data.nome);
    let slug = base;
    for (let n = 2; store.patrimonios.some(p => p.slug === slug); n++) slug = `${base.slice(0, 210)}-${n}`;
    const row = { id: randomUUID(), regiaoId: null, numeroExibicao: null, ordemExibicao: null, historia: null, importanciaCultural: null,
        categoriasAdicionais: [], localizacao: null, ...data, slug, status: "RASCUNHO", createdBy, updatedBy: null,
        createdAt: new Date(), updatedAt: new Date(), publicadoEm: null, arquivadoEm: null,
        imagens: [], documentos: [], fatos: [], ligacoes: [], detalhes: [], rotas: [] };
    if (row.localizacao) row.localizacao = { id: randomUUID(), patrimonioId: row.id, ...row.localizacao };
    store.patrimonios.push(row);
    audit(createdBy, "PATRIMONIO_CREATE", "Patrimonio", row.id, null, patrimonioDto(row));
    return patrimonioDto(row);
}
export async function updatePatrimonio(id, data, user) {
    const row = getRow(id); editable(row, user); validateRelations(data, row);
    let localizacao = row.localizacao;
    if (data.localizacao) {
        const change = data.localizacao;
        if ((change.latitude !== undefined) !== (change.longitude !== undefined)) throw new BadRequestError("Informe latitude e longitude juntas.");
        const merged = { ...localizacao, ...change };
        const { id: _id, patrimonioId: _parent, ...fields } = merged;
        localizacaoSchema.parse(Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null)));
        localizacao = { id: localizacao?.id ?? randomUUID(), patrimonioId: id, ...merged };
    }
    const before = patrimonioDto(row);
    Object.assign(row, clone(data), { localizacao, updatedBy: user.id, updatedAt: new Date() });
    audit(user, "PATRIMONIO_UPDATE", "Patrimonio", id, before, patrimonioDto(row));
    return patrimonioDto(row);
}
export async function changePatrimonioStatus(id, status, user) {
    role(user, true);
    const row = getRow(id), before = patrimonioDto(row);
    if (row.status === status) return before;
    if (status === "PUBLICADO") {
        const { id: _id, patrimonioId: _parent, ...loc } = row.localizacao ?? {};
        createPatrimonioSchema.parse({ nome: row.nome, descricao: row.descricao, descricaoResumida: row.descricaoResumida,
            categoriaId: row.categoriaId, categoriasAdicionais: row.categoriasAdicionais, situacao: row.situacao,
            historia: row.historia ?? undefined, importanciaCultural: row.importanciaCultural ?? undefined,
            localizacao: row.localizacao ? Object.fromEntries(Object.entries(loc).filter(([, v]) => v != null)) : undefined });
        for (const field of ["numeroExibicao", "ordemExibicao"]) if (row[field] == null) {
            const next = Math.max(0, ...store.patrimonios.map(p => p[field] ?? 0)) + 1;
            if (next > 2147483647) throw new ConflictError(`Limite de ${field} atingido.`);
            row[field] = next;
        }
        row.publicadoEm = new Date(); row.arquivadoEm = null;
    } else if (status === "ARQUIVADO") row.arquivadoEm = new Date();
    else throw new BadRequestError("Transição de status inválida.");
    row.status = status; row.updatedBy = user.id; row.updatedAt = new Date();
    audit(user, status === "PUBLICADO" ? "PATRIMONIO_PUBLISH" : "PATRIMONIO_ARCHIVE", "Patrimonio", id, before, patrimonioDto(row));
    return patrimonioDto(row);
}
export async function listarRegioesPublicas() { return store.regioes.filter(r => r.ativo).sort(byName).map(r => region(r.id)); }
export async function listarRegioesAdmin(q) {
    return page(store.regioes.filter(r => (q.ativo === undefined || r.ativo === q.ativo) &&
        (!q.busca || contains(r.nome, q.busca) || contains(r.slug, q.busca))).sort(byName), q);
}
export async function salvarRegiao(id, data, user) {
    role(user, true);
    const row = id ? find(store.regioes, id) : { id: randomUUID(), descricao: null, ativo: true, createdAt: new Date() };
    if (store.regioes.some(r => r.id !== id && r.slug === data.slug)) throw new ConflictError("Já existe uma região com este slug.");
    const before = id ? clone(row) : null;
    Object.assign(row, data, { updatedAt: new Date() });
    if (!id) store.regioes.push(row);
    audit(user, id ? "REGIAO_UPDATE" : "REGIAO_CREATE", "RegiaoPatrimonio", row.id, before, row);
    return clone(row);
}
export async function listCategorias() { return clone([...store.categorias].sort(byName)); }
export async function getMediaPatrimonio(id) {
    const p = store.patrimonios.find(p => p.id === id);
    return p ? { id, status: p.status } : null;
}
export async function getDashboard() {
    const rows = store.patrimonios, count = predicate => rows.filter(predicate).length;
    const status = Object.fromEntries(["RASCUNHO", "PUBLICADO", "ARQUIVADO"].map(s => [s, count(p => p.status === s)]));
    const bairros = [...new Set(rows.map(p => p.localizacao?.bairro?.trim() || "Não informado"))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const legados = rows.filter(legadoEditorial).sort(byName);
    return { total: rows.length, ...status,
        porCategoria: [...store.categorias].sort(byName).map(c => ({ ...summaryCategory(c), quantidade: count(p => p.categoriaId === c.id), quantidadeSecundaria: count(p => p.categoriasAdicionais.includes(c.id)) })),
        porBairro: bairros.map(bairro => ({ bairro, quantidade: count(p => (p.localizacao?.bairro?.trim() || "Não informado") === bairro) })),
        porSituacao: Object.values(SituacaoPatrimonio).map(situacao => ({ situacao, quantidade: count(p => p.situacao === situacao) })),
        porRegiao: [...store.regioes].sort(byName).map(r => ({ ...region(r.id, true), quantidade: count(p => p.regiaoId === r.id) })), semRegiao: count(p => p.regiaoId == null),
        legados: { total: legados.length, arquivados: legados.filter(p => p.status === "ARQUIVADO").length,
            itens: legados.map(({ id, nome, slug, status }) => ({ id, nome, slug, status, canonico: legadoEditorial({ id, slug }).canonico })) },
        meta: { baseContagem: "TODOS_OS_STATUS", categoria: "PRINCIPAL", publicados: status.PUBLICADO } };
}
