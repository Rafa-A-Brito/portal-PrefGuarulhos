# D2C — Fase 1: revisão pré-deploy D2B

Data: 16/10/2026 (America/Sao_Paulo). **Parecer: GO para avançar à preparação do backup.** Nenhuma divergência de identidade, dados esperados ou linhagem foi encontrada. Este parecer não executa nem autoriza implicitamente deploy, preenchimento editorial ou commit.

O banco real foi consultado exclusivamente em modo somente leitura. Nenhum backup foi produzido. Nenhum código, schema, migration, seed, importador ou arquivo preexistente foi modificado nesta fase. Entrega versionável: somente este relatório; evidências auxiliares em `.cache/d2c1`, ignorado pelo Git.

## 1. Git, diff e separação de escopo

| Verificação | Resultado |
| --- | --- |
| Branch | `development/backend` |
| HEAD / commit-base D2B | `c8fba66fcbf518b3205a49355d09a2c7c10a9c16` |
| Working tree inicial | **Não limpo**, como registrado no encerramento D2B: 22 arquivos rastreados modificados e 20 arquivos novos |
| Index/staging | Sem alterações staged |
| `git diff --check` | Aprovado; avisos LF/CRLF não são erros de whitespace |
| Código alterado pela D2C1 | Nenhum |
| Commit automático | Não realizado |

Inspecionados o diff completo contra HEAD, os arquivos novos, os contratos e os registros de validação D2B. Inventário individual no final deste relatório; diff integral preservado em [working-tree.diff](../.cache/d2c1/working-tree.diff). Os hashes iniciais dos arquivos existentes estão em [preflight.json](../.cache/d2c1/preflight.json); a comparação final está em [review.json](../.cache/d2c1/review.json).

**Alteração concorrente separada:** `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.css` altera o accordion para azul sólido `var(--blue)`, `align-items: flex-start`, `width: max-content` e `max-width: 100%`. É a alteração visual já identificada na D2B, não parte da implementação de região/número/ordem. Permaneceu intacta, sem reversão nem staging. [Diff exclusivo do CSS](../.cache/d2c1/concurrent-css.diff). Uma futura seleção de arquivos para commit deve tratar essa alteração explicitamente; não foi incluída automaticamente em commit D2B.

O diff do schema possui também realinhamento de espaços. A leitura com `git diff -w` confirmou que as mudanças semânticas são somente o modelo regional, os três campos/relação e os índices D2 aprovados. Não há duplicação de modelos ou mudança semântica oculta nos modelos realinhados.

## 2. Migration candidata e revisão humana do SQL

Arquivo integral auditado: [backend/prisma/migrations/20261016120000_add_regioes_numero_ordem/migration.sql](../backend/prisma/migrations/20261016120000_add_regioes_numero_ordem/migration.sql), **todo o arquivo**, desde `BEGIN` até `COMMIT`, incluindo comentários. Essa referência identifica o SQL a revisar; nenhum SQL foi executado a partir dele nesta fase.

```text
SHA-256 esperado e encontrado:
452d76e28f980d0f5e3e0f4e4eaf03edeb887148c1b8ca1718a82b5b883baaf9
```

