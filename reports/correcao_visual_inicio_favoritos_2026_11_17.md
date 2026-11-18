# Correção visual — Início e favoritos do catálogo

Data: 17/11/2026. Base: `development/backend`, HEAD `6776937`, com alterações locais UI-F2/UI-F6 preservadas. Sem commit, push ou deploy.

## Referência e causas

As três imagens mencionadas no pedido não estavam disponíveis nos anexos acessíveis. O usuário forneceu o JSX antigo da Home; ele confirma a estrutura do destaque e o indicador `+N`, mas não contém as regras de cor/posição. A correção segue a descrição solicitada. Foram capturadas as duas páginas **antes e depois** com os mesmos dados de ensaio; não se afirma comparação pixel a pixel com a terceira imagem original.

- **Home:** `global.css` define `.hero-float-card` com fundo branco, alinhamento à direita e largura de 320 px. A regra mobile o expande para 100%. O layout `.hero-inner-v2` tem duas colunas; os textos reais e o aviso completo de visitação, sem limites visuais, aumentavam a altura do card.
- **Favorito:** `.destaque-fav` fornece fundo branco, círculo de 30 px e posicionamento. `.plaqueta figure .favorito-btn`, mais específico, aumenta largura/altura para 44 px; isso amplia também o círculo, confundindo a dimensão visual com a área acessível. O SVG tinha 16 px. A regra antiga `.plaqueta > .favorito-btn` não corresponde ao botão atual, que fica dentro de `figure`.
- **Espaçamento inferior:** a faixa de recursos usa margem superior negativa no CSS global. O novo card precisa de espaço suficiente no banner para não ficar sob essa faixa em telas pequenas.

## Correções e arquivos desta rodada

| Arquivo | Alteração |
| --- | --- |
| [Inicio.jsx](../frontend/src/pages/Inicio/Inicio.jsx) | Classe de escopo `inicio-hero`, import do CSS local e indicador adicional calculado a partir das URLs distintas recebidas, descontando as três miniaturas. Sem restauração de mocks. |
| [InicioHero.css](../frontend/src/pages/Inicio/InicioHero.css) | Card no canto inferior esquerdo do conteúdo do banner, em fluxo normal; largura máxima de 300 px, fundo escuro com opacidade 0,82, miniaturas de 38 px. Título/resumo/motivo limitados visualmente a duas linhas, localização a uma. Texto integral permanece no DOM e a ficha continua acessível pelo link com nome completo. Conservação e visitação preservadas. |
| [FavoritoButton.css](../frontend/src/components/FavoritoButton/FavoritoButton.css) | Somente dentro de `.plaque-grid`: botão de 44 × 44 px com fundo transparente, círculo de 30 px em pseudo-elemento e coração de 14 px. Recuo de 4 px; alinhamento central, hover, estado ativo e foco com contorno contrastante. Handler, armazenamento, `aria-pressed` e navegação não foram modificados. |
| [Inicio.test.jsx](../frontend/test/Inicio.test.jsx) | Quatro casos novos: deduplicação, limite das miniaturas e contagem verdadeira, inclusive ausência de imagens adicionais. Testes anteriores preservados. |
| [regressoes_visuais.mjs](../frontend/test/regressoes_visuais.mjs) | Ensaio opt-in Chromium/Vite com respostas HTTP locais e bloqueio de serviços externos, capturas, geometria, teclado e interação. Nenhuma fixture adicionada ao código da aplicação. |

Os seletores novos prevalecem por escopo, independentemente da ordem de carregamento do CSS global, sem `!important`. O CSS global não foi editado nesta rodada. Favoritos da Home e de outras páginas não recebem a regra específica do catálogo. As alterações anteriores em outros arquivos continuam no checkout.

## Validação

