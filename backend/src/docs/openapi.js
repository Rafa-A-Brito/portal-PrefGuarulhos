import { paths } from "./paths.js";
import { schemas } from "./schemas.js";
import { pathsAuditoria } from "./auditoria.js";

const openapi = {
    openapi: "3.0.3",
    info: {
        title: "Portal Cultural de Guarulhos API",
        version: "1.0.0",
        description: "Contrato da API atual. As operações POST, PATCH e DELETE em Try it out executam ações reais no banco configurado.",
    },
    servers: [{ url: "/" }],
    tags: [
        { name: "Dashboard" },
        { name: "Auditoria" },
        { name: "Regiões" },
        { name: "Sistema" },
        { name: "Autenticação" },
        { name: "Administradores" },
        { name: "Patrimônios públicos" },
        { name: "Patrimônios administrativos" },
        { name: "Exposições" },
        { name: "Novidades" },
    ],
    paths: { ...paths, ...pathsAuditoria },
    components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
        schemas,
    },
};

export default openapi;
