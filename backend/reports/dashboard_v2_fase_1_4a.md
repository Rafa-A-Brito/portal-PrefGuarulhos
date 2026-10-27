# Dashboard V2 — Fase 1.4A: persistência e operação

Data: **27/10/2026**, America/Sao_Paulo. HEAD de referência: `ee29f6c`. As alterações locais anteriores das Fases 1.2/1.3 foram preservadas. Referências: [arquitetura](../docs/dashboard_v2_1_arquitetura_metricas.md) e relatórios [1.1](dashboard_v2_fase_1_1.md), [1.2](dashboard_v2_fase_1_2.md) e [1.3](dashboard_v2_fase_1_3.md).

**Implementação e validação local entregues para revisão. A coleta pública continua desativada.** Foram implementados retenção, checkpoints de reconciliação, sondagem operacional, cobertura administrativa e scripts com identificação obrigatória do destino. Não houve acesso ao PostgreSQL real, uso do Compose normal, instalação de cron/timers, commit, push ou deploy da aplicação. Migrations e escritas de teste ocorreram exclusivamente no novo PostgreSQL descartável descrito abaixo.

## Arquivos desta etapa

| Arquivos | Mudança |
| --- | --- |
| `backend/prisma/schema.prisma`; [nova migration](../prisma/migrations/20261027120000_add_operacao_metricas/migration.sql) | Modelos OperacaoMetricas e DiaMetricasConferido; sem modificar migrations anteriores |
| `backend/src/services/operacaoMetricasService.js` | Retenção por lotes, conferência, locks, retomada e registro de sondas |
| `backend/src/services/coberturaMetricasService.js` | Janelas esperadas/observadas, indisponibilidade, período retido e dias parciais |
| `backend/src/services/metricasService.js` | Coordenação da ingestão com manutenção; recusa de dias já fechados |
| `backend/src/services/dashboardMetricasService.js`; `backend/src/docs/pathsMetricas.js` | Extensão compatível da resposta V2 e documentação OpenAPI |
| `backend/scripts/metricas_operacao.js`; `observar_metricas.js`; `reter_metricas.js` | Executor identificado e comandos operacionais independentes da API |
| [permissoes_metricas.sql](../scripts/sql/permissoes_metricas.sql); `infra/postgres/10-roles.sh` | Grants específicos V2; correção do privilégio CREATE no banco somente para o migrator no bootstrap de volumes novos |
| `backend/.env.example`; [guia operacional](../docs/operacao_metricas.md) | Configuração explícita, estratégia de agendamento, alertas e restauração |
| `backend/test/operacaoMetricas.test.js`; `operacaoMetricas.integration.test.js`; `dashboardMetricas.test.js`; `r1.test.js` | Testes operacionais, HTTP, permissões, concorrência e lista de migrations |
| [integrity_metricas.sql](../prisma/tests/integrity_metricas.sql) | Verificação adicional de PKs, FKs, checks e índices em READ ONLY |
| `frontend/src/features/admin/components/MetricasDashboard.jsx`; `frontend/src/features/admin/metricasDashboard.js`; `frontend/test/MetricasDashboard.test.jsx` | Apresentação/validação da cobertura nova, mantendo compatibilidade com NAO_INSTRUMENTADA |
| Este relatório | Evidências e pendências |

Não foram modificados `dashboardService.js`, `GraficosDashboard.jsx`, componentes Card/Chart, autenticação, favoritos locais, interceptadores JWT, manifests/locks ou configurações de proxy/produção. Nenhum pacote foi adicionado. Os arquivos frontend da V2 já estavam não rastreados no início; nesta fase receberam somente os ajustes de cobertura indicados.

## Migration e descartável

Foi iniciado **somente `db_test` de `compose.test.yml`**, projeto novo `portal_v214a_20261027`. O container usa tmpfs, sem bind mounts ou volumes persistentes. Os descartáveis anteriores das portas 5434/5435 não foram reutilizados.

| Identificação antes da preparação SQL | Valor |
| --- | --- |
| Endpoint externo | `127.0.0.1:5436/portal_test` |
| Porta interna | 5432 |
| PostgreSQL | **17.11** |
| Cluster | **7701268587946840100** |
| Papel de identificação/bootstrap | `portal_test`, exclusivo do descartável |
| Papel executor das migrations | `portal_migrator`, sem superuser/CREATEDB/CREATEROLE |
| Exclusividade inicial | Zero outras sessões no banco; zero tabelas públicas |
| Identificação | READ ONLY; nome, papel, cluster, porta e isolamento Docker conferidos antes da preparação |

