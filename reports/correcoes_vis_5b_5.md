# VIS-5B.5 — Responsividade administrativa e imagens ausentes

25/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência **local** `origin/development/backend`: `34556fa899569fb37213cf660462e5a1f03dae98`. Checkout inicialmente limpo. Sem fetch, commit, push ou deploy.

## Escopo e diagnóstico

Referências: [auditoria VIS-5A](auditoria_acessibilidade_vis_5a.md), [VIS-5B.1](correcoes_vis_5b_1.md), [2A](correcoes_vis_5b_2a.md), [2B](correcoes_vis_5b_2b.md), [2C](correcoes_vis_5b_2c.md), [3](correcoes_vis_5b_3.md) e [4](correcoes_vis_5b_4.md). Corrigidos exclusivamente **A13 e A14**, após confirmação no código e captura do comportamento anterior.

**A13:** `.admin-content` já possuía `min-width: 0`. Em 768 px a sidebar continua lateral, com 240 px, e o conteúdo tem padding horizontal de 40 px. A largura intrínseca da tabela, determinada por colunas, células e ações, ultrapassava o espaço restante. Não havia um contêiner para receber essa rolagem. Nas fixtures desta execução, o documento chegou a **815 px**, tanto na lista quanto com editor aberto. A diferença frente aos aproximadamente 786 px históricos decorre do conteúdo/ambiente medido; não se reutilizou o número anterior como medição nova.

**A14:** `listarExposicoes` passa pelo normalizador de `conteudoApi.js`, que resolve `imagemUrl ?? imagem` e entrega `imagem` ao card. URL ausente/nula/vazia resulta em string vazia. `ConhecaMais.jsx` a passava diretamente a `<img>`, sem tratamento de erro. O navegador reproduziu avisos React de `src` vazio e a imagem inválida não tinha fallback. Serviço, resposta da API e demais consumidores não foram alterados.

## Correções e arquivos

| Arquivo | Alteração |
| --- | --- |
| [AdminPatrimonios.jsx](../frontend/src/features/admin/pages/AdminPatrimonios.jsx) | Contêiner de rolagem em torno da tabela, com nome “Lista de patrimônios”, `role="region"` e `tabIndex={0}`. Ao receber foco, uma ação é revelada com `scrollIntoView({block:"nearest", inline:"nearest"})`; nenhum foco é transferido e nenhuma ação é executada por esse handler. |
| [admin.css](../frontend/src/features/admin/admin.css) | Regras restritas a `.admin-patrimonios-tabela`: largura máxima, rolagem horizontal, indicador de foco, margem de rolagem de 6 px nos botões e preservação dos cantos/sombra na apresentação de tabela. |
| [ConhecaMais.jsx](../frontend/src/pages/ConhecaMais/ConhecaMais.jsx) | Substituição somente do `<img>` de exposição pelo componente existente `ImagemPatrimonio`, preservando `src`, título como alternativa e carregamento lazy. |
| [ExposicoesImagens.test.jsx](../frontend/test/ExposicoesImagens.test.jsx), novo | Cinco casos: URL ausente, nula, vazia, espaços, URL válida seguida de falha. Exercita a página e o serviço real com adapter sintético, preservação dos dados, texto/link e ausência do aviso React. |
| [PatrimoniosTabela.test.jsx](../frontend/test/PatrimoniosTabela.test.jsx), novo | Colunas preservadas, região focável, Tab/Shift+Tab entre ações e solicitação de rolagem local sem execução das ações. |
| [patrimonios_exposicoes_visual.mjs](../frontend/test/patrimonios_exposicoes_visual.mjs), novo | Regressão opt-in em Chromium para geometria, ações, editor e cinco estados de imagem nas quatro larguras. Reutiliza o helper existente, sem nova dependência. |
| Este relatório | Diagnóstico, evidências, resultados e limites. |

