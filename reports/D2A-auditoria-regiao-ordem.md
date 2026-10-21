# D2A — auditoria e desenho de Região + Número + Ordem de Exibição

Data: 16/10/2026. Etapa exclusivamente documental. Nenhum código, schema, migration, catálogo ou dado foi alterado. Banco real não acessado, inclusive para leitura. O único arquivo produzido é este relatório.

**Conclusão:** os três recursos estão ausentes do contrato operacional atual. A equipe implementou região como **enum opcional de Localizacao**, e não como entidade de referência. Número e ordem eram inteiros opcionais, **ambos únicos**; a ordem já afetava as listagens pública e administrativa. Recomenda-se uma nova implementação na linhagem consolidada, com região ligada diretamente a Patrimonio, número opcional único e prioridade opcional que admite empates. As escolhas detalhadas abaixo são propostas para definição da D2B, não implementação nem autorização de deploy.

## 1. Estado atual e pré-condições

### Git e escopo

| Verificação executada antes da auditoria | Resultado |
| --- | --- |
| `git status` | Working tree limpo; branch `development/backend` |
| `git rev-parse HEAD` | `84c8af6a115045d5d13d14370b0caabe9c09ff20` |
| Commit do redesign | `84c8af6` — `feat: estruturação visual de detalhes` |
| Commit D1E anterior | `d51894f091836e0354d6febabf30e1dd66cad694` |
| `git diff --check` | Aprovado |
| Condição de interrupção por redesign não commitado | Não ocorreu |

Fonte canônica preservada: `backend/prisma/patrimonioSeedData.js`. SHA-256 conferido por leitura do arquivo:

```text
c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8
```

Não foram executados testes que conectem a PostgreSQL, Prisma CLI, seed, sync, importador, backup ou migration. A inspeção consistiu em leitura de arquivos, buscas e consultas ao histórico Git. Instruções operacionais encontradas em documentos históricos foram tratadas como documentação, não executadas.

### Persistência e migrations

`backend/prisma/schema.prisma` mantém Patrimonio com UUID, slug único, descrição obrigatória, categoria principal, categorias adicionais, situação, status e autoria. Localizacao é opcional na relação com Patrimonio e tem `patrimonioId` único; o endereço permanece separado em campos na tabela `local`. A aplicação usa PatrimonioDetalhe, PatrimonioFato e PatrimonioLigacao; não há PatrimonioSecao no schema ativo.

Não existem no schema ativo `RegiaoPatrimonio`, `regiaoId`, `numeroExibicao` ou `ordemExibicao`. A árvore selecionada por `backend/prisma.config.js` contém exatamente:

1. `20260929230000_initial_schema`
2. `20260930120000_add_demolido_situacao`
3. `20261005004508_categorias_adicionais`
4. `20261006014922_adicionar_detalhes_e_heroes`
5. `20261006180000_exposicoes_novidades`
6. `20261014010000_add_fatos_ligacoes`

Essa é uma constatação do repositório. **Não é uma nova consulta a `_prisma_migrations`.** O estado informado para o banco real continua sendo a premissa de trabalho: 36 patrimônios físicos, 34 canônicos, dois legados arquivados, seis migrations aplicadas, zero fatos e 14 ligações, sem região/número/ordem. Não houve confirmação operacional desses números nesta D2A. Antes de uma implantação futura, qualquer divergência dessa premissa deverá interromper o procedimento.

### Listagem, ordenação, busca e serialização atuais

| Camada | Comportamento localizado | Evidência |
| --- | --- | --- |
| Listagem pública | `GET /api/patrimonios`, somente PUBLICADO, paginação no servidor | `backend/src/routes/patrimonioRoute.js`, `src/services/patrimonioService.js` |
| Listagem administrativa | `GET /api/admin/patrimonios`, todos os status ou filtro explícito; ADMIN/EDITOR | `backend/src/routes/adminPatrimonioRoute.js` e serviço patrimonial |
| Ordenação das duas listas | `nome ASC, id ASC`, antes de `skip/take`; UUID desempata nomes iguais | `listWithStatus` em `patrimonioService.js` |
| Filtros backend | Categoria por nome/slug, principal ou adicional; situação; bairro; status no Admin | Serviço e `src/schemas/patrimonioSchema.js` |
| Busca backend | Nome, resumo, descrição, história, importância cultural, título/texto dos detalhes, nome/slug das categorias | Serviço patrimonial |
| Paginação backend | `pagina` a partir de 1; `limite` de 1 a 100, padrão 20; retorna `itens` e `paginacao` | Schema Zod e `listWithStatus` |
| DTO público | Select explícito para lista/detalhe; localização separada; detalhes e relações com suas próprias ordens | `publicListSelect`, `publicDetailSelect` |
| Ligações públicas | Destinos PUBLICADO e não legados consolidados; ordem editorial própria; destino por slug | `patrimonioService.js`, `src/utils/identidadeEditorial.js` |
| DTO administrativo | Lista acrescenta status/arquivamento; detalhe inclui escalares e relações necessárias à edição | Serviço patrimonial |
| Normalização frontend | `id` público recebe slug, `uuid` recebe UUID; localização é achatada; `ligacoes` é preservado; campos D2 não são copiados | `frontend/src/services/patrimoniosApi.js` |
| Carregamento frontend | Busca páginas públicas e guarda a sequência recebida no contexto | `patrimoniosApi.js`, `context/PatrimoniosContext.jsx` |
| Listagem visual | Filtra localmente a coleção carregada e pagina em quatro itens; não reordena patrimônios | `pages/Patrimonios/Patrimonios.jsx` |
| Busca visual | Nome, bairro, endereço e prefixo numérico de CEP, com normalização textual; categoria principal/adicionais | `features/buscarPatrimonios.js`, compartilhado com Mapa |
| Página inicial | Destaques são os primeiros itens da coleção: `patrimonios.slice(0, QTD_DESTAQUES)` | `pages/Inicio/Inicio.jsx` |
| Dashboard D1A | Fotografia READ ONLY/RepeatableRead de total, status, categoria principal e bairro; sem agregação regional | `backend/src/services/dashboardService.js` |

