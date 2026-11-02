# H2 — Homologação integrada do Histórico de Alterações

Data: **01/11/2026**, America/Sao_Paulo. Branch `development/backend`, HEAD `c6760717e4b4a86cead2e1a9bbc7fa9bfb3b1899`. Referências: [diagnóstico](diagnostico_dashboard_pos_atualizacao.md) e [H1](historico_alteracoes_h1.md).

**Fluxo integrado homologado localmente, com correção pontual de contraste. Entrega para revisão; não libera produção.** Foram usados navegador, autenticação, Express e PostgreSQL reais de teste. Os audits encontraram pendências de dependências, detalhadas abaixo. Nenhum acesso ao banco real, Compose normal, alteração de autenticação, contrato, schema, migration histórica, dependência, flag pública, commit, push ou deploy foi realizado.

## 1. Git e arquivos desta etapa

A árvore já continha a H1 sem commit: rota, menu, página, CSS, formatador, cliente, testes e relatório. Também continha os dois relatórios de diagnóstico. Esse trabalho foi preservado; o diagnóstico de 31/10 permanece como fotografia daquele momento, sem reescrita retroativa. Não houve fetch ou alteração de referências Git.

| Arquivo | Alteração H2 |
| --- | --- |
| `frontend/src/features/admin/pages/AdminAuditoria.module.css` | Duas regras locais para contraste dos botões da página e do modal |
| `backend/scripts/homologar_auditoria.js` | Preparação isolada, identificação, validação, fixtures e conferência final READ ONLY |
| `frontend/test/auditoria_integrada.mjs` | Ensaio opt-in navegador → API → SQL, autenticação, estados, capturas e contraste |
| Este relatório | Evidências, correção e pendências |

As mudanças de rota/menu e os demais arquivos H1 que aparecem no status não são novas alterações da H2. Não foram modificados serviços de negócio, autenticação, Dashboard V1/V2, favoritos, arquivos de ambiente reais, manifests ou locks.

## 2. Destino e isolamento

| Item | Evidência |
| --- | --- |
| Runtime local | Node **24.22.1**, Windows, cmd.exe |
| Projeto | `portal_h2_20261101_test`, exclusivamente `compose.metricas.test.yml` |
| Container / volume novos | `portal_h2_20261101_test-db_test-1` / `portal_h2_20261101_test_pg_test` |
| Endpoint | **127.0.0.1:5439/portal_test**; publicação somente loopback |
| PostgreSQL / cluster | **17.11 / 7703217233335377954** |
| Estado inicial | Volume/container inexistentes; zero tabelas públicas e zero outras sessões no banco |
| Migrations | `portal_migrator`; **11 concluídas**, zero rolled-back, checksums iguais aos arquivos locais |
| API / operação | `portal_api` / `portal_metricas_operador` |
| Fixtures e inspeção | `portal_test`, somente no descartável identificado |
| Frontend / backend temporários | Vite em `127.0.0.1:5190`; Express em porta loopback efêmera |

Os clusters anteriores não foram reutilizados. O Docker Desktop foi iniciado para o ensaio; nenhum comando de inicialização do Compose normal foi executado. O trilho aplicou as 11 migrations desde vazio e repetiu `migrate deploy` sem pendências, sem `resolve`, reset ou substituição por SQL manual. Os privilégios específicos foram aplicados no descartável pelo trilho existente.

A suíte SQL testou os papéis restritos. A conferência final reafirmou: migrator sem superuser/CREATEDB/CREATEROLE; API e operador sem CREATE no banco/schema. API sem DELETE das métricas; operador sem acesso a usuários, INSERT de recibos ou UPDATE de totais. Os checksums das 11 migrations foram reconferidos após os ensaios. As divergências históricas das FKs de autenticação não foram alteradas.

Antes das fixtures H2, foi guardado backup **somente do descartável** já migrado, em `.cache/h2/antes_fixtures.sql`. URLs, senhas aleatórias e checkpoints ficam exclusivamente em `.cache/h2/privado.json`. O frontend usa `envDir:false`; o Express recebe ambiente explícito, `MOCK_DATA=false`, papel API e flags de coleta/consulta falsas. O navegador usa perfil temporário próprio. Nenhuma resposta de login, auditoria ou persistência é interceptada.

## 3. Fluxo real e evidências SQL/HTTP

O login ADMIN foi realizado pelo formulário da aplicação. A lista e o detalhe vieram dos endpoints reais; as operações de negócio foram enviadas por HTTP autenticado dentro do navegador. Elas não foram preenchidas automaticamente pelos formulários de edição de cada área: o foco do ensaio é o Histórico, seus contratos e sua persistência.

