# FB-INT-3 — Integração seletiva do refinamento visual de Feedback

27/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD `f78b1f4a23ab86f7c768638920ee43e23b225253`. Estado inicial do Git limpo. Consultados os relatórios [FB-INT-1](feedback_integracao_fb_int_1.md) e [FB-INT-2](feedback_integracao_fb_int_2.md), o pedido anexado, os fontes e o pacote `feedback_fb_int_3.zip`. Sem commit, push, deploy ou ativação pública.

## Comparação e integração

O ZIP continha os dez arquivos esperados. Foi extraído em `.cache/fb_int_3`, sem incorporar arquivos diretamente sobre o checkout. Cada diff foi analisado antes da aplicação; os hashes iniciais foram conferidos para evitar sobrescrever mudanças ocorridas durante a revisão. Imports de Heroicons e Recharts foram conferidos na instalação existente; nenhuma dependência foi instalada.

| Arquivo em `frontend/src/` | Decisão e resultado |
| --- | --- |
| `pages/Contato/Contato.jsx` | Aproveitado: apresentação da indisponibilidade com ícone e classes locais. Canais institucionais, montagem condicional e foco preservados. |
| `pages/Contato/Contato.css` | Aproveitado e adaptado: caixa de indisponibilidade; acrescentada regra local de cores de sistema para o hero em `forced-colors`. O navegador revelou texto escuro sobre fundo escuro nesse modo antes da correção. |
| `pages/Feedback/Feedback.jsx` | Aproveitado: cartões dos três tipos, ícones, placeholders, contador e estados. Rádios continuam nativos. Nenhuma mudança nas funções de envio. |
| `pages/Feedback/Feedback.module.css` | Aproveitado: cartões responsivos, foco, seleção, desabilitação, contador e aviso. Mantidas regras de movimento reduzido e cores forçadas. |
| `features/admin/components/FeedbackDashboard.jsx` | Aproveitado: quatro indicadores em `dl`, gráficos compactos e tabelas exatas em `details` na Dashboard; tabelas abertas automaticamente acima da precisão gráfica segura. Na página detalhada continuam expostas. |
| `features/admin/components/FeedbackGraficos.jsx` | Aproveitado com correção de comentário: barras por tipo e área temporal, dimensões compactas e tooltip exato. Retirada a afirmação não demonstrada de que o tooltip nunca cobre elementos; nenhuma alteração funcional adicional ao pacote. |
| `features/admin/components/FiltrosFeedback.jsx` | Aproveitado: agrupamento visual e ícone de atualização. Validação e associações acessíveis existentes mantidas. |
| `features/admin/components/SecaoFeedback.jsx` | Adaptado: visão compacta sem filtros detalhados, conforme autorizado. `Atualizar dados` recalcula `filtrosFeedback(periodoFeedback())`; rejeitada a reutilização do intervalo antigo proposta pelo pacote. |
| `features/admin/pages/AdminFeedback.jsx` | Aproveitado: painéis, selos, lista e modal. Consultas, filtros, paginação, cancelamento e controle de foco preservados. |
| `features/admin/pages/AdminFeedback.module.css` | Adaptado: rejeitado o mínimo de 40 px para Detalhes no mobile. Botões, link da seção e summaries têm mínimo de 44 × 44 px. Ajustado encolhimento das ações; seletor local dos filtros assegura altura de 44 px apesar da especificidade do estilo administrativo existente. |

Seis arquivos coincidem integralmente com o pacote revisado; quatro receberam os ajustes acima. [Comparação inicial](../.cache/fb_int_3/comparacao.json), [imports conferidos](../.cache/fb_int_3/imports.json) e [integridade final](../.cache/fb_int_3/integridade.json).

