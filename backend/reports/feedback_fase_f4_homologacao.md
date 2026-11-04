# F4 — Dashboard administrativo de Feedback e homologação

Data: **03/11/2026**, America/Sao_Paulo. Base: `development/backend`, HEAD `f5f7fb86514345761336833e76b787ff3d9490d7`. Implementação e homologação locais, sem fetch, commit, push, deploy ou ativação pública.

**Resultado:** página ADMIN `/admin/feedback` implementada, com datas brasileiras, filtros, indicadores, gráficos, listagem e detalhe. Fluxo navegador → Nginx HTTPS temporário → API real → PostgreSQL exclusivo validado em etapas, preservando envios confirmados durante as retomadas. Não foram usadas fixtures de resposta para substituir a persistência no ensaio principal.

## 1. Preservação e arquivos

A base foi registrada por SHA-256 antes das alterações: **850 arquivos**. A conferência encontrou alterações somente nos quatro arquivos existentes previstos para F4: `frontend/src/App.jsx`, `frontend/src/features/admin/components/AdminLayout.jsx`, `infra/nginx.conf` e `frontend/nginx.conf`. Os demais 846 arquivos permaneceram idênticos, incluindo documentos F1/F2/F3, backend de Feedback, schema, migrations, autenticação, formulário público, Contato, métricas, favoritos e lockfiles.

Novos arquivos, relativos à raiz:

| Área | Arquivos |
| --- | --- |
| Administração | `frontend/src/features/admin/pages/AdminFeedback.jsx`, `AdminFeedback.module.css`; `frontend/src/features/admin/components/FeedbackDashboard.jsx`, `FeedbackGraficos.jsx` |
| Cliente/validação | `frontend/src/services/feedbackApi.js`, `frontend/src/features/admin/feedbackDashboard.js` |
| Testes frontend | `frontend/test/AdminFeedback.test.jsx`, `frontend/test/feedbackDashboard.test.js`, `frontend/test/fixtures/feedback_admin.js` |
| Ensaio integrado | `frontend/test/feedback_integrado.mjs`; `frontend/test/fixtures/browser_feedback.mjs`, `proxy_feedback.mjs`, `feedback_browser_linux.cjs`, `feedback_https_linux.cjs`; `backend/test/fixtures/feedback_f4_api.mjs` |
| Operação exclusiva F4 | `backend/scripts/homologar_feedback_f4.js`, `backend/scripts/validar_feedback_f4.js` |
| Evidência | Este relatório |

Não houve nova dependência nem modificação de contrato backend. Os scripts históricos F2/H2 foram preservados; a F4 tem trilho próprio de conferência e execução. Configuração privada, certificados de teste, perfis, backups e logs estão exclusivamente em `.cache/`, ignorada pelo Git.

## 2. Contratos e acesso

O menu Gestão mostra **Feedback do portal** apenas para ADMIN. A rota reutiliza `RotaProtegida` com perfil ADMIN, e o cliente reutiliza `api.js`, incluindo Bearer, refresh e encerramento de sessão existentes. EDITOR e visitante não montam a consulta protegida; a API continua sendo a autoridade.

| Consulta | Contrato consumido |
| --- | --- |
| `GET /api/admin/feedback` | `inicio`, `fim`, `tipo?`, `pagina`, `limite=20`; itens somente com ID, tipo e criação; paginação com inteiros seguros |
| `GET /api/admin/feedback/resumo` | Mesmo recorte e `granularidade=dia|mes`; `total`, quantidades por tipo e série em strings decimais exatas |
| `GET /api/admin/feedback/:id` | Registro individual, incluindo mensagem; carregamento somente após abrir Detalhes |

O cliente valida disponibilidade, metadados, recorte, tipos, paginação, ordem, IDs, datas, série esperada e somas. Resposta inconsistente gera erro, nunca zero. Lista e resumo são requisições independentes: os instantes de geração aparecem separadamente, sem afirmar uma transação única entre elas.

A flag pública `VITE_FEEDBACK_ATIVO` não decide acesso administrativo. `FEEDBACK_CONSULTA_ATIVA=false` mostra indisponibilidade, sem gráficos zerados. Consulta ativa com recebimento suspenso foi exercitada e mantém os registros retidos visíveis. O DTO F2 não informa a flag de recebimento; a tela não inventa esse estado.

