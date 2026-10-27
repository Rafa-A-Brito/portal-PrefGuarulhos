# Dashboard V2 — Fase 1.3: gráficos administrativos de visualizações

Data: 26/10/2026, America/Sao_Paulo. HEAD de referência: `ee29f6c`. A árvore já continha a Fase 1.2 sem commit; suas alterações foram preservadas. Referências: [arquitetura](../docs/dashboard_v2_1_arquitetura_metricas.md), [backend 1.1](dashboard_v2_fase_1_1.md), [frontend 1.2](dashboard_v2_fase_1_2.md) e implementação atual de `GET /api/admin/dashboard/metricas`.

**Entrega para revisão, sem habilitação da coleta ou consulta em produção.** Foram acrescentados três gráficos e indicadores V2 independentes. As flags existentes continuam desligadas por padrão. Nenhum PostgreSQL foi acessado; não houve migration, seed, importação, commit, push ou deploy. Não foram adicionados pacotes ou alterados manifests/locks, autenticação, backend, favoritos locais, gráficos V1, proxy ou configurações de produção.

## Arquivos desta etapa

| Arquivo | Alteração |
| --- | --- |
| `frontend/src/features/admin/pages/AdminDashboard.jsx` | Importação e montagem da seção V2 após a apresentação V1 |
| `frontend/src/services/dashboardApi.js` | `buscarMetricasDashboard(filtros, signal)` e busca paginada de patrimônios para o filtro; `buscarDashboard` preservada |
| `frontend/src/features/admin/components/SecaoMetricas.jsx` | Expansão sob demanda, lazy, Suspense e recuperação de falha de carregamento da própria seção |
| `frontend/src/features/admin/components/MetricasDashboard.jsx` | Consulta, filtros, estados, indicadores, gráficos Recharts, tabelas e paginação |
| `frontend/src/features/admin/components/MetricasDashboard.module.css` | Estilos locais responsivos, foco, formulários e tabelas com rolagem |
| `frontend/src/features/admin/metricasDashboard.js` | Datas paulistas, validação de período/DTO, BigInt e lacunas temporais |
| `frontend/test/fixtures/metricas_dashboard.js` | Resposta administrativa sintética para testes |
| `frontend/test/metricasDashboard.test.js` | Datas, números exatos e consistência do contrato |
| `frontend/test/MetricasDashboard.test.jsx` | Axios autenticado, filtros, estados, paginação, gráficos reais e independência da V1 |
| Este relatório | Resultados, capturas, limitações e pendências |

`GraficosDashboard.jsx`, `dashboardService.js`, Card/Chart locais e os testes anteriores da V1 não foram modificados. As alterações preexistentes da Fase 1.2 permanecem separadas desta lista.

## Interface e gráficos

A seção “Visualizações qualificadas · V2” começa recolhida. O botão **Consultar visualizações** importa seu módulo e inicia a consulta. Nenhuma requisição V2 é feita apenas por abrir a V1. Recolher a seção cancela sua consulta pendente; reabri-la inicia uma consulta nova com o período padrão. Filtros não são persistidos entre recolhimentos.

1. **Patrimônios mais visualizados:** barras horizontais da página atual, dez bens por página, com nome completo e status atual na tabela. Nomes longos são abreviados apenas no eixo; tooltip/tabela mantêm o nome completo. Total registrado e número de patrimônios com eventos não são calculados pela soma da página.
2. **Visualizações por dia:** linha/pontos de registros diários. Dias ausentes aparecem como `null`, interrompendo a linha (`connectNulls=false`), e como “Sem dado disponível” na tabela. Um ponto isolado não é conectado através de lacunas. Quantidade zero só é usada quando efetivamente retornada pela API.
3. **Visualizações por região:** barras para as regiões retornadas, inclusive inativas com histórico. “Sem região” fica em indicador separado, incluído no total, sem criar uma região fictícia. O texto explica que a referência é o cadastro atual do patrimônio e que sua alteração redistribui o histórico.

