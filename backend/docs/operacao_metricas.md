# Operação das métricas V2 — proposta pronta para homologação

Revisado na Fase 1.4C, 28/10/2026. Os scripts estão implementados e foram homologados em ambiente descartável, mas **nenhum agendamento ou coleta pública foi ativado**. Aplicação de migrations, privilégios, segredos e tarefas no ambiente final exige revisão e autorização próprias. V1 e favoritos locais continuam independentes.

## Destino, migration e papéis

O executor exige `METRICAS_OPERACAO_URL` e a confirmação explícita de host, porta, banco e cluster pelos campos `METRICAS_OPERACAO_HOST`, `METRICAS_OPERACAO_PORTA`, `METRICAS_OPERACAO_BANCO` e `METRICAS_OPERACAO_CLUSTER`. A conexão deve usar `portal_metricas_operador`; parâmetros extras de URL são recusados. Antes de escrever, lê `current_database()`, `current_user` e `pg_control_system()` em transação READ ONLY. Não existe fallback para `DATABASE_URL`. Credenciais não aparecem no log.

Preparar o papel operacional como LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION e NOBYPASSRLS, sem associação ao migrator. O administrador do cluster concede CONNECT no banco escolhido e EXECUTE em `pg_catalog.pg_control_system()`; o proprietário aplica [permissoes_metricas.sql](../scripts/sql/permissoes_metricas.sql). Senha aleatória e exclusiva fica no gerenciador de segredos, nunca neste arquivo. Não fornecer a credencial operacional ao processo servidor HTTP.

| Papel | Privilégios relevantes |
| --- | --- |
| `portal_migrator` | Proprietário das tabelas; CREATE no schema e no banco (a migration inicial contém CREATE SCHEMA); sem superuser/CREATEDB/CREATEROLE |
| `portal_api` | Recibos SELECT/INSERT; totais SELECT/INSERT/UPDATE; sondas e controles somente SELECT; sem DELETE nas métricas, sem acesso ao histórico Prisma nem DDL persistente |
| `portal_metricas_operador` | Recibos/totais SELECT/DELETE; sondas/checkpoints SELECT/INSERT/UPDATE/DELETE; sem UPDATE de totais, sem INSERT de recibos e sem acesso a usuários/conteúdo |

O bootstrap `infra/postgres/10-roles.sh` só roda em volume novo. Seu ajuste de CREATE no banco vale somente para o migrator. Não recriar volumes existentes para aplicar privilégios. Os default privileges antigos de CRUD da API permanecem para não quebrar o restante do portal; o SQL específico revoga o excesso **nas tabelas V2 e em `_prisma_migrations`**. Reavaliar/reaplicar esse escopo quando novas tabelas V2 forem criadas. Revisar memberships e grants efetivos, não apenas nomes de papéis.

`prisma.config.js` lê `DATABASE_URL`, não `MIGRATION_DATABASE_URL` diretamente. Na tarefa de migration, fornecer a URL do migrator como DATABASE_URL apenas ao processo Prisma. O processo normal da API mantém portal_api. A migration `20261027120000_add_operacao_metricas` acrescenta controles e selos; a migration V2 original e todas as anteriores são preservadas.

O Compose normal já possui `scripts/migrate-deploy.js`, que usa `prisma.migrate.config.js` e `MIGRATION_DATABASE_URL`, além de revogar acesso da API ao histórico Prisma. Esse fluxo não foi executado nem substituído; a orientação anterior refere-se ao CLI com a configuração padrão usado na validação isolada.

## Retenção e consistência

Executar `node scripts/reter_metricas.js` dentro de `backend/` ou `/app` no container. Nenhuma importação/seed é executada.

