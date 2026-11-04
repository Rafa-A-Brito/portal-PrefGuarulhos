import pg from "pg";
import env from "../config/env.js";
import config from "../config/feedback.js";
import BaseError from "../errors/BaseError.js";
import { logFailure, logEvent } from "../utils/logger.js";
import { chaveDigest, conteudoDigest, confirmarRecibo, validarNovo, indisponivel, desativado,
    erroFeedback, inicioDia, proximoDia, metaFeedback, montarResumo, DIA } from "../utils/feedback.js";
import { validarPeriodo } from "../schemas/feedbackSchema.js";

const colunasRecibo = 'chave_digest AS "chaveDigest", conteudo_digest AS "conteudoDigest", versao_chave AS "versaoChave", recebido_em AS "recebidoEm", expira_em AS "expiraEm"';
const colunasLista = 'id, tipo, created_at AS "createdAt"';
const colunasDetalhe = `${colunasLista}, mensagem, aviso_versao AS "avisoVersao", expira_em AS "expiraEm"`;
const desabilitada = () => ({ disponivel: false, motivo: "DESATIVADA" });

export function criarServicoFeedback({ pool, configuracao = config } = {}) {
    async function transacao(acao, leitura = false) {
        let client;
        try {
            client = await pool.connect();
            await client.query(leitura ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN");
            await client.query("SET LOCAL statement_timeout = '5s'");
            await client.query("SET LOCAL lock_timeout = '2s'");
            await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'");
            const resultado = await acao(client);
            await client.query("COMMIT");
            return resultado;
        } catch (error) {
            if (client) { try { await client.query("ROLLBACK"); } catch { /* conexão perdida */ } }
            if (error instanceof BaseError) throw error;
            // O chamador só pode resolver esta disputa por uma nova leitura após rollback.
            if (error.code === "23505" && error.constraint === "feedback_recibo_pkey") throw error;
            // Não repetir escrita: inclusive COMMIT sem resposta é resultado incerto.
            const temporario = /^(08|53|57|58)/.test(error.code ?? "") || ["55P03", "40001", "40P01", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EPIPE", "ENOTFOUND"].includes(error.code) ||
                /connection|timeout|terminated/i.test(error.message ?? "");
            logFailure("error", "FEEDBACK_DATABASE_FAILED", { status: temporario ? 503 : 500 }, error);
            if (temporario) throw indisponivel();
            throw erroFeedback(500, "INTERNAL_ERROR", "Erro interno do serviço de feedback.");
        } finally { client?.release(); }
    }
    async function agora(client) {
        return (await client.query('SELECT clock_timestamp()::timestamptz(3) AS agora')).rows[0].agora;
    }
    async function receber(body, chave) {
        if (!configuracao.chaves.length) throw desativado();
        const digest = chaveDigest(chave);
        let result;
        try { result = await transacao(async client => {
            // Lock entre instâncias, sem UPDATE e sem retry de escrita. Unicidade no banco permanece a autoridade.
            await client.query("SELECT pg_advisory_xact_lock(21402, hashtext($1))", [digest]);
            const { rows: [recibo] } = await client.query(`SELECT ${colunasRecibo} FROM feedback_recibo WHERE chave_digest=$1`, [digest]);
            // O instante só é obtido após a espera do lock e a leitura do recibo.
            const instante = await agora(client);
            if (recibo) return confirmarRecibo(recibo, body, configuracao, instante);
            validarNovo(body, configuracao);
            const conteudo = conteudoDigest(body, configuracao.atual, configuracao);
            const { rows: [registro] } = await client.query(`INSERT INTO feedback(tipo,mensagem,aviso_versao,created_at,expira_em)
                VALUES($1,$2,$3,$4,$5) RETURNING id`, [body.tipo, body.mensagem, body.avisoVersao, instante, new Date(+instante + 180 * DIA)]);
            await client.query(`INSERT INTO feedback_recibo(chave_digest,conteudo_digest,versao_chave,feedback_id,recebido_em,expira_em)
                VALUES($1,$2,$3,$4,$5,$6)`, [digest, conteudo, configuracao.atual, registro.id, instante, new Date(+instante + DIA)]);
            return { status: 201, data: { recebido: true, recebidoEm: instante.toISOString() } };
        }); } catch (error) {
            if (error.code !== "23505" || error.constraint !== "feedback_recibo_pkey") throw error;
            result = await transacao(async client => {
                const { rows: [recibo] } = await client.query(`SELECT ${colunasRecibo} FROM feedback_recibo WHERE chave_digest=$1`, [digest]);
                if (!recibo) throw indisponivel();
                return confirmarRecibo(recibo, body, configuracao, await agora(client));
            }, true);
        }
        logEvent("info", result.status === 201 ? "FEEDBACK_RECEBIDO" : "FEEDBACK_REPLAY", { status: result.status });
        return result;
    }
    function recorte(q, instante) {
        return { sql: "created_at >= $1 AND created_at < $2 AND expira_em > $3 AND ($4::tipo_feedback IS NULL OR tipo=$4::tipo_feedback)",
            args: [inicioDia(q.inicio), inicioDia(proximoDia(q.fim)), instante, q.tipo ?? null] };
    }
    async function consultar(q, acao) {
        if (!configuracao.consulta) return desabilitada();
        return transacao(async client => {
            const instante = await agora(client); validarPeriodo(q, instante);
            return acao(client, instante, recorte(q, instante));
        }, true);
    }
    async function listar(q) {
        return consultar(q, async (client, instante, r) => {
            const totalTexto = (await client.query(`SELECT count(*)::text AS total FROM feedback WHERE ${r.sql}`, r.args)).rows[0].total;
            if (BigInt(totalTexto) > BigInt(Number.MAX_SAFE_INTEGER)) throw indisponivel();
            const total = Number(totalTexto);
            const { rows: itens } = await client.query(`SELECT ${colunasLista} FROM feedback WHERE ${r.sql}
                ORDER BY created_at DESC, id DESC LIMIT $5 OFFSET $6`, [...r.args, q.limite, (q.pagina - 1) * q.limite]);
            return { disponivel: true, meta: metaFeedback(q, instante), itens,
                paginacao: { pagina: q.pagina, limite: q.limite, total, totalPaginas: Math.ceil(total / q.limite) } };
        });
    }
    async function resumir(q) {
        return consultar(q, async (client, instante, r) => {
            const tipos = (await client.query(`SELECT tipo, count(*)::text AS quantidade FROM feedback WHERE ${r.sql} GROUP BY tipo`, r.args)).rows;
            const periodos = (await client.query(`SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo', $5) AS periodo,
                count(*)::text AS quantidade FROM feedback WHERE ${r.sql} GROUP BY 1`, [...r.args, q.granularidade === "mes" ? "YYYY-MM" : "YYYY-MM-DD"])).rows;
            return montarResumo(q, instante, new Map(tipos.map(r => [r.tipo, r.quantidade])), new Map(periodos.map(r => [r.periodo, r.quantidade])));
        });
    }
    async function detalhar(id) {
        if (!configuracao.consulta) return desabilitada();
        return transacao(async client => {
            const instante = await agora(client);
            const { rows: [registro] } = await client.query(`SELECT ${colunasDetalhe} FROM feedback WHERE id=$1 AND expira_em>$2`, [id, instante]);
            if (!registro) throw erroFeedback(404, "NOT_FOUND", "Feedback não encontrado.");
            return { disponivel: true, registro };
        }, true);
    }
    return { receber, listar, resumir, detalhar };
}
// Pool é criado sem conexão; flags falsas não consultam tabelas novas.
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 4, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true });
pool.on("error", error => logFailure("error", "FEEDBACK_POOL_FAILED", { status: 503 }, error));
export const { receber, listar, resumir, detalhar } = criarServicoFeedback({ pool });
