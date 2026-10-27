import { Prisma, SituacaoPatrimonio, StatusPublicacao } from "@prisma/client";
import prisma from "../config/prisma.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import { createPatrimonioSchema, localizacaoSchema } from "../schemas/patrimonioSchema.js";
import { slugify } from "../utils/slug.js";
import { destinoPublicoWhere } from "../utils/identidadeEditorial.js";
import { fatoSelect, ligacaoSelect, ordemEditorial } from "./patrimonioEditorialService.js";
import { validarAtribuicaoRegiao, regiaoPublicSelect, regiaoAdminSelect } from "./regiaoService.js";
import { auditSnapshot, registrarAuditoria, AUDIT_ACTIONS as A, AUDIT_ENTITIES as E } from "../utils/auditoria.js";

const MAX_SLUG_ATTEMPTS = 1000;

const categoriaResumoSelect = { id: true, nome: true, slug: true };

// O Prisma devolve [{ categoria: {...} }]; achatamos para [{...}] antes de responder.
const categoriasAdicionaisSelect = {
    orderBy: { categoria: { nome: "asc" } },
    select: { categoria: { select: categoriaResumoSelect } },
};

function achatarCategorias(patrimonio) {
    const { categoriasAdicionais, ...resto } = patrimonio;
    return {
        ...resto,
        categoriasAdicionais: (categoriasAdicionais ?? []).map((item) => item.categoria),
    };
}

const publicListSelect = {
    numeroExibicao: true,
    ordemExibicao: true,
    regiao: { select: regiaoPublicSelect },
    id: true,
    nome: true,
    slug: true,
    descricaoResumida: true,
    situacao: true,
    publicadoEm: true,
    categoria: { select: categoriaResumoSelect },
    categoriasAdicionais: categoriasAdicionaisSelect,
    localizacao: true,
    imagens: {
        orderBy: [{ principal: "desc" }, { ordem: "asc" }],
        take: 1,
        select: {
            id: true,
            url: true,
            titulo: true,
            textoAlternativo: true,
            principal: true,
        },
    },
};

const publicDetailSelect = {
    numeroExibicao: true,
    ordemExibicao: true,
    regiao: { select: regiaoPublicSelect },
    fatos: { orderBy: ordemEditorial, select: fatoSelect },
    ligacoes: {
        where: { destino: destinoPublicoWhere }, orderBy: ordemEditorial,
        select: { ...ligacaoSelect, destino: { select: { id: true, slug: true, nome: true } } },
    },
    id: true,
    nome: true,
    slug: true,
    descricao: true,
    descricaoResumida: true,
    historia: true,
    importanciaCultural: true,
    situacao: true,
    publicadoEm: true,
    updatedAt: true,
    categoria: { select: { id: true, nome: true, slug: true, descricao: true } },
    categoriasAdicionais: categoriasAdicionaisSelect,
    localizacao: true,
    imagens: {
        orderBy: [{ principal: "desc" }, { ordem: "asc" }],
        select: {
            id: true,
            url: true,
            titulo: true,
            textoAlternativo: true,
            credito: true,
            fonte: true,
            ordem: true,
            principal: true,
        },
    },
    detalhes: {
        orderBy: { ordem: "asc" },
        select: { id: true, icone: true, titulo: true, texto: true, ordem: true },
    },
    documentos: {
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            titulo: true,
            descricao: true,
            url: true,
            tipo: true,
            fonte: true,
            dataDocumento: true,
            mimeType: true,
        },
    },
    rotas: {
        where: { rota: { status: StatusPublicacao.PUBLICADO } },
        orderBy: { ordem: "asc" },
        select: {
            ordem: true,
            rota: { select: { id: true, nome: true, slug: true, descricao: true } },
        },
    },
};

