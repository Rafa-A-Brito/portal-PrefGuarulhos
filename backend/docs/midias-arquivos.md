> R1: este documento registra o contrato/histórico da equipe e pode descrever recursos adiados. O contrato operacional reconciliado está em `src/docs/openapi.js`; decisões, trilhas de migrations e validações estão em `../reports/R1-reconciliacao.md`. Não executar cargas ou deploys com base isoladamente neste documento. A fonte canônica continua `prisma/patrimonioSeedData.js`.

# Limpeza e exclusão de arquivos de mídia

## Acesso aos arquivos vinculados a patrimônios

As URLs `/uploads/patrimonios/<arquivo>` e `/uploads/referencias/<arquivo>`
continuam válidas, sem movimentar arquivos ou alterar URLs no banco. Essas
pastas não são servidas por `express.static`: usam a mesma autorização de
`/api/uploads/imagens/<arquivo>` e `/api/uploads/documentos/<arquivo>`.

Cada requisição consulta o registro da imagem/documento e o status associado.
PUBLICADO permite acesso sem token. RASCUNHO e ARQUIVADO exigem usuário ativo
com token válido e role ADMIN ou EDITOR. Ausência de autenticação retorna 401;
usuário autenticado sem papel permitido retorna 403. Token inválido ou conta
desativada é recusado com 401, mesmo ao solicitar mídia publicada. Falhas de
banco não são tratadas como visitante ou arquivo ausente.

Arquivo sem registro ou ausente no disco retorna 404. Nomes não podem conter
separadores, pontos intermediários ou subpastas; extensões são limitadas por
tipo. Arquivos simbólicos e pastas/junctions que escapem da pasta autorizada
são recusados. A leitura usa o descritor do arquivo conferido. Se falhar antes
dos headers, segue ao tratamento de erros; após enviar bytes, encerra a resposta.

Content-Type e `X-Content-Type-Options: nosniff` são preservados; referências
continuam downloads com `Content-Disposition: attachment`. Todas essas mídias
recebem `Cache-Control: private, no-store` e `Vary: Authorization`, inclusive
quando publicadas, para evitar reutilização após arquivamento. Uma requisição
iniciada após a mudança de status consulta novamente o banco.

As rotas estáticas de exposições, novidades e pesquisa em
`/arquivos/patrimonios/<arquivo>` mantêm seu comportamento público.

Os testes HTTP de `test/midiaPublica.test.js` usam uploads temporários e Prisma
simulado, incluindo permissões, cache, traversal, junction e erros de stream.
Os testes PostgreSQL exigem um banco exclusivo de testes; nenhum seed,
importador ou migration é necessário para esta correção.

## Limpeza e recuperação

Os endpoints e permissões permanecem: ADMIN altera mídias em qualquer status;
EDITOR apenas em rascunhos. URLs externas não são movidas nem apagadas.

Falhas na validação dos metadados ou na criação da mídia tentam apagar o upload
recém-gravado. Se essa limpeza falhar, o erro original continua sendo propagado
e a pendência é registrada no log com origem, patrimônio e caminho do arquivo.

Na exclusão de imagem/documento local, o arquivo é movido para
`UPLOAD_ROOT/.quarentena` com nome único. Essa pasta não é servida pelas rotas
públicas, que aceitam somente `imagens` e `documentos`, por nome de arquivo.
Após excluir o registro, o service apaga a cópia privada. Arquivo já ausente
permite excluir o registro normalmente.

Se o banco falhar, o service tenta restaurar o arquivo sem sobrescrever um
arquivo que já exista no caminho original e propaga o erro original do banco.
Se a restauração falhar, o log registra `restaurar_quarentena`, modelo, mídia,
patrimônio, URL, caminhos original e de quarentena e o erro de disco. A cópia
privada é preservada para recuperação.

Se apenas a limpeza final falhar, o registro já foi excluído. A resposta continua
HTTP 200 com o campo existente `arquivoRemovido: false`. O log registra
`limpar_quarentena` e `registroExcluido: true`, com IDs e caminhos. Não repita o
DELETE para resolver essa pendência: o registro já não pode ser localizado.

Para recuperação operacional, confira o estado atual do registro pelo modelo/ID
e os dois caminhos indicados no log. Se o registro continuar existindo, restaure
o arquivo ao caminho original, preservando qualquer arquivo já presente para
conferência. Se ele tiver sido excluído, remova somente a cópia correspondente
da quarentena. Uma restauração pode ter concluído a cópia e falhado apenas ao
limpar a quarentena; confira ambos os arquivos antes de agir. Não exponha a pasta
privada por servidor estático e inclua-a nos procedimentos de backup/inspeção.

Disco e banco não formam uma transação atômica. Uma interrupção do processo entre
as etapas pode deixar arquivos na quarentena sem resposta ou log de falha. Nesse
caso, confira o banco e os arquivos manualmente: o nome de quarentena contém um
UUID da operação e o nome original do upload. Não há limpeza automática por
idade nem mecanismo de retry em segundo plano nesta correção.

Os testes de `test/midiaArquivos.test.js` usam uma pasta temporária isolada e
mocks do Prisma e de falhas de disco; não acessam o banco nem uploads reais.
