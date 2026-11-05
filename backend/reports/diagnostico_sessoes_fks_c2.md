# C2 — Diagnóstico dirigido de sessões e FKs de autenticação

Data: **04/11/2026**, America/Sao_Paulo. Ensaio concluído aproximadamente às **19:47**.

**Resultado confirmado:** depois da desativação e reativação por outro ADMIN, o JWT anterior e o refresh token anterior voltaram a ser aceitos pela API real. Durante a inatividade, ambos foram recusados. A política proposta de invalidação permanente das credenciais anteriores **não é atendida atualmente**. O novo login após reativação funcionou.

As duas divergências históricas de FK também foram reproduzidas: o banco criado pelas migrations possui `ON UPDATE NO ACTION`, enquanto o schema Prisma espera `CASCADE`. A divergência altera o comportamento de troca de chaves primárias, mas não causou incompatibilidade nos fluxos de autenticação exercitados e não explica a reutilização de credenciais.

**Nenhuma correção foi aplicada.** Código, schema versionado, migrations históricas e flags reais permaneceram inalterados. Este documento contém diagnóstico e proposta para revisão posterior.

## 1. Referência e preservação

Documento obrigatório lido: [auditoria_consolidada_modulos_c1.md](auditoria_consolidada_modulos_c1.md), especialmente gestão de usuários/sessões e persistência.

| Conferência | Resultado |
| --- | --- |
| Branch | `development/backend` |
| HEAD | `66fc3733e33ff0ba932b4ddfc6f55c5c1139a548`, igual ao esperado |
| Git inicial | Apenas C1 e C1.1 não versionados; nenhum arquivo rastreado modificado |
| CI de referência | Execução `41832249900`, aprovada conforme C1 e pedido; não reconsultada nem reexecutada em C2 |
| Preservação | SHA-256 de 872 arquivos comparados antes/depois: arquivos rastreados e os dois relatórios preexistentes, sem diferenças |
| SHA-256 do C1 preservado | `f587562d50237ecadb55c089266f4b6c210edc13f05f526c4da54939fccb91a0` |

Os ensaios usaram um executor descartável em `.cache/c2/`, serviços reais e servidor HTTP em loopback. Não foi usada implementação mock de autenticação nem interceptação das respostas HTTP. Apenas o destino do logger foi redirecionado em memória para conservar suas saídas sanitizadas como evidência. Não houve alteração de código versionado.

## 2. Identidade do PostgreSQL descartável

Foi criado um contêiner novo, sem Compose, sem bind mount de dados e sem reutilizar volume ou banco histórico. A inicialização própria da imagem criou o cluster; **antes de migrations, fixtures ou operações da aplicação**, foram conferidos Docker, conexão TCP, conexão interna ao contêiner, identidade do cluster e ausência de tabelas no schema `public`.

| Identidade conferida | Valor |
| --- | --- |
| Banco | `portal_c2_f71b049167_test` |
| Papel de teste | `c2_dono`, dono/superusuário exclusivo do cluster descartável |
| Destino TCP no host | `127.0.0.1:62334` |
| Servidor/porta dentro do contêiner | `172.17.0.2/32`, `5432` |
| PostgreSQL | `17.11`, `server_version_num=170011` |
| Schema | `public` |
| System identifier | `7704451604520353827`, igual por TCP e pela conexão interna |
| Contêiner | `portal_c2_f71b049167` |
| ID do contêiner | `929a9a36ec6c1b3050054d8bf21c2fb8d642678bdeec8fb1a55aa62bb3874b39` |
| Imagem | `postgres:17-alpine`, digest `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24` |
| Dados | `/var/lib/postgresql/data` em `tmpfs`; sem bind de diretório real |
| Início do servidor | `2026-11-04T22:47:08.243Z` — 19:47:08, São Paulo |
| Recuperação | `pg_is_in_recovery()=false` |
| API temporária | `127.0.0.1:52988` |

A URL e os segredos foram gerados/mantidos somente em memória; `.env` real não foi carregado. Foram removidas do ambiente do executor variáveis herdadas pertinentes antes dos imports. Nenhuma flag V2/Feedback foi ativada: o processo isolado usou os padrões desligados, sem editar arquivos de configuração.

