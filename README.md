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

## 🛠️ Tecnologias Utilizadas

### Frontend & Interface

- **React.js (19.2):** Biblioteca base para construção da interface baseada em componentes.
- **JavaScript (ES2026) / HTML5 / CSS3:** Base da aplicação.
- **CSS Puro (Arquitetura Modular):** Estilização sem frameworks externos, utilizando CSS Variables para temas e layouts flexíveis (Flexbox e CSS Grid).

### Bibliotecas e Dependências

| Biblioteca                                     | Finalidade                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@react-google-maps/api`                       | Integração do Google Maps SDK no React (marcadores, janelas de informação e rotas)                  |
| `axios`                                        | Cliente HTTP para consumo das rotas REST da API backend                                             |
| `recharts` (ou `chart.js` + `react-chartjs-2`) | Visualização de dados estatísticos através de gráficos dinâmicos                                    |
| `react-icons`                                  | Biblioteca de ícones vetoriais leves                                                                |
| `react-router-dom`                             | Gerenciamento de rotas e navegação de páginas (Home, Detalhes do Patrimônio, Dashboard Estatístico) |

### Backend & API

- **API RESTful:** Node.js com Express (código em `backend/src`).
- **Banco de Dados:** MySQL, com queries feitas direto pelo pacote `mysql2` (sem ORM).

> 💡 **Nota:** as bibliotecas de gráficos (`recharts` ou `chart.js`) ainda não foram adotadas, o dashboard estatístico da home usa só os dados que já vêm da API.

---

## 📐 Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│ (UI Components, Pure CSS, Google Maps API, Recharts)    │
└───────────────────────────┬─────────────────────────────┘
                             │  HTTP / JSON (REST API)
┌───────────────────────────▼─────────────────────────────┐
│                    Backend Server                        │
│      (Controllers, Routing, Auth & Geolocation)         │
└───────────────────────────┬─────────────────────────────┘
                             │  Queries / ORM
┌───────────────────────────▼─────────────────────────────┐
│                       Database                            │
│               (Patrimônios, Rotas, Usuários)             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Como Executar o Projeto

### 🐳 Com Docker (recomendado, um comando só)

Não precisa instalar Node, MySQL nem nada localmente. Só o [Docker](https://www.docker.com/) e o Docker Compose.

```bash
git clone https://github.com/<usuario>/<repositorio>.git
cd <repositorio>
docker compose up --build
```

Pronto, abra **http://localhost:8090** e o front já está no ar. Isso sobe três containers:

- **`mysql`**, banco MySQL já criado e semeado (tabelas `usuarios` e `patrimonios`), a partir de `db/init.sql`.
- **`backend`**, API Express que fala com o MySQL, código em `backend/src`.
- **`frontend`**, o React já buildado, servido por Nginx na porta 80 do container (mapeada para `8090` na sua máquina), com `/api` já configurado pra apontar pro backend, sem CORS, sem nada a mais pra configurar.

Login de teste no painel admin (`/admin/login`), que hoje permite criar, editar e apagar usuários e patrimônios (mais detalhes na seção "Painel Administrativo" logo abaixo):

| E-mail                               | Senha        | Perfil  |
| ------------------------------------ | ------------ | ------- |
| `admin@guarulhos.sp.gov.servidor.br` | `admin123`   | admin   |
| `tecnico@guarulhos.sp.gov.br`        | `tecnico123` | tecnico |

Para customizar portas ou senhas, copie `.env.example` para `.env` na raiz antes do `docker compose up` (veja as variáveis disponíveis no próprio arquivo). Para derrubar tudo: `docker compose down` (adicione `-v` para apagar também os dados do MySQL).

### Rodando sem Docker (manual)

#### Pré-requisitos

- [Node.js](https://nodejs.org/) 24.x (LTS) ou superior
- Gerenciador de pacotes `npm` ou `yarn`
- Chave de API do [Google Maps Platform](https://developers.google.com/maps) _(opcional, sem ela o mapa cai automaticamente em modo mockup)_
- MySQL rodando localmente (ou use só `docker compose up mysql` para subir apenas o banco)

#### Instalação

```bash
# Clone o repositório
git clone https://github.com/<usuario>/<repositorio>.git
cd <repositorio>

# Instale as dependências do frontend
cd frontend
npm install

