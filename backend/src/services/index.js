import { MOCK_DATA } from "../config/runtime.js";

// Fronteira única de seleção. Imports reais nunca são avaliados no modo demo.
const names = ["access", "admin", "auth", "patrimonio", "patrimonioEditorial", "regiao", "image", "midia",
    "referencia", "exposicao", "novidade", "auditoria", "dashboard", "dashboardMetricas", "metricas", "siteHero"];
const implementations = MOCK_DATA
    ? (await import("../mock/services.js")).default
    : Object.fromEntries(await Promise.all(names.map(async name => [name, await import(`./${name}Service.js`)])));

export const { access, admin, auth, patrimonio, patrimonioEditorial, regiao, image, midia, referencia,
    exposicao, novidade, auditoria, dashboard, dashboardMetricas, metricas, siteHero } = implementations;
