# VIS-5B.3 — Contraste e legibilidade

Execução iniciada em 22/11/2026 e concluída em 23/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência **local** `origin/development/backend`: `26821512f534f50fef7112c6f936f54328b1193b`. Sem fetch, commit, push ou deploy.

## Escopo e diagnóstico

Consultados [VIS-5A](auditoria_acessibilidade_vis_5a.md), [VIS-5B.1](correcoes_vis_5b_1.md), [VIS-5B.2A](correcoes_vis_5b_2a.md), [VIS-5B.2B](correcoes_vis_5b_2b.md) e [VIS-5B.2C](correcoes_vis_5b_2c.md), confrontando A03, A09 e A11 com o código e estilos computados. As alterações locais anteriores foram preservadas; o manifesto inicial e a comparação final ficam em `.cache/vis_5b_3/`.

Referências: [W3C — Contraste mínimo, 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) e [Contraste não textual, 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Para os textos pequenos habilitados conferidos, o aceite é 4,5:1; para o indicador de foco, 3:1 contra as superfícies adjacentes. Estados inativos são registrados separadamente, sem aplicar a eles a exigência de contraste dos controles habilitados.

| Achado | Causa confirmada | Correção pontual |
| --- | --- | --- |
| A03 | Buscar, Somente favoritos, Ver detalhes, Entrar e Leia mais usam azul `#3ea3dc`, com 2,81:1 sobre branco. O hover de Buscar clareia ainda mais esse fundo; o hover `#2b7fb3` dos links/Login também fica abaixo de 4,5:1. | Azul `#176b9a` somente nos seletores desses controles. Hover navy nos links/Login; preservado o efeito de brilho e deslocamento de Buscar. Nenhuma troca do token global `--blue`. |
| A03 — candidatos confirmados | Overline do Login e tag de notícia verdes; período da exposição laranja; rótulo flutuante do Login azul. Em Nossa missão, o hover torna brancos os textos sobre fundos azul/verde/laranja. | Verde `#14752f`, laranja `#9a5209` e rótulo azul escuro nos respectivos seletores. Nossa missão conserva fundos e animação, usando o texto escuro existente no hover. |
| A09 | Campos de `.admin-form` usam borda azul clara e sombra translúcida; o outline permanece transparente. O hover do input também pode prevalecer sobre a borda de foco. | Borda e outline sólido de 3 px `#176b9a`, afastado 2 px; removida a sombra clara. Hover aplica-se apenas quando não há `:focus-visible`. A borda de erro continua vermelha. No Login, o foco azul claro normal também recebeu borda e anel opaco escuros. |
| A11 | `PolarRadiusAxis` herda `#ccc`, ao contrário dos rótulos regionais que já usam `#525d70`. | Uma propriedade `tick` define `fill: #525d70` para a escala radial. Dados, domínio, séries, preenchimento, layout e `accessibilityLayer` não mudaram. |

O contador de Somente favoritos recebeu navy apenas quando o filtro está inativo, pois seu fundo translúcido é diferente do fundo do botão. O estado ativo continua branco sobre navy. Isso não altera o componente do coração nem a VIS-2.

## Arquivos desta entrega

| Arquivo | Alteração |
| --- | --- |
| [global.css](../frontend/src/styles/global.css) | Cores dos controles e textos públicos/Login confirmados; foco normal dos campos de Login. Sem alteração dos tokens de marca, dimensões, tipografia ou regras das etapas anteriores. |
| [Patrimonios.css](../frontend/src/pages/Patrimonios/Patrimonios.css) | Cor do filtro Somente favoritos e de seu contador inativo. |
| [admin.css](../frontend/src/features/admin/admin.css) | Indicador de foco dos campos compartilhados; eliminação do conflito com hover. Botões administrativos não foram editados. |
| [GraficosDashboard.jsx](../frontend/src/features/admin/components/GraficosDashboard.jsx) | Cor explícita dos números do radar. |
| [ContrasteRadar.test.jsx](../frontend/test/ContrasteRadar.test.jsx), novo | Regressão com SVG real do Recharts: valores da escala, quatro gráficos e contraste sobre branco e área semitransparente. |
| [contraste_visual.mjs](../frontend/test/contraste_visual.mjs), novo | Regressão opt-in em Chromium: cores computadas, estados, foco, geometria, viewport e capturas nas quatro larguras. Reutiliza o helper de navegador existente. |
| Este relatório | Diagnóstico, medições, evidências e limites. |

São quatro fontes preexistentes, dois testes novos e este relatório. Não foram alterados handlers, autenticação, permissões, contratos, endpoints, dados, backend, banco, Prisma, Docker, manifests ou locks. Home/mock `+25`, favoritos, conservação/visitação, títulos, idioma, gestão de foco, diálogo de notícias, textarea sem resize e posicionamento adaptativo do Contato permanecem intactos.

## Medições antes/depois

Cores computadas no Chromium; cálculo de luminância relativa sem arredondamento antes da comparação. Fundos/transparências e `brightness(1.1)` foram compostos antes do cálculo. No SVG, foi considerada a propriedade `fill`, não `color`.

| Elemento / estado | Antes | Depois |
| --- | --- | --- |
| Buscar — normal/foco | 2,81:1 | **5,82:1** |
| Buscar — hover com brilho | 2,33:1 | **5,01:1** |
| Somente favoritos — normal/foco | 2,81:1 | **5,82:1** |
| Somente favoritos — hover | 2,47:1 | **5,13:1** |
| Somente favoritos — ativo | 13,80:1 | **13,80:1**, preservado |
| Ver detalhes / Leia mais — normal/foco | 2,81:1 | **5,82:1** |
| Ver detalhes / Leia mais — hover | 4,38:1 | **13,80:1** |
| Entrar — normal/foco / hover | 2,81 / 4,38:1 | **5,82 / 13,80:1** |
| Login — overline verde | 3,37:1 | **5,81:1** |
| Login — label focado | 2,81:1 | **5,82:1** |
| Conheça Mais — tag verde | 3,02:1 | **5,20:1** |
| Exposição — período laranja | 2,31:1 | **5,86:1** |
| Nossa missão — texto no hover azul / verde / laranja | 2,61 / 3,09 / 1,68:1 | **6,37 / 5,30 / 10,16:1** |
| Busca de Usuários — borda/indicador focado contra branco | Borda 2,81:1; sombra clara; outline transparente | **5,82:1**, borda e outline sólido |
| Campo em erro — borda vermelha contra branco | 6,54:1 | **6,54:1**, com outline de foco independente |
| Radar — números contra branco | 1,61:1 | **6,65:1** |
| Radar — números contra a área roxa a 25% | 1,11:1 | **4,61:1** |
| Rótulos regionais / eixo das barras contra branco | 6,65 / 5,74:1 | **6,65 / 5,74:1**, sem alteração |

O teste do radar também considera a pintura da área semitransparente **sobre o próprio texto**, caso o eixo seja desenhado antes da série: resultado conservador **4,56:1**. A geometria e os valores do gráfico não foram alterados para obter contraste.

O contador inativo de favoritos no hover mede **9,74:1** depois; o ativo conserva **6,91:1**. Para o primeiro, o cálculo com a cor anterior herdada (`#3ea3dc`) e o mesmo fundo composto resulta em **1,98:1**; esse valor anterior é reconstruído a partir das cores, não uma medição separada do contador no navegador antes da edição. O botão Entrar desabilitado conserva o azul original e 2,81:1, registrado como estado inativo, fora do aceite de texto habilitado.

No Login, as mensagens reais de validação continuam em vermelho, com 6,54:1. A mensagem de senha alterada usa texto escuro, com 17,89:1, portanto não recebeu correção. Não se alterou uma regra verde sem consumidor para forçar essa mensagem a mudar de cor. Não foi confirmado texto laranja no Login dos estados ensaiados; o candidato laranja confirmado está no período da exposição.

## Validação

- **Lint:** aprovado, exit 0.
- **Vitest direcionado:** **89/89**, nove arquivos, exit 0; 70,64 s. `ContrasteRadar`, `AdminDashboard`, `AdminUsuariosFoco`, `OrientacaoPagina`, `IndiceNoticias`, `ContatoFoco`, `ContatoGeometria`, `AdminConteudoFoco` e `PlaquetaCard`.
- **Radar complementar:** 1/1, exit 0, após ampliar a asserção para composição da área sobre o texto. Antes da correção, o mesmo teste básico falhou pelo contraste real de 1,6059:1; não foi uma falha funcional nova.
- **Build:** aprovado, exit 0; 1.476 módulos, 3,68 s. Avisos conhecidos de chunk acima de 500 kB e import estático/dinâmico de `PatrimonioEditor` mantidos; principal 745,46 kB, 211,93 kB gzip.
- **Navegador:** 136 registros/capturas finais nas quatro larguras e 34 no zoom nativo; complementos com 64 registros/capturas nas quatro larguras e 16 no zoom. **250 capturas finais**, além das 170 anteriores às edições de produção. Os roteiros concluíram suas verificações; quantidade de capturas não equivale a certificação de acessibilidade.
- **Integridade:** `git diff --check` aprovado; índice Git vazio. A comparação dos hashes iniciais confirma somente os quatro fontes preexistentes listados nesta entrega alterados nesta etapa. Os dois testes novos e este relatório completam a entrega.

As **170 comparações geométricas antes/depois** não apontaram diferenças de largura ou altura acima da tolerância de 0,1 px. Não houve overflow horizontal do documento nem exceções JavaScript não tratadas nos cenários finais. O aviso React A14 permanece nos logs; não se afirma console sem mensagens. As capturas foram inspecionadas também para conferir cores e composição, além das asserções numéricas.

O roteiro usa Tab para estabelecer a modalidade de teclado e foca cada controle para conferir `:focus-visible`; hover usa deslocamento real do ponteiro. Login vazio exerce a validação local sem envio. Estados `disabled` e `aria-invalid` da busca de Usuários são representações controladas no DOM de ensaio, sem alteração da aplicação ou requisição de gravação; verificam CSS, não o fluxo de persistência. A medição final aguarda 750 ms, inclusive após disabled, para evitar cores intermediárias da transição.

O complemento percorre inputs, selects e textarea de Usuários, Regiões, Exposições, Novidades, Histórico e Feedback. Confere os estilos locais já existentes, ausência de resize nos textarea e alturas de pelo menos 44 px nos botões de Regiões, Histórico e Feedback. Não uniformiza o tamanho de outros botões. O contador de favoritos é medido sobre seus fundos de hover e ativo.

O zoom usa preferência nativa do Chromium em perfil temporário: janela externa de 1440 px, viewport **711 × 452 px CSS**, DPR 2, `visualViewport.scale=1`. Não foi usado CSS zoom nem apenas escala de dispositivo. A 100%, as larguras são 320, 390, 768 e 1440 px, com altura de 1.000 px CSS. Os gráficos foram rolados para a viewport antes da captura; números e eixos foram efetivamente vistos nas imagens.

Não houve ocorrência da intermitência de `AdminUsuariosFoco` na suíte concluída. Nenhum teste existente foi modificado para acomodar resultado. A suíte completa não foi executada.

### Ocorrências dos ensaios

A revisão automática de permissões ficou temporariamente indisponível por limite de uso e impediu uma execução; após a retomada, a execução local foi autorizada. O primeiro Vitest no sandbox permaneceu sem resultados e foi interrompido; os resultados concluídos são da execução local autorizada.

Na preparação do roteiro foram corrigidos escapes e variável do avaliador, a limpeza da sessão sintética antes do Login, o seletor atual de Leia mais e dos ticks de Recharts, a abertura do formulário de Regiões antes de aguardá-lo e a espera da transição disabled. As fixtures finais incluem uma tag de notícia com texto. Essas correções são do ensaio e não motivaram flexibilização do produto. O aviso React de imagem vazia de exposição (A14) continua reproduzido pela fixture e não foi corrigido nem ocultado.

## Capturas e registros

| Alvo — depois | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Buscar | [Captura](../.cache/vis_5b_3/depois/buscar_foco_320.png) | [Captura](../.cache/vis_5b_3/depois/buscar_foco_390.png) | [Captura](../.cache/vis_5b_3/depois/buscar_foco_768.png) | [Captura](../.cache/vis_5b_3/depois/buscar_foco_1440.png) |
| Favoritos | [Captura](../.cache/vis_5b_3/depois/favoritos_hover_320.png) | [Captura](../.cache/vis_5b_3/depois/favoritos_hover_390.png) | [Captura](../.cache/vis_5b_3/depois/favoritos_hover_768.png) | [Captura](../.cache/vis_5b_3/depois/favoritos_hover_1440.png) |
| Login | [Captura](../.cache/vis_5b_3/depois/entrar_foco_320.png) | [Captura](../.cache/vis_5b_3/depois/entrar_foco_390.png) | [Captura](../.cache/vis_5b_3/depois/entrar_foco_768.png) | [Captura](../.cache/vis_5b_3/depois/entrar_foco_1440.png) |
| Foco administrativo | [Captura](../.cache/vis_5b_3/depois/usuarios_foco_320.png) | [Captura](../.cache/vis_5b_3/depois/usuarios_foco_390.png) | [Captura](../.cache/vis_5b_3/depois/usuarios_foco_768.png) | [Captura](../.cache/vis_5b_3/depois/usuarios_foco_1440.png) |
| Radar na viewport | [Captura](../.cache/vis_5b_3/depois/radar_320.png) | [Captura](../.cache/vis_5b_3/depois/radar_390.png) | [Captura](../.cache/vis_5b_3/depois/radar_768.png) | [Captura](../.cache/vis_5b_3/depois/radar_1440.png) |

- Pares anteriores: [Buscar 390](../.cache/vis_5b_3/antes/buscar_foco_390.png), [favoritos 390](../.cache/vis_5b_3/antes/favoritos_hover_390.png), [Login 768](../.cache/vis_5b_3/antes/entrar_foco_768.png), [Usuários 390](../.cache/vis_5b_3/antes/usuarios_foco_390.png), [radar 320](../.cache/vis_5b_3/antes/radar_320.png). Os demais pares têm os mesmos nomes nas pastas `antes` e `depois`.
- Nossa missão: [antes](../.cache/vis_5b_3/antes/missao_3_hover_320.png) / [depois](../.cache/vis_5b_3/depois/missao_3_hover_320.png). Período da exposição: [antes](../.cache/vis_5b_3/antes/conheca_periodo_390.png) / [depois](../.cache/vis_5b_3/depois/conheca_periodo_390.png).
- Zoom: [radar antes](../.cache/vis_5b_3/antes_zoom/radar_1440.png) / [depois](../.cache/vis_5b_3/depois_zoom/radar_1440.png), [Login](../.cache/vis_5b_3/depois_zoom/entrar_foco_1440.png), [campo em erro e foco](../.cache/vis_5b_3/depois_zoom/usuarios_erro_foco_1440.png).
- Medições: [antes](../.cache/vis_5b_3/antes/resultado.json), [antes zoom](../.cache/vis_5b_3/antes_zoom/resultado.json), [depois](../.cache/vis_5b_3/depois/resultado.json), [depois zoom](../.cache/vis_5b_3/depois_zoom/resultado.json), [campos/contador](../.cache/vis_5b_3/complemento/resultado.json), [complemento zoom](../.cache/vis_5b_3/complemento_zoom/resultado.json), [comparação e integridade](../.cache/vis_5b_3/comparacao.json).
- Logs: [lint](../.cache/vis_5b_3/lint.log), [89 testes](../.cache/vis_5b_3/testes.log), [radar final](../.cache/vis_5b_3/radar_final.log), [build](../.cache/vis_5b_3/build.log), [regressão visual](../.cache/vis_5b_3/regressao_visual.log), [zoom](../.cache/vis_5b_3/depois_zoom.log).

Comandos a partir de `frontend`, em `cmd.exe`, com Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/ContrasteRadar.test.jsx test/AdminDashboard.test.jsx test/AdminUsuariosFoco.test.jsx test/OrientacaoPagina.test.jsx test/IndiceNoticias.test.jsx test/ContatoFoco.test.jsx test/ContatoGeometria.test.js test/AdminConteudoFoco.test.jsx test/PlaquetaCard.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\contraste_visual.mjs
set VIS_ZOOM=2&& ..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_3\zoom.mjs
```

Os pares anteriores foram obtidos com o roteiro em cache e `--antes`, antes de modificar produção. Os complementos usam `.cache/vis_5b_3/complemento.mjs`, com e sem `VIS_ZOOM=2`.

## Pendências e limites

**A03, A09 e A11 estão implementados e validados nos elementos e estados descritos.** Não foi identificada regressão de layout ou comportamento atribuível a esta etapa nos cenários concluídos. As alterações anteriores foram preservadas, inclusive as superfícies adaptativas do Contato e a gestão de foco.

Os ensaios usam Chromium/Vite isolados (`configFile:false`, `envDir:false`), respostas sintéticas e somente GETs. Nenhum login real, envio de formulário, banco, persistência ou serviço externo foi utilizado. Nenhuma dependência instalada. Fontes e serviços externos bloqueados podem produzir diferenças de tipografia em produção. As evidências em `.cache/` são locais e ignoradas pelo Git.

Não houve leitor de tela, dispositivo físico ou homologação com API real. A mudança de contraste não certifica acessibilidade integral, todos os pares de cor do portal ou aprovação global da branch. A10, A12, A13 e A14 não foram implementados. As nove falhas funcionais históricas permanecem separadas, sem execução ou alteração dos respectivos testes: três expectativas `+5` contra `+25` em `Inicio.test.jsx`, quatro fluxos públicos em `FluxosFrontendF2.test.jsx` e duas de fallback 404 em `RoteamentoPublico.test.jsx`.
