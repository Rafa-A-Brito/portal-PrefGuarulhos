# FB-INT-2 — Feedback na Dashboard e revisão administrativa

26/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD `29d5a0340cab9165f22394f7df96c1d14264a9db`. Sem fetch, commit, push, deploy ou ativação pública.

## Diagnóstico inicial

Consultados [FB-INT-1](feedback_integracao_fb_int_1.md), README, arquitetura F1, operação de Feedback, relatórios F2–F4, componentes administrativos, serviços, validadores e testes. A implementação existente já fornece listagem, resumo, detalhe, gráficos com carregamento lazy e tabelas acessíveis. O endpoint de resumo é suficiente para a Dashboard; não houve necessidade de alteração no backend, autenticação, permissões, modelo ou migrations.

A FB-INT-1 registrou **904/905**, com um teste do Histórico incompatível com a busca visual reformulada. Esse número é a referência documentada da etapa anterior, não uma nova execução integral anterior à edição nesta etapa. O estado local foi conferido e registrado por SHA-256 antes de editar: configurações FB-INT-1, relatório anterior e alterações visuais de `AdminAuditoria.jsx`/CSS já estavam presentes.

## Correção separada: teste do Histórico

Em `AdminAuditoria.test.jsx`, o caso “busca nome/e-mail em admins e envia somente UUID à auditoria” agora encontra o grupo **Resultados da busca de responsáveis**, seleciona o radio pelo nome/e-mail e confirma que ele ficou marcado. Mantidas as asserções de pesquisa `{busca, pagina, limite}` e da consulta à auditoria com **somente UUID**, paginação e limite. Nenhuma asserção anterior foi removida.

O nome acessível concatena os dois spans de nome/e-mail; o seletor contempla essa composição sem depender de um separador visual inexistente. O arquivo completo passou: **18/18**. `AdminAuditoria.jsx` e seu CSS permanecem idênticos ao início desta execução.

## Arquivos e implementação

| Arquivo | Alteração |
| --- | --- |
| `frontend/src/features/admin/pages/AdminDashboard.jsx` | Monta `SecaoFeedback` somente quando o perfil existente é ADMIN. |
| `frontend/src/features/admin/components/SecaoFeedback.jsx` | Nova seção que consome apenas `resumirFeedback`; filtros, atualização, cancelamento e estados próprios. |
| `frontend/src/features/admin/components/FiltrosFeedback.jsx` | Extrai o formulário de filtros existente para reutilização nas duas telas. IDs únicos e associação da mensagem de erro aos campos com `aria-describedby`. |
| `frontend/src/features/admin/pages/AdminFeedback.jsx` | Substitui apenas o formulário inline pelo componente compartilhado, preservando consultas, lista, paginação e modal. |
| `frontend/src/features/admin/pages/AdminFeedback.module.css` | Estilos locais da seção e link da Dashboard, usando cores, bordas e espaçamentos administrativos existentes. |
| `frontend/test/AdminDashboard.test.jsx` | Atualiza o adapter para distinguir o resumo de Feedback do endpoint do acervo, preservando a verificação dos quatro gráficos existentes. |
| `frontend/test/SecaoFeedback.test.jsx` | 16 novos testes da integração e seus estados. |
| `frontend/test/AdminAuditoria.test.jsx` | Correção de compatibilidade descrita separadamente acima. |
| Este relatório | Diagnóstico, decisões, evidências e limites da validação. |

Dos **972 arquivos preexistentes conferidos**, somente os cinco arquivos rastreados relacionados nesta tabela foram alterados; os dois componentes, o teste novo e este relatório foram adicionados. [Manifesto inicial](../.cache/fb_int_2/antes.json) e [integridade final](../.cache/fb_int_2/integridade.json). Preservados byte a byte o Histórico visual, Home/`heroDestaqueMock`/+25, Contato, Feedback público, FB-INT-1, serviços, backend, dependências e migrations. Nenhuma dependência instalada.

## Comportamento da Dashboard

A seção **Feedback e participação do público** apresenta total retido, distribuição por elogio/sugestão/problema e evolução temporal, com os componentes existentes `FeedbackDashboard` e `FeedbackGraficos`. Quantidades por categoria continuam disponíveis na tabela de valores exatos, além das barras. Gráficos mantêm lazy loading, alternativa tabular e limite de precisão segura; números acima desse limite ficam na tabela, sem arredondamento gráfico.

