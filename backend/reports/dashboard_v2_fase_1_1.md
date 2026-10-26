# Dashboard V2 — Fase 1.1: backend e persistência para revisão

Data: 26/10/2026, America/Sao_Paulo. Base: `18e79d5`. Escopo aprovado: backend de visualizações, persistência proposta e testes isolados. A [arquitetura consolidada](../docs/dashboard_v2_1_arquitetura_metricas.md), já presente como arquivo local antes desta etapa, foi preservada.

**Implementação submetida à revisão; coleta e consulta V2 desligadas por padrão.** Nenhuma conexão ao banco real foi usada nesta etapa. Não houve alteração de frontend, autenticação, dados reais, relacionamentos editoriais, manifests ou dependências; nenhum commit, push ou deploy. A migration abaixo foi preparada para revisão e seu SQL foi exercitado exclusivamente no PostgreSQL descartável. Isso não autoriza aplicação ou ativação no ambiente final.

## Arquivos da entrega

| Grupo | Criados / modificados |
| --- | --- |
| Persistência | Modificado `prisma/schema.prisma`; criada [20261026120000_add_visualizacoes_metricas/migration.sql](../prisma/migrations/20261026120000_add_visualizacoes_metricas/migration.sql) |
| Configuração e cookie | Novos `src/config/metricas.js`, `src/utils/dataMetricas.js`, `src/services/cookieMetricasService.js`; exemplos desligados em `.env.example` |
| Ingestão | Novos `src/middlewares/limiteMetricas.js`, `src/schemas/metricasSchema.js`, `src/routes/metricasRoute.js`, `src/services/metricasService.js`; montagem em `src/app.js` antes do parser global |
| Consulta administrativa | Novo `src/services/dashboardMetricasService.js`; rota adicional em `src/routes/dashboardRoute.js` |
| Contrato OpenAPI | Novo `src/docs/pathsMetricas.js`, registrado em `src/docs/paths.js` |
| Testes | Novos `test/metricas.test.js`, `test/metricasHttp.test.js`, `test/dashboardMetricas.test.js`, `test/metricas.integration.test.js`; listas esperadas atualizadas em `test/docs.test.js` e `test/r1.test.js` |
| Evidência | Este relatório; logs e runner local em `.cache/v21_*`, ignorados pelo Git |

Os caminhos da tabela são relativos a `backend/`. `dashboardService.js`, `AdminDashboard.jsx`, `GraficosDashboard.jsx`, `dashboardApi.js`, Recharts lazy e CSS Modules permanecem intocados. Não há cliente público de métricas nem instrumentação do detalhe nesta entrega.

## Migration proposta

Três tabelas novas, sem backfill:

- `visualizacoes_unicas_dia`: recibo com PK `(dia, patrimonio_id, chave_visitante)`. O HMAC hexadecimal é específico de patrimônio/dia; não se persiste o token bruto.
- `visualizacoes_totais_dia`: PK `(dia, patrimonio_id)`, contador `BIGINT` não negativo. Índices inversos `(patrimonio_id, dia)` nas duas tabelas para consultas e reconciliação por bem.
- `sondas_metricas`: estrutura prevista na arquitetura, com janela UTC alinhada a cinco minutos, enum de estado e versão positiva. **Nenhuma sonda ou agendador foi implementado**, e a consulta informa cobertura não instrumentada.

As duas FKs patrimoniais usam `ON DELETE RESTRICT`; não foi criada rota de exclusão física de patrimônio. Não existem alterações nas nove migrations anteriores, nos dados canônicos ou nos modelos de autenticação. As relações inversas novas não mudam os DTOs V1.

Permissões necessárias da API: SELECT/INSERT em recibos; SELECT/INSERT/UPDATE em totais; SELECT em patrimônio/regiões e permissão UPDATE na linha patrimonial necessária ao `FOR SHARE`. A migration não contém GRANT com nomes de papéis específicos. A infraestrutura atual concede privilégios de tabelas por default ao criá-las com `portal_migrator`; conferir o papel executor na futura revisão operacional. O usuário da API continua sem DDL. Retenção/sondas exigirão definição de papel operacional e privilégios próprios antes de ativar a coleta.

## Flags, segredos e rotação

