# C2.1 — Correção da invalidação de sessões administrativas

Data: **04/11/2026**, America/Sao_Paulo. Rodadas de execução entre aproximadamente **20:28 e 20:36**. Branch: `development/backend`. HEAD de referência: `66fc3733e33ff0ba932b4ddfc6f55c5c1139a548`.

**Correção implementada:** toda transição efetiva de status de ADMIN ou EDITOR incrementa `tokenVersion` e revoga as sessões ainda não revogadas, na mesma transação da mudança de status e do AuditLog. Isso ocorre tanto na desativação quanto na reativação. JWTs e refreshes anteriores continuam recusados após reativar; novo login e seu refresh funcionam. Status repetido permanece sem efeitos adicionais.

Documento obrigatório lido e preservado: [diagnostico_sessoes_fks_c2.md](diagnostico_sessoes_fks_c2.md). A política autorizada em C2.1 amplia a proposta mínima de C2 ao invalidar também na reativação, protegendo contas historicamente inativas sem saneamento de dados reais.

## 1. Alterações e atomicidade

| Arquivo | Alteração |
| --- | --- |
| [adminService.js](../src/services/adminService.js) | `changeAdminStatus`: incremento atômico na escrita de `User`, seguido de `AuthSession.updateMany` com `userId` do alvo e `revokedAt=null`, antes do AuditLog existente. |
| [adminManagement.test.js](../test/adminManagement.test.js) | Expectativa do JWT anterior após reativação passa de 200 para 401; novo login permanece aceito e o rebaixamento continua retirando autorização. Mocks passam a representar incremento de versão, emissão e revogação. Asserções adicionais de idempotência e preservação do horário de revogação. |
| [auditoria.test.js](../test/auditoria.test.js) | Adaptação do cliente transacional simulado para incremento e revogação, mantendo as verificações existentes de autoria e alvo. |
| [adminStatusSessions.integration.test.js](../test/adminStatusSessions.integration.test.js) | Nova cobertura com API, serviços e PostgreSQL reais: 23 subtestes, além do teste agrupador. HTTP, múltiplas sessões, contas antigas, concorrência, rollback e isolamento entre usuários. |
| Este relatório | Resultado, evidências e limites da C2.1. |

A mudança de implementação fica restrita a `changeAdminStatus`. Foram preservados `ReadCommitted`, o bloqueio ordenado dos ADMINs ativos e do alvo, a releitura após o lock, a proteção contra autodesativação, a proteção do último ADMIN e o retorno antecipado para status igual ao atual.

As três escritas usam o mesmo cliente transacional. Se incremento, revogação ou auditoria falhar, nenhuma delas é confirmada. Não se apagam refreshes nem se altera o formato dos tokens. `authenticate` e `refresh` continuam usando as verificações existentes de atividade, versão, sessão, revogação e vencimento absoluto.

O filtro `revokedAt=null` preserva os horários das sessões já revogadas. Também marca sessões expiradas ainda não revogadas; isso não as torna válidas nem muda seu vencimento. Não há filtro amplo que alcance sessões de outro usuário. Na reativação, a versão avança novamente; nenhum `revokedAt` é limpo.

## 2. Isolamento e identidade dos bancos

Foram criados **dois clusters novos PostgreSQL 17.11**, um para a rodada direcionada e outro para a regressão completa. Ambos usaram `postgres:17-alpine`, ID da imagem `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`, dados em `tmpfs`, sem bind mount de dados, sem volume histórico e sem Compose.

| Identidade | Direcionados | Regressão completa |
| --- | --- | --- |
| Nome do contêiner | `portal_c21_991373eb6d` | `portal_c21_ff9437d588` |
| ID do contêiner | `74a596a4c5ed3c46298494b7b359b6c5760cdfa4e2916744b5ab682dc2a0171d` | `de6cd3e709226a2710bbc918a5474853f9ac56a7dc383d72be1fae164fae6971` |
| Banco / papel de teste | `portal_test` / `portal_test` | `portal_test` / `portal_test` |
| Host / porta publicada | `127.0.0.1:61312` | `127.0.0.1:55003` |
| Servidor interno / porta | `172.17.0.2/32:5432` | `172.17.0.2/32:5432` |
| System identifier | `7704462369018847267` | `7704462950251159587` |
| Schema / versão numérica | `public` / `170011` | `public` / `170011` |

Antes de migrations, papéis auxiliares ou fixtures, foram conferidos contêiner, nome, label, rede loopback, mounts, destino TCP, identidade por conexão interna, system identifier, versão 17, ausência de recuperação e schema `public` vazio. Foi salvo checkpoint somente de schema do banco vazio. Após a aplicação das migrations, foi salvo outro checkpoint de schema, antes das fixtures.

