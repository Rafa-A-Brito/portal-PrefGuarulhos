# Portal do Patrimônio Cultural de Guarulhos
## Relatório de diagnóstico das atualizações e plano de evolução do Dashboard
**Data:** 31/10/2026\
**Escopo:** leitura estática do ZIP `portal-PrefGuarulhos-development-backend (4)(1).zip`, comparação por nome/CRC/tamanho com `portal-PrefGuarulhos-development-backend (3).zip`, e análise dos dois esboços enviados.\
**Limitação:** não foi executado `npm test`, banco de dados, Docker, aplicação, Git ou endpoints. Diferenças de snapshots ZIP **não** equivalem necessariamente a `git diff` do último commit ou alterações ainda não enviadas ao GitHub.

## 1. Resumo executivo

O projeto ganhou infraestrutura de métricas qualificadas de patrimônio, auditoria administrativa persistida, logs operacionais estruturados e modo demonstrativo em memória. O frontend já possui seção de visualizações qualificadas; falta implementar a interface de histórico de alterações. A área pública de contato usa `mailto:`; não há, no snapshot, persistência e API estruturadas de **feedback** para gráficos. O Dashboard V2 de visualizações **não** mede o total de pessoas que acessaram o site nem todas as páginas acessadas.

**Comparação técnica dos dois ZIPs:** 701 arquivos no pacote anterior; 801 arquivos no atual; 100 caminhos adicionados, 81 arquivos com conteúdo/tamanho diferente, nenhum caminho removido. As diferenças incluem funcionalidades de várias fases anteriores, não apenas o que mudou hoje no VS Code.

### Status por funcionalidade

| Área | Estado identificado | Implicação |
| --- | --- | --- |
| Dashboard administrativo V1 | Implementado: inventário e distribuição do acervo | Preservar quatro gráficos e regras de status |
| Visualizações qualificadas V2 | Backend, frontend e documentação presentes; flags desligadas por padrão | Mede credencial anônima × patrimônio × dia, após adesão e qualificação; **não** visitantes únicos do site |
| Favoritos globais | Documento da Fase 2.1 presente; não há modelos/endpoints globais no ZIP | 2.2 ainda não identificada como implementada |
| Auditoria administrativa | Modelo `AuditLog` existente; gravação integrada e API de consulta/detalhes | Backend apto a apoiar nova tela de histórico para ADMIN |
| Tela de histórico de alterações | Não há rota/página administrativa correspondente no frontend inspecionado | Criar UI e integrar endpoints existentes |
| Feedback público | Contato encaminha para aplicativo de e-mail, sem registro na API | Definir produto e criar fluxo estruturado antes do gráfico |
| Acessos gerais ao site | Não foi encontrado sistema de sessões/contagem geral de visitantes | Definir métrica distinta das visualizações de patrimônio |
| Logs de operação | Logger JSON estruturado em stdout/stderr | Não confundir logs operacionais com `AuditLog` do banco; definir coleta/retenção em hospedagem |
| Modo demonstração | `MOCK_DATA=true`, dados em memória sem PostgreSQL, rejeitado com `NODE_ENV=production` | Útil para apresentação local; não valida transações reais |

## 2. Mudanças relevantes identificadas no pacote atualizado

### 2.1 Auditoria e logs

Novos componentes e documentação: `backend/docs/AUDITORIA_E_LOGS.md`, `backend/src/routes/auditoriaRoute.js`, `backend/src/controllers/auditoriaController.js`, `backend/src/services/auditoriaService.js`, `backend/src/utils/auditoria.js`, `backend/src/utils/logger.js`, `backend/src/middlewares/requestId.js`, e testes `auditoria*.test.js` e `logs.test.js`.

