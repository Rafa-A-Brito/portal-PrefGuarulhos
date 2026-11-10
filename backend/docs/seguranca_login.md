# Segurança do login — entrega em três etapas

Base local: `development/backend`, HEAD `5cfe4a443dbdc0b054aefc8ffebd0ba09d0a1425`.
O remoto `origin` aponta para `Rafa-A-Brito/portal-PrefGuarulhos`.
As telas e os contratos de login, refresh e logout foram preservados.

## 1. Falhas por conta no PostgreSQL

Arquivos: `src/services/loginAccountService.js`, `src/middlewares/loginAccountLimiter.js`,
`src/config/authSecurity.js`, `src/routes/authRoute.js`, `src/controllers/authController.js`,
modelo `LoginAccountLimit` em `prisma/schema.prisma` e migration
`20261110120000_login_account_limits`. Configuração nos dois `.env.example` e no Compose.

O middleware executa depois da validação do corpo. O e-mail usa `trim().toLowerCase()`,
assim como o login, e vira HMAC-SHA256 com domínio `login-account`. O contador não guarda
e-mail, IP, senha ou tokens. Contas ativas, inativas e inexistentes percorrem o mesmo controle.
Continuam ativos os limites anteriores em memória: IP = 100 e IP + e-mail = 10 por 15 minutos.

| Variável | Padrão | Regra |
| --- | --- | --- |
| `LOGIN_ACCOUNT_FAILURES` | 5 | A quinta falha já retorna 429 |
| `LOGIN_ACCOUNT_WAIT_SECONDS` | 30 | Primeira espera, em segundos |
| `LOGIN_ACCOUNT_MAX_WAIT_SECONDS` | 900 | Teto; dobra a cada nova falha após a espera |
| `LOGIN_ACCOUNT_TTL_SECONDS` | 86400 | Expiração após a última conclusão admitida |
| `AUTH_SECURITY_SECRET` | obrigatório no Compose | Mesmo segredo privado, aleatório, com 32+ caracteres em todas as instâncias |

Fora do Compose, a ausência da chave usa `JWT_SECRET` com separação de domínios para
compatibilidade. Recomenda-se configurar uma chave exclusiva. Rotacioná-la muda as chaves
dos contadores e dos sinais: combinar a rotação entre instâncias, pois referências antigas
deixam de ser reconhecidas até expirar. Não publicar em `VITE_*`.

Um advisory lock transacional protege inclusive a criação de uma chave ausente. Um lock
da linha evita corrida com a limpeza. O relógio usado em produção é o do PostgreSQL.
Falhas recebem revisões crescentes **na conclusão**. Cada login guarda a revisão observada
na admissão; um sucesso limpa apenas esse prefixo, por um marcador monotônico. Falhas que
terminaram depois da admissão permanecem. Dois sucessos não subtraem o mesmo prefixo duas
vezes. Uma geração UUID impede que conclusões antigas alterem um contador expirado e recriado.

Requisições bloqueadas não atualizam contador, expiração ou fim da espera. Falhas admitidas
antes de um bloqueio contam, mas não prolongam uma espera em curso. O estado é compartilhado
por todas as instâncias e não depende do processo Node. `429`, `Retry-After` inteiro em segundos,
`success:false`, `message` e `error.code=TOO_MANY_REQUESTS` mantêm a mensagem atual do cliente.
Indisponibilidade do banco impede autenticação: o controle não libera tentativas silenciosamente.

## 2. Nginx e cadeia de confiança

Arquivos: `infra/nginx.conf`, `frontend/nginx.conf`, `docker-compose.yml`, `.env.example`,
`scripts/validate-auth-proxy.js` e fixture privada `test/fixtures/auth_security_proxy.js`.

O Compose monta **`infra/nginx.conf`** em `/etc/nginx/conf.d/default.conf`.
O Dockerfile do frontend copia `frontend/nginx.conf`; ambos permanecem iguais.

| Grupo | Taxa por endereço de origem | Burst | Retry-After |
| --- | --- | --- | --- |
| POST login | 30/minuto | 29 | 2 s |
| POST refresh | 10/segundo | 100 | 1 s |
| API geral | 30/segundo | 150 | 1 s |

As quotas específicas só contabilizam POST. Há margem para preflight, navegação com várias
consultas, compartilhamento de rede e renovações simultâneas. As quotas de feedback
(5/min/rede, 60/min total, bursts 4/10, conexões 5, Retry-After 60) e métricas
(10/s/rede, 100/s total, bursts 60/120, conexões 20, Retry-After 1) não foram alteradas.
Os locais especializados preservam seus contratos; a quota geral cobre o restante da API.
As respostas do proxy usam JSON compatível, 429 e `Cache-Control: no-store`.

