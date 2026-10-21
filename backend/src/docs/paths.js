import { pathsMidia } from "./pathsMidia.js";
import { pathsOrganizacaoEditorial } from "./organizacaoEditorial.js";
const schema = (name) => ({ $ref: `#/components/schemas/${name}` });
const response = (description, name, example) => ({
    description,
    content: { "application/json": { schema: schema(name), ...(example && { example }) } },
});
const error = (description, code, message) => ({
    description,
    content: { "application/json": { schema: schema("Error"), example: { success: false, message, details: [], error: { code, message } } } },
});
const badRequest = error("Dados inválidos (incluindo JSON inválido).", "BAD_REQUEST", "Dados inválidos.");
const unauthorized = error("Token ausente, inválido ou conta/sessão inativa. Somente acesso expirado com sessão ainda válida usa error.code=ACCESS_TOKEN_EXPIRED, sempre antes de efeitos de negócio.", "UNAUTHORIZED", "Autenticação necessária.");
const forbidden = error("Papel sem permissão.", "FORBIDDEN", "Você não possui permissão para realizar esta ação.");
const tooLarge = error("Corpo JSON acima de 100 kb.", "INTERNAL_ERROR", "Corpo da requisição muito grande.");
const internal = error("Falha inesperada, inclusive falha de acesso ao banco.", "INTERNAL_ERROR", "Erro interno do servidor.");
const body = (name, example) => ({ required: true, content: { "application/json": { schema: schema(name), example } } });
const bearerAuth = [{ bearerAuth: [] }];

// UUID ilustrativo: cada banco gera seus próprios IDs no seed.
const categoriaId = "11111111-1111-4111-8111-111111111111";
const patrimonioId = "22222222-2222-4222-8222-222222222222";
const usuarioId = "33333333-3333-4333-8333-333333333333";
const imagemId = "44444444-4444-4444-8444-444444444444";
const localId = "55555555-5555-4555-8555-555555555555";
const categoria = { id: categoriaId, nome: "Histórico", slug: "historico" };
const localizacao = { id: localId, patrimonioId, endereco: "Rua Exemplo", numero: "10", complemento: null, bairro: "Centro", cidade: "Guarulhos", uf: "SP", cep: "07010-000", latitude: "-23.4628000", longitude: "-46.5333000" };
const imagem = { id: imagemId, url: "https://example.org/imagem.jpg", titulo: null, textoAlternativo: "Fachada da edificação", principal: true };
const resumo = { id: patrimonioId, nome: "Casa da Cultura Exemplo", slug: "casa-da-cultura-exemplo", descricaoResumida: "Edificação histórica em Guarulhos.", situacao: "PRESERVADO", publicadoEm: "2026-09-01T12:00:00.000Z", categoria, localizacao, imagens: [imagem] };

