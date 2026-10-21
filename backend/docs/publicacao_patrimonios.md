# Publicação operacional temporária de 14 patrimônios

Execute no diretório backend, com o .env habitual. O responsável precisa ser ADMIN ativo.

~~~powershell
node scripts/publish-patrimonios-14.js --created-by-email=admin@exemplo.com --dry-run
~~~

Sem flag de modo, o script também executa dry-run. A CLI aceita exclusivamente o banco patrimonio_guarulhos e a allowlist fixa no arquivo. Não há flag para incluir outros slugs. O dry-run usa uma conexão PostgreSQL somente leitura e a mesma validação de publicação da API, sem simular escritas e rollback.

Somente após revisão do relatório, o comando de publicação manual é:

~~~powershell
node scripts/publish-patrimonios-14.js --created-by-email=admin@exemplo.com --apply --confirm-db=patrimonio_guarulhos
~~~

Este comando de apply não faz parte da entrega executada.

A operação inteira usa uma única transação Serializable. Antes de escrever, verifica o ADMIN, todos os 14 slugs em RASCUNHO, o Poço Municipal em RASCUNHO, as contagens projetadas e a validação administrativa de cada cadastro. Qualquer erro aborta o lote. Conflitos de concorrência abortam sem retry automático.

A função changePatrimonioStatus, usada pela API/admin, recebe a transação do lote. Ela mantém a regra existente: status PUBLICADO, publicadoEm (published_at) com a data da publicação, arquivadoEm nulo, updatedBy com o ADMIN responsável e updatedAt atualizado pelo Prisma. createdBy, createdAt, IDs, slugs, conteúdo e relações são preservados. O script não contém SQL direto; o bloqueio de linha já existente permanece encapsulado no service administrativo. O fluxo atual não grava AuditLog na publicação, e o script mantém esse comportamento.

Antes do commit, exige 33 PUBLICADO, 1 RASCUNHO (antigo-poco-municipal) e 2 ARQUIVADO, além de data e responsável nos 14 publicados. Uma repetição após sucesso abortará porque os 14 já não estarão em RASCUNHO. Não altera seed, sync, schema ou arquivos de mídia.

Testes de apply devem ocorrer apenas com cliente Prisma injetado em PostgreSQL descartável; a CLI não oferece exceção de banco para testes.
