# Diagnóstico do Dashboard após atualização

**Data:** 31/10/2026, America/Sao_Paulo.\
**Base principal:** árvore de trabalho do repositório, branch `development/backend`, HEAD `c6760717e4b4a86cead2e1a9bbc7fa9bfb3b1899`.\
**Referência secundária:** [relatório dos snapshots ZIP](relatorio_geral_portal_2026-10-31.md).\
**Método:** inspeção estática de Git, diffs, rotas, serviços, schemas, componentes, testes e configuração versionada. Nenhuma aplicação, suíte, lint, build, migration, seed ou Docker foi executado. Não houve conexão ao banco, alteração de flags, commit, push ou deploy. Somente este diagnóstico foi criado.

**Parecer:** o backend existente permite iniciar a interface de **Histórico de Alterações**, exclusiva de ADMIN, sem nova tabela ou endpoint para a primeira versão. Essa deve ser a primeira funcionalidade implementada após autorização. Visualizações qualificadas V2 já existem em código; feedback persistido e favoritos globais ainda não. Não há evidência suficiente para certificar o estado do banco, a ativação pública, o CI atual ou a ausência de regressões em execução.

## 1. Estado real do Git e mudanças recentes

### 1.1 Fotografia anterior à criação deste diagnóstico

| Verificação | Resultado observado |
| --- | --- |
| Branch e HEAD | `development/backend`, `c676071` |
| Referência de acompanhamento | `origin/development/backend` também em `c676071` |
| Divergência local | `git rev-list --left-right --count HEAD...origin/development/backend`: `0 0` |
| Modificações rastreadas | Nenhuma; `git diff --stat` e `git diff --cached --stat` vazios |
| Arquivos não rastreados | Apenas `backend/reports/relatorio_geral_portal_2026-10-31.md` |
| Conflitos pendentes | Nenhum indicado pelo status |
| Outras referências locais relevantes | `origin/main` em `7f15322`; `origin/development/frontend` em `4cf6820`; `master` local em `48a412c` |

Foram consultados `git status --short --branch`, status com todos os não rastreados, `git branch -avv`, log, stats e diffs entre commits. **Não foi feito fetch:** a igualdade com `origin/development/backend` descreve a referência local, não confirma o estado atual do servidor remoto. O relatório anterior foi preservado integralmente.

### 1.2 Atualização mais recente, delimitada por commits

O documento da Fase 2.1 identifica `c775697` como sua base. O intervalo **`c775697..c676071`** contém 57 arquivos alterados, 2.431 inserções e 196 exclusões de linhas; não há caminho removido nesse diff. O volume de linhas inclui documentação e reformatação, não 57 funcionalidades novas.

| Commit | Mudança efetivamente identificada |
| --- | --- |
| `b93d9e0`, 29/10 | Modo de demonstração do backend em memória: 53 arquivos, 1.482 inserções e 60 exclusões. Nova seleção de serviços reais/mock, configuração de execução, fixtures, mídia temporária, autenticação/sessões, auditoria, catálogo e métricas demonstrativas; novo `test:mock` e `mockData.test.js`. |
| `738249a`, 31/10 | Quatro arquivos: documento da Fase 2.1, `AdminRegioes.jsx`, `AdminRegioes.css` e `MetricasDashboard.test.jsx`. O diff mostra predominantemente reformatação dos dois arquivos JSX; a alteração visual substantiva encontrada é o contorno de foco regional de **3 px para 1 px**. Não foram adicionados gráficos, contadores ou chamadas de métricas em `AdminRegioes`. |
| `c676071`, 31/10 | Merge com pais `738249a` e `b93d9e0`. Contra o primeiro pai, incorpora os 53 arquivos de demonstração; contra o segundo, incorpora os quatro arquivos acima. |

O título “feta: métricas página adminRegiões” não descreve uma nova funcionalidade de métricas nessa página. A gestão regional existente continua com busca, paginação, criação, edição, ativação/inativação, slug estável, cancelamento de consulta e bloqueio de edição em determinados erros. O arquivo de testes V2 foi reformatado, sem novos cenários substantivos identificados nesse diff.

**Backend real:** a consulta de autenticação foi extraída para `accessService.getAuthenticationUser`; controllers e algumas rotas passaram a obter serviços em `services/index.js`. O modo normal seleciona os serviços reais. A lógica compartilhada de diferenças de auditoria foi extraída para `prepararValoresAuditoria`; a gravação real continua com validação de ator/ação e com o client da transação do negócio. O diff recente não altera `schema.prisma`, migrations ou lockfiles de dependências.

**Demonstração:** `MOCK_DATA === "true"` seleciona implementações em `src/mock/`; `NODE_ENV === "production"` com esse modo lança erro. Segredos demonstrativos são efêmeros e uploads usam diretório temporário. As flags de consulta/coleta de métricas são forçadas a `true` **dentro do modo demo**; isso não modifica os exemplos versionados nem comprova coleta no modo real. A participação no frontend continua dependendo de sua flag e da escolha do visitante.

Evidências: [seleção dos serviços](../src/services/index.js), [configuração demo](../src/config/runtime.js), [configuração de métricas](../src/config/metricas.js), [autenticação](../src/middlewares/authenticate.js), [AdminRegioes](../../frontend/src/features/admin/pages/AdminRegioes.jsx).

### 1.3 Funcionalidades anteriores ainda presentes na árvore atual

| Commit ou grupo | Entrega acumulada, anterior à atualização acima |
| --- | --- |
| `18e79d5` e base anterior | Dashboard administrativo com gráficos, componentes visuais e rotas. O V1 atual usa agregações do backend. |
| `ee29f6c` | Backend V2 Fase 1.1: identidade diária, deduplicação, agregados e consulta administrativa. |
| `429c0df` / `b49478a` | Integração da auditoria administrativa, logs estruturados, API de consulta/detalhe, testes e documentação. A tabela `audit_log` já existia na migration inicial. |
| `56cf68c` | Participação opcional, qualificação no frontend, três gráficos V2, retenção, reconciliação e sondagens. |
| `e5184bb` | Homologação/validação operacional, proxy, Nginx, exemplos systemd e workflow de predeploy; ajustes no frontend de coleta e autenticação. |
| `c775697` | Normalização LF no hash da curadoria, `.gitattributes` e teste correspondente. |