Os indicadores informam total exato do período/filtros, datas inclusivas, unidade e cobertura. A unidade é **credencial diária + patrimônio + dia**, não pessoas ou visitantes únicos. Nenhum total da V1 é usado como denominador de audiência. A V1 continua representando o universo administrativo de todos os status.

## Contratos consumidos

### Consulta administrativa

`buscarMetricasDashboard` usa o Axios administrativo existente, com seu fluxo JWT preservado, e extrai `data` do envelope `{success:true,data}`. Não importa nem usa `metricasPublicasApi.js`.

```text
GET /api/admin/dashboard/metricas
  inicio=YYYY-MM-DD
  fim=YYYY-MM-DD
  pagina=1..10000
  limite=10
  patrimonioId=UUID                 // opcional
  regiaoId=UUID OU semRegiao=true    // opcionais e exclusivos
```

Não são enviados `granularidade`, `status`, bairro, totais ou timestamps do cliente. Datas são inclusivas; a validação local e o contrato backend limitam o período a 366 dias e recusam inversão/datas futuras. O padrão são os últimos 30 dias, incluindo hoje em São Paulo. Validação e aplicação do formulário usam o dia paulista, não a data UTC truncada.

Campos consumidos:

- `disponivel`, `meta.inicio`, `fim`, `geradoEm`, `fuso`, `granularidade`, `unidade`, `regiaoReferencia`, `cobertura`;
- `visualizacoes.totalRegistrado`;
- `visualizacoes.porPatrimonio.itens` (`id`, `nome`, `status`, `quantidade`) e `paginacao` (`pagina`, `limite`, `total`);
- `visualizacoes.porRegiao` (`id`, `nome`, `ativo`, `quantidade`) e `semRegiao`;
- `visualizacoes.serie` (`data`, `quantidade`);
- `favoritos.disponivel`, somente para informar indisponibilidade, sem gráfico ou ranking de favoritos.

Datas e paginação da resposta são confrontadas com a consulta aplicada. Um DTO incompleto/incoerente apresenta erro, sem fabricar valores. São verificadas com BigInt as somas de série diária e de regiões + sem região contra o total. A soma da página de ranking pode ser menor que o total, mas não maior.

### Filtros opcionais

O painel “Filtrar por patrimônio ou região” permite buscar nomes nos endpoints já existentes:

- `GET /api/admin/patrimonios?busca=...&pagina=1&limite=20`;
- `GET /api/admin/regioes?busca=...&pagina=1&limite=20` via `listarRegioesAdmin`.

A busca só ocorre por ação explícita, sem carregar todo o catálogo ou inferir UUIDs pelos slugs. Com termo vazio, `busca` é omitido. A interface informa o limite de 20 opções e pede refinamento do nome; inclui estados arquivados e regiões inativas quando retornados. “Somente sem região” envia exclusivamente `semRegiao=true`. As leituras administrativas desses catálogos e das métricas permitem ADMIN/EDITOR; nenhuma escrita foi acrescentada.

Aplicar filtros volta o ranking à página 1. Atualizar repete a consulta já aplicada, sem aplicar rascunhos do formulário. As mudanças de paginação preservam período/filtros. Busca de opções tem erro e cancelamento próprios, sem invalidar os indicadores já consultados.

## Precisão, cobertura e estados

Todas as quantidades do DTO permanecem strings decimais. BigInt é usado para validação e formatação textual; a apresentação gráfica só converte valores no intervalo `0..Number.MAX_SAFE_INTEGER`. Se uma série possuir valor maior, **o gráfico inteiro daquela série é substituído por um aviso e sua tabela exata**. O valor não é arredondado, truncado, omitido seletivamente nem transformado em zero. O teste com `9007199254740993` preserva `9.007.199.254.740.993` no total e nas três tabelas.

