import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const MOCK_DATA = process.env.MOCK_DATA === "true";
if (MOCK_DATA && process.env.NODE_ENV === "production") {
    throw new Error("MOCK_DATA=true não é permitido em production.");
}

// Nunca reutiliza segredos ou diretórios configurados para o ambiente real.
// Uma chave por processo também invalida sessões ao reiniciar a demonstração.
export const mockRuntime = MOCK_DATA ? Object.freeze({
    secret: randomBytes(48).toString("hex"),
    metricsSecret: randomBytes(32).toString("hex"),
    uploadRoot: mkdtempSync(path.join(tmpdir(), "memoria-viva-demo-")),
}) : null;