Essas entregas explicam boa parte das diferenças entre ZIPs; não são alterações locais pendentes no VS Code.

## 2. Funcionalidades concluídas, parciais e ausentes

“Implementado” abaixo significa código e contratos presentes, não homologação executada neste diagnóstico.

| Funcionalidade | Estado atual | Limite ou próximo passo |
| --- | --- | --- |
| Dashboard V1 | Implementado | Acervo, status, categorias, bairros, situações, regiões e legados; preservar contrato e quatro gráficos. |
| Visualizações qualificadas V2 | Implementadas | Coleta opcional, API e gráficos; ativação e dados reais não conferidos. |
| Operação de métricas | Código implementado | Retenção/reconciliação/sondagem e trilho isolado presentes; agendamento e execução no host não comprovados. |
| Autenticação administrativa | Implementada | JWT, sessão renovável, revogação e perfis; exige regressão futura após mudança de seleção de serviços. |
| Auditoria administrativa | Backend implementado | Persiste operações cobertas; consulta/detalhe ADMIN; não cobre retroativamente todas as mudanças da vida do sistema. |
| Histórico de Alterações | Parcial no produto | Backend pronto; faltam página, menu, cliente de consulta e formatador de detalhes no frontend. |
| Logs operacionais | Implementados no processo | JSON em stdout/stderr; armazenamento/retenção na hospedagem não comprovados. |
| Feedback | Ausente como recurso persistido | Existe formulário de contato por `mailto:`, mas não API/modelo/agregações de feedback. |
| Acessos gerais, visitantes e sessões de navegação | Ausentes como métricas do Dashboard | Não derivar esses totais da V2 nem das sessões administrativas. |
| Favoritos locais | Implementados | LocalStorage/memória; sem sincronização com servidor ou entre dispositivos. |
| Favoritos globais | Somente arquitetura 2.1 | Sem modelos, migrations, rotas, coleta, sincronização ou gráfico global implementados. |
| Demonstração em memória | Implementada | Adequada a demonstração e testes específicos; não valida persistência e concorrência PostgreSQL. |

A busca nos fontes, rotas e schema encontrou `favoritos: { disponivel: false }` no serviço real, no mock e no contrato OpenAPI de métricas. Não encontrou implementações de feedback, favoritos globais ou analytics gerais. O uso da palavra “feedback” em comentários de serviço significa retorno visual de erro, não dados de avaliação.

## 3. Diferenças em relação ao relatório anterior

1. **O Git agora foi observado diretamente.** Os números 701/801 arquivos, 100 adições e 81 modificações pertencem aos ZIPs analisados anteriormente. Não foram recalculados e não correspondem ao diff atual de 57 arquivos desde `c775697`.
2. **Regiões e Fase 2.1 já estão commitadas.** A ressalva do documento 2.1 sobre mudanças locais preservadas descreve o momento de sua redação, em 28/10. No HEAD atual, esses arquivos fazem parte de `738249a`; não estão staged ou modificados localmente.
3. **Não houve avanço identificado para 2.2.** O histórico local do documento aponta a inclusão em `738249a`; os fontes atuais continuam sem implementações globais.
4. **As conclusões centrais foram confirmadas no código:** V1/V2 presentes; histórico sem UI; contato por e-mail; ausência de feedback persistido e de contagem geral do portal.
5. **“Já estamos registrando” precisa de condição.** Existe implementação para registrar; sem consultar configuração ativa e banco, não se pode afirmar que eventos reais estão sendo recebidos hoje.
6. **A afirmação “a tabela AuditLog já possui eventos” não é certificável aqui.** O modelo, as escritas e fixtures existem; volume, conteúdo e integridade dos registros reais não foram consultados.
7. **Identidade do responsável tem limite temporal:** `user.name` e `user.email` vêm de relação com o cadastro atual. Não são uma fotografia da identidade no instante da ação. O ID do ator é a referência do evento, quando preservado.
8. **Demo e backend real têm diferenças relevantes:** a consulta demo de detalhes clona valores já sanitizados na escrita, enquanto a real reaplica a lista permitida também na leitura de eventos antigos; a demo não fornece as garantias transacionais do PostgreSQL. Além disso, habilita internamente suas métricas.
9. **CI e drift continuam pendentes de verificação própria.** Relatos anteriores de Actions aprovado não provam o resultado de `c676071`. A migration de sessões omite `ON UPDATE` nas duas FKs, enquanto as relações Prisma não explicitam essa ação; há uma diferença potencial a comparar futuramente em descartável. Isso não demonstra drift no banco real, que não foi acessado.

O arquivo `frontend/planning/admin-historico.md` é explicitamente histórico e contém descrições antigas de login mock e backend ainda não integrado. Seu nome não comprova uma tela de auditoria; ele não substitui os contratos atuais.

## 4. Contratos, compatibilidade e possíveis regressões

### 4.1 Dashboard V1

`GET /api/admin/dashboard`, com ADMIN ou EDITOR autenticado, responde `{ success: true, data }`.

