# Operação de Feedback — F2

Implementação local, sem ativação pública. Ver [arquitetura F1](feedback_fase_f1_arquitetura.md) e [evidências F2](../reports/feedback_fase_f2_backend.md). A implantação, retenção institucional e exposição pelo proxy dependem da F4 e de autorização própria.

## Configuração e suspensão

`FEEDBACK_RECEBIMENTO_ATIVO=false` e `FEEDBACK_CONSULTA_ATIVA=false` são os padrões. Sem configuração de ingestão, a aplicação inicia sem segredos novos, não consulta tabelas de Feedback e responde `FEEDBACK_DESATIVADO` ao POST. A consulta ADMIN desativada retorna `disponivel:false,motivo:DESATIVADA`, após autenticação e validação.

Quando a ingestão for autorizada, configurar exclusivamente no processo correspondente:

| Variável | Conteúdo |
| --- | --- |
| `FEEDBACK_ORIGEM` | Origem exata, sem caminho, credenciais ou barra final |
| `FEEDBACK_TRANSPORTE` | `https`; `http-local` somente para loopback fora de production |
| `FEEDBACK_AVISOS_ACEITOS` | Versões do aviso separadas por vírgula, por exemplo `feedback-v1`; texto institucional ainda depende de aprovação |
| `FEEDBACK_CHAVE_ATUAL` | ID da versão usada em novos recibos |
| `FEEDBACK_CHAVES_JSON` | Array privado com 1–4 objetos `{id,segredo}`; segredo aleatório de 32 bytes em hexadecimal |

Não reutilizar segredo JWT ou de métricas; a configuração recusa os segredos conhecidos desses módulos. Nunca colocar o segredo em `VITE_*`, Git, URL ou logs. A documentação não fornece uma chave utilizável. A futura `VITE_FEEDBACK_ATIVO=false` controla apenas descoberta visual na F3; não implementada nesta etapa.

Ao suspender novos envios, mudar somente `FEEDBACK_RECEBIMENTO_ATIVO=false` e conservar a configuração de origem/chaves. Recibos válidos continuam sendo confirmados pelo mesmo POST. Retirar a configuração inteira desabilita também essa leitura mínima. A flag de consulta não interfere no replay nem no descarte.

Rotação: adicionar uma versão com segredo novo, mudar `FEEDBACK_CHAVE_ATUAL` e conservar as antigas até expirar o último recibo respectivo (24 horas após a última escrita dessa versão). A versão do aviso original pode ser confirmada por replay mesmo que deixe de ser aceita em novos envios. Falta da chave HMAC antiga retorna 503; nunca autoriza duplicação. Não reusar o mesmo ID para outro segredo.

Em `MOCK_DATA=true`, segredos são efêmeros e independentes do ambiente real; as flags de Feedback continuam explícitas e desligadas por padrão. Respostas incluem `demonstracao:true`, com dados fictícios em memória. Reiniciar a demo perde registros/recibos. O bloqueio de demo em produção permanece vigente.

## Contratos e segurança

- `POST /api/feedback`: JSON estrito `{tipo,mensagem,avisoVersao}`, `Origin`, `X-Portal-Feedback: 1`, `Idempotency-Key` de 32 bytes aleatórios em base64url canônica (43 caracteres). O cliente da F3 deverá omitir credenciais/cookies, preservar chave e corpo em resultado incerto e não reenviar automaticamente após 24 horas.
- `GET /api/admin/feedback`: `inicio`, `fim`, `tipo?`, `pagina=1`, `limite=20`. Não retorna mensagem.
- `GET /api/admin/feedback/resumo`: `inicio`, `fim`, `tipo?`, `granularidade=dia|mes`. Contagens como strings decimais; três tipos, série e `notas.disponivel=false`.
- `GET /api/admin/feedback/:id`: UUID, nenhuma query. Mensagem somente no detalhe ADMIN.

Datas civis inclusivas de `America/Sao_Paulo`, até 366 dias, fim não futuro. Ordenação por data e UUID decrescentes. Uma fotografia Repeatable Read READ ONLY por consulta, sem promessa de fotografia única entre lista e resumo. Retenção usa o mesmo instante da consulta. Erros de banco não se transformam em conjuntos vazios.

201 confirma commit; 200 confirma replay histórico. O recibo não prova permanência do comentário ou leitura pela equipe. 409 distingue chave reutilizada, envio expirado e aviso desatualizado. 503 pode representar resultado de escrita incerto; repetir somente com a mesma chave/corpo dentro da janela. Timeout não comprova rollback.

O router público precede CORS/parser gerais e controla preflight, caminhos, cabeçalhos, JSON UTF-8, compressão e 16 KB. Origin/Host/header próprio não autenticam humanos. HTTPS publicado depende do proxy explicitamente confiável; não ampliar `TRUST_PROXY_IPS` por conveniência.

Quotas por processo: 5/minuto e 20/hora por rede, 60/minuto global; IPv6 agrupado em /64. Buckets por HMAC efêmero, até 10.000 redes e uma hora, sem IP/digest persistido. Reinício zera limites e réplicas multiplicam a quota; aprovar proteção compartilhada/de borda antes de ativar múltiplas réplicas. Não há Redis, CAPTCHA, identificação de visitante ou acoplamento às métricas.

Logs usam a lista positiva existente; não incluem mensagem, chave, IP, cookie, SQL ou objeto bruto de erro. F4 deve validar logs e limites do proxy/host, inclusive subcaminhos. Texto é dado: F3/F4 devem exibi-lo como texto escapado, sem HTML/Markdown executável ou busca automática de links.