A conferência de **976 arquivos rastreados preexistentes** encontrou alterações somente nesses dez fontes e nos três testes descritos abaixo. Este relatório é o único arquivo novo de entrega. Preservados Histórico, `heroDestaqueMock`/+25, demais páginas, estilos globais, contratos, permissões, backend, Prisma, migrations, Docker e configurações de ativação. As flags versionadas continuam desativadas. Não houve leitura ou edição do `.env` habitual para executar o ensaio.

## Comportamento preservado

A Dashboard apresenta total, elogios, sugestões e problemas, distribuição e evolução, recorte de 30 dias civis de São Paulo, atualização e link para `/admin/feedback`. Em 27/11, o recorte foi **29/10–27/11/2026**. O teste de mudança de dia atravessa 03:00 UTC, meia-noite paulista, e confirma o novo intervalo. AbortController, descarte de respostas atrasadas, indicação de dados desatualizados, retenção e erros independentes permanecem. A montagem restrita a ADMIN em `AdminDashboard` não foi alterada.

Ausência, erro e desativação não são convertidos em total zero. Quantidades mantêm strings decimais/BigInt; valores inseguros não são enviados ao gráfico e abrem automaticamente as duas tabelas exatas. Os filtros detalhados continuam na página Feedback, incluindo datas, tipo, granularidade, aplicar, limpar e atualizar. Listagem, paginação e modal foram preservados.

No formulário, a comparação com HEAD confirmou igualdade dos blocos de `transmitir`, `submeter` e `voltarAEditar`, além do conteúdo do aviso de privacidade. Permanecem normalização, limite de 2.000 caracteres, idempotência, trava de duplicidade, resultado incerto, reenvio explícito, 429, expiração, confirmação de abandono, bloqueio por mudança de aviso e preservação do comentário diante de falhas. Regras de ativação, API pública única e canais institucionais permanecem iguais.

## Cobertura e validação automatizada

| Teste modificado | Adequação |
| --- | --- |
| `SecaoFeedback.test.jsx` | Os quatro cenários de filtros detalhados foram transferidos. Cancelamento/resposta atrasada agora usam atualização da seção. Acrescentados período móvel após mudança de dia e abertura/fechamento das duas tabelas sem requisição adicional. Mantidas permissões, erros, retenção, precisão e resposta inconsistente; BigInt verifica abertura automática e valor exato. |
| `AdminFeedback.test.jsx` | Recebeu os quatro cenários: aplicar/atualizar/limpar e três validações de datas. Conservados os anteriores. Asserções dependentes de `Total:` passaram a verificar a região semântica do resumo, evitando aprovações falsas por simples desaparecimento daquele texto. |
| `Feedback.test.jsx` | Acrescentado teste dos cartões, nomes acessíveis, rádios e placeholders. Reforçada a desabilitação dos rádios durante o envio dos três tipos, mantendo os cenários funcionais anteriores. |

`AdminDashboard.test.jsx`, `ContatoFoco.test.jsx`, `ContatoGeometria.test.js` e `AdminAuditoria.test.jsx` foram inspecionados e executados sem alteração. **Histórico: 18/18**. Os 921 testes anteriores tiveram sua cobertura preservada, com quatro transferências e três casos novos: **924 testes**.

| Verificação | Resultado final |
| --- | --- |
| Direcionados frontend | **174/174**, nove arquivos, exit 0; 56,90 s. |
| Suíte completa frontend | **924/924**, 53 arquivos, exit 0; **216,30 s**, após a última correção CSS. |
| Backend pertinente | **16 aprovados**, zero falhas e **um skip explícito**; 14,01 s. O teste histórico exige PostgreSQL 17 exclusivo. |
| Lint frontend | Exit 0, sem mensagens. |
| Build frontend | Exit 0; **1.480 módulos**, 4,97 s; principal 762,48 kB, gzip 216,48 kB. |
| `git diff --check` | Exit 0; avisos Git sobre futura normalização LF/CRLF, sem erro de whitespace. |

