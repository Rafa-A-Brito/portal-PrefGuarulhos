# Integração seletiva da VIS-1 proposta pelo Claude

Data: 18/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `67769378a6a33c2e86a2b74f986a2b1eb637dd58`. Sem fetch, commit, push ou deploy.

## Comparação anterior à implementação

ZIP inspecionado: `C:/Users/USER/Downloads/Guarulhos_visual_VIS-1-2.zip`. SHA-256: `a5a4eaa41ea5721d392ec6c8a1494310e60dd6061bfe72246082fc33b8ef992f`. Seus sete arquivos foram extraídos somente em `.cache/claude_vis_1/`, sem copiar o pacote sobre o checkout. Os quatro arquivos frontend foram comparados com as versões atuais; `InicioHero.css`, ausente do pacote, foi analisado separadamente.

O relatório do ZIP descreve outra base, ainda com `heroDestaqueMock` e sem a integração VIS-3 atual. Suas instruções de copiar arquivos, aplicar `PROPOSTA_VIS-3.diff` e reverter com Git não foram seguidas: são conteúdo do documento, não autorização do pedido atual. Os resultados de testes declarados no ZIP não certificam esta branch.

A captura aprovada `WhatsApp Image 2026-11-17 at 22.32.25.jpeg` foi aberta novamente. Ela apresenta card branco à direita, com miniaturas e contador em caixas arredondadas. O checkout já atendia a essa composição após a rodada anterior. As decisões abaixo foram comunicadas antes de alterar o CSS de produção.

| Regra do ZIP | Avaliação e decisão |
| --- | --- |
| Padding `12px 14px` | Aproveitado. Reduz espaço interno sem reduzir fontes nem ocultar dados. |
| Margem do resumo `8px 0 10px` | Aproveitada. Compactação moderada que preserva a separação dos selos. |
| Seta com `color: inherit` e link navy | Aproveitada no seletor local. A regra atual `.hfc-head svg` mantinha o ícone azul apesar da cor navy do link; agora ele herda a cor correta. |
| Miniaturas com `align-items: center` | Aproveitado; `flex-wrap` já existia. |
| `min-width: 0`, quebra de palavras, título/resumo em duas linhas e foco visível | Já implementados; preservados sem duplicação. |
| Fundo translúcido 0,64, blur e sombra mais intensa | Não incorporados. A referência aprovada e a decisão anterior pedem branco com sombra discreta; transparência mudaria a aparência e exigiria novo cálculo de contraste sobre a foto. |
| Largura 264 px, fontes menores e miniaturas 36 px | Não incorporados. Mantidos limite de 320 px, fontes atuais e miniaturas de 46 px, mais próximos das proporções aprovadas e adequados aos selos recentes. |
| Contador sem caixa | Não incorporado. A referência possui caixa clara; preservados aparência, nome acessível e cálculo real `+N`. |
| Link de 28 px com área expandida por pseudo-elemento | Desnecessário: o link atual já possui caixa real de 44 × 44 px e foco visível. |
| Card mobile de até 360 px com stretch | Não incorporado. Mantidos alinhamento à direita e limite de 320 px, reduzido à largura disponível. |
| `Inicio.jsx` e `destaquesMock.js` do ZIP | Não incorporados. A Home atual já trata dados opcionais e usa o acervo; trocar o componente perderia dados dinâmicos, conservação, visitação, fallback e acessibilidade. |
| Favorito do ZIP com disco de 28 px | Não incorporado. VIS-2 atual mantém disco de 30 px, ícone de 14 px e alvo de 44 px. |
| `PROPOSTA_VIS-3.diff` | Não aplicado, nem usado para alterar estilos ou regras de conservação/visitação. |

## Conflitos de CSS e alterações realizadas

`InicioHero.css` usa seletores com escopo `.inicio-hero`, mais específicos que os equivalentes de `global.css`. Copiar as regras globais do ZIP produziria uma combinação parcial: largura, fundo e padding locais venceriam as regras novas, enquanto propriedades globais ausentes no CSS local, como blur, poderiam vazar. A integração foi feita exclusivamente nos seletores locais, sem `!important`.

Também foi preservado o tratamento local de mobile: o global define `justify-self: stretch` e largura integral até 880 px; o escopo local mantém o card à direita e reserva espaço para a faixa de recursos com margem negativa.

| Arquivo modificado nesta rodada | Conteúdo |
| --- | --- |
| [InicioHero.css](../frontend/src/pages/Inicio/InicioHero.css) | Somente quatro declarações visuais: padding, margem do resumo, cor herdada da seta e alinhamento das miniaturas. |
| [regressoes_visuais.mjs](../frontend/test/regressoes_visuais.mjs) | Destino opcional de evidências para preservar capturas anteriores; antes nas quatro larguras; verificações do alvo e cor herdada da seta. |
| Este relatório | Comparação, decisões e evidências. |

