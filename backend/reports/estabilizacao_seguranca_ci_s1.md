# S1 — Triagem de segurança e estabilização do CI após H2

Data: **01/11/2026**, America/Sao_Paulo. Branch `development/backend`, HEAD `c6760717e4b4a86cead2e1a9bbc7fa9bfb3b1899`. Referências: [H1](historico_alteracoes_h1.md), [H2](historico_alteracoes_h2.md) e [workflow efetivo](../../.github/workflows/predeploy.yml).

**Correção compatível aplicada: `follow-redirects` 1.16.1 → 1.16.2, somente no lockfile frontend.** Os alertas altos desapareceram e os audits de produção retornaram zero. Permanecem alertas moderados de desenvolvimento associados a `minimatch`; sua correção major foi suspensa, sem override. A etapa de audit do CI passou na reprodução local com o mesmo limiar `high`; não houve nova execução remota, commit, push ou deploy.

## 1. Estado preservado e arquivos alterados

O Git inicial já continha a H1/H2 sem commit: `App.jsx`, `AdminLayout.jsx`, página, CSS, formatador, cliente, testes, harnesses e relatórios. Os manifests/locks estavam sem alterações. A referência local de acompanhamento continuava no mesmo HEAD; não foi feito fetch. Todo o trabalho H1/H2 e seus relatórios foi preservado. A verificação por hashes dos arquivos preexistentes durante as validações não encontrou alterações adicionais; a comparação do lockfile com HEAD confirmou uma única resolução diferente.

| Arquivo S1 | Mudança |
| --- | --- |
| `frontend/package-lock.json` | Versão, URL do tarball e integridade de `node_modules/follow-redirects` |
| Este relatório | Triagem, testes, evidências remotas e riscos residuais |

Nenhum `package.json`, lockfile backend, workflow, código de autenticação/auditoria, schema ou migration foi alterado. Scripts de investigação, resultados e backups sintéticos ficaram ignorados em `.cache/s1/` e `.cache/s1_*.cjs/.mjs`. Não foram adicionados pacotes, overrides ou dependências diretas.

## 2. Versões, instalação limpa e compatibilidade

Runtime: Node **24.22.1**, npm **11.12.1**; comandos por cmd.exe. Foram examinados ambos os manifests/locks e executados `npm ls ... --all --json` e `npm explain` para os três pacotes solicitados. Axios e follow-redirects não estão na árvore backend; o exit 1 de `npm explain` nesses casos indica ausência do pacote, não instalação quebrada.

| Pacote / consumidor | Antes instalado e travado | Após `npm ci` | Decisão |
| --- | --- | --- | --- |
| Axios frontend | 1.20.0 | 1.20.0 | Preservado |
| follow-redirects via Axios | 1.16.1 | **1.16.2** | Patch dentro de `^1.16.0` aceito pelo Axios |
| minimatch, ambos | 10.2.6 | 10.2.6 | Major 11 suspensa |
| ESLint, ambos | 10.8.1 | 10.8.1 | Preservado; requer minimatch `^10.2.5` |
| @eslint/config-array, ambos | 0.23.5 | 0.23.5 | Preservado; requer minimatch `^10.2.4` |
| nodemon backend | 3.1.14 | 3.1.14 | Preservado; requer minimatch `^10.2.1` |
| Prisma / client / adapter | 7.10.1 | 7.10.1 | Nenhuma atualização |

Foi executado `npm update follow-redirects --package-lock-only --ignore-scripts --no-audit --no-fund` no frontend. O diff contém somente as três propriedades dessa entrada; não foi promovido Axios a 1.21.0 nem atualizado ESLint por conveniência. Depois, **`npm ci --no-audit --no-fund` passou nos dois diretórios**, substituindo a instalação pelos locks: 337 pacotes backend e 330 frontend. As auditorias foram executadas separadamente. Os locks permaneceram iguais após `ci`; a árvore instalada confirmou as versões acima.

