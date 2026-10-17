# D2C — Fase 4: deploy controlado da migration D2

Data: **17/10/2026**, America/Sao_Paulo. **Deploy concluído e verificações aprovadas.** Foi aplicada uma única migration: `20261016120000_add_regioes_numero_ordem`. O banco real passou de seis para sete migrations, sem mudança no conteúdo anterior. Catálogo regional vazio; os três campos novos estão NULL nos 36 patrimônios.

Esta fase executou somente o DDL autorizado e o registro correspondente do Prisma. Não houve seed, sync, import, preenchimento editorial, restauração, commit ou push. D3 não iniciada.

## 1. Commit, arquivos e hashes

Branch `development/backend`, HEAD conferido antes e depois:

```text
b31718b31367b7cc0aa98bec6505f0bf252ceea1
```

Foram lidos os relatórios D2B, D2C1, NO-GO original da D2C2, retentativa aprovada da D2C2 e D2C3. A migration está no commit técnico. Os 41 arquivos técnicos correspondem aos hashes conferidos na D2C3. As seis migrations anteriores mantêm seus bytes/checksums; a linhagem da equipe permanece intacta e fora da árvore ativa.

| Arquivo | SHA-256 aprovado e encontrado |
| --- | --- |
| `backend/prisma/migrations/20261016120000_add_regioes_numero_ordem/migration.sql` | `452d76e28f980d0f5e3e0f4e4eaf03edeb887148c1b8ca1718a82b5b883baaf9` |
| `backend/prisma/patrimonioSeedData.js` | `c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8` |

As únicas diferenças iniciais eram o CSS concorrente `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.css` e os quatro relatórios D2C não versionados. Todos permaneceram byte a byte iguais. Nenhum arquivo de código, schema, SQL ou configuração foi editado. Index vazio e `git diff --check` aprovado.

## 2. Janela operacional e identidade

O usuário confirmou explicitamente: **“Janela exclusiva confirmada; manterei todos os escritores suspensos”**. Essa suspensão operacional foi a condição para impedir novas escritas durante a janela; não foi criada uma restrição permanente no PostgreSQL ou no Windows.

A inspeção de processos não encontrou API Node ativa. O listener na porta 8080 pertence a `httpd.exe`; não foi encerrado nem presumido como API deste projeto. PostgreSQL escuta na porta 5432 em todas as interfaces, por isso a ausência momentânea de processos não foi tratada isoladamente como garantia de exclusividade. A confirmação operacional foi complementada por `pg_stat_activity`: nenhuma outra sessão no banco durante o preflight, na última guarda imediatamente antes do deploy e nas inspeções posteriores. Nenhuma transação preparada encontrada no preflight. Nenhum serviço foi encerrado indiscriminadamente.

As consultas Windows inicialmente foram negadas pelo sandbox; a inspeção somente leitura foi repetida com a permissão solicitada pela ferramenta. Isso não alterou serviços, ACLs ou políticas. [Processos finais](../.cache/d2c4/process-inspection.json) e [portas](../.cache/d2c4/listeners.json).

| Identidade | Valor efetivo confirmado |
| --- | --- |
| Host configurado / porta | `localhost:5432` |
| Banco | `patrimonio_guarulhos` |
| current_user / session_user | `postgres` / `postgres` |
| Endereço do servidor | `::1`, loopback |
| Versão PostgreSQL | `18.6` |
| Inspeções SQL | REPEATABLE READ READ ONLY; default_transaction_read_only=on; encerradas com ROLLBACK |

Credenciais foram carregadas em memória, sem impressão de senha, token ou URL completa. A sessão DDL do Prisma teve destino explicitamente fixado e foi separada das conexões de inspeção READ ONLY. Nenhuma configuração persistente de segurança foi modificada.

## 3. Preflight final e backup

O preflight foi repetido imediatamente antes do deploy. Confirmou exatamente seis migrations completas, nenhuma falha/reversão, nenhuma migration da equipe e somente D2 pendente. Confirmou 36 patrimônios, 34 canônicos, dois legados arquivados, zero fatos e 14 ligações. Tabela regional e três colunas D2 ainda estavam ausentes; descrição permanecia NOT NULL.

As 17 tabelas coincidiram com D2C1 e com a fotografia do backup, em contagens e SHA-256. UUIDs/status das fichas e UUIDs/origens/destinos/textos/ordens das ligações também coincidiram. Colunas, constraints, índices, enums e triggers corresponderam ao estado anterior aprovado.

O diff Prisma READ ONLY contra o schema pré-D2, extraído do commit `c8fba66fcbf518b3205a49355d09a2c7c10a9c16`, retornou **No difference detected**, saída 0. Não houve shadow database ou replay nesta fase.

Backup preservado:

```text
.cache/db-backups/d2c2_1afba5ce-575c-468c-a6fd-76d4f73ce94d/patrimonio_guarulhos_2026-10-17T10-16-42-041Z_pre_d2c_deploy.dump
```

