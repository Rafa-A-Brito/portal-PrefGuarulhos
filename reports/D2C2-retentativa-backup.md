# D2C — Fase 2: retentativa de backup e restauração verificados

**Parecer: GO.** Execução concluída em **17/10/2026, 07:16:47 (America/Sao_Paulo)**. Backup novo, protegido antes da gravação, restaurado integralmente em PostgreSQL descartável e comparado com a origem. As 17 tabelas coincidem em contagem e SHA-256 entre D2C1, preflight atual, restauração e inspeção final do banco real.

O GO certifica esta etapa de backup. Não autoriza nem executa migration, preenchimento editorial ou início da D2C3/D2C4. O [relatório original de NO-GO](D2C2-backup-verificado.md) foi preservado integralmente.

## 1. Correção exclusiva do impedimento de ACL

A tentativa original falhou porque a política do PowerShell bloqueou a execução de `protect-dump.ps1`, antes de pg_dump. O auxiliar `.cache/d2c2/backup.cjs` agora utiliza `.cache/d2c2/protect-dump.cjs`, que chama **diretamente `icacls.exe` e `whoami.exe`**, por `spawnSync` com argumentos separados, `shell: false` e `windowsHide: true`.

Nenhum Set-ExecutionPolicy, Bypass, alteração de registro, antivírus ou redução das verificações de segurança. O script PowerShell anterior permaneceu intacto como evidência, sem ser chamado.

Na primeira execução do auxiliar Node, a proteção do diretório foi aplicada, mas a leitura da evidência parou antes de criar o dump: `icacls /save` produziu UTF-16LE **sem BOM**, e o leitor esperava BOM. O decodificador foi corrigido para reconhecer também essa representação. Não foi removida nenhuma exigência de ACL. A tentativa final usou outro diretório exclusivo e repetiu o preflight. [Evidência da tentativa intermediária](../.cache/d2c2/0a4110f5-df10-40f2-95b0-ef56ecb8c31f/evidence.json).

## 2. Identidade Windows e permissões efetivamente verificadas

Usuário da execução: `desktop-7740ok3\codexsandboxoffline`, identificado com `whoami.exe /user /fo csv /nh`.

| Identidade autorizada | SID | Permissão |
| --- | --- | --- |
| Usuário da execução | `S-1-5-21-2222989932-95699863-3391156223-1004` | FullControl |
| SYSTEM | `S-1-5-18` | FullControl |
| Administrators | `S-1-5-32-544` | FullControl |

As concessões usam SIDs numéricos, sem depender de nomes localizados. Foi criado um diretório exclusivo em `.cache/db-backups`; `lstat` de cada componente e `realpath` confirmaram o caminho esperado e ausência de links simbólicos/junctions inesperados. Nenhuma permissão dos backups anteriores ou do diretório geral foi alterada.

Antes de criar o arquivo, o diretório recebeu somente as três concessões autorizadas e teve as permissões herdadas removidas. Depois, o arquivo foi criado com `wx` (criação exclusiva), dentro do diretório já protegido. Sua ACL também recebeu as três concessões explícitas, com herança desabilitada.

O resultado foi relido com **icacls /save** e analisado como SDDL, além de **icacls /verify**. Foram exigidos: DACL protegida, exatamente três ACEs Allow FullControl, os três SIDs únicos autorizados, nenhuma ACE herdada ou identidade adicional. Essa verificação ocorreu no diretório e no arquivo **antes de pg_dump e novamente ao final**. Não se considerou apenas o código zero do utilitário.

SDDL final do diretório:

```text
D:PAI(A;OICI;FA;;;BA)(A;OICI;FA;;;SY)(A;OICI;FA;;;S-1-5-21-2222989932-95699863-3391156223-1004)
```

SDDL final do arquivo:

```text
D:PAI(A;;FA;;;BA)(A;;FA;;;SY)(A;;FA;;;S-1-5-21-2222989932-95699863-3391156223-1004)
```

