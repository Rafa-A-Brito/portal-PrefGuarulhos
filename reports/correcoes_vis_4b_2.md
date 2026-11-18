# VIS-4B.2 — Finalização visual administrativa

18/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD `0b36c5aa14b577f2ee74371824c3d6ef4d34a0d4`. Sem fetch, commit, push ou deploy.

## Escopo e diagnóstico

Consultados a [auditoria VIS-4A](auditoria_visual_vis_4a.md) e o [relatório VIS-4B.1](correcoes_vis_4b_1.md), confrontados com os componentes e estilos atuais. As alterações locais da VIS-4B.1, seus testes e relatórios, além da alteração externa `extra: 25` no mock da Home, foram preservados.

Foram corrigidos somente V4A-04, V4A-05 e V4A-06. As 40 capturas anteriores confirmaram checkbox em coluna, botões de 40 px e duas mensagens/ações para falha simultânea equivalente do Feedback.

## Arquivos e correções

| Arquivo | Causa e correção |
| --- | --- |
| [AdminRegioes.css](../frontend/src/features/admin/pages/AdminRegioes.css) | O checkbox herdava `flex-direction: column` de `.admin-form label`. Seu seletor específico agora define `row`, alinhamento central e gap de `.5rem`. Nenhum JSX ou outro label foi alterado. A página declara a altura mínima administrativa de 44 px. |
| [admin.css](../frontend/src/features/admin/admin.css) | O seletor compartilhado de botões tinha maior especificidade e impunha 40 px sobre as regras locais de 44 px. Passa a consumir `var(--admin-button-min-height, 40px)`. O padrão das demais telas continua 40 px; cores, hover, foco e disabled da VIS-4B.1 permanecem intactos. |
| [AdminAuditoria.module.css](../frontend/src/features/admin/pages/AdminAuditoria.module.css) e [AdminFeedback.module.css](../frontend/src/features/admin/pages/AdminFeedback.module.css) | Página e diálogo declaram a variável de 44 px; removidas as declarações locais concorrentes de `min-height` dos botões. Sem `!important` novo nem alteração do CSS público. |
| [AdminFeedback.jsx](../frontend/src/features/admin/pages/AdminFeedback.jsx) | As duas consultas renderizavam `Falha` independentemente. Quando ambas terminaram na revisão atual e os erros normalizados têm o mesmo status e mensagem, uma única `Falha` usa a recuperação existente. Erros diferentes e falhas parciais continuam independentes. Prioridades de acesso e consulta desativada foram preservadas. |
| [AdminFeedback.test.jsx](../frontend/test/AdminFeedback.test.jsx) | Seis casos adicionais: falha equivalente e recuperação com filtros aplicados; duas falhas parciais; dois pares de status diferentes, inclusive com mensagem genérica igual; nova consulta pendente sem reaproveitar erro antigo. |
| [vis_4b_2_visual.mjs](../frontend/test/vis_4b_2_visual.mjs) | Novo ensaio opt-in com regressões das três correções no navegador: layout real, teclado, foco, hover, disabled, recuperação e erros. Usa fixtures locais, sem alteração de dados da aplicação. |
| Este relatório | Resultados, evidências e pendências. |

São cinco fontes de produção, dois arquivos de testes e este relatório nesta entrega. A [comparação de hashes](../.cache/vis_4b_2/comparacao.json) conferiu 934 arquivos preexistentes e encontrou somente os seis arquivos preexistentes acima modificados. O script visual e este relatório são novos. Home, favoritos, conservação/visitação pública, `formatarAuditoria.js`, `AdminUsuarios.jsx`, mock, autenticação, serviços HTTP e escopos de backend permaneceram idênticos ao início desta rodada.

## Validação

