import express from "express";
import path from "node:path";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import env from "./config/env.js";
import openapi from "./docs/openapi.js";
import routes from "./routes/index.js";
import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads"));
for (const pasta of ["exposicoes", "novidades"]) {
    app.use(`/uploads/${pasta}`, express.static(path.join(uploadDir, pasta), {
        dotfiles: "deny",
        index: false,
        setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    }));
}
app.get("/api/docs.json", (_req, res) => res.json(openapi));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { swaggerOptions: { persistAuthorization: false } }));
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
