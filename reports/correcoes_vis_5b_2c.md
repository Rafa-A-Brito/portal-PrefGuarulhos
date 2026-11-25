# VIS-5B.2C — Superfícies flutuantes do Contato

22/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `26821512f534f50fef7112c6f936f54328b1193b`. Sem fetch, commit, push ou deploy.

## Diagnóstico e decisão

A referência foi a seção de sobreposição da [VIS-5B.2B](correcoes_vis_5b_2b.md), confrontada com `Contato.jsx`, `global.css` e o formulário de Feedback. O checkout já continha alterações das etapas anteriores. O manifesto inicial registra **954 arquivos preexistentes**, preservados exceto pelo ajuste local em `Contato.jsx`.

O FAB de 52 × 52 px usa `position:fixed`, `right:24px` e `bottom:24px`. O painel também é fixo, com `bottom:88px`. Esses elementos não reservam espaço no fluxo: o textarea e os links passam sob suas caixas durante a rolagem. Com zoom nativo de 200%, a viewport de 711 × 452 px CSS oferece menos espaço vertical, e o painel de aproximadamente 248,5 px encobria parte de Ouvidoria.

Um recuo constante de CSS não eliminaria a colisão em todas as posições de rolagem. Reservar uma faixa lateral permanente estreitaria o formulário em mobile. Foi adotado **CSS local para limite de altura/rolagem do painel, acompanhado de cálculo local de posição**, sem alterar o fluxo ou as dimensões do formulário.

## Correção

- Mantidos o alinhamento à direita, largura, cores, bordas, sombras e dimensão do FAB. A posição original é a preferência quando há espaço livre.
- O FAB evita a faixa vertical do textarea quando suas áreas horizontais coincidem. Também considera o controle externo focado, incluindo o label que contém um input.
- O painel evita o FAB e o controle externo focado, com margem de 8 px. Se não couber inteiro, ocupa a maior faixa disponível e permite rolagem interna. Não reduz fonte nem corta conteúdo sem acesso por rolagem.
- O cálculo considera a viewport e o limite inferior da Navbar. Atualiza após rolagem, resize, mudança de foco ou tamanho do conteúdo, agrupando atualizações em `requestAnimationFrame`.
- A referência ao último controle externo é mantida ao entrar no painel. Isso evita que o botão de fechamento mude de posição entre pressionar e soltar o mouse. A limitação de altura não é removida a cada atualização, preservando a rolagem interna ao acessar o e-mail.
- Eventos, observer, frame pendente e estilos de posicionamento são limpos ao desmontar/recriar o efeito.

O painel continua **não modal**, sem `aria-modal`, `inert` ou contenção de foco. Não há fechamento automático ao sair. Abertura, Escape, fechamento visual, Tab, Shift+Tab e retorno ao acionador permanecem sob a implementação da VIS-5B.2B. Nenhum elemento flutuante adicional foi criado.

## Arquivos desta entrega

| Arquivo | Alteração |
| --- | --- |
| [Contato.jsx](../frontend/src/pages/Contato/Contato.jsx) | Refs de geometria e efeito local de posicionamento, sem alterar envio, conteúdo ou gestão de foco anterior. |
| [Contato.css](../frontend/src/pages/Contato/Contato.css), novo | Limite de altura, `box-sizing` e rolagem vertical apenas do painel institucional. |
| [faixaLivre.js](../frontend/src/pages/Contato/faixaLivre.js), novo | Cálculo das faixas livres e escolha da posição mais próxima da original, ou da maior faixa para painel com rolagem. |
| [ContatoGeometria.test.js](../frontend/test/ContatoGeometria.test.js), novo | Seis regressões de posição original, colisão com textarea, zoom, obstáculos sobrepostos, limites da viewport e falta de espaço. |
| Este relatório | Evidências, testes e limites. |

Não foram editados CSS global, regra `textarea { resize:none; overflow-y:auto; }`, Home, mock `+25`, favoritos, conservação/visitação, páginas administrativas, backend, autenticação, banco, Prisma, contratos, flags, manifests ou locks. Os testes existentes também não foram modificados.

## Validação