Cadeia padrão: cliente → Nginx `172.30.87.2` → API `172.30.87.3:3333`.
O Express confia apenas no IP do Nginx. O Nginx não confia, por padrão, em nenhum salto
anterior: sobrescreve `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`,
`X-Forwarded-Host` e remove `Forwarded`. Os logs usam somente horário, status e duração,
sem URI/query, IP, UA, credenciais ou headers arbitrários. Os logs especializados continuam ativos.

O Compose não publica mais a porta do backend, nem em loopback. `expose` permite comunicação
interna; não abre porta no host. Isso não protege contra um host Docker comprometido ou outro
container privilegiado. O frontend continua publicado em loopback, compatível com um proxy
HTTPS no host. Não expor diretamente a API em configurações de override/publicação.

### Se existir um terminador HTTPS externo

Não presumir o endereço desse salto. Antes de publicar, identificar o IP/CIDR que **o Nginx
realmente vê**, incluindo tradução de endereço da rede Docker. Nas duas configurações:

1. Configurar `set_real_ip_from IP_EXATO/32;` (ou CIDR restrito).
2. Adicionar esse mesmo endereço com valor `1` no bloco `geo $realip_remote_addr $trusted_edge`.
3. No salto externo, sobrescrever XFF com o endereço do cliente e XFP com o protocolo efetivo.
4. Restringir via firewall o acesso ao listener que confia nesse salto.