# Instale as dependências do backend
cd ../backend
npm install
```

### Variáveis de Ambiente

Cada pacote tem seu próprio `.env.example`. Nenhuma variável é obrigatória
para rodar localmente (os padrões já funcionam), mas copiar o arquivo deixa
claro o que dá pra configurar:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

- `frontend/.env.example`: chave do Google Maps (opcional) e a URL do
  backend, que o Vite exige vir prefixada com `VITE_`.
- `backend/.env.example`: porta do servidor e credenciais do MySQL.

### Executando em desenvolvimento

```bash
# Banco de dados (só precisa disso se não tiver um MySQL local)
docker compose up mysql

# Backend, em um terminal
cd backend
npm run dev

# Frontend, em outro terminal
cd frontend
npm run dev
```

O frontend sobe com o Vite, então o terminal mostra o endereço exato (por padrão é `http://localhost:5173`), consumindo a API em `http://localhost:4000`.

---

## 🔐 Painel Administrativo

Existe uma área administrativa em `/admin`, protegida por login, onde é
possível gerenciar os usuários que têm acesso ao painel e o catálogo de
patrimônios que aparece no site público. Ela usa exatamente os mesmos
dados do MySQL que o site público lê, então criar ou editar um patrimônio
por lá reflete na hora nas páginas de Patrimônios, Mapa e na Home.

Por enquanto existe só um perfil com acesso de verdade ao painel, o
`admin`. Já existe um segundo perfil, `tecnico`, cadastrado no banco desde
já (pensando num controle de permissões maior mais pra frente), mas ele
ainda não tem nenhuma tela liberada, só consegue fazer login.

**Onde encontrar cada parte, se for mexer nisso:**

- `backend/src/middlewares/authMiddleware.js`: quem decide se uma
  requisição pode ou não chegar numa rota de admin.
- `backend/src/routes/adminUsuarioRoutes.js` e `adminPatrimonioRoutes.js`:
  as rotas protegidas em si.
- `frontend/src/features/admin/`: todo o painel do lado do front, desde a
  tela de login até as páginas de gerenciamento.
- `frontend/src/context/AuthContext.jsx`: tem uma explicação bem detalhada
  de como o login funciona hoje (é um mock) e o que precisa mudar quando
  virar autenticação de verdade.

---

## 📂 Estrutura do Projeto

```text
portal-PrefGuaurlhos/
├── docker-compose.yml       # Sobe mysql + backend + frontend com um comando
├── db/
│   └── init.sql             # Schema e dados de teste do MySQL
├── frontend/
│   └── src/
│       ├── assets/          # Imagens, ícones e vetores usados nos componentes
│       ├── components/      # Componentes globais (ex.: Navbar, Footer)
│       ├── context/         # AuthContext e PatrimoniosContext (estado global)
│       ├── features/
│       │   ├── admin/       # Painel administrativo: login, layout, páginas de
│       │   │   │           # gerenciamento de usuários e patrimônios
│       │   │   ├── components/
│       │   │   └── pages/
│       │   └── mapa/        # Mapa interativo (filtros, cards, integração com o Google Maps)
│       ├── pages/           # Páginas públicas do site (Inicio, Mapa, Patrimonios, ...)
│       ├── services/        # api.js (axios), fakeApi.js e adminApi.js
│       └── styles/          # CSS global e variáveis compartilhadas
└── backend/
    └── src/
        ├── config/          # Conexão com o MySQL
        ├── controllers/     # Recebem a requisição e chamam o service certo
        ├── services/        # Regras de negócio e queries no banco
        ├── routes/          # Endpoints da API, públicos e de admin
        ├── middlewares/     # Como o exigirAdmin, que protege as rotas de admin
        └── server.js
```

---

## 🗺️ Roadmap

- [x] Cadastro e edição de patrimônios via painel administrativo
- [ ] Upload de imagens (hoje o admin informa uma URL de imagem, não faz upload de arquivo)
- [ ] Autenticação de verdade (sessão por cookie, senha com hash), veja o aviso em `frontend/src/context/AuthContext.jsx`
- [ ] Segundo nível de permissão (`tecnico`) com acesso a algumas telas do admin
- [ ] Filtros avançados por bairro, época e categoria
- [ ] Dashboard estatístico com exportação de relatórios
- [ ] Versão mobile-first / PWA

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