async function generateUniqueSlug(client, nome) {
    const baseSlug = slugify(nome);

    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
        const suffix = attempt === 1 ? "" : `-${attempt}`;
        const slug = `${baseSlug.slice(0, 220 - suffix.length)}${suffix}`;
        const existing = await client.patrimonio.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!existing) return slug;
    }

    const error = new ConflictError("Não foi possível gerar um slug único para o patrimônio.");
    error.code = "PATRIMONIO_SLUG_CONFLICT";
    throw error;
}

export async function listPatrimonios(query) {
    return listWithStatus(query, StatusPublicacao.PUBLICADO, publicListSelect);
}

export async function listAdminPatrimonios(query) {
    return listWithStatus(query, query.status, {
        ...publicListSelect,
        regiaoId: true,
        regiao: { select: regiaoAdminSelect },
        status: true,
        arquivadoEm: true,
    });
}

async function listWithStatus(
    { busca, categoria, situacao, bairro, regiao, numeroExibicao, pagina, limite },
    status,
    select
) {
    const where = {
        ...(regiao && { regiao: { is: { slug: regiao } } }),
        ...(numeroExibicao !== undefined && { numeroExibicao }),
        ...(status && { status }),
        ...(busca && {
            OR: [
                { nome: { contains: busca, mode: "insensitive" } },
                { descricaoResumida: { contains: busca, mode: "insensitive" } },
                { descricao: { contains: busca, mode: "insensitive" } },
                { historia: { contains: busca, mode: "insensitive" } },
                { importanciaCultural: { contains: busca, mode: "insensitive" } },
                { detalhes: { some: { OR: [
                    { titulo: { contains: busca, mode: "insensitive" } },
                    { texto: { contains: busca, mode: "insensitive" } },
                ] } } },
                { categoria: { OR: [
                    { nome: { contains: busca, mode: "insensitive" } },
                    { slug: { contains: busca, mode: "insensitive" } },
                ] } },
                { categoriasAdicionais: { some: { categoria: { OR: [
                    { nome: { contains: busca, mode: "insensitive" } },
                    { slug: { contains: busca, mode: "insensitive" } },
                ] } } } },
            ],
        }),
        // O filtro de categoria casa com a principal OU com alguma adicional.
        // Fica dentro de AND para não colidir com o OR da busca acima.
        ...(categoria && {
            AND: [
                {
                    OR: [
                        { categoria: { OR: [
                            { nome: { equals: categoria, mode: "insensitive" } },
                            { slug: { equals: categoria, mode: "insensitive" } },
                        ] } },
                        {
                            categoriasAdicionais: {
                                some: {
                                    categoria: { OR: [
                                        { nome: { equals: categoria, mode: "insensitive" } },
                                        { slug: { equals: categoria, mode: "insensitive" } },
                                    ] },
                                },
                            },
                        },
                    ],
                },
            ],
        }),
        ...(situacao && { situacao }),
        ...(bairro && {
            localizacao: { is: { bairro: { equals: bairro, mode: "insensitive" } } },
        }),
    };

    const [total, itens] = await Promise.all([
        prisma.patrimonio.count({ where }),
        prisma.patrimonio.findMany({
            where,
            skip: (pagina - 1) * limite,
            take: limite,
            orderBy: [{ ordemExibicao: { sort: "asc", nulls: "last" } }, { nome: "asc" }, { id: "asc" }],
            select,
        }),
    ]);

    return {
        itens: itens.map(achatarCategorias),
        paginacao: {
            pagina,
            limite,
            total,
            totalPaginas: Math.ceil(total / limite),
        },
    };
}

const adminInclude = {
    regiao: { select: regiaoAdminSelect },
    fatos: { orderBy: ordemEditorial, select: fatoSelect },
    ligacoes: { orderBy: ordemEditorial, select: ligacaoSelect },
    categoria: true,
    categoriasAdicionais: { include: { categoria: true } },
    localizacao: true,
    imagens: { orderBy: [{ principal: "desc" }, { ordem: "asc" }, { id: "asc" }] },
    detalhes: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
    documentos: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
};

