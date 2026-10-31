# 🏛️ Portal Cultural - Patrimônio Histórico de Guarulhos

Para apresentar o sistema sem banco ou credenciais externas, consulte o
[modo de demonstração com `MOCK_DATA=true`](backend/docs/MODO_DEMONSTRACAO.md).
Os dados são fictícios e as alterações desaparecem ao reiniciar a API.

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=white)
![Google Maps API](https://img.shields.io/badge/Google%20Maps%20API-3.64-4285F4?style=flat&logo=googlemaps&logoColor=red)
![CSS3](https://img.shields.io/badge/CSS-3-1572B6?style=flat&logo=css3&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24%20LTS-339933?style=flat&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2026-edd54a?style=flat&logo=javascript&logoColor=yellow)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat)

Aplicação web para pesquisa, divulgação e preservação da memória dos patrimônios históricos e culturais de Guarulhos. Esse _app_ reúne um catálogo dos bens patrimoniais, possibilitando rotas através do Google Maps, conteúdos editoriais e um painel administrativo para auxiliar na administracão municipal.

> **Documentação geral do repositório:** este `README.md`, na **raiz**, contempla frontend, backend, banco de dados, Docker e orientações de implantação. Para procedimentos técnicos específicos, consulte [Autenticação e cargas](backend/docs/AUTENTICACAO_E_CARGAS.md), [Sessões renováveis](backend/docs/SESSOES_RENOVAVEIS.md) e [Segurança](backend/docs/SEGURANCA.md).

---

## 📑 Sumário

- [Sobre o Projeto](#sobre-o-projeto)
  - [Colaboradores](#colaboradores)
  - [Motivação](#motivação)
  - [Justificativa](#justificativa)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Tecnologias e Arquitetura](#tecnologias-e-arquitetura)
- [Desenvolvimento Local](#desenvolvimento-local)
  - [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Primeiro Administrador](#primeiro-administrador)
- [Docker Compose](#docker-compose-ambiente-normal)
- [PostgreSQL Descartável e Validação Segura](#postgresql-descartável-e-validação-segura)
- [Importação Conservadora de Patrimônios](#importação-conservadora-de-patrimônios)
- [Backups e Recuperação](#backups-e-recuperação)
- [Validação Antes de Publicar](#validação-antes-de-publicar)
  - [Verificação Manual da D4D.1](#verificação-manual-da-d4d1)
  - [Checklist de Pré-Deploy](#checklist-de-pré-deploy)
  - [Etapas D4 — Acompanhamento](#etapas-d4--acompanhamento)
- [Contribuindo](#contribuindo)
- [Licença](#licença)
- [Autores](#autores)

---

## 📖 Sobre o Projeto

### Colaboradores

<a href="https://github.com/Rafa-A-Brito"><img src="https://github.com/Rafa-A-Brito.png" width="85;" style="border-radius: 50%;" alt="Rafael Brito"/></a>
<a href="https://github.com/f3rcar"><img src="https://github.com/f3rcar.png" width="85;" style="border-radius: 50%;" alt="Fernando Cardoso"/></a>
<a href="https://github.com/enzo-dutra"><img src="https://github.com/enzo-dutra.png" width="85;" style="border-radius: 50%;" alt="Enzo Dutra"/></a>
<a href="https://github.com/itsanapaula"><img src="https://github.com/itsanapaula.png" width="85;" style="border-radius: 50%;" alt="Ana paula"/></a>
<a href="https://github.com/gimenes77"><img src="https://github.com/gimenes77.png" width="85;" style="border-radius: 50%;" alt="Henrique Bezerra"/></a>
<a href="https://github.com/vilarongadiaseduardo-glitch"><img src="https://github.com/vilarongadiaseduardo-glitch.png" width="85;" style="border-radius: 50%;" alt="Eduardo Vilaronga"/></a>
<a href="https://github.com/arthuraugustocavalcante"><img src="https://github.com/arthuraugustocavalcante.png" width="85;" style="border-radius: 50%;" alt="Arthur Augusto"/></a>
<a href="https://github.com/vpredeus"><img src="https://github.com/vpredeus.png" width="85;" style="border-radius: 50%;" alt="João Victor Predeus"/></a>
<a href="https://github.com/vitinnsz"><img src="https://github.com/vitinnsz.png" width="85;" style="border-radius: 50%;" alt="Victor Santos"/></a>

### Motivação

O projeto tem como objetivo desenvolver um sistema digital de divulgação, valorização e preservação do patrimônio histórico e cultural do município de Guarulhos. A solução permite que os usuários visualizem, por meio de recursos interativos como mapa e organização de conteúdos históricos, os principais patrimônios da cidade e acessem informações relevantes sobre cada local — sua história, importância cultural, localização e demais características.

Com isso, a plataforma busca:

- Aproximar a população, especialmente o público jovem, da memória cultural e artística do município;
- Incentivar o turismo cultural e promover a conscientização sobre a importância dos espaços históricos;
- Contribuir para a preservação da história da cidade por meio da tecnologia.

Como resultado, espera-se disponibilizar uma ferramenta de fácil utilização, acessível e organizada, que centralize informações sobre os patrimônios históricos, documentos e conteúdos culturais em um único ambiente digital — proporcionando uma experiência mais interativa e permitindo que os usuários conheçam melhor a história de Guarulhos.

### Justificativa

O projeto surge da necessidade de preservar, organizar e facilitar o acesso à história e ao patrimônio histórico e cultural da cidade de Guarulhos. Em um momento especial como o aniversário do município, o projeto busca valorizar a história da cidade, destacando seus patrimônios históricos, culturais e arquitetônicos, além de aproximar a população de sua própria história.

O cenário atual apresenta alguns desafios que motivam a criação da plataforma:

- Informações sobre os patrimônios da cidade estão espalhadas em diferentes fontes, dificultando o acesso da população ao conhecimento histórico;
- Documentos, imagens, curiosidades e conteúdos culturais não estão reunidos em um único ambiente;
- Falta uma ferramenta acessível que aproxime moradores, estudantes e visitantes da história do município.

Ao reunir esse conteúdo em uma plataforma digital única, o projeto contribui para a preservação da memória de Guarulhos e utiliza a tecnologia como ferramenta de educação e valorização cultural, permitindo que a população entenda melhor a importância de seus patrimônios.

---

## Funcionalidades principais

**Site público**

- **Catálogo e pesquisa:** listagem de patrimônios, páginas de detalhes e busca; filtros de categorias contemplam a categoria principal e as secundárias associadas ao patrimônio.
- **Localização e mapa:** Google Maps com marcadores e possibilidade de abrir rotas no serviço Google Maps; quando não há chave válida, o frontend dispõe de modo alternativo para desenvolvimento.
- **Conteúdo histórico:** descrições, dados de localização, imagens, referências e relações entre patrimônios, conforme os registros publicados.
- **Conteúdos editoriais:** páginas de exposições e novidades, observando o status de publicação definido pela API.
- **Interface responsiva:** React, componentes reutilizáveis e CSS modular.

**Painel administrativo (`/admin`)**

- Login de contas com perfis **ADMIN** e **EDITOR** e permissões aplicadas pelo backend.
- Administração de patrimônios, categorias, regiões e conteúdos editoriais, de acordo com a permissão de cada perfil.
- Cadastro de usuários autorizado a **ADMIN**, edição de informações e alteração de senha.
- Upload e gerenciamento de mídias conforme as validações e os limites de cada endpoint.
- **D4D.1 (pacote preparado):** link **Voltar ao site** sem logout, acesso inteligente ao painel a partir da página pública e barra informativa de força da senha nas telas de criação de usuário e alteração de senha. Essas alterações só estarão disponíveis no repositório/deploy depois de integradas e testadas.

---

## Tecnologias e arquitetura

| Camada         | Tecnologia / responsabilidade                                |
| -------------- | ------------------------------------------------------------ |
| Frontend       | React 19, Vite 8, React Router, Axios e CSS modular          |
| Backend        | Node.js 24, Express 5, autenticação, autorização e API REST  |
| Banco          | PostgreSQL 17, Prisma 7 e migrations versionadas             |
| Infraestrutura | Docker Compose, Nginx, volumes para banco e uploads          |
| Mapa           | Google Maps JavaScript API com chave restrita por origem/API |

O frontend consome a API REST do backend. Os contratos estão disponíveis em `/api/docs` (Swagger UI) e `/api/docs.json`; `/api/health` verifica a resposta HTTP da aplicação, mas **não é uma verificação completa de disponibilidade do banco**.

**Autenticação:** JWT Bearer com token de acesso de curta duração (padrão: 300 segundos, configurável entre 60 e 1800) e sessão renovável por refresh token (prazo absoluto padrão de 8 horas). O frontend guarda as credenciais da sessão atual em `sessionStorage`, **sem cookies e sem `localStorage`**. O logout revoga a sessão no backend; após troca de senha, sessões anteriores são invalidadas. A navegação entre páginas públicas e Admin não deve fazer logout, mas uma sessão expirada ou revogada exige novo login. Consulte [Sessões renováveis](backend/docs/SESSOES_RENOVAVEIS.md).

`sessionStorage` evita persistência após o encerramento da aba, mas **não elimina o risco de acesso às credenciais em caso de XSS**. Não confundir manutenção da sessão durante a navegação com login permanente.

**Uploads:** a API entrega mídias pelas rotas `/api/uploads/...`, expostas pelo Nginx em `/uploads/...`, com autorização de leitura dependente do recurso. Imagens editoriais JPEG, PNG, WebP e GIF têm limite de até 10 MiB por arquivo; outros tipos de arquivo possuem contratos e limites próprios. O Nginx encaminha uploads à API e evita cache longo de mídias protegidas.

## 🚀 Desenvolvimento local

Pré-requisitos: **Node.js 24**, npm e **PostgreSQL 17**, ou Docker para executar o banco. Os arquivos `.env.example` são exemplos: **nunca os trate como credenciais válidas**.

Na raiz do repositório, configure os ambientes:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

No PowerShell, use `Copy-Item` no lugar de `cp`, se preferir. Defina no backend um `DATABASE_URL` de um banco autorizado e um `JWT_SECRET` aleatório com pelo menos 32 caracteres. Gere cada segredo independentemente, por exemplo:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

> Em instalação **já existente**, **não** rode `migrate deploy`, `db push`, `migrate reset` nem `seed` apenas para iniciar o projeto. Verifique antes o destino da conexão, os backups e o histórico das migrations. As migrations de autenticação `20261020190000_add_user_token_version` e `20261021130000_add_auth_sessions` foram informadas como aplicadas no ambiente de trabalho; confirme o status em **cada banco de destino**, inclusive o de deploy.

**Backend** — em um terminal:

```bash
cd backend
npm ci
npm run prisma:validate
npm run prisma:generate
npm run prisma:status
npm run dev
```

Para **banco novo ou atualização expressamente autorizada**, depois de conferir o destino, o backup e **todas** as migrations pendentes: `npm run prisma:migrate:deploy` (a execução pode aplicar mais de uma migration). A trilha alternativa da equipe tem procedimento específico; **não misture históricos**. Consulte [Autenticação e cargas](backend/docs/AUTENTICACAO_E_CARGAS.md).

**Frontend** — em outro terminal, a partir da raiz:

```bash
cd frontend
npm ci
npm run dev
```

Por padrão, o backend fica em `http://localhost:3333` (API em `/api`) e o frontend Vite em `http://localhost:5173`. Use `VITE_API_BASE_URL=http://localhost:3333/api` no ambiente local. O modo de mapa simulado (`VITE_USE_MOCK_MAP=true`) é apenas uma opção de desenvolvimento.

### Variáveis de ambiente

| Arquivo                      | Principais variáveis                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/.env`               | `DATABASE_URL`, `PORT`, `JWT_SECRET`, `JWT_TTL_SECONDS`, `AUTH_SESSION_TTL_SECONDS`, `CORS_ORIGIN`, `UPLOAD_ROOT`, `TRUST_PROXY_IPS`, `LOGIN_RATE_*`      |
| `frontend/.env.local`        | `VITE_API_BASE_URL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`, `VITE_GEOCODING_ATIVO`, `VITE_USE_MOCK_MAP`                                   |
| `.env` na raiz (Docker)      | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `API_DB_PASSWORD`, `MIGRATION_DB_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, portas, `CORS_ORIGIN` e variáveis `VITE_*` |
| Ambiente exclusivo de testes | `TEST_DATABASE_URL`, `TEST_DATABASE_EXCLUSIVE=1`, `TEST_POSTGRES_PASSWORD`, `TEST_JWT_SECRET` e portas de teste                                           |

Os arquivos de exemplo contêm todas as opções. **Não versionar** `.env`, tokens, dumps, chaves, credenciais reais ou uploads persistidos. As variáveis `VITE_*` são incorporadas ao build e ficam visíveis no navegador; a chave do Google Maps deve ser restrita por domínio e serviço, e **não** deve ser tratada como um segredo privado. Senhas que usam caracteres especiais dentro de URLs PostgreSQL precisam de percent-encoding; o uso de senhas hexadecimais simplifica a configuração.

## Primeiro administrador

O script não sobrescreve contas existentes. Defina temporariamente `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mínimo de 12 caracteres e máximo de 72 bytes UTF-8) e rode `npm run admin:create` dentro de `backend`. Exemplo PowerShell, solicitando a senha sem colocá-la no histórico:

```powershell
$env:ADMIN_NAME = Read-Host 'Nome'
$env:ADMIN_EMAIL = Read-Host 'E-mail'
$senhaAdmin = Read-Host 'Senha' -AsSecureString
$env:ADMIN_PASSWORD = [Net.NetworkCredential]::new('', $senhaAdmin).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

Essa é uma operação explícita de escrita no banco selecionado. Não existem credenciais padrão de login. A API POST /api/admins permite a um ADMIN já autenticado cadastrar outras contas.

## 🐳 Docker Compose (ambiente normal)

O repositório possui `docker-compose.yml` com serviços `db` (**PostgreSQL 17**), `migrate` (migrations), `backend` (**Express**) e `frontend` (**Nginx + build React**). A configuração local publica portas em `127.0.0.1`; para disponibilizar o portal externamente é necessária uma configuração apropriada de HTTPS, proxy reverso, DNS, firewall e origem permitida (CORS).

1. Copie `.env.example` para `.env` **na raiz** e substitua os placeholders por segredos únicos, incluindo `POSTGRES_PASSWORD`, `API_DB_PASSWORD`, `MIGRATION_DB_PASSWORD` e `JWT_SECRET`.
2. **Antes de iniciar um banco existente**, faça backup do PostgreSQL e dos uploads, revise o histórico de migrations e confirme o banco de destino. **O job `migrate` aplica automaticamente todas as migrations pendentes** quando a pilha é iniciada.
3. Valide a configuração, inicialize e confira os serviços:

```bash
# Na raiz do repositório
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

No ambiente local padrão, o site é acessado em **http://localhost:8090**, e a API em `http://localhost:3333/api` (acesso direto restrito ao host). O Nginx encaminha `/api/` e `/uploads/` para o backend. O backend só inicia depois de o banco ficar saudável e da conclusão do job de migration. **O boot da API não executa seed.**

Os volumes nomeados `pg_data` e `uploads_data` preservam, respectivamente, dados do PostgreSQL e mídias geradas. **Não execute `docker compose down -v` no ambiente persistente**: o `-v` remove volumes. Para encerrar os contêineres mantendo os dados, use `docker compose down`.

O banco e a API usam contas distintas para aplicação e migrations; o backend utiliza redução de privilégios do contêiner. Se houver alteração na topologia ou na rede Docker, revise `TRUST_PROXY_IPS` e a configuração do Nginx em conjunto. Consulte [Segurança](backend/docs/SEGURANCA.md).

Em redes com CA própria, os Dockerfiles permitem um segredo de build `build_ca` com certificado PEM confiável, sem copiá-lo para a imagem:

```bash
docker build --secret id=build_ca,src=/caminho/ca.pem -t portal-backend ./backend
docker build --secret id=build_ca,src=/caminho/ca.pem --build-arg VITE_API_BASE_URL=/api -t portal-frontend ./frontend
```

Não desative a validação TLS. O mapa usa chave de browser restrita por origem/API, não uma chave secreta de servidor.

## PostgreSQL descartável e validação segura

O Compose normal possui `db_test` no profile `test`, mas para validar a pilha completa prefira **`compose.test.yml`**, que é **autônomo e nunca deve ser combinado com `docker-compose.yml`**. Utiliza `portal_test`, armazenamento temporário (`tmpfs`), sem volumes persistentes, e portas padrão 5434/3334/8091.

Crie um arquivo de ambiente de teste fora do repositório, com segredos gerados e estas variáveis:

```dotenv
TEST_POSTGRES_PASSWORD=SUBSTITUA_POR_SEGREDO_HEXADECIMAL
TEST_JWT_SECRET=SUBSTITUA_POR_SEGREDO_COM_32_OU_MAIS_CARACTERES
TEST_DATABASE_URL=postgresql://portal_test:SUBSTITUA_POR_SEGREDO_HEXADECIMAL@127.0.0.1:5434/portal_test
TEST_DATABASE_EXCLUSIVE=1
DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/normal_unavailable
```

Esse DATABASE_URL inatingível vale apenas para a validação completamente isolada. Em testes contra um banco local separado, mantenha o DATABASE_URL normal correto para a comparação de identidade.

```sh
# Na raiz; substitua /caminho/test.env pelo arquivo criado.
docker compose --env-file /caminho/test.env -p portal-validation -f compose.test.yml up -d --build --wait

# Dentro de backend:
node --env-file=/caminho/test.env scripts/test-db.js migrate
node --env-file=/caminho/test.env scripts/test-db.js status
node --env-file=/caminho/test.env scripts/test-db.js integrity
node --env-file=/caminho/test.env scripts/test-db.js test
node --env-file=/caminho/test.env scripts/run-suite.js
node --env-file=/caminho/test.env scripts/upload-e2e.js

# Na raiz, encerrar APENAS o projeto descartável:
docker compose --env-file /caminho/test.env -p portal-validation -f compose.test.yml down
```

Alternativamente, exporte as variáveis e use npm run test:db:assert, test:db:migrate, test:db:status, test:db:integrity, test:integration ou test:uploads:e2e no backend.

A guarda valida protocolo, host permitido (localhost, loopback IPv4/IPv6 ou db_test), porta e nome terminado em \_test. Exige TEST_DATABASE_EXCLUSIVE=1 e destino diferente do normal, inclusive com aliases/credenciais diferentes. URLs com parâmetros que redirecionam a conexão são recusadas. Ela protege migrations de teste, integridade e integrações.

As suítes rodam em série. npm test sem configuração de integração informa skips; com banco exclusivo disponível, todas as integrações devem executar. O SQL de integridade usa transação e ROLLBACK; o executor Node remove apenas a diretiva específica do psql e propaga qualquer erro SQL.

O E2E cria seus próprios registros no banco de teste e verifica POST/GET/DELETE dos três recursos diretamente e por nginx, conteúdo do arquivo, ausência de cache longo e limites de 10 MB.

## Importação conservadora de patrimônios

Fonte canônica: backend/prisma/patrimonioSeedData.js (PATRIMONIOS_SEED). O seed inicial foi corrigido: simula por padrão e cria somente ausentes como RASCUNHO, sem sobrescrever categorias, registros ou relações existentes. seed:pesquisa compartilha essa política e respeita a identidade/curadoria D1B/D1C. Consulte backend/docs/AUTENTICACAO_E_CARGAS.md.

O importador novo usa leitura por padrão:

```sh
# Dentro de backend, no banco selecionado por DATABASE_URL:
node prisma/import-patrimonios.js --dry-run
node prisma/import-patrimonios.js --dry-run --json
```

O dry-run não cria usuário, categoria, diretório ou imagem e não grava no banco. Informa host, porta, banco, status, fonte, existentes, criar, ignorar, conflitos, erros e warnings. criar representa candidatos validados; criados registra commits efetivamente realizados no apply. --json escreve apenas JSON no stdout; diagnósticos fatais usam stderr.

A escrita exige todas as confirmações:

```sh
node prisma/import-patrimonios.js --apply --confirm-db=portal_test --created-by-email=autor@example.test --expected-state-hash=HASH_REVISADO
```

O autor precisa existir, estar ativo e ser ADMIN ou EDITOR. Categorias precisam existir. Ausências são reportadas; não há criação implícita dessas dependências. Para testar com um arquivo de ambiente contendo TEST_DATABASE_URL, selecione explicitamente esse destino como DATABASE_URL somente no processo do importador; os testes de integração já fazem isso de forma isolada.

Novos registros ficam em RASCUNHO; --status=PUBLICADO é uma escolha explícita. Patrimônios existentes por slug são ignorados sem alteração. Nome normalizado coincidente com slug diferente gera conflito. Dados inválidos ou conflitos bloqueiam o lote completo antes de escrever. Não existem --fill-missing, --overwrite ou --create-categorias neste lote; são apenas possibilidades futuras.

As escritas de cada item e suas relações usam transações; o **lote completo não é atomicamente global**. O dry-run usa READ ONLY; apply exige o hash do estado revisado. Coordenadas devem estar em par e dentro das faixas; localização só é criada com os campos mínimos. Nomes/extensões e existência das imagens são verificados previamente. A cópia é exclusiva; um destino com conteúdo diferente é erro. Imagem já existente idêntica pode ser reutilizada com aviso. Se a transação falhar, somente a imagem criada pela tentativa é compensada; falha na compensação mantém o erro original e reporta possível órfão.

O apply não é atomicamente global: um item com erro não desfaz os anteriores. Saída com conflitos/erros retorna código 1; inspecione o relatório e rode novo dry-run. No Lote 06, apply é validado somente em portal_test descartável. Carga real é uma operação manual posterior, precedida de backup e revisão do dry-run.

## Backups e recuperação

Antes de migration/importação em ambiente real:

1. Gere um dump PostgreSQL em formato custom com pg_dump --format=custom --file=portal.dump, fornecendo conexão por variáveis PGHOST, PGPORT, PGDATABASE, PGUSER e PGPASSWORD temporárias.
2. Salve também o diretório UPLOAD_DIR ou volume uploads_data. O dump não contém os arquivos.
3. Faça a cópia com gravações administrativas suspensas para manter banco e imagens consistentes.
4. Teste pg_restore em banco descartável separado antes de considerar o backup utilizável.

Nunca use docker compose down -v no projeto persistente como procedimento de atualização. Verifique o nome do projeto e os volumes antes de qualquer recuperação.

## ✅ Validação antes de publicar

Execute estes comandos **após instalar as dependências**, de preferência em CI e em ambiente de teste isolado:

```bash
# Backend (na pasta backend)
npm run prisma:validate
npm run prisma:generate
npm run prisma:status
npm run lint
npm test

# Frontend (na pasta frontend)
npm test
npm run lint
npm run build
node --test test-node/forcaSenha.node.test.mjs

# Raiz do repositório
git diff --check
```

`prisma:status` deve apontar para o banco correto. Testes de integração que gravam dados **exigem PostgreSQL de teste exclusivo** (`TEST_DATABASE_EXCLUSIVE=1` e verificação de destino); não execute testes destrutivos em produção. A suíte `npm test` do backend pode registrar integrações ignoradas quando não existe banco de teste configurado. Consulte a seção anterior para o teste completo com Docker.

### Verificação manual da D4D.1

**Somente após integrar o pacote de alterações D4D.1 ao repositório:**

1. Entrar no Admin como **ADMIN** e depois como **EDITOR**; clicar em **Voltar ao site** e retornar pelo ícone administrativo da Navbar sem novo login quando a sessão estiver válida.
2. Abrir `/admin/login` com sessão ativa e confirmar o redirecionamento ao painel.
3. Clicar em **Sair** e conferir a exigência de novo login; repetir com sessão expirada ou revogada.
4. Em **Novo usuário** e **Alterar senha**, verificar barra **Fraca / Média / Forte** e as mensagens de limite. A barra é **informativa**; a regra obrigatória permanece 12 caracteres e 72 bytes UTF-8. Ela não é exibida na tela de login.
5. Verificar as permissões ADMIN/EDITOR também por requisições diretas à API, não apenas por ocultação de botões no frontend.

O pacote de D4D.1 contém testes React/Vitest e testes isolados de classificação de senha. Na preparação desse pacote, somente os testes isolados passaram; **a suíte React, o lint e o build ainda precisam ser executados no ambiente com dependências disponíveis**. Não declarar a etapa validada para produção antes dessa execução.

### Checklist de pré-deploy

- [ ] Confirmar a versão do código, revisar o diff e integrar apenas alterações aprovadas (incluindo D4D.1, se desejada).
- [ ] Confirmar `DATABASE_URL` e o histórico de migrations no banco de destino; gerar e **testar a restauração** de backup do PostgreSQL e dos uploads.
- [ ] Proteger `.env`, tokens, chaves e dumps; usar segredos exclusivos por ambiente, permissões mínimas e HTTPS com configuração correta de proxy/CORS.
- [ ] Restringir a Google Maps API key por origem e API; usar Map ID de produção, quando necessário.
- [ ] Executar lint, build, testes, integrações e testes de autenticação no ambiente isolado.
- [ ] Verificar login, refresh, logout, alteração de senha e acesso por perfil, além de upload, filtros, categorias secundárias e relacionamentos.
- [ ] Confirmar persistência dos volumes e recuperação operacional; não remover volumes de produção.
- [ ] Auditar rate limiting e headers. O limitador atual é **em memória por processo**; para múltiplas réplicas, planejar proteção compartilhada. Política global de CSP e inspeção completa de malware em uploads ainda requerem análise específica.
- [ ] Validar monitoramento, logs sem credenciais e rollback antes da abertura pública.

### Etapas D4 — acompanhamento

| Etapa   | Escopo                                                                                 | Situação documental                                                                                                          |
| ------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **D4A** | Patrimônios relacionados: 38 vínculos propostos, preservando as 14 relações existentes | Revisão editorial e importação aprovadas **não confirmadas**                                                                 |
| **D4B** | Docker, PostgreSQL, Nginx, volumes e persistência                                      | Configuração presente; validação integrada em ambiente isolado **a confirmar**                                               |
| **D4C** | GitHub, segredos, versionamento e preparação para publicação                           | Auditoria final do repositório **a confirmar**                                                                               |
| **D4D** | Autenticação, sessões, tokens, autorização e segurança                                 | Migrations de autenticação informadas como aplicadas; D4D.1 preparada, validações integradas e auditoria D4D.2 **pendentes** |

**Compatibilidade e legado:** `npm run mock-server` e `frontend/db.json` são ferramentas opcionais de desenvolvimento. Não representam a API real. Os fallbacks DEV de `patrimoniosApi`/`conteudoApi` são mantidos. `SiteHero` permanece adiado, conforme o planejamento registrado; otimizações de bundle por lazy loading são de menor prioridade.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Envie para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

---

## 👥 Autores

Desenvolvido como parte de um projeto acadêmico voltado à valorização do patrimônio histórico e cultural de Guarulhos.
