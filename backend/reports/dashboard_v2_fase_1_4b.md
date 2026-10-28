# Dashboard V2 — Fase 1.4B: infraestrutura e segurança operacional

Data: **27/10/2026**, America/Sao_Paulo. HEAD de referência: `b06435e`; árvore inicialmente limpa. Referências: [arquitetura](../docs/dashboard_v2_1_arquitetura_metricas.md), relatórios [1.1](dashboard_v2_fase_1_1.md), [1.2](dashboard_v2_fase_1_2.md), [1.3](dashboard_v2_fase_1_3.md), [1.4A](dashboard_v2_fase_1_4a.md) e [guia operacional atualizado](../docs/operacao_metricas.md).

**Entrega para revisão, sem ativação pública.** Foram preparados proxy e limites específicos, diferenciação entre emissão e reutilização de credencial, exemplos systemd e CI com bootstrap real em volume novo. A aplicação normal não foi iniciada; flags de coleta/consulta permanecem desligadas por padrão. Não houve acesso ao banco real, instalação de agendamentos, alteração de migrations históricas, commit, push ou deploy.

## 1. Arquivos alterados

| Arquivo | Alteração |
| --- | --- |
| `infra/nginx.conf`; `frontend/nginx.conf` | Configurações alinhadas: limites exclusivos de métricas, sobrescrita de headers, host com porta e resposta 429 |
| `backend/src/middlewares/limiteMetricas.js` | Quotas separadas de emissão/reutilização; proteção de rajadas, credencial e rede |
| `backend/src/routes/metricasRoute.js` | Validação de cookie antes do limitador; coerência de Host e transporte com a origem/modo configurados |
| `backend/src/docs/pathsMetricas.js` | Documentação do contrato e limites novos |
| `infra/postgres/20-metricas-role.sh` | Bootstrap explícito do papel operacional em volume novo; senha externa obrigatória |
| `compose.metricas.test.yml` | Compose autônomo com somente PostgreSQL e volume de teste; monta os dois scripts de bootstrap |
| `backend/scripts/validar_metricas_test.js` | Identificação do descartável, deploy/repetição pelo migrator, checksums, grants, suíte e integridade |
| `backend/scripts/testar_proxy_metricas.js` | Ensaio Docker de Nginx/TLS, certificado temporário e limpeza dos próprios containers/rede |
| `backend/test/fixtures/proxy_metricas.js`; `validar_proxy_metricas.js` | Backend sem persistência e cliente de verificação dentro da rede de teste |
| `backend/test/limiteMetricas.test.js`; `metricasHttp.test.js` | NAT, quotas, assinatura, HTTP local e regressão de contratos |
| `backend/test/publishPatrimonios14.integration.test.js` | Corrige expectativa antiga de ausência de auditoria; exige 14 eventos corretos, rollback e limpeza das próprias fixtures |
| `infra/systemd/portal-metricas-sonda.service/.timer`; `portal-metricas-retencao.service/.timer` | Exemplos de execução e agendamento, sem instalação |
| `.github/workflows/predeploy.yml` | Volume/projeto efêmeros, quatro senhas, bootstrap, testes V2 habilitados e verificações de proxy/systemd |
| `backend/docs/operacao_metricas.md`; este relatório | Operação, privilégios em volumes existentes, evidências e limites |

Sem alterações em `docker-compose.yml`, CORS global, `TRUST_PROXY_IPS` de produção, autenticação, interceptadores JWT, schema Prisma, migrations, Dashboard V1, favoritos locais ou manifests/locks. Nenhum pacote foi adicionado. O bootstrap `10-roles.sh` corrigido na 1.4A foi **executado e testado**, sem nova edição nesta etapa.

## 2. Proxy, HTTPS e limites

### Cadeia conhecida e limite da homologação

No Compose atual, `infra/nginx.conf` é montado no frontend. Sem essa montagem, a imagem usa `frontend/nginx.conf`; ambos agora possuem as mesmas regras, desconsiderando EOL. O Nginx publica HTTP/80 em loopback e encaminha ao backend pela rede proxy; Express confia exclusivamente no peer **172.30.87.2**. A porta direta do backend também é publicada apenas em loopback.

