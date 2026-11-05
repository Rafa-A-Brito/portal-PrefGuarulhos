# UI-F1 — Finalização e padronização do frontend

Data: **05/11/2026**, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `01190d6bd7aab8d2f397823aa596c0c329e2458c`.

## 1. Resultado

Interface ajustada com mudanças locais: Regiões recebeu busca e listagem consistentes com a administração; o Histórico distingue ocorrência, responsável, alvo, data e diferenças; Contato passou a abrigar o formulário existente de Feedback, preservando os canais institucionais. Feedback administrativo e V2 receberam somente ajustes de CSS. Os três gráficos V2 e o comportamento de consultar/recolher permanecem.

**Validação final:** 222 testes direcionados aprovados; suíte frontend completa com **633/633 testes**, lint e build aprovados. Ensaios Chromium com contratos fictícios em **1440, 768, 390 e 320 px**, além de teclado, foco e zoom/reflow no formulário público. Foram produzidas 44 capturas locais: 36 administrativas e oito públicas.

Não houve acesso a banco, execução de backend, Docker, Compose, migrations, instalação de dependências, ativação real de Feedback/V2, commit, push ou deploy. Autenticação/C2.1, infraestrutura, grants, schema, migrations e arquivos preexistentes S2/S3-A1 foram preservados. Nenhuma frente S3 foi iniciada.

## 2. Inspeção inicial e arquitetura de contexto

Antes das edições, foram conferidos branch, HEAD, referência remota local e status. Havia quatro arquivos locais não versionados, todos preservados:

```text
backend/reports/protecao_auditlog_s3a1.md
backend/reports/reauditoria_seguranca_s2.md
backend/scripts/sql/permissoes_auditoria.sql
backend/test/auditoria_privilegios.integration.test.js
```

Um manifesto SHA-256 de **880 arquivos iniciais** (876 rastreados e esses quatro arquivos) foi salvo em `.cache/ui_f1/baseline.json` para conferir a preservação ao final. Não houve fetch nem atualização de referências Git. Os relatórios [S2](../../backend/reports/reauditoria_seguranca_s2.md) e [S3-A1](../../backend/reports/protecao_auditlog_s3a1.md) permanecem evidências anteriores, sem edição.

| Camada inspecionada | Responsabilidade e decisão UI-F1 |
| --- | --- |
| [App.jsx](../src/App.jsx) | Composição `ErroModalProvider → ErrorBoundary → AuthProvider → PatrimoniosProvider → BrowserRouter`. Rotas e providers preservados; não foi criado contexto global para estado de formulário ou consulta. |
| AuthContext, RotaProtegida e cliente API administrativo | Sessão e autorização existentes mantidas. Administração geral aceita ADMIN/EDITOR; Regiões, Usuários, Histórico e Feedback administrativo continuam no grupo ADMIN. |
| Histórico e Feedback administrativo | Filtros, paginação, carregamento, cancelamento por AbortController e erros são estados locais das páginas. Apresentação foi alterada sem modificar serviços HTTP. |
| Contato e formulário público | Contato mantém estrutura, identidade e canais. O componente já existente `FormularioFeedback` foi exportado e incorporado; conserva estado e idempotência locais, sem dependência do contexto de autenticação. |
| Cliente público de Feedback | `feedbackPublicoApi` continua separado do cliente autenticado: envio sem cookies/Authorization, sem métricas ou armazenamento persistente da mensagem. Nenhuma alteração no cliente. |
| Estilos | Tokens e classes administrativas existentes continuam sendo a base. Ajustes ficaram em CSS de Regiões e módulos das telas; não houve mudança em CSS global, AdminLayout ou sistema de design. |

Foram confrontados componentes, CSS, fixtures/testes e contratos reais de [auditoria](../../backend/src/utils/auditoria.js), [consulta do Histórico](../../backend/src/services/auditoriaService.js) e [schema de Feedback](../../backend/src/schemas/feedbackSchema.js), além dos emissores operacionais. A importação de enumerações e schemas nos testes usa módulos sem conexão a banco.

O texto do pedido menciona capturas de referência, mas o anexo recebido nesta rodada contém apenas instruções. A referência visual utilizada foi o frontend existente e as capturas geradas neste ensaio; não se afirma comparação pixel a pixel com imagens do usuário.

## 3. Telas e inconsistências corrigidas