export const paths = {
    "/api": {
        get: {
            tags: ["Sistema"], summary: "Identifica a API", description: "Retorna nome e versão da aplicação.",
            responses: { 200: response("Identificação da API.", "SystemResponse", { success: true, data: { name: "Portal Cultural de Guarulhos API", version: "1.0.0" } }) },
        },
    },
    "/api/health": {
        get: {
            tags: ["Sistema"], summary: "Verifica a resposta da aplicação", description: "Não testa a conexão com o PostgreSQL.",
            responses: { 200: response("Aplicação respondeu.", "HealthResponse", { success: true, data: { status: "ok" } }) },
        },
    },
    "/api/docs": {
        get: { tags: ["Sistema"], summary: "Abre o Swagger UI", description: "Interface HTML pública da documentação. A rota pode redirecionar para /api/docs/ para carregar os recursos da interface.", responses: { 200: { description: "Interface HTML do Swagger UI.", content: { "text/html": { schema: { type: "string" } } } }, 301: { description: "Redirecionamento para /api/docs/." } } },
    },
    "/api/docs.json": {
        get: { tags: ["Sistema"], summary: "Obtém a especificação OpenAPI", responses: { 200: { description: "Documento OpenAPI 3.0.3 em JSON.", content: { "application/json": { schema: { type: "object", description: "Especificação OpenAPI 3.0.3." } } } } } },
    },
    "/api/auth/refresh": {
        post: { tags: ["Autenticação"], summary: "Rotaciona a credencial de renovação",
            description: "Não exige JWT. Refresh opaco de uso único; preserva o limite absoluto da sessão. Reutilização revoga a sessão. Resposta no-store. HTTP 401 é definitivo; falha de rede/5xx não deve provocar nova tentativa automática.",
            requestBody: body("RefreshRequest", { refreshToken: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
            responses: { 200: { ...response("Tokens renovados.", "LoginResponse"), headers: { "Cache-Control": { schema: { type: "string", example: "no-store" } } } }, 400: badRequest, 401: unauthorized, 429: error("Excesso de tentativas.", "TOO_MANY_REQUESTS", "Aguarde e tente novamente."), 500: internal } },
    },
    "/api/auth/logout": {
        post: { tags: ["Autenticação"], summary: "Revoga a sessão por credencial de renovação",
            description: "Idempotente para tokens conhecidos ou desconhecidos sintaticamente válidos. Funciona sem JWT, inclusive após expiração do acesso; revoga também quando o refresh já foi consumido.",
            requestBody: body("RefreshRequest", { refreshToken: "credencial-opaca-ficticia" }),
            responses: { 200: response("Sessão encerrada.", "ChangePasswordResponse", { success: true, message: "Sessão encerrada." }), 400: badRequest, 500: internal } },
    },
    "/api/auth/login": {
        post: {
            tags: ["Autenticação"], summary: "Autentica um usuário", description: "Aceita somente contas ativas. Retorna token, user, refreshToken e sessionExpiresAt com Cache-Control: no-store. Acesso padrão 300s, sessão máxima padrão 8h sem extensão. Use o token retornado no botão Authorize para testar rotas protegidas.",
            requestBody: body("LoginRequest", { email: "editor@example.org", password: "SenhaFicticia123!" }),
            responses: {
                200: response("Autenticado.", "LoginResponse", { success: true, data: { token: "eyJ...token-ficticio", refreshToken: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", sessionExpiresAt: "2026-10-20T23:00:00.000Z", user: { id: usuarioId, name: "Pessoa Exemplo", email: "editor@example.org", role: "EDITOR" } } }),
                400: badRequest, 401: error("Credenciais inválidas ou conta inativa.", "UNAUTHORIZED", "E-mail ou senha incorretos."), 413: tooLarge, 500: internal,
                429: {
                    ...error("Limite temporário por IP ou conta/IP.", "TOO_MANY_REQUESTS", "Muitas tentativas de login. Aguarde e tente novamente."),
                    headers: { "Retry-After": { description: "Segundos até uma nova tentativa.", schema: { type: "integer", minimum: 1 } } },
                },
            },
        },
    },
    "/api/admins": {
        post: {
            tags: ["Administradores"], summary: "Cria uma conta ADMIN ou EDITOR", description: "Somente ADMIN autenticado. A conta é criada ativa e a senha é armazenada apenas como hash. Executa uma gravação real no banco configurado.",
            security: bearerAuth,
            requestBody: body("AdminRequest", { nome: "Maria Exemplo", email: "maria@example.org", role: "EDITOR", password: "SenhaFicticia123!" }),
            responses: {
                201: response("Conta criada.", "AdminResponse", { success: true, data: { id: usuarioId, nome: "Maria Exemplo", email: "maria@example.org", role: "EDITOR", ativo: true, criadoEm: "2026-09-01T12:00:00.000Z", atualizadoEm: "2026-09-01T12:00:00.000Z" } }),
                400: badRequest, 401: unauthorized, 403: forbidden,
                409: error("E-mail já cadastrado (inclusive conflito simultâneo de unicidade).", "ADMIN_ALREADY_EXISTS", "Já existe um administrador cadastrado com este e-mail."),
                413: tooLarge, 500: internal,
            },
        },
    },
    "/api/categorias": {
        get: {
            tags: ["Patrimônios públicos"], summary: "Lista as categorias", description: "Pública. Retorna id, nome, slug e descrição, em ordem alfabética.",
            responses: { 200: response("Categorias.", "CategoriasResponse", { success: true, data: [{ ...categoria, descricao: null }] }), 500: internal },
        },
    },
    "/api/patrimonios": {
        get: {
            tags: ["Patrimônios públicos"], summary: "Lista patrimônios publicados", description: "Retorna apenas status PUBLICADO, ordenados por nome e ID. A busca procura nos textos principais, títulos/textos de detalhes e nomes/slugs das categorias principal e adicionais, sem diferenciar maiúsculas/minúsculas. Categoria e bairro usam correspondência exata, também sem diferenciar maiúsculas/minúsculas.",
            parameters: [
                { in: "query", name: "busca", schema: { type: "string", minLength: 1, maxLength: 200 }, description: "Termo de busca; recebe trim." },
                { in: "query", name: "categoria", schema: { type: "string", minLength: 1, maxLength: 100 }, description: "Nome ou slug exato da categoria principal ou adicional (não UUID); recebe trim.", example: "Histórico" },
                { in: "query", name: "situacao", schema: schema("Situacao"), description: "Situação atual do patrimônio." },
                { in: "query", name: "bairro", schema: { type: "string", minLength: 1, maxLength: 100 }, description: "Nome exato do bairro; recebe trim." },
                { in: "query", name: "pagina", schema: { type: "integer", minimum: 1, default: 1 }, description: "Página, convertida de texto para número." },
                { in: "query", name: "limite", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Itens por página, convertido de texto para número." },
            ],
            responses: {
                200: response("Lista paginada.", "PatrimonioListaResponse", { success: true, data: { itens: [resumo], paginacao: { pagina: 1, limite: 20, total: 1, totalPaginas: 1 } } }),
                400: badRequest, 500: internal,
            },
        },
    },
    "/api/patrimonios/{slug}": {
        get: {
            tags: ["Patrimônios públicos"], summary: "Consulta patrimônio publicado pelo slug", description: "O identificador da URL é o slug, não um UUID. Patrimônios não publicados também retornam 404. Rotas relacionadas são incluídas somente quando publicadas.",
            parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string", minLength: 1, maxLength: 220, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }, example: "casa-da-cultura-exemplo" }],
            responses: {
                200: response("Detalhes do patrimônio.", "PatrimonioDetalheResponse", { success: true, data: { ...resumo, descricao: "Edificação de interesse cultural.", historia: null, importanciaCultural: null, updatedAt: "2026-09-01T12:00:00.000Z", categoria: { ...categoria, descricao: null }, imagens: [{ ...imagem, credito: null, fonte: null, ordem: 0 }], documentos: [], rotas: [] } }),
                400: badRequest, 404: error("Slug não encontrado ou patrimônio não publicado.", "PATRIMONIO_NOT_FOUND", "Patrimônio não encontrado."), 500: internal,
            },
        },
    },
    "/api/admin/patrimonios": {
        post: {
            tags: ["Patrimônios administrativos"], summary: "Cria um patrimônio em rascunho", description: "Disponível para ADMIN e EDITOR autenticados. Substitua o categoriaId ilustrativo por um UUID real da tabela categoria no banco configurado. categoriasAdicionais é opcional, aceita até 6 UUIDs distintos e não pode incluir a categoria principal. O slug é gerado do nome. O status é sempre RASCUNHO, independentemente da situação. Executa uma gravação real no banco configurado.",
            security: bearerAuth,
            requestBody: body("PatrimonioRequest", { nome: "Casa da Cultura Exemplo", descricao: "Edificação de interesse cultural.", descricaoResumida: "Edificação histórica em Guarulhos.", categoriaId, situacao: "PRESERVADO", localizacao: { endereco: "Rua Exemplo", numero: "10", bairro: "Centro", latitude: -23.4628, longitude: -46.5333 } }),
            responses: {
                201: response("Rascunho criado.", "PatrimonioCriadoResponse", { success: true, data: { id: patrimonioId, nome: resumo.nome, slug: resumo.slug, descricao: "Edificação de interesse cultural.", descricaoResumida: resumo.descricaoResumida, historia: null, importanciaCultural: null, situacao: "PRESERVADO", status: "RASCUNHO", categoriaId, createdBy: usuarioId, updatedBy: null, createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z", publicadoEm: null, arquivadoEm: null, categoria: { ...categoria, descricao: null, createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z" }, localizacao } }),
                400: badRequest, 401: unauthorized, 403: forbidden,
                404: error("Categoria não encontrada.", "CATEGORIA_NOT_FOUND", "Categoria não encontrada."),
                409: error("Não foi possível obter um slug exclusivo.", "PATRIMONIO_SLUG_CONFLICT", "Já existe um patrimônio com este slug."),
                413: tooLarge, 500: internal,
            },
        },
    },
};

const idParameter = { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" }, example: patrimonioId, description: "UUID do patrimônio, tratado como texto." };
const adminResponses = {
    200: response("Dados administrativos com categoria, localização e todas as mídias.", "PatrimonioAdminResponse"),
    400: badRequest, 401: unauthorized, 403: forbidden,
    404: error("Patrimônio inexistente.", "PATRIMONIO_NOT_FOUND", "Patrimônio não encontrado."),
    500: internal,
};
paths["/api/admin/patrimonios"].get = {
    tags: ["Patrimônios administrativos"], summary: "Lista patrimônios de todos os status",
    description: "ADMIN e EDITOR. Reutiliza filtros públicos e ordenação estável por nome e ID. Sem resultados retorna itens vazio. Exemplo: ?status=RASCUNHO&busca=igreja&pagina=1&limite=20.",
    security: bearerAuth,
    parameters: [...paths["/api/patrimonios"].get.parameters, { in: "query", name: "status", schema: schema("StatusPublicacao"), description: "Opcional; omitido retorna todos os status." }],
    responses: { 200: response("Lista administrativa paginada.", "PatrimonioAdminListaResponse"), 400: badRequest, 401: unauthorized, 403: forbidden, 500: internal },
};
paths["/api/admin/patrimonios/{id}"] = {
    get: { tags: ["Patrimônios administrativos"], summary: "Consulta detalhes para edição", description: "ADMIN e EDITOR podem consultar qualquer status, incluindo rascunhos e arquivados.", security: bearerAuth, parameters: [idParameter], responses: adminResponses },
    patch: { tags: ["Patrimônios administrativos"], summary: "Edita parcialmente um patrimônio",
        description: "EDITOR edita somente RASCUNHO; ADMIN edita qualquer status. Preserva campos omitidos e slug, registra updatedBy. Permite alterar categoriasAdicionais preservando a regra de até 6 categorias distintas da principal. Recusa corpo vazio, campos desconhecidos, status, autoria, IDs do patrimônio, datas e mídias. Categoria inexistente retorna 400. Localização é criada ou atualizada em transação. Latitude e longitude devem ser enviadas juntas: dois números atualizam, null/null limpa e ambas omitidas preservam a posição. Valida o estado final e rejeita pares incompletos.",
        security: bearerAuth, parameters: [idParameter], requestBody: body("PatrimonioPatch", { nome: "Novo nome", localizacao: { bairro: "Centro" } }), responses: { ...adminResponses, 413: tooLarge },
    },
};
paths["/api/auth/senha"] = {
    patch: {
        tags: ["Autenticação"], summary: "Troca a própria senha",
        description: "EDITOR e ADMIN autenticados. Confere a senha atual e altera somente a senha da conta do token. A nova senha deve ser diferente. A troca revoga atomicamente todas as sessões e JWTs anteriores da conta, inclusive o utilizado nesta operação. Faça novo login com a nova senha.",
        security: bearerAuth,
        requestBody: body("ChangePasswordRequest", { senhaAtual: "SenhaAtual123!", novaSenha: "NovaSenhaSegura123!" }),
        responses: {
            200: response("Senha alterada.", "ChangePasswordResponse", { success: true, message: "Senha alterada com sucesso." }),
            400: error("Dados inválidos, senha atual incorreta ou nova senha igual à atual.", "BAD_REQUEST", "Dados inválidos."),
            401: unauthorized, 403: forbidden, 413: tooLarge, 500: internal,
        },
    },
};
for (const [action, summary, description] of [
    ["publicar", "Publica ou republica um patrimônio", "Somente ADMIN. Valida dados do cadastro, publica rascunho ou arquivado, define publicadoEm para a data atual, limpa arquivadoEm e registra updatedBy. Passa a aparecer na consulta pública."],
    ["arquivar", "Arquiva um patrimônio", "Somente ADMIN. Arquiva rascunho ou publicado, define arquivadoEm e updatedBy, preserva publicadoEm e mídias. Deixa de aparecer na listagem e nos detalhes públicos."],
]) {
    paths[`/api/admin/patrimonios/{id}/${action}`] = { patch: {
        tags: ["Patrimônios administrativos"], summary,
        description: `${description} Se já estiver no status solicitado, retorna sucesso sem alterar datas ou autoria. Não existe retorno para rascunho.`,
        security: bearerAuth, parameters: [idParameter], responses: { ...adminResponses, 413: tooLarge },
        requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: false }, example: {} } } },
    } };
}

const conteudoId = {
    in: "path", name: "id", required: true,
    schema: { type: "string", format: "uuid" }, description: "UUID do conteúdo.",
};
const conteudoFiltros = [
    { in: "query", name: "busca", schema: { type: "string", minLength: 1, maxLength: 200 }, description: "Busca no título, sem diferenciar maiúsculas/minúsculas." },
    { in: "query", name: "pagina", schema: { type: "integer", minimum: 1, default: 1 } },
    { in: "query", name: "limite", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
];
const conteudoErros = {
    400: badRequest, 401: unauthorized, 403: forbidden,
    404: error("Conteúdo inexistente.", "NOT_FOUND", "Conteúdo não encontrado."),
    409: error("Conflito de unicidade.", "CONFLICT", "Já existe um registro com os dados únicos informados."),
    413: error("JSON acima de 100 kb ou upload acima dos limites (imagem de até 10 MB).", "INTERNAL_ERROR", "Corpo da requisição muito grande."),
    500: internal,
};
function conteudoBody(nome, multipart, novidade, required = true) {
    const encoding = novidade ? Object.fromEntries(
        ["bloco", "cta", "fontes", "imagemUrl"].filter((campo) => campo !== "imagemUrl" || nome.endsWith("Patch"))
            .map((campo) => [campo, { contentType: "application/json" }])
    ) : undefined;
    return {
        required,
        description: "Use multipart/form-data para enviar imagem. Objetos bloco/cta e array fontes são serializados como JSON nos campos multipart.",
        content: {
            ...(nome !== "ExposicaoCreate" && { "application/json": { schema: schema(nome) } }),
            "multipart/form-data": { schema: schema(multipart), ...(encoding && { encoding }) },
        },
    };
}
for (const [recurso, nome, tag] of [
    ["exposicoes", "Exposicao", "Exposições"],
    ["novidades", "Novidade", "Novidades"],
]) {
    const novidade = recurso === "novidades";
    const publico = `/api/${recurso}`;
    const admin = `/api/admin/${recurso}`;
    const parametros = [
        ...conteudoFiltros,
        ...(novidade ? [{ in: "query", name: "tipo", schema: schema("TipoNovidade") }] : []),
    ];
    const respostas = { ...conteudoErros, 200: response("Conteúdo administrativo.", `${nome}AdminResponse`) };
    paths[publico] = { get: {
        tags: [tag], summary: `Lista ${recurso} publicados`,
        description: `Pública, somente PUBLICADO. Não aceita filtro de status. ${novidade ? "Ordena por data decrescente e ID; data usa YYYY-MM-DD." : "Ordena por publicação decrescente, criação decrescente e ID."} Retorna itens e paginação, inclusive quando vazio.`,
        parameters: parametros,
        responses: { 200: response("Lista pública paginada.", `${nome}ListaResponse`), 400: badRequest, 500: internal },
    } };
    paths[admin] = {
        get: {
            tags: [tag], summary: `Lista ${recurso} de todos os status`,
            description: "ADMIN e EDITOR. Sem filtro de status inclui rascunhos, publicados e arquivados.",
            security: bearerAuth,
            parameters: [...parametros, { in: "query", name: "status", schema: schema("StatusPublicacao") }],
            responses: { 200: response("Lista administrativa paginada.", `${nome}AdminListaResponse`), 400: badRequest, 401: unauthorized, 403: forbidden, 500: internal },
        },
        post: {
            tags: [tag], summary: `Cria ${novidade ? "novidade" : "exposição"}`,
            description: `ADMIN e EDITOR; EDITOR cria somente RASCUNHO. Slug gerado no POST e imutável. ${novidade ? "Imagem opcional; data obrigatória e resumo obrigatório para NOTICIA." : "Imagem obrigatória no campo imagem (multipart/form-data)."}`,
            security: bearerAuth,
            requestBody: conteudoBody(`${nome}Create`, `${nome}CreateMultipart`, novidade),
            responses: { ...conteudoErros, 201: response("Conteúdo criado.", `${nome}AdminResponse`) },
        },
    };
    paths[`${admin}/{id}`] = {
        get: {
            tags: [tag], summary: "Consulta conteúdo para edição", security: bearerAuth,
            description: "ADMIN e EDITOR consultam qualquer status.",
            parameters: [conteudoId], responses: respostas,
        },
        patch: {
            tags: [tag], summary: "Edita conteúdo parcialmente", security: bearerAuth,
            description: `EDITOR edita somente RASCUNHO e não pode publicar/arquivar. ADMIN edita qualquer status. Preserva slug e campos omitidos. Aceita JSON ou multipart sem trocar imagem. ${novidade ? "imagemUrl: null remove a imagem; se o resultado for NOTICIA, resumo é obrigatório." : "Não permite remover a imagem da exposição."} A troca salva o banco antes de apagar a imagem antiga.`,
            parameters: [conteudoId],
            requestBody: conteudoBody(`${nome}Patch`, `${nome}PatchMultipart`, novidade),
            responses: respostas,
        },
        delete: {
            tags: [tag], summary: "Exclui conteúdo", security: bearerAuth,
            description: "Somente ADMIN, inclusive para PUBLICADO. Remove o registro e depois o arquivo de imagem.",
            parameters: [conteudoId],
            responses: { ...conteudoErros, 200: response("Conteúdo excluído.", "ConteudoExcluidoResponse") },
        },
    };
    for (const [acao, resumo] of [["publicar", "Publica ou republica conteúdo"], ["arquivar", "Arquiva conteúdo"]]) {
        paths[`${admin}/{id}/${acao}`] = { patch: {
            tags: [tag], summary: resumo, security: bearerAuth,
            description: "Somente ADMIN. Atualiza status e autoria; muda a visibilidade na API pública. Define o timestamp quando há mudança de status.",
            parameters: [conteudoId], responses: respostas,
            requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: false }, example: {} } } },
        } };
    }
}

