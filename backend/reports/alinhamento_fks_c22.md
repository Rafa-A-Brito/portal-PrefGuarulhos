# C2.2 — Alinhamento declarativo das FKs de autenticação

Data: **04/11/2026**, America/Sao_Paulo. Execução isolada: **23:34:48–23:38:48**. Branch `development/backend`; HEAD `66fc3733e33ff0ba932b4ddfc6f55c5c1139a548`.

**Concluído:** acrescentado `onUpdate: NoAction` exclusivamente às relações `AuthSession.user` e `RefreshToken.session`. O schema atualizado coincide com o banco criado pelas 12 migrations históricas: **migrate diff vazio**, antes e depois da regressão. As constraints permaneceram inalteradas. **Não é necessária migration corretiva.**

Documentos obrigatórios consultados: [C1](auditoria_consolidada_modulos_c1.md), [C2](diagnostico_sessoes_fks_c2.md) e [C2.1](correcao_sessoes_c21.md). Esses documentos e [C1.1](diagnostico_visualizacoes_v2_c11.md) foram preservados integralmente.

## 1. Preservação inicial

Branch, HEAD e alterações locais coincidiram com o encerramento C2.1. Antes da edição, foram registrados Git status, diff preexistente e hashes SHA-256 de **875 arquivos**, incluindo rastreados e não versionados relevantes. Os hashes das entregas C2.1 foram comparados ao manifesto final daquela etapa, sem divergência.

```text
 M backend/src/services/adminService.js
 M backend/test/adminManagement.test.js
 M backend/test/auditoria.test.js
?? backend/reports/auditoria_consolidada_modulos_c1.md
?? backend/reports/correcao_sessoes_c21.md
?? backend/reports/diagnostico_sessoes_fks_c2.md
?? backend/reports/diagnostico_visualizacoes_v2_c11.md
?? backend/test/adminStatusSessions.integration.test.js
```

As modificações preexistentes em `adminService.js`, `adminManagement.test.js` e `auditoria.test.js`, o teste novo `adminStatusSessions.integration.test.js` e os quatro relatórios foram mantidos. Não houve reset, checkout, formatação ou sobrescrita dessas entregas. Evidências: [hashes iniciais](../../.cache/c22/hashes_antes.json), [Git inicial](../../.cache/c22/git_inicial.txt) e [diff anterior](../../.cache/c22/diff_inicial.patch).

## 2. Relações e diff exato

Arquivo alterado: [schema.prisma](../prisma/schema.prisma). As duas relações não tinham nome explícito nem atributo `map` na declaração Prisma; os nomes efetivos das constraints foram conferidos no PostgreSQL.

| Relação Prisma | Relação física / constraint | Política preservada |
| --- | --- | --- |
| `AuthSession.user`, `userId → User.id` | `auth_sessions.user_id → users.id`; `auth_sessions_user_id_fkey` | `ON DELETE CASCADE`, `ON UPDATE NO ACTION` |
| `RefreshToken.session`, `sessionId → AuthSession.id` | `refresh_tokens.session_id → auth_sessions.id`; `refresh_tokens_session_id_fkey` | `ON DELETE CASCADE`, `ON UPDATE NO ACTION` |

```diff
diff --git a/backend/prisma/schema.prisma b/backend/prisma/schema.prisma
index 2223470..db40b98 100644
--- a/backend/prisma/schema.prisma
+++ b/backend/prisma/schema.prisma
@@ -98,7 +98,7 @@ model AuthSession {
   createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
   expiresAt    DateTime @map("expires_at") @db.Timestamptz(3)
   revokedAt    DateTime? @map("revoked_at") @db.Timestamptz(3)
-  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)
+  user         User @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)
   refreshTokens RefreshToken[]
   @@index([userId])
   @@map("auth_sessions")
@@ -110,7 +110,7 @@ model RefreshToken {
   tokenHash String @unique @map("token_hash") @db.VarChar(64)
   createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
   usedAt    DateTime? @map("used_at") @db.Timestamptz(3)
-  session   AuthSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
+  session   AuthSession @relation(fields: [sessionId], references: [id], onDelete: Cascade, onUpdate: NoAction)
   @@index([sessionId])
   @@map("refresh_tokens")
 }
```

