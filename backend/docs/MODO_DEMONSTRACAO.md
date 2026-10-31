# Demonstração local com dados fictícios

`MOCK_DATA=true` executa a API Memória Viva Guarulhos sem PostgreSQL, client Prisma
gerado, migrations, seeds, `.env` completo ou credenciais externas. Use Node.js 24
e npm. Não execute comandos de migração ou carga para a demonstração.

## Iniciar

No PowerShell, a partir da raiz do repositório:

```powershell
cd backend
npm.cmd ci
$env:MOCK_DATA="true"
npm.cmd start
```

Para reiniciar automaticamente ao editar código, use `npm.cmd run dev` no lugar
de `npm.cmd start`. Em Linux/macOS:

```bash
cd backend
npm ci
MOCK_DATA=true npm start
```

API: `http://localhost:3333/api`. Swagger: `http://localhost:3333/api/docs`.
O terminal informa que os dados são fictícios e o armazenamento é temporário,
sem imprimir credenciais ou tokens.

Somente a string exata `true` ativa o modo. Ausência, `false`, `TRUE` e `1` mantêm
o fluxo real. `MOCK_DATA=true` com `NODE_ENV=production` impede a inicialização.
No mock, `DATABASE_URL`, `JWT_SECRET`, `UPLOAD_ROOT` e `UPLOAD_DIR` do ambiente real
são ignorados. A assinatura é aleatória e exclusiva por processo; os uploads usam
um novo diretório `memoria-viva-demo-*` no temporário do sistema. Porta, origem
CORS, tempos de sessão, limites e rate limit mantêm sua validação.

## Contas fictícias

| Papel | E-mail | Senha | Estado |
| --- | --- | --- | --- |
| ADMIN | `admin@demo.invalid` | `AdminDemo!2026` | Ativa |
| EDITOR | `editor@demo.invalid` | `EditorDemo!2026` | Ativa |
| EDITOR | `inativo@demo.invalid` | `InativoDemo!2026` | Inativa; login recusado |

Essas contas existem exclusivamente na memória. Não são seeds nem credenciais
do ambiente real. As senhas usam bcrypt, como no ambiente real. O login retorna
`data.token`, `data.refreshToken`, `data.sessionExpiresAt` e `data.user`, conforme
o contrato do frontend. Refresh rotativo detecta reuso e revoga a sessão. Logout
e troca de senha também revogam sessões. Tokens reais são recusados no mock, e
tokens mock são recusados no ambiente real. Reiniciar encerra as sessões e
restaura as senhas acima.

ADMIN administra usuários, publica, arquiva e exclui os conteúdos que possuem
exclusão na API. EDITOR altera textos, fatos, ligações, referências e documentos
somente de rascunhos. As imagens de patrimônio conservam a política atual:
ADMIN e EDITOR podem criar/editar imagens em qualquer status; exclusão exige
ADMIN. Auditoria exige ADMIN. Não existe bypass de autenticação.

## Frontend existente

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Abra `http://localhost:5173`. O frontend já usa a API local. Se houver outra base
configurada, a única variável necessária é:

```env
VITE_API_BASE_URL=http://localhost:3333/api
```

Pode ficar em `frontend/.env.local`, seguido de reinício do Vite. Não é necessário
preencher o `.env.example` completo do frontend. Sem chave Google Maps, o frontend
existente oferece mapa de demonstração. Nenhum arquivo do frontend foi alterado.
CEP e geocodificação, se acionados ou habilitados no frontend, pertencem às
integrações próprias dele, não à API mock.

## Dados e endpoints

Fixtures com UUIDs fixos: categorias, regiões, 20 patrimônios (12 publicados,
5 rascunhos e 3 arquivados), coordenadas próximas aos bairros de Guarulhos,
campos opcionais ausentes, seções, fatos e ligações. Há 24 exposições e 24 novidades,
sendo 20 publicadas de cada tipo, para exercitar a paginação. Imagens são
ilustrações locais criadas para o projeto; documentos de texto declaram que são
fictícios e sem valor oficial. Os eventos iniciais de auditoria também são fixtures
de demonstração; os seguintes refletem ações da sessão.

Os métodos, URLs, envelopes `success/data`, schemas Zod, códigos HTTP e
middlewares de segurança continuam os das rotas existentes:

| Família | Cobertura |
| --- | --- |
| `GET /api/`, `/api/health`, `/api/docs`, `/api/docs.json` | Identificação, saúde e documentação existentes |
| `GET /api/patrimonios`, `/api/patrimonios/:slug` | Publicados; busca em textos/seções/categorias, categoria principal/adicional, bairro, situação, região, número, ordem editorial e paginação |
| `GET /api/categorias`, `/api/regioes` | Categorias e regiões ativas para filtros/formulários |
| `POST /api/auth/login`, `/refresh`, `/logout`; `PATCH /api/auth/senha` | Login, refresh rotativo, revogação e senha |
| `GET/POST /api/admins`; `GET/PATCH /api/admins/:id`; `PATCH /api/admins/:id/status` | Usuários, filtros/paginação, bloqueio e proteção do último ADMIN |
| `GET/POST /api/admin/patrimonios`; `GET/PATCH /:id`; `PATCH /:id/publicar`, `/:id/arquivar` | Escritas e transições refletidas imediatamente nas consultas e indicadores |
| `/api/admin/patrimonios/:id/fatos`, `/:id/ligacoes` | GET/POST; PATCH/DELETE de item e PATCH de ordem |
| `/api/admin/regioes` e `/:id` | GET/POST e PATCH, unicidade e vínculo ativo |
| `/api/admin/patrimonios/:id/imagens`, `/:id/imagens/:imagemId`; `/api/admin/patrimonios/imagens/:imagemId` | Upload nos campos `imagem` e `arquivo`, metadados e exclusão, incluindo contrato legado |
| `/api/admin/patrimonios/:id/documentos` e `/:id/documentos/:documentoId` | Upload, metadados e exclusão |
| `/api/admin/patrimonios/:id/referencias` e `/:id/referencias/:referenciaId` | Arquivos/links, metadados e exclusão |
| `GET /api/exposicoes`, `/api/novidades`; `/api/admin/exposicoes`, `/api/admin/novidades` | Consultas públicas, filtros/paginação, CRUD, publicação e arquivamento administrativo |
| `GET /api/admin/dashboard` | Totais, status, categorias principais/secundárias, bairros e regiões do mesmo estado da listagem |
| `/api/metricas/visualizacoes/sessao`, `/api/metricas/visualizacoes`; `GET /api/admin/dashboard/metricas` | Cookie local, origem/CSRF, deduplicação por identidade/patrimônio/dia e consulta em memória |
| `GET /api/admin/auditoria`, `/:id` | Filtros/paginação, responsável, detalhe e valores permitidos, sem senhas/tokens |
| `GET/HEAD /uploads/{patrimonios,referencias,exposicoes,novidades}/:arquivo`, `/api/uploads/{imagens,documentos}/:arquivo` | Arquivos locais, status consultado a cada acesso e autenticação para mídia não publicada |

Métricas de participação são habilitadas localmente no mock com chave própria;
iniciam vazias e contam somente eventos enviados durante a execução. Favoritos
permanecem indisponíveis conforme o contrato atual. Rate limit, origem exata,
header `X-Portal-Metricas` e cookie de participação continuam obrigatórios.
O proxy de métricas já existente no Vite preserva o `Host` do frontend; o backend
mantém a checagem de host/transporte. Não há sondagem ou retenção PostgreSQL no
mock: a cobertura é `NAO_INSTRUMENTADA`, com observação e datas indisponíveis.

As operações modificam coleções de domínio compartilhadas pela API. Não há
interpretação de consultas Prisma nem simulação de PrismaClient. O seletor em
`src/services/index.js` importa apenas o modo escolhido. `accessService` isola as
consultas reais de autenticação, categorias e propriedade de mídia, preservando
as verificações dos middlewares e a entrega segura de arquivos.

## Arquivos e limites

São mantidos os middlewares multipart existentes, limites de tamanho, assinatura
binária/MIME, metadados, nomes seguros e bloqueio a travessia de diretórios e
links simbólicos na entrega. Não há downloads externos. Novos uploads são
consultáveis pelas URLs retornadas e respeitam o status do patrimônio ou conteúdo.
Sem um vínculo publicado, a mídia exige autenticação.

O mock nunca escreve ou limpa o diretório real de uploads. Cada processo usa sua
pasta temporária exclusiva; ao reiniciar, a API usa outra pasta e não conhece os
registros/arquivos anteriores. Resíduos podem permanecer no temporário do sistema
até a limpeza normal desse diretório.

## Limitações e retorno ao ambiente real

- Alterações, usuários, senhas alteradas, sessões, auditoria e métricas somem ao
  reiniciar. Não existe endpoint público de reset.
- Fixtures não representam pessoas, fatos históricos, agenda ou documentos
  oficiais. IDs de novos registros e tokens continuam aleatórios.
- Este modo não comprova concorrência, locks PostgreSQL, integridade transacional,
  migrations, desempenho ou integração com banco/serviços reais.
- O dashboard usa `TODOS_OS_STATUS`; arquivar preserva o total do acervo e muda
  as contagens de status. A consulta pública conta somente publicados.
- Rotas culturais não possuem gestão nesta API, e as fixtures retornam `rotas: []`.
  `siteHeroRoute.js` não está montado no router real e continua sem URL disponível.
  Não foi necessária mudança no contrato do frontend.

Para voltar ao ambiente real, encerre a API e remova `MOCK_DATA` ou defina `false`
no ambiente e no `.env`. No PowerShell:

```powershell
$env:MOCK_DATA="false"
npm.cmd start
```

As variáveis reais, Prisma e PostgreSQL voltam a ser exigidos. Siga
[AUTENTICACAO_E_CARGAS.md](AUTENTICACAO_E_CARGAS.md) para a instalação real;
nada do mock é transferido para o banco.

## Validação

```powershell
cd backend
npm.cmd run test:mock
$env:MOCK_DATA="false"
npm.cmd test
npm.cmd run lint
git diff --check
```

`test:mock` usa HTTP local, bcrypt e filesystem reais, sem PostgreSQL. Bloqueia
imports de Prisma/pg, testa configuração em processos separados e inicia
`src/server.js` com somente `MOCK_DATA=true`, sem variáveis reais. Esse teste usa
a porta padrão 3333; deixe-a livre. Os testes de integração PostgreSQL existentes
continuam dependendo de seu banco de testes exclusivo e não são substituídos
pelos testes em memória.