- `data`: `total`, `RASCUNHO`, `PUBLICADO`, `ARQUIVADO`, `porCategoria`, `porBairro`, `porSituacao`, `porRegiao`, `semRegiao`, `legados` e `meta`.
- A base é **todos os status**, incluindo legados. Categorias principais fecham a distribuição principal; `quantidadeSecundaria` informa vínculos adicionais, sem duplicar `total`.
- Regiões inativas com vínculos continuam incluídas; situação usa as seis opções do enum; bairro/localização ausentes são tratados como “Não informado”.
- Consultas reais usam uma transação `RepeatableRead` com `SET TRANSACTION READ ONLY`.
- Frontend apresenta quatro gráficos: situação de conservação, distribuição por região, categorias principais e status de publicação. Há informação de legados, acesso ao acervo e atalho de usuários somente para ADMIN. `porBairro` permanece no contrato, mas não é um desses quatro gráficos. O atalho “Usuários” **não é uma contagem de usuários** retornada pelo V1.
- Gráficos V1 têm carregamento lazy e tratamento de erro; a seção V2 é montada separadamente e consultada sob demanda.

Evidências: [dashboardService](../src/services/dashboardService.js), [dashboardRoute](../src/routes/dashboardRoute.js), [AdminDashboard](../../frontend/src/features/admin/pages/AdminDashboard.jsx), [dashboardApi](../../frontend/src/services/dashboardApi.js).

### 4.2 Dashboard V2 — visualizações

`GET /api/admin/dashboard/metricas`, também ADMIN/EDITOR, mantém envelope `{ success: true, data }`.

| Item | Contrato atual |
| --- | --- |
| Consulta desativada | HTTP 200, `data: { disponivel: false, motivo: "DESATIVADA" }`; a rota não consulta agregados. A autenticação ainda ocorre. |
| Período ativo | `inicio` e `fim` em `YYYY-MM-DD`, inclusivos, até 366 dias, sem fim futuro. Não aceita `granularidade=mes`. |
| Filtros | `patrimonioId`, `regiaoId` ou `semRegiao="true"`; os dois filtros regionais são mutuamente exclusivos. Patrimônio pode combinar com um recorte regional. |
| Paginação | `pagina` 1–10.000, `limite` 1–100; padrões do backend 1/20. Frontend inicia em 1/10 e período de 30 dias. |
| Metadados | Versão da regra, fuso, período, geração, unidade, elegibilidade, região de referência, granularidade e cobertura operacional. |
| Valores | `visualizacoes.totalRegistrado`, `porPatrimonio.itens/paginacao`, `porRegiao`, `semRegiao`, `serie`. Quantidades são strings decimais para preservar BigInt. |
| Favoritos | `favoritos: { disponivel: false }`, placeholder explícito. |
| Falha de banco | HTTP 503; erro sanitizado, sem total estimado. |

A elegibilidade é patrimônio publicado/canônico **na aceitação**. A consulta histórica usa status e região **atuais** do cadastro; arquivamento posterior não apaga automaticamente visualizações aceitas. A região não é localização do visitante. O total do ranking é calculado antes da paginação; não somar apenas a página como total global.

O frontend conserva valores exatos em tabelas, não desenha gráficos acima do limite numérico seguro, distingue indisponível/erro/vazio, mantém lacunas sem convertê-las em zero e sinaliza o dia parcial. As três visualizações são ranking, série diária e distribuição regional. O backend usa SQL parametrizado, `RepeatableRead`, `READ ONLY` e limites de execução.

Evidências: [schema V2](../src/schemas/metricasSchema.js), [consulta V2](../src/services/dashboardMetricasService.js), [MetricasDashboard](../../frontend/src/features/admin/components/MetricasDashboard.jsx).

### 4.3 Segurança e autenticação

O modo real mantém verificação HS256 e dos campos do JWT, usuário ativo, `tokenVersion`, sessão associada, revogação e prazo absoluto. Somente após essas verificações um JWT vencido recebe `ACCESS_TOKEN_EXPIRED`. O refresh rotaciona tokens, persiste hashes, detecta reuso e revoga a família; troca de senha revoga sessões e audita a ocorrência sem valores da senha.

Os padrões versionados são JWT de 300 segundos e sessão absoluta de 28.800 segundos (oito horas), configuráveis dentro dos limites do schema de ambiente. Os valores efetivamente configurados não foram consultados.

O frontend usa o cliente administrativo existente para Bearer/refresh, repete a requisição uma vez quando a API a recusou antes do negócio e evita repetir uma renovação de resultado incerto. Access e refresh ficam em `sessionStorage`, com risco residual de leitura por XSS já reconhecido no código. A restauração inicial do contexto confere o storage, não equivale a uma confirmação da sessão no servidor; a API continua sendo a autoridade de acesso.

Rotas administrativas/auth recebem `no-store`; auditoria recebe `private, no-store`, inclusive erros anteriores ao controller. Há validação estrita, controle de perfis, limitação de login, proxy confiável configurável e proteção de mídias por status. As permissões de consulta regional permitem ADMIN/EDITOR; a UI de gestão e as mutações regionais são ADMIN. Portanto o filtro regional V2 para EDITOR não é, por si só, uma violação de contrato.

### 4.4 Achados e riscos priorizados

