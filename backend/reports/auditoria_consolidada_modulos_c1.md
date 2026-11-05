# C1 — Auditoria consolidada dos módulos backend

Data: **04/11/2026**, America/Sao_Paulo. Auditoria estática e documental.

## 1. Resumo executivo e alcance da evidência

O código atual contém Dashboard V1, Visualizações Qualificadas V2, gestão de usuários, autenticação com sessões renováveis, Histórico de Alterações e Feedback F1–F4. Os favoritos disponíveis ao visitante são locais. **Favoritos Globais continuam na proposta 2.1; Acessos Gerais não possuem implementação analítica própria.** Não há fundamento para apresentar V2 como visitantes únicos, sessões de navegação ou audiência total do portal.

O diagnóstico inicial confirmou branch `development/backend`, HEAD `66fc3733e33ff0ba932b4ddfc6f55c5c1139a548` e árvore/índice limpos. A referência coincide com o pedido. O histórico local contém F2 (`28551f9`), F3 (`f74d888`), F4 (`5047f3d`) e a correção de preparação do CI (`66fc373`). Não houve fetch ou atualização de referências.

As flags versionadas de métricas e Feedback estão falsas por padrão. Isso caracteriza **implantação/ativação pendente**, não funcionalidade defeituosa. Configurações privadas e ambiente publicado não foram inspecionados; este relatório não certifica o estado efetivo de produção.

Principais pontos para revisão:

- A desativação de usuário impede autenticação enquanto `isActive=false`, mas não revoga sessões nem incrementa `tokenVersion`. Reativar antes do vencimento pode permitir reutilizar credenciais anteriores. É uma consequência verificável do código, ainda sem reprodução dinâmica C1 ou decisão sobre a política desejada.
- As duas diferenças históricas de `ON UPDATE` nas FKs de autenticação permanecem entre migration e schema. Não são uma nova regressão de Feedback.
- Retenção, chaves, HTTPS, proxies confiáveis, alertas, backups e responsabilidade institucional precisam de preparação no destino definitivo antes de ativação. Scripts existentes não equivalem a tarefas instaladas.
- Há documentação histórica com pendências já superadas, como F3 ainda descrita como futura e a contagem antiga de 11 migrations. O estado corrente é discriminado abaixo, sem reescrever os documentos antigos.

**Níveis de evidência usados:** E1 = código/configuração/teste lido neste checkout; E2 = resultado registrado em relatório histórico local, não reexecutado; E3 = execução/jobs do CI remoto conferidos pela API pública, com os limites indicados abaixo. “Testado” nas matrizes significa evidência E2/E3, nunca execução nesta auditoria. A presença de um teste (E1) não prova, por si só, sua aprovação.

O [Actions 41832249900](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41832249900), tentativa 1, foi **reconfirmado pela API pública em C1**: branch e SHA iguais aos locais, evento push, estado completed e conclusão success. O [job backend 126582084764](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41832249900/job/126582084764) concluiu com sucesso às 09:51:01 de 04/11/2026, São Paulo; o [job frontend 126582085275](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41832249900/job/126582085275), às 09:48:03. Todas as etapas retornadas nesses dois jobs têm conclusão success, incluindo a etapa das 12 migrations/regressões, proxy, testes frontend, build e audits. A falha TLS inicial no sandbox foi superada por consulta autorizada fora dele, sem tokens ou nova execução de CI.

Os totais **612/612 backend**, **619/619 frontend** e **12 migrations** foram informados no pedido e estão registrados na homologação local F4; a correção CI também documenta 619 testes em Linux limpo. **Não foram baixados os logs completos do CI:** os metadados remotos confirmam sucesso de jobs/etapas, não permitem recontar casos ou verificar cada checksum. Essa distinção permanece na matriz de evidências.

Não foram executados testes, lint, build, Vite, Docker, Prisma CLI, migrations, seeds, imports ou conexões a banco. Nenhum acesso a `patrimonio_guarulhos`. A única entrega é este arquivo; código, flags, relatórios históricos e dependências permanecem intactos. Sem commit, push ou deploy.

## 2. Arquitetura e inventário corrente

Fontes estruturais: [app.js](../src/app.js), [routes/index.js](../src/routes/index.js), [services/index.js](../src/services/index.js), [schema.prisma](../prisma/schema.prisma) e [App.jsx](../../frontend/src/App.jsx).

Express monta o POST público de Feedback antes do CORS/parser gerais e as métricas antes do parser JSON geral. Cada ingestão tem validação/limites próprios. Rotas administrativas usam autenticação e autorização; controllers adaptam HTTP e delegam aos serviços. Há implementações com Prisma e SQL parametrizado; Feedback usa um pool `pg` próprio com a mesma URL da API, apesar de seus modelos também estarem descritos no Prisma.

`services/index.js` é a fronteira real/demo: com `MOCK_DATA=true`, importa implementações em memória e não avalia os serviços reais. `runtime.js` recusa demo em `NODE_ENV=production`, gera segredos efêmeros e diretório temporário de uploads. Isso não é um fallback automático quando o banco real falha.

| Funcionalidade existente | Entrada/serviço principal | Persistência | Limite de escopo |
| --- | --- | --- | --- |
| Catálogo público e detalhe | `/api/patrimonios`, `patrimonioService.js` | Patrimonio, Categoria, PatrimonioCategoria, Localizacao, RegiaoPatrimonio | Publicação/canonicidade controladas no serviço; GET não grava visualização |
| Edição e publicação patrimonial | `/api/admin/patrimonios`, `patrimonioService.js` | Acervo e AuditLog | Criação em rascunho; não há DELETE físico de patrimônio nessa API |
| Fatos, ligações e organização | `patrimonioEditorialRoute.js` e `patrimonioEditorialService.js` | PatrimonioFato, PatrimonioLigacao, acervo, AuditLog | Operações editoriais; não são eventos de navegação |
| Imagens, documentos e referências | `adminPatrimonioRoute.js`, `adminImageRoute.js`, `adminReferenciaRoute.js`; serviços de mídia/referência | PatrimonioImagem, PatrimonioDocumento, AuditLog; arquivos | Referências usam o modelo de documento, sem modelo Prisma Referencia separado |
| Regiões | `/api/regioes`, `/api/admin/regioes`, `regiaoService.js` | RegiaoPatrimonio, AuditLog | Região editorial do bem, não localização do visitante |
| Exposições e novidades | Rotas públicas/administrativas correspondentes; `conteudoService.js` | Exposicao, Novidade (fontes em JsonB), AuditLog | EDITOR trabalha em rascunhos; publicação/arquivamento/exclusão ADMIN |
| Usuários e sessões | `/api/admins`, `/api/auth/*` | User, AuthSession, RefreshToken, AuditLog | Contas de equipe; não há cadastro de visitantes |
| Painéis e histórico | Rotas dashboard/auditoria/feedback | Acervo, métricas, AuditLog, Feedback | Permissões distintas, detalhadas adiante |
| Favoritos locais | `favoritosStore.js`, `useFavoritos.js`, `FavoritoButton.jsx` | localStorage/memória | Sem endpoint, login ou sincronização entre dispositivos |
| Estruturas sem API montada correspondente | `siteHeroRoute.js`, `siteHeroService.js`; modelos Rota/RotaPatrimonio | SiteHero, Rota, RotaPatrimonio | Existência no schema/arquivo não comprova recurso publicado; o router de SiteHero não é montado no índice atual |