| Verificação | Resultado final |
| --- | --- |
| ESLint frontend | Aprovado, exit 0. |
| Testes direcionados | **64/64**, quatro arquivos, exit 0; 26,85 s. |
| Build | Aprovado, exit 0; 1.476 módulos; 2,23 s. |
| Navegador — 320, 390, 768 e 1440 px | **80 capturas finais**, exit 0. |
| Zoom nativo de 200% | **20 capturas finais**, exit 0; viewport 711 × 452 px CSS, DPR 2, `visualViewport.scale=1`. |
| Integridade | `git diff --check` aprovado; índice Git sem alterações. Hashes confirmam apenas `Contato.jsx` modificado entre os arquivos preexistentes. |

Os testes executados foram `ContatoGeometria`, `ContatoFoco`, `Feedback` e `OrientacaoPagina`. Preservam os fluxos não modais e os 29 testes de orientação da VIS-5B.1. Não houve falha unitária nesta execução. A primeira conferência geométrica isolada passou em 6/6; a suíte conjunta também passou antes e depois dos ajustes finais de estabilidade do painel.

Foram capturadas **90 imagens antes das edições de integração**: 72 nas quatro larguras e 18 no zoom. A rodada final possui 100 imagens. A função geométrica ainda não importada pela página e seus testes foram preparados durante as capturas anteriores; não alteravam sua renderização.

O roteiro alinha o topo do textarea a cinco posições relativas da viewport — 0%, 25%, 50%, 75% e 100%, respeitando o limite de rolagem — e verifica painel fechado, aberto e e-mail focado. Depois verifica saída por Shift+Tab para Ouvidoria, retorno, foco no textarea com painel aberto, reentrada no painel, e-mail com rolagem interna e clique real de mouse no fechamento. **Cada medição aguarda 750 ms após a interação/rolagem.** Não houve overflow horizontal, superfície fora da viewport ou exceções JavaScript não tratadas nos cenários finais.

| Medição geométrica desta rodada | Antes | Depois |
| --- | --- | --- |
| Maior área de interseção FAB/textarea nos cenários a 100% | **1.743,42 px² CSS** | **0 px²** |
| Maior área de interseção FAB/textarea no zoom | **1.381,25 px² CSS** | **0 px²** |
| Interseção painel/Ouvidoria focada no zoom | **3.112,27 px² CSS** | **0 px²** |
| Altura do painel no cenário Ouvidoria/zoom | 248,5 px, encobrindo o botão | Aproximadamente 127,86 px, com rolagem interna e botão livre. |
| Painel sobre controle externo focado; FAB sobre controle focado; painel sobre FAB | Conferência anterior demonstrava obstrução | Interseções **zero em todos os registros finais**. |
| Dimensão do FAB e fluxo do formulário | Estilos existentes | Preservados; somente as superfícies fixas são reposicionadas. |

As áreas acima são medidas novas, em **px²**, não as dimensões lineares históricas de 39 × 52 px e 26,56 × 30,30 px. As posições de rolagem desta rodada são controladas pelo roteiro, portanto os máximos não precisam coincidir com os da VIS-5B.2B. Os pares de captura desta entrega usam o mesmo roteiro e fixtures.

As capturas foram inspecionadas além das asserções: no zoom, Ouvidoria e seu indicador de foco ficam inteiramente livres; o e-mail recebe foco e permanece visível dentro do painel com rolagem. O deslocamento é das superfícies fixas, sem inserir espaço ou deslocar o formulário no fluxo. O ensaio não é uma medição geral de CLS do portal.

Durante a preparação, a primeira asserção do roteiro considerou o `body` como um controle focado e relatou colisão com a página inteira. Foi corrigido somente o roteiro para medir controles interativos. Os registros anteriores de FAB/textarea e Ouvidoria continuam válidos; a comparação não usa o `body` como controle. As versões finais também passaram pelos cenários adicionais de reentrada e clique.

## Capturas e medições

