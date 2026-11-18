# Viabilidade e integração seletiva UI-F2/UI-F6

Data: 17/11/2026, America/Sao_Paulo.

## Base da comparação

- Branch: `development/backend`. HEAD e referência **local** `origin/development/backend`: `67769378a6a33c2e86a2b74f986a2b1eb637dd58`. Não houve fetch; isso não comprova o estado remoto atual.
- `git status --short --branch` estava limpo antes das edições.
- Lidos: [README geral](../README.md), [README frontend](../frontend/README.md), [UI-F1](../frontend/reports/finalizacao_frontend_ui_f1.md), [visitação](../frontend/reports/status-visitacao.md) e o planejamento revisado de 17/11 anexado ao pedido.
- Pacote anterior efetivamente localizado: `C:/Users/USER/Downloads/frontend-ui-f2-f6-somente-alteracoes.zip`, com 17 entradas (10 arquivos existentes e 7 novos, incluindo testes e relatório de 11/11). SHA-256: `186a59b913d51be030ed348ed9aefa1a51af4e34c614bb4ece94230a15b6376b`.
- O pacote foi extraído apenas em `.cache/ui_f2_f6_referencia/` e comparado arquivo a arquivo. Nenhum ZIP foi copiado sobre o checkout. Os ZIPs completos (7), (8) e o outro nome de pacote citados no planejamento não foram usados como prova de conteúdo ou histórico Git.

O planejamento descreve corretamente as principais lacunas públicas da branch. Porém, o relatório de 11/11 do pacote anterior ficou desatualizado ao dizer que não havia contrato independente de visitação: ele já existe nesta branch. O README também contém situações documentais antigas, como D4D.1 ainda descrita como pacote preparado, embora a navegação administrativa já esteja implementada e testada. Esses documentos não substituem a inspeção do código atual nem certificam o deploy.

## Avaliação técnica anterior à implementação

As classificações abaixo se referem ao estado encontrado e à viabilidade nesta entrega. A última coluna distingue o que foi implementado do que permanece como próxima etapa.