## 3. Datas brasileiras e filtros

Datas visíveis e entradas dos filtros usam **dd/mm/aaaa**; horários usam **dd/mm/aaaa, HH:mm:ss**, sempre em `America/Sao_Paulo`. Meses aparecem como **mm/aaaa**. Valores enviados à API continuam no formato contratual ISO civil, sem alteração do backend.

O período inicial inclui hoje e os 29 dias civis anteriores. A conversão usa fuso explícito e aritmética de dias civis, sem depender do fuso do dispositivo. Foram testadas virada de dia UTC, transição histórica de horário de verão, ano bissexto, datas impossíveis, futuro e limite inclusivo de 366 dias.

Aplicar ou limpar filtros retorna à página 1 e atualiza lista/resumo. Requisições antigas são canceladas, e respostas atrasadas não substituem a consulta atual. Paginação consulta somente a lista; não multiplica o total nem refaz desnecessariamente o resumo. Atualizar dados utiliza os filtros já aplicados.

## 4. Indicadores, gráficos e estados

Há um total de feedbacks recebidos e ainda retidos, distribuição por Elogio/Sugestão/Problema e evolução diária/mensal. Recharts existente é reutilizado com componente lazy, sem pacote novo. Cada gráfico possui tabela de valores exatos; a tabela permanece disponível se o gráfico não carregar.

As somas dos tipos e dos períodos precisam ser iguais ao total em BigInt. Valores acima de `Number.MAX_SAFE_INTEGER` impedem a representação gráfica e mantêm a tabela sem arredondamento. Datas/meses parciais seguem os indicadores F2; o limite da retenção é informado. Não há nota, satisfação populacional, visitante único ou denominador emprestado das métricas.

Estados separados: carregamento de lista/resumo/detalhe, recorte vazio, consulta desativada, erro recuperável, sessão expirada, acesso negado, registro ausente/excluído/expirado e demonstração. Respostas 400/401/403/404/429/503 recebem mensagens locais, sem ecoar corpo arbitrário do servidor. Dados com mais de cinco minutos ou totais divergentes entre as leituras são sinalizados para atualização. Uma falha de atualização não apresenta a fotografia antiga como atual.

O modo demonstrativo é identificado pelo DTO `demonstracao:true`, com aviso de dados fictícios em memória. Sua cobertura é separada: testes frontend com contratos demonstrativos e regressões backend da store em memória. O ensaio principal não usa `MOCK_DATA`.

## 5. Detalhe e acessibilidade

O modal nativo mostra data/hora brasileira, tipo e comentário. React renderiza o comentário como texto, preservando parágrafos; não há HTML executável, Markdown ou criação automática de links. O conteúdo sintético com `<img ...>` e URL permaneceu literal, sem imagem/script/link no DOM, e foi confrontado com SQL.

Escape fecha, Tab/Shift+Tab permanecem no modal e o foco retorna ao botão original. Há labels, instruções, erros, regiões de status, foco visível, rolagem interna de tabelas e quebra de texto longo. Não foram acrescentadas edição, exclusão, notas, contatos ou estados de tratamento.

Medições nas cores computadas pelo navegador: botão branco/navy **13,80:1**; texto auxiliar sobre fundo claro **5,63:1**. São verificações das combinações medidas, não certificação completa de acessibilidade.

## 6. PostgreSQL descartável identificado

| Item | Valor conferido |
| --- | --- |
| Host/porta | `127.0.0.1:5549` |
| Database | `portal_test`, novo e exclusivo da F4 |
| PostgreSQL | **17.11**, `server_version_num=170011` |
| Cluster | `7704067819706474530` |
| Projeto Docker | `portal_feedback_f4_739089e8` |
| Volume | `portal_feedback_f4_739089e8_pg_feedback_test` |
| Container | `e0c650d1caa3dd7d21912209c648fe8991f3b5336453f8285b2133d7796f5b05` |
| Imagem | `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24` |
| Estado inicial | Container/volume ausentes antes da criação; zero tabelas públicas antes das migrations |
| Papéis restritos | `portal_api`, `portal_migrator`, `portal_metricas_operador`, `portal_feedback_operador` |

Os quatro papéis foram conferidos sem superuser/CREATEDB/CREATEROLE/BYPASSRLS. Bootstrap `portal_test` foi usado exclusivamente na preparação e nas fixtures autorizadas. A API real executou com `portal_api`; o descarte usou o operador dedicado. A conferência de identidade usa READ ONLY e é repetida antes das etapas operacionais.