A busca local não tem exatamente o mesmo alcance da busca backend. Acrescentar uma dimensão de filtro exige contemplar ambos os caminhos; apenas aceitar uma query nova no servidor não muda a listagem que hoje filtra o contexto em memória. A ordenação das ligações, imagens, detalhes e rotas culturais é independente da ordenação de patrimônios.

### Cadastro e edição atuais

`AdminPatrimonios.jsx` monta explicitamente o estado do formulário e o corpo de POST/PATCH. Busca o detalhe pelo UUID antes da edição. A lista/detalhe passa por `adminApi.js` e `normalizarPatrimonio`; acrescentar campos só no backend faria o frontend descartá-los.

Os schemas Zod são estritos: atualmente os novos campos são rejeitados. O serviço escreve via Prisma diretamente, sem camada de repository separada. Criação nasce RASCUNHO. Edição usa transação e lock do patrimônio: ADMIN edita qualquer status; EDITOR somente RASCUNHO. Publicação revalida o cadastro. O PATCH geral rejeita fatos/ligações; D1E utiliza CRUD dedicado e preserva UUIDs. Nada disso deve mudar na D2B.

A documentação operacional vem de `backend/src/docs/openapi.js`, que importa `paths.js` e `schemas.js`. Documentos históricos ou variantes de documentação não substituem esse contrato.

## 2. Implementação encontrada da equipe

### Proveniência e limites da evidência

Foram consultados os snapshots Git `62d37958d01500eaf44d57bb33c1de5eb18bc1e0` e `cfca90560efff37a1ab8ce098dd16a0b7933df31`, anteriores à reconciliação `aa03a6db480a046987860754e8d58d4beb84aeff`. São estados de integração disponíveis no projeto, não prova de autoria exclusiva de cada linha. Para recuperar comportamento da proposta territorial, o snapshot `62d3795` contém schema, validação, serviços, documentação e testes coerentes entre si.

Fontes secundárias preservadas no working tree:

- `backend/prisma/lineages/README.md` e `backend/prisma/lineages/equipe/migrations/`;
- `backend/docs/classificacao-territorial.md`, explicitamente marcado pela R1 como histórico;
- `backend/src/utils/regiaoPatrimonio.js`, tabela estática de rótulos sem consumidor localizado no código ativo;
- `backend/prisma/data/patrimonios.js`, `seed.patrimonios.js` e `data/reconciliacao.js`;
- `backend/test/deferred/*.reference`, preservados como referência, não como aprovação da implementação atual.

Buscas por `regiaoId` no código/histórico disponível não localizaram implementação anterior desse campo. Não há evidência de uma entidade regional com UUID na proposta recuperada.

### Região: contrato exato recuperado

| Item | Implementação da equipe |
| --- | --- |
| Nome Prisma | `enum RegiaoPatrimonio`, **não `model`** |
| Objeto PostgreSQL | Tipo enum `regiao_patrimonio`, **não tabela** |
| Valores | 13 códigos listados integralmente na seção 4 |
| Campo | `Localizacao.regiao RegiaoPatrimonio?` |
| Coluna física | `local.regiao`, tipo `regiao_patrimonio` |
| Nullable / default | Nullable; nenhum default; migration deixa valores existentes NULL |
| Identidade regional | Sem `id`, slug, descrição, ativo ou datas; não existe `regiaoId` |
| Relação com Patrimonio | Indireta, pela Localizacao 1:1; nenhuma FK regional |
| Constraints | Domínio limitado pelo enum; aceita NULL; sem UNIQUE regional |
| Índices | Migration regional não cria índice |
| Escrita | POST/PATCH patrimonial recebem `localizacao.regiao` |
| Validação | `z.enum(Object.values(RegiaoPatrimonio)).nullable().optional()`; códigos desconhecidos rejeitados com 400 |
| PATCH | Omitir preserva; `null` limpa; sem localização anterior exige endereço e bairro para criar Localizacao |
| Publicação | Região não é requisito |
| Respostas | Código dentro de `localizacao`, ou NULL; `localizacao: null` quando inexistente |
| Endpoints regionais | Nenhum GET/CRUD próprio de regiões encontrado; listas patrimoniais não ganhavam filtro regional |
| Dashboard histórico | `getDashboard` no snapshot `62d3795` agrupa `Localizacao.regiao`, usa rótulos e reúne NULL/ausência de localização em “Não informado”; universo de todos os status |
| Frontend/Admin | Não foi localizado consumidor desses campos em `frontend/src` nos snapshots consultados. Havia contrato backend e rótulos para uma interface futura; não comprova formulário/visual regional implementado |
| Seeds | Documento e testes de referência indicam ausência de atribuição automática de regiões e preservação das classificações existentes |

O dashboard histórico é diferente do dashboard D1A ativo. Não deve ser copiado nem substituir o contrato consolidado. Uma agregação por região futura seria uma extensão independente, não requisito para estes campos.

### Número e ordem: contrato exato recuperado