## 3. Matriz consolidada de integração

Todos os endpoints abaixo incluem `/api`. “Sem flag própria” não dispensa autenticação. Prioridades: **P1** = decisão/preparação antes da ativação ou próxima implementação; **P2** = desenvolvimento autorizado ou melhoria posterior; **P3** = manutenção documental. A descrição completa das pendências está nas seções seguintes.

| Módulo/funcionalidade | Arquivos e endpoints principais | Modelos Prisma | Permissão | Flags | Testes disponíveis | Evidência | Status | Pendência concreta | Prioridade |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V1: quatro gráficos e total do acervo | `dashboardRoute.js`, `dashboardService.js`, `dashboardApi.js`, `AdminDashboard.jsx`, `GraficosDashboard.jsx`; GET `/admin/dashboard` | Patrimonio, Categoria, PatrimonioCategoria, Localizacao, RegiaoPatrimonio | ADMIN/EDITOR | Sem própria | `dashboard.test.js`, `dashboard.integration.test.js`, `AdminDashboard.test.jsx` | E1; E2 V1/F4 | Implementado; testado historicamente | Preservar contrato e base todos os status | P2 |
| V2: qualificação/ingestão | `metricasRoute.js`, `metricasService.js`, `cookieMetricasService.js`, `useVisualizacaoPatrimonio.js`; POST `/metricas/visualizacoes/sessao`, POST `/metricas/visualizacoes`, DELETE `/metricas/visualizacoes/sessao` | VisualizacaoUnicaDia, VisualizacaoTotalDia, Patrimonio; controles de operação | Público com participação/cookie/origem próprios | `METRICAS_COLETA_ATIVA`, `VITE_METRICAS_ATIVAS` | `metricas*.test.js`, `limiteMetricas.test.js`, `useVisualizacaoPatrimonio.test.jsx`, `coletaMetricas.test.js`, `metricasPublicasApi.test.js` | E1; E2 1.1–1.4C/F4 | Implementado; testado; padrão desativado | Política, chaves, HTTPS e quotas definitivas | P1 |
| V2: consulta e cobertura | `dashboardMetricasService.js`, `coberturaMetricasService.js`, `MetricasDashboard.jsx`; GET `/admin/dashboard/metricas` | Totais diários, Patrimonio, RegiaoPatrimonio, OperacaoMetricas, SondaMetricas | ADMIN/EDITOR | `METRICAS_CONSULTA_ATIVA` | `dashboardMetricas.test.js`, `MetricasDashboard.test.jsx`, `metricasDashboard.test.js` | E1; E2 1.4/F4 | Implementado; testado; padrão desativado | Instalar observação; não inferir coleta desde sempre | P1 |
| V2: retenção/sonda | `operacaoMetricasService.js`, `reter_metricas.js`, `observar_metricas.js`, exemplos `infra/systemd/` | Recibos, totais, OperacaoMetricas, DiaMetricasConferido, SondaMetricas | Operador PostgreSQL dedicado | Configuração operacional explícita | `operacaoMetricas.test.js`, `operacaoMetricas.integration.test.js` | E1; E2 1.4A–C | Implementado; testado; instalação pendente | Dono, agenda, alertas e restauração | P1 |
| Gestão de usuários | `adminRoute.js`, `adminService.js`, `adminApi.js`, `AdminUsuarios.jsx`; POST/GET `/admins`, GET/PATCH `/admins/:id`, PATCH `/admins/:id/status` | User, AuditLog | ADMIN | Sem própria | `adminManagement.test.js`, `admin*.test.js`, `AuthFlows.test.jsx` | E1; E2 H2/F4 | Implementado; testado historicamente | Revisar efeito da reativação sobre sessões anteriores | P1 |
| Login, refresh, logout e senha | `authRoute.js`, `authService.js`, `authenticate.js`, `AuthContext.jsx`, `api.js`; POST `/auth/login`, `/refresh`, `/logout`; PATCH `/auth/senha` | User, AuthSession, RefreshToken; AuditLog na troca de senha | Login por credenciais; refresh/logout por refresh token; senha ADMIN/EDITOR | TTLs, sem feature flag | `refreshSessions.integration.test.js`, `authRevocation.integration.test.js`, `authPassword*.test.js`, `RefreshFlows.test.jsx`, `AuthFlows.test.jsx` | E1; E2 H2/F4 | Implementado; testado historicamente | Decidir revogação na desativação; revisão separada das FKs | P1 |
| Histórico de Alterações | `auditoriaRoute.js`, `auditoriaService.js`, `utils/auditoria.js`, `AdminAuditoria.jsx`, `formatarAuditoria.js`; GET `/admin/auditoria`, `/:id` | AuditLog e relações de identificação | ADMIN | Sem própria | `auditoria*.test.js`, `AdminAuditoria.test.jsx`, `formatarAuditoria.test.js`; harness H2 opt-in | E1; E2 H1/H2/F4 | Implementado; testado historicamente | Leitor de tela/aparelhos; não ampliar eventos implicitamente | P2 |
| Feedback F2/F3: envio | `feedbackRoute.js`, `feedbackService.js`, `feedbackPublicoApi.js`, `Feedback.jsx`; POST `/feedback` | Feedback, ReciboFeedback | Público; não usa sessão de equipe | `FEEDBACK_RECEBIMENTO_ATIVO`, `VITE_FEEDBACK_ATIVO` | `feedback.test.js`, `feedbackSeguranca.test.js`, `feedback.integration.test.js`, `Feedback.test.jsx`, `feedbackPublicoApi.test.js` | E1; E2 F2/F3/F4; E3 CI | Implementado; testado; padrão desativado | Aviso, responsável, infraestrutura e descarte antes de ativar | P1 |
| Feedback F4: administração | `adminFeedbackRoute.js`, `AdminFeedback.jsx`, `FeedbackDashboard.jsx`, `feedbackDashboard.js`; GET `/admin/feedback`, `/resumo`, `/:id` | Feedback; recibos não expostos ao ADMIN | ADMIN | `FEEDBACK_CONSULTA_ATIVA` | `feedback.integration.test.js`, `AdminFeedback.test.jsx`, `feedbackDashboard.test.js`; harness F4 opt-in | E1; E2 F4; E3 CI | Implementado; testado; padrão desativado | Operação definitiva e acessibilidade complementar | P1 |
| Feedback: descarte | `descartar_feedback.js`, `permissoes_feedback.sql` | Feedback, ReciboFeedback | `portal_feedback_operador` | Autorização operacional e destino/backup explícitos | `feedback.integration.test.js`, SQL de integridade; F4 | E1; E2 F2/F4 | Implementado; testado; agenda pendente | Script bloqueia banco nominal real e exige PostgreSQL 17; preparar fluxo definitivo autorizado | P1 |
| Favoritos locais | Store/hook/botão; Início e catálogo | Nenhum | Visitante, sem autenticação | Sem própria | `Inicio.test.jsx`, `participacaoMetricas.test.jsx`; harness 1.4C | E1; E2 1.4C/F4 | Implementado; testado historicamente | Preservar formato e intenções ao implementar globais | P2 |
| Favoritos Globais | Documento fase 2.1; DTO V2 contém apenas `favoritos.disponivel=false` | Nenhum implementado; IdentidadeFavoritos/FavoritoGlobal apenas propostos | ADMIN/EDITOR propostos para agregados | Apenas propostas, não configuradas | Plano 2.1; sem suíte da funcionalidade global | E1 documental | Pendente de aprovação/implementação | Resolver decisões 2.1 e autorizar 2.2 | P1 decisão; P2 código |
| Acessos Gerais | Sem coletor/endpoint/modelo específico | Nenhum | A definir | Nenhuma | Sem suíte específica | E1: inventário e buscas em código/schema | Pendente de definição | Unidade, privacidade, sessões, deduplicação, retenção e agregações | P1 definição |