As **12 migrations** foram aplicadas desde zero na primeira execução; a segunda execução de `migrate deploy` não encontrou pendências. Nomes, conclusão, ausência de rollback e checksums dos bytes locais foram conferidos. Nenhuma migration histórica foi reescrita, inclusive seus finais de linha. Integridade SQL histórica, V2 e Feedback passou antes e depois do ensaio.

Backups sintéticos privados em formato custom foram criados antes das fixtures e antes do navegador. Senhas distintas/aleatórias e chaves próprias ficaram fora de comandos públicos e relatórios. Nenhuma conexão foi feita a `patrimonio_guarulhos`, a outros clusters históricos ou ao Compose normal.

## 7. Fluxo real e contagens

| Cenário | Evidência |
| --- | --- |
| Formulário público real | Elogio, sugestão e problema sintéticos, normalização/Unicode e confirmação 201; textos confrontados com SQL |
| Resposta perdida após COMMIT | O servidor de teste encerrou somente o transporte após o sucesso real da aplicação; UI informou incerteza |
| Reenvio explícito | Mesma chave/corpo, resposta **200**, sem novo registro; **4 feedbacks e 4 recibos** após os três tipos e o quarto envio com resposta perdida |
| ADMIN real | Login, menu, rota, lista, resumo e detalhe; gráficos/tabelas com o total real |
| Agregados iniciais | Total 4; soma dos tipos 4; soma da série 4 |
| Filtro por tipo/mês | Sugestão com total 1 antes das fixtures de paginação; granularidade mensal e período parcial identificados |
| Vazio | Intervalo anterior aos envios, consultado com sucesso, total zero legítimo |
| Paginação | 21 registros adicionais sintéticos: total retido 25, duas páginas, cinco itens na segunda; resumo permanece 25 |
| Retenção | Um registro vencido adicional ficou fora de lista/resumo e retornou 404 no detalhe antes da remoção física |
| Descarte | Operador removeu esse único feedback vencido; nova execução final removeu somente um recibo vencido |
| Banco indisponível | Apenas o container F4 foi parado; UI apresentou erro e ocultou totais; reinício com mesmo cluster recuperou a consulta |
| Autorização | ADMIN 200; visitante após logout 401; EDITOR 403 em lista, resumo e detalhe, com menu ausente |
| Sessão | Expiração natural do JWT de teste, renovação real e uso do refresh confirmado no SQL; logout real |
| Compatibilidade | Histórico administrativo e V1 responderam 200; V2 desativada permaneceu indisponível, conforme contrato |

O caminho público usou `credentials:omit`; não houve POST antes da ação explícita. API recebeu os envios públicos sem JWT/cookie. O Nginx também remove esses headers na rota pública. Não foi criada relação com identidades das métricas.

Dois registros adicionais foram usados nos testes específicos do proxy e da janela do recibo. **Estado final SQL: 27 feedbacks sintéticos (3 elogios, 22 sugestões, 2 problemas), 5 recibos após descarte final.** Os 21 registros de paginação foram inseridos por fixture SQL autorizada, portanto não possuem recibos de submissão HTTP. As capturas finais refletem total 27; as primeiras capturas de detalhe e estados refletem etapas anteriores.

## 8. Nginx e HTTPS

O Compose normal monta `infra/nginx.conf` sobre a configuração copiada de `frontend/nginx.conf` na imagem. Os dois arquivos foram atualizados e conferidos com conteúdo equivalente, preservando suas rotas existentes. Nenhum deles foi instalado em servidor real.

Regras próprias de Feedback: caminho público exato, POST/OPTIONS, recusa de query/subcaminho, corpo de 16 KB, buffer e timeout de corpo, quotas próprias por rede/global, conexões limitadas, timeouts de upstream e `proxy_next_upstream off`. Respostas de limite incluem Retry-After; falhas de conexão da borda são 503. Host é preservado, e headers de proxy são substituídos pelos valores da conexão confiável; `Forwarded`, Authorization e Cookie públicos são removidos.

