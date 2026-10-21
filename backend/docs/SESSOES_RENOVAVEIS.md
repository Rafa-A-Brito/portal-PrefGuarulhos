# Sessões renováveis Bearer

Este é o procedimento atual de autenticação, posterior às rodadas de segurança,
cargas e correção do P2022. Substitui a orientação anterior de logout apenas
local, acesso padrão de 15 minutos e ausência de refresh. Não altera cargas,
regras editoriais, publicidade de mídia ou a política de tentativas de login.

## Configuração e implantação

| Variável | Padrão | Limites aceitos |
| --- | --- | --- |
| `JWT_TTL_SECONDS` | `300` (5 minutos) | 60–1800 segundos |
| `AUTH_SESSION_TTL_SECONDS` | `28800` (8 horas) | 300–86400 segundos |

O limite da sessão é fixado no login e salvo em `auth_sessions.expires_at`.
Renovar nunca altera esse campo. O JWT termina no menor prazo entre seu TTL e
o fim da sessão. Overrides existentes de ambiente continuam prevalecendo;
conferir especialmente um `.env` antigo com `JWT_TTL_SECONDS=900`. Os arquivos
de exemplo e o padrão do Compose agora usam 300/28800. Nenhum segredo ou `.env`
real foi alterado nesta tarefa.

A migration **aditiva** `20261021130000_add_auth_sessions` está nas trilhas
padrão e equipe. Cria `auth_sessions` e `refresh_tokens`, índices e restrições;
não altera migrations anteriores nem os dados editoriais. Ela é obrigatória
antes de iniciar o código novo, inclusive em desenvolvimento local. Sem ela,
consultas às sessões falharão por estrutura ausente.

Procedimento para um ambiente cuja atualização esteja autorizada:

1. Fazer backup e conferir a trilha realmente aplicada. Não misturar históricos.
2. Aplicar a migration pela conta/config de migração correspondente. Na padrão,
   usar o job `node scripts/migrate-deploy.js`, com `MIGRATION_DATABASE_URL`.
   Na equipe, usar `prisma migrate deploy --config prisma.equipe.config.js`,
   com `EQUIPE_DATABASE_URL`. A exceção de banco local exclusivo documentada
   em [AUTENTICACAO_E_CARGAS.md](AUTENTICACAO_E_CARGAS.md) continua separada.
3. Executar `npm run prisma:generate` e implantar API/frontend compatíveis.
4. **Exigir novo login de todas as sessões anteriores.** JWT sem `sid` ou versão
   é recusado; sessões antigas do frontend sem refresh/prazo também são removidas.

Não executar reset, db push ou seed para essa atualização. Não houve migração
do banco da aplicação, deploy, push ou merge nesta rodada. As migrations novas
foram executadas exclusivamente em PostgreSQL descartável.

## Contratos HTTP

Todos os corpos abaixo são JSON; Bearer continua no header Authorization.
Credenciais nunca são transportadas por URL, cookie ou localStorage.

### Login

`POST /api/auth/login` mantém `{ email, password }` e a normalização existente.
Contas inativas e credenciais incorretas mantêm resposta genérica. O limitador
atual de login permanece intacto. Sucesso:

```json
{
  "success": true,
  "data": {
    "token": "JWT_DE_ACESSO",
    "user": { "id": "UUID", "name": "Nome", "email": "email", "role": "EDITOR" },
    "refreshToken": "CREDENCIAL_OPACA",
    "sessionExpiresAt": "DATA_ISO_DO_PRAZO_ABSOLUTO"
  }
}
```

O JWT HS256 contém `sub`, `sid`, `tokenVersion`, `iat` e `exp`. Cada autenticação
confere assinatura/algoritmo, campos obrigatórios, conta ativa, versão e sessão
existente, não revogada e dentro do prazo. O papel usado na autorização continua
vindo do banco, não de uma claim de papel presumida.

### Renovação

`POST /api/auth/refresh` recebe somente `{ "refreshToken": "..." }`. Não exige
JWT, inclusive quando o acesso já expirou. Sucesso mantém o mesmo envelope do
login e o mesmo `sessionExpiresAt`, com novo par de credenciais.

Refresh tem 32 bytes de aleatoriedade criptográfica (256 bits), codificados em
base64url, e somente seu SHA-256 é persistido. A transação consome o hash antigo
e insere o novo. Os hashes consumidos ficam associados à sessão: sua reutilização
confirma a revogação de toda aquela sessão, inclusive tokens novos já emitidos.
Não há janela de tolerância para duplicar uma rotação. Dois clientes que usem
o mesmo refresh simultaneamente podem provocar essa revogação por reutilização.

O endpoint reutiliza a fábrica do limitador, com armazenamento independente por
IP e o teto `LOGIN_RATE_IP_MAX` na janela `LOGIN_RATE_WINDOW_MS`. Não incrementa
os contadores de login nem modifica seu limite por conta/IP. Como o limitador
anterior, é por processo; múltiplas réplicas exigem armazenamento compartilhado.

### Logout

`POST /api/auth/logout` recebe `{ "refreshToken": "..." }`, sem precisar de JWT
válido. Um refresh consumido também identifica a sessão para revogá-la.
Repetir o logout ou apresentar token desconhecido sintaticamente válido retorna
200 `{ "success": true, "message": "Sessão encerrada." }`. Corpo malformado
recebe 400. Não há enumeração de contas/sessões no resultado.

