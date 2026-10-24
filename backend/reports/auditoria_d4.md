# Auditoria D4 — dependências, PostgreSQL e CI

Parecer: **deploy liberado tecnicamente no escopo desta auditoria**, sujeito à revisão e autorização do responsável. Os bloqueios de dependências e testes PostgreSQL foram resolvidos. Nenhum commit, push, deploy ou acesso de escrita ao banco real foi executado.

## Dependências

Foram executados separadamente `npm audit --json` e `npm audit --omit=dev --json` nos dois projetos. Os totais do npm contam pacotes afetados, inclusive propagação transitiva; não representam CVEs distintos.

| Projeto / escopo | Antes | Depois |
| --- | --- | --- |
| Backend completo | 18: 11 altas, 7 moderadas | 0 |
| Backend sem devDependencies | 9: 4 altas, 5 moderadas | 0 |
| Frontend completo | 21: 19 altas, 1 moderada, 1 baixa | 0 |
| Frontend sem devDependencies | 2 altas | 0 |

Os advisories abaixo são identificados por GHSA; severidades seguem o JSON do npm. As versões adotadas corrigem todos os intervalos vulneráveis encontrados.

| Pacote / origem | Severidade e advisories | Instalado antes → depois |
| --- | --- | --- |
| `brace-expansion`, transitivo nos dois projetos via `minimatch` / ESLint; também nodemon no backend | Alta: [qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p); moderada: [q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr). Exaustão de pilha/CPU. | 5.0.9 → 5.0.12 |
| `deepmerge-ts`, transitivo de `prisma → @prisma/config` | Alta: [ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). Exaustão com grafos recursivos. | 7.1.5 → 8.0.2; correção desde 8.0.0 |
| `fast-uri`, transitivo de `ajv`, via Swagger Parser e ferramentas Prisma | Moderada: [hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj). Normalização inconsistente de host. | 3.1.7 → 3.1.9; correção desde 3.1.8 |
| `mysql2`, transitivo do CLI Prisma | Alta: [3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), exposição de credenciais; moderada: [rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), descompressão ilimitada. | 3.15.3 → 3.24.4 |
| `@vitest/mocker`, transitivo do Vitest | Moderada: [qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp). Registro de mocks e traversal no Windows. | 4.1.11 → 4.1.12 |
| `follow-redirects`, transitivo do Axios | Alta: [q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8), [8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c). Headers sensíveis em redirecionamentos. | 1.16.0 → 1.16.1 |
| `source-map-js`, transitivo de PostCSS e `css-tree` / jsdom | Alta: [68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). Bloqueio do event loop por source maps. | 1.2.1 → 1.2.2 |
| `vite`, dependência direta de desenvolvimento | Alta: [587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm); moderadas: [698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv), [r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw), [rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22), [vfpm-58rq-9qcg](https://github.com/advisories/GHSA-vfpm-58rq-9qcg); baixa: [9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw). Editor, middleware e leitura de arquivos no servidor de desenvolvimento. | 8.2.1 → 8.2.4 |

Atualizações diretas: `prisma`, `@prisma/client` e `@prisma/adapter-pg` 7.10.0 → 7.10.1; Vite e Vitest conforme tabela. O patch oficial do Prisma e a mudança transitiva de deepmerge-ts foram autorizados explicitamente. O pacote interno `@prisma/engines-version` acompanha a versão fixada pelo próprio `@prisma/engines@7.10.1`; não houve adoção do Prisma 8. Não foram usados `audit fix --force`, overrides ou upgrades major diretos. Ver [release Prisma](https://github.com/prisma/orm/releases/tag/7.10.1), [Vite](https://github.com/vitejs/vite/releases/tag/v8.2.4) e [Vitest](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12).

Exposição: o backend usa PostgreSQL; não foi identificado uso da conexão MySQL vulnerável pela API. Configurações Prisma e ferramentas de lint/build não recebem diretamente JSON de requisições nos caminhos analisados. Entretanto, o Dockerfile do backend instala devDependencies para disponibilizar o CLI: auditar apenas `--omit=dev` subestimaria a imagem. Todas as ocorrências foram corrigidas, sem depender dessas limitações de exposição.

No frontend, o estágio final do Docker contém somente o `dist` servido pelo nginx. As ferramentas de build/testes continuam relevantes no CI e nas máquinas de desenvolvimento, mas não são servidores distribuídos ao visitante. O Axios mapeia seu adaptador HTTP Node para `null` no navegador; assim, a ocorrência de `follow-redirects` no audit de produção não demonstra exposição desse caminho no bundle web. O pacote foi atualizado mesmo assim. Nenhuma vulnerabilidade conhecida permaneceu aceita ou sem correção nos quatro audits.

## PostgreSQL e regressões

Foi usado exclusivamente `db_test` de `compose.test.yml`, PostgreSQL 17.11 em tmpfs, sem volumes do banco real. Destino final: `127.0.0.1:5435/portal_test`, cluster `7700042083428745252`. O nome, endpoint, identidade conectada e banco inicialmente vazio foram conferidos; o banco real é `patrimonio_guarulhos` na porta 5432. As migrations existentes foram aplicadas somente no banco descartável.

Os 22 testes de integração antes ignorados foram ativados. A suíte cobre persistência administrativa, troca de senha, revogação, rotação/replay de refresh, logout concorrente, limites de sessão, permissões ADMIN/EDITOR, papéis SQL sem DDL, uploads, leitura de mídia, FKs, relacionamentos, rollback, publicação e importações de fixtures. Foi acrescentada a verificação de duas publicações simultâneas com números/ordens distintos e preservação dos existentes.

Falhas encontradas e corrigidas nos testes:

- Fixture administrativa não selecionava `tokenVersion` antes de criar a sessão.
- Testes de carga deixavam autor técnico, categorias e conteúdo para a suíte seguinte; a limpeza agora remove apenas IDs criados pela execução, em banco exclusivo conferido.
- Testes editoriais presumiam número 1 livre e publicação sem numeração automática. Agora verificam números livres, atribuição sequencial e preservação explícita dos números/ordens já preenchidos.
- `integrity.sql` ainda esperava nove FKs nas tabelas originais; agora exige dez e verifica especificamente a FK de região. O script termina com ROLLBACK.
- Dois testes frontend excederam 5 segundos na execução inicial concorrida. A suíte completa passou com dois workers, sem aumentar timeouts nem enfraquecer assertions; o CI utiliza o mesmo limite de workers.

Resultado confirmado no **Node 24.22.1**, mesma linha principal usada no CI/Docker: backend **494 aprovados, 0 falhas, 0 ignorados**; frontend **379 aprovados em 21 arquivos**. A contagem backend inclui os 22 testes PostgreSQL e seus subtestes antes não executados. Lint dos dois projetos, Prisma validate, build frontend, integridade SQL com ROLLBACK e `git diff --check` passaram. O cliente Prisma 7.10.1 foi regenerado e utilizado pelas integrações. As suítes também passaram no Node 25.9.0 instalado na máquina. A cópia isolada do Node 24 veio de nodejs.org, teve SHA-256 conferido e permaneceu em `.cache`, sem alteração da instalação do sistema.

## CI e riscos residuais

`predeploy.yml` passou na leitura YAML, conferência de eventos/permissões/pins e validação sintática dos scripts inline. Foi ajustado para criar PostgreSQL isolado, conferir banco vazio, preparar papéis restritos, aplicar migrations de teste, executar a suíte completa e a integridade SQL. Credenciais efêmeras são mascaradas. A limpeza se restringe ao projeto Compose do CI. `.gitignore` ignorava todo `.github/`; foi aberta somente a exceção para esse workflow. O arquivo ainda precisa ser incluído no futuro commit aprovado.

Os pins foram conferidos nas fontes oficiais de [checkout](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1) e [setup-node](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1). O workflow remoto não foi executado: não houve push. A validação local não substitui uma execução no runner Linux nem um smoke test no ambiente final.

O build emitiu bundle principal de **664,01 kB / 186,77 kB gzip**. `App.jsx` importa `AdminPatrimonios` estaticamente, que importa `PatrimonioEditor`, tornando ineficaz o lazy import do mesmo editor pelo modal. Há também imagens entre 1,5 e 4,7 MB. São riscos de carregamento, especialmente móvel; recomenda-se separar rotas administrativas e otimizar assets em alteração própria. O limite de 500 kB do Vite não foi aumentado.

Permanece um aviso de depreciação de consultas enfileiradas no mesmo client `pg`: a versão 8 atual passou nos cenários concorrentes, mas uma futura adoção do pg 9 exige revisão. Audit npm não cobre vulnerabilidades de imagens base/SO nem configuração final de TLS, proxy, segredos e backups. Esses itens não foram certificados por esta auditoria.

Os dois clusters descartáveis usados na investigação permanecem nas portas 5434 e 5435 para inspeção; não devem receber dados reais. Evidências locais completas, audits antes/depois e logs estão em `.cache/d4_final/` (ignorada pelo Git; inclui credenciais exclusivas de teste, não deve ser publicada).

Arquivos desta etapa: manifests/locks dos dois projetos; seis testes de integração e `test/limpezaFixtures.js`; `prisma/tests/integrity.sql`; `.github/workflows/predeploy.yml`; `.gitignore`; este relatório. Alterações anteriores de aplicação e mídias foram preservadas.
