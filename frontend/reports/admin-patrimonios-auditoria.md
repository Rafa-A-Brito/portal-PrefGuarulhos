# Auditoria funcional — administração de patrimônios

Data: 09/10/2026.

## Escopo e método

Inspecionados AdminPatrimonios.jsx, adminApi.js, normalizarPatrimonio, geocodificação, App.jsx/RotaProtegida, interceptor de sessão, modal de erros, adminPatrimonioRoute/controller/service e rotas/service de imagens.

As interações foram executadas em React/jsdom com o componente, adminApi e normalização reais, substituindo apenas o transporte HTTP por um adaptador Axios de fixtures. Google/Gemini foram simulados. As regras backend foram testadas via HTTP com fixtures e pela integração existente em PostgreSQL 17 descartável. Não houve leitura nem escrita no banco real nesta auditoria. O roteiro em navegador abaixo é para execução manual posterior, em ambiente de teste.

Não foram alterados estilos, layout estrutural, identidade visual, backend, schema ou seed. A modificação em src/styles/global.css já existia no início e não foi editada nesta tarefa.

## Diagnóstico antes das correções

Todos os endpoints abaixo têm prefixo /api.

| Nome/ícone | Handler | Comportamento esperado | Endpoint | Estado anterior e causa |
| --- | --- | --- | --- | --- |
| Editar / lápis | abrirEdicao(p) | Buscar detalhe completo pelo UUID, preencher e abrir edição | GET /admin/patrimonios/:id | Incompleto: handler e UUID corretos, mas sem carregamento/foco/rolagem; formulário acima da tabela pode ficar fora da vista. Busca concorrente podia substituir a edição, e reiniciarEstadosAuxiliares apagava imagens antes de saber se o GET teria sucesso. |
| Novo / + | abrirNovo | Abrir formulário vazio em modo novo | Nenhum até salvar | Funcional, mas permitia trocar de formulário durante save, upload, geração e carregamento. |
| Salvar | salvar | POST na criação; PATCH pelo UUID na edição; recarregar lista | POST /admin/patrimonios; PATCH /admin/patrimonios/:id | Quebrado quando Maps falha mesmo com coordenadas reutilizáveis: teste de erroMaps precedia a decisão de geocodificar. Também recalculava descricaoResumida em qualquer edição e substituía mensagens HTTP por mensagem genérica no modal. |
| Cancelar | cancelarFormulario → fecharFormulario | Fechar sem gravar | Nenhum | Funcional, mas não bloqueava geração assíncrona pendente. |
| Publicar / selo | mudarStatus(p, "publicar") | Confirmar, publicar e recarregar | PATCH /admin/patrimonios/:id/publicar | Funcional para ADMIN. Bloqueava apenas a própria linha, permitindo conflito com outras operações e mantendo aberto o formulário do item que acabava de mudar de status. |
| Arquivar / caixa | mudarStatus(p, "arquivar") | Confirmar, arquivar e recarregar | PATCH /admin/patrimonios/:id/arquivar | Funcional para ADMIN; mesmos riscos de coordenação de Publicar. |
| Escolher/Trocar imagem / foto | inputImagemRef.click → escolherImagem | Validar arquivo local | Nenhum | Funcional: formatos JPEG/PNG/WebP/GIF, até 10 MB. |
| Enviar imagem | enviarImagem | Enviar multipart e incorporar retorno sem perder imagens existentes | POST /admin/patrimonios/:id/imagens | Contrato funcional. Trocar de patrimônio durante o envio podia acrescentar o retorno à lista visual de outro formulário. |
| Remover imagem / lixeira | removerImagem | Confirmar, excluir pelo ID da imagem, atualizar lista local | DELETE /admin/patrimonios/imagens/:imagemId | Funcional e restrito a ADMIN. Necessitava proteção contra troca de contexto durante operação. |
| Descartar imagem / X | limparSelecaoImagem | Limpar arquivo e metadados selecionados | Nenhum | Funcional. |
| Escrever / lápis quadrado | atualizar("modoResumo", "escrever") | Alternar entrada manual | Nenhum | Funcional. |
| Enviar arquivo / clipe | atualizar("modoResumo", "arquivo") | Exibir seleção de arquivo para resumo | Nenhum | Funcional. Não é upload de documento patrimonial. |
| Anexar/Trocar arquivo / clipe | inputArquivoRef.click → escolherArquivoResumo | Selecionar .txt/.md/.pdf até 5 MB | Nenhum | Funcional, com validação local. |
| Remover arquivo / X | removerArquivoResumo | Limpar seleção local | Nenhum | Funcional. |
| Gerar resumo / brilho | gerarResumo → gerarResumoDeArquivo | Preencher rascunho para revisão | Nenhum endpoint real implementado | Incompleto por contrato: modo real lança ERR-IA-NAO-IMPLEMENTADA; demonstração usa texto local/aviso para PDF. Esse recurso não foi implementado por suposição. A troca de formulário durante geração foi bloqueada. |
| Visualizar | Não existe | Não aplicável | Não aplicável | Não há botão de visualizar na tabela nem cards administrativos separados nesta página. Não foi acrescentado. |

