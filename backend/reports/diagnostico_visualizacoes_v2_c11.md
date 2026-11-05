# C1.1 — Diagnóstico visual das Visualizações Qualificadas V2

Data: 04/11/2026. Referência: `66fc3733e33ff0ba932b4ddfc6f55c5c1139a548`.

**Resultado:** os três gráficos funcionaram com dados exclusivamente sintéticos. Filtros, valores exatos, estados de interface, teclado e larguras de 1440, 390 e 320 px foram exercitados. A mensagem “Métricas ainda não habilitadas” corresponde ao contrato de consulta desativada. Nenhuma correção ou ativação foi realizada.

## 1. Escopo e isolamento

Foi utilizado o serviço demonstrativo existente em [mock/metrics.js](../src/mock/metrics.js), com 18 registros fictícios inseridos apenas na memória do processo. O ensaio carregou os componentes reais `AdminLayout`, `AdminDashboard`, `SecaoMetricas`, `MetricasDashboard`, `Card` e `Chart` por uma entrada virtual do Vite. A identidade administrativa foi simulada no contexto React, sem autenticação real, token ou armazenamento de sessão.

O servidor temporário escutou somente em `127.0.0.1:5196`. Seu adaptador HTTP respondeu às consultas da interface com os serviços demonstrativos de métricas e catálogos; as respostas de desativação, erro e atraso foram simuladas nesse adaptador. Foram observados somente GETs de aplicação. A coleta pública permaneceu fora do ensaio.

O processo não leu `.env` da aplicação; descartou variáveis herdadas pertinentes, bloqueou imports de Prisma/PostgreSQL e usou diretórios temporários em `.cache/c11/`. Requisições HTTPS externas do navegador foram bloqueadas. O banco `patrimonio_guarulhos` não foi acessado. Não houve migrations, Compose, seed de banco, build, lint, suíte geral, commit, push, deploy ou publicação. Vite e Chrome foram usados exclusivamente para esta validação solicitada e encerrados ao final.

Os hashes de 871 arquivos (arquivos rastreados mais o relatório C1 preexistente) foram comparados antes/depois sem diferenças. A única entrega fora de `.cache/` nesta etapa é este relatório.

## 2. Os três gráficos existentes

Implementação: [MetricasDashboard.jsx](../../frontend/src/features/admin/components/MetricasDashboard.jsx), com componentes compartilhados de [Chart.jsx](../../frontend/src/components/ui/Chart.jsx).

| Título exibido | Apresentação | Fonte no DTO `data.visualizacoes` | Tabela correspondente |
| --- | --- | --- | --- |
| Patrimônios mais visualizados | Barras horizontais, ranking da página atual | `porPatrimonio.itens` | Ranking desta página — valores exatos |
| Visualizações por dia | Linha diária, com interrupções nas lacunas | `serie`, expandida por `serieComLacunas` | Série diária — valores exatos |
| Visualizações por região | Barras horizontais por região cadastrada | `porRegiao` | Regiões cadastradas — valores exatos |

A medida é “Visualizações registradas”, em azul `#5269a8`. Não existe uma legenda fixa separada: a identificação aparece nos textos, nas tabelas e nos tooltips. Nos gráficos de barras, o tooltip apresenta o nome completo e o valor; na série diária, data, nome da medida e valor. Os três títulos foram comparados literalmente no DOM.

O total refere-se ao período e a todos os filtros/páginas. A unidade declarada é uma visualização por credencial diária, patrimônio e dia; não equivale a visitantes únicos. A região corresponde ao cadastro atual do bem. `semRegiao` integra o total, mas fica separado das barras regionais. Regiões inativas e o status atual dos patrimônios continuam identificados nas tabelas.

Os três cartões aparecem quando `disponivel=true` e o total é positivo. Uma lista regional vazia mantém o cartão/tabela e informa “Nenhum item registrado neste recorte”, sem inventar uma barra. Valores acima do limite seguro de JavaScript têm proteção no código: o gráfico é suprimido, preservando a tabela exata; esse caso extremo não foi exercitado visualmente.

## 3. Por que a configuração atual não mostra os gráficos

Em [dashboardRoute.js](../src/routes/dashboardRoute.js), a consulta desligada responde:

```json
{"success":true,"data":{"disponivel":false,"motivo":"DESATIVADA"}}
```

`MetricasDashboard` mantém o formulário visível e exibe “Métricas ainda não habilitadas” ao receber `disponivel=false`. Esse caminho foi reproduzido no navegador. É compatível com a configuração desligada identificada na C1 e com a tela relatada pelo usuário. A configuração efetiva do servidor real não foi acessada nesta etapa.

