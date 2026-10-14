# D1A — auditoria e integração seletiva

Base oficial: backend atual pós-C2/C3. Referência secundária: ZIP da equipe, consultado sem executar seus scripts. Estado inicial registrado em `.cache/d1a/baseline.json` antes das alterações. Fonte canônica: `prisma/patrimonioSeedData.js`.

## Matriz anterior à implementação

| Funcionalidade | Atual | Equipe | Adaptação proposta | Risco |
| --- | --- | --- | --- | --- |
| Busca | Textos principais; categoria filtrada pelo nome | Nome/slug no filtro; pesquisa em secoes | Incluir nome/slug da categoria principal/adicional e títulos/textos de detalhes; conservar paginação/status | Baixo; consultas maiores |
| Imagem real | MIME declarado; JPEG/PNG/WebP/GIF, 10 MB, campo imagem | Assinatura JPEG/PNG/WebP; campo arquivo, sem GIF | Inspecionar bytes antes da gravação, mantendo tipos, campo, pastas e limite atuais | Fixtures antigas precisam de bytes válidos |
| Exclusão de mídia | Exclui registro, depois arquivo; referências têm lock do patrimônio | Quarentena, restauração no rollback e limpeza pós-commit | Usar caminhos seguros atuais, quarentena privada e restauração também em falha do commit | Disco e banco não são atomicamente transacionais; registrar pendências de recuperação |
| Metadados | POST/DELETE de imagens e referências | PATCH de imagens/documentos | Adicionar PATCH nas URLs atuais, sem mudar POST/DELETE ou trocar referencias por documentos | Preservar regras diferentes para imagem/referência |
| Hash de estado | Dry-run read-only; apply recalcula sob lock, sem comparar aprovação anterior | Fingerprint para reconciliação manual | Hash do estado/fonte no sync; opção de hash esperado que rejeita estado desatualizado antes de escrever | Ordenação precisa ser determinística; hash não deve fixar catálogo antigo |
| Dashboard | Frontend agrega a listagem admin; sem endpoint agregado | Fotografia RepeatableRead, incluindo regiões | Endpoint admin aditivo com total/status/categoria/bairro na mesma fotografia; manter listagens e frontend atuais | Não incluir regiões, não expor rascunhos publicamente |

## Permissões auditadas antes da implementação

| Operação | Backend atual | Equipe | Decisão D1A |
| --- | --- | --- | --- |
| Criar imagem | ADMIN/EDITOR em qualquer status | EDITOR somente RASCUNHO | Preservar atual |
| Excluir imagem | Somente ADMIN | ADMIN e EDITOR em RASCUNHO | Preservar ADMIN |
| Criar referência | ADMIN; EDITOR somente RASCUNHO | Documentos: ADMIN; EDITOR somente RASCUNHO | Preservar atual, inclusive LINK |
| Excluir referência | Somente ADMIN | ADMIN e EDITOR em RASCUNHO | Preservar ADMIN |
| PATCH novo | Ausente | EDITOR somente RASCUNHO | Aplicar regra atual de edição/criação do respectivo recurso; imagem ADMIN/EDITOR, referência EDITOR somente RASCUNHO |

Não se adota a política uniforme da equipe. Mudá-la exigiria decisão posterior. Não se copiam schema, migrations, catálogo, seed, fatos, ligações, regiões, seções, números ou ordem de exibição. Nada desta etapa executa seed, sync ou import no banco real.

## Resultado implementado

- Busca pública/admin: nome e slug das categorias principal/adicionais e título/texto de `PatrimonioDetalhe`. Filtros continuam combinados com busca, status e paginação; respostas atuais preservadas.
- Upload: assinatura JPEG, PNG, WebP e GIF deve corresponder ao MIME declarado antes de gravar. Preservados multipart `imagem`, URLs, pastas e limite de 10 MB. A inspeção de assinatura não equivale à decodificação integral da imagem.
- Exclusão de imagem/referência: arquivo gerenciado e não compartilhado vai para quarentena privada; falhas na exclusão ou no commit restauram os bytes. A limpeza definitiva ocorre após o commit. URLs externas não são removidas; arquivos compartilhados continuam disponíveis. Se a recuperação ou limpeza falhar no filesystem, o erro é registrado e a cópia privada é preservada para recuperação, sem sobrescrever um arquivo concorrente.
- Metadados: adicionados `PATCH /api/admin/patrimonios/imagens/:imagemId` e `PATCH /api/admin/patrimonios/:id/referencias/:referenciaId`. Validam campos, limites e vínculo; não permitem trocar URL, tipo ou proprietário. A troca da imagem principal usa lock do patrimônio e transação. Referências continuam `ARQUIVO`/`LINK` com o DTO atual.
- Sync canônico: relatório passa a incluir `estado_hash`; aceita `--expected-state-hash=<SHA-256>` somente no modo `--sync-patrimonios`. Compara banco, fonte, relações e imagens antes de qualquer mutação. Divergência produz conflito `ESTADO_DESATUALIZADO` e zero aplicações. O dry-run continua em transação `READ ONLY`.
- Dashboard: adicionado `GET /api/admin/dashboard`, ADMIN/EDITOR, com total, status, categoria principal e bairro em uma transação `RepeatableRead`, somente leitura. `meta.baseContagem = TODOS_OS_STATUS` explicita o universo; `PUBLICADO` e `meta.publicados` distinguem publicados. Os endpoints e a agregação já usados pelo frontend permanecem disponíveis; o frontend não foi alterado para consumir o endpoint novo.

