# D1B — fatos e ligações editoriais

Base: working tree pós-C2/C3/D1A, registrado em `.cache/d1b/baseline.json`. O ZIP foi lido como referência; seus scripts não foram executados. A fonte dos patrimônios continua `prisma/patrimonioSeedData.js`.

## Comparação anterior à implementação

| Aspecto | Equipe | Adaptação D1B | Motivo |
| --- | --- | --- | --- |
| Fato | UUID, patrimônio, rotulo/valor TEXT e ordem inteira | Mesmos conceitos; limites de 200/10000 caracteres e texto não vazio | Validar conteúdo e tamanho sem substituir detalhes |
| Ligação | Origem/destino UUID, texto e ordem; relação direcionada | Mesma semântica; texto até 2000 caracteres; rejeitar identidades legadas consolidadas | Não recriar identidades nem gerar autorrelações |
| SQL | Cascade nas FKs; ordem >= 0, ordem única por origem, par origem/destino único, origem diferente de destino | Migration nova somente para as duas tabelas, com esses constraints e checks de texto | Não copiar alterações de região, seções, descrição ou numeração |
| Escrita | Arrays no create/update de patrimônio, substituídos por deleteMany/create | CRUD próprio e reordenação transacional preservando IDs | Preservar contratos atuais e evitar substituição silenciosa de dados |
| Ordenação | Arrays contíguos desde zero; índices únicos | Ordem não negativa e única; omissão cria no final; colisão retorna 409; reordenar exige todos os IDs e produz 0..n-1 | CRUD admite lacunas após exclusão sem comportamento indefinido |
| Permissões | Edição subordinada à ficha | ADMIN em todos os status; EDITOR apenas quando origem RASCUNHO, inclusive exclusão do item editorial | Segue updatePatrimonio atual; não usa a política distinta de arquivos |
| Público/admin | Fatos/ligacoes no detalhe; público filtra destino PUBLICADO, incluindo número editorial | Campos aditivos; público apenas destinos publicados e não legados; admin inclui status do destino | Não trazer numeroExibicao nem expor rascunhos/arquivados |
| Services/controllers/routes/schemas | Escrita no serviço/schema patrimonial e rotas existentes; sem CRUD separado | Serviço, controller, rotas e Zod específicos; detalhe atual recebe selects aditivos | Evitar substituição de implementação consolidada |
| Testes | Arrays, duplicidade, destino, serialização e seed/reconciliação | CRUD, ordem, concorrência/rollback, SQL, API, filtro público e regressão em banco descartável | Não executar seed da equipe nem importar seus dados |

Arquivamento mantém os itens editoriais no admin e oculta destinos não publicados no público. Exclusão física usa CASCADE nas duas pontas; ligação não é Rota. Aliases consolidados são rejeitados com indicação da identidade canônica, sem redirecionamento silencioso.

## Implementação concluída

### Schema e SQL incremental

Migration nova: `prisma/migrations/20261014010000_add_fatos_ligacoes/migration.sql`.

- `patrimonio_fatos`: UUID próprio, FK `patrimonio_id`, `rotulo VARCHAR(200)`, `valor TEXT` limitado a 10000 caracteres e `ordem INTEGER`.
- `patrimonio_ligacoes`: UUID próprio, FKs de origem/destino, `texto VARCHAR(2000)` e `ordem INTEGER`.
- FKs com `ON DELETE CASCADE` e `ON UPDATE CASCADE`; ordem não negativa; índices únicos por patrimônio/ordem e origem/destino; índice de destino para referências recebidas.
- Checks impedem texto composto só por espaços em branco, excesso no valor do fato e autorrelação. As constraints SQL protegem também escritas fora da API.
- O modelo `Patrimonio` recebe somente relações Prisma `fatos`, `ligacoes` e `ligacoesRecebidas`; nenhuma coluna preexistente foi alterada. A migration não contém DML nem dados de pesquisa.

Não foram alteradas migrations anteriores. Não foram incluídos região, numeração, ordem de exibição patrimonial, seções ou descrição nullable.

### Endpoints e permissões

Para cada recurso `fatos` e `ligacoes`:

| Método | Caminho | Operação |
| --- | --- | --- |
| GET | `/api/admin/patrimonios/:id/{recurso}` | Listar em ordem estável |
| POST | `/api/admin/patrimonios/:id/{recurso}` | Criar; ordem omitida adiciona ao final |
| PATCH | `/api/admin/patrimonios/:id/{recurso}/:itemId` | Editar campos do item, preservando seu UUID |
| DELETE | `/api/admin/patrimonios/:id/{recurso}/:itemId` | Excluir apenas item pertencente à origem |
| PATCH | `/api/admin/patrimonios/:id/{recurso}/ordem` | Reordenar usando `{ "ids": [...] }` com todos os IDs atuais |

São dez operações novas. Rotas protegidas por autenticação/conta ativa e ADMIN/EDITOR. Ambos leem todos os status; ADMIN escreve em todos, EDITOR somente se a origem estiver em RASCUNHO. A exclusão de um fato/ligação é edição editorial da ficha e segue `updatePatrimonio`, não a regra distinta de exclusão de arquivo.

Payload de fato: `rotulo`, `valor`, `ordem` opcional. Payload de ligação: `patrimonioDestinoId`, `texto`, `ordem` opcional. PATCH exige pelo menos um campo; Zod rejeita campos desconhecidos, vazios, limites excedidos e ordens inválidas. UUIDs de entrada são normalizados para minúsculas. Alterar o pai ou ID do item não é permitido.

Todas as mutações são transacionais e registram `updatedBy`/`updatedAt` no patrimônio. Locks nas fichas, em ordem de UUID, serializam edição/publicação e evitam deadlock em ligações opostas. Reordenação usa posições temporárias livres não negativas, conserva IDs e suporta posições anteriores em INT_MAX. Colisão de ordem/destino ou lista incompleta retorna 409. Exclusões podem deixar lacunas; a ordenação permanece definida por `ordem, id`. Reordenação explícita aceita até 1000 IDs e normaliza para 0..n-1.

### Contratos público e admin

O detalhe recebe `fatos: [{ id, rotulo, valor, ordem }]` e `ligacoes: [{ id, patrimonioDestinoId, texto, ordem, destino }]` de forma aditiva; ambos são arrays vazios quando não existem itens.

No público, `destino` contém somente `id`, `nome` e `slug`. A consulta filtra destinos PUBLICADO e exclui os dois legados consolidados por UUID e slug. Mesmo um legado publicado indevidamente por escrita externa não aparece como relacionado. Autorrelações são impedidas no service e no banco. No admin, `destino` inclui também `status`, inclusive RASCUNHO/ARQUIVADO, para edição. A relação é direcionada: A → B não cria automaticamente B → A.

As identidades consolidadas Casa José Maurício/Casarão da Nossa História e Albertis/Ponte Alta não são recriadas nem redirecionadas silenciosamente. Tentativas de escrita editorial nos legados ou de associação a eles recebem 409 indicando o slug canônico. Arquivamento de destino oculta a ligação pública sem apagar a edição; republicação a torna visível novamente. Exclusão física elimina vínculos de entrada e saída por FK.

Listagens, paginação, busca D1A, dashboard, imagens, documentos, ARQUIVO/LINK, categorias, usuários, Novidades, Exposições, detalhes e frontend C3 permanecem compatíveis. Não há conversão automática de detalhes nem arrays de substituição no PATCH patrimonial antigo. OpenAPI documenta as operações e os DTOs novos.

### Sync e hash

`SYNC_INCLUDE` inclui fatos, ligações de saída e recebidas para que o hash D1A detecte mudanças editoriais. O sync preserva essas relações; se um legado candidato a consolidação contiver qualquer uma delas, o lote apresenta conflito para revisão manual antes de escrever. Não há importação automática, descarte ou conversão de relações. Os testes de regressão validaram essa preservação, rejeição de hash antigo e idempotência do sync em ambiente de teste.

O código novo passa a depender das tabelas D1B. Sua implantação no ambiente real deve ocorrer somente após revisão e autorização da migration; ela não foi aplicada no banco real nesta execução.

## Arquivos alterados nesta etapa

Comparação contra o working tree inicial da D1B (preservando C2/C3/D1A), caminhos relativos a `backend/`:

| Situação | Arquivos |
| --- | --- |
| Alterados | `prisma/schema.prisma`, `prisma/sync-patrimonios.js`, `src/docs/paths.js`, `src/docs/schemas.js`, `src/routes/index.js`, `src/services/patrimonioService.js`, `test/docs.test.js`, `test/syncPatrimonios.test.js` |
| Novos — estrutura/API | `prisma/migrations/20261014010000_add_fatos_ligacoes/migration.sql`, `src/controllers/patrimonioEditorialController.js`, `src/routes/patrimonioEditorialRoute.js`, `src/schemas/patrimonioEditorialSchema.js`, `src/services/patrimonioEditorialService.js`, `src/utils/identidadeEditorial.js` |
| Novos — testes | `test/patrimonioEditorial.test.js`, `test/d1b.integration.test.js` |
| Novos — relatórios | `reports/D1B-integracao-estrutural.md`, `reports/D1B-auditoria-preliminar-D1C.md` |

Total: 8 arquivos existentes alterados e 10 novos. Nenhuma alteração nas dependências nesta etapa.

## Validação

| Verificação | Resultado |
| --- | --- |
| Testes específicos D1B, sync/hash e OpenAPI (4 arquivos) | 34 aprovados, 0 falhas, 0 ignorados |
| Suíte backend completa | 251 aprovados, 0 falhas, 0 ignorados |
| `npm run lint` | Aprovado |
| `npm run prisma:validate` | Schema válido |
| `git diff --check` | Aprovado |
| Replay completo | As 6 migrations aplicadas em banco descartável vazio |
| Upgrade do estado anterior | 5 migrations anteriores + registros sentinela + D1B; patrimônio e detalhes preservados, tabelas novas vazias |
| Rollback SQL da D1B | Criação transacional revertida; tabelas novas ausentes e registros anteriores preservados |
| Constraints do upgrade versus replay | Definições idênticas |
| `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | Nenhuma diferença, exclusivamente no banco de teste |

Integração cobriu criar/listar/editar/excluir/reordenar, validações, propriedades e pais inexistentes, permissões, rollback de mutações e autor, concorrência, ordem máxima, FKs/unique/checks, cascatas, destinos nos três status, publicação/arquivamento, filtros públicos e consolidações. A suíte completa cobriu também referências, upload/imagens, busca, dashboard, usuários e sync/hash. Houve aviso de depreciação do driver `pg` sobre fila de consultas; não houve falha e a mudança de driver ficou fora do escopo.

Bancos descartáveis utilizados e removidos ao final:

- `portal_d1b_5bab607cd9_test` — replay completo e testes.
- `portal_d1b_upgrade_5bab607cd9_test` — upgrade, rollback e comparação de constraints.

Evidências temporárias, ignoradas pelo Git: `.cache/d1b/{baseline.json,changed-files.json,test-db.json,replay.log,schema-diff.log,specific-tests.log,backend-suite.log}`. O replay usou a CLI Prisma local com URL exclusiva de teste; não houve acesso a `patrimonio_guarulhos`.

Checksum SHA-256 de `prisma/patrimonioSeedData.js`, idêntico antes/depois:

`c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8`

Também foram comparados os hashes de todo o frontend e das migrations anteriores: nenhuma alteração nesta D1B. A migration nova contém apenas as duas tabelas editoriais e seus constraints/índices.

## Auditoria preliminar para D1C

Relatório separado: [D1B-auditoria-preliminar-D1C.md](D1B-auditoria-preliminar-D1C.md).

- 83 fatos: 80 vínculos diretos e 3 via alias consolidado.
- 27 ligações: origens 25 diretas/2 aliases; destinos 26 diretos/1 alias.
- 137 referências individuais: 131 diretas e 6 via alias.
- 2 autorrelações após consolidação e 1 duplicata direcionada adicional; 0 destinos inexistentes ou ambíguos.
- 34 entradas da equipe resolvem para 33 identidades canônicas distintas. O catálogo contém a entrada duplicada da Casa José Maurício e não contém a Primitiva Igreja do Rosário (1717).

Nenhum dos 83 fatos ou das 27 ligações foi importado. Banco real = não acessado. Fonte canônica e dados C2 preservados. D1C não iniciada; permanece necessária a revisão/autorização da migration antes de implantação real.

D1B CONCLUÍDA

PRONTA PARA REVISÃO DA MIGRATION