Antes das migrations foi salvo um checkpoint de schema do banco novo vazio, com 672 bytes e SHA-256 `89178a61b0e829d5ccd78206bee97939f9aa23ce0aafd96394db4906b237d66f`. Depois foi salvo o schema migrado, ainda sem as contas sintéticas. Esses arquivos não contêm dump de usuários ou credenciais. Não havia dados anteriores a preservar/restaurar nesse cluster.

As **12 migrations** foram aplicadas uma vez no banco identificado. Todos os registros de `_prisma_migrations` terminaram com sucesso, sem rollback, e seus checksums coincidiram com os arquivos locais. As consultas SQL de conferência foram realizadas em transações `READ ONLY`. Os probes de comportamento das FKs usaram transações próprias com `ROLLBACK`. A API manteve as transações reais de negócio.

Uma primeira instância, `portal_c2_be334a8933`, foi descartada após falha de conexão durante a inicialização do PostgreSQL, antes de migrations ou HTTP. O executor passou a aguardar o listener TCP definitivo, em vez do socket do servidor temporário de bootstrap. O ensaio completo usou outro cluster novo. Não houve repetição de gravação de aplicação que tivesse falhado.

Ao terminar, a API foi encerrada, as conexões fechadas e o contêiner de teste removido após reconferir ID/nome/label. O `tmpfs` foi descartado. A consulta Docker final pelo label específico não encontrou contêiner remanescente. **`patrimonio_guarulhos` não foi acessado.**

## 3. Métodos, modelos e limites atuais

| Operação | Implementação efetiva |
| --- | --- |
| Desativar/reativar | `PATCH /api/admins/:id/status` → `changeAdminStatus(id, ativo, actor)` em [adminService.js](../src/services/adminService.js). Bloqueia ADMINs ativos e alvo por UUID, confere autodesativação/último ADMIN e usa transação `ReadCommitted`. Altera somente `isActive` e grava o AuditLog. |
| Emitir sessão/credenciais | `POST /api/auth/login` → `login` em [authService.js](../src/services/authService.js). Verifica senha/atividade, bloqueia a linha do usuário, relê senha e versão, cria `AuthSession` e o primeiro `RefreshToken`. |
| Renovar | `POST /api/auth/refresh` → `refresh`. Localiza SHA-256 do token opaco, bloqueia o usuário, relê token/sessão, confere atividade, revogação, versão e prazo absoluto; consome o refresh e cria outro. |
| Replay de refresh consumido | `refresh`, ramo `stored.usedAt`: revoga a sessão/família, confirma a transação e só depois responde 401. |
| Logout | `POST /api/auth/logout` → `logout`: revoga a sessão identificada pelo refresh; idempotente. |
| Troca de senha | `PATCH /api/auth/senha` → `changePassword`: atualiza hash, incrementa `tokenVersion`, revoga todas as sessões não revogadas e grava `USER_PASSWORD_CHANGE` na mesma transação. |
| Validar acesso | [authenticate.js](../src/middlewares/authenticate.js) + `getAuthenticationUser` em [accessService.js](../src/services/accessService.js): assinatura, usuário ativo, versão do JWT, sessão correspondente, versão da sessão, revogação, prazo absoluto e expiração do JWT. O papel vem do cadastro atual. |

No [schema Prisma](../prisma/schema.prisma), `User` contém `isActive` e `tokenVersion` com padrão 0; `AuthSession` contém usuário, cópia da versão, criação, vencimento e `revokedAt`; `RefreshToken` contém sessão, hash único, criação e `usedAt`. Não há senha/token bruto no armazenamento de refresh. A emissão e a verificação do JWT estão em [token.js](../src/utils/token.js).

| Limite | Código atual / observação C2 |
| --- | --- |
| JWT | HS256, `sub`, `sid`, `tokenVersion`, `iat`, `exp`; padrão 300 s, configurável de 60 a 1800 s. O par inicial observado tinha `exp-iat=300`. |
| Sessão absoluta | Padrão 28.800 s (8 h), configurável de 300 a 86.400 s. O registro observado tinha criação/vencimento separados por 8 h. Refresh não prorrogou esse vencimento. |
| Refresh | Opaco, 32 bytes aleatórios, 43 caracteres base64url; só SHA-256 é persistido. Validade depende da sessão, do uso e da versão, não de prazo deslizante próprio. |
| Versão | Inteiro não negativo, até `2147483647` na emissão/validação. Divergência entre usuário/JWT/sessão invalida a credencial. Desativação e reativação atuais não incrementam a versão. |