### Uso posterior do hash

Guardar o `estado_hash` do dry-run revisado e passá-lo como `--expected-state-hash` ao apply autorizado. Se houver divergência, gerar e revisar outro dry-run. O argumento é opcional para preservar compatibilidade da CLI: sem ele, continua existindo o recálculo sob locks, mas não há comparação com a aprovação anterior. Não houve execução operacional de sync/import nesta D1A; testes de sync usaram Prisma simulado.

## Contratos e permissões preservados

Mantidos `/categorias`, `/referencias`, Novidades, Exposições, gestão de usuários, uploads atuais, `PatrimonioDetalhe`, slugs/UUIDs e limpeza de coordenadas por `null/null`. A documentação OpenAPI cobre os endpoints novos e a busca ampliada. Não foi substituído `/referencias` por `/documentos`, nem adotado multipart `arquivo` para imagens.

ADMIN/EDITOR continuam criando imagens em qualquer status; somente ADMIN exclui imagens e referências. Para referências, EDITOR continua limitado a RASCUNHO. PATCH segue a mesma política do respectivo recurso, conforme a matriz acima.

## Arquivos desta D1A

Lista relativa a `backend/`, comparada com o working tree inicial, não com HEAD. As alterações anteriores de C2/C3 foram preservadas.

| Grupo | Arquivos |
| --- | --- |
| Busca | `src/services/patrimonioService.js` |
| Imagens | `src/middlewares/uploadImage.js`, `src/utils/imagemBinaria.js` (novo), `src/utils/quarentenaUpload.js` (novo), `src/schemas/imagemSchema.js` (novo), `src/services/imageService.js`, `src/controllers/adminImageController.js`, `src/routes/adminImageRoute.js` |
| Referências | `src/schemas/referenciaSchema.js`, `src/services/referenciaService.js`, `src/controllers/adminReferenciaController.js`, `src/routes/adminReferenciaRoute.js` |
| Hash | `src/utils/estadoHash.js` (novo), `prisma/import-patrimonios.js`, `prisma/sync-patrimonios.js` |
| Dashboard/rotas | `src/services/dashboardService.js` (novo), `src/routes/dashboardRoute.js` (novo), `src/routes/index.js` |
| Documentação | `src/docs/paths.js`, `reports/D1A-integracao-seletiva.md` (novo) |
| Testes novos | `test/d1aMidia.test.js`, `test/d1a.integration.test.js`, `test/dashboard.test.js` |
| Testes adaptados | `test/adminPatrimonio.test.js`, `test/docs.test.js`, `test/patrimonio.test.js`, `test/syncPatrimonios.test.js`, `test/uploadInfra.test.js` |
| Lint | `eslint.config.js` (novo), `package.json`, `package-lock.json` |

Total: 20 arquivos existentes alterados e 11 novos. ESLint e suas dependências são de desenvolvimento; não foi executado `audit fix`. Evidências temporárias em `.cache/d1a` estão ignoradas pelo Git.

## Validação final

| Verificação | Resultado |
| --- | --- |
| Testes específicos D1A e regressões relacionadas (8 arquivos) | 102 aprovados, 0 falhas, 0 ignorados |
| Suíte backend completa, após ajustar expectativas antigas de busca | 232 aprovados, 0 falhas, 0 ignorados |
| `npm run lint` | Aprovado |
| `npm run prisma:validate` | Schema válido; sem conexão ao banco |
| `git diff --check` | Aprovado |
| Comparação de hashes com o estado inicial | Nenhuma alteração no frontend/C3, fonte canônica, schema ou migrations |

Cobertura: busca por categoria/detalhes e interseção de filtros; tipos válidos e MIME forjado; limite de upload; permissões por status; metadata PATCH, vínculo e principal; LINK; rollback de exclusão e commit; falhas e colisões no filesystem; URL compartilhada; hash desatualizado; fotografia do dashboard durante escrita concorrente; rotas atuais e `null/null`.

Integrações PostgreSQL executadas exclusivamente em `portal_d1a_c895542655_test`, criado para esta etapa e removido após a validação. As cinco migrations já existentes foram aplicadas somente nesse banco descartável para montar a estrutura de testes. Nenhuma migration foi criada ou alterada; nenhuma foi executada no banco real. Logs completos da suíte em `.cache/d1a/backend-suite.log`.

SHA-256 de `prisma/patrimonioSeedData.js`, idêntico antes/depois:

`c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8`

## Exclusões e encerramento

Catálogo, seed e migrations da equipe rejeitados nesta etapa. `PatrimonioSecao`, `PatrimonioFato`, `PatrimonioLigacao`, `RegiaoPatrimonio`, `numeroExibicao`, `ordemExibicao`, 83 fatos e 27 ligações ficaram fora da implementação. Não houve recriação de patrimônio legado nem mudança nos dados C2/política C3. D1B não iniciada.

Migrations novas/alteradas: nenhuma. Banco real `patrimonio_guarulhos`: não acessado. Nenhum seed, sync apply, import apply, migration, db push ou reset foi executado nele.

D1A CONCLUÍDA.
