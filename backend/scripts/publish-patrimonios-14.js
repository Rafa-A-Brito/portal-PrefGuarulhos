/**
 * Operação temporária: allowlist fixa, dry-run padrão, publicação pelo service administrativo.
 * Execute no diretório backend; instruções em PUBLISH_PATRIMONIOS_14.md.
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { databaseIdentity } from "./assert-test-db.js";

export const PUBLICATION_SLUGS = Object.freeze([
    "antiga-carbonell-fiacao-e-tecelagem-e-casaroes-gemeos-demolidos",
    "capela-do-bom-jesus-do-macedo",
    "catedral-nossa-senhora-da-conceicao",
    "cemiterio-sao-joao-batista",
    "complexo-do-lago-dos-patos",
    "corporacao-musical-banda-lira-de-guarulhos",
    "cultura-e-presenca-indigena-wassu-cocal-e-krenak-pankararu",
    "dia-da-carpicao",
    "e-e-dulce-breves-neves",
    "festa-de-nossa-senhora-de-bonsucesso",
    "parque-ecologico-do-tiete",
    "praca-getulio-vargas",
    "primitiva-igreja-de-nossa-senhora-do-rosario-dos-homens-pretos-1717",
    "sitios-arqueologicos-das-lavras-velhas-do-geraldo",
]);
const PROTECTED_SLUG = "antigo-poco-municipal";
const DATABASE = "patrimonio_guarulhos";
const EXPECTED = Object.freeze({ PUBLICADO: 33, RASCUNHO: 1, ARQUIVADO: 2 });
const stateSelect = { id: true, slug: true, status: true, publicadoEm: true, updatedBy: true };

function validateOptions(options) {
    if (typeof options.apply !== "boolean") throw new Error("Modo de execução inválido.");
    const createdByEmail = z.email().parse(options.createdByEmail?.trim().toLowerCase());
    if ((options.apply || options.confirmDb !== undefined) && options.confirmDb !== DATABASE) {
        throw new Error("Confirmação obrigatória: --confirm-db=" + DATABASE);
    }
    return { ...options, createdByEmail };
}

export function parsePublicationArgs(args) {
    const options = { apply: false };
    const seen = new Set();
    for (let i = 0; i < args.length; i++) {
        const argument = args[i];
        const separator = argument.indexOf("=");
        const flag = separator < 0 ? argument : argument.slice(0, separator);
        if (seen.has(flag)) throw new Error("Opção repetida: " + flag);
        seen.add(flag);
        if (["--apply", "--dry-run"].includes(flag) && separator < 0) {
            options.apply = flag === "--apply";
        } else if (["--created-by-email", "--confirm-db"].includes(flag)) {
            const value = separator < 0 ? args[++i] : argument.slice(separator + 1);
            if (!value || value.startsWith("--")) throw new Error("Valor obrigatório: " + flag);
            options[flag === "--created-by-email" ? "createdByEmail" : "confirmDb"] = value;
        } else throw new Error("Opção desconhecida: " + argument);
    }
    if (seen.has("--apply") && seen.has("--dry-run")) throw new Error("Use somente --dry-run ou --apply.");
    if (!options.createdByEmail) throw new Error("--created-by-email é obrigatório, inclusive no dry-run.");
    return validateOptions(options);
}

export function assertPublicationTarget(databaseUrl) {
    const target = databaseIdentity(databaseUrl);
    if (target.database !== DATABASE) throw new Error("Este script operacional aceita somente o banco " + DATABASE + ".");
    return target;
}

function counts(rows) {
    const result = { PUBLICADO: 0, RASCUNHO: 0, ARQUIVADO: 0 };
    for (const row of rows) {
        if (!(row.status in result)) throw new Error("Status inesperado: " + row.slug);
        result[row.status]++;
    }
    return result;
}

function assertFinalState(rows) {
    const result = counts(rows);
    if (Object.keys(EXPECTED).some(status => result[status] !== EXPECTED[status])) {
        throw new Error("Contagem final incompatível: " + JSON.stringify(result) + "; esperado " + JSON.stringify(EXPECTED));
    }
    if (rows.find(p => p.slug === PROTECTED_SLUG)?.status !== "RASCUNHO") {
        throw new Error("O Antigo Poço Municipal deve existir e permanecer RASCUNHO.");
    }
    return result;
}

// Cliente injetável para testes reais em banco descartável. A CLI constrói o cliente
// exclusivamente a partir da DATABASE_URL validada, sem opção para mudar a allowlist.
export async function publishPatrimonios14({ prisma, options }) {
    options = validateOptions(options);
    const { changePatrimonioStatus } = await import("../src/services/patrimonioService.js");
    return prisma.$transaction(async transaction => {
        const author = await transaction.user.findUnique({
            where: { email: options.createdByEmail },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!author?.isActive || author.role !== "ADMIN") throw new Error("Responsável deve ser ADMIN existente e ativo.");
        const before = await transaction.patrimonio.findMany({ select: stateSelect, orderBy: { id: "asc" } });
        const selected = PUBLICATION_SLUGS.map(slug => {
            const row = before.find(p => p.slug === slug);
            if (!row || row.status !== "RASCUNHO") throw new Error("Lote bloqueado: " + slug + " deve existir em RASCUNHO.");
            return row;
        });
        if (before.find(p => p.slug === PROTECTED_SLUG)?.status !== "RASCUNHO") {
            throw new Error("O Antigo Poço Municipal deve existir e permanecer RASCUNHO.");
        }
        const selectedIds = new Set(selected.map(p => p.id));
        const projected = before.map(p => selectedIds.has(p.id) ? { ...p, status: "PUBLICADO" } : p);
        const expected = assertFinalState(projected);
        // Todos os status e cadastros são verificados antes da primeira escrita.
        // A validação é a própria ação administrativa, no modo sem escrita.
        for (const row of selected) {
            await changePatrimonioStatus(row.id, "PUBLICADO", author, { transaction, dryRun: true });
        }
        const report = {
            modo: options.apply ? "apply" : "dry-run", responsavel: author.email,
            selecionados: selected.length, aplicados: 0,
            antes: counts(before), previsto: expected,
            poco: { slug: PROTECTED_SLUG, status: "RASCUNHO" },
            auditoria: "O service atual não registra AuditLog de publicação; atualiza updatedBy e publicadoEm.",
            itens: selected.map(p => ({ id: p.id, slug: p.slug, atual: p.status, novo: "PUBLICADO", publicadoEmAtual: p.publicadoEm })),
        };
        if (!options.apply) return report;
        for (const row of selected) {
            await changePatrimonioStatus(row.id, "PUBLICADO", author, { transaction });
        }
        // A checagem ocorre antes do commit: divergência também desfaz o lote.
        const after = await transaction.patrimonio.findMany({ select: stateSelect, orderBy: { id: "asc" } });
        report.depois = assertFinalState(after);
        for (const row of selected) {
            const published = after.find(p => p.id === row.id);
            if (published?.status !== "PUBLICADO" || !published.publicadoEm || published.updatedBy !== author.id) {
                throw new Error("Pós-validação de publicação falhou: " + row.slug);
            }
        }
        report.aplicados = selected.length;
        return report;
    }, { isolationLevel: "Serializable", timeout: 120000, maxWait: 10000 });
}

async function main() {
    const options = parsePublicationArgs(process.argv.slice(2));
    const target = assertPublicationTarget(process.env.DATABASE_URL);
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const prisma = new PrismaClient({ adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // Proteção de conexão, sem SQL direto: o PostgreSQL rejeita escritas no dry-run.
        ...(!options.apply && { options: "-c default_transaction_read_only=on" }),
    }) });
    try {
        console.log(JSON.stringify({ banco: target.database, ...await publishPatrimonios14({ prisma, options }) }, null, 2));
    } finally { await prisma.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error("Publicação não concluída; lote abortado:", error.message);
        process.exitCode = 1;
    });
}