`BA` e `SY` são os aliases SDDL dos SIDs de Administrators e SYSTEM, não nomes localizados. `P` confirma proteção da DACL; não existem ACEs herdadas. As flags OI/CI no diretório propagam somente as concessões autorizadas aos filhos. Nenhuma outra identidade tem concessão de leitura na DACL. O dump nunca recebeu dados enquanto desprotegido.

Evidências finais: [ACL do diretório](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/acl-5.txt) e [ACL do arquivo](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/acl-6.txt).

## 3. Git e preflight repetido

HEAD: `c8fba66fcbf518b3205a49355d09a2c7c10a9c16`, branch `development/backend`. O working tree mantém a D2B não commitada e os relatórios anteriores. Index sem alteração; nenhum commit criado. A comparação SHA-256 ao final confirmou que todos os arquivos versionáveis preexistentes permaneceram iguais, inclusive o relatório original de NO-GO e o CSS concorrente.

| Identidade real | Resultado antes e depois |
| --- | --- |
| Host / porta | `localhost:5432` |
| Banco | `patrimonio_guarulhos` |
| Usuário / session_user | `postgres` |
| Endereço do servidor | `::1`, loopback |
| Versão | PostgreSQL 18.6 |
| default_transaction_read_only / transaction_read_only | on / on |
| Inspeções | REPEATABLE READ READ ONLY, encerradas com ROLLBACK |

Host, banco, porta e usuário foram validados antes de conectar e confirmados na primeira consulta de cada sessão. Credenciais não foram impressas nem incluídas em argumentos de processos. pg_dump usou destino explícito e `PGOPTIONS=-c default_transaction_read_only=on`.

Confirmados os dois hashes aprovados:

| Arquivo | SHA-256 |
| --- | --- |
| Migration D2 | `452d76e28f980d0f5e3e0f4e4eaf03edeb887148c1b8ca1718a82b5b883baaf9` |
| Fonte canônica | `c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8` |

Exatamente seis migrations completas, metadados/checksums iguais à D2C1, nenhuma falha e nenhuma migration da equipe:

1. `20260929230000_initial_schema`
2. `20260930120000_add_demolido_situacao`
3. `20261005004508_categorias_adicionais`
4. `20261006014922_adicionar_detalhes_e_heroes`
5. `20261006180000_exposicoes_novidades`
6. `20261014010000_add_fatos_ligacoes`

A árvore local continua com essas seis e a candidata `20261016120000_add_regioes_numero_ordem`, **ainda pendente no banco real**. SQLs históricos e fonte canônica permanecem intactos.

## 4. Novo backup

Backup completo do banco em formato custom, estrutura e dados, sem filtros de tabelas/schema ou exclusões. Ferramentas: **pg_dump 18.6** e **pg_restore 18.6**, em `C:\Program Files\PostgreSQL\18\bin`.

```text
C:\Users\USER\projetoIntegrador20262\integration_backend_frontend\.cache\db-backups\d2c2_1afba5ce-575c-468c-a6fd-76d4f73ce94d\patrimonio_guarulhos_2026-10-17T10-16-42-041Z_pre_d2c_deploy.dump
```

| Item | Resultado |
| --- | --- |
| Início de pg_dump | 17/10/2026 07:16:43.172, America/Sao_Paulo |
| Fim de pg_dump | 17/10/2026 07:16:43.794, America/Sao_Paulo |
| Formato | Custom PostgreSQL, assinatura PGDMP |
| Tamanho | **170000 bytes** |
| SHA-256 | **`d988bed2b77ebc228fbf1549a18abbb8daa50f65ead7499ef63a5fe14e807bbb`** |
| pg_dump | Exit code 0 |
| Arquivo/diretório ignorados pelo Git | Sim |
| Sobrescrita/reuso da reserva vazia antiga | Não |

Argumentos efetivamente usados, com o caminho acima no lugar de `<dump>`:

