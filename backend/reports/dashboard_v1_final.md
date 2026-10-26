# Dashboard V1 — validação final

Data: 25/10/2026. **Parecer: V1 validada localmente para revisão, com dependências auditadas sem ocorrências.** A execução remota do pré-deploy e a homologação no ambiente final permanecem pendentes. Este parecer não autoriza publicação.

## Escopo preservado

Foram mantidos React, CSS Modules, Recharts 3.10.1, os componentes locais adaptados de shadcn/ui e o carregamento lazy. Não houve inicialização pelo CLI, alteração de autenticação, migrations, conteúdo editorial ou relacionamentos reais. Nenhum acesso ao banco `patrimonio_guarulhos`, commit, push ou deploy foi realizado nesta etapa.

A base administrativa continua sendo todos os registros e todos os status. Os 36 registros da fotografia auditada anteriormente não são constantes do frontend. Os legados são identificados pela API e permanecem nas contagens. A validação atual usa dados isolados e não recertifica a quantidade corrente no banco real.

## Dependências: origem, advisories e correções

`npm explain undici`, `npm explain zod` e `npm explain body-parser` confirmaram as cadeias abaixo. Foram utilizados `npm update` dirigido aos pacotes nomeados, precedido de dry-run, e `npm ci` para conferir a instalação pelo lock. Não foram usados `audit fix`, `--force`, overrides ou upgrades major; os intervalos dos manifests foram preservados.

| Projeto / origem | Antes → depois | Compatibilidade |
| --- | --- | --- |
| Frontend: jsdom 29.1.1 → undici | 7.30.0 → **7.30.1** | jsdom aceita `^7.25.0` |
| Frontend: eslint-plugin-react-hooks 7.1.1 → zod; também peer de zod-validation-error 4.0.2 | 4.4.3 → **4.6.7** | ambos aceitam `^3.25.0 \|\| ^4.0.0` |
| Backend: dependência direta zod | 4.6.0 → **4.6.7** | manifesto já aceita `^4.6.0` |
| Backend: express 5.2.1 → body-parser | 2.3.0 → **2.4.0** | Express aceita `^2.2.1` |

