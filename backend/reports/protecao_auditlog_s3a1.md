# S3-A1 — Proteção de privilégios do AuditLog

Data: **05/11/2026**, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `01190d6bd7aab8d2f397823aa596c0c329e2458c`. CI de referência informado: `41961975924`; não foi disparado CI remoto nesta etapa.

## 1. Resultado e escopo

Implementada uma política SQL explícita e idempotente para `public.audit_log`: **`portal_api` conserva SELECT e INSERT, sem UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ou grant option**. A política remove grants da tabela e das colunas para API/PUBLIC e recusa ownership, memberships e poder de criação no schema incompatíveis com a segregação. Registrador, serviços, autenticação, Histórico H1/H2 e correção C2.1 permanecem sem alteração.

A aplicação foi realizada **somente em um PostgreSQL 17 novo, descartável e identificado**. Nenhum banco preexistente, inclusive `patrimonio_guarulhos`, foi acessado. O procedimento não foi conectado ao Compose, bootstrap, wrapper de migrations ou startup. Aplicação em qualquer ambiente persistente exige revisão e autorização próprias.

**Esta proteção não torna o AuditLog imutável.** Persistem INSERT potencialmente forjado, poderes de proprietários/superusuários, efeitos da FK do ator e necessidade de custódia independente. A política também não impede um DBA de restaurar grants amplos no futuro. Esses limites e o controle de reaplicação estão descritos abaixo.

Referências obrigatórias lidas e preservadas: [S2](reauditoria_seguranca_s2.md), [C1](auditoria_consolidada_modulos_c1.md), [C2.1](correcao_sessoes_c21.md) e [C2.2](alinhamento_fks_c22.md).

## 2. Revisão inicial e arquivos entregues

Estado inicial:

```text
## development/backend...origin/development/backend
?? backend/reports/reauditoria_seguranca_s2.md
```

Não havia alterações rastreadas ou no índice. O relatório S2 era preexistente e não versionado. Foi registrado um manifesto SHA-256 de **877 arquivos** (876 rastreados e S2) antes da implementação, sem ler `.env` privados ou modificar referências Git.

| Arquivo novo | Finalidade |
| --- | --- |
| [permissoes_auditoria.sql](../scripts/sql/permissoes_auditoria.sql) | Transação de grants específica do AuditLog, pré-condições e pós-condições de privilégios efetivos. |
| [auditoria_privilegios.integration.test.js](../test/auditoria_privilegios.integration.test.js) | 23 subtestes e agrupador, usando `portal_api` real para SQL, serviços e HTTP; fixtures/limpeza segregadas. |
| Este relatório | Evidências, limites, implantação futura e rollback para revisão. |

Foram confrontados [10-roles.sh](../../infra/postgres/10-roles.sh), [grants métricas](../scripts/sql/permissoes_metricas.sql), [grants Feedback](../scripts/sql/permissoes_feedback.sql), [migrate-deploy.js](../scripts/migrate-deploy.js), [schema.prisma](../prisma/schema.prisma), registrador/consulta de auditoria, serviços administrativos e testes existentes. Esses arquivos não foram alterados.

O bootstrap concede CRUD por default às tabelas criadas pelo migrator; a API não é dona da tabela. O wrapper fecha `_prisma_migrations`, sem proteção específica para AuditLog. ADMIN/EDITOR são perfis da aplicação, não roles PostgreSQL distintas. Consultar o Histórico exige SELECT e a criação transacional usa INSERT/RETURNING; não foi encontrada necessidade de UPDATE/DELETE do AuditLog nos serviços de execução diária.

Os testes anteriores usam DELETE do AuditLog na limpeza de fixtures. Isso pertence ao papel privilegiado de teste, não ao contrato de produção. Eles foram preservados; o teste novo separa explicitamente a conexão de fixtures da conexão da API. Importação/recuperação que altere registros históricos deverá usar credencial operacional própria, sob revisão, sem devolver mutação à API.

## 3. Política e privilégios futuros

O SQL usa transação, `search_path=pg_catalog`, nomes de tabela qualificados, `lock_timeout=5s` e `statement_timeout=30s`. Adquire lock exclusivo da tabela durante a mudança; sua aplicação futura exige janela planejada. Erro aborta toda a transação; não existe concessão parcial confirmada. Usar `ON_ERROR_STOP` no psql; chamadas por client devem executar ROLLBACK ao receber erro.