| Tela | Diagnóstico e alteração |
| --- | --- |
| Regiões | A busca ficava fora de `.admin-form` e não tinha borda/fontes explicitadas, herdando aparência nativa. Agora possui borda de 1 px, raio coerente e foco de 3 px separado da borda. Cabeçalho, barra de ações e paginação usam os padrões administrativos. Lista organiza nome, status, slug e descrição, com edição alinhada; em mobile os elementos se empilham. |
| Histórico | Reduzido espaço/sombra do formulário e removida duplicação de borda/sombra nas tabelas internas. Colunas têm largura mínima para preservar leitura, com rolagem horizontal local. Ocorrência e alvo ganham hierarquia; UUIDs e códigos ficam secundários. |
| Feedback administrativo | Formulário alinhado aos tokens de borda/raio, sem sombra redundante; tabelas internas não duplicam contornos. Filtros, gráficos, carregamento, detalhe, paginação e mensagem verdadeira de consulta desativada preservados. |
| Visualizações V2 | Inputs/selects e botões usam contorno, raio e cores da administração; aplicar filtros tem aparência primária. Nenhuma alteração no componente funcional, três gráficos, tabelas, consulta ou recolhimento. |
| Contato | Substituído o formulário que apenas abria e-mail pelo formulário existente de Feedback, dentro da estrutura visual de Contato. Removida a coleta de nome/e-mail/assunto não aceitos pelo contrato. E-mail institucional, Fala.BR, Ouvidoria e painel de informações preservados. |
| Usuários e dashboard V1 | Avaliados como referência e regressão visual. Não receberam alterações de implementação. |

Contornos de foco continuam visíveis. A rolagem horizontal das tabelas é intencional e localizada, inclusive na comparação de valores do modal: não se comprimiu conteúdo em colunas ilegíveis nem se produziu overflow da página. Não foram adicionadas bibliotecas, cards decorativos ou estilos globais.

## 4. Histórico: eventos e limites dos dados

### Mapeamento confrontado com o backend

Os **38 códigos de `AUDIT_ACTIONS`** já tinham cobertura por prefixo/verbo no frontend. A lacuna encontrada estava nos emissores operacionais que persistem códigos fora dessa enumeração. O formatter agora reconhece os **41 códigos** abaixo, com validação da entidade compatível:

| Família | Códigos/sufixos reconhecidos |
| --- | --- |
| USER | CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, PASSWORD_CHANGE |
| PATRIMONIO | CREATE, UPDATE, DELETE, PUBLISH, ARCHIVE |
| REGIAO | CREATE, UPDATE, DELETE |
| IMAGEM / DOCUMENTO | CREATE, UPDATE, DELETE de cada família |
| FATO / LIGACAO | CREATE, UPDATE, DELETE, REORDER de cada família |
| EXPOSICAO / NOVIDADE | CREATE, UPDATE, DELETE, PUBLISH, ARCHIVE de cada família |
| INITIAL_LOAD_BINDING | Patrimonio: vinculação à carga inicial; emissor em carga/importação de patrimônios. |
| SYNC_PATRIMONIO | Patrimonio: sincronização; emissor em `sync-patrimonios.js`. |
| D1C_EDITORIAL_IMPORT | PatrimonioFato ou PatrimonioLigacao: importação editorial; emissor em `import-editorial-curado.js`. |

São 42 combinações válidas ação/entidade porque D1C aceita duas entidades. A presença de USER_DELETE, PATRIMONIO_DELETE e REGIAO_DELETE na enumeração **não comprova emissão por endpoint atual**. O frontend preserva reconhecimento desses códigos, sem inventar operações disponíveis.

Os três códigos operacionais receberam descrições neutras: importar/sincronizar não foi traduzido arbitrariamente como criar ou editar. Eventos desconhecidos ou combinações incompatíveis mantêm fallback seguro, sem JSON bruto. A verificação de chaves próprias também evita confundir nomes como `constructor` e `__proto__` com eventos mapeados.

### Detalhes e identificação

- **Ocorrência:** ativação/desativação destacam “Conta administrativa ativada/desativada”.
- **Responsável:** usa exclusivamente `user`/`userId` fornecidos pela API como ator; nome/e-mail representam o cadastro atual, não snapshot histórico.
- **Alvo:** usa identificação legível de campos permitidos em `newValues` ou `oldValues`, quando presente. Não usa o nome do ator como nome do alvo. Na falta desses dados, mostra o tipo do recurso, aviso de indisponibilidade e ID secundário.
- **Data:** mantém `America/Sao_Paulo`, inclusive em testes com horário UTC conhecido.
- **Mudança:** compara somente valores recebidos; `isActive` do usuário aparece como “Situação da conta”, com Ativa/Desativada. Não deduz estados ausentes a partir do código da ação.
- **Identificadores:** códigos e IDs completos continuam consultáveis em seção expansível. Reordenação identifica o patrimônio pai; senha não expõe valores.