## 4. Visualizações Qualificadas V2

### Evento e deduplicação

[PatrimonioDetalhe.jsx](../../frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx) chama o hook apenas após detalhe sem erro/carregamento, sem edição/preview, sem mock e sem perfil ADMIN/EDITOR conhecido. [useVisualizacaoPatrimonio.js](../../frontend/src/hooks/useVisualizacaoPatrimonio.js) exige UUID, flag frontend e escolha `aceita`; acumula **2.000 ms visíveis**, pausa ao ocultar e cancela em desmontagem/troca. A preferência GPC prevalece no [participacaoStore.js](../../frontend/src/features/metricas/participacaoStore.js).

O servidor recebe apenas `patrimonioId`, confere patrimônio publicado/canônico e usa o dia da credencial validada em São Paulo. Não aceita quantidade, data ou região arbitrárias. Cookie diário assinado com nonce aleatório de 32 bytes; chave persistida é HMAC derivado por dia/finalidade/patrimônio. Não armazena cookie cru, IP, User-Agent, página, rota ou identificador de sessão de navegação nesses modelos.

Em [metricasService.js](../src/services/metricasService.js), a PK `(dia, patrimonioId, chaveVisitante)` e o INSERT com `ON CONFLICT DO NOTHING` tornam recibo/incremento atômicos. Duplicata não incrementa. Locks de manutenção e do patrimônio evitam escrita em dia fechado e validam o status sob lock. Não há retry automático de escrita no serviço.

A coordenação frontend usa fila por aba e Web Locks quando disponíveis, cache de prazo sem segredo e no máximo duas tentativas do evento no mesmo dia/credencial. Bootstrap não é repetido automaticamente após resposta incerta. Não há fila offline. Após a virada, exige nova qualificação. O servidor não comprova os dois segundos nem humanidade; essa condição é aplicada pelo cliente. Não foi encontrado filtro de User-Agent para robôs no router atual, embora o plano antigo mencione robôs conhecidos. Não atribuir ao código essa proteção proposta.

### Origem, abuso, consulta e retenção

[metricasRoute.js](../src/routes/metricasRoute.js) exige origem exata, `X-Portal-Metricas: 1`, rejeita `Sec-Fetch-Site: cross-site`, confere Host/transporte, usa JSON estrito de 2 KB sem compressão e cookie diário válido no evento. O cliente público envia cookie same-origin, sem JWT/interceptador administrativo. HTTPS usa `__Host-portal_metricas`, Secure/HttpOnly/Lax/Path=/; HTTP é restrito ao desenvolvimento loopback. DELETE de retirada continua disponível com coleta desligada, sujeito à origem/finalidade, e limpa o cookie sem decrementar agregados.

Quotas reais da API: rede 600/minuto, credencial válida 30/minuto, nova emissão 60/minuto e 120/hora por rede; buckets HMAC efêmeros limitados a 10.000 entradas. São locais ao processo. Nginx acrescenta quotas/conexões por peer e instância; workers compartilham zona, hosts distintos não. Isso limita abuso, sem garantir unicidade de pessoa ou impedir automação.

GET `/api/admin/dashboard/metricas` exige ADMIN/EDITOR. Consulta desativada retorna `{disponivel:false,motivo:"DESATIVADA"}`. Quando ativa, usa RepeatableRead READ ONLY, período inclusivo até 366 dias, filtros de patrimônio/região ou sem região, ranking paginado, série diária e totais como strings decimais. Região é a **atual do cadastro**; arquivamento posterior não apaga história. O frontend valida contrato/somas e trata cobertura separadamente. Favoritos continuam indisponíveis no DTO, sem contagem fictícia.

A retenção conserva sete dias encerrados mais o corrente de recibos; exclui dias anteriores ao piso de hoje menos sete dias. Agregados e sondas têm corte de 13 meses civis, ajustado ao fim do mês. Antes de purgar recibos, confere igualdade com agregados, sela o dia e apaga em lotes; divergência interrompe, sem corrigir números silenciosamente. Pisos duráveis impedem reapresentar dados parcialmente purgados. Fontes: [operacaoMetricasService.js](../src/services/operacaoMetricasService.js) e [guia operacional](../docs/operacao_metricas.md).

Sonda de cinco minutos confere configuração, health e privilégios; não gera visualização sintética e não prova sucesso contínuo da ingestão. `inicioObservacao` não é início da audiência; `inicioColeta` permanece null. Dias sem observação/fora da retenção não autorizam inferir zero. Exemplos systemd existem, mas C1 não verificou instalação no host final.

No modo demo, configuração V2 força coleta/consulta em memória com segredo próprio e HTTP local; frontend continua dependente da sua flag/participação. A cobertura demo é `NAO_INSTRUMENTADA`, sem PostgreSQL nem retenção real. Evidências históricas: [1.1](dashboard_v2_fase_1_1.md), [1.2](dashboard_v2_fase_1_2.md), [1.3](dashboard_v2_fase_1_3.md), [1.4A](dashboard_v2_fase_1_4a.md), [1.4B](dashboard_v2_fase_1_4b.md), [1.4C](dashboard_v2_fase_1_4c.md). Não foram repetidas.

## 5. Gestão de usuários, autenticação e permissões

### Operações e sessão

[adminService.js](../src/services/adminService.js) cria, lista, consulta, atualiza nome/e-mail/perfil e altera situação. Não oferece DELETE nem reset administrativo de senha. Normaliza e-mail, omite hashes no DTO, limita página a até 100 itens e protege contra auto-rebaixamento, auto-desativação e retirada do último ADMIN ativo. Edições/status bloqueiam ADMINs ativos e alvo em ordem de UUID. Operação e AuditLog usam a mesma transação; status repetido não gera nova alteração.

