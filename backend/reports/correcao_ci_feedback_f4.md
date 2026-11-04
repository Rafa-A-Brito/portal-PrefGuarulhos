# CI-F4.1 — Preparação das dependências do teste de contrato

Data: **04/11/2026**, America/Sao_Paulo. Correção local validada, sem commit, push ou execução remota.

## 1. Base e causa

Branch `development/backend`, HEAD `5047f3d8ecf37b28201ad73ddb6637c98fed497d`. Estado inicial: árvore versionada e índice limpos; somente `backend/reports/diagnostico_ci_feedback_f4.md` não versionado. Esse documento foi lido e preservado byte a byte.

O [diagnóstico CI-F4](diagnostico_ci_feedback_f4.md) demonstrou a causa da falha na [execução 41768699438](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41768699438): `frontend/test/feedbackPublicoApi.test.js:2` importa o schema real de `backend/src/schemas/feedbackSchema.js`, que importa Zod. O job frontend instalava apenas suas próprias dependências. A instalação do job backend ocorre em outro runner e não satisfaz essa resolução.

Zod está declarado no `backend/package.json` e fixado em **4.6.7** pelo lockfile backend. Nenhuma dependência ou versão foi adicionada ou modificada.

## 2. Alteração exata

Único arquivo versionado modificado: `.github/workflows/predeploy.yml`.

Foram acrescentadas somente três linhas no job frontend, depois da instalação frontend existente e antes de lint/testes:

```yaml
      - run: npm ci
      - name: Preparar dependências backend para o teste de contrato
        working-directory: backend
        run: npm ci --ignore-scripts --no-audit --no-fund
      - run: npm run lint
      - run: npm test -- --maxWorkers=2
      - run: npm run build
```

A etapa usa o diretório backend e seu lockfile, tornando explícita a dependência do teste entre os dois projetos. `--ignore-scripts` impede hooks de instalação, incluindo geração automática de Prisma; `--no-audit --no-fund` evita operações acessórias nessa preparação. A etapa de audit frontend com `--audit-level=high` continua integralmente presente, assim como o audit do job backend.

O teste de equivalência continua importando o schema real. Não houve mock, cópia da lógica de validação, symlink entre projetos, compartilhamento de `node_modules` entre jobs ou alteração de casos, timeouts e skips.

## 3. Ambiente limpo Linux

Validação em container descartável baseado na imagem local `integration_backend_frontend-backend:latest`, executando somente o script de validação, sem iniciar a aplicação da imagem:

| Item | Ambiente utilizado |
| --- | --- |
| Sistema | Debian GNU/Linux 12, Linux |
| Node / npm | **24.21.0 / 11.19.0** |
| Variáveis do ensaio | `CI=true`, `TZ=UTC` |
| Vite / Vitest / jsdom | **8.2.4 / 4.1.12 / 29.1.1** |
| Zod instalado no backend | **4.6.7** |
| Fontes | Arquivos versionados de HEAD por `git archive`, com o workflow local corrigido sobreposto |
| Dependências iniciais | Ausência de `frontend/node_modules` e `backend/node_modules` conferida antes de instalar |
| Armazenamento | Cópia em `/tmp/ci_f41` no container; entradas montadas somente para leitura |
| Rede | Usada para instalações npm e audit; nenhum banco ou serviço da aplicação iniciado |

Não foi usada a instalação Windows como evidência de aprovação. Não foram montados `node_modules`, arquivos `.env` reais, socket Docker ou credenciais do host. A imagem possui seu próprio ambiente, mas a validação ocorreu em diretório novo e `NODE_PATH` foi removido, sem reutilizar suas dependências de aplicação.

Foram utilizadas somente as CAs públicas do sistema já exportadas no diagnóstico, via `NODE_EXTRA_CA_CERTS`, mantendo TLS validado. Nenhum certificado foi instalado no host. O container usou `--rm`, sem portas publicadas, volumes persistentes ou Compose.

O runner remoto anterior usou Ubuntu 24.04.5, Node 24.22.1 e npm 11.19.1. O ensaio confirma a correção em Linux limpo com Node 24 e ambos os lockfiles, mas não substitui a futura execução remota no SHA que vier a ser publicado.

## 4. Resultados