O lápis de EDITOR em PUBLICADO/ARQUIVADO já tinha disabled e title; isso corresponde à regra do backend, não é handler ausente. A explicação agora também integra seu nome acessível. O detalhe recém-carregado é revalidado antes de abrir para detectar status alterado desde a listagem.

## Correções e percurso da edição

1. O clique usa resumo.uuid, que normalizarPatrimonio obtém do id real; o campo id normalizado é o slug para uso público. Nenhum endpoint administrativo passou a usar slug.
2. Durante o GET, o lápis mostra o ícone de carregamento e há mensagem de status. Trocas/operações concorrentes ficam bloqueadas. Respostas invalidadas após desmontagem não preenchem formulário.
3. Somente depois do GET bem-sucedido são substituídos formulário, categorias, imagens e coordenadas. Falha preserva o formulário anterior e exibe erro.
4. ADMIN edita qualquer status; EDITOR apenas RASCUNHO. A regra é conferida tanto na lista quanto no detalhe. As rotas protegidas e os controles backend já estavam corretos e não mudaram.
5. O formulário abre com UUID, título Editar patrimônio, foco no nome e rolagem até ele. O modo novo continua exclusivo do botão Novo.
6. Categoria principal e IDs das adicionais são carregados; trocar a principal remove duplicação. Ao atingir seis adicionais, opções não selecionadas ficam desabilitadas.
7. Decimal/string continua normalizado para números finitos; nulos/vazios não viram zero. Zero é coordenada válida. Cidade/UF carregadas são mantidas no contexto do formulário, mensagem e consulta/cache de geocodificação. O limite geográfico regional existente não foi ampliado.
8. Maps indisponível só impede o save quando é necessário geocodificar. Sem alteração de endereço, o par existente é reutilizado. No modo sem geocoding, endereço inalterado omite coordenadas; endereço alterado limpa o par com null/null, conforme o PATCH backend.
9. O PATCH não envia imagens nem identidade/autoria/status. Imagens permanecem no estado e no banco; enviar/remover usa seus endpoints específicos. descricaoResumida é preservada quando descricao não muda.
10. Sucesso fecha a edição e recarrega a listagem. Falhas 400/401/403/404/409 aparecem no formulário; abrir detalhe também apresenta mensagem explícita e modal. O interceptor existente limpa sessão em 401 e encaminha ao login com aviso de expiração quando a sessão estava presente.
11. Publicar/arquivar preservam confirmação e recarga; bloqueiam concorrência e fecham o formulário do mesmo item após sucesso. Geração e operações de imagem também impedem troca do contexto.

Não há restrição de status no upload backend: POST de imagens admite ADMIN e EDITOR. Nesta tela o upload é acessado dentro da edição; portanto EDITOR o acessa nos rascunhos. DELETE é ADMIN. Não se ampliou acesso nem foi inventada nova regra backend.

## Arquivos alterados

- src/features/admin/pages/AdminPatrimonios.jsx — edição, permissões, feedback e coordenação das ações.
- src/services/adminApi.js — extração de error.message e mensagens por status HTTP.
- src/services/fakeApi.js — preservação de cidade/UF na normalização.
- src/services/maps.js — consulta, restrições e chave de cache respeitam cidade/UF carregadas.
- package.json e package-lock.json — comando test e dependências de testes.
- vitest.config.js, test/setup.js, test/AdminPatrimonios.test.jsx e test/maps.test.js — infraestrutura e cobertura.
- reports/admin-patrimonios-auditoria.md — diagnóstico e roteiro.