| Verificação | Resultado |
| --- | --- |
| Lint frontend | Aprovado, exit 0, incluindo o script visual final. |
| Testes direcionados | `AdminFeedback` e `AdminAuditoria`: **41/41 aprovados**, exit 0, 18,92 s. |
| Suíte completa | **818 testes em 41 arquivos: 809 aprovados e 9 falhas**, exit 1, 217,18 s. As falhas públicas estão discriminadas abaixo; não foi declarada aprovação global. |
| Build | Aprovado, exit 0, 1.471 módulos, 5,11 s. |
| Navegador | **40 cenários/capturas antes e 40 depois**, 320, 390, 768 e 1440 px. Ensaio final aprovado, exit 0. |
| Integridade | `git diff --check` aprovado. Alterações anteriores preservadas; nenhum commit ou alteração intencional do índice. |

Os testes de regressão CSS são executados no Chromium pelo roteiro opt-in, onde há layout computado, e não por asserções de CSS no JSDOM. O roteiro percorre Regiões, Histórico e Feedback, incluindo formulário/diálogos e quatro modos de falha do Feedback nas quatro larguras.

| Medição nas quatro larguras | Antes | Depois |
| --- | --- | --- |
| Direção do label “Região ativa” | `column` | `row`; outro label amostrado mantém `column` |
| Altura dos botões medidos nas três telas e diálogos | 40 px | **44 px**, inclusive paginação desabilitada |
| Opacidade dos botões disabled | 0,55 | 0,55 |
| Feedback: ambas as consultas com 503 | 2 alertas / 2 recuperações | **1 alerta / 1 recuperação** |
| Feedback: só resumo ou só lista com 503 | 1 alerta; resultado independente visível | Preservado |
| Feedback: resumo 503 e lista 429 | 2 alertas / 2 recuperações | Preservado |
| Overflow horizontal do documento | Nenhum | Nenhum |

O clique no label alterna o checkbox; Espaço com foco retorna ao estado anterior. Enter abre edição/detalhes; Tab permanece no diálogo e Escape retorna ao acionador. Foco visível e contorno de pelo menos 2 px foram verificados no checkbox e nos diálogos nas quatro larguras. Os 12 ensaios de hover outline mantêm fundo `rgb(238, 240, 251)` e texto navy. As 16 recuperações de erro via Enter recuperam a lista sem envio de dados. O roteiro também confirma apenas requisições GET e nenhuma exceção JavaScript não tratada.

### Pendências encontradas pela suíte completa

| Arquivo | Falhas e evidência |
| --- | --- |
| `Inicio.test.jsx` | Três asserções esperam `+5`, mas o mock externo fornece `+25`. O mock e os testes da Home não foram modificados. |
| `FluxosFrontendF2.test.jsx` | Quatro falhas relativas a nomes acessíveis de busca, sincronização de URL/histórico e paginação nas páginas públicas. Essas páginas e seus testes mantiveram os hashes iniciais. |
| `RoteamentoPublico.test.jsx` | Duas falhas esperam “Página não encontrada” em caminhos desconhecidos, comportamento ausente na árvore atual. `App.jsx` e esse teste não foram alterados. |

Essas divergências estão fora das três correções autorizadas. Não foram ajustados testes para ocultá-las nem restauradas funcionalidades públicas nesta rodada. A ausência de recomposição integral da navegação/404 já estava documentada na VIS-3. Os detalhes completos estão no [log da suíte](../.cache/vis_4b_2/suite.log).

Uma execução de controle carregou em memória as versões anteriores dos cinco fontes de produção desta etapa, conferindo seus hashes contra o manifesto inicial, sem reverter o checkout. Os três arquivos públicos repetiram exatamente as **nove falhas**, com 29/38 testes aprovados, 20,21 s, exit 1. Isso confirma que elas precedem estas correções: [log de controle](../.cache/vis_4b_2/baseline_testes.log) e [configuração temporária](../.cache/vis_4b_2/base.config.mjs).

## Capturas e medições

