# VIS-3 — Conservação e visitação

Data: 17/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `67769378a6a33c2e86a2b74f986a2b1eb637dd58`. Sem fetch, commit, push ou deploy.

## Estado encontrado e recomposição autorizada

O checkout não correspondia ao relatório VIS-1/VIS-2 anterior: os arquivos novos continuavam presentes, mas os arquivos rastreados estavam iguais ao HEAD. `Inicio.jsx` usava `heroDestaqueMock`, não importava `InicioHero.css`, e o CSS do favorito não continha a representação visual reduzida. O usuário autorizou explicitamente: **“Recompor VIS-1/VIS-2 neste checkout e continuar”**.

Foi recomposta a Home dinâmica com o snapshot local conferido `.cache/regressoes_visuais/inicio_antes.jsx`, mais os ajustes VIS-1: escopo `inicio-hero`, CSS existente, miniaturas distintas e contador verdadeiro. O CSS `InicioHero.css` foi preservado integralmente. O favorito voltou a ter alvo de 44 × 44 px, círculo de 30 px e coração de 14 px, restritos ao catálogo. Recompostos também os testes de Home pertinentes, sem copiar pacote completo sobre o checkout.

A autorização foi aplicada à recomposição necessária de VIS-1/VIS-2. Não se restauraram em bloco as demais diferenças históricas UI-F2/UI-F6, como sincronização da navegação e fallback 404. O relatório anterior de 709 testes não certifica este checkout.

## Avaliação e decisões visuais

| Estado | Apresentação e decisão |
| --- | --- |
| Em restauração | Selo de conservação amarelo, texto explícito e borda. Não implica fechamento. |
| Necessita restauração | Mesmo tratamento de atenção, com rótulo próprio. Não implica restrição de acesso. |
| Em ruínas | Selo de conservação vermelho claro, texto escuro. Sem alteração da foto ou da regra de localização. |
| Demolido | Selo histórico neutro. Continua no catálogo, na paginação, na ordem da Home e no mapa conforme a política existente. |
| Acesso parcial | Selo com texto e ícone de atenção; aviso completo no destaque principal e na ficha. |
| Temporariamente fechado | Rótulo compacto existente “Fechado”, com título explicativo “Visitação: Temporariamente fechado para visitação”. Aviso completo, motivo literal e dia civil preservados na ficha. |
| Sem visitação pública | Texto e ícone de cadeado. Conservação continua independente. |
| Aberto | Mantida a regra existente: não gera selo de restrição nem aviso. Nenhum estado de conservação é usado para mudar essa decisão. |
| Não informado / ausente | Mantida a ausência de selo. Isso **não significa autorização de entrada**; não se converte desconhecido em aberto. |

**Recomendação sobre opacidade: não aplicar automaticamente.** Os rótulos já comunicam a condição de conservação de forma inequívoca. Esmaecer uma fotografia pode sugerir que o card está desabilitado, confundir conservação com visitação e reduzir a leitura do registro histórico. Aplicar opacidade ao card inteiro também reduziria o contraste de textos e controles. Nenhuma regra de opacidade foi adicionada; as fotografias verificadas mantêm opacidade computada 1. A transparência já existente no fundo escuro da Home é uma decisão de composição do banner, independente do estado do patrimônio.

## Correções pontuais

| Arquivo | Justificativa |
| --- | --- |
| [Inicio.jsx](../frontend/src/pages/Inicio/Inicio.jsx) | Recomposição autorizada de VIS-1: dados do contexto, card compacto, conservação e visitação independentes, fallback de imagem e contador real. Nenhum mock reinserido. |
| [FavoritoButton.css](../frontend/src/components/FavoritoButton/FavoritoButton.css) | Recomposição autorizada de VIS-2. Sem alteração de handlers, armazenamento ou navegação. |
| [SituacaoPatrimonio.jsx](../frontend/src/features/patrimonio/SituacaoPatrimonio.jsx) | Componente existente reutilizado; título complementar identifica “Conservação”. Texto do selo continua visível. |
| [SituacaoPatrimonio.css](../frontend/src/features/patrimonio/SituacaoPatrimonio.css) | `border-box` e quebra de palavras limitam a caixa ao contêiner. Removida a redução específica para 10 px no mapa; mantém 11 px do componente comum. Paleta preservada. |
| [VisitacaoPatrimonio.jsx](../frontend/src/components/VisitacaoPatrimonio/VisitacaoPatrimonio.jsx) e [CSS](../frontend/src/components/VisitacaoPatrimonio/VisitacaoPatrimonio.css) | Variante opcional `emLinha` para listas do mapa: sem posicionamento absoluto nem sombra. Título esclarece visitação. Aviso limita a largura ao contêiner e quebra textos extensos; regra de estados, motivo e data preservados. |
| [PlaquetaCard.jsx](../frontend/src/features/mapa/PlaquetaCard.jsx) | Conservação no corpo, abaixo do nome; visitação continua sobre a foto, com espaço reservado ao favorito. |
| [PatrimonioDetalhe.jsx](../frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx) | Substituído o caso isolado de Demolido pelo componente com os quatro estados, abaixo do título e separado das categorias. Aviso de visitação mantido. |
| [Mapa.jsx](../frontend/src/pages/Mapa/Mapa.jsx) | Conservação na lista e no corpo do painel; visitação em linha na lista e selo existente sobre a foto do painel. |
| [MapaPatrimonios.jsx](../frontend/src/features/mapa/MapaPatrimonios.jsx) | Os estados também aparecem nos cards alternativos. A seleção passou a usar botão nativo com `aria-pressed`, operável por teclado; handler e política geográfica preservados. |
| [Mapa.css](../frontend/src/pages/Mapa/Mapa.css) | Limites de largura e foco visível. A inspeção encontrou legenda/painel cobrindo cards do mapa alternativo: somente nesse modo, ambos passam ao fluxo da página. O posicionamento sobre o Google Maps permanece. |
| [Inicio.test.jsx](../frontend/test/Inicio.test.jsx), [PatrimonioDetalhe.test.jsx](../frontend/test/PatrimonioDetalhe.test.jsx), [EstadosVisuais.test.jsx](../frontend/test/EstadosVisuais.test.jsx) | Cobertura da recomposição e das combinações independentes de conservação/visitação nas páginas. |
| [vis_3_visual.mjs](../frontend/test/vis_3_visual.mjs) | Ensaio opt-in no navegador com API sintética local, geometria, contraste, teclado e capturas. Não altera dados da aplicação. |