| Prioridade | Evidência e impacto | Tratamento na próxima etapa |
| --- | --- | --- |
| Alta, regra de apresentação | Auditoria não persiste sessão, rota ou página; nome/e-mail do ator são atuais. Uma narrativa que invente esses dados seria incorreta. | Usar apenas DTO confirmado e mapeamento explícito de seção; identificar o caráter atual do cadastro do responsável. |
| Média, regressão a verificar | `services/index.js` agora seleciona serviços para muitos controllers, autenticação, mídia e métricas. O diff preserva a consulta real de autenticação, mas não houve execução. | Regressão de modo real e demo separadamente, incluindo erros, permissões, login/refresh e mídia. Não homologar só pela demo. |
| Média, paridade demo | `mock/audit.js` não reaplica sanitização na leitura e não usa o fallback genérico do resumo real para códigos desconhecidos. | Usar fixtures de eventos antigos/desconhecidos nos testes da nova UI e testes do serviço real; não deduzir compatibilidade total a partir do mock. |
| Média, operação | Flags de exemplo falsas não comprovam flags ativas; demo força métricas internas. Logs em processo não garantem retenção. | Conferir ambiente e operação apenas em etapa própria; manter produção inalterada agora. |
| Média, rastreabilidade | Sem snapshot do ator, sem retroatividade, sem trilha criptográfica de integridade; não há política de retenção da auditoria demonstrada pelo código inspecionado. | Explicitar limites; definir retenção/backup e acesso institucional sem reconstruir eventos inexistentes. |
| Média, desempenho a medir | Auditoria aceita paginação por OFFSET até 1.000.000; índices existentes são por usuário, entidade/ID e data, sem índice dedicado a cada filtro. | Medir consultas e paginação profunda com dados sintéticos antes de propor índices ou cursor. Não criar migration preventivamente. |
| Baixa, alteração visual confirmada | `AdminRegioes.css` reduziu o outline de foco de 3 px para 1 px. | Verificar visibilidade por teclado e contraste no tema atual; risco de acessibilidade, não falha funcional comprovada. |
| Pendente de infraestrutura | Diferença potencial de ação `ON UPDATE` entre schema e migration de sessões; configuração final de HTTPS/proxy não observada em execução. | Conferência futura no descartável e inventário de implantação autorizado; nunca editar migration histórica para “corrigir” esta análise. |

Não foi comprovada uma regressão crítica em execução. A revisão estática também não autoriza declarar a aplicação “sem regressões” ou as dependências “sem vulnerabilidades”: não houve execução de testes, audit de pacotes nem consulta de CI remoto.

## 5. Análise do backend de auditoria

### 5.1 Persistência e cobertura

`AuditLog`, mapeado para `audit_log`, contém `id`, `userId` opcional, `action`, `entity`, `entityId`, `oldValues`, `newValues` e `createdAt` com fuso. A FK do usuário usa `ON DELETE SET NULL`; o histórico pode permanecer sem responsável associado. A tabela já aparece na migration inicial, não depende de migration nova para a tela proposta.

As chamadas de `registrarAuditoria` foram localizadas nas transações dos serviços abaixo:

| Área | Eventos/ações implementados |
| --- | --- |
| Usuários | Criação, edição, ativação/desativação; ator obtido do usuário autenticado, distinto do usuário alvo. |
| Senha | `USER_PASSWORD_CHANGE`, ocorrência sem senha/hash/token; mesma transação da troca e revogação. |
| Patrimônios | Criação, atualização, publicação e arquivamento; diferenças dos campos permitidos, incluindo classificação/localização. |
| Regiões | `REGIAO_CREATE` e `REGIAO_UPDATE`; alterar `ativo` aparece no diff de UPDATE. |
| Imagens | Inclusão, metadados, exclusão e mudança de principal, incluindo identificação de principais substituídas. |
| Documentos/referências | Inclusão, edição e exclusão por caminhos novos e legados. |
| Fatos e ligações | CRUD e reordenação; arrays de IDs/ordens permitidos. |
| Exposições e novidades | Criação, edição, publicação, arquivamento e exclusão pelo serviço de conteúdo. |

O enum de ações utilitário inclui combinações genéricas; **a existência de uma constante não prova que exista uma operação ou que ela já tenha ocorrido**. Login, negação de acesso, logout e erros técnicos pertencem aos logs operacionais, não à lista de mudanças persistidas acima. Operações externas aos serviços instrumentados, scripts SQL e eventos anteriores à instrumentação não ganham histórico automaticamente.

A escrita real de auditoria não absorve falhas: se falha, a transação de negócio deve falhar junto. Alteração sem diferença relevante não gera evento. Os testes cobrem rollback real e recuperação de arquivos em cenário isolado, mas não foram executados nesta análise.

### 5.2 Contrato utilizável pela interface

**Lista:** `GET /api/admin/auditoria`.

- ADMIN autenticado; EDITOR recebe 403, sessão inválida/ausente recebe 401.
- Query estrita: `userId`, `action`, `entity`, `entityId`, `inicio`, `fim`, `pagina`, `limite`.
- IDs são UUIDs; ações/entidades são códigos, não rótulos traduzidos.
- Datas são datetimes ISO com offset; não reutilizar diretamente o contrato `YYYY-MM-DD` da V2.
- Intervalo inclusivo (`gte`/`lte`), início não posterior ao fim. Paginação padrão 1/20, máximo de 100 itens, página máxima 1.000.000.
- Resposta: `{ success: true, data: { itens, paginacao: { pagina, limite, total, totalPaginas } } }`.
- Cada item: `id`, `userId`, `action`, `entity`, `entityId`, `createdAt`, `user: { id, name, email } | null`, `resumo`.
- Sem `oldValues/newValues` na lista. Ordem `createdAt DESC, id DESC`; contagem e página usam a mesma fotografia `RepeatableRead`.

**Detalhe:** `GET /api/admin/auditoria/:id`, mesmo envelope e autorização, acrescenta `registro`, `oldValues` e `newValues`. ID inválido: 400; evento inexistente: 404. `registro.id` identifica o alvo; para mídia/fato/ligação, `patrimonioId` pode ser recuperado dos valores do evento, cadastro atual ou outro evento de criação/exclusão. Se irrecuperável, é null. Isso identifica o recurso relacionado, **não a página de onde partiu a ação**.

Em `FATO_REORDER` e `LIGACAO_REORDER`, `entityId` é o ID do patrimônio pai, e os itens reordenados estão nos arrays permitidos de valores. O formatador não deve descrever esse UUID como se fosse um fato ou uma ligação individual.

Não há endpoint de alteração/exclusão de eventos nem filtro por nome/e-mail, texto livre, sessão ou página. O filtro de responsável deve resolver uma pessoa para `userId`, por exemplo pela busca administrativa já existente em `/api/admins`, sem exigir mudança na API de auditoria. Não adicionar uma opção “sem responsável” que filtre apenas a página local: esse filtro global não existe no contrato.