O frontend limpa suas credenciais antes da chamada remota. Em falha de rede,
continua deslogado localmente e informa que não confirmou o encerramento no
servidor. Uma sessão nova não é apagada por uma resposta atrasada desse logout.

As respostas com tokens usam `Cache-Control: no-store`. Valores brutos de JWT,
refresh e senha não são registrados nos logs do fluxo de autenticação.

## Expiração, concorrência e troca de senha

HTTP 401 mantém o envelope atual, com uma distinção exclusiva:
`error.code=ACCESS_TOKEN_EXPIRED` significa que assinatura/campos, usuário,
versão e sessão foram aceitos, mas o acesso expirou. Esse código é emitido no
middleware de autenticação **antes** dos handlers de negócio e de multipart.
Outros 401 não acionam renovação. Erro de banco permanece falha de servidor;
não é convertido em indicação de expiração.

Login, refresh, logout e troca de senha serializam mutações pelo mesmo bloqueio
de linha do usuário. A troca de senha mantém a comparação da senha atual e o
UPDATE condicional por hash/versão. Na mesma transação, grava o hash novo,
incrementa tokenVersion e revoga todas as sessões. Uma renovação concorrente
ou termina antes e é revogada depois, ou encontra a versão/sessão inválida.
Não há reativação de sessão nem retry automático de transação.

## Frontend e repetição de operações

O Axios e o AuthContext existentes foram adaptados; não há segundo cliente ou
interceptor duplicado. O sessionStorage contém token, refresh, prazo absoluto,
DTO do usuário e identificador local único por login. O prazo absoluto também
encerra a sessão por timer, com limpeza ao desmontar o provider.

Ao receber ACCESS_TOKEN_EXPIRED, o cliente faz uma única renovação por contexto
de execução e sessão. As requisições aguardam a mesma Promise, salvam o novo par
e repetem o corpo original **no máximo uma vez**. Uma resposta atrasada do mesmo
acesso reutiliza o par já renovado, sem uma segunda rotação. Escritas e FormData
só são repetidos diante daquele código específico, cuja origem garante que o
negócio ainda não executou. Não há retry por rede, timeout ou erro genérico.

Login/refresh/logout ficam fora do tratamento de renovação. Rejeição definitiva
do refresh (400/401/403) limpa a sessão e usa o aviso existente no login. Erro de
rede, 429 ou 5xx preserva a sessão local e é apresentado como indisponibilidade,
sem afirmar revogação. A sessão fica marcada com `renewalUncertain`: o mesmo
refresh não será reenviado automaticamente, pois a rotação pode ter ocorrido
antes de a resposta se perder. Para recuperar, sair e entrar novamente. Não há
repetição oculta ou tentativa de contornar o bloqueio de login.

Respostas antigas precisam coincidir com o identificador local da sessão antes
de modificar o storage. Logout durante refresh impede recriação da sessão.
Troca de senha usa esse identificador, preservando a confirmação mesmo quando
a própria requisição precisou renovar o acesso antes de salvar.

## Mensagem fixa de HTTP 429 no login

Retry-After continua aceitando segundos ou data HTTP. A mensagem é calculada
uma vez por resposta e não muda por segundo:

- Mais de um minuto: “Muitas tentativas de acesso. Tente novamente em
  aproximadamente X minutos.”, arredondando para cima.
- Até um minuto: “Muitas tentativas de acesso. Aguarde um instante e tente novamente.”
- Ausente/inválido: “Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.”

Com prazo válido, um timer interno remove o aviso e libera o botão ao final;
não envia login automaticamente. Sem prazo válido não se inventa bloqueio.
O e-mail permanece digitado. Timers são removidos ao desmontar. CORS continua
expondo Retry-After, sem ampliar origens permitidas. Classes, ícones, CSS e
mensagens de upload/validação foram preservados.

## Limitações

SessionStorage é legível por scripts da página. XSS pode roubar tanto acesso
quanto refresh; hash no banco e rotação não eliminam essa exposição. A detecção
de replay limita uma sessão comprometida quando houver reutilização, mas não
impede todo uso indevido antes dela. Não foram adicionados cookies ou HttpOnly.

O controle de Promise é por contexto JS. Uma aba duplicada pode copiar o
sessionStorage e apresentar o mesmo refresh; uma corrida entre esses contextos
é tratada como replay e exige novo login. Não há coordenação entre abas.

Os hashes consumidos são preservados para detecção. Ainda não há job automático
de retenção; a operação deve planejar limpeza somente após o fim das sessões,
sem apagar a evidência necessária de sessões ainda renováveis. Nenhuma limpeza
ou carga foi executada nesta tarefa.

## Validação reproduzível

```sh
# backend
npm run lint
npm test
npm run test:auth-seeds:postgres
# frontend
npm run lint
npm test -- --maxWorkers=2
npm run build
```

O validador usa cluster PostgreSQL próprio, banco novo por arquivo, credenciais
efêmeras e replay das duas trilhas, sem usar DATABASE_URL da aplicação. Testes
de renovação usam relógio controlado, sem esperar cinco minutos reais. Resultados
e limitações desta execução: [relatório](../reports/refresh-review.md).