Undici 7.30.1 corrige os advisories [exaustão em EventSource](https://github.com/advisories/GHSA-4qv8-2p9j-2685), [verificação de integridade SRI](https://github.com/advisories/GHSA-f72v-6w45-q472) e [encerramento por content-encoding excessivo](https://github.com/advisories/GHSA-xjj6-f33q-929c). Zod possui correção desde 4.6.6 para [exaustão de memória na validação](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Body-parser 2.4.0 corrige [erro não tratado após corpo comprimido](https://github.com/advisories/GHSA-27r3-jxmh-p828).

As duas ocorrências adicionais de backend foram encontradas ao executar o audit exigido pelo pré-deploy. As correções ficaram limitadas aos locks; nenhum código funcional externo ao dashboard foi modificado. No backend, somente as entradas de body-parser e zod mudaram; dependências do body-parser já estavam em versões compatíveis. Nenhum novo pacote direto foi acrescentado nesta etapa.

| Audit npm | Antes desta etapa | Depois |
| --- | --- | --- |
| Frontend completo | 2 pacotes de severidade alta | **0** |
| Frontend produção (`--omit=dev`) | 0 | **0** |
| Backend completo | 2 pacotes de severidade alta | **0** |
| Backend produção (`--omit=dev`) | Não medido separadamente antes | **0** |

Os quatro audits finais foram executados separadamente, retornaram código 0 e não apontaram vulnerabilidades. As contagens representam pacotes afetados, não CVEs distintos. O relatório anterior de revisão shadcn permanece como registro histórico das versões anteriores.

## Testes e PostgreSQL descartável

- Frontend: **384 testes aprovados em 22 arquivos**, com `npm test -- --maxWorkers=2`.
- Backend: **495 testes aprovados, zero falhas e zero ignorados em uma execução completa**, incluindo as integrações PostgreSQL e os papéis SQL restritos.
- Lint de ambos os projetos, Prisma validate, Prisma generate 7.10.1, build frontend e `git diff --check`: aprovados.
- Testes, lint, build e Prisma executados em **Node 24.22.1**, mesma linha do workflow. A instalação backend por `npm ci` utilizou o Node 25.9.0 do sistema; o cliente foi regenerado e a suíte integral executada em Node 24. A instalação frontend também usou Node 24.

Destino de teste: **127.0.0.1:5435/portal_test**, cluster `7700042083428745252`, previamente preparado em tmpfs. Uma conexão READ ONLY conferiu identidade e nove migrations já concluídas antes de permitir as fixtures. O executor usou URL sentinela inacessível como DATABASE_URL padrão e URLs explícitas de teste nas integrações; não leu a configuração do banco real. Credenciais não foram impressas no relatório. Não houve aplicação de migrations nem criação de cluster nesta rodada.

O teste do dashboard cria seis patrimônios exclusivos, sete categorias e quatro regiões, incluindo região inativa e região vazia. Verifica incrementos de uma ocorrência em cada situação, duas por status, regiões `[2, 1, 1, 0]` e dois sem região; seis classificações principais e doze vínculos secundários não duplicam o total. Remove somente as fixtures próprias. Também cria usuário/sessão exclusivos para comparar a resposta autenticada de **GET /api/admin/dashboard** integralmente com o resultado do serviço sobre PostgreSQL real de teste, sem mock de persistência. O teste concorrente D1A confirma consistência entre total, conservação e regiões na mesma fotografia.

`integrity.sql` foi executado separadamente no mesmo destino conferido, validou constraints e terminou com **ROLLBACK**. As escritas de testes ocorreram exclusivamente no PostgreSQL descartável.

## Homologação visual e acessibilidade

Executada no Chrome headless, com API HTTP isolada de oito registros e a interface real do portal. As capturas **não representam o banco de produção**. A resposta PostgreSQL/API foi validada separadamente pela integração descrita acima; não se afirma uma navegação ponta a ponta do navegador ao PostgreSQL nesta etapa.

| Gráfico | Valores conferidos na interface de teste |
| --- | --- |
| Donut de conservação | Preservado 2, Demolido 1, Em restauração 1, Necessita restauração 1, Em ruínas 1, Não informado 2; total 8 |
| Radar regional | Centro 2, São João / Bonsucesso 3, Cantareira 1; dois sem região fora dos eixos; 6 + 2 = 8 |
| Barras principais | Arquitetônico 3, Imaterial 2, Industrial 1, Ambiental 2; Ferroviário, Educacional e Histórico 0; total 8 |
| Donut de publicação | Publicado 5, Rascunho 1, Arquivado 2; total 8 |

As secundárias 3/2/4 aparecem separadamente na tabela. Os dois legados permanecem incluídos e identificados. Os rótulos regionais quebram linha e não usam bairro como região. As legendas expõem números independentemente das cores.

Verificações executadas:

- Quatro gráficos renderizados nas larguras **1440, 768, 390 e 320 px**, sem transbordamento horizontal. Capturas desktop e mobile inspecionadas visualmente.
- Tooltips acionados por foco e seta direita nos quatro SVGs; valores exatos comparados com a resposta da API de teste: Demolido 1, São João / Bonsucesso 3, Arquitetônico 3 e Rascunho 1.
- Cartões associados aos títulos por `aria-labelledby`, tabela com sete categorias e dados numéricos disponíveis sem depender de hover.
- Estado vazio conferido no navegador em 1440 e 390 px: total zero, mensagem explícita e nenhum gráfico fictício.
- Os testes React cobrem erro/repetição, cancelamento, acervo vazio, todos sem região e acesso de EDITOR. Nenhuma exceção JavaScript ocorreu na homologação do navegador; todas as requisições da API simulada foram GET.

Capturas locais: [desktop](../../.cache/dashboard_visual/dashboard_1440.png), [mobile 390 px](../../.cache/dashboard_visual/dashboard_390.png), [mobile 320 px](../../.cache/dashboard_visual/dashboard_320.png), [estado vazio mobile](../../.cache/dashboard_visual/dashboard_vazio_390.png). Evidências e resultado estruturado permanecem em `.cache/dashboard_visual/`.

Limites: emulação de largura em Chromium, sem aparelho físico, Safari/Firefox ou leitor de tela real. Não é certificação integral WCAG. Os tooltips de barras/radar repetem o nome no cabeçalho e na linha; é uma redundância visual sem erro de quantidade, mantida para preservar os componentes. Os números da escala radial são discretos; legendas textuais fornecem todos os valores.

## Pré-deploy local e pendências remotas

| Etapa do workflow | Resultado nesta rodada |
| --- | --- |
| Instalações `npm ci` | Ambas aprovadas |
| Prisma validate/generate | Aprovados; sem conexão ao banco real |
| Lint, testes, build e audits | Aprovados conforme resultados acima |
| Integridade SQL | Aprovada com ROLLBACK no descartável |
| YAML, eventos, permissões e pins | Conferidos; actions fixadas por SHA, contents: read, Node 24 |
| Scripts inline | Sintaxe Bash/JavaScript conferida nas 17 etapas `run` |
| Compose novo, banco inicialmente vazio e criação de papéis | Não repetidos; reutilizado destino descartável identificado e já preparado |
| `test:db:migrate` | **Não executado**, conforme restrição desta etapa |
| Checkout, setup-node/cache e ciclo completo em ubuntu-latest | Dependem de execução remota após autorização de push |

O workflow completo não foi disparado nem declarado aprovado remotamente. Em execução futura, ele aplica migrations **somente no banco descartável do CI**; essa etapa não foi reproduzida aqui. Os comandos compatíveis foram executados individualmente, sem emular integralmente GitHub Actions. O backend não possui script de build próprio.

## Bundle, riscos residuais e arquivos

Bundle inicial: **666,58 kB / 187,61 kB gzip**; gráficos lazy: **411,37 kB / 116,13 kB gzip**, iguais aos resultados anteriores. Persistem os avisos anteriores de chunk acima de 500 kB e import dinâmico ineficaz do editor patrimonial. Há aviso de depreciação de consultas enfileiradas no mesmo client `pg`, relevante para futura adoção de pg 9. Nenhum desses pontos foi ampliado para alterar funcionalidades externas à V1.

Audit npm não certifica imagens base/SO, configuração de produção ou vulnerabilidades ainda não publicadas. As ressalvas editoriais/cartográficas do acervo e a aprovação de relações D4A permanecem fora desta entrega. Não há falha conhecida nas verificações locais exigidas; revisão visual humana e runner remoto continuam pendentes.

Alterações adicionais desta etapa: `backend/package-lock.json`, `frontend/package-lock.json`, reforço HTTP em `backend/test/dashboard.integration.test.js`, extensão de `frontend/test/dashboard_visual.mjs` e este relatório. Componentes do dashboard e CSS foram preservados. Logs estão em `.cache/v1_*`; auxiliares locais não devem ser publicados com credenciais de teste. Relatórios anteriores e demais alterações locais foram preservados.