### 5.3 Sanitização e limites semânticos

[auditoria.js](../src/utils/auditoria.js) aplica uma lista positiva de campos por entidade, remove credenciais/query/fragmento de URLs permitidas e ignora campos internos. A leitura real reaplica a sanitização a registros antigos; troca de senha sempre retorna valores null. Texto livre permitido continua sendo conteúdo do cadastro e pode conter dados pessoais digitados; a lista positiva não é uma anonimização universal.

`oldValues/newValues` são diferenças ou snapshots conforme a ação, não cópias integrais garantidas de todo o registro. Campo omitido, null, string vazia, zero e false têm significados diferentes. Uma URL pode ter valores visíveis iguais antes/depois após sanitização; isso não invalida a ocorrência registrada e não autoriza recuperar parâmetros removidos.

A narrativa não pode trocar ator por alvo: em edição de outro usuário, `userId/user` é quem executou e `entityId` é quem foi alterado. Sem nome do alvo no evento, usar tipo/ID. Nome/e-mail atuais do responsável devem ser apresentados como cadastro atual, não como identidade histórica certificada.

### 5.4 Logs de operação

[logger.js](../src/utils/logger.js) emite JSON com timestamp, nível, evento, requestId, método, rota controlada, status e identificadores permitidos. Não inclui indiscriminadamente body, senha, cookie, SQL, stack ou mensagem de erro. A falha do destino de log é isolada do negócio.

Esses logs são úteis para suporte e segurança, mas não substituem `AuditLog`. Não há API administrativa de leitura de stdout/stderr identificada. Não correlacionar um evento de auditoria a sessão/rota técnica apenas por proximidade de horário. A retenção dos recibos/sondas V2 também não é uma política de retenção de auditoria.

## 6. Planejamento da interface de Histórico de Alterações

### 6.1 Estrutura proposta, sem implementação nesta etapa

- Página futura `AdminAuditoria.jsx`, rota `/admin/auditoria` dentro do guard ADMIN já usado para Usuários e Regiões; entrada “Histórico de alterações” no grupo Gestão do `AdminLayout`.
- Reutilizar tipografia, cores, espaçamentos, botões, tabela e estados da tela de Usuários. Sem novos cards de contagem decorativos e sem substituir o Dashboard atual.
- Faixa de filtros: período, responsável, ação e seção/recurso; busca do responsável por nome/e-mail resolve UUID usando o contrato existente. Tipo/ID do registro pode ficar em filtro avançado.
- Lista responsiva com **responsável (nome e e-mail quando disponíveis), data, hora, ação, seção/recurso e botão Detalhes**. Data/hora em `America/Sao_Paulo`, com fuso identificado e valor ISO acessível no detalhe.
- Paginação e total reais do servidor; aplicar filtros volta à primeira página. Manter filtros ao abrir/fechar detalhe, cancelar consultas antigas e impedir resposta atrasada de substituir a consulta atual.
- Detalhe sob demanda em painel/modal acessível: frase determinística, identificação do evento/alvo e comparação campo/anterior/novo somente quando disponível. Teclado, Escape, foco inicial e devolução do foco ao botão de origem.
- Estados próprios de carregamento, lista vazia, nenhum resultado, erro recuperável, sessão encerrada, sem permissão e evento não encontrado. Erro não vira zero eventos.

O esboço manuscrito usa “sessão”, mas o dado disponível permite **seção do painel**. A interface deve usar “Seção/recurso”, com explicação discreta de que o rótulo deriva do tipo de registro. Não apresentar “sessão de navegação” ou “página acessada”.

| `entity` real | Seção/recurso sugerido |
| --- | --- |
| `User` | Usuários; troca de senha identificada pela ação |
| `Patrimonio` | Patrimônios |
| `PatrimonioImagem` | Patrimônios · Imagens |
| `PatrimonioDocumento` | Patrimônios · Documentos/referências |
| `PatrimonioFato` | Patrimônios · Fatos |
| `PatrimonioLigacao` | Patrimônios · Ligações |
| `RegiaoPatrimonio` | Regiões |
| `Exposicao` / `Novidade` | Exposições / Novidades |
| Código desconhecido | Recurso não identificado; código original como texto seguro no detalhe |

### 6.2 Frases determinísticas

Criar futuramente um utilitário puro, por exemplo `formatarAuditoria.js`, com dicionários de ações, entidades e campos. Entrada: DTO do detalhe; saída: texto e linhas de comparação. Sem chamadas a modelos, geração de intenção ou enriquecimento presumido.

Os exemplos abaixo são **templates**, não registros reais deste banco:

| Caso confirmado pelo DTO | Template |
| --- | --- |
| Atualização com ambos os valores do campo | “Em {data/hora}, {responsável} alterou {recurso}. {Campo}: de {anterior} para {novo}.” |
| Criação/publicação/arquivamento/exclusão | “Em {data/hora}, {responsável} {criou/publicou/arquivou/excluiu} {recurso}.” Escolher verbo somente pelo código conhecido. |
| Região com alteração de `ativo` | “Em {data/hora}, {responsável} alterou a região {identificação}. Ativa: de {anterior} para {novo}.” Não inventar uma ação `REGIAO_DEACTIVATE`. |
| `USER_PASSWORD_CHANGE` com ator igual ao alvo | “Em {data/hora}, {responsável} alterou sua senha.” Sem comparação de valores. |
| Responsável ausente | “Em {data/hora}, foi registrada {ação conhecida} de {recurso}. Responsável não disponível no registro.” |
| Ação desconhecida ou valores indisponíveis | “Atividade administrativa registrada em {data/hora}.” Mostrar códigos/IDs disponíveis e “Detalhes dessa alteração não disponíveis”. |

Regras de implementação futura:

1. Identificar alvo por nome/título somente quando presente nos valores permitidos do evento; caso contrário, tipo e ID. Não buscar o nome atual para apresentá-lo como nome histórico.
2. Se apenas um lado do campo existir, mostrar “Valor anterior não disponível” ou “Novo valor não disponível”. Null pode ser “Sem valor”; string vazia, “Texto vazio”. Não usar `valor || fallback` para números/booleanos.
3. Renderizar texto com escape padrão do React, sem HTML bruto; não autoabrir URLs armazenadas nem exibir blobs completos por fallback.
4. Campos desconhecidos não viram narrativa especulativa; manter lista permitida e rótulos controlados. Categorias, localização e reordenações precisam de formatação tipada.
5. Se os valores sanitizados forem iguais, informar que existe ocorrência mas a diferença não está disponível nos valores apresentados; não declarar que nada aconteceu.
6. Filtros de data devem converter o início/fim do dia escolhido para ISO com offset de São Paulo, incluindo milissegundos no limite final. Evitar conversão dependente do fuso do computador.

Não há necessidade inicial de migration, novo serviço de logging ou IA. Eventual busca textual no histórico, filtro por responsável ausente ou snapshot histórico do ator seria escopo adicional a especificar.

## 7. Planejamento de Feedback e Acessos

### 7.1 Acessos: o que já existe

O fluxo público atual usa:

- `POST /api/metricas/visualizacoes/sessao`: emissão/reuso de credencial diária;
- `POST /api/metricas/visualizacoes`: registro para UUID de patrimônio;
- `DELETE /api/metricas/visualizacoes/sessao`: retirada do cookie, inclusive com coleta desligada.

O hook de ficha exige flag do frontend, adesão aceita, elegibilidade e UUID válido; acumula **2 segundos visíveis** antes de enviar. A preferência reconhece recusa/GPC. Cookie e cliente públicos são separados do JWT administrativo. O servidor confere origem, cabeçalho específico, host/transporte, JSON limitado, rate limit, credencial e elegibilidade; a deduplicação e incremento são atômicos por credencial/patrimônio/dia.

O tempo visível é uma qualificação do cliente; não constitui prova de humanidade contra um cliente que invoque a API diretamente. Trocar credencial, limpar cookies ou usar outro navegador também impede interpretar o total como pessoas únicas.

| Conceito | Situação |
| --- | --- |
| Visualização qualificada | Existe: credencial diária × patrimônio × dia civil paulista; recargas/replays com a mesma chave não incrementam. |
| Visitante único do portal | Não existe como medida comprovada; não inferir da credencial diária, IP ou login. |
| Sessão de navegação | Não há instrumentação geral; a rota chamada `sessao` em métricas emite credencial, não mede jornadas ou duração de sessão. |
| Acessos/pageviews de todo o site | Home, mapa, catálogo e contato não estão cobertos por essa contagem patrimonial. |
| Sessão administrativa | `AuthSession` serve à segurança do painel; não é audiência pública e não está relacionada em `AuditLog`. |
| Disponibilidade da coleta | Sondas de cinco minutos indicam condição operacional; não medem pessoas ou entrega completa de eventos. |

Há código para retenção de recibos com corte de sete dias e agregados/sondas com corte de treze meses, reconciliação antes da exclusão e identificação de cobertura. Não foi verificado se os jobs estão instalados ou se rodaram. Ausência de eventos não prova zero visitantes.

**Plano recomendado:** manter a seção e os rótulos precisos já existentes. Se a instituição precisar de “acessos ao portal”, decidir primeiro se quer eventos de páginas, sessões ou outra medida. Especificar finalidade, páginas abrangidas, adesão própria, recusa/GPC, retirada, exclusão de tráfego técnico, retenção e limites antes de qualquer instrumentação. Usar identificadores controlados de página, sem query strings arbitrárias, e não vincular a usuários administrativos, IPs persistidos ou favoritos. Não instalar analytics nem iniciar coleta silenciosa como parte da tela de histórico.

### 7.2 Feedback: diagnóstico e proposta

[Contato.jsx](../../frontend/src/pages/Contato/Contato.jsx) possui nome, e-mail, assunto e mensagem. O submit monta `mailto:` e abre o aplicativo de e-mail. Não confirma envio/recebimento e não grava na API. Não foi encontrado modelo Prisma, migration, endpoint público, consulta administrativa ou dados agregados para gráficos de feedback.

**Proposta de MVP a aprovar:** feedback voluntário sobre o portal, separado dos canais de denúncia/ouvidoria já indicados no contato. Tipo escolhido explicitamente (por exemplo, sugestão, problema, elogio), comentário curto e texto claro sobre finalidade. Nota só deve existir se houver pergunta e escala aprovadas; não inferir satisfação pelo texto nem classificar por IA.

| Camada futura | Proposta concreta |
| --- | --- |
| Formulário | Envio explícito, validação, carregamento, erro preservando texto e confirmação somente após persistência. Não enviar a cada digitação. Nome/e-mail não obrigatórios para avaliar o portal; eventual pedido de retorno é escolha separada. |
| Modelo proposto | `Feedback`: UUID, tipo enumerado, mensagem limitada, `createdAt` do servidor, versão do aviso; opcionalmente estado de tratamento. `nota` e contato somente se aprovados. Índices de período/tipo conforme consulta definida. Modelo ainda inexistente. |
| Recebimento proposto | `POST /api/feedback`, DTO estrito, limite de corpo e tamanho, rate limit com armazenamento limitado, proteção de origem e resposta sem eco de dados sensíveis. Prever idempotência para duplo clique/resposta perdida sem cookie de rastreamento. |
| Administração proposta | Lista/detalhe ADMIN e `GET /api/admin/feedback/resumo` com período/filtros validados; endpoints novos, não parte do V1/V2. Respostas sem cache. |
| Gráficos propostos | Contagem por tipo e evolução temporal usando `createdAt`. Se houver nota, distribuição/denominador explícitos, sem chamar respondentes de todos os visitantes. Tabela acessível com os valores. |
| Tratamento administrativo | Se houver alteração de estado, auditar ator, ID e mudança de estado no backend existente; evitar copiar mensagem/contato completos para `AuditLog`. Definir estados e ações antes da implementação. |
| Dados e operação | Definir prazo de retenção, remoção, acesso e descarte em backup com a instituição. Sem anexos no primeiro MVP e sem importar e-mails existentes automaticamente. |

