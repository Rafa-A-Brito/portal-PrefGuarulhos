# D3B — correções finais da integração do portal

Data: **17/10/2026**, America/Sao_Paulo. **Parecer: GO para revisão antes da D4.** Corrigidos D3A-01 a D3A-04 e esclarecido o filtro público de número. Suíte frontend: **277 testes aprovados**, lint/build aprovados e smoke em **1440, 390 e 320 px sem overflow horizontal ou exceções JavaScript inesperadas**.

## 1. Estado inicial e escopo

HEAD conferido: `b31718b31367b7cc0aa98bec6505f0bf252ceea1`, branch `development/backend`. Leitura do relatório D3A e das instruções anexadas concluída antes das alterações.

O working tree inicial continha o CSS concorrente de `PatrimonioDetalhe.css`, cinco relatórios D2C e o relatório D3A não versionados. Esses arquivos foram preservados integralmente em relação à fotografia inicial desta D3B. Nenhum reset, stash, staging, commit ou push foi realizado.

Escopo: correções delimitadas de formulário administrativo, destaques da home e rótulo público. Nenhuma funcionalidade nova, mudança de contrato, refatoração ampla ou divisão de bundle foi implementada. Docker não foi iniciado.

## 2. Arquivos modificados nesta etapa

| Arquivo | Alteração |
| --- | --- |
| `frontend/src/features/admin/components/AdminConteudo.jsx` | Classe específica para limitar a correção CSS ao formulário de conteúdo. |
| `frontend/src/features/admin/admin.css` | Dimensionamento de fieldset, grids e controles de Exposições/Novidades; quebra de mensagens longas. |
| `frontend/src/pages/Inicio/Inicio.jsx` | Link nativo nos destaques, botão Favoritar independente, imagem condicional e callbacks/limites do carrossel. |
| `frontend/src/styles/global.css` | Posicionamento do botão independente, apresentação do link e foco visível nos controles dos destaques. |
| `frontend/src/pages/Patrimonios/Patrimonios.jsx` | Rótulo “Número do patrimônio”. |
| `frontend/test/Inicio.test.jsx` | Novo arquivo com 16 testes de regressão dos destaques. |
| `frontend/test/D2Editorial.test.jsx` | Atualização do rótulo esperado, preservando as verificações do filtro e da ordem recebida. |
| `frontend/scripts/smoke-d2b.mjs` | Atualização exclusivamente do seletor por rótulo do filtro público; rótulos administrativos mantidos. |
| `reports/D3B-correcoes-integracao.md` | Este relatório. |

O diff de `frontend/src/pages/PatrimonioDetalhe/PatrimonioDetalhe.css` já existia e **não é uma alteração desta D3B**. Auxiliares e evidências ficam ignorados em `.cache/d3b`.

## 3. Causas e correções

### D3A-01 — formulários administrativos em 320 px

A composição combinava o mínimo intrínseco do `fieldset` e dos controles nativos, inclusive upload, com grids `1fr`, cujo mínimo automático permitia que o conteúdo impusesse uma largura maior que a disponível. O fieldset não tinha redução desse mínimo, e os controles não tinham limites locais suficientes. Na D3A, isso produziu `scrollWidth` de 362 px.

A nova classe `admin-conteudo-form` restringe a correção aos formulários de conteúdo. Foram aplicados `min-width: 0`, `max-width: 100%` e `box-sizing: border-box` ao formulário, fieldset, filhos dos grids e controles; margem zero no fieldset; tracks `minmax(0, 1fr)` em uma ou duas colunas, respeitando o breakpoint existente. Mensagens de erro podem quebrar sequências longas. Não foi acrescentado `overflow-x: hidden` ao body.

O smoke verificou os limites geométricos de todos os inputs, selects e textareas do formulário em relação à caixa do próprio formulário. Também cobriu conteúdo preenchido, textos extensos, fontes documentais, data, CTA, nome de arquivo longo, prévia de imagem, upload inválido, criação, edição e falha de gravação com recuperação. Em 320 px, ambos os formulários abertos mediram **310 px de scrollWidth**, dentro do viewport de 320 px; a diferença corresponde à área reservada pela barra vertical do navegador.

### D3A-02 — navegação dos cards

