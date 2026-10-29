import * as auth from "./auth.js";
import * as catalog from "./catalog.js";
import * as editorial from "./editorial.js";
import * as media from "./media.js";
import * as auditoria from "./audit.js";
import * as metrics from "./metrics.js";
import { contentService } from "./content.js";
import NotFoundError from "../errors/NotFoundError.js";

export default {
    access: { getAuthenticationUser: auth.getAuthenticationUser, listCategorias: catalog.listCategorias,
        getMediaPatrimonio: catalog.getMediaPatrimonio, listMediaOwners: media.listMediaOwners },
    auth, admin: auth, patrimonio: catalog, patrimonioEditorial: editorial, regiao: catalog, image: media, midia: media, referencia: media,
    exposicao: { exposicaoService: contentService("exposicoes") }, novidade: { novidadeService: contentService("novidades") },
    auditoria, dashboard: catalog, dashboardMetricas: metrics, metricas: metrics,
    // Rotas de hero ainda não são montadas no router real.
    siteHero: { async listHeroes() { return []; }, async getHero() { throw new NotFoundError("Hero não encontrado."); } },
};