| Operação na fixture | Auditoria verificada |
| --- | --- |
| Criar, editar, publicar e arquivar um patrimônio | `PATRIMONIO_CREATE/UPDATE/PUBLISH/ARCHIVE` |
| Criar região, editar descrição e definir `ativo=false` | `REGIAO_CREATE/UPDATE`, com diferenças permitidas |
| Editar outro ADMIN; renomear o ator | `USER_UPDATE`; ator e alvo distintos, nome do ator proveniente do cadastro atual |
| Criar dois fatos, editar um, reordenar e excluir um | `FATO_CREATE/UPDATE/REORDER/DELETE`; UUID pai identificado corretamente |
| Quinze revisões distintas de descrição regional | Paginação real, sem contadores fabricados no frontend |
| Trocar a senha do segundo ADMIN | `USER_PASSWORD_CHANGE`, `old_values` e `new_values` SQL **null**; sessões revogadas |

As **29 operações de negócio** geraram seus eventos reais. Cinco eventos legados foram inseridos explicitamente como fixtures SQL para casos que não seriam produzidos normalmente pelos serviços atuais: responsável ausente, ação/recurso desconhecidos, URLs antigas com informações a sanitizar, valores omitidos/null/vazio/zero e um evento removível para 404. Essas fixtures não foram apresentadas como operações normais do produto.

A suíte backend anterior deixou 77 eventos sintéticos de seus próprios testes. A H2 preservou esses registros. Após excluir somente a fixture removível e acrescentar a troca de senha, a conferência final encontrou **110 eventos, um patrimônio e três usuários**: 77 da suíte + 29 de negócio + quatro legados remanescentes. Nenhum acervo real foi copiado.

Lista HTTP e SQL foram comparadas em todas as páginas, inclusive além dos 100 itens máximos por pedido. Total e sequência `created_at DESC, id DESC` coincidiram. A lista não transmitiu `oldValues/newValues`. Nos detalhes, os valores retornados coincidiram com os valores persistidos após a lista positiva de sanitização do backend. Foram conferidas **21 aberturas de detalhe** no fluxo principal, incluindo repetições para os três tamanhos de tela, sem exceções JavaScript não tratadas.

Filtros reais de responsável/ação/entidade/período e UUID do alvo passaram. A busca de pessoa em `/api/admins` resolveu o UUID enviado à auditoria. A aplicação voltou à página 1 ao filtrar; total, paginação e recarga vieram do servidor. O intervalo paulista foi enviado em ISO correspondente aos limites inclusivos do dia, sem depender do fuso do computador.

Evidências locais: `.cache/h2/navegador.json`, `extras.json`, `final.json`, `destino.json`, logs HTTP sanitizados e `.cache/h2_backend.log`. O arquivo `final.json` contém os 11 nomes/checksums e a conferência dos papéis.

## 4. Frases e valores

Exemplos efetivamente apresentados no ensaio, com dados exclusivamente sintéticos:

- “Em 01/11/2026, 12:02:46, ADMIN H2 — cadastro atual alterou usuário dd42742b-f8e0-403a-a906-8fc6ef5ac256.” O UUID é do outro ADMIN, não do ator.
- “Em 01/11/2026, 12:02:46, ADMIN H2 — cadastro atual reordenou itens de patrimônios · fatos do patrimônio 1b99ccb9-348f-49dd-b529-ee0f2be5a6e6.” O recurso pai é explícito.
- “Em 01/11/2026, 12:02:48, foi registrada atualização em Regiões. Responsável não disponível no registro.”
- “Atividade administrativa registrada em 01/11/2026, 12:02:48.” Para a ação legada desconhecida, sem invenção de verbo ou intenção.
- “Em 01/11/2026, 18:00:28, Outro ADMIN atualizado H2 alterou sua senha.” Sem comparações de senha/hash/token.

Foram conferidos criação/publicação/arquivamento, fato já excluído, patrimônio cujo nome mudou depois da criação, identidade atual do responsável e ausência de ator. Null, omissão, zero, false e texto vazio permaneceram distintos. URLs legadas com diferenças privadas tornaram-se iguais após sanitização; a interface informou a limitação da diferença apresentada. Credenciais e parâmetros privados não apareceram no detalhe.

O texto `<img src=x onerror=alert('H2')>` persistido na história apareceu literalmente; não criou imagem, script ou iframe no modal. Não houve HTML bruto ou IA. Os avisos de cadastro atual e de seção derivada do recurso permaneceram visíveis; nenhuma sessão ou página navegada foi inventada.

