# Home — segunda referência e imagens sem URL

18/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD e referência local `origin/development/backend`: `67769378a6a33c2e86a2b74f986a2b1eb637dd58`. Alterações locais anteriores preservadas. Sem fetch, commit, push ou deploy.

## Resultado visual

A segunda imagem anexada neste pedido substitui a decisão anterior de card branco. Ela mostra uma superfície cinza semitransparente, texto escuro, miniaturas pequenas e seta discreta. O CSS foi ajustado para essa composição, mantendo o card à direita do banner e, em telas menores, abaixo do texto sem transbordar.

- Largura máxima: **264 px**, anteriormente 320 px; padding 12 × 14 px, sem aumentar o espaçamento compacto já existente.
- Superfície: branco com alfa **0,64** e desfoque de 6 px, que escurece ao compor com a fotografia do banner. Não foi aplicada opacidade ao conteúdo ou às fotos.
- Miniaturas: **36 × 36 px**, anteriormente 46 px. Contador sem caixa branca grande; cálculo e nome acessível preservados.
- Título de 13,5 px, descrição de 11,5 px, textos limitados visualmente e cores secundárias mais escuras. A ficha mantém o nome integral acessível.
- Seta: representação de 28 px, fundo transparente, alvo de **44 × 44 px** por pseudo-elemento; interação na área expandida e foco visível conferidos.

Com os mesmos dados de ensaio e dois estados VIS-3, o card passou de 320 × 228,39 para **264 × 206,28 px** no desktop. Com título, descrição e quantidade de fotos equivalentes à referência, sem selos adicionais, mediu **264 × 147,89 px**, proporção próxima à imagem anexada. Selos e avisos acrescentam altura quando necessários; não foram ocultados para imitar uma captura sem restrições.

O [recorte visual de comparação](../.cache/home_referencia_2/visual/depois/card_referencia.png) foi inspecionado, além das páginas completas. Seu texto “Antigo hospital municipal” existe somente na fixture HTTP do ensaio de referência. **A aplicação continua usando o acervo real; nenhum `heroDestaqueMock` foi restaurado.** As fotografias dessa fixture não reproduzem as da referência.

`global.css` foi inspecionado e preservado. `InicioHero.css` concentrava os overrides responsáveis pelo card branco e grande. Suas declarações foram substituídas no próprio lugar; não foi anexado outro bloco de correção nem usado `!important`. O escopo `.inicio-hero` resolve a especificidade das regras globais, inclusive o stretch mobile. Banner, pesquisa e sugestões não foram modificados.

## Origem e correção do aviso React

A cadeia foi confirmada no código: `normalizarPatrimonio` chama `resolverUrlPublica(p.imagens?.[0]?.url)`, que retorna `""` quando não há foto. `PlaquetaCard` renderizava esse valor diretamente em `<img src={item.imagemPrincipal}>`. O aviso apareceu quatro vezes no [ensaio anterior](../.cache/home_referencia_2/antes.log). Seu `onError` ainda substituía a imagem pela fotografia do Sanatório Padre Bento.

O catálogo passou a usar `ImagemPatrimonio`, com SVG neutro tanto para ausência quanto para falha de carregamento. O mapa tinha a mesma exposição de `imagemPrincipal` e foi corrigido apenas nos dois elementos de imagem. A galeria também passou a usar o componente para URLs inválidas e fotos quebradas; nenhum layout dessas páginas foi alterado.

Um utilitário de apresentação agora normaliza espaços, rejeita valores não textuais, vazios, URLs malformadas e protocolos inadequados. Mantém URLs relativas, HTTP(S), blob e data de imagem. O componente sempre entrega ao `<img>` uma URL válida ou `/imagem-indisponivel.svg`, sem repetir tentativas do fallback.

Na Home, as URLs são normalizadas e filtradas **antes da deduplicação, seleção das três miniaturas e cálculo de `+N`**. Falha de rede utiliza o fallback, sem inventar fotos ou alterar a quantidade de registros válidos informada pelo acervo. Serviços HTTP e contratos não foram alterados.

## Arquivos desta execução

| Arquivo | Alteração |
| --- | --- |
| [InicioHero.css](../frontend/src/pages/Inicio/InicioHero.css) | Restauração da aparência da segunda referência. |
| [Inicio.jsx](../frontend/src/pages/Inicio/Inicio.jsx) | Somente import e filtragem das URLs; componente preservado. |
| [urlImagem.js](../frontend/src/utils/urlImagem.js) | Novo utilitário compartilhado de validação de URL para apresentação. |
| [ImagemPatrimonio.jsx](../frontend/src/components/ImagemPatrimonio.jsx) | Usa URL normalizada e fallback neutro. |
| [PlaquetaCard.jsx](../frontend/src/features/mapa/PlaquetaCard.jsx) | Elimina `src` vazio e fallback fotográfico indevido. |
| [Mapa.jsx](../frontend/src/pages/Mapa/Mapa.jsx) | Reutiliza fallback na lista e no painel. |
| [PatrimonioDetalhe.jsx](../frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx) | Reutiliza fallback na galeria. |
| Testes em `frontend/test/` | Atualizados `Inicio`, `ImagemPatrimonio`, `PlaquetaCard`, `EstadosVisuais`, `PatrimonioDetalhe` e o roteiro `regressoes_visuais.mjs`. |
| Este relatório | Evidências e limites da entrega. |

