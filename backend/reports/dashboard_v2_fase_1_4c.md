# Dashboard V2 — Fase 1.4C: homologação integrada e pré-deploy

Concluído em **28/10/2026**, America/Sao_Paulo; execução iniciada em 27/10. HEAD de referência `b06435e`. A árvore já continha a 1.4B sem commit; esse trabalho foi preservado. Referências: [arquitetura](../docs/dashboard_v2_1_arquitetura_metricas.md), [operação](../docs/operacao_metricas.md) e relatórios [1.1](dashboard_v2_fase_1_1.md), [1.2](dashboard_v2_fase_1_2.md), [1.3](dashboard_v2_fase_1_3.md), [1.4A](dashboard_v2_fase_1_4a.md) e [1.4B](dashboard_v2_fase_1_4b.md).

**Parecer: fluxo integrado validado localmente, com duas correções de tolerância a armazenamento bloqueado. A ativação pública permanece bloqueada pelas condições operacionais abaixo.** Nenhum acesso ao PostgreSQL real, alteração de `.env` real, migration histórica, instalação de certificado/agendamento no host, commit, push ou deploy foi realizado. A coleta foi habilitada exclusivamente nos processos/build descartáveis do ensaio.

## 1. Ambiente e isolamento

| Item | Identificação |
| --- | --- |
| Projeto PostgreSQL novo | `portal_v214c_test`, somente `compose.metricas.test.yml` |
| Container / volume | `portal_v214c_test-db_test-1` / `portal_v214c_test_pg_test` |
| Destino externo | **127.0.0.1:5438/portal_test**, PostgreSQL 17, imagem `postgres:17-alpine` |
| Cluster | **7701540019544985634**, conferido antes das migrations e novamente antes/depois dos ensaios |
| Estado inicial | Zero tabelas públicas e zero outras sessões no banco; volume/container inexistentes antes da criação |
| Bootstrap / migrations | `portal_test` / `portal_migrator`; API `portal_api`; manutenção `portal_metricas_operador` |
| Rede E2E | `portal_v214c_test_e2e`, 172.30.90.0/28; Nginx .2, Express .3, PostgreSQL .4 |
| HTTPS de teste | `https://portal.test` dentro da rede; publicação externa somente loopback 8448 |
| Aplicação | Express real, código atual montado readonly, URL exclusiva do papel API no descartável; sem montagem de `.env` |
| Frontend | Build React/Vite real, `envDir:false`, `/api` relativa, flag true somente no build `.cache/v214c/dist` |
| Navegador | Chromium **156.0.8078.47**, headless em Debian 12; CA efêmera no NSS do container, sem bypass TLS |
| Runtime | Suítes locais Node **24.22.1**; containers de ensaio Node **24.21.0** |

O Compose normal não foi iniciado. Os volumes das fases anteriores não foram reutilizados. O migrator aplicou as **11 migrations desde vazio**, sem recuperação manual, e a segunda execução informou nenhuma pendência. Os 11 checksums e registros concluídos foram conferidos. Grants específicos foram aplicados pelo proprietário apenas no descartável.

As fixtures contêm sete categorias, três regiões, seis patrimônios e duas contas de teste ADMIN/EDITOR. Os bens incluem canônicos publicados, arquivado, rascunho e um legado deliberadamente PUBLICADO para testar a exclusão canônica. Os conteúdos são sintéticos; não houve cópia ou importação do acervo real. A conferência final encontrou **6 bens, 3 recibos, total agregado 3 e 11 migrations concluídas**.

## 2. Arquivos desta fase

