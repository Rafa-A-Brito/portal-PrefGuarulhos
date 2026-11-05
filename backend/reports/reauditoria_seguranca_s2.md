# S2 — Reauditoria consolidada de segurança

Data: **05/11/2026**, America/Sao_Paulo. Escopo exclusivamente diagnóstico. Referência: branch `development/backend`, HEAD e referência local `origin/development/backend` em `01190d6bd7aab8d2f397823aa596c0c329e2458c`.

## 1. Resumo executivo

**C2.1 e C2.2 estão incorporadas ao código atual.** O reaproveitamento de credenciais após desativar/reativar, comprovado na C2, foi corrigido pela invalidação transacional da C2.1. As duas FKs de autenticação agora declaram `onUpdate: NoAction`, coerente com as migrations. Não há recomendação de reabrir essas correções nem de alterar migrations históricas.

**Não foi identificado P0 no escopo inspecionado. Isso não certifica o ambiente publicado.** As prioridades antes de publicação são conferir TLS e a cadeia de proxies; restringir os privilégios de adulteração do AuditLog; estabelecer coleta independente, retenção e restauração; e preparar os papéis/procedimentos de métricas e Feedback antes de qualquer ativação. Armazenamento de tokens acessível a JavaScript, ausência de CSP no HTML e ausência de MFA permanecem riscos arquiteturais, sem XSS ou tomada de conta demonstrados nesta etapa.

Os audits dos locks reproduziram **5 moderadas no backend e 4 no frontend**, todas associadas à cadeia de `minimatch`. Ambos os audits com `--omit=dev` retornaram zero. A imagem backend, porém, instala também devDependencies; zero na árvore de produção npm não significa ausência do pacote vulnerável nessa imagem. Não há correção que satisfaça diretamente todas as faixas transitivas atuais; nenhuma dependência foi atualizada.

### Evidência e limites

| Nível | Evidência utilizada | Limite |
| --- | --- | --- |
| E1 — estática atual | Código, SQL, manifests/locks, Dockerfiles, Nginx, workflow, testes e documentos versionados; inventário e comparação das 12 migrations com HEAD | Não comprova grants, configuração, dados ou exploração no destino real |
| E2 — histórica | S1, C1, C2, C2.1, C2.2, D4, auditoria/logs, H1/H2 e documentos operacionais/F4 | Resultados anteriores, não reexecutados em S2 |
| E3 — consulta remota atual | API pública do GitHub confirmou run `41961975924`: `completed/success`, branch e SHA indicados; advisory GitHub e metadados públicos npm consultados | Não foram baixados logs completos do CI nem inspecionado o deploy |
| E4 — diagnóstico de dependências | Quatro `npm audit --package-lock-only --ignore-scripts --json`, completos e `--omit=dev`, em 05/11/2026 | Fotografia da base de advisories; não é teste de exploração, imagem/SO ou aplicação |