| Elemento | SQL conferido |
| --- | --- |
| Natureza | DDL aditivo transacional, `BEGIN`/`COMMIT`; sem INSERT, UPDATE, DELETE, TRUNCATE, carga ou backfill de domínio |
| Tabela nova | `regioes_patrimonio` |
| Identidade regional | `id UUID NOT NULL DEFAULT gen_random_uuid()`, PRIMARY KEY |
| Nome/slug | `nome VARCHAR(100) NOT NULL`; `slug VARCHAR(120) NOT NULL`, índice UNIQUE |
| Descrição regional | `descricao VARCHAR(2000)` nullable; não altera a descrição patrimonial |
| Atividade | `ativo BOOLEAN NOT NULL DEFAULT true`; default apenas para futuras criações explícitas |
| Datas | `created_at` e `updated_at` TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP; atualização posterior de updatedAt é responsabilidade do Prisma, sem trigger novo |
| CHECKs regionais | Nome não branco; slug minúsculo alfanumérico com hífens; descrição NULL ou não branca |
| Campos patrimoniais | `regiao_id UUID`, `numero_exibicao INTEGER`, `ordem_exibicao INTEGER`: todos nullable, **sem default**, sem sequence |
| FK | `patrimonio.regiao_id → regioes_patrimonio.id`, ON DELETE RESTRICT / ON UPDATE CASCADE |
| Número | CHECK `> 0`, UNIQUE global; múltiplos NULL permitidos; limite superior natural de INTEGER |
| Prioridade | CHECK `>= 0`, sem UNIQUE; zero e empates válidos |
| Índices adicionais | `patrimonio_regiao_id_idx`; `patrimonio_ordem_exibicao_nome_id_idx (ordem_exibicao, name, id)` |

`name` é efetivamente a coluna física de `Patrimonio.nome`. As palavras DELETE/UPDATE nas ações da FK não são comandos DML. A migration não modifica `local`, descrição patrimonial, fatos ou ligações; não introduz `PatrimonioSecao`, enum regional histórico nem taxonomia. Efeito futuro esperado: tabela regional vazia e três colunas NULL nos registros existentes, sem mudança de UUID/status/autoria/datas.

As seis migrations originais mantêm os mesmos bytes do baseline D2B. Três arquivos antigos usam CRLF no checkout e LF no objeto Git; a comparação direta inicial de bytes com HEAD detectou essa representação. A comparação do conteúdo com normalização exclusivamente de fim de linha e dos hashes com o baseline comprovou ausência de edição. Os checksums reais registrados pelo Prisma também coincidem **exatamente com os bytes atuais do checkout**, sem normalização ou aceitação aproximada nessa comparação.

A árvore ativa contém somente as seis originais e a candidata D2. A linhagem `backend/prisma/lineages/equipe` e seus controles não sofreram alterações. As migrations abaixo continuam fora da trilha deste banco e não estão aplicadas nele:

- `20261005230000_add_pesquisa_patrimonios`
- `20261013180000_add_regiao_patrimonio`
- `20261014120000_reconcile_d1b_forward`

## 3. Fonte canônica

`backend/prisma/patrimonioSeedData.js`, SHA-256 esperado e encontrado:

```text
c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8
```

Nenhuma carga dos 83 fatos, 27 ligações ou regiões históricas da equipe foi executada ou incorporada à migration. Manifesto curado e importadores permanecem intactos.

## 4. Identidade e isolamento da inspeção real