| Arquivo | Mudança |
| --- | --- |
| `frontend/src/context/AuthContext.jsx` | Protege a tentativa de limpeza de sessionStorage inacessível durante leitura inicial da sessão; mantém visitante deslogado |
| `frontend/src/features/metricas/coletaMetricas.js` | Fallback para fila local quando Web Locks é negado por SecurityError antes de entrar no callback |
| `frontend/test/AuthFlows.test.jsx`; `coletaMetricas.test.js` | Três regressões novas para leitura/limpeza bloqueadas, Web Locks negado e ausência de reenvio após callback iniciado |
| `backend/scripts/homologar_metricas.js` | Trilho explícito de criação, identificação, migrations/testes, fixtures, build, navegador, operação e encerramento isolados |
| `backend/test/fixtures/Dockerfile.metricas` | Imagem de testes com Chromium, NSS, systemd e ferramentas Linux; nenhuma dependência adicionada ao portal |
| `backend/test/fixtures/homologacao_metricas.js` | Navegação CDP real, adesão, abas, SQL de conferência, login, gráficos, teclado e mobile |
| `backend/test/fixtures/operacao_homologacao.js` | Execução dos scripts operacionais reais e EXPLAIN com massa sintética em rollback |
| `backend/test/fixtures/falhas_metricas.js`; `falha_banco_metricas.js` | Cookie expirado, SQL bloqueado, headers, quotas e indisponibilidade/reinício do PostgreSQL de teste |
| `backend/docs/operacao_metricas.md`; este relatório | Reprodução delimitada, evidências e condições de liberação |

Não houve alteração de contratos V1/V2, regras de autorização, login/refresh, schema, migrations, conteúdo real, relações, favoritos globais, Gemini, “Em alta”, manifests/locks ou limites nesta fase. O workflow, Nginx e unidades systemd preparados na 1.4B foram preservados e verificados. Builds, CA, perfis e logs são temporários ignorados, não arquivos de produto.

## 3. Navegador → API → PostgreSQL → Dashboard

O ensaio usa o roteador, serviços e persistência reais: não há mock de login, resposta de métricas ou gravação Prisma. O harness usa CDP para operar o navegador e SQL identificado para conferir os resultados. A injeção de GPC representa o sinal do navegador; não substitui a API.

1. Abrir uma ficha confirmada sem adesão: **zero chamadas de métricas, nenhum cookie analítico e nenhum evento**. Recusar mantém zero.
2. Aceitar e aguardar a qualificação: sessão diária 200 e evento 204; PostgreSQL confirma **um recibo e um incremento**.
3. Recarregar e abrir uma segunda aba: ambas podem reenviar o evento, mas continuam **um recibo e total 1**. Foi observado um único bootstrap na sequência inicial.
4. Abrir outra ficha e ativar uma aba diferente antes da qualificação: `document.visibilityState=hidden`, sem incremento durante a espera. Voltar à aba e completar tempo visível: total 2.
5. Visualizar um terceiro bem sem região: total 3. UUIDs de arquivado, rascunho, legado e inexistente retornam 404 sem modificar esse total.
6. Adulterar cookie HttpOnly: 401. Revogar pela interface: DELETE 204, cookie removido e navegação posterior sem novos eventos.
7. GPC: botão de aceitar desabilitado e nenhum incremento. Favorito local continua clicável e persiste após recarga no perfil com armazenamento disponível.
8. Arquivar o primeiro bem e mudar sua região **na fixture**: histórico permanece e se redistribui pela FK atual. Login real ADMIN e EDITOR mostra o mesmo total; a ficha pública navegada por esses membros conhecidos não incrementa.
9. Comparação HTTP/SQL: ranking com três bens de quantidade 1, série diária com total 3 e regiões Cantareira 1, São João/Bonsucesso 1, **Sem região 1 separado**. O primeiro item do ranking passa a indicar ARQUIVADO.

V1 continua contando **os seis registros sintéticos de todos os status**; V2 conta os três eventos aceitos. Os quatro gráficos V1 e três V2 aparecem juntos. Nenhum número da fixture foi incorporado ao frontend. A legenda/unidade continua sendo credencial diária + patrimônio + dia, nunca visitantes únicos.

Após executar a sonda real, a API e a interface passaram de `NAO_INSTRUMENTADA` para `SONDAGEM_5_MIN`. A captura final informa a janela observada, as demais desconhecidas, o piso da retenção e o dia corrente parcial. Ausências na série continuam sem dado, sem interpolar zeros. As sondas não são apresentadas como audiência.

### Capturas e acessibilidade

- [Dashboard ADMIN desktop, 1440 px](../../.cache/v214c/dashboard_admin_1440.png).
- [Dashboard ADMIN mobile, 390 px](../../.cache/v214c/dashboard_admin_390.png).
- [Dashboard EDITOR mobile](../../.cache/v214c/dashboard_editor_390.png).
- [Participação desktop](../../.cache/v214c/participacao_desktop.png) e [participação mobile](../../.cache/v214c/participacao_mobile.png).
- [Cookies bloqueados, após correção](../../.cache/v214c/cookies_bloqueados.png).

