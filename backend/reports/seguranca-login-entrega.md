# Entrega de segurança do login — Memória Viva Guarulhos

Data: 10/11/2026. Trabalho local em `.tmp-target-portal`, branch `development/backend`.
HEAD local **e da branch remota**, conferido pelo conector GitHub:
`5cfe4a443dbdc0b054aefc8ffebd0ba09d0a1425` (a referência solicitada).
Alterações organizadas em três commits locais por etapa, sem push, publicação ou alterações nas telas. Os cinco relatórios
locais não rastreados que já existiam foram preservados.

Guia operacional e justificativas: [seguranca_login.md](../docs/seguranca_login.md).

## Etapa 1 — limite de falhas por conta

Arquivos de implementação:

- `src/config/authSecurity.js`: validação da configuração e HMAC por domínio.
- `src/services/loginAccountService.js`: admissão, revisões, espera e expiração no PostgreSQL.
- `src/middlewares/loginAccountLimiter.js`: integração com o contrato 429/Retry-After.
- `src/routes/authRoute.js` e `src/controllers/authController.js`: contador após validação,
  somente para autenticação real; normalização igual à do login.
- `prisma/schema.prisma` (modelo `LoginAccountLimit`) e
  `prisma/migrations/20261110120000_login_account_limits/migration.sql`.
- `backend/.env.example`, `.env.example` da raiz e `docker-compose.yml`: configuração.

Regras: HMAC do e-mail normalizado, independente de IP; lock transacional para chave ausente
e lock de linha; estado compartilhado e persistente; sucesso limpa somente falhas observadas
antes da admissão; falhas concorrentes posteriores são preservadas; geração UUID protege
expiração/recriação. Pedidos bloqueados não prolongam a espera nem a expiração. Nenhuma
consulta à existência da conta ocorre para decidir o limite.

Padrões: **5 falhas, 30 s iniciais, teto 900 s, contador expira em 24 h** após a última
conclusão admitida. Continuam os limites anteriores de 100/IP e 10/IP+e-mail por 15 min.
O Compose exige segredo HMAC privado estável de 32+ caracteres. Limpeza por minuto,
em lotes de até 1000. O formato 429 e `Retry-After` em segundos foram mantidos.

Testes: `test/authSecurity.integration.test.js` exercita mesma conta em IPs distintos,
contas distintas no mesmo IP, existentes/inexistentes, reinício real da API, concorrência
entre controles, teto, bloqueios sem extensão, sucesso concorrente, expiração e geração
antiga. Validado também com `portal_api` sem privilégios de DDL/superusuário.

Suporte aos testes anteriores: `test/loginSecurityFixture.js`,
`test/admin.test.js`, `test/adminManagement.test.js`, `test/authPassword.test.js`,
`test/authPassword.origem.test.js`, `test/logs.test.js`, `test/security.test.js`.
Esses testes simulam apenas a nova persistência; a implementação real é validada na integração.
`test/r1.test.js` recebeu os dois nomes novos na lista de migrations esperadas.

## Etapa 2 — proxy, origem e publicação

Arquivos: `infra/nginx.conf`, `frontend/nginx.conf`, `docker-compose.yml`, `.env.example`
da raiz, `scripts/validate-auth-proxy.js`, `test/fixtures/auth_security_proxy.js`.

O Compose efetivamente monta **`infra/nginx.conf`**; o outro arquivo é usado pelo build
da imagem frontend. Ambos ficaram idênticos. A publicação da porta do backend foi removida.

Padrões por IP efetivo: **login POST 30/min + burst 29; refresh POST 10/s + burst 100;
API geral 30/s + burst 150**. Retry-After 2/1/1 s, respectivamente, JSON compatível e
respostas sem cache. Preflight não consome as quotas de POST. As quotas e os contratos
especializados de feedback e métricas foram preservados.

Cadeia padrão: cliente → Nginx `172.30.87.2` → API `172.30.87.3`. Confiança somente no
proxy esperado; Nginx sobrescreve os cabeçalhos de IP/protocolo e remove `Forwarded`.
Sem confiança em um proxy externo por padrão. Configuração opcional documentada exige
IP/CIDR explícito nas duas regras, sobrescrita no salto externo e firewall correspondente.
Logs operacionais não incluem URI/query, IP, UA, senha, token, cookie ou headers arbitrários.

Testes com Nginx nativo 1.30.6 descartável e a API Express real:

- `nginx -t` aprovado para os dois arquivos e para a variante com salto confiável.
- Login: **40 de 70** requisições em rajada limitadas, mesmo alternando XFF forjado.
- Refresh: **79 de 180** limitadas na rodada registrada; as demais admitidas.
- API geral: rajada de 280 requisições produziu tanto 200 quanto 429.
- Contratos 429, JSON, Retry-After e IP/protocolo conferidos; XFF, X-Real-IP, XFP e
  `Forwarded` forjados não alteraram a origem da API nem evitaram a quota.
- Somente o peer externo explicitamente confiável preservou IP e HTTPS.
- `docker compose config --format json`: montagem correta e **backend sem `ports`**.

O script adapta apenas listener/upstream, diretórios e logs na cópia descartável.
Não alterou a configuração publicada para realizar o ensaio.

## Etapa 3 — histórico privado e aviso informativo

Arquivos: `src/services/loginAccessService.js`, `src/server.js`, integração no controller,
`prisma/schema.prisma` (modelo `LoginAccess`) e
`prisma/migrations/20261110130000_login_accesses/migration.sql`.
Configuração compartilhada com a etapa 1. Documentação neste relatório e no guia operacional.

