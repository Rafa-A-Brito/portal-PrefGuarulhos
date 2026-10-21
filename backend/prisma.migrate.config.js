import "dotenv/config";
import { defineConfig } from "prisma/config";

// Nenhum fallback para a conexão de execução ou para o superusuário.
if (!process.env.MIGRATION_DATABASE_URL) throw new Error("Variável inválida ou ausente: MIGRATION_DATABASE_URL.");
export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: { url: process.env.MIGRATION_DATABASE_URL },
    migrations: { path: "prisma/migrations" },
});
