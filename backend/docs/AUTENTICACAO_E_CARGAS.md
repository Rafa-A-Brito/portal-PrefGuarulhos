# Autenticação e cargas — procedimento atual

Este documento substitui as instruções antigas sobre seeds que sobrescreviam
registros ou usavam `PatrimonioSecao`. As fontes documentais originais permanecem
preservadas; não foram unificadas por nome nem reescritas para satisfazer o schema.


## Fonte canônica e pesquisa

`prisma/patrimonioSeedData.js` é a fonte canônica declarada: 34 identidades,
descrições completas, localização, detalhes e imagens. `prisma/data/patrimonios.js`
é o snapshot da pesquisa da equipe (34 entradas), não uma autorização para
substituir conteúdo canônico ou administrativo.

O mapa explícito `prisma/data/identidadesPesquisa.js` reproduz as correspondências
auditadas em D1B/D1C. A entrada 13 é alias de Casa José Maurício (9), portanto
`seed:pesquisa` prepara **33 identidades**, e não cria uma segunda ficha por
semelhança de nomes. A Primitiva Igreja do Rosário continua na fonte canônica e
não foi inventada no catálogo de pesquisa. Os dois legados consolidados de C2
são fallback de identidade quando não há canônico, sem renomear ou arquivar nada.

Fatos e ligações obedecem às decisões já aprovadas de
`prisma/data/patrimonioEditorialCurado.js`. Os 83 fatos brutos foram rejeitados,
duplicados ou ficaram sem suporte suficiente na revisão D1C; não são reintroduzidos.
Somente as ligações aprovadas são criadas, com texto e ordem do manifesto. Destino
fora do catálogo escolhido é informado em pendências. Nenhuma ligação é criada
em registros existentes pela carga inicial.

`PatrimonioDetalhe` recebe os detalhes canônicos com título, ícone, texto e ordem.
A descrição obrigatória vem da descrição existente da fonte canônica, sem texto
inventado ou placeholder. O relatório enumera títulos divergentes da pesquisa,
contagens de fatos/ligações originais e o alias 13, com motivo para não sobrescrever.
No modo pesquisa, número/ordem de exibição e a imagem da identidade auditada são
preservados nos novos registros. Os assets originais em `public/patrimonios`
permanecem intactos e são referenciados por `/arquivos/patrimonios/...`.
Assim como no contrato anterior, `seed:pesquisa` exige
`PATRIMONIOS_PUBLIC_BASE_URL` com a URL pública HTTP(S) do backend e grava a URL
completa da imagem. Isso mantém as imagens funcionando com frontend em outra
origem; não depende de servir os arquivos no host do frontend. Não incluir
credenciais, query ou fragmento nessa variável.

As fontes e os artefatos com hashes revisados têm LF fixado em `.gitattributes`.
Isso preserva os hashes aprovados em Windows; não foram trocados hashes ou decisões
para aceitar conteúdo divergente. A carga verifica a fonte canônica e o snapshot
semântico da pesquisa antes de escrever.

## Carga inicial opcional

Os dois comandos usam o mesmo motor de preservação e identidade:

```sh
# Dentro de backend, com DATABASE_URL deliberadamente selecionada:
npm run seed:inicial -- --dry-run --created-by-email=RESPONSAVEL
npm run seed:pesquisa -- --dry-run --created-by-email=RESPONSAVEL
```

Sem argumentos ambos simulam. `npm run prisma:seed` também aponta ao seed inicial
seguro e simula por padrão. Não executar os dois esperando que o segundo atualize
o primeiro: carga inicial preserva os existentes integralmente.

Revisar `itens`, `conflitos`, `pendencias` e `estado_hash` e então, no ambiente
autorizado, usar o comando correspondente:

```sh
npm run seed:inicial -- --apply --confirm-db=NOME_DO_BANCO --created-by-email=RESPONSAVEL --expected-state-hash=HASH_REVISADO
npm run seed:pesquisa -- --apply --confirm-db=NOME_DO_BANCO --created-by-email=RESPONSAVEL --expected-state-hash=HASH_REVISADO
```

A conexão real precisa corresponder ao nome confirmado. O responsável deve existir
e estar ativo como ADMIN/EDITOR. Carga inicial **sempre cria RASCUNHO** e não aceita
flag para publicar. O autor técnico é `seed.patrimonios@localhost.invalid`, EDITOR
inativo, com hash aleatório sem senha de acesso conhecida. Uma conta técnica ativa
ou com papel divergente é conflito, nunca corrigida automaticamente.

Categorias ausentes são criadas somente quando necessárias; existentes não são
atualizadas. Patrimônios existentes mantêm UUID, slug, nome, textos, status, datas,
autoria, localização, capa, detalhes e todas as relações. A carga não chama update
ou delete nesses registros. Não republica arquivados nem remove conteúdo ausente
da fonte. Reexecução não duplica e não avança updatedAt.

