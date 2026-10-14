import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

export async function getDashboard() {
    return prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        // Consultas sequenciais na mesma fotografia/conexão do PostgreSQL.
        const total = await tx.patrimonio.count();
        const status = await tx.patrimonio.groupBy({ by: ["status"], _count: { _all: true } });
        const grupos = await tx.patrimonio.groupBy({ by: ["categoriaId"], _count: { _all: true } });
        const categorias = await tx.categoria.findMany({ select: { id: true, nome: true, slug: true } });
        const locais = await tx.localizacao.groupBy({ by: ["bairro"], _count: { _all: true } });
        const nomes = new Map(categorias.map(c => [c.id, c]));
        const porStatus = { RASCUNHO: 0, PUBLICADO: 0, ARQUIVADO: 0 };
        for (const item of status) porStatus[item.status] = item._count._all;
        const porCategoria = grupos.map(g => ({ ...nomes.get(g.categoriaId), quantidade: g._count._all }))
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
        const porBairro = [...bairros].map(([bairro, quantidade]) => ({ bairro, quantidade }))
            .sort((a, b) => a.bairro.localeCompare(b.bairro, "pt-BR"));
        return { total, ...porStatus, porCategoria, porBairro,
            meta: { baseContagem: "TODOS_OS_STATUS", categoria: "PRINCIPAL", publicados: porStatus.PUBLICADO } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
