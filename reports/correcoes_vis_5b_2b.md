# VIS-5B.2B — Foco de Exposições/Novidades e Contato

22/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência **local** `origin/development/backend`: `26821512f534f50fef7112c6f936f54328b1193b`. Sem fetch, commit, push ou deploy.

## Escopo e diagnóstico

Consultados [VIS-5A](auditoria_acessibilidade_vis_5a.md), [VIS-5B.1](correcoes_vis_5b_1.md) e [VIS-5B.2A](correcoes_vis_5b_2a.md), confrontando A06/A07 com os componentes atuais e o padrão de foco de `AdminUsuarios.jsx`. Foram feitas **48 capturas antes das alterações de produção**.

O checkout já continha as mudanças locais das etapas anteriores. O manifesto inicial registra **951 arquivos preexistentes**. Essas mudanças foram preservadas: a comparação de hashes identifica somente os dois componentes abaixo como fontes alterados nesta execução. Não houve edição de CSS, Home, mock `+25`, favoritos, conservação/visitação, orientação de navegação, títulos, idioma, diálogo de notícias, textarea, autenticação, serviços HTTP, contratos, backend, banco, Prisma, Docker ou dependências.

| Achado | Causa confirmada | Correção |
| --- | --- | --- |
| A06 | `editar` desabilitava o acionador durante a consulta e montava o formulário sem encaminhar foco. No navegador, o foco ficava no `body`; Tab chegava a Arquivar. Criação mantinha foco em Novo conteúdo. | Pedido de foco consumido após renderização e fim de `ocupado`, adaptando o padrão existente de Usuários. Exposições foca **Título**; Novidades foca **Tipo**, seu primeiro campo. |
| A07 | O painel institucional precede o FAB no DOM, mas sua abertura conservava foco no FAB. O percurso seguinte ignorava o conteúdo recém-aberto. | Abertura foca **Fechar informações**. Tab segue para o e-mail e o FAB; Shift+Tab permite voltar ao conteúdo anterior. Fechamento explícito ou Escape retorna ao FAB conectado. |

Em A06, o acionador é guardado antes da consulta. Cancelamento retorna a ele se conectado e habilitado; se removido pelo filtro ou pela atualização da lista, usa **Buscar título**, com Novo conteúdo como alternativa adicional. A criação não depende de uma consulta de detalhe. O sucesso de salvar usa o mesmo retorno após atualizar a lista. Erro de abertura restaura um destino válido antes de abrir o modal existente; erro de salvar preserva os valores e prepara o retorno a Salvar. O modal compartilhado não foi modificado. Payloads, validações, permissões, publicação, arquivamento e exclusão permanecem intactos.

No Contato, o painel continua **não modal**: sem `aria-modal`, `inert`, bloqueio de rolagem ou contenção de Tab. O listener de Escape só existe enquanto aberto e é removido na desmontagem. O retorno usa `preventScroll`; desmontar a página não tenta recuperar foco em um acionador removido. Não foi criado novo componente.

## Arquivos desta entrega

| Arquivo | Alteração |
| --- | --- |
| [AdminConteudo.jsx](../frontend/src/features/admin/components/AdminConteudo.jsx) | Refs e pedidos de foco para criação, edição, cancelamento, sucesso e erro; destino alternativo quando o acionador desaparece. |
| [Contato.jsx](../frontend/src/pages/Contato/Contato.jsx) | Foco inicial no fechamento e retorno ao FAB, preservando o painel não modal e sua limpeza. |
| [AdminConteudoFoco.test.jsx](../frontend/test/AdminConteudoFoco.test.jsx), novo | 14 regressões, sete para cada tipo de conteúdo: consulta pendente, criação/reabertura, erro de abertura, filtro, filtro durante consulta com erro, sucesso e erro ao salvar. |
| [ContatoFoco.test.jsx](../frontend/test/ContatoFoco.test.jsx), novo | Quatro regressões: percurso livre de Tab/Shift+Tab, fechamento pelos dois controles, Escape e desmontagem sem captura de foco. |
| Este relatório | Diagnóstico, evidências e limites. |

