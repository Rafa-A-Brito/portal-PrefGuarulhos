# D2C — Fase 2: backup interrompido antes da geração

Data: **17/10/2026**, America/Sao_Paulo. **Parecer: NO-GO.** O preflight somente leitura passou, mas não foi possível aplicar a restrição de acesso ao arquivo reservado: a política de execução do PowerShell bloqueou o script de ACL. O procedimento parou **antes de executar pg_dump**. Este relatório não certifica um backup válido.

Nenhum backup foi gerado, nenhum banco descartável foi criado e nenhuma restauração foi executada. Não houve alteração no banco real, migration, seed, sync, import ou commit. Fases 3 e 4 não iniciadas.

## 1. Estado do Git e arquivos preservados

HEAD: `c8fba66fcbf518b3205a49355d09a2c7c10a9c16`, branch `development/backend`.

Working tree mantém a D2B sem commit: 22 arquivos rastreados modificados e 21 arquivos novos antes desta fase, incluindo o relatório D2C1. Nenhuma alteração staged. `git diff --check` aprovado. A comparação SHA-256 de todos os arquivos versionáveis existentes no início encontrou **zero alterações produzidas nesta fase**; HEAD e index permanecem iguais.

O CSS concorrente `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.css` permanece separado, intacto e sem staging. Não foram modificados schema, migrations, backend/frontend D2B, C3, D1D, D1E, redesign, seeds, importadores, dados canônicos ou relatórios anteriores. Os problemas de codificação visual presentes nas tabelas do relatório D2C1 também não foram alterados nesta operação de backup.

## 2. Identidade e preflight somente leitura

Lidos os relatórios D2B/D2C1, o schema real e o SQL candidato. A conexão foi construída explicitamente a partir da configuração local, com validação antes de conectar. A primeira consulta confirmou o destino efetivo antes das consultas de domínio.

| Campo | Resultado |
| --- | --- |
| Host configurado | `localhost` |
| Porta configurada/conectada | `5432` |
| Banco configurado/conectado | `patrimonio_guarulhos` |
| Usuário configurado/current_user/session_user | `postgres` |
| Endereço efetivo | `::1`, loopback |
| Servidor | PostgreSQL 18.6 |
| default_transaction_read_only | on |
| transaction_read_only | on |
| Transação | REPEATABLE READ READ ONLY, encerrada com ROLLBACK |

Nenhuma senha, token, URL completa de conexão ou hash de credencial foi exibido. As linhas utilizadas para calcular integridade não foram gravadas em logs; somente contagens/hashes e identidades patrimoniais/editoriais necessárias foram registrados.

Hashes esperados e encontrados:

| Arquivo | SHA-256 |
| --- | --- |
| `backend/prisma/migrations/20261016120000_add_regioes_numero_ordem/migration.sql` | `452d76e28f980d0f5e3e0f4e4eaf03edeb887148c1b8ca1718a82b5b883baaf9` |
| `backend/prisma/patrimonioSeedData.js` | `c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8` |

Foram confirmadas exatamente as seis migrations históricas completas, com todos os metadados/checksums iguais à D2C1, nenhuma falha e nenhuma migration da equipe. A árvore local continua com essas seis e a candidata D2; os SQLs históricos continuam com os mesmos hashes.

1. `20260929230000_initial_schema`
2. `20260930120000_add_demolido_situacao`
3. `20261005004508_categorias_adicionais`
4. `20261006014922_adicionar_detalhes_e_heroes`
5. `20261006180000_exposicoes_novidades`
6. `20261014010000_add_fatos_ligacoes`

**D2 ainda pendente:** `20261016120000_add_regioes_numero_ordem`.

Tabelas, colunas, constraints, enums e triggers inspecionados coincidem com a D2C1. `regioes_patrimonio`, `regiao_id`, `numero_exibicao` e `ordem_exibicao` permanecem ausentes. Descrição patrimonial continua NOT NULL; não há `PatrimonioSecao` nem enum regional da equipe. Nenhum comando Prisma foi executado nesta fase.

## 3. Comparação das 17 tabelas com D2C1

Método idêntico: SHA-256 das linhas completas `to_jsonb(t)::text`, ordenadas com collation C, sessão UTC, UTF-8 e newline por registro. As **17 contagens e os 17 hashes são iguais aos da D2C1**, incluindo usuários, auditoria e migrations.

| Tabela | Registros | SHA-256 atual = D2C1 |
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

Não existe comparação com banco restaurado: a operação foi interrompida antes de gerar o dump. Os resultados acima são do preflight real, não de uma restauração.

## 4. Integridade das identidades e relações

- 36 patrimônios físicos, com os mesmos UUIDs, slugs e status da D2C1.
- 34 identidades canônicas e os mesmos dois legados ARQUIVADO.
- Zero fatos e 14 ligações editoriais.
- As 14 ligações mantêm UUID, origem, destino, texto e ordem exatamente iguais à D2C1, cuja fotografia foi conferida com o manifesto curado.
- Nenhuma carga de regiões, números, prioridades ou conteúdo da equipe.

