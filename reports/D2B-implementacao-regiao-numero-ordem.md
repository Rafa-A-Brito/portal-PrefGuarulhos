# D2B — Região, Número e Ordem de Exibição

Data: 16/10/2026 (America/Sao_Paulo). Base: `c8fba66fcbf518b3205a49355d09a2c7c10a9c16`, branch `development/backend`. Working tree limpo e `git diff --check` aprovado antes da implementação. Alterações mantidas no working tree, sem commit automático.

**Resultado:** implementação full-stack concluída e validada em PostgreSQL descartável e API simulada. **Banco real `patrimonio_guarulhos` não acessado**, nem para leitura. A migration permanece candidata a um preflight/deploy posterior; este relatório não comprova implantação real.

## 1. Implementação

Região é uma entidade de referência ligada diretamente ao patrimônio. Não pertence à localização, não altera endereço, coordenadas, geocodificação, mapa ou rota. Não foi adotado o enum nem importada a taxonomia histórica da equipe.

| Campo | Regra implementada |
| --- | --- |
| `regiaoId` | UUID opcional; omissão preserva no PATCH e `null` limpa. Atribuição explícita exige região existente e ativa. |
| `numeroExibicao` | INTEGER opcional entre 1 e 2147483647, UNIQUE global, inclusive arquivados; vários NULL permitidos; sem geração automática. |
| `ordemExibicao` | INTEGER opcional entre 0 e 2147483647, não único, sem default. Zero e empates válidos. |
| Ordenação pública/admin | `ordemExibicao ASC NULLS LAST, nome ASC, id ASC`, antes de paginar. Todas NULL reproduzem a ordenação anterior. Número não é chave de ordenação. |

Zod continua estrito: strings vazias, inteiros fora da faixa, fracionários e formatos indevidos são rejeitados. Os campos não são requisitos de publicação. ADMIN edita patrimônios em qualquer status; EDITOR somente RASCUNHO. As regras de publicação e os CRUDs editoriais D1B permanecem.

A atribuição regional e a edição/inativação da região usam o mesmo lock de linha em transação. A região é consultada depois de obter o lock. Se já estiver inativa, nova atribuição é recusada, inclusive quando o cliente envia explicitamente o mesmo ID. Omitir `regiaoId` permite editar outros campos conservando um vínculo inativo. A FK impede apagar uma região referenciada.

### Endpoints e DTOs

| Método e endpoint | Contrato |
| --- | --- |
| `GET /api/regioes` | Regiões ativas: somente id/nome/slug, sem contagens administrativas. |
| `GET /api/admin/regioes` | ADMIN/EDITOR; busca por nome/slug, filtro ativo opcional, paginação. Omissão de ativo inclui inativas. |
| `POST /api/admin/regioes` | ADMIN; nome/slug, descrição opcional e ativo; default ativo=true; criação auditada. |
| `PATCH /api/admin/regioes/:id` | ADMIN; nome/descrição/ativo; slug imutável, inativação/reativação auditadas. |
| POST/PATCH patrimonial existente | Três campos top-level opcionais. Não aceita enum em Localizacao nem arrays de fatos/ligações. |
| Listagens patrimoniais existentes | Filtros `regiao=<slug>` e `numeroExibicao=<inteiro positivo>`, combinados por AND com os filtros atuais. |

Não há DELETE regional. Mutações regionais gravam `REGIAO_CREATE` ou `REGIAO_UPDATE` em `audit_log`, com autoria e snapshots; falha de auditoria desfaz a mutação. Erros de unicidade de número viram 409 específico. Região inexistente retorna 404 e inativa retorna 409. Autenticação/autorização continuam no backend.

DTO público: `numeroExibicao`, `ordemExibicao` e `regiao: { id, nome, slug } | null`. Admin inclui também `regiaoId` e `regiao.ativo`. As respostas de patrimônio continuam com os envelopes e demais campos anteriores.

### Frontend

- `OrganizacaoEditorial` integra o formulário existente: catálogo ativo, vínculo atual inativo visível, número e ordem opcionais; vazio salva NULL e ordem zero permanece zero. Vínculo regional não alterado é omitido no PATCH. Número postal continua separado.
- `AdminRegioes` oferece listagem/busca/paginação, criação, edição e ativação/inativação somente para ADMIN. EDITOR consulta o catálogo no formulário patrimonial, sem menu/gestão global.
- Loading, vazio, retry, sucesso e erros seguros 400/401/403/404/409 são tratados. Mutações regionais ficam bloqueadas após conflitos de identidade/permissão até atualização explícita; não há repetição automática da escrita.
- Normalização preserva os quatro campos D2, mantendo `id` público como slug e `uuid` como UUID. As ligações e referências mantêm seus formatos.
- A listagem pública oferece filtro regional quando há catálogo e busca exata de número separada da busca textual. Preserva a sequência da API, sem sorting local. Catálogo vazio não produz seletor regional vazio.
- `MetadataEditorial` mostra número e região nos cards e detalhe quando preenchidos. Não mostra prioridade, UUID ou número inventado pela posição. A página inicial permanece usando os primeiros itens da coleção, sem novo ranking.