Uma comparação byte a byte confirmou que o conteúdo final é exatamente o inicial com essas duas inserções. Campos, tipos, identificadores, índices, mapeamentos, outras relações e finais de linha foram preservados. Não foi executado `prisma format`.

## 3. Validação Prisma 7

| Verificação | Resultado |
| --- | --- |
| `prisma validate` | Exit code **0**, schema válido. |
| Versões instaladas | Prisma CLI **7.10.1**, `@prisma/client` **7.10.1**, Node **24.22.1**. |
| Banco migrado → cópia do schema anterior | Exit code **2**, diferença esperada nas duas FKs, propondo `ON UPDATE CASCADE`. |
| Banco migrado → schema atualizado | Exit code **0**, `-- This is an empty migration.` |
| Mesmo diff após a suíte completa | Exit code **0**, novamente vazio. |

Comando de comparação: `prisma migrate diff --from-config-datasource --to-schema <schema> --script --exit-code`. A URL fornecida era exclusivamente a do descartável, com `default_transaction_read_only=on` e `PGOPTIONS` equivalente. O SQL do diff anterior foi guardado como evidência e **não foi executado**. O código 2 desse controle é o resultado esperado da divergência histórica, não falha de validação.

Não foi necessário regenerar o Prisma Client: não mudaram campos, tipos, mapeamentos ou API de acesso; a ação referencial é imposta pelas constraints PostgreSQL preservadas. A CLI 7 validou e comparou o schema atualizado, e a regressão usou o Client instalado. Não houve instalação/atualização de dependências, `db push`, `db pull`, criação de migration ou DDL corretivo.

## 4. PostgreSQL novo e descartável

| Identidade conferida antes das escritas de preparação/aplicação | Valor |
| --- | --- |
| Banco / papel de teste / schema | `portal_test` / `portal_test` / `public` |
| Host / porta publicada | `127.0.0.1:57681` |
| Endereço / porta internos | `172.17.0.2/32` / `5432` |
| PostgreSQL | **17.11**, `server_version_num=170011` |
| System identifier | `7704510345200336931` |
| Contêiner | `portal_c22_f7a7083495` |
| ID | `7693758cf027c2988f07fb67ce6e809491515c7fbd954b8a35c30de0f05a6c1c` |
| Imagem local | `postgres:17-alpine`, ID `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24` |
| Dados | `tmpfs`, sem bind mount ou volume histórico; schema `public` vazio |
| Recuperação | `pg_is_in_recovery()=false` |

O cluster foi criado exclusivamente para C2.2, sem Compose. A identidade foi confrontada por TCP e por conexão interna ao contêiner. Foram conferidos nome, label, ID, publicação restrita a loopback, mounts, versão 17 e ausência de tabelas antes de criar papéis auxiliares, migrar ou inserir fixtures. O bootstrap próprio da imagem precede essa conferência. O nome `portal_test` atende às guardas da suíte; o system identifier comprova que não houve reutilização do cluster C2/C2.1.

Foram salvos checkpoints somente de schema vazio e migrado, sem dados de usuários. A preparação criou papéis de teste e aplicou grants existentes para as regressões de privilégios/operação. Credenciais aleatórias ficaram em memória; dotenv apontou para caminho inexistente, e variáveis herdadas pertinentes foram descartadas. A configuração normal de banco permaneceu em porta local indisponível; somente os destinos de teste foram fornecidos às suítes.

Consultas de conferência usaram transações `READ ONLY`. As únicas gravações foram a preparação autorizada, as migrations históricas e operações sintéticas no descartável. Flags temporárias exigidas pelas suítes ficaram restritas aos processos de teste; nenhuma flag real V2/Feedback foi alterada. **`patrimonio_guarulhos` não foi acessado.**

Ao final, as conexões foram fechadas e o contêiner removido após reconferir ID, nome e label. O resultado registra `cleanup=true`; os dados em `tmpfs` foram descartados.

## 5. Migrations e checksums

As **12 migrations existentes** foram aplicadas uma única vez, com sucesso. Todos os registros apresentaram `finished_at` preenchido e `rolled_back_at=null`. Os checksums persistidos coincidiram com SHA-256 dos arquivos locais, também preservados em relação ao início da C2.2.

