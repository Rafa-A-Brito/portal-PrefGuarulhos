import path from "node:path";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { databaseIdentity } from "../scripts/assert-test-db.js";
import { slugify } from "../src/utils/slug.js";
import { localizacaoSchema, updatePatrimonioSchema } from "../src/schemas/patrimonioSchema.js";
import { LEGACY_SLUG_ALIASES, normalizarNome, repararTexto, detailSchema, validarImagem } from "./import-patrimonios.js";

export const SYNC_INCLUDE = {
    localizacao: true, imagens: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
    detalhes: { orderBy: [{ ordem: "asc" }, { id: "asc" }] }, documentos: true,
    rotas: true, categoriasAdicionais: true,
};
const MERGES = new Map([
    ["casa-jose-mauricio", "Casarão da Nossa História"],
    ["casarao-da-familia-albertis-demolido-em-2023", "Casarão do Sítio Ponte Alta"],
]);
const FIELDS = ["nome", "descricao", "descricaoResumida", "historia", "importanciaCultural", "situacao"];
const LOCATION = ["endereco", "numero", "complemento", "bairro", "cep", "latitude", "longitude", "cidade", "uf"];
const REQUIRED_LOCATION = LOCATION.filter(k => k !== "complemento");
const plain = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const withoutIdentity = ({ id: _id, patrimonioId: _parent, ...data }) => data;
const detailData = d => ({ icone: d.icone ?? null, titulo: d.titulo, texto: d.texto, ordem: d.ordem });
const detailKey = d => normalizarNome(repararTexto(d.titulo));
const documentKey = d => JSON.stringify([d.url, d.titulo, d.tipo]);
const digest = buffer => createHash("sha256").update(buffer).digest("hex");