| Cenário | Antes | Depois |
| --- | --- | --- |
| Checkbox e formulário, 320 px | [Captura](../.cache/vis_4b_2/antes/regioes_checkbox_320.png) | [Captura](../.cache/vis_4b_2/depois/regioes_checkbox_320.png) |
| Checkbox e formulário, 390 px | [Captura](../.cache/vis_4b_2/antes/regioes_checkbox_390.png) | [Captura](../.cache/vis_4b_2/depois/regioes_checkbox_390.png) |
| Regiões, 768 px | [Captura](../.cache/vis_4b_2/antes/regioes_768.png) | [Captura](../.cache/vis_4b_2/depois/regioes_768.png) |
| Histórico e foco no diálogo, 1440 px | [Captura](../.cache/vis_4b_2/antes/historico_modal_1440.png) | [Captura](../.cache/vis_4b_2/depois/historico_modal_1440.png) |
| Feedback: falha simultânea, 390 px | [Captura](../.cache/vis_4b_2/antes/feedback_ambas_390.png) | [Captura](../.cache/vis_4b_2/depois/feedback_ambas_390.png) |

- Falhas parciais: [resumo, 320 px](../.cache/vis_4b_2/depois/feedback_resumo_320.png), [lista, 768 px](../.cache/vis_4b_2/depois/feedback_lista_768.png).
- Falhas diferentes: [1440 px](../.cache/vis_4b_2/depois/feedback_diferentes_1440.png).
- Feedback normal: [320](../.cache/vis_4b_2/depois/feedback_320.png), [390](../.cache/vis_4b_2/depois/feedback_390.png), [768](../.cache/vis_4b_2/depois/feedback_768.png), [1440](../.cache/vis_4b_2/depois/feedback_1440.png).
- [Medições anteriores](../.cache/vis_4b_2/antes/resultado.json), [medições finais](../.cache/vis_4b_2/depois/resultado.json), [comparação e integridade](../.cache/vis_4b_2/comparacao.json).
- [Lint](../.cache/vis_4b_2/lint.log), [testes direcionados](../.cache/vis_4b_2/direcionados.log), [build](../.cache/vis_4b_2/build.log), [log visual final](../.cache/vis_4b_2/visual_depois.log).

Comandos a partir de `frontend`, em `cmd.exe`, com Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/AdminFeedback.test.jsx test/AdminAuditoria.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\vis_4b_2_visual.mjs --antes
..\.cache\d4_final\node24\node.exe test\vis_4b_2_visual.mjs
```

O modo `--antes` foi executado antes das alterações de produção; não restaura fontes. A execução direcionada incluiu também o caminho inexistente `test/AdminRegioes.test.jsx`, sem criar nem executar tal arquivo; os dois arquivos efetivamente executados são os indicados acima. A regressão de Regiões foi validada pelo roteiro no navegador.

## Conclusão e limites

**A VIS-4B pode ser considerada concluída para os seis itens da auditoria**, com V4A-01 a V4A-03 preservados e V4A-04 a V4A-06 validados nesta rodada. Isso não representa aprovação global da branch: a suíte completa continua com nove falhas públicas.

Não há impedimento identificado nestas três correções para iniciar o planejamento/auditoria da VIS-5. Antes de uma nova homologação global, é necessário reconciliar as expectativas da Home e as pendências públicas de navegação/404. O escopo da VIS-5 não foi definido neste pedido, portanto não se certifica antecipadamente sua viabilidade nem se inicia sua implementação.

Build mantém os avisos conhecidos de chunk principal acima de 500 kB (**738,44 kB; 209,38 kB gzip**), import estático/dinâmico do editor e tempo de plugins. Nenhum aviso foi suprimido.

As capturas usam Chromium/Vite isolado, `configFile:false`, `envDir:false`, sessão e respostas sintéticas. Flags de coleta e métricas ficam falsas no ensaio; nenhum endpoint real foi consultado ou ativado. Falhas HTTP 503/429 geram mensagens de rede esperadas. Não houve backend, banco, escrita, instalação de dependências ou envio real. Evidências em `.cache/` são locais e ignoradas pelo Git. Não foram ensaiados leitor de tela, dispositivo físico, zoom de 200% ou API real; não há alegação de certificação integral de acessibilidade ou liberação de produção.
