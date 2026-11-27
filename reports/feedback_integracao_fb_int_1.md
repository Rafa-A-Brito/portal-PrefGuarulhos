# FB-INT-1 — Restauração e integração funcional do Feedback em Contato

26/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD `29d5a0340cab9165f22394f7df96c1d14264a9db`. Sem fetch, commit, push, deploy ou ativação pública. Implementação F1–F4 reaproveitada; nenhum formulário, endpoint ou gráfico novo.

## Diagnóstico e estado inicial

Consultados README, arquitetura F1, operação F2, relatórios F2/F3/F4, FUNC-0.2, fontes públicos/administrativos, configurações, schema e migrations. O Git já apresentava modificações locais em `AdminAuditoria.jsx` e `AdminAuditoria.module.css`, relativas à nova busca. Foram preservadas byte a byte.

**O formulário não foi removido.** `Contato.jsx` já importa e monta `FormularioFeedback` quando `feedbackAtivo()` retorna verdadeiro. `/feedback` redireciona para `/contato`; o Footer aponta para esse mesmo formulário. `feedbackAtivo()` exige `VITE_FEEDBACK_ATIVO === "true"`. A flag não está no `frontend/.env.local` encontrado, e as flags backend não estão no `backend/.env`. Ausência significa desativação: a mensagem “Feedback indisponível” é intencional. Não foi necessário alterar JSX, CSS, validação ou cliente HTTP.

Dependências/configurações efetivamente necessárias:

- Frontend: flag no processo Vite ou **durante o build**. O Dockerfile não declarava o argumento de Feedback; defini-lo apenas no runtime Nginx não altera JavaScript já compilado.
- O cliente público sempre usa `/api/feedback`, independentemente de `VITE_API_BASE_URL`. O proxy Vite preservava corretamente Host/Origin, mas fixava o destino em `127.0.0.1:3333`, impedindo selecionar outra API isolada sem editar a configuração.
- Backend: ativar separadamente recebimento e consulta; configurar origem exata, transporte, aviso e chave HMAC própria. O banco precisa ter as migrations existentes e os privilégios restritos de Feedback. Não se presume que faltem tabelas no banco habitual: **ele não foi acessado**.
- Nenhuma dependência npm adicional é necessária. Prisma, pg, React, Vite e Recharts já estão instalados. Docker não respondeu: daemon indisponível. PostgreSQL **18.6** local permitiu um ensaio real em cluster novo; não substitui a homologação específica PostgreSQL 17/Docker da F4.

### Suíte antes de implementar

A suíte completa foi iniciada antes de editar arquivos versionados. Já nessa execução foi registrada a falha `busca nome/e-mail em admins e envia somente UUID à auditoria`, em `AdminAuditoria.test.jsx:116`: o teste procura uma `option` e um `select`, enquanto a reformulação local apresenta radios. Os outros 17 testes desse arquivo passaram.

As primeiras execuções integrais foram interrompidas por aparente ausência de progresso; não são apresentadas como suítes concluídas. A saída padrão desta versão pode permanecer silenciosa durante arquivos aprovados. A conferência complementar de todos os demais arquivos terminou com **887/887, 51 arquivos**, em 241,98 s. Os direcionados confirmaram novamente **17/18 no Histórico**. Assim, o estado confirmado é **904/905**, e não os 905/905 históricos da FUNC-0.2. A conclusão do subconjunto ocorreu após a edição de configuração; nenhum fonte/teste da aplicação mudou entre essas verificações. Não se alega uma execução integral concluída antes da edição.

Logs locais: [primeira execução](../.cache/fb_int_1/suite_antes.log), [51 arquivos](../.cache/fb_int_1/suite_inicial_sem_historico.log), [direcionados](../.cache/fb_int_1/direcionados.log). A falha do Histórico não foi escondida nem corrigida fora do escopo.

## Alterações