| Cenário | Antes | Depois |
| --- | --- | --- |
| FAB/textarea — 320 px | [Captura](../.cache/vis_5b_2c/antes/fechado_320_0.75.png) | [Captura](../.cache/vis_5b_2c/depois/fechado_320_0.75.png) |
| FAB/textarea — 390 px | [Captura](../.cache/vis_5b_2c/antes/fechado_390_0.75.png) | [Captura](../.cache/vis_5b_2c/depois/fechado_390_0.75.png) |
| Painel — 768 px | [Captura](../.cache/vis_5b_2c/antes/aberto_768_0.75.png) | [Captura](../.cache/vis_5b_2c/depois/aberto_768_0.75.png) |
| Painel — 1440 px | [Captura](../.cache/vis_5b_2c/antes/aberto_1440_0.75.png) | [Captura](../.cache/vis_5b_2c/depois/aberto_1440_0.75.png) |
| Ouvidoria — zoom 200% | [Captura](../.cache/vis_5b_2c/antes_zoom/ouvidoria_1440.png) | [Captura](../.cache/vis_5b_2c/depois_zoom/ouvidoria_1440.png) |
| FAB/textarea — zoom 200% | [Captura](../.cache/vis_5b_2c/antes_zoom/fechado_1440_0.75.png) | [Captura](../.cache/vis_5b_2c/depois_zoom/fechado_1440_0.75.png) |

- [Reentrada no painel com zoom](../.cache/vis_5b_2c/depois_zoom/painel_reentrada_1440.png), [e-mail focado com rolagem interna](../.cache/vis_5b_2c/depois_zoom/painel_email_rolagem_1440.png), [textarea focado com painel aberto](../.cache/vis_5b_2c/depois_zoom/textarea_foco_1440.png).
- [Comparação consolidada](../.cache/vis_5b_2c/comparacao.json), [antes](../.cache/vis_5b_2c/antes/resultado.json), [antes no zoom](../.cache/vis_5b_2c/antes_zoom/resultado.json), [depois](../.cache/vis_5b_2c/depois/resultado.json), [depois no zoom](../.cache/vis_5b_2c/depois_zoom/resultado.json), [integridade](../.cache/vis_5b_2c/integridade.json).
- [Lint](../.cache/vis_5b_2c/lint_final.log), [testes](../.cache/vis_5b_2c/testes_finais.log), [build](../.cache/vis_5b_2c/build_final.log), [navegador final](../.cache/vis_5b_2c/depois_final.log), [zoom final](../.cache/vis_5b_2c/depois_zoom_final.log).

Comandos, a partir de `frontend`, em `cmd.exe`, com Node 24.22.1 já disponível:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/ContatoGeometria.test.js test/ContatoFoco.test.jsx test/Feedback.test.jsx test/OrientacaoPagina.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_2c\visual.mjs
set VIS_ZOOM=2&& ..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_2c\visual.mjs
```

As capturas anteriores usaram o argumento `--antes`, antes da integração. Os roteiros estão em cache e usam Chromium/Vite isolados, `configFile:false`, `envDir:false`, somente GETs e fixtures. O formulário público foi habilitado apenas nessa configuração de ensaio, sem mudar flags reais. Nenhum comentário foi enviado. Fontes e serviços externos foram bloqueados; nenhuma dependência foi instalada.

## Resultado e limites

**As obstruções solicitadas foram eliminadas nos cenários ensaiados, preservando a interação não modal e o foco da VIS-5B.2B.** As superfícies continuam sobrepostas visualmente ao conteúdo de fundo por serem flutuantes; a garantia verificada é de não obstruir o textarea com o FAB, nem o controle externo focado com essas superfícies. Não se afirma que o painel aberto nunca cobrirá qualquer conteúdo não focado.

Não houve leitor de tela, aparelho físico, teclado virtual móvel, API real ou gravação. Foram ensaiadas as quatro larguras com altura de 1.000 px CSS e a viewport de zoom descrita; não se afirma cobertura de toda combinação possível de dimensões, conteúdo e navegador. Evidências em `.cache/` são locais e ignoradas pelo Git.

Não foi executada a suíte completa. As nove falhas públicas históricas permanecem separadas e não foram alteradas: três expectativas `+5` contra `+25`, quatro de fluxos públicos e duas de 404. Os demais achados da VIS-5 continuam fora do escopo. Build mantém os avisos de chunk acima de 500 kB (principal **745,46 kB**, **211,93 kB gzip**) e import estático/dinâmico de `PatrimonioEditor`; nenhum aviso suprimido. Sem commit, push ou deploy.
