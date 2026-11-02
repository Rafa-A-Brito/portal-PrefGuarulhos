# H1 — Histórico de alterações

Data: **31/10/2026**, America/Sao_Paulo. Base: `development/backend`, HEAD `c676071`. Referência: [diagnóstico aprovado](diagnostico_dashboard_pos_atualizacao.md). Os dois relatórios locais preexistentes foram preservados.

**Interface implementada para revisão e homologação.** A rota `/admin/auditoria` e a entrada “Histórico de alterações” no grupo Gestão são exclusivas de ADMIN. Foram reutilizados os endpoints, o cliente autenticado e os estilos do painel. Não houve alteração de persistência, autenticação, contratos backend, dashboards, favoritos, flags ou dependências. Nenhum banco foi acessado; nenhuma migration, seed, importação, Docker, commit, push ou deploy foi executado.

## Arquivos

| Arquivo | Entrega |
| --- | --- |
| `frontend/src/App.jsx` | Rota dentro do guard ADMIN existente |
| `frontend/src/features/admin/components/AdminLayout.jsx` | Menu condicionado ao perfil ADMIN |
| `frontend/src/features/admin/pages/AdminAuditoria.jsx` | Lista, filtros, paginação e detalhe sob demanda |
| `frontend/src/features/admin/pages/AdminAuditoria.module.css` | Layout responsivo, rolagem e foco locais |
| `frontend/src/services/auditoriaApi.js` | GETs administrativos, envelope e erros controlados |
| `frontend/src/features/admin/formatarAuditoria.js` | Narrativa determinística, campos permitidos e datas paulistas |
| `frontend/test/AdminAuditoria.test.jsx` | Interação, permissões, filtros, erros e cancelamento |
| `frontend/test/formatarAuditoria.test.js` | Tipos, privacidade, ações e datas históricas |
| `frontend/test/fixtures/auditoria.js` | DTOs sintéticos compartilhados com os testes de contrato |
| `frontend/test/auditoria_visual.mjs` | Ensaio opt-in de navegador com API e sessão simuladas |
| `backend/test/auditoriaInterface.test.js` | Comparação das fixtures com serviços real/demo isolados |
| `backend/test/fixtures/auditoria_interface.mjs` | Preparação desses contratos sem conexão SQL |
| Este relatório | Evidências e limites da entrega |

## Contratos e apresentação

A lista usa `GET /api/admin/auditoria`, envelope `{success,data}`, `itens` e `paginacao` do servidor. Envia `pagina`, `limite=20` e, quando preenchidos, `userId`, `action`, `entity`, `entityId`, `inicio` e `fim`. Preserva a ordem recebida e o total global. Aplicar filtros volta à página 1; retry mantém a consulta aplicada. Não há busca fictícia sobre a página carregada.

A busca opcional de responsável usa `/api/admins?busca=...&pagina=1&limite=20`, informa o limite e resolve a seleção para UUID. Também é possível informar o UUID diretamente. Nome/e-mail não são enviados como filtros da auditoria. O ID do alvo fica em filtro avançado.

Datas selecionadas são convertidas em instantes ISO UTC correspondentes aos limites inclusivos do dia civil de `America/Sao_Paulo`, com precisão de milissegundos. A conversão usa a zona IANA via Intl, sem assumir offset fixo ou fuso do computador. Testes cobrem o dia de 23 horas de 04/11/2018 e a transição de 25 horas de fevereiro de 2019.

`GET /api/admin/auditoria/:id` só ocorre ao abrir Detalhes. O modal mantém os filtros, distingue carregamento/404/erro e cancela pedidos ao fechar. As consultas usam AbortSignal e recusam respostas obsoletas. Erros 401/403 têm mensagens próprias; erros recuperáveis oferecem nova tentativa. Lista vazia e ausência de resultados filtrados têm textos distintos.

O cliente reutiliza `services/api.js`; Bearer, renovação e encerramento de sessão continuam sob a implementação existente. Não foi criado mecanismo alternativo de autenticação. O guard frontend é uma camada de apresentação; a autorização definitiva permanece no backend.

## Narrativa e proteção dos valores

O formatador usa códigos conhecidos e lista positiva de campos por recurso. Não usa o resumo livre como narrativa, HTML bruto, IA ou busca de cadastro atual para reconstruir valores antigos. Datas e identificação do ator vêm do evento; nome/e-mail são explicitamente identificados como **cadastro atual**. “Seção/recurso” deriva da entidade e não representa sessão ou página acessada.

Exemplos sintéticos/templates:

- Atualização de outro usuário: “Em 31/10/2026, 12:20:00, Ana — nome atual alterou usuário {UUID do alvo}.” A comparação mostra Nome anterior/Nome novo; não troca ator por alvo.
- Troca da própria senha: “Em {data/hora}, {responsável} alterou sua senha.” Nenhum valor de senha é apresentado, mesmo em fixture imprópria.
- Reordenação: identifica explicitamente o patrimônio pai e apresenta IDs/ordens dos itens permitidos, sem chamar o UUID pai de fato/ligação.
- Código desconhecido: mensagem neutra de atividade administrativa; códigos seguros disponíveis no detalhe, sem interpretação inventada.