| Campo | Valor confirmado |
| --- | --- |
| Host configurado | `localhost` |
| Porta configurada e conectada | `5432` |
| Banco configurado e conectado | `patrimonio_guarulhos` |
| Usuário configurado / current_user / session_user | `postgres` |
| Endereço do servidor | `::1` (loopback) |
| PostgreSQL | `18.6` |
| `default_transaction_read_only` | `on` |
| `transaction_read_only` | `on` |
| Inspeção SQL | `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, encerrada com `ROLLBACK` |

Host/porta/banco/usuário foram validados antes de conectar. A primeira consulta conferiu a identidade efetiva e as duas configurações readonly antes de qualquer consulta de domínio. Não foram exibidos URL de conexão, senha, token ou hashes de credenciais.

Na primeira verificação de identidade, o cast textual de INET representou o loopback como `::1/128`; a guarda interrompeu a sessão e executou ROLLBACK antes de consultar domínio. A evidência confirmou o mesmo endereço loopback, não outro servidor. A consulta de inspeção foi corrigida para `host(inet_server_addr())`, que retorna `::1`; todos os critérios de identidade permaneceram exigidos. Nenhuma configuração do banco foi alterada. [Evidência dessa normalização](../.cache/d2c1/identity-check-normalization.json).

O Prisma diff usou a mesma conexão explicitamente configurada com `options=-c default_transaction_read_only=on` e `PGOPTIONS` equivalente. O schema de comparação foi extraído de **HEAD pré-D2**, não o schema final de sete migrations. Não houve shadow database, replay ou testes com escrita nesta fase.

## 5. Estado das migrations e dos dados

Exatamente seis registros completos: `finished_at` preenchido, `rolled_back_at` nulo e etapas aplicadas. Nenhuma migration falha, incompleta, duplicada ou da equipe.

| Migration aplicada | Checksum SHA-256 aplicado = arquivo atual |
| --- | --- |
| `20260929230000_initial_schema` | `68f762b840d1dfadb4515b03ef50e42acc8ade9d058b8c72378812bc0e5c6cd5` |
| `20260930120000_add_demolido_situacao` | `211308e27393b24375d8e916bc1e295044f97e5f4a8170999599d4c8d1d1d669` |
| `20261005004508_categorias_adicionais` | `4f68b4e2b42d30a583362a7d4ed684da6ef8fe44bccd719abf9c430858d8d468` |
| `20261006014922_adicionar_detalhes_e_heroes` | `e024c18d4a281fe9dfe7e03d89680613090326fecf458229c5dcb3a7de6d4f79` |
| `20261006180000_exposicoes_novidades` | `7c325485b007d5b6c70f8b9faeed78fb4ef992e5b1dbaa37cce465dc5c79deea` |
| `20261014010000_add_fatos_ligacoes` | `60a34dbd7f1ad73f4ae7e176013ff3096ac868b703694afda37c471793a6f7b3` |

Única pendente na árvore pós-D2B: **`20261016120000_add_regioes_numero_ordem`**. Não há registro dela em `_prisma_migrations`.

| Premissa | Resultado real |
| --- | --- |
| Patrimônios físicos | 36 |
| Identidades canônicas | 34, cada slug do manifesto resolve uma única identidade |
| Legados | 2, ambos ARQUIVADO |
| Fatos | 0 |
| Ligações | 14 |
| `regioes_patrimonio` | Ausente |
| `patrimonio.regiao_id` | Ausente |
| `patrimonio.numero_exibicao` | Ausente |
| `patrimonio.ordem_exibicao` | Ausente |
| `local.regiao` / enum regional da equipe | Ausentes |
| `patrimonio_secoes` | Ausente |
| `patrimonio.descricao` | NOT NULL |
| `patrimonio.id` | UUID, PRIMARY KEY, NOT NULL |

Legados conferidos: `casarao-da-nossa-historia` / `7ef1d2a6-cb0e-4827-b8e3-378877a2aec5` e `casarao-do-sitio-ponte-alta` / `c6d445ab-7259-4196-b422-26d2a5069858`.

As 14 ligações coincidem com `patrimonioEditorialCurado.js` em origem, destino, texto e ordem. UUIDs editoriais e UUIDs/status das 36 fichas coincidem com a evidência pós-apply D1C. Todas as pontas relacionadas estão PUBLICADO e são canônicas. Autorrelações, pares duplicados, colisões de ordem e pontas legadas: **zero**. A listagem completa com esses atributos está no JSON de preflight, sem depender de dados inferidos por categoria ou número.

## 6. Drift e integridade

Resultado do comando **somente de comparação**:

```text
prisma migrate diff --config prisma.config.js --from-config-datasource
  --to-schema <workspace>/.cache/d2c1/schema-pre-d2.prisma --exit-code

