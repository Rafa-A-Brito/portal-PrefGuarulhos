# Dashboard V2 — Fase 1.2: participação e coleta qualificada

Data: 26/10/2026, America/Sao_Paulo. Base inicial: `ee29f6c`, árvore limpa. Referências: [arquitetura consolidada](../docs/dashboard_v2_1_arquitetura_metricas.md), [entrega 1.1](dashboard_v2_fase_1_1.md) e rotas HTTP atuais.

**Implementação para revisão, com flags desligadas por padrão. Não autoriza coleta em produção.** Não foram acessados bancos, executadas migrations/seeds/importações nem alterados backend, autenticação, dados, favoritos locais ou gráficos V1. Não houve commit, push ou deploy. Nenhuma dependência foi adicionada ou atualizada.

## Arquivos alterados

| Arquivo, relativo à raiz | Alteração |
| --- | --- |
| `frontend/src/services/metricasPublicasApi.js` | Novo cliente fetch público, relativo, sem JWT/interceptadores |
| `frontend/src/features/metricas/participacaoStore.js` | Preferência versionada, GPC, sincronização de escolha e fallback em memória |
| `frontend/src/features/metricas/coletaMetricas.js` | Coordenação de sessão diária, locks, prazos, deduplicação local e retry limitado |
| `frontend/src/features/metricas/ParticipacaoMetricas.jsx` e `.module.css` | Painel de participação acessível e responsivo |
| `frontend/src/hooks/useVisualizacaoPatrimonio.js` | Qualificação por UUID confirmado e tempo visível |
| `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx` | Hook antes dos retornos antecipados, sem usar o item provisório |
| `frontend/src/components/Footer/Footer.jsx` | Painel discreto no rodapé público |
| `frontend/vite.config.js` | Proxy restrito a `/api/metricas` e seus subcaminhos |
| `frontend/.env.example` | `VITE_METRICAS_ATIVAS=false` |
| `frontend/test/metricasPublicasApi.test.js` | Contrato, timeout, cancelamento e independência de JWT |
| `frontend/test/participacaoMetricas.test.jsx` | Interface, escolhas, GPC, storage e propagação entre abas |
| `frontend/test/coletaMetricas.test.js` | Sessão, duas instâncias, retries, cookies indisponíveis e meia-noite |
| `frontend/test/useVisualizacaoPatrimonio.test.jsx` | Hook, StrictMode e integração com a ficha real, API simulada |
| Este relatório | Resultados e SQL integral para revisão separada |

`AdminDashboard.jsx`, `GraficosDashboard.jsx`, `dashboardApi.js`, `services/api.js`, stores/botões de favoritos e manifests/locks foram preservados. Não foram implementados gráficos V2, favoritos globais, Gemini ou “Em alta”.

## Participação e privacidade

O rodapé público contém um painel recolhível “Métricas opcionais de visita”, sem modal que interrompa a navegação. Os botões permitem aceitar, recusar e revogar, com alvos de pelo menos 44 px, foco visível e feedback `aria-live`. Em telas pequenas ficam empilhados. Não há afirmação de conformidade jurídica, aprovação institucional ou audiência humana comprovada.

Com a flag frontend desligada, o convite não aparece. Uma escolha aceita anteriormente ainda permite acessar a revogação. As flags backend da Fase 1.1 não foram alteradas. O aceite, sozinho, **não emite cookie nem evento**; Home, catálogo e favoritos não fazem bootstrap analítico.

A chave `portal-guarulhos:metricas:participacao:v1` armazena apenas versão, escolha e geração da preferência. A geração identifica uma mudança local da escolha, não uma identidade enviada ao servidor. Não há token, JWT, cookie ou histórico de patrimônios nessa chave. Sem storage, a escolha fica na memória da página; uma nova instância não presume adesão. `storage`, `focus`, `pageshow` e mudança de visibilidade ajudam a propagar/reler preferências. Remoção da preferência retorna ao estado sem adesão.

