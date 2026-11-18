# VIS-4A — Auditoria visual administrativa

18/11/2026, America/Sao_Paulo. Auditoria somente leitura; nenhuma correção VIS-4B aplicada.

## Base e método

- Branch `development/backend`; HEAD e referência **local** `origin/development/backend`: `0b36c5aa14b577f2ee74371824c3d6ef4d34a0d4`. Checkout inicialmente limpo. Não houve fetch; a referência local não certifica o remoto.
- Analisados [README](../README.md), [README frontend](../frontend/README.md), [finalização UI-F1](../frontend/reports/finalizacao_frontend_ui_f1.md), componentes, serviços de leitura, formatadores, CSS e fixtures das cinco telas.
- Confrontados também os relatórios [preparação VIS-4](home_branca_preparacao_vis_4_2026_11_18.md), [VIS-3](vis_3_conservacao_visitacao_2026_11_17.md) e [restauração do card](restauracao_card_mock_2026_11_18.md). Seus resultados pertencem às respectivas execuções, não foram reutilizados como aprovação desta branch.
- Chromium local com Vite isolado, `configFile:false`, `envDir:false`, respostas HTTP sintéticas e sessão de ensaio. Sem conexão com backend, banco ou serviços externos. Somente GETs permitidos pelo servidor de fixtures. Nenhum cadastro, alteração de conta ou envio de feedback foi executado.
- Inspeção de Regiões, Histórico, Usuários, Dashboard e Feedback em **320, 390, 768 e 1440 px**; formulários de edição e diálogos nas quatro larguras. Erros de consulta HTTP 503 e listas vazias em 320 e 1440 px. Conferidos estilos computados, geometria, Tab, Enter, Escape e foco dos diálogos; nos gráficos, foco e seta direita.
- Roteiros temporários e evidências ficam em `.cache/vis_4a/`. O script existente `frontend/test/vis_4_auditoria.mjs` foi lido e adaptado somente em cache, sem edição do original.

O README ainda chama D4D.1 de “pacote preparado”, embora a navegação administrativa já exista. Essa divergência documental não é um defeito visual nem motivo para reimplementar a funcionalidade.

## Melhorias existentes que devem ser preservadas

| Tela | Confirmado no código e no ensaio |
| --- | --- |
| Regiões | Busca com borda e foco, listagem com nome/status/slug/descrição, botões e paginação, empilhamento mobile, formulário com labels, foco automático no nome ao editar, mensagens de catálogo vazio e erro. Slug e vínculos existentes têm explicação própria. |
| Histórico | Ações traduzidas, responsável separado do alvo, identificação do alvo pelos valores anteriores/posteriores quando disponíveis, aviso de nome ausente, fuso explícito, comparação de valores, identificadores expansíveis e exclusão de valores de senha. Tabelas com rolagem local e diálogos com foco contido e retorno ao acionador. |
| Usuários | Busca e filtros por perfil/situação, formulário responsivo, força da senha existente, proteção da própria conta, mensagens de erro/vazio e rolagem local da tabela. O formulário é inline; desativação usa confirmação nativa, não um modal customizado a ser recriado. |
| Dashboard | Quatro gráficos, legendas/valores textuais, tabela de categorias principais/secundárias, distinção entre publicação e conservação, explicação de registros sem região e legados. Estado sem acervo e recuperação de erro já existem. |
| Feedback | Filtros, recorte temporal, gráficos acompanhados de tabelas, lista paginada, detalhe com comentário completo, mensagens de indisponibilidade e diferenças entre consultas. Modal com foco contido, Escape e retorno ao botão. Integração e flags existentes preservadas. |

Nenhuma página apresentou overflow horizontal do documento nos cenários concluídos. A rolagem **interna** das tabelas de Histórico, Usuários e Feedback é intencional; a ausência inicial de colunas à direita em mobile não foi classificada como perda de conteúdo.

## Problemas confirmados e propostas VIS-4B

Prioridade: **crítico** impediria operação essencial sem alternativa; **alto** prejudica significativamente leitura/acesso; **médio** gera desorientação ou omite informação disponível; **baixo** corresponde a inconsistência localizada. Nenhum problema crítico foi confirmado.

