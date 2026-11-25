# VIS-5B.2A — Foco de pesquisas, índice de notícias e textarea

22/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `26821512f534f50fef7112c6f936f54328b1193b`. Sem fetch, commit, push ou deploy.

## Escopo e estado inicial

Consultados [VIS-5A](auditoria_acessibilidade_vis_5a.md), [VIS-5B.1](correcoes_vis_5b_1.md) e os componentes atuais. Foram tratados **A04 e A05**, mais o ajuste adicional de `textarea` solicitado expressamente. Os demais achados não foram implementados.

O checkout já continha as alterações da VIS-5B.1: cinco fontes rastreados modificados, dois fontes novos, um teste e os dois relatórios não rastreados. Foram preservados. O manifesto inicial contempla **948 arquivos preexistentes**. Foram produzidas **40 capturas anteriores às edições de produção**, nesta execução.

Não foram alterados `Inicio.jsx`, estilos do card, `heroDestaqueMock`/`+25`, favoritos, regras de conservação/visitação, Navbar, hook de orientação, títulos, idioma, autenticação, permissões, serviços HTTP, contratos, backend, banco, Prisma, Docker, manifests ou locks. O editor de patrimônios recebeu somente a remoção de três declarações inline de `resize`; nenhum handler ou regra de negócio mudou.

## Causas e correções

### A04 — Indicador das pesquisas

Os inputs de `.searchbar`, `.mapa-search` e `.navbar-busca` removiam o outline, e seus contêineres não indicavam foco. O catálogo usa `.mapa-search.patrimonios-search`, não `.searchbar`.

Foi adicionada uma regra conjunta `:focus-within` nesses três seletores: contorno de **3 px**, cor navy existente `#2b255c`, com deslocamento interno de **−3 px**. O contorno contrasta com a superfície branca ou clara do próprio campo, inclusive quando a Home tem fotografia de fundo. Não ocupa espaço no layout. Inputs, placeholder, ícones, botões, hover e a lógica de retorno à lupa permanecem intactos.

Referências: [WCAG 2.4.7 — Foco visível](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) e [1.4.11 — Contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). As medições abaixo verificam os indicadores novos; não certificam o contraste de todos os controles do portal.

### A05 — Índice móvel de notícias

O painel era um `aside` com `role="dialog"` e `aria-modal`, porém sem contenção de foco nem isolamento do fundo. O efeito apenas bloqueava a rolagem e escutava Escape. Nas capturas anteriores, Tab alcançava links externos ao painel.

O contêiner passou a ser um **`dialog` nativo aberto com `showModal()`**, seguindo o mecanismo já usado nos diálogos administrativos. O painel lateral, sua largura, cores, animação, conteúdo e controles foram preservados. O CSS apenas neutraliza as dimensões, margens e bordas padrão do elemento nativo.

- Abertura encaminha foco ao botão de fechar. Tab/Shift+Tab circulam entre esse botão e os links do índice, inclusive quando não há notícias.
- O fundo fica inerte pelo mecanismo nativo; o backdrop visual continua clicável, mas não participa da sequência de Tab.
- Escape, botão visual e backdrop fecham o painel. O foco retorna ao acionador conectado, sem provocar scroll adicional.
- Links mantêm suas âncoras e a rolagem existente. Alterações de hash continuam fora da orientação de foco de página da VIS-5B.1.
- Ao passar para desktop, o painel fecha e o foco vai ao link atual do índice fixo, ou ao primeiro link disponível. Ao fechar/desmontar, o diálogo é encerrado, o listener é removido e o valor anterior de `body.style.overflow` é restaurado.
- A navegação pelo histórico com o painel aberto foi ensaiada: a página seguinte fica sem bloqueio de rolagem, preservando a orientação de navegação existente.