`navigator.globalPrivacyControl === true` prevalece sobre a escolha salva e impede coleta/aceite efetivo. O sinal é conferido também antes de operações, não somente na renderização. O código não interpreta ausência de GPC como consentimento; uma escolha explícita continua obrigatória. Se GPC deixar de estar ativo, a preferência explícita anteriormente salva volta a ser considerada. Essa política deve ser incluída na revisão dos textos antes da ativação.

Revogar interrompe tarefas em andamento e tenta DELETE da sessão pública, mesmo fora da ficha. Falha dessa retirada não reativa a participação: não há novos envios locais e o cookie diário expira. Não se promete desfazer uma requisição já confirmada no servidor, apagar agregados ou revogar instantaneamente cópias do token. Sem storage e sem comunicação entre abas, a escolha só pode ser garantida na página atual; esse limite não é compensado com fingerprint ou IP.

## Cliente HTTP e qualificação

O cliente usa exclusivamente `/api/metricas/visualizacoes` e `/sessao`, `credentials: same-origin`, `cache: no-store`, `redirect: error`, `referrerPolicy: no-referrer`, `X-Portal-Metricas: 1` e JSON nos POSTs. O navegador fornece Origin. Não importa `services/api.js`, não consulta credenciais administrativas e não faz refresh/logout/redirecionamento. DELETE não envia corpo JSON desnecessário.

Cada fetch tem timeout de 3 segundos e aceita AbortSignal. HTTP 401, 403, 404, 429 e 503 vira erro restrito à coleta. O cliente básico não repete requisições sozinho. O coordenador permite no máximo duas tentativas de **evento** para rede/timeout, 429 ou 503, com espera mínima de 1 segundo, jitter e respeito a Retry-After. Se a espera requerida ultrapassar 10 segundos ou invadir a janela de expiração, abandona o retry; não encurta a espera do servidor. O fluxo completo, incluindo espera por lock, é limitado a 20 segundos.

Não há retry automático de emissão de sessão: uma resposta perdida pode já ter emitido cookie. Falhas de bootstrap suspendem novas emissões por pelo menos 60 segundos, respeitando Retry-After maior; não existe polling. Falhas terminais de evento também introduzem pausa. Um 401 no evento, compatível com cookie bloqueado/perdido, suspende aquela participação até o prazo diário, sem recriar identidades em loop. Isso privilegia evitar duplicações, podendo perder contagens após perda do cookie.

Na ficha, o hook recebe **somente `estado.detalhe?.uuid`**. O item provisório do catálogo, mesmo com UUID, não o aciona. A leitura de detalhe existente continua sem fallback para mock. Loading, erro, UUID inválido, marcador de mock, edição e `?preview` desabilitam a coleta. A verificação de sessão precisa terminar; usuários conhecidos ADMIN/EDITOR não são contabilizados. Isso não identifica membros da equipe que naveguem sem sessão.

É necessário acumular 2 segundos com a aba visível depois da confirmação e da adesão. A aba oculta pausa a qualificação e cancela envio/retry em andamento. Troca de UUID, desmontagem, erro ou revogação cancelam a operação. StrictMode remove os efeitos da primeira montagem; refetch/re-render do mesmo UUID não reinicia uma coleta concluída. Um conjunto em memória evita repetir UUIDs concluídos no dia; o backend continua responsável pela garantia final de deduplicação.

## Sessão diária, abas e meia-noite

`portal-guarulhos:metricas:prazo:v1` contém somente dia, expiração informada pela API, prazo local conservador e geração da preferência; pode conter `pausaAte`. Não contém nonce, assinatura, cookie ou lista de bens. A expiração usa também o header HTTP Date do servidor e desconta o tempo da requisição e a precisão de um segundo desse header. Respostas sem prazo/Date válidos não habilitam o envio.

