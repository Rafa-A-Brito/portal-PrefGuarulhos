# D1E — gestão administrativa de ligações editoriais

Base: commit `168abd59b7aa1f1131a6d11b3e6625c158d48a8f`. Working tree inicialmente limpo. Implementação restrita ao frontend, testes, smoke e este relatório. Banco real **não acessado**.

## Resultado

O formulário de edição de um patrimônio existente apresenta a seção **Patrimônios relacionados**, com nome/status dos destinos e texto editorial. A seção fica após o formulário patrimonial, com formulários independentes, sem formulários HTML aninhados. Cada ação salva somente a ligação; não exige salvar os outros campos da ficha.

Busca explícita pelo endpoint administrativo existente, paginada em lotes de 20, com seleção por radio nativo. Os resultados mostram nome, status e slug para desambiguação. São omitidos o próprio patrimônio, destinos já relacionados, arquivados e as duas identidades consolidadas, reconhecidas por UUID ou slug. O backend continua validando identidade e permissão.

Criações não enviam ordem: o backend acrescenta ao final. Edições enviam somente texto ao UUID existente e mantêm o destino salvo. Exclusões exigem confirmação na própria seção, permitem cancelamento e removem somente a ligação. A lista é atualizada pela resposta da operação, sem recarregar o aplicativo nem descartar campos patrimoniais em edição.

Os controles **Mover para cima/baixo** preparam uma ordem local. Somente **Salvar ordem** envia a lista completa de UUIDs ao endpoint dedicado; **Cancelar ordem** restaura a sequência anterior. Edição/criação/exclusão ficam bloqueadas enquanto houver uma ordem pendente. Operações em andamento bloqueiam as ações concorrentes da ficha. Não há substituição de arrays no PATCH geral, recriação de registros para editar texto, relações inferidas nem criação de inversas.

## Arquivos

| Situação | Caminho relativo a frontend/ | Finalidade |
| --- | --- | --- |
| Alterado | `src/features/admin/pages/AdminPatrimonios.jsx` | Integra a seção em registros existentes, repassa status/perfil e coordena operações em andamento |
| Criado | `src/features/admin/components/AdminLigacoes.jsx` | Lista, busca, seleção, CRUD, confirmação, reordenação e estados |
| Criado | `src/features/admin/components/AdminLigacoes.css` | Estilos isolados, responsividade, foco e controles acessíveis |
| Criado | `src/services/ligacoesApi.js` | Consome o contrato D1B sem alterar os serviços patrimoniais gerais |
| Alterado | `test/AdminPatrimonios.test.jsx` | Fixture de leitura e regressão integrada da edição independente |
| Criado | `test/AdminLigacoes.test.jsx` | Componente e contrato HTTP usando adapter simulado |
| Criado | `scripts/smoke-admin-ligacoes.mjs` | Página real com API em memória e interação pelo teclado |
| Criado | `reports/D1E-ligacoes-admin.md` | Este relatório |

## Endpoints consumidos

Todos usam a instância Axios/autenticação existentes, sob `/api`.

| Método | Caminho | Corpo/parâmetros |
| --- | --- | --- |
| GET | `/admin/patrimonios/:id/ligacoes` | Lista ordenada pelo backend |
| GET | `/admin/patrimonios` | `busca`, `pagina`, `limite: 20` |
| POST | `/admin/patrimonios/:id/ligacoes` | `{ patrimonioDestinoId, texto }` |
| PATCH | `/admin/patrimonios/:id/ligacoes/:ligacaoId` | `{ texto }` |
| DELETE | `/admin/patrimonios/:id/ligacoes/:ligacaoId` | Sem corpo |
| PATCH | `/admin/patrimonios/:id/ligacoes/ordem` | `{ ids: [...] }`, todos os UUIDs atuais na sequência desejada |

DTO da ligação: `id`, `patrimonioDestinoId`, `texto`, `ordem`, `destino: { id, nome, slug, status }`. UUIDs são usados somente como identidades internas/requisições, sem exibição como informação principal. Nenhum endpoint de fatos é consumido.

## Permissões e erros

- **ADMIN:** ações disponíveis em qualquer status da origem.
- **EDITOR:** ações disponíveis somente para origem `RASCUNHO`; o bloqueio já existente da página para edição de publicados foi preservado.
- A representação no frontend é orientação de UX. O servidor autoriza novamente cada operação e permanece a fonte de verdade, inclusive quando o status muda depois de abrir a ficha.
- **401:** mensagem de sessão expirada; preservado o interceptor existente que limpa a sessão e encaminha ao login quando aplicável.
- **403:** mensagem de permissão, regra de rascunho para EDITOR e orientação para reabrir a ficha.
- **404:** informa indisponibilidade do patrimônio/ligação e orienta atualizar ou reabrir.
- **409:** explica possíveis duplicidades, identidade consolidada e mudança de ordem, além da proibição de autorrelações. O backend atual pode usar a mesma mensagem para colisão de ordem/destino; a UI não tenta adivinhar uma causa única.
- **400:** orienta revisar destino e texto; contempla autorrelação, que o serviço atual rejeita com 400.
- Erros de rede/servidor usam mensagem genérica. Não são renderizadas mensagens internas nem stack traces.

