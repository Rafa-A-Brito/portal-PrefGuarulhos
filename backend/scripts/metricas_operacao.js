import "dotenv/config";
import pg from "pg";

// Credencial operacional explícita: nenhum fallback para DATABASE_URL ou URL da API.
export async function conectarOperacao(env = process.env) {
    const url = new URL(env.METRICAS_OPERACAO_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.search ||
        !env.METRICAS_OPERACAO_CLUSTER || !env.METRICAS_OPERACAO_BANCO || !env.METRICAS_OPERACAO_HOST || !env.METRICAS_OPERACAO_PORTA ||
        url.hostname !== env.METRICAS_OPERACAO_HOST || (url.port || "5432") !== env.METRICAS_OPERACAO_PORTA ||
        decodeURIComponent(url.pathname.slice(1)) !== env.METRICAS_OPERACAO_BANCO || url.username !== "portal_metricas_operador") throw new Error("DESTINO_NAO_CONFIRMADO");
    const client = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 3000, statement_timeout: 3000, application_name: "portal_metricas_operacao" });
    try {
        await client.connect();
        await client.query("BEGIN READ ONLY");
        const { rows: [id] } = await client.query(`SELECT current_database() banco,current_user papel,
            system_identifier::text cluster FROM pg_control_system()`);
        if (id.banco !== env.METRICAS_OPERACAO_BANCO || id.papel !== "portal_metricas_operador" || id.cluster !== env.METRICAS_OPERACAO_CLUSTER) throw new Error("DESTINO_NAO_CONFIRMADO");
        await client.query("ROLLBACK");
        return client;
    } catch (error) { await client.end(); throw error; }
}

export async function executarOperacao(fn) {
    let client;
    try {
        client = await conectarOperacao();
        const result = await fn(client);
        console.log(JSON.stringify(result));
        if (["PENDENTE", "FALHA"].includes(result.estado)) process.exitCode = 2;
    } catch {
        console.error("METRICAS_OPERACAO_FALHOU: conferir destino, configuração, permissões e consistência; nenhuma credencial é registrada.");
        process.exitCode = 1;
    } finally { if (client) await client.end(); }
}