Os **636 testes backend, 619 frontend e 12 migrations validadas** são a referência fornecida e corroborada pelos relatórios C2.1/C2.2; o sucesso remoto do SHA foi reconfirmado pela [API do Actions](https://api.github.com/repos/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41961975924). Os contadores não foram extraídos novamente dos logs remotos. [Execução de referência](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41961975924).

Não houve conexão a **nenhum banco**, inclusive `patrimonio_guarulhos`, nem execução de testes, lint, build, Vite, Docker, Compose, migrations, seeds ou importadores. Não foram lidos `.env` privados, alterados código/locks/flags, ativados recursos, feitos commits/push ou deploy. S3 permanece dependente de revisão e autorização próprias.

## 2. Situação dos achados históricos

Documentos confrontados: [segurança inicial](../docs/SEGURANCA.md), [autenticação](../docs/AUTENTICACAO_E_CARGAS.md), [sessões renováveis](../docs/SESSOES_RENOVAVEIS.md), [D4](auditoria_d4.md), [auditoria e logs](auditoria-validacao.md), [S1](estabilizacao_seguranca_ci_s1.md), [C1](auditoria_consolidada_modulos_c1.md), [C2](diagnostico_sessoes_fks_c2.md), [C2.1](correcao_sessoes_c21.md), [C2.2](alinhamento_fks_c22.md), [H1](historico_alteracoes_h1.md), [H2](historico_alteracoes_h2.md) e [F4](feedback_fase_f4_homologacao.md). Relatórios históricos foram preservados, inclusive afirmações válidas somente em seus respectivos snapshots.

| Observação anterior | Situação S2 e confronto atual |
| --- | --- |
| C1/C2: credenciais voltam a funcionar após reativação | **Corrigida.** `adminService.js:135–154` incrementa versão e revoga sessões nos dois sentidos, com AuditLog na mesma transação. C2.1 registra testes HTTP, concorrência e rollback. |
| C1/C2: `ON UPDATE` divergente em duas FKs | **Corrigida declarativamente.** `schema.prisma:101,113` usa NoAction; migration de sessões omite ON UPDATE, conservando NO ACTION. C2.2 registra diff vazio em descartável; não há necessidade demonstrada de migration corretiva. |
| Senha alterada sem invalidação durável | **Superada no código.** `authService.js:88–103`: hash, incremento, revogação e auditoria atômicos. |
| JWT sem sessão revogável/refresh rotativo | **Superada.** Sessão persistente, access token curto, refresh de uso único, replay revoga a família e vencimento absoluto não se estende. |
| Login sem proteção adequada; confiança ampla no proxy | **Mitigada no código/configuração prevista.** Limites por IP e IP+conta, agrupamento IPv6 e peer explícito. Réplicas, proxy final e ataques distribuídos continuam pendentes. |
| Upload por parser frágil, caminhos e arquivos privados expostos | **Mitigada nas rotas gerenciadas.** Busboy com limites/streaming, nomes gerados, conferência de caminhos, autorização por vínculo/status e cache privado. Antimalware e inventário dos assets públicos não foram resolvidos por isso. |
| API com credencial administrativa/DDL | **Separação prevista implementada para bootstrap novo.** API e migrator distintos, API sem CREATE e sem acesso ao histórico Prisma após wrapper. Grants efetivos em instalação existente continuam não confirmados; CRUD amplo ainda permite adulterar AuditLog. |
| Ausência de auditoria persistente e da tela de Histórico | **Superada para operações mapeadas.** Registrador transacional, consulta ADMIN e interface H1/H2 existem. Não equivalem a trilha independente de segurança. |
| Auditoria PostgreSQL não ensaiada por indisponibilidade de Docker | **Pendência histórica superada em descartáveis posteriores.** D4/C2.1/C2.2 registram integrações reais; S2 não repete nem estende essa prova à produção. |
| D4: dependências zeradas; S1: seis moderadas por projeto | **Fotografias históricas.** Hoje: 5/4 moderadas. `follow-redirects` permanece em 1.16.2, correção S1 preservada. Mudança de contagem não é correção de minimatch nem prova de novas falhas independentes. |
| C1: HTTPS, retenção, backups, tarefas, chaves e papéis operacionais | **Permanecem dependências de implantação.** Arquivos de exemplo e homologação isolada não comprovam instalação no destino. |
| Relatório geral de 31/10: Histórico/Feedback futuros; 11 migrations | **Descrição superada.** Histórico e Feedback F1–F4 estão no checkout; trilha principal tem 12 migrations. As flags continuam desligadas por padrão. |
| Tokens no storage; CSP/MFA; coleta confiável dos logs | **Riscos remanescentes.** Classificados abaixo, sem transformar possibilidade de XSS/abuso em exploração comprovada. |
| C1: resposta tardia na edição de usuário | **Hipótese de robustez ainda não confirmada.** `AdminUsuarios.jsx:85` não possui a mesma guarda de cancelamento da lista. Não foi demonstrado vazamento ou bypass; manter ensaio de navegação/logout/resposta atrasada como P2, sem modificar autenticação. |

## 3. Matriz de segurança atualizada

Tipos: **V** = vulnerabilidade conhecida confirmada na versão/configuração analisada; **A** = risco arquitetural demonstrado pelo desenho; **O** = pendência operacional; **H** = hipótese que exige confirmação. Um grant previsto não prova que foi aplicado no banco real. Prioridades: **P0** exige contenção imediata de comprometimento/impacto crítico demonstrado; **P1** deve ser resolvida ou ter controle compensatório formal antes da exposição afetada; **P2** exige evolução planejada e responsável; **P3** é melhoria de baixo impacto. Não há P0 atribuído.

### Evidência, impacto e condições

| ID / tipo | Evidência técnica | Impacto e condição/probabilidade | Ambiente e prioridade justificada |
| --- | --- | --- | --- |
| S2-01 — A | `infra/postgres/10-roles.sh:18` concede CRUD padrão; não há revogação específica de UPDATE/DELETE em `audit_log`. Mesmo grant alcança usuários e sessões. | Credencial/processo da API comprometido pode alterar/apagar eventos e dados de identidade; requer acesso SQL/API comprometida, não disponível ao visitante por endpoint de auditoria. Alta consequência, probabilidade condicionada. | Banco provisionado assim; **P1**, pois compromete a evidência de incidentes. Grants reais são O. |
| S2-02 — O | Nginx `listen 80`, sem TLS/HSTS; `$scheme` e `$remote_addr` substituem dados de um eventual proxy anterior. | Credenciais em HTTP se publicado sem terminação segura; com TLS externo mal integrado, IPs colapsam e Feedback/V2 recusam HTTPS. Destino desconhecido, falha de topologia plausível. | Publicação; **P1** antes de autenticação pública ou ativação. Não se afirma tráfego real em claro. |
| S2-03 — A/O | `logger.js:23–28,63–77`: saída sem garantia de entrega; Compose sem rotação/coletor definido; AuditLog sem requestId/sessão. | Perda de evidência, crescimento de disco e investigação incompleta diante de falha/recriação; depende do runtime. | Operação; **P1** para coleta/retenção, **P2** para enriquecer correlação. |
| S2-04 — O | Guias exigem backup/restauração coordenados; mídias usam compensação; não há prova S2 de restauração no destino. | Perda de dados/arquivos, retorno de registros expirados ou de sessões antigas ao restaurar. Probabilidade não mensurada, impacto alto. | Publicação/recuperação; **P1** para procedimento ensaiado e responsáveis. |
| S2-05 — A | `AuthContext.jsx:112–115` guarda access+refresh em sessionStorage; HTML Nginx sem CSP/antiframe. | Script malicioso na mesma origem pode roubar ambos; framing pode facilitar ações induzidas. XSS não encontrado; exploração depende de injeção, terceiro comprometido ou enquadramento da página. | Navegador administrativo; **P2**; não há payload executável demonstrado. |
| S2-06 — A | Login somente senha; `updateAdmin` não exige autenticação recente nem revoga sessão ao mudar perfil. Chave JWT única sem keyring. | Phishing/roubo de sessão dá poder do usuário; sessão de EDITOR promovido passa a ter ADMIN na próxima consulta. Rotação apenas do JWT não revoga refreshes. | Administração; **P2**, com decisão institucional prévia sobre MFA/step-up e resposta a incidente. |
| S2-07 — A | Maps locais em login/Feedback/métricas; quotas Nginx locais à instância; sem limiter específico em logout/senha e sem quota geral de leitura. | Réplicas/reinícios multiplicam orçamento; redes distribuídas contornam IP+conta; tráfego pode consumir CPU/banco. Não houve carga/DoS em S2. | API/gateway; **P2** em instância única, **P1 antes de escalar/ativar ingestão sem quota global**. |
| S2-08 — A/O | `permissoes_metricas.sql` é externo às migrations; wrapper normal só revoga `_prisma_migrations`. Bootstrap não monta os papéis operadores. | Se usado apenas o caminho normal, API conserva CRUD das tabelas V2 e operador não fica pronto; adulteração de totais/sondas/retenção após comprometimento. | V2 futuro; **P1 antes da ativação**, sem indicar módulo atualmente ligado. |
| S2-09 — O | `descartar_feedback.js:12,18,51–55` bloqueia nome real, aceita só PG17, exige backup; nenhum agendamento instalado pelo script. | Mensagens vencidas deixam de aparecer, mas podem permanecer fisicamente e nos backups. Rotina atual não pode ser anunciada como pronta no banco nominal. | Feedback futuro; **P1 antes de receber dados**, depende de procedimento institucional. |
| S2-10 — A | `authService` cria sessões/refreshes; não foi localizada rotina operacional de purga dessas tabelas nem teto de sessões simultâneas. | Acúmulo de hashes/metadados e custo de consulta/backup; cresce com uso legítimo ou conta abusada. Expiração continua sendo checada. | Backend/banco; **P2**, risco de retenção/capacidade, não refresh eterno. |
| S2-11 — A | Assinaturas de uploads verificam marcadores; DOC/ZIP/PDF não são analisados integralmente. | Arquivo malicioso fornecido por conta editorial pode atingir quem o abre. Não há upload anônimo nas rotas analisadas. | Upload/download; **P2**, exige conteúdo malicioso e ação/exposição do leitor. |
| S2-12 — V | Lock em minimatch 10.2.6, advisory `GHSA-g3hv-75wg-m249`; quatro audits atuais. | Amplificação de CPU/memória sob padrão controlado e `optimizationLevel >= 2`; não encontrado caminho de requisição pública a esse matcher. | Dev/CI e pacote presente na imagem backend; **P2**, alcance condicionado, sem falha alta/crítica nos audits. |
| S2-13 — H/O | `backend/Dockerfile:9` usa `COPY . .`; `.dockerignore` não exclui genericamente backups/cache dentro de backend. Tags de imagens mutáveis; sem scan de SO demonstrado. | Contexto local futuro pode embutir material privado; tag pode mudar o artefato. Não foi encontrado/extraído segredo real nem examinada imagem construída. | Build/registro/runtime; **P2** para validar contexto e imagem. |
| S2-14 — O | Assets em `frontend/public`, `frontend/src/assets` e `/arquivos/patrimonios` são públicos por distribuição; `/api/docs` aberto. | Arquivar registro não recolhe cópia pública embutida no frontend; docs divulgam contratos. Nenhuma informação privada específica comprovada. | Conteúdo publicado; **P3** para inventário/classificação; elevar se houver material restrito. |

### Tratamento proposto, regressão e decisão

Todos os testes abaixo são **necessários em futura etapa autorizada**, não executados nesta auditoria.

| ID | Correção/controle recomendado | Testes e aceite específicos | Regressão / decisão institucional |
| --- | --- | --- | --- |
| S2-01 | API com SELECT/INSERT no AuditLog, sem UPDATE/DELETE; grants explícitos por tabela; coletor independente com acesso segregado. | Provar negação de UPDATE/DELETE/TRUNCATE/DDL/SET ROLE, INSERT+rollback, leitura ADMIN e concessões de objetos futuros. | Alta atenção a importadores/recuperação/FKs; DBA e custodiante dos registros devem aprovar retenção e privilégios. |
| S2-02 | Desenhar terminação HTTPS, peers reais e cabeçalhos em cada salto; HSTS após validar domínio/certificado. | HTTP→HTTPS, cookies, spoofing de XFF/Proto, acesso direto e 4xx/5xx pela cadeia final. | Pode bloquear Feedback/Maps/mídias e afetar IP de NAT; infraestrutura define domínio, certificado e topologia. |
| S2-03 | Coletar stdout+stderr com rotação, alerta e retenção fora do poder de exclusão da API; especificar eventos de acesso sensível e correlação sem tokens. | Falha de sink, restart, disco cheio, busca por requestId, ausência de conteúdo/segredos; integridade e acesso do coletor. | Mudanças de schema/eventos têm risco médio; definir prazos e quem consulta/exporta. |
| S2-04 | Backup consistente de banco+uploads+quarentena, acesso segregado, restauração isolada e plano de invalidação de sessões recuperadas. | Restauração integral, checksums, referências de mídia, descarte pós-restauração, tempo/perda admissíveis. | Alto impacto operacional; definir RPO/RTO, responsável e autorizações sem automatizar restauração real. |
| S2-05 | CSP progressiva no HTML, proteção de framing; avaliar arquitetura de credenciais com refresh HttpOnly ou BFF em proposta separada. | XSS por campos/URLs, CSP report-only→enforcement, Maps/Swagger/blob, refresh/abas/logout e CSRF se houver cookies de auth. | Médio/alto: mudanças de contrato e origem; não migrar cookies silenciosamente. |
| S2-06 | MFA para ADMIN e step-up para gestão de contas, elevação de perfil e operações críticas; plano explícito de revogação/rotação. | Desafio expira/uso único, recuperação, enrolamento/troca de fator, replay, promoção/rebaixamento e regressão C2.1. | Alto: fluxo de acesso/recuperação; instituição escolhe fatores, custódia e suporte. |
| S2-07 | Quotas coordenadas ou gateway compartilhado; orçamento de endpoints caros e proteção proporcional contra ataques distribuídos. | Duas réplicas, restart, IPv6, NAT, saturação, Retry-After, disponibilidade do armazenamento de contadores. | Pode recusar usuários legítimos; calibrar capacidade e política antiabuso. |
| S2-08 | Provisionar/revisar papel V2 e aplicar grants mínimos em procedimento separado antes de habilitar; fechar privilégios de tabelas futuras. | API sem DELETE de recibos/totais nem escrita em sondas/controle; operador sem usuários/Feedback/AuditLog e sem DDL. | Médio; operador precisa continuar retendo/sondando. DBA/operador aprovam destino e segredo. |
| S2-09 | Definir operação compatível com destino/versão autorizados, agenda, aviso e tratamento de backups/exclusões; preservar guardas até revisão. | Negação de destino incorreto, descarte em lotes, retenção de recibos, falha sem retry, restauração com expurgo reaplicado. | Alto por exclusão física; prazos, equipe e política institucional obrigatórios. |
| S2-10 | Política de expurgo de sessões vencidas/revogadas e refreshes associados, por operador restrito; avaliar limite de sessões. | Não apagar família ainda válida nem perder detecção de replay; concorrência, batches, FKs e índices. | Médio; prazo de investigação e impacto em usuários devem ser aprovados. |
| S2-11 | Decidir scanner/quarentena de recebimento ou tratamento de formatos ativos; validar documentos fora da origem administrativa quando viável. | Arquivos de teste inofensivos, formatos válidos, quotas, indisponibilidade do scanner e publicação só após aprovação. | Médio/alto: pode rejeitar acervo válido; curadoria define formatos e responsabilidade. |
| S2-12 | Acompanhar consumidores compatíveis; avaliar mudança isolada e separar imagem runtime das ferramentas. Não usar fix forçado. | Globs/ignores lint, watch nodemon, locks, quatro audits e regressões pertinentes à solução aprovada. | Médio para major/override/downgrade; mantenedor aceita risco temporário com prazo. |
| S2-13 | Inventário do contexto, exclusões específicas, imagens verificadas/fixadas e scan do artefato; NODE_ENV de produção explícito. | Inspeção de camadas sem imprimir segredos, conteúdo mínimo, non-root/read-only, scan SO e healthchecks. | Médio: Prisma/migrate precisam continuar disponíveis na imagem apropriada; infraestrutura define atualização. |
| S2-14 | Classificar assets como públicos e decidir acesso à documentação; manter dados privados fora de bundles. | Conferir lista de arquivos distribuídos e comportamento após arquivamento; ausência de dados reais nos exemplos OpenAPI. | Baixo; curadoria decide publicidade, equipe técnica decide documentação. |

## 4. Revisão de autenticação

### Login, refresh, logout e senha

Fontes centrais: [authService.js](../src/services/authService.js), [authenticate.js](../src/middlewares/authenticate.js), [accessService.js](../src/services/accessService.js), [token.js](../src/utils/token.js), [authRoute.js](../src/routes/authRoute.js) e [adminService.js](../src/services/adminService.js).

- Login normaliza e-mail e retorna erro genérico; conta ausente/inativa usa hash fictício bcrypt custo 12. Após verificar senha, bloqueia usuário e relê atividade, hash e versão antes de emitir sessão. Novas senhas exigem 12 caracteres e máximo 72 bytes UTF-8; login conserva compatibilidade com senhas antigas dentro do limite de bytes.
- JWT tem HS256 explicitamente permitido, UUIDs `sub/sid`, versão inteira e `exp`; acesso padrão de 300 s, máximo configurável de 1.800 s. Sessão absoluta padrão de 8 h, máximo configurável de 24 h. O middleware consulta usuário/sessão a cada autenticação; não confia no perfil salvo no navegador. A ausência de issuer/audience explícitos recomenda segredos exclusivos por aplicação/ambiente; não constitui por si só bypass demonstrado neste portal.
- Refresh opaco tem 32 bytes aleatórios; somente SHA-256 é persistido. Lock do usuário, releitura e consumo condicional impedem duas rotações normais do mesmo token. Reuso confirma revogação da família antes de responder 401. O prazo absoluto não se renova. A família mantém tokens consumidos para detectar replay.
- Logout identifica família pelo refresh, revoga e é idempotente. Não requer JWT porque a própria credencial opaca autoriza encerrar sua sessão. O frontend limpa a sessão local antes da chamada; falha de rede vira `logoutLocal`, sem afirmar revogação remota. Enquanto não houver confirmação, credenciais copiadas podem continuar válidas até revogação/expiração.
- Troca de senha exige a senha atual, rejeita igualdade e realiza hash/versão/revogação/AuditLog de forma consistente. Erro de auditoria reverte a transação. Não há endpoint geral de recuperação de senha ou MFA implementado nesse fluxo.

### C2.1 preservada e permissões

`changeAdminStatus` usa locks em ADMINs ativos e alvo, ordenados por UUID, com ReadCommitted. Mudança efetiva incrementa `tokenVersion`, revoga sessões com `revokedAt=null` e registra `USER_ACTIVATE/DEACTIVATE`. Reativação não limpa revogação antiga. Pedido repetido é no-op. Autodesativação, auto-rebaixamento e remoção do último ADMIN continuam protegidos. Os testes `adminStatusSessions.integration.test.js` e as evidências C2.1 cobrem concorrência e rollback; foram inspecionados como referência, não executados.

O efeito é sobre verificações de autenticação posteriores ao commit. Um handler que já passou pelo middleware pode terminar; escritas diretas SQL não recebem automaticamente a política do serviço. Isso já é limite declarado da C2.1 e não deve ser corrigido incidentalmente na S2/S3 sem novo escopo.

| Ação | Permissão efetiva |
| --- | --- |
| Gestão de contas, Histórico, consulta administrativa de Feedback | ADMIN |
| Dashboard V1/V2, própria senha, leitura administrativa de regiões | ADMIN/EDITOR |
| Criação/edição patrimonial e editorial | ADMIN/EDITOR; serviços limitam EDITOR a rascunhos, relendo status sob lock |
| Publicar/arquivar; excluir exposições/novidades e mídias | ADMIN |
| Fatos/ligações: inclusive excluir/reordenar | ADMIN/EDITOR, com regra de rascunho; exceção à frase genérica “todo DELETE é ADMIN” |
| Região: criar/editar | ADMIN |

Mudança de perfil é observada no próximo pedido, pois o perfil vem do banco. Rebaixamento não conserva o papel antigo por causa do JWT. Por outro lado, promoção não exige novo login e aproveita sessões existentes; eventual exigência de step-up ou revogação por promoção é decisão nova, distinta da correção C2.1.

### Frontend, XSS e CSRF

[AuthContext.jsx](../../frontend/src/context/AuthContext.jsx) e [api.js](../../frontend/src/services/api.js) guardam access+refresh em **sessionStorage**, não em cookie HttpOnly. Coordenam uma renovação por sessão, rejeitam respostas atrasadas e evitam repetir refresh cujo resultado ficou incerto. Reenvio do pedido original só ocorre uma vez após `ACCESS_TOKEN_EXPIRED`, emitido antes dos efeitos de negócio.

A busca nos fontes por `dangerouslySetInnerHTML`, `innerHTML` e `insertAdjacentHTML` não encontrou esses sinks. Histórico e Feedback exibem texto React; URLs do Histórico têm allowlist. Isso reduz caminhos evidentes, mas não é prova de ausência universal de XSS, inclusive por bibliotecas, scripts externos ou URLs em outras superfícies. Qualquer JavaScript da mesma origem continua podendo ler o storage. A API adicionar headers não protege automaticamente o documento HTML servido pelo Nginx.

Autenticação Bearer e refresh no corpo JSON não são enviados automaticamente pelo navegador de outra origem. Não há fundamento para declarar CSRF administrativo clássico somente pela ausência de token CSRF. CORS tampouco autentica clientes não navegador. Se no futuro refresh/autenticação forem para cookies, revisar SameSite/Secure/HttpOnly, origem, preflight e proteção CSRF conjuntamente. HttpOnly reduz extração do token, mas XSS ativo ainda pode executar ações na origem.

O cookie de **métricas** é outro mecanismo: `__Host-portal_metricas`, HttpOnly, Secure em HTTPS, SameSite=Lax, Path=/ e validade diária. Não autentica ADMIN. O router exige origem, header de finalidade e transporte; Feedback usa cliente separado com `credentials:omit`.

### MFA, step-up e rotação

MFA é tecnicamente viável, mas não existe campo/fluxo de desafio, enrolamento ou recuperação no desenho atual. Recomenda-se proposta separada: MFA de ADMIN, preferencialmente fator resistente a phishing quando viável; step-up breve para promover contas, gerenciar fatores e executar ações críticas. Revalidar a mesma senha é autenticação recente, não um segundo fator. Exigir prova no backend vinculada à sessão/ação, com expiração e consumo, mantendo tokenVersion, revogação e prazo absoluto existentes. [Referência OWASP de MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).

Decisões necessárias: custódia de dispositivos/fatores, recuperação e perda, contas de emergência, suporte e quem pode promover ADMIN. Testar que recuperação/troca de fator não contorna a proteção e que uma sessão roubada não basta para cadastrar outro fator. A prioridade é P2 pela ausência de comprometimento demonstrado; a instituição deve decidir antes de expor administração se aceita senha única ou exige MFA/controle de acesso compensatório.

Trocar `JWT_SECRET` invalida assinaturas antigas, **mas não revoga os refreshes opacos persistidos**: `refresh()` verifica a sessão e pode emitir JWT com a chave nova. Um procedimento de incidente precisa distinguir rotação de assinatura de encerramento de sessões e troca de senha. Não foi localizado runbook completo nem keyring para rotação gradual; nenhuma credencial foi gerada, lida ou modificada em S2.

## 5. Revisão das permissões PostgreSQL

### Privilégios previstos, não privilégios observados em banco

| Papel / conjunto | Previsão estática | Avaliação |
| --- | --- | --- |
| `portal_api` | LOGIN, NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS; USAGE public, CRUD padrão nas tabelas do migrator, USAGE/SELECT de sequências | Separação de DDL positiva, mas acesso amplo a `users`, hashes, sessões, conteúdo e `audit_log`. ADMIN/EDITOR são perfis da aplicação; não são papéis SQL separados. |
| `portal_migrator` | CREATE no banco/public e propriedade dos objetos criados; credencial no serviço `migrate` | Necessário ao trilho, privilegiado em relação à API. Não pode ser credencial de execução diária nem membro herdado pela API. |
| `_prisma_migrations` | `migrate-deploy.js:16` revoga ALL da API após CLI bem-sucedido | Proteção depende de usar o wrapper; executar CLI diretamente não inclui essa revogação. Falha do wrapper impede dependência de inicialização do backend no Compose. |
| Métricas — API após SQL específico | SELECT/INSERT em únicos; SELECT/INSERT/UPDATE em totais; SELECT em sondas/controle/dias conferidos | Mínimo definido por função. Sem aplicar esse SQL, defaults CRUD permanecem; migrations V2 não fecham esses grants sozinhas. |
| `portal_metricas_operador` | SELECT/DELETE nos recibos/totais; CRUD em sondas/controle/dias; sem usuários/Feedback por grants previstos | Segrega retenção/sonda da API, porém possui poder de alterar evidência operacional V2. Proteger credencial e registrar execução. |
| Feedback — API | SELECT/INSERT em `feedback` e `feedback_recibo`; migration revoga CRUD padrão atomicamente se papel existir | Mais restrito que o padrão geral. Necessidade de ler mensagens ADMIN não dá à API direito de apagá-las. |
| `portal_feedback_operador` | SELECT somente de IDs/chaves de identificação e expiração; DELETE em ambas as tabelas | Não lê mensagem, tipo, aviso, HMAC de conteúdo ou usuários. Esse recorte depende do bootstrap/grants, sem membership adicional. |
| Administrador/DBA | Provisiona papéis, gerencia owners, backups e identidade do cluster | Segregação institucional; dono e superusuário continuam capazes de alterar objetos/dados, mesmo com API restrita. |

Fontes: [bootstrap](../../infra/postgres/10-roles.sh), [papel métricas](../../infra/postgres/20-metricas-role.sh), [papel Feedback](../../infra/postgres/30-feedback-role.sh), [grants métricas](../scripts/sql/permissoes_metricas.sql), [grants Feedback](../scripts/sql/permissoes_feedback.sql), [wrapper](../scripts/migrate-deploy.js). Privilégios do proprietário e de membros são distintos de grants diretos; por isso a confirmação futura deve incluir owners, membership e privilégios de PUBLIC. [Documentação PostgreSQL](https://www.postgresql.org/docs/17/ddl-priv.html).

Não há política RLS separando ADMIN/EDITOR nas tabelas analisadas, nem serviço SQL independente de escrita da auditoria. Não é evidência de bypass HTTP, mas define o alcance de um comprometimento da API. Reduzir privilégios deve considerar importadores e recuperação: revogar UPDATE/DELETE do AuditLog não impede um escritor autorizado de inserir evento falso, e não impede owner/superuser. Trilha independente exige custódia fora desse mesmo domínio de controle.

O Compose normal monta apenas `10-roles.sh`; scripts init só rodam em **volume novo**. Não removê-lo para “aplicar permissões”. O bootstrap de Feedback é expressamente voltado ao descartável. Inventário real de grants, ownership, CONNECT/TEMP de PUBLIC, funções, secrets e acesso de backup permanece pendente; S2 não fez consulta SQL, nem READ ONLY.

### Integridade das 12 migrations

Inventário da **trilha principal**, sem misturar `prisma/lineages/equipe`:

| Migration | Garantias/escopo estático relevante |
| --- | --- |
| `20260929230000_initial_schema` | Usuários, catálogo, relações, AuditLog, PKs/FKs e índices; FK do ator com ON DELETE SET NULL |
| `20260930120000_add_demolido_situacao` | Evolução do enum de conservação |
| `20261005004508_categorias_adicionais` | PK composta, FKs e índice de categoria |
| `20261006014922_adicionar_detalhes_e_heroes` | FK de detalhe, índice de ordem e unicidade da página Hero |
| `20261006180000_exposicoes_novidades` | Slugs únicos, FKs de autoria e índices de publicação/data |
| `20261014010000_add_fatos_ligacoes` | CHECKs de texto/ordem, proibição de autorrelação, pares/ordens únicos e FKs |
| `20261016120000_add_regioes_numero_ordem` | FK de região, número único positivo, ordem não negativa e índices; transação explícita |
| `20261020190000_add_user_token_version` | Versão inteira não negativa |
| `20261021130000_add_auth_sessions` | FKs CASCADE/NO ACTION, hash único/hex, versão não negativa e expiração posterior à criação; transação explícita |
| `20261026120000_add_visualizacoes_metricas` | PKs de deduplicação/agregado, FKs RESTRICT, quantidade não negativa, hash hex e janela de sonda |
| `20261027120000_add_operacao_metricas` | Controle singleton, limites de retenção coerentes e selo diário |
| `20261102120000_add_feedback` | CHECKs de texto/tempo/digests, índices de consulta/expiração, recibo único e FK SET NULL; fechamento de grants na transação |

Foram calculados SHA-256 dos 12 blobs Git e comparados os arquivos de trabalho ao HEAD, normalizando **somente CRLF/LF** para a comparação textual: **12/12 iguais**, sem edição de migrations. Isso comprova correspondência ao checkout de referência; não é conferência de checksums de `_prisma_migrations` de nenhum banco. O alinhamento C2.2 é visível em `schema.prisma:101,113`; a prova executável de diff vazio é histórica C2.2.

Nem todo arquivo histórico contém BEGIN/COMMIT explícitos; sua mera presença no repositório não comprova comportamento em falha parcial. A preparação e os checksums aprovados nos descartáveis/CI não substituem identificar a trilha e versão do destino. Há registro histórico de PostgreSQL 18.6 no acervo real, enquanto CI/guardas operacionais usam 17.x; a versão atual real não foi confirmada. Não inferir equivalência de implantação nem mudar o trilho da equipe.

Locks/constraints trabalham juntos: autenticação serializa por usuário; gestão preserva último ADMIN; publicação usa advisory lock de numeração; fatos/ligações têm unicidade; Feedback usa lock por digest e recibo único; métricas usam PK de deduplicação e agregado na transação. Índices de usuário/sessão/hash, status, período/entidade do AuditLog e expiração do Feedback estão presentes. Não foi feito EXPLAIN/carga, nem proposta de índice sem medir. Purga de sessões e paginações profundas requerem avaliação de volume, não alteração estética de schema.

## 6. Auditoria administrativa e logs

### Eventos efetivos e atomicidade

As chamadas nos serviços, e não apenas as constantes, comprovam os seguintes emissores:

| Recurso | Eventos AuditLog efetivamente emitidos |
| --- | --- |
| Usuário/senha | USER_CREATE, USER_UPDATE, USER_ACTIVATE, USER_DEACTIVATE, USER_PASSWORD_CHANGE |
| Patrimônio | PATRIMONIO_CREATE/UPDATE/PUBLISH/ARCHIVE |
| Região | REGIAO_CREATE/UPDATE |
| Imagem/documento | IMAGEM_CREATE/UPDATE/DELETE; DOCUMENTO_CREATE/UPDATE/DELETE |
| Fato/ligação | FATO_CREATE/UPDATE/DELETE/REORDER; LIGACAO_CREATE/UPDATE/DELETE/REORDER |
| Exposição/novidade | CREATE/UPDATE/DELETE/PUBLISH/ARCHIVE de cada entidade |

[registrarAuditoria](../src/utils/auditoria.js), linhas 135–149, recebe o client transacional, aplica listas de campos e relança falha. Os serviços de negócio inspecionados passam esse client; o ator vem da autenticação. Senha não grava valores; URLs perdem credenciais/query/fragmento. No-op é omitido. Campos livres permitidos não são detector universal de informação pessoal; há nome/e-mail no histórico de contas por desenho.

O controle de status C2.1 está na mesma transação do evento. C2.1 e os testes de auditoria existentes registram/definem rollback em falha da INSERT. Mídias usam quarentena e compensação: banco+AuditLog são atômicos entre si; filesystem não participa da transação PostgreSQL. Queda de processo ou falha na restauração/limpeza pode exigir operador. Não chamar essa compensação de atomicidade distribuída.

### Histórico não é trilha independente

Consulta HTTP de auditoria é ADMIN e somente leitura, com filtros, limite de 100, ordenação estável, RepeatableRead na lista, sanitização de legado e `private, no-store`. A interface mostra os eventos existentes. Não há endpoints de alterar/excluir AuditLog, mas grants de banco permitem fazê-lo sob o papel da API previsto. Não há selo criptográfico, armazenamento imutável ou cópia externa definida.

`AuditLog` guarda ID, ator, ação, entidade/alvo, valores e data. Não guarda requestId, sessão ou endereço da página. Nome/e-mail apresentados são do cadastro atual, não snapshot de identidade. Exclusão SQL permitida de usuário pode apagar a referência do ator por SET NULL. Não inventar uma associação exata com logs usando só horário.

Não geram eventos nesse Histórico: login/refresh/logout, leituras do Histórico/Feedback, descarte de Feedback, visualizações e scripts em geral. Não existe emissor HTTP de USER_DELETE/PATRIMONIO_DELETE/REGIAO_DELETE apesar das constantes genéricas. Scripts específicos podem registrar eventos próprios; não há interceptação universal de todas as escritas. A leitura de mensagem de Feedback por ADMIN merece decisão explícita de rastreabilidade mínima, sem copiar seu conteúdo para logs.

### Logs operacionais, retenção e acesso

`logger.js` e `errorHandler.js` emitem LOGIN_SUCCEEDED/REJECTED, limites, AUTHENTICATION_DENIED, AUTHORIZATION_DENIED, REFRESH_TOKEN_REUSED, LOGOUT_SESSION_REVOKED, SESSIONS_REVOKED por senha, AUDIT_WRITE_FAILED, falhas de banco/internas e de arquivos. Login/logout/replay/senha emitem sucesso após commit onde aplicável. Mudança de status C2.1 tem AuditLog, mas não emite o evento operacional específico SESSIONS_REVOKED. Não há log de cada refresh normal ou leitura administrativa.

O logger gera/propaga requestId interno e usa campos controlados, sem token, senha, SQL, connection string, IP ou stack bruta. Falha do sink não muda o resultado do negócio e pode perder registro. Saída estruturada não garante entrega durável, correlação com AuditLog ou imutabilidade.

Nginx tem formato mínimo de access log para métricas/Feedback; Feedback suprime error log bruto nessas localizações. **Métricas não têm a mesma supressão do error log**, pendência C1 que permanece antes da ativação. Para as demais rotas, também não há formato sanitizado próprio de access log: defaults da imagem/proxy externo podem registrar IP, URI, query e referrer. A garantia de minimização do logger Node não cobre toda a cadeia. Proibir credenciais em URLs e revisar configuração efetiva de todos os proxies/coletor.

Retenção de segurança, acesso, exportação, alerta de falha, rotação e custódia externa continuam decisões operacionais. Não foi comprovada instalação de coletor, retenção por dias ou backup do AuditLog. Suprimir logs de erro sensíveis do Feedback exige observabilidade compensatória por status, disponibilidade e eventos sanitizados.

## 7. Segurança de API e infraestrutura

### CORS, transporte, headers e proxies

`app.js:23–40` define confiança por lista de IP/CIDR, CORS para `CORS_ORIGIN`, expõe Retry-After/X-Request-Id e aplica no-store às rotas administrativas/auth. CORS geral usa origem fixa, não `*`, e não habilita credenciais; limita leitura cross-origin no navegador, não impede clientes diretos de enviar requisições. A URL configurada deve ser a origem exata, sem caminho, e corresponder ao frontend publicado; a validação geral por URL não obriga HTTPS. Feedback e métricas validam origem/Host/transporte adicionalmente.

Headers backend: nosniff, SAMEORIGIN, no-referrer, DNS prefetch off e permitted-cross-domain-policies none; X-Powered-By removido. **CSP, HSTS e Permissions-Policy não estão definidos nos arquivos examinados. O HTML estático não herda os headers Express.** Estabelecer CSP no servidor do documento, com inventário de Maps, imagens/fontes, blobs e Swagger. Começar report-only com coleta controlada e só aplicar bloqueio após ensaio; CSP é defesa adicional, não correção de todo XSS. [Referência OWASP de CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

`infra/nginx.conf` e `frontend/nginx.conf` contêm o mesmo desenho funcional: listener HTTP, proxy de `/api/` e `/uploads/` com `^~`, limites próprios para ingestão. Compose fixa Nginx `.2` e backend `.3`; backend confia só `.2`. Sob um balanceador TLS anterior, Nginx enxergará esse balanceador como `$remote_addr` e sua conexão HTTP como `$scheme` se não houver integração explícita. Não resolver com `trust proxy=true` ou confiança em qualquer XFF. A topologia final deve validar o peer e reconstruir origem/IP/protocolo em cada salto, incluindo a impossibilidade de contornar o gateway.

### Limites, endpoints públicos e uploads

Login conta todas as tentativas: padrão 100/IP e 10/IP+e-mail por 15 min, IPv6 /64, até 10.000 entradas por mapa e Retry-After. Refresh tem limitador próprio por IP; logout não tem limitador específico, e a troca de senha exige autenticação mas faz bcrypt sem quota própria. No Nginx, quotas de métricas/Feedback são compartilhadas entre workers **da mesma instância**, não entre máquinas. Não há prevenção universal de brute force distribuído nem orçamento global para GETs públicos/autenticados.

Catálogo público seleciona PUBLICADO; DTOs/schema limitam entradas e paginação, enquanto autenticação e autorização antecedem mutações. SQL inspecionado usa Prisma/tagged templates; as ocorrências de `$executeRawUnsafe` localizadas nos serviços são strings constantes de configuração transacional, não concatenação de entrada. Não foi demonstrada SQL injection, IDOR ou escalada ADMIN/EDITOR; análise estática e ausência de padrão perigoso não excluem todas as possibilidades.

Feedback valida cabeçalhos duplicados, preflight, finalidade, JSON sem compressão até 16 KB e mensagem de até 2.000 caracteres; Nginx remove Authorization/Cookie, recusa query/subcaminhos e desativa retry upstream. A idempotência é limitada à janela/existência do recibo. Métricas têm parser de 2 KB, cookie diário assinado e deduplicação transacional. Nenhum desses controles prova humanidade; bots podem enviar pedidos diretos com headers forjados. Flags reais não foram inspecionadas nem alteradas; defaults versionados permanecem desligados.

Uploads administrativos usam Busboy, limites de corpo/partes/campos, streaming, nome UUID, criação exclusiva, checagem de diretório real e limpeza das próprias tentativas. Entrega verifica vínculo/status, caminho, arquivo regular e descritor; a mídia gerenciada exige ADMIN/EDITOR se não houver vínculo PUBLICADO e usa cache privado. Referências legadas são attachment; PDF da rota de documentos pode ser inline. Marcadores MIME não eliminam macros, conteúdo ativo ou arquivos maliciosos. Assets estáticos copiados no build são uma classe pública diferente e não seguem o status do banco.

### Segredos, Docker, backup e observabilidade

`env.js` rejeita segredo JWT curto/placeholder e relata apenas nomes de variáveis inválidas; não mede entropia real. URLs e senhas de API/migrator são separadas na configuração, mas o Compose não prova que senhas escolhidas sejam distintas/fortes. Variáveis VITE são públicas no bundle: a chave de Maps precisa de restrições de origem/API/cota, não de tratamento como segredo backend. Não foram consultados valores privados nem feito scan exaustivo de todos os commits Git.

API roda como `node`, com cap_drop ALL, no-new-privileges e filesystem read-only, deixando uploads e `/tmp` graváveis. Portas do banco, backend e frontend no Compose ligam em loopback. O frontend não compartilha diretamente a rede default do banco. Isso não isola administradores do host/socket Docker, nem prova firewall externo. Serviços systemd de métricas previstos acessam Docker como root no host; o papel SQL restrito não limita esse poder de host.

A imagem backend contém CLI Prisma e devDependencies; separar runtime/migrator é proposta S3, sem remover ferramentas operacionais nesta fase. `.dockerignore` exclui `.env` e uploads de runtime, mas não é lista positiva de conteúdo. Confirmar contexto efetivo antes de build futuro; não presumir que cache na raiz entra no contexto `./backend`, nem que backups existem ali. Tags `node:24-slim`, `nginx:alpine` e `postgres:17-alpine` são mutáveis; não houve scan de imagem/SO, pull ou construção.

O Compose não define NODE_ENV=production. O bloqueio de MOCK_DATA quando NODE_ENV=production existe em `runtime.js`, e MOCK_DATA não é passado no Compose normal; não há demo habilitada por padrão. Ainda assim, a identidade de runtime deve ser explícita no destino. Healthcheck HTTP `/api/health` retorna status estático, não consulta PostgreSQL: prova liveness da API, não prontidão do banco ou sucesso de persistência. Monitorar também falhas de autenticação, latência/5xx, quotas, disco/uploads, coleta de logs, backup e tarefas de retenção.

Guias de métricas/Feedback exigem identidade do destino e segredos próprios, retenção e restauração coerente. `descartar_feedback.js` exige nome/cluster/versão/papel, autorização e backup recente, mas existência/idade de arquivo não prova restaurabilidade. O bloqueio explícito de `patrimonio_guarulhos` deve permanecer até intervenção operacional especificamente revisada. Nenhum timer, certificado, backup ou tarefa foi instalado por S2.

## 8. Dependências moderadas

### Resultado atual e relação com CI

| Escopo auditado pelos locks | Moderadas | Altas/críticas | Exit |
| --- | ---: | ---: | ---: |
| Backend completo | 5 | 0 | 1 |
| Backend `--omit=dev` | 0 | 0 | 0 |
| Frontend completo | 4 | 0 | 1 |
| Frontend `--omit=dev` | 0 | 0 | 0 |

Foram usados `--package-lock-only --ignore-scripts --json --strict-ssl=true`, sem install/update/fix. A primeira consulta npm falhou na validação da cadeia TLS; foi repetida com Node `--use-system-ca`, mantendo verificação TLS, sem alterar certificados/configuração global. Cache diagnóstico ficou ignorado em `.cache/s2_npm/`. Os locks continuaram iguais ao HEAD. Não houve reprodução de payload DoS.

O [workflow](../../.github/workflows/predeploy.yml), linhas 87–88 e 117–118, usa `npm audit --audit-level=high`; por isso sucesso do Actions é compatível com moderadas. S2 não executou novamente o CI, testes ou esse comando com limiar high. Os quatro audits acima consultam os locks e não certificam a árvore instalada ou imagem de produção.

| Pacote afetado no JSON | Versão travada / natureza | Backend | Frontend |
| --- | --- | --- | --- |
| `minimatch` | 10.2.6, transitivo dev; origem da vulnerabilidade | Sim | Sim |
| `@eslint/config-array` | 0.23.5, transitivo dev; minimatch `^10.2.4` | Sim | Sim |
| `eslint` | 10.8.1, direto dev; minimatch `^10.2.5` e config-array | Sim | Sim |
| `@eslint/js` | 10.0.1, direto dev; propagação por peer ESLint | Sim | Sim |
| `nodemon` | 3.1.14, direto dev; minimatch `^10.2.1` | Sim | Não |

Assim, **5/4 são pacotes afetados/propagações, não nove vulnerabilidades independentes**. `eslint-utils` e plugins React presentes nos locks não aparecem como ocorrências nesses JSONs atuais. `follow-redirects` 1.16.2 permanece corrigido e não aparece nos resultados.

### Alcance e correção compatível

O advisory atual marca `>=7.0.0 <11.0.1`, com correção a partir de 11.0.1: padrões controlados podem ampliar processamento e memória quando `optimizationLevel >= 2`. A versão local tem padrão 1; consumidores inspecionados de config-array/nodemon não selecionam nível 2, e a aplicação não importa minimatch nem recebe globs públicos para essas ferramentas. Isso reduz exposição demonstrada, sem excluir outros usos/futuros jobs. [Advisory oficial](https://github.com/advisories/GHSA-g3hv-75wg-m249).

No frontend final Nginx há dist, não servidor Vite/ESLint/nodemon. No backend a imagem instala devDependencies, embora o comando de runtime seja `node src/server.js`, não nodemon/lint. Presença na imagem deve ser tratada, mas não demonstra alcance remoto do matcher pelo HTTP.

Metadados npm consultados em 05/11/2026: [minimatch](https://registry.npmjs.org/minimatch/latest) latest 11.0.4, Node `20 || >=22`, sem versão 10.x posterior a 10.2.6 no inventário; [ESLint](https://registry.npmjs.org/eslint/latest) latest 10.14.0 ainda exige `^10.2.6`; [config-array](https://registry.npmjs.org/@eslint%2Fconfig-array/latest) 0.23.5 exige `^10.2.4`; [nodemon](https://registry.npmjs.org/nodemon/latest) 3.1.14 exige `^10.2.1`. Node 24 satisfaz o engine da versão corrigida, mas **compatibilidade de engine não é compatibilidade das faixas transitivas**.

O audit sugere versões fora das faixas diretas/atuais, incluindo ESLint e @eslint/js 9.39.5 e nodemon 3.1.11; o campo `isSemVerMajor` nesses planos não transforma downgrade em correção transparente. Config-array pode aparecer com `fixAvailable=true` sem haver solução independente compatível para toda a árvore. Não recomendar `audit fix --force`, downgrade ou override automático. Preferir consumidores que aceitem a versão corrigida; se a equipe optar por override/migração, revisar globs/ignores/watch e suporte dos plugins em mudança própria.

## 9. Riscos antes da publicação

**Condições para uma publicação segura ainda não comprovadas:** TLS/certificado e proxies finais; grants efetivos e proteção de auditoria; coleta/retenção de logs; restauração consistente; secrets e imagens do destino. Sem essas evidências, o sucesso do CI não autoriza declarar produção pronta.

Antes de ativar V2: conferir grants específicos, operador, segredo próprio, HTTPS, quotas globais, cobertura/sondas, retenção e alertas. Antes de receber Feedback: definir aviso/responsabilidade/prazos, descarte viável no destino, chaves e rotação, backups/exclusões, consulta ADMIN e minimização dos logs em toda a cadeia. Não tratar a ausência de agendamento como simples detalhe após começar a coletar.

Antes de expor administração: registrar a decisão sobre MFA/step-up e risco de sessionStorage, estabelecer origem HTML protegida contra framing e plano de CSP, revisar acesso remoto e resposta a comprometimento de credenciais. P2 pode ter aceite temporário com responsável, prazo e compensação; não é aceite automático nem confirmação de exploração.

Pontos de confirmação explícita: grants/memberships/owners reais; PostgreSQL e trilha do destino; quantidade de réplicas e proxies; headers no navegador; política/publicidade dos assets; restrições da chave Maps; conteúdo das imagens; coletor, retenção, backups e RPO/RTO. Nenhum desses pontos foi inferido como aprovado só por existir um arquivo de exemplo.

## 10. Plano de correções S3 em etapas independentes

Cada etapa abaixo exige escopo revisado e autorização específica. **Nenhuma começou em S2.** Alteração de código e aplicação operacional são autorizações distintas; nenhuma delas implica deploy, escrita no banco real, commit ou push.

| Etapa proposta | Entrega revisável | Dependências e limite |
| --- | --- | --- |
| S3-A — privilégios e trilha de auditoria | Matriz de grants explícitos, restrição de mutação do AuditLog e testes de privilégios/rollback em descartável | DBA aprova compatibilidade com recuperação/importadores. Não editar migrations históricas; implantação dos grants é ação separada. |
| S3-B — HTTPS, proxies e headers | Configuração para topologia definida, CSP progressiva/antiframe e ensaios isolados de origem/cookies/IP | Exige domínio e cadeia de proxy decididos. Preservar flags e contratos de Feedback/V2; instalar somente após aprovação posterior. |
| S3-C — logs e recuperação | Coletor segregado, retenção, alertas, inventário de eventos críticos e procedimento de backup/restauração | Responsáveis, prazos, RPO/RTO e acesso aprovados. Correlação nova não altera retroativamente eventos históricos. |
| S3-D — MFA e credenciais administrativas | Proposta e implementação própria de MFA/step-up, recuperação, promoção e rotação/revogação de incidente | Decisão institucional prévia; preservar C2.1, seus locks, no-ops, rollback, tokenVersion e prazo absoluto. Migração para cookies é subescopo separado. |
| S3-E — capacidade e abuso | Quotas coordenadas, limites de endpoints caros e política de sessões/refreshes | Exige topologia/carga alvo; purga depende de prazo aprovado e privilégio separado. Não apagar sessões reais automaticamente. |
| S3-F — operação de V2/Feedback | Procedimentos compatíveis com destino autorizado, papéis, retenção, segredos, descarte e restauração | Não remover guardas para fazer scripts “funcionarem”; ativação pública continua separada, mesmo após homologação. |
| S3-G — dependências e imagens | Solução compatível para minimatch/consumidores e proposta de separar runtime/migrator; scan/inventário da imagem | Sem atualização major/override/downgrade implícito. Cada proposta validada pelos contratos e quatro audits. |
| S3-H — documentos e assets | Política antimalware/quarentena e classificação de conteúdo distribuído | Curadoria aprova formatos/publicidade; preservar rotas e arquivos históricos. |

S3-A, B, C e G podem ser planejadas separadamente; nenhuma depende de habilitar módulos públicos. S3-D é mudança de autenticação deliberada, não continuação automática da C2.1. S3-F depende de decisões operacionais e não deve ser usada para antecipar ativação.

## 11. Critérios de aceite para implantação futura

1. **Referência e regressão:** commit exato aprovado, árvore/diff revisados, CI daquele SHA e testes pertinentes às mudanças; C2.1 permanece aprovada em login/refresh/logout/senha/status, concorrência e rollback. Não reduzir limiares nem omitir testes para obter aprovação.
2. **Banco:** destino/cluster/versão/trilha identificados sob autorização; backup adequado e restauração ensaiada; checksums das migrations aplicadas conferidos. API sem DDL, membership privilegiado, acesso a `_prisma_migrations` ou mutação do AuditLog; papéis V2/Feedback com testes negativos. Não executar essas conferências reais automaticamente a partir deste relatório.
3. **Transporte:** HTTPS válido para domínio final, HTTP redirecionado, sem mixed content de credenciais; HSTS e headers do HTML conferidos inclusive em erros; spoofing e acesso direto testados; CORS/origem/Host/protocolo coerentes em todos os saltos.
4. **Administração:** decisão documentada sobre MFA/step-up, fatores/recuperação e armazenamento de tokens; scripts de terceiros/CSP avaliados; revogação por status preservada; plano distingue rotação JWT de revogação de refresh.
5. **Auditoria/logs:** emissores críticos documentados, operação+evento atômicos, registros sem segredos; coleta durável fora da credencial da API, alerta de falha e retenção/acesso aprovados. Histórico não apresentado como rastreio universal ou inviolável.
6. **Disponibilidade:** limites ensaiados na quantidade de instâncias final, com NAT/IPv6 e falha do contador; readiness de banco/serviços além do health estático; monitoramento de disco, uploads, logs e filas/tarefas pertinentes.
7. **Retenção/recuperação:** backup consistente banco+uploads, responsabilidades e RPO/RTO aceitos; restauração ensaiada sem reexpor vencidos, sem reativar inadvertidamente sessões e com recuperação de quarentena. Purga de sessões/Feedback/métricas somente por processo aprovado.
8. **Módulos opcionais:** flags mantidas desligadas até aceite/autorização próprios; grants, chaves, aviso, quotas, sondas/agenda e descarte conferidos antes de V2/Feedback. Aceite do portal não implica aceite de coleta pública.
9. **Cadeia de entrega:** quatro audits atuais, tratamento/aceite temporário dos moderados com responsável e prazo; imagens/contextos verificados, secrets fora de camadas e configuração de produção explícita. Scan de SO complementa audit npm.
10. **Aprovação final:** responsáveis técnicos e institucionais revisam riscos remanescentes; implantação, migrations reais, ativação, commit e push exigem as autorizações correspondentes. Este diagnóstico não as concede.

## 12. Estado final do Git

Estado inicial: árvore e índice limpos. HEAD e referência local `origin/development/backend` iguais a `01190d6bd7aab8d2f397823aa596c0c329e2458c`; sem fetch ou atualização de referências. Consulta pública do Actions confirmou a execução aprovada desse SHA.

Entrega versionável única:

```text
?? backend/reports/reauditoria_seguranca_s2.md
```

Conferências finais: `git status --short --branch`, `git diff --name-only`, `git diff --cached --name-only` e `git diff --check`; nenhum arquivo rastreado/índice modificado. O relatório novo foi conferido separadamente, pois `git diff --check` sozinho não inclui arquivos untracked: 12 seções presentes, 29 links locais resolvidos e nenhum whitespace final inválido. O diff sem índice emitiu somente aviso de conversão futura LF/CRLF. Manifests, locks, configurações, fontes, testes, 12 migrations e relatórios históricos preservados. Auxiliar temporário de leitura removido; apenas cache técnico npm ignorado em `.cache/s2_npm/`, sem integrar a entrega.

**S2 encerrada com diagnóstico. Não foram implementadas correções S3.**
