# Restauração isolada do card flutuante original

18/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `67769378a6a33c2e86a2b74f986a2b1eb637dd58`. Sem fetch, commit, push ou deploy. Alterações locais anteriores preservadas.

## Resultado e escopo

O card flutuante voltou a usar **`heroDestaqueMock` exclusivamente nesse bloco**, conforme a nova autorização. Foram recuperados “Antigo hospital municipal”, “Centro, Guarulhos”, a descrição original, as três miniaturas originais e o contador fixo **`+5`**. O link voltou a `/patrimonios`, sem associar esse conteúdo demonstrativo ao primeiro registro real da API.

A composição compacta da referência foi mantida: largura máxima de 264 px, miniaturas de 36 px, superfície cinza semitransparente sobre o banner, texto escuro, seta discreta com alvo de 44 px e foco visível. A altura do card com o conteúdo original é aproximadamente 148 px. Em telas pequenas ele fica abaixo do texto, limitado ao banner e alinhado à direita. A aparência foi conferida nas capturas, além das medições automatizadas.

Pesquisa, sugestões, filtros por categoria e cards da seção Destaques continuam alimentados pelo contexto/API. Os selos VIS-3 permanecem nesses cards e nas demais páginas. Somente o card fixo deixou de apresentar os estados do primeiro patrimônio real. Favoritos VIS-2, backend, banco, autenticação e serviços HTTP foram preservados.

O tratamento anterior de imagens inválidas foi mantido: URLs do mock passam pelo normalizador antes da renderização e `ImagemPatrimonio` fornece fallback neutro quando uma imagem falha. O contador é novamente o valor original do mock, não uma contagem da API. Nenhuma fotografia passou a ser usada como fallback de outro patrimônio.

## Arquivos modificados nesta execução

| Arquivo | Alteração |
| --- | --- |
| [Inicio.jsx](../frontend/src/pages/Inicio/Inicio.jsx) | Import e uso do mock apenas no card flutuante; link original e contador restaurados. Não houve substituição integral do componente. |
| [InicioHero.css](../frontend/src/pages/Inicio/InicioHero.css) | Removidas regras de conservação e aviso de visitação que deixaram de ter consumidores no banner. Estilo compacto preservado; `global.css` não foi editado. |
| [Inicio.test.jsx](../frontend/test/Inicio.test.jsx) | Verifica mock isolado, miniaturas, contador, URLs vazias, pesquisa e filtro dinâmico. |
| [EstadosVisuais.test.jsx](../frontend/test/EstadosVisuais.test.jsx) | Verifica conservação e visitação nos destaques reais da Home e no mapa, sem exigir estados da API no card fixo. |
| [FluxosFrontendF2.test.jsx](../frontend/test/FluxosFrontendF2.test.jsx) | Atualiza somente os quatro casos da Home para a decisão atual, preservando os demais testes. |
| [regressoes_visuais.mjs](../frontend/test/regressoes_visuais.mjs) | Verifica título, três fotos, `+5` e link fixos diante de diferentes respostas da API. |
| Este relatório | Evidências e limites da validação. |

O arquivo do mock não foi editado. A [comparação de hashes](../.cache/home_mock/integridade.json) confirma os seis arquivos preexistentes modificados nesta rodada; nenhum outro fonte de produção mudou.

## Validação

- Lint aprovado, exit 0.
- Suíte direcionada final: **125/125 testes**, cinco arquivos, sem erro não tratado.
- Casos da Home em `FluxosFrontendF2`: **4/4 aprovados**; os dez casos de outros fluxos desse arquivo não foram executados nesta rodada.
- Build aprovado, exit 0. Permanecem os avisos conhecidos de chunk acima de 500 kB e import estático/dinâmico do editor.
- Navegador: **26 cenários e 31 capturas finais**, além de oito capturas anteriores. Conferidos 320, 390, 768 e 1440 px, teclado, foco, alvo expandido do link, favoritos e reflow equivalente a 200%. Sem overflow horizontal, card fora do banner, exceções JavaScript ou avisos React de `src` vazio.
- `git diff --check` aprovado; índice Git sem alterações.

Durante a preparação, o teste parametrizado recebeu um objeto em vez da lista esperada, e o teste novo de filtro precisava simular `scrollTo`, ausente no JSDOM. Ambos foram corrigidos no teste, sem mudar a produção para acomodá-los. A reexecução isolada de `Inicio` passou em 21/21; a suíte conjunta foi repetida após esses ajustes.

Comandos em `cmd.exe`, a partir de `frontend`, com Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs antes --pasta=../.cache/home_mock/visual
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Inicio.test.jsx test/PlaquetaCard.test.jsx test/ImagemPatrimonio.test.jsx test/EstadosVisuais.test.jsx test/situacaoPatrimonio.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/FluxosFrontendF2.test.jsx -t home --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs --pasta=../.cache/home_mock/visual
```

## Capturas antes/depois

| Home | Antes | Depois |
| --- | --- | --- |
| 320 px | [Captura](../.cache/home_mock/visual/antes/inicio_320.png) | [Captura](../.cache/home_mock/visual/depois/inicio_320.png) |
| 390 px | [Captura](../.cache/home_mock/visual/antes/inicio_390.png) | [Captura](../.cache/home_mock/visual/depois/inicio_390.png) |
| 768 px | [Captura](../.cache/home_mock/visual/antes/inicio_768.png) | [Captura](../.cache/home_mock/visual/depois/inicio_768.png) |
| 1440 px | [Captura](../.cache/home_mock/visual/antes/inicio_1440.png) | [Captura](../.cache/home_mock/visual/depois/inicio_1440.png) |

[Recorte do card original restaurado](../.cache/home_mock/visual/depois/card_referencia.png), [resultado visual e console](../.cache/home_mock/visual/depois/resultado.json), [lint](../.cache/home_mock/lint.log), [suíte final](../.cache/home_mock/suite_final.log), [fluxos da Home](../.cache/home_mock/fluxos_home.log), [build](../.cache/home_mock/build.log).

As capturas usam servidor HTTP local com fixtures para o acervo; o card flutuante usa o próprio mock original da aplicação. Os modos de ensaio com textos extensos, ausência ou falha de imagens alteram o acervo, mas agora o card fixo permanece invariável. Fontes externas bloqueadas e a escala da referência impedem afirmar identidade pixel a pixel. Evidências em `.cache/` são locais e ignoradas pelo Git. Não houve API real, banco, dispositivo físico ou leitor de tela; nenhum pacote foi instalado.
