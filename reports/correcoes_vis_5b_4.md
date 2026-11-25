# VIS-5B.4 — Anúncios no Mapa e identificação dos gráficos

Entrega concluída em 25/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD `26821512f534f50fef7112c6f936f54328b1193b`. Sem fetch, commit, push ou deploy.

## Escopo e diagnóstico

Consultados a [auditoria VIS-5A](auditoria_acessibilidade_vis_5a.md) e os relatórios [VIS-5B.1](correcoes_vis_5b_1.md), [2A](correcoes_vis_5b_2a.md), [2B](correcoes_vis_5b_2b.md), [2C](correcoes_vis_5b_2c.md) e [3](correcoes_vis_5b_3.md). Corrigidos exclusivamente A10 e A12. As alterações locais anteriores foram preservadas.

- **A10:** a contagem do Mapa era texto comum, sem região de status. Os resultados mudavam sem anúncio acessível correspondente.
- **A12:** os quatro nomes estavam em `ChartContainer`, enquanto os SVGs gerados pelo Recharts recebiam `role="application"` e `tabindex="0"`, sem nome. A leitura de `Chart.jsx` e do `RootSurface` da dependência instalada confirmou que os atributos acessíveis recebidos pelo gráfico são encaminhados ao SVG. Não foi necessário alterar o componente compartilhado nem a dependência.

O manifesto inicial registra 961 arquivos preexistentes. A [conferência final](../.cache/vis_5b_4/integridade.json), repetida na conclusão, identifica somente dois fontes preexistentes modificados nesta etapa. Nenhum CSS foi editado.

## Arquivos alterados e comportamento

| Arquivo | Alteração |
| --- | --- |
| [Mapa.jsx](../frontend/src/pages/Mapa/Mapa.jsx) | A contagem existente passou a ser uma região `role="status"`, com `aria-atomic="true"`. O resumo aguarda 400 ms após a última alteração de busca, categoria, quantidade ou estado da consulta. O timer é cancelado na próxima alteração e na desmontagem. |
| [GraficosDashboard.jsx](../frontend/src/features/admin/components/GraficosDashboard.jsx) | Transferidos os `aria-label` dos contêineres para `PieChart`, `RadarChart` e `BarChart`, identificando os quatro SVGs interativos com os títulos existentes. |
| [MapaAnuncios.test.jsx](../frontend/test/MapaAnuncios.test.jsx), novo | Três regressões: total/singular/vazio/limpeza e foco; espera após a última tecla; categoria, atualização dos dados, carregamento, erro e limpeza do timer. |
| [GraficosNomes.test.jsx](../frontend/test/GraficosNomes.test.jsx), novo | Regressão com Recharts real: quatro SVGs nomeados e focáveis, preservação da legenda/tabela e dos nomes após atualização dos dados. |
| Este relatório | Diagnóstico, evidências, resultados e limitações. |

**Dois fontes, dois testes novos e este relatório.** Roteiros temporários ficam em `.cache/vis_5b_4/`. Nenhum teste existente foi editado.

### Anúncio do Mapa

A listagem e os marcadores continuam sendo filtrados imediatamente; somente o resumo visível/anunciável aguarda a estabilização de 400 ms. O texto é breve: “5 patrimônios encontrados”, “1 patrimônio encontrado” ou “Nenhum patrimônio encontrado”. O status não contém os nomes individuais dos registros. Resultados com a mesma quantidade não provocam uma nova alteração textual desnecessária.

Durante carregamento, permanece “Carregando…”. Em erro, o resumo fica vazio e o alerta existente apresenta a falha, sem anunciar ausência de resultados como se a consulta tivesse sido bem-sucedida. A região existe desde a montagem; um espaço não separável mantém a linha antes do primeiro resumo. Não foram adicionadas chamadas de foco. A busca permanece focada durante digitação, resultado vazio e limpeza.

