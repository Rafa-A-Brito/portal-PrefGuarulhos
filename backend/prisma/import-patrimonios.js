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
const LEGACY_SLUG_ALIASES = new Map([
    ["centro-municipal-de-educacao-adamastor", "antiga-fabrica-adamastor"],
    [
        "antiga-igreja-matriz-colonial-de-n-sra-da-conceicao-demolida",
        "antiga-igreja-matriz-colonial-de-nossa-senhora-da-conceicao",
    ],
    ["parque-bosque-maia", "bosque-maia"],
    ["casarao-da-familia-albertis-demolido-em-2023", "casarao-da-familia-albertis"],
    ["casarao-lima-demolido-em-2026", "casarao-lima"],
    ["casarao-saraceni-demolido-em-2010", "casarao-saraceni"],
    ["e-e-capistrano-de-abreu", "escola-estadual-capistrano-de-abreu"],
    ["e-e-conselheiro-crispiniano", "escola-estadual-conselheiro-crispiniano"],
    ["estacao-ferroviaria-de-guarulhos", "estacao-ferroviaria-central-de-guarulhos"],
    [
        "igreja-de-nossa-senhora-de-bonsucesso",
        "igreja-de-nossa-senhora-de-bonsucesso-e-nucleo-historico",
    ],
    [
        "igreja-de-n-sra-do-rosario-dos-homens-pretos",
        "igreja-de-nossa-senhora-do-rosario-dos-homens-pretos",
    ],
    ["locomotiva-maria-fumaca-n-33-e-vagao", "locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua"],
    ["reserva-e-represa-do-cabucu", "represa-do-cabucu"],
    ["complexo-sanatorio-padre-bento", "sanatorio-padre-bento"],
]);

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

const detailSchema = z.array(
    z.object({
        icone: z.string().nullable().optional(),
        titulo: z.string().trim().min(1),
        texto: z.string().trim().min(1),
    })
);

function validarModosBackfill(options) {
    if ([options.backfillImages, options.backfillLocation, options.backfillDetails].filter(Boolean).length > 1) {
        throw new Error("Use apenas um modo de backfill por execução.");
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
            ["--apply", "--dry-run", "--json", "--backfill-images", "--backfill-location", "--backfill-details"].includes(key) &&
            !parts.length
        ) {
            if (key === "--apply") options.apply = true;
            if (key === "--json") options.json = true;
            if (key === "--backfill-location") options.backfillLocation = true;
            if (key === "--backfill-details") options.backfillDetails = true;
            if (key === "--backfill-images") {
                options.backfillImages = true;
            }
        } else if (
            ["--status", "--confirm-db", "--created-by-email"].includes(key) &&
            value.trim()
        ) {
            options[
                {
                    "--status": "status",
                    "--confirm-db": "confirmDb",
                    "--created-by-email": "createdByEmail",
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

    return options;
}

function repararTexto(texto) {
    if (typeof texto !== "string" || !/[ÃÂ]/.test(texto)) {
        return texto;
    }

    const fixed = Buffer.from(texto, "latin1").toString("utf8");

    return fixed.includes("\uFFFD") ? texto : fixed;
}

async function validarImagem(nome, sourceDir, destinationDir, io) {
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

export async function importPatrimonios({
    prisma,
    databaseUrl,
    options = parseArgs([]),
    source = PATRIMONIOS_SEED,
    sourceDir = SOURCE_DIR,
    uploadDir = UPLOAD_DIR,
    io = fs,
}) {
    validarModosBackfill(options);

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

    const bySlug = new Map(existing.map((item) => [item.slug, item]));

    const byNormalizedName = new Map();

    for (const item of existing) {
        const key = normalizarNome(item.nome);

        if (!byNormalizedName.has(key)) {
            byNormalizedName.set(key, item);
        } else {
            byNormalizedName.set(key, null);
        }
    }

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
                bySlug.get(slug) ||
                (legacySlug ? bySlug.get(legacySlug) : null) ||
                byNormalizedName.get(normalized) ||
                null;

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
                        cidade: "Guarulhos",
                        uf: "SP",
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
                bySlug.get(slug) ||
                (legacySlug ? bySlug.get(legacySlug) : null) ||
                byNormalizedName.get(normalized) ||
                null;

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
        if (slugs.has(slug) || slugs.has(legacySlug)) {
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
                    cidade: "Guarulhos",
                    uf: "SP",
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

                await tx.patrimonio.create({
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
