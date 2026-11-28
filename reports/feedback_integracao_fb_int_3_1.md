# FB-INT-3.1 — Validação do perfil de desenvolvimento local

27/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD `f78b1f4a23ab86f7c768638920ee43e23b225253`. **Meta atingida: 924/924 testes frontend aprovados**, com o perfil local exercitado em Node.js **24.22.1**. Sem commit, push, deploy ou ativação pública.

## Escopo e preservação

Consultados o [guia de desenvolvimento](../backend/docs/feedback_desenvolvimento_local.md), o [relatório FB-INT-3](feedback_integracao_fb_int_3.md), os manifestos npm, o iniciador `backend/scripts/feedback_local.cjs`, configurações de ambiente, Git e evidências anteriores. O checkout já continha a integração visual FB-INT-3 e o perfil local ainda não commitados. Foram preservados.

O manifesto inicial registrou SHA-256 de **979 arquivos preexistentes**, incluindo arquivos de entrega ainda não rastreados. Nesta etapa, somente dois desses arquivos foram alterados:

| Arquivo | Alteração |
| --- | --- |
| `backend/eslint.config.js` | A configuração de globais Node e regras já aplicada a `**/*.js` passou a contemplar também `**/*.cjs`. |
| `backend/docs/feedback_desenvolvimento_local.md` | Acrescentada a confirmação com Node 24 e comandos para selecionar o executável local sem mudar o Node global. |
| Este relatório | Novo registro da validação FB-INT-3.1. |

O primeiro lint backend encontrou 19 ocorrências `no-undef` no iniciador CommonJS, pois os globais Node estavam restritos à extensão `.js`. A correção trata a configuração do lint; nenhuma regra foi desativada ou erro suprimido. A execução final passou.

O iniciador, os dois `package.json`, todos os fontes visuais e testes existentes ficaram idênticos ao início desta etapa. Preservados Home/+25, Histórico, FB-INT-1/2/3, autenticação, contratos, permissões, schema, migrations e dependências. Nenhuma dependência instalada. [Manifesto inicial](../.cache/fb_int_3_1/antes.json) e [auditoria final](../.cache/fb_int_3_1/auditoria.json).

## Arquivos privados e Git

Foram cruzados `git ls-files` e `git check-ignore` para os arquivos locais relevantes. **13 arquivos privados conferidos, todos ignorados, nenhum rastreado**: `.env` habitual, `.env.local`, os dois `.env.feedback.local`, conteúdo de `.secrets/feedback_local` incluindo credenciais, configuração, logs e backups, além de arquivos representativos do cluster e das evidências anteriores em `.cache`.

A busca no índice inteiro também não encontrou caminhos rastreados sob `.secrets`/`.cache`, arquivos `.env` privados ou backups `.dump`/`.backup`/`.bak`. Os `.env.example` permanecem intencionalmente versionados. As regras existentes `.env.*`, `.secrets/` e `.cache/` foram suficientes; não houve mudança no `.gitignore` nem remoção de arquivos do índice.

Os valores de JWT, segredo de autenticação, senhas de conexão/inspeção e chaves HMAC do perfil foram comparados em memória com os arquivos rastreados e novos arquivos não ignorados: **nenhuma ocorrência encontrada**. A conferência não imprimiu esses valores. Isso confirma os caminhos e segredos examinados no checkout atual; não é uma auditoria de todo o histórico Git.

## Revisão dos comandos

