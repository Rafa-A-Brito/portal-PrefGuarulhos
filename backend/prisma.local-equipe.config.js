import "dotenv/config";
import { defineConfig } from "prisma/config";

// Opt-in exclusivo para banco local autorizado, inclusive quando o nome coincide
// com o nome bloqueado pelo config da equipe. Nao altera a guarda daquele config.
const connection = process.env.LOCAL_EQUIPE_DATABASE_URL;
const url = connection ? new URL(connection) : null;
const database = url ? decodeURIComponent(url.pathname.slice(1)) : null;
if (!url || !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !database || database !== process.env.LOCAL_EQUIPE_CONFIRM_DB) {
    throw new Error("Exige conexao loopback LOCAL_EQUIPE_DATABASE_URL e nome exato LOCAL_EQUIPE_CONFIRM_DB; conferir o historico antes de aplicar.");
}
export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: { url: connection },
    migrations: { path: "prisma/lineages/equipe/migrations" },
});