| Verificação | Resultado |
| --- | --- |
| `npm ci` em frontend | **Aprovado**, 332 pacotes instalados, 30 s |
| `npm ci --ignore-scripts --no-audit --no-fund` em backend | **Aprovado**, 337 pacotes instalados, 19 s |
| Importação direta do schema backend real | **Aprovada**, sem Prisma gerado ou serviço |
| `npm test -- --maxWorkers=2 test/feedbackPublicoApi.test.js` | **51/51**, um arquivo, 2,35 s, saída 0 |
| `npm test -- --maxWorkers=2` | **619/619**, 34 arquivos, 53,27 s, saída 0 |
| `npm run lint` frontend | **Aprovado**, saída 0 |
| `npm run build` frontend | **Aprovado**, 3,71 s, saída 0 |
| `npm audit --audit-level=high` frontend | **Aprovado**, saída 0; seis moderadas, nenhuma alta/crítica |
| SHA-256 dos arquivos de entrada no container | **Preservados** após instalações, testes, lint, build e audit, incluindo manifests e lockfiles |
| YAML e estrutura do workflow | **Aprovados**; parser `js-yaml` e comparação com HEAD |
| `git diff --check` | **Aprovado** |

Nenhum caso foi ignorado, desabilitado ou refeito para ocultar falha. As etapas concluíram na primeira execução deste ensaio. O teste específico foi seguido da suíte completa conforme solicitado.

O build mantém os avisos existentes sobre chunk maior que 500 KB e importação estática/dinâmica de `PatrimonioEditor`. As seis vulnerabilidades moderadas pertencem à cadeia de desenvolvimento ESLint/minimatch e `eslint-plugin-react-refresh`; nenhum `audit fix`, override, mudança de versão ou redução do limiar foi aplicado. Não foi executado audit backend adicional nesta fase: o job backend e seu audit permanecem inalterados.

## 5. Ausência de efeitos operacionais e preservação

A preparação backend executou somente `npm ci --ignore-scripts --no-audit --no-fund`. Não houve execução de Prisma CLI, migrations, seeds, scripts de banco, Docker ou serviços por essa etapa. A ausência de `backend/node_modules/.prisma/client` foi conferida após a instalação e o schema importado foi exercitado diretamente. Docker foi usado exclusivamente pelo agente para criar o ambiente isolado de validação, não pela etapa acrescentada ao workflow.

A comparação estrutural do YAML, removendo apenas a nova etapa em memória, produziu igualdade integral com o workflow de HEAD. Assim foram preservados:

- Jobs backend/frontend separados, permissões `contents: read` e actions fixadas por SHA.
- PostgreSQL descartável exclusivo, conferência das 12 migrations/checksums/integridade/privilégios e limpeza restrita ao projeto de teste.
- Flags falsas, ausência de deploy e audits com limiar `high` nos dois projetos.
- Todas as instalações e validações frontend previamente existentes, sem `continue-on-error`, retries ou skips adicionais.

No checkout, foram conferidos **869 arquivos** por SHA-256: todos os versionados e o diagnóstico inicial. A única alteração encontrada foi `.github/workflows/predeploy.yml`. O relatório diagnóstico não foi reescrito. Código F1–F4, autenticação, schema, migrations, testes, manifests, lockfiles e configurações públicas permaneceram intactos.

## 6. Arquivos e estado final

- Modificado: `.github/workflows/predeploy.yml`, somente as três linhas da etapa adicional.
- Criado: `backend/reports/correcao_ci_feedback_f4.md`, este relatório.
- Preservado e ainda não versionado: `backend/reports/diagnostico_ci_feedback_f4.md`.
- Evidências privadas ignoradas: `.cache/ci_f41/`, incluindo `linux.log`, baseline, arquivo de fontes, cópia do workflow e script do ensaio. Não publicar esses temporários.

Branch e HEAD permanecem `development/backend` e `5047f3d8ecf37b28201ad73ddb6637c98fed497d`; índice vazio. Não houve commit, push, deploy, acionamento remoto, acesso a `patrimonio_guarulhos`, migrations ou Compose normal.

**Parecer: pronta para revisão e novo checkpoint local**, com correção pontual e validação Linux limpa aprovada. Commit, publicação e confirmação do CI remoto continuam dependentes de autorização posterior. As pendências institucionais e operacionais de ativação do Feedback não são alteradas por esta correção de CI.
