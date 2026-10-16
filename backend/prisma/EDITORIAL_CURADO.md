# Curadoria editorial D1C

A fonte de execução é exclusivamente `data/patrimonioEditorialCurado.js`. O catálogo da equipe é insumo de auditoria, não de escrita. `patrimonioSeedData.js` continua sendo a fonte canônica dos patrimônios; nenhum conteúdo editorial foi inserido nela.

## Revisão reproduzível, sem banco

Na pasta `backend`:

```sh
node scripts/gerar-curadoria-editorial.js --check
node --test test/d1c.test.js
```

`gerar-curadoria-editorial.js --write` regenera somente os quatro artefatos documentais a partir das decisões explícitas em `data/decisoesEditorialD1C.js`. Não acessa banco. Alterar uma decisão exige revisar justificativa, evidência canônica, texto final e testes. O hash da fonte canônica é verificado; uma mudança exige nova revisão, não atualização automática do hash.

O relatório preliminar D1B fornece o mapa de identidade já auditado: 34 entradas da equipe, 33 identidades distintas, alias 13→Casa José Maurício e Primitiva Igreja do Rosário preservada entre os 34 canônicos. O importador não depende desse catálogo nem do gerador.

## Dry-run posterior, ainda não executado no banco real

```sh
node prisma/import-editorial-curado.js --dry-run --confirm-database=patrimonio_guarulhos
```

Sem argumentos, o modo também é dry-run. A conexão vem da configuração atual do backend. O relatório inclui banco, `source_total`, `creates`, `updates`, `unchanged`, `conflicts`, `errors`, `applied`, `estado_hash`, diff por campo e IDs preservados. A transação `RepeatableRead` executa `SET TRANSACTION READ ONLY` antes de qualquer consulta de domínio. Nenhuma auditoria é gravada no dry-run.

O futuro modo `--apply` exige conjuntamente `--expected-state-hash=<SHA-256>`, `--confirm-database=<nome>` e `--author-id=<UUID>`. Esta documentação não autoriza sua execução. O autor precisa estar ativo: ADMIN ou EDITOR, este último limitado a origens em RASCUNHO. Falhas de identidade, autorização, fonte, hash ou colisão bloqueiam o lote. Erros SQL/falhas de commit propagam erro e revertem a transação; não são relatados como sucesso parcial. Não há retry automático de um plano que deixou de ser aprovado.

## Identidade e preservação

- Slugs canônicos identificam os patrimônios. Chaves editoriais semânticas identificam itens dentro de tipo/origem. IDs numéricos da equipe aparecem apenas em metadados de auditoria.
- Uma criação registra `D1C_EDITORIAL_IMPORT` em `audit_log`, com namespace `D1C-v1`, chave, UUID e snapshot do item. A auditoria permite encontrar o mesmo UUID em reexecuções sem migration adicional.
- Uma atualização exige vínculo de auditoria inequívoco e igualdade do registro atual com o último snapshot importado. Edição ou exclusão administrativa posterior bloqueia a sobrescrita/recriação. Não se adota silenciosamente conteúdo preexistente, mesmo que seu texto seja igual.
- Colisão de ordem, de rótulo de fato ou de par origem/destino impede o lote. Autorrelações e legados consolidados são rejeitados. Uma permuta de ordens ocupadas também é conflito: a reordenação editorial continua sendo responsabilidade do CRUD D1B.
- Itens administrativos extras e itens de versões anteriores retirados do manifesto permanecem intactos. Não há `delete`/`deleteMany`. O importador não altera `Patrimonio`, seus detalhes ou localização, nem `updatedBy`; autoria fica na auditoria.
- Apply usa transação `Serializable`, locks dos pais em ordem de UUID e lock do autor. Recalcula o plano e o hash antes de mutações. Banco, manifesto, fonte, status, registros editoriais e auditoria de propriedade integram o hash. Alterações concorrentes provocam conflito ou rollback.
- A ordem final começa em zero por origem, apenas entre os itens aprovados. Não há inversão automática de ligações, nem reordenação automática de conteúdo administrativo para abrir espaço.

## Testes de escrita

`test/d1c.integration.test.js` exige a guarda existente: `TEST_DATABASE_EXCLUSIVE=1`, `TEST_DATABASE_URL` em PostgreSQL local com nome terminado em `_test`, diferente de `DATABASE_URL`. Nunca apontar esses testes ao banco real. A suíte cria fixtures sintéticas, exercita a função transacional e remove seus próprios registros. Não executa a CLI operacional nem importa dados patrimoniais reais.

Nesta etapa, a estrutura dos bancos descartáveis foi montada com DDL de teste derivado dos seis SQL versionados, exclusivamente neles, sem executar comandos `migrate`, seed, sync ou import. Não foi criada/alterada migration.
