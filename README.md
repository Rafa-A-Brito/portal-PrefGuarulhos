# 🏛️ Portal Cultural - Patrimônio Histórico de Guarulhos

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=white)
![Google Maps API](https://img.shields.io/badge/Google%20Maps%20API-3.64-4285F4?style=flat&logo=googlemaps&logoColor=red)
![CSS3](https://img.shields.io/badge/CSS-3-1572B6?style=flat&logo=css3&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24%20LTS-339933?style=flat&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2026-edd54a?style=flat&logo=javascript&logoColor=yellow)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat)

Aplicação web interativa para o mapeamento, consulta e preservação da memória dos patrimônios históricos da cidade de Guarulhos. A plataforma permite a navegação por rotas culturais, visualização em mapa interativo via Google Maps, análise de dados estatísticos e mecanismos avançados de pesquisa e filtragem.

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

## 📌 Funcionalidades Principais

- **🗺️ Mapeamento Interativo & Rotas:** Geolocalização dos bens patrimoniais em Guarulhos utilizando a API do Google Maps com suporte a traçamento de rotas históricas.
- **🔍 Pesquisa & Filtros Avançados:** Filtros dinâmicos por categoria (arquitetônico, imaterial, natural), época histórica, bairro e estado de conservação.
- **📊 Painel Estatístico & Análises:** Gráficos interativos para análise de visitação, tombamentos e distribuição geográfica dos patrimônios.
- **🌐 Consumo de API REST:** Comunicação completa com a API backend para busca performática e persistência de dados.
- **🎨 Estilização Customizada:** Interface responsiva construída com CSS puro, sem dependência de frameworks visuais.

---

## Tecnologias e arquitetura

Frontend React 19 + Vite, API Express 5, Prisma 7 e PostgreSQL 17. Os Dockerfiles usam Node 24. O frontend usa Google Maps diretamente, com chave restrita por domínio; geocodificação é opcional.

A API usa JWT Bearer, expiração configurável (60–1800 segundos) e perfis ADMIN/EDITOR. O painel mantém a sessão em sessionStorage. A documentação dos contratos está em /api/docs e /api/docs.json. /api/health verifica a resposta HTTP da aplicação; a disponibilidade inicial do banco é verificada pelo healthcheck do PostgreSQL e pelas migrations no boot.

Os uploads locais são disponibilizados em /uploads/patrimonios, /uploads/exposicoes e /uploads/novidades. JPG, PNG, WEBP e GIF têm limite de 10 MB por imagem. nginx aceita até 12 MB no multipart, encaminha /uploads/ ao backend e não aplica cache longo aos uploads.

## Desenvolvimento local

Instale Node 24, npm e PostgreSQL 17, ou use somente o serviço de banco do Docker. Copie backend/.env.example para backend/.env e frontend/.env.example para frontend/.env.local. Preencha DATABASE_URL e JWT_SECRET; gere segredos, por exemplo, com:

~~~sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

Em backend:

~~~sh
npm ci
npm run prisma:validate
npm run prisma:generate
npm run prisma:status
~~~

Para um banco NOVO e deliberadamente escolhido, aplique as migrations com npm run prisma:migrate:deploy. Em banco existente, faça backup, consulte o status e revise as migrations pendentes antes de autorizar a aplicação. Não use reset, db push ou seed como atualização de um banco com conteúdo administrativo.

Inicie backend e frontend em terminais separados:

~~~sh
# backend
npm run dev
# frontend (após npm ci)
npm run dev
~~~

O backend escuta em 3333 e o Vite em 5173. VITE_API_BASE_URL=http://localhost:3333/api inclui o prefixo /api. resolverUrlPublica usa a origem da API para imagens locais; não é necessário proxy adicional no Vite.

### Variáveis

| Contexto | Variáveis |
| --- | --- |
| Backend | DATABASE_URL, PORT, JWT_SECRET, JWT_TTL_SECONDS, CORS_ORIGIN, UPLOAD_DIR |
| Compose normal | POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT, BACKEND_PORT, FRONTEND_PORT |
| Frontend no build | VITE_API_BASE_URL, VITE_GOOGLE_MAPS_API_KEY, VITE_GEOCODING_ATIVO |
| Opções locais do frontend | VITE_USE_MOCK_MAP, VITE_IA_RESUMO_ATIVA, VITE_MOSTRAR_DETALHES_ERRO |
| Testes Node | TEST_DATABASE_URL, TEST_DATABASE_EXCLUSIVE, DATABASE_URL (destino normal para comparação) |
| Containers descartáveis | TEST_POSTGRES_PASSWORD, TEST_JWT_SECRET, TEST_POSTGRES_PORT, TEST_BACKEND_PORT, TEST_FRONTEND_PORT |

Variáveis opcionais ausentes usam os padrões documentados. Não declare PORT= ou JWT_TTL_SECONDS= vazios. UPLOAD_DIR tem como padrão backend/uploads, independente do diretório de execução; um caminho relativo explicitamente configurado é relativo ao diretório de execução. O módulo de uploads também atende seed/importador e não exige JWT_SECRET.

Use senha hexadecimal ou escape corretamente caracteres reservados ao montar DATABASE_URL. Os placeholders nos exemplos precisam ser substituídos.

## Primeiro administrador

O script não sobrescreve contas existentes. Defina temporariamente ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD (12–72 bytes) e rode npm run admin:create dentro de backend. Exemplo PowerShell, solicitando a senha sem colocá-la no histórico:

~~~powershell
$env:ADMIN_NAME = Read-Host 'Nome'
$env:ADMIN_EMAIL = Read-Host 'E-mail'
$senhaAdmin = Read-Host 'Senha' -AsSecureString
$env:ADMIN_PASSWORD = [Net.NetworkCredential]::new('', $senhaAdmin).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
~~~

Essa é uma operação explícita de escrita no banco selecionado. Não existem credenciais padrão de login. A API POST /api/admins permite a um ADMIN já autenticado cadastrar outras contas.

## Docker normal

Copie .env.example para .env, substitua segredos e ajuste portas. PostgreSQL e backend são publicados somente em 127.0.0.1; o frontend local também usa loopback.

~~~sh
docker compose config --quiet
docker compose up --build -d
~~~

ATENÇÃO: o backend executa migrate deploy antes de iniciar. Não rode esse comando contra o banco real durante uma validação de infraestrutura; utilize o ambiente descartável descrito abaixo. O boot nunca executa seed. Reinícios não sobrescrevem conteúdo administrativo.

Os volumes pg_data e uploads_data são persistentes. /app/uploads é o diretório de runtime. src/uploads contém as imagens-fonte da carga e permanece na imagem. .env, node_modules local e uploads de runtime são excluídos pelo .dockerignore. Node assume o PID 1 usando exec. O frontend aguarda o healthcheck HTTP do backend.

Em redes com CA própria, os Dockerfiles aceitam um segredo opcional de build chamado build_ca, contendo um bundle PEM de certificados públicos confiáveis:

~~~sh
docker build --secret id=build_ca,src=/caminho/ca.pem -t portal-backend ./backend
docker build --secret id=build_ca,src=/caminho/ca.pem --build-arg VITE_API_BASE_URL=/api -t portal-frontend ./frontend
~~~

O segredo só é montado durante npm ci; não é copiado para a imagem. Não desative a verificação TLS. A chave Google Maps do frontend é pública por definição e deve ter restrições de origem/API; as variáveis VITE são incorporadas no build.

## PostgreSQL descartável e validação segura

O Compose normal inclui db_test no profile test. Para validar a pilha completa, prefira compose.test.yml: ele é AUTÔNOMO e nunca deve ser combinado com docker-compose.yml. Usa portal_test e uploads em tmpfs, sem volumes persistentes, portas padrão 5434/3334/8091.

Crie um arquivo de ambiente de teste fora do repositório, com segredos gerados e estas variáveis:

~~~dotenv
TEST_POSTGRES_PASSWORD=SUBSTITUA_POR_SEGREDO_HEXADECIMAL
TEST_JWT_SECRET=SUBSTITUA_POR_SEGREDO_COM_32_OU_MAIS_CARACTERES
TEST_DATABASE_URL=postgresql://portal_test:SUBSTITUA_POR_SEGREDO_HEXADECIMAL@127.0.0.1:5434/portal_test
TEST_DATABASE_EXCLUSIVE=1
DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/normal_unavailable
~~~

Esse DATABASE_URL inatingível vale apenas para a validação completamente isolada. Em testes contra um banco local separado, mantenha o DATABASE_URL normal correto para a comparação de identidade.

~~~sh
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
~~~

Alternativamente, exporte as variáveis e use npm run test:db:assert, test:db:migrate, test:db:status, test:db:integrity, test:integration ou test:uploads:e2e no backend.

A guarda valida protocolo, host permitido (localhost, loopback IPv4/IPv6 ou db_test), porta e nome terminado em _test. Exige TEST_DATABASE_EXCLUSIVE=1 e destino diferente do normal, inclusive com aliases/credenciais diferentes. URLs com parâmetros que redirecionam a conexão são recusadas. Ela protege migrations de teste, integridade e integrações.

As suítes rodam em série. npm test sem configuração de integração informa skips; com banco exclusivo disponível, todas as integrações devem executar. O SQL de integridade usa transação e ROLLBACK; o executor Node remove apenas a diretiva específica do psql e propaga qualquer erro SQL.

O E2E cria seus próprios registros no banco de teste e verifica POST/GET/DELETE dos três recursos diretamente e por nginx, conteúdo do arquivo, ausência de cache longo e limites de 10 MB.

## Importação conservadora de patrimônios

Fonte: backend/prisma/patrimonioSeedData.js (PATRIMONIOS_SEED). O seed antigo é apenas bootstrap/demonstração: atualiza registros, força publicação e recria detalhes. Não o execute como importador de dados administrativos.

O importador novo usa leitura por padrão:

~~~sh
# Dentro de backend, no banco selecionado por DATABASE_URL:
node prisma/import-patrimonios.js --dry-run
node prisma/import-patrimonios.js --dry-run --json
~~~

O dry-run não cria usuário, categoria, diretório ou imagem e não grava no banco. Informa host, porta, banco, status, fonte, existentes, criar, ignorar, conflitos, erros e warnings. criar representa candidatos validados; criados registra commits efetivamente realizados no apply. --json escreve apenas JSON no stdout; diagnósticos fatais usam stderr.

A escrita exige todas as confirmações:

~~~sh
node prisma/import-patrimonios.js --apply --confirm-db=portal_test --created-by-email=autor@example.test
~~~

O autor precisa existir, estar ativo e ser ADMIN ou EDITOR. Categorias precisam existir. Ausências são reportadas; não há criação implícita dessas dependências. Para testar com um arquivo de ambiente contendo TEST_DATABASE_URL, selecione explicitamente esse destino como DATABASE_URL somente no processo do importador; os testes de integração já fazem isso de forma isolada.

Novos registros ficam em RASCUNHO; --status=PUBLICADO é uma escolha explícita. Patrimônios existentes por slug são ignorados sem alteração. Nome normalizado coincidente com slug diferente gera conflito. Dados inválidos impedem a criação daquele item. Não existem --fill-missing, --overwrite ou --create-categorias neste lote; são apenas possibilidades futuras.

Cada patrimônio usa uma transação com suas relações. Coordenadas devem estar em par e dentro das faixas; localização só é criada com os campos mínimos. Nomes/extensões e existência das imagens são verificados previamente. A cópia é exclusiva; um destino com conteúdo diferente é erro. Imagem já existente idêntica pode ser reutilizada com aviso. Se a transação falhar, somente a imagem criada pela tentativa é compensada; falha na compensação mantém o erro original e reporta possível órfão.

O apply não é atomicamente global: um item com erro não desfaz os anteriores. Saída com conflitos/erros retorna código 1; inspecione o relatório e rode novo dry-run. No Lote 06, apply é validado somente em portal_test descartável. Carga real é uma operação manual posterior, precedida de backup e revisão do dry-run.

## Backups e recuperação

Antes de migration/importação em ambiente real:

1. Gere um dump PostgreSQL em formato custom com pg_dump --format=custom --file=portal.dump, fornecendo conexão por variáveis PGHOST, PGPORT, PGDATABASE, PGUSER e PGPASSWORD temporárias.
2. Salve também o diretório UPLOAD_DIR ou volume uploads_data. O dump não contém os arquivos.
3. Faça a cópia com gravações administrativas suspensas para manter banco e imagens consistentes.
4. Teste pg_restore em banco descartável separado antes de considerar o backup utilizável.

Nunca use docker compose down -v no projeto persistente como procedimento de atualização. Verifique o nome do projeto e os volumes antes de qualquer recuperação.

## Validação e legado

Validação local: npm test no backend, npm run lint e npm run build no frontend, Prisma validate/generate e git diff --check. Validação completa inclui PostgreSQL exclusivo e E2E Docker descritos acima.

O fluxo opcional npm run mock-server e frontend/db.json foram mantidos porque ainda constituem uma ferramenta de desenvolvimento explícita. Não participam da API real. Os fallbacks DEV de fakeApi/conteudoApi foram preservados. O hook legado sem consumidores que consultava configuração de mapa no backend foi removido.

SiteHero continua adiado. A otimização de bundle por lazy loading permanece de baixa prioridade; o limite de aviso do Vite não foi elevado.

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