| Aspecto | `numeroExibicao` | `ordemExibicao` |
| --- | --- | --- |
| Modelo | Patrimonio | Patrimonio |
| Coluna | `patrimonio.numero_exibicao` | `patrimonio.ordem_exibicao` |
| Tipo | Prisma `Int?` / PostgreSQL INTEGER | Prisma `Int?` / PostgreSQL INTEGER |
| Nullable | Sim | Sim |
| Default / geração | Nenhum; sem sequence/autoincrement | Nenhum; sem sequence/autoincrement |
| Validação Zod | Inteiro entre 1 e 2147483647; NULL/omitido permitidos | Inteiro entre 0 e 2147483647; NULL/omitido permitidos |
| CHECK SQL | `numero_exibicao > 0` | `ordem_exibicao >= 0` |
| Limite SQL superior | Limite natural de INTEGER | Limite natural de INTEGER |
| UNIQUE | `patrimonio_numero_exibicao_key` | `patrimonio_ordem_exibicao_key` |
| Escopo UNIQUE | Global, inclusive registros arquivados; múltiplos NULL permitidos | Global, inclusive arquivados; múltiplos NULL permitidos |
| POST/PATCH | Campo opcional; omissão preserva no PATCH e NULL limpa | Campo opcional; omissão preserva no PATCH e NULL limpa |
| DTO | Público e administrativo; também selecionado no destino de ligação no código histórico | Público e administrativo |
| Ordenação | Não era chave de ordenação pública por si só | Primeira chave das listas pública e administrativa, ASC NULLS LAST; depois nome e UUID |
| Uso além da apresentação | Seed/reconciliação utilizavam número como chave de correspondência com catálogo antigo | Seed impunha posição única do array de origem |

Logo, não eram campos apenas internos ao Admin. A ordem influenciava o resultado público e o número era exposto na API, embora não tenha sido localizado seu consumo visual no frontend auditado.

### Origem da numeração e testes históricos

`backend/prisma/data/patrimonios.js` se apresenta como cópia da pesquisa. `seed.patrimonios.js` referencia o mock original em `portal-PrefGuarulhos/frontend/src/features/mocks/patrimoniosMock.js` e confere `SOURCE_SHA256`. O teste de referência `seed.patrimonios.test.js.reference` explicita a transformação: `numeroExibicao = Number(p.id)` e `ordemExibicao = index` do array. Isso comprova origem no catálogo/mock, não numeração oficial documental.

A sequência numérica do catálogo é `1..27, 32, 33, 28, 29, 30, 31, 34`. Exemplos: Lago dos Patos tem número 32/ordem 27; Antigo Poço 33/28; Saraceni 28/29. Portanto número e ordem já eram conceitos distintos. O seed valida unicidade e contiguidade da ordem de seu catálogo; a API/coluna escalar, por sua vez, não exige que todas as ordens globais sejam contíguas.

O catálogo de 34 entradas da equipe não representa as mesmas 34 identidades canônicas: inclui Casarão da Nossa História como entrada 13, hoje alias de Casa José Maurício; não inclui a ficha canônica da Primitiva Igreja do Rosário de 1717. Não se deve reutilizar números como identificadores nem copiar o array por igualdade de contagem.

Evidências de testes encontradas, **não reexecutadas nesta auditoria**:

- No snapshot `62d3795`, `adminPatrimonio.test.js` testa todos os códigos regionais, NULL/omissão, inválidos, preservação de outros campos, criação de localização e permissões; `adminPatrimonio.integration.test.js` cobre persistência/DTOs públicos e admin.
- `docs.test.js` histórico verifica enum nullable e `x-enum-labels`; `patrimonio.test.js` e testes administrativos verificam seleção/ordenação, limites e persistência dos inteiros.
- `test/deferred/seed.patrimonios.test.js.reference` documenta a derivação dos números/ordens e a preservação da região; a versão `.integration.test.js.reference` cobre catálogo, paginação, colisões e reconciliação.
- `test/deferred/dashboard.integration.test.js.reference` cobre contagem por região, NULL e registros sem localização.

## 3. Diferenças e linhagens de migrations

| Tema | Consolidado atual | Equipe | Recomendação D2B |
| --- | --- | --- | --- |
| Região | Ausente | Enum em Localizacao | Entidade de referência e FK opcional diretamente em Patrimonio |
| Taxonomia | Nenhuma ativa | 11 referências UPR + duas áreas especiais | Catálogo inicialmente vazio; preenchimento só após validação |
| Número | Ausente | Opcional, positivo, único, derivado de ID antigo | Opcional, positivo, único; atribuição editorial independente |
| Ordem | Nome/UUID | Inteiro opcional único precede nome/UUID | Prioridade opcional não única precede nome/UUID |
| Descrição | Obrigatória | Migration de pesquisa a tornou nullable; reconciliação voltou a obrigatória | Continuar obrigatória |
| Seções | PatrimonioDetalhe | Tabela paralela PatrimonioSecao | Não introduzir nem duplicar |
| Fatos/ligações | CRUD D1B + conteúdo curado D1C | Carga de pesquisa com 83 fatos/27 ligações | Preservar D1B/D1C/D1D/D1E; nenhuma carga |
| Localização | Campos separados e política C3 | Região vinculada ao endereço | Classificação não é endereço, coordenada ou destino de rota |

As três migrations históricas ficam exclusivamente em `backend/prisma/lineages/equipe/migrations/`:

| Migration | Efeito documental | Por que não aplicar ao consolidado |
| --- | --- | --- |
| `20261005230000_add_pesquisa_patrimonios` | Acrescenta dois inteiros e índices únicos; torna descrição nullable; cria seções, fatos e ligações | Recria tabelas D1B existentes e reintroduz escopo/semântica rejeitados |
| `20261013180000_add_regiao_patrimonio` | Cria enum e `local.regiao` nullable, sem preenchimento | Modelo territorial diferente da entidade aprovada |
| `20261014120000_reconcile_d1b_forward` | Valida dados existentes, ajusta limites de fatos/ligações e descrição NOT NULL; preserva região, números e seções históricos inativos | Compatibilidade específica com estruturas da equipe; duplicaria ajustes/constraints no consolidado |