As **12 migrations históricas** foram aplicadas uma vez em cada cluster, com checksums conferidos e sem rollback de migrations. Os papéis auxiliares e grants de teste permitiram executar as regressões existentes de privilégios e operação no próprio descartável. Consultas de conferência usaram transações `READ ONLY`; as gravações foram migrations, preparação e operações autorizadas de teste. Não havia dados anteriores a preservar nesses clusters.

O executor temporário [validar_c21.mjs](../../.cache/c21/validar_c21.mjs) removeu variáveis herdadas pertinentes e apontou dotenv para um caminho inexistente. URLs, senhas de papéis e segredo JWT foram gerados em memória; as saídas persistidas foram sanitizadas. A configuração normal de banco do executor apontava para uma porta indisponível, e os testes receberam exclusivamente os destinos descartáveis. Vite recebeu `envDir=false`, com cache e build em `.cache/c21/`. Não foram carregados arquivos `.env` reais.

As suítes existentes podem definir flags temporárias em seus processos para exercitar seus próprios contratos; não houve alteração de arquivo, flag ou configuração real de V2/Feedback. Nenhum módulo desses recebeu alterações. **`patrimonio_guarulhos` não foi acessado.**

Ao final de cada rodada, as conexões foram encerradas e o contêiner removido após reconferir ID, nome e label. Ambos os resultados registram `cleanup=true`; seus dados em `tmpfs` foram descartados. Não há servidor de aplicação ou banco da C2.1 mantido em execução.

## 3. Resultados HTTP, versões e AuditLog

A nova cobertura conferiu **190 respostas HTTP por execução**, com `Cache-Control: no-store`, usando contas, senhas e identificadores exclusivamente sintéticos. As asserções foram executadas contra o aplicativo Express real; não houve mock das respostas HTTP. Tokens ficaram em memória e não são reproduzidos neste relatório.

| Ensaio | Resultado observado |
| --- | --- |
| ADMIN e EDITOR com múltiplas sessões | Três sessões iniciais por alvo; refresh de uma família rotacionado e outra família revogada por logout antes da mudança de status. |
| Desativação por outro ADMIN | PATCH 200; versão 0 → 1; todas as sessões do alvo revogadas. O horário da família anteriormente encerrada permaneceu igual. |
| Conta inativa | JWTs e refreshes anteriores: 401. Login com senha válida: 401. |
| Reativação | PATCH 200; versão 1 → 2; JWTs e refreshes antigos, inclusive o refresh rotacionado, continuaram em 401. |
| Novo login após reativação | 200, sessão com versão corrente; refresh 200 e acesso protegido 200. Vencimento absoluto mantido durante a renovação. |
| Conta historicamente inativa | Fixture simulou `isActive=false` sem incremento/revogação anteriores. Reativação elevou a versão de 0 para 1 e revogou todas as sessões; credenciais históricas 401, novo login/refresh 200. Exercitado para ADMIN e EDITOR. |
| Status repetido | 200; snapshots de usuário, versão, `updatedAt`, sessões, refreshes e AuditLog permaneceram idênticos. Repetir ativo não invalidou a sessão emitida pelo novo login. |
| Outro usuário | Estado persistido idêntico e acesso 200 após as mudanças no alvo. |
| Perfis | ADMIN recebeu 200 na listagem administrativa; EDITOR recebeu 403 nessa rota e 200 no dashboard permitido. |
| Autodesativação / auto-rebaixamento | 409; estado, sessões, versão e auditoria do ator preservados. |

O ciclo normal produziu exatamente um `USER_DEACTIVATE` e um `USER_ACTIVATE`, com ator correto, alvo correto e os mesmos diffs de status já usados pelo portal. Status repetidos não adicionaram evento. Os valores auditados foram comparados integralmente e não incluem senha, hash ou token. O contrato público do AuditLog não foi ampliado com informações de credenciais.

## 4. Concorrência e rollback

As corridas novas chamam os serviços reais dentro de transações PostgreSQL reais. Um adaptador apenas nos testes retém a primeira operação após adquirir o lock e libera sua continuação quando a segunda chega à tentativa de lock. A ordem é controlada por promessas e `AsyncLocalStorage`, sem sleeps arbitrários. Nenhum lock da implementação foi substituído. As credenciais obtidas são conferidas depois por HTTP.

