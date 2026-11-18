# Home branca e preparação da VIS-4

Concluído em 18/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `67769378a6a33c2e86a2b74f986a2b1eb637dd58`. Sem fetch, commit, push ou deploy. Alterações locais anteriores preservadas.

## 1. Correção da Home e arquivos modificados nesta execução

**O card voltou a ser branco, arredondado e alinhado à direita do banner no desktop.** A referência aprovada foi aberta no caminho informado pelo usuário: `C:/Users/USER/Downloads/WhatsApp Image 2026-11-17 at 22.32.25.jpeg`. [Cópia local da referência](../.cache/home_branca/referencia_aprovada.jpeg).

A inspeção de `Inicio.jsx`, `InicioHero.css` e `global.css` confirmou que o CSS local da VIS-1 substituía a grade original por uma coluna, com card escuro à esquerda. A correção remove somente esses overrides e recupera a composição original em duas colunas. Não houve restauração de componentes antigos.

| Arquivo | Alteração desta execução |
| --- | --- |
| [InicioHero.css](../frontend/src/pages/Inicio/InicioHero.css) | Único arquivo de produção modificado. Card branco, largura máxima de 320 px, padding de 16 px, sombra discreta e alinhamento à direita. Miniaturas de 46 px, bordas arredondadas existentes e cores de texto adequadas ao fundo claro. Mantidos limites de texto, foco visível e alvo de 44 px do link. |
| [regressoes_visuais.mjs](../frontend/test/regressoes_visuais.mjs) | Atualiza o ensaio existente para exigir fundo branco e alinhamento à direita; preserva verificações de favoritos e interação. Capturas isoladas em `.cache/home_branca/`. |
| [vis_4_auditoria.mjs](../frontend/test/vis_4_auditoria.mjs) | Novo ensaio opt-in de auditoria administrativa somente leitura, com fixtures locais, capturas e medições. Não integra automaticamente a suíte Vitest. |
| Este relatório | Resultados, evidências e pendências. |

`Inicio.jsx` e `global.css` foram inspecionados, mas não editados nesta execução. Imagem do banner, textos, pesquisa, sugestões, navegação, dados dinâmicos, miniaturas distintas e contador verdadeiro `+N` permanecem. Conservação e visitação continuam independentes e visíveis; nenhum estado recebe opacidade automática.

Até 880 px, a grade existente coloca o card abaixo do texto, alinhado à direita e limitado à largura disponível. Foi conservada a folga inferior para impedir sobreposição com a faixa de recursos. A 320 px, o card ocupa os 278 px úteis do contêiner; nas demais larguras medidas, mantém 320 px. Textos extensos aumentam a altura com limites visuais, sem sair do banner.

A comparação visual confirma fundo, posição, proporções e miniaturas semelhantes à referência. Não é reprodução pixel a pixel: dados do ensaio e selos VIS-3 acrescentam conteúdo e altura; o conteúdo da captura antiga não foi fixado no componente.

## 2. Validação

| Verificação | Resultado |
| --- | --- |
| Lint frontend, incluindo os roteiros finais | Aprovado, exit 0. |
| Vitest pertinente | **5 arquivos, 105/105 testes aprovados**, 39,50 s. `Inicio`, `PlaquetaCard`, `situacaoPatrimonio`, `EstadosVisuais`, `ImagemPatrimonio`. |
| Build de produção | Aprovado, exit 0, 1.469 módulos, 3,88 s. |
| Home e catálogo no Chromium | 14 cenários, 18 capturas: 320, 390, 768 e 1440 px, textos extensos e reflow equivalente a 200%. Sem overflow horizontal ou exceções JavaScript. |
| Preservação VIS-2 | Alvo de 44 × 44 px, círculo de 30 px e coração de 14 px confirmados. Teclado, hover, estado ativo e clique na área transparente preservam a URL. |
| Auditoria administrativa | 44 capturas nas quatro larguras; reexecuções direcionadas de Dashboard e Feedback atualizam suas evidências. Somente GET para o servidor de fixtures; nenhuma gravação. |
| Integridade | `git diff --check` aprovado. Hashes iniciais de `frontend/src` apontam somente `InicioHero.css` alterado nesta execução. Diff vazio nos escopos protegidos conferidos; índice não modificado. |