A R1 documenta que migrations da equipe foram implantadas em outro ambiente relevante. Seus SQLs não podem ser reescritos. `prisma.equipe.config.js` seleciona a linhagem própria, exige `EQUIPE_DATABASE_URL` e recusa `patrimonio_guarulhos`. A proposta D2B deste relatório vale **somente para a linhagem consolidada de seis migrations**. Converter enum/valores de um ambiente da equipe para uma entidade exigiria outro preflight e outra estratégia forward-only; não está implicitamente resolvido aqui.

## 4. Taxonomia encontrada

Transcrição exata dos códigos e rótulos em `backend/docs/classificacao-territorial.md` e `backend/src/utils/regiaoPatrimonio.js`; os códigos também constam no SQL regional histórico:

| Código | Rótulo |
| --- | --- |
| CENTRO | Centro |
| VILA_GALVAO | Vila Galvão |
| TABOAO | Taboão |
| SAO_JOAO | São João |
| CUMBICA | Cumbica |
| PIMENTAS | Pimentas |
| BONSUCESSO | Bonsucesso |
| CABUCU | Cabuçu |
| TANQUE_GRANDE | Tanque Grande |
| CAPELINHA | Capelinha |
| JAGUARI | Jaguari |
| AEROPORTO | Aeroporto |
| PARQUE_ESTADUAL_CANTAREIRA | Parque Estadual da Cantareira |

“Não informado” era apresentação de NULL, não uma décima quarta região.

O documento chama os primeiros onze códigos de “UPRs adotadas como referência pelo projeto” e os dois últimos de “áreas especiais incluídas na classificação do portal”. Isso caracteriza uma **classificação híbrida de referência territorial e agrupamento próprio do portal**. Não permite certificar que a lista inteira seja uma divisão oficial em bairros, regiões administrativas, macrozonas ou distritos.

Não foi localizada nesse documento/utilitário/migration fonte oficial, ato, versão cartográfica, delimitação ou critério para resolver sobreposição entre as áreas especiais e as demais regiões. A evidência local explica a intenção, mas não valida a taxonomia externamente.

**TAXONOMIA DE REGIÃO PENDENTE DE VALIDAÇÃO**

Antes de cadastrar valores, definir documentalmente: denominação e natureza territorial; fonte oficial ou justificativa editorial explícita; versão/data; fronteiras ou critérios de atribuição; tratamento de bens extensos/imateriais e de áreas sobrepostas. Não atribuir região automaticamente por bairro, nome, CEP ou coordenada. Uma única FK permite no máximo uma classificação por patrimônio: casos que atravessem regiões exigem decisão editorial, podendo permanecer NULL. Não se propõe relação multirregional nesta etapa.

Nenhuma região nova foi criada, nem mesmo slugs candidatos derivados desta lista. A lista histórica não é uma carga aprovada.

## 5. Riscos identificados

| Risco | Tratamento proposto |
| --- | --- |
| Aplicar linhagem errada e recriar fatos/ligações | Nova migration apenas após as seis do consolidado; bloquear histórico inesperado |
| Associar classificação a endereço de bem imaterial | FK no patrimônio; região não entra em endereço, geocodificação ou decisão C3 |
| Converter ID antigo em número público | Não importar numeração; UUID/slug continuam identidades; atribuição editorial revisada |
| Atribuir mesma numeração a alias/legado | Não preencher os 36 registros em lote; número não consolida nem reativa identidades |
| Confundir número com prioridade | Labels, DTOs e testes distintos; não ordenar por número como fallback |
| UNIQUE global da ordem tornar trocas concorrentes frágeis | Recomenda-se prioridade não única com desempate; não adotar reordenação posicional por acidente |
| Número único reservado por arquivado | Regra deve ser explícita; não reutilizar automaticamente e não revelar dados privados em erro público |
| Alterar destaques da página inicial sem perceber | Testar/documentar efeito de `Inicio.jsx`; prioridade vale para a coleção pública compartilhada |
| Duplicar sorting no navegador ou só ordenar a página atual | Backend ordena antes da paginação; frontend preserva sequência recebida |
| Variação entre consultas paginadas durante edições | Desempate resolve empates, não cria fotografia entre requisições; testar estado estável e recarregar lista após salvar |
| Novos campos descartados ou zerados pelo formulário | Normalização explícita; omissão preserva; NULL limpa; ordem zero válida; vazio não vira zero |
| Testes R1 rejeitarem deliberadamente a nova D2B | Atualizar somente expectativas dos recursos agora aprovados; manter barreiras de fatos/ligações/seções e hashes históricos |
| Reaproveitar hash antigo de sync após mudança de schema/estado | Não reutilizar aprovações operacionais antigas; obter nova fotografia quando houver operação futura autorizada |

`sync-patrimonios.js` lê os escalares patrimoniais junto das relações e os incorpora ao `estado_hash`; novos campos podem mudar essa fotografia mesmo com NULL. O importador editorial usa projeção específica de identidade/status e conteúdo editorial. São escopos de hash diferentes. A D2B deve testar preservação dos metadados opcionais pelo sync em mocks/ambiente descartável, sem alterar a fonte canônica e sem executar operação real nesta etapa.

## 6. Proposta consolidada para definição da D2B

### Região