- Recibos: excluir dias **anteriores a hoje em São Paulo menos sete dias**. Preserva sete dias encerrados e o dia corrente. Exemplo: em 27/10, elimina até 19/10 e mantém desde 20/10. A tolerância do dia corrente é deliberada.
- Agregados e sondas: excluir dias anteriores à data civil de hoje menos 13 meses, ajustada ao último dia válido do mês. Em 31/03/2026, piso 28/02/2025. As sondas usam a meia-noite real de São Paulo convertida em UTC.
- Uma conexão dedicada mantém advisory lock `21400,1` durante a tarefa. Outra execução retorna `EM_EXECUCAO` sem limpar. O lock acaba com a sessão, inclusive após crash.
- Coleta usa lock compartilhado por dia (`21401,YYYYMMDD`); manutenção usa exclusivo. O fechamento do piso usa uma barreira curta `21402,1` e reconfere recibos recém-chegados. Preserva o FOR SHARE do patrimônio. Timeout de lock 200 ms evita espera prolongada; operações de manutenção têm statement timeout de 3 segundos.
- Antes da exclusão de cada dia vencido, comparar contagem de recibos por patrimônio com os totais, incluindo linhas presentes só de um lado. Divergência causa rollback e erro: **não corrigir o agregado nem continuar a purga**. Abrir investigação operacional.
- Um selo durável em `dias_metricas_conferidos` registra a conferência. Depois, remover no máximo 1.000 recibos por transação. Retomada usa o selo e não compara um agregado inteiro com recibos já parcialmente eliminados. Falha antes do commit desfaz selo e lote juntos.
- O piso `recibos_antes_de` só avança quando não restam recibos vencidos; selos cobertos pelo piso são removidos. Coleta recusa qualquer dia selado ou anterior ao piso, mesmo com uma chamada interna atrasada. O dia corrente não é fechado.
- Agregados e sondas são eliminados em lotes de até 1.000 de cada tabela. O piso `agregados_antes_de` avança junto ao primeiro lote: consultas não mostram fragmentos antigos durante uma purga interrompida. `ultima_retencao_em` só avança depois de concluir todas as etapas.
- Limite de 200 transações por execução. `PENDENTE` exige nova execução; pode haver commits anteriores válidos. Não é rollback global de toda a tarefa. Uma divergência impede qualquer exclusão daquele dia e as fases posteriores, sem desfazer dias anteriores já conferidos.

As garantias dependem de todas as versões de ingestão usarem os locks e controles novos. Antes de ativar, atualizar todas as réplicas; não misturar versões antigas que gravam sem esse protocolo. Nunca editar recibos, totais ou selos manualmente para contornar falha.

Os locks seguem as regras de [advisory locks do PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS). O operador não tem poder de criar visualizações fictícias nem de alterar os totais na reconciliação.

## Sonda e limites da cobertura

Executar `node scripts/observar_metricas.js` a cada cinco minutos. Exige `METRICAS_HEALTH_URL`, URL sem credenciais/query/fragmento, terminando exatamente em `/api/health`. Na implantação deverá passar pelo proxy efetivo, por exemplo `http://frontend/api/health` na rede Compose; isso **não certifica o TLS externo**. Configuração de coleta/chaves deve corresponder à da instância observada.

A sonda valida a configuração, faz GET health com timeout de 2 segundos e sem redirects e confere os privilégios de ingestão/leitura de portal_api no banco. Não chama sessão ou visualizações. Health é liveness, não uma transação de ingestão completa. Privilégios, conectividade e configuração observados não provam que cada requisição entre sondagens teve sucesso. Divergência de configuração entre réplicas precisa de controle operacional separado.

Grava uma linha por janela UTC de cinco minutos, com precedência FALHA > DESATIVADA > DISPONIVEL. Repetir não duplica nem apaga uma falha anterior. Se banco/conexão/identificação estiver indisponível, não é possível gravar FALHA: o executor retorna erro e a janela ausente é DESCONHECIDA na consulta. Não preencher sondas atrasadas como se tivessem ocorrido; após reinício registrar somente a janela atual.

`inicio_observacao` é o início das sondas, inclusive com coleta desativada. **Não é início da coleta ou audiência.** `inicioColeta` permanece null. `inicioDisponivel` é o piso aplicado pela retenção; null significa que nenhum corte foi registrado, não que exista cobertura histórica. Antes de instrumentação ou em dias fora da retenção não inferir zero visitas.