| Migration | SHA-256 conferido |
| --- | --- |
| `20260929230000_initial_schema` | `68f762b840d1dfadb4515b03ef50e42acc8ade9d058b8c72378812bc0e5c6cd5` |
| `20260930120000_add_demolido_situacao` | `211308e27393b24375d8e916bc1e295044f97e5f4a8170999599d4c8d1d1d669` |
| `20261005004508_categorias_adicionais` | `4f68b4e2b42d30a583362a7d4ed684da6ef8fe44bccd719abf9c430858d8d468` |
| `20261006014922_adicionar_detalhes_e_heroes` | `e024c18d4a281fe9dfe7e03d89680613090326fecf458229c5dcb3a7de6d4f79` |
| `20261006180000_exposicoes_novidades` | `7c325485b007d5b6c70f8b9faeed78fb4ef992e5b1dbaa37cce465dc5c79deea` |
| `20261014010000_add_fatos_ligacoes` | `60a34dbd7f1ad73f4ae7e176013ff3096ac868b703694afda37c471793a6f7b3` |
| `20261016120000_add_regioes_numero_ordem` | `452d76e28f980d0f5e3e0f4e4eaf03edeb887148c1b8ca1718a82b5b883baaf9` |
| `20261020190000_add_user_token_version` | `60cb4ae1a0df7d7d24464135e9b68e730cee0f7216100f93e663428e824a663a` |
| `20261021130000_add_auth_sessions` | `faf3935569fa16fa79a37efcbc59b0d6149cbf0969d486bea3bff6620c4e534f` |
| `20261026120000_add_visualizacoes_metricas` | `62926f974c225237f63010894a75e368903d608311bebccb9a3f269173995d20` |
| `20261027120000_add_operacao_metricas` | `8de7dde05752b95df199f45c2263a457dc9546fd67a8069f175dd096e03edea9` |
| `20261102120000_add_feedback` | `bf2fd195e212483cd53f803532b28315e3a0af22aa082b6e79a3f3d890b5c836` |

Não se editou a migration `20261021130000_add_auth_sessions`: ela declara `ON DELETE CASCADE` e omite `ON UPDATE`, cujo comportamento efetivo é `NO ACTION`. O ajuste Prisma apenas documenta essa política existente.

## 6. Comportamento efetivo e integridade

As duas FKs retornaram `confupdtype='a'`, `confdeltype='c'`, `convalidated=true`, `condeferrable=false` e `condeferred=false`. `pg_get_constraintdef` confirmou os campos referenciados. Os OIDs das constraints permaneceram iguais antes/depois das regressões: não houve recriação delas.

Seis probes usaram fixtures sintéticas próprias e transações encerradas com **ROLLBACK**, inclusive nos resultados negativos esperados:

| Probe | Resultado |
| --- | --- |
| Alterar `users.id` com sessão dependente | SQLSTATE **23503**, `auth_sessions_user_id_fkey`. |
| Alterar `auth_sessions.id` com refresh dependente | SQLSTATE **23503**, `refresh_tokens_session_id_fkey`. |
| Excluir sessão | Sessão e refresh filho excluídos; usuário preservado dentro da transação. |
| Excluir usuário | Usuário, sessão e refresh filho excluídos dentro da transação. |
| Inserir sessão com usuário inexistente | SQLSTATE **23503**, `auth_sessions_user_id_fkey`. |
| Inserir refresh com sessão inexistente | SQLSTATE **23503**, `refresh_tokens_session_id_fkey`. |

Após cada rollback, as três tabelas voltaram ao estado vazio anterior aos probes; nenhuma fixture ficou persistida. Após a suíte completa, as consultas de integridade encontraram **zero sessões órfãs e zero refreshes órfãos**. Os seis probes são verificações separadas, não foram somados à contagem de testes Node.

## 7. Regressões e preservação da C2.1

| Verificação executada nesta etapa | Resultado |
| --- | --- |
| Suíte backend completa, `scripts/run-suite.js` | **636 testes; 636 aprovados; 0 falhas, 0 cancelados, 0 ignorados**, aproximadamente 212 s. |
| Cobertura C2.1 incluída na suíte | 23 subtestes + agrupador; **190 respostas HTTP** conferidas. |
| Lint backend | Exit code **0**. |
| `git diff --check` | Aprovado. |