São **três fontes, três testes novos e este relatório** modificados/criados por esta execução. Nenhum teste existente foi alterado. O manifesto inicial possui 964 arquivos. A primeira conferência identificou somente os três fontes acima; na retomada surgiram alterações externas, preservadas, descritas abaixo. A [integridade final](../.cache/vis_5b_5/integridade.json) registra também essas diferenças, sem atribuí-las à VIS-5B.5.

A tabela mantém todas as colunas e controles. A apresentação em cards abaixo de 721 px **já existia** e foi preservada. Não houve mudança de sidebar, breakpoint, permissões, editor, publicação, arquivamento ou persistência.

O fallback é `/imagem-indisponivel.svg`, a ilustração neutra existente. A alternativa passa a “Imagem indisponível: [título]” quando necessário; a imagem válida conserva o título. Uma falha real de carregamento também troca para essa ilustração, sem repetir tentativas indefinidamente. Não foi escolhida fotografia substituta nem modificado o componente compartilhado.

## Validação

| Verificação | Resultado |
| --- | --- |
| Lint final | Aprovado, exit 0. |
| Suíte direcionada final, após retomada | **162/162**, 11 arquivos, exit 0; 130,68 s. |
| Build final | Aprovado, exit 0. |
| Chromium, quatro larguras | **40 capturas/registros finais**, exit 0. |
| Zoom nativo 200% | **10 capturas/registros finais**, exit 0. |
| Capturas anteriores | **35**, obtidas antes das edições de produção: 28 nas quatro larguras e sete no zoom. |
| Integridade | `git diff --check` aprovado; índice Git sem alterações. |

A suíte inclui `PatrimoniosTabela`, `ExposicoesImagens`, `ImagemPatrimonio`, `ConhecaMais`, `AdminPatrimonios`, `OrientacaoPagina`, `IndiceNoticias`, `GraficosNomes`, `MapaAnuncios`, `ContrasteRadar` e `AdminUsuariosFoco`. A primeira rodada, antes da complementação da gestão de rolagem, passou em 161/161; a seguinte incorporou o teste da tabela e passou em 162/162 (93,87 s). A reexecução após a retomada também passou em 162/162. **A intermitência conhecida de `AdminUsuariosFoco` não apareceu nas três rodadas**. Isso não determina nem elimina a causa histórica. Nenhum teste desse componente foi editado.

### Geometria antes/depois

Valores em px CSS; `scrollWidth` do documento. Diferenças de 10 px, ou cinco no zoom, correspondem à área ocupada pela barra vertical do navegador neste ambiente.

| Viewport | Lista antes → depois | Editor aberto antes → depois |
| --- | --- | --- |
| 320 | 310 → **310** | 310 → **310** |
| 390 | 380 → **380** | 380 → **380** |
| 768 | 815 → **768** | 815 → **758** |
| 1440 | 1440 → **1440** | 1430 → **1430** |
| Zoom 200%, viewport 711 | 706 → **706** | 706 → **706** |

Em 768 px a tabela mantém aproximadamente **535,41 px** de largura dentro de uma região de **448 px**; com o editor e barra vertical, a região tem **438 px**. O documento deixa de rolar horizontalmente, e o conteúdo excedente fica acessível na região. Ao alcançar Arquivar por Tab, `scrollLeft` chega a **76 px** na lista e **86 px** com editor aberto, mantendo botão e contorno visíveis.

O navegador percorreu a região com seta direita e Tab, os botões Editar/Publicar/Arquivar, abertura do editor por Enter e ações da listagem com o editor aberto. O teste unitário também verifica Shift+Tab. As ações de escrita não foram ativadas no navegador. O destino focado com editor aberto passou pelo hit-test no centro do botão, além da comparação dos seus limites com os do contêiner. Capturas foram inspecionadas para conferir o indicador e a composição.

Cada registro geométrico aguarda **750 ms** após a interação. Não houve overflow horizontal do documento nos cenários finais nem exceções JavaScript não tratadas. A análise não certifica toda combinação de conteúdos longos, dimensões ou navegadores.

