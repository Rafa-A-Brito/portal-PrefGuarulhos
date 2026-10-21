import express from "express";
import { UPLOAD_DIR, UPLOAD_FOLDERS } from "./config/uploadDir.js";
import path from "node:path";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import env from "./config/env.js";
import openapi from "./docs/openapi.js";
import routes from "./routes/index.js";
import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";
import { PATRIMONIOS_IMAGE_DIR, PATRIMONIOS_IMAGE_ROUTE } from "./config/arquivos.js";
import { semCacheMidia, servirArquivoLegado } from "./controllers/midiaPublicaController.js";
import authenticateOpcional from "./middlewares/authenticateOpcional.js";
import { validateParams } from "./middlewares/validate.js";
import { arquivoLegadoParamsSchema } from "./schemas/midiaSchema.js";
import securityHeaders from "./middlewares/securityHeaders.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_IPS ? env.TRUST_PROXY_IPS.split(",").map(ip => ip.trim()) : false);
app.use(securityHeaders);
app.use(cors({ origin: env.CORS_ORIGIN, exposedHeaders: ["Retry-After"] }));
app.use(express.json({ limit: "100kb" }));
for (const pasta of UPLOAD_FOLDERS.filter((pasta) => ["exposicoes", "novidades"].includes(pasta))) {
    app.use(`/uploads/${pasta}`, express.static(path.join(UPLOAD_DIR, pasta), {
        dotfiles: "deny",
        index: false,
        setHeaders: (res) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
        },
    }));
}
for (const tipo of ["patrimonios", "referencias"]) {
    app.get(`/uploads/${tipo}/:arquivo`, semCacheMidia, authenticateOpcional,
        (req, res, next) => {
            req.params.tipo = tipo;
            return validateParams(arquivoLegadoParamsSchema)(req, res, next);
        }, servirArquivoLegado);
}
app.use(PATRIMONIOS_IMAGE_ROUTE, express.static(PATRIMONIOS_IMAGE_DIR, {
    dotfiles: "deny", index: false, redirect: false, fallthrough: false,
}));
app.get("/api/docs.json", (_req, res) => res.json(openapi));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { swaggerOptions: { persistAuthorization: false } }));
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