```text
pg_dump --host=localhost --port=5432 --username=postgres
  --dbname=patrimonio_guarulhos --no-password --format=custom --file <dump>
```

O SHA-256 permaneceu igual depois da leitura do archive, depois da restauração e no encerramento. O arquivo válido não foi removido nem alterado. A reserva vazia antiga também foi preservada, sem reutilização.

## 5. Archive e restauração integral

| Validação | Resultado |
| --- | --- |
| Arquivo existe, não vazio e PGDMP | Aprovado |
| pg_restore --list | Exit code 0; banco no cabeçalho = patrimonio_guarulhos |
| Catálogo | Estrutura e TABLE DATA das 17 tabelas presentes |
| pg_restore --file=NUL | Leitura/descompressão integral, exit code 0; nenhum SQL sensível salvo em arquivo de texto |
| Restauração integral | Exit code 0, `--exit-on-error --single-transaction` |
| ACL após restauração/verificação | Diretório e arquivo continuam restritos aos três SIDs |

Banco descartável gerado nesta execução:

```text
portal_d2c2_1afba5ce575c468ca6fd76d4f73ce94d_test
```

A sessão de manutenção foi validada como banco `postgres`, em localhost:5432, antes de criar esse banco exclusivo a partir de template0. O destino da restauração foi validado por conexão própria, incluindo identidade e ausência de tabelas públicas, antes de pg_restore.

```text
pg_restore --host=localhost --port=5432 --username=postgres
  --dbname=portal_d2c2_1afba5ce575c468ca6fd76d4f73ce94d_test
  --no-password --exit-on-error --single-transaction <dump>
```

Não foram usados `--clean` nem `--create`. A conexão de restauração foi redirecionada explicitamente, sem confiar em DATABASE_URL herdado. Nenhuma migration foi executada no restaurado.

Depois da conferência integral, o auxiliar validou novamente o nome e a identidade do descartável criado por ele, fechou suas conexões e removeu **somente esse banco**. Remoção confirmada pela conclusão do comando DROP DATABASE, sem FORCE. O dump foi mantido.

## 6. Comparação das 17 tabelas e integridade

Método: SHA-256 das linhas completas `to_jsonb(t)::text`, ordenadas com collation C, sessão UTC, UTF-8 e newline por registro. Todos os valores abaixo coincidem em **D2C1 → preflight → restaurado → pós-verificação real**. Nenhuma linha de credenciais foi registrada nas evidências; somente hashes agregados.

| Tabela | Registros nas quatro fotografias | SHA-256 comum |
| --- | --- | --- |
| `_prisma_migrations` | 6 | `bec1bd03d4d0920983020c4874fc5d651e80ab26788229c07c2cbc002abcb215` |
| `audit_log` | 68 | `8589c10f55bd6923cddece97adfbb9348ebc7f5e83c4a5fa070e838b2b15e9ce` |
| `categoria` | 7 | `28e33fb2542fb0ceda5709d41fcb367cee83c777072bd8a5c9193d9934697782` |
| `exposicao` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `local` | 35 | `b5a4a2fa1c710cd73ee453b6a983fba44d8f249eaaf3ec7dcd6e0021ff50c289` |
| `novidade` | 16 | `4b4f4a008eb63612c29d346c4f7c3e446940cfaf46ab09dc28e83d04f583795e` |
| `patrimonio` | 36 | `03d756b538d0d17e950f0d2834c179bb7e4a9bd8a6f077eac00e393f5ffd59de` |
| `patrimonio_categoria` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `patrimonio_detalhes` | 183 | `e5b4c0271f730740b000c8e17be50c5b57b160913a6b6b5d1d26706521049b86` |
| `patrimonio_documentos` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `patrimonio_fatos` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `patrimonio_imagens` | 36 | `8521e3db656a1639b4130101540389c5d9339bc2922e5dad2431fe90e1ed504c` |
| `patrimonio_ligacoes` | 14 | `3424c15c9d51292b2f5c3a6c068b9a72bc3a26763bd5cdad5ef4bd0727ccd8de` |
| `rota` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `rota_patrimonio` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `site_hero` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `users` | 2 | `368a1ad61aa6d8fdba9897dd56aa1233a3ef2eb06ac10964c729196df8456190` |