Os valores e intervalos de configuração foram inspecionados em [env.js](../src/config/env.js). Não foi aguardado o vencimento de 8 h nesta etapa. A sequência de reutilização ocorreu dentro do primeiro segundo aproximado após a emissão, com JWT e sessão ainda vigentes.

## 4. Sequência HTTP efetivamente observada

Foram criadas duas contas exclusivamente sintéticas ADMIN: **A**, responsável pelas mudanças, e **B**, alvo. A foi inserida como bootstrap no banco vazio; B foi criada por `POST /api/admins`, autenticado como A. Não foram usados usuários reais. Os tokens permaneceram em memória e estão omitidos das evidências.

Todas as rotas abaixo têm prefixo `/api`. `JWT₀` e `refresh₀` designam o par obtido no primeiro login de B; são rótulos, não valores de credenciais.

| Etapa | Pedido / credencial | Observado |
| --- | --- | --- |
| Preparação | Login A; criação de B | 200 e 201, respectivamente |
| 1–2. Login de B | `POST /auth/login` | 200; access token, refresh token e vencimento absoluto recebidos; versão 0 |
| Controle inicial | `GET /admins` com `JWT₀` | 200, rota protegida realmente executada |
| Autoproteção | A tenta `PATCH /admins/A/status`, `ativo=false` | 409, `ADMIN_CANNOT_DEACTIVATE_SELF` |
| 3. Desativação | A faz `PATCH /admins/B/status`, `ativo=false` | 200, `ativo=false` |
| 4a. JWT durante inatividade | `GET /admins` com `JWT₀` | 401, `UNAUTHORIZED` |
| 4b. Login durante inatividade | `POST /auth/login` com as credenciais válidas de B | 401, `UNAUTHORIZED` |
| 4c. Refresh durante inatividade | `POST /auth/refresh` com `refresh₀` | 401, `UNAUTHORIZED`; o token não foi consumido |
| Status repetido | A envia novamente `ativo=false` | 200; sem novo evento ou alteração de `updatedAt` |
| 5. Reativação | A faz `PATCH /admins/B/status`, `ativo=true` | 200, antes dos vencimentos do JWT e da sessão |
| 6. JWT anterior | `GET /admins` com o mesmo `JWT₀` | **200: reutilização comprovada** |
| 7. Refresh anterior | `POST /auth/refresh` com o mesmo `refresh₀` | **200: reutilização comprovada**; mesmo `sid`, refresh rotacionado, prazo absoluto preservado |
| Controle da renovação | `GET /admins` com JWT retornado pelo refresh | 200 |
| 8. Novo login | `POST /auth/login` de B após reativação | 200; nova sessão com `sid` diferente; seu JWT também recebeu 200 em `/admins` |
| Status ativo repetido | A envia novamente `ativo=true` | 200; não duplica o evento de ativação |
| 9. AuditLog | Leitura SQL `READ ONLY` das alterações do alvo B | Um `USER_DEACTIVATE` e um `USER_ACTIVATE`, ambos por A, com os valores corretos |

Houve ainda controles posteriores, separados da reprodução principal: reapresentar `refresh₀` **depois de ele ter sido consumido** retornou 401 e revogou a família original; o JWT dessa família passou a receber 401. O JWT do novo login continuou em 200. Logout dessa nova família retornou 200 e seu JWT passou a receber 401. Esses resultados mostram que revogação por replay e logout funcionam; o caminho de desativação é que não executa revogação permanente.

O executor registrou **22 respostas HTTP**, todas com `Cache-Control: no-store`, e checkpoints SQL entre as etapas. O controle de último ADMIN foi inspecionado no código e nos testes existentes; sua corrida concorrente não foi reexecutada no C2. A autodesativação foi exercitada por HTTP conforme a tabela.

## 5. Estado persistido, AuditLog e causa comprovada

