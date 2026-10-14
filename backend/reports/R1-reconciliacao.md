# R1 — reconciliação pós-merge

Base auditada: working tree inicialmente limpo em `cfca90560efff37a1ab8ce098dd16a0b7933df31`, merge de `3980b24` (C2/C3/D1A/D1B) com `72197f5` (integração da equipe). A R1 preservou as decisões aprovadas; não iniciou D1C. O banco real **não foi acessado**.

## Decisões confirmadas pelo usuário

1. As duas migrations da equipe já foram aplicadas em ambiente compartilhado: seguir **opção B**, preservando histórico aplicado.
2. Adiar região, numeração/ordem de exibição e seções; manter `PatrimonioDetalhe` e `descricao` obrigatória.

## Auditoria do histórico e arquivos da equipe

O Git identificou **101 caminhos adicionados ou modificados** entre `3980b24` e o merge `cfca905`. Isso identifica contribuição/diferença do merge, não autoria exclusiva de todo o conteúdo. A lista completa está em [R1-inventario-equipe.md](R1-inventario-equipe.md).

- `20261005230000_add_pesquisa_patrimonios` nasceu em `04b3546c270cc55c1fab837854726979dc193850`.
- `20261013180000_add_regiao_patrimonio` nasceu em `ad92bc2d7bc440e298d0d7e408ec4e0deda960fb`.
- A integração passou por `62d3795`, `7880f38`, `72197f5` e chegou a `cfca905`.
- A documentação de integração/população comprovava somente validação em bancos descartáveis; não comprovava implantação compartilhada. A confirmação de implantação veio **do usuário nesta R1**. Nenhum ambiente compartilhado foi consultado para completar essa evidência.

## Conflitos reais e correções

| Conflito encontrado | Reconciliação |
| --- | --- |
| Modelos `PatrimonioFato`/`PatrimonioLigacao` e relações de `Patrimonio` duplicados | Uma definição por modelo/relação, conforme D1B |
| Import/montagem de dashboard duplicados | Um import e uma montagem; endpoint D1A preservado |
| Marcadores Git e sobreposição de contratos em `schemas.js` | Reconciliação semântica: contratos C2/D1A/D1B e schemas compatíveis de mídia; sem escolhas automáticas globais de ours/theirs |
| `fatos`/`ligacoes` duplicados nos selects/includes | Um conjunto por consulta; filtro público D1B não é sobrescrito |
| PATCH geral recriava arrays editoriais | Schemas estritos rejeitam os arrays; serviço também recusa fatos/ligações antes da transação. IDs/reordenação continuam no CRUD editorial dedicado |
| Campos e recursos adiados ativados no schema/DTO/CRUD | Retirados do contrato operacional por decisão expressa; referências e histórico preservados |
| Middleware de upload usava `pastaArquivo` não definida | Destino definido por contrato multipart; campo `imagem` continua funcionando |
| Upload da equipe restringia também a criação de imagem legada | Restaurado ADMIN/EDITOR em qualquer status para imagens, inclusive caminho alternativo |
| DELETE alternativo de mídia aceitava EDITOR em rascunho | Rotas e serviços exigem ADMIN, evitando contornar a D1A |
| PATCH alternativo de documento permitia trocar `tipo` | `tipo` imutável também nesse caminho; LINK/ARQUIVO não podem ser convertidos pelo PATCH |
| Exclusão alternativa ignorava URL compartilhada | Consulta compartilhamento antes da quarentena; bytes usados por outra relação permanecem |
| `package.json` perdeu lint/dependências de desenvolvimento | Restaurados; lock final preservado, sem atualização de versões ou audit fix |
| Documentos da equipe apresentavam catálogo/regiões como fluxo atual | Avisos explícitos de referência histórica e precedência deste relatório/OpenAPI reconciliado |

## Schema e contratos finais

- `PatrimonioFato`: UUID, pai UUID, `rotulo VARCHAR(200)`, `valor TEXT`, `ordem INTEGER`; ordem não negativa e única por patrimônio; rótulo/valor não vazios; valor com no máximo 10.000 caracteres.
- `PatrimonioLigacao`: UUID, origem/destino UUID, `texto VARCHAR(2000)`, `ordem INTEGER`; texto não vazio, ordem não negativa e única por origem; par origem/destino único; autorrelação proibida; FKs e índice de destino preservados.
- Checks que Prisma não representa continuam no SQL D1B; validação HTTP acompanha os limites. O CRUD editorial mantém locks e reordenação transacional, sem recriar IDs.
- Público: ligações somente para destinos `PUBLICADO`, excluindo legados consolidados. Admin mantém status necessários à edição. Os testes D1B validam essas diferenças.
- `descricao` obrigatória. Endereço continua separado em `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep`, `latitude`, `longitude`; PATCH `null/null` preservado.
- Permanecem referências ARQUIVO/LINK, Novidades, Exposições, usuários, busca ampliada, dashboard D1A, uploads, hash de estado e sync canônico. Nenhum contrato do frontend foi alterado.