Logs: [direcionados](../.cache/fb_int_3/direcionados_final.log), [suíte final](../.cache/fb_int_3/suite_final.log), [backend](../.cache/fb_int_3/backend.log), [lint](../.cache/fb_int_3/lint_final.log), [build](../.cache/fb_int_3/build_final.log) e [diff](../.cache/fb_int_3/diff_check.log). Avisos de build preservados: chunk acima de 500 kB, importação estática/dinâmica de `PatrimonioEditor` e tempo de plugins. Não foram suprimidos.

Comandos em **cmd.exe**, a partir de `frontend`, usando o Node 24.22.1 já instalado:

```bat
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/SecaoFeedback.test.jsx test/AdminFeedback.test.jsx test/Feedback.test.jsx test/AdminDashboard.test.jsx test/ContatoFoco.test.jsx test/ContatoGeometria.test.js test/AdminAuditoria.test.jsx test/feedbackDashboard.test.js test/feedbackPublicoApi.test.js --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
git diff --check
```

Backend: `node --test --test-concurrency=1 test/feedback.test.js test/feedbackSeguranca.test.js test/feedback.integration.test.js`, pelo [wrapper isolado](../.cache/fb_int_3/backend.cjs), sem carregar o `.env` habitual, com URL de banco sentinela inacessível. Testes de memória/fixtures não são apresentados como persistência real.

As primeiras tentativas dos novos testes confundiam as limitações do DOM de teste com o comportamento nativo de `details`. Foram ajustadas para verificar `open` e clique; Enter/Espaço foram comprovados no navegador real. Falhas iniciais do roteiro de navegador por preflight incompleto e captura com escala incorreta foram corrigidas no roteiro temporário, sem alterar contratos da aplicação.

## API e PostgreSQL reais

Reutilizado exclusivamente o cluster PostgreSQL **18.6** da FB-INT-1: banco `portal_test`, loopback `127.0.0.1:5558`, identificador **7712578530882550764**. As 16 migrations e seus checksums foram conferidos, sem reaplicação. Houve backup custom antes do uso do navegador. Não foram executados seed, fixtures, reset, retenção ou novos envios reais de Feedback.

API real em `127.0.0.1:3358`, papel `portal_api`; Vite real em `127.0.0.1:5238`, com Navbar e barra lateral do portal. Recebimento backend ficou **desativado** durante esta etapa; consulta administrativa habilitada somente no processo isolado. O formulário foi habilitado somente no Vite de ensaio. O login ADMIN real gera sessões de autenticação nesse banco exclusivo; nenhuma mensagem ou recibo foi modificado.

Consultas SQL em transações READ ONLY e respostas reais de lista/resumo/detalhe confirmaram **cinco feedbacks e cinco recibos**, dois elogios, duas sugestões e um problema. Dashboard e página Feedback exibiram total 5, distribuição 2/2/1 e cinco contribuições em 26/11, com zero nos demais dias do recorte. As tabelas completas foram confrontadas nas quatro larguras. O detalhe real foi aberto pelo modal.

O hash do conjunto de Feedback/recibos antes e depois permaneceu:

```text
40c26caee0f120309a3591d27f65d7f8f0d8c99c7b6491573db9a72238fdc3c3
```

[Identidade final](../.cache/fb_int_3/identidade_final.log), [resultado integrado e comparação SQL/API/UI](../.cache/fb_int_3/depois/resultado.json), [roteiro](../.cache/fb_int_3/visual.mjs). A nova conferência de EDITOR/público foi automatizada com fixtures e testes de autorização do backend; não foi realizado novo login real de EDITOR nesta etapa. O ensaio real adicional PG18 não substitui o teste histórico PG17 que ficou em skip.

## Navegador e evidências antes/depois

Edge/Chromium headless, portal completo, **320, 390, 768 e 1440 px**. As três interfaces foram comparadas; capturas representativas e gráficos foram inspecionados. Sem overflow horizontal de página, exceções JavaScript ou avisos React nas execuções finais. Tabelas mantêm rolagem própria quando necessária.

