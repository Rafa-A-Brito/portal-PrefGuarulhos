# Raio de protecao do entorno

`raioProtecaoEntornoMetros` e opcional e documental, em metros. PostgreSQL
DECIMAL(12,3), de 0.001 a 999999999.999, com ate tres casas decimais.
A API exige numero JSON finito (nao converte strings). Criacao sem campo ou
com null inicia sem raio; PATCH omitido preserva e null remove. Detalhes publico
e administrativo retornam numero ou null. Listagens mantem o contrato atual.
Permissoes, publicacao e auditoria seguem os fluxos existentes.

Nenhum raio oficial foi atribuido aos patrimonios reais. O mapeamento da carga
aceita o campo quando a fonte canonica o fornecer; alteracoes documentais nessa
fonte devem seguir a revisao do manifesto D1C e de seu hash. As cargas iniciais
preservam integralmente registros existentes. O importador tambem aceita o campo.
A demonstracao em memoria contem 100 metros em `espaco-imaginario-1-demo`;
nao insere esse exemplo na carga real.

## Docker, preservando o volume

Na raiz, com as variaveis de ambiente do projeto configuradas:

```sh
docker compose build backend migrate
docker compose up -d db
docker compose run --rm migrate
docker compose up -d --no-deps backend
```

O Compose exige sucesso de migrate antes de iniciar backend. Seeds sao manuais,
nao executadas automaticamente no startup. Execute-as somente apos a migration.
Nao execute `down -v`, `db push` ou reset. Em banco novo, crie o responsavel:

```sh
docker compose run --rm -e ADMIN_NAME -e ADMIN_EMAIL -e ADMIN_PASSWORD backend npm run admin:create
```

Revise o dry-run e use o estado_hash retornado:

```sh
docker compose exec backend npm run seed:inicial -- --dry-run --created-by-email=RESPONSAVEL
docker compose exec backend npm run seed:inicial -- --apply --confirm-db=NOME_DO_BANCO --created-by-email=RESPONSAVEL --expected-state-hash=HASH_REVISADO
```

Para pesquisa, substitua seed:inicial por seed:pesquisa e adicione
`-e PATRIMONIOS_PUBLIC_BASE_URL=https://SEU_BACKEND` ao exec. Apos cadastrar
manualmente um raio, gere novo dry-run e novo hash antes de repetir o apply:
o estado mudou, portanto o hash anterior nao deve ser reutilizado.

## Verificacao

Em backend/, `npm run prisma:generate` atualiza o client. No PowerShell,
use `$env:MOCK_DATA="false"` para os testes de banco/API real.
`node scripts/validate-raio-postgres.js` cria cluster e bancos temporarios,
aplica todas as migrations em banco vazio e executa adminPatrimonio,
initialLoad e initialResearch de integracao. Nao conecta ao banco da aplicacao.
Requer PostgreSQL local (PG_BIN, padrao PostgreSQL 18 no Windows).
Os testes da carga conferem null inicial e preservacao do raio manual na
reexecucao canonica e de pesquisa; os administrativos conferem gravacao,
leitura publica, omissao, null e auditoria.
