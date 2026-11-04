# F2 — Backend de Feedback

Data: **02/11/2026**, America/Sao_Paulo. Base: `development/backend`, HEAD `f5f7fb86514345761336833e76b787ff3d9490d7`. Sem fetch, commit, push ou deploy. A única alteração local inicial era o documento F1 não versionado; seu conteúdo foi preservado e recebeu somente o adendo de decisões aprovadas.

**Escopo:** persistência, POST idempotente, consultas ADMIN, agregações, retenção, privilégios, demo e validação local. Sem frontend, nota, contato, estado de tratamento, PATCH ou novas ações AuditLog. As duas flags permanecem falsas por padrão. Resultado local sujeito à revisão F3/F4 e às pendências institucionais/operacionais abaixo.

## 1. Arquivos

Novos arquivos, relativos à raiz:

| Área | Arquivos |
| --- | --- |
| Persistência | `backend/prisma/migrations/20261102120000_add_feedback/migration.sql`, `backend/prisma/tests/integrity_feedback.sql` |
| API | `backend/src/config/feedback.js`, `backend/src/schemas/feedbackSchema.js`, `backend/src/utils/feedback.js`, `backend/src/controllers/feedbackController.js`, `backend/src/services/feedbackService.js`, `backend/src/middlewares/limiteFeedback.js`, `backend/src/routes/feedbackRoute.js`, `backend/src/routes/adminFeedbackRoute.js` |
| Demo/OpenAPI | `backend/src/mock/feedback.js`, `backend/src/docs/feedback.js` |
| Operação isolada | `compose.feedback.test.yml`, `infra/postgres/30-feedback-role.sh`, `backend/scripts/homologar_feedback.js`, `backend/scripts/descartar_feedback.js`, `backend/scripts/sql/permissoes_feedback.sql` |
| Testes | `backend/test/feedback.test.js`, `backend/test/feedbackSeguranca.test.js`, `backend/test/feedback.integration.test.js`, `backend/test/fixtures/feedback_api.mjs` |
| Documentação | `backend/docs/operacao_feedback.md`, este relatório |

Modificados: `.gitattributes`, `.github/workflows/predeploy.yml`, `backend/.env.example`, `backend/prisma/schema.prisma`, `backend/src/app.js`, `backend/src/routes/index.js`, `backend/src/services/index.js`, `backend/src/mock/services.js`, `backend/src/mock/store.js`, `backend/src/docs/openapi.js`, `backend/scripts/validar_metricas_test.js`, `backend/test/operacaoMetricas.integration.test.js`, `backend/test/r1.test.js`, `backend/test/docs.test.js`; adendo ao documento local `backend/docs/feedback_fase_f1_arquitetura.md`.

Nenhum arquivo de frontend, dependência, lockfile, migration histórica, autenticação, auditoria ou contrato V1/V2 foi alterado. Arquivos privados de execução, configuração, backup e logs ficaram em `.cache/feedback_f2/`, ignorada pelo Git.

## 2. Migration e integridade

Foi criada **somente a 12ª migration da linhagem principal**, `20261102120000_add_feedback`. SHA-256 dos bytes LF:

```text
bf2fd195e212483cd53f803532b28315e3a0af22aa082b6e79a3f3d890b5c836
```

`.gitattributes` fixa LF apenas nessa migration nova. As 11 anteriores permaneceram intactas, inclusive seus finais de linha locais. Este checkout já tinha cinco migrations históricas em CRLF e as demais em LF; a conferência com `_prisma_migrations` usa os bytes efetivamente implantados nesse ambiente, sem reescrever SQL/checksums para uniformizá-los. A comparação com a referência Git confirmou conteúdo histórico preservado.

Implantação desde zero: 12 migrations concluídas na primeira tentativa. Segunda execução de `migrate deploy`: nenhuma pendência. Conferência READ ONLY: 12 nomes esperados, conclusão sem rollback e todos os checksums iguais aos arquivos locais. Integridade SQL histórica, V2 e Feedback aprovada.

O trilho corrente de métricas e seu teste de integração passaram de 11 para 12, mantendo conferências integrais. O teste estático R1 também ganhou somente o nome da nova migration; a linhagem separada `equipe` continua com 11. O harness histórico H2 permanece intacto e deve ser executado no checkout histórico, não redirecionado à F2.

## 3. Descartável identificado