A lista da API não contém nomes dos alvos nem snapshots, apenas identificadores e resumo. Não foram feitas consultas adicionais por linha nem alterado o contrato para preencher essa lacuna. Mudanças comuns também podem conter somente os campos alterados: o nome pode não estar no detalhe. Não existem dados de sessão ou páginas visitadas a apresentar; a interface continua explicando essa limitação.

Uma futura extensão poderia fornecer identificação de alvo com semântica explícita de nome atual versus histórico e política de privacidade própria. Isso exige revisão de API/armazenamento em outro escopo; não foi implementado nesta etapa.

## 5. Contato e Feedback público

O formulário oficial fica em **`/contato`**. A rota antiga **`/feedback` redireciona com replace para `/contato`**, preservando links existentes sem manter segunda página de formulário. O link condicionado do rodapé aponta diretamente a Contato. Arquivos e rota não foram apagados; o ciclo de envio existente foi reutilizado como componente nomeado em `pages/Feedback/Feedback.jsx`.

Contrato preservado de `POST /api/feedback`:

| Aspecto | Comportamento validado |
| --- | --- |
| Corpo | Somente `tipo`, `mensagem` e `avisoVersao`; tipos ELOGIO/SUGESTAO/PROBLEMA, mensagem normalizada NFC/trim, 1 a 2.000 pontos de código, aviso `feedback-v1`. O teste confronta o corpo com o schema backend real. |
| Credenciais | Cliente separado, `credentials: omit`, sem Authorization ou cookies de sessão; não persiste nome/e-mail. |
| Idempotência | Chave aleatória opaca de 32 bytes, mantida em memória com o payload da tentativa; reenvio explícito usa mesma chave/corpo dentro da janela, sem repetir automaticamente. |
| Sucesso | Apenas resposta válida 201 ou replay confirmado 200 produz confirmação de recebimento. |
| Falhas | Validação, 409, 429/Retry-After, 503, conexão perdida e resposta inválida continuam com tratamento próprio. Resultado incerto não vira mensagem de sucesso. |
| Disponibilidade | Flag pública falsa: nenhum formulário de envio, mensagem de indisponibilidade e canais institucionais. Backend indisponível permanece respeitado mesmo com frontend habilitado no ensaio. |
| Participação | Texto explica finalidade de experiência no portal, ausência de protocolo/atendimento e recomenda não incluir dados sensíveis. Aviso provisório e versão preservados, sem alegar aprovação institucional. |

Assuntos sobre acervo, fotos, visitas e atendimento continuam direcionados ao e-mail e canais institucionais. O link de e-mail foi mantido sem preencher dados pessoais em URL. Não se adicionou persistência de dados de contato nem foi prometida resposta individual pelo Feedback.

**Flags reais não foram alteradas.** O formulário só aparece quando `feedbackAtivo()` permite. Os testes habilitam flags apenas em ambientes sintéticos isolados. Consulta administrativa depende da disponibilidade devolvida pela API, distinta da oferta pública de envio. Os botões de V2 continuam apenas consultando/recolhendo visualizações; não controlam coleta.

## 6. Arquivos da entrega

| Arquivos alterados/criados | Finalidade |
| --- | --- |
| [AdminRegioes.jsx](../src/features/admin/pages/AdminRegioes.jsx), [AdminRegioes.css](../src/features/admin/pages/AdminRegioes.css) | Cabeçalho, busca, ações, listagem e responsividade. |
| [formatarAuditoria.js](../src/features/admin/formatarAuditoria.js), [AdminAuditoria.jsx](../src/features/admin/pages/AdminAuditoria.jsx), [CSS do Histórico](../src/features/admin/pages/AdminAuditoria.module.css) | Eventos operacionais, ator/alvo, narrativa e comparação, hierarquia e tabelas. |
| [CSS de Feedback administrativo](../src/features/admin/pages/AdminFeedback.module.css), [CSS de V2](../src/features/admin/components/MetricasDashboard.module.css) | Ajustes pontuais de apresentação. |
| [Contato.jsx](../src/pages/Contato/Contato.jsx), [Feedback.jsx](../src/pages/Feedback/Feedback.jsx), [CSS do formulário](../src/pages/Feedback/Feedback.module.css), [Footer.jsx](../src/components/Footer/Footer.jsx) | Integração/reutilização, rota legada e navegação. |
| [formatarAuditoria.test.js](../test/formatarAuditoria.test.js), [AdminAuditoria.test.jsx](../test/AdminAuditoria.test.jsx) | Enumeração real, emissores operacionais, fallback, ativação/desativação, ator/alvo e ausências. |
| [Feedback.test.jsx](../test/Feedback.test.jsx), [OrganizacaoEditorial.test.jsx](../test/OrganizacaoEditorial.test.jsx) | Contrato em Contato, alias/canais e adaptação das verificações de status/slug à nova estrutura. |
| [feedback_visual.mjs](../test/feedback_visual.mjs), [ui_f1_visual.mjs](../test/ui_f1_visual.mjs) (novo) | Ensaios opt-in de navegador com mocks locais, incluindo telas administrativas. |
| Este relatório (novo) | Contexto, resultados, limites e estado final. |

