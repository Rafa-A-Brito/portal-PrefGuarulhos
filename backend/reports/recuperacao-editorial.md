# Recuperação da organização editorial

Parecer: **APTO tecnicamente; aplicação ainda não autorizada nem executada.**

Destino fixado: `localhost:5432`, servidor `::1`, banco `patrimonio_guarulhos`, PostgreSQL 18.6, cluster `7691813685054358780`. O script confere endpoint, endereço retornado, porta e cluster. Advisory lock `(73033, 1)`, igual ao serviço, conferido novamente a cada execução.

Antes de qualquer INSERT/UPDATE, a aplicação salva o JSON original e um **dump completo do banco em formato custom (`pg_dump -Fc`)**, com snapshot exportado, SHA-256 e leitura do catálogo por `pg_restore --list`. Falha em qualquer etapa bloqueia as gravações. O dump permite recuperar o estado anterior mesmo após COMMIT; ROLLBACK transacional só vale antes dele.

## Restauração efetivamente validada

- Backup: `.cache/backups/organizacao-editorial/1792538504392-fbbc6f5a-8cad-4aff-b045-0c755d7d2006.json.dump`.
- SHA-256: `60e4fe2840435aac0a0156c5ca1abc586092cc9c7324ae43ecab4d4204e47995`.
- Banco novo: `editorial_restore_1792538507447_5e2024bf` (mantido para inspeção).
- Dados completos das 18 tabelas públicas, 59 índices, 167 constraints e estados de sequências comparados. Snapshot dos 36 patrimônios e 14 relações idêntico.
- Evidência: arquivo irmão `.json.restauracao.json`, com hashes por tabela.
- Origem acessada em `REPEATABLE READ READ ONLY`; restauração com `--exit-on-error --single-transaction --no-owner --no-privileges`. Nenhum `--apply` executado.

Para repetir a validação com **um novo backup do estado atual**, na raiz:

```powershell
node .\backend\scripts\validar-recuperacao-editorial.js
```

## Recuperar um backup anterior após COMMIT

Use o `.dump` criado **antes da aplicação**, não um dump novo. Confira seu SHA-256 com o arquivo irmão `.dump.sha256`. Preserve o JSON associado. Configure as credenciais libpq fora da linha de comando (`PGUSER`/arquivo de senhas); nunca use o banco real como destino destes comandos.

1. Crie um banco isolado com nome novo; prossiga somente se `createdb` terminar com código zero (se já existir, escolha outro nome).
2. Restaure o arquivo anterior explicitamente no banco novo, sem `--clean` e sem `--create`.

```powershell
createdb --host=localhost --port=5432 --template=template0 editorial_restore_recuperacao_01
# Somente após sucesso do comando anterior; substitua o caminho pelo dump pré-aplicação.
pg_restore --host=localhost --port=5432 --dbname=editorial_restore_recuperacao_01 --exit-on-error --single-transaction --no-owner --no-privileges "CAMINHO_DO_BACKUP_PRE_APLICACAO.dump"
```

Compare os três conjuntos do snapshot JSON com as respectivas tabelas restauradas, incluindo todos os campos/IDs/textos/ordens. Qualquer retorno ao banco real exige autorização separada e decisão sobre alterações legítimas posteriores ao backup; não restaure o dump inteiro sobre ele automaticamente.

O dump inclui esquema/dados do banco, mas não os arquivos de uploads nem papéis globais do cluster. A validação não reaplica proprietários/ACLs, que exigem planejamento próprio numa recuperação para outro ambiente. Não há comando automático de remoção do banco isolado.