- `GET /api/admin/auditoria`: exige ADMIN autenticado; lista paginada (padrão 20, máximo 100) com filtros por usuário, ação, entidade, registro e datas; ordem estável por data e ID.
- `GET /api/admin/auditoria/:id`: detalha um evento com `oldValues`, `newValues` e referência ao registro; aplica lista de campos permitidos inclusive à leitura de registros antigos.
- O backend registra alterações em usuários, senha (sem valores), patrimônios, imagens, referências/documentos, fatos, ligações, regiões, exposições e novidades. A escrita de negócio e auditoria é transacional nas operações cobertas.
- `AuditLog` contém `id`, `userId`, `action`, `entity`, `entityId`, `oldValues`, `newValues`, `createdAt`; a consulta inclui usuário com nome/e-mail quando disponível. **Não há `sessionId`, `pagina`, `requestId` ou rota HTTP persistidos na tabela.** Não inventar esses campos na UI.
- O logger de segurança/operação emite eventos como `LOGIN_SUCCEEDED`, `AUTHENTICATION_DENIED`, `SESSIONS_REVOKED`, `DATABASE_OPERATION_FAILED` e `FILE_RECOVERY_PENDING`. Logs de stdout/stderr não são a fonte do histórico administrativo do Dashboard e não garantem retenção sem configuração do host.

### 2.2 Modo de demonstração

`backend/docs/MODO_DEMONSTRACAO.md`, `backend/src/mock/*`, `backend/src/config/runtime.js` e `backend/src/services/index.js` introduzem modo `MOCK_DATA=true` com dados fictícios em memória. O backend documenta 20 patrimônios, 24 exposições e 24 novidades fictícias, contas de demonstração e dados apagados ao reiniciar. Não representa dados reais nem prova concorrência PostgreSQL. Verificar no ambiente final que `MOCK_DATA` permanece desligado e que `NODE_ENV=production` é definido corretamente; não expor o modo por engano em host acessível publicamente.

### 2.3 Visualizações qualificadas, operação e CI

Presentes: migrations `20261026120000_add_visualizacoes_metricas` e `20261027120000_add_operacao_metricas`, rotas/serviços de métricas, painel frontend `SecaoMetricas`/`MetricasDashboard`, scripts de retenção/observação, permissões operacionais, `compose.metricas.test.yml`, regras Nginx, testes e workflow. Os relatórios anteriores documentam homologação local e o usuário confirmou GitHub Actions aprovado; o ZIP sozinho não comprova o status atual do remoto. Flags da coleta/consulta devem continuar desligadas até decisão de ativação.

### 2.4 Frontend administrativo e contratos

`frontend/src/features/admin/pages/AdminDashboard.jsx` conserva cartões de acervo/usuários, gráficos V1 e `SecaoMetricas`. `frontend/src/App.jsx` não define `/admin/auditoria`, e não há tela `AdminAuditoria` na pasta de páginas. A API de auditoria existe, mas **a experiência do usuário solicitada no quadro ainda falta**. Também existem ajustes em `AdminRegioes.jsx` e CSS no snapshot; consultar `git diff` da árvore atual para identificar se são alterações locais posteriores ao ZIP.

## 3. Dashboard — “Acessos”

**Já estamos registrando visualizações qualificadas?** Sim, o projeto contém esse recurso (com ativação opcional). A unidade é uma credencial anônima válida, por patrimônio e dia civil de São Paulo, exigindo adesão e tempo visível na ficha confirmada. Recarregar a mesma ficha no mesmo dia não representa uma nova unidade para aquela credencial. O resultado pode subcontar acessos (recusa, falha, bloqueio de cookie, outras páginas) e também não prova identidade humana.

**O que não está sendo medido por essa contagem:** número total de visitantes únicos do portal; sessões de navegação; acessos à Home, mapa, contato e catálogo; usuários administrativos logados; pageviews de toda a aplicação.

**Recomendação:** manter no Dashboard uma seção com título preciso, por exemplo “Visualizações qualificadas de patrimônios”. Se o requisito institucional for “acessos ao portal”, abrir especificação independente: páginas cobertas, sessão versus evento, recusa/GPC, deduplicação, retenção, métodos de coleta e comunicação transparente ao público. Não renomear o número de visualizações como “usuários únicos”. Não iniciar coleta global silenciosa.

## 4. Dashboard — “Feedback”

O formulário `frontend/src/pages/Contato/Contato.jsx` usa `window.location.href = mailto:...`; ele abre o cliente de e-mail e **não confirma que o envio foi realizado**. Não há, no snapshot, tabela/modelo `Feedback`, rota de recebimento e consulta administrativa para subsidiar gráficos. “Feedback” usado em testes/código também se refere a mensagens de erro da UI, não avaliações de visitantes.