O zoom usa a preferência nativa do Chromium em perfil temporário: janela externa de 1440 px, viewport **711 × 452 px CSS**, DPR 2 e `visualViewport.scale=1`. Não se usou CSS zoom nem apenas emulação de escala. Nas quatro larguras a 100%, a altura é de 1.000 px CSS.

### Imagens

O navegador ensaiou cinco exposições: propriedade ausente, `null`, string vazia, URL local válida e URL que falha ao carregar. A URL válida da fixture aponta para um SVG local existente, não para fotografia de outro registro. Os testes unitários conferem também uma URL HTTPS válida e conteúdo com espaços.

Nos registros finais todas as cinco imagens têm `src` não vazio, `complete=true` e largura natural positiva após serem trazidas à viewport. Os quatro casos sem imagem utilizável apresentam o fallback; a URL válida é preservada. Títulos, biografias, períodos e links continuam nos cards. **Não houve aviso React de `src` vazio nas rodadas finais.**

### Ajustes durante a validação

A primeira solução CSS eliminou o overflow do documento, mas o último botão ainda podia ficar parcialmente recortado: o navegador considerava suficiente sua visibilidade parcial ao avançar por Tab. Retirar o `overflow:hidden` da tabela não resolveu isso; essa tentativa foi descartada. Foi acrescentado o handler local de rolagem da ação focada e a margem para o contorno. O teste visual passou a exigir o botão inteiro dentro do contêiner, sem flexibilizar o aceite.

Também foram preservados os cantos e a sombra originais na superfície que passa a conter a rolagem. Os resultados finais são posteriores a esses ajustes. Não houve alteração dos dados ou do editor para acomodar fixtures.

Na retomada, o checkout apresentava alterações externas em `App.jsx`, `Chart.jsx`, `ui.module.css`, `GraficosDashboard.jsx`, `AdminAuditoria.jsx`, `AdminAuditoria.module.css`, `AdminDashboard.module.css` e `global.css`. Esses arquivos não foram editados nem revertidos por esta execução. O uso de `ImagemPatrimonio` em Conheça Mais havia desaparecido; foram reaplicadas somente suas duas linhas autorizadas. Lint, build, suíte direcionada e navegador foram reexecutados no estado retomado. Essa conferência não constitui revisão ou homologação do escopo externo.

## Capturas e evidências

| Cenário | Antes | Depois |
| --- | --- | --- |
| Lista 320 | [Captura](../.cache/vis_5b_5/antes/lista_320.png) | [Captura](../.cache/vis_5b_5/depois/lista_320.png) |
| Lista 390 | [Captura](../.cache/vis_5b_5/antes/lista_390.png) | [Captura](../.cache/vis_5b_5/depois/lista_390.png) |
| Lista 768 | [Captura](../.cache/vis_5b_5/antes/lista_768.png) | [Captura](../.cache/vis_5b_5/depois/lista_768.png) |
| Lista 1440 | [Captura](../.cache/vis_5b_5/antes/lista_1440.png) | [Captura](../.cache/vis_5b_5/depois/lista_1440.png) |
| Editor 768 | [Captura](../.cache/vis_5b_5/antes/editor_768.png) | [Captura](../.cache/vis_5b_5/depois/editor_768.png) |
| Imagem vazia 390 | [Captura](../.cache/vis_5b_5/antes/exposicao_2_390.png) | [Captura](../.cache/vis_5b_5/depois/exposicao_2_390.png) |
| Falha de imagem 320 | [Captura](../.cache/vis_5b_5/antes/exposicao_4_320.png) | [Captura](../.cache/vis_5b_5/depois/exposicao_4_320.png) |
| Editor no zoom | [Captura](../.cache/vis_5b_5/antes_zoom/editor_1440.png) | [Captura](../.cache/vis_5b_5/depois_zoom/editor_1440.png) |
| Imagem vazia no zoom | [Captura](../.cache/vis_5b_5/antes_zoom/exposicao_2_1440.png) | [Captura](../.cache/vis_5b_5/depois_zoom/exposicao_2_1440.png) |