Senhas novas exigem ao menos 12 caracteres Unicode e no máximo 72 bytes UTF-8, com bcrypt custo 12. Login aceita senha antiga não vazia até 72 bytes; não aplica retrospectivamente o mínimo novo. Troca exige senha atual e diferença em relação à nova. O indicador visual de força não acrescenta requisitos arbitrários ao contrato backend.

[authService.js](../src/services/authService.js) emite JWT HS256 com `sub`, `sid`, `tokenVersion`, `iat` e `exp`; padrão de acesso 300 s, limitado ao vencimento absoluto da sessão de 28.800 s. `AuthSession` mantém criação, vencimento e revogação; `RefreshToken` guarda SHA-256 do token opaco, criação e uso. Refresh gira o token sem prolongar a sessão. Reuso revoga a família/sessão, com confirmação transacional antes do erro. Logout por refresh token é idempotente; troca de senha incrementa versão e revoga todas as sessões do usuário na mesma transação do evento auditável.

[authenticate.js](../src/middlewares/authenticate.js) valida assinatura e consulta usuário/sessão a cada pedido, usando o perfil atual do banco. Só emite `ACCESS_TOKEN_EXPIRED` após confirmar sessão válida; a recusa antecede o handler de negócio. Conta inativa, sessão revogada/expirada ou versão divergente são rejeitadas. Mudança de perfil afeta autorização subsequente sem depender do perfil salvo no frontend.

**Limitação comprovável estaticamente:** `changeAdminStatus` modifica `isActive` e registra auditoria, mas não altera `tokenVersion` ou `AuthSession.revokedAt`. Se a conta for reativada dentro do prazo e nenhuma outra causa tiver revogado a sessão, credenciais anteriores podem voltar a passar nas verificações. Os testes existentes verificam bloqueio durante inatividade e reativação do cadastro; o teste de refresh reativa incrementando a versão diretamente na fixture. Isso não demonstra revogação durável pelo endpoint de status. Recomenda-se decidir a política e, em tarefa autorizada, testar a sequência HTTP login → desativar → reativar → usar JWT/refresh anteriores. Não se afirma exploração em produção nem se altera autenticação nesta fase.

### Frontend e respostas atrasadas

[AuthContext.jsx](../../frontend/src/context/AuthContext.jsx) mantém credenciais em sessionStorage, adapta `name/role` para `nome/perfil` e protege login por geração. Restauração inicial confere formato/prazo local; não é consulta de autorização ao servidor. [api.js](../../frontend/src/services/api.js) identifica sessão/token por pedido, coordena refresh único por sessão e repete uma vez após expiração explicitamente renovável. Resposta 401 antiga não encerra sessão substituída/renovada; refresh atrasado não substitui credenciais novas. Resultado incerto da rotação bloqueia sua repetição automática.

Logout limpa estado local imediatamente; falha remota é identificada como `logoutLocal`, sem prometer revogação confirmada. sessionStorage é acessível a scripts da origem: exposição em caso de XSS é um risco arquitetural, **não evidência de XSS encontrado**. Não confundir o `sessionId` local de correlação com sessão analítica de visitante ou campo do AuditLog.

`AdminUsuarios.jsx` cobre carregamento, vazio, erro com recarga, filtros, paginação, formulário ocupado e conflitos 400/409. Cancelamento da lista impede aplicação de resposta de filtro anterior. `editar(id)` não usa cancelamento/geração equivalente ao da lista; validar respostas tardias após navegação/encerramento é uma lacuna de robustez a avaliar, não vazamento comprovado. Testes `AuthFlows.test.jsx`/`RefreshFlows.test.jsx` e testes backend de gestão/senha/sessão cobrem os fluxos existentes; não foram executados em C1.

### Mapa de autorização efetiva

| Operação | Backend | Consumidor/observação |
| --- | --- | --- |
| V1 e V2 administrativas | ADMIN/EDITOR | `/admin`, seção V2; compatível |
| Gestão de usuários | ADMIN em todos os endpoints `/admins` | `/admin/usuarios` protegida e menu restrito |
| Histórico e Feedback administrativo | ADMIN em lista/resumo/detalhe aplicáveis | Rotas/menu restritos; EDITOR recebe 403 |
| Alterar própria senha | ADMIN/EDITOR autenticado | `/admin/senha`; senha atual obrigatória |
| Criar/editar patrimônios e conteúdo | ADMIN/EDITOR, com regras de rascunho no serviço | Não basta verificar papel na rota; status é validado novamente |
| Publicar/arquivar e excluir exposições/novidades ou mídia | ADMIN | Não há DELETE físico de patrimônio |
| Fatos/ligações: criar, editar, ordenar, excluir | ADMIN/EDITOR; EDITOR limitado a rascunho | Exceção à generalização “todo DELETE é ADMIN” |
| Regiões administrativas | GET ADMIN/EDITOR; POST/PATCH ADMIN | Página de gestão é ADMIN; leitura por EDITOR atende formulários, não concede gestão |
| Catálogo e mídias públicas | Público conforme status; mídia usa autenticação opcional para acesso privado | Não publicar uploads privados por static indiscriminado |

## 6. Histórico de Alterações: eventos realmente emitidos

Fontes: chamadas de `registrarAuditoria` em serviços e [utils/auditoria.js](../src/utils/auditoria.js). A enumeração de constantes gera combinações que não têm emissor. Ela não é prova de cobertura universal.

| Entidade/serviço emissor | Eventos comprovados no caminho de negócio |
| --- | --- |
| User — `adminService`, `authService` | `USER_CREATE`, `USER_UPDATE`, `USER_ACTIVATE`, `USER_DEACTIVATE`, `USER_PASSWORD_CHANGE` |
| Patrimonio — `patrimonioService` | `PATRIMONIO_CREATE`, `PATRIMONIO_UPDATE`, `PATRIMONIO_PUBLISH`, `PATRIMONIO_ARCHIVE` |
| RegiaoPatrimonio — `regiaoService` | `REGIAO_CREATE`, `REGIAO_UPDATE`; desativação é UPDATE de `ativo` |
| PatrimonioImagem — `imageService`, `midiaService` | `IMAGEM_CREATE`, `IMAGEM_UPDATE`, `IMAGEM_DELETE`; inclui troca de principal e IDs afetados |
| PatrimonioDocumento — `midiaService`, `referenciaService` | `DOCUMENTO_CREATE`, `DOCUMENTO_UPDATE`, `DOCUMENTO_DELETE` |
| PatrimonioFato/PatrimonioLigacao — `patrimonioEditorialService` | `FATO_*` e `LIGACAO_*`: CREATE/UPDATE/DELETE/REORDER |
| Exposicao/Novidade — fábrica `conteudoService` | CREATE/UPDATE/PUBLISH/ARCHIVE/DELETE de cada entidade |

Não há emissor HTTP de `USER_DELETE`, `PATRIMONIO_DELETE` ou `REGIAO_DELETE`. Login, logout, refresh, leitura de painel, leitura de auditoria, envio/consulta/descarte de Feedback, visualizações e favoritos locais **não geram esses eventos AuditLog**. Alguns geram logs operacionais próprios; isso não os torna registros do Histórico. Scripts/importações não estão automaticamente cobertos por uma interceptação universal: só a chamada explícita ao serviço/registrador gera evento.