O responsável confirmou nesta etapa que **a terminação HTTPS ainda não foi definida**. Portanto, não foi inventada uma cadeia externa, instalado certificado de produção ou adicionado listener 443 à configuração efetiva. O ensaio usou cópias temporárias com TLS e IPs próprios da rede de teste. Ele valida as regras locais, não o domínio/certificado/ingress final.

As duas configurações sobrescrevem X-Forwarded-For e X-Real-IP com o peer efetivo, X-Forwarded-Proto com `$scheme` e Host/X-Forwarded-Host com `$http_host`, preservando a porta. `Forwarded` é removido. A imagem deixou de usar `$proxy_add_x_forwarded_for`, que conservava conteúdo fornecido pelo cliente. O desenho segue a exigência de coerência entre proxy e allowlist do [Express](https://expressjs.com/en/guide/behind-proxies/).

A coleta habilitada exige Host igual ao host da origem configurada e `req.secure` compatível com o modo. Pedido HTTP direto com X-Forwarded-Proto forjado não obtém cookie HTTPS. Com um terminador TLS externo ainda não configurado, `$scheme` será HTTP e a coleta será recusada: a solução futura será configurar a cadeia verificada, não aceitar headers arbitrários ou forçar https.

HTTP local continua permitido somente em `http-local`, fora de produção e com origem loopback. O proxy Vite existente preserva Host (`changeOrigin:false`). CORS e sessão administrativa não foram alterados. A retirada de participação continua disponível com coleta desligada, conforme o contrato anterior.

### Política preparada

| Camada / caminho | Limite ou comportamento |
| --- | --- |
| Nginx `/api/metricas/` | Corpo máximo **2 KB**, inclusive chunked; timeout de corpo 5 s |
| Nginx upstream de métricas | Conexão 2 s; envio/leitura 5 s |
| Nginx por peer | **10 requisições/s**, burst 60 sem espera; até 20 conexões em processamento |
| Nginx por instância | **100 requisições/s**, burst 120 |
| Nginx `/api/` restante | **12 MB preservados**, incluindo uploads |
| API: tentativa de emissão nova | **120/hora e 60/minuto** por IPv4 ou prefixo IPv6 /64 |
| API: reutilização de cookie válido | Não consome a quota de emissão; assinatura e dia são validados antes de dispensá-la |
| API: credencial válida | **30 chamadas/minuto**, somando sessões reutilizadas e eventos |
| API: rede | **600 chamadas/minuto**, incluindo tentativas recusadas |
| API: memória | Até 10 mil buckets; esgotamento falha fechado; expiração em até uma hora |

Os prefixos `^~` impedem que as rotas de API sejam desviadas pela regra de assets. `/api/metricas` sem subcaminho retorna 404/no-store. A borda devolve 429 com `Retry-After: 1` e no-store; a API preserva Retry-After calculado pela sua janela. Zonas Nginx são compartilhadas entre workers da mesma instância, conforme [documentação do limitador](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html), mas não constituem limitação entre hosts.

O teste de NAT passou com **quatro turmas de 30 participantes por hora**, com reutilizações, e bloqueou a 121ª tentativa nova. A reutilização válida permaneceu possível após esgotar emissão. Cookie inventado, adulterado ou expirado não dispensa criação. Também foram validados teto de rajada, credencial, cardinalidade e equivalência de endereços de um mesmo /64.

**Tradeoff explícito:** o aumento de 10 para 120 tentativas/hora atende mais participantes e amplia o orçamento de abuso de uma origem de rede. Ainda pode limitar bibliotecas/escolas maiores ou muitas renovações na virada do dia. Não identifica pessoas, impede todos os bots ou garante audiência humana. Os Maps continuam locais ao processo e zeram ao reiniciar; a proteção distribuída permanece pendente antes de múltiplas réplicas.

Logs de acesso do caminho de métricas registram apenas horário, status e duração. Não incluem IP, URI, cookie, JWT ou corpo. Logs de erro do Nginx ainda podem conter endereço/URI em falhas; sua retenção e tratamento precisam de revisão operacional.

## 3. Bootstrap limpo e privilégios

Foi criado o projeto **`portal_v214b_20261027`**, com volume novo **`portal_v214b_20261027_pg_test`**, exclusivamente por `compose.metricas.test.yml`. Antes da criação, foram conferidas ausência do volume/container; após início, porta loopback, nome do volume e montagem readonly dos dois scripts. Não foram reutilizados os clusters das portas 5434, 5435 ou 5436.

| Identificação | Resultado |
| --- | --- |
| Endpoint | **127.0.0.1:5437/portal_test** |
| PostgreSQL | **17.11** |
| Cluster | **7701408606583320610** |
| Bootstrap | `portal_test`, somente no volume novo de teste |
| Schema antes das migrations | Zero tabelas públicas; zero outras sessões no banco |
| Executor das migrations | `portal_migrator`, identidade e CREATE no banco conferidos em READ ONLY |
| Histórico final Prisma | **11 registros, 11 concluídos, zero recuperações/rolled-back** |
| Reexecução de deploy | Nenhuma migration pendente |
| Checksums | Iguais aos 11 arquivos locais |

O entrypoint executou o `10-roles.sh` corrigido, incluindo CREATE no banco para o migrator, e o novo `20-metricas-role.sh`. As 11 migrations foram aplicadas **desde o schema vazio na primeira tentativa**, sem SQL manual para substituir migrations, `resolve`, reset ou recuperação. Depois, o proprietário aplicou o SQL de privilégios específicos das métricas.

| Papel | Evidência |
| --- | --- |
| `portal_migrator` | CREATE no banco/schema, proprietário das tabelas; sem superuser/CREATEDB/CREATEROLE |
| `portal_api` | Sem CREATE no banco/schema e sem membership privilegiado; ingestão/consulta e CRUD existente aprovados; DELETE das métricas e escrita de controles/sondas recusados |
| `portal_metricas_operador` | Sem CREATE no banco/schema e sem membership privilegiado; retenção/sonda autorizadas; acesso a users, INSERT de recibos e UPDATE de totais recusados |

Todas as identidades/papéis foram testados no descartável. A conferência final encontrou zero recibos e agregados de visualizações restantes. O volume de teste permanece para inspeção; contém somente fixtures de testes, nunca dados reais.

### Volumes existentes

O guia descreve uma intervenção futura separada: identificar conexão/cluster e backup; DBA conceder CREATE no banco confirmado somente ao migrator; preparar operador com senha fora de arquivos/histórico e privilégios de conexão/identidade; executar a trilha aprovada pelo migrator e reaplicar os grants específicos. Não recriar o volume nem esperar execução automática de entrypoint em volume existente. Nenhuma dessas operações ocorreu no banco real. O script `20-metricas-role.sh` não foi montado no Compose normal.

As duas divergências preexistentes de ON UPDATE das FKs de `auth_sessions` e `refresh_tokens`, documentadas na 1.4A, permanecem para revisão própria. Não foram corrigidas, e nenhum arquivo de migration ou schema foi alterado.

## 4. Operação e agendamento

Foram preparados quatro arquivos systemd em [`infra/systemd/`](../../infra/systemd/), com nome de container deliberadamente pendente (`NOME_BACKEND`). Nenhum serviço/timer foi instalado ou habilitado.

- Sonda: a cada cinco minutos em UTC, precisão de 1 s, `Persistent=false`, sem reconstrução de horários perdidos.
- Retenção: diariamente às **03:15 America/Sao_Paulo**, `Persistent=true`, recuperação de uma execução perdida após reinício.
- Serviços oneshot, sem Restart automático, sem Compose e sem migrations. Docker exec falha se o container não estiver em execução; não o inicia.
- Root no host acessa o socket Docker; esse acesso é privilegiado. Dentro do container, `--user node --workdir /app`, com filesystem read_only preservado.
- `LoadCredential` recebe o arquivo operacional externo 0600; `--env-file` entrega segredos somente ao processo exec. Senhas não aparecem nos argumentos ou arquivos versionados. A API não recebe a credencial operacional.
- Timeout dentro do container: 20 s para sonda e 840 s para retenção, com término forçado após margem; timeout systemd maior. Isso evita depender de matar apenas o cliente Docker, o que não garante encerrar o processo remoto.
- Saída para journald, com identificadores próprios; diretório de configuração Docker separado e protegido. Definir rotação/monitoramento antes de instalar.

| Resultado | Tratamento proposto |
| --- | --- |
| CONCLUIDA | Exit 0; registrar sucesso e conferir último horário |
| PENDENTE | Exit 2; lotes confirmados permanecem válidos; retomar em execução controlada, sem loop rápido |
| EM_EXECUCAO | Exit 0 e registro de sobreposição; investigar duração/repetição anormal, sem iniciar outra limpeza |
| FALHA observada | Exit 2; investigar health/configuração/permissões; não gravar eventos sintéticos |
| Erro de conexão/configuração/consistência | Exit 1; janela pode ficar sem observação; não reparar ou repetir escrita falha automaticamente |
| DESATIVADA | Exit 0; estado operacional esperado enquanto a coleta estiver desligada |

Alertas propostos: duas janelas encerradas sem sonda; FALHA recorrente; primeira retenção não executada; último sucesso atrasado mais de 24 h; PENDENTE persistente ou sobreposição prolongada. Definir responsável e canal de resposta. O guia mantém regras de restauração consistente, revalidação de destino e retenção antes de reabrir coleta; nenhum backup foi restaurado.

Os exemplos seguem as semânticas de calendário e persistência do [systemd.timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html). Neste Windows houve verificação estática dos arquivos; `systemd-analyze verify` está preparado no CI Linux, mas ainda não foi executado no host de implantação.

## 5. CI e evidências de testes

O workflow conserva os testes V1/segurança, permissões `contents: read`, pins existentes e job frontend. O job backend passa a criar projeto/volume exclusivos por run/attempt, recusa nomes já existentes, mascara quatro senhas distintas, usa bootstrap real, deploy pelo migrator, comparação de checksums, grants V2, variáveis de cluster para habilitar integrações e integridade adicional. A limpeza só é habilitada depois de identificar que o recurso será criado pela própria execução.

Também foram preparados testes de Nginx/TLS em containers e verificação systemd. Não houve push ou execução remota: resolução das imagens, disponibilidade do runner Linux, pins, `systemd-analyze`, tempos e execução integral do YAML ainda precisam ser confirmados no GitHub Actions. Os testes locais equivalentes não certificam essa execução remota.

### Resultados locais

| Verificação | Resultado |
| --- | --- |
| Bootstrap real + migrate deploy + repetição | **11/11 desde estado vazio, sem recuperação manual** |
| Backend completo, Node 24.22.1 | **560 aprovados, 0 falhas, 0 ignorados** |
| Testes finais de quotas, cookies, flags e HTTP | **7 aprovados** |
| Frontend relevante, dois workers | **55 aprovados em 6 arquivos**: V1/V2, cliente público, participação, coleta e hook |
| Lint backend | Aprovado, incluindo scripts e fixtures novos |
| Integridade SQL original e V2 | Aprovadas no descartável; ROLLBACK, sendo a adicional READ ONLY |
| `nginx -t`, configuração Compose e configuração da imagem | Ambas aprovadas, Nginx 1.31.6 no ensaio |
| TLS com CA temporária | Verificado sem desativar validação ou instalar confiança global |
| Spoofing | XFF/XFP/XFH/Forwarded não preservam valores do visitante; HTTP direto não obtém cookie seguro |
| Cookies HTTPS | Prefixo `__Host-`, Secure, HttpOnly, SameSite=Lax, Path=/, sem Domain; reutilização mantém o token |
| HTTP local / produção | Cookie local sem Secure/prefixo Host; modo http-local rejeitado em produção |
| Origem/Host/cross-site | Pedidos inválidos recusados com 403 |
| Corpo e uploads | Métricas acima de 2 KB recusadas, inclusive chunked; upload sintético de 2 MB aceito e 13 MB recusado, preservando 12 MB |
| Borda sob rajada | 160 pedidos: **99 e 103 respostas 429**, respectivamente nas duas configurações; Retry-After/no-store presentes; health continua disponível |
| Indisponibilidade | 503/Retry-After preservado; cookies inválidos retornam 401; inicialização da aplicação real com flags desligadas passa sem SQL V2 |
| Workflow/Compose | YAML e JavaScript inline validados; isolamento e flags conferidos |
| Diff | `git diff --check` aprovado; apenas avisos de normalização EOL |

O backend da fixture TLS usa o roteador real com persistência substituída por função em memória; habilitação existe somente nessa fixture isolada. Não monta `.env`, recebe URL sentinela inacessível e não se conecta a PostgreSQL. Os clientes de teste conferem certificados dentro da rede Docker dedicada; containers e rede do ensaio são removidos ao terminar, sem remover os bancos de inspeção.

No Windows, o AVG substituiu o certificado de loopback por um certificado de seu Web/Mail Shield, confirmado por emissor e impressão digital distintos. **Não foi desabilitado o antivírus ou TLS.** O teste final foi executado entre os containers, confiando somente no certificado temporário original. Isso não certifica o trust store do navegador Windows nem a futura cadeia pública; ambos continuam pendentes para a 1.4C.

A primeira suíte completa revelou um teste antigo que esperava zero AuditLogs ao publicar os 14 bens. O HEAD atual já implementa auditoria administrativa. Foi ajustado somente esse teste para exigir **14 eventos PATRIMONIO_PUBLISH, dos UUIDs selecionados**, conferir ausência de eventos após rollback e limpar seus próprios logs. A execução completa posterior passou. Nenhum service de publicação ou autenticação foi modificado.

Não foram repetidos build/audits nem adicionados pacotes: não houve alteração de código frontend, manifests ou locks; a configuração Nginx foi exercitada diretamente nas duas formas. A parte de UI foi verificada pelos testes relevantes, sem nova homologação visual completa.

Evidências locais: `.cache/v214b_create.log`, `v214b_trilho.log`, `v214b_backend_final.log`, `v214b_unit_final.log`, `v214b_frontend.log`, `v214b_lint_final.log`, `v214b_config.log`, `v214b_proxy.log`, `v214b_snapshot.json` e `portal_metricas_proxy_test_97108/resultado.json`. `.cache/v214b_destino.json` contém senhas exclusivas do descartável; as pastas de TLS contêm chaves privadas temporárias. **Não publicar `.cache/`**.

## 6. Pendências para a Fase 1.4C

1. **Definir terminação HTTPS real**, domínio, certificado, renovação, exposição de portas e peers confiáveis. Se houver proxy anterior, revisar Real-IP/protocolo sem confiança ampla; o ensaio de Nginx com TLS direto não homologa essa topologia ainda indefinida.
2. **Executar o workflow remoto após autorização própria.** Confirmar `systemd-analyze`, imagens e todos os testes no runner Linux. Nenhum resultado local foi apresentado como aprovação do Actions.
3. **Homologar ponta a ponta com navegador:** adesão → dois segundos visíveis → cookie → Express → PostgreSQL descartável → cobertura/agregados → gráficos; incluir GPC, revogação, meia-noite, cookies bloqueados e leitor de tela.
4. **Calibrar NAT e abuso:** validar turmas maiores, bibliotecas, renovações diárias e carga; considerar bloqueios de usuários legítimos. Antes de escalar réplicas, adotar limitação compartilhada. Não usar esses números como prova de humanidade.
5. **Revisar e instalar operação somente quando autorizado:** nome do container, credenciais, permissões, timers, responsável, alertas, journald e recuperação. O timeout do container e do serviço deve ser homologado no Linux final.
6. **Volumes existentes:** aplicar a intervenção de privilégios apenas após revisão de destino/backup, sem recriação do volume ou execução cega do bootstrap. Manter as duas diferenças de FKs de autenticação em revisão separada.
7. **Logs e retenção:** validar minimização nos erros Nginx/monitoramento e política de backups; simular indisponibilidade prolongada e recuperação sem inventar sondas ou zerar lacunas.

**Parecer:** a Fase 1.4B está preparada e validada localmente no escopo descrito. Permanecem condições operacionais explícitas para a 1.4C. Esta entrega não autoriza ativar coleta/consulta, aplicar privilégios no banco real, instalar agendamentos ou realizar deploy.