O `article onClick` só oferecia navegação por ponteiro. Foi substituído por `Link`, renderizado como âncora nativa, envolvendo imagem, categoria e textos. O destino existente foi preservado: `/patrimonios?categoria=<categoria>`. O nome acessível é “Explorar <nome do patrimônio>”.

Favoritar é irmão do link, posicionado no card; não há botão dentro da âncora. Foram verificados Tab, Enter, foco visível de 3 px, independência do botão e acesso por ponteiro por meio de `elementFromPoint`. Ativar Favoritar não navega. A apresentação visual do card foi preservada.

**Limite preexistente:** Favoritar na home já tinha somente `stopPropagation`, sem estado ou persistência de favoritos. Esse comportamento foi mantido. A aprovação refere-se à acessibilidade e independência desse controle; não certifica uma funcionalidade de salvar favoritos que não existia, nem a adiciona nesta etapa.

### D3A-03 — setas e limites do carrossel

Ambas as setas passavam o evento de clique à mesma função. Como apenas a string `"prev"` selecionava a direção anterior, a seta esquerda também executava a direção seguinte.

Os callbacks agora passam explicitamente `"prev"` e `"next"`. Os nomes acessíveis são “Destaques anteriores” e “Próximos destaques”. O limite é calculado por `scrollWidth - clientWidth`, limitado a zero; os destinos intermediários ficam dentro do intervalo. Foi preservado o comportamento circular: anterior no início vai ao fim, seguinte no fim retorna ao início.

Os testes cobrem as duas direções, aproximação dos extremos e ausência de espaço rolável. O navegador confirmou deslocamento e retorno nos extremos nas três larguras, usando teclado. A rolagem nativa ao focar cards continua funcionando.

### D3A-04 — imagem principal ausente

A imagem era renderizada incondicionalmente, embora o normalizador permita ausência de URL. O destaque agora só renderiza `img` quando `imagemPrincipal` contém texto não vazio após `trim`. O fundo neutro do `figure` existente permanece, com categoria, nome, bairro e link; nenhuma imagem substituta foi inventada.

Os testes cobrem string vazia, espaços, `null`, `undefined` e URL presente. O smoke verificou cards com e sem imagem, ausência de `img[src=""]` na home e navegação de ambos.

## 4. Diagnóstico do input público

O campo público **não manipulava `ordemExibicao`**. O estado `numero` vem de `searchParams.get("numeroExibicao")`; o input atualiza esse mesmo parâmetro da URL e compara exatamente `item.numeroExibicao === Number(numero)`, aceitando número inteiro positivo.

Na arquitetura atual, `listarPatrimonios()` busca todas as páginas de `GET /patrimonios` com `pagina` e `limite`; o filtro de número da tela é aplicado localmente sobre o DTO recebido, antes da paginação visual. O campo não envia nem edita prioridade editorial. Nenhum contrato de API foi alterado.

O rótulo “Número de exibição” foi substituído por **“Número do patrimônio”**, mantendo o filtro público aprovado na D2. `ordemExibicao` continua sendo prioridade administrativa. A sequência fornecida pelo backend permanece: não foi acrescentada ordenação local nem alterada a ordenação do backend antes da paginação da API.

O teste D2 existente e o smoke repetido confirmaram filtro regional/numérico, número exato, limpeza dos filtros, ordem dos resultados e navegação por slug. Os controles administrativos de número e ordem mantêm seus rótulos e comportamentos.

## 5. Testes e resultados

| Verificação | Resultado D3B |
| --- | --- |
| Suíte frontend completa, `npm test` | **277 aprovados**, 15 arquivos, zero falhas; 261 anteriores + 16 novos |
| Frontend `npm run lint` | Saída 0 |
| Frontend `npm run build` | Saída 0 |
| `git diff --check` | Aprovado |
| Smoke geral ampliado | **87 cenários**, zero overflow, zero exceções JS |
| Smoke D2/C3/D1D/D1E | **PASS em 1440/390/320 px**, zero overflow, zero exceções JS; 33 capturas |
| Integridade de arquivos preexistentes | 621 arquivos comparados; somente os sete arquivos preexistentes previstos mudaram; nenhum arquivo ausente ou alteração inesperada |