Operação e registro usam o cliente da mesma transação; o registrador não absorve falha. Alterações sem diferença permitida são omitidas, e troca de senha registra evento sem valores. Arquivos físicos não pertencem à transação SQL: serviços de mídia usam quarentena/compensação; não prometer atomicidade distribuída perfeita entre filesystem e PostgreSQL.

Allowlist por entidade exclui senha/hash/token e propriedades arbitrárias. Há seleção específica de localização, categorias adicionais, listas de ordem e fontes. URLs permitidas perdem credenciais, query e fragmento; protocolos/caminhos inválidos são descartados. Snapshot em memória conserva o necessário para detectar diferença, mas a sanitização é reaplicada antes de persistir e ao ler legado. Isso não é um detector universal de informações pessoais digitadas em texto livre permitido.

[auditoriaService.js](../src/services/auditoriaService.js) lista sem `oldValues/newValues`; pagina por `createdAt DESC,id DESC` em RepeatableRead. Filtros: ator, ação, entidade, ID do alvo e instantes ISO de início/fim; limite padrão 20, máximo 100. Detalhe sanitiza novamente e identifica o patrimônio pai por valores, registro atual ou evento CREATE/DELETE anterior quando necessário. Modelos armazenam apenas ID, ator, ação, entidade, alvo, valores e data; **não há sessão, URL da página ou rota navegada**.

O [formatador frontend](../../frontend/src/features/admin/formatarAuditoria.js) e `AdminAuditoria.jsx` derivam narrativas/ seção do tipo do recurso, preservam UUID do alvo, indicam cadastro atual do ator e tratam responsável ausente, ação desconhecida, diferenças omitidas e valores null/vazio/zero/false. Conteúdo é texto escapado, sem execução HTML. Identificação atual do ator não é snapshot histórico do seu nome.

[H1](historico_alteracoes_h1.md) documenta interface/contrato; [H2](historico_alteracoes_h2.md) registra 29 operações reais em fixture, cinco casos legados sintéticos, filtros/paginação, 21 aberturas de detalhe, permissões, refresh e falha real de banco. H2 registrou 581 testes backend e 505 frontend naquele estágio; esses números não são o total atual F4. H2 não foi repetida. Leitor de tela e aparelhos físicos continuam fora da evidência histórica.

## 7. Feedback F1–F4

### Persistência e idempotência

[F1](../docs/feedback_fase_f1_arquitetura.md) é a arquitetura; [F2](feedback_fase_f2_backend.md), [F3](feedback_fase_f3_frontend.md) e [F4](feedback_fase_f4_homologacao.md) registram as implementações/homologações. O código atual prevalece sobre frases “futuro” desses documentos.

`Feedback` armazena UUID, tipo ELOGIO/SUGESTAO/PROBLEMA, mensagem até 2.000 caracteres, versão do aviso, recebimento e expiração. `ReciboFeedback` armazena digest da chave, HMAC do conteúdo, versão da chave, vínculo único opcional e prazos. Não há nota, nome, e-mail, IP, sessão, patrimônio, página ou rota de origem. `notas.disponivel=false` é parte explícita do resumo.

[feedbackService.js](../src/services/feedbackService.js) usa SQL parametrizado, transação curta, lock por digest e relógio PostgreSQL obtido depois da espera. INSERT do Feedback e recibo é atômico; unicidade do recibo é a autoridade. Primeiro commit confirmado retorna 201; repetição da mesma chave/conteúdo em recibo vigente retorna 200 sem nova gravação. Conteúdo divergente e recibo vencido retornam 409 distintos. Conflito de unicidade só permite leitura após rollback, sem nova tentativa de INSERT. Falha/timeout de COMMIT pode ser incerta; o serviço não a trata como rollback comprovado.

Recebimento desligado com origem/chaves preservadas ainda permite confirmar recibo vigente. Sem configuração de ingestão, não consulta nem recibos. Chaves antigas precisam durar até expirar o último recibo respectivo; aviso antigo pode ser confirmado por replay. **Garantia de deduplicação é limitada à existência/janela do recibo**: depois da purga, a mesma chave não dispõe de memória permanente de uso. O cliente impede reenvio da pendência após 24 h; não anunciar idempotência eterna.

### POST público, formulário e segurança

Router próprio antes do CORS geral: origem exata, Host/transporte, finalidade `X-Portal-Feedback`, validação de cabeçalhos duplicados, preflight restrito, JSON UTF-8 de 16 KB sem compressão, schema estrito e chave canônica de 32 bytes base64url. Mensagem é normalizada CRLF → LF, NFC e trim, contada por pontos Unicode e validada contra controles/surrogates inválidos. API não exige JWT/cookie nem os usa para vincular Feedback a identidade administrativa.

Quotas da aplicação: 5/minuto e 20/hora por rede, 60/minuto global, até 10.000 buckets efêmeros com IPv6 /64. Nginx tem quotas próprias, caminho exato, query/subcaminho recusados, timeouts, 16 KB, `proxy_next_upstream off`, remoção de Authorization/Cookie no POST e `Retry-After`. Não há garantia de humanidade; réplicas precisam de coordenação externa de quotas.

[feedbackPublicoApi.js](../../frontend/src/services/feedbackPublicoApi.js) usa fetch relativo, `credentials:omit`, no-store, no-referrer e redirect error, sem interceptador JWT. [Feedback.jsx](../../frontend/src/pages/Feedback/Feedback.jsx) só envia após ação explícita e flag; mantém corpo/chave da tentativa em memória, bloqueia edição de pendência, distingue sucesso/incerteza/limite/desativação/aviso expirado e oferece reenvio explícito dentro da janela. Não persiste comentário/chave no storage nem dispara retry automático. Recarga perde a pendência; não prometer recuperação durável. O teste frontend de equivalência importa o schema backend real.

### Consulta ADMIN, F4 e datas brasileiras

GET de lista/resumo/detalhe exige ADMIN; visitante recebe 401, EDITOR 403. Cache privado no-store. Lista omite mensagem; só detalhe a inclui. Lista e resumo usam transações RepeatableRead READ ONLY independentes: cada resposta é consistente, mas não existe fotografia única garantida entre duas requisições separadas.

Período civil inclusivo até 366 dias, sem futuro, convertido para intervalo semiaberto em `America/Sao_Paulo`. Lista ordenada por data/UUID decrescentes, padrão 20 e máximo 100. Expirados são excluídos antes da limpeza; detalhe expirado retorna 404. Resumo conta registros ainda retidos, por tipo e dia/mês, com strings decimais, marcação de períodos parciais e limite de retenção. Zeros nesse resumo não provam que o recebimento esteve ativo: não há cobertura operacional de Feedback equivalente à V2.

