import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import BaseError from "../errors/BaseError.js";
import { legadoEditorial } from "../utils/identidadeEditorial.js";
import { logFailure } from "../utils/logger.js";

export function erroMetricas(status, code, message) {
    return Object.assign(new BaseError(message, status), { code });
}
export const indisponivel = () => erroMetricas(503, "COLETA_INDISPONIVEL", "Métricas temporariamente indisponíveis.");

export async function registrarVisualizacao({ patrimonioId, dia, chaveVisitante }, db = prisma) {
    try {
        await db.$transaction(async tx => {
            await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '200ms'");
            await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '750ms'");
            await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(21402,1)`;
            // Lock por dia: coleta compartilha; manutenção fecha somente dias antigos.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(21401, to_char(${dia}::date, 'YYYYMMDD')::int)`;
            const [fechado] = await tx.$queryRaw`SELECT EXISTS (
                SELECT 1 FROM dias_metricas_conferidos WHERE dia=${dia}::date
                UNION ALL SELECT 1 FROM operacao_metricas WHERE recibos_antes_de > ${dia}::date
            ) AS fechado`;
            if (fechado.fechado) throw indisponivel();
            const rows = await tx.$queryRaw`SELECT id, slug, status FROM patrimonio WHERE id = ${patrimonioId}::uuid FOR SHARE`;
            if (!rows[0] || rows[0].status !== "PUBLICADO" || legadoEditorial(rows[0])) {
                throw erroMetricas(404, "NOT_FOUND", "Patrimônio indisponível.");
            }
            // Recibo e incremento são atômicos; ON CONFLICT não incrementa em replay.
            await tx.$executeRaw`
                WITH novo AS (
                    INSERT INTO visualizacoes_unicas_dia (dia, patrimonio_id, chave_visitante)
                    VALUES (${dia}::date, ${patrimonioId}::uuid, ${chaveVisitante})
                    ON CONFLICT (dia, patrimonio_id, chave_visitante) DO NOTHING RETURNING 1
                )
                INSERT INTO visualizacoes_totais_dia (dia, patrimonio_id, quantidade)
                SELECT ${dia}::date, ${patrimonioId}::uuid, 1 FROM novo
                ON CONFLICT (dia, patrimonio_id) DO UPDATE
                SET quantidade = visualizacoes_totais_dia.quantidade + 1`;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 500, timeout: 2000 });
    } catch (error) {
        if (error instanceof BaseError) throw error;
        logFailure("error", "DATABASE_OPERATION_FAILED", { status: 503 }, error);
        // Não vazar SQL, parâmetros ou credenciais e não repetir transação implicitamente.
        throw indisponivel();
    }
}
