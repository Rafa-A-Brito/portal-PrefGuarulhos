# Auditoria administrativa e logs

A implementação usa o `AuditLog` existente, sem mudança de schema, índices ou migrations. O frontend, os perfis ADMIN/EDITOR e as regras de gestão de contas permanecem com seus contratos atuais. Não há escrita HTTP manual na auditoria, mecanismo de reversão nem endpoint para arquivos de logs.

## Cobertura das rotas reais

| Recurso | Operações existentes cobertas | Ações / entidade |
| --- | --- | --- |
| Usuários | `POST /api/admins`, `PATCH /api/admins/:id`, `PATCH /api/admins/:id/status` | `USER_CREATE`, `USER_UPDATE` (nome, e-mail e perfil em um evento), `USER_ACTIVATE`, `USER_DEACTIVATE` / `User` |
| Própria senha | `PATCH /api/auth/senha` | `USER_PASSWORD_CHANGE` / `User`; ator e alvo são o próprio usuário; sem valores anteriores/novos |
| Patrimônios | `POST /api/admin/patrimonios`, `PATCH /api/admin/patrimonios/:id`, `PATCH .../:id/publicar`, `PATCH .../:id/arquivar` | `PATRIMONIO_CREATE`, `PATRIMONIO_UPDATE`, `PATRIMONIO_PUBLISH`, `PATRIMONIO_ARCHIVE` / `Patrimonio` |
| Localização, região, categorias e texto patrimonial | Mesma edição patrimonial; numeração/ordem atribuídas na publicação também entram no evento | Um evento patrimonial com as diferenças; latitude/longitude Decimal em string; null explícito preservado |
| Fatos e ligações | POST/PATCH/DELETE em `/api/admin/patrimonios/:id/fatos` e `/ligacoes`, incluindo `PATCH .../ordem` | `FATO_CREATE/UPDATE/DELETE/REORDER` e `LIGACAO_CREATE/UPDATE/DELETE/REORDER` / `PatrimonioFato`, `PatrimonioLigacao` |
| Imagens | Upload no campo `imagem` ou `arquivo`; PATCH/DELETE nas rotas aninhadas e no alias `/api/admin/patrimonios/imagens/:imagemId` | `IMAGEM_CREATE/UPDATE/DELETE` / `PatrimonioImagem`; inclui legenda, crédito, fonte, alt, ordem e principal |
| Documentos e referências | POST/PATCH/DELETE em `/api/admin/patrimonios/:id/documentos` e `/referencias` | `DOCUMENTO_CREATE/UPDATE/DELETE` / `PatrimonioDocumento` |
| Regiões | `POST /api/admin/regioes`, `PATCH /api/admin/regioes/:id` | `REGIAO_CREATE`, `REGIAO_UPDATE` / `RegiaoPatrimonio`, compatíveis com os eventos anteriores |
| Exposições e novidades | POST/PATCH/DELETE, publicar e arquivar em `/api/admin/exposicoes` e `/api/admin/novidades` | `EXPOSICAO_CREATE/UPDATE/DELETE/PUBLISH/ARCHIVE`, `NOVIDADE_CREATE/UPDATE/DELETE/PUBLISH/ARCHIVE` / `Exposicao`, `Novidade` |

Hero, categorias, rotas turísticas e detalhes legados não têm operações administrativas de escrita expostas nesta versão. Não foram criadas funcionalidades para auditá-los. Scripts de seed, importação e manutenção fora da API não passam a ser auditados automaticamente por esta entrega; suas estruturas existentes foram preservadas.

## Transações e valores

`registrarAuditoria(tx, evento)` exige explicitamente o client da transação de negócio e não abre transações independentes. Os serviços preservam seus locks e níveis de isolamento. A falha da gravação de auditoria é registrada de forma operacional e relançada; a transação precisa reverter a escrita de negócio. Uma falha anterior ao evento não cria auditoria de sucesso. O ator vem de `req.user` ou do ID autenticado repassado pelo controller.

As constantes estão em `src/utils/auditoria.js`, com listas positivas por entidade e por objeto relacionado. Criação usa `newValues`, exclusão usa `oldValues` e edição usa apenas diferenças. Timestamps técnicos de atualização, sessões, senhas, hashes, tokens, cookies, cabeçalhos, binários e caminhos internos ficam fora dos valores. Na senha, os dois JSONs ficam SQL NULL. Datas são ISO, Decimal e BigInt usam strings para não perder precisão.

O snapshot permitido anterior é copiado em memória antes da escrita. URLs são filtradas novamente na persistência e na leitura: credenciais, query e fragmento são removidos; protocolos e caminhos internos não permitidos são omitidos. Uma alteração somente em query/credencial ainda gera evento, mesmo que os valores públicos resultem iguais ou precisem ser omitidos. Nenhum hash do segredo é usado para representar a mudança.

