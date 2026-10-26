# D4 — Auditoria do acervo antes do Dashboard V1

Data: **25/10/2026**, America/Sao_Paulo. Base de código: `d204f98`, branch `development/backend`; árvore de trabalho inicialmente limpa.

**Parecer: é possível iniciar a implementação do Dashboard V1 após revisão deste relatório.** O PostgreSQL dispõe dos quatro conjuntos de dados necessários. A API administrativa já agrega publicação e categoria principal, mas precisa de agregações específicas de conservação e região. A definição do universo de contagem deve preceder a implementação: **36 registros físicos, 34 identidades canônicas ou 33 publicados** produzem resultados diferentes. Nenhum dashboard foi implementado nesta auditoria.

## 1. Escopo e evidências

O destino foi conferido antes e depois da conexão: PostgreSQL **18.6**, banco `patrimonio_guarulhos`, endpoint local na porta **5432**. A sessão usou `default_transaction_read_only=on`; a fotografia foi consultada em `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, com `transaction_read_only=on` confirmado, e encerrada com `ROLLBACK`. Foram consultados dados de domínio, constraints, migrations e apenas os metadados necessários da auditoria D1C. Credenciais e dados de autenticação não integram este relatório.

Foram comparados os dados com a fonte canônica, os aliases de identidade, o manifesto D1C e o [plano de organização editorial](organizacao-editorial-dry-run.json), indicado pelo responsável como fonte das 38 propostas D4A. A inspeção incluiu arquivos locais de mídia, rotas, serviços, schemas e consumidores frontend. Os schemas existentes foram usados em memória para conferir os registros lidos; nenhum importador foi executado.

**Limites:** não foram executados testes automatizados, lint, build, Vite, Docker, migrations, seeds, importações, login, requisições HTTP à API ou operações de escrita no banco. As regras de acesso e os contratos foram examinados no código, sem certificação de execução ponta a ponta. URLs documentais externas foram verificadas quanto ao formato, sem consulta de disponibilidade ou nova certificação histórica/geográfica. A única entrega versionável desta etapa é este relatório; auxiliares de leitura ficaram em `.cache/`.

## 2. Quantidades reais e integridade

| Conjunto | Quantidade / resultado |
| --- | --- |
| Patrimônios físicos | **36** |
| Identidades da fonte canônica encontradas | **34 de 34**, nenhuma ausente ou nova a criar |
| Patrimônios publicados / rascunhos / arquivados | **33 / 1 / 2** |
| Categorias / vínculos secundários | **7 / 16** |
| Regiões ativas / inativas | **3 / 0** |
| Patrimônios com região / sem região | **34 / 2** |
| Localizações | **35**; todas com par de coordenadas válido numericamente |
| Imagens patrimoniais | **36 vínculos**, cobrindo 35 patrimônios |
| Seções de detalhes / fatos D1C | **183 / 0** |
| Ligações direcionadas | **14** |
| Documentos patrimoniais / rotas / vínculos de rotas | **0 / 0 / 0** |
| Exposições / novidades / heroes no banco | **0 / 16 / 0** |
| Migrations registradas | **9**, concluídas, sem rollback registrado |
| Checksums das nove migrations | Iguais aos respectivos arquivos SQL locais |
| Chaves estrangeiras verificadas | **22**, todas validadas, **0 referências órfãs** |

A conferência de migrations e FKs não equivale a um diff integral do schema. Não houve execução do CLI Prisma nesta etapa.

### 34 versus 36

O planejamento de 36 corresponde ao total físico preservado. A fonte atual contém 34 identidades; as duas entradas adicionais continuam arquivadas em razão de consolidações anteriores:

| Legado preservado | Identidade canônica | Estado atual |
| --- | --- | --- |
| `casarao-da-nossa-historia` | `casa-jose-mauricio` | ARQUIVADO; região Centro; número e ordem nulos |
| `casarao-do-sitio-ponte-alta` | `casarao-da-familia-albertis` | ARQUIVADO; região São João / Bonsucesso; número e ordem nulos |

A comparação utilizou os aliases explícitos de [identidade-carga.js](../prisma/identidade-carga.js); gerar slugs somente a partir dos títulos atuais produziria falsas ausências. Os 34 canônicos resolvem para 34 registros distintos. Não há dois bens canônicos faltando. O único canônico em rascunho é **Antigo Poço Municipal** (`antigo-poco-municipal`); sua identificação/localização ainda exige validação documental, conforme as ressalvas da fonte.

### Campos, números e ordens

Não foram encontrados slugs duplicados, campos obrigatórios patrimoniais vazios ou violações dos schemas de cadastro nos 36 registros. Nome, descrição, resumo, história e importância cultural estão preenchidos. As 183 seções possuem título e texto. Ausência de fatos D1C é deliberada: o manifesto aprovado contém zero fatos, não um lote incompleto.

Os **33 publicados têm números e ordens de 1 a 33**, sem lacunas, duplicações ou valores fora dos limites. O rascunho e os dois arquivados têm número e ordem nulos, como previsto. IDs, slugs, status, regiões, números e ordens dos **36 itens coincidem integralmente** com a seção `editorial` do plano. Empate de ordem é permitido pelo modelo, embora não exista nesta fotografia; número é único globalmente, inclusive entre status.

Datas de publicação estão preenchidas nos 33 públicos. Campos opcionais nulos nos três não publicados não constituem falha de preenchimento obrigatório. Todos os publicados têm localização, coordenadas, imagem e uma capa. O legado Ponte Alta é o único sem localização e imagem; está arquivado. Não foram encontradas múltiplas capas por patrimônio nem textos alternativos vazios nas imagens existentes.

### Localização: diferenças que exigem revisão

Há **34 localizações em Guarulhos e uma em São Paulo**, todas com UF SP. A exceção é o Parque Ecológico do Tietê, com referência de acesso ao núcleo Engenheiro Goulart; ela já consta da fonte e não deve ser convertida automaticamente para Guarulhos. Os 33 publicados podem fornecer pontos ao mapa, mas validade numérica não comprova precisão cartográfica. Coordenadas de manifestações imateriais, territórios e sítios amplos devem ser entendidas segundo suas ressalvas documentais.

Foram encontradas divergências entre a fonte canônica e o cadastro atual em **três patrimônios**, sem divergência nos campos textuais principais ou na situação de conservação dos 34 canônicos:

| Patrimônio | Fonte canônica | Banco atual |
| --- | --- | --- |
| Estação Ferroviária | Praça Prefeito Paschoal Thomeu, s/n; CEP 07011-040; `-23.4543, -46.5333` | Avenida Antônio de Souza, 186; CEP 07013-090; `-23.4727437, -46.5271101` |
| Casa Amarela | Avenida Antônio de Souza, 186; CEP 07013-090; `-23.4731, -46.5273` | Praça Pref. Paschoal Thomeu, s/n; CEP 07024-001; `-23.4728908, -46.5300118` |
| Locomotiva Maria Fumaça | CEP 07011-040; `-23.4544, -46.5328` | CEP 07040-030; `-23.4735632, -46.5309105` |

**Não se conclui que a fonte seja mais correta que o banco.** É necessário conferir a aprovação das edições posteriores e a coerência com os textos de detalhe antes de qualquer reconciliação. A Casa Amarela, por exemplo, mantém texto documental que menciona o cadastro Avenida Antônio de Souza, 186, enquanto seu endereço estruturado atual é outro. Um sync futuro não deve sobrescrever silenciosamente essas diferenças. A divergência de conteúdo/localização é independente do hash de bytes da fonte D1C.

### Situação de conservação

| Situação | Todos os 36 | Canônicos 34 | Publicados 33 |
| --- | ---: | ---: | ---: |
| PRESERVADO | 29 | 28 | 27 |
| DEMOLIDO | 7 | 6 | 6 |
| EM_RESTAURACAO | 0 | 0 | 0 |
| NECESSITA_RESTAURACAO | 0 | 0 | 0 |
| EM_RUINAS | 0 | 0 | 0 |
| NAO_INFORMADO | 0 | 0 | 0 |

Os enums estão válidos e concordam com a fonte nos canônicos. Isso não certifica o estado físico atual: o texto da Estação registra perda parcial e sinais históricos de vandalismo, apesar do enum PRESERVADO; os quatro bens imateriais também usam PRESERVADO. Recomenda-se revisar editorialmente o significado da métrica antes de apresentá-la como diagnóstico técnico de conservação. Não reclassificar automaticamente.

## 3. Categorias, regiões e filtros

### Categorias

| Categoria | Principal: todos | Principal: publicados | Vínculos secundários | Filtro público: principal ou secundária |
| --- | ---: | ---: | ---: | ---: |
| Arquitetônico | 25 | 22 | 0 | 22 |
| Imaterial | 4 | 4 | 0 | 4 |
| Ferroviário | 0 | 0 | 3 | 3 |
| Industrial | 1 | 1 | 0 | 1 |
| Educacional | 0 | 0 | 3 | 3 |
| Ambiental | 6 | 6 | 0 | 6 |
| Histórico | 0 | 0 | 10 | 10 |
| Total | **36** | **33** | **16** | **49 ocorrências**, não 49 bens |

Todos têm categoria principal válida. Não há repetição da principal entre as secundárias, referência órfã ou duplicidade do par patrimônio/categoria. As 16 associações secundárias pertencem a publicados.

O backend, em [patrimonioService.js](../src/services/patrimonioService.js), combina principal **OU** secundária; aceita nome ou slug sem diferenciar maiúsculas, e cruza esse grupo com busca e demais filtros. Uma listagem retorna cada patrimônio uma vez. O frontend achata as categorias em `categorias`, e `filtrarPatrimonios` também considera principal ou adicional. Portanto Ferroviário, Educacional e Histórico funcionam no catálogo, mesmo tendo zero classificações principais.

Há uma diferença relevante para o dashboard: `dashboardService.js` conta **apenas a categoria principal**, e atualmente nem emite as categorias com zero principais. Os contadores públicos de categorias incluem secundárias. Essa diferença deve ser explicitada na interface e no contrato; não interpretar somas de associações como total de patrimônios.

### Regiões

| Região | Todos | Canônicos | Publicados |
| --- | ---: | ---: | ---: |
| Centro | 23 | 22 | 21 |
| São João / Bonsucesso | 7 | 6 | 6 |
| Cantareira | 4 | 4 | 4 |
| Sem região | 2 | 2 | 2 |
| Total | **36** | **34** | **33** |

As três regiões estão ativas. Não há região órfã, vínculo com região inativa ou divergência em relação ao plano. Cultura e Presença Indígena e Parque Ecológico do Tietê estão sem região **intencionalmente**, conforme o próprio plano. Não é autorização para deduzir região pelo bairro ou pelas coordenadas.

Região é uma relação opcional diretamente em Patrimonio, não uma propriedade de Localizacao. O filtro da API usa seu slug; a página pública também filtra `item.regiao?.slug`. Os dois sem região aparecem em “todas”, mas não em uma região específica. O contrato atual não possui um filtro dedicado para selecionar somente os sem região.

`GET /api/regioes` lista apenas regiões ativas. Já o filtro e o objeto regional de um patrimônio não exigem `ativo=true`; se uma região vinculada for inativada futuramente, os vínculos permanecem, mas a opção deixa o catálogo de regiões. É um cenário a validar na futura entrega, não uma inconsistência atual. As divisões editoriais Centro/Cantareira/São João–Bonsucesso não foram certificadas como limites administrativos oficiais.

### Busca e detalhes

Os contratos de paginação (`data.itens`, `data.paginacao`), categorias adicionais, região, número, ordem, imagens e detalhe são compatíveis na leitura estática. O adaptador frontend converte Decimal para número, mantém o slug como identificador público e conserva o UUID separadamente. A páginação pública usa limite 100, aceito pelo backend; detalhes expõem apenas destinos relacionados publicados e não legados consolidados.

A busca local do frontend cobre nome, bairro, endereço e prefixo de CEP, normalizando acentos. A busca `busca` do backend cobre nome, resumo, descrição, história, importância cultural, detalhes e categorias, com comparação sem diferenciar maiúsculas. **Os conjuntos pesquisados e a normalização de acentos não são equivalentes.** Isso não quebra o transporte dos dados, mas deve ser considerado antes de transferir filtros locais para a API ou afirmar que ambos produzem resultados idênticos.

## 4. Conteúdos editoriais e mídias

**Exposições:** zero registros no banco. Não há exposição com referência inválida, mas também não há conteúdo real para validar publicação, imagem ou apresentação dessa seção. A API pública deve retornar lista vazia; o frontend só usa exemplos em desenvolvimento quando ocorre falha de rede, não diante de resposta vazia bem-sucedida. A ausência requer decisão editorial se a seção deve compor a entrega pública.

**Novidades:** 16 registros, todos PUBLICADO, sendo **4 NOTICIA e 12 EVENTO**. Não há slug duplicado ou campo obrigatório ausente; os 16 passaram pela validação em memória do schema atual, incluindo datas, CTA e fontes. Todas têm data de publicação, CTA e pelo menos uma fonte: **26 referências documentais** no total. As quatro notícias têm resumo e imagem; os 12 eventos não têm imagem, o que é permitido pelo contrato e pelo uso de blocos de data. Não classificar esses nulos como arquivos perdidos.

As datas vão de **03/09/2026 a 12/12/2026**. Em relação a 25/10/2026, cinco eventos têm data inicial anterior e sete posterior. A API filtra por status/tipo, não por “evento futuro”, e ordena data decrescente. A data isolada não permite declarar que um evento de vários dias terminou. Definir editorialmente se a seção deve manter um histórico ou distinguir agenda futura antes de alterar essa mecânica.

**Mídias:** os **40 vínculos de imagem presentes** (36 patrimoniais e quatro de novidades) apontam a arquivos existentes no diretório local de uploads. Uma URL patrimonial é compartilhada por dois vínculos (`casarao_nossa_historia.jpg`); compartilhamento não é referência órfã nem prova de duplicidade editorial. Existem 35 URLs patrimoniais distintas. Não foram avaliados qualidade visual, resolução, direitos de uso ou entrega HTTP. Não há documentos patrimoniais para verificar downloads ou links dessa funcionalidade; referências históricas presentes em textos não equivalem a registros da tabela de documentos.

### Regras de acesso verificadas no código

| Recurso | Regra implementada |
| --- | --- |
| Listas/detalhes públicos patrimoniais | Apenas PUBLICADO; detalhe não expõe destino de relação em rascunho/arquivado ou legado consolidado |
| Listas públicas de exposições/novidades | Apenas PUBLICADO; autoria administrativa retirada do DTO público |
| Consulta administrativa | Autenticação e papel ADMIN ou EDITOR; pode consultar outros status |
| Edição de patrimônio/conteúdo | EDITOR restrito a rascunhos; ADMIN pode administrar demais status |
| Publicação/arquivamento | ADMIN |
| Administração das regiões | Escrita restrita a ADMIN; seleção de região nova exige região ativa |
| Dashboard administrativo | `GET /api/admin/dashboard`, ADMIN ou EDITOR |
| Mídias vinculadas em uploads | Públicas se algum vínculo estiver PUBLICADO; nos demais casos exigem usuário ativo ADMIN/EDITOR; arquivo sem vínculo é recusado |

O DTO de novidades serializa `data`, `bloco`, `cta` e `fontes` no formato consumido pelo frontend; a resolução de `/uploads/` também é compatível. Permissões de mutação, transições concorrentes, upload, retirada de mídia e resposta 401/403/404 permanecem para validação executável autorizada em ambiente descartável. Nenhuma dessas operações foi exercitada no banco real nesta auditoria.

## 5. Relacionamentos — D4A

As **14 ligações atuais** têm os mesmos pares direcionados, textos e ordens do [manifesto D1C](../prisma/data/patrimonioEditorialCurado.js). Há 14 registros da ação de auditoria D1C consultada. Não há autorrelação, duplicidade origem/destino, colisão de ordem por origem ou ponta inexistente. Todas as pontas estão publicadas e os 14 vínculos são elegíveis para apresentação pública. Nenhuma relação foi alterada.

Comparação com `ligacoesPropostas` do plano:

| Resultado | Quantidade |
| --- | ---: |
| Propostas / pares direcionados distintos | **38 / 38** |
| Pares já existentes no banco | **11** |
| Desses, texto proposto diferente do D1C atual | **11** |
| Propostas de pares novos | **27** |
| Relações existentes ausentes da proposta | **3** |
| Propostas marcadas como aprovadas | **0** |
| IDs/slugs divergentes ou pontas inexistentes | **0** |
| Autorrelações / duplicatas internas | **0 / 0** |

Os 11 pares coincidentes já possuem aprovação **D1C para seus textos atuais**, não aprovação para os textos substitutos D4A. As três ligações fora da proposta também devem ser preservadas: **Igreja de Bonsucesso → Dia da Carpição; Antigo Paço → Praça Getúlio Vargas; Praça Getúlio Vargas → Antigo Paço**. A proposta não é uma lista de substituição do acervo.

Todas as 38 entradas possuem `aprovada: false`. São 23 `JUSTIFICAR_VINCULO_ALEM_DO_EIXO` e 15 `VALIDAR_VINCULO_ESPECIFICO`; entre as **27 novas**, a divisão é **23 + 4**. As propostas não trazem ordem final para persistência. Mesmo após eventual aprovação, será necessário revisar cada direção e escolher ordens livres sem deslocar as existentes.

### Matriz das 38 propostas

“Linha” refere-se a `linhaPlanilha` no JSON indicado. “Existente” significa preservar o vínculo e o texto D1C; os textos propostos nessas 11 linhas divergem. “Novo” significa pendência editorial, não autorização de inserção. Os nomes abreviados identificam os slugs completos na fonte vinculada.

| Linha | Origem → destino | Resultado |
| --- | --- | --- |
| 2 | Cultura Indígena → Lavras Velhas | Novo |
| 3 | Lavras Velhas → Casa da Candinha | Novo |
| 4 | Casa da Candinha → Cultura Indígena | Novo |
| 5 | Antiga Matriz → Catedral | Existente |
| 6 | Catedral → Antiga Matriz | Existente |
| 7 | Primitiva Igreja do Rosário (1717) → Igreja do Rosário | Novo |
| 8 | Igreja do Rosário → Primitiva Igreja do Rosário (1717) | Novo |
| 9 | Igreja de Bonsucesso → Festa de Bonsucesso | Existente |
| 10 | Festa de Bonsucesso → Igreja de Bonsucesso | Existente |
| 11 | Festa de Bonsucesso → Dia da Carpição | Existente |
| 12 | Dia da Carpição → Festa de Bonsucesso | Existente |
| 13 | Dia da Carpição → Igreja de Bonsucesso | Existente |
| 14 | Capela do Macedo → Igreja do Bom Jesus da Cabeça | Novo |
| 15 | Igreja do Bom Jesus da Cabeça → Capela do Macedo | Novo |
| 16 | Cemitério São João Batista → Catedral | Novo |
| 17 | Estação → Casa Amarela | Existente |
| 18 | Casa Amarela → Estação | Existente |
| 19 | Estação → Locomotiva | Existente |
| 20 | Locomotiva → Estação | Existente |
| 21 | Adamastor → Carbonell | Novo |
| 22 | Carbonell → Adamastor | Novo |
| 23 | Antigo Paço → Sanatório Padre Bento | Novo |
| 24 | Casa José Maurício → Casarão Lima | Novo |
| 25 | Casarão Lima → Casa José Maurício | Novo |
| 26 | Albertis → Saraceni | Novo |
| 27 | Saraceni → Albertis | Novo |
| 28 | Casa José Maurício → Albertis | Novo |
| 29 | Capistrano de Abreu → Conselheiro Crispiniano | Novo |
| 30 | Conselheiro Crispiniano → Capistrano de Abreu | Novo |
| 31 | Dulce Breves Neves → Capistrano de Abreu | Novo |
| 32 | Banda Lira → Conselheiro Crispiniano | Novo |
| 33 | Bosque Maia → Lago dos Patos | Novo |
| 34 | Lago dos Patos → Bosque Maia | Novo |
| 35 | Praça Getúlio Vargas → Bosque Maia | Novo |
| 36 | Bosque Maia → Praça Getúlio Vargas | Novo |
| 37 | Represa do Cabuçu → Parque Ecológico do Tietê | Novo |
| 38 | Parque Ecológico do Tietê → Represa do Cabuçu | Novo |
| 39 | Lago dos Patos → Praça Getúlio Vargas | Novo |

As propostas por afinidade residencial, demolição ou eixo temático não herdam aprovação histórica. A [curadoria D1C](D1C-curadoria-documental.md) já rejeitara relações fracas desse tipo; é necessário confrontar justificativas, não reintroduzi-las por estarem em outra planilha. A D1C antiga avaliou 27 ligações e aprovou 14; essas 27 originais não devem ser confundidas com as 27 propostas novas identificadas agora.

## 6. Investigação do hash D1C

O importador D1C compara os **bytes de `prisma/patrimonioSeedData.js`** com `FONTE_CANONICA_SHA256` antes de qualquer transação. Não confundir esse hash com `estado_hash`, que inclui manifesto e fotografia editorial do banco, nem com hashes de outros catálogos de pesquisa.

Resultado atual:

| Referência | SHA-256 |
| --- | --- |
| Esperado pelo manifesto D1C | `c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8` |
| Arquivo local canônico | `c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8` |
| Blob do mesmo arquivo em HEAD | `c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8` |
| Mesmo texto convertido apenas em memória para CRLF | `0185b4d995a066be91d4b0a1a5fd2361f0c4a9ff86cefa8ef959d083c35cc5f9` |

**A divergência não é reproduzível na cópia atual.** O índice e a árvore têm LF, e `.gitattributes` fixa LF para a fonte e artefatos D1C; essa proteção já existe no commit `ca937d0`. A experiência em memória demonstra que conversão de quebra de linha basta para alterar o hash sem alterar o texto editorial. Isso é uma explicação tecnicamente possível para falha em outro checkout Windows, mas a causa histórica não está comprovada sem o hash/arquivo exato daquela ocorrência.

Os relatórios locais de dry-run/aplicação D1C também distinguem o hash do estado antes e depois da inserção das 14 relações; mudança de `estado_hash` após uma escrita aprovada é esperada. Não se deve resolver uma falha trocando constantes ou regenerando a fonte. Fonte, manifesto, hashes e configuração Git permaneceram intocados nesta auditoria. Se a falha reaparecer, registrar caminho exato, commit, EOL e hash observado antes de decidir qualquer correção.

## 7. Preparação do Dashboard V1

O [dashboardService.js](../src/services/dashboardService.js) atual executa consultas sequenciais em transação RepeatableRead, marcadas READ ONLY, e entrega `total`, `RASCUNHO`, `PUBLICADO`, `ARQUIVADO`, `porCategoria`, `porBairro` e `meta`. O contrato declara `baseContagem: TODOS_OS_STATUS` e `categoria: PRINCIPAL`.

| Visualização solicitada | Dados no PostgreSQL | API agregada atual | Ajuste futuro identificado |
| --- | --- | --- | --- |
| Donut de conservação | `patrimonio.situacao`, completo nos 36 registros | Não existe `porSituacao` | Agrupar por enum, emitir também valores zero e explicitar o universo |
| Radar por região | `patrimonio.regiao_id` e catálogo de três regiões; dois nulos intencionais | Existe `porBairro`, não `porRegiao` | Agregar pela FK regional, juntar nomes/slugs e representar “Sem região” separadamente ou como eixo explicitamente documentado |
| Barras por categoria | Principal e 16 associações secundárias | `porCategoria` já conta principal de todos os status | Manter semântica explícita; incluir categorias com zero se desejado; eventual série secundária deve contar patrimônios distintos por categoria |
| Donut de publicação | `patrimonio.status` | Pronto: 33 PUBLICADO, 1 RASCUNHO, 2 ARQUIVADO | Consumir campos existentes; não inferir status pelo preenchimento de datas |

`porBairro` não substitui região: os dados têm 17 textos distintos de bairro e um patrimônio sem Localizacao; o serviço acrescenta “Não informado” para fechar o total. O radar regional deve totalizar 36 ao incluir os dois sem região, ou informar claramente base 34 se o gráfico excluir nulos. Não misturar bairros com os três recortes editoriais.

O [AdminDashboard.jsx](../../frontend/src/features/admin/pages/AdminDashboard.jsx) atual **não consome o endpoint de dashboard**: busca patrimônios administrativos e calcula contagens localmente. A V1 deverá integrar o endpoint e conferir o envelope `{ success, data }`; mudanças devem ser aditivas e preservar os campos existentes. Não há necessidade demonstrada de migration para esses quatro gráficos.

Recomendação para revisão: conservar a base administrativa atual de **36 registros, todos os status**, deixando visível que inclui dois legados arquivados. Se o produto pretender representar bens canônicos, definir explicitamente a exclusão desses dois legados, resultando em 34; para uma visualização pública, aplicar o recorte de 33 publicados. Não alterar esse contrato silenciosamente.

## 8. Pendências por prioridade e parecer

| Prioridade | Pendência | Condição / impacto |
| --- | --- | --- |
| **P1 — antes de fechar o contrato V1** | Definir universo 36/34/33, tratamento de “Sem região” e principal versus secundária | Evita gráficos corretos numericamente, mas contraditórios com o catálogo público |
| **P1 — implementação V1 posterior** | Acrescentar agregações de conservação/região e consumir API no frontend | Necessário para entregar os quatro gráficos; não exige alterar o acervo |
| **P1 — revisão editorial** | Reconciliar as diferenças de localização dos três bens ferroviários e a narrativa da Casa Amarela | Impede certificar precisão de mapas/detalhes e exige revisão antes de sync; não bloqueia agregação regional por FK |
| **P1 — antes de qualquer D4A** | Revisar 27 vínculos novos e 11 textos substitutos; preservar os três atuais fora da proposta | Nenhuma das 38 propostas está aprovada; não importar nem substituir automaticamente |
| **P2 — qualidade da métrica** | Revisar o uso de PRESERVADO em remanescentes e bens imateriais | O donut representará o cadastro atual, não laudo de conservação |
| **P2 — homologação funcional autorizada** | Exercitar leitura pública/admin, filtros, estado vazio, acesso às mídias e totais dos gráficos em ambiente descartável | Esta auditoria verificou dados e código, não executou suíte ou navegação HTTP |
| **P2 — conteúdo público** | Decidir sobre exposições vazias, referências patrimoniais e agenda passada/futura | Ausências são reais, mas não violações do schema; não preencher com exemplos de desenvolvimento |
| **P2 — curadoria pendente** | Manter Poço em rascunho até validação; preservar ressalvas geográficas e decisões D1C sobre fatos rejeitados/pendentes | Não publicar ou inventar conteúdo para completar indicadores |
| **P3 — rastreabilidade** | Obter evidência exata caso a divergência histórica de hash reapareça | Hash atual íntegro; não há correção de fonte a aplicar nesta fotografia |
| **P3 — evolução de filtros** | Uniformizar ou documentar diferenças de busca e validar região inativada/sem região | Comportamentos presentes no código, sem alteração nesta etapa |

**Não foi encontrado impedimento estrutural para começar o Dashboard V1.** A entrega dos quatro gráficos depende dos ajustes de API/consumo e das decisões de contagem acima. A D4A e as correções editoriais devem seguir revisão e autorização próprias; não são pré-requisitos para implementar agregações sobre o estado atual. O acervo não pode ser declarado historicamente ou cartograficamente certificado por esta auditoria. Dados, relacionamentos, fontes, manifests e serviços foram preservados; nenhum commit, push ou deploy foi realizado.