export async function getAdminPatrimonio(id, client = prisma) {
    const patrimonio = await client.patrimonio.findUnique({ where: { id }, include: adminInclude });
    if (!patrimonio) {
        const error = new NotFoundError("Patrimônio não encontrado.");
        error.code = "PATRIMONIO_NOT_FOUND";
        throw error;
    }
    return achatarCategorias(patrimonio);
}

async function lockPatrimonio(transaction, id) {
    await transaction.$queryRaw`SELECT id FROM patrimonio WHERE id = ${id}::uuid FOR UPDATE`;
    return getAdminPatrimonio(id, transaction);
}

// Mesmo lock nas escritas manuais e na publicação, sempre antes do lock da
// linha. O PostgreSQL o libera no commit/rollback, inclusive entre processos.
async function lockNumeracaoEditorial(transaction) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(73033, 1)`;
}

async function completarNumeracaoEditorial(transaction, current) {
    if (current.numeroExibicao != null && current.ordemExibicao != null) return {};
    // Inclui rascunhos e arquivados: seus números continuam reservados.
    const { _max } = await transaction.patrimonio.aggregate({
        _max: { numeroExibicao: true, ordemExibicao: true },
    });
    const fields = {};
    for (const campo of ["numeroExibicao", "ordemExibicao"]) {
        if (current[campo] != null) continue; // zero é uma ordem válida
        const proximo = (_max[campo] ?? 0) + 1;
        if (proximo > 2147483647) {
            throw new ConflictError(`Limite de ${campo} atingido. Revise a organização editorial.`);
        }
        fields[campo] = proximo;
    }
    return fields;
}

function locationInput(localizacao) {
    if (!localizacao) return undefined;
    const { id, patrimonioId, ...fields } = localizacao;
    return Object.fromEntries(
        Object.entries(fields)
            .filter(([, value]) => value !== null)
            .map(([key, value]) => [
                key,
                ["latitude", "longitude"].includes(key) ? Number(value) : value,
            ])
    );
}

// latitude/longitude explicitamente null significam "limpar as coordenadas"
// (o front faz isso quando o endereço muda e não há geocodificação). No update
// o Prisma aceita null direto; já para validar a localização final (e para
// criar uma localização nova) as coordenadas nulas são simplesmente omitidas.
function semCoordenadasNulas(localizacao) {
    return Object.fromEntries(
        Object.entries(localizacao).filter(
            ([key, value]) => !(["latitude", "longitude"].includes(key) && value === null)
        )
    );
}

// Latitude e longitude só fazem sentido juntas: um ponto com só um dos
// valores deixaria o patrimônio num ponto errado ou fora do mapa sem aviso.
function validarParDeCoordenadas(localizacao) {
    const temLat = localizacao.latitude !== undefined;
    const temLng = localizacao.longitude !== undefined;

    if (temLat !== temLng) {
        throw new BadRequestError("Informe latitude e longitude juntas.");
    }
}

export async function updatePatrimonio(id, data, user) {
    if (Object.hasOwn(data, "fatos") || Object.hasOwn(data, "ligacoes")) {
        throw new BadRequestError("Use o CRUD editorial dedicado para fatos e ligacoes.");
    }
    return prisma.$transaction(async (transaction) => {
        await lockNumeracaoEditorial(transaction);
        const current = await lockPatrimonio(transaction, id);
        if (user.role !== "ADMIN" && (user.role !== "EDITOR" || current.status !== "RASCUNHO")) {
            throw new ForbiddenError("Editor pode editar somente rascunhos.");
        }
        if (Object.hasOwn(data, "regiaoId")) await validarAtribuicaoRegiao(transaction, data.regiaoId);
        const categoriaId = data.categoriaId ?? current.categoriaId;
        const adicionaisIds =
            data.categoriasAdicionais ?? current.categoriasAdicionais.map((item) => item.id);
        if (adicionaisIds.includes(categoriaId)) {
            throw new BadRequestError("A categoria principal não deve estar entre as adicionais.");
        }
        if (data.categoriaId !== undefined) {
            const categoria = await transaction.categoria.findUnique({
                where: { id: data.categoriaId },
            });
            if (!categoria) throw new BadRequestError("Categoria não encontrada.");
        }
        if (data.categoriasAdicionais !== undefined && adicionaisIds.length > 0) {
            const encontradas = await transaction.categoria.findMany({
                where: { id: { in: adicionaisIds } },
                select: { id: true },
            });
            if (encontradas.length !== adicionaisIds.length)
                throw new BadRequestError("Categoria adicional não encontrada.");
        }
        const { localizacao, categoriasAdicionais, ...fields } = data;
        let locationUpdate;
        if (localizacao !== undefined) {
            validarParDeCoordenadas(localizacao);
            const finalLocation = localizacaoSchema.parse(
                semCoordenadasNulas({ ...locationInput(current.localizacao), ...localizacao })
            );
            locationUpdate = current.localizacao
                ? { update: localizacao }
                : { create: finalLocation };
        }
        const before = auditSnapshot(E.PATRIMONIO, current);
        const updated = await transaction.patrimonio.update({
            where: { id },
            data: {
                ...fields,
                updatedBy: user.id,
                ...(locationUpdate && { localizacao: locationUpdate }),
                ...(categoriasAdicionais !== undefined && {
                    categoriasAdicionais: {
                        deleteMany: {},
                        create: categoriasAdicionais.map((categoriaId) => ({ categoriaId })),
                    },
                }),
            },
            include: adminInclude,
        });
        const after = achatarCategorias(updated);
        await registrarAuditoria(transaction, { userId: user.id, action: A.PATRIMONIO_UPDATE,
            entity: E.PATRIMONIO, entityId: id, before, after });
        return after;
    }, { isolationLevel: "ReadCommitted" }).catch(rethrowNumeroConflict);
}

function rethrowNumeroConflict(error) {
    if (error.code === "P2002" && JSON.stringify(error.meta ?? {}).includes("numero_exibicao")) {
        throw new ConflictError("Número de exibição já utilizado, inclusive por um patrimônio arquivado.");
    }
    throw error;
}

export async function changePatrimonioStatus(id, status, user, { transaction, dryRun = false } = {}) {
    if (user.role !== "ADMIN") throw new ForbiddenError();
    const change = async (transaction) => {
        if (!dryRun) await lockNumeracaoEditorial(transaction);
        const current = dryRun
            ? await getAdminPatrimonio(id, transaction)
            : await lockPatrimonio(transaction, id);
        if (current.status === status) return current;
        if (status === StatusPublicacao.PUBLICADO) {
            createPatrimonioSchema.parse({
                nome: current.nome,
                descricao: current.descricao,
                descricaoResumida: current.descricaoResumida,
                categoriaId: current.categoriaId,
                categoriasAdicionais: current.categoriasAdicionais.map((item) => item.id),
                historia: current.historia ?? undefined,
                importanciaCultural: current.importanciaCultural ?? undefined,
                situacao: current.situacao,
                localizacao: locationInput(current.localizacao),
            });
        } else if (status !== StatusPublicacao.ARQUIVADO) {
            throw new BadRequestError("Transição de status inválida.");
        }
        if (dryRun) return current;
        const numeracao = status === StatusPublicacao.PUBLICADO
            ? await completarNumeracaoEditorial(transaction, current)
            : {};
        const before = auditSnapshot(E.PATRIMONIO, current);
        const updated = await transaction.patrimonio.update({
            where: { id },
            data: {
                ...numeracao,
                status,
                updatedBy: user.id,
                ...(status === StatusPublicacao.PUBLICADO
                    ? { publicadoEm: new Date(), arquivadoEm: null }
                    : { arquivadoEm: new Date() }),
            },
            include: adminInclude,
        });
        const after = achatarCategorias(updated);
        await registrarAuditoria(transaction, { userId: user.id,
            action: status === StatusPublicacao.PUBLICADO ? A.PATRIMONIO_PUBLISH : A.PATRIMONIO_ARCHIVE,
            entity: E.PATRIMONIO, entityId: id, before, after });
        return after;
    };
    // A API mantém sua transação; operações em lote reutilizam a transação recebida.
    return (transaction ? change(transaction) : prisma.$transaction(change, {
        isolationLevel: "ReadCommitted",
    })).catch(rethrowNumeroConflict);
}

export async function getPatrimonioBySlug(slug) {
    const patrimonio = await prisma.patrimonio.findFirst({
        where: { slug, status: StatusPublicacao.PUBLICADO },
        select: publicDetailSelect,
    });

    if (!patrimonio) {
        const error = new NotFoundError("Patrimônio não encontrado.");
        error.code = "PATRIMONIO_NOT_FOUND";
        throw error;
    }

    return achatarCategorias(patrimonio);
}

export async function createPatrimonio(data, createdBy) {
    if (Object.hasOwn(data, "fatos") || Object.hasOwn(data, "ligacoes")) {
        throw new BadRequestError("Use o CRUD editorial dedicado para fatos e ligacoes.");
    }
    try {
        return await prisma.$transaction(async (transaction) => {
            await lockNumeracaoEditorial(transaction);
            await validarAtribuicaoRegiao(transaction, data.regiaoId);
            const categoria = await transaction.categoria.findUnique({
                where: { id: data.categoriaId },
                select: { id: true },
            });

            if (!categoria) {
                const error = new NotFoundError("Categoria não encontrada.");
                error.code = "CATEGORIA_NOT_FOUND";
                throw error;
            }

            // A principal não entra na lista de adicionais (o schema zod já rejeita, aqui é defesa extra).
            const adicionaisIds = [...new Set(data.categoriasAdicionais ?? [])].filter(
                (id) => id !== data.categoriaId
            );

            if (adicionaisIds.length > 0) {
                const encontradas = await transaction.categoria.findMany({
                    where: { id: { in: adicionaisIds } },
                    select: { id: true },
                });

                if (encontradas.length !== adicionaisIds.length) {
                    const error = new NotFoundError("Categoria adicional não encontrada.");
                    error.code = "CATEGORIA_NOT_FOUND";
                    throw error;
                }
            }

            const slug = await generateUniqueSlug(transaction, data.nome);

            const criado = await transaction.patrimonio.create({
                data: {
                    regiaoId: data.regiaoId,
                    numeroExibicao: data.numeroExibicao,
                    ordemExibicao: data.ordemExibicao,
                    nome: data.nome,
                    slug,
                    descricao: data.descricao,
                    descricaoResumida: data.descricaoResumida,
                    historia: data.historia,
                    importanciaCultural: data.importanciaCultural,
                    situacao: data.situacao ?? SituacaoPatrimonio.NAO_INFORMADO,
                    status: StatusPublicacao.RASCUNHO,
                    categoriaId: data.categoriaId,
                    createdBy,
                    ...(data.localizacao && { localizacao: { create: data.localizacao } }),
                    ...(adicionaisIds.length > 0 && {
                        categoriasAdicionais: {
                            create: adicionaisIds.map((categoriaId) => ({ categoriaId })),
                        },
                    }),
                },
                include: {
                    regiao: { select: regiaoAdminSelect },
                    categoria: true,
                    categoriasAdicionais: { include: { categoria: true } },
                    localizacao: true,
                },
            });

            const after = achatarCategorias(criado);
            await registrarAuditoria(transaction, { userId: createdBy, action: A.PATRIMONIO_CREATE,
                entity: E.PATRIMONIO, entityId: criado.id, after });
            return after;
        }, { isolationLevel: "ReadCommitted" });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = Array.isArray(error.meta?.target)
                ? error.meta.target.join(",")
                : String(error.meta?.target ?? "");

            if (target.includes("slug")) {
                const conflict = new ConflictError("Já existe um patrimônio com este slug.");
                conflict.code = "PATRIMONIO_SLUG_CONFLICT";
                throw conflict;
            }
        }

        rethrowNumeroConflict(error);
    }
}