### Arquivos da implementação

| Grupo | Caminhos relativos à raiz |
| --- | --- |
| Schema/migration | `backend/prisma/schema.prisma`; `backend/prisma/migrations/20261016120000_add_regioes_numero_ordem/migration.sql` (novo) |
| Patrimônio | `backend/src/schemas/patrimonioSchema.js`; `backend/src/services/patrimonioService.js` |
| Região (novos) | `backend/src/schemas/regiaoSchema.js`; `backend/src/services/regiaoService.js`; `backend/src/controllers/regiaoController.js`; `backend/src/routes/regiaoRoute.js` |
| Registro/documentação | `backend/src/routes/index.js`; `backend/src/docs/openapi.js`; `backend/src/docs/paths.js`; `backend/src/docs/schemas.js`; `backend/src/docs/organizacaoEditorial.js` (novo) |
| Testes backend novos | `backend/test/d2b.test.js`; `backend/test/d2b.integration.test.js`; `backend/scripts/validate-d2b.js` |
| Testes backend adaptados | `backend/test/adminPatrimonio.test.js`; `backend/test/patrimonio.test.js`; `backend/test/docs.test.js`; `backend/test/r1.test.js`; `backend/test/syncPatrimonios.test.js`; `backend/test/d1c.test.js` |
| Admin existente | `frontend/src/App.jsx`; `frontend/src/features/admin/components/AdminLayout.jsx`; `frontend/src/features/admin/pages/AdminPatrimonios.jsx` |
| Admin novo | `frontend/src/features/admin/components/OrganizacaoEditorial.jsx` e `.css`; `frontend/src/features/admin/pages/AdminRegioes.jsx` e `.css` |
| Serviços frontend | `frontend/src/services/patrimoniosApi.js`; `frontend/src/services/regioesApi.js` (novo) |
| Público | `frontend/src/features/mapa/PlaquetaCard.jsx`; `frontend/src/pages/Patrimonios/Patrimonios.jsx`; `frontend/src/pages/Patrimonios/Patrimonios.css` (novo); `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx` |
| Componente novo | `frontend/src/components/MetadataEditorial/MetadataEditorial.jsx` e `.css` |
| Testes/smoke frontend | `frontend/test/AdminPatrimonios.test.jsx`; `frontend/test/OrganizacaoEditorial.test.jsx` (novo); `frontend/scripts/verificar_organizacao_editorial.mjs` (novo) |
| Relatório | `reports/D2B-implementacao-regiao-numero-ordem.md` |

**Edição concorrente preservada:** `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.css` também aparece no diff: accordion azul sólido e largura ajustada ao conteúdo. Essa edição não foi produzida pela D2B nem revertida. Os testes/build/smoke finais incluem seu estado atual. A implementação D2B do detalhe acrescenta apenas o componente de metadados; não reescreve o accordion ou sua política de localização.

## 2. Migration

Nova migration: **`20261016120000_add_regioes_numero_ordem`**.

SHA-256 do SQL validado:

```text
452d76e28f980d0f5e3e0f4e4eaf03edeb887148c1b8ca1718a82b5b883baaf9
```

Cria `regioes_patrimonio` com UUID, nome VARCHAR(100), slug VARCHAR(120) único, descrição VARCHAR(2000) nullable, ativo e timestamps. Acrescenta três colunas nullable sem default a Patrimonio. FK regional: DELETE RESTRICT / UPDATE CASCADE. Inclui CHECKs textuais e limites inferiores dos inteiros, índice UNIQUE do número e índices de região e `(ordem_exibicao, name, id)`.

`Patrimonio.nome` foi conferido no schema e corresponde à coluna física **`name`**. Timestamps regionais usam **TIMESTAMPTZ(3)**, seguindo a implementação real do projeto. A migration usa BEGIN/COMMIT e **não contém DML de carga**. O default ativo=true aplica-se somente a uma criação futura explícita de região.

As seis migrations anteriores e a linhagem da equipe permanecem intactas. Nenhum `PatrimonioSecao`, enum regional antigo ou alteração de Localizacao/descrição foi introduzido.