O vínculo `INITIAL_LOAD_BINDING` na auditoria associa uma chave estável à UUID e
permite reconhecer alterações posteriores de nome/slug. O mapa de aliases é
compartilhado com o importador/sync; nome normalizado isolado nunca comprova uma
identidade. Ausência de vínculo, colisão ou ambiguidade bloqueia o lote. Para
uma correspondência manual comprovada, revisar e passar `--reconcile=arquivo.json`:

```json
[{"sourceKey":"canonical/CHAVE_DA_FONTE","patrimonioId":"UUID_EXISTENTE","expectedHash":"HASH_DO_REGISTRO_NO_DRY_RUN"}]
```

O hash deve corresponder exatamente ao registro e o plano inteiro precisa ser
revisto depois da reconciliação. A auditoria de vínculo não altera o patrimônio.
Não contornar conflitos com senha, UUID ou nome presumidos.

## Atualizações intencionais e importadores

Carga inicial e atualização são operações diferentes. Os modos úteis do importador
foram mantidos, com simulação padrão e aplicação explícita do lote em transação
única. Backfills continuam preenchendo apenas relações ausentes. O dry-run executa
READ ONLY; não cria usuário, categoria, auditoria, diretório ou arquivo.

```sh
npm run import:patrimonios -- --dry-run --created-by-email=RESPONSAVEL
npm run import:patrimonios -- --backfill-location --dry-run --created-by-email=RESPONSAVEL
npm run import:patrimonios -- --backfill-details --dry-run --created-by-email=RESPONSAVEL
npm run import:patrimonios -- --backfill-images --dry-run --created-by-email=RESPONSAVEL
npm run import:patrimonios -- --sync-patrimonios --dry-run --created-by-email=RESPONSAVEL
node scripts/import-novidades.js --dry-run --created-by-email=RESPONSAVEL
```

Todos os modos de escrita exigem `--apply --confirm-db=NOME_DO_BANCO
--created-by-email=RESPONSAVEL --expected-state-hash=HASH_REVISADO`, além do modo
selecionado. Refazer o dry-run após qualquer edição, mudança de fonte ou imagem.
Hash antigo impede a aplicação. Não há retry oculto de escritas.

A importação normal preserva registros reconhecidos; não atualiza dados existentes.
Ela exige categorias existentes. Para bootstrap com criação segura de categorias,
usar o seed inicial, não flags improvisadas no importador. Publicação é somente
para ADMIN e com `--status=PUBLICADO` explícito; o padrão continua RASCUNHO e o
Poço Municipal mantém sua restrição documental. Backfills e sync não publicam.

O sync pode consolidar os dois legados já aprovados em C2, mas isso agora exige
`--consolidate-legacy` explícito **tanto no dry-run quanto no apply**, com novo hash.
Sem essa opção, um legado pendente é conflito; ele não é arquivado como efeito
colateral de uma atualização de textos. Esse modo continua revisável e preserva
os controles existentes de relações, auditoria e UUIDs. Nenhuma consolidação foi
aplicada em banco compartilhado nesta tarefa.

O importador D1C separado mantém seu contrato `--expected-state-hash`,
`--confirm-database` e `--author-id`, suas decisões de publicação/permissão e seus
controles de propriedade editorial. Não se fundiram os manifestos ou as trilhas.

Todos os lotes mutáveis usam transação, proteção de concorrência e compensação
dos arquivos criados por aquela tentativa. A compensação confere inode, hash e
referências antes de apagar. Arquivos preexistentes/reutilizados não são removidos.
Erros de validação/identidade bloqueiam o lote antes das escritas; erro de banco ou
commit reverte o lote inteiro. Banco e filesystem não são atômicos: falhas de
compensação são registradas para recuperação, sem apagar por suposição.

### Banco local com histórico da equipe

O nome do banco não identifica sua trilha. Se o banco local tem as migrations
`add_pesquisa_patrimonios` e `add_regiao_patrimonio`, não aplicar a trilha padrão.
Conferir os registros e checksums de `_prisma_migrations` e salvar backup antes.
Diferenças apenas de CRLF/LF não justificam editar o checksum armazenado.

Para o banco local exclusivo expressamente autorizado, há o config
`prisma.local-equipe.config.js`. Exige `LOCAL_EQUIPE_DATABASE_URL` com host
loopback e `LOCAL_EQUIPE_CONFIRM_DB` igual ao nome exato do destino. Sem ambas,
ou com host remoto, aborta. Não altera a proibição do config normal da equipe.
Com essas variáveis configuradas de forma privada:

```sh
npx prisma migrate status --config prisma.local-equipe.config.js
npx prisma migrate deploy --config prisma.local-equipe.config.js
```