No difference detected.
exit code = 0
```

[Log integral](../.cache/d2c1/prisma-diff.log). A conexão foi forçada a readonly. O schema de referência corresponde a `HEAD:backend/prisma/schema.prisma` e às seis migrations consolidadas. A ausência dos objetos D2 é **diferença esperada por migration pendente**, não drift.

Além do diff Prisma, inspecionados catálogo de tabelas/colunas, enums, PKs, FKs, constraints validadas e triggers. Os nove CHECKs preexistentes foram conferidos com o SQL das seis migrations: limites de latitude/longitude; ordens de imagens/rotas/fatos/ligações; textos não brancos; valor de fato até 10000; proibição de autorrelação. Nenhum trigger de domínio inesperado. Índices e relações representados no schema não apresentaram divergência. **Drift estrutural ou de linhagem relevante: nenhum encontrado.**

Também foram calculados SHA-256 de todas as 17 tabelas públicas, incluindo migrations e auditoria. Método: linhas completas `to_jsonb(t)::text`, ordenadas com collation C, sessão UTC, newline por registro. Somente contagens/hashes foram persistidos para tabelas gerais; nenhum conteúdo de credenciais foi registrado. Todas as 17 contagens e hashes são idênticos à fotografia final do apply D1C. A transação da D2C1 terminou com ROLLBACK; não houve auditoria de domínio nova.

| Tabela | Registros | SHA-256 atual = fotografia p?s-D1C |
| --- | --- | --- |
| `_prisma_migrations` | 6 | `bec1bd03d4d0920983020c4874fc5d651e80ab26788229c07c2cbc002abcb215` |
| `audit_log` | 68 | `8589c10f55bd6923cddece97adfbb9348ebc7f5e83c4a5fa070e838b2b15e9ce` |
| `categoria` | 7 | `28e33fb2542fb0ceda5709d41fcb367cee83c777072bd8a5c9193d9934697782` |
| `exposicao` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `local` | 35 | `b5a4a2fa1c710cd73ee453b6a983fba44d8f249eaaf3ec7dcd6e0021ff50c289` |
| `novidade` | 16 | `4b4f4a008eb63612c29d346c4f7c3e446940cfaf46ab09dc28e83d04f583795e` |
| `patrimonio` | 36 | `03d756b538d0d17e950f0d2834c179bb7e4a9bd8a6f077eac00e393f5ffd59de` |
| `patrimonio_categoria` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `patrimonio_detalhes` | 183 | `e5b4c0271f730740b000c8e17be50c5b57b160913a6b6b5d1d26706521049b86` |
| `patrimonio_documentos` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `patrimonio_fatos` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `patrimonio_imagens` | 36 | `8521e3db656a1639b4130101540389c5d9339bc2922e5dad2431fe90e1ed504c` |
| `patrimonio_ligacoes` | 14 | `3424c15c9d51292b2f5c3a6c068b9a72bc3a26763bd5cdad5ef4bd0727ccd8de` |
| `rota` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `rota_patrimonio` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `site_hero` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `users` | 2 | `368a1ad61aa6d8fdba9897dd56aa1233a3ef2eb06ac10964c729196df8456190` |

## 7. Preparação de backup: requisitos, sem execução

| Requisito | Evidência |
| --- | --- |
| `pg_dump` | `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe`, versão 18.6 |
| `pg_restore` | Mesmo diretório, versão 18.6 |
| Compatibilidade | Ferramentas 18.6 e servidor 18.6 |
| Usuário da conexão | `postgres`, superuser; SELECT disponível nas 17 tabelas e nenhuma RLS nessas tabelas |
| Permissões estruturais | USAGE/CREATE no schema public; função `gen_random_uuid()` disponível e EXECUTE permitido |
| Tamanho atual do banco | 10.524.351 bytes, aproximadamente 10,04 MiB |
| Destino proposto | `.cache/db-backups`, já existente, ignorado pelo Git; checagem local de acesso de escrita aprovada |
| Espaço disponível | 244.849.573.888 bytes, aproximadamente 228 GiB no volume do destino |
| Margem de espaço | Superior ao critério conservador de 1 GiB e três vezes o tamanho atual do banco |
| Backup criado nesta fase | **Não** |

Disponibilidade de ferramentas, acesso e espaço não substitui a validação do futuro dump. Na fase autorizada de backup, será necessário conferir identidade, saída do pg_dump, catálogo, leitura/descompressão completa e SHA-256 do novo arquivo. Não se reutiliza automaticamente um backup anterior para o deploy D2.

## 8. Revisão rápida da implementação e preservações

| Área | Parecer |
| --- | --- |
| Permissões regionais | GET admin ADMIN/EDITOR; POST/PATCH somente ADMIN; rota e serviço validam escrita; sem DELETE |
| Permissões patrimoniais | ADMIN em qualquer status, EDITOR somente RASCUNHO; preservadas |
| Concorrência regional | Atribuição/inativação compartilham lock; existência/atividade consultadas depois do lock |
| Vínculo inativo | Omissão de regiaoId preserva; nova atribuição explícita exige região ativa; NULL limpa |
| Número/prioridade | Zod estrito, inteiros int32 opcionais; número positivo único global; ordem zero/empates válidos; sem geração automática |
| Ordenação/paginação | Prioridade ASC NULLS LAST, nome, UUID antes de paginar; todas NULL mantêm o comportamento anterior |
| Filtros | Slug regional e número exato em AND com filtros existentes; frontend preserva sequência recebida |
| Serialização | Selects público/admin e normalizador incluem D2 sem trocar identidade slug/UUID; atividade regional no admin |
| UX | Catálogo vazio/inativo, retry e erros seguros; slug estável; campos vazios viram NULL; ordem zero é preservada |
| C3 | Região/número são metadados; não autorizam endereço, mapa ou rota; política/rota/endereço/coordenadas intactos |
| D1D | Ligações da API, mesma ordem, destinos por slug; sem inferência/inversas; componente preservado |
| D1E | CRUD dedicado de ligações preservado; PATCH patrimonial não substitui arrays editoriais |
| Redesign | Detalhe recebe metadados sem reescrever accordion/estrutura; CSS concorrente identificado separadamente |
| Canonicidade | Fonte/seed/importadores/sync intactos; não há carga regional/numérica ou conteúdo da equipe |

Revisados também os ajustes limitados nos testes R1/sync/OpenAPI e a normalização de apresentação Markdown no teste D1C. Não houve alteração do manifesto/importador para acomodar testes. Não foi identificado impedimento de código para a preparação do backup.

As evidências D2B foram lidas, **não reexecutadas nem apresentadas como testes novos desta fase**: backend 29 específicos e 418 totais; frontend 80 específicos e 261 totais; replay de sete migrations e upgrade 6→7 em descartáveis; Prisma validate/status/diff; lint/build; smoke 1440/390/320, zero exceções. [Relatório D2B](D2B-implementacao-regiao-numero-ordem.md), [validação descartável](../.cache/d2b/52b8798e-9571-4fa1-9e10-540af7e06cbe/validation.json), [checagem final D2B](../.cache/d2b/final-check.json), [smoke](../.cache/d2b-smoke/resultado.json).

## 9. Parecer e limites da próxima fase

**GO para avançar à preparação do backup.** As premissas reais coincidem com a trilha consolidada de seis migrations e com o conteúdo curado. O SQL candidato e a fonte canônica têm os hashes aprovados. Não foi encontrada divergência impeditiva.

O working tree continua com a implementação D2B sem commit e a edição concorrente de CSS. Isso está explicitamente documentado e não foi corrigido por commit/reversão automática. Antes de um eventual deploy controlado, será preciso definir e registrar o commit revisado, separar a alteração visual, conferir novamente a árvore/hashes e validar o backup imediatamente anterior à escrita. O GO desta fase não equivale a “deploy já liberado” nem garante que uma fotografia futura continue igual.

Nenhuma migration, seed, sync, import, db push/reset ou mutação de domínio foi executada. Nenhum backup foi criado. Sessões de inspeção foram encerradas; o único processo Prisma chamado fez diff somente leitura. Git index e HEAD permaneceram inalterados.

## 10. Inventário do working tree auditado

Os arquivos abaixo já existiam modificados/novos antes da D2C1. O relatório atual é a única adição versionável desta fase.

| Situa??o anterior ? D2C1 | Arquivo |
| --- | --- |
| Modificado ? D2B | `backend/prisma/schema.prisma` |
| Modificado ? D2B | `backend/src/docs/openapi.js` |
| Modificado ? D2B | `backend/src/docs/paths.js` |
| Modificado ? D2B | `backend/src/docs/schemas.js` |
| Modificado ? D2B | `backend/src/routes/index.js` |
| Modificado ? D2B | `backend/src/schemas/patrimonioSchema.js` |
| Modificado ? D2B | `backend/src/services/patrimonioService.js` |
| Modificado ? D2B | `backend/test/adminPatrimonio.test.js` |
| Modificado ? D2B | `backend/test/d1c.test.js` |
| Modificado ? D2B | `backend/test/docs.test.js` |
| Modificado ? D2B | `backend/test/patrimonio.test.js` |
| Modificado ? D2B | `backend/test/r1.test.js` |
| Modificado ? D2B | `backend/test/syncPatrimonios.test.js` |
| Modificado ? D2B | `frontend/src/App.jsx` |
| Modificado ? D2B | `frontend/src/features/admin/components/AdminLayout.jsx` |
| Modificado ? D2B | `frontend/src/features/admin/pages/AdminPatrimonios.jsx` |
| Modificado ? D2B | `frontend/src/features/mapa/PlaquetaCard.jsx` |
| Modificado ? CSS concorrente | `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.css` |
| Modificado ? D2B | `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx` |
| Modificado ? D2B | `frontend/src/pages/Patrimonios/Patrimonios.jsx` |
| Modificado ? D2B | `frontend/src/services/fakeApi.js` |
| Modificado ? D2B | `frontend/test/AdminPatrimonios.test.jsx` |
| Novo ? D2B | `backend/prisma/migrations/20261016120000_add_regioes_numero_ordem/migration.sql` |
| Novo ? D2B | `backend/scripts/validate-d2b.js` |
| Novo ? D2B | `backend/src/controllers/regiaoController.js` |
| Novo ? D2B | `backend/src/docs/d2.js` |
| Novo ? D2B | `backend/src/routes/regiaoRoute.js` |
| Novo ? D2B | `backend/src/schemas/regiaoSchema.js` |
| Novo ? D2B | `backend/src/services/regiaoService.js` |
| Novo ? D2B | `backend/test/d2b.integration.test.js` |
| Novo ? D2B | `backend/test/d2b.test.js` |
| Novo ? D2B | `frontend/scripts/smoke-d2b.mjs` |
| Novo ? D2B | `frontend/src/components/MetadataEditorial/MetadataEditorial.css` |
| Novo ? D2B | `frontend/src/components/MetadataEditorial/MetadataEditorial.jsx` |
| Novo ? D2B | `frontend/src/features/admin/components/OrganizacaoEditorial.css` |
| Novo ? D2B | `frontend/src/features/admin/components/OrganizacaoEditorial.jsx` |
| Novo ? D2B | `frontend/src/features/admin/pages/AdminRegioes.css` |
| Novo ? D2B | `frontend/src/features/admin/pages/AdminRegioes.jsx` |
| Novo ? D2B | `frontend/src/pages/Patrimonios/Patrimonios.css` |
| Novo ? D2B | `frontend/src/services/regioesApi.js` |
| Novo ? D2B | `frontend/test/D2Editorial.test.jsx` |
| Novo ? D2B | `reports/D2B-implementacao-regiao-numero-ordem.md` |

D2C FASE 1 — GO

BANCO REAL SEM ALTERAÇÕES

MIGRATION REAL NÃO EXECUTADA
