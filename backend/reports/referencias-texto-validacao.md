# Referências do texto dos patrimônios — implementação e validação

Data: 12/10/2026.

## Auditoria e persistência

Reutilizado `PatrimonioDocumento`, relacionado a `Patrimonio.documentos`. Os campos existentes representam patrimônio, título, descrição, URL, tipo, fonte e MIME. Nenhuma tabela, alteração de schema ou migration foi criada.

O detalhe administrativo já inclui documentos; o público já os seleciona. O frontend deriva `referencias` dessa relação, sem gravar uma segunda coleção. Para uploads, `titulo` guarda o nome original, `url` guarda `/uploads/referencias/<uuid>.<extensão>` e `tipo` é ARQUIVO. Para links, `tipo` é LINK, o título é o hostname e a fonte recebe a URL quando cabe no limite existente de 500 caracteres. A descrição/citação é opcional, com limite de 300 caracteres.

## Contrato

- `POST /api/admin/patrimonios/:id/referencias`: JSON `{ url, descricao? }` OU multipart com `arquivo` e `descricao?`. Arquivo e URL simultâneos são recusados. Resposta 201: `{ success: true, data: { id, descricao, nomeArquivo, url, tipo } }`. `nomeArquivo` é null para links.
- `DELETE /api/admin/patrimonios/:id/referencias/:referenciaId`: resposta 200 `{ success: true, data: { id } }`.
- Identificadores administrativos são UUIDs; a remoção confere o vínculo entre referência e patrimônio.
- ADMIN adiciona em qualquer status e remove. EDITOR adiciona apenas em RASCUNHO; não remove.
- A permissão de inclusão é revalidada em transação com bloqueio da linha do patrimônio, compatível com o bloqueio de publicação/edição existente.
- Nenhuma operação de referência altera descrição ou resumo.

## Uploads

PDF, DOC, DOCX, ODT, TXT e MD, até 10 MB por arquivo. Upload vazio, extensão proibida, MIME incompatível, assinatura incompatível e campos desconhecidos/duplicados são recusados. Arquivos Office modernos são verificados pelo cabeçalho ZIP; não há descompactação ou análise completa do documento. TXT/MD exigem UTF-8 sem bytes nulos.

Parser multipart da plataforma Node, com corpo limitado a 10 MB + 64 KiB. Nomes persistidos no disco usam UUID e criação exclusiva. Caminhos absolutos não vão ao banco. Verificações de diretório real e arquivo regular impedem caminhos externos e links simbólicos. Download servido como attachment e nosniff.

Falhas após criação do arquivo fazem limpeza segura. DELETE confirma a transação antes de tentar excluir o arquivo. Como na infraestrutura existente, falha de filesystem após commit é registrada no servidor e não desfaz a exclusão do registro; pode exigir limpeza operacional do arquivo residual.

## Arquivos criados

- `backend/src/routes/adminReferenciaRoute.js`
- `backend/src/controllers/adminReferenciaController.js`
- `backend/src/services/referenciaService.js`
- `backend/src/schemas/referenciaSchema.js`
- `backend/src/middlewares/uploadReferencia.js`
- `backend/test/referencia.test.js`
- `backend/test/referencia.integration.test.js`
- `frontend/src/services/referenciasApi.js`
- `frontend/test/referenciasApi.test.js`
- Este relatório.

## Arquivos alterados nesta etapa

- `backend/src/routes/index.js`: montagem das rotas.
- `backend/src/config/uploadDir.js`, `backend/src/app.js`: diretório e download das referências.
- `backend/src/utils/arquivoUpload.js`: limpeza segura de documentos.
- `backend/src/middlewares/uploadImage.js`: conserva diretórios próprios de imagens.
- `backend/src/docs/paths.js`, `backend/test/docs.test.js`: contrato OpenAPI e validação.
- `frontend/src/services/fakeApi.js`: normalização de documentos e URLs públicas.
- `frontend/test/AdminPatrimonios.test.jsx`: inclusão, remoção, reabertura, permissões e preservação do resumo.
- `frontend/test/ConhecaMais.test.jsx`: expectativa atualizada para a agenda de quatro eventos; data fixa para resultado determinístico. Nenhum comportamento da página foi alterado nesta etapa.

As alterações locais anteriores, inclusive o formulário com resumo manual e os estilos, foram preservadas.

## Validação executada

- Frontend: `npm test -- --reporter=dot` — 102 aprovados, 7 arquivos, zero falhas.
- Backend: `npm test` — 201 aprovados, zero falhas e zero ignorados, incluindo PostgreSQL real descartável.
- `npm run lint` — aprovado.
- `npm run build` — aprovado; aviso não bloqueante de bundle acima de 500 kB.
- `npm run prisma:validate` — aprovado com URL de conexão inacessível, sem acessar banco.
- `git diff --check` — aprovado.
- Busca nos fontes, testes e novo build do frontend: sem integração/variáveis de geração automática; ocorrências históricas permanecem somente na documentação de planejamento/auditoria.

O PostgreSQL 17 de teste foi criado em contêiner exclusivo, com dados em tmpfs, banco `referencias_test` e porta local 55439. Apenas as cinco migrations já existentes foram aplicadas nesse banco descartável. A URL normal foi substituída por um destino inacessível durante os testes. Nenhum banco real foi acessado e nenhum comando de seed/reset foi executado. Os testes de importação existentes usam suas próprias fixtures no banco descartável.

Não há pendência funcional conhecida. Os testes PostgreSQL emitiram um aviso de depreciação do driver pg sobre consultas concorrentes; ele não causou falhas.
