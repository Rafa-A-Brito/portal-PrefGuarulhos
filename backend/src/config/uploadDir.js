import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Independente de env.js: scripts de manutenção não exigem JWT.
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR?.trim() || fileURLToPath(new URL("../../uploads", import.meta.url)));
export const UPLOAD_FOLDERS = Object.freeze(["patrimonios", "exposicoes", "novidades"]);