| Largura | Contato antes / depois | Dashboard antes / depois | Feedback antes / depois |
| --- | --- | --- | --- |
| 320 | [antes](../.cache/fb_int_3/antes/contato_320.png) / [depois](../.cache/fb_int_3/depois/contato_320.png) | [antes](../.cache/fb_int_3/antes/dashboard_320.png) / [depois](../.cache/fb_int_3/depois/dashboard_320.png) | [antes](../.cache/fb_int_3/antes/feedback_320.png) / [depois](../.cache/fb_int_3/depois/feedback_320.png) |
| 390 | [antes](../.cache/fb_int_3/antes/contato_390.png) / [depois](../.cache/fb_int_3/depois/contato_390.png) | [antes](../.cache/fb_int_3/antes/dashboard_390.png) / [depois](../.cache/fb_int_3/depois/dashboard_390.png) | [antes](../.cache/fb_int_3/antes/feedback_390.png) / [depois](../.cache/fb_int_3/depois/feedback_390.png) |
| 768 | [antes](../.cache/fb_int_3/antes/contato_768.png) / [depois](../.cache/fb_int_3/depois/contato_768.png) | [antes](../.cache/fb_int_3/antes/dashboard_768.png) / [depois](../.cache/fb_int_3/depois/dashboard_768.png) | [antes](../.cache/fb_int_3/antes/feedback_768.png) / [depois](../.cache/fb_int_3/depois/feedback_768.png) |
| 1440 | [antes](../.cache/fb_int_3/antes/contato_1440.png) / [depois](../.cache/fb_int_3/depois/contato_1440.png) | [antes](../.cache/fb_int_3/antes/dashboard_1440.png) / [depois](../.cache/fb_int_3/depois/dashboard_1440.png) | [antes](../.cache/fb_int_3/antes/feedback_1440.png) / [depois](../.cache/fb_int_3/depois/feedback_1440.png) |

Os controles de Feedback medidos nas três telas têm dimensão mínima de **44 × 44 px**, inclusive Detalhes, campos de data, summaries e ações. A menor razão de contraste textual medida entre os elementos amostrados foi **5,63:1** em Contato/Feedback e **7,50:1** na seção da Dashboard; controles desabilitados foram excluídos dessa amostra. Cálculo a partir das cores computadas e composição de fundos. Isso não equivale a uma auditoria integral de todo o portal. [Medições](../.cache/fb_int_3/depois/acessibilidade.json).

Rádios nativos responderam às setas, mantiveram nome acessível e outline de 3 px; validação direcionou foco ao campo correspondente. Summaries abriram com Enter e fecharam com Espaço no navegador. No modal, Tab/Shift+Tab, Escape e retorno ao botão Detalhes foram conferidos nas quatro larguras. [Rádio focado](../.cache/fb_int_3/depois/radio_320.png), [modal](../.cache/fb_int_3/depois/modal_320.png), [tabelas abertas](../.cache/fb_int_3/depois/tabelas_320.png), [gráfico com dados reais](../.cache/fb_int_3/depois/grafico_dashboard_1440_0.png).

**Zoom nativo de 200% executado** no perfil temporário do Edge, pela configuração de zoom do navegador. Foi removida a emulação de dispositivo; a janela de 1.414 px passou a 707 CSS px, DPR 2, com documento de 702 px nas três rotas, sem overflow. O zoom foi restaurado ao final. A tentativa inicial por atalho não alterou o zoom; a comprovação válida é [zoom_nativo.json](../.cache/fb_int_3/depois/zoom_nativo.json). Capturas: [Contato](../.cache/fb_int_3/depois/zoom_nativo_200_contato.png), [Dashboard](../.cache/fb_int_3/depois/zoom_nativo_200_dashboard.png), [Feedback](../.cache/fb_int_3/depois/zoom_nativo_200_feedback.png).

