# D1C — curadoria documental concluída

Base de trabalho: commit `aa03a6db480a046987860754e8d58d4beb84aeff`, working tree inicialmente limpo. Foram criados somente arquivos da curadoria/importador/testes/documentação; os 570 arquivos versionados existentes mantiveram seus hashes. Não houve alteração em schema, migrations, frontend/C3, rotas, serviços, dados C2 ou fonte canônica.

## Resultado editorial

| Fatos | Quantidade |
| --- | ---: |
| Originais auditados | 83 |
| Aprovados sem reescrita | 0 |
| Aprovados com reescrita | 0 |
| Duplicados de detalhes | 67 |
| Rejeitados | 11 |
| Pendentes de fonte | 5 |

Os 11 rejeitados compreendem 6 `CONTRADIZ_C1_C2` e 5 `REJEITAR` por redundância com descrição/cadastro ou inadequação ao bem. Os seis divergentes também recebem `verificacao = EXIGE_VERIFICACAO_DOCUMENTAL` antes de qualquer reconsideração; não são somados novamente aos cinco pendentes, para manter a partição dos 83 originais.

Nenhum fato foi aprovado apenas para preencher a tabela. Datas, estilos e tombamentos úteis já estavam descritos na fonte canônica; o manifesto desta versão tem `fatos: []`.

| Ligações | Quantidade |
| --- | ---: |
| Originais auditadas | 27 |
| Autorrelações rejeitadas | 2 |
| Duplicata após consolidação rejeitada | 1 |
| Pares candidatos após esses três impedimentos | 24 |
| Aprovadas sem reescrita | 3 |
| Aprovadas com reescrita | 11 |
| Outras rejeitadas por relação fraca | 10 |
| Total rejeitado, incluindo impedimentos estruturais | 13 |
| Pendentes | 0 |
| Manifesto final | 14 |

As 14 ligações aprovadas são direcionadas, já existentes no material revisado: 1→10, 1→20, 3→34, 6→7, 6→21, 7→6, 7→21, 10→1, 11→24, 20→1, 21→7, 21→6, 24→11 e 34→3. Os números servem somente para rastrear o catálogo secundário; o manifesto usa slugs canônicos e chaves semânticas.

As relações Estação/Casa Amarela são funcionais; Estação/Locomotiva são memoriais, sem afirmar proveniência ou operação da locomotiva nº 33 no ramal. Catedral/Antiga Matriz preservam a sucessão histórica sem afirmar coincidência exata de perímetro. Festa/Carpição/Santuário preservam manifestação e local de referência como conceitos diferentes. Paço/Praça Getúlio relacionam espaços que abrigaram Prefeitura/Câmara, sem afirmar que a transferência de 1958 saiu diretamente do prédio do Paço ou que houve ocupação contínua até essa data.

As analogias entre demolições e ligações baseadas apenas em proximidade/tema foram rejeitadas. Não foram criadas ligações inversas automaticamente.

## Auditoria integral e fontes

- [Matriz dos 83 fatos e 27 ligações](D1C-auditoria-editorial.md): item por item, valores originais, resolução de identidade, decisão, justificativa, apoio e valores finais.
- [Auditoria estruturada](D1C-auditoria-editorial.json): mesmos itens, trechos canônicos integrais, hash da fonte, URLs já incorporadas quando disponíveis e sinalização de verificação documental.
- [Manifesto de exclusões](D1C-excluidos-editoriais.json): todos os 83 fatos excluídos desta versão, incluindo pendentes, e as 13 ligações rejeitadas. Nenhum item desapareceu sem decisão.
- [Manifesto aprovado](../prisma/data/patrimonioEditorialCurado.js): zero fatos e 14 ligações, exclusivamente aprovados.

Apoio documental reutilizado da fonte canônica/C1/C2 conforme solicitado. Não foi realizada nova certificação histórica externa nem usado Google Maps como fonte histórica. Afirmações novas ou contraditórias não foram aprovadas. Trechos sem URL representam apoio no conteúdo canônico já incorporado, e não consulta independente à fonte primária nesta etapa.

### Cinco fatos pendentes

| Item | Tema | Pendência |
| --- | --- | --- |
| F-9-1 | Casa José Maurício: tombamento | Confirmar proteção específica do imóvel; aquisição/reabertura não comprovam tombamento |
| F-11-2 | Paço: Prefeitura até 1958 | Mudança para a Praça em 1958 não comprova ocupação contínua deste prédio até essa data |
| F-12-1 | Adamastor: tombamento em 2000 | Exige fonte de proteção específica, sem deduzir de outros bens protegidos naquele ano |
| F-20-2 | Locomotiva: operou até a década de 1960 | Confirmar a biografia do equipamento nº 33, separada da história do ramal |
| F-26-0 | Cabuçu: autoria de Edward Wegmann | Uso de perfil técnico não comprova autoria direta do projeto |