## 5. Autenticação, estados e compatibilidade

| Cenário | Resultado |
| --- | --- |
| ADMIN autenticado | Lista/detalhe 200, `private, no-store` |
| EDITOR | Menu ausente; rota direta recusada; lista e detalhe HTTP **403** |
| Após logout / sem Bearer | **401**, sem dados de auditoria |
| JWT de teste expira naturalmente após 180 s | 401 `ACCESS_TOKEN_EXPIRED`; Axios renova no endpoint real, rotação confirmada em `refresh_tokens`, consulta volta a 200 |
| Troca de senha | Auditoria sem valores; sessão antiga recusada e retorno ao login |
| Detalhe aguardando lock real | Loading; fechamento cancela consumidor; abertura de outro evento não recebe valores atrasados do anterior |
| Evento removido depois da lista | **404**, mensagem própria e fechamento do modal |
| PostgreSQL H2 realmente parado | **500** sanitizado, `private, no-store`; tela de erro com nova tentativa, sem apresentar zero eventos |
| Mesmo container reiniciado | Cluster reconferido; nova tentativa de leitura recupera a lista |
| V1 / V2 no processo do ensaio | V1 conta o único bem sintético; V2 retorna `disponivel:false` |

O backend atual usa erro 500 genérico para essa falha de conexão na cadeia administrativa. A expectativa inicial de 503 do harness foi corrigida após conferir `errorHandler`; não foi modificado o contrato nem mascarada uma falha da aplicação. O teste 503 simulado da H1 permanece coberto pela suíte frontend, mas não é o status observado nesta interrupção real.

A seleção real/demo, autenticação, mídia, auditoria e métricas foram exercitadas pela suíte backend completa, incluindo `mockData.test.js` e os contratos H1. Os testes demo continuam em memória e processos próprios; não substituem as integrações PostgreSQL. As regressões frontend preservam V1/V2, sessão, regiões, favoritos locais e participação. Não foi iniciado nenhum recurso novo de Dashboard.

## 6. Interface, correção e capturas

Foi comprovado contraste insuficiente nos botões que herdavam azul `#3ea3dc` sobre branco: **2,81:1**. Duas regras no CSS module da H1 agora usam `#2b255c` para esses botões na página e no modal: **13,80:1**, medido nas cores computadas pelo navegador. Nenhum estilo global foi alterado. Texto do modal: 14,86:1; notas: 7,50:1; contorno de foco contra branco: 6,00:1. Essas medidas não constituem uma auditoria completa de todas as combinações do portal.

Desktop 1440 px e viewports 390/320 px passaram sem overflow da página ou modal. Lista e comparação larga possuem rolagem interna; texto extenso permaneceu acessível por rolagem. Foram exercitados Enter, Tab, Shift+Tab, Escape, contenção e restauração de foco, carregamento, vazio filtrado, 404 e erro recuperável. Capturas inspecionadas visualmente:

- [Lista desktop 1440](../../.cache/h2/historico_final_1440.png), [390](../../.cache/h2/historico_final_390.png) e [320](../../.cache/h2/historico_final_320.png).
- [Detalhe desktop](../../.cache/h2/detalhe_final_1440.png), [390](../../.cache/h2/detalhe_final_390.png) e [320 com foco](../../.cache/h2/detalhe_final_320.png).
- [Conteúdo extenso e rolagem](../../.cache/h2/detalhe_rolagem_390.png), [carregamento](../../.cache/h2/carregando.png), [404](../../.cache/h2/evento_404.png), [erro real 500](../../.cache/h2/indisponivel_500.png) e [vazio filtrado](../../.cache/h2/vazio.png).

As capturas da lista mostram 109 eventos, anteriores à última troca de senha; o total final SQL é 110. São imagens autenticadas contra a API real, não fixtures de resposta. Não havia leitor de tela configurado no ensaio; NVDA/VoiceOver/Orca e aparelhos físicos permanecem pendentes. Viewport em navegador desktop não equivale a aparelho móvel real.

## 7. Testes e ferramentas