São **16 arquivos rastreados modificados e dois novos arquivos de UI-F1**. Não houve alteração de manifests, locks, serviços HTTP, providers ou testes backend.

## 7. Validação executada

Node **24.22.1** já disponível localmente; dependências existentes, sem install/update. Vitest utiliza a configuração original com `root` explícito, `envDir:false`, cache isolado e dois workers. Vite/build também usa `envDir:false`; artefatos ficam em `.cache/ui_f1/dist`. Variáveis de conexão e flags herdadas foram removidas dos processos de validação; nenhum `.env` privado foi lido.

| Rodada final | Resultado |
| --- | --- |
| Direcionados: formatter/Histórico, Feedback público/cliente, Regiões/editorial, Feedback administrativo, V2 e navegação | **9 arquivos, 222/222 testes aprovados**, cerca de 65 s. |
| Suíte completa frontend | **34 arquivos, 633/633 testes aprovados**, 142,50 s no Vitest (145 s no executor). |
| Lint frontend (`node node_modules/eslint/bin/eslint.js .`) | **Exit 0**, 11 s. |
| Build Vite de produção, flags públicas falsas | **Exit 0**, 2,29 s no Vite; 1.462 módulos transformados. |
| Navegador administrativo | **36 capturas**, quatro larguras, sem overflow da página/modal nem exceções JavaScript; somente GETs para fixtures. |
| Navegador público | **Oito capturas**; quatro larguras, teclado/foco, zoom CSS 200%, reflow 720/escala 2, indisponibilidade, replay idêntico, ausência de cookie/JWT e alias legado. Três POSTs sintéticos, nenhum envio real. |

O total é **619 testes preexistentes + 14 novos = 633**. Os 222 direcionados fazem parte da suíte completa, não são testes adicionais distintos. Testes existentes de erro/sucesso/replay foram conservados e passaram a montar Contato. Os testes de mapeamento confrontam todas as constantes reais, não apenas uma lista duplicada no teste.

Na primeira rodada direcionada houve **221 aprovações e uma falha**: o teste buscava status e slug como texto contíguo, mas a nova interface usa badge separado. A asserção foi ajustada para conferir os dois valores na mesma linha; a rodada seguinte passou integralmente. Após a rodada direcionada, a narrativa de fallback foi refinada para não destacar UUID; a suíte completa validou essa versão final.

Os primeiros ensaios Chromium no sandbox falharam por timeout de `Runtime.enable`. A execução local fora do sandbox foi aprovada pelo mecanismo de permissões e manteve servidor/mocks isolados. Uma primeira fixture administrativa de serviço desativado omitia `motivo: "DESATIVADA"`; foi corrigida para o contrato real, sem flexibilizar o frontend. As rodadas finais passaram. Navegadores e servidores dos ensaios concluídos foram encerrados.

**Avisos do build:** chunk principal de 730,73 kB (206,68 kB gzip), acima do aviso de 500 kB; `PatrimonioEditor` é importado tanto estaticamente como dinamicamente, impedindo a separação pretendida. Esses avisos não foram suprimidos, e os importadores correspondentes não foram alterados. Otimização de bundle fica como trabalho separado.

### Evidências e reprodução

Comandos executados pelo runner isolado: `node node_modules/vitest/vitest.mjs run --config ../.cache/ui_f1/vitest.config.mjs` (com os nove arquivos para a rodada direcionada), lint acima e build pela API Vite no [executor de build](../../.cache/ui_f1/build.mjs). [Runner](../../.cache/ui_f1/validar.mjs) e [configuração isolada do Vitest](../../.cache/ui_f1/vitest.config.mjs) registram os argumentos, limpeza do ambiente e destinos de cache.

