# D3A — auditoria e smoke de integração geral

Data: **17/10/2026**, America/Sao_Paulo. **Parecer: CORREÇÕES D3B NECESSÁRIAS antes de D4.** As suítes backend/frontend, lint, build e validação Prisma passaram. O smoke ampliado encontrou overflow nos formulários de conteúdo em 320 px; a leitura do código identificou problemas de teclado/navegação nos destaques da página inicial. Nenhuma correção funcional foi implementada nesta auditoria.

## 1. Estado inicial e escopo

Commit conferido: `b31718b31367b7cc0aa98bec6505f0bf252ceea1`, branch `development/backend`. Conferidos Git, árvore consolidada de sete migrations e relatório final D2C4. O working tree inicialmente continha somente o CSS concorrente de PatrimonioDetalhe e cinco relatórios D2C não versionados. Nenhum reset, stash, descarte, staging, commit ou push foi realizado.

A auditoria produziu somente este relatório versionável e auxiliares/evidências ignorados em `.cache/d3a`. Código, schema, migrations e fontes de conteúdo não foram alterados pelo executor. Docker não foi executado.

Durante a etapa, o usuário alterou novamente o CSS concorrente para `var(--navy)` e confirmou uma alteração manual da conta EDITOR. Ambas foram preservadas; a diferença em `users` é discriminada na seção 7. Não foi tentado restaurar a fotografia antiga.

## 2. Validações executadas

| Verificação | Resultado desta D3A |
| --- | --- |
| Suíte backend completa, `node scripts/run-suite.js` | **418 aprovados**, zero falhas/cancelados/ignorados |
| Backend D2/R1/sync específicos | **29 aprovados**, zero falhas/ignorados; contagem separada, não somada à suíte completa |
| Suíte frontend, `npm test` | **261 aprovados**, 14 arquivos, zero falhas |
| Backend `npm run lint` | Saída 0 |
| Frontend `npm run lint` | Saída 0 |
| Frontend `npm run build` | Saída 0; repetido após a mudança concorrente de cor |
| Prisma validate | Schema válido, saída 0, configuração descartável |
| Prisma migrate status | Sete migrations atualizadas, saída 0, banco descartável |
| Prisma migrate diff | No difference detected, saída 0, banco descartável |
| `git diff --check` | Aprovado |
| Smoke real HTTP somente leitura | **52 GETs aprovados** |
| Smoke D2/C3/D1D/D1E simulado | PASS em 1440/390/320 px |
| Smoke geral simulado | 51 cenários, zero exceções JS; **dois cenários com overflow** |
| Smoke final do accordion após alteração do usuário | PASS em 1440/390/320 px, zero overflow/exceções |

Total das duas suítes completas: **679 testes aprovados**. Não houve remoção de testes nem alteração de expectativas da aplicação nesta etapa. A suíte backend emite mensagens de erro nos casos que deliberadamente simulam falhas; o resultado final é 418/418, não uma falha operacional.

O build mantém o aviso de bundle principal acima de 500 kB: aproximadamente **633,32 kB / 177,68 kB gzip**. Não impede a geração dos artefatos; divisão do bundle não foi implementada.

### Isolamento dos testes com escrita

Foi reutilizada a lógica auditada de `backend/scripts/validate-d2b.js` em um auxiliar local, sem editar o script versionado. A cópia ajustou somente resolução de imports/caminhos, diretório de evidências e remoção de `FORCE` da limpeza dos descartáveis. As conexões de escrita ficaram restritas à manutenção `postgres` para criar/remover bancos exclusivos e aos bancos gerados pelo próprio processo:

- `portal_d2b_replay_3ecd02a2_test`: replay das sete migrations, Prisma validate/status/diff e suíte backend.
- `portal_d2b_upgrade_4ba04715_test`: seis migrations, fixtures sintéticas e upgrade para a sétima, com comparação de integridade.

Ambos foram removidos ao finalizar, sem FORCE e sem atingir bancos preexistentes. Nenhuma migration foi executada no banco real. A suíte recebeu `TEST_DATABASE_URL` exclusivamente descartável, `TEST_DATABASE_EXCLUSIVE=1` e `DATABASE_URL` inicial não conectável. O harness redirecionou a conexão antes de conectar; não usou o banco real como destino de teste.

