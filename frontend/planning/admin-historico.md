# Painel Administrativo (ADMIN)

> Documento histórico de demonstração, sem importação pelo código de produção. Desde 12/10/2026, descrição e resumo do patrimônio são preenchidos manualmente em campos separados; a geração por arquivo e seu serviço foram removidos. O planejamento futuro está em `frontend/planning/tendencias_culturais.md`.

Guia para **entender, rodar e completar** o painel `/admin`. Complementa o
`IA.md` (Gemini) e o `BRANDING.md` (identidade visual).

> **Estado atual: tudo em modo demonstração.** O painel funciona sem backend,
> sem Docker, sem chave do Google e sem chave do Gemini. Os dados são texto
> puro dentro dos arquivos e **somem ao atualizar a página (F5)**. Cada ponto
> que depende de uma integração real está marcado e listado na seção 11.

---

## 1. Como rodar (frontend)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Acesse `http://localhost:5173/admin/login`.

| Perfil        | E-mail                               | Senha        |
| ------------- | ------------------------------------ | ------------ |
| Administrador | `admin@guarulhos.sp.gov.servidor.br` | `admin123`   |
| Técnico       | `tecnico@guarulhos.sp.gov.br`        | `tecnico123` |

Só o perfil **admin** acessa o painel. O técnico entra, mas vê a mensagem de
"sem permissão" da `RotaProtegida`.

### Variáveis de ambiente (`frontend/.env`)

Todas são **opcionais**: sem elas o projeto roda em demonstração.

```env
# Backend (só quando a API for religada; veja a seção 7)
VITE_API_BASE_URL=http://localhost:3333/api

# Geocodificação do endereço (seção 5). false = coordenadas simuladas.
VITE_GEOCODING_ATIVO=false
# Chave do Maps JavaScript API (pública por natureza; RESTRINJA por domínio)
VITE_GOOGLE_MAPS_API_KEY=

# Mostra o campo "Detalhe" técnico no modal de erro. Em produção deixe false.
VITE_MOSTRAR_DETALHES_ERRO=false
```

> **Regra de ouro:** tudo que começa com `VITE_` vai para o navegador e é
> público. **Nunca** coloque ali `GEMINI_API_KEY`, `JWT_SECRET`,
> `DATABASE_URL` ou chaves de servidor.

---

## 2. Mapa dos arquivos

Os caminhos abaixo são relativos a `frontend/src/`.

| Arquivo                                                                                   | O que faz                                                                   |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `App.jsx`                                                                                 | Rotas, tela de transição ao abrir `/admin` e o provedor do modal de erro    |
| `features/admin/pages/LoginAdmin.jsx`                                                     | Login com rótulo flutuante, validação por campo, tremor e botão com estados |
| `features/admin/pages/AdminDashboard.jsx`                                                 | Contadores de usuários e patrimônios                                        |
| `features/admin/pages/AdminUsuarios.jsx`                                                  | Lista e formulário de usuários, selos de perfil coloridos                   |
| `features/admin/pages/AdminPatrimonios.jsx`                                               | Lista e formulário de patrimônios (endereço, imagem, resumo)                |
| `features/admin/components/AdminLayout.jsx`                                               | Barra lateral e área de conteúdo (importa `admin-extras.css`)               |
| `features/admin/admin-extras.css`                                                         | **Novo.** Hover da lateral, cores dos ícones, selos, categorias, upload     |
| `context/AuthContext.jsx`                                                                 | Login **mock** com `USUARIOS_MOCK` (API comentada)                          |
| `context/ErroModalContext.jsx` (+ `erroModalContextInstance.js`, `hooks/useErroModal.js`) | Modal de erro global                                                        |
| `components/ErroModal/ErroModal.jsx`, `ErrorBoundary.jsx`                                 | O modal e a rede de segurança para telas que quebram                        |
| `utils/erros.js`                                                                          | `ErroApp`, `sanitizar`, `normalizarErro`                                    |
| `services/maps.js`                                                                        | Endereço → latitude/longitude (demo ou Google)                              |
| `services/gemini.js`                                                                      | Arquivo → rascunho de resumo (demo ou backend)                              |
| `styles/global.css`                                                                       | Login com rótulo flutuante, modal de erro, transição, ícone girando         |