| Arquivo | Alteração e motivo |
| --- | --- |
| `frontend/vite.config.js` | Proxy público de Feedback aceita `FEEDBACK_PROXY_TARGET` do processo, com fallback original `http://127.0.0.1:3333`; `changeOrigin:false` preservado. Variável sem prefixo VITE, usada somente pelo servidor de desenvolvimento. |
| `frontend/Dockerfile` | `ARG`/`ENV VITE_FEEDBACK_ATIVO`, com padrão `false`, para build explicitamente habilitado em homologação isolada. |
| `frontend/.env.example` | Documenta o destino opcional do proxy, exportado no terminal; conserva a flag falsa. Não confundir essa variável com `VITE_API_BASE_URL`. |
| `backend/.env.example` | Corrige comentário que ainda dizia que a flag frontend era futura; flags backend continuam falsas. |
| Este relatório | Diagnóstico, evidências, reprodução e proposta FB-INT-2. |

Compose normal, Compose de testes, Dockerfile backend e os dois Nginx foram inspecionados e preservados. O Compose normal não encaminha as flags de Feedback: não é o procedimento de ativação desta entrega. O Compose de testes genérico usa bootstrap e não representa o ensaio de papéis mínimos da F4. O Compose exclusivo de Feedback e seus scripts históricos permanecem intactos.

Nginx já tem rotas próprias, limite de 16 KB, quotas, logs mínimos, remoção de Cookie/Authorization do POST público, preservação de Host, substituição de headers de proxy e `proxy_next_upstream off`. Nenhuma alteração foi necessária. HTTPS real e topologia definitiva ainda exigem homologação própria.

A conferência SHA-256 de **971 arquivos rastreados preexistentes** encontrou somente os quatro arquivos de configuração acima alterados. Preservados Histórico local, Home/+25/`heroDestaqueMock`, VIS/FUNC, Contato, Feedback, serviços, testes, schema, bytes/checksums de migrations e dependências. [Manifesto inicial](../.cache/fb_int_1/antes.json) e [integridade final](../.cache/fb_int_1/integridade.json), incluindo conferência de encerramento das portas 5558/3358/5238 e ausência dos segredos sintéticos nos arquivos de entrega.

## Contratos preservados

| Operação | Contrato e proteção |
| --- | --- |
| `POST /api/feedback` | JSON estrito `{tipo,mensagem,avisoVersao}`; ELOGIO/SUGESTAO/PROBLEMA; comentário NFC/CRLF/trim de 1–2.000 pontos Unicode; até 16 KB; Origin e Host exatos, transporte conferido, `X-Portal-Feedback: 1`, chave aleatória canônica de 32 bytes. `201` confirma commit, `200` replay. |
| `GET /api/admin/feedback` | Somente ADMIN; `inicio`, `fim`, `tipo?`, `pagina`, `limite`; lista não inclui mensagem. |
| `GET /api/admin/feedback/resumo` | Somente ADMIN; período/tipo e `granularidade=dia|mes`; `total`, `porTipo`, `serie` como strings decimais; `notas.disponivel=false`. |
| `GET /api/admin/feedback/:id` | Somente ADMIN; UUID sem query; mensagem apenas no detalhe. |

Consultas usam transações Repeatable Read READ ONLY, datas civis de São Paulo, até 366 dias e retenção técnica de 180 dias. Recibos duram 24 horas, sem renovação. Feedback/recibo são gravados atomicamente; unicidade e lock de transação protegem concorrência. A API possui SELECT/INSERT, sem UPDATE/DELETE nas tabelas de Feedback. Não foram criados campos, estados de atendimento, notas ou identificação obrigatória.

O formulário conserva aviso provisório, acessibilidade, foco, loading, sucesso, falha, resultado incerto, trava de envio duplo e decisão explícita antes de abandonar a chave. Payload/chave ficam somente em memória. `credentials:omit` permanece; não há JWT/cookie nem retry automático no cliente público. Suspender recebimento mantendo origem/chaves permite confirmar recibos; desligar consulta é independente. Não retirar chaves antigas antes da janela prevista pela operação F2.