## Validação executada

- Frontend: npm test — 33 testes aprovados, 2 arquivos.
- Frontend: npm run lint — aprovado.
- Frontend: npm run build — aprovado; aviso de chunk acima de 500 kB.
- Backend: node --test test/adminPatrimonio.test.js test/patrimonio.test.js test/uploadInfra.test.js — 38 aprovados, nenhum ignorado.
- Backend: node --test test/adminPatrimonio.integration.test.js — 1 aprovado em PostgreSQL 17 descartável; contêiner removido após execução.
- Prisma validate não executado nesta tarefa: nenhum código Prisma, backend ou schema foi alterado; nenhuma migration criada.
- git diff --check — sem erros de whitespace.

Cobertura: clique e GET corretos, espera por detalhe, campos/categorias/imagens, PATCH e recarga, erros HTTP, ADMIN/EDITOR, status desatualizado, bloqueio explícito de EDITOR em publicado, rotas protegidas, round-trip numérico e zero, geocoding real simulado, criação/POST, cancelar, publicar/arquivar, upload multipart, remoção, descarte, geração/remoção de arquivo e bloqueio de operações concorrentes.

## Roteiro manual no navegador

Use backend e contas ADMIN/EDITOR de um ambiente de teste. Os passos de salvar/publicar/arquivar/upload alteram dados e não devem ser realizados no banco real como parte desta auditoria.

1. Entre como ADMIN e abra /admin/patrimonios. Role até uma linha distante e clique no lápis. Verifique carregamento, rolagem/foco e o título Editar patrimônio. Na aba Network, confira GET /api/admin/patrimonios/UUID da linha selecionada.
2. Confira nome, descrição, história, importância, categoria principal, adicionais, localização e imagens. Para registro cuja cidade difere de Guarulhos, confira a mensagem de cidade/UF.
3. Altere apenas o nome e salve. Confira PATCH (não POST), mesmo UUID, par latitude/longitude numérico quando enviado, ausência de campos de imagem e resumo curto editorial preservado. Verifique lista recarregada e nome atualizado.
4. Reabra, altere campos e cancele. Reabra novamente e confirme ausência de alterações persistidas.
5. Com geocoding desativado, salve endereço inalterado: coordenadas devem ser omitidas do payload. Altere o endereço: o par antigo deve ser enviado como null/null. Com geocoding ativo e Maps indisponível, edição de nome com par já existente deve funcionar; alteração de endereço deve mostrar erro explícito.
6. Entre como EDITOR: rascunhos permitem edição; publicados/arquivados têm lápis desabilitado e motivo no tooltip/nome acessível. Publicar, arquivar e remover imagem não aparecem. Se outro ADMIN publicar o rascunho após carregar a lista, tentar abri-lo deve mostrar explicação.
7. No ambiente de teste, simule 400/403/404/409 no PATCH e 404 no detalhe: confira mensagem e dados do formulário preservados. Expire a sessão: confira login com aviso. Uma falha de rede também deve ser visível.
8. Abra um rascunho com imagens. Escolha e descarte um arquivo; envie outro e confirme multipart com campo imagem. A anterior deve continuar visível. Durante o envio, não deve ser possível abrir outro patrimônio. Como ADMIN, remova uma imagem e confira DELETE pelo ID da imagem. Arquivo inválido deve gerar mensagem sem POST.
9. Como ADMIN, cancele e depois confirme Publicar/Arquivar em registros de teste. Confira endpoint, status e recarga. Nenhuma ação adicional deve ficar disponível durante a requisição.
10. Alterne Escrever/Enviar arquivo, anexe/remova .txt e teste o fluxo configurado de resumo. No modo real sem endpoint, deve aparecer a indisponibilidade; não se espera IA funcional. Durante geração, não deve ser possível trocar de formulário.
11. Clique Novo, preencha e salve uma fixture. Confirme POST, criação em rascunho e reabertura em edição para imagens; não deve ocorrer segundo POST ao salvar depois.