| ID / gravidade | Problema, evidência e arquivos envolvidos | Correção recomendada, ainda não aplicada |
| --- | --- | --- |
| V4A-01 — **Alto** | Texto branco sobre azul `#3ea3dc` em “Novo usuário”/“Salvar alterações” e no item ativo Dashboard; azul sobre branco nas ações de Usuários. Contraste calculado **2,81:1** a partir das cores computadas, com texto de aproximadamente 13,5 px. Não se trata apenas de controles desabilitados. Causa: cores de `.btn-solid`/`.btn-outline` em [global.css](../frontend/src/styles/global.css), sem ajuste de cor para Usuários em [admin.css](../frontend/src/features/admin/admin.css); menu `.admin-sidebar-group--visao` usa a mesma combinação. [Captura Usuários](../.cache/vis_4a/usuarios_formulario_390.png). | Ajustar tokens/cores **no escopo administrativo**, preservando a identidade pública e estados de hover, foco e disabled. Adotar contraste textual de pelo menos 4,5:1 como critério de aceite. Não editar o favorito VIS-2 ou cores da Home. |
| V4A-02 — **Médio** | Ao acionar Editar em Usuários por Enter, o formulário abre acima da lista, mas não recebe foco. Durante a consulta o botão fica disabled e o foco chega ao `body`; o Tab seguinte vai para “Ativar” na linha, ignorando o formulário recém-aberto. Reproduzido nas quatro larguras. [AdminUsuarios.jsx](../frontend/src/features/admin/pages/AdminUsuarios.jsx), funções `editar`, `abrir` e `fechar`. [Registro de teclado](../.cache/vis_4a/teclado.json). | Encaminhar foco para título ou primeiro campo após montar o formulário e restaurá-lo ao acionador ao cancelar. Conferir também criação e falha de abertura. Reutilizar o formulário atual; não mudar autenticação, permissões ou persistência. |
| V4A-03 — **Médio** | O Histórico omite `statusVisitacao`, `motivoRestricao` e `previsaoReabertura` mesmo quando presentes em `oldValues/newValues`. Um evento contendo somente essas diferenças mostra “Detalhes dessa alteração não disponíveis”. [formatarAuditoria.js](../frontend/src/features/admin/formatarAuditoria.js), lista positiva `campos.Patrimonio` e `rotulos`. A lista permitida do backend já inclui os três campos em `backend/src/utils/auditoria.js`, consultado somente para leitura. [Reprodução visual](../.cache/vis_4a/historico_visitacao_1440.png). | Ampliar apenas a apresentação do formatador para os campos já recebidos, com rótulos claros, valores ausentes distintos de `null` e previsão como dia civil. Não reconstruir dados ausentes, não consultar outras APIs e não deduzir visitação pela conservação. Proposta de informação exibida, sem alterar regras VIS-3. |
| V4A-04 — **Baixo** | Checkbox “Região ativa” centralizado acima do texto, produzindo espaço desnecessário e associação visual fraca. `.admin-regioes-check` define `display:flex`, mas mantém `flex-direction:column` de `.admin-form label`. [AdminRegioes.css](../frontend/src/features/admin/pages/AdminRegioes.css) e [admin.css](../frontend/src/features/admin/admin.css). Direção computada `column` nas quatro larguras. [Captura](../.cache/vis_4a/regioes_formulario_320.png). | Definir direção horizontal e gap no seletor específico do checkbox; preservar label clicável, foco e texto explicativo. Não alterar todos os labels administrativos. |
| V4A-05 — **Baixo** | Regras locais de altura mínima de 44 px para botões em Regiões, Histórico e Feedback perdem para `.admin-shell :is(.btn-solid,.btn-outline)` de 40 px, mais específico. Resultado: controles e botões de uma mesma barra têm alturas divergentes; os botões medidos ficam em 40 px. [admin.css](../frontend/src/features/admin/admin.css), [AdminRegioes.css](../frontend/src/features/admin/pages/AdminRegioes.css), [AdminAuditoria.module.css](../frontend/src/features/admin/pages/AdminAuditoria.module.css), [AdminFeedback.module.css](../frontend/src/features/admin/pages/AdminFeedback.module.css). | Definir uma regra administrativa coerente e eliminar a disputa de especificidade, sem `!important` e sem tocar estilos públicos. Preferir alvo de 44 px conforme o padrão adotado pelo projeto. A medida de 40 px, isoladamente, não foi tratada como bloqueio de teclado ou prova de violação normativa. |
| V4A-06 — **Baixo** | Quando resumo e lista de Feedback falham simultaneamente com 503, aparecem duas mensagens idênticas e dois botões “Tentar novamente”, ambos acionando a mesma atualização. [AdminFeedback.jsx](../frontend/src/features/admin/pages/AdminFeedback.jsx), renderizações independentes de `Falha`. [Captura](../.cache/vis_4a/feedback_erro_320.png). | Agrupar somente falhas simultâneas equivalentes em uma mensagem/ação. Manter erros parciais separados e preservar a independência das consultas, os filtros e todas as regras de integração. |

