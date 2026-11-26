# FUNC-0.2 — Correção do fallback de imagens em Conheça Mais

26/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD `9a803cd28a81eb638b77a84b9849d258cb00ac7f`. Consultados os relatórios FUNC-0, FUNC-0.1 e VIS-5B.5, o código e o histórico Git local. Sem fetch, commit, push ou deploy.

## Causa confirmada e histórico

`conteudoApi` resolve `imagemUrl ?? imagem` com `resolverUrlPublica` e fornece `imagem` ao card. Valores ausentes/nulos chegam como string vazia; espaços permanecem. O card de exposição passava esse valor diretamente para `<img>`, sem normalização de apresentação ou tratamento de erro. Isso explica as quatro falhas para entradas ausentes/vazias e a quinta para erro de carregamento, além dos avisos React registrados na FUNC-0.1.

`ImagemPatrimonio` já utiliza `normalizarUrlImagem`, adota `/imagem-indisponivel.svg` quando necessário e retira o handler de erro ao apresentar o fallback. Também reinicia o estado de falha quando a URL muda. É compatível com esse card: renderiza somente um `img`, repassa `loading` e preserva o título como alternativa da imagem válida; na indisponibilidade, usa “Imagem indisponível: [título]”.

Investigação com `git log`, `git log -p`, busca por `ImagemPatrimonio` com `git log --all -S` e `git blame`:

- O `<img>` direto é atribuído ao limite histórico `48a412c`, de 03/10/2026, e permanece no pai de `9a803cd` e no HEAD atual. O diff de `9a803cd` muda a apresentação de Conheça Mais, mas não mostra remoção de `ImagemPatrimonio`.
- O componente compartilhado aparece no histórico em `0b36c5a`; `ExposicoesImagens.test.jsx` foi incorporado em `9a803cd`.
- [VIS-5B.5](correcoes_vis_5b_5.md) documenta a aplicação local dessas duas linhas e uma reaplicação após seu desaparecimento. FUNC-0 registrou 904/905; FUNC-0.1, no checkout atual, reproduziu as cinco falhas de exposições.

**Não foi encontrado um commit que remova o fallback de Conheça Mais.** Os relatórios evidenciam estados locais que não aparecem como essa alteração no histórico consultado; não é possível determinar o momento ou responsável pela perda. Nenhuma reformulação externa foi revertida.

## Alterações e preservação

Somente [ConhecaMais.jsx](../frontend/src/pages/ConhecaMais/ConhecaMais.jsx) foi modificado nesta etapa, além deste relatório: import de `ImagemPatrimonio` e substituição do `<img>` do card por esse componente, mantendo `src={e.imagem}`, `alt={e.titulo}` e `loading="lazy"`.

Nenhum teste, CSS, componente compartilhado ou serviço foi alterado. Mantidos os wrappers, classes, dimensões, proporções, conteúdo e links. As alterações locais anteriores de `AdminAuditoria.test.jsx` e `correcoes_func_0_1.md` foram preservadas. A conferência SHA-256 de **970 arquivos preexistentes** aponta somente Conheça Mais como alterado nesta execução: [integridade](../.cache/func_0_2/integridade.json). Inclui as correções VIS-1 a VIS-5B, FUNC-0/FUNC-0.1 e os arquivos da Home, sem mudança em `heroDestaqueMock` ou no contador +25.

## Validação automatizada

Comandos em `cmd.exe`, a partir de `frontend`, com o Node 24.22.1 existente em `../.cache/d4_final/node24/node.exe`:

```bat
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/ExposicoesImagens.test.jsx test/ImagemPatrimonio.test.jsx test/AdminAuditoria.test.jsx test/ConhecaMais.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
git diff --check
```

