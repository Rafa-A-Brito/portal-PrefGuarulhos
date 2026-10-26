# Dashboard V1 — revisão da integração visual

Data: 25/10/2026. Revisão restrita à integração frontend, dependências e contrato do dashboard. Alterações locais anteriores preservadas.

## Componentes e instalação

- `frontend/src/components/ui/Card.jsx`: Card, CardHeader, CardTitle, CardDescription e CardContent.
- `frontend/src/components/ui/Chart.jsx`: ChartContainer, ChartTooltip e ChartTooltipContent.
- `ui.module.css`: estilos locais, dimensões responsivas, foco e tooltip; LICENSE preserva atribuição MIT.
- `GraficosDashboard.jsx`: composição direta com PieChart, RadarChart e BarChart do Recharts; legendas e tabela numérica próprias.

São adaptações parciais do código shadcn/ui para JSX e CSS Modules, não componentes integrais gerenciados pelo CLI. Não oferecem toda a API original (por exemplo, variantes de tema e opções avançadas de tooltip). Isso não é uma instalação padrão shadcn/ui/Tailwind. As funcionalidades usadas pelo dashboard não dependem dessas opções omitidas.

Recharts é a única dependência direta acrescentada pelo Dashboard V1: `^3.10.1` no package.json, versão exata `3.10.1`, URL do registry e integridade SHA-512 no package-lock.json. `npm ls recharts` confirma a instalação sem erro. O diff contra HEAD contém 37 entradas novas de pacotes, incluindo o próprio Recharts (36 transitivas). React 19 está dentro dos peers suportados. Nenhuma dependência nova foi acrescentada nesta revisão.

## Comparação antes de inicializar

Foram consultados os guias oficiais de [Vite existente](https://ui.shadcn.com/docs/installation/vite), [instalação manual](https://ui.shadcn.com/docs/installation/manual) e [Chart](https://ui.shadcn.com/docs/components/radix/chart).

| Aspecto | Estado atual | Efeito da adoção padrão |
| --- | --- | --- |
| Tailwind | Ausente; CSS Modules compilado pelo Vite | Instalar Tailwind e plugin Vite; integrar utilities, tema e avaliar Preflight |
| CSS global | Estilos existentes preservados | A receita Vite recomenda substituir o CSS inicial; não é apropriado aplicar literalmente neste portal |
| Resolução de imports | Imports relativos existentes | Configurar aliases ou imports e components.json para o CLI |
| Card e Chart | Implementados e consumidos | Adicionar os mesmos itens pode duplicar arquivos ou exigir substituição e adaptação dos consumidores |
| Dependências de UI | Somente as necessárias ao código local | Receita padrão acrescenta utilitários e estilos que o código atual não consome |

Decisão: não executar `npx shadcn@latest init` nem `add` nesta revisão, pois não há componente necessário ausente ou defeito que exija inicialização. A condição de necessidade estabelecida no pedido não foi satisfeita. Não foram criados componentes duplicados ou configuração fictícia do CLI. Tailwind pode coexistir com CSS Modules, mas uma adoção futura precisaria controlar reset, escopo e tokens, além de comparar os arquivos gerados antes de substituir os locais. A manutenção das adaptações atuais é responsabilidade do projeto; atualizações do registry não são aplicadas automaticamente.

## Dados e limites

`AdminDashboard.jsx` chama `buscarDashboard`, que usa o cliente Axios existente em `/admin/dashboard` (base `/api`), e entrega o retorno ao módulo de gráficos carregado com lazy. Não há totais fixos nem fallback de fixture em produção. Os testes substituem o adaptador HTTP exclusivamente no ambiente de testes. O backend mantém a transação de leitura consistente e os campos adicionais da V1. Nenhuma consulta ao PostgreSQL foi necessária nesta revisão.

## Validação

- `npm ci --cache ../.cache/npm`: aprovado, 330 pacotes instalados; manifesto/lock preservados. Certificados do sistema habilitados com `NODE_OPTIONS=--use-system-ca`, sem desativar TLS.
- `npm test -- --maxWorkers=2` no frontend: 384 testes aprovados em 22 arquivos, incluindo os cinco cenários do dashboard com Recharts real e resposta HTTP isolada. Node 25.9.0 emitiu aviso de localStorage sem caminho válido, sem falha da suíte.
- `npm run lint` e `npm run build` no frontend: aprovados. Bundle inicial 666,58 kB / 187,61 kB gzip; chunk lazy dos gráficos 411,37 kB / 116,13 kB gzip, iguais à entrega anterior. Permanecem os avisos anteriores de tamanho e import dinâmico ineficaz do editor patrimonial.
- `node --test test/dashboard.test.js` no backend: três testes aprovados, incluindo contrato HTTP e permissões, com persistência simulada; não acessa PostgreSQL.
- `npm audit --json`: dois pacotes com severidade alta, `undici@7.30.0` e `zod@4.4.3`, transitivos de desenvolvimento. As mesmas versões foram conferidas no lock de HEAD, anteriores ao Dashboard V1. O audit completo retornou código 1 e não está limpo. Nenhum `audit fix` foi executado fora do escopo.
- `npm audit --omit=dev --json`: zero vulnerabilidades, código 0; nenhuma ocorrência atribuída a Recharts no audit completo.
- `git diff --check`: aprovado; avisos de normalização LF/CRLF já presentes na árvore local.

Logs locais em `.cache/shadcn_*`, não versionados. A reinstalação e a validação completa foram feitas no frontend, onde está a integração; a suíte PostgreSQL anterior não foi repetida nesta revisão sem alterações de backend.

## Alterações desta revisão

Somente este registro versionável foi acrescentado. Componentes, estilos, configurações, manifests e lock foram mantidos. Não houve alteração de autenticação, dados, migrations, conteúdos ou relacionamentos, nem commit, push ou deploy.
