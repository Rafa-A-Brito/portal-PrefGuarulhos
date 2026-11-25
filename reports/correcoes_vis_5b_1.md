# VIS-5B.1 — Idioma, títulos e orientação de foco

22/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `26821512f534f50fef7112c6f936f54328b1193b`. Sem fetch, commit, push ou deploy.

## Escopo e confirmação

Corrigidos exclusivamente **A01, A02 e A08** da [auditoria VIS-5A](auditoria_acessibilidade_vis_5a.md). Antes das edições, o único item no status era o relatório VIS-5A não rastreado; foi preservado integralmente. Confirmados no código: `lang="en"`, título fixo no HTML, navegação com apenas `scrollTo` e fechamento da busca sem retorno de foco.

Não foram alterados Home, `heroDestaqueMock`/`+25`, favoritos, apresentação de conservação/visitação, formulários administrativos, autenticação, permissões, serviços HTTP, contratos, backend, banco, Prisma, Docker, manifests ou locks. As rotas permanecem as mesmas; não foi criada página 404 nem recomposta a sincronização de filtros/URL pendente.

## Arquivos modificados

| Arquivo | Alteração e justificativa |
| --- | --- |
| [index.html](../frontend/index.html) | Idioma `pt-BR`; título inicial com o nome completo do portal, também antes da montagem do React. |
| [tituloPagina.js](../frontend/src/utils/tituloPagina.js), novo | Mapeamento explícito de títulos das rotas e sufixo comum. Não usa query, identificadores desconhecidos nem dados da sessão. |
| [useOrientacaoPagina.js](../frontend/src/hooks/useOrientacaoPagina.js), novo | Atualiza título por caminho e orienta foco após troca de página. Aguarda a transição administrativa existente; respeita âncoras, formulários e diálogos. |
| [App.jsx](../frontend/src/App.jsx) | Integra o hook com o estado de carregamento já existente. Nenhuma alteração da árvore de rotas ou da decisão de autenticação. |
| [NavBar.jsx](../frontend/src/components/Navbar/NavBar.jsx) | Guarda o pedido de retorno de foco e o aplica à lupa quando o botão é remontado após fechar/submeter a busca. |
| [PatrimonioDetalhe.jsx](../frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx) | Atualiza exclusivamente `document.title` conforme carregamento, nome real recebido, erro ou patrimônio ausente. |
| [global.css](../frontend/src/styles/global.css) | Uma regra restrita a `[data-foco-pagina]:focus-visible`, para mostrar o destino de navegação com contorno de 2 px na cor do texto. Não altera layout, buscas, botões ou seus estilos anteriores. |
| [OrientacaoPagina.test.jsx](../frontend/test/OrientacaoPagina.test.jsx), novo | 29 regressões de idioma, títulos, foco, histórico, query/âncora, carregamento e prioridade de foco local. |
| Este relatório | Evidências, resultados e limites. |

São sete fontes de produção (cinco preexistentes e dois novos), um teste novo e este relatório. Nenhum teste existente foi editado.

## Comportamento implementado

**Idioma e títulos.** As telas usam títulos como `Patrimônios | Portal do Patrimônio Cultural de Guarulhos` e `Usuários | Portal do Patrimônio Cultural de Guarulhos`. O detalhe passa de `Carregando patrimônio` para o nome real da ficha; erro e ausência possuem títulos próprios, sem expor a mensagem técnica da API. Conheça mais/detalhes é uma coleção de notícias e eventos, portanto recebe esse título de coleção, sem escolher arbitrariamente a primeira notícia. Rotas desconhecidas conservam somente o nome do portal; seu comportamento existente não foi alterado.

A transição do painel usa `Carregando Dashboard` e depois `Dashboard`, sem nome de usuário, e-mail ou token. Atualizações de dados dentro de uma página não mudam genericamente seu título para carregamento. A rota `/feedback` continua redirecionando para `/contato`; o título final é Contato.

**Foco.** Após mudança efetiva de `pathname`, o destino é o H1 do conteúdo; se ainda não existe H1, usa-se o `main`. O elemento recebe `tabindex="-1"` temporário e contorno visível; ao perder foco, os atributos adicionados são removidos. Não é criada uma nova parada na sequência de Tab. O scroll já existente foi mantido, e o foco usa `preventScroll`.

A primeira carga conserva o foco nativo. Digitação, resultados, query e hash não provocam foco no título. Links de âncora continuam sob a gestão da própria página. Voltar/avançar para outro caminho orienta ao novo conteúdo. Durante a transição administrativa, o pedido é mantido até haver conteúdo. Autofoco de campos/botões dentro do conteúdo e diálogos abertos têm prioridade; o hook não reabre nem altera esses componentes.

Fechar a busca retorna à lupa disponível. Submeter uma busca na mesma página também retorna à lupa após desmontar o campo; isso é retorno decorrente do fechamento explícito, não captura durante digitação ou filtragem. Quando a submissão leva a outra página, a orientação ao novo conteúdo prevalece.

