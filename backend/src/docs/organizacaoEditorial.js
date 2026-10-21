const ref = name => ({ $ref: `#/components/schemas/${name}` });
const uuid = { type: "string", format: "uuid" };
const numero = { type: "integer", minimum: 1, maximum: 2147483647, nullable: true, description: "Opcional, único globalmente inclusive em arquivados. Sem geração automática." };
const ordem = { type: "integer", minimum: 0, maximum: 2147483647, nullable: true, description: "Prioridade opcional, admite empates. ASC NULLS LAST, depois nome e ID. Zero é válido." };
const slug = { type: "string", minLength: 1, maxLength: 120, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" };
const campos = { nome: { type: "string", minLength: 1, maxLength: 100 }, descricao: { type: "string", minLength: 1, maxLength: 2000, nullable: true }, ativo: { type: "boolean" } };
const envelope = data => ({ type: "object", required: ["success", "data"], properties: { success: { type: "boolean", enum: [true] }, data } });

export function schemasOrganizacaoEditorial(schemas) {
    schemas.RegiaoPublica = { type: "object", required: ["id", "nome", "slug"], properties: { id: uuid, nome: campos.nome, slug } };
    schemas.RegiaoAdmin = { type: "object", required: ["id", "nome", "slug", "descricao", "ativo", "createdAt", "updatedAt"], properties: {
        id: uuid, ...campos, slug, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
    } };
    schemas.RegiaoRequest = { type: "object", additionalProperties: false, required: ["nome", "slug"], properties: { ...campos, slug }, description: "Somente ADMIN. ativo omitido é true. Nenhuma região é pré-cadastrada." };
    schemas.RegiaoPatch = { type: "object", additionalProperties: false, minProperties: 1, properties: campos, description: "Somente ADMIN. Slug imutável. Omissão preserva; descricao null limpa. Inativação preserva vínculos." };
    schemas.RegiaoResponse = envelope(ref("RegiaoAdmin"));
    schemas.RegioesResponse = envelope({ type: "array", items: ref("RegiaoPublica") });
    schemas.RegioesAdminResponse = envelope({ type: "object", required: ["itens", "paginacao"], properties: {
        itens: { type: "array", items: ref("RegiaoAdmin") }, paginacao: { type: "object", required: ["pagina", "limite", "total", "totalPaginas"], properties: Object.fromEntries(["pagina", "limite", "total", "totalPaginas"].map(key => [key, { type: "integer", minimum: ["pagina", "limite"].includes(key) ? 1 : 0 }])) },
    } });
    for (const name of ["PatrimonioRequest", "PatrimonioPatch"]) Object.assign(schemas[name].properties, {
        regiaoId: { ...uuid, nullable: true, description: "Região ativa existente. Omitir preserva no PATCH; null limpa. Vínculo inalterado deve ser omitido se a região estiver inativa." },
        numeroExibicao: numero, ordemExibicao: ordem,
    });
    for (const name of ["PatrimonioResumo", "PatrimonioDetalhe", "PatrimonioCriado", "PatrimonioAdminResumo", "PatrimonioAdmin"]) {
        const admin = !["PatrimonioResumo", "PatrimonioDetalhe"].includes(name);
        Object.assign(schemas[name].properties, { numeroExibicao: numero, ordemExibicao: ordem,
            regiao: { type: "object", nullable: true, required: ["id", "nome", "slug", ...(admin ? ["ativo"] : [])], properties: { ...schemas.RegiaoPublica.properties, ...(admin && { ativo: campos.ativo }) } },
            ...(admin && { regiaoId: { ...uuid, nullable: true } }),
        });
    }
}
export function pathsOrganizacaoEditorial(paths) {
    const security = [{ bearerAuth: [] }];
    const response = (description, name) => ({ description, content: { "application/json": { schema: ref(name) } } });
    const errors = Object.fromEntries([400, 401, 403, 404, 409, 500].map(code => [code, response(({400:"Dados inválidos.",401:"Sessão ausente/expirada.",403:"Sem permissão.",404:"Região inexistente.",409:"Slug/número em uso ou região inativa.",500:"Erro interno."})[code], "Error")]));
    const body = name => ({ required: true, content: { "application/json": { schema: ref(name) } } });
    for (const path of ["/api/patrimonios", "/api/admin/patrimonios"]) {
        paths[path].get.parameters = [...paths[path].get.parameters, { in: "query", name: "regiao", schema: slug, description: "Slug regional exato, AND com os demais filtros; inclui vínculos preservados em região inativa." },
            { in: "query", name: "numeroExibicao", schema: { type: "integer", minimum: 1, maximum: 2147483647 }, description: "Número editorial exato. Não altera a busca textual." }];
        paths[path].get.description = paths[path].get.description.replace("ordenados por nome e ID", "ordenados por ordemExibicao ASC NULLS LAST, nome e ID").replace("ordenação estável por nome e ID", "ordenação por ordemExibicao ASC NULLS LAST, nome e ID");
    }
    paths["/api/admin/patrimonios"].post.responses[409] = errors[409];
    paths["/api/admin/patrimonios/{id}"].patch.responses[409] = errors[409];
    paths["/api/regioes"] = { get: { tags: ["Regiões"], summary: "Lista regiões ativas", description: "Sem contagens administrativas, catálogo inicialmente vazio. Classificação independente de endereço e rota.", responses: { 200: response("Catálogo público.", "RegioesResponse"), 500: errors[500] } } };
    paths["/api/admin/regioes"] = {
        get: { tags: ["Regiões"], security, summary: "Consulta catálogo regional (ADMIN/EDITOR)", parameters: [
            { in: "query", name: "busca", schema: { type: "string", minLength: 1, maxLength: 100 } },
            { in: "query", name: "ativo", schema: { type: "boolean" }, description: "Omitido inclui ativos/inativos." },
            { in: "query", name: "pagina", schema: { type: "integer", minimum: 1, default: 1 } },
            { in: "query", name: "limite", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ], responses: { ...errors, 200: response("Lista por nome/ID.", "RegioesAdminResponse") } },
        post: { tags: ["Regiões"], security, summary: "Cria região (ADMIN)", description: "Criação auditada; slug obrigatório e estável.", requestBody: body("RegiaoRequest"), responses: { ...errors, 201: response("Região criada.", "RegiaoResponse") } },
    };
    paths["/api/admin/regioes/{id}"] = { patch: { tags: ["Regiões"], security, summary: "Edita/inativa/reativa região (ADMIN)", description: "Mutação auditada. Não altera slug nem elimina vínculos. Não há DELETE.", parameters: [{ in: "path", name: "id", required: true, schema: uuid }], requestBody: body("RegiaoPatch"), responses: { ...errors, 200: response("Região atualizada.", "RegiaoResponse") } } };
}