As fixtures do upgrade são sintéticas, inclusive seus status, e não representam a publicação real do Antigo Poço. O estado real foi conferido separadamente, em READ ONLY.

## 3. Backend, contratos e permissões

| Área | Evidência e alcance |
| --- | --- |
| Health e DTO público | GET real de health, categorias, patrimônios, regiões, exposições e novidades; envelopes aceitos |
| JWT e ADMIN/EDITOR | Suíte de autenticação, senha e gestão de usuários; permissões em testes isolados. GET real rejeita bearer ausente/inválido e aceita ADMIN ativo |
| Cadastro/edição/publicação/arquivamento patrimonial | Testes administrativos, inclusive integração em PostgreSQL descartável; nenhum POST/PATCH patrimonial real |
| Categorias e endereço | Testes de schemas, serviços e Admin; campos postais/coordenadas preservados |
| ViaCEP | Testes frontend de normalização, cache, erros, cancelamento, timeout e preenchimento manual, com transporte simulado. Disponibilidade externa do ViaCEP não certificada |
| Imagens/uploads | Suítes de mídia, infraestrutura e referências: validação binária, limites, permissões, publicação e rollback/compensação em ambientes de teste |
| Referências documentais | Testes backend e frontend e leitura dos detalhes públicos; contrato preservado |
| Exposições e Novidades | Testes de contrato/permissão/upload/publicação com dependências simuladas; GET real público/admin e smoke visual simulado. Não se afirma CRUD real dessas entidades |
| Usuários | Testes de autorização, edição, status, proteção do último ADMIN e autoalteração; UI simulada de lista/edição; GET real administrativo |
| D1B/D1C | Testes unitários/integrados do conteúdo editorial e curadoria; fonte canônica preservada; nenhuma carga real |
| D1D/D1E | 14 relações reais conferidas; simulação de criar/editar/reordenar/excluir por teclado, com UUID preservado e navegação pública por slug |
| D2 | Número positivo único, inclusive arquivados; ordem zero/empates; região opcional/inativa; locks e concorrência; DTOs e filtros; catálogo vazio |
| Auditoria e erros | Testes de atomicidade e tratamento seguro de erros; auditoria real mantém 68 registros |
| OpenAPI | Suíte `docs.test.js` aprovada; contratos e validação de documentação cobertos na suíte backend |

Não foi encontrado rompimento de contrato D1/D2 nas verificações executadas. Escritas reais não foram necessárias para essa conclusão.

## 4. Smoke responsivo com API simulada

Os dois smokes usam a aplicação frontend real servida pelo Vite, API exclusivamente em memória, usuários/credenciais fictícios e Chrome oculto com perfil temporário. Nenhuma mutação desses fluxos alcançou o backend real. Navegador e Vite foram encerrados ao terminar.

A primeira tentativa do smoke D2 no sandbox expirou em `Page.enable`. A repetição autorizada fora do sandbox passou. Esse timeout não é apresentado como resultado aprovado. O smoke complementar e a conferência final de cor também foram executados com a permissão da ferramenta.

### Fluxos D2/C3/D1D/D1E

Executados nas três larguras: catálogo vazio, criação/inativação regional, seleção no patrimônio, número e prioridade zero, omissão de vínculo inativo, limpeza NULL, filtro regional/numérico, detalhe, galeria, referências, accordion com múltiplas seções abertas, foco e teclado, relações por slug, CRUD/reordenação D1E e restrição visual do EDITOR. A ordem recebida da API e os UUIDs das ligações foram preservados.

Cobertos EXATA, APROXIMADA/DEMOLIDO, REFERENCIA e SEM_ROTA. Os dois últimos continuam sem endereço e ações de mapa/rota mesmo com metadados regionais; DEMOLIDO conserva destino histórico por coordenadas. A ficha de Antigo Poço usada nesse smoke é **fixture sintética para C3**, não publicação do registro real.