| Concorrência | Verificação aprovada |
| --- | --- |
| Login × desativação, nas duas ordens | Login confirmado antes tem sua sessão revogada; login que encontra a desativação confirmada é recusado. Credenciais anteriores não voltam após reativar. |
| Refresh × desativação, nas duas ordens | Renovação anterior é alcançada pela revogação; renovação posterior é recusada. O par retornado antes da desativação também permanece inválido após reativar. |
| Senha × desativação, nas duas ordens | Troca de senha anterior incrementa sua própria versão e revoga sessões; a desativação incrementa novamente. Se a desativação vence, a troca de senha é recusada pelo contrato atual. Novo login após reativar usa a senha efetivamente confirmada. |
| Duas desativações / duas reativações | Um incremento, um evento e DTOs iguais; a segunda operação é idempotente. |
| Desativação × reativação, nas duas ordens | Duas transições efetivas produzem dois incrementos e dois eventos; o status final corresponde à segunda operação. Credenciais antigas seguem recusadas. |
| Refresh histórico × reativação, nas duas ordens | Refresh de conta anteriormente inativa é recusado tanto antes quanto depois de reativar; novo login e refresh funcionam. |
| Remoção concorrente dos últimos ADMINs | Uma desativação confirma; a outra recebe `LAST_ACTIVE_ADMIN`. A conta protegida conserva versão, sessões e acesso. |

Foram exercitados **13 cenários novos de concorrência**: seis envolvendo login/refresh/senha e desativação, quatro ordens de mudanças de status, dois com refresh histórico e reativação e um de último ADMIN. Os testes preexistentes de concorrência também foram preservados e executados.

Foram exercitados **seis cenários de rollback**, três falhas em cada sentido da transição:

| Falha induzida | Mecanismo e resultado |
| --- | --- |
| Revogação | O adaptador transacional de teste executa o `updateMany` real e provoca em seguida erro SQL de conversão. Isso prova que até revogações já escritas são revertidas junto com status e versão. |
| Versão | Fixture posiciona `tokenVersion` em `2147483647`; o incremento real excede o inteiro PostgreSQL. A operação falha sem confirmar mudança parcial e sem reciclar a versão. |
| AuditLog | O INSERT real recebe ator sintético inexistente e falha na FK (`P2003`). Status, versão e revogação são revertidos, sem evento falso de sucesso. |

Em todos os seis casos, os snapshots completos antes/depois de usuário, sessões, refreshes e auditoria foram iguais. A injeção é exclusiva do teste: não foi acrescentada flag de falha, trigger ou caminho especial no código da aplicação. Essas falhas são resultados esperados dos testes e não falhas da suíte.

## 5. Validação executada

Ambiente de execução: Node 24 local já disponível e dependências instaladas do projeto. Sem instalação ou atualização de pacotes. O backend não possui script de build; sua validação usa testes e lint. O build executado é o frontend Vite.

| Verificação | Resultado |
| --- | --- |
| Backend direcionado, oito arquivos | **85 testes aprovados; 0 falhas, 0 cancelados, 0 ignorados**, em aproximadamente 53 s. |
| Backend completo | **636 testes aprovados; 0 falhas, 0 cancelados, 0 ignorados**, em aproximadamente 296 s. Inclui novamente os testes direcionados. |
| Frontend completo | **619 testes aprovados em 34 arquivos; 0 falhas**, em aproximadamente 192 s. |
| Lint backend e frontend | Ambos com exit code 0. |
| Build frontend | Exit code 0; artefato em `.cache/c21/interface_da1fecda57/dist/`, aproximadamente 5 s para o processo. |

A rodada direcionada incluiu `adminManagement`, `adminStatusSessions.integration`, `admin.integration`, `authRevocation.integration`, `refreshSessions.integration`, `authPassword`, `auditoria` e `auditoria.integration`. A regressão completa usa `scripts/run-suite.js`, sem remover arquivos ou relaxar asserções. O frontend usa a configuração Vitest existente e dois workers. O build usa a configuração Vite existente com saída temporária.

Não houve rodada reprovada nem repetição para esconder falhas. Os 85 testes direcionados são um subconjunto dos 636 backend; os totais não devem ser somados como casos distintos. O Node conta o agrupador e seus 23 subtestes como 24 testes novos. As 190 verificações HTTP da cobertura nova passaram tanto na rodada direcionada quanto na completa.

As regressões preservam rotação e replay de refresh, logout, troca de senha, tokenVersion, expiração de acesso e prazo absoluto da sessão. Os testes de frontend cobrem os consumidores dos contratos mantidos; não houve alteração de componente ou API pública.

