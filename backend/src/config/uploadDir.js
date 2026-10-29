import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockRuntime } from "./runtime.js";

// Independente de env.js: scripts de manutenção não exigem JWT.
export const UPLOAD_DIR = mockRuntime?.uploadRoot ?? path.resolve(process.env.UPLOAD_DIR?.trim() || fileURLToPath(new URL("../../uploads", import.meta.url)));
export const UPLOAD_FOLDERS = Object.freeze(["patrimonios", "exposicoes", "novidades", "referencias"]);
