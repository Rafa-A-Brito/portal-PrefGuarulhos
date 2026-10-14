# Integração local do histórico do backend

## Referências verificadas

- Origem: `Rafa-A-Brito/portal-Pref-Guarulhos-backend`, `main`, `9e380ffa77e9489aed9e4ed3ddf1351058b1bc4d` (44 commits alcançáveis).
- Destino: `Rafa-A-Brito/portal-PrefGuarulhos`, `development/backend`, `debe6cd59413e09313e3622d3bb57389b46c71eb` (32 commits alcançáveis).
- Branch de trabalho: `integracao/backend-historico`, criada a partir do destino atualizado.
- Os dois clones foram conferidos antes da integração. O destino estava limpo. A origem tinha somente o clone do destino como pasta não rastreada; essa pasta foi preservada.

## Estratégia e evidência

Os históricos não tinham ancestral comum. Entretanto, `48a412c:backend` no destino e a árvore da origem no commit `d323262b2f2a29d6f5898d2ad001705ff22c9d08` são idênticos: árvore `4ca793bf3562aca46b8a31f349d89abc9fc16b9c`.

Um merge de conexão com `--allow-unrelated-histories -s ours` vincula esse snapshot já importado, sem modificar a árvore atual do destino. Em seguida, um merge de três vias com `-s recursive -Xsubtree=backend` integra a main atual na pasta existente. O primeiro merge não descarta alterações novas da origem: seu segundo pai é apenas a versão inicial já comprovadamente importada; o merge seguinte incorpora seus descendentes.

Nenhum commit original foi reescrito, copiado por cherry-pick ou condensado. Os hashes, autores e mensagens da origem e do destino permanecem no grafo. Não foi utilizado `subtree add` sobre a pasta existente.

Para arquivos copiados posteriormente, a resolução usou blobs idênticos encontrados nos dois históricos como bases adicionais de comparação. Exemplos: `a509751` para controller, rotas administrativas e schema de usuários; `d2aa845` para schema Prisma, edição de patrimônios e respectivos testes. Os conflitos restantes foram conciliados por funcionalidade.

## Funcionalidades conciliadas

- Destino: novidades, exposições, site hero, detalhes patrimoniais, categorias, gestão de usuários, referências por link/arquivo, importadores, sincronização editorial, publicação em lote com transação recebida e dry-run, assets e dados já existentes.
- Origem: dashboard e classificação regional, seções/fatos/ligações, numeração e ordenação editorial, carga de pesquisa, arquivos públicos da pesquisa e gerenciamento de imagens/documentos com validação, limpeza de metadados nullable e bloqueio do patrimônio durante gravação.
- Coordenadas: permanece a regra do destino que exige envio do par no PATCH; `null/null` limpa, omissão preserva, zero é válido. A classificação regional é independente e aceita limpeza por `null`.
- Upload compartilhado: o campo `imagem` mantém o contrato anterior, inclusive GIF, limite de 10 MB e texto alternativo derivado. O campo `arquivo` mantém o contrato da origem, com assinatura real, metadados obrigatórios e limite configurado. Arquivo duplicado ou erro posterior limpa o upload novo.
- O upload legado também verifica status após `SELECT ... FOR UPDATE`. A exclusão legada de imagem utiliza a recuperação por quarentena, com restauração em rollback e limpeza definitiva após commit. As proteções contra caminhos redirecionados e arquivos não regulares foram preservadas. Banco e disco não são atômicos.
- Swagger reúne contratos dos dois lados, incluindo nullable, DTO ampliado de usuários e ambos os formatos de upload.
- A seed padrão do destino (`prisma/seed.js`) foi preservada. A carga da origem é explícita por `npm run seed:pesquisa`; exige revisão do dry-run/reconciliação antes de aplicar em banco com editoria existente.
- Todas as migrations existentes do destino foram preservadas. Foram acrescentadas somente as migrations da origem ainda ausentes. Nenhuma migration ou seed foi executada.
- Nenhum arquivo do frontend ou da raiz do monorepo foi alterado.

## Validação

- Suíte integrada: `node scripts/run-suite.js`, 319 testes, 305 aprovados, zero falhas, 14 ignorados.
- Tests de senha desenvolvidos independentemente foram mantidos em suites separadas; testes territoriais, editoriais e de coordenadas foram conciliados.
- Regressões adicionais cobrem os campos `imagem`/`arquivo`, assinatura inválida, arquivo duplicado, limpeza após publicação concorrente simulada e restauração da imagem legada após falha no commit.
- Prisma: schema validado e client gerado, sem acesso de escrita ao banco.
- OpenAPI validado por SwaggerParser nos testes.
- `git diff --check` aprovado.

## Verificações pendentes

Os testes PostgreSQL, inclusive bloqueio real de publicação concorrente e aplicação conjunta das migrations, não foram executados: não havia banco de testes exclusivo configurado e o daemon Docker estava indisponível na sessão. Mocks não demonstram bloqueio real. Um teste de snapshot também foi ignorado porque a fonte externa não estava disponível.

A integração é local. Não houve push nem alteração direta de `development/backend`, reset, clean ou force push.