Criar `model RegiaoPatrimonio` como referência cadastrável. Associar `Patrimonio.regiaoId` opcional, com relação `regiao`, sem alterar Localizacao. Cardinalidade: uma região classifica zero ou mais patrimônios; um patrimônio tem zero ou uma região.

Proposta mínima de catálogo: UUID, nome, slug único, descrição opcional, ativo e timestamps. A descrição regional pode registrar critério/fonte documental; não é a descrição do patrimônio e não a torna nullable. A documentação de validação deve acompanhar qualquer futura população do catálogo. Não adicionar geometria, enum territorial ou carga automática.

Recomendações de constraints: slug único/estável para filtros; nome não único porque homonímia pode exigir desambiguação por slug/descrição; nome não vazio e até 100 caracteres; slug até 120, minúsculo com hífens; descrição até 2000. `ativo = true` por padrão somente para novas regiões explicitamente cadastradas. Esse default não cria regiões e não preenche patrimônio algum.

FK com `ON DELETE RESTRICT`, `ON UPDATE CASCADE`: evita apagar a referência de fichas silenciosamente. Preferir inativação; não oferecer exclusão física no primeiro escopo da D2B. A inativação impede novas atribuições, preservando vínculos e apresentação já existentes. Alteração patrimonial que não mexa na região deve continuar válida mesmo se a região vinculada ficou inativa. Validar atribuição/inativação transacionalmente para impedir corrida entre as operações.

### Número

`numeroExibicao` inteiro opcional, sem default e sem sequência: 1 a 2147483647. Deve aparecer ao visitante quando preenchido; ausência não produz “0”, índice do array ou número inventado.

**Recomendação: UNIQUE global, inclusive arquivados.** Mantém a propriedade já prevista pela equipe e evita que um número público identifique simultaneamente dois bens. NULL pode se repetir. Não introduzir unicidade por região, pois o número não deve mudar de significado quando o bem for reclassificado. Uma eventual decisão de permitir números repetidos precisa ser tomada antes da implementação. UUID e slug continuam as únicas identidades operacionais; número nunca vira chave de importação ou URL.

### Ordem

`ordemExibicao` inteiro opcional, sem default: 0 a 2147483647. Valor menor recebe prioridade maior. Zero é válido. Não exigir contiguidade nem derivar número a partir da ordem.

**Recomendação: não UNIQUE.** É uma mudança deliberada em relação à equipe, apoiada no objetivo de prioridade editorial: empates são resolvidos por nome/UUID e duas fichas podem compartilhar prioridade sem renumeração coletiva. O formulário pode editar prioridade individualmente. Caso se deseje uma posição única global, será preciso aprovar outro desenho com reordenação em lote, transação e controle de concorrência; não basta restaurar o índice único antigo.

Ordenação proposta nas listagens pública/admin:

```js
[
  { ordemExibicao: { sort: "asc", nulls: "last" } },
  { nome: "asc" },
  { id: "asc" }
]
```

Quando todas as prioridades forem NULL, o resultado é exatamente o atual `nome ASC, id ASC`, na mesma collation do banco. Quando apenas algumas estiverem preenchidas, elas vêm primeiro; o restante conserva nome/UUID. Região e número não são chaves implícitas de agrupamento/ordenação. Não modificar as ordens de detalhes, imagens, ligações ou vínculos de rotas culturais.

### Escrita, responsabilidades e dados iniciais

POST aceita os três campos opcionais; omissão produz NULL. PATCH distingue ausência de campo (preservar) de `null` (limpar). Não tornar nenhum deles requisito de publicação. Corpo recebe `regiaoId`, não objeto regional livre nem `localizacao.regiao`. Autorizações patrimoniais atuais permanecem.

O schema novo deve entrar com **zero regiões e todos os três campos NULL**, sem mudanças nos 34 canônicos nem nos dois legados. Fonte canônica e importadores continuam sem esses metadados: atribuição será administrativa/editorial, não um novo seed. O uso do catálogo depende de curadoria posterior aprovada. Não criar o valor “Não informado”; representar ausência com NULL.

Pontos para confirmar na definição da D2B: unicidade global do número; prioridade com empates; contrato de catálogo e inativação; impacto desejado nos destaques da página inicial; validação da taxonomia antes de preenchê-la. Os recursos foram aprovados, mas essas recomendações não devem ser confundidas com regras já implantadas.

## 7. Schema proposto — somente desenho

O fragmento abaixo não foi inserido no schema real. Deve ser incorporado aos modelos existentes, sem duplicá-los, na futura D2B:

```prisma
model RegiaoPatrimonio {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  nome        String       @db.VarChar(100)
  slug        String       @unique(map: "regioes_patrimonio_slug_key") @db.VarChar(120)
  descricao   String?      @db.VarChar(2000)
  ativo       Boolean      @default(true)
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @default(now()) @updatedAt @map("updated_at")
  patrimonios Patrimonio[]

  @@map("regioes_patrimonio")
}

// Acréscimos no model Patrimonio existente:
// regiaoId       String?           @map("regiao_id") @db.Uuid
// regiao         RegiaoPatrimonio? @relation(fields: [regiaoId], references: [id], onDelete: Restrict, onUpdate: Cascade)
// numeroExibicao Int?              @unique(map: "patrimonio_numero_exibicao_key") @map("numero_exibicao")
// ordemExibicao  Int?              @map("ordem_exibicao")
// @@index([regiaoId], map: "patrimonio_regiao_id_idx")
// @@index([ordemExibicao, nome, id], map: "patrimonio_ordem_exibicao_nome_id_idx")
```