Comandos executados em `cmd.exe`, a partir de `frontend`, com Node 24.22.1 já disponível:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Inicio.test.jsx test/PlaquetaCard.test.jsx test/situacaoPatrimonio.test.jsx test/EstadosVisuais.test.jsx test/ImagemPatrimonio.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe test\regressoes_visuais.mjs
..\.cache\d4_final\node24\node.exe test\vis_4_auditoria.mjs
..\.cache\d4_final\node24\node.exe test\vis_4_auditoria.mjs --graficos
..\.cache\d4_final\node24\node.exe test\vis_4_auditoria.mjs --feedback
```

Os avisos conhecidos de chunk principal de 737,33 kB (208,90 kB gzip), import estático/dinâmico do editor e tempo de plugins continuam no build. Nenhum foi suprimido.

## 3. VIS-4: auditoria somente leitura

Comparação com o relatório UI-F1 e os componentes atuais. Nenhuma correção administrativa foi aplicada.

| Área | Problema ainda observado / decisão para a VIS-4 |
| --- | --- |
| Regiões | Checkbox “Região ativa” fica acima do rótulo, centralizado. `.admin-form label` define `flex-direction: column`; `.admin-regioes-check` muda para flex sem redefinir essa direção. Ajuste local de alinhamento é indicado. |
| Regiões — controles | Campo de busca com 44 px e botão com 40 px. A especificidade de `.admin-shell :is(.btn-solid,.btn-outline)` prevalece sobre o mínimo local. Padronização pontual recomendada; bordas arredondadas, busca, foco e adaptação mobile já existem e não precisam ser refeitos. |
| Usuários | Botões ativos azuis com texto branco, como “Novo usuário” e “Salvar alterações”, apresentam contraste calculado de aproximadamente **2,81:1**. Revisar cores locais preservando estados e ações. Formulários já possuem bordas e grade responsiva; tabela tem rolagem local, sem transbordamento da página. |
| Usuários — edição | Ao abrir o formulário inline pelo botão Editar, o foco permanece no botão da tabela, abaixo do formulário. Recomenda-se avaliar transferência de foco e anúncio do contexto. A tela utiliza formulário inline e confirmação nativa; não há motivo para criar um modal novo apenas por padronização. |
| Histórico | Nenhuma regressão visual confirmada nos cenários examinados. Ações traduzidas, responsável, alvo, data e diferenças já estão implementados. Modal recebe foco e permite Escape. A rolagem local da tabela é intencional. Nome do alvo depende do payload disponível; não deve ser inventado nem exigir mudança de contrato nesta etapa. |
| Contato | O painel de informações abre com `role=dialog`, mas o foco continua no botão flutuante, posterior ao painel no DOM. Revisar foco ao abrir e o percurso de teclado. Integração do formulário Feedback permanece existente e preservada. |
| Feedback administrativo | Lista, resumo, filtros e modal já existem. Nenhum novo defeito de layout confirmado nos cenários finais; não refazer a integração UI-F1. O ensaio não enviou feedback. |
| Dashboard — contraste | Item ativo “Dashboard” no menu usa branco sobre azul, também aproximadamente **2,81:1**. Avaliar ajuste de contraste preservando a identidade. |
| Dashboard — gráficos | Os quatro gráficos ficaram visualmente vazios nas capturas, apesar dos SVGs e caminhos presentes no DOM, com dimensões válidas. Ocorrência reproduzida nas quatro larguras após rolar até cada gráfico e aguardar. Legendas, contagens e tabela continuam visíveis; não houve overflow medido. **Investigar a renderização na VIS-4**, confrontando o navegador usual e o build: causa e ocorrência em produção ainda não determinadas. Não se afirma ausência de dados da API. |

Priorizar contraste, foco e investigação dos gráficos; depois ajustar o alinhamento de Regiões. Não foram classificados como pendências recursos já entregues pela UI-F1.

## 4. Evidências

| Home | Captura final |
| --- | --- |
| 320 px | [Imagem](../.cache/home_branca/depois/inicio_320.png) |
| 390 px | [Imagem](../.cache/home_branca/depois/inicio_390.png) |
| 768 px | [Imagem](../.cache/home_branca/depois/inicio_768.png) |
| 1440 px | [Imagem](../.cache/home_branca/depois/inicio_1440.png) |

- [Textos extensos, 320 px](../.cache/home_branca/depois/inicio_320_textos_longos.png), [reflow 200%](../.cache/home_branca/depois/inicio_1440_zoom_200.png).
- [Regiões — checkbox e campos](../.cache/vis_4_auditoria/regioes_formulario_320.png), [Usuários — formulário](../.cache/vis_4_auditoria/usuarios_formulario_320.png).
- [Histórico — detalhe](../.cache/vis_4_auditoria/historico_modal_320.png), [Contato — informações](../.cache/vis_4_auditoria/contato_info_320.png), [Feedback — detalhe](../.cache/vis_4_auditoria/feedback_modal_390.png).
- [Dashboard 320 px](../.cache/vis_4_auditoria/dashboard_320.png), [Dashboard 1440 px](../.cache/vis_4_auditoria/dashboard_1440.png).
- [Medições Home/VIS-2](../.cache/home_branca/depois/resultado.json), [auditoria](../.cache/vis_4_auditoria/resultado.json), [revisão dos gráficos](../.cache/vis_4_auditoria/graficos.json), [revisão de Feedback](../.cache/vis_4_auditoria/feedback.json).
- [Lint](../.cache/home_branca/lint.log), [testes](../.cache/home_branca/testes.log), [build](../.cache/home_branca/build.log), [integridade dos fontes](../.cache/home_branca/integridade.json).

## 5. Limitações e possíveis regressões

Capturas e logs são locais e ignorados pelo Git. Os ensaios usam dados sintéticos exclusivamente no servidor local, sessão administrativa fictícia em perfil temporário e bloqueio de serviços externos. Feedback é habilitado somente no servidor do ensaio; nenhuma flag da aplicação foi alterada. Não houve acesso a backend, banco, autenticação real ou envio de mensagens. Não foram instaladas dependências.

A primeira fixture do detalhe de Feedback omitia `expiraEm` e `avisoVersao`, sendo corretamente rejeitada pelo validador existente. O roteiro foi corrigido e a captura repetida com o comentário presente; isso não representa falha da integração. As capturas finais de gráficos foram repetidas após espera e rolagem, mas a ausência visual persistiu e permanece para investigação.

O ensaio do catálogo também registrou aviso React por `src` vazio em imagem ausente. O componente já existente `PlaquetaCard` ainda possui tratamento de imagem diferente da Home; não foi alterado nesta rodada. A recomposição parcial UI-F2/UI-F6 documentada anteriormente continua exigindo revisão própria; esta entrega não certifica globalmente a branch.

Não foram detectadas regressões nos cenários dirigidos da Home e dos favoritos. Não houve suíte completa, leitor de tela, aparelho físico ou homologação com API real. O reflow de 200% usa viewport CSS de 720 px e escala 2, não o comando de zoom da interface do navegador. A VIS-4 está preparada com achados e evidências, sem implementação administrativa nesta execução.
