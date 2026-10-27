import { Prisma } from "@prisma/client";
import { logFailure } from "../utils/logger.js";
import prisma from "../config/prisma.js";
import { diaSaoPaulo } from "../utils/dataMetricas.js";
import { consultaMetricasSchema } from "../schemas/metricasSchema.js";
import { erroMetricas, indisponivel } from "./metricasService.js";
import { consultarCobertura } from "./coberturaMetricasService.js";

export async function consultarMetricas(query, db = prisma, agora = new Date()) {
    const q = consultaMetricasSchema.parse(query);
    if (q.fim > diaSaoPaulo(agora)) throw erroMetricas(400, "BAD_REQUEST", "Período futuro não permitido.");
    const filtro = Prisma.sql`v.dia >= ${q.inicio}::date AND v.dia <= ${q.fim}::date
        AND v.dia >= COALESCE((SELECT agregados_antes_de FROM operacao_metricas WHERE id=1),v.dia)
        ${q.patrimonioId ? Prisma.sql`AND p.id = ${q.patrimonioId}::uuid` : Prisma.empty}
        ${q.regiaoId ? Prisma.sql`AND p.regiao_id = ${q.regiaoId}::uuid` : Prisma.empty}
        ${q.semRegiao ? Prisma.sql`AND p.regiao_id IS NULL` : Prisma.empty}`;
    try {
        return await db.$transaction(async tx => {
            await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '1500ms'");
            const [total] = await tx.$queryRaw`SELECT COALESCE(sum(v.quantidade),0)::text quantidade,
                count(DISTINCT p.id)::int bens FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id WHERE ${filtro}`;
            const itens = await tx.$queryRaw`SELECT p.id, p.name AS nome, p.slug, p.status, sum(v.quantidade)::text quantidade
                FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id WHERE ${filtro}
                GROUP BY p.id ORDER BY sum(v.quantidade) DESC, p.id LIMIT ${q.limite} OFFSET ${(q.pagina - 1) * q.limite}`;
            const regioes = await tx.$queryRaw`SELECT p.regiao_id AS id, r.nome, r.slug, r.ativo, sum(v.quantidade)::text quantidade
                FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id
                LEFT JOIN regioes_patrimonio r ON r.id=p.regiao_id WHERE ${filtro}
                GROUP BY p.regiao_id, r.nome, r.slug, r.ativo ORDER BY r.nome, p.regiao_id`;
            const serie = await tx.$queryRaw`SELECT v.dia::text data, sum(v.quantidade)::text quantidade
                FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id WHERE ${filtro}
                GROUP BY v.dia ORDER BY v.dia`;
            const observacao = await consultarCobertura(tx, q.inicio, q.fim, agora);
            return { disponivel: true, meta: { versaoRegra: 1, fuso: "America/Sao_Paulo", inicio: q.inicio, fim: q.fim,
                geradoEm: agora.toISOString(), unidade: "IDENTIDADE_PATRIMONIO_DIA", elegibilidade: "PUBLICADO_CANONICO_NA_ACEITACAO",
                regiaoReferencia: "CADASTRO_ATUAL", cobertura: observacao.tipo, granularidade: "dia",
                inicioColeta: observacao.inicioColeta, inicioObservacao: observacao.inicioObservacao,
                inicioDisponivel: observacao.inicioDisponivel, observacao },
            visualizacoes: { totalRegistrado: total.quantidade,
                porPatrimonio: { itens, paginacao: { pagina: q.pagina, limite: q.limite, total: total.bens } },
                porRegiao: regioes.filter(r => r.id !== null), semRegiao: regioes.find(r => r.id === null)?.quantidade ?? "0", serie },
            favoritos: { disponivel: false } };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 500, timeout: 3000 });
    } catch (error) { logFailure("error", "DATABASE_OPERATION_FAILED", { status: 503 }, error); throw indisponivel(); }
}
