const texto = { type: "string" }, instante = { type: "string", format: "date-time" }, uuid = { type: "string", format: "uuid" };
const quantidade = { type: "string", pattern: "^(0|[1-9][0-9]*)$", description: "Contagem decimal exata de registros retidos; não representa pessoas." };
const tipo = { type: "string", enum: ["ELOGIO", "SUGESTAO", "PROBLEMA"] };
const objeto = properties => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const json = schema => ({ "application/json": { schema } });
const demo = { demonstracao: { type: "boolean", enum: [true], description: "Presente somente na demo: dados fictícios em memória, descartados ao reiniciar." } };
const comDemo = schema => ({ ...schema, properties: { ...schema.properties, ...demo } });
const envelope = data => objeto({ success: { type: "boolean", enum: [true] }, data: comDemo(data) });
const off = objeto({ disponivel: { type: "boolean", enum: [false] }, motivo: { type: "string", enum: ["DESATIVADA"] } });
const cache = admin => ({ "Cache-Control": { schema: { type: "string", enum: [admin ? "private, no-store" : "no-store"] } } });
const falha = (description, admin = false) => ({ description, headers: { ...cache(admin), "Retry-After": { schema: { type: "integer", minimum: 1 }, description: "429 ou FEEDBACK_INDISPONIVEL (5 segundos)." } }, content: json({ $ref: "#/components/schemas/Error" }) });
const meta = objeto({ inicio: texto, fim: texto, tipo: { ...tipo, nullable: true }, fuso: { type: "string", enum: ["America/Sao_Paulo"] },
    geradoEm: instante, base: { type: "string", enum: ["REGISTROS_RETIDOS"] }, unidade: { type: "string", enum: ["FEEDBACK_RECEBIDO"] },
    retencaoDias: { type: "integer", enum: [180] }, recorteLimitadoPorRetencao: { type: "boolean" } });