O build emitiu avisos de import dinâmico ineficaz de `PatrimonioEditor` (também importado estaticamente), chunk maior que 500 kB e tempo gasto em hooks de plugins. Nenhum virou erro; os módulos correspondentes não foram alterados nesta etapa. As rodadas backend também emitiram avisos de depreciação de dependência. Esses avisos permanecem registrados nas saídas, sem mudanças fora do escopo para silenciá-los. Logs de erro induzidos pelos testes de caminhos negativos não representam falhas da suíte.

## 6. FKs, preservação e evidências

As duas constraints continuaram com `confupdtype='a'` (**ON UPDATE NO ACTION**) e `confdeltype='c'` (**ON DELETE CASCADE**) nos descartáveis. Nenhum alinhamento foi aplicado ao schema Prisma. Não foi criada, editada ou reaplicada como correção qualquer migration histórica. **C2.2 não foi iniciada.**

Evidências privadas locais, ignoradas pelo Git:

- [Direcionados: resultado e identidade](../../.cache/c21/direcionados_991373eb6d/resultado.json) e [TAP completo](../../.cache/c21/direcionados_991373eb6d/testes_backend.log).
- [Regressão backend: resultado e identidade](../../.cache/c21/completos_ff9437d588/resultado.json) e [saída completa do Node](../../.cache/c21/completos_ff9437d588/testes_backend.log). Os totais estão no rodapé da saída; o extrator resumido do JSON não reconheceu o prefixo do reporter padrão dessa rodada.
- [Frontend/lint/build: resultado](../../.cache/c21/interface_da1fecda57/resultado.json), [testes](../../.cache/c21/interface_da1fecda57/testes_frontend.log), [build](../../.cache/c21/interface_da1fecda57/build_frontend.log), [lint backend](../../.cache/c21/interface_da1fecda57/lint_backend.log) e [lint frontend](../../.cache/c21/interface_da1fecda57/lint_frontend.log).
- [Manifesto de preservação anterior](../../.cache/c21/hashes_antes.json) e [executor isolado](../../.cache/c21/validar_c21.mjs). Os diretórios dos descartáveis também guardam saída das migrations e checkpoints somente de schema, sem dump de usuários.

Não foram publicados logs, dumps, tokens ou credenciais. `.cache/` não integra a entrega versionável. A comparação SHA-256 dos **873 arquivos de referência** encontrou somente as três alterações rastreadas descritas na seção 1. Todos os demais arquivos, incluindo schema, 12 migrations, configurações e os três relatórios anteriores, permaneceram idênticos. Conferência registrada em [verificacao_final.json](../../.cache/c21/verificacao_final.json).

| Relatório preservado | SHA-256 antes/depois |
| --- | --- |
| C1 | `f587562d50237ecadb55c089266f4b6c210edc13f05f526c4da54939fccb91a0` |
| C1.1 | `437d124057cce6c21c871ba24442982097469669ab115937d4cbc7ac7a404ad0` |
| C2 | `002c39d22ba8eb70f8b7bc2f0842628697fb2dd1893a5a841c857a80ff1d8e77` |

## 7. Limitações e riscos residuais

A invalidação se aplica às verificações de autenticação posteriores ao commit. Não cancela retroativamente um handler que já passou pelo middleware. Contas historicamente inativas ficam protegidas na próxima transição efetiva de reativação por esse serviço; escritas diretas no banco que ignorem o serviço continuam fora desse contrato. Nenhuma limpeza de dados reais foi realizada.

O limite inteiro da versão falha atomicamente, sem reset; seu esgotamento exigiria tratamento operacional separado. O ensaio não aguardou oito horas: prazo absoluto e expiração são verificados pelas regressões automatizadas existentes. Não houve validação manual de navegador, teste de carga prolongado ou implantação no ambiente publicado. As corridas exercitadas são as ordens explícitas acima, não uma enumeração de todos os interleavings possíveis.

A rotina demonstrativa de autenticação em memória não foi alterada; a correção e a comprovação desta etapa usam a implementação persistente. A regressão existente do modo demonstrativo permanece incluída na suíte completa.

## 8. Git final e encerramento

Branch e HEAD permaneceram os da referência. `git diff --check` passou. Estado final, com `.cache/` ignorada:

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

C1, C1.1 e C2 já estavam não versionados antes desta etapa e foram preservados. A implementação nova compreende um serviço alterado, dois testes adaptados, um teste de integração novo e este relatório. Não houve commit, push ou deploy. A C2.1 está implementada, testada e documentada; **C2.2 não foi iniciada**.