| Verificação adicional | Resultado |
| --- | --- |
| Patrimônios físicos / canônicos / legados | 36 / 34 / 2 |
| UUIDs, slugs e status das 36 fichas | Idênticos |
| Dois legados consolidados | Continuam ARQUIVADO |
| Fatos | 0 |
| Ligações | 14; mesmos UUIDs, origens, destinos, textos e ordens |
| Tabela regioes_patrimonio | Ausente |
| regiao_id, numero_exibicao, ordem_exibicao | Ausentes |
| Descrição patrimonial | NOT NULL |
| Colunas, constraints, enums e triggers | Iguais à D2C1 |
| Índices restaurados e reais ao final | Iguais ao preflight |
| Audit log | 68 registros, mesmo hash; nenhuma auditoria de domínio nova |

O acesso real antes/depois e o cálculo de integridade foram somente leitura. As únicas escritas PostgreSQL desta fase foram criação/restauração/remoção do banco descartável, nunca no banco real. Não houve seed, sync, import, DML de domínio real, carga regional ou atribuição de número/prioridade.

## 7. Evidências e arquivos efetivamente alterados

Diretório da execução aprovada: `.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/`.

- [Evidência consolidada](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/evidence.json)
- [Preflight real](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/preflight.json)
- [Banco restaurado](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/restored.json)
- [Pós-verificação real](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/postflight.json)
- [Catálogo](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/catalog.log), [dump](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/dump.log), [leitura integral](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/full-read.log), [restore](../.cache/d2c2/1afba5ce-575c-468c-a6fd-76d4f73ce94d/restore.log)

Arquivos desta retentativa:

| Situação | Caminho |
| --- | --- |
| Alterado, auxiliar ignorado | `.cache/d2c2/backup.cjs`: troca do mecanismo de ACL; fluxo de banco preservado |
| Novo, auxiliar ignorado | `.cache/d2c2/protect-dump.cjs`: icacls/whoami nativos, caminhos e verificação SDDL |
| Atualizado, ignorado | `.cache/d2c2/latest.json`: aponta à execução aprovada |
| Novos, ignorados | Evidências das tentativas e diretório exclusivo do dump |
| Novo, versionável | `reports/D2C2-retentativa-backup.md` |

O relatório original de NO-GO e `protect-dump.ps1` permanecem intactos. A tentativa intermediária deixou somente diretório vazio protegido e evidências, sem dump. Nenhum backup antigo foi removido. Backend/frontend D2B, schema, migrations, seeds, importadores, C3, D1D, D1E e redesign ficaram inalterados. CSS concorrente preservado separadamente; nenhum staging ou commit. `git diff --check` aprovado.

## 8. Parecer e limites

**GO — backup e restauração descartável aprovados.** Todas as verificações obrigatórias desta retentativa passaram. Banco real sem alteração estrutural ou de dados; D2 continua pendente.

O dump contém dados de autenticação e permanece restrito à identidade Windows da execução, SYSTEM e Administrators; eventual acesso posterior deve respeitar essas ACLs. É backup do banco PostgreSQL, não dos arquivos de uploads ou das configurações globais de roles do cluster. A certificação corresponde à fotografia desta execução; mudanças futuras exigem nova conferência antes de qualquer deploy.

Nenhuma pendência impeditiva desta fase. Revisão e autorização para a D2C3 permanecem separadas; não foram iniciadas D2C3 ou D2C4.

D2C FASE 2 — BACKUP VERIFICADO

RESTAURAÇÃO DESCARTÁVEL APROVADA

BANCO REAL SEM ALTERAÇÕES

MIGRATION REAL NÃO EXECUTADA

AGUARDANDO REVISÃO ANTES DA D2C3