Não foram removidos testes ou enfraquecidas as expectativas existentes. O único ajuste de expectativa anterior foi o novo rótulo público. Os novos testes verificam foco/Tab/Enter e destino do link, independência de Favoritar, imagens ausentes/válidas, ordem recebida, oito combinações de deslocamento/limites do carrossel e estados vazio/carregando. A visibilidade real do foco foi conferida no navegador; não é inferida apenas de JSDOM.

Backend e Prisma não foram executados novamente: não houve alteração nesses componentes e a D3A já registra suas verificações. Os 418 testes backend da D3A não são apresentados como nova execução desta etapa.

## 6. Smoke responsivo e regressões

Frontend real servido pelo Vite, Chrome oculto com perfil temporário e **API exclusivamente em memória**. Criação/edição e uploads foram recebidos pela API simulada local. O smoke de conteúdo registrou seis POSTs aprovados, seis PATCHes aprovados e seis POSTs com erro deliberadamente injetado, seguidos de recuperação. Nenhum desses pedidos foi enviado ao backend real.

| Largura | Cenários gerais | Formulários completos/edição/upload | Cards, setas, Tab/Enter/foco | D2/C3/D1D/D1E | Overflow / exceções JS |
| --- | --- | --- | --- | --- | --- |
| 1440 px | 29 | PASS | PASS | PASS | 0 / 0 |
| 390 px | 29 | PASS | PASS | PASS | 0 / 0 |
| 320 px | 29 | PASS | PASS | PASS | 0 / 0 |

Cobertura adicional: Início, Conheça Mais e detalhe de conteúdo, usuários/lista/edição, login por teclado e dashboard, estados vazio/erro/carregando, catálogo regional vazio, administração regional, número positivo e ordem zero, região inativa, limpeza NULL, filtros, detalhe público, galeria, referências e accordion com múltiplas seções abertas. Ligações D1D/D1E foram criadas/editadas/reordenadas/excluídas por teclado em memória, preservando UUID e navegação por slug. A restrição visual de gestão regional ao EDITOR foi repetida; isso não substitui os testes de autorização do servidor documentados na D3A.

C3 foi exercitado com EXATA, APROXIMADA/DEMOLIDO, REFERENCIA e SEM_ROTA, mantendo as políticas de endereço e rota. As fixtures, inclusive Antigo Poço, são sintéticas. **Google Maps externo foi bloqueado; carregamento do provedor e rotas externas não são certificados.** ViaCEP externo também não foi certificado nesta etapa.

Foram inspecionadas visualmente capturas da home com foco em desktop/mobile, formulário de exposição em 1440/320 px, formulário preenchido de novidade em 390 px, edição em 320 px e mensagem de erro em 320 px. São **120 screenshots** ao todo: 87 gerais + 33 de regressão.

A primeira tentativa do navegador no sandbox expirou em `Page.enable`. A execução fora do sandbox foi autorizada pela ferramenta. Houve ainda uma falha inicial do auxiliar: Tab percorria todos os cards antes de chegar à seta seguinte, rolando a faixa ao fim; o teste foi corrigido para estabelecer a posição inicial depois de focar a seta, mantendo as asserções de deslocamento. Essa tentativa não é contada como aprovada. Os resultados finais referenciados abaixo são das execuções completas com saída 0.

Os logs incluem HTTP 500 injetados, cancelamentos do StrictMode e tentativas bloqueadas de Google Maps; não são exceções JavaScript não tratadas. Há também aviso preexistente de imagem vazia em `PlaquetaCard` quando a fixture sem imagem chega à listagem pública: a correção D3A-04 foi delimitada aos destaques da home. Não se declara ausência de todos os avisos de console do portal nem auditoria completa WCAG.

### Capturas e evidências