| Flag | Efeito individual |
| --- | --- |
| `METRICAS_CONSULTA_ATIVA` | Controla a leitura administrativa. `false` devolve `DESATIVADA` sem executar a consulta de métricas. |
| `METRICAS_COLETA_ATIVA` | Controla emissão de credencial e recebimento de visualizações públicas. `false` bloqueia esses caminhos; a retirada da credencial continua permitida. Não impede, por si só, a leitura de histórico com consulta ligada. |
| `VITE_METRICAS_ATIVAS` | Controla a participação/coleta no frontend público; não controla a renderização dos gráficos administrativos. |

As flags backend são `false` quando ausentes, conforme [config/metricas.js](../src/config/metricas.js). Consulta e coleta são independentes. Foram conferidas em memória as configurações coleta/consulta `false/false` e `false/true`, sem exigir chaves de coleta. Ligar a consulta, isoladamente, não cria registros nem garante um total positivo. O modo `MOCK_DATA=true` possui configuração demonstrativa própria e força as flags no processo demo; isso não alterou arquivos de ambiente nem configuração real. No ensaio, o frontend público foi definido como desligado e não foram expostos endpoints de coleta.

## 4. Contratos backend

| Endpoint | Uso e contrato conferido |
| --- | --- |
| `GET /api/admin/dashboard/metricas` | Autenticação e perfis ADMIN/EDITOR na rota real; envelope `{success:true,data}`. Datas `inicio`/`fim`, `pagina`, `limite`, opcionais `patrimonioId`, `regiaoId` ou `semRegiao=true`. |
| `GET /api/admin/patrimonios` | Catálogo do filtro: `busca` opcional, `pagina=1`, `limite=20`; opções com identificador, nome e status. |
| `GET /api/admin/regioes` | Catálogo regional: mesmos parâmetros de busca/paginação; inclui identificação de região inativa. |
| `POST /api/metricas/visualizacoes/sessao` e `POST /api/metricas/visualizacoes` | Emissão de credencial e coleta, respectivamente. Inspecionados no código; não chamados. |
| `DELETE /api/metricas/visualizacoes/sessao` | Retirada da credencial, inclusive com coleta desativada. Inspecionado; não chamado. |

Fontes: [dashboardApi.js](../../frontend/src/services/dashboardApi.js), [regioesApi.js](../../frontend/src/services/regioesApi.js), [metricasSchema.js](../src/schemas/metricasSchema.js), [dashboardMetricasService.js](../src/services/dashboardMetricasService.js) e [metricasRoute.js](../src/routes/metricasRoute.js).

O schema aceita datas inclusivas, até 366 dias, UUIDs, página entre 1 e 10000 e limite entre 1 e 100. `regiaoId` e `semRegiao` são mutuamente exclusivos. O serviço rejeita período futuro. A interface usa página 1/limite 10 e último período de 30 dias ao abrir.

O serviço real agrega `visualizacoes_totais_dia` por patrimônio, dia e região atual em transação `RepeatableRead`/`READ ONLY`; quantidades são strings decimais. Isso foi confirmado por leitura de código, sem executar SQL. Os serviços demo usam o mesmo schema de consulta e suas respostas passaram pelo [validador real do frontend](../../frontend/src/features/admin/metricasDashboard.js).

Foram conferidas as igualdades `soma(serie)=totalRegistrado` e `soma(porRegiao)+semRegiao=totalRegistrado`, além da compatibilidade da página do ranking. Uma resposta propositalmente incoerente, com total `999`, foi rejeitada pela interface e exibiu erro, sem reaproveitar valores anteriores. A compatibilidade visual/DTO foi comprovada no adaptador demonstrativo; autenticação Express, persistência e integração SQL de produção não foram executadas.

## 5. Valores e filtros exercitados

Fixture-base: 31/10/2026 a 04/11/2026, com **18 registros fictícios**.

| Dimensão | Valores confirmados |
| --- | --- |
| Ranking | Casa Azul: 7; Parque Norte: 5; Acervo sem região: 3; Oficina Leste: 2; Teatro arquivado: 1 |
| Série | 31/10: 5; 01/11: 7; 02/11: sem dado; 03/11: 6; 04/11: sem dado, dia parcial |
| Região | Centro: 8; Leste inativa: 2; Norte: 5; sem região: 3; soma: 18 |

