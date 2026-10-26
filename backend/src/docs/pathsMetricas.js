const erro = description => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } });
const json = schema => ({ required: true, content: { "application/json": { schema } } });
const resposta = (description, schema) => ({ description, content: { "application/json": { schema } } });
const objeto = properties => ({ type: "object", properties });
const texto = { type: "string" };
const contador = { type: "string", pattern: "^[0-9]+$", description: "BigInt serializado em decimal." };
const headers = [
    { in: "header", name: "Origin", required: true, schema: texto, description: "Origem exata configurada; null/ausente são recusados." },
    { in: "header", name: "X-Portal-Metricas", required: true, schema: { type: "string", enum: ["1"] } },
];
const publico = { tags: ["Métricas V2"], parameters: headers };
const falhas = { 400: erro("JSON/schema inválido; campos extras recusados."), 403: erro("Origem ou cabeçalho recusado."),
    413: erro("JSON acima de 2 KB, inclusive chunked."), 415: erro("Exige application/json sem compressão."),
    429: erro("Limite local excedido; Retry-After em segundos."), 503: erro("COLETA_INDISPONIVEL; flag desligada ou transação não confirmada. Retry-After: 1.") };
const regiao = objeto({ id: { type: "string", format: "uuid" }, nome: texto, slug: texto, ativo: { type: "boolean" }, quantidade: contador });
const item = objeto({ id: { type: "string", format: "uuid" }, nome: texto, slug: texto, status: texto, quantidade: contador });
const consulta = objeto({ success: { type: "boolean" }, data: { oneOf: [
    objeto({ disponivel: { type: "boolean", enum: [false] }, motivo: { type: "string", enum: ["DESATIVADA"] } }),
    objeto({ disponivel: { type: "boolean", enum: [true] }, meta: objeto({ versaoRegra: { type: "integer" }, fuso: texto,
        inicio: { type: "string", format: "date" }, fim: { type: "string", format: "date" }, geradoEm: { type: "string", format: "date-time" },
        unidade: texto, elegibilidade: texto, regiaoReferencia: texto, cobertura: { type: "string", enum: ["NAO_INSTRUMENTADA"] }, granularidade: { type: "string", enum: ["dia"] } }),
    visualizacoes: objeto({ totalRegistrado: contador, semRegiao: contador, porRegiao: { type: "array", items: regiao },
        porPatrimonio: objeto({ itens: { type: "array", items: item }, paginacao: objeto({ pagina: { type: "integer" }, limite: { type: "integer" }, total: { type: "integer" } }) }),
        serie: { type: "array", items: objeto({ data: { type: "string", format: "date" }, quantidade: contador }) } }),
    favoritos: objeto({ disponivel: { type: "boolean", enum: [false] } }) }),
] } });
export const pathsMetricas = {
    "/api/metricas/visualizacoes/sessao": {
        post: { ...publico, summary: "Emite/reutiliza credencial diária opcional, sem contar visualização",
            description: "Flag METRICAS_COLETA_ATIVA=false por padrão. Cookie HttpOnly/SameSite=Lax, expiração fixa na virada de São Paulo; Secure e __Host- em HTTPS. Não usa JWT. Cliente futuro chama somente após adesão e detalhe confirmado.",
            requestBody: json({ type: "object", additionalProperties: false }), responses: { ...falhas,
                200: resposta("Set-Cookie; Cache-Control: no-store.", objeto({ success: { type: "boolean" }, data: objeto({ dia: { type: "string", format: "date" }, expiraEm: { type: "string", format: "date-time" } }) })) } },
        delete: { ...publico, summary: "Expira o cookie, inclusive com coleta desligada", description: "Sem corpo. Não remove agregados nem revoga cópias do token. Com flag desligada a origem esperada é CORS_ORIGIN.",
            responses: { 204: { description: "Cookie removido ou ausente; no-store." }, 403: falhas[403] } },
    },
    "/api/metricas/visualizacoes": {
        post: { ...publico, summary: "Registra visualização diária de patrimônio PUBLICADO e canônico",
            description: "Exige cookie da sessão pública; não aceita data, quantidade, região ou status do cliente. Deduplicação por credencial/UUID/dia, não pessoa. 204 somente após commit; novo e repetido indistinguíveis.",
            requestBody: json({ type: "object", additionalProperties: false, required: ["patrimonioId"], properties: { patrimonioId: { type: "string", format: "uuid" } } }),
            responses: { ...falhas, 204: { description: "Aceito ou repetido; sem contador; no-store." },
                401: erro("PARTICIPACAO_EXPIRADA: cookie ausente/inválido/expirado; não é sessão JWT."), 404: erro("Bem inexistente, privado ou legado: resposta uniforme.") } },
    },
    "/api/admin/dashboard/metricas": {
        get: { tags: ["Métricas V2"], security: [{ bearerAuth: [] }], summary: "Consulta agregados V2 (ADMIN/EDITOR)",
            description: "Independente da V1. Flag de consulta desligada retorna disponivel:false sem SQL V2. Ligada: período inclusivo até 366 dias, sem datas futuras; somente série diária nesta fase. Região atual do cadastro; sem região separado; histórico aceito permanece após arquivamento. Ausência de linha não comprova zero ou cobertura completa. Sem acesso público.",
            parameters: [
                ...["inicio", "fim"].map(name => ({ in: "query", name, required: false, description: "Obrigatório quando consulta habilitada.", schema: { type: "string", format: "date" } })),
                ...["patrimonioId", "regiaoId"].map(name => ({ in: "query", name, schema: { type: "string", format: "uuid" } })),
                { in: "query", name: "semRegiao", description: "Exclusivo com regiaoId.", schema: { type: "string", enum: ["true"] } },
                { in: "query", name: "pagina", schema: { type: "integer", minimum: 1, maximum: 10000, default: 1 } },
                { in: "query", name: "limite", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
            ], responses: { 200: resposta("Snapshot RepeatableRead READ ONLY; no-store; contagens decimais em strings.", consulta),
                400: falhas[400], 401: erro("Autenticação administrativa necessária."), 403: erro("ADMIN/EDITOR necessários."), 503: falhas[503] } },
    },
};