## Papéis e retenção

A 12ª migration fecha atomicamente os grants padrão nas duas tabelas. API recebe apenas SELECT/INSERT, sem UPDATE/DELETE. `scripts/sql/permissoes_feedback.sql` concede ao `portal_feedback_operador` DELETE e leitura apenas das colunas necessárias ao descarte. Esse papel não lê mensagem, aviso, HMAC, usuários ou métricas; o operador V2 não lê Feedback. Nenhum grant foi aplicado no banco real.

Prazos técnicos provisórios: Feedback 180 dias e recibos 24 horas, contados pelo servidor sem renovação. Consulta ignora vencidos mesmo se a limpeza atrasar. FK `ON DELETE SET NULL` permite excluir legitimamente um Feedback e conservar seu recibo válido sem texto. Não há DELETE HTTP, nota, contato, estado ou nova ação AuditLog.

O script não instala agendamento. Executá-lo somente com autorização de operação e configuração privada:

1. Configurar `FEEDBACK_OPERACAO_URL` com papel dedicado e `FEEDBACK_OPERACAO_HOST`, `FEEDBACK_OPERACAO_PORTA`, `FEEDBACK_OPERACAO_BANCO`, `FEEDBACK_OPERACAO_CLUSTER` previamente conferidos. Não há fallback para `DATABASE_URL`; parâmetros de URL que redirecionem conexão são recusados. O destino `patrimonio_guarulhos` é bloqueado nesta entrega.
2. `node scripts/descartar_feedback.js conferir` identifica cluster/versão/papel e conta vencidos em transações READ ONLY; não imprime conteúdo ou IDs individuais.
3. Antes da escrita, obter backup adequado ao destino/política aprovada. Configurar `FEEDBACK_BACKUP_PATH` para arquivo local não vazio e recente (até 24 h); essa conferência técnica não certifica a restauração do backup. Definir `FEEDBACK_DESCARTE_AUTORIZADO=1` somente no processo explicitamente autorizado.
4. `node scripts/descartar_feedback.js executar` repete a prévia e remove no máximo 500 recibos e 500 registros vencidos em uma transação. A biblioteca admite lotes 1–1.000 para testes. Uma falha encerra a operação; não repetir/resetar/reparar sem autorização. Não há loop ou timer instalado.

Antes da ativação, definir equipe responsável, aviso, fundamento aplicável, exclusões individuais e política de backups. Proposta ainda sujeita a aprovação: logs e backups por até 30 dias. Restringir acesso a backups; restauração deve reaplicar descarte e exclusões autorizadas antes de reabrir leitura/recebimento. Manifestos de exclusão devem conter somente IDs necessários e expirar com o último backup correspondente. A F2 não homologa restauração de produção nem certifica conformidade jurídica.

## Homologação exclusiva e CI

`compose.feedback.test.yml` é autônomo, PostgreSQL 17, publicação somente em loopback, volume `pg_feedback_test` e quatro papéis restritos além do bootstrap. Não combinar com Compose normal, H2 ou S1. A base chama-se `portal_test` para compatibilidade com as regressões existentes, mas pertence a um cluster/projeto/volume novo e porta exclusiva.

Antes de `up`, conferir ausência do container e do volume esperados. Fornecer cinco senhas efêmeras diferentes (`TEST_POSTGRES_PASSWORD`, `TEST_API_PASSWORD`, `TEST_MIGRATION_PASSWORD`, `TEST_METRICAS_PASSWORD`, `TEST_FEEDBACK_PASSWORD`), `TEST_POSTGRES_PORT` e `TEST_COMPOSE_PROJECT=portal_feedback_f2_<identificador_novo>`.

Configurar URLs exclusivas de bootstrap/API/migrator/operações V2/Feedback; `TEST_DATABASE_EXCLUSIVE=1`, `SECURITY_TEST_DATABASE_EXCLUSIVE=1`, `FEEDBACK_TEST_EXCLUSIVE=1`. `DATABASE_URL` do runner aponta a um sentinela inacessível diferente do descartável. Flags gerais permanecem falsas; cada teste habilita localmente seu processo. Credenciais nunca entram em argumento de CLI nem em relatório.

Após criar o Compose autônomo, executar de `backend/`: `node scripts/homologar_feedback.js completo`. O harness confere Docker, host/porta, projeto/volume, cluster PostgreSQL 17, papéis e zero tabelas; aplica migrations duas vezes (segunda sem pendências), restringe grants, gera backup sintético privado, executa a suíte completa e confere integridade SQL/checksums. Recusa reaproveitar sua identidade local ou banco previamente migrado para recomeçar a etapa. Fases separadas existem para inspeção/revisão, sem recuperação automática de falhas.

Evidências privadas ficam em `.cache/feedback_f2/`; não publicar dumps, configuração, logs brutos ou credenciais. O workflow mantém checkout sem credenciais persistentes, `contents: read`, testes V1/V2/proxy existentes, limiar audit `high` e cleanup limitado ao projeto exclusivo. O caminho CI foi atualizado, mas nenhuma execução remota foi acionada na F2.

O trilho corrente `validar_metricas_test.js` reconhece 12 migrations e ainda confere nomes/checksums integrais. `homologar_auditoria.js` e evidências H2/S1 permanecem históricos: seu ensaio de 11 migrations deve usar o checkout `f5f7fb8`, sem apontar para o descartável F2. A suíte atual de auditoria é executada na base F2; não reescrever evidências antigas.