### Recuperação autorizada e resultado

A primeira execução de `prisma migrate deploy` parou **na primeira instrução da primeira migration**, `CREATE SCHEMA IF NOT EXISTS public`, por ausência de CREATE no banco. CREATE no schema, presente no bootstrap anterior, não bastava. Foi constatado que existia somente `_prisma_migrations`, sem tabelas da aplicação ou enums públicos e com zero passos aplicados.

O responsável **autorizou explicitamente a recuperação neste descartável**. Foi concedido CREATE no banco somente a `portal_migrator`; `prisma migrate resolve --rolled-back 20260929230000_initial_schema` preservou o registro da tentativa. Nenhum SQL histórico foi editado e nenhum objeto da aplicação precisou ser removido.

Em seguida, `prisma migrate deploy` aplicou **as 11 migrations completas**. A reexecução retornou **“No pending migrations to apply”**. `_prisma_migrations` contém 11 execuções concluídas e uma tentativa anterior marcada rolled-back; não existem falhas pendentes. Os checksums foram comparados byte a byte com os arquivos locais, incluindo a tentativa recuperada. Não foi usado SQL manual para substituir a aplicação das migrations.

O banco era novo e vazio antes da primeira tentativa; o teste completo inclui a recuperação auditável descrita acima, não uma alegação de primeira tentativa sem falhas. A correção de bootstrap foi preparada em `infra/postgres/10-roles.sh`, sem executar esse script ou alterar volumes reais.

### Revisão direta do SQL e Prisma

A migration V2 original `20261026120000_add_visualizacoes_metricas` permaneceu intacta. Foram conferidos: PK diária de deduplicação, PK de agregados, FKs com DELETE RESTRICT/UPDATE CASCADE, índices `(patrimonio_id,dia)`, HMAC hexadecimal de 64 caracteres, quantidade não negativa, alinhamento de sonda a 300 segundos e versão positiva. Não há backfill ou grants implícitos no seu SQL.

A nova migration acrescenta somente `operacao_metricas` (singleton, início de observação, pisos de retenção e último sucesso) e `dias_metricas_conferidos` (selo por dia). PKs cobrem acesso e limpeza por data; não foram criados índices redundantes. Não há novos vínculos editoriais ou dados pessoais. SHA-256 do novo arquivo aplicado:

```text
8de7dde05752b95df199f45c2263a457dc9546fd67a8069f175dd096e03edea9
```

`prisma validate` e geração do cliente passaram. A comparação adicional `prisma migrate diff --from-config-datasource --to-schema ... --exit-code` retornou **2**, por duas diferenças **preexistentes** de autenticação: a migration de `auth_sessions` e `refresh_tokens` omite ON UPDATE, resultando em NO ACTION; o schema Prisma assume CASCADE. Não foram apontadas diferenças nas estruturas V2. O SQL diagnóstico não foi executado. Essa divergência fica para revisão própria, sem alteração de autenticação ou migrations históricas.

## Privilégios comprovados

| Papel | Resultado no descartável |
| --- | --- |
| `portal_migrator` | Aplicou migrations e grants; CREATE no banco/schema; sem superuser/CREATEDB/CREATEROLE |
| `portal_api` | Ingestão e consulta V2 aprovadas; sem CREATE no banco/schema; sem associação ao migrator; DELETE das métricas, escrita dos controles/sondas e leitura do histórico Prisma recusados |
| `portal_metricas_operador` | Retenção/sonda aprovadas; sem CREATE no banco/schema ou associação ao migrator; leitura de users, INSERT de recibos e UPDATE de totais recusados |

Os privilégios de CRUD existentes fora das métricas foram preservados. Os testes antigos da API continuaram aprovados. O SQL operacional é uma etapa explícita após migrations: o proprietário restringe o que os default privileges amplos concederam às tabelas V2. Criar o operador, conceder CONNECT e permitir leitura da identidade do cluster compete ao administrador do destino, conforme o guia; não foi alterado nenhum papel real.

## Retenção, reconciliação e concorrência