| Checkpoint de B | `isActive` | Versão usuário/sessão original | `revokedAt` original | `usedAt` do refresh original |
| --- | --- | --- | --- | --- |
| Antes de desativar | true | 0 / 0 | null | null |
| Depois de desativar | false | 0 / 0 | null | null |
| Depois do refresh recusado durante inatividade | false | 0 / 0 | null | null |
| Depois de reativar | true | 0 / 0 | null | null |
| Depois do refresh anterior aceito | true | 0 / 0 | null | preenchido pela rotação |
| Depois do replay consumido, controle posterior | true | 0 / 0 | preenchido | preenchido |

O AuditLog de B terminou com três eventos: criação pela API, desativação e ativação. Para status, os valores foram exatamente:

| Evento | Ator/alvo | Antes | Depois |
| --- | --- | --- | --- |
| `USER_DEACTIVATE` | A / B | `{"isActive":true}` | `{"isActive":false}` |
| `USER_ACTIVATE` | A / B | `{"isActive":false}` | `{"isActive":true}` |

Status repetidos não duplicaram eventos. Login, refresh, replay e logout não adicionaram eventos ao Histórico; suas saídas operacionais são distintas do AuditLog. A sanitização existente em [auditoria.js](../src/utils/auditoria.js) exclui senha, hashes e tokens dos valores auditados. A atomicidade entre status e AuditLog existe no código transacional; C2 conferiu o resultado normal, sem injetar falha de auditoria.

**Causa técnica:** `changeAdminStatus` não altera os dois mecanismos duráveis de invalidação já disponíveis (`tokenVersion` e `AuthSession.revokedAt`). Durante a inatividade, `isActive=false` basta para negar acesso. A recusa de um refresh ainda não usado por conta inativa retorna sem consumi-lo nem revogar a sessão. A reativação restaura `isActive=true`, e as demais condições anteriores continuam válidas. Assim, o JWT ainda não expirado é aceito e o refresh ainda não usado pode renovar a mesma sessão.

Isso é um comportamento atual comprovado, incompatível com a política proposta; não é evidência de incidente ou de reutilização em produção. JWT já expirado não volta a ficar vigente por reativação. Pela lógica de refresh, a janela de risco pode alcançar o prazo absoluto restante da sessão, mesmo que o access token tenha expirado; essa extensão é conclusão do código, não ensaio de espera de 8 h.

## 6. Revisão das duas FKs

Fonte histórica: [20261021130000_add_auth_sessions/migration.sql](../prisma/migrations/20261021130000_add_auth_sessions/migration.sql). A migration declara `ON DELETE CASCADE` nas duas FKs e omite `ON UPDATE`. Não foi editada.

| Relação/constraint | Migration e banco descartável | Schema Prisma atual |
| --- | --- | --- |
| `auth_sessions.user_id → users.id`, `auth_sessions_user_id_fkey` | `ON DELETE CASCADE`, `ON UPDATE NO ACTION` | `onDelete: Cascade`; `onUpdate` omitido, com expectativa `Cascade` confirmada pelo diff |
| `refresh_tokens.session_id → auth_sessions.id`, `refresh_tokens_session_id_fkey` | `ON DELETE CASCADE`, `ON UPDATE NO ACTION` | `onDelete: Cascade`; `onUpdate` omitido, com expectativa `Cascade` confirmada pelo diff |

`pg_constraint` retornou, para ambas, `confupdtype='a'`, `confdeltype='c'`, `convalidated=true`, `condeferrable=false` e `condeferred=false`. `pg_get_constraintdef` confirmou as referências e a exclusão em cascata.

O comando local `prisma migrate diff --from-config-datasource --to-schema ... --script --exit-code`, usando exclusivamente a URL descartável e configuração de sessão read-only, terminou com **exit code 2**. Gerou somente a remoção/recriação dessas duas FKs com `ON UPDATE CASCADE`. Esse SQL foi guardado como evidência e **não foi executado**.

Como controle da origem do diff, foi criada em `.cache/` uma cópia temporária do schema com `onUpdate: NoAction` explícito somente nessas duas relações. O mesmo diff contra o mesmo banco retornou **exit code 0**, `This is an empty migration`. Isso não alterou o schema versionado nem o banco e confirma que essas duas definições explicam todo o diff encontrado.

