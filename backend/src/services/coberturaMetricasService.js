import { diaSaoPaulo } from "../utils/dataMetricas.js";

export async function consultarCobertura(tx, inicio, fim, agora) {
    const [op] = await tx.$queryRaw`SELECT inicio_observacao, agregados_antes_de::text AS inicio_disponivel, ultima_retencao_em
        FROM operacao_metricas WHERE id=1`;
    const dias = await tx.$queryRaw`WITH janelas AS (
        SELECT j, (j AT TIME ZONE 'America/Sao_Paulo')::date::text AS data
        FROM generate_series(${inicio}::date::timestamp AT TIME ZONE 'America/Sao_Paulo',
            LEAST((${fim}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo',
                to_timestamp(floor(extract(epoch FROM ${agora}::timestamptz)/300)*300)) - interval '5 minutes', interval '5 minutes') j
    ) SELECT data, count(*)::int AS esperadas,
        count(*) FILTER(WHERE s.estado='DISPONIVEL')::int AS disponiveis,
        count(*) FILTER(WHERE s.estado='DESATIVADA')::int AS desativadas,
        count(*) FILTER(WHERE s.estado='FALHA')::int AS falhas,
        count(*) FILTER(WHERE s.estado IS NULL)::int AS desconhecidas
        FROM janelas LEFT JOIN sondas_metricas s ON s.janela_inicio=j
            AND (${op?.inicio_disponivel ?? null}::date IS NULL OR j >= (${op?.inicio_disponivel ?? null}::date::timestamp AT TIME ZONE 'America/Sao_Paulo'))
        GROUP BY data ORDER BY data`;
    const hoje = diaSaoPaulo(agora);
    const inicioObservacao = op?.inicio_observacao?.toISOString() ?? null;
    const porDia = dias.map(d => ({ ...d, parcial: d.data === hoje,
        estado: op?.inicio_disponivel && d.data < op.inicio_disponivel ? "FORA_DA_RETENCAO"
            : d.disponiveis === d.esperadas ? "DISPONIVEL_NAS_SONDAS"
                : d.desconhecidas === d.esperadas ? "SEM_OBSERVACAO" : "PARCIAL" }));
    return { tipo: inicioObservacao ? "SONDAGEM_5_MIN" : "NAO_INSTRUMENTADA", inicioObservacao,
        inicioColeta: null, inicioDisponivel: op?.inicio_disponivel ?? null,
        ultimaRetencaoEm: op?.ultima_retencao_em?.toISOString() ?? null,
        porDia, resumo: porDia.reduce((r, d) => {
            for (const k of Object.keys(r)) r[k] += d[k];
            return r;
        }, { esperadas: 0, disponiveis: 0, desativadas: 0, falhas: 0, desconhecidas: 0 }) };
}