Extensão administrativa compatível: `meta.cobertura` admite `SONDAGEM_5_MIN`, além de `NAO_INSTRUMENTADA`; `meta.observacao` contém `inicioObservacao`, `inicioColeta`, `inicioDisponivel`, `ultimaRetencaoEm`, `resumo` e `porDia`. Contadores de janelas: esperadas, disponiveis, desativadas, falhas e desconhecidas. Apenas janelas encerradas entram no cálculo; dia corrente tem `parcial:true`. Estado diário: DISPONIVEL_NAS_SONDAS, PARCIAL, SEM_OBSERVACAO ou FORA_DA_RETENCAO. O calendário usa limites reais de São Paulo; um dia histórico de 23 horas tem 276 janelas, não 288.

Totais/ranking/série/regiões anteriores são preservados; filtros de patrimônio/região não alteram a cobertura operacional, que é do portal inteiro. As leituras permanecem no mesmo snapshot READ ONLY. A interface exibe tabela diária de cobertura separada dos eventos; não preenche a série com zeros nem apresenta sondas como visitantes.

## Agendamento proposto, não instalado

Recomendação: dois serviços oneshot e timers do systemd no host Linux, mantidos pelo responsável pela infraestrutura. Usar o container backend **já em execução**, nunca `docker compose up`, que pode iniciar o serviço migrate. O Dockerfile inclui `scripts/`; filesystem read_only funciona porque os scripts escrevem somente no PostgreSQL e stdout/stderr.

Comando conceitual de cada serviço, após confirmar nome do container e proteger o arquivo de ambiente operacional no host (modo 0600):

```sh
docker exec --env-file /etc/portal/metricas-operacao.env NOME_BACKEND node scripts/observar_metricas.js
docker exec --env-file /etc/portal/metricas-operacao.env NOME_BACKEND node scripts/reter_metricas.js
```

Os exemplos completos estão em [`infra/systemd/`](../../infra/systemd/): `portal-metricas-sonda.service/.timer` e `portal-metricas-retencao.service/.timer`. São arquivos para revisão, não unidades instaladas. Substituir `NOME_BACKEND` somente após conferir o container efetivo. Os serviços usam root no host para acessar Docker; esse acesso equivale a privilégio administrativo, mesmo que limitado a uma conta do grupo docker. Dentro do container, executam como `node`, em `/app`, com filesystem read_only preservado.

As unidades usam `LoadCredential` para ler um arquivo 0600 administrado fora do repositório e passar seu caminho temporário a `docker exec --env-file`. Senhas não entram no argv nem no processo HTTP já em execução. Preparar `/etc/portal/docker` como diretório de configuração Docker vazio e protegido. Não usar credenciais administrativas de registry nas tarefas locais. Usuários com acesso administrativo ao Docker ainda conseguem inspecionar processos/env; não tratar LoadCredential como proteção contra o administrador do host.

Cada exec contém `timeout` **dentro do container**: 20 s para sonda; 840 s, mais 10 s para término forçado, na retenção. O timeout externo do systemd é maior. Matar apenas o cliente `docker exec` não é garantia de encerrar seu processo remoto; o limite interno evita esse problema. Sonda não recupera horários perdidos (`Persistent=false`); retenção recupera uma execução perdida (`Persistent=true`). Não há Restart automático, Compose, início de container ou migrations nessas unidades.

