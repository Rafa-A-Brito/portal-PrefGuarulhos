# F3 — Formulário público de Feedback

Data: **03/11/2026**, America/Sao_Paulo. Base: `development/backend`, HEAD `f5f7fb86514345761336833e76b787ff3d9490d7`. Implementação local, sem fetch, commit, push, deploy ou ativação pública.

A F1/F2 já estava presente como alterações locais. A comparação SHA-256 de 42 arquivos registrados antes da F3 confirmou todos intactos, incluindo documentos F1/F2, implementação backend, migration, Contato, cliente de métricas e lockfiles. Não houve alteração de dependências, autenticação, favoritos, métricas ou schema Prisma.

## 1. Arquivos

Novos, relativos à raiz:

| Finalidade | Arquivos |
| --- | --- |
| Página | `frontend/src/pages/Feedback/Feedback.jsx`, `frontend/src/pages/Feedback/Feedback.module.css` |
| Cliente e validação | `frontend/src/services/feedbackPublicoApi.js`, `frontend/src/utils/feedbackPublico.js` |
| Testes | `frontend/test/Feedback.test.jsx`, `frontend/test/feedbackPublicoApi.test.js`, `frontend/test/feedback_visual.mjs` |
| Evidência | `backend/reports/feedback_fase_f3_frontend.md` |

Modificados: `frontend/src/App.jsx` (rota), `frontend/src/components/Footer/Footer.jsx` (link condicionado), `frontend/.env.example` (flag falsa) e `frontend/vite.config.js` (proxy local exclusivo de Feedback, preservando Host/Origin com `changeOrigin:false`). O proxy não configura servidores de produção.

## 2. Contrato e flag

O cliente consome somente `POST /api/feedback`, com `{tipo,mensagem,avisoVersao}` e os headers `Content-Type: application/json`, `X-Portal-Feedback: 1` e `Idempotency-Key`. O navegador gera Origin. Fetch relativo usa `credentials:omit`, `cache:no-store`, `redirect:error` e `referrerPolicy:no-referrer`; não importa cliente administrativo, refresh, sessão ou identidade das métricas.

Sucesso exige HTTP 200/201 e confirmação válida `{success:true,data:{recebido:true,recebidoEm}}`, admitindo `demonstracao:true`. Resposta inválida não confirma recebimento. Nenhum contrato F2 foi alterado.

`VITE_FEEDBACK_ATIVO` só habilita quando vale exatamente `"true"`; exemplo e ausência da variável mantêm desligado. Desligado, o Footer não mostra “Avaliar o portal”, `/feedback` informa indisponibilidade sem montar o formulário, e o cliente impede POST. A flag não substitui as verificações F2. Nos testes, a habilitação existiu somente em processos/fixtures isolados; nenhuma configuração pública foi ativada.

O aviso enviado é `feedback-v1`, compatível com o contrato demonstrativo F2. No backend real, as versões aceitas são configuráveis: é necessário manter essa versão autorizada no ambiente de homologação. Não existe endpoint F2 de atualização do aviso. Por isso, `AVISO_DESATUALIZADO` preserva o conteúdo e bloqueia novos envios nessa montagem da página, sem trocar a versão ou reenviar automaticamente. Antes da ativação, o texto e sua versão precisam de aprovação institucional.

## 3. Interface e validação

Formulário de uma coluna, CSS Module, tipos ELOGIO/SUGESTAO/PROBLEMA sem seleção inicial e comentário obrigatório. Não foram adicionados nota, nome, e-mail, anexos, login ou estado de tratamento. O aviso explica finalidade, ausência de protocolo de Ouvidoria, texto provisório, prazos técnicos de 180 dias/24 horas e ausência de garantia de anonimato absoluto. Contato continua separado.

A normalização reproduz a implementação F2: CRLF → LF, NFC e trim externo. Contagem usa pontos de código Unicode; aceita 1–2.000 após normalização e preserva parágrafos. Rejeita controles incompatíveis e surrogates isolados. O limite de 16 KB é conferido sobre o JSON serializado em UTF-8, incluindo escapes. O backend continua sendo a autoridade. A suíte compara diretamente um corpus com o schema F2; esse import ocorre somente no teste, nunca no bundle público.

Há labels visíveis, fieldset/legend, instruções e erros associados, foco no primeiro campo inválido, status com região viva, foco visível e botões acessíveis por teclado. O contador explica a normalização. A confirmação não repete o comentário.

## 4. Idempotência e respostas

Somente a ação de enviar cria uma chave Web Crypto de 32 bytes em base64url sem padding. Payload normalizado e corpo serializado ficam congelados com a chave em memória; uma trava imediata impede cliques concorrentes. Não há POST ao montar, retry automático, fila offline ou persistência em localStorage, sessionStorage ou IndexedDB.

Timeout de 15 segundos, aborto, falha de rede ou confirmação inválida preservam a tentativa. A interface informa que ela pode ter sido recebida e oferece reenvio explícito com corpo/chave idênticos. Abortar a conexão não é tratado como desfazer um commit. Apenas confirmação válida limpa comentário/chave automaticamente.

Editar ou abandonar exige uma escolha explícita após aviso de possível recebimento e duplicação. O comentário permanece para revisão; uma nova chave só surge ao clicar novamente em enviar. Sair ou recarregar perde o estado em memória, conforme aviso visível. A janela local de 24 horas é conservadora, medida desde a preparação com relógio civil e monotônico; expirada, impede replay e exige escolha explícita para preparar nova submissão.