**Proposta de produto a aprovar:** formulário opcional e simples, com tipo (elogio/sugestão/problema), campo de comentário controlado, eventual nota apenas se fizer sentido e texto claro de tratamento de dados. Backend com validação estrita, limites antiabuso, tratamento de dados pessoais, retenção, moderação e consulta agregada ADMIN. Gráficos somente das dimensões efetivamente coletadas: quantidade por categoria, evolução temporal e nota **apenas se existir pergunta de nota**. Não transformar e-mails existentes em estatísticas sem projeto próprio de integração e autorização.

## 5. Dashboard — “Logs de alterações e histórico”

Os dois esboços indicam uma **lista de alterações** integrada visualmente à área administrativa, com nome, e-mail, data, hora, seção/página e botão **Detalhes**. O detalhe deve exibir narrativa determinística, derivada exclusivamente do evento armazenado. Evitar cards decorativos: priorizar tabela/lista responsiva e um painel de detalhes.

**Lista recomendada (ADMIN):**

| Data e hora | Responsável | Ação | Seção/recurso | Detalhes |
| --- | --- | --- | --- | --- |
| 28/10/2026, 13:59 (exemplo fictício) | Usuário Exemplo · email de exemplo | Editou patrimônio | Patrimônios | Ver detalhes |

A API já permite `createdAt`, `user`, `action` e `entity`. A “seção” pode ser um **rótulo de apresentação** mapeado a partir de `entity`/`action`, e não uma alegação de página visitada. Separar **sessão de login** de **seção do painel**: a primeira não está identificada no registro atual. Se realmente se desejar rastreabilidade por sessão, deve ser especificada e auditada separadamente, com minimização e sem tokens ou segredos.

**Detalhe determinístico:**

- Template para edição com diff permitido: “Em [data/hora], [responsável] alterou [recurso]. Campo [campo]: de [valor anterior] para [novo valor].”
- Para publicação: “Em [data/hora], [responsável] publicou [recurso].”
- Para troca de senha: “Em [data/hora], [responsável] alterou sua senha.” **Jamais mostrar senha anterior, hash, token ou valores inexistentes.**
- Se `user` estiver ausente: “Responsável não disponível no registro”, sem atribuir a pessoa fictícia.
- Se o diff não contém um campo (por omissão de segurança ou histórico legado), não inventar conteúdo. Mostrar “Detalhes dessa alteração não disponíveis” e os dados verificáveis.

O texto não deve ser produzido por IA generativa nem supor intenção do agente. O servidor já emite `resumo` curto (“Patrimônio: edição”), que pode alimentar a lista; a narrativa detalhada pode ser construída a partir do DTO de detalhe no frontend por um **formatador determinístico testado**, com dicionário de campos e escape seguro de texto. Se o registro foi excluído, mostrar o nome somente se constar de dados permitidos do evento; caso contrário, usar o tipo e ID autorizado.

**Segurança:** acesso ADMIN exclusivo conforme rota atual; respostas `no-store`, paginação e filtros, cancelamento de requests, estados vazio/erro/indisponível, nenhum dado sensível, nenhum endpoint de alterar ou excluir eventos de auditoria. Rotas de auditoria e logs do servidor são produtos distintos. Não fazer join de stdout/stderr com `AuditLog` apenas pelo horário.

## 6. Ordem recomendada de execução

### Etapa A — Checkpoint e matriz de mudanças (sem código)

Usar o VS Code/Codex na **árvore atual**, com `git status`, `git diff`, `git log` e versão de branch, para comparar com o último commit e documentar o que é novo desde o push. Confirmar se ajustes de Regiões e da Fase 2.1 estão staged/committed; conferir flags, `.env` e segredos sem imprimi-los. Revisar status de CI, backups e drift conhecido das FKs de autenticação. Nenhum acesso ao banco real.

### Etapa B — Interface de histórico de auditoria (primeira implementação)