| Item | Classificação | Evidência, risco e decisão |
| --- | --- | --- |
| Visitação separada de conservação/publicação | Já implementado | Normalizador transmite `situacao`, `statusVisitacao`, motivo e previsão independentemente. Preservado; recriar contrato seria redundante. |
| Selos de restrição no card e painel do mapa | Já implementado | `VisitacaoPatrimonio` atende às três restrições. `ABERTO` e `NAO_INFORMADO` continuam sem selo; ausência não significa acesso autorizado. |
| Aviso, motivo literal e previsão no detalhe | Já implementado | Mantidos componente, escaping React e formato de dia civil, sem conversão de fuso. |
| Editor, permissões, limpeza de motivo/previsão e payloads | Já implementado | Preservadas implementação e regras existentes. Testes frontend exercitam preservação e limpeza com `null`; não comprovam persistência real no banco. |
| Selos de conservação | Necessita adaptação | Detalhe já mostrava Demolido; demais situações careciam de apresentação consistente. Integrados quatro rótulos, sem substituir visitação nem esconder bens históricos. |
| Opacidade de fotografias | Necessita adaptação | Opcional no planejamento e pendente de definição institucional. Não aplicada: texto e cores dos selos já informam conservação sem sugerir fechamento. |
| Busca do catálogo sincronizada com URL | Viável e recomendado | Estado local ficava desatualizado em voltar/avançar. URL passou a ser fonte de verdade; digitação usa `replace`, conservando outros parâmetros. |
| Paginação e filtros do catálogo | Necessita adaptação | Paginação apenas local não acompanhava histórico. Adicionado parâmetro opcional `pagina`, com limites seguros; mudanças de filtros reiniciam página. Região, categorias e favoritos existentes foram mantidos. |
| Busca/categoria do mapa na URL | Viável e recomendado | Eram estados locais. Sincronizados com parâmetros e histórico, sem alterar a política geográfica ou marcadores. |
| Favoritos | Já implementado | Mantidos armazenamento, contador, botão independente e filtro. Nenhum serviço novo. |
| Seleção invisível ao clicar no catálogo | Viável e recomendado | A página não contém mapa e a seleção era limpa ao sair. Retirada ação sem resultado visível; links de detalhe, favorito e acesso ao mapa continuam disponíveis. |
| Página 404 | Viável e recomendado | Fallback adicionado somente às rotas públicas internas. Caminhos administrativos desconhecidos recebem página pública neutra; rotas administrativas conhecidas continuam protegidas. Não foi alterado status HTTP do servidor SPA. |
| Idioma e nomes acessíveis das buscas | Viável e recomendado | `lang="pt-BR"` e nomes explícitos em Home, Navbar, catálogo e mapa. Sem alteração de autenticação da Navbar. |
| Home baseada no acervo | Necessita adaptação | Removido uso de `heroDestaqueMock`; primeiro registro segue ordem editorial recebida, incluindo demolidos. Sem contagem fictícia de fotos; erro, vazio e loading têm mensagens próprias. Links dos cards de destaque para categorias foram preservados. |
| Fallback neutro de imagens | Viável e recomendado | Foto do Sanatório era usada indevidamente em outros bens. Novo SVG neutro e componente compartilhado para ausência/falha, sem repetir erro do fallback; nova seleção pode carregar outra imagem. Aplicado em cards, Home, mapa e galeria. Fundo do detalhe também possui imagem alternativa. |
| Mapa alternativo operável por teclado | Viável e recomendado | Cards convertidos em botões com estado de seleção. Texto deixa de expor modo de desenvolvimento; mapa Google e política de localização permanecem. |
| Filtro público por visitação | Necessita adaptação | Tecnicamente possível com os dados existentes, mas não consta aceite institucional no material. Adiado; catálogo continua exibindo todos os registros conforme filtros atuais. Não criado endpoint ou filtro de backend. |
| Rotas para locais com restrição | Necessita adaptação | Bloquear rotas automaticamente mudaria regra existente e acesso a referências históricas. Mantidas rotas e acrescentada orientação: localização não autoriza entrada; consultar condições de visitação. |
| UI-F3: acessibilidade e responsividade transversal | Viável e recomendado | Próxima etapa. Nomes de campos e teclado do mapa receberam correções pontuais; ainda faltam auditoria de foco/modais, zoom, contraste, leitor de tela e viewports. |
| UI-F4: bundle, imports e conteúdo demonstrativo | Necessita adaptação | Build medido; avisos confirmados. Separação de imports exige revisão dos consumidores administrativos. Fallbacks DEV documentados e arquivo de mock legado preservados; não se removeu infraestrutura de demonstração. |
| UI-F5: API real e PostgreSQL isolado | Necessita adaptação | Necessita ambiente e autorização próprios, incompatível com executar banco/backend nesta rodada. Não realizado. |
| UI-F7: perímetro oficial de proteção | Necessita adaptação | Depende de dados homologados, fonte, vigência, geometria e contrato. Não há base para implementação segura nesta entrega. |
| Raio arbitrário ou proibição automática de obras | Desnecessário ou incompatível | Não solicitado como regra aprovada e não sustentado pelos dados. Não implementado. |
| Revisão conjunta de segurança / ativação de Feedback e V2 | Necessita adaptação | Revisão transversal continua pendente em escopo próprio. Flags, sessão e permissões foram preservadas; nenhuma ativação realizada. |
| Substituição integral pelo ZIP / recriação da visitação | Desnecessário ou incompatível | Regressaria recursos mais recentes e violaria o escopo. Aplicação exclusivamente seletiva. |

## Conflitos resolvidos e alterações

1. **PlaquetaCard:** o ZIP removia `VisitacaoPatrimonio`. Mantido selo de visitação sobre a imagem; conservação fica no corpo, separada da categoria e do favorito. Fallback deixou de usar foto de outro patrimônio.
2. **Mapa:** o ZIP removia o contêiner de imagem e selo recente. Mantidos ambos; conservação adicionada na lista e no corpo do painel. Marcadores, seleção, referências históricas e URLs de rota foram preservados.
3. **PatrimonioDetalhe:** o ZIP removia o aviso completo de visitação. Mantido aviso com motivo/previsão; selo específico Demolido substituído pelo componente de conservação que também atende restauração e ruínas. Nenhuma alteração na edição administrativa incorporada à ficha.

O componente de conservação foi adaptado para ignorar valores desconhecidos e propriedades herdadas como `toString`. Não presume status de acesso a partir de conservação. O catálogo não filtra demolidos automaticamente; a Home também respeita a ordem original em vez de preferir arbitrariamente outro registro.

Principais arquivos:

- Navegação: [App](../frontend/src/App.jsx), [404](../frontend/src/pages/NaoEncontrada/NaoEncontrada.jsx), [catálogo](../frontend/src/pages/Patrimonios/Patrimonios.jsx), [Navbar](../frontend/src/components/Navbar/NavBar.jsx) e `frontend/index.html`.
- Apresentação: [Home](../frontend/src/pages/Inicio/Inicio.jsx), [mapa](../frontend/src/pages/Mapa/Mapa.jsx), [mapa alternativo](../frontend/src/features/mapa/MapaPatrimonios.jsx), [card](../frontend/src/features/mapa/PlaquetaCard.jsx), [detalhe](../frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx).
- Componentes novos: [conservação](../frontend/src/features/patrimonio/SituacaoPatrimonio.jsx), [mapeamento](../frontend/src/features/patrimonio/situacao.js), [imagem](../frontend/src/components/ImagemPatrimonio.jsx), [SVG](../frontend/public/imagem-indisponivel.svg); estilos locais e ajuste pontual do botão no CSS global.
- Testes: novos `FluxosFrontendF2`, `RoteamentoPublico`, `situacaoPatrimonio` e `ImagemPatrimonio`; atualização de `Inicio` para o destaque real e fallback neutro. Todos em `frontend/test/`.

Não foram alterados backend, banco, Prisma, Docker, autenticação, serviços HTTP, editor administrativo, manifests, locks ou flags. Nenhuma dependência foi instalada, nenhum commit/push ou deploy foi realizado.

## Verificações

Node **24.22.1** já disponível em `.cache/d4_final/node24/node.exe`; dependências existentes. Executados os mesmos entrypoints dos scripts `lint`, `test` e `build` de `frontend/package.json`, usando esse Node compatível em vez do Node 25 do PATH.

Comandos, a partir de `frontend`, em `cmd.exe`:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
```

| Verificação | Resultado |
| --- | --- |
| ESLint frontend | Aprovado, exit 0, inclusive após ajuste do teste. |
| Vitest completo, rodada final | **39 arquivos e 709/709 testes aprovados**, exit 0, 151,70 s. São 661 testes existentes e 48 novos. |
| Reexecução direcionada de navegação | 14/14 aprovados após corrigir consulta do botão de região. |
| Build de produção | Aprovado, exit 0; 1.470 módulos, 8,55 s. |
| Integridade do diff | `git diff --check` aprovado. Diff vazio em backend, Compose/infra, contexts, serviços HTTP, administração e manifests/locks; índice Git sem alterações. |

A tentativa inicial de Vitest no sandbox foi interrompida porque permaneceu sem resultados. A execução fora do sandbox, autorizada pelo mecanismo de permissões, concluiu a suíte. A única falha da primeira rodada concluída estava no teste novo: ele procurava região e contador como nome único `Centro 9`. O teste passou a localizar o botão pelo nome e conferir o contador dentro dele. Nenhum comportamento de produção foi flexibilizado para satisfazer a asserção.

A cobertura adicional verifica voltar/avançar no catálogo e mapa, digitação com replace, filtros/paginação/favoritos, páginas inválidas, Home real/vazia/com erro, teclado no mapa alternativo, 404 pela árvore real de rotas, proteção de rota administrativa conhecida, fallback sem loop e **20 combinações** de conservação com visitação. Os testes existentes de detalhe, API normalizada, editor, autenticação e renovação de sessão permanecem na suíte completa.

Build mantém avisos de chunk maior que 500 kB (principal **738,00 kB**, **209,01 kB gzip**) e `PatrimonioEditor` importado estática e dinamicamente. Também emitiu diagnóstico de tempo de plugins. Os avisos não foram suprimidos e pertencem à revisão de desempenho UI-F4.

Logs locais: `.cache/ui_f2_f6_test.log` e `.cache/ui_f2_f6_test_final.log`. Build em `frontend/dist/`, ignorado pelo Git. Relatórios anteriores de navegador não são evidência de execução nesta rodada.

## Pendências e decisão sobre UI-F3

**Podemos avançar para a auditoria UI-F3: a integração seletiva passou em lint, nos 709 testes e no build.** Esta integração não representa aceite completo UI-F2/UI-F6 nem liberação de produção.

Próxima atividade: conferir Home, catálogo, detalhe, mapa e editor em 320, 390, 768 e 1440 px, com navegação somente por teclado e zoom 200%; revisar foco ao navegar/abrir/fechar diálogos, labels, erros/loading e leitura assistiva. Priorizar selos simultâneos, nomes longos, favorito/botão de fechar e `DEMOLIDO + TEMPORARIAMENTE_FECHADO`, além de `NAO_INFORMADO` sem inferência de acesso. Confirmar também imagens indisponíveis e histórico do navegador real.

Não houve ensaio visual em navegador nesta rodada, teste em aparelho físico, leitor de tela, uso de credenciais Google, conexão a banco ou E2E com API real. Testes JSDOM e build não comprovam responsividade, contraste renderizado nem persistência. UI-F5 depende de homologação isolada com a equipe de backend; seu agendamento não foi realizado. Prefeitura/equipe ainda precisam decidir filtros de visitação, opacidade, conteúdo institucional e perímetros oficiais.