Referência de interação: [W3C APG — Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Não foi criado componente compartilhado novo nem alterado diálogo administrativo.

### Ajuste adicional — textarea sem redimensionamento

Havia regras `resize: vertical` no CSS administrativo, no formulário público de Feedback e em Ligações, além de dois estilos inline verticais no editor. O resumo do patrimônio já usava `none` inline.

Foi centralizado `textarea { resize: none; overflow-y: auto; }`, removendo as declarações concorrentes e as redundantes. Mantidos `rows`, alturas mínimas, largura, padding, foco, validações, limites, valores e eventos. Não foram encontrados editores de terceiros entre os consumidores de `textarea`; nenhum editor externo foi modificado.

Foram percorridos **12 campos** por configuração de viewport: comentário de Contato/Feedback; descrição de Regiões; biografia de Exposições; resumo e texto de Novidades; motivo de visitação, descrição, resumo, história, importância cultural, cadastro rápido de região e texto de ligação no editor de Patrimônios. `/feedback` continua redirecionando para Contato; Feedback administrativo apresenta mensagens recebidas, sem textarea de resposta.

**Crescimento automático foi avaliado e não adicionado.** As alturas existentes acomodam a edição inicial, e a rolagem interna permite acessar textos extensos sem expandir formulários de até 20.000 caracteres. O ensaio verificou inserção de texto, Ctrl+Home, Ctrl+End, cursor no último caractere, rolagem interna e saída por Tab. Não houve necessidade de novos handlers para manter o texto acessível.

## Arquivos desta entrega

| Arquivo | Alteração |
| --- | --- |
| [global.css](../frontend/src/styles/global.css) | Indicadores das pesquisas, adequação do contêiner ao diálogo nativo e regra comum dos textarea. Preservada a regra de foco de navegação da VIS-5B.1. |
| [ConhecaMaisDetalhes.jsx](../frontend/src/pages/ConhecaMaisDetalhes/ConhecaMaisDetalhes.jsx) | Abertura modal, foco, contenção, fechamento, retorno e limpeza. |
| [Feedback.module.css](../frontend/src/pages/Feedback/Feedback.module.css) | Removido somente `resize: vertical`. |
| [admin.css](../frontend/src/features/admin/admin.css) | Removido somente o bloco de resize dos textarea. Contraste e alturas administrativas preservados. |
| [AdminLigacoes.css](../frontend/src/features/admin/components/AdminLigacoes.css) | Removida somente a declaração local de resize. |
| [PatrimonioEditor.jsx](../frontend/src/features/admin/components/PatrimonioEditor.jsx) | Removidos três estilos inline de resize; funcionamento intacto. |
| [IndiceNoticias.test.jsx](../frontend/test/IndiceNoticias.test.jsx), novo | Sete regressões de abertura, limites de Tab, cancelamento nativo, botão, backdrop, âncora, índice vazio, mudança para desktop e desmontagem. |
| [vis_5b_2a_visual.mjs](../frontend/test/vis_5b_2a_visual.mjs), novo | Regressão opt-in em Chromium real para CSS, geometria, contraste, teclado, fundo inerte e textarea. Usa o helper existente, sem dependências novas. |
| Este relatório | Evidências e limites. |

São **seis fontes preexistentes alterados, dois testes novos e este relatório**. Nenhum teste existente foi editado. A [comparação de hashes](../.cache/vis_5b_2a/integridade.json) confirma o escopo; índice Git sem alterações.

## Validação e medições

| Verificação | Resultado |
| --- | --- |
| ESLint frontend | Aprovado, exit 0. |
| Suíte direcionada final | **206/206 testes**, nove arquivos, exit 0; 103,14 s. |
| Build de produção | Aprovado, exit 0; 1.474 módulos, 4,94 s. |
| Navegador, quatro larguras | 63 registros e **83 capturas finais** em 320, 390, 768 e 1440 px; roteiro persistente concluído, exit 0. |
| Zoom nativo 200% | 16 registros e **21 capturas**; viewport 711 px CSS, DPR 2, `visualViewport.scale=1`, janela externa de 1440 px. Exit 0. |
| Complemento | **16 capturas**: erro/retorno de Usuários nas quatro larguras, mudança mobile/desktop, histórico com modal aberto e índice com 30 notícias em 320/390/768. Exit 0. |
| Integridade | `git diff --check` aprovado; somente os seis fontes autorizados diferem do manifesto inicial. |

Os nove arquivos da suíte final são `IndiceNoticias`, `ConhecaMais`, `OrientacaoPagina`, `AdminUsuariosFoco`, `Feedback`, `AdminPatrimonios`, `AdminLigacoes`, `OrganizacaoEditorial` e `OrganizacaoEditorialRegiao`. Incluem os 29 testes de orientação da VIS-5B.1. Não foi executada a suíte completa.

| Medição | Antes | Depois |
| --- | --- | --- |
| Foco da Home, catálogo e Mapa | Contêiner sem contorno | Navy sobre branco: **13,80:1**, 3 px. |
| Foco da Navbar expandida | Contêiner sem contorno | Navy sobre `#f7f8fa`: **12,99:1**, 3 px. |
| Dimensões com/sem foco | Layout original | Mesmas larguras/alturas; tolerância de 0,1 px para arredondamento das medições. |
| Fechar busca | Retorno à lupa já implementado | Preservado nas quatro larguras e no zoom. |
| Abrir índice móvel | Foco fora do painel | Foco no fechamento; `dialog:modal` ativo. |
| Tab no índice aberto | Alcançava o fundo | Permanece no painel; tentativa de focar a Navbar externa é recusada pelo navegador. |
| Textarea | Predominantemente `vertical`; resumo já `none` | Todos os campos ensaiados com `resize:none` e `overflow-y:auto`. |
| Alturas internas a 100% | Contato 213 px; Regiões 97 px; biografia/texto 90 px; editor entre 72 e 126 px | Preservadas nas quatro larguras. Cadastro rápido adicional: 72 px. |
| Textos longos | Rolagem existente | **60 verificações de teclado**: 12 campos × quatro larguras e zoom, com texto preservado e último caractere alcançável. |

Contraste calculado a partir das cores computadas, sem arredondar antes da comparação. O menor resultado foi **12,9853:1**, acima de 3:1. A regra não altera a paleta dos botões que pertence ao futuro lote de contraste.

O zoom foi configurado no perfil temporário do Chromium; não se usou CSS `zoom` nem apenas `deviceScaleFactor` para simulá-lo. A inspeção das capturas confirmou composição preservada, índice dentro da viewport e última linha dos textos acessível por rolagem. O índice longo rola internamente, mantém visível o link focado e retorna ao botão de fechar por Tab.

Não houve overflow horizontal nas pesquisas, notícias ou no zoom ensaiado. **Permanece o overflow preexistente A13 no editor/listagem administrativa de Patrimônios em 768 px**, medido antes e depois; não foi corrigido neste escopo. Não se afirma ausência de sobreposição em toda a interface: o FAB de informações de Contato pode ocupar o canto do campo em determinada posição de scroll/zoom, embora o fim do texto ensaiado permaneça visível. Esse controle não foi redesenhado, e A07 continua pendente.

### Intermitência e ajustes dos roteiros

A primeira suíte passou **68/68**. Na rodada ampliada seguinte houve **100/101**, com a mesma asserção intermitente já registrada na VIS-5B.1: `AdminUsuariosFoco`, abertura do modal de erro, esperava “Fechar” e encontrou “Editar”. O teste e o componente de Usuários não foram alterados. A reexecução isolada passou **4/4**; a suíte final passou **206/206**. O complemento de navegador confirmou entrada no alerta e retorno a Editar nas quatro larguras. A causa da intermitência permanece não determinada, sem atribuição às nove falhas públicas históricas. Logs: [ocorrência](../.cache/vis_5b_2a/testes_finais.log), [isolado](../.cache/vis_5b_2a/usuarios_rechecagem.log), [final](../.cache/vis_5b_2a/suite_final.log).

Durante a preparação dos roteiros, foram corrigidos seletores do catálogo/botões de edição, escapes de JavaScript e asserções de geometria. Uma comparação estrita detectava diferença de 0,00003 px; a conferência passou a usar tolerância subpixel. Ctrl+End não necessariamente rola o padding inferior completo, especialmente no zoom: o teste verifica texto integral, cursor no fim, avanço da rolagem e posição compatível com a última linha, acompanhado de captura. Nenhuma regra de produção foi alterada para satisfazer esses ajustes de ensaio.

## Capturas antes/depois

| Cenário | Antes | Depois |
| --- | --- | --- |
| Home 320 px | [Captura](../.cache/vis_5b_2a/antes/inicio_foco_320.png) | [Captura](../.cache/vis_5b_2a/depois/inicio_foco_320.png) |
| Catálogo 390 px | [Captura](../.cache/vis_5b_2a/antes/catalogo_foco_390.png) | [Captura](../.cache/vis_5b_2a/depois/catalogo_foco_390.png) |
| Mapa 768 px | [Captura](../.cache/vis_5b_2a/antes/mapa_foco_768.png) | [Captura](../.cache/vis_5b_2a/depois/mapa_foco_768.png) |
| Navbar 1440 px | [Captura](../.cache/vis_5b_2a/antes/navbar_foco_1440.png) | [Captura](../.cache/vis_5b_2a/depois/navbar_foco_1440.png) |
| Índice 320 px | [Captura](../.cache/vis_5b_2a/antes/noticias_modal_320.png) | [Captura](../.cache/vis_5b_2a/depois/noticias_modal_320.png) |
| Índice 390 px | [Captura](../.cache/vis_5b_2a/antes/noticias_modal_390.png) | [Captura](../.cache/vis_5b_2a/depois/noticias_modal_390.png) |
| Índice 768 px | [Captura](../.cache/vis_5b_2a/antes/noticias_modal_768.png) | [Captura](../.cache/vis_5b_2a/depois/noticias_modal_768.png) |
| Índice fixo 1440 px | [Captura](../.cache/vis_5b_2a/antes/noticias_desktop_1440.png) | [Captura](../.cache/vis_5b_2a/depois/noticias_desktop_1440.png) |
| Contato/Feedback 320 px | [Captura](../.cache/vis_5b_2a/antes/contato_textarea_320.png) | [Captura](../.cache/vis_5b_2a/depois/contato_textarea_320.png) |
| Regiões 390 px | [Captura](../.cache/vis_5b_2a/antes/regioes_textarea_390.png) | [Captura](../.cache/vis_5b_2a/depois/regioes_textarea_390.png) |

- Zoom: [busca](../.cache/vis_5b_2a/zoom_real/inicio_foco_1440.png), [índice](../.cache/vis_5b_2a/zoom_real/noticias_modal_1440.png), [fim do comentário](../.cache/vis_5b_2a/zoom_real/contato_fim_texto_1440.png), [editor](../.cache/vis_5b_2a/zoom_real/patrimonios_texto_teclado_1440.png).
- Modal: [último link do índice longo, 320](../.cache/vis_5b_2a/complemento/indice_longo_320.png), [retorno ao início](../.cache/vis_5b_2a/complemento/indice_longo_inicio_320.png), [índice desktop após resize](../.cache/vis_5b_2a/complemento/desktop_restaurado.png), [limpeza pelo histórico](../.cache/vis_5b_2a/complemento/historico_limpeza.png).
- Textos: [Novidades 390](../.cache/vis_5b_2a/depois/novidades_fim_texto_390.png), [Exposições 768](../.cache/vis_5b_2a/depois/exposicoes_fim_texto_768.png), [Patrimônios 1440](../.cache/vis_5b_2a/depois/patrimonios_fim_texto_1440.png).
- [Consolidação](../.cache/vis_5b_2a/consolidacao.json), [antes](../.cache/vis_5b_2a/antes/resultado.json), [depois](../.cache/vis_5b_2a/depois/resultado.json), [zoom](../.cache/vis_5b_2a/zoom_real/resultado.json), [complemento](../.cache/vis_5b_2a/complemento/resultado.json).
- [Lint](../.cache/vis_5b_2a/lint.log), [testes finais](../.cache/vis_5b_2a/suite_final.log), [build](../.cache/vis_5b_2a/build.log), [visual final](../.cache/vis_5b_2a/visual_final.log), [zoom final](../.cache/vis_5b_2a/zoom_final.log).

São **120 capturas finais**, além das 40 anteriores. Arquivos de evidência estão em `.cache/`, ignorados pelo Git. A quantidade de imagens não constitui certificação de acessibilidade.

Comandos a partir de `frontend`, em `cmd.exe`, usando Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/IndiceNoticias.test.jsx test/ConhecaMais.test.jsx test/OrientacaoPagina.test.jsx test/AdminUsuariosFoco.test.jsx test/Feedback.test.jsx test/AdminPatrimonios.test.jsx test/AdminLigacoes.test.jsx test/OrganizacaoEditorial.test.jsx test/OrganizacaoEditorialRegiao.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\vis_5b_2a_visual.mjs
set VIS_ZOOM=2&& ..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_2a\visual.mjs
```

O último comando utiliza o helper temporário de zoom nativo; o teste persistente cobre as quatro larguras a 100%. O complemento está em `.cache/vis_5b_2a/complemento.mjs`.

## Pendências e limites

**A04, A05 e a padronização dos textarea foram implementados e validados no ambiente descrito.** Não foi identificada regressão de produção atribuível a essas mudanças nos cenários concluídos. Permanecem os demais achados, incluindo A06/A07, o overflow A13 e a exposição sem imagem A14. As nove falhas públicas históricas continuam separadas: três expectativas de `+5` contra `+25`, quatro de fluxos públicos e duas de 404; seus arquivos não foram executados ou alterados nesta rodada.

Build mantém avisos de chunk acima de 500 kB (principal **742,63 kB**, **210,83 kB gzip**), import estático/dinâmico de `PatrimonioEditor` e tempo dos plugins. Não foram suprimidos.

Os ensaios usaram Chromium/Vite local, `configFile:false`, `envDir:false`, sessão e respostas sintéticas. Só houve GETs; campos foram preenchidos sem envio. Feedback público foi habilitado **apenas na configuração isolada de ensaio** para alcançar seu textarea, sem alterar flags reais. Fontes externas e Maps foram bloqueados. Não houve conexão a backend/banco, gravação, envio, login real ou instalação de dependências.

Os logs incluem mensagens esperadas de Maps bloqueado, HTTP 503 provocados, aviso de chaves de lista no editor sob a fixture (já presente antes) e o aviso A14 no complemento que atravessa Conheça mais. Não houve exceções JavaScript não tratadas nos roteiros finais. Não se afirma console livre de avisos.

Não houve sessão interativa com leitor de tela, aparelho físico, Google Maps real ou API real. A validação não certifica conformidade integral WCAG nem aprovação global da branch. Nenhum commit, push ou deploy foi realizado.