Ensaios visuais opt-in, a partir de `frontend`: `node test/ui_f1_visual.mjs` e `node test/feedback_visual.mjs`. Usam Vite com `configFile:false`, `envDir:false`, fixtures HTTP e browser local, sem proxy para backend. Precisam de Chromium e portas locais disponíveis; não integram automaticamente a suíte Vitest.

Evidências locais ignoradas, sem integrar a entrega Git:

- [Direcionados](../../.cache/ui_f1/direcionados.log), [suíte completa](../../.cache/ui_f1/completa.log), [lint](../../.cache/ui_f1/lint.log), [build](../../.cache/ui_f1/build.log).
- [Resultado administrativo](../../.cache/ui_f1/admin_visual/resultado.json) e [resultado público](../../.cache/ui_f1/contato_visual/resultado.json).
- Capturas conferidas incluem [Regiões desktop](../../.cache/ui_f1/admin_visual/regioes_1440.png), [Regiões 320 px](../../.cache/ui_f1/admin_visual/regioes_320.png), [detalhe do Histórico 390 px](../../.cache/ui_f1/admin_visual/historico_detalhe_390.png), [V2 tablet](../../.cache/ui_f1/admin_visual/dashboard_v2_768.png) e [Contato tablet](../../.cache/ui_f1/contato_visual/feedback_768.png). As demais capturas estão nos mesmos diretórios.

## 8. Limitações e pendências reais

1. **Identidade do alvo:** a API não fornece nome em toda ocorrência/listagem; o frontend não consegue reconstruí-lo com precisão. Eventual extensão exige escopo próprio, como descrito na seção 4.
2. **Ativação pública:** aviso de privacidade ainda provisório e regras operacionais/institucionais de Feedback permanecem pendentes conforme F1–F4. Esta integração visual não aprova nem habilita coleta. V2 permanece igualmente condicionado às flags e requisitos existentes.
3. **Canais institucionais:** constantes de e-mail, Fala.BR e Ouvidoria foram preservadas, sem teste de envio ou validação externa nesta etapa. O link de Ouvidoria continua apontando ao portal da Prefeitura conforme implementação anterior; URL final pode ser revista com informação institucional confirmada.
4. **Desempenho:** os avisos de chunk/import do build permanecem. Não houve alteração de divisão de bundles ou compressão de assets fora do escopo visual.
5. **Alcance da validação:** contratos mockados e viewports/zoom simulados em Chromium; sem aparelho físico, leitor de tela, teste de outros navegadores ou E2E com servidor real. As tabelas mantêm rolagem local acessível por teclado. Não há certificação formal de acessibilidade nem de comportamento no deploy.

## 9. Estado final do Git

HEAD e referência local `origin/development/backend` permanecem no SHA inicial; índice sem alterações. Resumo final:

```text
## development/backend...origin/development/backend
 M frontend/src/components/Footer/Footer.jsx
 M frontend/src/features/admin/components/MetricasDashboard.module.css
 M frontend/src/features/admin/formatarAuditoria.js
 M frontend/src/features/admin/pages/AdminAuditoria.jsx
 M frontend/src/features/admin/pages/AdminAuditoria.module.css
 M frontend/src/features/admin/pages/AdminFeedback.module.css
 M frontend/src/features/admin/pages/AdminRegioes.css
 M frontend/src/features/admin/pages/AdminRegioes.jsx
 M frontend/src/pages/Contato/Contato.jsx
 M frontend/src/pages/Feedback/Feedback.jsx
 M frontend/src/pages/Feedback/Feedback.module.css
 M frontend/test/AdminAuditoria.test.jsx
 M frontend/test/Feedback.test.jsx
 M frontend/test/OrganizacaoEditorial.test.jsx
 M frontend/test/feedback_visual.mjs
 M frontend/test/formatarAuditoria.test.js
?? backend/reports/protecao_auditlog_s3a1.md
?? backend/reports/reauditoria_seguranca_s2.md
?? backend/scripts/sql/permissoes_auditoria.sql
?? backend/test/auditoria_privilegios.integration.test.js
?? frontend/reports/finalizacao_frontend_ui_f1.md
?? frontend/test/ui_f1_visual.mjs
```

Conferências finais: comparação dos 880 hashes iniciais, referências/status, `git diff --check`, índice, whitespace dos arquivos novos e links locais deste relatório. Somente os 16 arquivos frontend listados mudaram entre os arquivos iniciais; os quatro arquivos S2/S3-A1 e todos os demais arquivos preexistentes permanecem idênticos. Temporários, logs, browser profiles, capturas e build em `.cache/ui_f1/` estão ignorados.

**UI-F1 encerrada localmente com interface, testes e relatório. Sem publicação automática.**