## Ensaio real isolado

| Identidade | Valor |
| --- | --- |
| Banco/host/porta | `portal_test`, `127.0.0.1:5558` |
| PostgreSQL | **18.6** |
| Cluster | `7712578530882550764` |
| Diretório novo | `.cache/fb_int_1/pgdata` |
| API / frontend | `127.0.0.1:3358` / `http://127.0.0.1:5238` |
| Papel da API | `portal_api`, sem superuser/CREATEDB/CREATEROLE/BYPASSRLS |

Porta livre e diretório inexistente conferidos antes da criação. `initdb` com SCRAM, senhas sintéticas independentes; PostgreSQL restrito a loopback. Identidade/destino conferidos em READ ONLY. Backup do cluster vazio antes da preparação e dump custom antes dos usuários/envios. Aplicadas as **16 migrations existentes**, uma vez, pelo migrator; todos os nomes/checksums e conclusões conferidos. Nenhum reset, seed, restauração, alteração de SQL histórico ou acesso ao banco habitual.

Os scripts locais usam marcadores de início e recusam repetir preparação, fixtures ou envios. Replays são cenários explícitos de idempotência solicitados nesta etapa. Não houve repetição automática de escrita falhada. Dois usuários exclusivamente sintéticos, ADMIN e EDITOR, foram criados depois do backup. Segredos, dumps e credenciais permanecem ignorados em `.cache`; não estão neste relatório.

### Resultados funcionais

| Cenário | Resultado |
| --- | --- |
| Três tipos pelo formulário real | Três `201`; textos Unicode confrontados com SQL. |
| Submit duplicado na mesma ação | Uma requisição e um registro por contribuição. |
| Resposta interrompida **depois do commit real** | UI informou incerteza; SQL encontrou o quarto registro. |
| Reenvio explícito da tentativa incerta | `200`; permanecem quatro registros, sem duplicação. |
| ADMIN com login real | Lista/resumo/detalhe `200`; total e somas dos tipos/períodos = 4 nesse instante; detalhe corresponde ao SQL. |
| EDITOR / visitante | `403` / `401` em lista, resumo e detalhe. |
| API encerrada durante novo cenário | UI ofereceu reenvio e preservou comentário; sem nova gravação. Essa tentativa não foi repetida. |
| Origem inválida / tipo inválido / 2.001 caracteres / campo extra | `403` / `400` / `400` / `400`; nenhum desses corpos gerou registro. |
| Ensaio HTTP adicional válido e replay | `201` e `200`; apenas um registro adicional. |
| Quota por processo | `429`, sem gravação adicional. |
| Privilégios SQL | API SELECT/INSERT verdadeiros, UPDATE/DELETE falsos; operador de retenção sem SELECT da mensagem. |

**Estado SQL final: cinco feedbacks sintéticos e cinco recibos**, sendo dois elogios, duas sugestões e um problema. Os primeiros quatro vieram do navegador; o quinto, do ensaio HTTP. Não são mocks. [Identidade](../.cache/fb_int_1/identidade.json), [navegador](../.cache/fb_int_1/visual.json), [contratos/privilégios](../.cache/fb_int_1/contratos.json).

Na retomada, o cluster estava parado. Foi reiniciado exclusivamente pelo seu diretório, sem reaplicar migrations nem repetir envios. A conferência READ ONLY confirmou o mesmo identificador de cluster, as 16 migrations/checksums e os cinco registros/cinco recibos após o reinício.

## Validação automatizada e visual

Node **24.22.1** já existente em `.cache/d4_final/node24/node.exe`; dependências instaladas preservadas. Comandos em `cmd.exe`, a partir de `frontend`:

```bat
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Feedback.test.jsx test/feedbackPublicoApi.test.js test/AdminFeedback.test.jsx test/feedbackDashboard.test.js test/ContatoFoco.test.jsx test/ContatoGeometria.test.js test/AdminAuditoria.test.jsx test/formatarAuditoria.test.js --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
git diff --check
```