- Período inicial: 30 dias civis de São Paulo, incluindo hoje. Em 26/11/2026: **28/10/2026 a 26/11/2026**. Filtros de data, tipo e granularidade diária/mensal usam os validadores existentes: datas reais, sem futuro e até 366 dias.
- “Aplicar filtros” valida e consulta; “Atualizar dados” mantém o recorte efetivamente aplicado; “Limpar filtros” retorna ao período padrão. A tela identifica o recorte aplicado e o horário da consulta no fuso paulista. Dados com cinco minutos ou mais recebem indicação de desatualização.
- Cada consulta tem `AbortController`. Troca de filtros e desmontagem cancelam a leitura anterior; respostas atrasadas não substituem a consulta atual. Dados anteriores deixam de aparecer durante nova consulta ou falha.
- Loading, erro, consulta desativada e vazio legítimo são independentes do acervo e das métricas. Falha/desativação não mostram total zero. 401/403 não oferecem repetição inútil; indisponibilidade e falhas de comunicação permitem nova tentativa.
- A seção depende do perfil ADMIN, não de `VITE_FEEDBACK_ATIVO`. EDITOR não a monta nem dispara requisição de Feedback. A autorização real do backend permanece intacta.
- O link leva a `/admin/feedback`; a Dashboard não consulta a lista nem mensagens. Não há novo serviço, endpoint, campo, nota de satisfação, visitante único ou fluxo de atendimento.

Strings decimais, BigInt, metadados de retenção de 180 dias e períodos parciais seguem o contrato existente. O total representa contribuições recebidas e ainda retidas no recorte, não participação total da população. Nenhuma métrica V2 foi redefinida.

## Revisão de AdminFeedback

Listagem, ordenação, paginação, filtros, resumo e detalhe funcionaram com a API real existente. O modal mantém foco inicial no título, contenção de Tab/Shift+Tab, fechamento por Escape e retorno ao botão de origem. Comentários continuam restritos ao detalhe.

O ajuste necessário foi compartilhar os mesmos filtros com a Dashboard e associar explicitamente o erro de validação aos campos. Não houve reformulação da página, da listagem ou do modal. As tabelas largas conservam rolagem interna acessível; não alargam a página. Lista e resumo mantêm seus horários próprios, pois são leituras independentes e podem divergir se houver novo envio ou expiração entre elas.

## Integração real: API, navegador e PostgreSQL

Reutilizado o cluster exclusivo da FB-INT-1: PostgreSQL **18.6**, `127.0.0.1:5558`, banco `portal_test`, identificador **7712578530882550764**. Antes do ensaio foram conferidos identidade, 16 migrations/checksums e cinco feedbacks/cinco recibos. Não foram reaplicadas migrations, fixtures ou seeds; nenhum reset ou acesso ao banco habitual.

Backup custom local antes do ensaio; API real com papel restrito em `127.0.0.1:3358`, frontend em `127.0.0.1:5238`. Nesta validação, recebimento público e interface pública ficaram desligados no processo; somente consulta administrativa habilitada. Login real utilizou as contas sintéticas existentes. Leituras SQL usaram transações **READ ONLY**. Logins/logout geraram operações normais de sessão somente nesse banco exclusivo.

| Verificação real | Resultado |
| --- | --- |
| SQL × resumo HTTP × tabelas/gráficos das duas telas | **5**, sendo **2 elogios, 2 sugestões e 1 problema**. Série: cinco em 26/11/2026, zero nos demais dias do período inicial. |
| Filtro Sugestão + granularidade mensal nas duas telas | **2**, em novembro; outubro com zero, períodos parciais sinalizados. |
| Recorte 01–02/01/2026 | Vazio legítimo, total zero e aviso de ausência de registros nas duas telas. |
| Listagem/paginação HTTP, limite 2 | Três páginas com **2, 2 e 1**, cinco UUIDs distintos, total 5. |
| Modal de detalhe | Dados sintéticos carregados da API; teclado e retorno do foco conferidos nas quatro larguras. |
| ADMIN | Resumo, lista e detalhe acessíveis, com login real. |
| EDITOR | Dashboard sem seção e **zero requisições** a Feedback; chamada direta ao resumo retornou **403**. |
| Público | Resumo sem credencial retornou **401**. |
| Preservação | Hash do conteúdo completo das tabelas de Feedback/recibos igual antes/depois; **5 registros e 5 recibos**. Nenhum POST público. |