| Item | Identidade conferida |
| --- | --- |
| Host/porta publicados | `127.0.0.1:5548` |
| Database | `portal_test`, em cluster novo e exclusivo |
| PostgreSQL | 17.11 (`server_version_num=170011`) |
| Cluster | `7703714792269930530` |
| Projeto Docker | `portal_feedback_f2_0fe3aa20` |
| Volume | `portal_feedback_f2_0fe3aa20_pg_feedback_test` |
| Container | `d553838b9b201450ce1d555b97cdccbb9910c6cf8e037584a01fabecbd1f5ddb` |
| Imagem local | `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24` |
| Estado inicial | Container/volume ausentes antes da criação; zero tabelas públicas antes das migrations |
| Papéis | Bootstrap `portal_test`; `portal_migrator`, `portal_api`, `portal_metricas_operador`, `portal_feedback_operador` sem superuser/CREATEDB/CREATEROLE/BYPASSRLS |

Docker e montagens foram conferidos antes das migrations; banco, cluster, versão, papéis e ausência de tabelas foram conferidos em READ ONLY. Senhas efêmeras distintas permaneceram privadas. O nome `portal_test` atende às regressões existentes, mas não implica reutilização de cluster H2/S1. Nenhuma conexão foi feita a `patrimonio_guarulhos`; Compose normal não foi executado.

Backup sintético `pg_dump -Fc` foi criado após migrations/grants e antes de fixtures. Não contém dados reais e não será versionado. A conferência final READ ONLY encontrou zero Feedback, zero recibos, zero usuários e nenhuma outra sessão. O container F2 foi parado após a validação; volume e backup privado foram preservados para revisão, sem apagar outros recursos.

## 4. Modelos e constraints definitivos

`Feedback`: UUID do servidor; enum `ELOGIO|SUGESTAO|PROBLEMA`; mensagem `varchar(2000)`; aviso `varchar(40)`; criação e expiração `timestamptz(3)`. `ReciboFeedback`: SHA-256 da chave como PK; HMAC-SHA-256 do conteúdo canônico; versão da chave; FK opcional/única do Feedback; recebimento e expiração. Não há relação com usuários, sessões, patrimônios ou métricas.

CHECKs: mensagem não vazia e até 2.000 caracteres SQL; aviso e versão HMAC não vazios; expiração posterior à origem; dois digests hexadecimais de 64 caracteres. FK `ON DELETE SET NULL`, índice único da FK, índices de data/UUID, tipo/data/UUID e expiração. HTTP aplica regras adicionais: NFC, CRLF→LF, trim, pontos de código Unicode, rejeição de controles/surrogates inválidos, corpo estrito sem propriedades extras e aviso aceito pela configuração.

Prazos calculados pelo servidor, sem renovação: 180 dias e 24 horas. Retenção física é separada da consulta; registros expirados não são visíveis mesmo se a limpeza atrasar.

## 5. Endpoints e exemplos sintéticos

| Endpoint | Acesso e resultado |
| --- | --- |
| `POST /api/feedback` | Público, origem/Host/transporte/header de finalidade validados; 201 após commit, 200 no replay |
| `GET /api/admin/feedback` | ADMIN; lista sem mensagem; paginação e ordenação estáveis |
| `GET /api/admin/feedback/resumo` | ADMIN; contagens exatas em strings, três tipos e série dia/mês |
| `GET /api/admin/feedback/:id` | ADMIN; texto somente sob demanda; 404 genérico para ausente/excluído/expirado |

POST sintético, com `Origin` autorizado, `X-Portal-Feedback: 1`, `Content-Type: application/json` e chave aleatória de 32 bytes em base64url sem padding:

```json
{"tipo":"SUGESTAO","mensagem":"Gostaria de encontrar a busca com mais facilidade.","avisoVersao":"feedback-v1"}
```

Confirmação ilustrativa, sem UUID administrativo, comentário ou link público:

```json
{"success":true,"data":{"recebido":true,"recebidoEm":"2026-11-02T15:00:00.000Z"}}
```

Consulta sintética: `/api/admin/feedback?inicio=2026-11-01&fim=2026-11-02&tipo=SUGESTAO&pagina=1&limite=20`. Datas civis inclusivas em `America/Sao_Paulo`, no máximo 366 dias, sem futuro. Página 1–10.000, limite 1–100, ordem `created_at DESC,id DESC`. Lista usa números inteiros seguros; resumo usa strings decimais sem arredondar BigInt. Tipos e períodos vazios recebem zero somente após consulta bem-sucedida. Metadados indicam base retida, unidade, prazo, recorte, instante e parcialidade; não medem visitantes/satisfação populacional.

Flags de consulta desligadas: 200 com `disponivel:false,motivo:DESATIVADA`, sem tocar nas tabelas após autenticação/validação. Detalhe ativo ausente: 404. Erros conhecidos de conexão/lock/timeout: 503 `FEEDBACK_INDISPONIVEL` e `Retry-After: 5`. Nenhum erro é transformado em vazio ou zero. 409 distingue chave reutilizada, recibo expirado e aviso desatualizado.