### Histórico: o que não constitui defeito

No evento de edição de usuário, o responsável é “Ana — nome atual” e o alvo é “Nome alterado”, recebido nos valores posteriores. A interface informa que o cadastro do responsável é atual e não um snapshot histórico. Em evento sem nome do alvo, tipo e ID permanecem disponíveis; não é seguro preencher esse nome com o responsável ou inventar uma consulta adicional. Os códigos operacionais e fallbacks já tratados pela UI-F1 devem continuar intactos.

### Dashboard: investigação das capturas e estados vazios

As primeiras capturas de **página inteira** omitiram os desenhos SVG do Dashboard, embora houvesse dimensões, paths e cores válidos. A repetição com os gráficos dentro da viewport mostrou donuts, radar e barras corretamente **sem qualquer mudança no código**. Portanto, “gráficos ausentes” não integra a lista VIS-4B: foi um artefato da captura, e a hipótese do relatório preparatório não se confirmou como defeito da aplicação.

Os quatro gráficos foram recapturados separadamente nas quatro larguras. Legendas e a tabela fornecem valores exatos; categorias secundárias não são somadas ao total. O radar usa os dados regionais disponíveis, sem confundir bairro com região. Rótulos e valores da escala radial merecem uma medição de contraste específica futura, mas não se propõe trocar a biblioteca ou redesenhar gráficos sem essa avaliação.

O estado de acervo vazio deve exibir “Nenhum patrimônio cadastrado” e explicar que os gráficos aparecerão quando houver registros. As capturas finais de erro/vazio aguardam a entrada efetiva no painel; quatro imagens iniciais desses estados capturaram a transição “Acesso verificado” e **não são evidência de validação do Dashboard**. No Feedback, a primeira fixture de lista vazia manteve resumo com três registros e corretamente acionou o aviso de consultas divergentes; a rodada final usa resumo e lista zerados.

A rodada final confirmou essas mensagens de vazio e as ações de recuperação de erro nas duas larguras ensaiadas. Foram geradas **82 capturas ao todo**: 56 no roteiro principal, duas na investigação complementar e 24 na rodada final, incluindo as capturas iniciais descartadas como evidência acima. As rodadas concluíram sem exceções JavaScript não tratadas ou overflow horizontal medido. Os cenários 503 produzem erros de rede/console esperados, inclusive no provider público montado pelo aplicativo; isso não foi apresentado como console livre de mensagens. Não houve requisições de escrita.

## Capturas e registros