O modo `forced-colors: active` foi exercitado por emulação de mídia do navegador. A correção local no hero de Contato resultou em texto preto e fundo branco (21:1); foco/seleção continuaram perceptíveis. [Topo corrigido](../.cache/fb_int_3/depois/alto_contraste_topo.png). Não se trata de certificação do modo de alto contraste nativo do Windows.

### Origem dos estados exercitados

| Estado | Evidência e natureza |
| --- | --- |
| Dados, lista e modal | API e PostgreSQL reais; cinco registros existentes. |
| Vazio legítimo | Filtro real de 01–02/01/2026, sem registros: [captura](../.cache/fb_int_3/depois/vazio_real.png). |
| Formulário desativado | Novo Vite sem flag, regra real de ativação: [captura](../.cache/fb_int_3/depois/publico_desativado.png). |
| Loading, erro e consulta desativada administrativos | Interceptação controlada de respostas no navegador: [loading](../.cache/fb_int_3/depois/estado_carregando_dashboard.png), [erro](../.cache/fb_int_3/depois/estado_erro_feedback.png), [desativado](../.cache/fb_int_3/depois/estado_desativado_dashboard.png). Não são falhas provocadas no banco. |
| Loading, rede, 429 e sucesso públicos | Interceptação antes de chegar à API, sem gravação: [loading](../.cache/fb_int_3/depois/publico_carregando.png), [rede](../.cache/fb_int_3/depois/publico_rede.png), [429](../.cache/fb_int_3/depois/publico_limite.png), [sucesso simulado](../.cache/fb_int_3/depois/publico_sucesso.png). Comentário preservado nas falhas e rádios desabilitados durante envio. |
| Expiração, abandono, aviso alterado, duplicidade, BigInt e respostas atrasadas | Testes automatizados existentes/adaptados com fixtures. Sem criar registros gigantes ou novas contribuições no banco. |

Os erros de rede deliberados não foram contados como exceções JavaScript. Captura de sucesso simulado não comprova persistência; a persistência comprovada nesta etapa é a conservação dos cinco registros anteriores.

## Encerramento, limitações e FB-INT-4

- API, Vite e PostgreSQL isolados foram encerrados; portas 3358, 5238 e 5558 conferidas fechadas. Dados e backup sintéticos foram preservados. Uma tentativa de encerramento encontrou limite de uso da revisão automática; após retomada, o encerramento foi concluído. Não foi contornado o fluxo de aprovação.
- Edge e inicialização/parada do PostgreSQL precisaram de execução fora do sandbox pelos limites do Windows já observados nas etapas anteriores. Serviços restritos a loopback. Nenhum banco habitual, compartilhado ou de produção foi usado.
- Os demais componentes/gráficos da Dashboard permaneceram inalterados, com testes existentes aprovados. O banco isolado tem acervo vazio; não se alega nova comprovação visual de todos os gráficos de acervo com dados reais preenchidos.
- Sem nova homologação Docker/Nginx/HTTPS, PostgreSQL 17, aparelho físico, leitor de tela, carga ou auditoria completa de contraste. As capturas e scripts em `.cache` são locais e ignorados pelo Git; não acompanham um clone. Credenciais e dumps não integram a entrega.
- FB-INT-4 pode concluir essas verificações de homologação e acessibilidade, revisar operacionalmente retenção/exclusões, recuperação e responsabilidades, e obter aprovação institucional do aviso. Nenhuma dessas pendências autoriza ativação pública nesta entrega.

Para inspeção manual, usar o ambiente exclusivo e os comandos documentados em [FB-INT-1](feedback_integracao_fb_int_1.md#como-testar-localmente), sem repetir preparação, fixtures ou roteiros de envio. Nesta revisão visual, manter `FEEDBACK_RECEBIMENTO_ATIVO=false` no processo backend e habilitar apenas consulta e interface no ambiente isolado. Não colocar segredos em `VITE_*`.