Desktop e mobile não apresentaram overflow horizontal no dashboard. Painel de participação operado por Enter; três tooltips V2 acessíveis pelas setas, com valores **1, 3 e 1**. Tabelas alternativas, status e rótulos permaneceram disponíveis. As capturas desktop/mobile foram inspecionadas. Não havia leitor de tela configurado para este ensaio: **não há certificação com NVDA, VoiceOver ou Orca**, nem homologação em aparelho móvel físico.

## 4. Problemas encontrados e correções

**Armazenamento bloqueado:** o Chromium configurado para bloquear cookies também negou storage. `AuthContext` capturava a falha de leitura, mas `removeItem` dentro do catch lançava outra exceção, chegando ao modal global de erro na ficha pública. Foi protegido somente esse cleanup; o estado continua deslogado e nenhuma permissão é concedida. Novo teste cobre leitura e limpeza recusadas.

**Web Locks bloqueado:** o navegador pode expor a API e recusar `request` por SecurityError. A coleta agora usa sua fila local quando essa recusa acontece **antes** do callback. Se o callback já começou, o erro é propagado sem repetir emissão. Dois testes cobrem essa distinção. A garantia entre abas sem Web Locks/armazenamento continua limitada; a deduplicação final permanece no backend.

Com as correções e build novo, o mesmo bloqueio real do Chromium produziu uma tentativa com cookie indisponível, evento **401**, nenhuma contagem adicional e nenhum loop de bootstrap. A ficha ficou disponível sem modal global. Os três eventos anteriores permaneceram intactos. Isso não cria fingerprint, fallback por IP ou armazenamento de segredo no JavaScript.

Houve ajustes do **harness**, sem alteração da aplicação: suspensão artificial `Page.setWebLifecycleState` não representou retorno normal da aba, então foi substituída por troca real de abas com verificação de visibilidade; o teste de tooltip passou a navegar pelas lacunas até alcançar um ponto real; o cliente HTTPS fixa SNI `portal.test` para poder testar Host HTTP forjado mantendo a validação correta do certificado. Etapas já confirmadas foram retomadas por checkpoint, sem limpar ou recriar eventos.

## 5. Segurança, concorrência e operação

| Cenário | Resultado executado |
| --- | --- |
| HTTPS no navegador | Cadeia CA/leaf temporária validada; nenhuma opção para ignorar erros TLS ou instalação no host |
| Cookie | `__Host-portal_metricas`, Secure, HttpOnly, SameSite=Lax, Path=/; valor indisponível em document.cookie |
| Cookie expirado/adulterado | 401; total não muda |
| Origin, Host e cross-site inválidos | 403 |
| Headers XFF/XFP/XFH/Forwarded forjados | Sobrescritos pelo proxy; reutilização não muda credencial; conexão direta testada no ensaio separado não ganha confiança |
| Contenção PostgreSQL | UPDATE de fixture segura o FOR SHARE; evento recebe 503/Retry-After em cerca de **245 ms**, sem recibo parcial |
| PostgreSQL realmente parado | Evento recebe 503/Retry-After em aproximadamente **0,53 s**; página estática e health respondem 200 |
| Recuperação | Mesmo container reiniciado, cluster novamente conferido e GET público 200; nenhuma gravação recusada foi reenviada |
| Quota de credencial | Reutilizações válidas chegam a 429; total continua 3 |
| NAT / IPv6 / memória | Testes backend completos cobriram 120 emissões/hora, bloqueio da 121ª, reuso, rajadas, /64 e limite de buckets |
| Dois Nginx | `nginx -t` e HTTPS aprovados para infra/Compose e configuração da imagem |
| Limites da borda | Corpo 2 KB e uploads 12 MB preservados; 160 pedidos geraram **103 e 101 respostas 429** nas duas configurações |

O ensaio Nginx separado usa persistência simulada, como na 1.4B; o fluxo de navegador e os testes de indisponibilidade acima usam Express/PostgreSQL reais. Não confundir os dois níveis de evidência.