Pré-condições: papel de login `portal_api` sem superuser/CREATEDB/CREATEROLE/replicação/BYPASSRLS; tabela comum; API sem propriedade da tabela, schema ou banco; sem CREATE em `public`, inclusive via PUBLIC; com USAGE; sem qualquer membership direto. A recusa de membership inclui `INHERIT FALSE, SET FALSE`: é deliberadamente conservadora e não revoga associações globais. Sem aresta inicial não há caminho transitivo de roles a explorar. Uma instalação com associação legítima exige revisão da matriz, não remoção automática da guarda. [Semântica PostgreSQL 17 de membership](https://www.postgresql.org/docs/17/role-membership.html).

São removidos todos os privilégios de API/PUBLIC **somente no AuditLog**, incluindo grants independentes por coluna. O script não usa CASCADE para apagar concessões dependentes: essas situações devem falhar e ser revisadas. O grant final é SELECT/INSERT, sem grant option. Pós-condições conferem permissões efetivas, mutação por coluna e ausência de ACL da tabela para PUBLIC. Revogar na tabela não substitui tratar grants independentes nem privilégios herdados. [Referência REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html).

**Privilégios futuros:** defaults atuam por criador/schema/tipo de objeto, sem exceção negativa por nome de tabela. Para não modificar os privilégios das demais tabelas, os defaults atuais foram preservados. Um ensaio recriou `audit_log` dentro de uma transação revertida: a tabela nova recebeu UPDATE dos defaults; a reaplicação da política retirou a permissão. A tabela original, dados, índices, FKs e OID foram preservados pelo rollback. [Referência de default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).

Consequentemente, **provisionamento, restore, recriação, mudança de ownership/membership ou grants exigem reaplicação e conferência antes de liberar tráfego**. Novas colunas também devem ser incluídas nessa revisão; o script enumera as colunas atuais ao remover grants. Nenhum mecanismo automático foi instalado para garantir esse gate. Integrá-lo ao processo de entrega será decisão posterior; executar só o Compose normal continua insuficiente para obter a proteção S3-A1.

## 4. PostgreSQL novo e identidade

| Evidência antes de SQL de preparação/migrations | Valor |
| --- | --- |
| PostgreSQL / Node de validação | 17.11 (`170011`) / 24.22.1 |
| Banco / papel de fixtures / schema | `portal_test` / `portal_test` / `public` |
| Host e porta publicados | `127.0.0.1:56824` |
| Endereço e porta internos | `172.17.0.2/32:5432` |
| System identifier | `7704762704447680547` |
| Contêiner | `portal_s3a1_6ce48d9d86` |
| ID | `da6f5062395d140c866bd0e0c41ceeab6bd166aa106b66bdcb80e3d34de3215e` |
| Imagem local, sem pull | `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24` |
| Persistência | Dados em tmpfs; sem bind/volume histórico; porta somente loopback. |

O Docker estava parado e foi iniciado para a validação. Não houve Compose. Foram conferidos nome/ID/label, mounts, porta, versão 17, `pg_is_in_recovery=false`, schema vazio e identidade do cluster por conexão TCP e por consulta interna no contêiner. As consultas iniciais usaram READ ONLY. Somente após essa conferência foram provisionados os papéis, aplicadas as **12 migrations** e preparados os grants dos operadores de teste.

Migrations aplicadas uma vez, com todos os `finished_at` presentes, nenhum `rolled_back_at` e os 12 checksums comparados ao SHA-256 dos arquivos do checkout. Não houve criação/edição de migration, trigger ou evento adicional de produção.

O executor local descartável removeu variáveis herdadas de conexão, apontou dotenv para arquivo inexistente, manteve uma URL normal sentinela inacessível e gerou senhas/JWT apenas para o ensaio. As saídas persistidas foram sanitizadas. Checkpoints somente de schema ficaram em `.cache/`, fora da entrega. Testes V2/Feedback exercitam seus próprios flags apenas nos processos de teste; configurações e flags reais não foram alteradas.

## 5. Matriz antes/depois no descartável

| Privilégio/condição de `portal_api` sobre AuditLog | Antes, bootstrap/migrations | Depois da política |
| --- | --- | --- |
| SELECT | Sim | Sim |
| INSERT, inclusive RETURNING | Sim | Sim |
| UPDATE | Sim | **Não** |
| DELETE | Sim | **Não** |
| TRUNCATE | Não | Não |
| REFERENCES / TRIGGER / MAINTAIN | Não | Não |
| Grant option SELECT/INSERT | Não | Não |
| Ownership da tabela | `portal_migrator` | `portal_migrator` |
| API superuser/CREATEDB/CREATEROLE/replicação/BYPASSRLS | Não | Não |
| Membership da API / SET ROLE migrator | Ausente / negado | Ausente / negado |
| CREATE em public para API/PUBLIC | Não | Não |
| Grants PUBLIC na tabela | Ausentes | Ausentes; removidos também quando introduzidos como fixture adversarial |
| UPDATE/REFERENCES por coluna | Ausentes | Ausentes; remoção conferida após introdução adversarial |
| Demais tabelas/sequências e default ACLs | Conforme bootstrap e SQL específico V2/Feedback | **Idênticos** antes/depois da política, comparados no teste |

TRUNCATE já era negado no bootstrap; a S3-A1 não o apresenta como falha histórica comprovada. O teste introduziu grants amplos e grant options de forma deliberada no descartável, aplicou a política duas vezes e confirmou estabilidade e remoção efetiva. Usuários, sessões, métricas, Feedback e respectivas ACLs não receberam mudanças pela política.

## 6. Testes negativos e compatibilidade

| Prova com conexão `portal_api` | Resultado |
| --- | --- |
| UPDATE e DELETE de AuditLog; TRUNCATE | SQLSTATE **42501** em cada comando. |
| ADD COLUMN, OWNER TO, DISABLE TRIGGER, DROP TABLE | **42501**; objeto não alterado. |
| CREATE TABLE no public | **42501**. |
| SET ROLE e SET SESSION AUTHORIZATION migrator | **42501**. |
| ALTER ROLE para superuser e concessão de membership | **42501**. |
| GRANT UPDATE da API para ela própria | Sem aquisição de permissão; PostgreSQL pode usar WARNING em vez de erro, por isso o teste confere a permissão efetiva. |
| Política diante de membership, ownership da API ou CREATE via PUBLIC | Recusada; rollback e revisão necessários; ACL não parcialmente aplicada. |
| INSERT do registrador + SELECT lista/detalhe | Sucesso usando serviços e HTTP com Prisma conectado como **portal_api**. |
| Histórico H1/H2 | ADMIN consulta lista/detalhe, contrato e `private, no-store` preservados; EDITOR recebe **403**. |
| Retirada deliberada de INSERT | INSERT SQL retorna **42501**; serviços falham e revertem usuário, versão, sessões, refreshes e auditoria. ACL restaurada pelo owner. |
| C2.1 com API restrita | Desativar/reativar incrementa versão, preserva revogação, no-op não duplica eventos; JWT/refresh antigos recusados, novo login funciona. |

As 12 negações SQL de mutação/DDL/elevação usam BEGIN/ROLLBACK individual. Uma transação abortada não contamina o próximo teste. A indisponibilidade de INSERT é uma falha real de permissão, sem mock do registrador, trigger ou mudança de serviço; o Prisma registrou `P2039` nos caminhos negativos. As mensagens `AUDIT_WRITE_FAILED` nesses ensaios são esperadas.

O teste antigo `securityPrivileges.integration` continua provando CRUD permitido em **outra tabela de fixture** e DDL negado. A suíte C2.1 existente mantém suas 23 verificações mais agrupador, concorrência, último ADMIN, rollback e **190 respostas HTTP**, sem alterações. H1/H2 foi verificado pelo contrato backend; frontend, build e navegador não foram executados nesta etapa.

## 7. Regressões executadas

| Rodada | Resultado |
| --- | --- |
| Direcionados: privilégios, auditoria, administração, autenticação/senha/refresh e C2.1 | **110/110 aprovados**, 0 falhas, 0 cancelados, 0 ignorados; 52 s. |
| Suíte backend completa | **660/660 aprovados**, 0 falhas, 0 cancelados, 0 ignorados; 207 s. |
| Lint backend | **Exit code 0**, 5 s. |

Comandos Node executados com dependências já instaladas: `node --test --test-concurrency=1 --test-reporter=tap` nos dez arquivos direcionados; `node scripts/run-suite.js`; `node node_modules/eslint/bin/eslint.js .`. O teste S3-A1 integra ambas as rodadas. Os totais direcionados são subconjunto da suíte completa, não testes adicionais distintos.

São **636 testes preexistentes + 24 novos** (23 subtestes e agrupador). Não houve rodada reprovada nem alteração de testes anteriores. As falhas de permissão induzidas e avisos de dependências nos logs não são falhas da suíte. Ao final, a matriz de privilégios permaneceu igual à pós-aplicação, com zero sessões/refreshes órfãos. Conexões encerradas e contêiner removido após reconferir ID/nome/label; resultado `cleanup=true`.

A suíte anterior conserva a conexão privilegiada de fixtures onde precisa limpar dados; **não se afirma que todos os testes antigos rodam como portal_api**. O teste novo conecta serviços/HTTP e probes negativos como API real e usa owner/fixture somente para preparar/remover dados e variar as ACLs do ensaio. Exige flags exclusivas, URLs loopback com mesmo banco `_test`, roles esperadas e `AUDITORIA_TEST_CLUSTER` conferido por READ ONLY antes das gravações.

Para reproduzir em **outro descartável novo autorizado**, preparar papéis e migrations equivalentes, fornecer `TEST_DATABASE_URL` (fixtures), `SECURITY_MIGRATION_DATABASE_URL` (portal_migrator), `SECURITY_API_DATABASE_URL` (portal_api), `TEST_DATABASE_EXCLUSIVE=1`, `SECURITY_TEST_DATABASE_EXCLUSIVE=1` e o system identifier em `AUDITORIA_TEST_CLUSTER`; isolar dotenv, uploads e demais variáveis como no executor. Executar `node --test --test-concurrency=1 test/auditoria_privilegios.integration.test.js`. Sem opt-in de cluster, o teste novo é ignorado; não foi alterado workflow para apontá-lo a banco existente. Credenciais não devem ser versionadas ou impressas.

Evidências locais ignoradas: [resultado/identidade/checksums](../../.cache/s3a1/completos_6ce48d9d86/resultado.json), [direcionados](../../.cache/s3a1/completos_6ce48d9d86/testes_direcionados.log), [suíte completa](../../.cache/s3a1/completos_6ce48d9d86/testes_backend.log), [lint](../../.cache/s3a1/completos_6ce48d9d86/lint_backend.log) e [executor descartável](../../.cache/s3a1/validar_s3a1.mjs). Não versionar esses arquivos nem os checkpoints.

## 8. Riscos residuais e proposta separada S3-C

1. **INSERT não garante veracidade:** uma API comprometida ainda pode inserir eventos com ator, ação, valores/data permitidos pelo schema. Restringir UPDATE/DELETE não autentica a autoria de todo registro SQL.
2. **FK histórica do ator:** `audit_log.user_id` usa ON DELETE SET NULL / ON UPDATE CASCADE. O teste confirmou, com rollback, que excluir um usuário sintético usando API pode nulificar a referência em AuditLog mesmo sem UPDATE direto nessa tabela. Alterar a PK também é um caminho referencial condicionado às demais FKs. Não há endpoint de excluir usuário nesse fluxo, mas o grant SQL de usuários permanece. Fechar esse caminho exige decisão específica sobre privilégios de `users`, FK/snapshot de identidade e recuperação; não foi alterado incidentalmente.
3. **Domínios privilegiados:** owner/superuser e administradores capazes de trocar ownership ou ACLs continuam podendo modificar/apagar dados. Não há armazenamento imutável ou cópia independente nesta entrega. Permissões de funções SECURITY DEFINER, views graváveis, extensões e outros schemas de um destino existente exigem inventário; a política não audita código arbitrário instalado no banco.
4. **Mudanças futuras e restore:** defaults CRUD continuam válidos para outras tabelas e podem voltar a atingir AuditLog se recriado. O gate manual descrito na seção 3 é obrigatório; grants atuais não são garantia permanente contra reconfiguração.
5. **Disponibilidade:** lock exclusivo pode aguardar/falhar; coletar diagnóstico sanitizado e revisar a janela, sem repetir automaticamente uma aplicação que falhou. Revogar PUBLIC pode afetar leitores que dependiam dele; definir grants explícitos para esses leitores após revisão.

**Proposta para S3-C, sem implementação:** coletar eventos e logs de segurança fora da credencial e do domínio administrativo da API, com credencial de envio sem exclusão, leitura por custódia segregada, retenção aprovada e cópias verificáveis. Avaliar armazenamento com retenção protegida, alertas de lacuna/falha de entrega, correlação por identificador e restauração ensaiada. A escolha deve considerar o intervalo entre commit e coleta e não prometer atomicidade distribuída inexistente. Definir responsáveis, prazos, acesso e tratamento de dados pessoais antes de instalar qualquer coletor/tarefa.

## 9. Requisitos para implantação futura em banco existente

**Nada nesta seção autoriza acesso ou aplicação.** Sob autorização própria:

1. Confirmar host/porta, banco, cluster, versão, trilha/12 checksums, papel executor e identidade do ambiente em READ ONLY. O SQL foi homologado no PG17; outro major exige validação própria.
2. Obter backup adequado e restauração ensaiada; capturar owners, ACLs de tabela/colunas/defaults, memberships e grant options de forma protegida. Confirmar ausência de caminhos privilegiados via PUBLIC, funções/views/extensões e credenciais compartilhadas.
3. Revisar leitores/importadores/recuperação e qualquer associação da API; o script recusa essas associações, não as corrige globalmente. Manter API sem DDL e sem ownership. Planejar janela sem concorrência com migrations/administradores de grants.
4. Com conexão previamente configurada e conferida, como owner autorizado, executar a partir de `backend`: `psql -X --set ON_ERROR_STOP=1 --file scripts/sql/permissoes_auditoria.sql`. Não pôr senha na linha de comando. Esse comando foi apresentado como procedimento futuro, não executado contra ambiente persistente.
5. Conferir ACLs e `has_table_privilege`/`has_any_column_privilege`, owners, membership/SET ROLE; demonstrar negações em ambiente de homologação. Conferir INSERT transacional, leitura ADMIN, status C2.1 e rollback antes de liberar tráfego. Não testar TRUNCATE/DROP destrutivos em banco real para “ver se falha”.
6. Registrar resultado e condicionar futuras restaurações/recriações/grants à reaplicação e nova conferência. Revisar integração ao pipeline separadamente; não ligar automaticamente ao startup existente.

## 10. Rollback operacional para revisão futura

Se houver erro durante a aplicação, encerrar com ROLLBACK (ou desconectar psql com ON_ERROR_STOP); os grants da transação não devem ficar parcialmente confirmados. Identificar causa e destino antes de autorizar nova tentativa. Os timeouts são locais à transação.

Se a transação já tiver sido confirmada e surgir incompatibilidade, conter o fluxo afetado, preservar logs/evidências e conferir o snapshot de ACL anterior. Priorizar um papel operacional específico para a tarefa que necessite mutação histórica. **Não executar GRANT ALL, não promover a API e não restaurar CRUD indiscriminadamente.** Caso a reversão exata da ACL anterior seja aprovada, prepará-la sob owner em transação, apenas nos objetos/grantees afetados, e registrar que UPDATE/DELETE do AuditLog voltam a representar S2-01. Essa reversão não restaura eventos apagados nem modifica dados; recuperação de dados é procedimento separado.

O SQL não altera schema, FKs, dados ou lógica dos serviços; não há migration reversa. Remover apenas o arquivo do checkout não desfaz ACLs já aplicadas. Não foi criado um comando de rollback automático que reabra a vulnerabilidade.

## 11. Git final e encerramento

Branch/HEAD e referência local remota permanecem iguais ao estado inicial. Estado final:

```text
## development/backend...origin/development/backend
?? backend/reports/protecao_auditlog_s3a1.md
?? backend/reports/reauditoria_seguranca_s2.md
?? backend/scripts/sql/permissoes_auditoria.sql
?? backend/test/auditoria_privilegios.integration.test.js
```

Conferências finais: status e referências Git, diff rastreado/índice, whitespace dos três arquivos novos, links do relatório e comparação dos 877 hashes preexistentes. Nenhum arquivo rastreado, S2, migration histórica, dependência, flag ou fonte funcional foi alterado. Temporários/checkpoints/evidências em `.cache/s3a1/` estão ignorados e não integram a entrega.

**S3-A1 implementada, testada e documentada localmente.** Sem commit, push, deploy, coletor ou tarefa instalada. A aplicação em ambiente persistente permanece pendente de autorização específica; S3-C não foi iniciada.
