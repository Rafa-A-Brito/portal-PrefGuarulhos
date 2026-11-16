# Status de visitação dos patrimônios

A visitação é informada pelo editor, independentemente de `situacao` (conservação)
e `status` (publicação). Não há dedução pela conservação nem reabertura automática
quando a previsão chega. Um patrimônio publicado e fechado continua na lista e
no detalhe públicos, com os envelopes e filtros atuais.

## Contrato

Os endpoints administrativos existentes de POST/PATCH aceitam:

- `statusVisitacao`: `ABERTO`, `ACESSO_PARCIAL`, `TEMPORARIAMENTE_FECHADO`,
  `SEM_VISITACAO_PUBLICA` ou `NAO_INFORMADO`.
- `motivoRestricao`: texto simples com trim, entre 1 e 2000 caracteres, opcional
  e anulável. Conteúdo com marcação é texto literal, sem interpretação de HTML.
- `previsaoReabertura`: dia real `YYYY-MM-DD` entre os anos 0001 e 9999, opcional
  e anulável. PostgreSQL armazena `DATE`; a API retorna somente o dia, sem fuso.

Criação com status omitido assume `NAO_INFORMADO`. Restrições podem ser gravadas
sem motivo ou previsão. No PATCH, campos omitidos são preservados e `null` limpa
cada campo opcional. Ao informar `ABERTO` ou `NAO_INFORMADO`, ambos são limpos
na mesma escrita, inclusive se enviados no corpo.

As permissões permanecem: ADMIN edita qualquer publicação; EDITOR edita rascunhos.
Criação e alterações participam da auditoria transacional existente, incluindo
a limpeza dos avisos e as datas no formato civil.

Exemplo de PATCH em `/api/admin/patrimonios/:id`:

```json
{
  "statusVisitacao": "TEMPORARIAMENTE_FECHADO",
  "motivoRestricao": "Fechado por reforma do telhado.",
  "previsaoReabertura": "2027-03-15"
}
```

Os três campos constam das respostas administrativas e de
`GET /api/patrimonios` e `GET /api/patrimonios/:slug`. Swagger inclui o enum,
a data anulável e o exemplo de publicado fechado por reforma.

## Migration e Docker

A migration `20261116120000_add_status_visitacao` é aditiva: cria o enum e as
três colunas; existentes e novos registros recebem `NAO_INFORMADO` por padrão.
Há uma cópia na trilha histórica da equipe, sem alterações das migrations antigas.
Use a trilha correspondente ao histórico real do banco. O Compose usa a padrão.

Na raiz do repositório, com as variáveis do Compose já configuradas:

```sh
docker compose build backend migrate
docker compose up -d db
docker compose run --rm migrate
docker compose up -d --no-deps backend
```

O build gera o Prisma Client atualizado. O job `migrate` usa a conta migradora;
a API usa a conta própria. A inicialização não executa seeds automaticamente.
Não é necessário alterar o Compose nem o Dockerfile para esta migration.

Em banco novo, crie o responsável antes da carga. Defina `ADMIN_NAME`,
`ADMIN_EMAIL` e `ADMIN_PASSWORD` privadamente no ambiente do terminal e execute:

```sh
docker compose run --rm -e ADMIN_NAME -e ADMIN_EMAIL -e ADMIN_PASSWORD backend npm run admin:create
```

Revise o dry-run da seed canônica e use o `estado_hash` retornado no apply:

```sh
docker compose exec backend npm run seed:inicial -- --dry-run --created-by-email=RESPONSAVEL
docker compose exec backend npm run seed:inicial -- --apply --confirm-db=NOME_DO_BANCO --created-by-email=RESPONSAVEL --expected-state-hash=HASH_REVISADO
```

Para a seed de pesquisa, substitua `seed:inicial` por `seed:pesquisa` e passe a URL
pública do backend com `docker compose exec -e PATRIMONIOS_PUBLIC_BASE_URL=https://SEU_BACKEND ...`.
Use uma das cargas conforme a fonte desejada. Ambas preservam os registros
existentes e criam somente ausentes como rascunhos, com visitação `NAO_INFORMADO`.
Não se atribuiu visitação confirmada a nenhum patrimônio real.

O projeto tem fixtures de demonstração em memória, separadas das seeds reais.
Com `MOCK_DATA=true`, `espaco-imaginario-2-demo` é um exemplo publicado,
temporariamente fechado por reforma, inteiramente fictício. Para consultar no Docker:

```sh
docker compose run --rm --no-deps -e MOCK_DATA=true -p 3333:3333 backend
# Em outro terminal:
curl http://localhost:3333/api/patrimonios/espaco-imaginario-2-demo
```

Esse comando usa a demonstração em memória; não insere o exemplo no PostgreSQL.

## Verificações reproduzíveis

Dentro de `backend/`, no PowerShell:

```powershell
$env:MOCK_DATA="false"
npm.cmd run prisma:generate
npm.cmd run prisma:validate
npm.cmd run lint
npm.cmd test
npm.cmd run test:visitacao:postgres
```

O último comando exige os binários PostgreSQL; `PG_BIN` pode apontar à pasta
que contém `initdb` e `pg_ctl` (padrão Windows: PostgreSQL 18). Ele cria cluster
temporário com senha aleatória e porta loopback, aplica a trilha padrão em banco
novo e roda os testes de migration, edição/publicação e ambas as seeds em bancos
separados. Remove somente o cluster temporário que criou. Não usa o banco da API.
Os testes de integração também podem usar as guardas de `TEST_DATABASE_URL` e
`TEST_DATABASE_EXCLUSIVE=1` existentes no projeto.

## Arquivos da implementação

- `prisma/schema.prisma` e as duas migrations `20261116120000_add_status_visitacao/migration.sql`.
- `src/config/prismaTypes.js`, `src/schemas/patrimonioSchema.js`,
  `src/services/patrimonioService.js`, `src/utils/visitacaoPatrimonio.js` e `src/utils/auditoria.js`.
- `src/mock/catalog.js` e `src/mock/store.js`.
- `src/docs/schemas.js`, `src/docs/paths.js`, este guia e o link em `README.md`.
- `package.json`, `scripts/validate-visitacao-postgres.js`, os testes
  `adminPatrimonio.test.js`, `adminPatrimonio.integration.test.js`,
  `patrimonio.test.js`, `docs.test.js`, `mockData.test.js`, `r1.test.js`,
  `initialLoad.integration.test.js`, `initialResearch.integration.test.js` e
  `visitacaoMigration.integration.test.js`.