| Verificação | Resultado |
| --- | --- |
| Tamanho | **170000 bytes** |
| SHA-256 | `d988bed2b77ebc228fbf1549a18abbb8daa50f65ead7499ef63a5fe14e807bbb` |
| Leitura pelo executor atual | Aprovada, inclusive leitura integral para hash |
| ACL do arquivo e diretório | DACL protegida; somente usuário executor, SYSTEM e Administrators; conferida por SIDs, SDDL e icacls /verify |
| `pg_restore --list` | Saída 0; identidade do archive confirmada |
| Restauração descartável | Aprovação da D2C2 conferida documentalmente; não repetida |
| Atualidade pré-deploy | As 17 tabelas reais eram idênticas à fotografia do backup |
| Verificação após operação | Mesmo tamanho/hash e ACL restrita |

O executor coincide com a identidade autorizada nas ACLs. Nenhuma ACL foi ampliada. Nenhum backup foi apagado, sobrescrito ou versionado. O dump continua sendo a fotografia **pré-D2**, própria para eventual decisão de recuperação; não é um backup do schema já migrado. Restauração real continua exigindo autorização separada.

## 4. Checkpoint e execução única

O checkpoint registrou GO somente após commit, hashes, identidade, linhagem, dados, drift, backup, acesso e janela exclusiva aprovados. A configuração consolidada `backend/prisma.config.js` utiliza `process.env.DATABASE_URL`; o processo filho recebeu explicitamente o destino conferido, sem variáveis de conexão de teste/equipe herdadas. Prisma CLI local: 7.10.0.

Comando executado no diretório `backend` (no Windows, launcher `npx.cmd`):

```sh
npx prisma migrate deploy --config prisma.config.js
```

| Execução | Resultado |
| --- | --- |
| Início | 17/10/2026, **07:44:50.030** |
| Término | 17/10/2026, **07:44:57.973** |
| Exit code | **0** |
| Migration aplicada | `20261016120000_add_regioes_numero_ordem` |
| Outras migrations aplicadas | Nenhuma |
| Número de execuções de deploy | **Uma** |

O log identifica explicitamente `patrimonio_guarulhos`, schema public, localhost:5432, e somente a migration D2 como aplicada. O auxiliar contém uma reserva exclusiva de tentativa para impedir repetição acidental. Não houve erro do deploy, SQL corretivo manual, migrate resolve ou restauração automática.

## 5. Estado final e integridade

Sete migrations completas, checksum D2 igual ao SQL aprovado, nenhuma falha e nenhum registro adicional:

1. `20260929230000_initial_schema`
2. `20260930120000_add_demolido_situacao`
3. `20261005004508_categorias_adicionais`
4. `20261006014922_adicionar_detalhes_e_heroes`
5. `20261006180000_exposicoes_novidades`
6. `20261014010000_add_fatos_ligacoes`
7. `20261016120000_add_regioes_numero_ordem`

Os metadados completos e o hash dos seis registros anteriores de `_prisma_migrations` permanecem iguais. Somente o sétimo registro foi acrescentado.

Estrutura conferida: `regioes_patrimonio`, sete colunas regionais, UUID/PK, nome/slug obrigatórios, descrição regional opcional, atividade default true, timestamps com fuso; três colunas patrimoniais nullable sem defaults; FK com UPDATE CASCADE/DELETE RESTRICT; número globalmente único com CHECK > 0; ordem não única com CHECK >= 0; índices regionais e de ordenação. Constraints antigas, enums e triggers preservados. Nenhum enum regional histórico ou PatrimonioSecao foi introduzido; descrição patrimonial continua NOT NULL.

| Conteúdo | Antes | Depois |
| --- | --- | --- |
| Patrimônios físicos | 36 | 36 |
| Canônicos / legados arquivados | 34 / 2 | 34 / 2 |
| Status PUBLICADO / RASCUNHO / ARQUIVADO | 33 / 1 / 2 | 33 / 1 / 2 |
| Fatos | 0 | 0 |
| Ligações | 14 | 14 |
| Regiões | Tabela ausente | 0 |
| Patrimônios com os três campos D2 NULL | Campos ausentes | 36 |
| Auditoria de domínio | 68 | 68 |

Comparadas todas as **16 tabelas anteriores de domínio**, sem diferenças de contagem/hash. Para Patrimonio, o hash usa explicitamente `to_jsonb(t) - ARRAY['regiao_id','numero_exibicao','ordem_exibicao']`; para as demais tabelas usa todas as colunas. `_prisma_migrations` é comparada separadamente, excluindo somente o novo registro autorizado. Método: texto JSONB ordenado com collation C, sessão UTC, newline por linha, SHA-256.

Isso preserva também categorias, localização, detalhes, imagens, referências, usuários, UUIDs, slugs, status, autoria e datas preexistentes. As 14 ligações conservam UUIDs/origens/destinos/textos/ordens. Nenhuma carga dos 83 fatos/27 ligações da equipe, de taxonomia, números ou prioridades.