## 6. Idempotência e concorrência

Lookup SHA-256 dos bytes da chave; HMAC próprio e versionado da tupla `[1,tipo,mensagemNormalizada,avisoVersao]`. Lock transacional por digest coordena instâncias, com unicidade da PK como autoridade. O instante PostgreSQL é lido depois da espera/leitura do recibo. Criação do Feedback e recibo é atômica, e resposta/log de sucesso só ocorre após COMMIT. Não há retry automático de escrita.

Violação concorrente da PK causa rollback completo antes de uma nova transação READ ONLY ler o vencedor; essa recuperação não repete INSERT. Recibo válido permite replay mesmo com recebimento suspenso/aviso antigo. Conteúdo diferente retorna 409 sem expor o anterior. Recibo expirado ainda presente retorna `ENVIO_EXPIRADO`; após descarte, não existe deduplicação eterna.

Evidências PostgreSQL:

- 20 envios simultâneos por dois pools: 1 resposta 201, 19 respostas 200, um Feedback e um recibo, mesma data original.
- Duas APIs em processos distintos, 8 solicitações concorrentes: um único commit e sete replays.
- Escritor concorrente sem lock cooperativo: unicidade disparada, rollback do perdedor, leitura do vencedor e nenhum órfão.
- Resposta HTTP descartada após commit; API encerrada e reiniciada com recebimento suspenso: replay 200, mesma persistência; nova chave 503.
- Alteração de conteúdo, expiração, descarte de recibo, rotação HMAC e indisponibilidade da chave antiga tratados sem duplicação indevida.
- Prazo revalidado depois de esperar lock; timeout retorna 503. Falha sintética no INSERT de recibo deixa zero Feedback/recibos.

## 7. Segurança, acesso e privilégios

Router público antes de CORS/parser gerais: cache `no-store`, método/caminho/origem/Host/transporte, quota própria, mídia/codificação, parser de 16 KB e DTO. Cabeçalhos sensíveis duplicados são recusados. Preflight validado não grava. Sem cookies emitidos, JWT administrativo requerido ou IP persistido. POST não cria AuditLog com ator fictício.

Quotas por processo: 5/minuto e 20/hora por rede, 60/minuto global; IPv4 mapeado normalizado e IPv6 /64; HMAC efêmero, máximo 10.000 buckets e expiração em uma hora. Saturação retorna 429 com `Retry-After`.

Lista, resumo e detalhe usam autenticação/sessões existentes e `authorize("ADMIN")`. Visitante/sessão inválida ou revogada: 401; EDITOR: 403. Cache administrativo `private, no-store`, incluindo erros. Consultas compostas validadas como Repeatable Read READ ONLY, com escrita concorrente entre contagem e listagem sem quebrar a fotografia.

API: SELECT/INSERT somente nas novas tabelas, sem UPDATE/DELETE, inclusive após bootstrap de default grants amplos. Limpeza: DELETE e SELECT somente das colunas de chave/expiração; negadas mensagem, digests de conteúdo, usuários, métricas e SET ROLE migrator. Operador V2 não lê Feedback. Constraints e negações foram testadas no PostgreSQL, não simuladas.

Logs usam somente metadados permitidos; validação não ecoa mensagem nem nomes arbitrários de propriedades. Testes cobrem conteúdo canário, origem, mídia, bytes, cache, headers, quotas, preflight e bloqueio de driver/Prisma na demo.

## 8. Retenção e limpeza

`descartar_feedback.js conferir` identifica destino/papel/cluster e faz prévia READ ONLY. `executar` exige autorização explícita no processo e arquivo de backup local recente/não vazio; realiza apenas um lote transacional limitado. Recusa o banco real nomeado no pedido, destino divergente e URL com parâmetros. Não instala timer, loop, DELETE HTTP ou recuperação automática de falha.

Teste real: Feedback vencido foi omitido de detalhe/lista/resumo antes da remoção física; limpeza removeu o texto, preservou recibo ainda válido com FK nula e replay 200. Recibos vencidos foram contados em prévia e removidos em lote de 1. O operador não precisou ler conteúdo pessoal.

Backups e restaurações: procedimento em [operação de Feedback](../docs/operacao_feedback.md). Aprovação institucional de prazos, exclusões e reaplicação do descarte antes de reabrir uma restauração continua pendente. A existência do backup sintético não homologa recuperação de produção.

## 9. Validação

Ambiente local: Node **24.22.1**, Prisma **7.10.1**, PostgreSQL **17.11**, dependências já instaladas e sem atualização de pacotes.