## Validação

| Verificação | Resultado desta execução |
| --- | --- |
| ESLint frontend | Aprovado, exit 0. |
| Suíte direcionada final | **153/153 testes**, seis arquivos, exit 0; 68,50 s. |
| Build | Aprovado, exit 0; 1.474 módulos, 2,64 s. |
| Navegador, quatro larguras | **112 capturas/cenários**: 18 caminhos e dez fluxos em 320, 390, 768 e 1440 px; roteiro concluído, exit 0. |
| Zoom nativo 200% | **28 capturas/cenários**, mesmos caminhos e fluxos; roteiro concluído, exit 0. |
| Complemento | **9 capturas**: erro/retorno de foco em Usuários nas quatro larguras e âncora real de notícias no desktop; exit 0. |
| Integridade | `git diff --check` aprovado, índice vazio; [comparação de hashes](../.cache/vis_5b_1/integridade.json) confirma o escopo. |

Os seis arquivos testados são `OrientacaoPagina`, `NavegacaoAdmin`, `PatrimonioDetalhe`, `AdminUsuariosFoco`, `AdminAuditoria` e `AdminFeedback`. A cobertura existente de sessão/permissões, conservação/visitação e diálogos permaneceu nesses testes. Não houve execução da suíte completa.

| Medição / fluxo | Auditoria anterior | Depois, nesta rodada |
| --- | --- | --- |
| Idioma do DOM | `en` | **`pt-BR`** em todos os caminhos ensaiados, inclusive administrativos e Login sem sessão. |
| Título do documento | Fixo | Título descritivo e sufixo do portal; nome real no detalhe. |
| Fechar busca | Foco no `body` | Lupa focada, contorno visível de 2 px, nas quatro larguras e no zoom. |
| Home → catálogo, voltar e avançar | Sem destino de foco da rota | H1 correspondente focado, `tabIndex=-1`, contorno visível de 2 px. |
| Próximo Tab após H1 | — | Entra na busca do catálogo; atributo temporário do H1 é removido ao sair. |
| Digitação e busca na mesma página | Não deveriam orientar ao H1 | Foco permanece no campo durante digitação; retorno à lupa apenas ao fechar/submeter a busca expandida. |
| Formulário de Usuários | Foco local já corrigido | Campo inicial preservado. |
| Histórico administrativo | Diálogo já corrigido | Tab contido e Escape com retorno ao acionador preservados. |
| Erro ao abrir edição de Usuários | Modal existente | Foco entra no alerta; Escape retorna a Editar nas quatro larguras. |
| Dashboard após transição | Sem orientação da rota | H1 recebe foco quando a transição termina. |

As medições “antes” são as da VIS-5A, cuja referência Git era o mesmo HEAD; não são novas capturas anteriores às edições desta rodada. Há **149 PNGs finais** nesta entrega, sem contá-los como certificação de acessibilidade de toda a página.

O zoom foi configurado no Chromium em perfil temporário, sem CSS `zoom` ou simples emulação de escala: janela externa de 1440 px, viewport **711 px CSS**, DPR **2**, `visualViewport.scale=1`. Nas quatro larguras sem zoom, DPR 1. Capturas e estilos computados foram inspecionados; o foco novo não desloca a composição aprovada.

### Ocorrências durante a validação

Na preparação do teste novo, foram corrigidos o caminho de leitura do HTML, a montagem de páginas distintas no cenário de histórico, uma rota ausente no harness e uma atribuição durante render sinalizada pelo lint. Eram problemas do teste novo; não houve alteração de comportamento de produção para contorná-los.

A primeira suíte conjunta teve **152/153 aprovados**, com falha em uma asserção de foco de `AdminUsuariosFoco`, arquivo existente e intacto. A reexecução isolada passou **4/4** e a rodada conjunta final passou **153/153**, sem alterar esse teste ou o formulário. O navegador também confirmou o modal de erro e o retorno nas quatro larguras. A causa da ocorrência isolada não foi determinada; foi registrada como ponto de observação, não incorporada às nove falhas públicas históricas nem ocultada. [Primeira rodada](../.cache/vis_5b_1/testes.log), [rechecagem isolada](../.cache/vis_5b_1/usuarios_rechecagem.log), [rodada final](../.cache/vis_5b_1/testes_finais.log).

O complemento visual inicialmente procurou uma âncora com `href` somente fragmento; React Router renderiza o caminho junto ao fragmento. O seletor do roteiro temporário foi corrigido e a rodada completa passou, sem edição da página de notícias.

## Capturas e registros