## 6. Prisma e smoke de leitura

| Verificação | Resultado |
| --- | --- |
| Prisma migrate status | Saída 0; sete migrations; database schema is up to date |
| Prisma migrate diff contra schema D2 | Saída 0; No difference detected |
| Prisma Client | Já continha modelo/campos D2; regeneração desnecessária |
| Smoke real de leitura | **44 requisições GET aprovadas** |
| Inspeção SQL após smoke | Aprovada; dados anteriores continuam idênticos |

O smoke carregou a aplicação real em listener temporário loopback, com wrapper que recusa métodos diferentes de GET. Toda conexão Prisma foi forçada a READ ONLY. Foram verificados health, catálogo público vazio, lista pública, os 33 detalhes publicados, filtros regionais/numéricos sem resultados, metadados NULL, ordenação anterior por nome/UUID, 14 ligações e navegação por slug no contrato HTTP. Foram lidos 177 detalhes editoriais e 34 imagens do universo publicado, sem confundir esse subconjunto com as contagens físicas totais.

Autenticação: GET administrativo sem token e com token inválido retornaram 401; token assinado de 60 segundos, mantido exclusivamente em memória para um ADMIN ativo já existente, permitiu GET de regiões, lista de 36 patrimônios, detalhe administrativo e ligações D1E. Não foram usados senha, login interativo, usuário/fixture novos ou operações administrativas de escrita. Token não foi registrado. Listener e conexões foram encerrados ao terminar.

C3, D1D, D1E e redesign não foram editados. Os testes de UI/teclado das fases anteriores não foram apresentados como nova execução visual nesta fase; o smoke atual verifica leitura da aplicação real após DDL e integridade dos contratos/dados.

### Ajustes nos auxiliares de conferência

Dois pressupostos dos auxiliares novos foram corrigidos, preservando os logs iniciais. Nenhum ajuste foi feito no banco ou no código da aplicação:

- A primeira contagem de constraints não incluía as seis entradas NOT NULL da tabela regional em `pg_constraint` no PostgreSQL 18. A inspeção mostrou todas as constraints antigas intactas e somente as sete constraints nomeadas no SQL mais esses seis NOT NULL esperados. O auxiliar passou a validar explicitamente os seis nomes/colunas/definições.
- O primeiro smoke esperava 34 publicados, confundindo canônicos com publicados. A fotografia pré-deploy já contém **33 PUBLICADO, um RASCUNHO e dois ARQUIVADO**. O smoke passou a comparar as identidades publicadas com essa fotografia, sem alterar status ou dados.

As execuções finais completas passaram. As tentativas iniciais não são utilizadas como evidência de aprovação.

## 7. Evidências, Git e encerramento

Evidências privadas, ignoradas pelo Git, em `.cache/d2c4`:

- [Preflight imediatamente anterior](../.cache/d2c4/preflight.json) e [diff pré-D2](../.cache/d2c4/pre-diff.log).
- [Checkpoint/tentativa única](../.cache/d2c4/deploy-attempt.json), [resultado](../.cache/d2c4/deploy-result.json) e [log do deploy](../.cache/d2c4/deploy.log).
- [Pós-check completo](../.cache/d2c4/postflight.json) e [conferência final após smoke](../.cache/d2c4/final-postflight.json), incluindo hashes por tabela.
- [Status Prisma](../.cache/d2c4/status.log), [diff final](../.cache/d2c4/post-diff.log) e [smoke](../.cache/d2c4/smoke.json).
- [Verificação final de arquivos/backup/ACL](../.cache/d2c4/final.json); ACLs relidas em `final-acl/`.
- Tentativas iniciais dos auxiliares: `postflight-initial-check.json` e `smoke-initial-check.json`.

Única adição versionável desta fase: este relatório. Auxiliares e logs ficaram em `.cache/d2c4`; arquivos anteriores, relatórios históricos e CSS concorrente foram preservados. HEAD/index não mudaram, nenhum dump/credencial foi versionado, nenhum commit/push foi criado. `git diff --check` e a checagem de whitespace deste relatório passaram.

**Parecer final: deploy D2 aprovado.** Nenhuma pendência impeditiva. A garantia de exclusividade durante a operação baseou-se na janela confirmada pelo usuário e nas inspeções de sessões, não em bloqueio permanente de novas conexões. Nenhum serviço foi iniciado permanentemente pelo smoke. Recuperação por outro executor exige conferir seu acesso ao dump; restauração real depende de autorização própria. População editorial e D3 permanecem fora do escopo.

D2C FASE 4 — DEPLOY REAL CONCLUÍDO

7 MIGRATIONS APLICADAS

36 PATRIMÔNIOS PRESERVADOS

14 LIGAÇÕES PRESERVADAS

REGIÕES VAZIAS E CAMPOS D2 NULL

BACKUP PRESERVADO

PRONTO PARA REVISÃO FINAL DA D2