Web Locks serializa o bootstrap entre abas da mesma origem; depois de adquirir o lock, o coordenador relê o prazo compartilhado. Dentro de cada aba há também uma fila. Em 15 fichas diferentes com prazo válido, o teste observou uma única emissão de sessão. Falha de gravação no storage mantém o prazo novo em memória, sem recuperar repetidamente um valor antigo.

Sem Web Locks, a fila protege somente a aba e o prazo compartilhado reduz chamadas, mas não torna atômica a primeira emissão em duas abas. Sem storage, abas podem chamar sessão separadamente, embora o cookie válido seja reutilizado pelo backend quando recebido. A corrida inicial sem esses recursos não é apresentada como resolvida: a garantia real é por credencial, não por navegador físico. Duas abas podem enviar o mesmo UUID; com a mesma credencial, a constraint da Fase 1.1 impede segundo incremento.

Eventos não iniciam a menos de 5 segundos do prazo conservador. Retries permanecem vinculados à sessão/dia originais; não carregam eventos para amanhã. Ao expirar, a ficha ainda visível precisa de **nova qualificação de 2 segundos** e novo bootstrap. A página não mantém fila offline. Alterações bruscas no relógio local, suspensão do sistema e perda de rede podem reduzir cobertura; o servidor ainda valida o dia assinado do cookie.

## Proxy de desenvolvimento

O matcher Vite `^/api/metricas(?:/|$)` encaminha somente esse prefixo para `http://127.0.0.1:3333`, sem reescrita de caminho nem `changeOrigin`. Não encaminha autenticação, admin ou outros prefixos. É o backend local padrão do projeto; outro destino de homologação exige ajuste explícito, não inferência a partir do cliente JWT.

Nenhuma regra global de CORS/trust proxy, arquivo nginx ou Compose foi alterada. O backend de homologação precisa autorizar a origem exata do Vite e seu modo de cookie local. Esta fase não habilitou flags ou segredos em arquivos `.env` reais. A inspeção visual usou configuração Vite própria com middleware de API simulada, sem encaminhamento ao backend.

## Validação

| Verificação | Resultado |
| --- | --- |
| Frontend completo, Node 24.22.1 / dois workers | **423 testes aprovados em 26 arquivos**, sem falhas; inclui os 39 novos testes |
| Regressões | V1, favoritos locais, navegação, sessão administrativa e ficha pública passaram na suíte completa |
| Novos cenários | Ausência/aceite/recusa/revogação; GPC; storage indisponível; cookie bloqueado/perdido/expirado; duas instâncias e lock compartilhado; cancelamento, 401/403/404/429/503, rede/timeout e retry; visibilidade, StrictMode, UUID provisório, erro/404, preview, ADMIN/EDITOR e meia-noite |
| Lint frontend | Aprovado |
| Build frontend | Aprovado |
| `npm audit --json` | **0 vulnerabilidades**, código 0 |
| `npm audit --omit=dev --json` | **0 vulnerabilidades**, código 0 |
| Chrome headless com HTTP simulado | 1440, 390 e 320 px: sem overflow horizontal, painel operável por Enter; zero POST antes da escolha; um bootstrap e um evento após qualificação; DELETE ao revogar; cookie HttpOnly não acessível por `document.cookie` |
| Git | `git diff --check` aprovado; aviso de normalização LF/CRLF no arquivo de detalhe já tratado pelo Git, sem erro de whitespace |

Build atual: inicial **674,94 kB / 190,74 kB gzip**, gráficos V1 lazy **411,37 kB / 116,13 kB gzip**. Comparando os artefatos locais anteriores: JS inicial 666.588 → 674.945 bytes, aumento **8.357 bytes**; chunk gráfico permaneceu em **411.378 bytes**. Recompressão uniforme com zlib padrão mediu acréscimo de 3.109 bytes gzip no inicial; esse método difere do relatório gzip do Vite. O hash do chunk gráfico mudou por referências ao bundle inicial, sem mudança de tamanho ou de componente V1.

