import "dotenv/config";
import pg from "pg";
import { pathToFileURL } from "node:url";
import { stat } from "node:fs/promises";
import assert from "node:assert/strict";

export async function conferirDestinoFeedback(client, env = process.env) {
    const u = new URL(env.FEEDBACK_OPERACAO_URL);
    assert.equal(u.search, ""); assert.equal(u.username, "portal_feedback_operador");
    assert.equal(u.hostname, env.FEEDBACK_OPERACAO_HOST); assert.equal(u.port || "5432", env.FEEDBACK_OPERACAO_PORTA);
    assert.equal(decodeURIComponent(u.pathname.slice(1)), env.FEEDBACK_OPERACAO_BANCO);
    assert.notEqual(env.FEEDBACK_OPERACAO_BANCO, "patrimonio_guarulhos");
    await client.query("BEGIN READ ONLY");
    try {
        const { rows: [r] } = await client.query(`SELECT current_database() banco,current_user papel,
            system_identifier::text cluster, current_setting('server_version_num')::int versao FROM pg_control_system()`);
        assert.equal(r.banco, env.FEEDBACK_OPERACAO_BANCO); assert.equal(r.papel, "portal_feedback_operador");
        assert.equal(r.cluster, env.FEEDBACK_OPERACAO_CLUSTER); assert.ok(r.versao >= 170000 && r.versao < 180000);
        return r;
    } finally { await client.query("ROLLBACK"); }
}

// Um lote por execução: limite rígido e nenhuma repetição automática de falha.
export async function descartarFeedback(client, { executar = false, lote = 500 } = {}) {
    assert.ok(Number.isInteger(lote) && lote >= 1 && lote <= 1000);
    await client.query(executar ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
        await client.query("SET LOCAL statement_timeout='5s'"); await client.query("SET LOCAL lock_timeout='2s'");
        const agora = (await client.query("SELECT clock_timestamp()::timestamptz(3) agora")).rows[0].agora;
        const resultado = { executar, corte: agora.toISOString(), feedback: "0", recibos: "0" };
        for (const [tabela, chave, campo] of [["feedback_recibo", "chave_digest", "recibos"], ["feedback", "id", "feedback"]]) {
            // Identificadores exclusivos desta lista, nunca provenientes da CLI.
            if (executar) {
                const r = await client.query(`DELETE FROM ${tabela} WHERE ${chave} IN
                    (SELECT ${chave} FROM ${tabela} WHERE expira_em <= $1 ORDER BY expira_em, ${chave} LIMIT $2)`, [agora, lote]);
                resultado[campo] = String(r.rowCount);
            } else resultado[campo] = (await client.query(`SELECT count(*)::text n FROM ${tabela} WHERE expira_em <= $1`, [agora])).rows[0].n;
        }
        await client.query("COMMIT"); return resultado;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
}

async function main() {
    const executar = process.argv[2] === "executar";
    assert.ok(["conferir", "executar"].includes(process.argv[2]));
    const u = new URL(process.env.FEEDBACK_OPERACAO_URL);
    // Conferência textual antes da conexão; não permite parâmetros de redirecionamento.
    assert.equal(u.search, ""); assert.equal(u.hostname, process.env.FEEDBACK_OPERACAO_HOST);
    assert.equal(u.port || "5432", process.env.FEEDBACK_OPERACAO_PORTA);
    assert.equal(u.pathname, "/" + process.env.FEEDBACK_OPERACAO_BANCO);
    assert.notEqual(u.pathname, "/patrimonio_guarulhos");
    if (executar) {
        assert.equal(process.env.FEEDBACK_DESCARTE_AUTORIZADO, "1");
        const backup = await stat(process.env.FEEDBACK_BACKUP_PATH);
        assert.ok(backup.isFile() && backup.size > 0 && Date.now() - backup.mtimeMs < 86400000, "Backup recente obrigatório.");
    }
    const client = new pg.Client({ connectionString: u.href, connectionTimeoutMillis: 5000 }); await client.connect();
    try {
        const destino = await conferirDestinoFeedback(client);
        const previa = await descartarFeedback(client);
        console.log(JSON.stringify({ destino, previa }));
        if (executar) console.log(JSON.stringify(await descartarFeedback(client, { executar: true })));
    } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(() => { console.error("DESCARTE_FEEDBACK_FALHOU: nenhuma repetição automática; conferir destino e autorização."); process.exitCode = 1; });
}