// Função pura: todo conflito é resolvido antes da primeira escrita.
export function planSync({ source, existing, categories, images = new Map() }) {
    const report = { fonte_canonica: source.length, merges_planejados: 0, updates_planejados: 0,
        erros: [], conflitos: [], warnings: [], itens: [] };
    const operations = [];
    const claimed = new Set();
    const sourceSlugs = new Set();
    const sourceNames = new Set();
    for (const item of source) {
        const slug = slugify(item.nome || "");
        const row = { nome: item.nome, slug, acao: "SEM_ALTERACAO", diff: [] };
        report.itens.push(row);
        try {
            const name = normalizarNome(item.nome);
            if (!slug || sourceSlugs.has(slug) || sourceNames.has(name)) throw new Error("Nome/slug repetido na fonte.");
            sourceSlugs.add(slug); sourceNames.add(name);
            const candidates = existing.filter(p => p.slug === slug || p.slug === LEGACY_SLUG_ALIASES.get(slug) || normalizarNome(p.nome) === name);
            if (candidates.length !== 1) throw new Error("Identidade canônica ausente ou ambígua; sync exige exatamente um registro existente.");
            const current = candidates[0];
            row.id = current.id;
            row.slug = current.slug;
            if (claimed.has(current.id)) throw new Error("Duas entradas apontam ao mesmo registro.");
            claimed.add(current.id);
            const duplicateName = MERGES.get(slug);
            const duplicates = duplicateName ? existing.filter(p => p.slug === slugify(duplicateName) || normalizarNome(p.nome) === normalizarNome(duplicateName)) : [];
            if (duplicates.length > 1 || duplicates.some(d => d.id === current.id)) throw new Error("Duplicado de merge ambíguo.");
            const duplicate = duplicates[0];
            if (duplicate && claimed.has(duplicate.id)) throw new Error("Duplicado já usado em outra operação.");
            if (duplicate) claimed.add(duplicate.id);
            const changes = {};
            for (const field of FIELDS) if (item[field] !== undefined) changes[field] = repararTexto(item[field]);
            if (item.categoria !== undefined) {
                const matches = categories.filter(c => normalizarNome(c.nome) === normalizarNome(item.categoria));
                if (matches.length !== 1) throw new Error("Categoria ausente ou ambígua: " + item.categoria);
                changes.categoriaId = matches[0].id;
            }
            updatePatrimonioSchema.parse(changes);
            const diff = (field, before, after) => { if (!equal(before, after)) row.diff.push({ campo: field, atual: before ?? null, novo: after ?? null }); };
            const data = {};
            for (const [field, value] of Object.entries(changes)) if (!equal(current[field], value)) { data[field] = value; diff(field, current[field], value); }
            const locationPatch = Object.fromEntries(LOCATION.filter(k => item[k] !== undefined).map(k => [k, item[k]]));
            const base = current.localizacao ? Object.fromEntries(LOCATION.filter(k => current.localizacao[k] != null).map(k => [k, ["latitude", "longitude"].includes(k) && String(current.localizacao[k]).trim() ? Number(current.localizacao[k]) : current.localizacao[k]])) : {};
            const completeLocation = { ...base, ...locationPatch };
            // Valida todos os canônicos, mesmo sem patch; defaults do schema não suprem dados ausentes.
            const missing = REQUIRED_LOCATION.filter(k => completeLocation[k] == null || (typeof completeLocation[k] === "string" && !completeLocation[k].trim()));
            if (missing.length) throw new Error("Localização incompleta: " + missing.join(", ") + ".");
            const locationCreate = localizacaoSchema.parse(completeLocation);
            const location = {};
            for (const key of Object.keys(locationPatch)) {
                const before = base[key];
                if (!equal(before, locationCreate[key])) { location[key] = locationCreate[key]; diff("localizacao." + key, before, locationCreate[key]); }
            }
            if (name === "antigo poco municipal") {
                report.warnings.push({ slug, motivo: "Localização e identificação não confirmadas por inventário; manter RASCUNHO." });
                if (current.status !== "RASCUNHO") throw new Error("Poço deve estar em RASCUNHO; revisão editorial necessária, sem transição automática.");
            }
            if (/carbonell|albertis|casa-jose-mauricio/.test(slug)) report.warnings.push({ slug, motivo: "Divergência documental ou localização aproximada registrada nos detalhes da fonte." });

            let details;
            if (item.detalhes !== undefined) {
                detailSchema.parse(item.detalhes);
                const seen = new Set();
                details = item.detalhes.map(d => ({ icone: d.icone ?? null, titulo: repararTexto(d.titulo), texto: repararTexto(d.texto) }));
                for (const d of details) {
                    if (seen.has(detailKey(d))) throw new Error("Título de detalhe repetido na fonte.");
                    seen.add(detailKey(d));
                }
                // A fonte vence para títulos conhecidos; detalhes editoriais adicionais são preservados.
                for (const d of [...current.detalhes, ...(duplicate?.detalhes ?? [])]) {
                    if (!seen.has(detailKey(d))) { details.push({ icone: d.icone, titulo: repararTexto(d.titulo), texto: repararTexto(d.texto) }); seen.add(detailKey(d)); }
                }
                details = details.map((d, ordem) => ({ ...d, ordem }));
                diff("detalhes", current.detalhes.map(detailData), details);
            }
            const image = images.get(slug);
            const imageUrls = new Set(current.imagens.map(i => i.url));
            const newImages = [];
            let hasCover = current.imagens.some(i => i.principal);
            let order = Math.max(-1, ...current.imagens.map(i => i.ordem)) + 1;
            for (const candidate of [...(duplicate?.imagens ?? []), ...(image ? [{ url: image.url, textoAlternativo: item.imagem === "patrimonio_sem_imagem.png" ? "Imagem indisponível" : item.nome, principal: false }] : [])]) {
                if (imageUrls.has(candidate.url)) continue;
                const data = { ...withoutIdentity(candidate), ordem: order++, principal: !hasCover };
                hasCover ||= data.principal;
                newImages.push(data); imageUrls.add(candidate.url);
            }
            if (newImages.length) diff("imagens.adicionar", [], newImages);
            if (image && !image.reuse) diff("imagem.arquivoLocal", null, image.url);
            const docs = new Set(current.documentos.map(documentKey));
            const newDocuments = (duplicate?.documentos ?? []).filter(d => { const key = documentKey(d); if (docs.has(key)) return false; docs.add(key); return true; }).map(withoutIdentity);
            if (newDocuments.length) diff("documentos.adicionar", [], newDocuments);
            const categoryId = changes.categoriaId ?? current.categoriaId;
            const extraIds = new Set(current.categoriasAdicionais.map(c => c.categoriaId));
            const newCategories = [...new Set([...(duplicate?.categoriasAdicionais ?? []).map(c => c.categoriaId), ...(duplicate && duplicate.categoriaId !== categoryId ? [duplicate.categoriaId] : [])])].filter(id => id !== categoryId && !extraIds.has(id));
            if (newCategories.length) diff("categoriasAdicionais.adicionar", [], newCategories);
            const removePrimaryExtra = extraIds.has(categoryId);
            if (removePrimaryExtra) diff("categoriasAdicionais.removerPrincipal", categoryId, null);
            const routes = (duplicate?.rotas ?? []).map(r => ({ ...r, acao: current.rotas.some(c => c.rotaId === r.rotaId) ? "CONSOLIDAR" : "MOVER" }));
            if (routes.length) diff("rotas", routes.map(({ acao: _acao, ...r }) => r), routes);
            const archive = duplicate && duplicate.status !== "ARQUIVADO";
            if (archive) {
                diff("duplicado.status", duplicate.status, "ARQUIVADO");
                report.merges_planejados++;
            }
            if (duplicate) row.merge = { id: duplicate.id, slug: duplicate.slug, destinoId: current.id, acao: archive ? "ARQUIVAR" : "JA_ARQUIVADO", preservar: ["localizacao", "imagens", "detalhes", "documentos", "autoria", "publicadoEm"], rotas: routes };
            if (row.diff.length) {
                row.acao = name === "antigo poco municipal" ? "ATUALIZAR_COM_RESSALVA" : "ATUALIZAR";
                report.updates_planejados++;
                operations.push({ current, duplicate, data, location, locationCreate, details, newImages, newDocuments, newCategories, removePrimaryExtra, categoryId, routes, archive, image, row });
            }
        } catch (error) {
            row.acao = "CONFLITO";
            report.conflitos.push({ slug, motivo: error.message });
        }
    }
    return { report, operations };
}