## 3. Testes backend

Executados pelo harness com `TEST_DATABASE_URL` apontando exclusivamente ao banco descartável de replay e `TEST_DATABASE_EXCLUSIVE=1`. O `DATABASE_URL` inicial da suíte é um destino não conectável; os testes de integração adotam apenas a conexão de teste validada. Nenhuma suíte foi executada apontando ao banco real.

| Verificação | Resultado |
| --- | --- |
| D2B unit/integration + sync + R1, `node --test --test-concurrency=1 test/d2b.test.js test/d2b.integration.test.js test/syncPatrimonios.test.js test/r1.test.js` | **29 aprovados**, 0 falhas, 0 ignorados |
| Suíte completa, `node scripts/run-suite.js` | **418 aprovados**, 0 falhas, 0 ignorados |

Cobertura: limites/null/omissão/zero, número único inclusive arquivado, prioridades repetidas, FK/RESTRICT, catálogo vazio, permissões, DTO público/admin, slug estável, auditoria atômica, atribuição/inativação, busca/filtros AND, ordenação antes da paginação e equivalência quando todas prioridades são NULL. Concorrência validada: dois números iguais produzem uma confirmação e um 409; atribuição esperando lock de região inativada é recusada após o commit.

O teste R1 agora permite explicitamente a sétima migration/modelo D2 e mantém bloqueios de seções, descrição nullable, linhagem da equipe na árvore ativa e PATCH geral de fatos/ligações. Os hashes históricos continuam verificados.

Uma falha anterior independente da D2B foi investigada em `d1c.test.js`: o commit documental `55ec1b9` reformatou tabelas/JSON do Markdown, mas o teste exigia comparação byte a byte desse relatório gerado. O teste agora normaliza somente essa apresentação em arquivos `.md`, mantendo comparação integral do conteúdo. JS/JSON operacionais continuam comparados byte a byte. Nenhum manifesto, importador ou relatório D1C foi reescrito para fazer o teste passar.

## 4. Testes frontend

| Comando | Resultado |
| --- | --- |
| `npm.cmd test -- test/OrganizacaoEditorial.test.jsx test/AdminPatrimonios.test.jsx` | **80 aprovados**, 2 arquivos |
| `npm.cmd test` | **261 aprovados**, 14 arquivos |

A baseline pós-redesign era 246 testes. Foram acrescentados 12 casos em `OrganizacaoEditorial.test.jsx` e três no teste integrado de AdminPatrimonios: **246 + 15 = 261**, sem remoção de testes anteriores.

Cobertura D2: normalização/identidades/zero/NULL; metadados opcionais; criação/edição/inativação/reativação do catálogo; slug estável; ausência de gestão para EDITOR; erros seguros; catálogo vazio; filtros públicos preservando sequência; atribuição regional com número e ordem zero; omissão de vínculo inativo ao editar outros campos; limpeza NULL e preservação do endereço/coordenadas. A suíte completa também cobre D1D, D1E, C3, referências, imagens, categorias, usuários e accordion.

## 5. Replay PostgreSQL descartável

Harness reproduzível: `backend/scripts/validate-d2b.js`. Ele conecta à manutenção **`postgres`**, cria nomes aleatórios terminados em `_test`, valida a identidade das conexões e permite consultas/migrations somente nos bancos que acabou de criar. A URL de configuração é redirecionada antes de qualquer conexão; não conecta a `patrimonio_guarulhos`. Não imprime credenciais.

Banco de replay aprovado: `portal_d2b_replay_3cde8d0b_test`. Partindo de vazio, aplicou exatamente:

1. `20260929230000_initial_schema`
2. `20260930120000_add_demolido_situacao`
3. `20261005004508_categorias_adicionais`
4. `20261006014922_adicionar_detalhes_e_heroes`
5. `20261006180000_exposicoes_novidades`
6. `20261014010000_add_fatos_ligacoes`
7. `20261016120000_add_regioes_numero_ordem`

Catálogo regional iniciou vazio. Nenhuma migration da equipe foi usada. O harness removeu o banco criado ao terminar.

## 6. Upgrade 6 → 7

Banco aprovado: `portal_d2b_upgrade_c2a0b3d7_test`, separado do replay. O harness montou uma configuração temporária contendo exatamente as seis migrations, carregou **fixtures sintéticas** e aplicou somente a sétima. Não são dados lidos do banco real.

