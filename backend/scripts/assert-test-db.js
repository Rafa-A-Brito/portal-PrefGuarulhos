import "dotenv/config";
import { pathToFileURL } from "node:url";

export function databaseIdentity(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error("URL PostgreSQL inválida."); }
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Protocolo PostgreSQL obrigatório.");
    // Parâmetros libpq podem redirecionar a conexão apesar do hostname da URL.
    for (const key of url.searchParams.keys()) {
        if (!["sslmode", "connection_limit", "pool_timeout", "schema"].includes(key)) {
            throw new Error("Parâmetro de conexão não permitido: " + key);
        }
    }
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!database || database.includes("/")) throw new Error("Nome do banco inválido.");
    let hostname = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname)) hostname = "loopback";
    return { hostname, port: Number(url.port || 5432), database };
}

export function assertTestDatabase(env = process.env) {
    if (env.TEST_DATABASE_EXCLUSIVE !== "1") throw new Error("Exija TEST_DATABASE_EXCLUSIVE=1.");
    const target = databaseIdentity(env.TEST_DATABASE_URL);
    if (!/^[a-z0-9_]+_test$/.test(target.database)) throw new Error("O banco deve terminar em _test.");
    if (!["loopback", "db_test"].includes(target.hostname)) throw new Error("Host de teste não permitido.");
    if (!env.DATABASE_URL) throw new Error("DATABASE_URL normal é obrigatória para comparar os destinos.");
    const normal = databaseIdentity(env.DATABASE_URL);
    if (JSON.stringify(target) === JSON.stringify(normal)) throw new Error("Banco de teste coincide com o banco normal.");
    // db_test:5432 e loopback:5434 podem ser a mesma instância publicada.
    if (target.database === normal.database && (target.hostname === "db_test" || normal.hostname === "db_test")) {
        throw new Error("Banco normal pode apontar ao mesmo db_test.");
    }
    return target;
}

export function integrationDatabaseAvailable() {
    if (!process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_EXCLUSIVE !== "1") return false;
    assertTestDatabase();
    return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { console.log(JSON.stringify(assertTestDatabase())); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