Permanecem os avisos anteriores de chunk acima de 500 kB, import dinâmico ineficaz de `PatrimonioEditor` e imagens grandes. Não houve ajuste de limites, troca de bibliotecas ou mudança do carregamento lazy V1.

Capturas locais para revisão: [desktop 1440](../../.cache/v212_visual/participacao_1440.png), [mobile 390](../../.cache/v212_visual/participacao_390.png), [mobile 320](../../.cache/v212_visual/participacao_320.png). As imagens de 1440 e 390 foram também inspecionadas visualmente. Não há certificação de leitor de tela ou teste com backend real nesta etapa. A coordenação de duas abas foi verificada por duas instâncias independentes em teste com storage/lock compartilhados; a rodada de navegador conferiu o fluxo individual em cada resolução.

Evidências ignoradas pelo Git: `.cache/v212_suite.log`, `v212_lint.log`, `v212_build.log`, `v212_audit.json`, `v212_audit_prod.json`, `v212_visual.log` e `v212_visual/resultado.json`. Os primeiros roteiros de navegador foram ajustados para enviar o evento Enter completo via CDP; não exigiram alteração do componente. Nenhuma suíte backend ou operação PostgreSQL foi repetida, pois o código backend não mudou.

## Revisão separada da Fase 1.1 — sem correções

**Quota de sessão:** o limite atual é 10 chamadas/hora por **rede do cliente** (IPv4 ou IPv6 /64), inclusive reutilizações, não dez por Origin HTTP nem por pessoa. O limite é local ao processo. A reutilização do prazo no frontend reduz requisições por visitante, mas não resolve NAT compartilhado: onze pessoas emitindo uma credencial na mesma hora podem exceder a quota. Revisar/calibrar essa política e a proteção contra abuso antes de produção. Não houve aumento de limite ou alteração de backend nesta fase.

**SQL:** a PK do recibo impede duplicidade por dia/UUID/HMAC. A PK do agregado separa dia/bem; CHECK impede totais negativos; os índices inversos atendem consultas por bem/data. As FKs Restrict conservam integridade, sem criar rota DELETE patrimonial. A sonda tem janela UTC alinhada a 300 segundos e versão positiva, mas a estrutura não significa que exista agendador ou coleta de cobertura. Não há default de dia dependente da timezone da sessão. Essas constraints não substituem a transação de inserção/incremento ou a validação PUBLICADO/canônica.

**Permissões:** a migration não contém GRANT. `infra/postgres/10-roles.sh` define privilégios padrão para tabelas **criadas por `portal_migrator`**, inclusive SELECT/INSERT/UPDATE/DELETE para `portal_api`. Aplicar o SQL por outro proprietário não herda automaticamente esses grants. Os privilégios atuais são mais amplos que o mínimo de ingestão e devem ser revisados operacionalmente para retenção/sondas; não foram modificados. SELECT com `FOR SHARE` também exige permissão UPDATE apropriada na tabela patrimonial.

**Migration deploy:** a Fase 1.1 exercitou SQL manual no descartável, sem registrar a nova migration em `_prisma_migrations`. Isso não comprova `prisma migrate deploy` completo. Antes de autorizar aplicação final, preparar um PostgreSQL descartável **limpo**, conferir host/porta/banco/cluster/exclusividade, aplicar a trilha pelo CLI/papel previstos, conferir checksums/registros/default privileges e testar idempotência da segunda execução. Esse procedimento continua pendente e **não foi executado nesta fase**, conforme a restrição atual. Não usar o banco real nem o Compose normal para obtê-lo.

## SQL integral preservado

Conteúdo de [20261026120000_add_visualizacoes_metricas/migration.sql](../prisma/migrations/20261026120000_add_visualizacoes_metricas/migration.sql). Sem diff nesta entrega; apresentado integralmente para revisão técnica:

```sql
-- Fase 1.1: preparada para revisão. Nenhum backfill ou alteração do acervo.
CREATE TYPE "estado_sonda_metricas" AS ENUM ('DISPONIVEL', 'DESATIVADA', 'FALHA');
CREATE TABLE "visualizacoes_unicas_dia" (
    "dia" DATE NOT NULL,
    "patrimonio_id" UUID NOT NULL,
    "chave_visitante" CHAR(64) NOT NULL,
    CONSTRAINT "visualizacoes_unicas_dia_pkey" PRIMARY KEY ("dia", "patrimonio_id", "chave_visitante"),
    CONSTRAINT "visualizacoes_unicas_dia_patrimonio_id_fkey" FOREIGN KEY ("patrimonio_id") REFERENCES "patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "visualizacoes_chave_hex" CHECK ("chave_visitante" ~ '^[a-f0-9]{64}$')
);
CREATE INDEX "visualizacoes_unicas_dia_patrimonio_id_dia_idx" ON "visualizacoes_unicas_dia"("patrimonio_id", "dia");
CREATE TABLE "visualizacoes_totais_dia" (
    "dia" DATE NOT NULL,
    "patrimonio_id" UUID NOT NULL,
    "quantidade" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "visualizacoes_totais_dia_pkey" PRIMARY KEY ("dia", "patrimonio_id"),
    CONSTRAINT "visualizacoes_totais_dia_patrimonio_id_fkey" FOREIGN KEY ("patrimonio_id") REFERENCES "patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "visualizacoes_quantidade_positiva" CHECK ("quantidade" >= 0)
);
CREATE INDEX "visualizacoes_totais_dia_patrimonio_id_dia_idx" ON "visualizacoes_totais_dia"("patrimonio_id", "dia");
CREATE TABLE "sondas_metricas" (
    "janela_inicio" TIMESTAMPTZ(0) NOT NULL PRIMARY KEY,
    "observado_em" TIMESTAMPTZ(3) NOT NULL,
    "estado" "estado_sonda_metricas" NOT NULL,
    "versao_regra" INTEGER NOT NULL,
    CONSTRAINT "sondas_janela_alinhada" CHECK (mod(extract(epoch FROM "janela_inicio"), 300) = 0),
    CONSTRAINT "sondas_versao_positiva" CHECK ("versao_regra" > 0)
);
```

## Pendências e limites para aprovação

1. Rever textos e política de participação/GPC; aprovar separadamente qualquer habilitação. Flags continuam desligadas. O build Docker atual não ganhou argumentos de ativação nesta fase.
2. Rever o limite de sessão em redes compartilhadas, suporte a múltiplas réplicas e proteção contra bots. Cookies e visibilidade não provam humanidade; limpar cookie/perfil pode gerar contribuições adicionais.
3. Implementar retenção, reconciliação, cobertura e agendamento já previstos na arquitetura antes de coleta contínua. Não confundir emissão de cookie com conteúdos visualizados.
4. Validar o deploy de migrations em descartável limpo e permissões do papel migrador/API, sob autorização própria.
5. Homologar backend e frontend juntos em ambiente isolado com HTTPS, Secure/Host, proxy e relógio operacional; a fixture visual não certifica essas configurações finais. Testar múltiplas abas reais e leitores de tela nessa homologação ampliada.
6. A V1 permanece sobre todos os registros administrativos; os eventos V2 continuam restritos pelo backend a PUBLICADO/canônico. Os gráficos V2 e os demais recursos futuros seguem fora desta entrega.

Referências consultadas: coordenação entre contextos pela [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API), disponibilidade do sinal [GPC](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/globalPrivacyControl) e escopo de desenvolvimento do [proxy Vite](https://vite.dev/config/server-options#server-proxy). As limitações de fallback e os resultados locais estão descritos acima.