`AdminFeedback.jsx` é página própria `/admin/feedback`, com `FeedbackDashboard`/gráficos lazy; não substitui os quatro gráficos V1. Campos visíveis usam **dd/mm/aaaa**, convertidos/validados por [feedbackDashboard.js](../../frontend/src/features/admin/feedbackDashboard.js); payload usa ISO civil. Instantes são apresentados em pt-BR e São Paulo, meses em mm/aaaa. Valida somas e preserva precisão com BigInt; números inseguros não devem virar gráfico arredondado. Estados de carregamento, erro, indisponível, vazio e detalhe 404 são distintos; cancelamento impede aplicar respostas antigas. Mensagem aparece literalmente, sem HTML executável.

### Retenção, papéis e operação

Prazos técnicos: Feedback **180 × 24 h**; recibo **24 h**, sem renovação. FK `ON DELETE SET NULL` permite retirar mensagem conservando confirmação vigente. Não há DELETE HTTP ou gestão de status de atendimento. [permissoes_feedback.sql](../scripts/sql/permissoes_feedback.sql) limita API a SELECT/INSERT; operador de descarte lê apenas IDs/prazos necessários e pode DELETE, sem ler mensagem, aviso, HMAC ou usuários. Operador de métricas não recebe acesso ao Feedback. A migration fecha os grants padrão da API atomicamente ao criar tabelas.

[descartar_feedback.js](../scripts/descartar_feedback.js) confere host/porta/banco/cluster/papel em READ ONLY; execução exige autorização explícita e backup recente não vazio. Remove um lote de até 500 por tabela na CLI, sem loop/timer instalado ou repetição de falha. **Bloqueia `patrimonio_guarulhos` e exige versão 17.x**. Portanto, não é rotina pronta para executar no banco real nominal: destino/versão e procedimento final precisam de revisão autorizada, não remoção improvisada das guardas. Conferência de existência/idade do backup não comprova restaurabilidade.

`infra/nginx.conf` é montado pelo Compose normal; `frontend/nginx.conf` é a configuração da imagem. F4 documenta ensaio de ambos, HTTPS de fixture e resposta perdida real. Logs de Feedback são mínimos, e error log bruto dessas localizações é suprimido. Listener versionado é HTTP; TLS definitivo e cadeia de proxy continuam a decidir/validar. Não houve implantação destas configurações em C1.

Demo mantém flags de Feedback explícitas, segredos próprios, dados/recibos em memória e `demonstracao:true`; reinício perde dados. Diferentemente de V2, não força suas flags para true.

Pendências antes da ativação: equipe responsável, aviso final/versionamento, prazos e exclusões, agenda de descarte, restauração/backups, infraestrutura/TLS/peers, quotas entre réplicas, logs e alertas. Leitor de tela, zoom nativo e aparelhos físicos/carga final permanecem limites da homologação. Não refazer F2–F4 apenas porque essas decisões operacionais estão pendentes.

## 8. Dashboard V1: fontes e contratos dos quatro gráficos

Uma chamada GET `/api/admin/dashboard` alimenta o painel via `dashboardApi.js`. [dashboardService.js](../src/services/dashboardService.js) executa consultas sequenciais na mesma transação RepeatableRead READ ONLY.

| Indicador/gráfico existente | Campo/consulta | Base e interpretação |
| --- | --- | --- |
| Situação de conservação — donut | `Patrimonio.groupBy(situacao)` → `porSituacao` | Todos os status; inclui NAO_INFORMADO e DEMOLIDO |
| Distribuição por região — radar | `groupBy(regiaoId)` + cadastro → `porRegiao`, `semRegiao` | Região atual, inclusive inativa; sem região fora dos eixos, incluída na reconciliação do total |
| Categorias principais — barras | `groupBy(categoriaId)` + Categoria → `porCategoria` | Cada bem uma vez como principal; PatrimonioCategoria fornece secundárias em coluna separada, sem inflar total |
| Status de publicação — donut | `groupBy(status)` → PUBLICADO/RASCUNHO/ARQUIVADO | Publicação editorial, independente de conservação |

O cartão principal usa `Patrimonio.count()` e totais por status. “Usuários” é atalho ADMIN, não gráfico/contagem de audiência. A API ainda retorna `porBairro`, calculado via Localizacao, mas a interface atual usa **região**, não bairro, no radar. Legados permanecem incluídos na V1 e são identificados separadamente; não converter essa base em denominador das métricas públicas.

ADMIN e EDITOR podem consultar V1/V2; Feedback e Histórico são ADMIN. O consumidor atual reflete essa separação. Gráficos têm carregamento lazy, estados de falha/vazio e representações textuais. Não há fusão de V1, visualizações ou Feedback.

## 9. Persistência e migrations

A trilha principal contém **12 migrations SQL versionadas**, conferidas por inventário local, mais `migration_lock.toml`:

1. `20260929230000_initial_schema`
2. `20260930120000_add_demolido_situacao`
3. `20261005004508_categorias_adicionais`
4. `20261006014922_adicionar_detalhes_e_heroes`
5. `20261006180000_exposicoes_novidades`
6. `20261014010000_add_fatos_ligacoes`
7. `20261016120000_add_regioes_numero_ordem`
8. `20261020190000_add_user_token_version`
9. `20261021130000_add_auth_sessions`
10. `20261026120000_add_visualizacoes_metricas`
11. `20261027120000_add_operacao_metricas`
12. `20261102120000_add_feedback`

`prisma/lineages/equipe` é linhagem histórica separada; não somar suas migrations ao total nem usá-la como trilha corrente. Inventário de arquivos não comprova aplicação em banco. F4 registra deploy desde vazio, repetição sem pendências, checksums e integridade no PostgreSQL descartável; C1 não consultou `_prisma_migrations` nem recalculou/aplicou estado SQL.

A migration de AuthSession/RefreshToken omite `ON UPDATE` nas FKs para User/AuthSession; o schema não explicita `onUpdate`, deixando a expectativa padrão CASCADE. [1.4A](dashboard_v2_fase_1_4a.md) registra `migrate diff` com essas duas diferenças preexistentes. C1 confirmou a diferença textual, sem executar diff ou afirmar drift no banco real. Revisão própria deve decidir a intenção e preservar migrations históricas.

Não há modelos de Favoritos Globais, carregamento geral de página, sessão analítica ou visitante estimado. `AuthSession` é autenticação da equipe; `SiteHero.pagina` é configuração editorial; nenhum deles é mecanismo de audiência. Modelos de visualizações não permitem reconstruir percurso individual entre patrimônios pela chave persistida, pois a derivação inclui o patrimônio.

## 10. Flags, demo e diferenças documentais

| Configuração | Comportamento comprovado no código |
| --- | --- |
| `MOCK_DATA=false` | Serviços reais; demo só quando explicitamente true e fora de production |
| `METRICAS_COLETA_ATIVA=false` | Novos eventos/sessão indisponíveis; retirada do cookie continua possível; não exige chaves de coleta |
| `METRICAS_CONSULTA_ATIVA=false` | Endpoint ADMIN/EDITOR responde indisponível, sem transformar falta de coleta em zero |
| `VITE_METRICAS_ATIVAS=false` | Frontend não inicia participação/coleta; não é autorização backend |
| `FEEDBACK_RECEBIMENTO_ATIVO=false` | Recusa novos envios; replay vigente possível se configuração de ingestão preservada |
| `FEEDBACK_CONSULTA_ATIVA=false` | Consulta ADMIN retorna desativada, após autenticação/validação |
| `VITE_FEEDBACK_ATIVO=false` | Formulário/descoberta pública desabilitados; não substitui flag do servidor |
| Flags de Favoritos Globais | Só propostas na 2.1; não existem na implementação corrente |