## 5. Reserva do arquivo e impedimento de segurança

Ferramentas disponíveis e conferidas: **pg_dump 18.6** e **pg_restore 18.6**, em `C:\Program Files\PostgreSQL\18\bin`.

O script reservou um nome novo usando criação exclusiva (`wx`), sem sobrescrever arquivos existentes, e confirmou que o caminho está ignorado pelo Git. Antes de gravar qualquer dado, tentou aplicar ACL restrita ao usuário Windows da execução, SYSTEM e Administrators, removendo herança do arquivo. Essa etapa era condição obrigatória para chamar pg_dump.

Arquivo reservado às **01:37:01 de 17/10/2026** (America/Sao_Paulo):

```text
C:\Users\USER\projetoIntegrador20262\integration_backend_frontend\.cache\db-backups\patrimonio_guarulhos_2026-10-17T04-37-01-845Z_pre_d2c_deploy.dump
```

| Verificação | Resultado |
| --- | --- |
| Arquivo reservado | Existe, **0 bytes** |
| SHA-256 do arquivo vazio, apenas identificação | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Aplicação/verificação de ACL | **Não executada: script bloqueado pela política do PowerShell**, processo saiu com código 1 |
| pg_dump | **Não executado**, sem exit code de dump |
| Backup aprovado | **Não** |
| Dados sensíveis gravados nesse arquivo | Nenhum; arquivo vazio |

Mensagem relevante do bloqueio: o arquivo `protect-dump.ps1` não pode ser carregado porque a execução de scripts foi desabilitada; categoria `SecurityError`, identificação `UnauthorizedAccess`. [Log da tentativa](../.cache/d2c2/12a35d03-dee4-4aaa-9500-8c475fdd1aa3/acl.log).

Não se tentou relaxar a política, contornar o bloqueio ou gerar o dump sem ACL verificada. Nenhuma permissão do banco ou política persistente do Windows foi alterada. O arquivo vazio foi preservado e **não deve ser tratado como backup**, mesmo tendo extensão `.dump`.

## 6. Archive, restauração e pós-verificação

| Etapa | Resultado |
| --- | --- |
| pg_restore --list | Não executado: não há archive válido |
| Leitura/descompressão completa | Não executada |
| SHA-256 de backup válido | Não disponível; o hash acima pertence somente à reserva vazia |
| Banco descartável exclusivo | Não criado |
| Restauração completa | Não executada |
| Comparação das 17 tabelas restauradas | Não executada |
| Limpeza de banco descartável | Não necessária; nenhum banco criado |
| Pós-verificação após restauração | Não executada: procedimento interrompido antes do dump |

O único acesso ao banco real foi o preflight READ ONLY, encerrado com ROLLBACK. Não houve sessão de escrita, criação de auditoria de domínio ou execução da migration. Não se declara uma fotografia posterior que não foi consultada; a evidência de integridade real desta execução é a comparação aprovada do preflight com D2C1.

## 7. Arquivos e evidências desta fase

- `reports/D2C2-backup-verificado.md`: este relatório, única adição versionável.
- `.cache/d2c2/backup.cjs`: auxiliar com guardas de identidade, preflight, backup e restauração restrita a nome temporário gerado pela própria execução; fluxo parou na proteção do arquivo.
- `.cache/d2c2/protect-dump.ps1`: auxiliar de ACL, bloqueado antes de executar.
- `.cache/d2c2/12a35d03-dee4-4aaa-9500-8c475fdd1aa3/`: [evidence.json](../.cache/d2c2/12a35d03-dee4-4aaa-9500-8c475fdd1aa3/evidence.json), [preflight.json](../.cache/d2c2/12a35d03-dee4-4aaa-9500-8c475fdd1aa3/preflight.json) e log de ACL.
- `.cache/d2c2/latest.json`: localização da evidência desta tentativa.
- Reserva vazia `.cache/db-backups/patrimonio_guarulhos_2026-10-17T04-37-01-845Z_pre_d2c_deploy.dump`.

Os auxiliares, evidências e reserva estão sob `.cache`, ignorado pelo Git. Os arquivos D2B e o CSS concorrente não foram alterados. Não houve staging nem commit.

## 8. Pendências e parecer

**NO-GO:** a restrição de acesso ao dump não pôde ser aplicada pelo mecanismo usado. O backup não foi gerado nem restaurado; portanto a Fase 2 não está concluída com sucesso e não autoriza avanço ao deploy.

Para uma nova tentativa, é necessário revisar o mecanismo de ACL de forma compatível com a política do Windows, mantendo a proteção exigida. Deve-se repetir o preflight, criar outro nome exclusivo e concluir dump, catálogo, restauração descartável, comparação integral e pós-verificação real. A existência da reserva vazia não satisfaz nenhuma dessas etapas. Não houve continuação automática após o bloqueio.

D2C FASE 2 — NO-GO

BANCO REAL SEM ALTERAÇÕES

MIGRATION REAL NÃO EXECUTADA