const item = objeto({ id: uuid, tipo, createdAt: instante });
const filtros = [
    ...["inicio", "fim"].map(name => ({ in: "query", name, required: true, schema: { type: "string", format: "date" }, description: "Dia civil inclusivo em America/Sao_Paulo; período até 366 dias, sem futuro." })),
    { in: "query", name: "tipo", schema: tipo },
];
const consulta = (parameters, data) => ({ tags: ["Feedback"], security: [{ bearerAuth: [] }], parameters,
    description: "Somente ADMIN ativo com sessão válida. Parâmetros desconhecidos/repetidos são recusados. Fotografia Repeatable Read READ ONLY por requisição; exclui registros expirados. Flags falsas não consultam as tabelas. Lista e resumo separados podem refletir instantes diferentes.",
    responses: {
        200: { description: "Consulta disponível ou DESATIVADA (não confundir com vazio).", headers: cache(true), content: json({ oneOf: [envelope(data), envelope(off)] }) },
        400: falha("Filtros ou UUID inválidos.", true), 401: falha("Sessão inválida, expirada ou revogada.", true),
        403: falha("EDITOR e outros perfis não podem consultar.", true), 500: falha("Erro interno.", true), 503: falha("FEEDBACK_INDISPONIVEL; não retorna zeros fabricados.", true),
    },
});
const recebido = envelope(objeto({ recebido: { type: "boolean", enum: [true] }, recebidoEm: instante }));
const post = {
    tags: ["Feedback"], summary: "Recebe feedback sobre o portal",
    description: "Sem autenticação administrativa, cookies de identificação ou protocolo institucional. Origin e Host exatos e HTTPS (HTTP apenas loopback explicitamente configurado). Máximo 16 KB, JSON UTF-8 sem compressão. Mensagem normalizada NFC, CRLF→LF e trim; até 2.000 pontos de código, sem controles incompatíveis. Chave aleatória nova de 32 bytes por envio deliberado. Recebimento desligado aceita somente replay de recibo válido se origem/chaves continuarem configuradas. Janela de 24 horas; timeout não comprova rollback. Não há consulta pública de texto, UUID ou lista.",
    parameters: [
        { in: "header", name: "Origin", required: true, schema: texto },
        { in: "header", name: "X-Portal-Feedback", required: true, schema: { type: "string", enum: ["1"] } },
        { in: "header", name: "Idempotency-Key", required: true, schema: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" }, description: "32 bytes criptograficamente aleatórios, base64url canônica sem padding. Não colocar na URL/logs." },
    ],
    requestBody: { required: true, content: { "application/json": { schema: objeto({ tipo,
        mensagem: { type: "string", minLength: 1, maxLength: 2000 }, avisoVersao: { type: "string", pattern: "^[A-Za-z0-9_-]{1,40}$" } }),
    example: { tipo: "SUGESTAO", mensagem: "Gostaria de encontrar a busca com mais facilidade.", avisoVersao: "feedback-v1" } } } },
    responses: {
        201: { description: "Confirmado somente depois do commit; demo sinalizada explicitamente.", headers: cache(false), content: json(recebido) },
        200: { description: "Replay confirmado; mesma data original, nenhum novo INSERT.", headers: cache(false), content: json(recebido) },
        400: falha("Corpo, campos extras, chave ou headers inválidos."), 403: falha("ORIGEM_INVALIDA ou TRANSPORTE_INVALIDO."),
        409: falha("CHAVE_REUTILIZADA, ENVIO_EXPIRADO ou AVISO_DESATUALIZADO."), 413: falha("BODY_TOO_LARGE (16 KB)."),
        415: falha("JSON_OBRIGATORIO ou CODIFICACAO_NAO_SUPORTADA."), 429: falha("TOO_MANY_REQUESTS; quotas por rede e global por processo."),
        503: falha("FEEDBACK_DESATIVADO (novo envio) ou FEEDBACK_INDISPONIVEL (resultado pode ser incerto)."), 500: falha("Erro interno sem dados do envio."),
    },
};
export const pathsFeedback = {
    "/api/feedback": { post },
    "/api/admin/feedback": { get: { summary: "Lista metadados de Feedback, sem mensagem", ...consulta([
        ...filtros, { in: "query", name: "pagina", schema: { type: "integer", minimum: 1, maximum: 10000, default: 1 } },
        { in: "query", name: "limite", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
    ], objeto({ disponivel: { type: "boolean", enum: [true] }, meta, itens: { type: "array", items: item },
        paginacao: objeto({ pagina: { type: "integer" }, limite: { type: "integer" }, total: { type: "integer", maximum: Number.MAX_SAFE_INTEGER }, totalPaginas: { type: "integer" } }) })) } },
    "/api/admin/feedback/resumo": { get: { summary: "Agrega Feedback por tipo e período", ...consulta([
        ...filtros, { in: "query", name: "granularidade", schema: { type: "string", enum: ["dia", "mes"], default: "dia" } },
    ], objeto({ disponivel: { type: "boolean", enum: [true] }, meta: objeto({ ...meta.properties, granularidade: { type: "string", enum: ["dia", "mes"] } }), total: quantidade,
        porTipo: { type: "array", minItems: 3, maxItems: 3, items: objeto({ tipo, quantidade }) },
        serie: { type: "array", maxItems: 366, items: objeto({ periodo: texto, quantidade, parcial: { type: "boolean" } }) },
        notas: objeto({ disponivel: { type: "boolean", enum: [false] } }) })) } },
    "/api/admin/feedback/{id}": { get: { summary: "Consulta a mensagem sob demanda", ...consulta([
        { in: "path", name: "id", required: true, schema: uuid },
    ], objeto({ disponivel: { type: "boolean", enum: [true] }, registro: objeto({ ...item.properties, mensagem: texto, avisoVersao: texto, expiraEm: instante }) })) } },
};
pathsFeedback["/api/admin/feedback/{id}"].get.responses[404] = falha("Feedback inexistente, eliminado ou expirado (sem distinguir).", true);