- **Recibos:** dias anteriores a hoje paulista menos sete dias. Em 27/10/2026, purga até 19/10; preserva sete dias encerrados e o dia corrente.
- **Agregados/sondas:** datas anteriores a hoje menos 13 meses civis, ajustando mês curto/bissexto. Piso nesta fotografia: 27/09/2025.
- **Conferência:** compara recibos por patrimônio com os totais de cada dia vencido, incluindo pares ausentes de um dos lados. Divergência interrompe com rollback; não corrige o agregado nem elimina evidência inconsistente.
- **Retomada:** selo durável antes da purga; lotes de até 1.000 linhas por tabela/transação; máximo de 200 transações por invocação. Uma interrupção não faz a retomada recontar recibos já parcialmente removidos como se fossem o dia inteiro.
- **Locks:** uma retenção por banco; coleta compartilha lock diário, manutenção fecha exclusivamente o dia vencido. Barreira curta protege o avanço do piso. O FOR SHARE patrimonial e timeouts de ingestão foram preservados. Falha ou saturação retorna indisponibilidade, sem confirmação falsa.
- **Pisos:** coleta recusa dia selado/expurgado. Consulta não mostra fragmentos anteriores ao piso durante limpeza por lotes. `ultima_retencao_em` só registra conclusão integral.

Testes comprovaram rollback depois de DELETE, retomada com lote 1, repetição sem novas exclusões, divergência preservando recibos, fronteiras inclusivas, fevereiro bissexto/não bissexto, meia-noite paulista e bloqueio mútuo da manutenção. Coleta no dia atual prosseguiu enquanto um dia antigo estava bloqueado. A rotina não executou limpeza no banco real.

Na regressão de deduplicação, **100 tentativas concorrentes** resultaram em **um recibo e uma visualização**: 67 aceitas imediatamente e 33 indisponíveis, repetidas explicitamente após a rajada com a mesma identidade. Contenção FOR SHARE foi conferida nas duas direções com lock timeout de 200 ms. Isso prova efeito deduplicado, não entrega garantida sob saturação.

## Sonda e contrato administrativo

`node scripts/observar_metricas.js` valida configuração, consulta health HTTP pelo destino configurado e confere privilégios SQL de ingestão/leitura. Não emite cookie e não cria evento fictício. Registra uma linha por janela UTC de cinco minutos, preservando a pior observação: FALHA > DESATIVADA > DISPONIVEL. Banco/agendador indisponível pode impedir a escrita; ausência continua **DESCONHECIDA**, nunca sucesso reconstruído.

`GET /api/admin/dashboard/metricas` continua ADMIN/EDITOR, com o envelope e os agregados anteriores. A extensão acrescenta:

```text
meta.cobertura: NAO_INSTRUMENTADA | SONDAGEM_5_MIN
meta.inicioObservacao: timestamp | null
meta.inicioColeta: null                 // não certificado pela emissão de sondas
meta.inicioDisponivel: YYYY-MM-DD | null // piso aplicado de retenção
meta.observacao:
  tipo, inicioObservacao, inicioColeta, inicioDisponivel, ultimaRetencaoEm
  resumo: esperadas, disponiveis, desativadas, falhas, desconhecidas
  porDia: [{data, estado, parcial, ...contadoresDeJanelas}]
```

Estados diários: DISPONIVEL_NAS_SONDAS, PARCIAL, SEM_OBSERVACAO e FORA_DA_RETENCAO. Só entram janelas encerradas. O dia corrente permanece parcial; o teste de um dia paulista de 23 horas confirmou **276 janelas**, sem fixar 288. Datas fora da retenção não recuperam cobertura por linhas que ainda aguardem purga em lote.

A interface mostra ressalva, piso retido, resumo e tabela diária acessível em um disclosure, utilizando o CSS modular existente. Totais, três gráficos V2 e quatro gráficos V1 permanecem separados. Cobertura é operacional do portal, mesmo ao filtrar por patrimônio/região. Não representa número de visitantes, adesão ou entrega de todos os eventos; a série continua com lacunas, sem zeros inventados. `inicioObservacao` não é início da coleta; `inicioDisponivel` não certifica cobertura desde aquela data.

## Scripts, validação e evidências

| Verificação | Resultado |
| --- | --- |
| Backend completo, Node 24.22.1, PostgreSQL descartável | **512 aprovados, 0 falhas, 0 ignorados** |
| Frontend completo, dois workers | **437 aprovados, 28 arquivos**, incluindo V1, favoritos locais, participação e cobertura |
| Refinamento final: impedir cobertura de linhas anteriores ao piso | **14 testes direcionados aprovados** (operação real, contratos, V1 e limites) |
| Contrato HTTP final com SONDAGEM_5_MIN e janelas desconhecidas | Aprovado; contagens BigInt e permissões preservadas |
| Lint backend/frontend | Aprovados |
| Prisma validate/generate | Aprovados |
| Deploy e repetição | 11 concluídas, uma tentativa recuperada, checksums iguais, nenhuma pendência |
| `integrity.sql` | Aprovado com ROLLBACK, somente no descartável |
| `integrity_metricas.sql` | Aprovado em READ ONLY, ROLLBACK |
| Execução dos dois CLIs | Sonda DESATIVADA e retenção CONCLUIDA; health HTTP local sintético; zero eventos gerados |
| Build frontend | Aprovado |
| `git diff --check` | Aprovado; avisos de normalização de EOL sem falha |
| Diff integral Prisma/banco | Diferenças antigas em duas FKs de autenticação; documentadas, não corrigidas |

