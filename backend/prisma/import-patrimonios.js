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
import { createPatrimonioSchema, localizacaoSchema } from "../src/schemas/patrimonioSchema.js";
import { slugify } from "../src/utils/slug.js";
import { databaseIdentity } from "../scripts/assert-test-db.js";
import { PATRIMONIOS_SEED } from "./patrimonioSeedData.js";

const SOURCE_DIR = fileURLToPath(new URL("../src/uploads/patrimonios/", import.meta.url));

// Equivalências explícitas: slug da fonte -> slug legado já cadastrado.
// Só ignora quando o destino existe; nunca renomeia nem altera o registro legado.
import { LEGACY_SLUG_ALIASES, candidatosDaFonte, vincularFonte, chaveDaFonte } from "./identidade-carga.js";
import { hashEstado, ordenarRelacoes } from "../src/utils/estadoHash.js";
export { LEGACY_SLUG_ALIASES } from "./identidade-carga.js";

export const normalizarNome = (text) =>
    String(text)
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

const errorText = (error) =>
    error?.code ? String(error.code) : String(error?.message || error).slice(0, 500);

export const detailSchema = z.array(
    z.object({
        icone: z.string().nullable().optional(),
        titulo: z.string().trim().min(1),
        texto: z.string().trim().min(1),
    })
);

function validarModosBackfill(options) {
    if ([options.syncPatrimonios, options.backfillImages, options.backfillLocation, options.backfillDetails].filter(Boolean).length > 1) {
        throw new Error("Use apenas um modo de backfill ou sync por execução.");
    }
}

export function parseArgs(args) {
    const options = {
        apply: false,
        status: "RASCUNHO",
        json: false,
        backfillImages: false,
    };

    const seen = new Set();

    for (const arg of args) {
        const [key, ...parts] = arg.split("=");

        if (seen.has(key)) {
            throw new Error("Opção repetida: " + key);
        }

        seen.add(key);

        const value = parts.join("=");

        if (
            ["--apply", "--dry-run", "--json", "--sync-patrimonios", "--consolidate-legacy", "--backfill-images", "--backfill-location", "--backfill-details"].includes(key) &&
            !parts.length
        ) {
            if (key === "--apply") options.apply = true;
            if (key === "--json") options.json = true;
            if (key === "--sync-patrimonios") options.syncPatrimonios = true;
            if (key === "--consolidate-legacy") options.consolidateLegacy = true;
            if (key === "--backfill-location") options.backfillLocation = true;
            if (key === "--backfill-details") options.backfillDetails = true;
            if (key === "--backfill-images") {
                options.backfillImages = true;
            }
        } else if (
            ["--status", "--confirm-db", "--created-by-email", "--expected-state-hash"].includes(key) &&
            value.trim()
        ) {
            options[
                {
                    "--status": "status",
                    "--confirm-db": "confirmDb",
                    "--created-by-email": "createdByEmail",
                    "--expected-state-hash": "expectedStateHash",
                }[key]
            ] = value.trim();
        } else {
            throw new Error("Opção inválida ou não implementada: " + key);
        }
    }

    if (seen.has("--apply") && seen.has("--dry-run")) {
        throw new Error("--apply e --dry-run são incompatíveis.");
    }

    if (!["RASCUNHO", "PUBLICADO"].includes(options.status)) {
        throw new Error("Status inválido.");
    }

    if (options.apply && (!options.confirmDb || !options.createdByEmail)) {
        throw new Error("--apply exige --confirm-db e --created-by-email.");
    }

    validarModosBackfill(options);
    if (options.consolidateLegacy && !options.syncPatrimonios) throw new Error("--consolidate-legacy exige --sync-patrimonios.");
    if (options.syncPatrimonios && seen.has("--status")) throw new Error("Sync preserva status; não aceita --status.");
    if (options.expectedStateHash && (!/^[a-f0-9]{64}$/.test(options.expectedStateHash))) {
        throw new Error("--expected-state-hash exige SHA-256 válido.");
    }

    return options;
}

export function repararTexto(texto) {
    if (typeof texto !== "string" || !/[ÃÂ]/.test(texto)) {
        return texto;
    }

    const fixed = Buffer.from(texto, "latin1").toString("utf8");

    return fixed.includes("\uFFFD") ? texto : fixed;
}