Regras: após responder ao login, registra usuário, horário e HMACs de navegador/SO,
rede IPv4 /24 ou IPv6 /48 e região opcional. Não persiste IP/UA brutos ou credenciais.
O primeiro acesso retido vira referência. A suspeita exige **navegador/SO novo E
(rede nova OU região nova)**; rede nova sozinha não alerta. Localização ausente ou
indisponível não impede o registro nem o login.

Fila persistente com reserva serializada por usuário, lease, deduplicação e idempotência.
Consulta o e-mail cadastrado da própria conta para cada entrega. Um aviso pendente impede
acumular outros; o intervalo é renovado na confirmação do provedor. Falhas secundárias
são registradas com a lista positiva do logger e não impedem login.

Padrões: **envio desligado**, provedor HTTPS privado configurável, **24 h entre avisos**,
deduplicação de sinais por 24 h, histórico por **30 dias**. Um recibo confirmado perto
do fim da retenção pode permanecer somente até concluir o intervalo entre avisos.
Worker a cada 10 s, até 10 entregas por ciclo; lease 60 s; até 3 tentativas com 15 min
entre elas. Localização opcional: timeout 2 s; envio: 5 s. Sem dependência SMTP adicionada.

Testes: primeiro acesso, conhecido, mudança só de rede, suspeita, reserva concorrente,
destinatário cadastrado, cooldown, deduplicação, provedor indisponível, retry, lease
abandonada, limite de três tentativas, retenção/limpeza e resposta de login enquanto o
registro secundário permanece pendente e depois falha. Transporte de e-mail simulado;
nenhum e-mail real foi enviado. `test/authSecurityConfig.test.js` valida os padrões,
ativação explícita, segredo e relações entre espera/retenção/cooldown sem expor segredos.
Fixtures adicionais: `test/fixtures/auth_security_api.js` para reinício e
`test/authSecurity.integration.test.js` para as três etapas.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Backend `npm.cmd test`, PostgreSQL 17.11 descartável | **630 testes: 626 aprovados, 0 falhas, 4 ignorados** |
| Segurança focada, PostgreSQL 17.11 com `portal_api`, após revisão final do cooldown | **13 aprovados, 0 falhas** |
| Backend `npm.cmd run lint` | Aprovado |
| Prisma generate e validate | Aprovados |
| 14 migrations em banco novo, identidade `portal_migrator` | Aprovadas |
| `scripts/test-db.js integrity` no PostgreSQL 17 | Aprovado com ROLLBACK |
| Privilégios `portal_api` / `portal_migrator` | Teste existente aprovado no cluster descartável |
| Proxy real, dois arquivos + edge confiável + Compose resolvido | Aprovado |
| Front `AuthFlows.test.jsx` e `RefreshFlows.test.jsx` | **34 aprovados** |
| `git diff --check` | Aprovado |

Os 4 ignorados exigem provisionamento próprio: auditoria S3-A1, feedback F2, métricas V2
e operação de métricas. Não foram tratados como testes aprovados. Os contratos unitários/HTTP
desses módulos que não exigem esses perfis passaram na suíte.

Ambiente: Windows, Node 24.12.0, PostgreSQL 17.11 e Nginx 1.30.6 oficiais, executados em
diretórios descartáveis no workspace, sem instalação de serviço. O `node_modules` disponível
continha Prisma/client 7.10.0, embora o manifesto declare 7.10.1; dependências e lockfiles não
foram modificados. Repetir os checks após `npm ci` no runner da publicação.

Tentativa inicial em PostgreSQL 18.6: controles novos passaram, mas o teste de status exigia
17 e a integridade SQL tinha comportamento de SQLSTATE diferente. A validação final acima
foi refeita em **17**, sem afrouxar esses testes. A revisão automática inicialmente recusou
uma execução que poderia herdar banco não verificado; as rodadas finais usaram URL normal
sentinela em porta indisponível e URLs de teste explicitamente limitadas aos clusters novos.

Logs locais da validação (ignorados pelo Git): `auth-security-suite-final.log`,
`auth-security-focused-final.log`, `auth-security-proxy.log` neste diretório. O resultado
relevante permanece neste relatório, mesmo após remoção dos recursos descartáveis.
Os dois clusters foram encerrados e os diretórios de banco, binários baixados e proxies
descartáveis criados nesta tarefa foram removidos ao concluir a validação.

## Pendências na publicação

1. Aplicar as duas migrations com a identidade de migração e gerar Prisma no build.
   Definir `AUTH_SECURITY_SECRET` aleatório, estável e igual em todas as instâncias.
2. Conferir o Compose/overrides reais, firewall, ausência de porta pública da API e IPs
   de cada salto. Se houver terminador HTTPS externo, configurar somente esse peer confiável.
3. Repetir `nginx -t` e os ensaios no Nginx Linux/imagens reais do Compose. O daemon Docker
   estava indisponível aqui; o Compose foi resolvido, mas a stack Linux não foi iniciada.
4. Homologar um adaptador/provedor HTTPS de e-mail com remetente verificado, token privado
   e suporte a `Idempotency-Key`; só então habilitar avisos. Nenhum serviço externo foi ativado.
5. Configurar localização apenas se desejada, após avaliar o tratamento de IP pelo fornecedor.
6. Conferir limpeza e backlog da outbox, acompanhar logs seguros e calibrar quotas com tráfego
   real, principalmente redes compartilhadas. Reexecutar os perfis especializados ignorados.

O registro é informativo e de melhor esforço: uma queda imediatamente após a resposta e
antes de gravar o acesso pode perder esse registro. A outbox já persistida sobrevive a
reinícios. A confirmação 2xx do adaptador é a referência do intervalo de avisos; a entrega
final na caixa postal depende do provedor. Cookies, MFA e telas de sessões ficaram fora do escopo.