Estados distintos cobrem pronto, validação, enviando, recebido, resultado incerto, limite, desativado, aviso desatualizado, serviço, conflito e expiração. HTTP 400/409/413/415/429/503 recebem mensagens locais. `CHAVE_REUTILIZADA` não gera outra chave silenciosamente; `FEEDBACK_DESATIVADO` nunca confirma sucesso. `Retry-After` numérico ou em data é respeitado, inclusive após optar por editar, sem prometer disponibilidade. Corpo arbitrário do servidor não é exibido.

Quando `demonstracao:true`, a confirmação informa explicitamente recebimento apenas em memória demonstrativa e ausência de persistência no banco.

## 5. Validação executada

Node 24.22.1, dependências locais existentes, sem instalação ou atualização.

| Verificação | Resultado |
| --- | --- |
| Suíte frontend completa | **579/579**, 32 arquivos, 138,71 s |
| Novos testes F3 incluídos acima | **74/74**: 51 de cliente/normalização e 23 de componente |
| Backend pertinente: Feedback unitário, HTTP/demo e documentação | **20/20**, zero falhas/ignorados, 11,65 s |
| Lint frontend completo | Aprovado, inclusive após finalizar o harness visual |
| Build frontend | Aprovado; avisos existentes de chunk >500 KB e importação estática/dinâmica de `PatrimonioEditor` |
| Navegador headless com aplicação real e API fixture | Aprovado; resultados descritos abaixo |
| Preservação SHA-256 | 42 arquivos da base/protegidos sem alteração |
| `git diff --check` | Aprovado; avisos Git de conversão futura LF/CRLF em dois arquivos preexistentes da F2 |
| npm audit backend completo, limiar high | Exit 0; 6 moderadas, zero altas/críticas |
| npm audit backend produção, omit dev, limiar high | Exit 0; zero vulnerabilidades |
| npm audit frontend completo, limiar high | Exit 0; 6 moderadas, zero altas/críticas |
| npm audit frontend produção, omit dev, limiar high | Exit 0; zero vulnerabilidades |

Audits utilizaram as CAs do sistema, sem desabilitar TLS ou reduzir o limiar. Moderadas residuais de desenvolvimento: cadeia ESLint/minimatch em ambos, nodemon no backend e eslint-plugin-react-refresh no frontend. Nenhum override aplicado.

Os testes cobrem os três tipos, Unicode/acentos/emoji/combinações/colagem, limites, chave criptográfica, flags, 200/201, StrictMode, clique duplo, timeout com conclusão tardia, rede, replay idêntico, edição explícita, expiração, erros, Retry-After, aviso, demo e acessibilidade básica. Regressões existentes de Contato e favoritos passaram na suíte completa.

Os 20 testes backend usaram configuração isolada e contratos/demo, sem conexão a banco. Não foi repetida a suíte PostgreSQL da F2. Não houve acesso ao banco real, criação de banco, Docker, migrations, seed ou nova gravação PostgreSQL nesta etapa.

## 6. Navegador e capturas

O harness opt-in `frontend/test/feedback_visual.mjs` inicia Vite e fixtures locais nas portas 5193/5194 e encerra os processos que criou. Usa o aplicativo React real, bloqueia destinos externos e não encaminha ao backend real. Os três POSTs sintéticos permanecem somente na memória da fixture.

Verificações aprovadas:

- Flag falsa: rota indisponível, sem formulário/link e zero POSTs.
- Viewports 1440, 390 e 320 px: sem overflow horizontal, navegação por teclado, seleção e colagem, foco visível.
- Ampliação CSS de 200% no formulário e cenário separado de reflow de 720 px com escala 2: sem overflow horizontal.
- Conexão encerrada pela fixture após registrar o recebimento: interface incerta, seguida de replay explícito com corpo/chave idênticos e resposta 200.
- Origin nativo, ausência de Authorization/Cookie no POST mesmo com cookie sintético existente; favoritos preservados.
- Confirmação demonstrativa explícita.
- Contato preenchido com dados sintéticos: navegação `mailto:` e corpo esperados, sem enviar e-mail; link real do Footer abre `/feedback`.

Capturas privadas em `.cache/feedback_f3/visual/`: `feedback_desativado_390.png`, `feedback_1440.png`, `feedback_390.png`, `feedback_320.png`, `feedback_zoom_200.png`, `feedback_incerto_320.png` e `feedback_demo_320.png`. Capturas desktop/320 foram inspecionadas visualmente. `resultado.json` contém resultados agregados, sem comentários ou chaves. Esses artefatos são ignorados pelo Git e não devem ser publicados.

Limites: navegador headless, fontes externas bloqueadas e fallback local; ampliação CSS/reflow não equivalem à homologação do zoom nativo de todos os navegadores. Não houve aparelhos físicos, leitor de tela ou certificação completa de acessibilidade. A fixture comprova o fluxo browser/cliente, não persistência PostgreSQL ou idempotência distribuída; as evidências dessa persistência continuam sendo as da F2.

## 7. Compatibilidade e pendências

F1/F2 preservadas integralmente. Contato/mailto, favoritos locais, métricas V1/V2, autenticação administrativa, migrations, recuperação e dependências permanecem sem mudanças funcionais. Nenhum dashboard, consulta administrativa ou gráfico de Feedback foi implementado.

F4 ainda deve implementar administração e gráficos, validar browser → API → PostgreSQL em destino autorizado e conferir proxy/HTTPS/logs de produção, quotas entre réplicas e operação de retenção/restauração. A equipe responsável, aviso final, versões aceitas e canais institucionais precisam de revisão antes de ativar. Não há homologação de produção nem aprovação jurídica/institucional implícita nesta entrega.

Entrega encerrada na interface pública F3, com flags falsas por padrão, sem ativação pública, alteração de servidor, commit, push ou deploy.