**Dois fontes, dois testes novos e este relatório.** Nenhum teste existente foi editado. Roteiros e medições temporários estão somente em `.cache/vis_5b_2b/`.

## Validação

| Verificação | Resultado desta execução |
| --- | --- |
| ESLint frontend | Aprovado, exit 0. |
| Primeira execução dos testes novos | **18/18**, dois arquivos, exit 0; 20,78 s. |
| Suíte direcionada conjunta | **100/100**, oito arquivos, exit 0; 59,80 s. |
| Build de produção | Aprovado, exit 0; 1.474 módulos; 3,80 s. |
| Navegador, quatro larguras | **72 capturas finais** em 320, 390, 768 e 1440 px; exit 0. |
| Zoom nativo 200% | **18 capturas**, viewport 711 px CSS, DPR 2, `visualViewport.scale=1`; exit 0. |
| Complementos de teclado/geometria | **24 capturas** nas quatro larguras e **seis** com zoom; exit 0. |
| Integridade | `git diff --check` aprovado; índice Git vazio; hashes dos demais arquivos preexistentes preservados. |

A suíte conjunta executou `AdminConteudoFoco`, `ContatoFoco`, `OrientacaoPagina`, `IndiceNoticias`, `ConhecaMais`, `Feedback`, `AdminUsuariosFoco` e `NavegacaoAdmin`. Inclui os 29 testes de orientação da VIS-5B.1 e os sete do índice da VIS-5B.2A. **A intermitência de `AdminUsuariosFoco` não ocorreu nesta rodada.** Seus quatro testes passaram sem edição; isso não determina nem elimina a causa das ocorrências anteriores.

| Fluxo / medição | Antes, nesta execução | Depois |
| --- | --- | --- |
| Abrir edição | `body` ativo; Tab em Arquivar | Título/Tipo ativos; Tab em Artista/Título; Shift+Tab retorna ao primeiro campo. |
| Criar conteúdo | Foco em Novo conteúdo | Primeiro campo recebe foco; Cancelar retorna a Novo conteúdo. |
| Cancelar edição | Sem retorno explícito; foco no `body` | Editar recebe foco; se removido pelo filtro, Buscar título. |
| Erro de consulta | Causa identificada no código; não ensaiado no roteiro anterior | Alerta recebe foco; Escape retorna a Editar habilitado, nas quatro larguras e no zoom. |
| Abrir Contato | Foco no FAB, após o painel no DOM | Fechar informações recebe foco, com indicador existente visível. |
| Percorrer Contato | Índice de Tab avançava ao rodapé | Fechar → e-mail → FAB; Shift+Tab a partir de Fechar alcança Ouvidoria. Fundo continua interativo. |
| Escape / fechamento visual | Sem gestão explícita de retorno | FAB recebe foco; o listener é limpo ao fechar/desmontar. |
| Geometria do painel a 100% | Topo 646 px em 320; 667 px nas outras larguras, viewport de 1.000 px de altura | Mesmos valores e limite inferior de 912 px; CSS preservado. |

Os testes unitários verificam a consulta pendente e falhas ao salvar com mocks, sem gravação real. O navegador percorreu Enter, Tab, Shift+Tab e Escape, criação, edição, cancelamento, falha HTTP 503 e retorno após filtro. Os destinos de foco medidos nos complementos têm centro visível e alcançável por hit-test, com `:focus-visible` ativo. **Centro visível não equivale à ausência de toda sobreposição**, conforme a ressalva abaixo.

Não houve overflow horizontal do documento nas três telas e estados ensaiados, nem exceções JavaScript não tratadas. Há logs de HTTP 503 esperados, provocados para os testes de erro. Não se afirma console sem mensagens nem aprovação global de acessibilidade.