async function applyOperation(tx, op, author) {
    const id = op.current.id;
    if (Object.keys(op.data).length) await tx.patrimonio.update({ where: { id }, data: op.data });
    if (op.location && Object.keys(op.location).length) await tx.localizacao.upsert({ where: { patrimonioId: id }, create: { ...op.locationCreate, patrimonioId: id }, update: op.location });
    if (op.details && op.row.diff.some(d => d.campo === "detalhes")) {
        const used = new Set();
        for (const detail of op.details) {
            const current = op.current.detalhes.find(d => !used.has(d.id) && detailKey(d) === detailKey(detail));
            if (current) {
                used.add(current.id);
                if (!equal(detailData(current), detail)) await tx.patrimonioDetalhe.update({ where: { id: current.id }, data: detail });
            } else await tx.patrimonioDetalhe.create({ data: { ...detail, patrimonioId: id } });
        }
        const repeated = op.current.detalhes.filter(d => !used.has(d.id)).map(d => d.id);
        if (repeated.length) await tx.patrimonioDetalhe.deleteMany({ where: { id: { in: repeated }, patrimonioId: id } });
    }
    for (const data of op.newImages) await tx.patrimonioImagem.create({ data: { ...data, patrimonioId: id } });
    for (const data of op.newDocuments) await tx.patrimonioDocumento.create({ data: { ...data, patrimonioId: id } });
    for (const categoriaId of op.newCategories) await tx.patrimonioCategoria.create({ data: { patrimonioId: id, categoriaId } });
    if (op.removePrimaryExtra) await tx.patrimonioCategoria.delete({ where: { patrimonioId_categoriaId: { patrimonioId: id, categoriaId: op.categoryId } } });
    for (const route of op.routes) {
        if (route.acao === "CONSOLIDAR") await tx.rotaPatrimonio.delete({ where: { id: route.id } });
        else await tx.rotaPatrimonio.update({ where: { id: route.id }, data: { patrimonioId: id } });
    }
    if (op.archive) await tx.patrimonio.update({ where: { id: op.duplicate.id }, data: { status: "ARQUIVADO", arquivadoEm: new Date() } });
    await tx.auditLog.create({ data: { userId: author.id, action: "SYNC_PATRIMONIO", entity: "Patrimonio", entityId: id,
        oldValues: plain({ canonico: op.current, duplicado: op.duplicate ?? null }), newValues: plain(op.row) } });
}