const adminId = {
    in: "path", name: "id", required: true,
    schema: { type: "string", format: "uuid" }, description: "UUID do usuário.",
};
const userResponses = {
    200: response("Usuário sem credenciais.", "AdminResponse"),
    400: badRequest, 401: unauthorized, 403: forbidden,
    404: error("Usuário inexistente.", "NOT_FOUND", "Usuário não encontrado."),
    500: internal,
};
paths["/api/admins"].get = {
    tags: ["Administradores"], summary: "Lista usuários ADMIN e EDITOR",
    description: "Somente ADMIN. Sem filtro ativo, inclui ativos e inativos. Busca nome/e-mail sem distinguir maiúsculas. Ordenação estável por nome e ID. Retorna itens e paginação mesmo quando vazio.",
    security: bearerAuth,
    parameters: [
        { in: "query", name: "busca", schema: { type: "string", minLength: 1, maxLength: 254 } },
        { in: "query", name: "role", schema: schema("Role") },
        { in: "query", name: "ativo", schema: { type: "boolean" }, description: "Aceita true ou false; omitido inclui ambos." },
        { in: "query", name: "pagina", schema: { type: "integer", minimum: 1, default: 1 } },
        { in: "query", name: "limite", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
    ],
    responses: { 200: response("Lista paginada de usuários.", "AdminListaResponse"), 400: badRequest, 401: unauthorized, 403: forbidden, 500: internal },
};
paths["/api/admins/{id}"] = {
    get: {
        tags: ["Administradores"], summary: "Consulta um usuário", description: "Somente ADMIN; inclui contas inativas.",
        security: bearerAuth, parameters: [adminId], responses: userResponses,
    },
    patch: {
        tags: ["Administradores"], summary: "Edita nome, e-mail ou perfil",
        description: "Somente ADMIN. Exige ao menos um campo, preserva campos omitidos, normaliza e-mail para minúsculas e recusa campos desconhecidos. Não altera senha nem situação. Auto-rebaixamento retorna ADMIN_CANNOT_DEMOTE_SELF; remoção do último ADMIN ativo retorna LAST_ACTIVE_ADMIN (409). A proteção é transacional, incluindo requisições concorrentes. Não existe DELETE de usuários.",
        security: bearerAuth, parameters: [adminId], requestBody: body("AdminPatch", { nome: "Novo nome" }),
        responses: { ...userResponses, 413: tooLarge,
            409: error("ADMIN_ALREADY_EXISTS, ADMIN_CANNOT_DEMOTE_SELF ou LAST_ACTIVE_ADMIN.", "ADMIN_CANNOT_DEMOTE_SELF", "Você não pode rebaixar a própria conta."),
        },
    },
};
paths["/api/admins/{id}/status"] = { patch: {
    tags: ["Administradores"], summary: "Ativa ou desativa um usuário",
    description: "Somente ADMIN. Aceita apenas ativo booleano. Repetir a situação atual não altera atualizadoEm. Auto-desativação retorna ADMIN_CANNOT_DEACTIVATE_SELF; desativar o último ADMIN ativo retorna LAST_ACTIVE_ADMIN (409). Verificação transacional protege contra concorrência. Conta inativa não pode fazer login nem usar JWT já emitido.",
    security: bearerAuth, parameters: [adminId], requestBody: body("AdminStatus", { ativo: false }),
    responses: { ...userResponses, 413: tooLarge,
        409: error("ADMIN_CANNOT_DEACTIVATE_SELF ou LAST_ACTIVE_ADMIN.", "ADMIN_CANNOT_DEACTIVATE_SELF", "Você não pode desativar a própria conta."),
    },
} };
const imageIdParameter = { name: "imagemId", in: "path", required: true, schema: { type: "string", format: "uuid" } };
paths["/api/admin/patrimonios/{id}/imagens"] = {
    post: {
        tags: ["Patrimônios administrativos"], summary: "Adiciona imagem ao patrimônio",
        description: "ADMIN e EDITOR em qualquer status. Campo imagem obrigatório, JPG/PNG/WEBP/GIF até 10 MB. A assinatura binária precisa corresponder ao MIME. Falhas descartam somente o upload novo.",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "multipart/form-data": { schema: {
            type: "object", required: ["imagem"], properties: {
                imagem: { type: "string", format: "binary" },
                titulo: { type: "string", maxLength: 200 },
                textoAlternativo: { type: "string", maxLength: 300 },
                credito: { type: "string", maxLength: 200 },
                fonte: { type: "string", maxLength: 500 },
                ordem: { type: "integer", minimum: 0, default: 0 },
                principal: { type: "boolean", default: false },
            },
        } } } },
        responses: {
            201: response("Imagem criada.", "PatrimonioImagemResponse"),
            400: badRequest, 401: unauthorized, 403: forbidden,
            404: error("Patrimônio inexistente.", "PATRIMONIO_NOT_FOUND", "Patrimônio não encontrado."),
            413: error("Imagem acima de 10 MB ou multipart acima de 11 MB.", "INTERNAL_ERROR", "O upload excede o limite de 10 MB."),
            500: internal,
        },
    },
};
paths["/api/admin/patrimonios/imagens/{imagemId}"] = {
    delete: {
        tags: ["Patrimônios administrativos"], summary: "Remove imagem do patrimônio",
        description: "Somente ADMIN. Quarentena antes da exclusão; restauração em rollback e limpeza definitiva após commit. URLs compartilhadas permanecem disponíveis.",
        security: bearerAuth, parameters: [imageIdParameter],
        responses: {
            200: response("Imagem removida.", "PatrimonioImagemRemovidaResponse"),
            400: badRequest, 401: unauthorized, 403: forbidden,
            404: error("Imagem inexistente.", "IMAGEM_NOT_FOUND", "Imagem não encontrada."), 500: internal,
        },
    },
};