Valores acima são padrões dos exemplos/código/workflow lidos, não inspeção de processos reais. O Compose normal não foi executado. Configurações finais precisam prever passagem das variáveis backend e build frontend; não basta editar um exemplo ou presumir que VITE muda em runtime.

Discrepâncias documentais comprovadas, de baixa prioridade e sem reescrita nesta entrega: `backend/.env.example` e guia F2 ainda dizem que a flag F3 é futura; guia V2/arquitetura 2.1 referem 11 migrations, anteriores ao Feedback; relatórios F4/correção CI falam em futura publicação/CI. O pedido informa que a publicação e CI já ocorreram. Esses textos são fotografias históricas, não evidência de ausência do código atual.

## 11. Testes, workflow e limites da aprovação

Fontes: [.github/workflows/predeploy.yml](../../.github/workflows/predeploy.yml), [homologar_feedback.js](../scripts/homologar_feedback.js), [validar_metricas_test.js](../scripts/validar_metricas_test.js), testes relacionados na matriz e relatórios históricos.

| Evidência | O que sustenta | O que não sustenta |
| --- | --- | --- |
| F4 local: 612 backend, 619 frontend/34 arquivos, 12 migrations | Integração com banco isolado, regressões e contratos no ensaio descrito | Nova aprovação C1, estado da produção ou ativação autorizada |
| Correção CI: 51 casos de contrato e 619 frontend em Linux limpo | Preparação de Zod/backend para import real do schema no job frontend | Recontagem de casos do job remoto |
| API pública: Actions 41832249900 e seus dois jobs com success no HEAD | Aprovação remota reconfirmada de jobs/etapas, incluindo preparação backend no job frontend | Leitura dos logs completos, recontagem dos 612/619 ou conferência individual dos checksums por C1 |
| H2 e 1.4C | Ensaios integrados de Histórico e V2, incluindo falhas/limites descritos | Cobertura irrestrita de todos os dispositivos, ataques ou topologias |
| Arquivos de teste atuais | Cenários disponíveis para futura regressão autorizada | Percentual de cobertura de linhas ou sucesso recém-medido |

Backend usa runner próprio; integrações dependem de destino de teste configurado e algumas têm skip quando ele está ausente. Contar arquivos ou rodar unidade sem PostgreSQL não equivale à homologação completa. `backend/test/deferred/*.reference` preserva testes históricos fora da suíte; não contá-los como aprovados. Harnesses de navegador H2/F4 são opt-in e não se confundem com a suíte Vitest ordinária.

Workflow atual: dois jobs separados, Node 24, actions fixadas por SHA, `contents:read`, checkout sem persistir credenciais. Backend prepara PostgreSQL 17 exclusivo/volume novo, credenciais efêmeras distintas, trilha de 12 migrations, integridade/grants/regressões, exemplos systemd sem instalação, proxy V2 e audit high. Cleanup limita-se ao projeto de teste criado. Frontend instala seu lockfile e, desde `66fc373`, também dependências backend com `--ignore-scripts --no-audit --no-fund` para o teste de contrato; mantém lint, suíte, build e audit high próprios. Não há deploy nesse workflow.

[Diagnóstico CI-F4](diagnostico_ci_feedback_f4.md) documenta a falha antiga de import de Zod no job frontend; [correção](correcao_ci_feedback_f4.md) documenta sua solução. Não mantê-la como defeito aberto do HEAD. A homologação F4 registra audits sem altas/críticas e seis moderadas de desenvolvimento por projeto naquele instante; C1 não fez novo audit e não declara dependências atualmente livres de vulnerabilidades. Avisos históricos de chunk e import estático/dinâmico também não são falhas novas demonstradas nesta auditoria.

## 12. Favoritos Globais: revisão da fase 2.1

A referência específica é [dashboard_v2_fase_2_1_arquitetura_favoritos.md](../docs/dashboard_v2_fase_2_1_arquitetura_favoritos.md), mais recente e específica que o esboço V2.1 geral. Continua marcada como proposta para aprovação. A busca no schema, rotas, serviços e consumidores atuais confirma que seus modelos/endpoints/flags não foram implementados.

Existente: favoritos por slug na chave `portal-guarulhos:favoritos:v1`, até 500, sincronização por evento storage, tolerância a falha de armazenamento e preservação de itens desconhecidos em catálogo parcial. Não há atomicidade entre duas abas concorrentes. O botão é usado em Início/cards do catálogo; medir só a ficha de detalhe perderia intenções.

Decisões propostas pela 2.1, ainda dependentes de revisão:

- Estado por `IdentidadeFavoritos`/`FavoritoGlobal`, PK por identidade/patrimônio, revisão BigInt, CAS, tombstone e último `comandoId`; remover antes de adição atrasada deve impedir ressurreição. Nenhum contador de cliques.
- Credencial/cookie/segredos e participação próprios, sem User/AuthSession ou cookie diário V2. Prazo proposto de 180 dias, renovação explícita, sem extensão em GET/PUT; fila cliente de sete dias, até 500 intenções, tetos de 500 ativos/2.000 pares.
- Aceite global separado da importação opcional dos favoritos antigos. Resolver slug → UUID canônico confirmado; desconhecidos/privados ficam locais. Evento storage, catálogo parcial e `localStorage.clear()` não autorizam remoções globais.
- Canal de intenção na camada comum, sem substituir a store local. GPC, conflitos, cookie perdido, revogação pendente e fila de identidade antiga exigem estados explícitos. Falha global não desfaz o coração local.
- Endpoint administrativo **próprio** proposto `/api/admin/dashboard/favoritos`, ADMIN/EDITOR, estoque atual sem período. Não preencher o DTO temporal de visualizações nem submetê-lo à flag de consulta V2. Novas adições somente em publicados canônicos; remoções preservadas para arquivados; escopos publicados/não publicados/todos canônicos explicitados.
- Router público proposto `/api/metricas/favoritos` precisa ser montado antes de `/api/metricas`, cujo router atual termina em 404 e aplica regras específicas de visualizações. Quotas, parser e capacidade de retirada precisam ser próprios.
- Nova migration, grants, operador/rotina de retenção, controle de expiração e plano de restauração. Backup antigo não pode ressuscitar silenciosamente participações revogadas; a proposta conservadora perde estoque ao invalidar identidades restauradas.

Dependências atualizadas para o HEAD: partir das **12** migrations atuais, preservar Feedback e sua ordem de montagem/proxy, estender expectativas dos harnesses correntes sem alterar históricos, manter teste real de contrato F3 e incluir regressões de Histórico/Feedback além de V1/V2/auth/local. A próxima fase técnica seria **2.2**, após aprovação da 2.1; 2.3 integra intenções/participação frontend e 2.4 acrescenta painel/homologação. Nada disso foi iniciado em C1.