`role="status"` fornece anúncio educado implicitamente; a árvore acessível confirmou `live: polite` e `atomic: true`. O catálogo de Patrimônios não foi alterado nem recebeu uma segunda região de anúncio.

### Nomes dos gráficos

| SVG interativo | Nome confirmado na árvore do Chromium |
| --- | --- |
| Donut de conservação | Situação de conservação |
| Radar | Distribuição por região |
| Barras | Categorias principais |
| Donut de publicação | Status de publicação |

Cada SVG conserva `role="application"`, `tabindex="0"` e `accessibilityLayer`. Os títulos e descrições visíveis dos painéis, legendas e tabela permanecem disponíveis. Não foi adicionado texto instrucional repetido nem alterada a composição compartilhada de `Chart.jsx`. Os gráficos do Feedback não foram modificados ou classificados como defeituosos por analogia.

## Validação e resultados

| Verificação | Resultado |
| --- | --- |
| Lint final | Aprovado, exit 0. |
| Suíte direcionada conjunta | **96/97 aprovados**, oito arquivos; 112,85 s, exit 1. A única falha foi a intermitência conhecida de `AdminUsuariosFoco`, detalhada abaixo. |
| Testes novos | **4/4 aprovados** na rodada conjunta. Os outros sete arquivos, excluído `AdminUsuariosFoco`, somam **93/93 aprovados**. |
| Rechecagem isolada de Usuários | **4/4 aprovados**, 16,95 s, exit 0, sem editar componente ou teste. |
| Build | Aprovado, exit 0; 1.476 módulos, 7,29 s. |
| Navegador principal | 40 registros/capturas finais em 320, 390, 768 e 1440 px; mais 10 no zoom nativo de 200%. Roteiros concluídos, exit 0. |
| Complemento de árvore acessível e teclado | Oito registros/capturas nas quatro larguras e dois no zoom; exit 0. |
| Integridade | `git diff --check` aprovado; índice Git vazio; hashes confirmam preservação dos demais arquivos preexistentes. |

A suíte executou `MapaAnuncios`, `GraficosNomes`, `ContrasteRadar`, `AdminDashboard`, `MapaPatrimonios`, `EstadosVisuais`, `OrientacaoPagina` e `AdminUsuariosFoco`. Inclui regressões do contraste do radar, conservação/visitação, mapa e orientação de navegação. Não foi executada a suíte completa.

| Evidência | Antes | Depois |
| --- | --- | --- |
| Contagem do Mapa | Sem status acessível | Uma região de status, polite e atômica. |
| Busca com cinco registros → um → nenhum → limpeza | Contagem visual, sem anúncio | Resumos 5 → 1 → nenhum → 5, mantendo foco na busca. |
| Categoria Industrial / Todos nas fixtures | Sem anúncio | Nenhum → 5, sem alteração da lógica de filtro. |
| Três alterações rápidas de texto, separadas por 80 ms | Sem região de status | Uma única mutação do resumo após estabilização. Não é medição de fala de leitor de tela. |
| Quatro SVGs focáveis | Quatro nomes vazios na árvore acessível | Quatro nomes corretos, inclusive no nó com propriedade `focused`. |
| Teclado nos gráficos | Interação existente | Tab/Shift+Tab preservados; seta direita nos donuts/radar e seta para baixo nas barras exibem tooltips com valores. |
| Atualização dos dados dos gráficos | — | Teste de rerender mantém os quatro nomes, a tabela e a legenda. |

O complemento usa seta para baixo no gráfico de barras de orientação vertical. A seta direita não apresentava seu tooltip, tanto antes quanto depois; isso não foi tratado como regressão nem motivou mudança no Recharts.

As quatro larguras foram ensaiadas a 100%, com altura de 1.000 px CSS. No zoom nativo, janela externa de 1440 px, viewport **711 × 452 px CSS**, DPR 2 e `visualViewport.scale=1`. A configuração usa preferência de zoom do perfil temporário do Chromium, não CSS `zoom` nem simples emulação de escala. Os gráficos foram posicionados dentro da viewport antes das capturas. As imagens inspecionadas preservam layout, indicador da pesquisa e números contrastantes do radar.