Criar página `/admin/auditoria` apenas para ADMIN com filtros por período, responsável, ação e recurso; tabela responsiva; botão Detalhes com comparação anterior/novo e frase determinística. Usar API existente e adaptar menus conforme design atual, sem novos endpoints a princípio. Suítes de regressão para autenticação, permissão, paginação, campos sigilosos, eventos sem usuário e ausência de diffs. Testar em API mock e, quando autorizado, no banco descartável identificado.

### Etapa C — Especificação e implementação de feedback

Definir exatamente o que “feedback” significa; desenhar fluxo público e estados de envio. Criar migration **nova** apenas em banco de teste descartável, API segura e consultas agregadas para gráfico. Não acoplar a analytics ou ao contato por e-mail automaticamente. Revisão institucional de privacidade antes de coletar conteúdo real.

### Etapa D — Decisão sobre “acessos gerais”

Se a contagem qualificada já atender o objetivo, melhorar rótulos e explicação da cobertura. Se a necessidade for o número de acessos a todo o site, criar arquitetura e consentimento próprios antes de instrumentar páginas; vedado inferir pessoas únicas a partir de IP ou gerar valores a partir de sondas técnicas.

### Etapa E — Retomar Favoritos Globais Fase 2.2

O documento `backend/docs/dashboard_v2_fase_2_1_arquitetura_favoritos.md` existe; modelos e endpoints não aparecem implementados neste ZIP. Retomar backend Fase 2.2 após o checkpoint, em escopo isolado, preservando Visualizações V2 e auditoria. O desenvolvimento pode ocorrer em trilha separada; não misturar migrations de feedback e favoritos sem dependências e sequência claras.

### Etapa F — Homologação e publicação futura

Testes backend e frontend completos; lint/build/Prisma/audits; E2E browser → API → PostgreSQL **descartável**; CI remoto após push autorizado; HTTPS definitivo, logs/backup, agendamentos, acessibilidade e autorizações antes de ativação pública. Nenhum ambiente real deve receber migrations/seed/deploy automaticamente.

## 7. Riscos e limitações

1. **Confusão de métricas:** “visualizações qualificadas” ≠ “visitantes únicos” ≠ “sessões” ≠ “pageviews”.
2. **Auditoria ≠ logs técnicos:** logs do sistema não constituem histórico persistente confiável nem armazenam página/sessão do evento.
3. **Retenção:** a tabela AuditLog já possui eventos, mas a política de backup/retenção e revisão de acessos ainda precisa ser definida. Eventos antigos não podem ser reconstruídos.
4. **Feedback:** o contato atual não produz dados armazenados nem estatísticas consultáveis.
5. **Demo:** ambiente em memória e credenciais fictícias não podem ser expostos como sistema real; `MOCK_DATA` deve permanecer false na publicação.
6. **Fases:** nenhuma migration de favoritos ou feedback foi encontrada no snapshot atual; não assumir funcionalidade implementada por existir documento de arquitetura.
7. **Evidência:** este é um diagnóstico estático do material enviado; relatórios incluídos no ZIP informam testes de datas anteriores, mas nenhuma suíte foi reexecutada nesta análise.

## 8. Critérios de aceite da próxima entrega (Histórico)

- Link “Histórico de alterações” visível somente para ADMIN e protegido também na API.
- Tabela com responsável (nome/e-mail quando disponível), data/hora em `America/Sao_Paulo`, ação, seção derivada do tipo e botão “Detalhes”.
- Filtros e paginação reais; ordenação preservada do backend.
- Detalhe busca `/api/admin/auditoria/:id` e exibe campos antigos/novos permitidos com texto determinístico.
- Campos ausentes ou protegidos não são inventados nem exibidos por fallback inseguro.
- EDITOR, visitante e usuário sem sessão não acessam tela/dados.
- Regressões de V1/V2, login, regiões e favoritos locais aprovadas.
- Nenhuma mudança de banco real, nenhuma migration histórica, flags desligadas por padrão, sem commit/push/deploy automático.

**Parecer:** Priorizar a interface de histórico de alterações como ganho imediato, pois o backend já possui o contrato correspondente. Planejar feedback e acessos gerais como produtos de coleta distintos, com requisitos claros; manter a Fase 2 de Favoritos Globais isolada para evitar conflito de escopo.