- **Lint:** aprovado, exit 0.
- **Testes pertinentes:** 5 arquivos, **79/79 aprovados**, 46,96 s: `Inicio`, `PlaquetaCard`, `FluxosFrontendF2`, `situacaoPatrimonio`, `ImagemPatrimonio`. Incluem favoritos independentes da navegação, dados reais do contexto, fallback e coexistência conservação/visitação.
- **Build:** aprovado, exit 0. Permanecem os avisos conhecidos de chunk acima de 500 kB e import estático/dinâmico do editor; nenhuma alteração nesse escopo.
- **Ensaio visual final:** aprovado: 14 cenários e 18 capturas finais, sem overflow horizontal ou exceções JavaScript. Card contido no banner; favorito com alvo de 44 × 44 px, círculo de 30 px e ícone de 14 px. Teclado, hover e clique na parte transparente do alvo aprovados, sem alteração da URL. Resultados em `.cache/regressoes_visuais/depois/resultado.json`.

Comandos executados em `cmd.exe`, a partir de `frontend`, com Node 24.22.1 já instalado em cache:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Inicio.test.jsx test/PlaquetaCard.test.jsx test/FluxosFrontendF2.test.jsx test/situacaoPatrimonio.test.jsx test/ImagemPatrimonio.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs
```

O ensaio cobre 320, 390, 768 e 1440 px nas duas páginas, Home com textos extensos nas quatro larguras e reflow equivalente a zoom 200% em tela de 1440 px: viewport CSS de 720 px e escala de dispositivo 2. Essa emulação não é acionamento do zoom pela interface do navegador nem teste em aparelho físico. Teclado: Tab/Shift+Tab, foco visível, Enter e Espaço no favorito; clique também fora do círculo visual, dentro do alvo de interação. Conferidos hover, estado ativo, preservação da URL e ausência de sobreposição entre favorito e selo de visitação.

As capturas usam dados sintéticos exclusivamente no servidor de ensaio, para exercitar nomes longos, restrições, imagens adicionais e ausência de foto. Em funcionamento normal, a Home continua usando os registros do contexto/API, sem conteúdo fixo novo. Nenhum backend, banco, Prisma, Docker, autenticação ou dependência foi alterado.

O Chrome no sandbox falhou por timeout de CDP; as execuções concluídas usaram a permissão de execução local fora do sandbox. Durante a preparação do ensaio foram corrigidos o formato de uma fixture parametrizada, o ponto de clique na área circular e a espera pelas animações de entrada/hover. A tentativa inicial de aplicar CSS `zoom` a 320 px foi substituída pela emulação de reflow acima: CSS `zoom` isolado não reproduz as media queries do zoom de página.

## Evidências locais

| Cenário | Antes | Depois |
| --- | --- | --- |
| Home 1440 px | [Captura](../.cache/regressoes_visuais/antes/inicio_1440.png) | [Captura](../.cache/regressoes_visuais/depois/inicio_1440.png) |
| Home 390 px | [Captura](../.cache/regressoes_visuais/antes/inicio_390.png) | [Captura](../.cache/regressoes_visuais/depois/inicio_390.png) |
| Patrimônios 390 px | [Captura](../.cache/regressoes_visuais/antes/patrimonios_390.png) | [Captura](../.cache/regressoes_visuais/depois/patrimonios_390.png) |

- [Home com texto extenso, 320 px](../.cache/regressoes_visuais/depois/inicio_320_textos_longos.png).
- [Home 768 px](../.cache/regressoes_visuais/depois/inicio_768.png).
- [Reflow 200% — Home](../.cache/regressoes_visuais/depois/inicio_1440_zoom_200.png) e [Patrimônios](../.cache/regressoes_visuais/depois/patrimonios_1440_zoom_200.png).
- [Foco do favorito](../.cache/regressoes_visuais/depois/patrimonios_foco_390.png), [favoritado](../.cache/regressoes_visuais/depois/patrimonios_favoritado_390.png) e [hover](../.cache/regressoes_visuais/depois/patrimonios_hover_390.png).
- [Medições finais](../.cache/regressoes_visuais/depois/resultado.json), [testes](../.cache/regressoes_visuais/testes.log), [lint](../.cache/regressoes_visuais/lint.log), [build](../.cache/regressoes_visuais/build.log).

As evidências em `.cache/` são locais e ignoradas pelo Git. Permanecem pendentes a comparação com as imagens originais indisponíveis e a homologação com dados/ambiente reais; não foram substituídas por alegações de validação em produção.