const referenciaResponse = {
    type: "object", required: ["success", "data"], properties: {
        success: { type: "boolean" },
        data: { type: "object", required: ["id", "descricao", "nomeArquivo", "url", "tipo"], properties: {
            id: { type: "string", format: "uuid" }, descricao: { type: "string" },
            nomeArquivo: { type: "string", nullable: true }, url: { type: "string" },
            tipo: { type: "string", enum: ["ARQUIVO", "LINK"] },
        } },
    },
};
paths["/api/admin/patrimonios/{id}/referencias"] = {
    post: {
        tags: ["Patrimônios administrativos"], summary: "Adiciona referência do texto",
        description: "ADMIN em qualquer status; EDITOR somente em RASCUNHO. Reutiliza PatrimonioDocumento. Um arquivo PDF/DOC/DOCX/ODT/TXT/MD de até 10 MB OU um link HTTP(S). Não altera descrição nem resumo.",
        security: bearerAuth, parameters: [idParameter],
        requestBody: { required: true, content: {
            "application/json": { schema: { type: "object", additionalProperties: false, required: ["url"], properties: {
                url: { type: "string", format: "uri", pattern: "^https?://", maxLength: 4000 }, descricao: { type: "string", maxLength: 300 },
            } } },
            "multipart/form-data": { schema: { type: "object", additionalProperties: false, required: ["arquivo"], properties: {
                arquivo: { type: "string", format: "binary" }, descricao: { type: "string", maxLength: 300 },
            } } },
        } },
        responses: {
            201: { description: "Referência criada.", content: { "application/json": { schema: referenciaResponse } } },
            400: badRequest, 401: unauthorized, 403: forbidden,
            404: error("Patrimônio inexistente.", "NOT_FOUND", "Patrimônio não encontrado."),
            413: error("Arquivo acima de 10 MB.", "INTERNAL_ERROR", "O arquivo deve ter no máximo 10 MB."), 500: internal,
        },
    },
};
paths["/api/admin/patrimonios/{id}/referencias/{referenciaId}"] = {
    delete: {
        tags: ["Patrimônios administrativos"], summary: "Remove referência do patrimônio",
        description: "Somente ADMIN. Confere o vínculo; arquivo local passa por quarentena, rollback restaura os bytes e a limpeza definitiva ocorre após commit. LINK não remove arquivo.",
        security: bearerAuth, parameters: [idParameter, { name: "referenciaId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
            200: { description: "Referência removida.", content: { "application/json": { schema: { type: "object", properties: {
                success: { type: "boolean" }, data: { type: "object", properties: { id: { type: "string", format: "uuid" } } },
            } } } } },
            400: badRequest, 401: unauthorized, 403: forbidden,
            404: error("Patrimônio ou referência inexistente.", "NOT_FOUND", "Referência não encontrada neste patrimônio."), 500: internal,
        },
    },
};

paths["/api/admin/patrimonios/imagens/{imagemId}"].patch = {
    tags: ["Patrimônios administrativos"], summary: "Edita metadados da imagem",
    description: "ADMIN e EDITOR em qualquer status, conforme a política atual de imagens. Não altera URL ou vínculo. Principal é atualizado sob lock do patrimônio.",
    security: bearerAuth, parameters: [imageIdParameter],
    requestBody: { required: true, content: { "application/json": { schema: {
        type: "object", additionalProperties: false, minProperties: 1, properties: {
            titulo: { type: "string", maxLength: 200, nullable: true },
            textoAlternativo: { type: "string", minLength: 1, maxLength: 300 },
            credito: { type: "string", maxLength: 200, nullable: true },
            fonte: { type: "string", maxLength: 500, nullable: true },
            ordem: { type: "integer", minimum: 0, maximum: 2147483647 }, principal: { type: "boolean" },
        },
    } } } },
    responses: { 200: response("Imagem atualizada.", "PatrimonioImagemResponse"), 400: badRequest, 401: unauthorized, 403: forbidden,
        404: error("Imagem inexistente.", "IMAGEM_NOT_FOUND", "Imagem não encontrada."), 500: internal },
};
paths["/api/admin/patrimonios/{id}/referencias/{referenciaId}"].patch = {
    tags: ["Patrimônios administrativos"], summary: "Edita metadados da referência",
    description: "ADMIN em qualquer status; EDITOR somente RASCUNHO. Conserva tipo ARQUIVO/LINK, URL, mimeType e vínculo. Responde com o DTO atual; fonte/dataDocumento permanecem disponíveis em documentos no detalhe do patrimônio.",
    security: bearerAuth, parameters: paths["/api/admin/patrimonios/{id}/referencias/{referenciaId}"].delete.parameters,
    requestBody: { required: true, content: { "application/json": { schema: {
        type: "object", additionalProperties: false, minProperties: 1, properties: {
            titulo: { type: "string", minLength: 1, maxLength: 200 },
            descricao: { type: "string", maxLength: 300, nullable: true },
            fonte: { type: "string", maxLength: 500, nullable: true },
            dataDocumento: { type: "string", format: "date", nullable: true },
        },
    } } } },
    responses: { 200: { description: "Referência atualizada.", content: { "application/json": { schema: referenciaResponse } } },
        400: badRequest, 401: unauthorized, 403: forbidden, 404: error("Referência inexistente neste patrimônio.", "NOT_FOUND", "Referência não encontrada neste patrimônio."), 500: internal },
};
paths["/api/admin/dashboard"] = { get: {
    tags: ["Patrimônios administrativos"], summary: "Obtém fotografia agregada dos patrimônios",
    description: "ADMIN/EDITOR. Transação RepeatableRead somente leitura. Total, categorias principais e bairros incluem TODOS_OS_STATUS; PUBLICADO e meta.publicados contam apenas publicados. Bens sem localização/bairro entram em Não informado. Não altera as listagens existentes.",
    security: bearerAuth,
    responses: { 200: { description: "Contagens consistentes na mesma fotografia.", content: { "application/json": { schema: {
        type: "object", required: ["success", "data"], properties: {
            success: { type: "boolean", enum: [true] },
            data: { type: "object", required: ["total", "RASCUNHO", "PUBLICADO", "ARQUIVADO", "porCategoria", "porBairro", "meta"], properties: {
                ...Object.fromEntries(["total", "RASCUNHO", "PUBLICADO", "ARQUIVADO"].map(key => [key, { type: "integer", minimum: 0 }])),
                porCategoria: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, nome: { type: "string" }, slug: { type: "string" }, quantidade: { type: "integer" } } } },
                porBairro: { type: "array", items: { type: "object", properties: { bairro: { type: "string" }, quantidade: { type: "integer" } } } },
                meta: { type: "object", properties: { baseContagem: { type: "string", enum: ["TODOS_OS_STATUS"] }, categoria: { type: "string", enum: ["PRINCIPAL"] }, publicados: { type: "integer" } } },
            } },
        },
    } } } }, 401: unauthorized, 403: forbidden, 500: internal },
} };