Backend pertinente, com ambiente de teste isolado e `DATABASE_URL` sentinela inacessível: `node --test --test-concurrency=1 test/feedback.test.js test/feedbackSeguranca.test.js test/feedback.integration.test.js`. O wrapper local é `.cache/fb_int_1/testar_backend.cjs`; não lê o `.env` habitual.

| Verificação | Resultado |
| --- | --- |
| Direcionados frontend | **222/223**, oito arquivos, 43,12 s; única falha preexistente no Histórico. |
| Suíte frontend integral final | **904/905**, 52 arquivos, 225,06 s, exit 1: mesma falha preexistente do Histórico; nenhuma falha adicional. |
| Backend pertinente | **16 aprovados**, zero falhas, um skip explícito: integração histórica exige PostgreSQL 17; 8,67 s. |
| PostgreSQL 18 real adicional | Navegador + API + SQL e testes HTTP acima aprovados. Não contabilizados como execução da suíte histórica PG17. |
| Lint frontend | Exit 0, sem mensagens. |
| Build frontend | Exit 0, 4,67 s; avisos mantidos de chunk >500 KB, import estático/dinâmico de `PatrimonioEditor` e tempo de plugins. Principal 751,20 kB, gzip 213,47 kB. |
| Diff | Exit 0; apenas avisos Git de futura normalização LF/CRLF. |

Logs: [backend](../.cache/fb_int_1/backend.log), [suíte final](../.cache/fb_int_1/suite_final.log), [lint](../.cache/fb_int_1/lint.log), [build](../.cache/fb_int_1/build.log).

Edge/Chromium headless em **320, 390, 768 e 1440 px**: um único formulário, três opções, canais institucionais preservados, sem overflow horizontal. Campo vazio foca o primeiro radio; comentário com 2.001 caracteres foca o textarea e informa o limite; essas validações não enviam POST. `/feedback` redireciona para Contato. Capturas de 320 e 1440 px inspecionadas visualmente. Zero exceções JavaScript no ensaio integrado. Erros de rede do Vite correspondem aos cenários deliberados de resposta perdida e API desligada.

| Largura | Formulário | Validação |
| --- | --- | --- |
| 320 | [captura](../.cache/fb_int_1/contato_320.png) | [captura](../.cache/fb_int_1/validacao_320.png) |
| 390 | [captura](../.cache/fb_int_1/contato_390.png) | [captura](../.cache/fb_int_1/validacao_390.png) |
| 768 | [captura](../.cache/fb_int_1/contato_768.png) | [captura](../.cache/fb_int_1/validacao_768.png) |
| 1440 | [captura](../.cache/fb_int_1/contato_1440.png) | [captura](../.cache/fb_int_1/validacao_1440.png) |

Também: [resultado incerto](../.cache/fb_int_1/resultado_incerto.png), [API indisponível](../.cache/fb_int_1/api_indisponivel.png), [roteiro integrado](../.cache/fb_int_1/visual.mjs). As evidências em `.cache` são locais e não acompanham um clone.

A configuração Vite final também foi exercitada sem substituir seu proxy no roteiro: flag local habilitada mostrou o formulário; um corpo inválido chegou à API 3358 e retornou 400. Sem flag e sem destino opcional, a página mostrou indisponibilidade, sem formulário, e o proxy voltou a 3333. [Resultado](../.cache/fb_int_1/configuracao.json), [log](../.cache/fb_int_1/configuracao_final.log).

## Como testar localmente

### Ambiente já preparado nesta máquina

Os processos de ensaio foram encerrados; dados e backups sintéticos ficaram preservados. Não executar novamente `preparar`, `fixtures`, `visual.mjs` ou `contratos.mjs`: esses roteiros já realizaram suas gravações. Para uso manual, iniciar somente os serviços abaixo. Todos os comandos partem da raiz do repositório, em **cmd.exe**; use terminais separados para API e frontend.