A suíte completa incluiu gestão de usuários, login/refresh, revogação, senha, Histórico de Alterações e C2.1. Permaneceram aprovadas as verificações de ADMIN/EDITOR com múltiplas sessões, bloqueio de credenciais anteriores após reativação, conta historicamente inativa, novo login, idempotência, isolamento entre usuários, concorrência e rollback. Os testes existentes foram executados sem alterações.

Não houve rodada direcionada duplicada: os arquivos prioritários já integram a execução completa. Não houve falha de suíte ou repetição para contornar defeito. Avisos de depreciação e logs de caminhos negativos permanecem nas evidências; não foram tratados como justificativa para modificar outros módulos. Frontend, build e CI remoto não foram reexecutados nesta etapa declarativa.

Comparação final dos **875 arquivos iniciais**: somente `backend/prisma/schema.prisma` mudou. Toda a C2.1, os relatórios anteriores, frontend, dependências, configurações e migrations mantiveram seus hashes.

| Relatório preservado | SHA-256 antes/depois |
| --- | --- |
| `auditoria_consolidada_modulos_c1.md` | `f587562d50237ecadb55c089266f4b6c210edc13f05f526c4da54939fccb91a0` |
| `correcao_sessoes_c21.md` | `c92a29d2d8fd5201b40601936663fb98b932ddbe7f0d2803261dccf3317dd737` |
| `diagnostico_sessoes_fks_c2.md` | `002c39d22ba8eb70f8b7bc2f0842628697fb2dd1893a5a841c857a80ff1d8e77` |
| `diagnostico_visualizacoes_v2_c11.md` | `437d124057cce6c21c871ba24442982097469669ab115937d4cbc7ac7a404ad0` |

## 8. Evidências e limites

Evidências locais privadas, ignoradas pelo Git:

- [Resultado completo e identidade](../../.cache/c22/completos_f7a7083495/resultado.json), [saída dos testes](../../.cache/c22/completos_f7a7083495/testes_backend.log) e [lint](../../.cache/c22/completos_f7a7083495/lint_backend.log).
- [Prisma validate](../../.cache/c22/completos_f7a7083495/prisma_validate.log) e [versões instaladas](../../.cache/c22/completos_f7a7083495/prisma_versao.log).
- [Diff anterior](../../.cache/c22/completos_f7a7083495/diff_antes.sql), [diff atualizado](../../.cache/c22/completos_f7a7083495/diff_depois.sql) e [diff final](../../.cache/c22/completos_f7a7083495/diff_final.sql).
- [Aplicação das migrations](../../.cache/c22/completos_f7a7083495/migrations.log), [executor descartável](../../.cache/c22/validar_c22.mjs) e [probes SQL](../../.cache/c22/provas_fks.mjs).
- [Diff exato do schema](../../.cache/c22/diff_schema.patch), [hashes iniciais](../../.cache/c22/hashes_antes.json) e [preservação final](../../.cache/c22/verificacao_final.json).

Não foram publicados artefatos privados, logs, URLs com credenciais ou dumps. O diff vazio comprova a equivalência reconhecida pelo Prisma entre as fontes comparadas; não certifica configuração operacional, permissões de produção ou ambiente publicado. O papel de teste permitiu conferir constraints e a suíte usou papéis auxiliares quando exigidos. O teste não constitui inspeção do banco real. A conclusão sobre ausência de migration corretiva aplica-se à trilha histórica conferida.

## 9. Git final e encerramento

Branch e HEAD permanecem os da referência. O estado final soma apenas o schema ajustado e este relatório às alterações preexistentes:

```text
 M backend/prisma/schema.prisma
 M backend/src/services/adminService.js
 M backend/test/adminManagement.test.js
 M backend/test/auditoria.test.js
?? backend/reports/alinhamento_fks_c22.md
?? backend/reports/auditoria_consolidada_modulos_c1.md
?? backend/reports/correcao_sessoes_c21.md
?? backend/reports/diagnostico_sessoes_fks_c2.md
?? backend/reports/diagnostico_visualizacoes_v2_c11.md
?? backend/test/adminStatusSessions.integration.test.js
```

**Não é necessária nova migration:** o banco criado pelas migrations já tem a política desejada. Não houve alteração das constraints, autenticação, sessões ou AuditLog nesta etapa, além de executar suas regressões. Sem commit, push, deploy ou nova funcionalidade. A C2.2 termina aqui; revisão conjunta C2.1 + C2.2 e autorização de versionamento permanecem posteriores.