Os scripts **`observar_metricas.js` e `reter_metricas.js` foram executados como processos reais**, com `portal_metricas_operador`, contra HTTPS/health e PostgreSQL do ensaio. Duas sondas na mesma janela retornaram DISPONIVEL sem duplicação. Duas retenções retornaram CONCLUIDA; não havia eventos vencidos do navegador, portanto removeram zero e preservaram os três.

A suíte integrada SQL, executada no novo cluster, cobriu adicionalmente: recibos vencidos, fronteiras de sete dias/13 meses, meia-noite paulista, divergência que impede exclusão, rollback após DELETE, selo e retomada de lotes PENDENTE, idempotência, advisory locks e coleta concorrente, janelas desconhecidas, prioridade de FALHA e dia histórico de 23 horas. A divergência não foi “corrigida” por sobrescrever agregados.

Privilégios dos três papéis passaram: migrator sem superuser/CREATEDB/CREATEROLE; API sem DDL e sem DELETE de métricas; operador sem acesso a users, INSERT de recibos ou UPDATE de totais. As duas divergências antigas de FKs de autenticação continuam registradas separadamente; não foram corrigidas.

## 6. Testes finais e desempenho

| Verificação | Resultado |
| --- | --- |
| Backend completo no cluster novo | **560 aprovados, 0 falhas, 0 ignorados** |
| Frontend completo após as correções | **440 aprovados em 28 arquivos**, incluindo três regressões novas |
| Lint backend/frontend | Aprovados |
| Prisma validate / generate | Aprovados; schema/migrations preservados |
| Build frontend normal | Aprovado; defaults de métricas desligados |
| Build de homologação | Aprovado, habilitação restrita à pasta temporária |
| Audits backend completo / produção | **0 / 0 vulnerabilidades**, código 0 |
| Audits frontend completo / produção | **0 / 0 vulnerabilidades**, código 0 |
| Integridade original / V2 | Passaram no trilho de migrations; V2 reconferida em READ ONLY após os ensaios |
| Conferência final | 6 bens, 3 recibos, soma 3, 11 migrations concluídas |
| systemd-analyze verify | Quatro unidades aprovadas em Linux Debian, sem instalação/execução de timers |
| Workflow/Compose | YAML, scripts inline, flags, isolamento, permissões e limpeza conferidos |

StrictMode, item provisório/loading/erro/mock, relógio injetável na virada paulista, cancelamento, retries/timeout, 401 sem logout, BigInt, filtros/paginação e lacunas foram exercitados nas suítes automatizadas. **Esses casos não são todos testes de navegador contra banco real**: os níveis estão separados acima. O bloqueio de cookies, duas abas, GPC, revogação, ADMIN/EDITOR, falha SQL e falha de banco também tiveram ensaio real.

Uma conferência auxiliar final tentou enviar a diretiva psql `\set` diretamente ao driver pg e foi recusada na análise sintática; não executou o SQL. O trilho original, que trata essa diretiva, já havia passado. Não foi repetida uma gravação: a conferência posterior restringiu-se a READ ONLY e à integridade V2.

### EXPLAIN e volume sintético

Foi usada uma transação exclusiva com **1.000 bens adicionais e 366.000 agregados**, seguida de **ROLLBACK**. As formas SQL de total, ranking, regiões e série foram medidas em janela de 90 dias, com EXPLAIN ANALYZE/BUFFERS e dez amostras aquecidas por consulta. Sem alterar índices ou dados persistidos.

| Consulta | p95 empírico, dez amostras |
| --- | ---: |
| Total e bens distintos | 56,04 ms |
| Ranking | 26,56 ms |
| Regiões | 48,98 ms |
| Série diária | 42,00 ms |

Com dez amostras, o estimador usado corresponde à maior observação. São tempos das consultas centrais por conexão SQL no Docker Desktop, **não p95 do endpoint completo em produção**, nem teste de carga com muitos visitantes. As consultas de medição reproduzem as agregações básicas; filtros opcionais, serialização Prisma, cobertura e custo da transação completa exigem medição adicional no ambiente final. Planos completos em `.cache/v214c/operacao_desempenho.json`. Não há justificativa medida para acrescentar índices nesta entrega.