Access log de Feedback público/administrativo contém apenas instante, status e duração. O error log bruto dessas localizações é suprimido para não registrar URI/referrer arbitrários. Canais operacionais definitivos devem usar metadados permitidos, sem habilitar debug bruto. Logs foram conferidos com canários sintéticos, sem mensagem/chave/credenciais nesses registros.

As diretivas foram revisadas com a documentação oficial de [limitação de requisições](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html) e [proxy HTTP](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header). A zona compartilhada do Nginx coordena seus workers; não representa quota distribuída entre hosts.

O ensaio usou **Nginx 1.31.6**, porta temporária `8445`, certificado de teste e backend real. Foram observados **201, 200, 409, 429 e 503**, além de corpo 413, subcaminho 404, query recusada e neutralização dos headers forjados. A janela vencida retornou `ENVIO_EXPIRADO`, sem novo INSERT.

O AVG do Windows interceptava o certificado autoassinado. O ensaio TLS passou a executar navegador/cliente na imagem Docker de testes já existente, sem mudar o antivírus ou o trust store do Windows. O cliente TLS verificou a CA temporária; Chromium aceitou exclusivamente o SPKI do certificado de teste no perfil descartável. Não houve `NODE_TLS_REJECT_UNAUTHORIZED=0` nem desativação global de validação TLS.

A regressão independente V2 passou para **ambos** os arquivos Nginx: CA/TLS, cookies Secure/HttpOnly/Lax/Host, rejeição de spoofing, corpo de métricas de 2 KB, uploads existentes de 12 MB e 429 da borda. A configuração HTTPS definitiva, certificados reais e topologia de proxies permanecem fora desta homologação local.

## 9. Testes e ferramentas

Node **24.22.1**, Prisma **7.10.1**, dependências locais existentes, sem atualização.

| Verificação | Resultado |
| --- | --- |
| Backend completo, com PostgreSQL | **612/612**, zero falhas/cancelados/ignorados, 202,71 s |
| Frontend completo | **619/619**, 34 arquivos, 181,44 s |
| Novos testes frontend F4 | **40/40**, incluídos nos 619 |
| Prisma validate/generate | Aprovados |
| Lint backend/frontend | Aprovados |
| Build frontend final | Aprovado; avisos existentes de chunk >500 KB e importação estática/dinâmica de `PatrimonioEditor` |
| SQL/migrations/grants | 12 aplicadas, repetição sem pendências, nomes/checksums e integridade aprovados; privilégios exercitados na suíte real |
| Proxy Feedback real | Códigos e proteção descritos na seção 8 aprovados, com continuação delimitada do harness |
| Proxy V2 | Dois arquivos aprovados, incluindo TLS e uploads |
| Capturas finais/contraste | Aprovados nos cenários descritos na seção 10 |
| `git diff --check` | Aprovado; avisos de conversão futura LF/CRLF em arquivos existentes, sem erro de whitespace |
| npm audit backend completo, limiar high | Exit 0; 6 moderadas, 0 altas/críticas |
| npm audit backend produção, omit dev, limiar high | Exit 0; 0 vulnerabilidades |
| npm audit frontend completo, limiar high | Exit 0; 6 moderadas, 0 altas/críticas |
| npm audit frontend produção, omit dev, limiar high | Exit 0; 0 vulnerabilidades |

Moderadas residuais de desenvolvimento: cadeia ESLint/minimatch em ambos, nodemon no backend e eslint-plugin-react-refresh no frontend. As consultas usaram CAs do sistema, sem reduzir o limiar, aplicar override ou upgrade major.

As suítes incluem regressões H1/H2, V1/V2, login/refresh/logout, modo demonstrativo, Contato, favoritos e F3. O harness histórico H2 de 11 migrations não foi redirecionado à F4; a regressão corrente de auditoria integra os 612 testes. Ajustes finais de espaçamento/CSS receberam build e conferência visual; não alteraram lógica após a suíte completa.

## 10. Capturas e limites de acessibilidade

Artefatos privados em `.cache/feedback_f4/`:

- `admin_final_1440.png`, `admin_final_390.png`, `admin_final_320.png`: lista e gráficos após carregamento, total 27.
- `detalhe_1440.png`, `detalhe_390.png`, `detalhe_320.png`, `mensagem_longa_320.png`: foco, texto literal e rolagem.
- `vazio.png`, `consulta_desativada.png`, `banco_indisponivel.png`: estados reais da interface.
- `zoom_final_200.png`: reflow equivalente a 1440 px ampliado a 200%, com viewport de 720 pixels CSS e escala 2.
- `visual_final.json`, logs de suítes/audits, `integrado.json` e checkpoints privados: resultados locais.