Gráficos só podem contar registros realmente persistidos; erro ou funcionalidade não habilitada não vira zero. Nenhuma afirmação de conformidade jurídica é feita por este diagnóstico. A migration futura deve ser nova e validada em banco descartável explicitamente autorizado; nenhum banco real será alterado por esta entrega.

## 8. Situação atual dos Favoritos Globais

**Fase 2.1 entregue como proposta documental; aprovação não comprovada pelo commit. Fases 2.2, 2.3 e 2.4 não identificadas como implementadas no HEAD auditado.**

O [documento de arquitetura](../docs/dashboard_v2_fase_2_1_arquitetura_favoritos.md) foi redigido em 28/10 sobre `c775697` e incluído em `738249a`. Seus modelos `IdentidadeFavoritos`/`FavoritoGlobal` e endpoints são exemplos de proposta, não código do schema ou rotas montadas.

| Evidência atual | Consequência |
| --- | --- |
| `schema.prisma` sem os dois modelos; diff recente sem migration | Não existe persistência global implementada na árvore inspecionada. |
| Rotas sem `/api/metricas/favoritos` ou `/api/admin/dashboard/favoritos` | Nenhum contrato global ativo identificado. |
| `dashboardMetricasService` e mock retornam `disponivel: false` para favoritos | O placeholder não deve ser interpretado como erro de dados ou ranking vazio. |
| `favoritosStore.js`, hook e botão sem rede | Coração continua local, independente da participação em métricas. |

A store local usa `portal-guarulhos:favoritos:v1`, slugs públicos, limite de 500 e fallback em memória quando a gravação falha. O catálogo filtrado por favoritos mostra apenas itens disponíveis no catálogo carregado. Isso não é estoque global nem sincronização entre dispositivos.

A arquitetura propõe participação, credencial, flags e endpoint próprios; estado ativo por par credencial/patrimônio, revisão monotônica, compare-and-swap, tombstones e reconhecimento do último comando. Propõe até 180 dias com renovação explícita, 500 ativos/2.000 pares e importação separadamente confirmada. São decisões pendentes, não limites operacionais já em vigor no backend.

Sequência prevista: 2.2 backend/banco/segurança; 2.3 participação e sincronização no frontend; 2.4 dashboard e homologação. O ranking é **estoque atual**, sem reaproveitar o período das visualizações como se fosse série de cliques. O subrouter futuro precisará ser montado antes do router geral de métricas, cujo middleware/404 atual não aceita esses caminhos. Preservar o contrato antigo e revisar o texto do placeholder apenas quando a nova seção existir.

Favoritos globais não são dependência para Histórico, Feedback ou manutenção da V2. Não iniciar sincronização implícita dos favoritos locais nesta etapa ou na primeira entrega do histórico.

## 9. Ordem recomendada de implementação

1. **Histórico de Alterações:** integrar a API existente, guard ADMIN, lista/filtros/paginação e detalhes determinísticos. É a entrega de menor necessidade de nova infraestrutura e responde diretamente ao esboço solicitado. Não exige novo modelo de dados na primeira versão.
2. **Validar a integração e as regressões da atualização:** testar o histórico com fixtures e backend real em descartável autorizado, junto com V1/V2, autenticação, regiões, mídia e favoritos locais. A preparação desse ambiente não autoriza tocar produção.
3. **Feedback:** aprovar finalidade, campos, tratamento e retenção; implementar persistência/API/formulário antes dos gráficos. Manter contrato próprio e mudanças administrativas auditadas.
4. **Acessos:** primeiro decidir se as visualizações qualificadas já atendem à necessidade. Se não, elaborar arquitetura de coleta transparente e separada antes de implementar. Uma nova contagem geral não é pré-requisito para as entregas anteriores.
5. **Retomar Favoritos Globais 2.2:** após aprovação das decisões da 2.1, em escopo próprio; depois 2.3 e 2.4. Prioridade institucional pode antecipar essa trilha, sem misturá-la à UI de histórico.
6. **Homologação/implantação:** somente em autorização posterior, conferir ambiente, CI do commit exato, banco, permissões, backup, HTTPS e operação. Ativação de produção é decisão separada da existência de código.

## 10. Testes e critérios de aceitação

### 10.1 O que foi verificado nesta entrega

Foram lidos os testes e rastreados seus consumidores, sem executá-los. A presença de um teste ou de um relatório anterior de aprovação não significa resultado verde no HEAD atual.