| Estado | Comportamento |
| --- | --- |
| Lazy/consulta em andamento | Mensagem de carregamento apenas na V2 |
| `disponivel=false` | “Métricas ainda não habilitadas”, sem gráficos ou zeros simulados |
| Total registrado igual a zero | “Nenhum evento registrado neste período e filtros. Isso não comprova ausência de visitas.” |
| Corpo ausente/inválido ou falha HTTP/rede | Erro próprio e botão Atualizar visualizações; não exibe acervo vazio |
| `NAO_INSTRUMENTADA` | Ressalva explícita de que não é possível certificar dias completos ou interpretar ausência como zero visitas |
| Dia corrente incluído | Marcado parcial, tanto no resumo quanto na tabela, usando o dia paulista de `meta.geradoEm` |
| `favoritos.disponivel=false` | Apenas aviso de indisponibilidade; nenhum ranking fictício |

A consulta atual não informa início da coleta, início disponível ou janelas sondadas. Por isso lacunas não recebem causa inferida, e zeros não certificam cobertura. Um snapshot gerado antes da meia-noite continua identificado pelo dia parcial **na geração**, sem se tornar completo por uma mudança posterior no relógio do navegador. A seção não faz polling automático.

## Acessibilidade, layout e capturas

Card, ChartContainer e ChartTooltipContent existentes são reutilizados. Os gráficos usam `accessibilityLayer`; o tooltip V2 envolve o conteúdo compartilhado em uma região `aria-live="polite"`, sem mudar a V1. É possível focar o gráfico e navegar com setas. Os três painéis oferecem tabelas com caption, cabeçalhos e valores exatos; as áreas de rolagem também recebem foco. Formulários têm labels, botões têm altura mínima de 44 px e foco visível.

A grade usa duas colunas em desktop e uma em telas menores. Capturas locais, com **API e sessão administrativas simuladas**, sem PostgreSQL:

- [Desktop — 1440 px](../../.cache/v213_visual/metricas_1440.png).
- [Mobile — 390 px](../../.cache/v213_visual/metricas_390.png).
- [Mobile estreito — 320 px](../../.cache/v213_visual/metricas_320.png).
- [Consulta desligada](../../.cache/v213_visual/metricas_desligada.png), [nenhum evento registrado](../../.cache/v213_visual/metricas_zero.png) e [erro de consulta](../../.cache/v213_visual/metricas_erro.png).

No Chrome headless, não houve overflow horizontal nas três resoluções. Os tooltips por teclado mostraram os valores da fixture: ranking 7, série diária 5 e região 10. A V1 manteve quatro gráficos quando a V2 ficou desligada, vazia ou em erro; no estado habilitado houve quatro V1 + três V2. As capturas de desktop e 390 px foram inspecionadas visualmente. Isso não constitui certificação com todos os leitores de tela; lacunas na série não têm tooltip de quantidade, e a tabela é a alternativa textual.