export async function syncPatrimonios({ prisma, databaseUrl, options, source, sourceDir, uploadDir, io }) {
    const target = databaseIdentity(databaseUrl);
    if ([options.backfillImages, options.backfillLocation, options.backfillDetails].some(Boolean)) throw new Error("Sync não aceita backfill simultâneo.");
    if (options.status && options.status !== "RASCUNHO") throw new Error("Sync preserva status.");
    if (options.apply && (options.confirmDb !== target.database || !options.createdByEmail)) throw new Error("Confirmação do banco/autor ausente ou divergente.");
    const copied = [];
    const destinationDir = path.join(uploadDir, "patrimonios");
    try {
        return await prisma.$transaction(async tx => {
            // PostgreSQL proíbe qualquer DML mesmo se um bug alcançar o ramo dry-run.
            if (!options.apply) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            const [identity] = await tx.$queryRawUnsafe("SELECT current_database() AS banco");
            if (identity.banco !== target.database) throw new Error("Banco conectado diverge da URL confirmada.");
            if (options.apply) {
                await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
                await tx.$queryRawUnsafe("SELECT id FROM patrimonio ORDER BY id FOR UPDATE");
            }
            let author;
            if (options.createdByEmail) {
                author = await tx.user.findUnique({ where: { email: options.createdByEmail.toLowerCase() } });
                if (!author?.isActive || !["ADMIN", "EDITOR"].includes(author.role)) throw new Error("Autor deve ser usuário existente ativo ADMIN ou EDITOR.");
            }
            const existing = await tx.patrimonio.findMany({ include: SYNC_INCLUDE, orderBy: { id: "asc" } });
            const categories = await tx.categoria.findMany();
            const images = new Map();
            const errors = [];
            for (const item of source) {
                try { images.set(slugify(item.nome), await validarImagem(item.imagem, sourceDir, destinationDir, io)); }
                catch (error) { errors.push({ slug: slugify(item.nome), motivo: error.code ?? error.message }); }
            }
            const { report, operations } = planSync({ source, existing, categories, images });
            Object.assign(report, { modo: options.apply ? "apply" : "dry-run", banco: identity.banco, host: new URL(databaseUrl).hostname, porta: target.port, aplicados: 0 });
            report.erros.push(...errors);
            if (!options.apply || report.erros.length || report.conflitos.length) return report;
            for (const op of operations) {
                if (op.image && !op.image.reuse) {
                    await io.mkdir(destinationDir, { recursive: true });
                    const rootReal = await io.realpath(uploadDir);
                    if ((await io.realpath(destinationDir)) !== path.join(rootReal, "patrimonios")) throw new Error("Pasta de destino redirecionada.");
                    try {
                        await io.copyFile(op.image.source, op.image.destination, constants.COPYFILE_EXCL);
                        copied.push({ path: op.image.destination, stat: await io.lstat(op.image.destination), hash: op.image.sourceHash });
                    } catch (error) { if (error.code !== "EEXIST") throw error; }
                    // Revalida arquivo e hash: não reutiliza destino concorrente diferente.
                    const checked = await validarImagem(path.basename(op.image.source), sourceDir, destinationDir, io);
                    if (!checked.reuse || checked.sourceHash !== op.image.sourceHash) throw new Error("Imagem mudou durante o sync.");
                }
                await applyOperation(tx, op, author);
                report.aplicados++;
            }
            return report;
        }, { isolationLevel: options.apply ? "Serializable" : "RepeatableRead", timeout: 120000, maxWait: 10000 });
    } catch (error) {
        if (copied.length) {
            try {
                // O rollback libera o lock original. Reobtê-lo impede apagar um arquivo
                // que outro import/sync acabou de reutilizar e confirmar nesse intervalo.
                await prisma.$transaction(async tx => {
                    await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
                    for (const file of copied) {
                        const url = "/uploads/patrimonios/" + path.basename(file.path);
                        if (await tx.patrimonioImagem.count({ where: { url } })) continue;
                        const stat = await io.lstat(file.path);
                        if (stat.dev !== file.stat.dev || stat.ino !== file.stat.ino || digest(await io.readFile(file.path)) !== file.hash) throw new Error("Arquivo mudou; preservado para revisão: " + file.path);
                        await io.unlink(file.path);
                    }
                }, { timeout: 30000, maxWait: 10000 });
            } catch (cleanupError) { error.message += " Falha de compensação; revisar arquivos: " + copied.map(f => f.path).join(", ") + " (" + cleanupError.message + ")"; }
        }
        throw error;
    }
}
