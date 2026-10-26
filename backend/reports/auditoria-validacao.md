# Validação da auditoria e dos logs — 26/10/2026

Implementação e validação realizadas no `.tmp-target-portal`, branch `development/backend`, antes da autorização posterior para commit e push. Os cinco relatórios locais não rastreados que já existiam foram preservados. As mudanças ficaram no backend; não houve alteração de frontend, permissões, schema, índices ou migrations.

## Resultados executados

| Verificação | Resultado |
| --- | --- |
| `npm.cmd run prisma:validate` | Schema válido |
| `npm.cmd run prisma:generate` | Client gerado com sucesso; sem acesso/escrita no banco |
| `npm.cmd test` | 500 testes: 475 aprovados, 0 falhas, 25 ignorados por dependência de PostgreSQL exclusivo |
| Verificação final: `node --test --test-concurrency=1 test/auditoria.test.js test/sensitiveCache.test.js test/logs.test.js` | 28 aprovados, 0 falhas, após o ajuste do cabeçalho privado também nos erros do parser |
| `npm.cmd run lint` | Aprovado |
| Swagger | Contrato validado pela suíte `docs.test.js`, com as novas rotas incluídas |
| `git diff --check` | Aprovado |

As contagens da verificação final não devem ser somadas às da suíte completa: há testes repetidos e um teste adicional de erro do parser. O npm foi executado por `npm.cmd` porque a política local do PowerShell bloqueia o wrapper `npm.ps1`.

## Verificação pendente

Não havia `TEST_DATABASE_URL`/`TEST_DATABASE_EXCLUSIVE` configurados. O executável Docker está disponível, mas o daemon não estava acessível (`docker_engine` ausente). Portanto, **a integração PostgreSQL e o rollback real não foram executados**. A nova suíte `test/auditoria.integration.test.js` ficou ignorada com motivo explícito, junto às integrações já existentes. Os testes com mocks comprovam chamadas, conteúdo dos eventos e propagação de erros; não comprovam transações reais.

Nenhuma migration, seed, importação ou reset foi executado em banco compartilhado. A integração adicionada exige um PostgreSQL separado, já preparado e validado pela proteção `scripts/assert-test-db.js`. Para executá-la nesse ambiente autorizado: `node --test test/auditoria.integration.test.js` com as variáveis exclusivas configuradas. Ela causa falha de FK real na INSERT da auditoria e verifica a reversão de operações e a restauração dos arquivos de suas próprias fixtures.

Checks/build do frontend não foram executados porque a solicitação final restringe a entrega ao backend.

## Entrega e limites

Consulte [Auditoria e logs](../docs/AUDITORIA_E_LOGS.md) para o mapa de operações auditadas, os eventos de segurança/operação, o contrato da consulta, os exemplos seguros e a orientação de coleta/rotação/retenção em stdout/stderr. Hero e outros recursos sem escrita administrativa disponível não receberam novas funcionalidades. Scripts de manutenção fora da API mantêm seus fluxos anteriores.

As ações antigas não são reconstruídas; a auditoria de regiões anterior foi preservada. A API não torna o banco inviolável para administradores com acesso direto. Não há atomicidade entre disco e banco nem garantia de entrega se o sink de logs falhar. Persistência, coleta, retenção e backups exigem configuração da hospedagem; nenhuma plataforma externa foi implementada.

## Arquivos desta entrega

- `backend/docs/AUDITORIA_E_LOGS.md`
- `backend/reports/auditoria-validacao.md`
- `backend/src/app.js`
- `backend/src/controllers/adminController.js`
- `backend/src/controllers/auditoriaController.js`
- `backend/src/docs/auditoria.js`
- `backend/src/docs/openapi.js`
- `backend/src/middlewares/authenticate.js`
- `backend/src/middlewares/errorHandler.js`
- `backend/src/middlewares/loginLimiter.js`
- `backend/src/middlewares/multipart.js`
- `backend/src/middlewares/requestId.js`
- `backend/src/routes/auditoriaRoute.js`
- `backend/src/routes/index.js`
- `backend/src/schemas/auditoriaSchema.js`
- `backend/src/server.js`
- `backend/src/services/adminService.js`
- `backend/src/services/auditoriaService.js`
- `backend/src/services/authService.js`
- `backend/src/services/conteudoService.js`
- `backend/src/services/dashboardMetricasService.js`
- `backend/src/services/imageService.js`
- `backend/src/services/metricasService.js`
- `backend/src/services/midiaService.js`
- `backend/src/services/patrimonioEditorialService.js`
- `backend/src/services/patrimonioService.js`
- `backend/src/services/referenciaService.js`
- `backend/src/services/regiaoService.js`
- `backend/src/utils/arquivoUpload.js`
- `backend/src/utils/arquivos.js`
- `backend/src/utils/auditoria.js`
- `backend/src/utils/logger.js`
- `backend/src/utils/quarentenaUpload.js`
- `backend/test/admin.test.js`
- `backend/test/adminManagement.test.js`
- `backend/test/adminPatrimonio.test.js`
- `backend/test/auditoria.integration.test.js`
- `backend/test/auditoria.test.js`
- `backend/test/auditoriaFixture.js`
- `backend/test/auditoriaOperacoes.test.js`
- `backend/test/authSessionFixture.js`
- `backend/test/conteudo.test.js`
- `backend/test/d1aMidia.test.js`
- `backend/test/docs.test.js`
- `backend/test/imageDeletionSecurity.test.js`
- `backend/test/logs.test.js`
- `backend/test/midiaArquivos.test.js`
- `backend/test/patrimonio.test.js`
- `backend/test/referencia.test.js`
- `backend/test/uploadInfra.test.js`