1. Iniciar apenas o cluster FB-INT-1, depois de confirmar que está parado:

```bat
.cache\d4_final\node24\node.exe .cache\fb_int_1\banco.cjs iniciar
.cache\d4_final\node24\node.exe .cache\fb_int_1\banco.cjs conferir
```

2. API real, restrita a loopback pelo iniciador local:

```bat
.cache\d4_final\node24\node.exe --env-file=.cache/fb_int_1/backend.env .cache/fb_int_1/servidor_local.mjs
```

3. Frontend, com o proxy apontando exclusivamente a essa API:

```bat
.cache\d4_final\node24\node.exe --env-file=.cache/fb_int_1/frontend.env frontend/node_modules/vite/bin/vite.js frontend --host 127.0.0.1 --port 5238 --strictPort
```

Abrir **http://127.0.0.1:5238/contato**. Usar esse host exato, não `localhost`, pois a origem é validada. Para consulta, abrir `/admin/login` e depois `/admin/feedback`. As contas sintéticas e a senha gerada estão **somente** no arquivo local ignorado `.cache/fb_int_1/acesso_local.env`. Não copiar credenciais para relatórios ou Git.

Esses comandos de API/Vite foram executados: health 200, Contato 200 e preflight de Feedback 204 através do proxy, sem novo POST. [Conferência manual](../.cache/fb_int_1/manual.json). O iniciador da API é local ao ensaio, sem worker operacional ou agendamento de retenção; não substitui o servidor de produção.

Encerrar API/Vite com Ctrl+C. Parar somente o cluster desta etapa, preservando seus arquivos:

```bat
.cache\d4_final\node24\node.exe .cache\fb_int_1\banco.cjs parar
```

### Variáveis para reproduzir em outro ambiente autorizado

| Processo | Variáveis |
| --- | --- |
| Vite | `VITE_FEEDBACK_ATIVO=true`; `FEEDBACK_PROXY_TARGET=http://127.0.0.1:3358`; `VITE_API_BASE_URL=http://127.0.0.1:3358/api`; `VITE_METRICAS_ATIVAS=false`. Reiniciar Vite após mudar. |
| API | `NODE_ENV=development` ou `test`; `MOCK_DATA=false`; `PORT=3358`; `CORS_ORIGIN=http://127.0.0.1:5238`; `FEEDBACK_ORIGEM=http://127.0.0.1:5238`; `FEEDBACK_TRANSPORTE=http-local`; `FEEDBACK_RECEBIMENTO_ATIVO=true`; `FEEDBACK_CONSULTA_ATIVA=true`; `FEEDBACK_AVISOS_ACEITOS=feedback-v1`; `FEEDBACK_CHAVE_ATUAL=<id-local>`. |
| Somente backend, armazenamento privado | `DATABASE_URL` do papel API no PostgreSQL exclusivo; `JWT_SECRET`, `AUTH_SECURITY_SECRET` independentes; `FEEDBACK_CHAVES_JSON=[{"id":"<id-local>","segredo":"<hex-aleatorio-de-32-bytes>"}]`. Placeholders não são valores utilizáveis. |

No cmd.exe, exportar `FEEDBACK_PROXY_TARGET` no processo (`set "FEEDBACK_PROXY_TARGET=http://127.0.0.1:3358"`) ou usar `node --env-file=...`; colocá-lo apenas em `.env.local` do Vite não o exporta para `process.env` desta configuração. O cliente administrativo usa `VITE_API_BASE_URL`; o cliente público continua relativo à origem. Não colocar chaves HMAC, URLs de banco, JWT ou senha em `VITE_*`.

O banco deve ser novo/exclusivo e conferido; seguir o procedimento F2/F4 para papéis, migrations existentes e backup. Não aplicar comandos de preparação ao banco compartilhado. Em homologação HTTPS, usar `FEEDBACK_TRANSPORTE=https`, origem HTTPS exata e proxy explicitamente confiável; não ampliar confiança nem desabilitar TLS para contornar falhas.