Escolheu-se a tabela `regioes_patrimonio`, diferente do tipo enum histórico `regiao_patrimonio`. Isso explicita o novo modelo; não torna a migration automaticamente compatível com bancos da equipe. Os limites inferiores dos inteiros e as validações textuais devem constar também no SQL/Zod, pois o fragmento Prisma não expressa todos os CHECKs. O `@updatedAt` é atualização pelo Prisma, não um trigger PostgreSQL.

## 8. Migration futura proposta

Criar uma migration **nova**, depois de `20261014010000_add_fatos_ligacoes`, dentro de `backend/prisma/migrations`. Nome ilustrativo: `<timestamp_novo>_add_regioes_numero_ordem`. O timestamp definitivo será o da implementação; nenhum diretório foi criado/reservado nesta D2A. Não reutilizar, copiar ou renomear as três migrations da equipe.

Esboço SQL para revisão e teste posterior, não executado:

```sql
BEGIN;

CREATE TABLE "regioes_patrimonio" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "descricao" VARCHAR(2000),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "regioes_patrimonio_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regioes_patrimonio_nome_check" CHECK ("nome" ~ '\S'),
  CONSTRAINT "regioes_patrimonio_slug_check"
    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "regioes_patrimonio_descricao_check"
    CHECK ("descricao" IS NULL OR "descricao" ~ '\S')
);

CREATE UNIQUE INDEX "regioes_patrimonio_slug_key"
  ON "regioes_patrimonio" ("slug");

ALTER TABLE "patrimonio"
  ADD COLUMN "regiao_id" UUID,
  ADD COLUMN "numero_exibicao" INTEGER,
  ADD COLUMN "ordem_exibicao" INTEGER,
  ADD CONSTRAINT "patrimonio_regiao_id_fkey"
    FOREIGN KEY ("regiao_id") REFERENCES "regioes_patrimonio" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "patrimonio_numero_exibicao_check"
    CHECK ("numero_exibicao" > 0),
  ADD CONSTRAINT "patrimonio_ordem_exibicao_check"
    CHECK ("ordem_exibicao" >= 0);

CREATE UNIQUE INDEX "patrimonio_numero_exibicao_key"
  ON "patrimonio" ("numero_exibicao");
CREATE INDEX "patrimonio_regiao_id_idx"
  ON "patrimonio" ("regiao_id");
CREATE INDEX "patrimonio_ordem_exibicao_nome_id_idx"
  ON "patrimonio" ("ordem_exibicao", "name", "id");

COMMIT;
```

`name` é a coluna física de `Patrimonio.nome`. O índice de ordem usa a sequência de ordenação global e o comportamento ASC/NULLS LAST do PostgreSQL; índices de status existentes permanecem. Avaliar planos de consulta no ambiente descartável antes de acrescentar índices combinados adicionais sem evidência de necessidade.

Efeito esperado: uma tabela nova vazia, três colunas nullable sem default em Patrimonio, uma FK, PK/UNIQUE/CHECKs e os índices descritos. **DML de carga: nenhum.** Não há UPDATE/INSERT/DELETE de domínio, mudança de status/autoria/datas patrimoniais, alteração de Localizacao ou de descrição, criação de seções, fatos ou ligações. A execução futura pelo Prisma acrescentaria apenas seu registro de migration, além do DDL previsto.

Migration não deve ocultar drift usando `IF NOT EXISTS`: se as estruturas já existirem ou o histórico não corresponder à linhagem consolidada, interromper antes de executar. DDL toma locks e deve ter janela operacional e preflight próprios. Reverter aplicativo não implica apagar colunas/dados; uma correção posterior deve ser forward-only, preservando metadados eventualmente cadastrados.

### Validação futura em PostgreSQL descartável

1. Criar banco de teste com nome inequivocamente descartável e bloqueio explícito a `patrimonio_guarulhos`; usar configuração/conexão exclusiva de teste.
2. Testar replay desde banco vazio: as seis migrations atuais mais a nova, sem migrations da equipe.
3. Testar upgrade separado partindo **exatamente das seis**: carregar fixtures sintéticas dos cenários atuais, incluindo 36 identidades, 34 canônicas, dois legados arquivados, detalhes/localizações/mídia e 14 ligações; registrar fotografia antes.
4. Aplicar somente a migration candidata no descartável. Confirmar catálogo regional vazio e três campos NULL; zero fatos e mesmas 14 ligações/UUIDs; mesmos status, descrições obrigatórias e datas/autorias.
5. Comparar todas as tabelas antigas. Em Patrimonio, comparar a **projeção explícita das colunas anteriores**, pois `to_jsonb(linha)` passará a incluir três chaves NULL e seu checksum integral naturalmente mudará. Nas demais tabelas de domínio, checksums integrais devem ser idênticos. `_prisma_migrations` muda pelo registro esperado.
6. Validar constraints por casos positivos/negativos no descartável, rollback de falhas e concorrência. Conferir catálogo PostgreSQL para CHECKs, FKs e índices além do diff Prisma.
7. Executar validate/status/diff e testes usando apenas a conexão descartável; detectar diferenças esperadas da migration separadamente de drift anterior. Nenhuma dessas operações foi executada nesta D2A.

## 9. Endpoints, DTOs e UI necessários

### Catálogo de regiões

| Proposta | Necessidade / autorização recomendada |
| --- | --- |
| `GET /api/regioes` | Sim, catálogo ativo para filtro público; nome/slug/id, sem contagens de patrimônios não públicos nem descrição administrativa |
| `GET /api/admin/regioes` | Sim, ADMIN/EDITOR; busca e paginação, opção explícita para inativas; retorna dados para seleção e gestão |
| `POST /api/admin/regioes` | Sim, ADMIN; cadastro explícito de referência validada, com autoria em audit_log |
| `PATCH /api/admin/regioes/:id` | Sim, ADMIN; nome/descrição/ativo; inativação preserva vínculos; slug estável, sem regeneração por renomear |
| `DELETE /api/admin/regioes/:id` | Adiar. Inativação atende retirada do catálogo sem apagar referências; FK RESTRICT protege eventual exclusão fora da UI |

