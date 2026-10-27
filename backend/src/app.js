import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import env from "./config/env.js";
import openapi from "./docs/openapi.js";
import routes from "./routes/index.js";
import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";
import { PATRIMONIOS_IMAGE_DIR, PATRIMONIOS_IMAGE_ROUTE } from "./config/arquivos.js";
import { semCacheMidia, servirArquivoLegado, servirImagemEditorial } from "./controllers/midiaPublicaController.js";
import authenticateOpcional from "./middlewares/authenticateOpcional.js";
import { validateParams } from "./middlewares/validate.js";
import { arquivoLegadoParamsSchema, imagemEditorialParamsSchema } from "./schemas/midiaSchema.js";
import securityHeaders from "./middlewares/securityHeaders.js";
import metricasRoutes from "./routes/metricasRoute.js";
import requestId from "./middlewares/requestId.js";

const app = express();

app.disable("x-powered-by");
app.use(requestId);
app.set("trust proxy", env.TRUST_PROXY_IPS ? env.TRUST_PROXY_IPS.split(",").map(ip => ip.trim()) : false);
app.use(securityHeaders);
app.use(cors({ origin: env.CORS_ORIGIN, exposedHeaders: ["Retry-After", "X-Request-Id"] }));
// Inclui erros de validação/autenticação que não chegam aos controllers.
app.use(["/api/auth", "/api/admin", "/api/admins"], (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});
// Antes do parser: cobre também JSON malformado ou corpo acima do limite.
app.use("/api/admin/auditoria", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
});
// Ingestão pública isolada: origem/limites/parser de 2 KB antes do parser geral.
app.use("/api/metricas", metricasRoutes);
app.use(express.json({ limit: "100kb" }));
// Exposições/novidades em rascunho não podem ser expostas por express.static.
// A mídia só é pública quando há pelo menos um registro PUBLICADO vinculado.
for (const tipo of ["exposicoes", "novidades"]) {
    app.get(`/uploads/${tipo}/:arquivo`, semCacheMidia, authenticateOpcional,
        (req, res, next) => {
            req.params.tipo = tipo;
            return validateParams(imagemEditorialParamsSchema)(req, res, next);
        }, servirImagemEditorial);
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
