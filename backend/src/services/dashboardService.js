import { Prisma, SituacaoPatrimonio } from "@prisma/client";
import prisma from "../config/prisma.js";
import { LEGADOS_EDITORIAIS, legadoEditorial } from "../utils/identidadeEditorial.js";

export async function getDashboard() {
    return prisma.$transaction(
        async (tx) => {
            await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            // Consultas sequenciais na mesma fotografia/conexão do PostgreSQL.
            const total = await tx.patrimonio.count();
            const status = await tx.patrimonio.groupBy({ by: ["status"], _count: { _all: true } });
            const grupos = await tx.patrimonio.groupBy({
                by: ["categoriaId"],
                _count: { _all: true },
            });
            const categorias = await tx.categoria.findMany({
                select: { id: true, nome: true, slug: true },
            });
            const locais = await tx.localizacao.groupBy({ by: ["bairro"], _count: { _all: true } });
            const situacoes = await tx.patrimonio.groupBy({ by: ["situacao"], _count: { _all: true } });
            const gruposRegionais = await tx.patrimonio.groupBy({ by: ["regiaoId"], _count: { _all: true } });
            // Inclui regiões inativas: seus vínculos continuam fazendo parte do acervo.
            const regioes = await tx.regiaoPatrimonio.findMany({ select: { id: true, nome: true, slug: true, ativo: true } });
            // A chave composta garante um vínculo por patrimônio/categoria secundária.
            const adicionais = await tx.patrimonioCategoria.groupBy({ by: ["categoriaId"], _count: { _all: true } });
            const registrosLegados = await tx.patrimonio.findMany({
                where: { OR: [
                    { id: { in: LEGADOS_EDITORIAIS.map(l => l.id) } },
                    { slug: { in: LEGADOS_EDITORIAIS.map(l => l.slug) } },
                ] },
                select: { id: true, nome: true, slug: true, status: true },
                orderBy: [{ nome: "asc" }, { id: "asc" }],
            });
            const contagens = new Map(grupos.map(g => [g.categoriaId, g._count._all]));
            const secundarias = new Map(adicionais.map(g => [g.categoriaId, g._count._all]));
            const porStatus = { RASCUNHO: 0, PUBLICADO: 0, ARQUIVADO: 0 };
            for (const item of status) porStatus[item.status] = item._count._all;
            const porCategoria = categorias
                .map(c => ({ ...c, quantidade: contagens.get(c.id) ?? 0, quantidadeSecundaria: secundarias.get(c.id) ?? 0 }))
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
            const porSituacao = Object.values(SituacaoPatrimonio).map(situacao => ({
                situacao, quantidade: situacoes.find(g => g.situacao === situacao)?._count._all ?? 0,
            }));
            const contagensRegionais = new Map(gruposRegionais.map(g => [g.regiaoId, g._count._all]));
            const porRegiao = regioes.map(r => ({ ...r, quantidade: contagensRegionais.get(r.id) ?? 0 }))
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
            const bairros = new Map();
            let semBairro = total;
            for (const local of locais) {
                const bairro = local.bairro?.trim();
                if (!bairro || bairro === "Não informado") continue;
                bairros.set(bairro, (bairros.get(bairro) ?? 0) + local._count._all);
                semBairro -= local._count._all;
            }
            if (semBairro > 0) bairros.set("Não informado", semBairro);
            const porBairro = [...bairros]
                .map(([bairro, quantidade]) => ({ bairro, quantidade }))
                .sort((a, b) => a.bairro.localeCompare(b.bairro, "pt-BR"));
            return {
                total,
                ...porStatus,
                porCategoria,
                porBairro,
                porSituacao,
                porRegiao,
                semRegiao: contagensRegionais.get(null) ?? 0,
                legados: {
                    total: registrosLegados.length,
                    arquivados: registrosLegados.filter(l => l.status === "ARQUIVADO").length,
                    itens: registrosLegados.map(l => ({ ...l, canonico: legadoEditorial(l).canonico })),
                },
                meta: {
                    baseContagem: "TODOS_OS_STATUS",
                    categoria: "PRINCIPAL",
                    publicados: porStatus.PUBLICADO,
                },
            };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );
}