| Variável | Regra implementada |
| --- | --- |
| `METRICAS_COLETA_ATIVA` | `false` por padrão; somente literais `true`/`false` |
| `METRICAS_CONSULTA_ATIVA` | `false` por padrão; independente da coleta e sem exigência de segredo para leitura |
| `METRICAS_ORIGEM` | Obrigatória com coleta ativa: origem exata, incluindo porta quando necessária, sem caminho nem barra final |
| `METRICAS_COOKIE_MODO` | `https`; alternativa `http-local` somente em HTTP loopback e fora de `NODE_ENV=production` |
| `METRICAS_CHAVES_JSON` | Array de 1 a 4 objetos, exclusivamente `{id,desde,segredo}`; exigido somente com coleta ativa |

Com coleta desligada, origem/modo/chaves V2 não são interpretados nem exigidos. Configuração habilitada inválida impede a inicialização com mensagem genérica, sem expor valores. O backend continua exigindo sua configuração anterior de banco/JWT; a dispensa é dos segredos **V2**. Os testes usam URL sentinela sem banco e demonstram inicialização com flags desligadas.

Cada raiz deve ter 32 bytes gerados por CSPRNG e ser representada por 64 caracteres hexadecimais minúsculos. A validação de formato não prova entropia. Não reutilizar JWT, segredos de outros ambientes ou valores de fixture. `id` é um identificador público de versão com até 20 caracteres; `desde` é um dia válido `YYYY-MM-DD` em São Paulo. IDs e datas precisam ser únicos, e deve haver uma chave efetiva hoje. Distribuir as raízes pelo mecanismo de segredos do ambiente, nunca em `VITE_*`, logs ou arquivos versionados.

Protocolo implementado:

```text
raiz = bytes do segredo hexadecimal
K_cookie(dia) = HMAC-SHA256(raiz, JSON(["portal-metricas",1,"cookie",dia]))
K_dedup(dia)  = HMAC-SHA256(raiz, JSON(["portal-metricas",1,"deduplicacao",dia]))
corpo        = v1.<id>.<dia>.<nonce aleatório de 32 bytes em base64url>
token        = corpo + "." + HMAC-SHA256(K_cookie(dia),corpo).hex
recibo       = HMAC-SHA256(K_dedup(dia),JSON([nonce,UUID minúsculo])).hex
```

A assinatura é comparada com `timingSafeEqual` após conferir formato/tamanho. O backend escolhe a chave com maior `desde` não posterior ao dia atual; somente essa versão é aceita naquele dia. Cookie válido é reutilizado, sem renovar a data de expiração. Dia e expiração são calculados pelo servidor com `America/Sao_Paulo`, incluindo a passagem de mês/ano, sem fixar offset UTC.

**Rotação operacional:** gerar nova raiz/id e agendar `desde` para um dia futuro; distribuir o mesmo conjunto a todas as instâncias antes da virada. Não alterar o segredo/id já efetivo durante um dia de coleta: isso invalida cookies e pode permitir nova contribuição da mesma pessoa. Para incidente, desligar a ingestão e planejar retomada/versão; não prometer rotação transparente no meio do dia. O código valida a configuração local, não detecta divergência entre réplicas. Raízes antigas podem derivar novamente chaves antigas enquanto forem mantidas; apagá-las do secret store e de backups é procedimento operacional, não garantia automática deste código.

Cookie HTTPS: `__Host-portal_metricas`, HttpOnly, Secure, SameSite=Lax, Path=/, sem Domain. HTTP local: `portal_metricas_local`, sem Secure, apenas no modo explícito. Expira na próxima virada do dia de São Paulo. DELETE remove o cookie, mas uma cópia do token assinado permanece válida até expirar; não há cadastro central nem revogação individual imediata. Emissão de credencial não representa pessoa, navegador efetivamente participante ou visualização.

## Contratos HTTP implementados

Todas as respostas de métricas são `Cache-Control: no-store`. Mutações públicas exigem Origin exata e `X-Portal-Metricas: 1`; recusam `Sec-Fetch-Site: cross-site`. POST exige JSON sem compressão, até 2 KB, com campos estritos. Nenhuma dessas rotas importa middleware JWT ou autentica visitantes.