O mecanismo de teclado segue a documentação primária de [acessibilidade do Recharts](https://github.com/recharts/recharts/blob/main/storybook/stories/API/Accessibility.mdx). A região de anúncio foi adicionada somente ao tooltip V2.

## Resultados da validação

| Verificação | Resultado |
| --- | --- |
| Frontend completo — Node 24.22.1, dois workers | **436 testes aprovados em 28 arquivos**, incluindo as regressões V1 e os testes da Fase 1.2 |
| Validação final após refinamento do tooltip/aviso de filtros | **18 testes aprovados** nos arquivos V2 e V1 afetados; sem ampliar timeouts |
| Contrato HTTP/backend, persistência simulada | **7 aprovados**, incluindo V1, consulta V2, ADMIN/EDITOR, anônimo/perfil indevido/conta inativa, flags desligadas, dados grandes e falhas; sem banco |
| Lint frontend | Aprovado |
| Build frontend | Aprovado |
| Audit completo | **0 vulnerabilidades**, código 0 |
| Audit de produção | **0 vulnerabilidades**, código 0 |
| Navegador isolado | Desktop/mobile, teclado, tooltips, estados e independência da V1 aprovados |
| Diff | `git diff --check` aprovado; avisos de normalização LF/CRLF sem falha |

Cobertura nova de testes: datas antes/depois de 03:00 UTC em São Paulo, ano bissexto e 366 dias inclusivos; BigInt seguro/inseguro; lacunas `null`; DTO incompleto/incoerente; envelope e Authorization do cliente administrativo; flag desligada; zero versus erro; filtros mutuamente exclusivos; paginação sem somar a página como total; cancelamento e continuidade da V1.

Comandos principais: `vitest run --maxWorkers=2`, `eslint .`, `vite build`, `npm audit --json`, `npm audit --omit=dev --json`; backend `node --test test/dashboardMetricas.test.js test/metricasHttp.test.js test/dashboard.test.js`. Os testes HTTP substituem a persistência e usam URL sentinela, não um PostgreSQL ativo.

Logs em `.cache/v213_suite.log`, `v213_final_alvos.log`, `v213_backend.log`, `v213_lint.log`, `v213_build.log`, `v213_audit.json`, `v213_audit_prod.json`, `v213_visual.log` e `v213_visual/resultado.json`. Temporários e perfis do navegador permanecem ignorados; não publicar `.cache/`.

### Bundle

Inicial: **677,14 kB / 191,28 kB gzip**, contra 674,94 kB / 190,74 kB da Fase 1.2. A seção específica `MetricasDashboard` fica lazy, **25,24 kB / 9,21 kB gzip**. O bundler passou a compartilhar código de UI/Recharts em `Card-*.js`, **365,38 kB / 105,44 kB gzip**; o módulo específico V1 fica com **48,61 kB / 12,85 kB gzip**. Não interpretar a redução isolada do arquivo V1 como redução equivalente de todo o custo dos gráficos: parte foi movida ao chunk compartilhado.

Recharts continua fora do bundle inicial; expandir V2 carrega o módulo necessário e reutiliza o chunk comum quando a V1 já o carregou. O CSS local da seção participa do CSS inicial. Permanecem os avisos anteriores de chunk inicial acima de 500 kB, import dinâmico ineficaz de `PatrimonioEditor` e assets grandes. Nenhuma dependência ou limite do Vite foi alterado.

## Pendências para a Fase 1.4

1. **Retenção e reconciliação:** implementar e homologar expurgo de recibos, agregados e sondas, reconciliação de dias encerrados, recuperação e idempotência. Não habilitar coleta contínua apenas porque os gráficos estão disponíveis.
2. **Cobertura:** implementar sondagem/agendamento, responsável operacional e alertas; acrescentar início de coleta/disponibilidade e janelas observadas antes de afirmar que um dia está completo ou uma ausência é zero. Manter dados da V1 separados da audiência V2.
3. **Permissões:** revisar privilégios mínimos de ingestão, leitura e tarefas operacionais, proprietário das tabelas e default privileges; validar a trilha `prisma migrate deploy` em descartável limpo sob autorização própria. O SQL integral já está no relatório 1.2 e não foi alterado/executado nesta etapa.
4. **Proxy e segurança operacional:** homologar HTTPS/cookies, cadeia real de proxies/trust proxy e origem, rate limiting compartilhado e limites da consulta. A quota de dez sessões por hora/rede da Fase 1.1 continua exigindo revisão para NATs compartilhados. Nenhuma configuração foi corrigida silenciosamente nesta fase.
5. **Ponta a ponta:** testar adesão → qualificação → API Express → PostgreSQL descartável → agregação → gráficos, incluindo concorrência, arquivamento, alteração de região, expiração e cobertura. Aqui o backend HTTP usou persistência simulada e o navegador usou respostas sintéticas; não substituem essa homologação integrada.
6. **Acessibilidade e operação:** homologar leitores de tela reais, ambientes móveis e volumes representativos; medir latência/EXPLAIN e carga das consultas antes de escala. Campos acima do limite seguro continuarão textuais até uma decisão explícita sobre outra representação gráfica.

Nenhum recurso de favoritos globais, Gemini ou “Em alta” foi iniciado. A próxima etapa e qualquer ativação final dependem de revisão/autorização próprias.
