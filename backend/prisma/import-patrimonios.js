import "dotenv/config";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { UPLOAD_DIR } from "../src/config/uploadDir.js";
import { createPatrimonioSchema } from "../src/schemas/patrimonioSchema.js";
import { slugify } from "../src/utils/slug.js";
import { databaseIdentity } from "../scripts/assert-test-db.js";
import { PATRIMONIOS_SEED } from "./patrimonioSeedData.js";

const SOURCE_DIR = fileURLToPath(new URL("../src/uploads/patrimonios/", import.meta.url));
export const normalizarNome = text => String(text).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hash = buffer => createHash("sha256").update(buffer).digest("hex");
const errorText = error => error?.code ? String(error.code) : String(error?.message || error).slice(0, 500);
const detailSchema = z.array(z.object({
    icone: z.string().nullable().optional(),
    titulo: z.string().trim().min(1),
    texto: z.string().trim().min(1),
}));

export function parseArgs(args) {
    const options = { apply: false, status: "RASCUNHO", json: false };
    const seen = new Set();
    for (const arg of args) {
        const [key, ...parts] = arg.split("=");
        if (seen.has(key)) throw new Error("Opção repetida: " + key);
        seen.add(key);
        const value = parts.join("=");
        if (["--apply", "--dry-run", "--json"].includes(key) && !parts.length) {
            if (key === "--apply") options.apply = true;
            if (key === "--json") options.json = true;
        } else if (["--status", "--confirm-db", "--created-by-email"].includes(key) && value.trim()) {
            options[{ "--status": "status", "--confirm-db": "confirmDb", "--created-by-email": "createdByEmail" }[key]] = value.trim();
        } else throw new Error("Opção inválida ou não implementada: " + key);
    }
    if (seen.has("--apply") && seen.has("--dry-run")) throw new Error("--apply e --dry-run são incompatíveis.");
    if (!["RASCUNHO", "PUBLICADO"].includes(options.status)) throw new Error("Status inválido.");
    if (options.apply && (!options.confirmDb || !options.createdByEmail)) {
        throw new Error("--apply exige --confirm-db e --created-by-email.");
    }
    return options;
}

function repararTexto(texto) {
    if (typeof texto !== "string" || !/[ÃÂ]/.test(texto)) return texto;
    const fixed = Buffer.from(texto, "latin1").toString("utf8");
    return fixed.includes("\uFFFD") ? texto : fixed;
}

async function validarImagem(nome, sourceDir, destinationDir, io) {
    if (!nome) return null;
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(nome)) throw new Error("Nome/extensão de imagem inválido.");
    const source = path.join(sourceDir, nome);
    const stat = await io.lstat(source);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("A imagem fonte deve ser arquivo regular.");
    const sourceHash = hash(await io.readFile(source));
    const destination = path.join(destinationDir, nome);
    let reuse = false;
    try {
        const targetStat = await io.lstat(destination);
        if (!targetStat.isFile() || targetStat.isSymbolicLink() || hash(await io.readFile(destination)) !== sourceHash) {
            throw new Error("Destino de imagem já existe com conteúdo diferente ou inseguro.");
        }
        reuse = true;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    return { source, destination, reuse, sourceHash, url: "/uploads/patrimonios/" + nome };
}

