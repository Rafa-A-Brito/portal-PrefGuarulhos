import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { slugify } from "../src/utils/slug.js";
import { hashPassword } from "../src/utils/password.js";
import { hashEstado, ordenarRelacoes } from "../src/utils/estadoHash.js";
import { createPatrimonioSchema } from "../src/schemas/patrimonioSchema.js";
import { PATRIMONIOS_SEED } from "./patrimonioSeedData.js";
import { PATRIMONIOS, ASSET_SHA256, RESEARCH_SHA256 } from "./data/patrimonios.js";
import { EDITORIAL_CURADO, FONTE_CANONICA_SHA256 } from "./data/patrimonioEditorialCurado.js";
import { LEGACY_SLUG_ALIASES, candidatosDaFonte, chaveDaFonte } from "./identidade-carga.js";
import { RESEARCH_IDENTITIES } from "./data/identidadesPesquisa.js";
import { UPLOAD_DIR } from "../src/config/uploadDir.js";

export const SEED_EMAIL = "seed.patrimonios@localhost.invalid";
const ACTION = "INITIAL_LOAD_BINDING";
const root = fileURLToPath(new URL("../", import.meta.url));
const plain = value => JSON.parse(JSON.stringify(value));
const stableId = key => {
    const bytes = createHash("sha256").update("memoria-viva/initial/v1/" + key).digest();
    bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
    const hex = bytes.subarray(0, 16).toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const keyOf = chaveDaFonte;

// A pesquisa é insumo documental; a fonte canônica e as decisões D1C prevalecem.
export function catalogoInicial(tipo = "canonical") {
    if (!["canonical", "research"].includes(tipo)) throw new Error("Catálogo inicial inválido.");
    if (tipo === "research" && hashEstado(PATRIMONIOS) !== RESEARCH_SHA256) throw new Error("Snapshot da pesquisa mudou; revisar o mapeamento antes da carga.");
    const pending = [];
    const records = [];
    const sourceRows = tipo === "canonical" ? PATRIMONIOS_SEED.map(item => ({ item })) : PATRIMONIOS.map(research => {
        const identity = RESEARCH_IDENTITIES[research.id];
        if (!identity) throw new Error("Pesquisa sem identidade revisada: " + research.id);
        const candidates = PATRIMONIOS_SEED.filter(item => keyOf(item) === "canonical/" + identity);
        if (candidates.length !== 1) throw new Error("Identidade documental ausente/ambígua: " + research.id);
        return { item: candidates[0], research };
    });
    const used = new Set();
    for (const { item, research } of sourceRows) {
        const key = keyOf(item);
        if (used.has(key)) {
            pending.push({ sourceId: research.id, motivo: "ALIAS_CONSOLIDADO", key,
                detalhe: "ID 13 é alias de Casa José Maurício (9), conforme D1C; seus dados divergentes não sobrescrevem o canônico." });
            continue;
        }
        used.add(key);
        const slug = slugify(item.nome);
        const sourceSlug = LEGACY_SLUG_ALIASES.get(slug) || slug;
        const description = item.descricao;
        if (!description?.trim()) throw new Error("Descrição canônica ausente: " + key);
        const record = { key, nome: item.nome, aliases: [sourceSlug], categoria: item.categoria,
            ...(research && { numeroExibicao: research.numeroExibicao, ordemExibicao: research.ordemExibicao }),
            descricao: description, descricaoResumida: item.descricaoResumida, historia: item.historia,
            importanciaCultural: item.importanciaCultural, situacao: item.situacao,
            detalhes: item.detalhes.map((detail, ordem) => ({ icone: detail.icone ?? null, titulo: detail.titulo, texto: detail.texto, ordem })),
            localizacao: { endereco: item.endereco, numero: item.numero ?? null, bairro: item.bairro,
                cidade: item.cidade ?? "Guarulhos", uf: item.uf ?? "SP", cep: item.cep ?? null,
                latitude: item.latitude, longitude: item.longitude },
            image: research ? { source: path.join(root, "public/patrimonios", research.imagemPrincipal),
                url: "/arquivos/patrimonios/" + research.imagemPrincipal, expectedHash: ASSET_SHA256[research.imagemPrincipal] }
                : { source: path.join(root, "src/uploads/patrimonios", item.imagem),
                    url: "/uploads/patrimonios/" + item.imagem, copy: true },
            fatos: EDITORIAL_CURADO.fatos.filter(fact => fact.patrimonioSlug === sourceSlug),
            ligacoes: EDITORIAL_CURADO.ligacoes.filter(link => link.origemSlug === sourceSlug),
        };
        if (research) pending.push({ sourceId: research.id, motivo: "FONTE_CANONICA_E_D1C_PRESERVADAS",
            detalhesOriginais: research.detalhes?.length ?? 0, fatosOriginais: research.fatos?.length ?? 0,
            ligacoesOriginais: research.ligacoes?.length ?? 0,
            detalhesDivergentes: (research.detalhes || []).filter(detail => !item.detalhes.some(current => current.titulo === detail.titulo && current.texto === detail.texto)).map(detail => detail.titulo),
            detalhe: "Textos/localização/categoria canônicos; detalhes via PatrimonioDetalhe; fatos/ligações somente os aprovados no manifesto D1C. Pesquisa original intacta." });
        records.push(record);
    }
    return { records, pending };
}

export function planejarCarga({ records, existing, categories, bindings, reconciliation = [] }) {
    const conflicts = [], entries = [], categoryPlan = new Map();
    const claimed = new Set(), keys = new Set();
    for (const source of records) {
        if (keys.has(source.key)) conflicts.push("Chave de fonte duplicada: " + source.key);
        keys.add(source.key);
        const logs = bindings.filter(log => log.newValues?.sourceKey === source.key);
        const boundIds = [...new Set(logs.map(log => log.entityId))];
        if (boundIds.length > 1 || boundIds.some(id => !existing.some(row => row.id === id))) conflicts.push("Vínculo de origem ambíguo/removido: " + source.key);
        const manual = reconciliation.filter(row => row.sourceKey === source.key);
        if (manual.length > 1) conflicts.push("Reconciliação repetida: " + source.key);
        if (manual[0]) {
            const current = existing.find(row => row.id === manual[0].patrimonioId);
            if (!current || hashEstado(current) !== manual[0].expectedHash) conflicts.push("Reconciliação desatualizada: " + source.key);
            else boundIds.push(current.id);
        }
        const candidates = candidatosDaFonte(source, existing, boundIds);
        if (candidates.length > 1) conflicts.push("Identidade ambígua: " + source.key);
        const current = candidates[0];
        if (!current && existing.some(row => slugify(row.nome) === slugify(source.nome))) conflicts.push("Nome semelhante sem identidade estável comprovada: " + source.key);
        const id = current?.id || stableId(source.key);
        if (claimed.has(id) || (!current && existing.some(row => row.id === id))) conflicts.push("UUID/identidade em colisão: " + source.key);
        claimed.add(id);
        const categorySlug = slugify(source.categoria);
        const matches = categories.filter(category => category.slug === categorySlug || category.nome === source.categoria);
        if (!current && matches.length > 1) conflicts.push("Categoria ambígua: " + source.categoria);
        categoryPlan.set(categorySlug, { current: matches[0], nome: source.categoria, slug: categorySlug });
        const data = createPatrimonioSchema.parse({ nome: source.nome, descricao: source.descricao,
            descricaoResumida: source.descricaoResumida, categoriaId: matches[0]?.id || stableId("category/" + categorySlug),
            historia: source.historia, importanciaCultural: source.importanciaCultural, situacao: source.situacao,
            localizacao: source.localizacao });
        entries.push({ source, id, current, data, categorySlug, bound: logs.length > 0 });
    }
    for (const row of reconciliation) if (!keys.has(row.sourceKey)) conflicts.push("Reconciliação sem origem: " + row.sourceKey);
    return { entries, categories: [...categoryPlan.values()], conflicts };
}

async function conferirAsset(source, uploadDir) {
    const file = source.image;
    if (!file) return null;
    const stat = await fs.lstat(file.source);
    if (!stat.isFile() || stat.isSymbolicLink() || path.basename(file.source).startsWith(".")) throw new Error("Asset de origem inseguro.");
    const digest = createHash("sha256").update(await fs.readFile(file.source)).digest("hex");
    if (file.expectedHash && digest !== file.expectedHash) throw new Error("Asset diverge da pesquisa: " + source.key);
    const destination = file.copy ? path.join(uploadDir, "patrimonios", path.basename(file.source)) : null;
    let reuse = false;
    if (destination) {
        try {
            const target = await fs.lstat(destination);
            if (!target.isFile() || target.isSymbolicLink() || createHash("sha256").update(await fs.readFile(destination)).digest("hex") !== digest) throw new Error("Asset de destino em conflito.");
            reuse = true;
        } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    return { ...file, digest, destination, reuse };
}

export async function executarCargaInicial({ prisma, databaseUrl, options = {}, tipo = "canonical",
    catalog = catalogoInicial(tipo), uploadDir = UPLOAD_DIR, publicBaseUrl = process.env.PATRIMONIOS_PUBLIC_BASE_URL }) {
    const canonicalBytes = await fs.readFile(path.join(root, "prisma/patrimonioSeedData.js"));
    if (createHash("sha256").update(canonicalBytes).digest("hex") !== FONTE_CANONICA_SHA256) throw new Error("Fonte canônica mudou; revisar decisões D1C antes da carga.");
    const target = new URL(databaseUrl);
    let imageBase = "";
    if (tipo === "research") {
        let base;
        try { base = new URL(publicBaseUrl); } catch { throw new Error("Configure PATRIMONIOS_PUBLIC_BASE_URL com a URL pública do backend."); }
        if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("PATRIMONIOS_PUBLIC_BASE_URL inválida.");
        imageBase = base.href.replace(/\/$/, "");
    }
    const database = decodeURIComponent(target.pathname.slice(1));
    if (!["postgres:", "postgresql:"].includes(target.protocol) || !database) throw new Error("DATABASE_URL inválida.");
    if (options.apply && (options.confirmDb !== database || !options.createdByEmail || !/^[a-f0-9]{64}$/.test(options.expectedStateHash || ""))) throw new Error("Apply exige banco confirmado, responsável e hash revisado.");
    const owned = [];
    try {
        return await prisma.$transaction(async tx => {
            if (!options.apply) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            const [{ banco }] = await tx.$queryRawUnsafe("SELECT current_database() AS banco");
            if (banco !== database) throw new Error("Banco conectado diverge da URL.");
            if (options.apply) {
                await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
                await tx.$queryRawUnsafe("SELECT id FROM patrimonio ORDER BY id FOR UPDATE");
                await tx.$queryRawUnsafe("SELECT id FROM users ORDER BY id FOR UPDATE");
            }
            const responsible = options.createdByEmail ? await tx.user.findUnique({ where: { email: options.createdByEmail.toLowerCase() },
                select: { id: true, role: true, isActive: true } }) : null;
            if ((options.apply || options.createdByEmail) && (!responsible?.isActive || !["ADMIN", "EDITOR"].includes(responsible.role))) throw new Error("Responsável deve ser ADMIN/EDITOR ativo.");
            const technical = await tx.user.findUnique({ where: { email: SEED_EMAIL }, select: { id: true, isActive: true, role: true } });
            if (technical && (technical.isActive || technical.role !== "EDITOR")) throw new Error("Usuário técnico deve permanecer EDITOR inativo; revisar conflito.");
            const existing = await tx.patrimonio.findMany({ include: { localizacao: true, imagens: true, documentos: true,
                detalhes: true, fatos: true, ligacoes: true, ligacoesRecebidas: true, categoriasAdicionais: true, rotas: true }, orderBy: { id: "asc" } });
            const categories = await tx.categoria.findMany({ orderBy: { id: "asc" } });
            const bindings = await tx.auditLog.findMany({ where: { action: ACTION }, orderBy: { id: "asc" } });
            const plan = planejarCarga({ records: catalog.records, existing, categories, bindings, reconciliation: options.reconciliation });
            const assets = new Map();
            for (const entry of plan.entries.filter(row => !row.current)) {
                const asset = await conferirAsset(entry.source, uploadDir);
                if (asset && !asset.copy) asset.url = imageBase + asset.url;
                assets.set(entry.source.key, asset);
            }
            const report = { modo: options.apply ? "apply" : "dry-run", banco, tipo,
                criar: plan.entries.filter(row => !row.current).length, preservar: plan.entries.filter(row => row.current).length,
                conflitos: plan.conflicts, pendencias: [...catalog.pending], aplicados: 0,
                existentesParaReconciliacao: existing.map(row => ({ patrimonioId: row.id, nome: row.nome, slug: row.slug, expectedHash: hashEstado(row) })),
                itens: plan.entries.map(row => ({ sourceKey: row.source.key, id: row.id, acao: row.current ? "PRESERVAR" : "CRIAR_RASCUNHO",
                    ...(row.current && { expectedHash: hashEstado(row.current) }) })) };
            report.estado_hash = hashEstado({ target: { host: target.hostname, port: target.port || "5432", database },
                records: catalog.records, existing: ordenarRelacoes(plain(existing)), categories: ordenarRelacoes(plain(categories)),
                technical, responsible, bindings: ordenarRelacoes(plain(bindings)), assets: [...assets], reconciliation: options.reconciliation || [] });
            if (options.expectedStateHash && options.expectedStateHash !== report.estado_hash) report.conflitos.push("ESTADO_DESATUALIZADO");
            if (!options.apply) return report;
            if (report.conflitos.length) throw Object.assign(new Error("Carga bloqueada; nenhum registro aplicado."), { report });
            const newEntries = plan.entries.filter(row => !row.current);
            const author = technical || (newEntries.length ? await tx.user.create({ data: { email: SEED_EMAIL,
                name: "Importação inicial de patrimônios", role: "EDITOR", isActive: false, passwordHash: await hashPassword(randomUUID()) } }) : null);
            const categoryIds = new Map();
            for (const category of plan.categories.filter(category => newEntries.some(row => row.categorySlug === category.slug))) {
                const stored = category.current || await tx.categoria.create({ data: { id: stableId("category/" + category.slug), nome: category.nome, slug: category.slug } });
                categoryIds.set(category.slug, stored.id);
            }
            for (const entry of newEntries) {
                const asset = assets.get(entry.source.key);
                if (asset?.destination && !asset.reuse) {
                    const folder = path.dirname(asset.destination);
                    await fs.mkdir(folder, { recursive: true });
                    if (await fs.realpath(folder) !== path.join(await fs.realpath(uploadDir), "patrimonios")) throw new Error("Destino redirecionado.");
                    await fs.copyFile(asset.source, asset.destination, fs.constants.COPYFILE_EXCL);
                    const stat = await fs.lstat(asset.destination);
                    owned.push({ ...asset, dev: stat.dev, ino: stat.ino });
                    if (createHash("sha256").update(await fs.readFile(asset.destination)).digest("hex") !== asset.digest) throw new Error("Imagem mudou durante a cópia.");
                }
                const { localizacao, ...data } = entry.data;
                await tx.patrimonio.create({ data: { ...data, id: entry.id, slug: slugify(entry.source.nome),
                    ...(entry.source.numeroExibicao !== undefined && { numeroExibicao: entry.source.numeroExibicao, ordemExibicao: entry.source.ordemExibicao }),
                    categoriaId: categoryIds.get(entry.categorySlug), status: "RASCUNHO", createdBy: author.id,
                    ...(localizacao && { localizacao: { create: localizacao } }), detalhes: { create: entry.source.detalhes },
                    ...(asset && { imagens: { create: { url: asset.url, principal: true, ordem: 0, textoAlternativo: data.nome } } }),
                    fatos: { create: entry.source.fatos.map(fact => ({ rotulo: fact.rotulo, valor: fact.valor, ordem: fact.ordem })) } } });
                report.aplicados++;
            }
            const byKey = new Map(plan.entries.map(entry => [entry.source.key, entry.id]));
            for (const entry of newEntries) for (const link of entry.source.ligacoes) {
                const destination = byKey.get("canonical/" + link.destinoSlug);
                if (!destination) { report.pendencias.push({ motivo: "DESTINO_NAO_CARREGADO", sourceKey: entry.source.key, destino: link.destinoSlug }); continue; }
                await tx.patrimonioLigacao.create({ data: { patrimonioOrigemId: entry.id, patrimonioDestinoId: destination, texto: link.texto, ordem: link.ordem } });
            }
            for (const entry of plan.entries.filter(entry => !entry.bound)) await tx.auditLog.create({ data: {
                userId: responsible.id, action: ACTION, entity: "Patrimonio", entityId: entry.id,
                newValues: { sourceKey: entry.source.key, tipo, criado: !entry.current } } });
            return report;
        }, { isolationLevel: options.apply ? "Serializable" : "RepeatableRead", timeout: 120000, maxWait: 10000 });
    } catch (error) {
        // Reobtém o lock antes de compensar, sem remover arquivo já reutilizado.
        if (owned.length) await prisma.$transaction(async tx => {
            await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
            for (const file of owned) {
                try {
                    if (await tx.patrimonioImagem.count({ where: { url: file.url } })) continue;
                    const stat = await fs.lstat(file.destination);
                    if (stat.dev !== file.dev || stat.ino !== file.ino || createHash("sha256").update(await fs.readFile(file.destination)).digest("hex") !== file.digest) continue;
                    await fs.unlink(file.destination);
                } catch (cleanup) { console.error("Pendência de limpeza da carga.", { code: cleanup.code, caminho: file.destination }); }
            }
        }).catch(cleanup => console.error("Falha na compensação da carga.", { code: cleanup.code }));
        throw error;
    }
}