Em imagens principais, o evento também identifica os IDs das principais substituídas (`principaisSubstituidas`, em criação) ou a mudança do conjunto `principais` (em edição). Não são emitidos eventos separados para cada imagem desmarcada pela mesma requisição. Reordenação editorial usa um evento com os pares ID/ordem anteriores e novos; `entityId` identifica o patrimônio nesse caso.

Mídias e itens editoriais mantêm seu próprio UUID como `entityId`. Criação e exclusão registram o patrimônio permitido nos respectivos valores. No detalhe, `registro.patrimonioId` é resolvido pelo registro atual ou pelo evento de criação/exclusão quando o registro já não existe; assim, o diff de uma legenda não repete campos imutáveis. Vínculos legados não recuperáveis resultam em null. Os registros existentes não são reescritos, e a leitura aplica as listas permitidas também aos JSONs antigos.

## Consulta

- `GET /api/admin/auditoria`: ADMIN ativo autenticado; `pagina=1`, `limite=20`, máximo 100 e página máxima 1.000.000 para limitar o OFFSET. Filtros exatos `userId`, `action`, `entity`, `entityId`, `inicio`, `fim`. Os instantes aceitam ISO 8601 com Z ou offset, têm extremos inclusivos e exigem início <= fim. UUIDs, campos extras/repetidos, datas e paginação são validados.
- `GET /api/admin/auditoria/:id`: mesmo acesso; inclui `oldValues`, `newValues` e `registro`; 404 para inexistente e 400 para UUID inválido. `user` pode ser null em eventos antigos.

A listagem usa snapshot RepeatableRead e ordena por `createdAt DESC, id DESC`. Não retorna os valores JSON. Sem resultados, devolve `itens: []` e totais zero. As respostas das rotas, inclusive rejeições de autenticação/autorização e validação, usam `Cache-Control: private, no-store`. O contrato, exemplos e filtros estão no Swagger em `/api/docs` e `/api/docs.json`.

Exemplo seguro de dados persistidos (IDs fictícios):

```json
{
  "userId": "8f37eeba-0624-4cf2-9cf5-5c9739cbdaaa",
  "action": "USER_UPDATE",
  "entity": "User",
  "entityId": "42ac0071-35aa-4b48-a5d3-5920676bf5bd",
  "oldValues": { "role": "EDITOR" },
  "newValues": { "role": "ADMIN" }
}
```

## Segurança, operação e correlação

Os logs JSON vão para stdout (info) e stderr (warn/error). Não dependem da transação do negócio. Cada requisição recebe um UUID gerado no backend, devolvido em `X-Request-Id` e propagado com AsyncLocalStorage. Identificadores recebidos do cliente não são utilizados. CORS expõe esse cabeçalho sem mudar `trust proxy`.

| Código estável | Quando é emitido |
| --- | --- |
| `LOGIN_SUCCEEDED` | Sessão de login confirmada no banco |
| `LOGIN_REJECTED` | Credenciais inválidas ou conta indisponível; resposta continua genérica e não distingue a causa |
| `LOGIN_RATE_LIMITED`, `AUTH_RATE_LIMITED` | Limite do login ou da renovação excedido; sem alterar contadores/Retry-After existentes |
| `AUTHENTICATION_DENIED` | Recusa de autenticação; não usa claims de JWT inválido para atribuir usuário |
| `AUTHORIZATION_DENIED` | Recusa por falta de permissão; quando disponível, usa somente usuário autenticado |
| `REFRESH_TOKEN_REUSED` | Replay de refresh consumido; somente depois do commit da tentativa de revogação, com quantidade revogada |
| `LOGOUT_SESSION_REVOKED` | Logout efetivamente revogou sessão, depois do commit; logout sem efeito não gera sucesso |
| `SESSIONS_REVOKED` | Troca de senha confirmou a revogação de sessões; sem emitir sucesso em rollback |
| `AUDIT_WRITE_FAILED` | Gravação da auditoria falhou; não absorve o erro e não depende do commit |
| `DATABASE_OPERATION_FAILED`, `INTERNAL_ERROR` | Falhas inesperadas de banco ou da API; também cobre as falhas de métricas que já respondem com 503 genérico |
| `UPLOAD_CLEANUP_FAILED`, `FILE_RECOVERY_PENDING` | Falha de limpeza, preparação/restauração da quarentena ou pendência de recuperação |
| `SERVER_STARTED`, `SERVER_START_FAILED` | Inicialização e falha de preparação/escuta do backend |