[Resultados reais e medições](../.cache/fb_int_2/visual.json), [roteiro](../.cache/fb_int_2/visual.mjs) e [log](../.cache/fb_int_2/visual_conferencia.log). O arquivo de resultados contém contagens, filtros e hashes; não contém credenciais ou mensagens. A comparação real não usa mocks de persistência. Os serviços temporários foram encerrados; cluster e backups preservados.

## Validação visual e acessibilidade

Edge/Chromium headless em **320, 390, 768 e 1440 px**, com API real. Dashboard e página de Feedback sem overflow horizontal da página; tabelas podem rolar dentro de sua região. Mesmos valores nas duas telas em todas as larguras. Capturas representativas da Dashboard, página e modal foram inspecionadas visualmente.

| Largura | Dashboard | Feedback | Modal |
| --- | --- | --- | --- |
| 320 | [captura](../.cache/fb_int_2/dashboard_320.png) | [captura](../.cache/fb_int_2/feedback_320.png) | [captura](../.cache/fb_int_2/detalhe_320.png) |
| 390 | [captura](../.cache/fb_int_2/dashboard_390.png) | [captura](../.cache/fb_int_2/feedback_390.png) | [captura](../.cache/fb_int_2/detalhe_390.png) |
| 768 | [captura](../.cache/fb_int_2/dashboard_768.png) | [captura](../.cache/fb_int_2/feedback_768.png) | [captura](../.cache/fb_int_2/detalhe_768.png) |
| 1440 | [captura](../.cache/fb_int_2/dashboard_1440.png) | [captura](../.cache/fb_int_2/feedback_1440.png) | [captura](../.cache/fb_int_2/detalhe_1440.png) |

Tab nos filtros produz contorno sólido de **3 px**, sem alteração artificial de CSS no ensaio. Modal conserva contenção e retorno do foco. Contraste calculado com cores computadas: botão principal **13,80:1**, ajuda dos filtros **7,50:1**. Isso verifica esses elementos, não constitui auditoria completa de contraste da aplicação. Reflow adicional em 720 CSS px/DPR 2 sem overflow, [captura](../.cache/fb_int_2/reflow_200.png); não equivale a ensaio de zoom nativo do navegador.

Gráficos também foram trazidos à viewport antes de capturar, com presença de caminhos SVG conferida. As evidências em `.cache` são locais, ignoradas pelo Git e não acompanham um clone.

## Testes automatizados — distinguindo mocks

Testes React usam adapters/fixtures controlados; os novos testes substituem os componentes gráficos para testar estados, autorização e contratos. Testes existentes da Dashboard continuam renderizando seus gráficos reais. Essas verificações não são comprovação de persistência. O ensaio integrado descrito acima utiliza HTTP e SQL reais.

Os 16 novos testes cobrem: ADMIN/EDITOR/sem perfil, período padrão, filtros/limpeza/atualização, 401/403/503/rede, consulta desativada versus vazio, independência dos outros indicadores, erro acessível/foco, cancelamento, resposta atrasada, falha após atualização, recuperação, BigInt, retenção, desatualização e resumo inconsistente. 503 e falha de comunicação foram simulados nos testes automatizados; não foram provocados desligando o banco real nesta etapa.

| Verificação | Resultado |
| --- | --- |
| Histórico completo | **18/18**; incluído na regressão conjunta de Histórico/Dashboard/AdminFeedback, **46/46**, 33,80 s. |
| Nova seção | **16/16**, 13,83 s. |
| Direcionados frontend | **171/171**, nove arquivos, 47,37 s, exit 0. |
| Suíte frontend completa | **921/921**, **53/53 arquivos**, 226,89 s, exit 0. Os 905 anteriores e 16 novos passaram. |
| Backend pertinente | **16 aprovados**, zero falhas e **1 skip** explícito da integração histórica PostgreSQL 17, 6,88 s. |
| Lint frontend | Exit 0, sem mensagens. |
| Build frontend | Exit 0; 1.480 módulos, 3,54 s. |
| `git diff --check` | Exit 0; avisos Git de normalização futura LF/CRLF, sem erro de whitespace. |