O zoom usa a preferência nativa do Chromium em perfil temporário, na janela externa de 1440 px. Não usa CSS `zoom` ou somente escala de dispositivo. Foram inspecionadas capturas além das asserções de foco e geometria. Total: **120 capturas finais**, além das 48 anteriores; quantidade de capturas não representa certificação.

## Proximidade do FAB e ressalva visual do Contato

**A ausência completa de sobreposição não foi confirmada.** O FAB fixo e o painel mantêm a geometria anterior, já mencionada na VIS-5B.2A. Depois de estabilizar a rolagem, o complemento mediu interseção entre as caixas do FAB e do comentário de **39 × 52 px CSS em 390 px** e de aproximadamente **26,56 × 30,30 px CSS no zoom**. A posição depende da rolagem; os demais cenários do complemento não tinham área de interseção. O texto de ensaio chegou ao último caractere, e o campo continuou editável.

Com o painel aberto e Shift+Tab para Ouvidoria no zoom, parte do botão de Ouvidoria fica atrás do painel, embora seu centro, parte do rótulo e indicador de foco continuem visíveis; Escape fecha o painel e retorna ao FAB. A captura mostra essa limitação. Não foi acrescentado fechamento automático ao sair do painel, aprisionamento de foco ou redesenho do formulário para mascará-la. Recomenda-se tratar a posição/ocupação das superfícies flutuantes em ajuste visual específico, preservando a saída livre do painel.

A medição inicial de proximidade do roteiro principal era feita antes da estabilização da rolagem e registrou zero em posições que depois mudaram. **Para proximidade, valem os complementos**, que aguardam a rolagem e registram as caixas junto às capturas. Esse problema de medição não foi atribuído ao aplicativo.

## Evidências antes/depois

| Cenário | Antes | Depois |
| --- | --- | --- |
| Exposições — edição 320 | [Captura](../.cache/vis_5b_2b/antes/exposicoes_edicao_320.png) | [Captura](../.cache/vis_5b_2b/depois/exposicoes_edicao_320.png) |
| Exposições — edição 768 | [Captura](../.cache/vis_5b_2b/antes/exposicoes_edicao_768.png) | [Captura](../.cache/vis_5b_2b/depois/exposicoes_edicao_768.png) |
| Novidades — edição 390 | [Captura](../.cache/vis_5b_2b/antes/novidades_edicao_390.png) | [Captura](../.cache/vis_5b_2b/depois/novidades_edicao_390.png) |
| Novidades — edição 1440 | [Captura](../.cache/vis_5b_2b/antes/novidades_edicao_1440.png) | [Captura](../.cache/vis_5b_2b/depois/novidades_edicao_1440.png) |
| Contato — painel 320 | [Captura](../.cache/vis_5b_2b/antes/contato_aberto_320.png) | [Captura](../.cache/vis_5b_2b/depois/contato_aberto_320.png) |
| Contato — painel 390 | [Captura](../.cache/vis_5b_2b/antes/contato_aberto_390.png) | [Captura](../.cache/vis_5b_2b/depois/contato_aberto_390.png) |
| Contato — painel 768 | [Captura](../.cache/vis_5b_2b/antes/contato_aberto_768.png) | [Captura](../.cache/vis_5b_2b/depois/contato_aberto_768.png) |
| Contato — painel 1440 | [Captura](../.cache/vis_5b_2b/antes/contato_aberto_1440.png) | [Captura](../.cache/vis_5b_2b/depois/contato_aberto_1440.png) |