Build normal final: inicial **677,29 kB / 191,33 kB gzip**, módulo V2 lazy **27,81 kB / 9,99 kB gzip**, V1 **48,61 kB / 12,85 kB gzip**, compartilhado UI/Recharts **365,38 kB / 105,44 kB gzip**. Permanecem os avisos anteriores de chunk inicial grande, import dinâmico ineficaz do editor e assets grandes. Nenhuma dependência ou limite do Vite foi alterado.

## 7. CI, defaults e encerramento

O workflow atual só cria o PostgreSQL descartável e executa verificações; não faz deploy de aplicação. Mantém `contents: read`, `persist-credentials: false`, credenciais efêmeras mascaradas e limpeza limitada ao projeto criado pela execução. Os pins foram reconferidos nas fontes oficiais de [checkout](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1) e [setup-node](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1).

**Não houve GitHub Actions remoto.** A árvore ainda contém alterações sem commit; executar esse conteúdo no remoto exige revisão e autorização separada para commit/push ou outra forma de disponibilizá-lo. Não foi realizado push apenas para disparar CI. A nova homologação de navegador continua um trilho opt-in local; não foi apresentada como job já executado no Actions.

`systemd-analyze verify` foi executado em container Linux; não comprova agendamento, credenciais/LoadCredential, journald, permissões do socket, reinício ou timeout no host final. Nenhum timer/cron foi instalado. O navegador confia na CA somente dentro do container; o problema anterior do AVG no Windows não foi contornado desabilitando antivírus ou TLS.

Conferência das flags: backend `.env` não define flags V2; exemplos mantêm `METRICAS_COLETA_ATIVA=false`, `METRICAS_CONSULTA_ATIVA=false` e `VITE_METRICAS_ATIVAS=false`. Não houve alteração de arquivos reais de ambiente. Serviços HTTP/Nginx temporários são encerrados ao concluir; PostgreSQL/volume descartável permanecem para inspeção, sem dados reais.

Evidências locais: `.cache/v214c_backend.log`, `v214c_frontend_test.log`, logs de lint/build/Prisma/audits/systemd/proxy e `.cache/v214c/` com `navegador.json`, `cookies_bloqueados.json`, `dashboard_admin.json`, `dashboard_editor.json`, `falhas_http.json`, `banco_indisponivel.json`, `operacao_desempenho.json` e `final.json`. **Não publicar `.cache/`: contém também credenciais, cookies, perfis e chaves privadas temporárias.**

## 8. Critérios de liberação

| Categoria | Estado |
| --- | --- |
| **Validado localmente** | Migrations limpas/idempotentes, papéis, fluxo real browser/API/SQL/dashboard, deduplicação, proteção básica, retenção/cobertura, regressões, lint/build/audits e sintaxe systemd |
| **Não validado remotamente** | Workflow completo no GitHub Actions, disponibilidade/versões das imagens e comportamento do runner |
| **Dependente da infraestrutura final** | Terminação TLS ainda não definida, domínio/certificados/renovação, cadeia de proxy, volume existente, credenciais, Linux/systemd, logs/backup e carga real |
| **Bloqueante para ativação pública** | Aprovação operacional/institucional dos itens abaixo e autorização explícita de implantação/ativação |

Antes de ativar, definir e homologar HTTPS/peers confiáveis sem aceitar headers arbitrários; aprovar privilégios/migrations no destino final com backup; configurar responsável, timers, alertas e recuperação; definir política de logs/backups/rotação de chaves; revisar textos e política de participação, privacidade/GPC, retenção e responsabilidades institucionais/jurídicas. Esta entrega não declara conformidade jurídica ou aprovação da Prefeitura.

Também permanecem calibração de NATs maiores e abuso, limitação compartilhada antes de múltiplas réplicas, testes em leitores de tela/aparelhos reais e medição do endpoint completo sob carga. Cookies e tempo visível não provam humanidade nem audiência única. Falhas/recusas reduzem cobertura; zeros e sondas não devem ser apresentados como prova de ausência de visitantes.

**A implementação está apta a seguir para revisão de implantação futura. A Fase 1.4C não libera produção, não autoriza aplicação no banco real e não habilita coleta/consulta pública.**