export async function importPatrimonios({
    prisma, databaseUrl, options = parseArgs([]), source = PATRIMONIOS_SEED,
    sourceDir = SOURCE_DIR, uploadDir = UPLOAD_DIR, io = fs,
}) {
    const target = databaseIdentity(databaseUrl);
    const report = {
        fonte: source.length, existentes: 0, criar: 0, ignorar: 0, conflitos: [], erros: [], warnings: [],
        criados: 0, host: new URL(databaseUrl).hostname, porta: target.port, banco: target.database,
        status: options.status, modo: options.apply ? "apply" : "dry-run", itens: [],
    };
    if (!["RASCUNHO", "PUBLICADO"].includes(options.status)) throw new Error("Status inválido.");
    if (options.apply && (options.confirmDb !== target.database || !options.createdByEmail)) {
        throw new Error("Confirmação do banco/autor ausente ou divergente.");
    }
    let author;
    if (options.createdByEmail) {
        author = await prisma.user.findUnique({ where: { email: options.createdByEmail.toLowerCase() } });
        if (!author?.isActive || !["ADMIN", "EDITOR"].includes(author.role)) throw new Error("Autor deve ser usuário existente ativo ADMIN ou EDITOR.");
    } else {
        report.warnings.push("Autor não informado; necessário no --apply.");
    }
    const [existing, categories] = await Promise.all([
        prisma.patrimonio.findMany({ select: { id: true, slug: true, nome: true } }),
        prisma.categoria.findMany({ select: { id: true, nome: true } }),
    ]);
    const slugs = new Set(existing.map(item => item.slug));
    const names = new Set(existing.map(item => normalizarNome(item.nome)));
    const sourceNames = new Map();
    for (const item of source) {
        const key = normalizarNome(item.nome);
        sourceNames.set(key, (sourceNames.get(key) || 0) + 1);
    }
    const destinationDir = path.join(uploadDir, "patrimonios");
    for (const item of source) {
        const slug = slugify(item.nome || "");
        const normalized = normalizarNome(item.nome);
        const row = { nome: item.nome, slug, acao: "ERRO" };
        report.itens.push(row);
        if (slugs.has(slug)) {
            report.existentes++; report.ignorar++; row.acao = "IGNORAR"; continue;
        }
        if (names.has(normalized) || sourceNames.get(normalized) > 1) {
            report.conflitos.push({ slug, motivo: "Nome normalizado duplicado com slug divergente ou fonte repetida." });
            row.acao = "CONFLITO"; continue;
        }
        let owned;
        try {
            if (!slug || slug.length > 220) throw new Error("Slug inválido.");
            const category = categories.find(c => normalizarNome(c.nome) === normalizarNome(item.categoria));
            if (!category) throw new Error("Categoria inexistente: " + item.categoria);
            const coords = [item.latitude, item.longitude].map(v => v != null);
            if (coords[0] !== coords[1]) throw new Error("Latitude e longitude devem existir juntas.");
            if (coords[0] && (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude) ||
                Math.abs(item.latitude) > 90 || Math.abs(item.longitude) > 180)) throw new Error("Coordenadas fora da faixa.");
            let localizacao;
            if (item.endereco?.trim() && item.bairro?.trim()) {
                localizacao = { endereco: item.endereco, bairro: item.bairro, cidade: "Guarulhos", uf: "SP" };
                for (const field of ["numero", "cep", "latitude", "longitude"]) {
                    if (item[field] != null) localizacao[field] = item[field];
                }
            } else if (coords[0] || item.endereco || item.bairro) {
                report.warnings.push({ slug, motivo: "Localização incompleta; não será criada." });
            }
            if (coords[0] && (item.latitude < -23.7 || item.latitude > -23.1 || item.longitude < -46.8 || item.longitude > -46.2)) {
                report.warnings.push({ slug, motivo: "Coordenadas fora da região esperada; sem correção automática." });
            }
            const data = createPatrimonioSchema.parse({
                nome: item.nome, descricao: repararTexto(item.descricao),
                descricaoResumida: repararTexto(item.descricaoResumida || item.descricao?.slice(0, 500)),
                categoriaId: category.id, situacao: item.situacao,
                ...(item.historia && { historia: repararTexto(item.historia) }),
                ...(item.importanciaCultural && { importanciaCultural: repararTexto(item.importanciaCultural) }),
                ...(localizacao && { localizacao }),
            });
            const details = detailSchema.parse((item.detalhes || []).map(d => ({
                ...d, titulo: repararTexto(d.titulo), texto: repararTexto(d.texto),
            })));
            const image = await validarImagem(item.imagem, sourceDir, destinationDir, io);
            if (image?.reuse) report.warnings.push({ slug, motivo: "Imagem existente idêntica será reutilizada." });
            report.criar++;
            row.acao = "CRIAR";
            if (!options.apply) continue;
            if (image) {
                await io.mkdir(destinationDir, { recursive: true });
                const rootReal = await io.realpath(uploadDir);
                if (await io.realpath(destinationDir) !== path.join(rootReal, "patrimonios")) throw new Error("Pasta de destino redirecionada.");
                // Revalida imediatamente antes da cópia, inclusive quando o arquivo já existe.
                const checked = await validarImagem(item.imagem, sourceDir, destinationDir, io);
                if (!checked.reuse) {
                    await io.copyFile(image.source, image.destination, constants.COPYFILE_EXCL);
                    owned = { path: image.destination };
                    owned.stat = await io.lstat(image.destination);
                    if (hash(await io.readFile(image.destination)) !== image.sourceHash) throw new Error("Imagem fonte mudou durante a importação.");
                }
            }
            await prisma.$transaction(async tx => {
                // Serializa importadores; não impede edições administrativas externas.
                await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
                const current = await tx.patrimonio.findMany({ select: { slug: true, nome: true } });
                if (current.some(p => p.slug === slug || normalizarNome(p.nome) === normalized)) {
                    throw new Error("Patrimônio apareceu durante a importação; execute dry-run novamente.");
                }
                const { localizacao: local, ...fields } = data;
                await tx.patrimonio.create({ data: {
                    ...fields, slug, createdBy: author.id, status: options.status,
                    publicadoEm: options.status === "PUBLICADO" ? new Date() : null,
                    ...(local && { localizacao: { create: local } }),
                    ...(details.length && { detalhes: { create: details.map((d, ordem) => ({ ...d, ordem })) } }),
                    ...(image && { imagens: { create: { url: image.url, textoAlternativo: data.nome, principal: true, ordem: 0 } } }),
                } });
            });
            owned = null;
            slugs.add(slug); names.add(normalized);
            report.criados++; row.acao = "CRIADO";
        } catch (error) {
            row.acao = "ERRO";
            report.erros.push({ slug, motivo: errorText(error) });
            if (owned) {
                try {
                    const current = await io.lstat(owned.path);
                    if (owned.stat && (current.dev !== owned.stat.dev || current.ino !== owned.stat.ino)) throw new Error("Arquivo mudou após a cópia.");
                    await io.unlink(owned.path);
                } catch (cleanupError) {
                    report.warnings.push({ slug, arquivoOrfao: owned.path, motivo: errorText(cleanupError) });
                }
            }
        }
    }
    return report;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const databaseUrl = process.env.DATABASE_URL;
    databaseIdentity(databaseUrl);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    try {
        const report = await importPatrimonios({ prisma, databaseUrl, options });
        if (options.json) console.log(JSON.stringify(report, null, 2));
        else {
            console.log("Destino:", report.host, "porta:", report.porta, "banco:", report.banco);
            console.log("Modo:", report.modo, "status:", report.status);
            console.table(report.itens);
            console.log(JSON.stringify(report, null, 2));
        }
        if (report.erros.length || report.conflitos.length) process.exitCode = 1;
    } finally { await prisma.$disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => { console.error(errorText(error)); process.exitCode = 1; });
}
