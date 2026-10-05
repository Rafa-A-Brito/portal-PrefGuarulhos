# Backend

API em Express que conversa com um banco MySQL. Serve dois tipos de rota: as
públicas, usadas pelo site (catálogo de patrimônios e login), e as rotas de
administração, usadas pelo painel admin do front para criar, editar e
apagar usuários e patrimônios.

## Estrutura

```
src/
├── config/       Configuração da conexão com o MySQL (config/database.js)
├── controllers/  Recebem a requisição HTTP, chamam o service certo e
│                 devolvem a resposta. Não têm SQL nem regra de negócio.
├── services/     Onde a lógica de verdade mora: as queries no banco, as
│                 regras (por exemplo, "não deixe excluir o último admin").
├── routes/       Declaram os endpoints e qual controller cada um chama.
├── middlewares/  Coisas que rodam antes do controller, como o
│                 exigirAdmin, que bloqueia rota de admin pra quem não é.
├── utils/        Funções pequenas e reaproveitáveis, como os validadores
│                 de formulário.
├── app.js        Monta o Express: middlewares globais e as rotas.
└── server.js     Sobe o servidor HTTP, esperando o MySQL responder antes.
```

Não tem pasta `models/` porque as queries são feitas direto com o pacote
`mysql2`, sem ORM. Para um projeto desse tamanho isso mantém as coisas mais
simples de entender; se o banco crescer bastante, vale reconsiderar.

## Rotas

### Públicas

| Método | Rota                | Para que serve                                   |
| ------ | -------------------- | ------------------------------------------------- |
| GET    | `/health`             | Health check, usado pelo Docker Compose            |
| GET    | `/patrimonios`        | Lista todos os patrimônios                         |
| GET    | `/patrimonios/:id`    | Um patrimônio específico                           |
| GET    | `/usuarios`           | Login: filtra por `?email=` e `?senha=`             |
| GET    | `/config/mapa`        | Chave do Google Maps (`GOOGLE_MAPS_KEY` do `.env`), veja a seção "Mapa" do README da raiz |

### Administrativas (exigem estar logado como admin)

| Método | Rota                    | Para que serve            |
| ------ | ------------------------ | -------------------------- |
| GET    | `/admin/usuarios`         | Lista usuários (sem senha)  |
| POST   | `/admin/usuarios`         | Cria um usuário              |
| PUT    | `/admin/usuarios/:id`     | Edita um usuário             |
| DELETE | `/admin/usuarios/:id`     | Apaga um usuário             |
| POST   | `/admin/patrimonios`      | Cria um patrimônio           |
| PUT    | `/admin/patrimonios/:id`  | Edita um patrimônio          |
| DELETE | `/admin/patrimonios/:id`  | Apaga um patrimônio          |

Não existe `GET /admin/patrimonios` de propósito: tanto o site público
quanto o painel admin usam a mesma rota de leitura, `GET /patrimonios`, já
que os dois estão lendo a mesma coisa.

## Sobre a autenticação (leia antes de mexer em algo relacionado a login)

Hoje o login é um mock, documentado com detalhes em
`frontend/src/context/AuthContext.jsx`. Resumindo o que importa pro
backend: o front manda dois headers em toda requisição, `x-user-email` e
`x-user-perfil`, lidos da sessão salva no navegador. O middleware
`exigirAdmin` (em `src/middlewares/authMiddleware.js`) confere se aquele
e-mail corresponde a um usuário admin de verdade no banco antes de deixar
a requisição passar.

Isso não é segurança de verdade, porque qualquer pessoa com acesso ao
DevTools consegue forjar esses headers. O motivo de ainda ser assim é que
o projeto inteiro está numa fase de dados de teste. Antes de qualquer uso
real, veja a seção "QUANDO O BACKEND REAL EXISTIR" no topo do
AuthContext.jsx: ela descreve o caminho para trocar isso por sessão de
verdade (cookie HttpOnly, senha com hash, e o middleware validando o
cookie em vez de confiar em headers).

## Rodando sem Docker

```bash
cd backend
npm install
cp .env.example .env
# edite o .env se o seu MySQL não for o padrão (usuário root, senha "guarulhos")
npm run dev
```

Precisa de um MySQL rodando e com o schema criado. O jeito mais rápido de
ter isso sem instalar nada é subir só o banco pelo Docker Compose, lá na
raiz do projeto:

```bash
docker compose up mysql
```

Isso já roda o `db/init.sql` (schema e dados de teste) na primeira vez que
o volume do MySQL é criado.