A execução dos CLIs usou o papel operacional e passou pela identificação do cluster. O health sintético não homologa proxy/TLS real. Não foi repetida a homologação visual em navegador nesta etapa; a alteração de cobertura foi verificada em testes React com Recharts real. Não houve nova auditoria de dependências, pois não foram alterados manifests/locks ou pacotes.

Bundle inicial **677,14 kB / 191,28 kB gzip**, inalterado em relação à 1.3. Módulo V2 lazy: **27,81 kB / 9,99 kB gzip**, antes 25,24/9,21. V1 específico e chunk compartilhado Recharts permanecem 48,61/12,85 e 365,38/105,44 kB. Persistem os avisos prévios do bundle inicial, import dinâmico ineficaz do editor e imagens grandes.

Logs e runner local em `.cache/v214a_*`: identificação, tentativa inicial, recuperação autorizada, deploy recuperado/repetido, grants, suíte completa, alvos finais, lint/build, integridade, diff diagnóstico e smoke dos CLIs. `.cache/v214a_destino.json` contém **credenciais exclusivas do descartável**, ignoradas pelo Git: não publicar essa pasta. Ao final, leitura do cluster confirmou **zero recibos, agregados, sondas e controles restantes** após limpeza das fixtures. O container descartável permanece disponível na porta 5436 para inspeção.

## Infraestrutura futura e riscos antes da 1.4B

1. **Agendamento:** o [guia operacional](../docs/operacao_metricas.md) propõe systemd/cron no host Linux invocando os scripts no container existente. Sonda a cada cinco minutos e retenção às 03:15 de São Paulo; nenhum timer/job foi instalado. Definir dono operacional e alertas por duas janelas ausentes, FALHA ou retenção atrasada mais de 24 horas. PENDENTE exige retomada; divergência exige investigação.
2. **Configuração e segredos:** disponibilizar credencial operacional só ao processo de tarefas, confirmar destino/cluster, grants mínimos e configuração de coleta coerente com a instância observada. API e V1 iniciam sem segredos V2 com flags desligadas. Não ativar nenhuma flag apenas por instalar a migration.
3. **CI remoto:** não houve push ou execução no GitHub Actions. O workflow atual ainda precisa receber papel operacional, identificação/variáveis de cluster, grants V2, deploy pelo migrator e execução da integridade adicional. Sem esses parâmetros, os testes operacionais optativos serão ignorados no CI; **não declarar essa trilha homologada remotamente**. Nesta máquina todos foram habilitados e passaram.
4. **Proxy e ponta a ponta:** homologar HTTPS, cookies, origem, trust proxy e o percurso real adesão → qualificação → API → banco → gráficos. Health + permissões não certificam aceitação de cada evento. Rever a quota de dez sessões por hora/rede para NAT e proteção compartilhada antes de múltiplas réplicas.
5. **Atualização coordenada:** todas as réplicas devem utilizar os locks/pisos novos antes da manutenção. Não misturar coletores antigos com a rotina de expurgo. Medir contenção, EXPLAIN, latência e volume real; reconciliação tem timeout e suspende a purga se não concluir em tempo.
6. **Restauração:** restaurar recibos, agregados e checkpoints do mesmo backup consistente; manter ingestão desligada, conferir destino e rodar retenção até concluir. Não reconstruir sondas ausentes ou apagar divergências. Política de expurgo dos backups e rotação de segredos permanece responsabilidade operacional.
7. **Drift de autenticação:** revisar separadamente ON UPDATE das duas FKs apontadas. Nenhuma mudança foi feita nesses contratos nesta fase.
8. **Interface:** homologar a tabela de cobertura em dispositivos e leitores de tela reais na 1.4B. Nenhum favorito global, Gemini ou selo “Em alta” foi iniciado.

**Parecer:** a persistência e as rotinas da Fase 1.4A estão implementadas e verificadas localmente no descartável. A etapa segue para revisão técnica; não autoriza aplicar migrations, conceder privilégios, agendar tarefas ou ativar coleta/consulta no ambiente final.