- Ações: [768 px](../.cache/vis_5b_5/depois/ultima_acao_768.png), [com editor em 768](../.cache/vis_5b_5/depois/editor_acoes_768.png), [com editor no zoom](../.cache/vis_5b_5/depois_zoom/editor_acoes_1440.png).
- Exposições: [ausente em 320](../.cache/vis_5b_5/depois/exposicao_0_320.png), [nula em 768](../.cache/vis_5b_5/depois/exposicao_1_768.png), [válida em 1440](../.cache/vis_5b_5/depois/exposicao_3_1440.png), [falha em 390](../.cache/vis_5b_5/depois/exposicao_4_390.png). Todos os cinco casos constam nas quatro larguras e no zoom.
- Medições: [consolidação](../.cache/vis_5b_5/consolidacao.json), [antes](../.cache/vis_5b_5/antes/resultado.json), [depois](../.cache/vis_5b_5/depois/resultado.json), [zoom anterior](../.cache/vis_5b_5/antes_zoom/resultado.json), [zoom final](../.cache/vis_5b_5/depois_zoom/resultado.json).
- Logs: [lint](../.cache/vis_5b_5/lint_final.log), [testes antes da retomada](../.cache/vis_5b_5/testes_finais.log), [testes finais da retomada](../.cache/vis_5b_5/testes_retomada.log), [build](../.cache/vis_5b_5/build_final.log), [visual](../.cache/vis_5b_5/visual_final.log), [zoom](../.cache/vis_5b_5/zoom_final.log).

Comandos a partir de `frontend`, em `cmd.exe`, com Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/PatrimoniosTabela.test.jsx test/ExposicoesImagens.test.jsx test/ImagemPatrimonio.test.jsx test/ConhecaMais.test.jsx test/AdminPatrimonios.test.jsx test/OrientacaoPagina.test.jsx test/IndiceNoticias.test.jsx test/GraficosNomes.test.jsx test/MapaAnuncios.test.jsx test/ContrasteRadar.test.jsx test/AdminUsuariosFoco.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\patrimonios_exposicoes_visual.mjs
set VIS_ZOOM=2&& ..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_5\visual.mjs
```

## Resultado e limites

**A13 e A14 estão corrigidos e validados nos cenários descritos.** Não foi identificada regressão funcional atribuível à etapa. As verificações usam Chromium/Vite isolados, `configFile:false`, `envDir:false`, sessão e respostas sintéticas, somente GETs. Nenhuma dependência instalada. Não houve acesso ao backend, banco, API real, login real, envio ou gravação. Fontes externas e Google Maps foram bloqueados.

Os logs mantêm mensagens esperadas de Maps bloqueado e um aviso de chave de lista no editor sob a fixture, também presente antes. Não se afirma console sem mensagens. O build mantém avisos de chunk maior que 500 kB e import estático/dinâmico de `PatrimonioEditor`; nenhum aviso foi suprimido.

As **nove falhas públicas históricas** permanecem registradas separadamente: três expectativas `+5` contra `+25` em `Inicio.test.jsx`, quatro fluxos públicos em `FluxosFrontendF2.test.jsx` e duas de 404 em `RoteamentoPublico.test.jsx`. Esses arquivos não foram executados nem alterados; os números são históricos, não resultado desta rodada. A suíte completa não foi executada.

Não houve leitor de tela, aparelho físico ou homologação com dados reais. Os resultados não certificam conformidade integral WCAG ou aprovação global da branch. Home/mock `+25`, favoritos, conservação/visitação, anúncios do Mapa, gráficos, idioma/títulos, foco anterior, textarea sem resize e superfícies adaptativas do Contato foram preservados. Backend, Prisma, Docker, autenticação, serviços HTTP e contratos não foram modificados. Evidências em `.cache/` são locais e ignoradas pelo Git. Sem commit, push ou deploy.