| Fluxo | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Retorno à lupa | [Captura](../.cache/vis_5b_1/normal/busca_retorno_320.png) | [Captura](../.cache/vis_5b_1/normal/busca_retorno_390.png) | [Captura](../.cache/vis_5b_1/normal/busca_retorno_768.png) | [Captura](../.cache/vis_5b_1/normal/busca_retorno_1440.png) |
| Novo conteúdo: catálogo | [Captura](../.cache/vis_5b_1/normal/navegacao_catalogo_320.png) | [Captura](../.cache/vis_5b_1/normal/navegacao_catalogo_390.png) | [Captura](../.cache/vis_5b_1/normal/navegacao_catalogo_768.png) | [Captura](../.cache/vis_5b_1/normal/navegacao_catalogo_1440.png) |
| Voltar à Home | [Captura](../.cache/vis_5b_1/normal/historico_voltar_320.png) | [Captura](../.cache/vis_5b_1/normal/historico_voltar_390.png) | [Captura](../.cache/vis_5b_1/normal/historico_voltar_768.png) | [Captura](../.cache/vis_5b_1/normal/historico_voltar_1440.png) |
| Dashboard após transição | [Captura](../.cache/vis_5b_1/normal/dashboard_foco_320.png) | [Captura](../.cache/vis_5b_1/normal/dashboard_foco_390.png) | [Captura](../.cache/vis_5b_1/normal/dashboard_foco_768.png) | [Captura](../.cache/vis_5b_1/normal/dashboard_foco_1440.png) |

- Zoom real: [catálogo com foco](../.cache/vis_5b_1/zoom_real/navegacao_catalogo_1440.png), [Dashboard com foco](../.cache/vis_5b_1/zoom_real/dashboard_foco_1440.png), [Home](../.cache/vis_5b_1/zoom_real/inicio_1440.png).
- Preservação: [Usuários 320](../.cache/vis_5b_1/normal/usuarios_foco_preservado_320.png), [erro de Usuários 390](../.cache/vis_5b_1/complemento/erro_usuarios_390.png), [retorno do erro 390](../.cache/vis_5b_1/complemento/erro_usuarios_retorno_390.png), [âncora de notícias](../.cache/vis_5b_1/complemento/ancora_preservada_1440.png).
- Idiomas, títulos e foco são registrados em JSON, pois a captura do conteúdo não inclui a barra de título do navegador: [quatro larguras](../.cache/vis_5b_1/normal/resultado.json), [zoom](../.cache/vis_5b_1/zoom_real/resultado.json), [complemento](../.cache/vis_5b_1/complemento/resultado.json).
- [Lint](../.cache/vis_5b_1/lint.log), [testes finais](../.cache/vis_5b_1/testes_finais.log), [build](../.cache/vis_5b_1/build.log), [log visual](../.cache/vis_5b_1/visual.log), [log de zoom](../.cache/vis_5b_1/zoom.log).

Comandos a partir de `frontend`, em `cmd.exe`, usando Node 24.22.1 já existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/OrientacaoPagina.test.jsx test/NavegacaoAdmin.test.jsx test/PatrimonioDetalhe.test.jsx test/AdminUsuariosFoco.test.jsx test/AdminAuditoria.test.jsx test/AdminFeedback.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_1\visual.mjs
..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_1\zoom.mjs
..\.cache\d4_final\node24\node.exe ..\.cache\vis_5b_1\complemento.mjs
```

## Pendências, regressões e limites

**A01, A02 e A08 foram implementados e validados no ambiente descrito.** Nenhuma regressão de produção foi identificada nos cenários concluídos. O ensaio continua detectando o overflow preexistente de Patrimônios administrativos em 768 px (A13), e a fixture de exposição sem imagem produz o aviso React já documentado em A14. Ambos permanecem fora do escopo, assim como A03–A07 e A09–A12.

As nove falhas públicas da [VIS-4B.2](correcoes_vis_4b_2.md) permanecem como pendências históricas separadas: três expectativas `+5` contra `+25`, quatro de fluxos públicos e duas de 404. Esses arquivos não foram executados ou alterados nesta rodada; não se afirma aprovação da suíte completa.

Build mantém os avisos de chunk acima de 500 kB (principal **742,15 kB**, **210,74 kB gzip**) e import estático/dinâmico de `PatrimonioEditor`. Nenhum aviso suprimido. Navegador/Vite usaram apenas fixtures GET e configuração isolada, com fontes externas e Maps bloqueados; erros 503 foram provocados exclusivamente para o fluxo de foco. Nenhuma exceção JavaScript não tratada foi registrada nos roteiros finais.

Não houve leitor de tela, dispositivo físico, API real, login real ou gravação. A leitura assistiva do título/foco ainda precisa de ensaio interativo; árvore/DOM e foco no navegador não certificam a fala de um leitor de tela nem conformidade integral WCAG. As evidências em `.cache/` são locais e ignoradas pelo Git.

A [integridade](../.cache/vis_5b_1/integridade.json) confere 944 arquivos preexistentes, incluindo o relatório VIS-5A. Somente os cinco fontes preexistentes listados acima mudaram; os demais foram preservados. Nenhum commit, push ou deploy foi realizado.