| Probe SQL isolado, sempre revertido | Resultado efetivo |
| --- | --- |
| Alterar `users.id` de B mantendo sessões filhas | SQLSTATE **23503**, constraint `auth_sessions_user_id_fkey` |
| Alterar `auth_sessions.id` da sessão original mantendo refreshes filhos | SQLSTATE **23503**, constraint `refresh_tokens_session_id_fkey` |
| Excluir a sessão original | Sucesso dentro da transação; seus refreshes ficaram em zero; `ROLLBACK` restaurou o estado |
| Excluir o usuário B | Sucesso dentro da transação; suas sessões e refreshes ficaram em zero; `ROLLBACK` restaurou o estado |

Os dois erros 23503 eram o resultado esperado do diagnóstico, não foram repetidos. Os probes não modificaram constraints. Após os rollbacks, continuavam presentes as duas sessões de B e seus três refreshes, além dos eventos de auditoria.

**Impacto:** não é apenas diferença de grafia: trocar a PK referenciada é bloqueado no banco atual e propagaria a FK sob `CASCADE`. Entretanto, as operações suportadas inspecionadas mantêm IDs estáveis: criação gera IDs, status muda `isActive`, senha muda hash/versão e refresh/logout alteram tokens/revogação. `updateAdminSchema` não aceita `id`, e não há endpoint para trocar ID de sessão nem DELETE de usuário. Não se observou incompatibilidade dessas FKs nos logins, mudanças de status, refresh ou logout executados. As FKs não incidem sobre `isActive`, `tokenVersion` ou `revokedAt` e não causam o problema de sessão.

**Recomendação:** manter o comportamento efetivo **`NO ACTION`** e, em correção futura autorizada, explicitar `onUpdate: NoAction` nas duas relações Prisma. É a menor forma de documentar a identidade estável e eliminar o diff, sem DDL no banco. Não há necessidade demonstrada de migration corretiva para as operações atuais. Mesmo uma cascata de IDs não reescreveria `sub`/`sid` de JWTs já emitidos.

Se a equipe decidir deliberadamente adotar `CASCADE`, fazer uma **nova migration** após revisão, sem reescrever a histórica, e avaliar locks, validação das constraints e semântica dos IDs. Não aplicar automaticamente o SQL produzido por `migrate diff`.

## 7. Proposta mínima de correção de sessões — não implementada

Aplicar a política a contas administrativas **ADMIN e EDITOR**. Não é necessária nova coluna, novo endpoint nem alteração do formato do JWT/refresh para o fluxo futuro.

Na transação já existente de `changeAdminStatus`, preservar a ordem atual dos locks, a autodesativação e a garantia do último ADMIN. Na transição efetiva **ativa → inativa**:

1. Atualizar o usuário com `isActive=false` e incremento atômico de `tokenVersion`.
2. Atualizar todas as `AuthSession` desse usuário com `revokedAt=null`, preenchendo `revokedAt`.
3. Registrar o mesmo `USER_DEACTIVATE`, com o mesmo ator/alvo e diff de status, usando o cliente da mesma transação.
4. Confirmar somente se as três operações concluírem. Falha na versão, na revogação ou no AuditLog deve reverter tudo.

Manter os refreshes armazenados com seus hashes/indicadores de uso; não é preciso apagá-los, porque as validações de sessão revogada e versão divergente já bloqueiam sua utilização. Não ampliar a allowlist do AuditLog para incluir segredos ou detalhes de credenciais.

Na transição **inativa → ativa**, restaurar a atividade e registrar `USER_ACTIVATE`, **sem zerar/diminuir a versão nem limpar `revokedAt`**. Novo login válido deve criar nova sessão com a versão corrente. JWTs e refreshes anteriores continuam inválidos mesmo após reativação.

### Concorrência e idempotência