## 13. Acessos Gerais: existente e decisões ausentes

| Tema | O que existe | O que falta definir antes de modelar |
| --- | --- | --- |
| Carregamento de página | SPA React com navegação; API pública; logs HTTP operacionais | Unidade: carregamento inicial, mudança de rota ou página qualificada; refresh/back, erros, preview, prefetch, equipe e bots; caminhos elegíveis |
| Sessões | AuthSession para equipe e cookie diário de visualizações | Se haverá sessão analítica; inatividade, encerramento, múltiplas abas, virada de dia e identidade; não reutilizar autenticação |
| Visitantes estimados | Nenhum modelo/estimador próprio; deduplicação V2 por patrimônio/dia | Necessidade e aprovação institucional/técnica, unidade/limitações por dispositivo/cookie, incerteza e ausência de fingerprint ou uso implícito de IP |
| Privacidade | Padrões de participação, GPC, minimização e rate limiting em módulos existentes | Finalidade própria, transparência, escolha, dados mínimos, retirada, prazos, logs/backups; não herdar automaticamente aceite V2 |
| Agregações administrativas | Infraestrutura de painéis/autorização e padrões READ ONLY | Permissões, períodos/fuso, dimensões, retenção, cobertura, zero versus indisponível e precisão numérica |
| Separação de V2 | Unidade explícita IDENTIDADE_PATRIMONIO_DIA e HMAC por bem | Contrato/armazenamento/flags separados se aprovados; nenhum total obtido somando V2 como “acessos do portal” |

`accessService.js` trata autenticação e acesso a conteúdo/mídia/categorias; seu nome não indica analytics. Logs HTTP não são contadores confiáveis de páginas ou visitantes e podem incluir assets/retries. Somar visualizações entre bens duplica a mesma credencial entre patrimônios; somar dias também não produz visitantes mensais únicos. Não há base para preencher lacunas históricas retroativamente.

Recomendação: produzir primeiro uma definição documental de Acessos Gerais e seus critérios de aceite. A equipe pode preferir inicialmente apenas carregamentos qualificados sem sessões/visitantes; a decisão precisa ser explícita. C1 não cria modelo, endpoint, cookie, evento, script ou mecanismo de rastreamento.

## 14. Pendências reais, riscos e ordem sugerida

| Item | Classificação/evidência | Ação recomendada | Prioridade |
| --- | --- | --- | --- |
| Reativação pode reutilizar sessão anterior | Comportamento estático demonstrado, impacto condicionado a sessão ainda válida; sem exploração observada | Decidir semântica de desativação e autorizar teste HTTP específico antes de eventual correção | P1 |
| FKs de autenticação | Divergência textual e evidência histórica de diff; não nova medição de banco | Revisão separada da intenção de ON UPDATE, preservando migrations existentes | P2 |
| Métricas/Feedback desligados | Configuração deliberada | Manter até política e operação estarem prontas; não tratar como bug | P1 antes da ativação |
| Retenção/sondas e backups definitivos | Código presente; instalação não comprovada | Definir operador/destino/agenda/alertas; ensaiar restauração autorizada; resolver guardas do descarte real | P1 |
| HTTPS/proxies/quotas | Fixtures aprovadas historicamente; destino final não homologado | Validar cadeia TLS/peers e limites compartilhados antes de múltiplas réplicas | P1 |
| Logs de erro Nginx V2 | Configuração não aplica a supressão específica de Feedback; guia reconhece possível URI/endereço no erro | Rever minimização/retenção no destino; não afirmar vazamento de dados reais | P1 antes da ativação |
| Robôs e simulação de qualificação | Servidor aceita evento válido sem comprovar tempo/humanidade; ausência de filtro UA no caminho lido | Comunicar limite; avaliar necessidade de defesa adicional com evidência de abuso, sem inventar validação existente | P2 |
| Respostas tardias de edição de usuário | Falta de guarda equivalente à lista no método editar; efeito não reproduzido | Ensaio direcionado de navegação/sessão em fase autorizada | P2 |
| Favoritos Globais e Acessos Gerais | Funcionalidades futuras, não regressões | Aprovar contratos/privacidade antes de implementar | P1 definição |
| Acessibilidade/carga final | Limites expressos em H2/F4 | Leitor de tela, zoom nativo, aparelhos e carga sintética do destino conforme autorização | P2 |
| CI remoto aprovado; logs completos não baixados | SHA, jobs e etapas reconfirmados; totais detalhados sustentados pelo pedido/F4 | Conservar links e distinguir metadados de logs; não há necessidade demonstrada de rerun | Sem bloqueio |
| Textos históricos desatualizados | Fotografia anterior confirmada | Usar C1 como índice atual; revisão documental futura delimitada | P3 |

Não foi demonstrado nesta auditoria acesso administrativo sem autorização, vazamento efetivo de credenciais ou corrupção de contagens em produção. Isso não constitui certificação de segurança: C1 é estática, não um pentest ou homologação operacional. Riscos condicionais acima não são apresentados como incidentes comprovados.

Ordem sugerida:

1. Revisar C1, aceitar a separação das métricas e decidir a política de desativação/reativação e os responsáveis operacionais.
2. Fechar as decisões de produto/privacidade da fase 2.1 e, em documento próprio, definir Acessos Gerais. Não tornar um novo rastreador dependência artificial de favoritos.
3. Mediante autorização, implementar Favoritos 2.2 com flags falsas e trilha PostgreSQL isolada; depois 2.3 e 2.4. Preservar V1/V2/Feedback/auth e favoritos locais.
4. Implementar Acessos Gerais apenas depois de unidade, participação, retenção, permissões e cobertura aprovadas. Manter rollout separado.
5. Tratar ativação real de V2/Feedback/favoritos/acessos como decisão operacional específica, após preparação do destino, sem inferi-la de CI aprovado.

Critérios para iniciar a próxima fase: revisão deste diagnóstico; escopo/contrato escolhido e autorizado; decisões 2.1 ou de Acessos Gerais registradas; matriz de permissões preservada; plano de migrations novas/grants/rollback e testes descartáveis aprovado; operação/retirada/restauração desenhadas; critérios de regressão V1/V2/H1–H2/F1–F4/auth/local definidos. Antes de ativar, exigir ainda política institucional, responsáveis, HTTPS, segredos, retenção e alertas efetivamente validados no destino.

Conferência final documental: 46 links locais resolvidos para arquivos existentes; inventário de modelos e migrations confrontado com o schema/trilha corrente; consulta remota somente de leitura; Git identifica apenas este relatório novo. A revisão de whitespace não apontou erro de conteúdo; Git avisou apenas sobre conversão futura LF/CRLF. Não houve validação executável da aplicação.

**Encerramento C1:** diagnóstico entregue. A próxima implementação depende de revisão e autorização; não foi iniciada nesta etapa.