| Verificação | Resultado |
| --- | --- |
| Direcionados | **44/44**, quatro arquivos, exit 0; 63,70 s. Exposições 5/5, ImagemPatrimonio 18/18, Histórico 18/18 e Conheça Mais 3/3. |
| Suíte completa | **905/905 aprovados**, 52/52 arquivos, exit 0; 203,60 s. Nenhuma falha remanescente ou aviso React de `src` vazio no log. |
| Lint | Aprovado, exit 0, sem mensagens. |
| Build | Aprovado, exit 0; 1.478 módulos; 6,79 s. |
| Diff | Aprovado; somente avisos do Git sobre normalização futura LF/CRLF. |

Logs: [direcionados](../.cache/func_0_2/direcionados.log), [suíte completa](../.cache/func_0_2/suite_completa.log), [lint](../.cache/func_0_2/lint.log), [build](../.cache/func_0_2/build.log). O build mantém os avisos de chunk maior que 500 kB (principal: 748,61 kB; gzip: 212,83 kB), importação estática/dinâmica de `PatrimonioEditor` e tempo de plugins. Nenhum aviso suprimido.

Meta atingida com a cobertura existente integralmente mantida, sem editar testes.

## Navegador e evidências visuais

Edge/Chromium headless, 320, 390, 768 e 1440 px. Foram comparados **12 cenários antes/depois**: um card com fotografia válida, dois cards com imagem ausente/quebrada e seis cards cobrindo fotografia válida, `undefined`, `null`, string vazia, espaços e HTTP 404. Capturas representativas foram inspecionadas visualmente.

- Geometria idêntica nos 12 pares: página, hero, seções, grid, cards, figuras, imagens e corpo dos cards; mesmas proporções e `object-fit`. Sem overflow horizontal.
- As quatro capturas de página completa com fotografia válida são **idênticas byte a byte** antes/depois. Nos demais casos, o fallback substitui a imagem quebrada sem mudar o layout.
- Imagens trazidas à viewport terminaram com largura natural positiva; URLs e nomes acessíveis correspondem ao cenário; `loading="lazy"`, `href`, `target` e `rel` dos links foram conferidos.
- A matriz inicial reproduziu 16 avisos de `src` vazio ao repetir os cenários nas quatro larguras; a matriz final teve **zero avisos React e zero exceções JavaScript**.
- Ensaio adicional com o próprio SVG retornando 404: **uma única requisição ao fallback**, sem ciclo, conservando sua URL e alternativa textual. Nesse caso a imagem naturalmente não pode ser exibida.

| Largura | Antes | Depois |
| --- | --- | --- |
| 320 px | [Cards](../.cache/func_0_2/antes/dupla_320_cards.png) | [Cards](../.cache/func_0_2/depois/dupla_320_cards.png) |
| 390 px | [Cards](../.cache/func_0_2/antes/dupla_390_cards.png) | [Cards](../.cache/func_0_2/depois/dupla_390_cards.png) |
| 768 px | [Cards](../.cache/func_0_2/antes/dupla_768_cards.png) | [Cards](../.cache/func_0_2/depois/dupla_768_cards.png) |
| 1440 px | [Grade](../.cache/func_0_2/antes/grade_1440_cards.png) | [Grade](../.cache/func_0_2/depois/grade_1440_cards.png) |

Também: [card único válido](../.cache/func_0_2/depois/unica_1440_cards.png), [resumo comparativo](../.cache/func_0_2/resumo_visual.json), [medições e requisições](../.cache/func_0_2/depois/resultado.json), [roteiro](../.cache/func_0_2/visual.mjs) e [log final](../.cache/func_0_2/visual_depois.log).

## Limitações

Chrome e Edge não responderam a `Runtime.enable` dentro do sandbox. O ensaio funcionou com Edge fora do sandbox, após aprovação automática, usando Vite isolado (`configFile:false`, `envDir:false`), fixtures locais e bloqueio de serviços externos. Foram usados somente GETs locais; sem backend, banco, autenticação real, alterações de API, dependências ou Docker. Destinos externos dos links foram conferidos pelos atributos, sem acessar sites terceiros. Sem novo ensaio de zoom ou leitor de tela. As evidências em `.cache` são locais e ignoradas pelo Git.