Só peers confiáveis alteram o IP efetivo e podem fornecer `http`/`https`; valores compostos
ou inválidos de XFP caem no protocolo local. `real_ip_recursive on` escolhe o último endereço
não confiável. Nunca usar confiança global `0.0.0.0/0`, quantidade genérica de saltos ou
endereços de toda a rede Docker. Ver [Real IP](https://nginx.org/en/docs/http/ngx_http_realip_module.html)
e [limites de requisição](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html).

## 3. Histórico privado e avisos informativos

Arquivos: `src/services/loginAccessService.js`, `src/server.js`, integração no controller,
modelo `LoginAccess` e migration `20261110130000_login_accesses`.

Após enviar a resposta de login, a API agenda o registro em tarefa independente. Não captura
corpo da requisição nem credenciais. Guarda usuário, horário e HMACs dos seguintes sinais:

- Família de navegador + sistema operacional, sem versões e sem UA bruto.
- Rede aproximada: IPv4 /24 ou IPv6 /48, sem IP bruto no banco.
- Região aproximada, somente se existir provedor configurado e retornar um código válido.

O primeiro registro ainda retido vira referência e nunca alerta. A suspeita exige **navegador/SO
novo E (rede nova OU região nova)** em relação ao histórico retido. Rede nova sozinha não
alerta. Um primeiro dado de localização não conta como mudança de região. Sinais ausentes
não são interpretados como novidade. Essas heurísticas são aproximadas e podem ser forjadas;
não bloqueiam login, não substituem MFA e não comprovam comprometimento.

| Configuração/operação | Padrão |
| --- | --- |
| `AUTH_ACCESS_RETENTION_DAYS` | 30 dias, inclusive avisos e referências |
| `AUTH_ALERT_ENABLED` | `false`; ativação exige URL HTTPS e token do provedor |
| `AUTH_ALERT_COOLDOWN_SECONDS` | 86400, intervalo mínimo global por usuário |
| Deduplicação da combinação de sinais | 24 horas |
| Worker | a cada 10 s, até 10 entregas por ciclo, um ciclo por processo |
| Lease de entrega | 60 s, recuperável após reinício |
| Falhas de envio | até 3 tentativas; 15 min entre tentativas |
| Limpeza | a cada minuto; até 1000 expirados de cada tabela por ciclo |

A configuração recusa retenção menor que o cooldown, segredo fraco, teto menor que a
espera inicial e habilitação de e-mail sem provedor completo.

A referência, a decisão de suspeita e a reserva do aviso são serializadas com lock de usuário.
A existência de uma entrega pendente impede acumular outros avisos da mesma conta,
mesmo após passar o intervalo da reserva. Na confirmação do envio, o intervalo é contado
novamente a partir da entrega efetiva. O recibo pode ser mantido além dos 30 dias do login
somente até terminar esse intervalo (24 h por padrão), para não perder a deduplicação.
A outbox fica na tabela privada `login_accesses`. A reserva impede avisos simultâneos em
instâncias diferentes; `FOR UPDATE SKIP LOCKED` e uma lease UUID coordenam entregas. O serviço
consulta o e-mail do usuário cadastrado ao buscar a entrega. Não aceita destinatário do login,
de headers ou de outros usuários. Nenhuma rota pública expõe esse histórico.

O e-mail contém somente o nome do portal, horário e explicação genérica dos sinais. Não inclui
senha, token, cookie, IP, UA ou hashes. Logs de falhas usam o logger existente com lista positiva;
mensagens, stack e respostas dos provedores não são registradas.

### Contratos opcionais dos provedores

`AUTH_ALERT_URL` deve apontar para um adaptador/provedor privado HTTPS:

```text
POST AUTH_ALERT_URL
Authorization: Bearer AUTH_ALERT_TOKEN
Idempotency-Key: UUID do registro de acesso
Content-Type: application/json
{ "to": "email cadastrado", "subject": "...", "text": "..." }
```

Resposta 2xx confirma envio/aceitação. O provedor deve respeitar `Idempotency-Key`: uma queda
entre aceitação e confirmação no banco exige reentrega com a mesma chave. Sem suporte do
provedor, não se garante envio exatamente uma vez. Timeout de 5 s; redirects são recusados.
Não foi adicionada dependência SMTP nem contratado provedor. Configure o adaptador, teste a
entrega e só então habilite `AUTH_ALERT_ENABLED=true` no processo/Compose. O provider deve usar
um remetente verificado próprio do portal. Registros feitos enquanto desligado não são reenviados.

`AUTH_LOCATION_URL`, se usado, recebe `POST {"ip":"origem efetiva"}` e devolve
`{"regionCode":"BR-SP"}` (código de 2–32 caracteres A–Z, 0–9 e hífen). Timeout de 2 s,
sem redirects. Só esse provedor configurado recebe o IP bruto. Avaliar retenção/privacidade
do fornecedor antes de ativar. Ausência, erro ou resposta inválida resulta em região ausente.

O registro é informativo e de melhor esforço: falhas de registro/localização/envio não mudam
uma resposta de login já enviada. Existe uma pequena janela de perda do registro se o processo
cair entre a resposta e a persistência assíncrona; a outbox já persistida sobrevive ao reinício.
Monitorar `LOGIN_ACCESS_RECORD_FAILED`, `LOGIN_LOCATION_FAILED`,
`LOGIN_ALERT_DELIVERY_FAILED` e `LOGIN_ACCESS_WORKER_FAILED`, e a fila `failed`, sem exportar
dados pessoais. Manter pelo menos uma API/worker ativa para cumprir a limpeza; verificar backlog
na publicação. Os limites existentes por IP continuam locais a cada processo; o novo limite
por conta e a outbox são compartilhados pelo banco.

## Validação e reprodução

`test/authSecurity.integration.test.js` exige `TEST_DATABASE_EXCLUSIVE=1`, banco `_test`
em loopback/db_test e destino diferente de `DATABASE_URL`. Testa IPs distintos para a mesma
conta, contas distintas no mesmo IP, existentes/inexistentes, reinício real do processo da API,
concorrência, teto, expiração, geração antiga, sucesso concorrente, resposta independente do
registro, primeiro acesso, conhecido, suspeito, deduplicação, cooldown, localização ausente/
indisponível, transporte simulado indisponível, reentrega e limpeza.
Também verifica recuperação de uma lease abandonada e o limite de três tentativas.
`test/authSecurityConfig.test.js` valida os padrões, a ativação explícita e a ausência
de segredos nas mensagens de erro de configuração.

Os testes HTTP unitários anteriores receberam `test/loginSecurityFixture.js` para simular
somente a persistência nova; seus contratos anteriores continuam exercitados. `test/r1.test.js`
inclui as duas migrations novas na lista esperada sem mudar a validação das migrations antigas.

```powershell
# Destinos exclusivos de teste; nunca usar a URL do banco publicado.
$env:MOCK_DATA='false'
$env:DATABASE_URL='postgresql://unused:unused@127.0.0.1:1/normal_unavailable'
$env:TEST_DATABASE_URL='postgresql://USUARIO:SENHA@127.0.0.1:PORTA/portal_test'
$env:TEST_DATABASE_EXCLUSIVE='1'
$env:JWT_SECRET='SEGREDO_ALEATORIO_EXCLUSIVO_DE_TESTE_COM_32_CARACTERES'
node scripts/test-db.js migrate
node --test test/authSecurity.integration.test.js
$env:TEST_NGINX_BIN='CAMINHO_DO_BINARIO_OFICIAL_NGINX'
node scripts/validate-auth-proxy.js
npm.cmd run lint
npm.cmd run prisma:validate
npm.cmd test
```

O ensaio de proxy cria uma configuração temporária derivada de cada arquivo real, altera
somente listener, upstream, diretórios/logs e, no caso de confiança externa, o peer de teste.
Usa a API Express real com endpoint de contexto exclusivo da fixture; verifica `nginx -t`,
429/Retry-After/JSON, XFF forjado, protocolo, quotas e `docker compose config` sem porta de API.
O relatório `reports/seguranca-login-entrega.md` registra versões e resultados desta execução.

Antes de publicar: conferir HEAD remoto e overrides; aplicar migrations pela identidade de
migração; gerar cliente Prisma; definir segredo compartilhado; confirmar cadeia HTTPS real,
firewall e portas; repetir integração com a imagem PostgreSQL 17 e Nginx Linux do Compose;
configurar e homologar e-mail/localização se desejados; acompanhar limpeza e ajustar quotas
com tráfego real. Não habilitar avisos só por haver variáveis de ambiente preenchidas.