| Método / caminho | Entrada | Resultado |
| --- | --- | --- |
| POST `/api/metricas/visualizacoes/sessao` | `{}`; adesão será responsabilidade do fluxo frontend futuro | 200 `{success:true,data:{dia,expiraEm}}` e cookie; zero escrita de visualização |
| POST `/api/metricas/visualizacoes` | `{patrimonioId:UUID}` e cookie diário | 204 após commit, tanto novo quanto repetido; sem contador público |
| DELETE `/api/metricas/visualizacoes/sessao` | Sem corpo; Origin/header próprios | 204 e remoção do cookie; funciona com coleta desligada, usando então `CORS_ORIGIN` |
| GET `/api/admin/dashboard/metricas` | JWT administrativo existente, ADMIN ou EDITOR | Flag de consulta desligada: 200 `{success:true,data:{disponivel:false,motivo:"DESATIVADA"}}`, sem SQL V2. Ligada: agregados abaixo |

Erros públicos: 400 schema/JSON; 401 `PARTICIPACAO_EXPIRADA`; 403 origem/header; 404 uniforme para inexistente, não publicado ou legado; 413 corpo acima de 2 KB; 415 tipo/compressão; 429 com Retry-After; 503 `COLETA_INDISPONIVEL` com Retry-After de 1 segundo. Com coleta desligada, POST retorna 503 antes de interpretar cookie ou body. A indisponibilidade não é reportada como 204.

Na leitura habilitada, `inicio` e `fim` são obrigatórios/inclusivos, até 366 dias, sem futuro/inversão. Filtros: `patrimonioId`, `regiaoId` **ou** `semRegiao=true`, `pagina` 1–10000 e `limite` 1–100. Campos extras são recusados. Só há granularidade diária nesta fase; não enviar `granularidade=mes|semana`.

Resposta habilitada, dentro de `{success:true,data}`:

```text
disponivel: true
meta: {versaoRegra:1,fuso,inicio,fim,geradoEm,
       unidade:IDENTIDADE_PATRIMONIO_DIA,
       elegibilidade:PUBLICADO_CANONICO_NA_ACEITACAO,
       regiaoReferencia:CADASTRO_ATUAL,
       cobertura:NAO_INSTRUMENTADA,granularidade:dia}
visualizacoes: {
  totalRegistrado: string decimal,
  porPatrimonio: {itens:[{id,nome,slug,status,quantidade}],
                 paginacao:{pagina,limite,total}},
  porRegiao:[{id,nome,slug,ativo,quantidade}], semRegiao: string decimal,
  serie:[{data,quantidade}]
}
favoritos: {disponivel:false}
```

Todas as quantidades são strings, inclusive acima de `Number.MAX_SAFE_INTEGER`; paginação conta bens antes de limitar o ranking. Região é a FK atual do patrimônio, não bairro; região inativa com eventos é preservada. Arquivamento posterior não apaga histórico. Datas sem linha não são preenchidas como zeros certificados; a resposta ainda não declara início de coleta, disponibilidade histórica ou cobertura medida. Contagem V2 é independente do universo administrativo de todos os status da V1.

## Transação, deduplicação e proteção

Após validar cookie/schema, o backend abre transação curta ReadCommitted, obtém `FOR SHARE` na linha patrimonial e confere PUBLICADO e a política `legadoEditorial`. Não aceita status, região, data ou quantidade fornecidos pelo visitante. A data é capturada uma vez na aceitação HTTP; não existe importação de eventos retroativos.

Uma CTE insere o recibo com `ON CONFLICT DO NOTHING RETURNING`; somente uma inserção efetiva incrementa atomicamente o total diário. Falha de qualquer etapa desfaz recibo e total. Retry após resposta perdida usa a mesma chave e não incrementa. Limites: espera de transação 500 ms, transação 2 s, `lock_timeout=200ms`, `statement_timeout=750ms`. Não há retry de escrita oculto no servidor. Sob saturação, 503 permite retry explícito limitado pelo futuro cliente, somente no mesmo dia/ficha elegível.

A consulta administrativa executa agregações sequenciais no mesmo snapshot RepeatableRead **READ ONLY**, timeout de transação 3 s e de statement 1,5 s. Não usa JOIN de categorias secundárias/favoritos, nem escreve no serviço V1.

