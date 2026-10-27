import "dotenv/config";
import env from "./config/env.js";
import app from "./app.js";
import { garantirPastas } from "./config/storage.js";
import { logEvent, logFailure } from "./utils/logger.js";

try {
    await garantirPastas();
    const server = app.listen(env.PORT, () => logEvent("info", "SERVER_STARTED"));
    server.on("error", error => { logFailure("error", "SERVER_START_FAILED", {}, error); process.exitCode = 1; });
} catch (error) {
    logFailure("error", "SERVER_START_FAILED", {}, error);
    process.exitCode = 1;
}