O context do modal segue o padrão que o projeto já usa (instância + Provider +
hook em arquivos separados, por causa do `react-refresh`). Criei um Context
novo porque erro é uma preocupação transversal: qualquer tela precisa abrir o
mesmo modal.

---

## 3. Login e transição

**Login (`LoginAdmin.jsx`)**

- **Rótulo flutuante:** o rótulo faz o papel de placeholder e sobe ao focar ou
  preencher (CSS puro, com `:placeholder-shown`).
- **Validação por campo:** só mostra erro depois que a pessoa sai do campo ou
  tenta enviar. E-mail válido ganha borda e ícone verdes.
- **Credencial recusada:** o cartão treme e a mensagem fica no formulário. Não
  abre modal, porque é erro de quem digitou.
- **Botão em três estados:** `Entrar` → ícone girando "Validando acesso…" →
  "Acesso confirmado" (verde), e só então navega.
- **Falha inesperada** (rede, bug): abre o modal de erro.
- **Segurança:** a mensagem de erro é sempre a mesma ("E-mail ou senha
  inválidos."), para não revelar se o e-mail existe.

**Transição ao abrir `/admin` (`AdminLoading` em `App.jsx`)**

O ícone de carregamento (`ArrowPathIcon`) **gira até a verificação real**: a
tela usa o `carregando` do `AuthContext`, não um tempo fixo. Quando a sessão é
confirmada, vira um "check" verde com o nome da pessoa e, em seguida, abre o
painel. Há um tempo mínimo de 0,9 s só para a tela não piscar.

- Hoje a verificação é instantânea (sessão no `sessionStorage`).
- Com a API real (`GET /auth/me`), o `carregando` fica verdadeiro até a
  resposta chegar, e o ícone continua girando sem mudar uma linha da tela.
- Sem sessão, a transição não aparece: a `RotaProtegida` leva direto ao login.

Todos os efeitos respeitam `prefers-reduced-motion` (o ícone de carregamento
continua girando, só que mais devagar).

---

## 4. Modal de erro

Qualquer tela usa:

```jsx
const { mostrarErro } = useErroModal();

try { ... } catch (err) {
  mostrarErro(err, { origem: "AdminPatrimonios › salvar", mensagem: "Não foi possível salvar." });
}
```

O que aparece:

- **Mensagem genérica**, em português, para a pessoa.
- **Bloco técnico** para o dev tirar print: código, referência, origem, status
  HTTP (se houver) e horário. O botão **Copiar detalhes** copia esse bloco.
- O campo **Detalhe** (texto técnico) só aparece em desenvolvimento ou com
  `VITE_MOSTRAR_DETALHES_ERRO=true`. Ele passa por `sanitizar`, que mascara
  `Bearer ...`, `senha=...`, `token=...` e query strings.

| Código                                         | Quando                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ERR-REDE`                                     | Sem resposta do servidor                                                             |
| `ERR-TIMEOUT`                                  | Servidor demorou demais                                                              |
| `ERR-HTTP-<status>`                            | Resposta de erro (400, 401, 403, 404, 409, 413, 429, 5xx)                            |
| `ERR-GEO-*`                                    | Falha ao localizar o endereço (`SEM-RESULTADO`, `FORA-DA-CIDADE`, `INDISPONIVEL`...) |
| `ERR-ARQUIVO-VAZIO`, `ERR-IA-NAO-IMPLEMENTADA` | Resumo por arquivo                                                                   |
| `ERR-APP`                                      | Qualquer outro erro                                                                  |

Também abrem o modal: promessas sem tratamento (`unhandledrejection`) e telas
que quebram na renderização (`ErrorBoundary`, com botão "Voltar ao início").

---

## 5. Cadastro de patrimônio

### Endereço e coordenadas (Google Maps)

O formulário **não pede mais latitude nem longitude**. A pessoa informa CEP
(com máscara), endereço, número, complemento e bairro; a cidade é fixa
(Guarulhos — SP). Ao salvar, `services/maps.js` converte o endereço em
coordenadas.

> **Nome certo da API:** quem converte endereço em coordenadas é a
> **Geocoding API**. A "Geolocation API" descobre onde está o _dispositivo_ da
> pessoa; não serve aqui.

**Controle de consumo e créditos**

- Chama **só ao salvar**, nunca a cada tecla.
- Ao editar, **só chama de novo se o endereço mudou**; senão reaproveita as
  coordenadas já salvas.
- Cache em memória por endereço; falhas não entram no cache.
- Resultado fora da caixa de Guarulhos é recusado (`ERR-GEO-FORA-DA-CIDADE`).
- Configure **limite de uso e alerta de orçamento** no Google Cloud.

**Modos**

- _Demonstração (padrão):_ coordenadas simuladas perto do centro da cidade.
  Nada vai ao Google.
- _Real (`VITE_GEOCODING_ATIVO=true`):_ usa `google.maps.Geocoder`, que exige
  o script do Maps já carregado na página.

**Decisão pendente (com a equipe do backend):** geocodificar no front (como
está) ou numa rota do backend com chave de servidor. O backend é o caminho
mais seguro: a chave nunca vai ao navegador. Nunca use a Geocoding REST com
chave no front.

### Imagem principal (ícone de clipe)

Botão com `PaperClipIcon`, prévia, nome do arquivo e botão de remover.
Aceita JPG, PNG e WebP até 5 MB. **Hoje a imagem fica só no navegador** (URL
temporária). Para guardar de verdade falta o upload no backend (seção 8).

### Resumo: escrever ou enviar arquivo

Duas abas: **Escrever** e **Enviar arquivo** (`.txt`, `.md`, `.pdf`, até
5 MB). No modo arquivo, o botão **Gerar resumo com IA** envia o arquivo ao
backend, que usa o Gemini; o texto volta para um campo **editável**.

- A IA gera um **rascunho**: a pessoa revisa antes de salvar.
- Só chama ao clicar no botão (nunca automático) e não repete o mesmo arquivo.
- A chave do Gemini **nunca** fica no front (`IA.md`, seção 4.3).
- Hoje não há IA: `.txt` e `.md` mostram o início do próprio arquivo e `.pdf`
  mostra um aviso. O contrato proposto para o backend está comentado em
  `services/gemini.js`.

### Cores por categoria

Cada categoria tem uma cor na legenda, no selo e na linha da tabela (faixa à
esquerda e fundo suave). Em `admin-extras.css`:

| Slug            | Cor                       |
| --------------- | ------------------------- |
| `arquitetonico` | azul (`--blue`)           |
| `natural`       | verde (`--green`)         |
| `imaterial`     | laranja (`--orange-dark`) |
| outros          | cinza                     |

Para uma categoria nova, copie um bloco `[data-cat="slug"]` e troque as
quatro variáveis `--cat-*`. As cores vêm da paleta do `BRANDING.md`.

---

## 6. Gemini (resumo por arquivo)

Segue o `IA.md`:

```text
React → Backend → Serviço Gemini → Gemini API
```

Regras que o backend precisa cumprir:

1. Receber o arquivo, **validar o tipo pelo conteúdo** (não pela extensão),
   limitar o tamanho e extrair só o texto.
2. Tratar o conteúdo do documento como **dado, nunca como instrução**
   (defesa contra _prompt injection_): ex.: "ignore as regras anteriores e..."
   dentro do PDF não pode ser obedecido.
3. Pedir resposta **estruturada** (JSON Schema) e validar antes de devolver.
4. Registrar quantidade de chamadas, erros e tempo, **sem gravar o conteúdo**.
5. Limite de chamadas por usuário/hora e teto de tamanho do prompt.
6. `GEMINI_MODEL` configurável; chave só em `GEMINI_API_KEY` no servidor.

Antes de ligar, confira nos termos atuais da Gemini API como o provedor trata
os dados enviados (planos gratuito e pago costumam diferir). Não envie
documentos sigilosos nem dados pessoais.

---

## 7. Religar o backend (tirar o modo demonstração)

Os trechos de API **estão comentados**, não apagados.

1. **`AuthContext.jsx`:** reative `import api`, o `login` original (ou o da
   equipe) e apague `USUARIOS_MOCK` e o `login` mock.
2. **`AdminDashboard`, `AdminUsuarios`, `AdminPatrimonios`:** descomente os
   blocos `ORIGINAL (API)`, apague os trechos `MOCK TEMPORÁRIO` e restaure os
   imports comentados no topo.
3. **`.env`:** `VITE_API_BASE_URL` com a URL do backend.

### Diferenças entre o front atual e o backend da equipe (Node/Prisma/PostgreSQL)

| Ponto     | Front hoje                     | Backend da equipe                                               |
| --------- | ------------------------------ | --------------------------------------------------------------- |
| Login     | `GET /usuarios?email&senha`    | `POST /api/auth/login` com `{ email, password }`                |
| Resposta  | Dado direto                    | `{ success, data }`                                             |
| Sessão    | Headers `x-user-*`             | `Authorization: Bearer <JWT>` (15 min, sem refresh)             |
| Perfis    | `admin` / `tecnico`            | `ADMIN` / `EDITOR`                                              |
| IDs       | `"1"`, `"2"`...                | UUID                                                            |
| Erros     | `erro` / `erros[]`             | `message`, `details[]`, `error.code`                            |
| Endpoints | CRUD de usuários e patrimônios | **Só login** (patrimônios, categorias e CRUD ainda não existem) |

O `GET /patrimonios/:id` do front trata 404 como "não encontrado"; contra o
backend da equipe isso faria toda página de detalhe parecer inexistente.
Corrija junto com a integração.

---

## 8. Mapeamento: formulário → banco

Estrutura do banco (JSON de exemplo da equipe) e de onde cada campo vem:

| Tabela / campo                                               | Vem do formulário                          | Observação                                                                          |
| ------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Patrimonio.nome`                                            | Nome                                       |                                                                                     |
| `Patrimonio.slug`                                            | —                                          | Gerar a partir do nome (único)                                                      |
| `Patrimonio.descricao`                                       | Resumo                                     | Limite de tamanho a confirmar (`LIMITE_RESUMO = 600`)                               |
| `Patrimonio.historia`                                        | —                                          | Campo opcional ainda **não** está no formulário                                     |
| `Patrimonio.situacao`                                        | —                                          | Valores do enum a confirmar (vistos: `PRESERVADO`, `NAO_INFORMADO`)                 |
| `Patrimonio.status`                                          | —                                          | Visto: `PUBLICADO` (também `RASCUNHO`, `ARQUIVADO`); site público só lê `PUBLICADO` |
| `Patrimonio.categoriaId`                                     | Categoria                                  | O front usa o slug; o banco usa UUID                                                |
| `Patrimonio.createdBy`                                       | —                                          | Vem do usuário logado, no servidor                                                  |
| `Localizacao.endereco / numero / complemento / bairro / cep` | Endereço, Número, Complemento, Bairro, CEP |                                                                                     |
| `Localizacao.cidade / uf`                                    | —                                          | Fixos: `Guarulhos` / `SP`                                                           |
| `Localizacao.latitude / longitude`                           | **Calculado** (geocodificação)             | Guardar no banco; nunca recalcular sem mudar o endereço                             |
| `PatrimonioImagem.url / principal`                           | Imagem principal                           | Falta upload no backend; `principal = true`, `textoAlternativo` a pedir             |
| `PatrimonioDocumento`                                        | (opcional) arquivo do resumo               | Decidir se o arquivo enviado à IA também fica salvo                                 |

---

## 9. Segurança da informação e criptografia

### 9.1 Avaliação do estado atual

| Risco                                                                            | Situação hoje                           | Gravidade                 | O que fazer                                                          |
| -------------------------------------------------------------------------------- | --------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| Senhas em texto puro no código (`USUARIOS_MOCK`)                                 | Só no modo demonstração                 | **Alta se for publicado** | Apagar ao religar o backend; nunca subir para produção               |
| Sessão no `sessionStorage` / headers `x-user-*` forjáveis (backend MySQL antigo) | Protótipo                               | **Alta**                  | Não usar fora de testes; migrar para JWT/cookie do backend da equipe |
| Autorização só no front                                                          | `RotaProtegida` é só experiência de uso | **Alta**                  | O backend deve autorizar **toda** rota (RBAC)                        |
| Token de 15 min sem refresh                                                      | Backend da equipe                       | Média                     | Definir refresh ou sessão por cookie                                 |
| Upload de arquivos sem validação no servidor                                     | Ainda não existe upload                 | **Alta ao implementar**   | Ver 9.4                                                              |
| Chaves de API no navegador                                                       | Nenhuma hoje                            | Alta se ocorrer           | Ver 9.5                                                              |
| Erros técnicos expostos ao usuário                                               | Detalhe só em desenvolvimento           | Baixa                     | Já tratado (seção 4)                                                 |
| Sem limite de tentativas de login                                                | Não verificado                          | Média                     | _Rate limit_ no backend                                              |
| Sem auditoria de quem alterou o quê                                              | Tabela `audit_log` existe, vazia        | Média                     | Gravar criação, edição e exclusão                                    |

### 9.2 Criptografia: o que usar em cada camada

| Camada                      | Prática recomendada                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Em trânsito**             | HTTPS/TLS em tudo (front, API, banco). HSTS ativo. Conexão com o Neon com `sslmode=require`                                                                                                    |
| **Senhas**                  | Hash com **bcrypt** (a equipe já usa; confirme o custo em `src/utils/password.js`, recomendado ≥ 12). Nunca guardar nem registrar a senha. O bcrypt considera só 72 bytes (o schema já limita) |
| **Tokens (JWT)**            | Assinatura com segredo ≥ 32 caracteres (já exigido) e expiração curta. **JWT é assinado, não criptografado**: não coloque dados sensíveis no payload                                           |
| **Armazenamento do token**  | `sessionStorage` é legível por qualquer script (XSS). Preferível **cookie HttpOnly + Secure + SameSite**; com cookie, o CORS precisa de `credentials` e é preciso proteção contra CSRF         |
| **Em repouso**              | Disco e backups cifrados pelo provedor do banco (confirme na documentação do Neon). Dados pessoais são mínimos: nome e e-mail de servidores                                                    |
| **Segredos**                | Só em variáveis de ambiente do servidor, fora do Git (`.gitignore`). Rotacione se vazar. Aleatoriedade de segurança com `crypto.randomUUID` / `randomBytes`, nunca `Math.random`               |
| **Integridade de arquivos** | Hash SHA-256 para detectar duplicados e cachear a análise da IA                                                                                                                                |

### 9.3 Backend: controles mínimos

- **Autorização em toda rota** por perfil; o front só esconde botões.
- **Validação de entrada** (Zod, já usado) em todo corpo, parâmetro e arquivo.
- **Rate limiting** e atraso progressivo no login; mensagens genéricas.
- **Cabeçalhos de segurança** (`helmet`: CSP, `X-Content-Type-Options`...).
- **CORS** restrito às origens conhecidas (já feito).
- Usuário do banco da aplicação **sem permissão de DDL** em produção.
- **Logs** com a referência do erro (`E-XXXXXX`) para casar com o print do
  usuário, **sem** senhas, tokens nem conteúdo de documentos.
- `npm audit` / Dependabot e Node LTS atualizado.

### 9.4 Upload de imagens e documentos

- Validar o tipo pelo **conteúdo** (_magic bytes_), não por extensão ou MIME do
  cliente. Limitar tamanho (multer `limits`).
- **Renomear** com UUID; nunca usar o nome original no disco.
- Guardar **fora da pasta pública** ou em armazenamento de objetos, servindo por
  URL assinada.
- Reprocessar imagens (remove EXIF/GPS e conteúdo embutido).
- PDFs podem conter scripts: extrair só o texto; considerar antivírus (ClamAV).
- Nunca executar nem interpretar o arquivo recebido.

### 9.5 Chaves de API

| Chave               | Onde fica                                                | Proteção                                                            |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Maps JavaScript API | Front (`VITE_GOOGLE_MAPS_API_KEY`), pública por natureza | Restringir por **domínio (HTTP referrer)** e só às APIs necessárias |
| Geocoding REST      | **Só no backend**                                        | Restringir por IP do servidor                                       |
| `GEMINI_API_KEY`    | **Só no backend**                                        | Nunca em `VITE_*`, `src/`, `public/` ou Git                         |
| Todas               | Google Cloud                                             | Cotas, limite diário e alerta de orçamento                          |

### 9.6 LGPD

- **Dados pessoais tratados:** nome e e-mail de servidores com acesso ao painel.
  Defina a base legal (execução de política pública), o prazo de retenção e o
  encarregado (DPO) da Prefeitura.
- **Minimização:** não enviar dados pessoais ao Gemini nem ao Google Maps.
- **Eventos de navegação** (`IA.md`): usar `sessionId` anônimo, sem IP nem
  identificação, e informar isso na política de privacidade do portal.
- **Direitos do titular:** prever como corrigir ou excluir os dados de um
  servidor que deixa o órgão (desativar o usuário em vez de apagar o histórico).

---

## 10. Estilo

- Reuso total das variáveis do `BRANDING.md` (`--navy`, `--blue`, `--green`,
  `--orange`...); nenhum hex novo, exceto o vermelho de erro `#b3261e`, que já
  era usado no login.
- **Hover da barra lateral:** `--navy` com 14% de opacidade, em
  `admin-extras.css`. Se a lateral for escura, troque para um azul claro
  (instrução no próprio arquivo).
- **Ícones do dashboard:** usuários em azul, patrimônios em verde.
- **Selos de perfil:** administrador em azul-marinho, técnico em laranja.
- A tela de transição antiga (`.admin-loading*`) deixou de ser usada; as novas
  classes são `.admin-transicao*`. Pode apagar as antigas do `admin.css`.

---

## 11. Informações que ainda faltam (checklist)

| #   | O que falta                                                    | Quem informa      | Onde entra                                |
| --- | -------------------------------------------------------------- | ----------------- | ----------------------------------------- |
| 1   | Contrato dos endpoints de patrimônios, categorias e CRUD admin | Equipe do backend | `services/adminApi.js`, `patrimoniosApi.js`      |
| 2   | Formato da resposta e dos erros (`success/data`, `details`)    | Equipe do backend | `api.js` (desembrulhar), `normalizarErro` |
| 3   | Sessão: Bearer ou cookie HttpOnly; refresh; `/auth/me`; logout | Equipe + você     | `AuthContext.jsx`, `api.js`               |
| 4   | Valores do enum `situacao` e regras de `status`                | Equipe do backend | Formulário de patrimônio                  |
| 5   | Limite do campo `descricao` e existência de `historia`         | Equipe do backend | `LIMITE_RESUMO`                           |
| 6   | Upload de imagem/documento: endpoint, pasta, URL final         | Equipe do backend | `AdminPatrimonios.jsx`                    |
| 7   | Onde geocodificar (front ou backend) e chave do Google         | Você + equipe     | `services/maps.js`, `.env`                |
| 8   | Endpoint de resumo com IA e política de dados do Gemini        | Equipe + você     | `services/gemini.js`, `GEMINI_*`          |
| 9   | Quarta categoria (o site hoje conta 4) e sua cor               | Você              | `admin-extras.css`                        |
| 10  | `admin.css` atual, para ajustar o hover da lateral com certeza | Você              | `admin-extras.css`                        |
| 11  | Perfil `EDITOR`/`tecnico`: o que pode fazer                    | Você + equipe     | `RotaProtegida`, rotas                    |

---

## 12. Testes manuais

1. **Login vazio:** clique em Entrar sem preencher → cartão treme e aparecem
   "Informe seu e-mail institucional." e "Informe sua senha.".
2. **Senha errada:** mensagem "E-mail ou senha inválidos." e o cartão treme.
3. **Login correto:** botão com ícone girando, depois "Acesso confirmado", a
   tela "Verificando seu acesso" e o painel com "Olá, Administrador".
4. **Dashboard:** ícone de usuários azul e de patrimônios verde.
5. **Usuários:** selo do administrador em azul-marinho e do técnico em laranja.
6. **Novo patrimônio:** não existe latitude nem longitude; o CEP vira
   `00000-000` ao digitar.
7. **Imagem:** o clipe abre o seletor; um `.gif` é recusado com mensagem.
8. **Resumo por arquivo:** aba "Enviar arquivo" → anexe um `.txt` → "Gerar
   resumo com IA" → o texto aparece editável.
9. **Salvar:** o botão mostra "Localizando o endereço no mapa…" e o item
   aparece na lista com a cor da categoria; a legenda atualiza a contagem.
10. **Modal de erro:** provoque um erro (por exemplo, desligue a rede com a API
    religada) → modal com código, referência e origem; **Esc** fecha.
11. **F5:** os dados voltam ao inicial (esperado no modo demonstração).
