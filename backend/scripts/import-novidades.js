import "dotenv/config";
import { hashEstado, ordenarRelacoes } from "../src/utils/estadoHash.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { createNovidadeSchema } from "../src/schemas/novidadeSchema.js";
import { prepararNovidade } from "../src/utils/novidadeData.js";
import { databaseIdentity } from "./assert-test-db.js";
import { UPLOAD_DIR } from "../src/config/uploadDir.js";
import { noticiasSetembro, eventosOutubro, eventosNovembro, eventosDezembro } from "../../frontend/src/features/mocks/novidadesMock.js";

const ASSETS = fileURLToPath(new URL("../../frontend/src/assets/novidades/", import.meta.url));
const GROUPS = [[noticiasSetembro, "09"], [eventosOutubro, "10"], [eventosNovembro, "11"], [eventosDezembro, "12"]];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const optionalFields = ["resumo", "quando", "local"];

export function parseArgs(args) {
    const result = { apply: false, status: "RASCUNHO" };
    const seen = new Set();
    for (const arg of args) {
        const [key, ...rest] = arg.split("=");
        if (seen.has(key)) throw new Error("Argumento repetido: " + key);
        seen.add(key);
        if (["--apply", "--dry-run"].includes(key) && !rest.length) result.apply = key === "--apply";
        else if (["--created-by-email", "--confirm-db", "--status", "--expected-state-hash"].includes(key) && rest.join("=")) {
            result[{ "--created-by-email": "createdByEmail", "--confirm-db": "confirmDb", "--status": "status", "--expected-state-hash": "expectedStateHash" }[key]] = rest.join("=");
        } else throw new Error("Argumento inválido: " + key + ". Use --created-by-email=email, --status=RASCUNHO|PUBLICADO, --dry-run ou --apply --confirm-db=patrimonio_guarulhos.");
    }
    if (seen.has("--apply") && seen.has("--dry-run")) throw new Error("Escolha apenas um modo.");
    validateOptions(result);
    return result;
}
function validateOptions(options, database) {
    if (!options.createdByEmail?.trim()) throw new Error("--created-by-email é obrigatório.");
    if (!["RASCUNHO", "PUBLICADO"].includes(options.status)) throw new Error("Status inválido.");
    if (options.apply && (!options.confirmDb || (database && options.confirmDb !== database))) throw new Error("Apply exige --confirm-db igual ao banco de destino.");
}

export async function loadSource({ groups = GROUPS, assetsDir = ASSETS } = {}) {
    const items = [];
    const slugs = new Set();
    for (const [group, month] of groups) for (const source of group) {
        const { id: slug, imagem, ...editorial } = source;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) throw new Error("Identificador inválido ou duplicado: " + slug);
        slugs.add(slug);
        const day = source.bloco?.dia?.match(/^\d+/)?.[0];
        // Ano dos quatro grupos editoriais. Intervalos usam o primeiro dia.
        // A feira tem somente mês: convenção de referência aprovada pelo responsável.
        if (!source.data && !day && slug !== "feira-economia-solidaria") throw new Error("Data sem referência: " + slug);
        const data = source.data || "2026-" + month + "-" + (day || "1").padStart(2, "0");
        const valid = createNovidadeSchema.parse({ ...editorial, tipo: source.tipo.toUpperCase(), data });
        const record = prepararNovidade({ ...valid, bloco: valid.bloco ?? null, cta: valid.cta ?? null, fontes: valid.fontes ?? [] });
        for (const field of optionalFields) record[field] ??= null;
        let asset = null;
        if (imagem) {
            if (!/^\/src\/assets\/novidades\/[a-zA-Z0-9_-]+\.(jpeg|jpg|png|webp)$/.test(imagem)) throw new Error("Imagem local não permitida: " + slug);
            const sourcePath = path.join(assetsDir, path.basename(imagem));
            const bytes = await readFile(sourcePath); // Falta de arquivo bloqueia todo o lote.
            asset = { sourcePath, bytes, filename: hash(bytes) + path.extname(imagem).toLowerCase() };
        }
        record.imagemUrl = asset ? "/uploads/novidades/" + asset.filename : null;
        items.push({ slug, record, asset, aviso: !source.data && !day ? "01/10/2026 é referência de ordenação; evento com várias datas. Bloco e quando preservados." : null });
    }
    if (items.length !== 16) throw new Error("Esperados 16 itens; encontrados " + items.length);
    return items;
}

export function planImport(items, existing, status) {
    return items.map(item => {
        const current = existing.find(row => row.slug === item.slug);
        const otherTitle = existing.find(row => row.titulo === item.record.titulo && row.slug !== item.slug);
        const desired = { ...item.record, status };
        const fields = current ? Object.keys(desired).filter(key => !isDeepStrictEqual(current[key], desired[key])) : [];
        return { slug: item.slug, acao: otherTitle || fields.length ? "CONFLITO" : current ? "IGNORAR" : "CRIAR", campos: fields,
            ...(otherTitle && { motivo: "Título já cadastrado com outro slug: " + otherTitle.slug }), aviso: item.aviso };
    });
}