Desktop, mobile estreito, detalhe longo e ampliação foram inspecionados visualmente. As tabelas largas usam rolagem interna, sem overflow horizontal da página. Capturas iniciais feitas durante lazy loading foram substituídas pelas versões `admin_final_*` para revisão dos gráficos.

Limites: viewports e reflow simulados em Chromium, fontes externas bloqueadas, sem aparelho físico ou leitor de tela. A tentativa de ampliar somente o elemento principal via CSS não representa zoom nativo e mostrou overflow; não foi contabilizada como aprovação. A validação final usa reflow/escala, sem certificar o zoom nativo de todos os navegadores. Leitor de tela e zoom nativo permanecem pendências explícitas.

## 11. Intercorrências e retomadas

A preparação HTTPS precisou de caminho explícito do OpenSSL, espera de prontidão e isolamento da interceptação do AVG. Essas tentativas ocorreram antes de envios.

No primeiro ensaio real, o elogio foi confirmado. A sugestão seguinte retornou 503 devido à resolução A/AAAA do Docker Desktop enquanto a API local escutava IPv4. A configuração temporária foi corrigida para o IPv4 conferido; READ ONLY encontrou um feedback/recibo. **O usuário autorizou explicitamente repetir somente a sugestão.** O elogio foi preservado e não reenviado.

Após completar os cenários do navegador, o harness tentou ler a evidência IPC antes de liberar o event loop bloqueado pelo cliente Docker síncrono. As respostas 201/200/409 e o INSERT correspondente já haviam sido confirmados. A falha foi de asserção do ensaio, não de persistência. A continuação `proxy` conferiu o registro existente sem repetir o INSERT, corrigiu a espera IPC e concluiu os cenários restantes; o teste de expiração usou um registro sintético próprio. As capturas finais foram feitas em uma etapa somente de consulta administrativa. Não se declara aprovação da primeira tentativa nem execução monolítica sem interrupções.

## 12. Reprodução e operação

O trilho exige `HOMOLOGACAO_FEEDBACK_F4=1`. A partir de `backend/`, `scripts/homologar_feedback_f4.js preparar` recusa reutilizar identidade, porta ocupada, container ou volume existentes; cria exclusivamente o Compose de Feedback, identifica o destino, aplica migrations, restringe grants, cria backup, executa suíte e integridade. `fixtures` cria apenas os dois usuários sintéticos, após confirmar base limpa e backup. Não repetir preparação/fixtures após falha sem revisão e autorização.

Em `frontend/`, `test/feedback_integrado.mjs` executa o ensaio; `proxy` e `visual` são continuações delimitadas. Checkpoints privados impedem repetir silenciosamente gravações iniciadas. O processo precisa das imagens locais identificadas pelo harness, Node 24 e OpenSSL; não é um comando de produção nem um workflow Linux genérico homologado.

Etapas `conferir`, `integridade`, `prisma`, `descarte` e `parar` verificam o destino F4. O descarte usa o operador mínimo e backup recente; não instala loop/timer. API, Vite, navegadores e proxies temporários são encerrados ao terminar. O volume e backups sintéticos são preservados para revisão; o container PostgreSQL F4 é parado ao encerrar a entrega.

## 13. Parecer e pendências

**Pronta para revisão técnica e preparação de checkpoint Git**, sem autorização para commit/publicação. A interface administrativa, os contratos, a persistência e os cenários integrados locais foram exercitados. Nenhum dado real, schema ou migration histórica foi modificado.

Antes da ativação: aprovar equipe responsável, aviso final/versão, prazos/exclusões, rotina de retenção/restauração e política de backups; homologar infraestrutura definitiva, certificados, proxies confiáveis, logs operacionais e quotas entre réplicas. Também permanecem leitor de tela, zoom nativo/aparelhos físicos, carga de produção, instalação limpa de dependências e execução do futuro CI.

As flags públicas e backend continuam falsas por padrão. Não houve produção, Compose normal, timers/certificados reais, commit, push ou deploy. Esta entrega não afirma anonimato absoluto, prevenção perfeita de abuso nem conformidade jurídica/institucional.