| Ação | Revisão e resultado |
| --- | --- |
| `feedback:banco` | Restringe URL a loopback, porta 5558 e banco `portal_test`; fixa identificador e diretório. Confere `pg_controldata` antes de iniciar, consulta estado e só inicia se parado. Não provisiona nem migra. Executado com Node 24. |
| `feedback:conferir` | Confere identidade/diretório, migrations/checksums, papel sem privilégios administrativos e SELECT/INSERT sem UPDATE/DELETE em Feedback e recibos. Transações READ ONLY com timeout. Executado com Node 24. |
| `feedback:backup` | Confere o destino antes de executar `pg_dump -Fc`; senha somente no ambiente do processo. Arquivo privado em `.secrets/feedback_local/backups`. Backup novo criado e reconhecido como PGDMP; `pg_restore --list` exit 0, incluindo Feedback. Nenhuma restauração. |
| `dev:feedback` backend | Carrega explicitamente o perfil privado, limpa herança de variáveis da aplicação, mantém a aplicação e worker existentes e escuta somente em `127.0.0.1:3358`. A API recebe papel restrito, sem credencial de inspeção. |
| `dev:feedback` frontend | Carrega somente as quatro variáveis permitidas; não mescla o `.env` habitual. Preserva configuração/proxy Vite, HMR, porta estrita 5238 e loopback. Nenhuma credencial backend é exportada ao Vite. |
| `feedback:parar` | Confere identidade e privilégios antes de `pg_ctl stop`, modo fast, sobre o diretório exclusivo. Executado e dados preservados. |

Os comandos habituais foram comparados com HEAD: backend **`nodemon src/server.js`**, frontend **`vite`**, ambos inalterados. O perfil é opt-in e continua específico desta máquina. O banco permanece em `.cache/fb_int_1/pgdata`; esse diretório não deve ser apagado como cache descartável. Nenhum caminho de recuperação foi movido.

Os exemplos backend continuam com `FEEDBACK_RECEBIMENTO_ATIVO=false` e `FEEDBACK_CONSULTA_ATIVA=false`; o exemplo frontend e o argumento padrão do Dockerfile continuam com `VITE_FEEDBACK_ATIVO=false`. As flags verdadeiras estão apenas nos perfis privados preparados para desenvolvimento. Nenhum arquivo habitual de ambiente foi alterado.

## Compatibilidade Node 24 e preservação do banco

Utilizado `.cache/d4_final/node24/node.exe`, versão **24.22.1**, em cmd.exe. Foram executadas diretamente as mesmas ações dos scripts npm, selecionando explicitamente esse executável:

```bat
.cache\d4_final\node24\node.exe --check backend\scripts\feedback_local.cjs
.cache\d4_final\node24\node.exe --check backend\eslint.config.js
.cache\d4_final\node24\node.exe backend\scripts\feedback_local.cjs banco
.cache\d4_final\node24\node.exe backend\scripts\feedback_local.cjs backup
.cache\d4_final\node24\node.exe backend\scripts\feedback_local.cjs api
```

Em outro terminal, ação `frontend`; ao encerrar API/Vite, ação `parar`. As ações fazem sua própria conferência READ ONLY antes da execução. Os comandos npm mantêm a escolha do Node pelo PATH, conforme documentado no guia.

O cluster PostgreSQL **18.6**, `127.0.0.1:5558/portal_test`, identificador **7712578530882550764**, foi o único banco acessado nesta etapa. As 16 migrations existentes foram conferidas, não reaplicadas. O banco habitual não foi acessado novamente.

Conferência HTTP real com API/Vite iniciados pelo perfil sob Node 24:

- `/contato`: **200**, com a flag pública verdadeira no módulo servido pelo Vite.
- OPTIONS de Feedback através do proxy: **204**, com origem e cabeçalhos autorizados.
- Consulta administrativa sem credencial: **401**.
- **Zero POSTs ao ambiente real**, nenhum login novo e nenhum envio válido ou inválido. Os resultados ADMIN/EDITOR da preparação anterior não são apresentados como nova execução nesta etapa.

[Resultado HTTP](../.cache/fb_int_3_1/http.json). A presente conferência de interface foi HTTP, não uma repetição da inspeção visual de navegador da FB-INT-3.

Snapshots READ ONLY agregaram todo o conteúdo de Feedback/recibos em ordem determinística, sem imprimir mensagens. Antes e depois: **cinco feedbacks e cinco recibos**, com hashes idênticos:

| Tabela | SHA-256 antes = depois |
| --- | --- |
| `feedback` | `fe6510405b23367a697a49679265975242481db909b2fc6640e20a0a89d96250` |
| `feedback_recibo` | `55ee7d7bee6b0b09db00166a5878013ee1c190969964f75d9c200586aa8dccba` |

[Antes](../.cache/fb_int_3_1/banco_antes.json), [depois](../.cache/fb_int_3_1/banco_depois.json), [conferência do backup](../.cache/fb_int_3_1/backup.json). API/Vite e cluster foram encerrados; portas **3358, 5238 e 5558 fechadas** ao final. Dados, credenciais e backups ficaram preservados.

## Validação automatizada

| Verificação | Resultado |
| --- | --- |
| Sintaxe do iniciador e ESLint config | Node 24 `--check`, exit 0 em ambos. Manifestos npm também lidos como JSON válido. |
| Suíte frontend completa | **924/924**, **53/53 arquivos**, exit 0; **277,21 s** informados pelo Vitest. Nenhum teste editado nesta etapa. |
| Backend pertinente | **16 aprovados**, zero falhas e **um skip** explícito; **22,59 s**. |
| Lint frontend completo | Exit 0, sem mensagens; 42,29 s incluindo iniciador de medição. |
| Lint backend completo, após correção | Exit 0, sem mensagens; 8,39 s incluindo iniciador de medição. |
| Build frontend | Exit 0; **1.480 módulos**, **11,01 s** informados pelo Vite. |
| `git diff --check` | Exit 0, sem erros de whitespace; avisos Git de normalização futura LF/CRLF. |

Logs: [suíte](../.cache/fb_int_3_1/suite.log), [backend](../.cache/fb_int_3_1/backend_test.log), [lint frontend](../.cache/fb_int_3_1/lint_frontend.log), [lint backend](../.cache/fb_int_3_1/lint_backend.log), [build](../.cache/fb_int_3_1/build.log), [diff](../.cache/fb_int_3_1/diff.log). A suíte permaneceu silenciosa durante arquivos aprovados e foi aguardada até concluir, sem interrupção ou repetição.

Comandos a partir de `frontend`:

```bat
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
```

Backend: mesmo executável Node 24, `node_modules/eslint/bin/eslint.js .` e `--test --test-concurrency=1 test/feedback.test.js test/feedbackSeguranca.test.js test/feedback.integration.test.js`, com ambiente isolado, flags de recebimento/consulta falsas, sem chaves e `DATABASE_URL` sentinela em porta inacessível. Não carrega o `.env` habitual. Os testes HTTP de demonstração/memória exercitam requisições em fixtures, sem novos envios ou gravações no PostgreSQL real.

Build preservou os avisos conhecidos de chunk maior que 500 kB, importação estática/dinâmica de `PatrimonioEditor` e tempo de plugins. Principal: **762,48 kB**, gzip **216,48 kB**. Nenhum aviso suprimido.

## Limitações e conclusão

A integração histórica exige PostgreSQL 17 exclusivo e ficou em skip; PostgreSQL 18.6 foi utilizado apenas para o ciclo real do perfil e as leituras descritas. Não houve nova gravação, restauração, seed, reset, migration, teste de carga, revisão visual, Docker/Nginx/HTTPS ou homologação institucional. A listagem do backup não substitui um ensaio de restauração.

Início/parada do PostgreSQL exigiram execução fora do sandbox Windows, aprovada automaticamente e restrita ao cluster exclusivo. A consulta de progresso dos processos Node também exigiu essa permissão; não encerrou a suíte. As evidências em `.cache` são locais e ignoradas, não acompanham um clone.

O perfil não introduziu regressões nos **924 testes existentes**. A única correção técnica necessária nesta validação foi reconhecer CommonJS na configuração do ESLint. Flags versionadas desativadas, comandos habituais preservados e nenhuma autorização de ativação pública.