async function checkAssets(items, uploadsDir) {
    for (const { asset } of items) if (asset) {
        try {
            const target = await readFile(path.join(uploadsDir, "novidades", asset.filename));
            if (!target.equals(asset.bytes)) throw new Error("Conflito no arquivo de destino: " + asset.filename);
        } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
}
async function storeAssets(items, uploadsDir, owned) {
    if (!items.some(item => item.asset)) return;
    await mkdir(path.join(uploadsDir, "novidades"), { recursive: true });
    for (const { asset } of items) if (asset) {
        try {
            const target = path.join(uploadsDir, "novidades", asset.filename);
            if (await fs.realpath(path.dirname(target)) !== path.join(await fs.realpath(uploadsDir), "novidades")) throw new Error("Destino de novidades redirecionado.");
            await writeFile(target, asset.bytes, { flag: "wx" });
            const stat = await fs.lstat(target); owned.push({ target, stat, digest: hash(asset.bytes), url: "/uploads/novidades/" + asset.filename });
        }
        catch (error) {
            if (error.code !== "EEXIST") throw error;
            const bytes = await readFile(path.join(uploadsDir, "novidades", asset.filename));
            if (!bytes.equals(asset.bytes)) throw new Error("Conflito de imagem concorrente.");
        }
    }
}

export async function importNovidades({ prisma, options, database, items, uploadsDir = UPLOAD_DIR }) {
    validateOptions(options, database);
    items ??= await loadSource();
    if (items.length !== 16 || new Set(items.map(x => x.slug)).size !== 16) throw new Error("Lote deve ter 16 identificadores únicos.");
    await checkAssets(items, uploadsDir);
    const owned = [];
    try { return await prisma.$transaction(async tx => {
        if (!options.apply) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const [{ banco }] = await tx.$queryRawUnsafe("SELECT current_database() AS banco");
        if (banco !== database) throw new Error("Banco conectado diverge do destino.");
        if (options.apply) {
            await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
            await tx.$queryRawUnsafe("SELECT id FROM novidade ORDER BY id FOR UPDATE");
            await tx.$queryRawUnsafe("SELECT id FROM users ORDER BY id FOR UPDATE");
        }
        const author = await tx.user.findUnique({ where: { email: options.createdByEmail }, select: { id: true, role: true, isActive: true } });
        if (!author?.isActive || !["ADMIN", "EDITOR"].includes(author.role)) throw new Error("Autor deve ser ADMIN/EDITOR ativo.");
        if (options.status === "PUBLICADO" && author.role !== "ADMIN") throw new Error("Somente ADMIN pode publicar, conforme a API administrativa.");
        const existing = await tx.novidade.findMany({ where: { OR: [{ slug: { in: items.map(x => x.slug) } }, { titulo: { in: items.map(x => x.record.titulo) } }] } });
        const operations = planImport(items, existing, options.status);
        const report = { banco: database, modo: options.apply ? "apply" : "dry-run", status: options.status, total: items.length,
            criar: operations.filter(x => x.acao === "CRIAR").length, atualizar: 0, ignorar: operations.filter(x => x.acao === "IGNORAR").length,
            conflitos: operations.filter(x => x.acao === "CONFLITO").length, aplicados: 0, itens: operations };
        report.estado_hash = hashEstado({ database, items, existing: ordenarRelacoes(existing), author, status: options.status });
        if (options.apply && !/^[a-f0-9]{64}$/.test(options.expectedStateHash || "")) throw new Error("Apply exige --expected-state-hash revisado.");
        if (options.expectedStateHash && options.expectedStateHash !== report.estado_hash) { report.conflitos++; report.itens.push({ acao: "CONFLITO", motivo: "ESTADO_DESATUALIZADO" }); }
        if (report.conflitos || !options.apply) return report;
        // Todo o lote e os arquivos foram validados antes da primeira escrita.
        // Arquivos imutáveis por hash nunca sobrescrevem upload administrativo.
        await storeAssets(items.filter(item => operations.some(op => op.slug === item.slug && op.acao === "CRIAR")), uploadsDir, owned);
        for (const op of operations) if (op.acao === "CRIAR") {
            const item = items.find(x => x.slug === op.slug);
            await tx.novidade.create({ data: { ...item.record, slug: item.slug, status: options.status,
                createdBy: author.id, publicadoEm: options.status === "PUBLICADO" ? new Date() : null } });
            report.aplicados++;
        }
        return report;
    }, { isolationLevel: options.apply ? "Serializable" : "RepeatableRead", timeout: 120000, maxWait: 10000 });
    } catch (error) {
        if (owned.length) await prisma.$transaction(async tx => {
            await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
            for (const file of owned) {
                try {
                    if (await tx.novidade.count({ where: { imagemUrl: file.url } })) continue;
                    const stat = await fs.lstat(file.target);
                    if (stat.dev === file.stat.dev && stat.ino === file.stat.ino && hash(await readFile(file.target)) === file.digest) await fs.unlink(file.target);
                } catch (cleanup) { console.error("Pendência de imagem de novidade.", { code: cleanup.code, caminho: file.target }); }
            }
        }).catch(cleanup => console.error("Falha na compensação de novidades.", { code: cleanup.code }));
        throw error;
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const { database } = databaseIdentity(process.env.DATABASE_URL);
    validateOptions(options, database);
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL,
        ...(!options.apply && { options: "-c default_transaction_read_only=on" }) }) });
    try {
        const report = await importNovidades({ prisma, options, database });
        console.log(JSON.stringify(report, null, 2));
        if (report.conflitos) process.exitCode = 1;
    } finally { await prisma.$disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => { console.error("Importação abortada:", error.message); process.exitCode = 1; });
}