Resultado: zero overflow global, zero exceções JavaScript, 33 screenshots (11 por largura). Google Maps externo foi bloqueado: validada somente a página e a política local de navegação/rota. **Carregamento do fornecedor Google Maps não foi aprovado nem alegado como testado.** Os logs de tentativas bloqueadas e cancelamentos do StrictMode não são exceções JS não tratadas.

### Fluxos gerais

Em cada largura, 17 cenários: Início; Conheça Mais com exposições/notícias; detalhe de conteúdo; lista e formulário de usuários; lista e formulário de Exposições; lista e formulário de Novidades; estados vazio/erro/carregando de conteúdo e usuários; login e chegada autenticada ao dashboard. Foram usados Tab/Enter para abrir formulários e efetuar login simulado. Os erros HTTP 500 desses cenários foram injetados de propósito e exibidos com recuperação; não são falhas do backend real.

| Largura | Cenários gerais | Overflow global | Exceções JS |
| --- | --- | --- | --- |
| 1440 px | 17 | Nenhum | 0 |
| 390 px | 17 | Nenhum | 0 |
| 320 px | 17 | Formulário de Exposições e formulário de Novidades: **scrollWidth 362 px** | 0 |

49 dos 51 cenários gerais não apresentaram overflow global. A tabela de usuários tem rolagem interna no mobile, sem alargar a página; o botão de edição foi alcançado por teclado. As capturas de início, usuários, detalhe e formulário com falha foram inspecionadas visualmente. A validação não substitui uma auditoria completa WCAG de todo o portal.

Após a troca concorrente para `var(--navy)`, o build foi repetido e o accordion foi verificado novamente nas três larguras: múltiplas seções abertas, teclado, zero overflow e zero exceções. Não se atribuem as capturas anteriores à versão final da cor.

### Capturas e resultados

| Cenário | 1440 px | 390 px | 320 px |
| --- | --- | --- | --- |
| Início | [Imagem](../.cache/d3a/general-smoke/inicio-1440.png) | [Imagem](../.cache/d3a/general-smoke/inicio-390.png) | [Imagem](../.cache/d3a/general-smoke/inicio-320.png) |
| Usuários | [Imagem](../.cache/d3a/general-smoke/usuarios-1440.png) | [Imagem](../.cache/d3a/general-smoke/usuarios-390.png) | [Imagem](../.cache/d3a/general-smoke/usuarios-320.png) |
| Formulário de exposição | [Imagem](../.cache/d3a/general-smoke/exposicoes-admin-form-1440.png) | [Imagem](../.cache/d3a/general-smoke/exposicoes-admin-form-390.png) | [Falha](../.cache/d3a/general-smoke/exposicoes-admin-form-320.png) |
| Formulário de novidade | [Imagem](../.cache/d3a/general-smoke/novidades-admin-form-1440.png) | [Imagem](../.cache/d3a/general-smoke/novidades-admin-form-390.png) | [Falha](../.cache/d3a/general-smoke/novidades-admin-form-320.png) |
| Login | [Imagem](../.cache/d3a/general-smoke/login-1440.png) | [Imagem](../.cache/d3a/general-smoke/login-390.png) | [Imagem](../.cache/d3a/general-smoke/login-320.png) |
| Accordion com cor final | [Imagem](../.cache/d3a/detail-final/detalhe-final-1440.png) | [Imagem](../.cache/d3a/detail-final/detalhe-final-390.png) | [Imagem](../.cache/d3a/detail-final/detalhe-final-320.png) |

Resultados estruturados: [D2/C3/D1D/D1E](../.cache/d3a/smoke/resultado.json), [geral com dimensões e elementos que excedem a tela](../.cache/d3a/general-smoke/resultado.json), [cor final](../.cache/d3a/detail-final/resultado.json). Total: 87 screenshots, sendo 33 + 51 + 3.

## 5. Problemas identificados e proposta D3B

Não há evidência de que estes problemas tenham sido introduzidos pela migration D2. São achados da integração atual; a atribuição de regressão temporal exigiria comparação adicional com versões anteriores.