- Login, refresh, logout e troca de senha já bloqueiam a linha do usuário. A desativação deve continuar compartilhando esse lock. Se login/refresh confirmar antes da desativação, sua sessão será alcançada pela revogação; se aguardar até depois, as releituras de atividade/versão impedirão emissão válida. A emissão pode chegar atrasada ao cliente, mas a credencial emitida antes do commit da desativação deve ser recusada nas próximas verificações.
- Desativação e reativação concorrentes devem refletir a ordem serializada dos commits. Mesmo que o estado final seja ativo, a versão incrementada e as revogações da desativação não podem ser desfeitas.
- Preservar o retorno antecipado para status já igual ao solicitado: não incrementar versão repetidamente, não alterar `updatedAt` e não duplicar AuditLog. Duas desativações concorrentes devem produzir um incremento e um evento.
- Não substituir o lock ordenado de todos os ADMINs ativos por lock apenas do alvo: isso perderia a proteção contra remoção concorrente dos últimos administradores.
- A política invalida credenciais para novas verificações de autenticação após o commit; não cancela retroativamente um handler que já passou por `authenticate`. Revalidação de autorização no commit de outras operações é tema separado, não alteração implícita deste patch.

### Compatibilidade e implantação futura

`authenticate` e `refresh` já conferem atividade, versão e revogação; a proposta não exige relaxar nenhuma dessas verificações. ADMIN/EDITOR continuam sujeitos aos papéis atuais, e refresh continua rotativo com vencimento absoluto fixo. Logout continua restrito à família indicada e troca de senha continua revogando todas as sessões.

Contas **já inativas antes da implantação** merecem uma decisão explícita: o patch mínimo de desativação só protege transições executadas após sua instalação. Uma reativação de conta historicamente inativa pode conservar sessões antigas ainda válidas. Antes de habilitar a correção, definir saneamento autorizado dessas sessões/versões ou uma proteção adicional na reativação, com teste específico; não executar uma limpeza implícita neste diagnóstico. A versão nunca deve ser reciclada para zero. Overflow do inteiro deve falhar atomicamente, e não deixar uma conta parcialmente desativada.

## 8. Arquivos, testes de regressão e riscos

Arquivos centrais para revisão futura: [adminService.js](../src/services/adminService.js), [authService.js](../src/services/authService.js), [authenticate.js](../src/middlewares/authenticate.js), [accessService.js](../src/services/accessService.js), [token.js](../src/utils/token.js), [auditoria.js](../src/utils/auditoria.js) e [schema.prisma](../prisma/schema.prisma). O candidato mínimo muda a escrita de status e testes; o alinhamento declarativo das FKs pode ser tratado separadamente.

| Teste existente / local proposto | Ajuste ou regressão necessária |
| --- | --- |
| [adminManagement.test.js](../test/adminManagement.test.js) | Hoje há expectativa explícita de **200 para JWT antigo após reativação** no teste de desativação. Essa expectativa terá de mudar com a política. Adaptar mocks para incremento realista e `authSession.updateMany`, sem remover proteções de status/perfil. |
| [admin.integration.test.js](../test/admin.integration.test.js) | Estender a sequência HTTP real para reutilização pós-reativação de JWT e refresh, novo login e AuditLog. Preservar os testes existentes de status repetido e último ADMIN concorrente. |
| [refreshSessions.integration.test.js](../test/refreshSessions.integration.test.js) | O caso de conta inativa reativa hoje com incremento manual de versão pela fixture; não comprova o endpoint. Acrescentar mudança real via API, múltiplas sessões, refresh ainda não usado e refresh rotacionado. |
| [authRevocation.integration.test.js](../test/authRevocation.integration.test.js) e [authPassword.test.js](../test/authPassword.test.js) | Preservar invalidação por versão, troca de senha, limite de versão e emissão com versão corrente; novo login após reativação deve continuar válido. |
| [auditoria.integration.test.js](../test/auditoria.integration.test.js) | Reutilizar o padrão de falha real de INSERT de auditoria para provar rollback conjunto de status, versão e revogação. O arquivo já cobre esse princípio na troca de senha, mas não a correção proposta de status. |
| Teste dedicado de FKs em `backend/test/`, se o alinhamento for autorizado | Validar delete em cascata, update de PK bloqueado, checksums históricos preservados e diff vazio com `NoAction` explícito. |

Matriz mínima de aceite futuro:

1. ADMIN e EDITOR, cada um com pelo menos duas sessões: desativar por outro ADMIN, recusar todos os JWTs/refreshes, reativar e continuar recusando os antigos; novo login e seu refresh funcionam.
2. Corridas controladas no PostgreSQL real: login × desativação, refresh × desativação, troca de senha × desativação, desativação duplicada e desativação × reativação. Verificar o estado após os commits e credenciais retornadas tardiamente, sem depender de sleeps arbitrários.
3. Status repetido, autodesativação, auto-rebaixamento e última conta ADMIN, inclusive remoções concorrentes: manter códigos 409 e invariantes atuais, sem revogar indevidamente a conta protegida ou sessões de outro usuário.
4. Falhas na escrita da revogação, no AuditLog e no incremento da versão: rollback total; nenhum evento falso de sucesso. Verificar exatamente um evento por transição efetiva, sem tokens/hashes no JSON.
5. Novo login após reativação com versão corrente; refresh sem JWT, rotação, replay, logout idempotente, acesso expirado e limite absoluto permanecem compatíveis. EDITOR acessa rotas permitidas e continua recebendo 403 nas exclusivas de ADMIN.
6. Conta inativa anterior à implantação e limites de versão: política de transição explicitamente coberta, sem ressuscitar sessões históricas nem reciclar versão.

Riscos de regressão: revogação com filtro amplo demais atingindo outros usuários; incremento/limpeza de versão na reativação; `revokedAt` sendo apagado; perda de atomicidade por usar o Prisma global em vez do cliente transacional; perda da ordem de locks; mock que simula incorretamente `increment`; duplicação de auditoria; invalidação de login novo por repetição de status; falta de tratamento das contas previamente inativas. O alinhamento de FK deve preservar `ON DELETE CASCADE` e as migrations históricas.

As suítes versionadas foram inspecionadas, **não executadas integralmente** nesta etapa. C2 executou somente o diagnóstico direcionado autorizado. Não houve lint/build nem mudanças para fazer testes passarem.

## 9. Evidências, limitações e Git final

Evidências privadas locais, ignoradas pelo Git:

- [Resultado completo sanitizado](../../.cache/c2/ensaio_f71b049167/resultado.json): identidade, 12 migrations/checksums, 22 respostas HTTP, checkpoints SQL, AuditLog, quatro probes de FK e cleanup.
- [Diff do schema atual](../../.cache/c2/ensaio_f71b049167/diff_atual.sql) e [diff da cópia com NoAction](../../.cache/c2/ensaio_f71b049167/diff_no_action.sql). São evidências, não migrations aplicadas.
- [Saída do deploy isolado](../../.cache/c2/ensaio_f71b049167/migrations.txt), [hashes anteriores](../../.cache/c2/ensaio_f71b049167/hashes_antes.json) e [executor descartável](../../.cache/c2/diagnostico_c2.mjs).
- [Registro da tentativa inicial interrompida](../../.cache/c2/ensaio_be334a8933/resultado.json), sem migrations ou HTTP e com contêiner removido.

As evidências não incluem access tokens, refresh tokens, senhas ou URL com credencial. Não foram publicados artefatos de teste. A comparação em memória verificou a ausência dos segredos gerados no resultado persistido.

Limites: não houve inspeção do ambiente publicado, banco real, privilégios de um papel de API de produção, browser/frontend, espera de 8 h, ensaio concorrente novo ou injeção de falha no AuditLog. O papel de teste dono permitiu verificar constraints sem interferência de grants. O diff representa apenas as diferenças reconhecidas pelo Prisma entre as fontes usadas; não certifica toda a configuração operacional do PostgreSQL. As propostas ainda não foram implementadas nem testadas como correção.

Estado final esperado e conferido do Git, além de `.cache/` ignorada:

```text
?? backend/reports/auditoria_consolidada_modulos_c1.md
?? backend/reports/diagnostico_sessoes_fks_c2.md
?? backend/reports/diagnostico_visualizacoes_v2_c11.md
```

`git diff` sem alterações rastreadas. C1 e C1.1 preservados. Sem acesso a `patrimonio_guarulhos`, Compose normal, bancos históricos, mudanças nas flags V2/Feedback, edição de autenticação ou migrations, commit, push ou deploy.

**Encerramento C2:** reutilização de JWT/refresh comprovada no descartável; causa identificada; divergências de FK delimitadas; correções mínimas e regressões propostas para revisão. Nenhuma implementação posterior foi iniciada.