As decisões referentes a Casa José Maurício e ao alias 13 comparam os fatos de ambos com os detalhes atuais, preservando divergência de data e numeração 150/207. A Primitiva Igreja do Rosário continua entre os 34 canônicos, embora não exista no catálogo da equipe. Poço, Lavras e Cultura Indígena não receberam conteúdo inventado nem mudança de localização. As notas e as decisões sobre Padre Bento, Albertis, Carbonell, Casa Amarela, Antiga Matriz e manifestações imateriais estão explicitadas na matriz.

## Importador preparado, não executado no banco real

[`prisma/import-editorial-curado.js`](../prisma/import-editorial-curado.js) usa dry-run por padrão, transação READ ONLY, diff detalhado e hash de estado. Apply futuro exige opção explícita, hash revisado, banco confirmado e ADMIN/EDITOR ativo com permissão. Auditoria mantém a identidade do item e preserva UUIDs; edição administrativa posterior bloqueia sobrescrita. Colisão de ordem, rótulo ou par impede o lote. Não há exclusão indiscriminada nem alteração dos patrimônios.

Procedimento e limites: [EDITORIAL_CURADO.md](../prisma/EDITORIAL_CURADO.md). Não houve execução operacional do importador, nem mesmo dry-run, em `patrimonio_guarulhos`. Chamadas da função de importação ocorreram somente nos testes, com Prisma simulado ou PostgreSQL descartável.

## Arquivos criados

| Grupo | Arquivos relativos a backend/ |
| --- | --- |
| Revisão e manifesto | `prisma/data/decisoesEditorialD1C.js`, `prisma/data/patrimonioEditorialCurado.js` |
| Geração e importador | `scripts/gerar-curadoria-editorial.js`, `prisma/import-editorial-curado.js` |
| Testes | `test/d1c.test.js`, `test/d1c.integration.test.js` |
| Documentação | `prisma/EDITORIAL_CURADO.md`, este relatório, `reports/D1C-auditoria-editorial.md`, `reports/D1C-auditoria-editorial.json`, `reports/D1C-excluidos-editoriais.json` |

11 arquivos novos; nenhum arquivo existente alterado. Evidências locais e scripts auxiliares ficaram em `.cache/d1c`, ignorado pelo Git.

## Validação

| Verificação | Resultado |
| --- | --- |
| Testes específicos D1C | 19 aprovados; zero falhas/ignorados |
| Suíte backend completa, incluindo D1A/D1B/R1 | 403 aprovados; zero falhas/ignorados |
| Lint | Aprovado |
| Prisma validate | Válido; nenhuma migration executada |
| Geração/check documental repetível | Aprovado, saída idêntica |
| Sintaxe dos JS novos | Aprovada |
| `git diff --check` e whitespace dos arquivos novos | Aprovados |
| Hashes dos 570 arquivos versionados iniciais | Todos preservados |

PostgreSQL descartáveis: `portal_d1c_07ce2f7dcb_test` (específicos) e `portal_d1c_027c401c90_test` (suíte completa). Ambos removidos após os testes. Sua estrutura foi montada exclusivamente neles com DDL de fixture derivado dos seis SQL versionados; nenhum comando `migrate`, seed, sync ou import CLI foi executado. Nenhum dado real foi copiado.

Testes exercitaram alias, cobertura completa, exclusões estruturais, determinismo, dry-run READ ONLY, colisões, conteúdo extra, hash obsoleto, permissão, rollback por falha de auditoria, atualização inequívoca, reexecução com mesmos UUIDs e proteção contra edição manual. Checksums de todas as tabelas preexistentes, exceto auditoria autorizada, permaneceram idênticos durante o teste de importação. A suíte mantém avisos de depreciação do driver `pg` em testes anteriores e logs esperados de falhas simuladas; não houve falha de teste.

## Banco real e preservação

Consulta direta de contagens em `patrimonio_guarulhos`, `localhost:5432`, em 2026-10-14 às 22:10:36 UTC: `transaction_read_only = on`; fatos = **0**, ligações = **0**, patrimônios = **36**. A conexão usou `default_transaction_read_only=on`; a transação foi explicitamente READ ONLY e encerrada com ROLLBACK. Nenhum importador foi invocado nessa conexão.

Banco real = **não alterado**. Nenhum seed, sync apply, import apply, migration, db push ou reset executado nele. Schema/migrations/C2/C3 permanecem intocados.

SHA-256 canônico antes/depois:

`c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8`

Pendências: verificar documentalmente os cinco fatos sem suporte e as seis divergências caso se deseje reconsiderá-los; revisar e autorizar o dry-run editorial real em etapa posterior. Nenhuma dessas pendências está no manifesto aprovado. Apply não iniciado.

D1C CURADORIA CONCLUÍDA

PRONTA PARA DRY-RUN EDITORIAL