Foram produzidas **50 capturas anteriores às edições de produção e 60 finais**. Não houve overflow horizontal nos cenários principais nem exceções JavaScript não tratadas nos roteiros concluídos. Os logs contêm mensagens esperadas de tentativa de carregar Google Maps bloqueado; não se afirma console sem mensagens. O mapa real do provedor não foi ensaiado.

### Intermitência e preparação dos testes

Na suíte conjunta final, `AdminUsuariosFoco` esperava o botão “Fechar” do alerta e encontrou “Editar”, exatamente o padrão já registrado nas etapas anteriores. A rechecagem isolada passou em 4/4. A causa permanece indeterminada: **a suíte conjunta não é apresentada como integralmente aprovada**, e a rechecagem não apaga a ocorrência. [Rodada conjunta](../.cache/vis_5b_4/testes_finais.log), [rechecagem](../.cache/vis_5b_4/usuarios_rechecagem.log).

Antes da implementação, os quatro testes novos falharam pela ausência da região de status e dos nomes dos SVGs. Na primeira rodada após a edição, foi necessário substituir matchers de jest-dom não configurados no projeto por asserções nativas de Vitest nos testes novos. Nenhum teste existente ou critério de aceite foi flexibilizado. [Antes](../.cache/vis_5b_4/testes_antes.log), [primeira rodada](../.cache/vis_5b_4/testes.log).

O primeiro Chromium no sandbox falhou por timeout de CDP. As execuções concluídas usaram permissão local fora do sandbox. O roteiro inicialmente comparava a ordem de retorno dos nós da árvore acessível com a ordem do DOM; foi corrigido para conferir os quatro nomes e, separadamente, o nome do SVG efetivamente focado. A ordem interna de retorno do CDP não define a ordem de Tab. Esses ajustes foram restritos aos ensaios.

## Capturas e evidências

| Cenário final | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Mapa sem resultados e busca focada | [Captura](../.cache/vis_5b_4/depois/mapa_vazio_320.png) | [Captura](../.cache/vis_5b_4/depois/mapa_vazio_390.png) | [Captura](../.cache/vis_5b_4/depois/mapa_vazio_768.png) | [Captura](../.cache/vis_5b_4/depois/mapa_vazio_1440.png) |
| Conservação, foco e seta | [Captura](../.cache/vis_5b_4/depois/grafico_0_320.png) | [Captura](../.cache/vis_5b_4/depois/grafico_0_390.png) | [Captura](../.cache/vis_5b_4/depois/grafico_0_768.png) | [Captura](../.cache/vis_5b_4/depois/grafico_0_1440.png) |
| Radar, foco e seta | [Captura](../.cache/vis_5b_4/depois/grafico_1_320.png) | [Captura](../.cache/vis_5b_4/depois/grafico_1_390.png) | [Captura](../.cache/vis_5b_4/depois/grafico_1_768.png) | [Captura](../.cache/vis_5b_4/depois/grafico_1_1440.png) |
| Barras, seta para baixo | [Captura](../.cache/vis_5b_4/complemento/barras_seta_320.png) | [Captura](../.cache/vis_5b_4/complemento/barras_seta_390.png) | [Captura](../.cache/vis_5b_4/complemento/barras_seta_768.png) | [Captura](../.cache/vis_5b_4/complemento/barras_seta_1440.png) |
| Publicação, foco e seta | [Captura](../.cache/vis_5b_4/depois/grafico_3_320.png) | [Captura](../.cache/vis_5b_4/depois/grafico_3_390.png) | [Captura](../.cache/vis_5b_4/depois/grafico_3_768.png) | [Captura](../.cache/vis_5b_4/depois/grafico_3_1440.png) |