| Cenário | 1440 px | 390 px | 320 px |
| --- | --- | --- | --- |
| Link de destaque com foco | [Imagem](../.cache/d3b/general-smoke/home-link-foco-1440.png) | [Imagem](../.cache/d3b/general-smoke/home-link-foco-390.png) | [Imagem](../.cache/d3b/general-smoke/home-link-foco-320.png) |
| Destaque sem imagem com foco | [Imagem](../.cache/d3b/general-smoke/home-sem-imagem-foco-1440.png) | [Imagem](../.cache/d3b/general-smoke/home-sem-imagem-foco-390.png) | [Imagem](../.cache/d3b/general-smoke/home-sem-imagem-foco-320.png) |
| Exposição preenchida/upload | [Imagem](../.cache/d3b/general-smoke/exposicoes-admin-preenchido-upload-1440.png) | [Imagem](../.cache/d3b/general-smoke/exposicoes-admin-preenchido-upload-390.png) | [Imagem](../.cache/d3b/general-smoke/exposicoes-admin-preenchido-upload-320.png) |
| Novidade preenchida/upload | [Imagem](../.cache/d3b/general-smoke/novidades-admin-preenchido-upload-1440.png) | [Imagem](../.cache/d3b/general-smoke/novidades-admin-preenchido-upload-390.png) | [Imagem](../.cache/d3b/general-smoke/novidades-admin-preenchido-upload-320.png) |
| Edição de novidade/upload | [Imagem](../.cache/d3b/general-smoke/novidades-admin-edicao-upload-1440.png) | [Imagem](../.cache/d3b/general-smoke/novidades-admin-edicao-upload-390.png) | [Imagem](../.cache/d3b/general-smoke/novidades-admin-edicao-upload-320.png) |

- [Resultado geral estruturado](../.cache/d3b/general-smoke/resultado.json) e [regressão estruturada](../.cache/d3b/regression-smoke/resultado.json).
- [Suíte frontend](../.cache/d3b/frontend.log), [lint](../.cache/d3b/lint.log), [build](../.cache/d3b/build.log) e [diff-check](../.cache/d3b/diff-check.log).
- [Log geral](../.cache/d3b/general-smoke.log), [log de regressão](../.cache/d3b/regression-smoke.log) e [falha inicial do auxiliar](../.cache/d3b/falha-harness-tab.json).
- [Baseline de arquivos](../.cache/d3b/baseline.json) e [comparação final](../.cache/d3b/integrity.json).

Auxiliares reproduzíveis locais: `.cache/d3b/general-smoke.mjs` e `.cache/d3b/regression-smoke.mjs`, executados a partir de `frontend`. A preparação está em `.cache/d3b/prepare-smoke.cjs` e `.cache/d3b/smoke-helpers.txt`, reaproveitando os auxiliares D3A. Evidências `.cache` são ignoradas pelo Git; não são incorporadas automaticamente ao versionamento.

## 7. Preservações, riscos e parecer

O hash de `PatrimonioDetalhe.css` permanece idêntico ao início da D3B, incluindo `var(--navy)`. O accordion foi exercitado novamente nas três larguras. Os relatórios D2C/D3A, schema, sete migrations, fontes canônicas e todo o backend também mantêm seus hashes iniciais.

**Nenhuma conexão ao banco real foi realizada nesta D3B**, nem mesmo para inspeção de integridade. Não houve DML, migrations, `db push`, seeds, sync ou importadores; backups existentes não foram removidos ou modificados. A alteração manual da conta EDITOR documentada na D3A foi preservada por ausência de acesso, sem tentar restaurar a fotografia anterior. “Dados reais preservados” significa ausência de intervenção desta etapa, não nova certificação byte a byte das tabelas.

Pendências não bloqueantes do escopo: bundle principal de **633,55 kB / 177,76 kB gzip**, funcionalidade inexistente de persistência do botão Favoritar da home e aviso de imagem vazia na listagem com fixture sem foto, descritos acima. Nenhuma dessas limitações foi silenciosamente apresentada como corrigida. Integrações externas reais não foram certificadas pelo smoke simulado.

**GO para revisão antes da D4:** as correções delimitadas D3A-01 a D3A-04, o diagnóstico/rótulo público e as verificações exigidas foram concluídos. O GO não executa Docker nem representa implantação. Não houve commit ou push automático.

**D3B — CORREÇÕES CONCLUÍDAS**

**RESPONSIVIDADE 320 PX APROVADA**

**NAVEGAÇÃO E TECLADO APROVADOS**

**DADOS REAIS PRESERVADOS**

**PRONTO PARA REVISÃO ANTES DA D4**
