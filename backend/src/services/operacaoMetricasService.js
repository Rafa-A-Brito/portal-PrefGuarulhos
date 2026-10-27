import { diaSaoPaulo } from "../utils/dataMetricas.js";

export function limitesRetencao(agora) {
    const hoje = diaSaoPaulo(agora);
    const recibos = new Date(hoje); recibos.setUTCDate(recibos.getUTCDate() - 7);
    const data = new Date(hoje), dia = data.getUTCDate();
    data.setUTCDate(1); data.setUTCMonth(data.getUTCMonth() - 13);
    const ultimo = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
    data.setUTCDate(Math.min(dia, ultimo));
    return { hoje, recibos: recibos.toISOString().slice(0, 10), agregados: data.toISOString().slice(0, 10) };
}

async function transacao(client, fn) {
    await client.query("BEGIN");
    try {
        await client.query("SET LOCAL lock_timeout='200ms'");
        await client.query("SET LOCAL statement_timeout='3000ms'");
        await client.query("SET LOCAL idle_in_transaction_session_timeout='5000ms'");
        const result = await fn();
        await client.query("COMMIT");
        return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
}

// Recebe conexão pg dedicada e já identificada pelo executor. Nunca usa DATABASE_URL.
export async function reterMetricas(client, { agora = new Date(), lote = 1000, maxLotes = 200 } = {}) {
    if (!Number.isInteger(lote) || lote < 1 || lote > 1000 || !Number.isInteger(maxLotes) || maxLotes < 1 || maxLotes > 200) throw new Error("LOTE_INVALIDO");
    const { rows: [lock] } = await client.query("SELECT pg_try_advisory_lock(21400,1) AS obtido");
    if (!lock.obtido) return { estado: "EM_EXECUCAO" };
    const cortes = limitesRetencao(agora), resumo = { estado: "PENDENTE", lotes: 0, recibos: 0, agregados: 0, sondas: 0, cortes };
    try {
        await client.query("INSERT INTO operacao_metricas(id) VALUES(1) ON CONFLICT DO NOTHING");
        while (resumo.lotes < maxLotes) {
            const terminou = await transacao(client, async () => {
                const { rows: [op] } = await client.query("SELECT recibos_antes_de::text piso FROM operacao_metricas WHERE id=1");
                if (op.piso && op.piso > cortes.recibos) throw new Error("RELOGIO_RETROCEDEU");
                const { rows: [pendente] } = await client.query(`SELECT min(dia)::text dia FROM (
                    SELECT dia FROM visualizacoes_unicas_dia WHERE dia < $1::date
                    UNION SELECT dia FROM visualizacoes_totais_dia WHERE dia < $1::date AND ($2::date IS NULL OR dia >= $2::date)
                ) d WHERE NOT EXISTS(SELECT 1 FROM dias_metricas_conferidos c WHERE c.dia=d.dia)
                OR EXISTS(SELECT 1 FROM visualizacoes_unicas_dia u WHERE u.dia=d.dia)`, [cortes.recibos, op.piso]);
                if (!pendente.dia) {
                    await client.query("SELECT pg_advisory_xact_lock(21402,1)");
                    const { rowCount: novos } = await client.query("SELECT 1 FROM visualizacoes_unicas_dia WHERE dia < $1::date LIMIT 1", [cortes.recibos]);
                    if (novos) return false;
                    await client.query("UPDATE operacao_metricas SET recibos_antes_de=$1::date WHERE id=1", [cortes.recibos]);
                    // Selos antigos já estão cobertos pelo piso durável.
                    await client.query("DELETE FROM dias_metricas_conferidos WHERE dia < $1::date", [cortes.recibos]);
                    return true;
                }
                const dia = pendente.dia;
                await client.query("SELECT pg_advisory_xact_lock(21401,to_char($1::date,'YYYYMMDD')::int)", [dia]);
                const { rowCount: selado } = await client.query("SELECT 1 FROM dias_metricas_conferidos WHERE dia=$1::date", [dia]);
                if (!selado) {
                    const { rows: [check] } = await client.query(`WITH recibos AS (
                        SELECT patrimonio_id,count(*) quantidade FROM visualizacoes_unicas_dia WHERE dia=$1::date GROUP BY patrimonio_id
                    ), totais AS (SELECT patrimonio_id,quantidade FROM visualizacoes_totais_dia WHERE dia=$1::date)
                    SELECT EXISTS(SELECT 1 FROM recibos r FULL JOIN totais t USING(patrimonio_id)
                        WHERE COALESCE(r.quantidade,0) <> COALESCE(t.quantidade,0)) divergente`, [dia]);
                    if (check.divergente) throw new Error("RECONCILIACAO_DIVERGENTE");
                    await client.query("INSERT INTO dias_metricas_conferidos(dia,conferido_em) VALUES($1::date,$2)", [dia, agora]);
                }
                const result = await client.query(`DELETE FROM visualizacoes_unicas_dia WHERE (dia,patrimonio_id,chave_visitante) IN
                    (SELECT dia,patrimonio_id,chave_visitante FROM visualizacoes_unicas_dia WHERE dia=$1::date
                        ORDER BY patrimonio_id,chave_visitante LIMIT $2)`, [dia, lote]);
                resumo.recibos += result.rowCount;
                return false;
            });
            resumo.lotes++;
            if (terminou) break;
        }
        if (resumo.lotes >= maxLotes) return resumo;
        // Um lote de agregados e sondas por transação; avanço do piso só no fim.
        while (resumo.lotes < maxLotes) {
            const terminou = await transacao(client, async () => {
                const a = await client.query(`DELETE FROM visualizacoes_totais_dia WHERE (dia,patrimonio_id) IN
                    (SELECT dia,patrimonio_id FROM visualizacoes_totais_dia WHERE dia < $1::date ORDER BY dia,patrimonio_id LIMIT $2)`, [cortes.agregados, lote]);
                const s = await client.query(`DELETE FROM sondas_metricas WHERE janela_inicio IN
                    (SELECT janela_inicio FROM sondas_metricas WHERE janela_inicio < ($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
                        ORDER BY janela_inicio LIMIT $2)`, [cortes.agregados, lote]);
                resumo.agregados += a.rowCount; resumo.sondas += s.rowCount;
                // Anuncia indisponibilidade a partir do primeiro lote, mesmo se houver crash.
                await client.query("UPDATE operacao_metricas SET agregados_antes_de=GREATEST(agregados_antes_de,$1::date) WHERE id=1", [cortes.agregados]);
                if (a.rowCount || s.rowCount) return false;
                await client.query("UPDATE operacao_metricas SET ultima_retencao_em=$1 WHERE id=1", [agora]);
                return true;
            });
            resumo.lotes++;
            if (terminou) { resumo.estado = "CONCLUIDA"; return resumo; }
        }
        return resumo;
    } finally { await client.query("SELECT pg_advisory_unlock(21400,1)"); }
}

export async function registrarSonda(client, estado, agora = new Date()) {
    if (!["DISPONIVEL", "DESATIVADA", "FALHA"].includes(estado)) throw new Error("ESTADO_INVALIDO");
    const janela = new Date(Math.floor(agora.getTime() / 300000) * 300000);
    return transacao(client, async () => {
        await client.query(`INSERT INTO operacao_metricas(id,inicio_observacao) VALUES(1,$1)
            ON CONFLICT(id) DO UPDATE SET inicio_observacao=LEAST(operacao_metricas.inicio_observacao,EXCLUDED.inicio_observacao)`, [janela]);
        const { rows: [gravada] } = await client.query(`INSERT INTO sondas_metricas(janela_inicio,observado_em,estado,versao_regra) VALUES($1,$2,$3,1)
            ON CONFLICT(janela_inicio) DO UPDATE SET
            estado=CASE WHEN sondas_metricas.estado='FALHA' OR EXCLUDED.estado='FALHA' THEN 'FALHA'::estado_sonda_metricas
                WHEN sondas_metricas.estado='DESATIVADA' OR EXCLUDED.estado='DESATIVADA' THEN 'DESATIVADA'::estado_sonda_metricas
                ELSE 'DISPONIVEL'::estado_sonda_metricas END,
            observado_em=GREATEST(sondas_metricas.observado_em,EXCLUDED.observado_em) RETURNING estado`, [janela, agora, estado]);
        return { janelaInicio: janela.toISOString(), estado: gravada.estado };
    });
}

export async function observarMetricas(client, { configurar, healthUrl, agora = new Date(), request = fetch }) {
    let estado;
    try {
        const config = await configurar();
        const response = await request(healthUrl, { signal: AbortSignal.timeout(2000), redirect: "error" });
        if (!response.ok || (await response.json())?.data?.status !== "ok") throw new Error("HEALTH");
        // Cada privilégio é conferido individualmente (uma lista significaria ANY).
        const { rows: [todos] } = await client.query(`SELECT bool_and(has_table_privilege('portal_api',t,p)) AS permitido FROM
            (VALUES ('visualizacoes_unicas_dia','SELECT'),('visualizacoes_unicas_dia','INSERT'),
            ('visualizacoes_totais_dia','SELECT'),('visualizacoes_totais_dia','INSERT'),('visualizacoes_totais_dia','UPDATE'),
            ('sondas_metricas','SELECT'),('operacao_metricas','SELECT'),('dias_metricas_conferidos','SELECT')) v(t,p)`);
        if (!todos.permitido) throw new Error("PRIVILEGIOS");
        estado = config.coleta ? "DISPONIVEL" : "DESATIVADA";
    } catch { estado = "FALHA"; }
    return registrarSonda(client, estado, agora);
}
