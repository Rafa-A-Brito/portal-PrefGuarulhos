# Operação das métricas V2 — proposta pronta para homologação

Fase 1.4A, 27/10/2026. Os scripts estão implementados, mas **nenhum agendamento ou coleta pública foi ativado**. Aplicação de migrations, privilégios, segredos e tarefas no ambiente final exige revisão e autorização próprias. V1 e favoritos locais continuam independentes.

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

Antes da Fase 1.4B: homologar a rota real de proxy/HTTPS/cookies, rate limiting/NAT e múltiplas réplicas; testar adesão até gráficos; medir planos/latência com volume; confirmar papel operacional e tarefas no ambiente final; verificar leitores de tela e estados de indisponibilidade. Nenhuma verificação isolada deste guia autoriza ativação pública.