Consultas npm inicialmente bloqueadas pelo sandbox no cache retornaram EPERM. Foram refeitas com autorização de execução fora do sandbox e validação TLS usando o armazenamento de CAs do sistema. Não houve desativação de TLS, instalação de certificado ou atualização global de npm.

## 3. Causa e exposição dos advisories

### follow-redirects — GHSA-mrwp-f3q8-3g9p

O [advisory oficial](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p) afeta **1.16.0–1.16.1**, corrigidas em **1.16.2**. A validação com `instanceof Array` descarta uma lista `sensitiveHeaders` criada em outro contexto JavaScript; um cabeçalho confidencial personalizado pode então acompanhar um redirecionamento para outra origem.

A árvore real era `frontend → axios 1.20.0 → follow-redirects 1.16.1`. Os dois achados altos eram o pacote vulnerável e a propagação para Axios, **não duas falhas independentes**. Não há importação de follow-redirects ou configuração `sensitiveHeaders` nos fontes/testes do portal. O pacote Axios instalado mapeia seu adapter HTTP Node para módulo nulo no ambiente browser. Assim, não foi demonstrado esse caminho de exploração no frontend Vite servido como aplicação de navegador. Isso não elimina o risco de ferramentas/consumidores Node que usem a dependência, nem justifica manter a versão vulnerável.

Além do audit, a versão corrigida foi exercitada com dois servidores HTTP exclusivamente loopback: redirecionamento entre portas, cabeçalho confidencial sintético e cabeçalho comum. Tanto uma lista local quanto uma lista criada com `node:vm` removeram o cabeçalho sensível e preservaram o comum. Resultado em `.cache/s1/redirect.json`. Nenhuma credencial real foi usada; não foi necessário enviar um segredo a servidor externo ou modificar autenticação do portal.

### minimatch — GHSA-g3hv-75wg-m249