O GET público pode listar todas as regiões ativas sem afirmar que cada uma já possui patrimônio publicado; não expõe contagens privadas. Caso uma ficha continue vinculada a região inativa, seu DTO ainda preserva nome/slug para contextualização. Um filtro por slug válido inativo pode continuar resolver publicados já vinculados; a opção não é oferecida para novas atribuições. Catálogo vazio deve resultar em mensagem clara no Admin e ausência de filtro vazio no público.

Adicionar schemas/services/controllers/routes de região no padrão do backend. Não introduzir repository apenas para esta etapa. A gestão global do catálogo é restrita a ADMIN; EDITOR escolhe região existente ao editar origem RASCUNHO. API continua autoritativa. Tratar 400, 401, 403, 404, 409 sem mensagens internas: número/slug em uso, referência inexistente/inativa, mudanças concorrentes. Mapear corretamente erros de unicidade por constraint; o tratamento atual de slug não deve atribuir toda colisão ao slug patrimonial.

### Contratos patrimoniais propostos

Manter as URLs atuais. POST/PATCH ganham somente campos top-level opcionais `regiaoId`, `numeroExibicao`, `ordemExibicao`. Listagem/detalhe público recebem os dois inteiros nullable e `regiao: { id, nome, slug } | null`; a prioridade é metadata de ordenação, não texto a exibir ao visitante. Admin recebe também `regiaoId` e situação ativa da referência. Nenhum novo campo é obrigatório em requisições antigas.

Filtro recomendado: query `regiao=<slug>` nas listas pública/admin, combinada por AND com categoria, situação, bairro, busca e status permitido. Query adicional `numeroExibicao=<inteiro positivo>` oferece busca exata sem conflitar com busca textual/CEP. No frontend, filtro regional pode continuar aplicado à coleção pública carregada; preservar a mesma semântica de igualdade e a ordem da API. Não interpretar automaticamente todo número digitado na busca livre como número editorial.

Não ampliar silenciosamente o alcance da busca textual nem modificar seu comportamento compartilhado com Mapa. Nome da região poderá ser encontrado pelo seletor regional; ampliação da busca livre é decisão separada. Requisições com filtro reconhecido sem correspondência retornam lista vazia, respeitando o contrato de listagem. UUID nunca é a informação visual principal.

### Mapa de impacto full-stack da D2B

| Área / arquivos atuais | Mudança futura necessária ou decisão |
| --- | --- |
| Prisma / `schema.prisma` | Modelo regional e três campos opcionais/relação/índices; gerar client no ambiente de desenvolvimento autorizado |
| `prisma/migrations` | Uma migration nova consolidada; nenhuma edição nas seis anteriores ou na linhagem equipe |
| `schemas/patrimonioSchema.js` | Validar int32, NULL/omissão, UUID, filtros; preservar strictness, descrição e coordenadas |
| Novos schemas regionais | Nome/slug/descrição/ativo, parâmetros UUID, busca/paginação; não aceitar enum antigo |
| `services/patrimonioService.js` | Criar/editar os campos explicitamente; validar referência; selects/DTOs; nova ordenação; filtros; erros de constraint; manter locks/permissões e veto a arrays editoriais |
| Novos services regionais | Leitura pública/admin, cadastro/edição/inativação transacionais e auditados; concorrência com atribuições |
| Controllers/routes | Estender validações existentes; novas rotas do catálogo; manter envelopes e autenticação atuais |
| `docs/paths.js`, `docs/schemas.js`, `docs/openapi.js` | Contratos aditivos, exemplos NULL, limites/erros/permissões, regra de ordenação e entidades de referência |
| DTO público | Novos campos explícitos; manter ligações, referências, localização, categorias e envelopes |
| DTO Admin | Campos editáveis e região atual inclusive inativa; manter dados necessários a D1E |
| `frontend/src/services/patrimoniosApi.js` | Preservar os novos campos na normalização; manter distinção slug/UUID e shape das ligações |
| `services/adminApi.js` / serviço regional novo | Leitura do catálogo e mutações regionais, payloads patrimoniais aditivos; sem fallback de escrita |
| `AdminPatrimonios.jsx` | Select regional e inteiros opcionais com ajuda; inicializar do detalhe real; vazio gera NULL intencional ao limpar; não confundir número postal com número editorial |
| Gestão regional administrativa | Tela/bloco mínimo ADMIN para catálogo validado e inativação; não depender de seed para povoar |
| `pages/Patrimonios/Patrimonios.jsx` | Filtro regional e número quando definido; atualizar URL/página após mudar filtro; preservar sequência e paginação |
| `PlaquetaCard.jsx` | Número público discreto somente quando presente, sem usar posição da lista; componente compartilhado exige regressão no mapa |
| `pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx` | Mostrar número e região como metadata editorial sem duplicar nome; preservar redesign/accordion e C3 |
| `pages/Inicio/Inicio.jsx` | Verificar impacto da nova ordem nos destaques; não adicionar outro ranking implícito |
| Contexto / busca compartilhada | Preservar sequência/seleção; filtro regional da listagem não deve ativar rotas ou alterar geocodificação |
| Dashboard D1A | Manter contrato atual; agregação regional opcional em etapa separada, sem copiar dashboard histórico |
| Testes backend/frontend | Matriz na seção 10; atualizar expectativas R1 de forma limitada |