for (const [recurso, nome, dto] of [["fatos", "Fato", "Fato"], ["ligacoes", "Ligacao", "LigacaoAdmin"]]) {
    const base = "/api/admin/patrimonios/{id}/" + recurso;
    const params = [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }];
    const common = { tags: ["Patrimônios admin"], security: bearerAuth, parameters: params,
        description: "ADMIN em qualquer status; EDITOR edita somente origem RASCUNHO. Leituras ADMIN/EDITOR em todos os status. Itens complementam detalhes. Ordem ocupada, destino duplicado ou legado consolidado: 409. Ligações são direcionadas e não aceitam autorrelação; destinos não publicados ficam apenas no admin.",
        responses: { 400: badRequest, 401: unauthorized, 403: forbidden, 404: error("Patrimônio/item não encontrado.", "NOT_FOUND", "Não encontrado."), 409: error("Conflito de ordem, destino ou identidade.", "CONFLICT", "Conflito."), 500: internal } };
    paths[base] = {
        get: { ...common, summary: "Lista " + recurso, responses: { ...common.responses, 200: response("Itens ordenados.", dto + "ListaResponse") } },
        post: { ...common, summary: "Cria " + recurso, requestBody: body(nome + "Request"), responses: { ...common.responses, 201: response("Item criado.", dto + "Response") } },
    };
    paths[base + "/ordem"] = { patch: { ...common, summary: "Reordena " + recurso, requestBody: body("EditorialOrdem"), responses: { ...common.responses, 200: response("Ordem atualizada.", dto + "ListaResponse") } } };
    const item = { ...common, parameters: [...params, { in: "path", name: "itemId", required: true, schema: { type: "string", format: "uuid" } }] };
    paths[base + "/{itemId}"] = {
        patch: { ...item, summary: "Atualiza " + recurso, requestBody: body(nome + "Patch"), responses: { ...common.responses, 200: response("Item atualizado.", dto + "Response") } },
        delete: { ...item, summary: "Exclui " + recurso, responses: { ...common.responses, 200: response("Item excluído; ordens restantes são preservadas.", "PatrimonioImagemRemovidaResponse") } },
    };
}

Object.assign(paths, pathsMidia);
// Campo arquivo é alternativa secundária; imagem mantém o contrato D1A.
const uploadIntegrado = paths["/api/admin/patrimonios/{id}/imagens"].post;
const multipart = uploadIntegrado.requestBody.content["multipart/form-data"];
multipart.schema = { oneOf: [multipart.schema, { $ref: "#/components/schemas/ImagemUpload" }] };
uploadIntegrado.description += " Alternativa arquivo: JPEG/PNG/WebP no limite configurado, textoAlternativo obrigatório; ADMIN/EDITOR em qualquer status. O campo imagem mantém GIF/10 MB e ADMIN/EDITOR em qualquer status.";

pathsOrganizacaoEditorial(paths);