| ID / prioridade | Evidência, causa provável e correção proposta |
| --- | --- |
| **D3A-01 — bloqueante para aceite responsivo** | Em 320 px, abrir “Novo conteúdo” em `/admin/exposicoes` ou `/admin/novidades` resulta em página de 362 px. `fieldset`, grid, labels e inputs excedem a largura; screenshot mostra campos cortados. `AdminConteudo.jsx` usa fieldset sem redução de largura mínima; `admin.css` usa tracks `1fr` e controles sem limite de largura. Provável interação entre tamanho mínimo intrínseco do fieldset/inputs, especialmente upload, e grid. Proposta: correção CSS restrita ao formulário, verificando `min-width: 0`, tracks `minmax(0, 1fr)` e limites dos controles, sem limpeza global. Repetir formulários completos/edição/uploads nas três larguras. |
| **D3A-02 — bloqueante para aceite de teclado** | Leitura de `frontend/src/pages/Inicio/Inicio.jsx:232`: o destaque é um `<article onClick>` sem link, tabindex ou tratamento de teclado. O único botão interno é “Favoritar”, que impede propagação; ele não substitui a navegação do card. Proposta: tornar a navegação um link nativo, preservando o destino atual e o foco visível, sem aninhar controles interativos. Acrescentar teste de Tab/Enter. Este achado é de inspeção de código, não uma alegação de teste de leitor de tela. |
| **D3A-03 — navegação do carrossel** | Em `Inicio.jsx`, as duas setas usam `onClick={rolarDestaques}` e o mesmo nome acessível “Ver mais destaques”. A função só volta quando recebe literalmente `"prev"`; o evento de clique não é esse valor. Assim a seta esquerda não solicita a direção anterior. Proposta: callbacks explícitos para prev/next e nomes acessíveis distintos; testar deslocamento e retorno ao início/fim. |
| D3A-04 — não bloqueante isoladamente | No smoke da home com patrimônio sem imagem, React avisou sobre `<img src="">`. O normalizador admite ausência de imagem, mas o destaque renderiza `item.imagemPrincipal` incondicionalmente (`Inicio.jsx:240`). Proposta: não renderizar img vazia ou usar apresentação de ausência já compatível com o layout. Não inventar imagem nem alterar contrato. |
| D3A-05 — não bloqueante | Bundle principal de 633 kB. Proposta futura: avaliar divisão por rotas com medição e regressão; não fazer refatoração ampla nesta correção. |

Os quatro primeiros achados não foram corrigidos. D3B deve limitar-se a essas correções revisadas e respectivas verificações. Não há autorização implícita para ampliar funcionalidades, iniciar Docker ou mudar dados editoriais.

## 6. GETs no banco real: resultado separado

Um listener temporário loopback carregou a aplicação backend real, com métodos diferentes de GET recusados e Prisma forçado a `default_transaction_read_only=on`. Identidade efetiva: localhost:5432, `patrimonio_guarulhos`, usuário postgres. Foram aprovados **52 GETs**: health, categorias, exposições, novidades, regiões, lista pública, 33 detalhes publicados, filtros D2 vazios, leitura administrativa e verificações de autenticação.

GET do Antigo Poço retornou 404 no público; consulta somente leitura confirmou RASCUNHO. O catálogo regional retornou vazio. Todos os metadados D2 públicos permaneceram NULL. As 14 ligações públicas coincidiram em UUID/texto/ordem/slug com a evidência anterior.

Autenticação real limitada a leitura: bearer ausente/inválido retornou 401; token efêmero em memória para ADMIN já ativo permitiu GETs administrativos. Não houve login por senha, criação de credencial persistente ou exposição do token. Os testes completos de senha e de permissões com mutações pertencem aos ambientes isolados, não ao banco real.

[Evidência dos GETs reais](../.cache/d3a/smoke-real.json). Contagens publicadas observadas: 33 fichas, zero fatos, 14 ligações, 177 detalhes editoriais e 34 imagens. São subconjuntos públicos, não contagens físicas totais.

## 7. Integridade real e mudanças concorrentes confirmadas

A inspeção inicial READ ONLY passou integralmente contra D2C4. A inspeção final confirmou sete migrations, 36 patrimônios, 34 canônicos, dois legados ARQUIVADO, 33 PUBLICADO e um RASCUNHO, zero fatos, 14 ligações, zero regiões e os três campos D2 NULL nos 36 registros. Descrição NOT NULL, constraints, índices, enums e triggers esperados permanecem.