| Tela / estado normal | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Regiões | [Captura](../.cache/vis_4a/regioes_320.png) | [Captura](../.cache/vis_4a/regioes_390.png) | [Captura](../.cache/vis_4a/regioes_768.png) | [Captura](../.cache/vis_4a/regioes_1440.png) |
| Histórico | [Captura](../.cache/vis_4a/historico_320.png) | [Captura](../.cache/vis_4a/historico_390.png) | [Captura](../.cache/vis_4a/historico_768.png) | [Captura](../.cache/vis_4a/historico_1440.png) |
| Usuários | [Captura](../.cache/vis_4a/usuarios_320.png) | [Captura](../.cache/vis_4a/usuarios_390.png) | [Captura](../.cache/vis_4a/usuarios_768.png) | [Captura](../.cache/vis_4a/usuarios_1440.png) |
| Dashboard — viewport do primeiro gráfico | [Captura](../.cache/vis_4a/dashboard_grafico_0_320.png) | [Captura](../.cache/vis_4a/dashboard_grafico_0_390.png) | [Captura](../.cache/vis_4a/dashboard_grafico_0_768.png) | [Captura](../.cache/vis_4a/dashboard_grafico_0_1440.png) |
| Feedback | [Captura](../.cache/vis_4a/feedback_320.png) | [Captura](../.cache/vis_4a/feedback_390.png) | [Captura](../.cache/vis_4a/feedback_768.png) | [Captura](../.cache/vis_4a/feedback_1440.png) |

- Diálogos: [Histórico 390](../.cache/vis_4a/historico_modal_390.png), [Feedback 320](../.cache/vis_4a/feedback_modal_320.png). Tab permanece no diálogo; Escape devolve o foco ao botão de detalhe nas quatro larguras.
- Gráficos: [radar 320](../.cache/vis_4a/dashboard_grafico_1_320.png), [categorias 390](../.cache/vis_4a/dashboard_grafico_2_390.png), [publicação 768](../.cache/vis_4a/dashboard_grafico_3_768.png). As 16 capturas de gráficos estão identificadas por índice 0–3 e largura.
- Estados finais: [Dashboard vazio 320](../.cache/vis_4a/dashboard_vazio_final_320.png), [Dashboard erro 1440](../.cache/vis_4a/dashboard_erro_final_1440.png), [Feedback vazio 320](../.cache/vis_4a/feedback_vazio_final_320.png), [Feedback erro 1440](../.cache/vis_4a/feedback_erro_final_1440.png).
- [Medições principais](../.cache/vis_4a/resultado.json), [teclado](../.cache/vis_4a/teclado.json), [reprodução do Histórico](../.cache/vis_4a/extras.json), [rodada final](../.cache/vis_4a/final.json), [log final](../.cache/vis_4a/final.log).

## Encaminhamento e limites

Ordem recomendada para VIS-4B: **V4A-01**, **V4A-02**, **V4A-03** e depois os ajustes locais **V4A-04 a V4A-06**. Cada alteração deve ter aceite nas quatro larguras, preservação dos estados disabled/erro e revisão de teclado. O Histórico requer cobertura de eventos com e sem os três campos de visitação; o Feedback requer falha parcial e simultânea.

Nesta execução, o único arquivo de entrega criado pelo agente é **este relatório**. Nenhum fonte, teste, CSS, manifest, lock, backend ou configuração foi modificado pelo agente. VIS-1, VIS-2 e VIS-3 foram preservadas. Não foram executados lint, suíte unitária ou build: o pedido é de auditoria sem alteração de código, com validação visual, e os resultados das etapas anteriores não foram apresentados como novos.

A [conferência de integridade](../.cache/vis_4a/integridade.json) comparou 931 arquivos rastreados. Durante a auditoria surgiu uma alteração externa em `frontend/src/features/mocks/destaquesMock.js` (`extra: 5` → `extra: 25`), não realizada por estes roteiros ou edições. Ela foi preservada integralmente; os demais 930 arquivos mantiveram seus hashes. O status final contém esse arquivo modificado e o relatório novo. Todos os links locais do relatório foram conferidos.

As evidências em `.cache` são locais e ignoradas pelo Git. Não houve login real, teste de autorização, gravação, persistência, homologação com dados reais, aparelho físico ou leitor de tela. A navegação por teclado cobriu os fluxos descritos, não constitui certificação integral de acessibilidade. Fontes externas foram bloqueadas; diferenças de tipografia do ambiente de produção ainda precisam de conferência. Não houve commit, push ou deploy.