Os nomes usados na interface são explicitamente fictícios/demonstrativos. Todos os valores das três tabelas foram comparados aos DTOs retornados em cada cenário positivo. Lacunas permanecem `null` no gráfico e “Sem dado disponível” na tabela, sem interpolação nem preenchimento com zero. As barras, pontos e tooltips foram inspecionados no navegador e nas capturas.

| Filtro/ação | Resultado observado |
| --- | --- |
| Período 01/11 a 03/11 | Total 13; série 7, lacuna, 6. |
| Patrimônio Casa Azul | Total 7; dias 31/10=3 e 01/11=4; Centro=7. |
| Região Norte | Total 5; Parque Norte=5; dias 31/10=2 e 03/11=3. |
| Região Leste inativa | Total 2; identificação de região inativa preservada. |
| Somente sem região | Total 3; ranking e série visíveis; cartão regional sem barras e indicador “Sem região: 3”. |
| Casa Azul + Norte | Total 0; mensagem de ausência de registros, sem gráficos. |
| Datas invertidas | Mensagem de validação, sem nova chamada à API. |
| Atualizar após editar data sem aplicar | Repete o período previamente aplicado; não envia o rascunho. |

As opções dos dois catálogos foram carregadas pelos botões “Buscar”. A busca textual refinada e falhas específicas dos catálogos não foram ensaiadas; seus caminhos foram inspecionados. A paginação permaneceu em uma página, com cinco bens; avanço entre páginas não foi exercitado.

## 6. Estados, teclado, responsividade e recolhimento

| Estado | Comportamento confirmado |
| --- | --- |
| Carregando | Resposta atrasada artificialmente; mensagem de carregamento, botões Aplicar/Atualizar desabilitados, sem números antigos. |
| Vazio | Total 0 e aviso de que ausência de eventos não comprova ausência de visitas; sem gráficos. |
| Desativado | Formulário preservado, “Métricas ainda não habilitadas”, nenhum gráfico. |
| Erro HTTP 503 | Alerta de impossibilidade de consultar, sem estimativa de total; opção de tentar novamente. |
| DTO incoerente | Mesmo estado de erro; nenhum total falso apresentado. |
| Recuperação | Nova atualização com resposta válida restitui os três gráficos. |

“Consultar visualizações” é ativável por Enter e abre a seção. Antes de abrir não ocorreu consulta V2. “Recolher visualizações” muda `aria-expanded` para `false`, desmonta gráficos e filtros e não emite nova consulta. O cleanup do componente aborta a requisição pendente; no ensaio, a resposta atrasada não reabriu nem repovoou a seção. Ao reabrir, ocorreu nova consulta, página 1 e período padrão 06/10 a 04/11, sem preservar os filtros anteriores. Esse botão não muda flags nem desativa coleta.

Tab percorreu datas, resumo expansível, buscas, seletores, ações, três SVGs e três regiões de tabela, saindo da seção sem aprisionamento. Enter operou abertura/recolhimento e expansão dos filtros. Setas nos três gráficos mostraram valores coerentes: Casa Azul=7, 01/11=7 e Centro=8. Controles, SVGs e tabelas apresentaram contorno de foco; o seletor de data nativo inclui subfocos internos do Chrome. Não foi realizado ensaio com leitor de tela nem certificação integral de acessibilidade.

| Viewport | Largura do documento | Largura/conteúdo de cada gráfico | Resultado |
| --- | --- | --- | --- |
| 1440 px | 1430 px | 454/454 px | Grade em duas colunas; três gráficos disponíveis. |
| 390 px | 380 px | 322/322 px | Uma coluna; filtros e ações acomodados. |
| 320 px | 310 px | 252/252 px | Uma coluna; botões quebram linha e textos se ajustam. |

Não houve overflow horizontal do documento, dos gráficos ou das tabelas nos três tamanhos. A diferença de 10 px do documento corresponde à área da barra de rolagem. Tabelas longas têm rolagem vertical própria, limitada a 330 px; as linhas finais podem ficar abaixo da área capturada. Nomes compridos dos eixos são abreviados intencionalmente, com texto completo na tabela/tooltip. O ensaio utilizou Chrome headless `156.0.8078.79`, viewport de altura 1000 px e escala 1; as larguras mobile não equivalem a testar aparelhos físicos ou interação por toque.

## 7. Evidências locais e limitações

Execução final: 23 registros de verificação, 28 capturas, nenhuma exceção JavaScript capturada. Resultados e DTOs contêm somente dados sintéticos. Não foram armazenados tokens, credenciais reais ou exportações de banco.