Limitador próprio, sem modificar login: 300 requisições/minuto/rede; 10 requisições de sessão/hora/rede (incluindo reutilização); 30 eventos/minuto/token. IPv6 é agrupado por /64. Chaves dos buckets usam HMAC com segredo efêmero; máximo 10 mil entradas, expiração e rotação horária. Saturação de cardinalidade recusa novas requisições. IP/token bruto não é persistido nesse mapa ou nas tabelas analíticas.

O limitador é **local ao processo**, reinicia junto com ele e não prova humanidade. Configuração de borda compartilhada, escala entre réplicas, política de bots e observabilidade operacional continuam necessárias antes de ativação pública. Header de origem não impede scripts que o imitem. O backend também não comprova sozinho os dois segundos de visibilidade/adesão: essa qualificação exige o frontend da fase seguinte. Não apresentar esta entrega como coleta habilitada de audiência humana.

## Validação e ambiente descartável

Node **24.22.1**, cliente Prisma **7.10.1**. PostgreSQL **17.11**, `127.0.0.1:5435/portal_test`, cluster **7700042083428745252**. O destino corresponde ao serviço `db_test` já existente de `compose.test.yml`, com tmpfs. Antes do SQL e das execuções foram conferidos banco, papel, host/porta, versão, cluster e ausência de outros clientes. O Compose normal não foi iniciado.

O SQL da migration foi aplicado em transação somente nesse descartável, sem executar o CLI migrate e sem marcar a nova migration em `_prisma_migrations` (as nove entradas anteriores permanecem). Portanto ele serve como prova do SQL, não como certificação de `prisma migrate deploy` de ponta a ponta. A preparação antiga de teste havia criado tabelas com outro proprietário; foram concedidos no descartável os privilégios mínimos para testar também `portal_api`, sem alterar papéis/configuração do ambiente real. Fixtures geradas pelo teste foram removidas por seus próprios IDs; as três tabelas vazias permanecem para inspeção.

| Verificação | Resultado |
| --- | --- |
| Prisma validate / generate | Aprovados; cliente 7.10.1 gerado localmente; nenhuma conexão necessária |
| Suíte completa backend, Node 24 | **502 aprovados, 0 falhas, 0 ignorados**, incluindo integrações e regressão V1; aproximadamente 139 s |
| Lint backend | Aprovado |
| OpenAPI | Validação estrutural, referências, inventário de rotas e segurança aprovados na suíte |
| JSON/HTTP | Cookie ausente/adulterado, origem, campos extras, 2 KB com Content-Length e chunked, 415, 429 e 503 cobertos; corpo de 3 KB continua aceito fora da rota V2; regressões de uploads passaram |
| Flags e permissões | Startup e health sem segredos V2/banco; coleta desligada 503; consulta desligada sem SQL V2; ADMIN/EDITOR autorizados, anônimo/perfil indevido/conta inativa recusados; V1 aprovada |
| Concorrência PostgreSQL, rodada final | 100 tentativas simultâneas: **60 aceitas de imediato, 40 com 503 e retry explícito posterior; 1 recibo e 1 incremento** |
| Atomicidade/locks | Falha após INSERT/incremento desfez ambos; UPDATE concorrente bloqueou FOR SHARE e vice-versa, com lock timeout 200 ms; nenhuma gravação parcial |
| Elegibilidade | PUBLICADO canônico aceito; rascunho, legado mesmo PUBLICADO, inexistente e bem arquivado recusados; histórico anterior ao arquivamento preservado |
| Agregação PostgreSQL | Identidades/UUIDs/dias distintos, região atual e inativa, sem região, total antes da paginação e CHECK/FK Restrict conferidos; ingestão/leitura também com `portal_api` |
| Precisão | Contrato HTTP preserva `9007199254740993` como string, sem conversão para Number |
| Limpeza | Conferência READ ONLY final: zero recibos, totais e sondas; nove registros de migrations anteriores |
| Diff | `git diff --check` aprovado; somente arquivos backend/documentação desta etapa e arquitetura local anterior |

