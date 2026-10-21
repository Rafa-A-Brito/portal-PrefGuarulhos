import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { executarCargaInicial } from "./carga-inicial.js";

export function parseSeedArgs(args) {
    const options = { apply: false };
    const seen = new Set();
    for (const arg of args) {
        const [key, ...parts] = arg.split("="), value = parts.join("=");
        if (seen.has(key)) throw new Error("Opção repetida: " + key);
        seen.add(key);
        if (key === "--apply" && !parts.length) options.apply = true;
        else if (key === "--dry-run" && !parts.length) { /* padrão */ }
        else if (["--confirm-db", "--created-by-email", "--expected-state-hash", "--reconcile"].includes(key) && value.trim()) {
            options[{ "--confirm-db": "confirmDb", "--created-by-email": "createdByEmail", "--expected-state-hash": "expectedStateHash", "--reconcile": "reconcilePath" }[key]] = value.trim();
        } else throw new Error("Opção inválida: " + key);
    }
    if (seen.has("--apply") && seen.has("--dry-run")) throw new Error("--apply e --dry-run são incompatíveis.");
    if (options.apply && (!options.confirmDb || !options.createdByEmail || !/^[a-f0-9]{64}$/.test(options.expectedStateHash || ""))) throw new Error("Apply exige --confirm-db, --created-by-email e --expected-state-hash.");
    return options;
}

export async function executarCliSeed(tipo, args = process.argv.slice(2)) {
    const options = parseSeedArgs(args);
    if (options.reconcilePath) options.reconciliation = JSON.parse(await fs.readFile(path.resolve(options.reconcilePath), "utf8"));
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL obrigatória.");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    try {
        const report = await executarCargaInicial({ prisma, databaseUrl, options, tipo });
        console.log(JSON.stringify(report, null, 2));
        if (report.conflitos.length) process.exitCode = 1;
    } finally { await prisma.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    executarCliSeed("canonical").catch(error => {
        console.error(error.report ? JSON.stringify(error.report) : "Carga abortada. " + error.message);
        process.exitCode = 1;
    });
}