`--env-file` afeta apenas o processo exec, conforme [Docker exec](https://docs.docker.com/reference/cli/docker/container/exec/); não adicionar segredos à linha de comando ou ao repositório. O arquivo deve manter as flags desligadas até autorização e configuração válidas. Restringir acesso ao socket Docker, que equivale a privilégio elevado no host.

- Sonda: calendário `*:0/5`, precisão de segundos; não disparar várias execuções retroativas ao retomar. Alertar após duas janelas encerradas ausentes ou qualquer FALHA persistente.
- Retenção: diariamente às 03:15 `America/Sao_Paulo`, com recuperação de execução perdida após boot (`Persistent=true` no timer). PENDENTE pode ser retomado por política limitada, sem loops rápidos. Falha de reconciliação exige intervenção, não retry cego.
- `EM_EXECUCAO`: outra sessão mantém o lock; investigar duração anormal. Logs JSON de CONCLUIDA/PENDENTE incluem cortes e quantidade de linhas eliminadas, sem conteúdo de recibos.
- Exit 0: execução normal (inclui DESATIVADA e EM_EXECUCAO); exit 2: PENDENTE/FALHA observada; exit 1: falha operacional/configuração/conexão. Monitorar estado do JSON além do exit code.
- Alertar se `ultima_retencao_em` estiver ausente após a primeira agenda ou atrasada mais de 24 horas. Journald/monitoramento precisa de rotação e destino persistente fora do container. Não enviar alertas usando dados de visitantes.
- Definir dono, canal de alerta, prazo de resposta e registro de último sucesso antes de habilitar. Não foi instalado timer, cron ou job neste trabalho.

## Reinício, backup e liberação

Manter ingestão e consulta desligadas durante restauração. Conferir destino/cluster, executar a trilha de migrations autorizada, reaplicar grants e executar retenção até CONCLUIDA. Recibos e checkpoints devem vir do **mesmo backup consistente**. Não restaurar apenas agregados/selos de datas diferentes. Se houver divergência, manter coleta desativada e investigar, sem apagar prova bruta. Reaplicar retenção também ao backup restaurado evita reexpor períodos expirados.

Não regenerar sondas do intervalo de indisponibilidade. Expiração de cookie e deduplicação diária continuam sendo validadas pela API; descartar cookies antigos e preservar a política de rotação das chaves. Rotação/expurgo de backups e segredos exigem política própria: o script não apaga backups nem altera arquivos de ambiente.

Antes da implantação: definir e homologar a terminação HTTPS real, calibrar limites em redes compartilhadas, medir o endpoint completo sob carga e confirmar papel operacional, alertas e tarefas no ambiente final; verificar leitores de tela e aparelhos reais. A 1.4C validou adesão até gráficos, indisponibilidade e planos SQL no descartável, conforme relatório. Nenhuma verificação isolada deste guia autoriza ativação pública.

## Proxy e limites preparados na 1.4B

`infra/nginx.conf` (montagem Compose) e `frontend/nginx.conf` (imagem sem montagem) agora têm as mesmas regras. O servidor versionado continua HTTP/80; **o responsável informou que a terminação HTTPS ainda não foi definida**. Não foram criados certificado de produção, listener 443 ou confiança em proxy externo. O ensaio isolado usa uma cópia com TLS e certificado temporário, não altera a configuração publicada.

- `/api/metricas/`: corpo máximo 2 KB, leitura do corpo 5 s, conexão upstream 2 s e envio/leitura upstream 5 s. `/api/` conserva 12 MB, incluindo uploads. Prefixos `^~` impedem que uma extensão de arquivo desvie o caminho da API para a regra de assets.
- Nginx sobrescreve XFF/X-Real-IP pelo peer efetivo, protocolo por `$scheme` e host por `$http_host` (preserva porta). Apaga `Forwarded`. Não usa `$proxy_add_x_forwarded_for` nem protocolo fornecido pelo visitante.
- No Compose, Express continua confiando **somente em 172.30.87.2**, o Nginx. Conexão direta ao backend não herda confiança. A coleta exige Host igual ao da origem configurada e `req.secure` coerente com o modo. HTTPS configurado sobre HTTP sem proxy confiável retorna 403, não emite credencial. Isso impede ativar acidentalmente uma cadeia TLS ainda indefinida.
- Desenvolvimento HTTP permanece somente em `http-local`, fora de NODE_ENV=production, com origem loopback e proxy Vite `changeOrigin:false`. Não alterar CORS global ou interceptadores JWT para contornar erro de origem/Host.
- Se TLS terminar no próprio Nginx, adicionar futuramente certificado/listener verificados e manter sobrescrita pelo `$scheme`. Se houver proxy anterior, identificar seus IPs, restringir acesso direto e revisar Real-IP/protocolo/limites **por esse peer**. Não aceitar XFF/XFP arbitrário, confiar em toda a rede ou fixar https para esconder uma cadeia incorreta.

| Camada | Política inicial |
| --- | --- |
| API, tentativa de nova emissão | 120/hora e 60/minuto por IPv4 ou prefixo IPv6 /64 |
| API, cookie válido reutilizado | Não consome nova emissão; assinatura, finalidade e dia precisam ser válidos |
| API, credencial validada | 30 chamadas/minuto, somando eventos e sessões reutilizadas |
| API, rede | 600 chamadas/minuto; capacidade total de 10 mil buckets, falha fechada |
| Nginx, peer | 10 requisições/s, burst 60 sem espera, até 20 conexões em processamento |
| Nginx, instância | 100 requisições/s, burst 120; memória compartilhada entre seus workers |

Requisições recusadas e retries também consomem quotas. Cookie inventado/adulterado/expirado não dispensa emissão; apagar cookie não contorna o limite por rede. Retirada da participação continua possível na API sem gastar quota de emissão; a borda limita qualquer rajada, inclusive DELETE. Todos os limites são proteções operacionais, não contadores de audiência.

A simulação de NAT cobriu quatro turmas de 30 participantes em uma hora, com reutilizações, seguida de bloqueio da 121ª tentativa nova. Bibliotecas maiores, NATs intensos e virada diária de cookies podem atingir o teto: definir tolerância com dados operacionais antes da ativação. A navegação e favoritos locais não dependem da coleta. Ampliar o limite antigo de 10 para 120 permite mais participantes e também aumenta o orçamento de abuso de um atacante na mesma rede; não há prova de humanidade.

Map da API é **local ao processo** e perde estado no reinício. Zonas Nginx são compartilhadas entre workers da mesma instância, não entre hosts. Antes de múltiplas réplicas, escolher limitação compartilhada. Um proxy TLS externo ainda não identificado também faria todos parecerem a mesma rede se a cadeia Real-IP não fosse configurada corretamente.

Respostas 429 da borda têm Retry-After: 1 e no-store; a API mantém Retry-After da sua janela. Logs de acesso do caminho de métricas guardam somente horário, status e duração, sem IP, URI, cookie ou JWT. Logs de erro do Nginx podem conter endereço/URI em falhas; sua retenção e tratamento precisam de revisão operacional própria.

## Volumes existentes e CI

O bootstrap corrigido e o novo `infra/postgres/20-metricas-role.sh` foram ensaiados num **volume novo de teste** por `compose.metricas.test.yml`. O segundo arquivo cria somente o operador, com senha obrigatória passada pelo ambiente, CONNECT e leitura de identidade do cluster. Grants das tabelas são aplicados pelo proprietário depois das 11 migrations. Esse script não foi montado no Compose normal.

Para um volume existente, não recriá-lo nem esperar que docker-entrypoint-initdb.d rode novamente. Em uma intervenção futura autorizada: conferir conexão/cluster/papéis e backup; o DBA concede `CREATE ON DATABASE <banco_confirmado> TO portal_migrator`, preservando a API sem CREATE; cria `portal_metricas_operador` sem superuser/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS ou membership privilegiado, define senha fora do histórico e concede CONNECT e EXECUTE em pg_control_system. O migrator executa a trilha aprovada e depois `scripts/sql/permissoes_metricas.sql`. Comparar grants efetivos e revalidar. Não aplicar essas instruções automaticamente neste trabalho.

O workflow de pré-deploy usa projeto/volume exclusivos por execução, quatro senhas efêmeras mascaradas e `scripts/validar_metricas_test.js`. O script identifica banco/porta/cluster/usuários e exclusividade, exige schema vazio e papéis já criados pelo bootstrap, executa deploy/repetição pelo migrator, confere 11 checksums sem tentativas revertidas, aplica grants e executa suíte completa e integridades. Qualquer falha interrompe; não existe reset, resolve ou reparo automático. A limpeza só alcança o projeto criado pela própria execução.

O CI também foi preparado para `systemd-analyze verify` sem instalação e `scripts/testar_proxy_metricas.js` com fixtures Docker. Esse ensaio não lê .env nem consulta PostgreSQL, publica somente loopback, verifica CA temporária dentro da rede dedicada e remove apenas seus containers/rede ao terminar. A execução no GitHub Actions e o comportamento dos timers no Linux final ainda precisam de confirmação autorizada; nenhum push foi realizado.

## Homologação integrada 1.4C

Evidências e limites estão no [relatório 1.4C](../reports/dashboard_v2_fase_1_4c.md). O navegador Chromium, Express e os três papéis SQL foram exercitados com PostgreSQL real **de teste**, incluindo HTTPS verificado, login ADMIN/EDITOR, coleta e gráficos. `systemd-analyze verify` passou em container Debian; isso não equivale à execução dos timers no host final.

O trilho opt-in é `backend/scripts/homologar_metricas.js`, executado da raiz com `HOMOLOGACAO_METRICAS_EXCLUSIVA=1`. Ele usa exclusivamente o projeto `portal_v214c_test`, porta loopback 5438 e `.cache/v214c/`, recusando preparação se já existir estado/volume. Não apaga nem reconstrói banco automaticamente. A imagem de navegador usa `backend/test/fixtures/Dockerfile.metricas` (Debian/Node 24); a imagem local usada nesta execução foi construída com `BASE=integration_backend_frontend-backend:latest`. Em outra máquina, informar `TEST_BACKEND_IMAGE` e `TEST_NGINX_IMAGE` compatíveis, já disponíveis.

Sequência para **uma nova homologação autorizada**, não para repetir sobre o volume preservado:

1. Construir a imagem `portal-v214c-navegador:test`; executar `preparar` para criar e identificar o descartável.
2. Executar `validar`: exige schema vazio, aplica/reexecuta as 11 migrations, confere checksums/grants e executa suíte backend/integridade.
3. Executar `fixtures` uma vez; depois `iniciar`, que gera CA/leaf de dois dias, build isolado com V2 habilitada somente no ensaio e containers próprios. A API recebe apenas a credencial da API; senhas de manutenção não entram no processo HTTP.
4. Executar `linux` e `navegador`. O último usa resposta e persistência reais, sem interceptação HTTP. `navegador-retomar`/`navegador-admin` são retomadas explícitas dos checkpoints de um e três eventos, respectivamente, para revisão de um ensaio interrompido; não são retries automáticos.
5. `navegador-bloqueado`, `falhas`, `operacao` e `banco-indisponivel` exercitam cenários adicionais. O último para e reinicia **somente** o container descartável identificado, sem reenviar a gravação recusada. `operacao` compara EXPLAIN em massa sintética terminada por ROLLBACK. `rebuild` atualiza apenas o build de ensaio.
6. `encerrar` remove somente Nginx/backend/rede E2E, preservando o PostgreSQL e seu volume de inspeção. Remoção/reconstrução desse volume exige decisão própria.

Os scripts de navegador e operação ficam em `backend/test/fixtures/` e não são rotas do servidor. Certificados são confiados apenas no HOME efêmero do container Chromium e em clientes Node explicitamente configurados com a CA. Não usar `--ignore-certificate-errors`, desabilitar TLS ou instalar a CA no host. Chromium roda headless sem sandbox **dentro do container de testes**, sem segredos reais; isso não é configuração de navegador para visitantes.

`.cache/v214c/` contém credenciais, perfis, cookies e chaves temporárias: não publicar essa pasta ou usá-la como contexto indiscriminado de build. As capturas e JSON sanitizados são evidência local, não um pacote pronto para upload. Defaults versionados continuam desligados. O CI remoto e a topologia TLS final continuam pendentes; o teste local não autoriza ativação.