**Não se declara que todas as tabelas ficaram byte a byte iguais durante a janela.** A tabela `users` manteve dois registros, mas mudou de hash. O usuário esclareceu: **“eu alterei o var navy e altere o email de editor como ativo”**. Essa confirmação documenta uma edição manual da conta EDITOR e do CSS; não se presume, sem fotografia anterior de campos, uma reconstrução exata de quais colunas de usuário foram alteradas.

Os acessos reais executados pela auditoria foram READ ONLY/GET; não houve DML real por estes auxiliares. A mudança de usuário não foi revertida nem incorporada silenciosamente ao baseline. O resultado de divergência foi preservado nos JSONs. Não foram expostos conteúdos ou hashes individuais de credenciais.

Das 16 tabelas anteriores de domínio, **15 mantêm contagens/hashes idênticos**; a exceção explicada é `users`. Os registros antigos de migrations permanecem idênticos, e a sétima migration conserva checksum/estado aprovado. O catálogo regional permanece vazio. A comparação de Patrimonio exclui explicitamente as três colunas D2 do hash anterior e verifica separadamente que estão NULL.

A primeira inspeção final interrompeu a comparação no hash de users. Uma leitura complementar manteve esse resultado como **DIVERGENCES**, sem aceitá-lo como PASS, e concluiu as demais verificações. O campo resumido `originalTablesPreserved: 17` emitido pelo auxiliar reaproveitado indica a quantidade de fingerprints calculados; **não deve ser interpretado como 17 hashes iguais**: os checks individuais e esta seção registram a exceção users.

Arquivos preexistentes: a única diferença em relação à fotografia inicial da D3A é o CSS concorrente confirmado pelo usuário. Nenhum outro arquivo preexistente mudou. Fonte canônica preservada:

```text
c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8
```

C3, D1D, D1E e D2 permanecem preservados nos testes, contratos e dados patrimoniais. O Antigo Poço não foi publicado; os dois legados não foram reativados. Nenhum catálogo histórico foi importado. Backups e evidências operacionais anteriores não foram removidos ou modificados.

## 8. Evidências e parecer

- [Baseline de arquivos](../.cache/d3a/baseline.json) e [comparação de integridade](../.cache/d3a/integrity.json).
- [Inspeção real inicial](../.cache/d3a/postflight.json), [divergência detectada](../.cache/d3a/final-postflight.json) e [inspeção final completa](../.cache/d3a/final-full.json).
- [Backend completo](../.cache/d3a/backend.log), [frontend completo](../.cache/d3a/frontend.log), [lint backend](../.cache/d3a/backend-lint.log), [lint frontend](../.cache/d3a/frontend-lint.log) e [build final](../.cache/d3a/build.log).
- [Replay, upgrade, Prisma e resultados PostgreSQL descartável](../.cache/d3a/postgres/65a8272b-fee9-4ca5-b9d9-913788336550/validation.json).
- Smokes e capturas referenciados na seção 4; auxiliares reproduzíveis locais em `.cache/d3a`, sem inclusão no Git.

**NO-GO para avançar diretamente a D4; recomendação: D3B com correções delimitadas.** As suítes aprovadas não eliminam os problemas visuais/acessíveis encontrados no smoke e na inspeção. Depois das correções, repetir os cenários afetados, suíte frontend, lint/build e diff-check, preservando os contratos/dados já aprovados. Não é necessário refazer a migration ou preencher o catálogo regional.

Não foi produzida nova funcionalidade. Nenhum teste com escrita apontou para o banco real. Não houve Docker, commit ou push. “Banco real preservado” neste encerramento significa ausência de escrita pela auditoria e preservação dos dados patrimoniais; a edição manual de usuário confirmada acima é uma exceção explícita à igualdade da fotografia global.

D3A — AUDITORIA DE INTEGRAÇÃO CONCLUÍDA

BANCO REAL PRESERVADO PELA AUDITORIA; ALTERAÇÃO MANUAL DE USUÁRIO REGISTRADA

CORREÇÕES D3B NECESSÁRIAS
