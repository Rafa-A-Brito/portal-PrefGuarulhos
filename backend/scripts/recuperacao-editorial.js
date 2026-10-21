import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const executar = promisify(execFile);
export const INSTANCE = "localhost:5432";
export const LOCK_SQL = "SELECT pg_advisory_xact_lock(73033, 1)";
const CLUSTER = "7691813685054358780";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export async function conferirInstancia(client, url, database = "patrimonio_guarulhos") {
    if (url.hostname !== "localhost" || (url.port || "5432") !== "5432"
        || decodeURIComponent(url.pathname.slice(1)) !== database
        || [...url.searchParams.keys()].some(k => !["schema", "sslmode", "options"].includes(k))) {
        throw new Error("Endpoint não autorizado: esperado " + INSTANCE + "/" + database);
    }
    const row = (await client.query("SELECT current_database() AS banco, inet_server_addr()::text AS servidor, inet_server_port() AS porta, (SELECT system_identifier::text FROM pg_control_system()) AS cluster")).rows[0];
    if (row.banco !== database || row.porta !== 5432 || row.cluster !== CLUSTER
        || !["::1/128", "127.0.0.1/32"].includes(row.servidor)) {
        throw new Error("Instância PostgreSQL diverge do servidor/porta/cluster revisados.");
    }
    return row;
}

export async function conferirLock(servicePath) {
    const service = await fs.readFile(servicePath, "utf8");
    if (!service.includes('await transaction.$executeRaw`' + LOCK_SQL + '`;')) {
        throw new Error("Advisory lock do serviço mudou; revisar antes de executar.");
    }
}

export async function ferramenta(programa, args, url, somenteLeitura = true) {
    // Credenciais somente no ambiente do processo filho, nunca na linha de comando.
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.toUpperCase().startsWith("PG")));
    Object.assign(env, {
        PGHOST: url.hostname, PGPORT: url.port || "5432",
        PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
        PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
        PGSSLMODE: url.searchParams.get("sslmode") || "prefer", PGCONNECT_TIMEOUT: "10",
        PGOPTIONS: `-c default_transaction_read_only=${somenteLeitura ? "on" : "off"} -c statement_timeout=240000`,
    });
    return executar(programa, args, { env, windowsHide: true, timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
}

export async function criarDump(client, url, backupJson) {
    const identidade = await conferirInstancia(client, url);
    // Snapshot exportado mantém o dump consistente com o estado pré-DML.
    // Na aplicação, os locks de tabela já estão adquiridos; pg_dump só usa ACCESS SHARE.
    const snapshot = (await client.query("SELECT pg_export_snapshot() AS id")).rows[0].id;
    const arquivo = backupJson + ".dump";
    const reserva = await fs.open(arquivo, "wx", 0o600);
    await reserva.close();
    await ferramenta("pg_dump", ["-Fc", "--no-password", `--snapshot=${snapshot}`, "--file", arquivo], url);
    const dados = await fs.readFile(arquivo);
    if (dados.subarray(0, 5).toString() !== "PGDMP") throw new Error("Backup não é um arquivo custom PostgreSQL.");
    const handle = await fs.open(arquivo, "r+");
    try { await handle.sync(); } finally { await handle.close(); }
    await ferramenta("pg_restore", ["--list", arquivo], url);
    const checksum = sha256(dados);
    await fs.writeFile(arquivo + ".sha256", `${checksum}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ dump: arquivo, sha256: checksum, identidade }));
    return { arquivo, sha256: checksum, identidade };
}

export async function conferirDump(dump) {
    if (sha256(await fs.readFile(dump.arquivo)) !== dump.sha256) throw new Error("SHA256 do dump divergente.");
}

export async function inventario(client) {
    const tabelas = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const dados = [];
    for (const { tablename } of tabelas) {
        const nome = '"' + tablename.replaceAll('"', '""') + '"';
        const rows = (await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${nome} t ORDER BY to_jsonb(t)::text COLLATE "C"`)).rows;
        dados.push({ tabela: tablename, quantidade: rows.length, sha256: sha256(JSON.stringify(rows)) });
    }
    const indices = (await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows;
    const constraints = (await client.query("SELECT c.relname AS tabela, x.conname AS nome, pg_get_constraintdef(x.oid) AS definicao FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,x.conname")).rows;
    const sequences = (await client.query("SELECT sequencename,last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows;
    return { dados, indices, constraints, sequences };
}