- Erro e retorno: [alerta Exposições 320](../.cache/vis_5b_2b/depois/exposicoes_erro_320.png), [retorno 320](../.cache/vis_5b_2b/depois/exposicoes_erro_retorno_320.png), [destino após filtro em Novidades 390](../.cache/vis_5b_2b/depois/novidades_retorno_filtro_390.png).
- Zoom: [Exposições](../.cache/vis_5b_2b/zoom_real/exposicoes_edicao_1440.png), [Novidades](../.cache/vis_5b_2b/zoom_real/novidades_edicao_1440.png), [painel Contato](../.cache/vis_5b_2b/zoom_real/contato_aberto_1440.png).
- Ressalvas: [FAB/comentário 390](../.cache/vis_5b_2b/complemento/contato_proximidade_390.png), [FAB/comentário no zoom](../.cache/vis_5b_2b/complemento_zoom/contato_proximidade_1440.png), [saída por Shift+Tab no zoom](../.cache/vis_5b_2b/complemento_zoom/contato_saida_shift_tab_1440.png).
- Medições: [antes](../.cache/vis_5b_2b/antes/resultado.json), [depois](../.cache/vis_5b_2b/depois/resultado.json), [zoom](../.cache/vis_5b_2b/zoom_real/resultado.json), [complemento](../.cache/vis_5b_2b/complemento/resultado.json), [complemento zoom](../.cache/vis_5b_2b/complemento_zoom/resultado.json), [consolidação](../.cache/vis_5b_2b/consolidacao.json), [integridade](../.cache/vis_5b_2b/integridade.json).
- Logs: [lint](../.cache/vis_5b_2b/lint.log), [testes novos](../.cache/vis_5b_2b/testes_novos.log), [suíte conjunta](../.cache/vis_5b_2b/suite_final.log), [build](../.cache/vis_5b_2b/build.log), [navegador](../.cache/vis_5b_2b/depois.log), [zoom](../.cache/vis_5b_2b/zoom.log).

Comandos a partir de `frontend`, em `cmd.exe`, com Node 24.22.1 já existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/AdminConteudoFoco.test.jsx test/ContatoFoco.test.jsx test/OrientacaoPagina.test.jsx test/IndiceNoticias.test.jsx test/ConhecaMais.test.jsx test/Feedback.test.jsx test/AdminUsuariosFoco.test.jsx test/NavegacaoAdmin.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_2b\visual.mjs --antes
..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_2b\visual.mjs
set VIS_ZOOM=2&& ..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_2b\visual.mjs
```

O comando `--antes` foi executado antes das edições. Os complementos usam `.cache/vis_5b_2b/complemento.mjs`, com e sem `VIS_ZOOM=2`. Os roteiros usam Vite isolado (`configFile:false`, `envDir:false`), sessão sintética e somente GETs. Feedback público foi habilitado exclusivamente na configuração isolada para alcançar o comentário, sem editar flags reais ou enviar dados. Fontes externas e Maps foram bloqueados. Navegador executado com permissão local fora do sandbox; nenhuma dependência instalada.

## Pendências e conclusão

**As correções de orientação de foco A06/A07 estão implementadas e validadas nos fluxos descritos.** Nenhuma regressão funcional atribuível às mudanças foi identificada. A ressalva de sobreposição parcial do Contato permanece explícita; não se declara validação visual irrestrita dessa superfície.

A suíte completa não foi executada. Permanecem separadas as **nove falhas públicas históricas**: três asserções de `+5` contra `+25` em `Inicio.test.jsx`, quatro de fluxos públicos em `FluxosFrontendF2.test.jsx` e duas de 404 em `RoteamentoPublico.test.jsx`. Esses testes e o mock não foram alterados nem executados nesta rodada.

Os demais achados VIS-5 não foram implementados. O build mantém os avisos conhecidos de chunk acima de 500 kB (principal **743,50 kB**, **211,13 kB gzip**), import estático/dinâmico de `PatrimonioEditor` e tempo de plugins. Não foram suprimidos.

Não houve leitor de tela, aparelho físico, API real, login real, persistência ou gravação. Dados de teste e evidências em `.cache/` são locais e ignorados pelo Git. Os testes de foco não certificam fala assistiva nem conformidade integral WCAG. Nenhum commit, push ou deploy realizado.