A primeira regressão encontrou somente a lista R1 fixada em nove diretórios de migration; a expectativa recebeu o décimo nome, sem retirar verificações de preservação. A execução completa final passou. A primeira rajada também demonstrou que exigir 100 respostas imediatas contrariava os timeouts curtos: o teste passou a exigir sucesso ou 503, retry explícito dos recusados e exatamente um efeito persistido. Os limites de produção não foram ampliados para fazer o teste passar. A taxa de 503 variou entre execuções e não constitui benchmark de capacidade.

Logs principais: `.cache/v21_suite_final.log`, `.cache/v21_postgres_test.log`, `.cache/v21_lint.log`. O runner `.cache/v21_postgres.cjs` lê credenciais de teste já existentes e não as imprime. Não publicar `.cache/`.

Para reproduzir a integração em outro ambiente, preparar **exclusivamente um descartável `portal_test` já conferido**, com as migrations e privilégios de teste revisados. Definir `TEST_DATABASE_URL`, `TEST_DATABASE_EXCLUSIVE=1`, `METRICAS_TEST_CLUSTER`, `METRICAS_TEST_PORT`, `SECURITY_API_DATABASE_URL` (papel `portal_api`, mesmo destino) e `DATABASE_URL` sentinela distinto. Executar `node --test test/metricas.integration.test.js` a partir de `backend/`. O teste não aplica migrations, não faz seed, não descobre credenciais e recusa identidade/porta/host divergentes. A suíte completa com os demais testes de segurança também precisa de `SECURITY_MIGRATION_DATABASE_URL` e `SECURITY_TEST_DATABASE_EXCLUSIVE=1`.

## Pendências para a Fase 1.2 e ativação

1. Revisar esta implementação e a migration; planejar separadamente aplicação com papel migrador, backup e destino conferido. Flags permanecem desligadas. Não aplicar ao banco real a partir deste relatório.
2. Implementar participação opcional e cliente público independente de `services/api.js`; disparar somente após `estado.detalhe?.uuid` confirmado e qualificação visível. Cuidar de StrictMode, abas, recusa, meia-noite, retry/backoff e perda de cookie. Nenhuma contagem baseada em emissão de credenciais.
3. Implementar sondagem/cobertura, início disponível, reconciliação de dias fechados e retenção de recibos (7 dias) e agregados/sondas (13 meses), com agendador e responsável. A presença da tabela de sondas não substitui esses mecanismos. Não ativar ingestão contínua sem retenção e observabilidade.
4. Completar apresentação administrativa V2 independente/lazy, períodos, lacunas e eventualmente semana/mês. Preservar os quatro gráficos e contratos V1. Adicionar limites de consultas administrativas se a carga medida justificar ou antes de exposição operacional mais ampla.
5. Homologar HTTPS/cookies no navegador e cadeia efetiva de proxy/trust proxy/CORS; configurar proxy Vite restrito quando houver cliente público. Não foram feitas alterações de nginx, Compose ou Vite nesta fase. Ajustar quota de sessão se a navegação legítima exigir mais bootstraps; preferir reutilização coordenada do cookie.
6. Calibrar contenção com carga representativa e EXPLAIN, defesa contra bots e limites compartilhados antes de múltiplas réplicas. Os timeouts curtos podem recusar eventos; a entrega garante efeito deduplicado dos aceitos, não entrega de todos os eventos.
7. Integrar ao CI a execução explicitamente protegida do teste V2 (`METRICAS_TEST_CLUSTER`, `METRICAS_TEST_PORT`, URLs de teste e exclusividade); sem essas guardas ele fica ignorado. Não flexibilizar a conferência para usar o banco real. Workflow remoto ainda depende de aprovação de push.

Favoritos globais, Gemini e “Em alta” continuam fora desta fase. Não houve teste frontend/build porque não há mudança nessa camada; o backend não tem script de build. Nenhuma dependência nova exige reinstalação ou ajuste de bundle.

Referências técnicas consultadas: conflitos dos locks em [PostgreSQL 17 — explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html), inserção condicional em [PostgreSQL 17 — INSERT](https://www.postgresql.org/docs/17/sql-insert.html) e primitivas em [Node.js — crypto](https://nodejs.org/api/crypto.html). As evidências de execução estão descritas acima; referências não substituem os testes locais.