| Evidência | Arquivos |
| --- | --- |
| Três gráficos desktop | [Visão longa 1440](../../.cache/c11/v2_1440.png); capturas na área visível: [ranking](../../.cache/c11/v2_1440_grafico_1.png), [série](../../.cache/c11/v2_1440_grafico_2.png), [regiões](../../.cache/c11/v2_1440_grafico_3.png). |
| Mobile 390 | [Ranking](../../.cache/c11/v2_390_grafico_1.png), [série](../../.cache/c11/v2_390_grafico_2.png), [regiões](../../.cache/c11/v2_390_grafico_3.png); [layout completo](../../.cache/c11/v2_390.png). |
| Mobile 320 | [Ranking](../../.cache/c11/v2_320_grafico_1.png), [série](../../.cache/c11/v2_320_grafico_2.png), [regiões](../../.cache/c11/v2_320_grafico_3.png); [layout completo](../../.cache/c11/v2_320.png). |
| Filtros | [Período](../../.cache/c11/filtro_periodo.png), [patrimônio](../../.cache/c11/filtro_patrimonio.png), [região](../../.cache/c11/filtro_regiao.png), [sem região](../../.cache/c11/filtro_sem_regiao.png). Região na área visível: [ranking/série](../../.cache/c11/filtro_regiao_grafico_1.png), [série](../../.cache/c11/filtro_regiao_grafico_2.png), [regional](../../.cache/c11/filtro_regiao_grafico_3.png). |
| Estados | [Desativado](../../.cache/c11/desativado.png), [carregando](../../.cache/c11/carregando.png), [vazio](../../.cache/c11/vazio.png), [erro](../../.cache/c11/erro.png), [DTO inválido](../../.cache/c11/invalido.png), [recolhido](../../.cache/c11/recolhido.png). |
| Verificações e contratos | [resultado.json](../../.cache/c11/resultado.json), [contratos.json](../../.cache/c11/contratos.json), [ensaio temporário](../../.cache/c11/ensaio_visual.mjs). |

Limitação de captura: imagens longas do Chrome podem omitir a pintura dos SVGs fora do viewport, apesar de eles existirem e responderem ao teclado. Por isso foram acrescentadas capturas individuais com cada gráfico na área visível, sem modificar CSS ou implementação. As imagens longas servem também para conferir formulário, distribuição e tabelas; para comprovar o desenho dos gráficos, preferir os arquivos `*_grafico_*.png`. As capturas `tooltip_*.png` são complementares; a correspondência dos tooltips foi registrada no JSON antes da rolagem da captura.

A primeira tentativa do executor temporário falhou ao resolver a entrada virtual com separadores Windows; o registro permanece em `.cache/c11/falha.json`. O problema foi corrigido somente no executor descartável. As execuções posteriores concluíram as verificações; a última acrescentou as capturas mobile individuais. Não houve mudança no código do portal para viabilizar capturas.

O modo demonstrativo informa cobertura `NAO_INSTRUMENTADA`. A apresentação de cobertura operacional `SONDAGEM_5_MIN`, retenção real, ingestão/deduplicação pública, autenticação real, consultas SQL e flags efetivas do ambiente não foram validadas em execução. A verificação não dependeu de coleta pública nem garante funcionamento de infraestrutura não exercitada. Fontes externas bloqueadas podem causar diferença tipográfica em relação ao portal publicado.

Os arquivos de `.cache/` são locais e ignorados pelo Git; não integram uma publicação deste relatório. Vite/Chrome foram encerrados; nenhuma outra etapa funcional foi iniciada.

## 8. Diagnóstico e recomendações

**Desativação intencional:** resposta `disponivel=false`, com mensagem própria, filtros presentes e gráficos ausentes. É a explicação implementada para o comportamento informado pelo usuário. Não é evidência de gráficos quebrados.

**Ausência de registros:** consulta disponível com total zero produz outro aviso. A interface não transforma ausência de dados em audiência zero. **Defeito/indisponibilidade:** falha HTTP ou DTO incoerente gera alerta de erro e permite nova tentativa, também sem inventar totais.

Não foi identificado defeito funcional nos três gráficos nos cenários exercitados. Recomenda-se manter as flags reais como estão nesta etapa. Qualquer futura habilitação exige decisão separada sobre coleta e consulta; não é necessária para demonstrar a interface. Uma homologação futura de infraestrutura deverá cobrir autenticação, SQL e cobertura operacional em ambiente expressamente autorizado. Não foram implementadas correções, Acessos Gerais ou Favoritos Globais.