| Suítes existentes inspecionadas | Cobertura identificada no código dos testes |
| --- | --- |
| `backend/test/auditoria.test.js`, `auditoriaOperacoes.test.js` | Diferenças permitidas, no-op, null/omissão, ator versus alvo, senha sem valores, filtros, paginação, ADMIN/EDITOR, cache, eventos antigos e recurso removido. |
| `backend/test/auditoria.integration.test.js` | Falha real de INSERT de auditoria e rollback de usuário, patrimônio, região, senha/sessões e exclusão de mídia com restauração de bytes. Exige banco exclusivo. |
| `backend/test/logs.test.js` | Sanitização, requestId, erros de banco, falha do destino de logs e emissão de sucesso após commit. |
| `backend/test/dashboard.test.js`, `dashboard.integration.test.js`, `dashboardMetricas.test.js`, `metricas.integration.test.js` | V1, permissões, fotografia coerente, V2/BigInt, filtros, deduplicação e transações. Integração depende do ambiente de teste. |
| `backend/test/security.test.js`, `refreshSessions.integration.test.js`, `mockData.test.js` | Rate limit/proxy, sessões, reuso/concorrência de refresh e isolamento funcional da demonstração. |
| `frontend/test/MetricasDashboard.test.jsx` | Três gráficos, erros/desativado/zero, filtros, totais/paginação, BigInt, cobertura, cancelamento e preservação dos quatro gráficos V1 quando V2 falha. |
| `frontend/test/OrganizacaoEditorial.test.jsx`, `OrganizacaoEditorialRegiao.test.jsx` | Gestão regional, papéis, slug estável, erro sem repetição de escrita e cadastro integrado ao editor. |
| `frontend/test/NavegacaoAdmin.test.jsx` | Navegação, restauração/expiração, refresh, logout e bloqueio de EDITOR na gestão. |
| `frontend/test/participacaoMetricas.test.jsx`, `coletaMetricas.test.js`, `Inicio.test.jsx` | Participação/retirada sem apagar favoritos e interação do coração; isso não substitui uma matriz completa da store local. |

Também existem suítes específicas de auth, mídia, privilégios, operação V2 e fluxos frontend a incluir na futura validação. `scripts/run-suite.js` descobre `test/*.test.js`; testes dependentes de PostgreSQL podem ser pulados sem o ambiente apropriado. Não contar testes pulados como aprovação de integração.

O workflow versionado `.github/workflows/predeploy.yml` prevê lint, Prisma, validação isolada, testes, build e auditoria de dependências, com trilho Docker de teste próprio. Sua configuração foi lida; nenhuma execução foi iniciada ou consultada no servidor.

A conferência do Git após a criação mostrou apenas este diagnóstico e o relatório anterior como não rastreados; os diffs de arquivos rastreados e do índice continuaram vazios. O aviso de conversão LF/CRLF emitido pelo Git ao inspecionar o novo Markdown não foi tratado como falha de conteúdo nem motivou alteração de configuração.

### 10.2 Aceite da primeira implementação: Histórico

- ADMIN vê o menu e pode abrir a rota diretamente; EDITOR/visitante não acessam dados. API mantém 401/403 e `private, no-store` também em falhas.
- Lista exibe nome/e-mail disponíveis, data/hora paulista, ação e seção derivada; nenhum dado de sessão/página é inventado. Responsável ausente é tratado explicitamente.
- Filtros enviados correspondem ao contrato real: UUIDs, códigos, datas ISO com offset e paginação; busca de pessoa não se torna filtro de texto inexistente na auditoria.
- Ordem estável, total do servidor e retorno à página 1 ao filtrar; limite máximo respeitado, parâmetros inválidos tratados. Não filtrar somente a página carregada para simular busca global.
- Detalhe só é solicitado ao abrir; estados de carregamento, 404 e erro funcionam, sem exibir valores de outro evento por resposta atrasada.
- Formatador cobre criação, edição, exclusão, publicação, arquivamento, ativação, senha, reordenação, usuário alvo distinto, recurso excluído e código desconhecido.
- Omissão/null/vazio/zero/false preservados; nomes ausentes, dados sanitizados iguais e dados legados não geram preenchimento imaginado. Senhas, hashes, tokens, parâmetros privados de URLs e caminhos internos não aparecem.
- Conteúdo malicioso é exibido como texto; nada de HTML bruto ou geração por IA. Campo livre não vira instrução executável.
- Layout permanece coerente com Usuários; uso por teclado e leitor de tela, foco, Escape, rolagem, textos longos e viewport móvel verificados. Sem novos cards desnecessários.
- Nenhuma mudança em V1, DTO V2, sessão administrativa ou favoritos locais; regressões específicas aprovadas antes da entrega de código.

### 10.3 Validação futura por trilha

**Backend real e demo:** executar separadamente após autorização; verificar seleção `MOCK_DATA` ausente/false/true, bloqueio em produção, cache/perfis, não carregamento do banco na demo e continuidade da autenticação real. Para auditoria, acrescentar fixtures de usuário renomeado/removido, ações desconhecidas e valores sanitizados iguais. No descartável, verificar rollback e consulta com volume representativo; não usar banco real ou Compose normal.

**V1/V2 e favoritos locais:** preservar quatro gráficos V1 e três V2, estados independentes, números exatos, lacunas e fuso. Verificar coleta somente após adesão, GPC, retirada, duas abas, cookie bloqueado, virada do dia, rede indisponível e ausência de JWT no cliente público. Validar favoritos com storage bloqueado/corrompido, limite, catálogo parcial e recusa de métricas sem perda do coração.

**Feedback futuro:** POST só confirma após commit; validação, limite de corpo, rate limit, idempotência e falhas sem duplicação; acesso ADMIN; texto seguro; séries e categorias fecham com registros persistidos no mesmo recorte; sem dados pessoais nos agregados; política de descarte exercitada em descartável. Não apresentar satisfação/nota sem coleta explícita desse campo.

**Acessos gerais futuros:** requisito da unidade aprovado antes de testes; demonstrar ausência de envio antes da escolha, recusa/GPC/retirada e separação de sessões administrativas. Replays, bots e perda de cookies não podem ser apresentados como contagem certificada de pessoas.

**Favoritos globais futuros:** seguir a matriz 2.1 para CAS, tombstones, replay, expiração, revogação, importação explícita, concorrência PostgreSQL, fila e agregados; nenhuma exigência dessas autoriza implementação nesta entrega.

**Conclusão técnica:** iniciar pelo **Histórico de Alterações**, aproveitando a auditoria persistida e seus endpoints. A atualização recente não implementou feedback nem favoritos globais, e a V2 não deve ser rebatizada como visitantes ou acessos totais. Este diagnóstico encerra a etapa solicitada; toda implementação e validação executável ficam para autorização separada.