Mantidos os avisos do build: chunk principal acima de 500 kB (**753,93 kB; gzip 214,57 kB**), import estático/dinâmico de `PatrimonioEditor` e tempo de plugins. Nenhum aviso suprimido.

Logs: [regressão](../.cache/fb_int_2/regressao.log), [nova seção](../.cache/fb_int_2/secao.log), [direcionados](../.cache/fb_int_2/direcionados.log), [suíte completa](../.cache/fb_int_2/suite_completa.log), [backend](../.cache/fb_int_2/backend.log), [lint](../.cache/fb_int_2/lint.log), [build](../.cache/fb_int_2/build.log).

Comandos em **cmd.exe**, partindo de `frontend`, com Node 24.22.1 já disponível:

```bat
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/AdminAuditoria.test.jsx test/AdminDashboard.test.jsx test/SecaoFeedback.test.jsx test/AdminFeedback.test.jsx test/Feedback.test.jsx test/feedbackDashboard.test.js test/feedbackPublicoApi.test.js test/ContatoFoco.test.jsx test/ContatoGeometria.test.js --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
git diff --check
```

Backend: `node --test --test-concurrency=1 test/feedback.test.js test/feedbackSeguranca.test.js test/feedback.integration.test.js`, pelo wrapper local `.cache/fb_int_2/backend.cjs`. Usa `DATABASE_URL` sentinela inacessível e não carrega o `.env` habitual. Os testes HTTP de demonstração/memória não são classificados como PostgreSQL real.

## Limitações, pendências e reprodução

- PostgreSQL 18.6 real reaproveitado; suíte histórica PostgreSQL 17 permaneceu em skip. Docker, proxy Nginx e HTTPS não foram homologados novamente. Não houve acesso a banco compartilhado/produção.
- Cinco registros cabem na primeira página da UI (limite 20). Paginação real foi exercitada por HTTP com limite 2; navegação entre páginas da UI permanece coberta pelos testes com fixtures existentes.
- O acervo isolado está vazio. A independência com indicadores do acervo preenchidos foi conferida nos testes automatizados com fixtures; no navegador real preservaram-se o estado vazio legítimo e a seção de métricas.
- Sem aparelho físico, leitor de tela, zoom nativo ou teste de carga. O relatório não declara conformidade integral de acessibilidade.
- A primeira tentativa de navegador falhou no roteiro ao preencher login antes da montagem do campo; corrigida a espera, sem alterar a aplicação. Uma primeira seleção textual do teste do Histórico também foi ajustada à concatenação real do nome acessível. As execuções finais passaram.
- Navegador e início do PostgreSQL exigiram execução fora do sandbox Windows, aprovada automaticamente, restrita ao cluster exclusivo/loopback. Nenhuma rejeição de aprovação.
- Flags versionadas continuam falsas. A nova seção administrativa pode informar consulta desativada mesmo com formulário público desligado: os controles são independentes. Aviso institucional, retenção, responsabilidades e ativação pública definitiva continuam pendentes de aprovação.

Para revisão manual, usar os comandos de início/parada do ambiente já preparado em [FB-INT-1 — Como testar localmente](feedback_integracao_fb_int_1.md#como-testar-localmente), sem executar preparação, fixtures ou roteiros de envio novamente. Acessar `/admin` e `/admin/feedback` com a conta sintética ADMIN. Para somente consulta nesta revisão, iniciar a API com `FEEDBACK_CONSULTA_ATIVA=true` e `FEEDBACK_RECEBIMENTO_ATIVO=false`, e Vite com `VITE_FEEDBACK_ATIVO=false`; demais variáveis locais e origem exata continuam conforme FB-INT-1. Credenciais ficam exclusivamente no armazenamento local ignorado.

Recomenda-se realizar a homologação institucional/operacional e PostgreSQL 17/HTTPS no ambiente autorizado antes de qualquer publicação. Não há necessidade demonstrada de novos endpoints ou campos para os indicadores entregues.