| Verificação | Resultado |
| --- | --- |
| Feedback unitário/HTTP/integração | **31/31** na suíte final, incluindo 14 cenários PostgreSQL e seu agrupador, 9 unitários e 7 HTTP/demo; zero ignorados |
| Suíte backend completa | **612/612**, zero falhas/cancelados/ignorados, 187,30 s; inclui as integrações reais |
| Suíte frontend existente | **505/505**, 30 arquivos, zero falhas, 203,36 s |
| Prisma validate/generate | Aprovados |
| Lint backend/frontend | Aprovados |
| Build frontend | Aprovado; avisos existentes de chunk >500 KB e importação estática/dinâmica de `PatrimonioEditor` |
| OpenAPI | Validação SwaggerParser e testes de contrato aprovados |
| SQL/migrations | 12 aplicadas, repetição sem pendências, checksums/nomes íntegros; SQL histórico/V2/Feedback aprovado |
| `git diff --check` | Aprovado; somente aviso Git de futura conversão de LF para CRLF em dois arquivos já existentes |
| npm audit backend completo, `--audit-level=high` | Exit 0; 6 moderadas, 0 altas/críticas |
| npm audit backend produção, `--omit=dev --audit-level=high` | Exit 0; 0 vulnerabilidades |
| npm audit frontend completo, `--audit-level=high` | Exit 0; 6 moderadas, 0 altas/críticas |
| npm audit frontend produção, `--omit=dev --audit-level=high` | Exit 0; 0 vulnerabilidades |

Moderadas de desenvolvimento: cadeia ESLint/minimatch em ambos; `nodemon` no backend e `eslint-plugin-react-refresh` no frontend. Nenhum override ou redução do limiar foi aplicado. A primeira tentativa npm no sandbox falhou por certificado; a consulta autorizada foi refeita com CAs do sistema, sem desabilitar TLS.

Uma rodada completa revelou a lista estática de migrations do teste R1 ainda com 11 entradas (611 aprovados, uma falha estática, zero ignorados). Foi acrescentada somente a 12ª migration, preservando a linhagem `equipe` e os checksums. Não houve falha de migration nem repetição automática de escrita falha. Uma execução anterior sem saída incremental foi interrompida; não é contabilizada como aprovação.

## 10. Compatibilidade e CI

H1/H2: autenticação, refresh/revogação e AuditLog existentes preservados; nenhuma nova ação. Testes atuais de auditoria fazem parte da regressão; harnesses/relatórios históricos permanecem intactos. V1/V2: contratos, contadores, cookies, quotas e flags existentes preservados. Sem compartilhamento de tabela, denominador ou identidade com Feedback. Contato por e-mail, favoritos locais, regiões e mídias não receberam mudanças funcionais.

Workflow atualizado para o Compose exclusivo F2 e harness com quatro papéis restritos, mantendo testes de proxy V2, systemd sem instalação, permissões mínimas de GitHub, cleanup limitado e audit `high`. Não houve execução remota, publicação ou deploy. Instalação limpa de dependências/execução integral do workflow Linux continuam responsabilidade do próximo CI; esta entrega utilizou a instalação local existente.

## 11. Pendências F3/F4

F3: formulário separado, cliente público sem credenciais, fluxo de resultado incerto/replay, contador Unicode, acessibilidade, aviso final, rota/link discretos e flag visual desligada. Nenhuma dessas interfaces foi implementada na F2.

F4: página ADMIN, filtros/lista/detalhe/gráficos independentes, testes browser→API→PostgreSQL, proxy/HTTPS e logs próprios de Feedback, quota compartilhada se houver réplicas, métricas operacionais de descarte, rotina aprovada de retenção/restauração e homologação de produção. Revisar equipe responsável, política de exclusão e destinos institucionais antes de ativar.

## 12. Limites de segurança e produção

Origem/header não autenticam humanos; HTTP que forja headers e abuso distribuído permanecem possíveis. NAT pode bloquear várias pessoas conjuntamente; quotas locais reiniciam e multiplicam por réplica. A chave de idempotência não identifica pessoa nem impede mensagens iguais sob chaves diferentes. A garantia termina após 24 horas/descarte; texto livre pode conter dados pessoais e não constitui anonimato certificado.

Sem ativação de flags públicas, banco real, frontend, timer, mudança de servidor, commit, push ou deploy. Produção, restauração de backups reais, aparelhos físicos/leitores de tela e configuração Nginx de Feedback não foram homologados. Esta entrega não elimina as pendências históricas H2/S1 nem certifica conformidade institucional/jurídica.
