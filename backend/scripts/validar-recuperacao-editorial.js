/** Cria dump em leitura e restaura exclusivamente em banco novo e isolado.
 * Nunca usa --clean/--create do pg_restore nem remove bancos existentes.
 * O banco isolado permanece disponível para inspeção após a validação.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { snapshot, salvarBackup } from "./aplicar-organizacao-editorial.js";
import { conferirInstancia, conferirLock, criarDump, conferirDump, ferramenta, inventario } from "./recuperacao-editorial.js";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function main() {
    if (process.argv.length !== 2) throw new Error("Este script não aceita parâmetros nem banco de destino externo.");
    dotenv.config({ path: path.join(backend, ".env"), quiet: true });
    await conferirLock(path.join(backend, "src/services/patrimonioService.js"));
    const origemUrl = new URL(process.env.DATABASE_URL);
    origemUrl.searchParams.set("options", "-c default_transaction_read_only=on -c idle_in_transaction_session_timeout=300000 -c statement_timeout=30000");
    const origem = new pg.Client({ connectionString: origemUrl.toString(), connectionTimeoutMillis: 10000 });
    let admin, destino;
    try {
        await origem.connect();
        const identidade = await conferirInstancia(origem, origemUrl);
        await origem.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        const antes = await snapshot(origem);
        const esperado = await inventario(origem);
        const json = await salvarBackup(antes, identidade);
        const dump = await criarDump(origem, origemUrl, json);
        await origem.query("ROLLBACK");
        await conferirDump(dump);

        const nome = `editorial_restore_${Date.now()}_${randomUUID().slice(0, 8)}`;
        if (!/^editorial_restore_\d{13}_[a-f0-9]{8}$/.test(nome)) throw new Error("Nome isolado inválido.");
        const adminUrl = new URL(origemUrl);
        adminUrl.pathname = "/postgres";
        adminUrl.searchParams.set("options", "-c default_transaction_read_only=off -c statement_timeout=30000");
        admin = new pg.Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 10000 });
        await admin.connect();
        await conferirInstancia(admin, adminUrl, "postgres");
        // CREATE DATABASE falha se o nome já existir: jamais reutiliza ou apaga outro banco.
        await admin.query(`CREATE DATABASE "${nome}" TEMPLATE template0`);
        console.log(JSON.stringify({ bancoIsoladoCriado: nome }));
        const destinoUrl = new URL(adminUrl);
        destinoUrl.pathname = "/" + nome;
        destino = new pg.Client({ connectionString: destinoUrl.toString(), connectionTimeoutMillis: 10000 });
        await destino.connect();
        await conferirInstancia(destino, destinoUrl, nome);
        await ferramenta("pg_restore", ["--no-password", "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges", "--dbname", nome, dump.arquivo], destinoUrl, false);
        await destino.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        const recebido = await inventario(destino);
        const restaurado = await snapshot(destino);
        await destino.query("ROLLBACK");
        if (JSON.stringify(esperado) !== JSON.stringify(recebido) || JSON.stringify(antes) !== JSON.stringify(restaurado)) {
            throw new Error("Restauração divergiu nos dados, índices, constraints ou sequências; banco isolado preservado para inspeção.");
        }
        const resultado = { resultado: "APTO", validadoEm: new Date().toISOString(), dump,
            bancoIsolado: nome, tabelas: recebido.dados, indices: recebido.indices.length,
            constraints: recebido.constraints.length, relacoesPreservadas: restaurado.ligacoes.length,
            origemSomenteLeitura: true, observacao: "Restauração validada sem reaplicar owners/ACLs. Nenhuma importação editorial executada." };
        await fs.writeFile(json + ".restauracao.json", JSON.stringify(resultado, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        console.log(JSON.stringify(resultado));
    } finally {
        await Promise.allSettled([origem.end(), admin?.end(), destino?.end()]);
    }
}
main().catch(error => { console.error("Validação bloqueada:", error.message); process.exitCode = 1; });