Após 401/403/404/409 em uma mutação, novas escritas ficam bloqueadas até atualização explícita. **Atualizar ligações** descarta a edição/ordem local e lê novamente o servidor. Não há repetição automática de escrita. Falha inicial de leitura não é apresentada como uma lista vazia. Carregamento, busca, vazio, erro e sucesso têm estados próprios. Requisições de leitura anteriores são canceladas ao trocar de busca/ficha.

## Acessibilidade e layout

Seção nomeada por heading, lista semântica, labels, fieldsets/legends e controles nativos. Textos editoriais são renderizados como texto React. Links/UUIDs internos não viram HTML executável. Botões possuem altura mínima de 44 px e os controles da seção têm contorno de foco visível de 3 px. A edição direciona o foco ao texto; a exclusão concluída retorna o foco ao título da seção. Erros usam `role=alert`, mensagens de estado usam `role=status`.

Controles quebram em linhas nas telas menores. Estilos usam o navy do painel e fundos claros, sem alteração do CSS dos outros blocos. As capturas desktop e 320 px foram inspecionadas visualmente. A verificação não equivale a uma auditoria completa de acessibilidade de todo o portal.

## Validação

Comandos executados na pasta `frontend`, exceto `git diff --check`:

| Verificação | Resultado final |
| --- | --- |
| `npm test -- test/AdminLigacoes.test.jsx test/AdminPatrimonios.test.jsx` | **86 aprovados**, 2 arquivos |
| `npm test` | **242 aprovados**, 12 arquivos |
| `npm run lint` | Aprovado |
| `npm run build` | Aprovado |
| `git diff --check` | Aprovado |
| `node scripts/smoke-admin-ligacoes.mjs` | Aprovado em **1440, 390 e 320 px** |

O build conserva o aviso de bundle acima de 500 kB: principal aproximadamente 621 kB, 175 kB gzip. Não houve erro de build; divisão do bundle não faz parte desta etapa.

Testes cobrem listagem/status/texto, vazio, criação sem ordem explícita, edição pelo mesmo UUID, confirmação/cancelamento/exclusão, reordenação explícita e cancelamento, filtros de self/duplicados/legados/arquivados, paginação, ADMIN em publicado/arquivado, EDITOR em rascunho e bloqueado em publicado/arquivado, erros 400/401/403/404/409/500, recuperação por atualização, limite de texto e renderização textual segura.

O teste integrado confirma que editar uma ligação mantém campos patrimoniais ainda não salvos, endereço e imagem, sem geocodificação, sem PATCH patrimonial e sem form aninhado. A suíte completa inclui as regressões anteriores de imagens, referências, endereço, categorias, usuários, detalhe público D1D e localização/rota C3.

## Smoke

Página administrativa real e API simulada em memória no próprio Vite. Sessão ADMIN fictícia; nenhuma credencial real. O script força a API local simulada e bloqueia as URLs do Google Maps. O hook existente ainda registra tentativas bloqueadas de carregar o script externo; isso não interferiu no fluxo. Cancelamentos de leitura do StrictMode também podem aparecer no console de desenvolvimento. **Zero exceções JavaScript** no resultado final.

Em cada largura, o fluxo usa Tab/Enter/Espaço para abrir o patrimônio, buscar/selecionar destino, adicionar, editar, mover, salvar ordem e confirmar exclusão. Conferidas quatro mutações exclusivamente editoriais na API em memória (POST, PATCH texto, PATCH ordem, DELETE), UUID preservado, ausência de escrita ao apenas mover/abrir confirmação, preservação do destino e ausência de overflow horizontal.

A tentativa isolada no sandbox expirou em `Runtime.enable`. A repetição autorizada fora do sandbox permitiu validar o navegador. O harness foi ajustado para habilitar Page antes de preparar a sessão e enviar Enter com o texto correspondente no protocolo do Chrome. A execução final passou nas três larguras. O navegador usa janela oculta/perfil temporário próprio; navegador e Vite são encerrados ao terminar.

- [Desktop 1440 px](../../.cache/d1e-smoke/admin-ligacoes-1440.png)
- [Mobile 390 px](../../.cache/d1e-smoke/admin-ligacoes-390.png)
- [Mobile 320 px](../../.cache/d1e-smoke/admin-ligacoes-320.png)
- [Resultado estruturado e operações simuladas](../../.cache/d1e-smoke/resultado.json)

Evidências em `.cache/d1e` e `.cache/d1e-smoke`, confirmadas como ignoradas pelo Git. O script reproduzível permanece versionável em `frontend/scripts`.

## Preservação

A comparação SHA-256 dos arquivos versionados com o baseline inicial encontrou alterações somente em `AdminPatrimonios.jsx` e seu teste; os demais arquivos desta etapa são novos. Backend inteiro, schema, migrations, seeds, importadores, manifesto editorial, fonte canônica, detalhe público D1D e todos os arquivos de `frontend/src/features/mapa` permaneceram idênticos.

SHA-256 da fonte canônica preservado:

`c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8`

Banco real = **não acessado**. Nenhuma migration, seed, sync, import ou escrita real executada. Os números informados de 0 fatos e 14 ligações não foram consultados novamente. UI de fatos não criada; Novidades, Exposições, usuários, referências, imagens, categorias, endereço, mapas e rotas não foram modificados.

Pendências impeditivas desta etapa: nenhuma. Alterações disponíveis no working tree; nenhum commit criado nesta execução.

D1E CONCLUÍDA

GESTÃO DE LIGAÇÕES DISPONÍVEL NO ADMIN
