# VIS-5A — Auditoria de acessibilidade

21/11/2026, America/Sao_Paulo. Auditoria somente leitura. **Nenhuma correção VIS-5B aplicada.**

## Base, referência e método

- Branch `development/backend`; HEAD e referência **local** `origin/development/backend`: `26821512f534f50fef7112c6f936f54328b1193b`. Checkout inicialmente limpo; sem fetch, commit, push ou deploy.
- Consultados [README](../README.md), [README frontend](../frontend/README.md), [UI-F1](../frontend/reports/finalizacao_frontend_ui_f1.md), [VIS-4A](auditoria_visual_vis_4a.md), [VIS-4B.1](correcoes_vis_4b_1.md), [VIS-4B.2](correcoes_vis_4b_2.md), componentes, estilos, rotas e testes existentes para leitura.
- Referência normativa: [WCAG 2.2, W3C](https://www.w3.org/TR/WCAG22/), níveis A e AA. Os documentos Understanding vinculados abaixo são explicações oficiais, não substituem a recomendação normativa. Esta inspeção identifica barreiras reproduzidas; **não certifica conformidade integral**.
- Chromium local, Vite isolado com `configFile:false` e `envDir:false`, sessão e respostas HTTP sintéticas; fontes externas e Google Maps bloqueados. Somente GETs, sem backend, banco, login real, gravação ou envio. Nenhuma dependência instalada.
- Inspeção de 17 telas em 320, 390, 768 e 1440 px, seguida de ensaios de formulários, menus, diálogos, gráficos, filtros e erros. Tab/Shift+Tab, Enter, Escape e setas conforme o controle; estilos computados, geometria e árvore de acessibilidade do Chromium. Roteiros/evidências exclusivamente em `.cache/vis_5a/`.
- A navegação por Tab percorreu os controles das telas carregadas a 390 px; fluxos críticos de abertura/fechamento foram repetidos nas quatro larguras. Isso não cobre todas as combinações possíveis de permissões, dados, estados assíncronos e gravações.

As classificações são de impacto: **alto** prejudica significativamente orientação ou leitura; **médio** dificulta uma tarefa, havendo alternativa; **baixo** é uma inconsistência localizada. Nenhum impedimento crítico sem alternativa foi confirmado. Os problemas abaixo foram encontrados no checkout, não introduzidos pela auditoria.

## Problemas confirmados

### A01 — Idioma principal incorreto — Alto

**Todas as telas.** [index.html](../frontend/index.html) declara `lang="en"`, embora o conteúdo seja português. O valor foi confirmado no DOM em todas as rotas. Pode provocar pronúncia incorreta em tecnologia assistiva. Critério [3.1.1 Idioma da página — A](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html).

Recomendação: declarar `pt-BR` no documento, sem alterar textos, rotas ou autenticação. Evidência: campos `idioma` dos [registros gerais](../.cache/vis_5a/normal/resultado.json) e do [login efetivamente aberto](../.cache/vis_5a/interacoes/resultado.json).

### A02 — Título do documento não identifica a tela — Médio

**Público e administração.** Todas as páginas mantêm `Portal de Patrimônio Cultural`, inclusive Login, Usuários e Histórico. [index.html](../frontend/index.html) contém o título fixo; [App.jsx](../frontend/src/App.jsx) não o atualiza ao navegar. Dificulta distinguir abas e reconhecer a mudança de contexto. Critério [2.4.2 Página com título — A](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html).

Recomendação: título específico por tela, preservando o nome do portal e usando o título disponível nos detalhes. Não incluir dados sensíveis da sessão. Evidência: campo `titulo` dos registros gerais.

### A03 — Contraste insuficiente de textos públicos e do login — Alto

**Home, catálogo, ações públicas e Login.** Branco sobre azul `#3ea3dc`, ou esse azul sobre branco, resulta em **2,81:1**. Confirmado em Buscar (13 px), Somente favoritos (12,5 px), Ver detalhes (12 px) e Entrar (14 px), todos habilitados. São textos pequenos e requerem 4,5:1; negrito nesses tamanhos não os transforma em texto grande. Critério [1.4.3 Contraste mínimo — AA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Arquivos: [global.css](../frontend/src/styles/global.css), [LoginAdmin.jsx](../frontend/src/features/admin/pages/LoginAdmin.jsx) e seus estilos administrativos. O Login está fora de `.admin-shell`; não recebe a correção de botões da VIS-4B.1. Outros candidatos computados incluem textos pequenos verdes/laranjas em Login/Conheça mais; devem entrar na conferência de paleta do mesmo lote, sem alteração indiscriminada de cores.

Recomendação: ajustar somente os pares de cores necessários, preservando dimensões, layout, estados e identidade visual. Revalidar normal/hover/foco e separar disabled. **Não reverter o azul administrativo corrigido nem o desenho do favorito VIS-2.** Evidências: [catálogo com foco, 320](../.cache/vis_5a/foco/catalogo_foco_320.png), [login com validação, 390](../.cache/vis_5a/interacoes/login_validacao_390.png), campos `cores/baixos` dos resultados. As listas automáticas de candidatos não são, por si, uma lista de violações: SVG, transparências, fotos de fundo e exceções exigem avaliação própria.

### A04 — Buscas sem indicador visível de foco — Alto

**Home, Patrimônios, Mapa e busca da Navbar.** O input recebe foco por teclado, mas mantém `outline-style:none`, sem borda ou sombra própria. O contêiner não muda entre antes/depois. Reproduzido nas quatro larguras. O cursor de edição não substitui um indicador de foco distinguível. Critério [2.4.7 Foco visível — AA](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).

Causa: seletores `.searchbar input`, `.mapa-search input` e `.navbar-busca input` em [global.css](../frontend/src/styles/global.css). Recomendação: foco consistente no campo ou `:focus-within` do contêiner, sem deslocar layout ou afetar os botões vizinhos. Evidências: [Home](../.cache/vis_5a/foco/inicio_foco_320.png), [Mapa](../.cache/vis_5a/foco/mapa_foco_320.png), [Navbar](../.cache/vis_5a/foco/navbar_busca_320.png) e objetos `antes/depois` em [medições de foco](../.cache/vis_5a/foco/resultado.json).

### A05 — Índice móvel de notícias anunciado como modal, mas foco permanece fora — Alto

**Conheça mais → detalhes/notícias.** [ConhecaMaisDetalhes.jsx](../frontend/src/pages/ConhecaMaisDetalhes/ConhecaMaisDetalhes.jsx) abre painel com `role="dialog"`, `aria-modal="true"` e bloqueia a rolagem. O foco permanece no acionador externo. Tab passa pelo backdrop, entra no painel e depois alcança links do rodapé com o painel aberto. Reproduzido em 320, 390, 768 px e na viewport de 711 px com zoom nativo de 200%.

Critério relacionado: [2.4.3 Ordem do foco — A](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html). Recomendação: foco inicial dentro do painel, contenção enquanto modal, retorno ao acionador e fechamento por Escape; aproveitar o padrão de diálogo já correto no painel administrativo. Não basta adicionar ARIA. Evidência: [índice aberto, 320](../.cache/vis_5a/interacoes/noticias_indice_320.png), sequência `abertura/passos` nos registros de interações. Não foi contada uma segunda violação automática de 2.4.11: esse critério tem condições e exceções próprias para ocultação do foco.

### A06 — Edição de Exposições/Novidades não encaminha foco ao formulário — Médio

**Administração de conteúdo.** Em [AdminConteudo.jsx](../frontend/src/features/admin/components/AdminConteudo.jsx), Enter no Editar desabilita o acionador durante a consulta. Ao terminar, o formulário abre acima da lista, o foco fica no `body` e o Tab seguinte chega a Arquivar na linha anterior. Reproduzido nas quatro larguras e no zoom. Afeta a orientação de quem usa teclado. Critério relacionado: [2.4.3 — A](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html).

Recomendação: aplicar neste formulário o padrão de pedido/retorno de foco já existente em Usuários, incluindo carregamento, erro, cancelamento e acionador removido. Não refazer Usuários nem mudar permissões. Evidências: [Exposições 320](../.cache/vis_5a/interacoes/exposicoes_edicao_320.png), [Novidades 390](../.cache/vis_5a/interacoes/novidades_edicao_390.png), `abertura/aposTab` nos registros.

### A07 — Informações institucionais de Contato ficam fora da continuação do teclado — Médio

O painel de [Contato.jsx](../frontend/src/pages/Contato/Contato.jsx) aparece antes do FAB na ordem do DOM. Enter abre o diálogo não modal, mas mantém o foco no FAB; o próximo Tab segue para Início no rodapé. Reproduzido nas quatro larguras. A informação recém-aberta é ignorada no percurso para frente. Critério relacionado: [2.4.3 — A](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html).

Recomendação: encaminhar foco ao início/fechamento do painel e devolver ao FAB ao fechar, ou revisar a ordem do disclosure. **Não criar contenção de foco obrigatória em um painel que continua não modal.** Evidência: [Contato 320](../.cache/vis_5a/interacoes/contato_info_320.png) e registros `abertura/aposTab`.

### A08 — Fechamento da busca e navegação SPA perdem referência de foco — Médio

Fechar a busca em [NavBar.jsx](../frontend/src/components/Navbar/NavBar.jsx) remove o botão focado e deixa `document.activeElement` no `body`. Ao seguir o link do card da Home para o catálogo, [App.jsx](../frontend/src/App.jsx) rola a página, mas não encaminha foco ao novo título/conteúdo; o Tab seguinte entra na busca. Reproduzido nas quatro larguras.

Recomendação: retornar à lupa ao fechar e definir uma política de foco/anúncio por navegação, sem capturar foco em alterações de filtros ou digitação. Relação com orientação e [2.4.3](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html); **`body` ativo, isoladamente, não prova descumprimento**. Aqui é uma recomendação de experiência confirmada pelo percurso, a ser combinada com A02. Evidência: `busca_fechada_*` e `navegacao_*` em [interações](../.cache/vis_5a/interacoes/resultado.json).

### A09 — Foco de campos administrativos com contraste insuficiente — Médio

No campo de busca de Usuários, a borda focada é `#3ea3dc`: **2,81:1** contra branco, abaixo de 3:1. A sombra externa a 30% sobre branco é ainda mais clara (**1,34:1**), e o outline é transparente. O foco existe, diferentemente de A04, mas é pouco distinguível. A borda normal `#e2e5ea` mede **1,26:1**; essa medida isolada não transforma toda borda em uma violação, pois depende de ela ser necessária para identificar o controle. Critério [1.4.11 Contraste não textual — AA](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Arquivos: [admin.css](../frontend/src/features/admin/admin.css) e estilos compartilhados de campos. Recomendação: indicador de foco contrastante no escopo administrativo, preservando os botões e a gestão de foco da VIS-4B.1. Evidências: [Usuários com foco](../.cache/vis_5a/foco/usuarios_foco_320.png), pares `antes/depois` nas quatro larguras. Não generalizar a conclusão a todos os campos sem conferir seus estilos específicos de erro/foco.

### A10 — Resultado de filtro do Mapa não é anunciado — Médio

Digitar `zzzinexistente` na busca muda a contagem de cinco para zero e exibe Nenhum patrimônio encontrado, mantendo foco na busca. Não existe região `status`, `alert` ou `aria-live` correspondente. Reproduzido nas quatro larguras em [Mapa.jsx](../frontend/src/pages/Mapa/Mapa.jsx). Critério [4.1.3 Mensagens de status — AA](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

Recomendação: anúncio breve e moderado da contagem/estado vazio, sem ler todos os cards ou mover foco. O catálogo já tem `aria-live="polite"` para seu resumo; não duplicar essa implementação. Evidências: [Mapa sem resultado, 320](../.cache/vis_5a/complemento/mapa_filtro_vazio_320.png) e `antes/depois/anuncios` em [complemento](../.cache/vis_5a/complemento/resultado.json).

### A11 — Números da escala do radar com baixo contraste — Médio

**Dashboard.** Textos 0–3 de `PolarRadiusAxis` usam `fill: rgb(204,204,204)`, 12 px, sobre branco: **1,61:1**. Confirmado nos estilos SVG e nas capturas de viewport, incluindo o complemento de 320 px. Critério [1.4.3 — AA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). As legendas com quantidades existem e não devem ser removidas; isso não torna decorativos os números visíveis da escala.

Arquivo: [GraficosDashboard.jsx](../frontend/src/features/admin/components/GraficosDashboard.jsx). Recomendação: cor explícita para os ticks, conferindo todos os eixos sem redesenhar o Dashboard. Evidência: [radar 390](../.cache/vis_5a/foco/grafico_teclado_1_390.png) e `svgTextos` nas medições de foco. O cálculo usou `fill`, não apenas a propriedade CSS `color`.

### A12 — Superfícies interativas dos gráficos sem nome acessível — Médio

**Dashboard.** Os quatro SVGs focáveis expõem `role="application"` com nome vazio na árvore de acessibilidade. O `aria-label` está no contêiner externo, não no nó que recebe foco. A navegação por setas e os tooltips funcionam, e existem alternativas textuais; a identificação do gráfico ao entrar nele permanece incompleta. Critério [4.1.2 Nome, função, valor — A](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html).

Arquivos: [GraficosDashboard.jsx](../frontend/src/features/admin/components/GraficosDashboard.jsx), [Chart.jsx](../frontend/src/components/ui/Chart.jsx). Recomendação: associar nome/descrição ao nó interativo efetivo, reutilizando os títulos, sem retirar `accessibilityLayer`, legendas ou tabelas. Verificar o resultado em leitor de tela antes do aceite. Evidência: `ax` em [registros de gráficos](../.cache/vis_5a/foco/resultado.json), capturas com foco/seta nas quatro larguras. Não se afirma que todos os gráficos do Feedback têm o mesmo defeito; seus nós precisam de conferência específica no lote.

### A13 — Tabela de Patrimônios administrativos extravasa em 768 px — Médio

Documento medido com **786 px** para viewport de **768 px**, tanto na listagem quanto com editor aberto. A barra lateral e a tabela deixam as ações na borda direita. Não ocorre nas outras três larguras medidas. Arquivos: [AdminPatrimonios.jsx](../frontend/src/features/admin/pages/AdminPatrimonios.jsx), [admin.css](../frontend/src/features/admin/admin.css) e estilos administrativos complementares.

Recomendação: conter a rolagem na tabela ou antecipar a apresentação em cards, mantendo cabeçalhos e acesso às ações por teclado. Evidências: [listagem 768](../.cache/vis_5a/normal/acervo_admin_768.png), [editor 768](../.cache/vis_5a/complemento/acervo_formulario_768.png), `overflow/larguraDocumento` dos respectivos JSONs. Classificado como problema de responsividade; **não se declara automaticamente falha de 1.4.10**, pois a medição a 320 px passou e tabelas possuem exceção de layout bidimensional.

### A14 — Exposição sem imagem gera aviso React e não recebe fallback — Baixo

**Conheça mais.** Com `imagemUrl:''` na resposta sintética, [ConhecaMais.jsx](../frontend/src/pages/ConhecaMais/ConhecaMais.jsx) renderiza `<img src={e.imagem}>` sem normalização. React registra aviso de src vazio; a imagem não carrega. O título permanece no `alt`, portanto **não foi declarada ausência de alternativa textual nem falha automática de 1.1.1**.

Recomendação: tratamento local de URL ausente/falha, reutilizando o fallback neutro existente se apropriado. Não usar fotografia de outro patrimônio e não modificar o mock da Home. Evidências: [Conheça mais 390](../.cache/vis_5a/normal/conheca_390.png), campos `imagens` e [log do navegador](../.cache/vis_5a/normal.log). É pendência de robustez visual, separada das violações WCAG confirmadas.

## Comportamentos existentes preservados e ressalvas

- `heroDestaqueMock` e seu `+25` foram preservados. Destaques da API, pesquisa, favoritos, conservação e visitação não foram modificados. Os selos permanecem textuais e independentes; Demolido continua listado. Não se aplicou opacidade.
- Há landmarks e títulos principais nas telas examinadas. Um salto isolado de nível de título não foi contado automaticamente como violação. Não foi proposta reestruturação geral de HTML sem necessidade.
- Inputs de busca obtêm nomes na árvore acessível pelo placeholder; isso não equivale a ausência total de nome. Labels persistentes seriam mais robustos, mas o problema confirmado prioritário é o foco invisível. A ausência de skip link, sozinha, também não foi contada como falha: landmarks e títulos são mecanismos relevantes de navegação.
- Usuários e Regiões encaminham foco ao campo Nome. O editor de novo Patrimônio também recebe foco e o próximo Tab vai à categoria. Checkbox de Regiões horizontal e botões de 44 px das três telas continuam presentes; não houve reversão da VIS-4B.
- Diálogos de Histórico e Feedback administrativo contêm foco, fecham por Escape e retornam ao acionador nas quatro larguras. A tabela de comparação recebe foco e rola por seta direita: em 320 px, `scrollLeft` passou de 0 a 282 px. Rolagem interna de tabelas não foi confundida com conteúdo perdido.
- Mapa alternativo usa botões com `aria-pressed`; Enter seleciona o patrimônio. O Google Maps real, marcadores do provedor e suas interações não foram ensaiados sem serviço/chave.
- Login vazio foca E-mail, identifica campos inválidos e mostra mensagens associadas. Formulário de Feedback público vazio apresenta orientação de revisão. A leitura de código confirmou autocomplete de autenticação e ausência de bloqueio explícito de colagem nos componentes examinados; não houve teste com gerenciador de senhas nem login real. A [autenticação acessível, 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html), permanece dependente desse ensaio completo.
- Home/cards/galeria de patrimônio usam alternativas e fallback neutro. Miniaturas decorativas podem ter `alt=""`; isso é diferente de uma URL vazia. O problema A14 está no conteúdo de exposições.
- Não se tratou todo alvo inferior a 44 px como infração AA. O [2.5.8 Tamanho mínimo do alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) usa 24 × 24 px e contém exceções de espaçamento, controles nativos e outros casos. Os controles pequenos levantados precisam dessas verificações antes de uma imputação; nenhum defeito adicional de alvo foi confirmado nesta rodada.

## Zoom, reflow e evidências visuais

**Zoom real de página de 200% confirmado**, por preferência de zoom do Chromium em perfil temporário. Não foi usado `zoom` CSS, pinch zoom ou simples `deviceScaleFactor` para simular esse ensaio. Na mesma janela externa de 1440 px, a viewport passou de 1422 px CSS/DPR 1 para **711 px CSS/DPR 2**; `visualViewport.scale` permaneceu 1. Não se acionou o menu da interface do Chrome. Foram percorridas as 17 telas e mais 19 estados de interação nesse modo.

O ensaio a 320 px CSS foi separado, a 100%, além de 390, 768 e 1440 px. Não houve overflow horizontal do documento a 320 px ou no zoom nativo de 200% nos cenários medidos. A exceção de 768 px está em A13. Isso não certifica ausência de truncamento em todo conteúdo real; títulos/resumos limitados e carrosséis continuam exigindo conferência com textos extensos e tecnologia assistiva. Referências: [1.4.4 Redimensionar texto](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) e [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

| Tela | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Home | [Captura](../.cache/vis_5a/normal/inicio_320.png) | [Captura](../.cache/vis_5a/normal/inicio_390.png) | [Captura](../.cache/vis_5a/normal/inicio_768.png) | [Captura](../.cache/vis_5a/normal/inicio_1440.png) |
| Patrimônios | [Captura](../.cache/vis_5a/normal/patrimonios_320.png) | [Captura](../.cache/vis_5a/normal/patrimonios_390.png) | [Captura](../.cache/vis_5a/normal/patrimonios_768.png) | [Captura](../.cache/vis_5a/normal/patrimonios_1440.png) |
| Detalhe | [Captura](../.cache/vis_5a/normal/detalhe_320.png) | [Captura](../.cache/vis_5a/normal/detalhe_390.png) | [Captura](../.cache/vis_5a/normal/detalhe_768.png) | [Captura](../.cache/vis_5a/normal/detalhe_1440.png) |
| Mapa alternativo | [Captura](../.cache/vis_5a/normal/mapa_320.png) | [Captura](../.cache/vis_5a/normal/mapa_390.png) | [Captura](../.cache/vis_5a/normal/mapa_768.png) | [Captura](../.cache/vis_5a/normal/mapa_1440.png) |
| Contato | [Captura](../.cache/vis_5a/normal/contato_320.png) | [Captura](../.cache/vis_5a/normal/contato_390.png) | [Captura](../.cache/vis_5a/normal/contato_768.png) | [Captura](../.cache/vis_5a/normal/contato_1440.png) |
| Login sem sessão | [Captura](../.cache/vis_5a/interacoes/login_320.png) | [Captura](../.cache/vis_5a/interacoes/login_390.png) | [Captura](../.cache/vis_5a/interacoes/login_768.png) | [Captura](../.cache/vis_5a/interacoes/login_1440.png) |
| Regiões | [Captura](../.cache/vis_5a/normal/regioes_320.png) | [Captura](../.cache/vis_5a/normal/regioes_390.png) | [Captura](../.cache/vis_5a/normal/regioes_768.png) | [Captura](../.cache/vis_5a/normal/regioes_1440.png) |
| Usuários | [Captura](../.cache/vis_5a/normal/usuarios_320.png) | [Captura](../.cache/vis_5a/normal/usuarios_390.png) | [Captura](../.cache/vis_5a/normal/usuarios_768.png) | [Captura](../.cache/vis_5a/normal/usuarios_1440.png) |
| Histórico | [Captura](../.cache/vis_5a/normal/historico_320.png) | [Captura](../.cache/vis_5a/normal/historico_390.png) | [Captura](../.cache/vis_5a/normal/historico_768.png) | [Captura](../.cache/vis_5a/normal/historico_1440.png) |
| Dashboard, gráfico em foco | [Captura](../.cache/vis_5a/complemento/grafico_teclado_0_320.png) | [Captura](../.cache/vis_5a/foco/grafico_teclado_0_390.png) | [Captura](../.cache/vis_5a/foco/grafico_teclado_0_768.png) | [Captura](../.cache/vis_5a/foco/grafico_teclado_0_1440.png) |
| Feedback administrativo | [Captura](../.cache/vis_5a/normal/feedback_320.png) | [Captura](../.cache/vis_5a/normal/feedback_390.png) | [Captura](../.cache/vis_5a/normal/feedback_768.png) | [Captura](../.cache/vis_5a/normal/feedback_1440.png) |

Também foram capturados Conheça mais, notícias, Patrimônios administrativos, Exposições, Novidades e Alterar senha nas quatro larguras; constam de `normal/resultado.json` com prefixos `conheca`, `noticias`, `acervo_admin`, `exposicoes`, `novidades`, `senha`.

- Zoom nativo: [Home](../.cache/vis_5a/zoom_real/inicio_zoom_200.png), [catálogo](../.cache/vis_5a/zoom_real/patrimonios_zoom_200.png), [login](../.cache/vis_5a/zoom_real/login_zoom_200.png), [Usuários](../.cache/vis_5a/zoom_real/usuarios_zoom_200.png), [registros das 17 telas](../.cache/vis_5a/zoom_real/resultado.json) e [interações com zoom](../.cache/vis_5a/zoom_interacoes/resultado.json).
- Erros/validação: [login 390](../.cache/vis_5a/interacoes/login_validacao_390.png), [Contato 320](../.cache/vis_5a/interacoes/contato_validacao_320.png), [Feedback administrativo 503](../.cache/vis_5a/interacoes/feedback_erro_320.png).
- Diálogos: [Histórico 320](../.cache/vis_5a/interacoes/historico_dialogo_320.png), [Feedback 390](../.cache/vis_5a/interacoes/feedback_dialogo_390.png).
- [Consolidação de medições](../.cache/vis_5a/consolidacao.json), [percurso geral/teclado](../.cache/vis_5a/normal/resultado.json), [fluxos](../.cache/vis_5a/interacoes/resultado.json), [contraste/foco/árvore acessível dos gráficos](../.cache/vis_5a/foco/resultado.json), [complemento](../.cache/vis_5a/complemento/resultado.json).

### Controles de qualidade das evidências

Foram gerados 254 arquivos PNG nas seis pastas de resultados: 68 gerais, 17 de zoom, 98 de interações, 40 de foco, 19 de interações com zoom e 12 complementares. Esse total **não é contagem de cenários aprovados**.

As quatro capturas iniciais `normal/login_*` mostravam a transição da sessão sintética e foram descartadas como evidência de Login; as válidas são `interacoes/login_*`. A primeira configuração de zoom permaneceu em 100% e foi rejeitada; somente a configuração com DPR 2/viewport reduzida foi aceita. Um recorte CDP inicialmente usava unidades CSS onde eram necessárias unidades de captura e cortava as imagens de zoom; as capturas finais foram refeitas com o recorte corrigido. Nenhum desses artefatos foi atribuído à aplicação.

Gráficos foram recapturados dentro da viewport; o complemento aguardou explicitamente os quatro SVGs em 320 px. Capturas de página inteira que omitiram desenhos por timing não comprovam gráfico ausente. A fixture de “vazio” não zera Dashboard, Feedback ou exposições; imagens desses três casos não comprovam seus estados vazios. Os estados vazios de catálogo, Regiões e Usuários foram produzidos; os demais exigem fixture específica em uma próxima rodada. As mensagens de consultas divergentes do Feedback decorrem das respostas sintéticas, não foram classificadas como defeito novo.

Não houve exceções JavaScript não tratadas nos roteiros que registram esse evento. Há logs esperados de Google Maps bloqueado e erros 503 provocados, além do aviso React de A14. Não se afirma console sem mensagens. O roteiro de interações habilitou o formulário público **somente na configuração isolada de ensaio**, para validar campos vazios, sem POST; não leu nem modificou flags reais do projeto.

## Pendências funcionais preexistentes — fora da VIS-5

A [VIS-4B.2](correcoes_vis_4b_2.md) documenta suíte de 818 testes, 809 aprovados e **nove falhas anteriores**, inclusive repetidas no controle daquela execução:

| Arquivo | Pendência já documentada |
| --- | --- |
| `Inicio.test.jsx` | Três asserções de `+5` divergentes do mock externo com `+25`. |
| `FluxosFrontendF2.test.jsx` | Quatro falhas sobre busca, nomes acessíveis esperados, URL/histórico e paginação públicos. |
| `RoteamentoPublico.test.jsx` | Duas falhas de fallback 404 ausente na árvore de rotas. |

Esses números são **históricos**, não uma nova execução. Não foram atribuídos à VIS-5, não houve mudança de mock nem ajuste de testes para escondê-los. Devem ser reconciliados em escopo funcional próprio antes de afirmar aprovação global da branch. Não foram executados lint, testes unitários ou build nesta auditoria sem edição de código; as verificações de navegador acima foram executadas nesta rodada.

## Proposta de lotes VIS-5B

| Lote | Escopo proposto | Aceite específico |
| --- | --- | --- |
| VIS-5B.1 — idioma e contexto | A01, A02 e A08 | Idioma/título corretos; retorno à lupa; foco após navegação sem interromper filtros; conferir árvore acessível e leitor de tela. |
| VIS-5B.2 — foco de interações | A04, A05, A06 e A07 | Percorrer cada abertura/fechamento só por teclado, incluindo falha de consulta, cancelamento e zoom; preservar diálogos e Usuários já corretos. |
| VIS-5B.3 — contraste | A03, A09 e A11 | Medir pares de texto e foco, normal/hover/erro, nas quatro larguras; preservar dimensões, identidade e exceções disabled. |
| VIS-5B.4 — anúncios e gráficos | A10 e A12 | Anúncio de contagem sem roubar foco; nome do gráfico no nó focável; setas, legendas e tabela preservadas; ensaio assistivo real. |
| VIS-5B.5 — robustez localizada | A13 e A14 | Tabela sem extravasar o documento; ações alcançáveis; exposição sem URL/falha com alternativa neutra; sem avisos src vazio. |

Os lotes são propostas, não autorização para editar nesta execução. As prioridades altas A03–A05 devem receber atenção no início da implementação, ainda que se paralelize o planejamento dos demais lotes. Nenhuma proposta requer mudança de backend, contrato de API ou regra de conservação/visitação.

## Limitações e integridade

- `Narrator.exe` está presente no Windows; NVDA não foi localizado nos dois caminhos padrão verificados. Não foi possível realizar uma sessão assistiva interativa com escuta/validação de fala neste ambiente automatizado. **Nenhum leitor de tela foi homologado.** A árvore de acessibilidade não substitui esse teste. [Verificação de executáveis](../.cache/vis_5a/leitores.json).
- Não houve aparelho físico, API real, Google Maps real, gravação administrativa, envio de Feedback, autenticação completa, gerenciador de senhas ou ensaio de todos os perfis. Modais de edição pública e todos os estados de upload também não foram percorridos. Fontes externas bloqueadas podem mudar quebras e métricas em produção.
- Os casos com conteúdo truncado, carrosséis, mapas reais, gráficos do Feedback, mensagens após sucesso de gravação e estados vazios não reproduzidos precisam de complementação; não receberam aprovação tácita.
- Evidências em `.cache/` são locais e ignoradas pelo Git. O único arquivo de entrega criado é **este relatório**. A [verificação de integridade](../.cache/vis_5a/integridade.json) compara os 943 arquivos rastreados com os hashes iniciais. Nenhum código de produção, teste, mock, backend, banco, Prisma, Docker, autenticação ou configuração foi alterado.

**A auditoria VIS-5A está entregue com os achados e limites acima. Há base para iniciar lotes pequenos da VIS-5B, mas não para declarar o portal conforme WCAG 2.2 AA ou liberar uma homologação global.**