O [advisory oficial](https://github.com/advisories/GHSA-g3hv-75wg-m249) marca versões **anteriores a 11.0.1**. O padrão malicioso pode ampliar estruturas intermediárias e provocar processamento quadrático quando `optimizationLevel >= 2`.

No repositório, minimatch é dependência de desenvolvimento via ESLint/config-array nos dois projetos e nodemon no backend. Os demais achados são propagados pela árvore/peers do lint. Não integra a árvore de produção dos dois projetos. Os consumidores inspecionados não configuram `optimizationLevel=2`; minimatch 10.2.6 usa padrão 1. Não foi identificado fluxo que leve um padrão enviado por visitante aos matchers dessas ferramentas. Essa constatação reduz a exposição identificada, mas não altera o advisory nem certifica segurança de padrões/configurações arbitrários em futuros jobs.

**A atualização major permanece suspensa.** 11.0.1 satisfaz Node 24, porém está fora de todas as faixas transitivas instaladas e traz dependência/mecanismo de matching distinto. Um override forçaria uma combinação não declarada pelos consumidores, com possível impacto na seleção de arquivos do ESLint e no monitoramento do nodemon. Os metadados consultados de ESLint 10.14.0, config-array 0.23.5 e nodemon 3.1.14 ainda exigiam minimatch 10.x; atualizar indiscriminadamente esses pacotes não resolveria a restrição.

O audit também sugeriu uma mudança major de `@eslint/js` para 9.39.5 em parte da árvore. Não foi aplicado downgrade nem `audit fix --force`. Uma futura intervenção exige aprovação própria: preferir versão compatível dos consumidores que aceite a correção; se houver proposta de override, medir compatibilidade de globs/ignores, lint e watch antes de adotá-lo.

## 4. Quatro audits e limiar do CI

| Escopo | Antes | Após instalação limpa | Exit final do audit padrão |
| --- | --- | --- | --- |
| Backend completo | 6 moderadas | **6 moderadas, 0 altas/críticas** | 1 |
| Backend produção (`--omit=dev`) | 0 | **0** | 0 |
| Frontend completo | 7 moderadas + 2 altas | **6 moderadas, 0 altas/críticas** | 1 |
| Frontend produção (`--omit=dev`) | 2 altas | **0** | 0 |

O resultado final frontend deixou de propagar uma entrada para `eslint-plugin-react-hooks`, embora sua versão e o lock correspondente não tenham mudado. Essa diferença de classificação do audit foi registrada nos JSONs; não foi atribuída a uma correção de minimatch. Os seis alertas moderados remanescentes em cada projeto continuam exigindo acompanhamento.

O comando exato do workflow, **`npm audit --audit-level=high`**, foi executado após a correção nos dois diretórios e retornou **0 em ambos**, mantendo o limiar original. Isso significa ausência de achados altos/críticos nessa execução, **não ausência universal de vulnerabilidades**. JSONs completos e de produção antes/depois, árvores e explain estão em `.cache/s1/`.

## 5. GitHub Actions: fato confirmado e limite dos logs

A API pública do GitHub foi consultada em modo leitura. A [execução 41232698747](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41232698747), de 31/10/2026, pertence exatamente ao HEAD `c676071` e concluiu com falha.

| Categoria | Evidência remota dessa execução |
| --- | --- |
| Ambiente / instalação | checkout, setup-node e npm ci aprovados nos dois jobs |
| Backend / PostgreSQL | Job aprovado; identificação, migrations, testes, Nginx, systemd e limpeza aprovados |
| Testes frontend | Lint, testes e build aprovados |
| Dependências/audit | **Falha somente na etapa “Auditar dependências de produção e desenvolvimento” do frontend** |
| Configuração do workflow | Nenhuma falha de configuração identificada pelos estados das etapas e inspeção local |

Os estados das etapas são evidência suficiente para localizar o bloqueio na etapa de audit. O download do log completo retornou **403: “Must have admin rights to Repository”**; não foram usadas credenciais armazenadas nem solicitado acesso adicional desnecessário. Portanto, **o pacote/advisory exato que apareceu no log remoto não pôde ser confirmado**. A relação com follow-redirects é uma inferência apoiada no lock daquele HEAD e na reprodução local dos dois alertas altos, não uma citação do log remoto.

As falhas antigas de outros commits, inclusive a referência histórica ao D1C, não foram reclassificadas como esta mesma ocorrência. O D1C foi incluído novamente na suíte backend local. A execução de `c775697` constava aprovada na consulta pública; isso não substitui acesso ao log de cada execução histórica.

O workflow permaneceu intacto: `contents: read`, checkout sem persistir credenciais, Node 24, banco sentinela inicial, projeto/volume únicos por run/attempt, senhas efêmeras mascaradas, migrations pelo trilho identificado, checksums, flags desligadas e limpeza limitada ao Compose de teste. Não contém deploy de aplicação. Não foi afrouxado o audit, removido teste ou inserido `continue-on-error` para obter aprovação.

Nenhum workflow remoto foi disparado na S1. A nova árvore ainda requer revisão, checkpoint autorizado e execução do Actions do commit exato; resultados locais não certificam essa execução futura.

## 6. Regressões e bancos descartáveis

Um **novo** PostgreSQL 17.11 foi criado com `compose.metricas.test.yml`: projeto `portal_s1_20261101_test`, container `portal_s1_20261101_test-db_test-1`, volume `portal_s1_20261101_test_pg_test`, endpoint **127.0.0.1:5440/portal_test**, cluster **7703348435682619426**. Ausência prévia de volume/container, schema vazio, exclusividade e papel foram conferidos antes das migrations. Foram usadas senhas aleatórias próprias, sem reutilizar credenciais reais.

O trilho existente aplicou 11 migrations pelo `portal_migrator`, repetiu deploy sem pendências e verificou checksums. API e operador restritos foram testados. Não houve recuperação manual, edição de migration ou Compose normal. O schema/Prisma/PostgreSQL não foi atualizado para resolver avisos npm.

Para a regressão de navegador H2, foi usado somente o descartável já autorizado **127.0.0.1:5439/portal_test**, cluster **7703217233335377954**, reconferido em READ ONLY e com backup sintético antes do ensaio. Checkpoints e evidências foram copiados para `.cache/s1/h2/`, preservando os artefatos H2 originais. As operações de negócio já concluídas não foram reenviadas; login, logout, expiração e renovação usam sessões reais novas. O cenário repete a consulta dos eventos persistidos, não uma nova geração desses mesmos eventos.

| Verificação após npm ci | Resultado |
| --- | --- |
| Backend completo + PostgreSQL S1 | **581 aprovados, zero falhas, zero ignorados**, saída 0 |
| Frontend completo | **505 aprovados em 30 arquivos, zero falhas/ignorados** |
| Lint backend/frontend | Aprovados |
| Build frontend | Aprovado |
| Prisma validate/generate | Aprovados, versão 7.10.1 preservada |
| Migrations / checksums / deploy repetido | 11 concluídas desde vazio; repetição sem pendências |
| H2 navegador real | **Aprovado**, 21 detalhes, 110 eventos preservados, zero exceções JavaScript não tratadas |
| H2 modo adicional | Loading, cancelamento, contraste, rolagem, erro 500 real e recuperação aprovados |
| Teste de redirecionamento 1.16.2 | Duas variantes aprovadas: array local e de outro realm |
| Audits de produção / limiar high do CI | Zero em produção; exit 0 para `--audit-level=high` nos dois projetos |
| Integridade SQL e papéis | Aprovados; conferência final S1 em READ ONLY com os 11 checksums iguais |
| Diff e preservação H1/H2 | `git diff --check` aprovado; hashes H1/H2 preservados |

Os testes frontend incluem os 65 casos específicos H1, autenticação/navegação, Histórico, Dashboard V1/V2, regiões, favoritos locais e participação. A suíte backend executa auditoria, rollback, login/refresh/logout/autorização, modo demonstrativo e segurança. A demo permanece separada das integrações reais. As flags de métricas do processo real de homologação continuam falsas; o modo demo é exercitado apenas pelos seus testes próprios.

A regressão H2 confirmou novamente ADMIN/EDITOR, 401/403, logout, expiração natural e rotação de refresh no PostgreSQL. O modo adicional interrompeu/reiniciou somente o container H2 identificado e recuperou a consulta após reconferir o cluster. A fixture de 404 já removida na H2 não foi recriada/excluída novamente: esse ramo foi preservado pelo checkpoint; 404 foi revalidado pelos testes automatizados da interface. A troca de senha já concluída também não foi repetida no navegador; as integrações novas do backend cobriram a operação e seu rollback. O D1C passou, inclusive normalização LF/CRLF e geração determinística.

Permanecem os avisos anteriores do build sobre bundle inicial grande e import dinâmico ineficaz do editor; não foram alterados limites do bundler. Logs, resultados SQL/HTTP, snapshots de metadados npm e dados públicos do Actions ficam em `.cache/s1/`. **Não publicar `.cache/`**, que também contém senhas, tokens/perfis e backups sintéticos. Nenhum arquivo sensível foi incluído no diff.

Os processos temporários de navegador/Vite/Express foram encerrados pelo harness. Os dois bancos descartáveis permanecem disponíveis para inspeção, sem dados reais. Nenhum agendamento ou certificado foi instalado.

## 7. Parecer e riscos residuais

A correção compatível está preparada para revisão do próximo checkpoint Git, com manifests e H1/H2 preservados. A análise local remove o bloqueio alto reproduzido pelo audit sem alterar seu limiar. Ainda não há aprovação remota do conteúdo novo.

Permanecem: seis achados moderados de desenvolvimento em cada árvore; aprovação própria para eventual migração major de minimatch/consumidores; confirmação do próximo Actions; e as pendências de infraestrutura/acessibilidade registradas na H2. Não foi demonstrada exploração pelos visitantes no código inspecionado, mas isso não equivale a uma certificação geral de segurança ou dispensa de manutenção.

Esta etapa não autoriza commit, push, deploy, uso do banco real ou ativação pública. Feedback, Acessos Gerais e Favoritos Globais não foram iniciados.