| Verificação imediatamente após upgrade | Resultado |
| --- | --- |
| Patrimônios | 36, mesmos UUIDs/status/datas/autorias |
| Identidades canônicas | 34 |
| Legados | 2, continuam ARQUIVADO |
| Regiões | 0 |
| Três campos D2 | Todos NULL |
| Fatos | 0, preservados |
| Ligações | Mesmas 14 do manifesto curado nas fixtures, inclusive UUIDs/textos/ordens |
| Descrição patrimonial | NOT NULL |
| Localizações/detalhes/imagens/referências | Preservados |
| Carga automática | Nenhuma |

Comparadas as contagens e os checksums de **todas as 16 tabelas de domínio anteriores**. Para Patrimonio, o hash posterior usa a projeção sem as três novas colunas; nas demais tabelas usa todas as colunas. Método: SHA-256 das linhas `to_jsonb(t)::text`, ordenadas com collation C, sessão UTC, newline por registro. Todas as comparações foram idênticas. `_prisma_migrations` recebe naturalmente o registro DDL esperado e não entra no checksum de domínio.

Os checksums completos antes/depois constam no [JSON de validação](../.cache/d2b/52b8798e-9571-4fa1-9e10-540af7e06cbe/validation.json). O banco de upgrade também foi removido pelo harness.

## 7. Prisma validate/status/diff

Executados com a configuração consolidada, sobre o banco descartável de replay:

| Comando | Resultado |
| --- | --- |
| `prisma validate` | Schema válido |
| `prisma migrate status` | 7 migrations; schema atualizado; nenhuma pendente |
| `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | **No difference detected**, saída 0 |

CHECKs, UNIQUE e RESTRICT também foram exercitados com SQL/testes reais no descartável, além do diff Prisma. Nenhuma destas verificações foi executada no banco real.

## 8. Lint, build e diff-check

| Verificação | Resultado |
| --- | --- |
| Backend `npm.cmd run lint` | Aprovado |
| Frontend `npm.cmd run lint` | Aprovado, inclusive script de smoke final |
| Frontend `npm.cmd run build` | Aprovado, saída nativa 0 |
| `git diff --check` | Aprovado |

O build conserva aviso não impeditivo de bundle acima de 500 kB: principal aproximadamente **633 kB / 178 kB gzip**. Não foi alterada a estratégia de divisão do bundle nesta etapa. Avisos do PowerShell ao capturar stderr não representam falha de build; a saída nativa foi registrada separadamente.

## 9. Smoke 1440 / 390 / 320

`node scripts/verificar_organizacao_editorial.mjs`: **PASS nas três larguras**, saída nativa **0**, zero exceções JavaScript e ausência de overflow horizontal. Página real, API em memória no Vite e sessões fictícias; nenhuma credencial/API/banco real. Interações usam Tab, Enter, Espaço e setas, com foco visível.

Em cada largura foram exercitados: catálogo vazio; ADMIN criando/inativando região; seleção no patrimônio; número 12; prioridade zero; filtro público por região/número; sequência recebida da API; metadados no detalhe; galeria/referências; accordion com várias seções abertas; navegação D1D por slug; EXATA, APROXIMADA/DEMOLIDO, REFERENCIA e SEM_ROTA; página de mapa; edição mantendo região inativa; limpeza dos três campos para NULL; D1E completo de adicionar/editar/reordenar/excluir preservando UUID; EDITOR sem gestão regional.

Para DEMOLIDO, a URL de rota foi conferida como destino por coordenadas. Em REFERENCIA/SEM_ROTA, mesmo com região e número, não aparecem endereço nem ações de mapa/rota. O fornecedor externo Google Maps fica bloqueado no smoke: valida-se a página/contrato/política local, não carregamento dos mapas externos. O hook existente registra tentativas bloqueadas de script; StrictMode também pode registrar cancelamentos. Não houve exceção JavaScript.

A primeira tentativa no sandbox expirou em Page.enable. A repetição autorizada fora dele permitiu validar o Chrome. Durante a preparação, corrigiram-se duas fixtures do smoke: endereço obrigatório da ficha administrativa e e-mail da sessão EDITOR. Não foi alterado o login para aceitar fixture inválida. A execução final completa passou; logs antigos de tentativas não são usados como prova de aprovação. O script mantém navegador oculto/perfil temporário e encerra navegador/Vite ao terminar.

Evidências em `.cache/d2b-smoke`, ignoradas pelo Git. Foram salvas **33 capturas** (11 por largura), além de [resultado estruturado](../.cache/d2b-smoke/resultado.json). Capturas desktop e mobile foram inspecionadas visualmente.

| Cenário | 1440 px | 390 px | 320 px |
| --- | --- | --- | --- |
| Organização editorial | [Imagem](../.cache/d2b-smoke/organizacao-1440.png) | [Imagem](../.cache/d2b-smoke/organizacao-390.png) | [Imagem](../.cache/d2b-smoke/organizacao-320.png) |
| Catálogo | [Imagem](../.cache/d2b-smoke/catalogo-1440.png) | [Imagem](../.cache/d2b-smoke/catalogo-390.png) | [Imagem](../.cache/d2b-smoke/catalogo-320.png) |
| Filtro público | [Imagem](../.cache/d2b-smoke/filtro-publico-1440.png) | [Imagem](../.cache/d2b-smoke/filtro-publico-390.png) | [Imagem](../.cache/d2b-smoke/filtro-publico-320.png) |
| Detalhe | [Imagem](../.cache/d2b-smoke/detalhe-1440.png) | [Imagem](../.cache/d2b-smoke/detalhe-390.png) | [Imagem](../.cache/d2b-smoke/detalhe-320.png) |
| D1E | [Imagem](../.cache/d2b-smoke/admin-ligacoes-1440.png) | [Imagem](../.cache/d2b-smoke/admin-ligacoes-390.png) | [Imagem](../.cache/d2b-smoke/admin-ligacoes-320.png) |

O mesmo diretório contém capturas de accordion, mapa, EDITOR, Casarão Saraceni, Festa de Bonsucesso e Antigo Poço nas três larguras. Nomes, endereço e região do smoke são fictícios, não fontes documentais para cadastro.

## 10. Integridade e preservações

Fonte canônica `backend/prisma/patrimonioSeedData.js` preservada, SHA-256:

```text
c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8
```

Comparação com o baseline inicial registrada em [integridade.json](../.cache/d2b/integridade.json). As seis migrations consolidadas, a linhagem histórica da equipe e seus arquivos de controle permanecem idênticos. Nenhum seed/importador/sync/fonte canônica foi editado.

O sync canônico foi auditado: seu patch contém somente campos gerenciados pela fonte; região/número/prioridade não são incluídos. Teste com Prisma simulado confirma preservação dos três campos tanto no canônico quanto no registro legado após executar o plano. **Nenhum sync real foi executado.**

Impacto preciso no hash: `sync-patrimonios.js` faz `findMany` dos escalares patrimoniais com relações e incorpora esse estado a `estado_hash`. Após gerar o client com D2, aparecem três chaves adicionais, mesmo NULL; portanto uma fotografia técnica anterior à migration não deve ser reutilizada como aprovação futura. Editar esses metadados também muda o hash. O algoritmo não foi alterado. O importador editorial tem projeção própria de identidade/status/conteúdo e continua intacto; não foi executado nesta etapa.

| Preservação | Evidência |
| --- | --- |
| C3 | Política, rota, endereço e coordenadas com hashes idênticos; regressões e smoke dos quatro modos aprovados. |
| D1D | Componente de relacionados e contrato de ligações preservados; API conserva ordem e slug, sem inversas/inferências/UUIDs visíveis. |
| D1E | Componente/serviço de ligações intactos; suite e fluxo completo de teclado aprovados. Integração D2 não envia arrays editoriais no PATCH patrimonial. |
| Redesign | Estrutura, accordion e seções preservados; acréscimo de metadados. Edição concorrente do CSS registrada separadamente acima. |
| Global/Inicio | Arquivos inalterados, sem nova paleta nem ranking adicional. |
| Descrição | Continua obrigatória, confirmada no schema e no catálogo PostgreSQL descartável. |
| PatrimonioSecao | Não introduzido no schema ou árvore consolidada. |
| Dados da equipe | Nenhuma carga dos 83 fatos/27 ligações nem da taxonomia histórica. |
| Dados iniciais D2 | Nenhuma região/número/ordem preenchido automaticamente. |
| Banco real | **Não acessado**, nem para leitura; sem backup, deploy, seed, sync, import ou DML real. |

## 11. Pendências e encerramento

Pendências impeditivas da implementação: **nenhuma**. A nova migration foi validada apenas em descartável. Restam revisão de código/visual, commit manual, preflight e eventual deploy real em operação separada autorizada. A validação documental/população do catálogo e atribuição de números/prioridades permanecem tarefas editoriais posteriores, sem carga implícita.

Retomada feita a partir do smoke existente; etapas já aprovadas foram confirmadas pelos logs e não refeitas. Lint foi repetido após finalizar o script; build/smoke tiveram código de saída nativo registrado para distinguir avisos stderr de falhas. O relatório não trata a mera existência de arquivos como validação.

D2B CONCLUÍDA

REGIÃO, NÚMERO E ORDEM IMPLEMENTADOS

PRONTO PARA REVISÃO PRÉ-DEPLOY