Omissão, null, texto vazio, zero e false permanecem distintos. Localização e listas têm formatação tipada. URLs permitidas são apresentadas como texto e têm credenciais, query e fragmento removidos; campos desconhecidos, tokens, hashes e objetos arbitrários não são despejados na tela. Uma diferença sanitizada igual nos dois lados recebe ressalva, sem afirmar que nada ocorreu. Texto livre permitido continua podendo conter informação pessoal digitada; a apresentação não promete anonimização universal.

## Validação executada

Runtime: Node **24.22.1**, Windows, comandos por cmd.exe.

| Verificação | Resultado |
| --- | --- |
| Suíte frontend completa, dois workers | **505 testes aprovados em 30 arquivos** |
| Testes específicos de interface/formatador após ajuste final de foco | **65 aprovados** |
| Backend pertinente: auditoria, operações, logs, demo e contratos H1 | **54 aprovados, zero falhas/ignorados** |
| Revalidação das fixtures real/demo após ajuste de lint | **2 aprovados** |
| Lint frontend completo | Aprovado |
| Lint dos dois arquivos backend novos | Aprovado |
| Build frontend | Aprovado |
| Navegador desktop/mobile | 1440, 390 e 320 px; sem overflow da página/modal |
| Diff rastreado | `git diff --check` aprovado |

A suíte frontend inclui regressões dos quatro gráficos V1, três V2, navegação, sessão, regiões, favoritos e participação. Os novos testes cobrem ADMIN/EDITOR/visitante, menu/rota direta, Authorization, filtros e paginação reais, estados HTTP 401/403/404/503, cancelamento, detalhe sob demanda, texto malicioso, ator ausente/renomeado, códigos desconhecidos e valores sanitizados.

A execução completa precedeu o ajuste pontual de foco/estilo identificado no navegador. Após esse ajuste, foram repetidos os 65 testes afetados, lint, build e o ensaio visual; todos passaram. Logs locais: `.cache/h1_suite.log`, `h1_alvos_final.log`, `h1_backend.log`, `h1_lint_final.log`, `h1_build_final.log` e `h1_visual/resultado.json`.

Os testes backend executados foram `auditoriaInterface.test.js`, `auditoria.test.js`, `auditoriaOperacoes.test.js`, `logs.test.js` e `mockData.test.js`. O serviço real foi exercitado com persistência substituída e URL sentinela; a demo foi exercitada em memória, em processo separado. As fixtures compartilhadas de lista/detalhe coincidiram com ambos. Isso **não certifica transações, rollback ou desempenho PostgreSQL**, nem equivale a homologação navegador → backend real → banco. Não foi executada integração SQL nesta etapa.

O build final tem bundle principal de **699,09 kB / 197,89 kB gzip**. Permanecem os avisos de tamanho acima de 500 kB e import dinâmico ineficaz do editor patrimonial. Os módulos lazy V1/V2 continuam separados (48,61 e 27,81 kB), com UI/Recharts compartilhado de 365,38 kB. Não foram alterados limites do bundler ou dependências. Audit não foi repetido: não integra a validação solicitada para H1 e não houve mudança de pacotes.

## Navegador e capturas

O ensaio usa o App real servido por Vite isolado, `envDir:false`, API sintética e sessão administrativa simulada. Só GETs são aceitos; nenhuma URL do banco ou API real é utilizada. Foram verificados abertura por Enter, foco inicial, ciclo Tab/Shift+Tab, Escape e devolução do foco, além de erro/vazio. Tabelas largas têm rolagem interna acessível por teclado.

- [Lista desktop — 1440 px](../../.cache/h1_visual/historico_1440.png)
- [Detalhe desktop](../../.cache/h1_visual/detalhe_1440.png)
- [Lista mobile — 390 px](../../.cache/h1_visual/historico_390.png)
- [Detalhe mobile](../../.cache/h1_visual/detalhe_390.png)
- [Lista estreita — 320 px](../../.cache/h1_visual/historico_320.png)
- [Estado vazio](../../.cache/h1_visual/historico_vazio.png) e [erro](../../.cache/h1_visual/historico_erro.png)

Lista desktop e lista/detalhe mobile foram inspecionados visualmente. A inspeção motivou preservar “Detalhes” em uma linha e controlar o ciclo de Tab no modal, evitando saída para o navegador. O harness também precisou enviar o caractere Enter junto do evento CDP; a falha anterior não era ausência de handler da aplicação. A primeira tentativa restrita teve timeout de CDP; o ensaio final fora do sandbox passou, sem desabilitar proteções do navegador.

Não houve teste com NVDA/VoiceOver/Orca ou aparelho físico. Não declarar certificação universal de acessibilidade. Capturas, logs e perfis permanecem locais em `.cache/`; não publicar perfis. O ensaio pode ser repetido explicitamente com `node test/auditoria_visual.mjs` na pasta frontend, com Chrome/Edge disponível.

## Pendências e parecer

H1 está pronta para revisão funcional e visual. Antes de implantação, homologar com uma API autenticada e banco descartável autorizados, volume representativo, leitores de tela e infraestrutura final. Políticas institucionais de acesso/retenção da auditoria e snapshot histórico do ator continuam fora desta interface; ela não reconstrói eventos ausentes.

Os relatórios preexistentes foram preservados. Não foram implementados Feedback, Acessos Gerais ou Favoritos Globais, nem alteradas flags públicas. A entrega termina antes de implantação; não houve commit, push ou deploy.
