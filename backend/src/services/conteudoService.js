import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";
import BadRequestError from "../errors/BadRequestError.js";
import ForbiddenError from "../errors/ForbiddenError.js";
import NotFoundError from "../errors/NotFoundError.js";
import { slugify } from "../utils/slug.js";
import { removerArquivoUpload } from "../utils/arquivoUpload.js";

export function criarConteudoService({ model, tabela, schema, imagemObrigatoria, serializar, preparar, orderBy }) {
    const dto = (item, publico = false) => {
        const data = serializar(item);
        if (publico) {
            delete data.createdBy;
            delete data.updatedBy;
        }
        return data;
    };
    const validarPapel = (user, somenteAdmin = false) => {
        if (!user || !["ADMIN", "EDITOR"].includes(user.role) || (somenteAdmin && user.role !== "ADMIN")) {
            throw new ForbiddenError();
        }
    };
    const statusFields = (status, anterior) => {
        if (!status || status === anterior?.status) return {};
        return {
            status,
            publicadoEm: status === "PUBLICADO" ? new Date() : anterior?.publicadoEm ?? null,
            arquivadoEm: status === "ARQUIVADO" ? new Date() : null,
        };
    };
    async function lock(tx, id) {
        // Nome de tabela definido internamente, UUID validado nas rotas.
        await tx.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw(tabela)} WHERE id = ${id}::uuid FOR UPDATE`);
        const atual = await tx[model].findUnique({ where: { id } });
        if (!atual) throw new NotFoundError("Conteúdo não encontrado.");
        return atual;
    }
    async function list(query, publico = false) {
        const { pagina, limite, busca, tipo } = query;
        const where = {
            ...(publico ? { status: "PUBLICADO" } : query.status && { status: query.status }),
            ...(tipo && { tipo }),
            ...(busca && { titulo: { contains: busca, mode: "insensitive" } }),
        };
        const [total, itens] = await Promise.all([
            prisma[model].count({ where }),
            prisma[model].findMany({ where, skip: (pagina - 1) * limite, take: limite, orderBy }),
        ]);
        return { itens: itens.map((item) => dto(item, publico)), paginacao: {
            pagina, limite, total, totalPaginas: Math.ceil(total / limite),
        } };
    }
    async function detail(id) {
        const item = await prisma[model].findUnique({ where: { id } });
        if (!item) throw new NotFoundError("Conteúdo não encontrado.");
        return dto(item);
    }
    async function create(body, file, user) {
        validarPapel(user);
        const dados = schema.parse(body);
        if (user.role !== "ADMIN" && dados.status && dados.status !== "RASCUNHO") throw new ForbiddenError("Editor cria somente rascunhos.");
        if (imagemObrigatoria && !file?.url) throw new BadRequestError("Envie a imagem da exposição.");
        const base = slugify(dados.titulo).slice(0, 180);
        // A restrição UNIQUE também protege criações concorrentes.
        for (let tentativa = 0; tentativa < 5; tentativa++) {
            try {
                const item = await prisma[model].create({ data: {
                    ...preparar(dados),
                    slug: tentativa === 0 ? base : `${base}-${randomUUID()}`,
                    imagemUrl: file?.url ?? null,
                    status: dados.status ?? "RASCUNHO",
                    ...statusFields(dados.status),
                    createdBy: user.id,
                } });
                return dto(item);
            } catch (error) {
                if (error.code !== "P2002" || tentativa === 4) throw error;
            }
        }
    }
    async function update(id, body, file, user) {
        validarPapel(user);
        if (!Object.keys(body).length && !file) throw new BadRequestError("Informe algum campo para atualizar.");
        if (file && body.imagemUrl === null) throw new BadRequestError("Escolha entre substituir e remover a imagem.");
        const result = await prisma.$transaction(async (tx) => {
            const atual = await lock(tx, id);
            if (user.role !== "ADMIN" && (atual.status !== "RASCUNHO" || (body.status && body.status !== "RASCUNHO"))) {
                throw new ForbiddenError("Editor edita somente rascunhos.");
            }
            // Valida a combinação final: PATCH tipo=NOTICIA também exige resumo existente.
            const { id: _id, slug: _slug, createdBy: _createdBy, updatedBy: _updatedBy,
                createdAt: _createdAt, updatedAt: _updatedAt, publicadoEm: _publicadoEm,
                arquivadoEm: _arquivadoEm, imagemUrl: _imagemUrl, ...campos } = dto(atual);
            const { imagemUrl: _removerImagem, ...alteracoes } = body;
            const dados = schema.parse({ ...campos, ...alteracoes });
            const imagemUrl = file?.url ?? (body.imagemUrl === null ? null : atual.imagemUrl);
            if (imagemObrigatoria && !imagemUrl) throw new BadRequestError("Exposição precisa ter imagem.");
            const item = await tx[model].update({ where: { id }, data: {
                ...preparar(dados), imagemUrl, updatedBy: user.id, ...statusFields(dados.status, atual),
            } });
            return { item, antiga: atual.imagemUrl };
        });
        if (result.antiga !== result.item.imagemUrl) await removerArquivoUpload(result.antiga);
        return dto(result.item);
    }
    async function changeStatus(id, status, user) {
        validarPapel(user, true);
        return update(id, { status }, null, user);
    }
    async function remove(id, user) {
        validarPapel(user, true);
        const atual = await prisma.$transaction(async (tx) => {
            const item = await lock(tx, id);
            await tx[model].delete({ where: { id } });
            return item;
        });
        await removerArquivoUpload(atual.imagemUrl);
        return { id };
    }
    return { list, detail, create, update, changeStatus, remove };
}