- Antes: [Mapa 390](../.cache/vis_5b_4/antes/mapa_vazio_390.png), [radar 320](../.cache/vis_5b_4/antes/grafico_1_320.png). Os demais pares usam os mesmos nomes em `antes` e `depois`.
- Zoom: [Mapa](../.cache/vis_5b_4/depois_zoom/mapa_vazio_1440.png), [radar](../.cache/vis_5b_4/depois_zoom/grafico_1_1440.png), [barras](../.cache/vis_5b_4/complemento_zoom/barras_seta_1440.png).
- Nomes acessíveis, foco e resumos: [antes](../.cache/vis_5b_4/antes/resultado.json), [depois](../.cache/vis_5b_4/depois/resultado.json), [zoom anterior](../.cache/vis_5b_4/antes_zoom/resultado.json), [zoom final](../.cache/vis_5b_4/depois_zoom/resultado.json).
- Propriedades polite/atomic e barras: [complemento](../.cache/vis_5b_4/complemento/resultado.json), [complemento no zoom](../.cache/vis_5b_4/complemento_zoom/resultado.json).
- [Lint](../.cache/vis_5b_4/lint_final.log), [build](../.cache/vis_5b_4/build.log), [log visual final](../.cache/vis_5b_4/depois_final.log), [log zoom](../.cache/vis_5b_4/depois_zoom.log), [integridade](../.cache/vis_5b_4/integridade.json).

Comandos a partir de `frontend`, em `cmd.exe`, usando Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/MapaAnuncios.test.jsx test/GraficosNomes.test.jsx test/ContrasteRadar.test.jsx test/AdminDashboard.test.jsx test/MapaPatrimonios.test.jsx test/EstadosVisuais.test.jsx test/OrientacaoPagina.test.jsx test/AdminUsuariosFoco.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/AdminUsuariosFoco.test.jsx --maxWorkers=1
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_4\visual.mjs
set VIS_ZOOM=2&& ..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_4\visual.mjs
```

As capturas anteriores usaram `--antes` antes das edições. Os complementos usam `complemento.mjs` na mesma pasta, com e sem `VIS_ZOOM=2`.

## Pendências e limites

**A10 e A12 foram implementados e verificados no DOM, na árvore acessível do Chromium e nos fluxos de teclado descritos.** Não foi possível realizar sessão interativa com escuta de leitor de tela real. Portanto, não se afirma homologação da fala dos anúncios ou dos gráficos. O teste de mutações e a árvore acessível não substituem essa validação assistiva.

Preservados Home/mock `+25`, favoritos, conservação/visitação, contrastes da VIS-5B.3, títulos, idioma, orientação de navegação, foco dos formulários, modal de notícias, textarea sem resize e posicionamento adaptativo do Contato. Backend, Prisma, banco, autenticação, serviços HTTP, contratos e dependências não foram alterados. A13 e A14 permanecem fora do escopo.

As **nove falhas funcionais históricas** continuam separadas: três expectativas `+5` contra `+25` em `Inicio.test.jsx`, quatro de fluxos públicos em `FluxosFrontendF2.test.jsx` e duas de fallback 404 em `RoteamentoPublico.test.jsx`. Esses testes não foram executados nem alterados nesta rodada. A intermitência de Usuários é registrada separadamente, sem somá-la a esse conjunto histórico.

Build mantém os avisos de chunk acima de 500 kB (principal 745,70 kB; 212,00 kB gzip), import estático/dinâmico de `PatrimonioEditor` e tempo de plugins. Nenhum aviso foi suprimido.

Ensaios com Vite isolado (`configFile:false`, `envDir:false`), sessão e respostas sintéticas, somente GETs e fontes/serviços externos bloqueados. Nenhum login real, escrita, envio, acesso a banco ou instalação de dependências. Não houve aparelho físico, API real ou Google Maps real. Evidências em `.cache/` são locais e ignoradas pelo Git. Não há alegação de conformidade integral WCAG ou aprovação global da branch. Sem commit, push ou deploy.