## Recursos da equipe: classificação explícita

| Recurso | Classificação | Decisão R1 |
| --- | --- | --- |
| Proteção de mídias por publicação/usuário, inclusive URLs legadas | PODE SER MANTIDO AGORA | Mantida; sem fallback estático para mídia patrimonial privada |
| Caminhos alternativos de imagens/documentos | PODE SER MANTIDO AGORA | Mantidos com permissões e imutabilidade compatíveis com D1A |
| Validação de arquivos, datas civis e limpeza de uploads | PODE SER MANTIDO AGORA | Mantida e testada |
| `RegiaoPatrimonio` | ADIAR | Sem enum/campo/DTO ativo; histórico SQL e referência territorial da equipe preservados |
| `numeroExibicao` e `ordemExibicao` | ADIAR | Sem escrita, exposição ou ordenação por esses campos; ordenação atual nome/id preservada |
| `PatrimonioSecao` | CONFLITA COM MODELO ATUAL / ADIAR | Não substitui nem duplica `PatrimonioDetalhe`; nenhuma conversão de seções |
| `descricao nullable` | CONFLITA COM MODELO ATUAL | Obrigatoriedade aprovada restaurada; valores NULL de outro ambiente impedem upgrade, sem texto inventado |
| Catálogo, seed/reconciliação e conteúdo factual da equipe | ADIAR | Referência secundária, sem importação; D1C não iniciada |
| Dados incompatíveis em ambiente compartilhado | EXIGE DECISÃO | Preflight próprio; nunca truncar ou preencher silenciosamente |

As estruturas físicas já implantadas na equipe permanecem naquela trilha, sem DROP. Adiamento significa não ativá-las no modelo/contrato deste projeto, não apagar história ou conteúdo de outro ambiente.

## Migrations — opções e estratégia adotada

**Opção A, não adotada:** se as migrations da equipe nunca tivessem sido implantadas, seria possível organizar uma única árvore limpa antes do primeiro deploy. A confirmação do usuário exclui essa premissa; não foi apagado nem reescrito o SQL aplicado.

**Opção B, adotada:** duas linhagens explícitas, pois os ambientes têm históricos diferentes:

| Ambiente/trilha | Configuração | Histórico preparado |
| --- | --- | --- |
| Projeto atual, com cinco migrations conhecidas | `prisma.config.js`, `prisma/migrations` | Cinco anteriores + D1B original, 6 migrations |
| Equipe, com migrations de pesquisa/região aplicadas | `prisma.equipe.config.js`, `prisma/lineages/equipe/migrations` | Sete migrations históricas preservadas + correção forward-only, 8 migrations |

As duas migrations da equipe foram **realocadas**, sem mudar seus bytes, para a trilha explícita da equipe. As cinco comuns foram copiadas integralmente para essa trilha. A D1B de criação permanece intacta na trilha do projeto e não é inserida na trilha que já criou as mesmas tabelas. Assim nenhuma trilha executa dois CREATEs das tabelas editoriais.

A nova `20261014120000_reconcile_d1b_forward` altera tipos/checks de tabelas já existentes e restabelece `descricao NOT NULL`, dentro de transação. Preserva IDs, dados e estruturas adiadas. Conteúdo fora do contrato aborta antes das alterações; exige revisão documental, sem truncamento. Não modifica `_prisma_migrations` manualmente e não usa resolve/reset.

**Não intercambiar configurações.** O ambiente real deste projeto continua sem deploy nesta etapa. Um ambiente compartilhado da equipe exige seu próprio preflight de histórico completo, checksums e dados; a confirmação de que duas migrations foram aplicadas não comprova toda a linhagem. O schema da aplicação não autoriza gerar DROP para estruturas históricas extras da equipe. Instruções em [prisma/lineages/README.md](../prisma/lineages/README.md).

## Validação executada

| Verificação | Resultado |
| --- | --- |
| Específicos D1A/D1B/sync/dashboard/R1 | 61 aprovados; zero falhas, ignorados ou cancelados |
| Suíte backend ativa completa | 384 aprovados; zero falhas, ignorados ou cancelados |
| Prisma validate | Aprovado, sem conexão ao banco real |
| ESLint | Aprovado |
| Sintaxe JS | 187 arquivos aprovados com `node --check` |
| Marcadores Git | Nenhum encontrado no código/documentação versionável |
| `git diff --check` | Aprovado |
| Fonte canônica, frontend C3, import e sync | Hashes iguais ao baseline anterior à R1 |
| SQL das oito migrations recebidas | Bytes preservados, inclusive as duas realocadas e a D1B original |

Três bancos descartáveis, criados e removidos pelo harness:

- `portal_r1_replay_22d81081_test`: replay completo das seis migrations; fatos/ligações vazios.
- `portal_r1_upgrade_7d843024_test`: exatamente as cinco migrations anteriores via Prisma; fixtures inseridas; upgrade D1B; igualdade integral das linhas de patrimônio, detalhes, local, usuários e categoria; fatos/ligações vazios.
- `portal_r1_equipe_c6bd5817_test`: sete migrations históricas; conteúdo de teste incompatível aborta sem truncar; conteúdo compatível recebe a correção forward-only pelo Prisma; IDs e linhas preservados.

O replay não carregou catálogo ou fatos da equipe. Fixtures sintéticas são apenas testes. Os testes existentes de sync/import executam seus cenários exclusivamente no banco descartável ou em Prisma simulado; nenhum comando operacional de import/sync foi executado no banco real.

Três testes do contrato adiado foram preservados integralmente em `test/deferred/*.reference`, fora da suíte ativa: carga do catálogo (unitário e integração) e dashboard regional. Não são contabilizados como aprovados. Os testes ativos de dashboard/patrimônio/docs foram reconciliados com os contratos aprovados; a D1A continua testando a fotografia concorrente do dashboard. Testes de mídia foram ajustados à política D1A, mantendo cobertura de permissões, rollback, publicação, arquivos compartilhados e metadados.

Evidências: `.cache/r1/baseline.json`, `validation.json`, `specific-tests.log`, `backend-suite.log`, logs de replay/upgrade e `final-checks.json`. Os artefatos estão ignorados pelo Git. O script reproduzível é [scripts/validate-r1.js](../scripts/validate-r1.js).

## Arquivos modificados pela R1

A lista abaixo compara com o working tree inicial, preservando as alterações anteriores. Os novos arquivos de trilhas, documentação, testes e harness aparecem como adições; migrations e testes realocados estão descritos acima.

- `M backend/.gitignore`
- `M backend/docs/classificacao-territorial.md`
- `M backend/docs/dashboard.md`
- `M backend/docs/database.md`
- `M backend/docs/midias-arquivos.md`
- `M backend/docs/patrimonio.admin.md`
- `M backend/docs/patrimonios-admin.md`
- `M backend/docs/populacao-patrimonios.md`
- `M backend/package-lock.json`
- `M backend/package.json`
- `D backend/prisma/migrations/20261005230000_add_pesquisa_patrimonios/migration.sql`
- `D backend/prisma/migrations/20261013180000_add_regiao_patrimonio/migration.sql`
- `M backend/prisma/schema.prisma`
- `M backend/src/docs/paths.js`
- `M backend/src/docs/schemas.js`
- `M backend/src/middlewares/uploadImage.js`
- `M backend/src/routes/adminPatrimonioRoute.js`
- `M backend/src/routes/index.js`
- `M backend/src/schemas/midiaSchema.js`
- `M backend/src/schemas/patrimonioSchema.js`
- `M backend/src/services/midiaService.js`
- `M backend/src/services/patrimonioService.js`
- `M backend/test/adminPatrimonio.integration.test.js`
- `M backend/test/adminPatrimonio.test.js`
- `D backend/test/dashboard.integration.test.js`
- `M backend/test/dashboard.test.js`
- `M backend/test/docs.test.js`
- `M backend/test/midia.integration.test.js`
- `M backend/test/midiaArquivos.test.js`
- `M backend/test/midiaSchema.test.js`
- `M backend/test/patrimonio.test.js`
- `D backend/test/seed.patrimonios.integration.test.js`
- `D backend/test/seed.patrimonios.test.js`
- `M backend/test/uploadInfra.test.js`
- `?? backend/prisma.equipe.config.js`
- `?? backend/prisma/lineages/`
- `?? backend/reports/R1-inventario-equipe.md`
- `?? backend/reports/R1-reconciliacao.md`
- `?? backend/scripts/validate-r1.js`
- `?? backend/src/docs/pathsMidia.js`
- `?? backend/test/deferred/`
- `?? backend/test/r1.test.js`

## Fonte canônica e encerramento

`prisma/patrimonioSeedData.js` continua canônico e byte a byte inalterado:

`c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8`

Não houve carga do catálogo secundário, alteração de C2/C3, execução de D1C, deploy real, seed ou escrita no banco real. Não foi feito backup do banco real, pois ele não foi acessado e não houve intenção de aplicar nele nesta R1.

Pendência operacional: novo preflight D1B somente leitura no projeto antes de qualquer autorização de deploy. Para ambientes da equipe, preflight independente e decisão sobre eventual conteúdo incompatível. Recursos adiados continuam pendentes de integração seletiva futura.

**Banco real = não acessado.**

**R1 CONCLUÍDA.**

**PRONTA PARA NOVO PREFLIGHT D1B.**