Região é classificação editorial/territorial, não localização postal. Em REFERENCIA e SEM_ROTA, mostrar eventual região como metadata não autoriza endereço, mapa ou rota. DEMOLIDO mantém localização histórica/aproximada. Número não entra na string de endereço. Nenhum destes campos muda elegibilidade ou sequência das ligações D1D/D1E, nem habilita UI de fatos.

## 10. Plano de testes D2B e critérios de saída

| Grupo | Casos obrigatórios propostos |
| --- | --- |
| Schema e migration | Replay/upgrade descritos acima; ausência de seções/enum antigo; nenhuma recriação de fatos/ligações; índices/FKs/CHECKs corretos |
| Nullable e limites | Todos ausentes/NULL; PATCH omitido preserva; NULL limpa; número 1/máximo válidos, 0/negativo/fracionário/overflow inválidos; ordem 0/máximo válidos, negativo/fracionário/overflow inválidos; string vazia não vira zero |
| Número único | Conflito entre publicados, rascunhos e arquivados; múltiplos NULL; concorrência de dois cadastros do mesmo número; mensagem segura de 409 |
| Prioridade | Empates válidos; ASC NULLS LAST; nome/UUID determinísticos; todas NULL reproduzem a ordem anterior; ordenação aplicada antes da paginação e após filtros |
| Região | FK válida, inexistente, inativa, NULL; cadastro sem Localizacao; inativar não limpa fichas; edição não relacionada preserva referência inativa; concorrência atribuição/inativação; exclusão referenciada bloqueada |
| Permissões | ADMIN em todos os status; EDITOR somente RASCUNHO para atribuições; catálogo global somente ADMIN para escrita; 401/403; publicação sem D2 preenchida continua válida |
| Busca/filtro | Região AND demais filtros; número exato; região sem publicados; busca atual/CEP não confundidos; público não expõe fichas privadas ou legados por novo filtro |
| Contrato | Listagem/detalhe público/admin, NULLs, normalizador real, IDs/slug, OpenAPI; preservação do DTO D1D e de referências/imagens |
| Admin | Criar, editar e limpar campos sem perder demais alterações; região vazia/inativa; loading/erro/retry; número postal intacto; D1E independente; não reenviar arrays editoriais |
| Público e C3 | Número visível somente preenchido; região não cria endereço/rota; EXATA/APROXIMADA/REFERENCIA/SEM_ROTA; demolidos; accordion; referências; mapa; navegação por slug e ordem D1D |
| Conteúdo/canonicidade | Fonte canônica com mesmo SHA; nenhum catálogo antigo/83 fatos/27 ligações importado; mesmos UUIDs e 14 ligações nas fixtures; legados arquivados; sync simulado preserva novos campos não gerenciados |
| R1 | Ajustar expectativa de seis para sete migrations apenas quando a nova existir; permitir modelo/campos D2; continuar proibindo migrations históricas da equipe na trilha ativa, PatrimonioSecao e PATCH geral de fatos/ligações |
| Operação e UI | Suite backend/frontend, lint, build, diff-check, schema validate e smoke com API simulada/descartável em 1440/390/320 px; teclado, labels, foco e ausência de overflow |

Arquivos de teste existentes particularmente relevantes: `backend/test/r1.test.js`, `patrimonio.test.js`, `adminPatrimonio.test.js`, `adminPatrimonio.integration.test.js`, `docs.test.js`, `dashboard.test.js`, testes D1B e sync; no frontend, testes de AdminPatrimonios/AdminLigacoes, detalhe/relacionados/accordion e mapa/rota. Acrescentar testes específicos para catálogo regional, filtros e prioridade. Não reativar testes `.reference` indiscriminadamente, pois contêm expectativas de schema/catálogo rejeitadas.

O teste R1 atual procura ausência de `RegiaoPatrimonio`, número e ordem no schema e ausência de `regiao` no nome de migrations ativas. Essas asserções precisam ser substituídas por verificação da nova migration explicitamente permitida, mantendo a proibição dos nomes históricos da equipe. Rejeição de arrays para campos inteiros continua correta; não remover esse caso apenas por aceitar inteiros válidos.

Critérios para encerrar a futura D2B: regras pendentes definidas; implementação aditiva; validação em descartável; contratos antigos aprovados; relatório de integridade; nenhum preenchimento territorial/numerário não aprovado. Deploy real, se solicitado posteriormente, exige preflight e autorização próprios. Esta auditoria não executou nem validou uma migration funcional.

### Encerramento da D2A

Auditoria de arquivos/histórico concluída e desenho documentado. Única alteração: `reports/D2A-auditoria-regiao-ordem.md`. Backend, frontend, schema, migrations, seeds, importadores, fonte canônica e decisões C2/C3/D1A/D1B/D1C/D1D/D1E não foram alterados. Nenhum backup criado. **Banco real = não acessado.**

Verificação final: `git diff --check` aprovado; checagem de whitespace do relatório novo com `git diff --no-index --check` aprovada; `git diff --exit-code HEAD -- backend frontend` sem diferenças. HEAD permaneceu o mesmo e o Git identificou somente este relatório novo em `reports/`. Nenhum commit criado. Testes de aplicação, lint, build e replay ficam para a D2B: não foram executados nem alegados como aprovados nesta etapa documental.

Pendências para definição da D2B: validar taxonomia e futura população; confirmar recomendações de unicidade/prioridade e gestão regional. São decisões de desenho explicitadas, não alterações aplicadas.

D2A AUDITORIA CONCLUÍDA

PRONTO PARA DEFINIÇÃO DA D2B
