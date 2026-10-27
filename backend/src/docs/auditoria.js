const uuid = { type: "string", format: "uuid" };
const text = { type: "string" };
const date = { type: "string", format: "date-time" };
const values = { type: "object", nullable: true, additionalProperties: true,
    description: "Somente campos da lista permitida da entidade; em edições, somente diferenças. Datas ISO UTC e Decimal em string. Nunca inclui senhas/hashes/tokens/cookies/Authorization, binários, caminhos internos, connection strings ou credenciais/parâmetros de URLs. Eventos antigos são filtrados na leitura." };
const event = { type: "object", required: ["id", "action", "entity", "entityId", "createdAt", "user", "resumo"], properties: {
    id: uuid, userId: { ...uuid, nullable: true }, action: text, entity: text, entityId: uuid, createdAt: date, resumo: text,
    user: { type: "object", nullable: true, description: "null quando o responsável não está disponível em registro antigo.",
        properties: { id: uuid, name: text, email: { type: "string", format: "email" } } },
} };
const json = schema => ({ "application/json": { schema } });
const headers = {
    "Cache-Control": { schema: { type: "string", enum: ["private, no-store"] } },
    "X-Request-Id": { schema: uuid, description: "Identificador gerado no backend, também presente nos logs da requisição." },
};
const error = description => ({ description, headers, content: json({ $ref: "#/components/schemas/Error" }) });
const common = { tags: ["Auditoria"], security: [{ bearerAuth: [] }],
    description: "Exclusivo a ADMIN ativo autenticado. Somente leitura; não há criação manual, edição ou exclusão. EDITOR não pode consultar. Não reconstrói ações antigas nem impede alterações por administradores do banco.",
};
const success = data => ({ type: "object", properties: { success: { type: "boolean", enum: [true] }, data } });
const example = {
    id: "b4859d14-f6ed-4ae2-b3ce-650a380d96e1", userId: "8f37eeba-0624-4cf2-9cf5-5c9739cbdaaa",
    user: { id: "8f37eeba-0624-4cf2-9cf5-5c9739cbdaaa", name: "Equipe editorial", email: "editor@example.test" },
    action: "PATRIMONIO_UPDATE", entity: "Patrimonio", entityId: "42ac0071-35aa-4b48-a5d3-5920676bf5bd",
    createdAt: "2026-10-26T12:00:00.000Z", resumo: "Patrimônio atualizado", oldValues: { regiaoId: null },
    newValues: { regiaoId: "e7afae50-fb5d-411f-8b63-685cbf852d1e" },
};
export const pathsAuditoria = {
    "/api/admin/auditoria": { get: { ...common, summary: "Lista o histórico de atividades administrativas",
        parameters: [
            ...["userId", "entityId"].map(name => ({ in: "query", name, schema: uuid })),
            ...["action", "entity"].map(name => ({ in: "query", name, schema: { type: "string", pattern: "^[A-Za-z][A-Za-z0-9_]{0,99}$" },
                description: name === "action" ? "Código exato, por exemplo REGIAO_UPDATE ou USER_PASSWORD_CHANGE. Aceita códigos históricos." : "Entidade exata, por exemplo RegiaoPatrimonio, Patrimonio ou User." })),
            ...["inicio", "fim"].map(name => ({ in: "query", name, schema: date, description: "Instante ISO 8601 com Z ou offset; extremos inclusivos; início <= fim." })),
            { in: "query", name: "pagina", schema: { type: "integer", minimum: 1, maximum: 1000000, default: 1 } },
            { in: "query", name: "limite", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ], responses: {
            200: { description: "Snapshot com ordenação createdAt DESC, id DESC. Sem resultados: itens:[], total:0, totalPaginas:0. Não retorna oldValues/newValues.", headers,
                content: json(success({ type: "object", properties: { itens: { type: "array", items: event }, paginacao: { type: "object", properties: {
                    pagina: { type: "integer" }, limite: { type: "integer" }, total: { type: "integer" }, totalPaginas: { type: "integer" },
                } } } })) },
            400: error("Parâmetros extras, repetidos ou inválidos, UUID/data/paginação inválidos ou intervalo invertido."),
            401: error("Sessão ausente, expirada, revogada ou conta inativa."), 403: error("Perfil sem permissão."), 500: error("Falha interna."),
        } } },
    "/api/admin/auditoria/{id}": { get: { ...common, summary: "Consulta um evento de auditoria",
        parameters: [{ in: "path", name: "id", required: true, schema: uuid }], responses: {
            200: { description: "Detalhe com valores permitidos. Troca de senha mantém oldValues/newValues null.", headers,
                content: { "application/json": { schema: success({ ...event, properties: { ...event.properties,
                    registro: { type: "object", description: "Mídia/item identificado por id e patrimônio associado, inclusive a partir do evento de criação/exclusão quando o registro já foi removido. patrimonioId pode ser null em registros legados sem vínculo recuperável.", properties: { id: uuid, patrimonioId: { ...uuid, nullable: true } } },
                    oldValues: values, newValues: values } }), example: { success: true, data: example } } } },
            400: error("UUID inválido."), 401: error("Autenticação necessária."), 403: error("Somente ADMIN."),
            404: error("Evento inexistente."), 500: error("Falha interna."),
        } } },
};