Nenhuma mudança em backend, banco, Prisma, Docker, autenticação, serviços HTTP, contrato de API, filtros ou regras de negócio. Nenhuma dependência instalada. O CSS global e `InicioHero.css` não foram editados nesta rodada.

## Validação

- **Testes direcionados:** 7 arquivos, **174/174 aprovados**, exit 0, 42,14 s. Incluem `Inicio`, `PlaquetaCard`, `situacaoPatrimonio`, `EstadosVisuais`, `PatrimonioDetalhe`, `MapaPatrimonios` e `visitacaoApi`.
- **Combinações:** quatro estados de conservação × cinco de visitação em cada uma das quatro páginas (80 casos), além dos testes existentes de motivo, previsão, favoritos, seleção, localização histórica e marcadores.
- **Lint e build:** aprovados. Build mantém avisos de chunk principal acima de 500 kB e import estático/dinâmico do editor. Nenhum aviso suprimido.
- **Navegador:** aprovado, exit 0, **26 capturas**. Quatro páginas × 320, 390, 768 e 1440 px; cinco estados de visitação na ficha a 320 px; segunda página do catálogo nas quatro larguras; foco/Enter no mapa alternativo. As 16 medições principais não apontaram overflow horizontal, interseções de selos/controles ou oclusão dos cards pela legenda/painel. Nenhuma exceção JavaScript capturada.
- **Integridade:** `git diff --check` aprovado; índice Git sem alterações. Nenhum arquivo dos escopos protegidos aparece no diff.
- **Contraste textual:** mínimo medido de **7,98:1** nos selos/avisos. Cores computadas compostas sobre os fundos; no aviso transparente da Home, considera-se fundo claro sob a camada escura como caso conservador. Isso não constitui auditoria completa de contraste de toda a interface.

Comandos em `cmd.exe`, a partir de `frontend`, usando o Node 24.22.1 já disponível:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Inicio.test.jsx test/PlaquetaCard.test.jsx test/situacaoPatrimonio.test.jsx test/EstadosVisuais.test.jsx test/PatrimonioDetalhe.test.jsx test/MapaPatrimonios.test.jsx test/visitacaoApi.test.js --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\vis_3_visual.mjs
```

O ensaio inicial aguardava imagens lazy fora da área visível e supunha cinco cards na primeira página. Corrigido o roteiro para antecipar o carregamento das imagens na captura e respeitar a paginação existente de quatro itens, conferindo também a segunda página. As capturas finais aguardam as animações e posicionam o scroll antes da medição. Testes e Chrome foram executados com permissão local fora do sandbox; não houve conexão ao backend.

## Evidências e limitações

| Página | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Home | [Captura](../.cache/vis_3/inicio_320.png) | [Captura](../.cache/vis_3/inicio_390.png) | [Captura](../.cache/vis_3/inicio_768.png) | [Captura](../.cache/vis_3/inicio_1440.png) |
| Patrimônios | [Captura](../.cache/vis_3/patrimonios_320.png) | [Captura](../.cache/vis_3/patrimonios_390.png) | [Captura](../.cache/vis_3/patrimonios_768.png) | [Captura](../.cache/vis_3/patrimonios_1440.png) |
| Detalhe | [Captura](../.cache/vis_3/detalhe_320.png) | [Captura](../.cache/vis_3/detalhe_390.png) | [Captura](../.cache/vis_3/detalhe_768.png) | [Captura](../.cache/vis_3/detalhe_1440.png) |
| Mapa alternativo | [Captura](../.cache/vis_3/mapa_320.png) | [Captura](../.cache/vis_3/mapa_390.png) | [Captura](../.cache/vis_3/mapa_768.png) | [Captura](../.cache/vis_3/mapa_1440.png) |

- [Demolido com visitação não informada na página 2](../.cache/vis_3/patrimonios_pagina_2_320.png); [foco do mapa](../.cache/vis_3/mapa_foco_320.png).
- [Medições](../.cache/vis_3/resultado.json), [log visual](../.cache/vis_3/visual.log), [testes](../.cache/vis_3/testes.log), [lint](../.cache/vis_3/lint.log), [build](../.cache/vis_3/build.log).

As evidências são locais, ignoradas pelo Git. Os registros sintéticos existem somente no servidor de ensaio. O bloqueio dos serviços externos gera mensagens esperadas do loader Google, que tenta carregar o script mesmo sem chave; isso não foi alterado nesta etapa. Não houve teste visual com Google Maps real, leitor de tela, aparelho físico, API real ou banco; não se afirma homologação de produção. O zoom de 200% da rodada anterior não foi repetido nesta etapa.

Pendências: homologação com dados reais e mapa Google; avaliação assistiva transversal; conferência das diferenças UI-F2/UI-F6 fora da recomposição autorizada antes de retomar uma certificação global da branch. A política de não criar selo para Aberto/Não informado foi preservada, e eventual mudança editorial exige decisão própria.