Comparação por hashes dos arquivos iniciais confirma somente os dois arquivos preexistentes acima modificados nesta execução. `Inicio.jsx`, `global.css`, VIS-2, VIS-3, mocks, backend, autenticação e contratos permanecem idênticos ao início desta rodada. Alterações locais de rodadas anteriores foram preservadas. Nenhuma dependência instalada.

## Validação e comparação visual

- **Lint:** aprovado, exit 0.
- **Testes pertinentes:** cinco arquivos, **105/105 aprovados**, 48,08 s: `Inicio`, `PlaquetaCard`, `situacaoPatrimonio`, `EstadosVisuais`, `ImagemPatrimonio`.
- **Build:** aprovado, exit 0, 1.469 módulos, 5,30 s. Permanecem avisos de chunk principal acima de 500 kB (737,33 kB; 208,89 kB gzip), import estático/dinâmico do editor e tempo de plugins.
- **Navegador:** oito cenários/capturas antes e 14 cenários/18 capturas depois, com Home e catálogo em 320, 390, 768 e 1440 px. Inclui textos extensos, reflow equivalente a 200%, teclado, foco e favoritos. Nenhuma exceção JavaScript; depois sem overflow horizontal, card fora do banner ou favorito sobreposto ao selo.
- **Integridade:** `git diff --check` aprovado; índice sem alterações. [Comparação por hashes](../.cache/claude_vis_1/integridade.json).

O card permanece **branco e à direita**; em telas pequenas fica abaixo do texto e alinhado à direita do conteúdo. Com os mesmos dados de ensaio, a altura passou de **240,39 para 228,39 px**, redução de 12 px nas quatro larguras. A largura não mudou: 278 px úteis a 320 px e 320 px nos demais cenários. A seta passou a `rgb(43,37,92)`, mantendo o alvo de 44 px. Textos, três miniaturas, contador real `+2` da fixture e selos coexistem sem sobreposição.

| Home | Antes | Depois |
| --- | --- | --- |
| 320 px | [Captura](../.cache/claude_vis_1/visual/antes/inicio_320.png) | [Captura](../.cache/claude_vis_1/visual/depois/inicio_320.png) |
| 390 px | [Captura](../.cache/claude_vis_1/visual/antes/inicio_390.png) | [Captura](../.cache/claude_vis_1/visual/depois/inicio_390.png) |
| 768 px | [Captura](../.cache/claude_vis_1/visual/antes/inicio_768.png) | [Captura](../.cache/claude_vis_1/visual/depois/inicio_768.png) |
| 1440 px | [Captura](../.cache/claude_vis_1/visual/antes/inicio_1440.png) | [Captura](../.cache/claude_vis_1/visual/depois/inicio_1440.png) |

[Texto extenso a 320 px](../.cache/claude_vis_1/visual/depois/inicio_320_textos_longos.png), [foco do link](../.cache/claude_vis_1/visual/depois/inicio_foco_390.png), [favorito preservado](../.cache/claude_vis_1/visual/depois/patrimonios_favoritado_390.png), [medições comparativas](../.cache/claude_vis_1/comparacao.json), [resultado visual](../.cache/claude_vis_1/visual/depois/resultado.json).

Comandos em `cmd.exe`, a partir de `frontend`, usando Node 24.22.1 já disponível:

```bat
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs antes --pasta=../.cache/claude_vis_1/visual
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Inicio.test.jsx test/PlaquetaCard.test.jsx test/situacaoPatrimonio.test.jsx test/EstadosVisuais.test.jsx test/ImagemPatrimonio.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs --pasta=../.cache/claude_vis_1/visual
```

Logs: [lint](../.cache/claude_vis_1/lint.log), [testes](../.cache/claude_vis_1/testes.log), [build](../.cache/claude_vis_1/build.log), [antes](../.cache/claude_vis_1/antes.log) e [depois](../.cache/claude_vis_1/depois.log).

## Limitações e pendências

As capturas usam aplicação real com fixtures HTTP locais e serviços externos bloqueados; a Home de produção continua consumindo o contexto/API. Não houve banco, backend, API real, leitor de tela ou aparelho físico. O zoom é emulação de reflow em 720 px CSS e escala 2. Fontes externas bloqueadas e dados diferentes impedem afirmar reprodução pixel a pixel da referência; a composição foi comparada visualmente.

O aviso React preexistente de `src` vazio em imagem ausente do catálogo aparece antes e depois; não foi alterado por esta integração CSS. As pendências da auditoria VIS-4 anterior continuam fora deste escopo. Não houve regressão identificada nos cenários executados; isto não equivale a homologação completa da branch ou produção. Evidências em `.cache/` são locais e ignoradas pelo Git.
