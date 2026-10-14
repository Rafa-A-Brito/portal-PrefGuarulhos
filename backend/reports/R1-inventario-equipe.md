# R1 — inventário dos arquivos recebidos no merge

Comparação `git diff --name-status 3980b24 cfca905 -- backend`: 101 caminhos. A/M indicam adição/modificação no merge. A lista não atribui autoria exclusiva do arquivo.

| Estado no merge | Caminho | Tratamento |
| --- | --- | --- |
| M | `backend/.env.example` | Código/configuração auditado; ver decisões R1 |
| M | `backend/.gitignore` | Código/configuração auditado; ver decisões R1 |
| M | `backend/README.md` | Código/configuração auditado; ver decisões R1 |
| A | `backend/docs/classificacao-territorial.md` | Documentação reconciliada ou identificada como referência |
| A | `backend/docs/dashboard.md` | Documentação reconciliada ou identificada como referência |
| M | `backend/docs/database.md` | Documentação reconciliada ou identificada como referência |
| A | `backend/docs/integracao-backend-historico.md` | Documentação reconciliada ou identificada como referência |
| A | `backend/docs/midias-arquivos.md` | Documentação reconciliada ou identificada como referência |
| A | `backend/docs/patrimonios-admin.md` | Documentação reconciliada ou identificada como referência |
| A | `backend/docs/populacao-patrimonios.md` | Documentação reconciliada ou identificada como referência |
| M | `backend/package-lock.json` | Código/configuração auditado; ver decisões R1 |
| M | `backend/package.json` | Código/configuração auditado; ver decisões R1 |
| A | `backend/prisma/data/patrimonios.js` | Catálogo secundário; adiado |
| A | `backend/prisma/data/reconciliacao.js` | Catálogo secundário; adiado |
| A | `backend/prisma/migrations/20261005230000_add_pesquisa_patrimonios/migration.sql` | Histórico preservado em trilha explícita |
| A | `backend/prisma/migrations/20261013180000_add_regiao_patrimonio/migration.sql` | Histórico preservado em trilha explícita |
| M | `backend/prisma/schema.prisma` | Reconciliado com D1B e escopo aprovado |
| M | `backend/prisma/seed.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/prisma/seed.patrimonios.js` | Catálogo secundário; adiado |
| A | `backend/public/patrimonios/antiga_carbonell_demolida.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/antigo_paco_municipal.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/antigo_poco_municipal.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/banda_lira_guarulhos.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/bosque_maia.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/capela_bonsucesso.png` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/capela_macedo.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/casa_amarela.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/casa_da_candinha.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/casa_jose_mauricio.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/casarao_albertis_demolido.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/casarao_jorge_lima.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/casarao_nossa_historia.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/casarao_saraceni_demolido.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/catedral_conceicao.png` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/cemiterio_sao_joao_batista.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/centro_adamastor.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/complexo_lago_dos_patos.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/cultura_indigena_guarulhos.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/dia_da_carpicao.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/escola_capistrano.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/escola_crispiniano.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/escola_dulce_breves.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/estacao_ferroviaria.png` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/festa_bonsucesso.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/igreja_bom_jesus_cabeca.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/igreja_rosario_pretos.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/locomotiva_maria_fumaca.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/matriz_colonial_demolida.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/parque_eco_tiete.png` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/praca_getulio_vargas.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/reserva_cabucu.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/sanatorio_padre_bento.jpg` | Asset secundário preservado; não carregado |
| A | `backend/public/patrimonios/sitio_lavras_velhas.png` | Asset secundário preservado; não carregado |
| A | `backend/scripts/validate-patrimonios-postgres.js` | Script preservado; não executar cargas secundárias |
| M | `backend/src/app.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/config/arquivos.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/config/env.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/config/storage.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/controllers/adminImageController.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/controllers/dashboardController.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/controllers/midiaController.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/controllers/midiaPublicaController.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/docs/openapi.js` | Documentação reconciliada ou identificada como referência |
| M | `backend/src/docs/paths.js` | Documentação reconciliada ou identificada como referência |
| A | `backend/src/docs/pathsDestino.js` | Documentação reconciliada ou identificada como referência |
| M | `backend/src/docs/schemas.js` | Documentação reconciliada ou identificada como referência |
| A | `backend/src/docs/schemasDestino.js` | Documentação reconciliada ou identificada como referência |
| A | `backend/src/middlewares/authenticateOpcional.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/middlewares/descartarUploadEmFalha.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/middlewares/upload.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/middlewares/uploadImage.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/middlewares/validate.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/middlewares/verificarPatrimonioMidia.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/routes/adminPatrimonioRoute.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/routes/index.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/schemas/midiaSchema.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/schemas/patrimonioSchema.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/server.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/services/dashboardService.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/services/imageService.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/services/midiaService.js` | Código/configuração auditado; ver decisões R1 |
| M | `backend/src/services/patrimonioService.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/utils/arquivos.js` | Código/configuração auditado; ver decisões R1 |
| A | `backend/src/utils/regiaoPatrimonio.js` | Recurso adiado; referência preservada |
| M | `backend/test/adminPatrimonio.integration.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| M | `backend/test/adminPatrimonio.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/authPassword.integration.origem.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/authPassword.origem.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/dashboard.integration.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| M | `backend/test/dashboard.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| M | `backend/test/docs.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/midia.integration.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/midiaArquivos.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/midiaPublica.integration.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/midiaPublica.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/midiaSchema.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| M | `backend/test/patrimonio.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| M | `backend/test/referencia.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/seed.patrimonios.integration.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| A | `backend/test/seed.patrimonios.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
| M | `backend/test/uploadInfra.test.js` | Teste auditado; reconciliado ou referência adiada conforme relatório |