VIS-2 e os componentes/regras VIS-3 permanecem intactos. Conservação continua independente de visitação; demolidos continuam visíveis. [Comparação dos hashes iniciais](../.cache/home_referencia_2/integridade.json) registra os arquivos preexistentes modificados; `urlImagem.js` e este relatório são novos. Backend, banco, autenticação, serviços, dependências e infraestrutura não foram alterados.

## Validação

| Verificação | Resultado |
| --- | --- |
| Lint | Aprovado, exit 0. |
| Testes direcionados | **7 arquivos, 197/197 aprovados**, 66,36 s. |
| Build | Aprovado, exit 0, 1.470 módulos, 5,80 s. |
| Navegador antes/depois | 8 cenários antes; **26 depois**, 31 capturas finais incluindo o recorte. Home e catálogo nas quatro larguras; referência, ausência de imagem, imagem quebrada e textos longos nas quatro larguras. |
| Aviso React | **Zero avisos de `src` vazio depois**, verificados por captura de console; nenhum `<img>` com atributo ausente/vazio nos cenários medidos. |
| Responsividade e teclado | Sem overflow horizontal ou card fora do banner; foco visível, alvo expandido do link, favoritos por Enter/Espaço e clique preservados. Reflow equivalente a 200% incluído. |
| Contraste | Texto secundário calculado em **5,03:1** no caso conservador de fundo preto sob a camada translúcida. Não é auditoria completa de acessibilidade. |
| Integridade | `git diff --check` aprovado; índice Git sem alterações; escopos protegidos sem diff. |

Comandos em `cmd.exe`, a partir de `frontend`, usando Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs antes --pasta=../.cache/home_referencia_2/visual
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Inicio.test.jsx test/PlaquetaCard.test.jsx test/ImagemPatrimonio.test.jsx test/EstadosVisuais.test.jsx test/PatrimonioDetalhe.test.jsx test/situacaoPatrimonio.test.jsx test/MapaPatrimonios.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs --pasta=../.cache/home_referencia_2/visual
```

## Capturas e limitações

| Home | Antes | Depois |
| --- | --- | --- |
| 320 px | [Captura](../.cache/home_referencia_2/visual/antes/inicio_320.png) | [Captura](../.cache/home_referencia_2/visual/depois/inicio_320.png) |
| 390 px | [Captura](../.cache/home_referencia_2/visual/antes/inicio_390.png) | [Captura](../.cache/home_referencia_2/visual/depois/inicio_390.png) |
| 768 px | [Captura](../.cache/home_referencia_2/visual/antes/inicio_768.png) | [Captura](../.cache/home_referencia_2/visual/depois/inicio_768.png) |
| 1440 px | [Captura](../.cache/home_referencia_2/visual/antes/inicio_1440.png) | [Captura](../.cache/home_referencia_2/visual/depois/inicio_1440.png) |

[Sem foto](../.cache/home_referencia_2/visual/depois/inicio_320_sem_imagem.png), [foto quebrada](../.cache/home_referencia_2/visual/depois/inicio_320_quebrada.png), [textos extensos](../.cache/home_referencia_2/visual/depois/inicio_320_textos_longos.png), [foco](../.cache/home_referencia_2/visual/depois/inicio_foco_390.png), [medições e contraste](../.cache/home_referencia_2/comparacao.json), [resultado/console](../.cache/home_referencia_2/visual/depois/resultado.json).

Logs: [lint](../.cache/home_referencia_2/lint.log), [testes](../.cache/home_referencia_2/testes.log), [build](../.cache/home_referencia_2/build.log), [navegador](../.cache/home_referencia_2/depois.log).

As evidências são locais e ignoradas pelo Git. A comparação visual confirmou a composição da segunda imagem, sem afirmar identidade pixel a pixel: a referência é um recorte, as fotos de ensaio são diferentes e fontes externas ficam bloqueadas. Ensaios usam fixtures HTTP locais; nenhum backend, banco ou dado real foi gravado. Mapa e galeria receberam testes de componentes; Google Maps real, leitor de tela, aparelhos físicos e API real não foram homologados. Zoom é emulação de reflow, não acionamento da interface do navegador. Permanecem os avisos conhecidos de bundle/import do editor no build e as pendências VIS-4 anteriores.