export async function validarImagem(nome, sourceDir, destinationDir, io) {
    if (!nome) return null;

    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(nome)) {
        throw new Error("Nome/extensão de imagem inválido.");
    }

    const source = path.join(sourceDir, nome);
    const stat = await io.lstat(source);

    if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error("A imagem fonte deve ser arquivo regular.");
    }

    const sourceHash = hash(await io.readFile(source));

    const destination = path.join(destinationDir, nome);

    let reuse = false;

    try {
        const targetStat = await io.lstat(destination);

        if (
            !targetStat.isFile() ||
            targetStat.isSymbolicLink() ||
            hash(await io.readFile(destination)) !== sourceHash
        ) {
            throw new Error("Destino de imagem já existe com conteúdo diferente ou inseguro.");
        }

        reuse = true;
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }

    return {
        source,
        destination,
        reuse,
        sourceHash,
        url: "/uploads/patrimonios/" + nome,
    };
}

async function executarImportacaoLegada({
    prisma,
    databaseUrl,
    options = parseArgs([]),
    source = PATRIMONIOS_SEED,
    sourceDir = SOURCE_DIR,
    uploadDir = UPLOAD_DIR,
    io = fs,
}) {
    validarModosBackfill(options);

    if (options.syncPatrimonios) {
        const { syncPatrimonios } = await import("./sync-patrimonios.js");
        return syncPatrimonios({ prisma, databaseUrl, options, source, sourceDir, uploadDir, io });
    }

    const target = databaseIdentity(databaseUrl);

    const report = {
        fonte: source.length,
        existentes: 0,
        criar: 0,
        ignorar: 0,
        conflitos: [],
        erros: [],
        warnings: [],
        criados: 0,

        analisados: 0,
        jaComImagem: 0,
        vincularImagem: 0,
        semImagemNaFonte: 0,
        imagensVinculadas: 0,

        ...(options.backfillLocation && {
            backfillLocation: true,
            analisadosLocalizacao: 0,
            jaComLocalizacao: 0,
            vincularLocalizacao: 0,
            semLocalizacaoNaFonte: 0,
            localizacoesVinculadas: 0,
        }),
        ...(options.backfillDetails && {
            backfillDetails: true,
            analisadosDetalhes: 0,
            jaComDetalhes: 0,
            vincularDetalhes: 0,
            semDetalhesNaFonte: 0,
            detalhesVinculados: 0,
        }),

        host: new URL(databaseUrl).hostname,
        porta: target.port,
        banco: target.database,
        status: options.status,
        modo: options.apply ? "apply" : "dry-run",
        backfillImages: options.backfillImages,
        itens: [],
    };

    if (!["RASCUNHO", "PUBLICADO"].includes(options.status)) {
        throw new Error("Status inválido.");
    }

    if (options.apply && (options.confirmDb !== target.database || !options.createdByEmail)) {
        throw new Error("Confirmação do banco/autor ausente ou divergente.");
    }

    let author;

    if (options.createdByEmail) {
        author = await prisma.user.findUnique({
            where: {
                email: options.createdByEmail.toLowerCase(),
            },
        });

        if (!author?.isActive || !["ADMIN", "EDITOR"].includes(author.role)) {
            throw new Error("Autor deve ser usuário existente ativo ADMIN ou EDITOR.");
        }
    } else {
        report.warnings.push("Autor não informado; necessário no --apply.");
    }

    const [existing, categories] = await Promise.all([
        prisma.patrimonio.findMany({
            select: {
                id: true,
                slug: true,
                nome: true,
                ...(options.backfillLocation && { localizacao: { select: { id: true } } }),
                ...(options.backfillDetails && { detalhes: { select: { id: true } } }),
                imagens: {
                    select: {
                        id: true,
                    },
                },
            },
        }),
        prisma.categoria.findMany({
            select: {
                id: true,
                nome: true,
            },
        }),
    ]);

    const slugs = new Set(existing.map((item) => item.slug));

    const names = new Set(existing.map((item) => normalizarNome(item.nome)));

const sourceNames = new Map();

    for (const item of source) {
        const key = normalizarNome(item.nome);

        sourceNames.set(key, (sourceNames.get(key) || 0) + 1);
    }

    const destinationDir = path.join(uploadDir, "patrimonios");

    for (const item of source) {
        const slug = slugify(item.nome || "");

        const legacySlug = LEGACY_SLUG_ALIASES.get(slug);

        const normalized = normalizarNome(item.nome);

        const row = {
            nome: item.nome,
            slug,
            acao: "ERRO",
        };

        report.itens.push(row);
        if (candidatosDaFonte(item, existing).length > 1) {
            report.conflitos.push({ slug, motivo: "Identidade ambígua entre slug e alias." });
            row.acao = "CONFLITO"; continue;
        }

        // Novos modos escrevem somente nas relações; nem updatedAt do patrimônio é alterado.
        if (options.backfillLocation || options.backfillDetails) {
            const location = options.backfillLocation;
            const relation = location ? "localizacao" : "detalhes";
            const analyzed = location ? "analisadosLocalizacao" : "analisadosDetalhes";
            const present = location ? "jaComLocalizacao" : "jaComDetalhes";
            const planned = location ? "vincularLocalizacao" : "vincularDetalhes";
            const missing = location ? "semLocalizacaoNaFonte" : "semDetalhesNaFonte";
            // Contadores por patrimônio, como no backfill de imagens.
            const linked = location ? "localizacoesVinculadas" : "detalhesVinculados";
            const hasRelation = (p) => location ? Boolean(p.localizacao) : Boolean(p.detalhes?.length);

            report[analyzed]++;

            const patrimonio =
                candidatosDaFonte(item, existing)[0] || null;

            if (!patrimonio) {
                report.conflitos.push({
                    slug,
                    motivo: "Patrimônio existente não localizado para backfill.",
                });
                row.acao = "CONFLITO";
                continue;
            }

            report.existentes++;

            if (hasRelation(patrimonio)) {
                report[present]++;
                report.ignorar++;
                row.acao = "IGNORAR";
                continue;
            }

            try {
                let data;

                if (location) {
                    if (!item.endereco?.trim() || !item.bairro?.trim()) {
                        report[missing]++;
                        report.ignorar++;
                        row.acao = "SEM_LOCALIZACAO_NA_FONTE";
                        continue;
                    }

                    const localizacao = {
                        endereco: item.endereco,
                        bairro: item.bairro,
                        cidade: item.cidade ?? "Guarulhos",
                        uf: item.uf ?? "SP",
                    };
                    for (const field of ["numero", "cep", "latitude", "longitude"]) {
                        if (item[field] != null) localizacao[field] = item[field];
                    }
                    data = localizacaoSchema.parse(localizacao);

                    if (data.latitude != null &&
                        (data.latitude < -23.7 || data.latitude > -23.1 ||
                            data.longitude < -46.8 || data.longitude > -46.2)) {
                        report.warnings.push({
                            slug,
                            motivo: "Coordenadas fora da região esperada; sem correção automática.",
                        });
                    }
                } else {
                    if (item.detalhes == null || (Array.isArray(item.detalhes) && !item.detalhes.length)) {
                        report[missing]++;
                        report.ignorar++;
                        row.acao = "SEM_DETALHES_NA_FONTE";
                        continue;
                    }

                    // Valida todos antes de escrever, preservando os textos e a ordem da fonte.
                    detailSchema.parse(item.detalhes);
                    data = item.detalhes.map(({ icone, titulo, texto }, ordem) => ({
                        ...(icone !== undefined && { icone }),
                        titulo,
                        texto,
                        ordem,
                    }));
                }

                report[planned]++;
                row.acao = location ? "VINCULAR_LOCALIZACAO" : "VINCULAR_DETALHES";
                if (!options.apply) continue;

                const result = await prisma.$transaction(async (tx) => {
                    await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
                    const current = await tx.patrimonio.findUnique({
                        where: { id: patrimonio.id },
                        select: { id: true, [relation]: { select: { id: true } } },
                    });
                    if (!current) {
                        throw new Error("Patrimônio não encontrado durante o backfill.");
                    }
                    if (hasRelation(current)) {
                        return { created: false, value: current[relation] };
                    }

                    if (location) {
                        const value = await tx.localizacao.create({
                            data: { ...data, patrimonioId: patrimonio.id },
                        });
                        return { created: true, value };
                    }

                    await tx.patrimonioDetalhe.createMany({
                        data: data.map((detail) => ({ ...detail, patrimonioId: patrimonio.id })),
                    });
                    return { created: true, value: data };
                });

                // Atualiza apenas o retrato em memória após o commit, evitando repetição na fonte.
                patrimonio[relation] = result.value;
                if (!result.created) {
                    report[planned]--;
                    report[present]++;
                    report.ignorar++;
                    row.acao = "IGNORAR";
                    continue;
                }

                report[linked]++;
                row.acao = location ? "LOCALIZACAO_VINCULADA" : "DETALHES_VINCULADOS";
            } catch (error) {
                row.acao = "ERRO";
                report.erros.push({ slug, motivo: errorText(error) });
            }
            continue;
        }

        // ===========================
        // BACKFILL DE IMAGENS
        // ===========================
        if (options.backfillImages) {
            report.analisados++;

            const patrimonio =
                candidatosDaFonte(item, existing)[0] || null;

            if (!patrimonio) {
                report.conflitos.push({
                    slug,
                    motivo: "Patrimônio existente não localizado para backfill.",
                });

                row.acao = "CONFLITO";

                continue;
            }

            report.existentes++;

            if (patrimonio.imagens?.length) {
                report.jaComImagem++;
                report.ignorar++;
                row.acao = "IGNORAR";
                continue;
            }

            if (!item.imagem) {
                report.semImagemNaFonte++;
                report.ignorar++;

                row.acao = "SEM_IMAGEM_NA_FONTE";

                continue;
            }

            let owned;

            try {
                const image = await validarImagem(item.imagem, sourceDir, destinationDir, io);

                report.vincularImagem++;
                row.acao = "VINCULAR_IMAGEM";

                if (!options.apply) {
                    continue;
                }

                await io.mkdir(destinationDir, {
                    recursive: true,
                });

                const rootReal = await io.realpath(uploadDir);

                if ((await io.realpath(destinationDir)) !== path.join(rootReal, "patrimonios")) {
                    throw new Error("Pasta de destino redirecionada.");
                }

                const checked = await validarImagem(item.imagem, sourceDir, destinationDir, io);

                if (!checked.reuse) {
                    await io.copyFile(image.source, image.destination, constants.COPYFILE_EXCL);

                    owned = {
                        path: image.destination,
                    };

                    owned.stat = await io.lstat(image.destination);

                    if (hash(await io.readFile(image.destination)) !== image.sourceHash) {
                        throw new Error("Imagem fonte mudou durante o backfill.");
                    }
                }

                await prisma.$transaction(async (tx) => {
                    await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");

                    const current = await tx.patrimonio.findUnique({
                        where: {
                            id: patrimonio.id,
                        },
                        select: {
                            id: true,
                            imagens: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    });

                    if (!current) {
                        throw new Error("Patrimônio não encontrado durante o backfill.");
                    }

                    if (current.imagens.length) {
                        throw new Error(
                            "Patrimônio recebeu imagem durante o backfill; execute dry-run novamente."
                        );
                    }

                    await tx.patrimonio.update({
                        where: {
                            id: patrimonio.id,
                        },
                        data: {
                            imagens: {
                                create: {
                                    url: image.url,
                                    textoAlternativo: patrimonio.nome,
                                    principal: true,
                                    ordem: 0,
                                },
                            },
                        },
                    });
                });

                owned = null;

                patrimonio.imagens = [
                    {
                        id: "backfill",
                    },
                ];

                report.imagensVinculadas++;

                row.acao = "IMAGEM_VINCULADA";
            } catch (error) {
                row.acao = "ERRO";

                report.erros.push({
                    slug,
                    motivo: errorText(error),
                });

                if (owned) {
                    try {
                        const current = await io.lstat(owned.path);

                        if (
                            owned.stat &&
                            (current.dev !== owned.stat.dev || current.ino !== owned.stat.ino)
                        ) {
                            throw new Error("Arquivo mudou após a cópia.");
                        }

                        await io.unlink(owned.path);
                    } catch (cleanupError) {
                        report.warnings.push({
                            slug,
                            arquivoOrfao: owned.path,
                            motivo: errorText(cleanupError),
                        });
                    }
                }
            }

            continue;
        }

        // ===========================
        // IMPORTAÇÃO NORMAL
        // ===========================
        if (candidatosDaFonte(item, existing).length) {
            report.existentes++;
            report.ignorar++;
            row.acao = "IGNORAR";
            continue;
        }

        if (names.has(normalized) || sourceNames.get(normalized) > 1) {
            report.conflitos.push({
                slug,
                motivo: "Nome normalizado duplicado com slug divergente ou fonte repetida.",
            });

            row.acao = "CONFLITO";

            continue;
        }

        let owned;

        try {
            if (!slug || slug.length > 220) {
                throw new Error("Slug inválido.");
            }

            if (normalizarNome(item.nome) === "antigo poco municipal" && options.status === "PUBLICADO") {
                throw new Error("Antigo Poço Municipal deve permanecer RASCUNHO até confirmação documental.");
            }

            const category = categories.find(
                (c) => normalizarNome(c.nome) === normalizarNome(item.categoria)
            );

            if (!category) {
                throw new Error("Categoria inexistente: " + item.categoria);
            }

            const coords = [item.latitude, item.longitude].map((v) => v != null);

            if (coords[0] !== coords[1]) {
                throw new Error("Latitude e longitude devem existir juntas.");
            }

            if (
                coords[0] &&
                (!Number.isFinite(item.latitude) ||
                    !Number.isFinite(item.longitude) ||
                    Math.abs(item.latitude) > 90 ||
                    Math.abs(item.longitude) > 180)
            ) {
                throw new Error("Coordenadas fora da faixa.");
            }

            let localizacao;

            if (item.endereco?.trim() && item.bairro?.trim()) {
                localizacao = {
                    endereco: item.endereco,
                    bairro: item.bairro,
                    cidade: item.cidade ?? "Guarulhos",
                    uf: item.uf ?? "SP",
                };

                for (const field of ["numero", "cep", "latitude", "longitude"]) {
                    if (item[field] != null) {
                        localizacao[field] = item[field];
                    }
                }
            } else if (coords[0] || item.endereco || item.bairro) {
                report.warnings.push({
                    slug,
                    motivo: "Localização incompleta; não será criada.",
                });
            }

            if (
                coords[0] &&
                (item.latitude < -23.7 ||
                    item.latitude > -23.1 ||
                    item.longitude < -46.8 ||
                    item.longitude > -46.2)
            ) {
                report.warnings.push({
                    slug,
                    motivo: "Coordenadas fora da região esperada; sem correção automática.",
                });
            }

            const data = createPatrimonioSchema.parse({
                nome: item.nome,
                descricao: repararTexto(item.descricao),
                descricaoResumida: repararTexto(
                    item.descricaoResumida || item.descricao?.slice(0, 500)
                ),
                categoriaId: category.id,
                situacao: item.situacao,

                ...(item.historia && {
                    historia: repararTexto(item.historia),
                }),

                ...(item.importanciaCultural && {
                    importanciaCultural: repararTexto(item.importanciaCultural),
                }),

                ...(localizacao && {
                    localizacao,
                }),
            });

            const details = detailSchema.parse(
                (item.detalhes || []).map((d) => ({
                    ...d,
                    titulo: repararTexto(d.titulo),
                    texto: repararTexto(d.texto),
                }))
            );

            const image = await validarImagem(item.imagem, sourceDir, destinationDir, io);

            if (image?.reuse) {
                report.warnings.push({
                    slug,
                    motivo: "Imagem existente idêntica será reutilizada.",
                });
            }

            report.criar++;

            row.acao = "CRIAR";

            if (!options.apply) {
                continue;
            }

            if (image) {
                await io.mkdir(destinationDir, {
                    recursive: true,
                });

                const rootReal = await io.realpath(uploadDir);

                if ((await io.realpath(destinationDir)) !== path.join(rootReal, "patrimonios")) {
                    throw new Error("Pasta de destino redirecionada.");
                }

                // Revalida imediatamente antes da cópia,
                // inclusive quando o arquivo já existe.
                const checked = await validarImagem(item.imagem, sourceDir, destinationDir, io);

                if (!checked.reuse) {
                    await io.copyFile(image.source, image.destination, constants.COPYFILE_EXCL);

                    owned = {
                        path: image.destination,
                    };

                    owned.stat = await io.lstat(image.destination);

                    if (hash(await io.readFile(image.destination)) !== image.sourceHash) {
                        throw new Error("Imagem fonte mudou durante a importação.");
                    }
                }
            }

            await prisma.$transaction(async (tx) => {
                // Serializa importadores;
                // não impede edições administrativas externas.
                await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");

                const current = await tx.patrimonio.findMany({
                    select: {
                        slug: true,
                        nome: true,
                    },
                });

                if (
                    current.some(
                        (p) =>
                            p.slug === slug ||
                            p.slug === legacySlug ||
                            normalizarNome(p.nome) === normalized
                    )
                ) {
                    throw new Error(
                        "Patrimônio apareceu durante a importação; execute dry-run novamente."
                    );
                }

                const { localizacao: local, ...fields } = data;

                const created = await tx.patrimonio.create({
                    data: {
                        ...fields,
                        slug,
                        createdBy: author.id,
                        status: options.status,
                        publicadoEm: options.status === "PUBLICADO" ? new Date() : null,

                        ...(local && {
                            localizacao: {
                                create: local,
                            },
                        }),

                        ...(details.length && {
                            detalhes: {
                                create: details.map((d, ordem) => ({
                                    ...d,
                                    ordem,
                                })),
                            },
                        }),

                        ...(image && {
                            imagens: {
                                create: {
                                    url: image.url,
                                    textoAlternativo: data.nome,
                                    principal: true,
                                    ordem: 0,
                                },
                            },
                        }),
                    },
                });
                await tx.auditLog.create({ data: { userId: author.id, action: "INITIAL_LOAD_BINDING", entity: "Patrimonio",
                    entityId: created.id, newValues: { sourceKey: chaveDaFonte(item), tipo: "importador", criado: true } } });
            });

            owned = null;

            slugs.add(slug);
            names.add(normalized);

            report.criados++;
            row.acao = "CRIADO";
        } catch (error) {
            row.acao = "ERRO";

            report.erros.push({
                slug,
                motivo: errorText(error),
            });

            if (owned) {
                try {
                    const current = await io.lstat(owned.path);

                    if (
                        owned.stat &&
                        (current.dev !== owned.stat.dev || current.ino !== owned.stat.ino)
                    ) {
                        throw new Error("Arquivo mudou após a cópia.");
                    }

                    await io.unlink(owned.path);
                } catch (cleanupError) {
                    report.warnings.push({
                        slug,
                        arquivoOrfao: owned.path,
                        motivo: errorText(cleanupError),
                    });
                }
            }
        }
    }

    return report;
}

// O lote inteiro é revisado e aplicado na mesma transação; nenhum commit por item.
export async function importPatrimonios(args) {
    const { prisma, databaseUrl, options = parseArgs([]), source = PATRIMONIOS_SEED, io = fs } = args;
    if (options.syncPatrimonios) {
        const { syncPatrimonios } = await import("./sync-patrimonios.js");
        return syncPatrimonios({ sourceDir: SOURCE_DIR, uploadDir: UPLOAD_DIR, ...args, options, source, io });
    }
    validarModosBackfill(options);
    const target = databaseIdentity(databaseUrl), owned = [];
    if (options.apply && (options.confirmDb !== target.database || !options.createdByEmail)) throw new Error("Confirmação do banco/autor ausente ou divergente.");
    const reads = new Map();
    const reviewedIo = { ...io,
        readFile: async (...params) => { const value = await io.readFile(...params); reads.set(String(params[0]), hash(value)); return value; },
        copyFile: async (from, to, flags) => {
            await io.copyFile(from, to, flags);
            const stat = await io.lstat(to);
            owned.push({ path: to, stat, digest: hash(await io.readFile(to)) });
        },
    };
    try {
        return await prisma.$transaction(async tx => {
            if (!options.apply) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            const [{ banco }] = await tx.$queryRawUnsafe("SELECT current_database() AS banco");
            if (banco !== target.database) throw new Error("Banco conectado diverge da URL.");
            if (options.apply) {
                if (options.confirmDb !== target.database || !options.createdByEmail) throw new Error("Confirmação do banco/autor ausente ou divergente.");
                await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
                await tx.$queryRawUnsafe("SELECT id FROM patrimonio ORDER BY id FOR UPDATE");
                await tx.$queryRawUnsafe("SELECT id FROM users ORDER BY id FOR UPDATE");
            }
            const author = options.createdByEmail ? await tx.user.findUnique({ where: { email: options.createdByEmail.toLowerCase() } }) : null;
            if ((options.apply || options.createdByEmail) && (!author?.isActive || !["ADMIN", "EDITOR"].includes(author.role))) throw new Error("Autor deve ser usuário existente ativo ADMIN ou EDITOR.");
            if (options.status === "PUBLICADO" && author?.role !== "ADMIN") throw new Error("Somente ADMIN pode publicar mediante --status=PUBLICADO.");
            const { SYNC_INCLUDE } = await import("./sync-patrimonios.js");
            const state = await tx.patrimonio.findMany({ include: SYNC_INCLUDE, orderBy: { id: "asc" } });
            const categories = await tx.categoria.findMany({ orderBy: { id: "asc" } });
            const bindings = await tx.auditLog.findMany({ where: { action: "INITIAL_LOAD_BINDING" }, orderBy: { id: "asc" } });
            const boundSource = vincularFonte(source, bindings);
            const facade = { ...tx, $transaction: async callback => callback(tx) };
            const report = await executarImportacaoLegada({ ...args, prisma: facade, options: { ...options, apply: false }, source: boundSource, io: reviewedIo });
            if (boundSource.some(item => item.bindingIds.some(id => !state.some(row => row.id === id)))) report.conflitos.push({ motivo: "VINCULO_ORIGEM_REMOVIDO" });
            report.modo = options.apply ? "apply" : "dry-run";
            report.estado_hash = hashEstado({ target, source, bindings: ordenarRelacoes(bindings), state: ordenarRelacoes(state), categories: ordenarRelacoes(categories),
                author: author && { id: author.id, role: author.role, isActive: author.isActive },
                status: options.status, mode: [options.backfillImages, options.backfillLocation, options.backfillDetails].map(Boolean), reads: [...reads].sort() });
            if (!options.apply) return report;
            if (!/^[a-f0-9]{64}$/.test(options.expectedStateHash || "")) throw new Error("Apply exige --expected-state-hash revisado.");
            if (report.estado_hash !== options.expectedStateHash) report.conflitos.push({ motivo: "ESTADO_DESATUALIZADO" });
            if (report.conflitos.length || report.erros.length) return report;
            const applied = await executarImportacaoLegada({ ...args, prisma: facade, options, source: boundSource, io: reviewedIo });
            if (applied.erros.length || applied.conflitos.length) throw Object.assign(new Error("Lote revertido integralmente após falha de aplicação."), { report: applied });
            return { ...applied, estado_hash: report.estado_hash };
        }, { isolationLevel: options.apply ? "Serializable" : "RepeatableRead", timeout: 120000, maxWait: 10000 });
    } catch (error) {
        if (owned.length) await prisma.$transaction(async tx => {
            await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(6062026)::text");
            for (const file of owned) {
                try {
                    if (await tx.patrimonioImagem.count({ where: { url: "/uploads/patrimonios/" + path.basename(file.path) } })) continue;
                    const stat = await io.lstat(file.path);
                    if (stat.dev === file.stat.dev && stat.ino === file.stat.ino && hash(await io.readFile(file.path)) === file.digest) await io.unlink(file.path);
                } catch (cleanup) { if (cleanup.code !== "ENOENT") console.error("Pendência de compensação do importador.", { code: cleanup.code, caminho: file.path }); }
            }
        }).catch(cleanup => console.error("Falha na compensação do importador.", { code: cleanup.code }));
        throw error;
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    const databaseUrl = process.env.DATABASE_URL;

    databaseIdentity(databaseUrl);

    const prisma = new PrismaClient({
        adapter: new PrismaPg({
            connectionString: databaseUrl,
        }),
    });

    try {
        const report = await importPatrimonios({
            prisma,
            databaseUrl,
            options,
        });

        if (options.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log("Destino:", report.host, "porta:", report.porta, "banco:", report.banco);

            console.log(
                "Modo:",
                report.modo,
                "status:",
                report.status,
                "backfillImages:",
                report.backfillImages ? "sim" : "não"
            );

            console.table(report.itens);

            console.log(JSON.stringify(report, null, 2));
        }

        if (report.erros.length || report.conflitos.length) {
            process.exitCode = 1;
        }
    } finally {
        await prisma.$disconnect();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(errorText(error));
        process.exitCode = 1;
    });
}