Para uma **imagem local de homologação**, o argumento agora aceito é:

```bat
docker build --build-arg VITE_API_BASE_URL=/api --build-arg VITE_FEEDBACK_ATIVO=true -t portal-feedback-homologacao ./frontend
```

Esse comando apenas constrói uma imagem com a interface habilitada; não configura backend, banco, certificados ou retenção e não deve ser usado para publicação definitiva. Sem o argumento, a imagem continua com Feedback desligado. Não executar `docker-compose.yml` normal como atalho: ele pode aplicar migrations em seu destino habitual.

## FB-INT-2 — proposta, sem implementação

Inspecionados `AdminFeedback.jsx`, `FeedbackDashboard.jsx`, `FeedbackGraficos.jsx`, `AdminDashboard.jsx`, `feedbackApi.js` e validadores associados. **Os endpoints atuais são suficientes** para integrar total, distribuição e evolução à Dashboard principal; não é necessário alterar o DTO da Dashboard V1, adicionar tabela ou criar endpoint público.

Proposta:

1. Acrescentar uma seção montada **somente para ADMIN**, usando o perfil já disponível em `useAuth`. EDITOR não deve disparar a requisição; backend permanece a autoridade com `authorize("ADMIN")`.
2. Consumir `resumirFeedback` de `feedbackApi.js`, com período inicial de 30 dias civis de São Paulo e granularidade diária/mensal. Reaproveitar `FeedbackDashboard`/`FeedbackGraficos` e seus validadores, tabelas acessíveis e lazy loading.
3. Tratar total como contribuições **retidas no período**, não visitantes únicos ou nota de satisfação. Conservar strings/BigInt, limites de precisão gráfica, indicação de períodos parciais e retenção; sem estimar zero em falhas ou consulta desativada.
4. Manter cancelamento, loading/erro/desativação próprios. A falha do Feedback não deve impedir acervo/métricas existentes. Mostrar instante de geração e link para `/admin/feedback`; não carregar mensagens ou lista completa na Dashboard.
5. Testar ausência de requisição para EDITOR/público, contratos reais, filtros, vazio legítimo, 401/403/503, retenção e acessibilidade responsiva. Não relacionar estes números aos denominadores V2 nem adicionar campos/estados de atendimento.

Nenhum gráfico novo foi implementado nesta etapa.

## Limitações e encerramento

- PostgreSQL 18.6 real foi validado; a suíte histórica de integração restrita a PostgreSQL 17 ficou em skip. Docker/Nginx/HTTPS não foram reexecutados; resultados históricos F4 não são reapresentados como evidência nova.
- Não foi interrompido o PostgreSQL durante um envio. A indisponibilidade integrada exercitada foi da API/transporte; os testes existentes cobrem tratamento adicional de erros e estados do cliente.
- Edge headless exigiu execução fora do sandbox após `Runtime.enable` expirar. O início do PostgreSQL também exigiu sair do sandbox por erro do token restrito do Windows. As aprovações automáticas permitiram as ações; não houve rejeição de aprovação. Destinos permaneceram exclusivos/loopback.
- Uma tentativa do roteiro de configuração parou em um seletor inválido antes de POST; corrigido somente o roteiro temporário. Não confundir falhas do harness com falha de persistência.
- Sem aparelho físico, leitor de tela, zoom nativo, teste de carga ou nova homologação institucional. Destinos externos dos canais foram preservados, sem enviar mensagem a terceiros.
- A falha preexistente do teste do Histórico permanece explícita; sua atualização à interface de rádio pode ser tratada em etapa própria, preservando a nova busca.
- Aviso institucional, fundamento, responsáveis, retenção/exclusões, backups/restauração e operação definitiva continuam pendentes de aprovação. Flags versionadas permanecem falsas; esta entrega **não autoriza ativação pública**.