| Validação | Resultado |
| --- | --- |
| Backend completo com integrações PostgreSQL | **581 aprovados, zero falhas, zero ignorados** |
| Frontend completo antes da correção de contraste | **505 aprovados em 30 arquivos** |
| Frontend completo após ajuste, dois workers | **505 aprovados em 30 arquivos, zero falhas/ignorados**, saída 0 |
| Lint backend/frontend | Aprovados; backend novamente após inclusão da conferência final |
| Build frontend após ajuste | Aprovado |
| Prisma validate/generate | Aprovados, Prisma 7.10.1; nenhum schema/dependência atualizado |
| Integridade SQL original e V2 | Aprovadas no trilho isolado; verificações finais em READ ONLY |
| Migrations / repetição / checksum | 11 concluídas desde vazio; nenhuma pendente; 11 checksums reconferidos |
| Navegador principal / adicional | Aprovados; autenticação/API/SQL reais, incluindo falha e recuperação |
| Sintaxe dos scripts / diff | JavaScript conferido; `git diff --check` aprovado |

A suíte backend inclui os testes específicos de auditoria/rollback real, segurança, refresh, demo, mídia, V1/V2, operação e privilégios. Não foram contabilizados testes ignorados como evidência. Os ajustes de seletor/espera do harness respeitaram os contratos: paginação maior que 100, texto DOM versus transformação CSS, retorno do login à rota de origem e status real de indisponibilidade. Escritas de negócio concluídas foram preservadas por checkpoint, sem reenvio para contornar falhas de asserção de leitura.

A tentativa final do Vitest dentro do sandbox ficou sem progresso nos workers e foi interrompida. A execução autorizada fora do sandbox terminou em 119,87 segundos com os 505 testes aprovados; não foi necessário alterar testes ou configuração. A retomada de um checkpoint de troca de senha no harness foi ajustada para encerrar a nova sessão sem repetir a troca; esse ramo de retomada recebeu conferência sintática, enquanto o fluxo efetivo de troca e invalidação foi executado integralmente.

Build principal: **699,09 kB / 197,89 kB gzip**; permanecem os avisos anteriores de chunk acima de 500 kB e import dinâmico ineficaz do editor. Não houve mudança de limite ou pacote.

### Audits executados

| Escopo | Resultado npm audit |
| --- | --- |
| Backend completo | **6 moderadas**, saída 1 |
| Backend produção (`--omit=dev`) | **0**, saída 0 |
| Frontend completo | **7 moderadas + 2 altas**, saída 1 |
| Frontend produção (`--omit=dev`) | **2 altas**, saída 1 |

São contagens de pacotes reportados pelo npm, com propagação transitiva, não nove falhas independentes. As moderadas se relacionam a `minimatch` ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)); as altas, a `follow-redirects` e sua propagação para `axios` ([GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p)), conforme os JSONs da execução. A classificação do audit não demonstra explorabilidade no bundle de navegador; requer triagem própria. Não houve `audit fix`, instalação ou atualização fora do escopo H2. **Não declarar dependências sem vulnerabilidades.**

## 8. Reprodução delimitada e parecer

Os scripts exigem `HOMOLOGACAO_H2_EXCLUSIVA=1`. No diretório raiz, `node backend/scripts/homologar_auditoria.js preparar`, `validar`, `fixtures` são etapas sequenciais destinadas ao projeto novo identificado acima; preparar recusa recursos existentes. A etapa `conferir` só faz consultas READ ONLY. No frontend, `node test/auditoria_integrada.mjs` executa o fluxo principal; o argumento `extras` executa os estados adicionais e interrompe/reinicia **somente** o container H2 conferido. Nenhum desses comandos inicia a aplicação normal ou instala agendamentos. Não repetir escrita falha/incerta sem a autorização exigida pelo AGENTS.md.

Logs e artefatos locais: `.cache/h2_backend.log`, `h2_frontend_final.log`, logs finais de lint/build/Prisma, quatro JSONs de audit e `.cache/h2/`. **Não publicar `.cache/`**: inclui também backup, credenciais, perfis, cookies e checkpoints privados. Os processos temporários de navegador/Vite/Express são encerrados ao terminar; PostgreSQL e volume sintéticos permanecem para inspeção.

**Parecer:** H2 funcionalmente homologada no ambiente local descrito, com correção de contraste e evidências reais de persistência. A entrega está pronta para revisão técnica. Permanecem triagem dos audits, leitor de tela/aparelhos físicos, CI do futuro commit, infraestrutura final HTTPS/proxy e políticas institucionais de retenção/acesso/backup da auditoria. O ensaio local foi HTTP loopback; não certifica HTTPS de produção. Não houve indício de lentidão que justificasse novos índices; 110 eventos não homologam paginação profunda ou carga de produção.

A revisão favorável da funcionalidade não autoriza implantação, alteração de privilégios no banco real ou ativação de métricas. Feedback, Acessos Gerais e Favoritos Globais permanecem fora desta etapa.