Não há log de cada acesso público nem de cada renovação normal de token. O logger seleciona campos, códigos seguros de erro, IDs UUID e identificadores controlados de arquivos. Não serializa `message`, `stack`, SQL, `meta`, connection strings, e-mails digitados ou IPs. Rotas são templates do Express, sem query; campos são limitados e caracteres não permitidos são removidos. Falhas já observadas são deduplicadas pela instância do erro, sem ocultar eventos distintos. Logs sem requisição usam requestId/método/rota/status null. Falhas de disco sem status explícito aguardam a finalização da resposta para anotar o status real; conexão encerrada antes dos cabeçalhos usa 499.

Falhas síncronas e assíncronas da saída são isoladas. O logger não derruba o processo, não transforma um commit em falha e não substitui a causa inicial. Essa proteção significa que um sink indisponível pode perder registros; não é uma garantia de entrega.

Exemplo seguro de log:

```json
{"timestamp":"2026-10-26T12:00:00.000Z","level":"warn","event":"AUTHORIZATION_DENIED","requestId":"b4859d14-f6ed-4ae2-b3ce-650a380d96e1","method":"GET","route":"/api/admin/auditoria","status":403,"userId":"8f37eeba-0624-4cf2-9cf5-5c9739cbdaaa","reason":"authorization","errorType":"Error"}
```

## Disco e quarentena

Os fluxos de uploads e quarentena privada são preservados. Na exclusão, mover para quarentena ocorre depois dos locks; remover o registro e gravar a auditoria pertencem à mesma transação. Qualquer falha, inclusive no commit ou na auditoria, tenta restaurar os bytes. A limpeza definitiva só ocorre quando a promise da transação confirma o commit. Exclusão de exposições/novidades também usa esse fluxo para sua imagem, respeitando o compartilhamento existente de URLs.

Logs de recuperação usam `arquivo`, `quarentena`, `pasta`, `armazenamento`, IDs e `registroExcluido`, sem caminhos absolutos nem mensagens brutas. A operação de recuperação monta o caminho a partir das raízes configuradas (`midia` = UPLOAD_ROOT; `legado` = UPLOAD_DIR), nunca de uma raiz recebida do log. Uma falha após commit mantém a pendência registrada e não afirma que o banco foi revertido. Não há atomicidade entre filesystem e PostgreSQL nem restauração automática de alterações administrativas.

## Coleta e retenção na hospedagem

Stdout/stderr isolados não garantem persistência. Configure o runtime/supervisor para coletar **ambos** os fluxos em JSON por linha, com rotação, limites de disco, acesso restrito e cópia para armazenamento persistente quando necessário. Em Docker, por exemplo, o serviço backend pode usar o driver `local` com `max-size: "10m"` e `max-file: "5"`; são limites por volume, não uma política por dias, e recriar/remover um contêiner pode remover seus logs. Essa configuração é uma orientação e não foi aplicada ao Compose nesta entrega.

Defina explicitamente o prazo de retenção de segurança/operação conforme as necessidades da equipe, a capacidade e a política de dados do projeto. Para retenção por tempo, configure o coletor/supervisor e teste expiração, recuperação e busca pelo requestId. Separe privilégios de leitura/escrita, acompanhe falhas de coleta e preserve cópias das pendências de recuperação até sua resolução. AuditLog é persistente no PostgreSQL e precisa de backup/política própria; o backup dos uploads deve ser coordenado com o banco. Não exponha esses arquivos por HTTP.

## Validação e limites

As suítes `auditoria.test.js`, `auditoriaOperacoes.test.js` e `logs.test.js` verificam diferenças, no-op, identidades, campos permitidos, permissões/consultas, sigilo e ordem dos logs em relação ao commit. Os testes de arquivos existentes foram adaptados para JSON e identificadores relativos; continuam verificando bytes, restauração, limpeza final e preservação da causa original. `imageDeletionSecurity.test.js` também força falha de auditoria nas duas famílias de rotas/armazenamento.

`auditoria.integration.test.js` usa a proteção `assert-test-db.js`: exige TEST_DATABASE_URL local exclusivo, nome terminado em `_test`, TEST_DATABASE_EXCLUSIVE=1 e identidade diferente da conexão normal. Provoca uma violação real de FK na INSERT de auditoria dentro de uma transação PostgreSQL real e verifica rollback de usuário, criação de conta, região, patrimônio/localização, senha/sessões e exclusão de imagens com restauração dos bytes. Não usa migrations, seeds, importadores ou reset e remove apenas suas fixtures. Mocks não comprovam rollback real. Veja os resultados desta execução em `../reports/auditoria-validacao.md`.

As ações anteriores à implementação não são reconstruídas. Os eventos de região existentes continuam armazenados. Administradores com acesso direto ao banco ainda podem modificar os registros: a API somente de leitura não torna a tabela inviolável. Auditoria e logging não substituem backups, controles de acesso do banco ou coleta confiável da hospedagem.
