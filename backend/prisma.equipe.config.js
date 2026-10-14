import "dotenv/config";
import { defineConfig } from "prisma/config";
// Only for environments with the applied team lineage. Never patrimonio_guarulhos.
const url = process.env.EQUIPE_DATABASE_URL;
if (!url || decodeURIComponent(new URL(url).pathname.slice(1)) === "patrimonio_guarulhos") {
    throw new Error("Use EQUIPE_DATABASE_URL for a verified team lineage; patrimonio_guarulhos is forbidden.");
}
export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: { url },
    migrations: { path: "prisma/lineages/equipe/migrations" },
});
