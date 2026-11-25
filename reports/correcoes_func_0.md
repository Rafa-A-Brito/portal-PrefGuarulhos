# FUNC-0 — Reconciliação das falhas históricas do frontend

25/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD e referência local `origin/development/backend`: `34556fa899569fb37213cf660462e5a1f03dae98`. Sem fetch, commit, push ou deploy.

## Diagnóstico e proteção do checkout

Referência: [VIS-5B.5](correcoes_vis_5b_5.md) e histórico das etapas VIS-5B nela relacionado. A execução começou com alterações locais de VIS-5B.5 e reformulações externas de componentes administrativos e estilos. O status e o diff foram conferidos antes das edições; [diff inicial](../.cache/func_0/diff_inicial.patch) e manifesto de hashes foram preservados.

A reprodução inicial dos três arquivos históricos e de `AdminUsuariosFoco` terminou com **9 falhas e 33 aprovações, 42 testes**, exit 1, 39,62 s. As nove falhas foram reproduzidas; a intermitência de Usuários não ocorreu. [Log anterior](../.cache/func_0/antes.log).

| Caso histórico | Diagnóstico confirmado | Tratamento |
| --- | --- | --- |
| Inicio 1 — catálogo preenchido | Expectativa fixa `+5` desatualizada; configuração intencional contém `extra:25`. | Expectativa derivada de `heroDestaqueMock.extra`. |
| Inicio 2 — catálogo vazio | Mesmo problema; o card demonstrativo independe da API. | Mesma expectativa derivada, preservando as verificações de texto, imagens e link. |
| Inicio 3 — URLs vazias no card | Teste de filtragem de imagens também fixava `+5`. | Contador conferido pela configuração; filtragem e restauração da fixture mantidas. |
| Fluxos 1 — catálogo, URL e histórico | Busca era inicializada pela URL uma única vez e não acompanhava voltar/avançar. O teste também não encontrava o nome acessível esperado no campo. | Busca derivada da URL e nome acessível explícito. |
| Fluxos 2 — Mapa, URL e histórico | Busca e categoria eram estados locais que ignoravam a URL; faltava o nome acessível esperado. | Busca/categoria derivadas de `useSearchParams`, com atualização da URL e nome explícito. |
| Fluxos 3 — digitação e paginação | Página inicial ignorava `pagina=2`; digitação criava entradas no histórico e não reiniciava a página. | Página derivada da URL; digitação usa replace, preserva outros parâmetros e remove `pagina`. |
| Fluxos 4 — página, região e favoritos | Paginação não escrevia na URL; alterações de filtros não mantinham um estado de navegação restaurável. | Paginação e filtros usam entradas de histórico; mudanças de filtros reiniciam a página e preservam os demais parâmetros. |
| Roteamento 1 — endereço público desconhecido | Componente `NaoEncontrada` existia, mas não estava registrado; a rota ficava sem conteúdo. | Registro da rota curinga usando o componente existente. |
| Roteamento 2 — endereço administrativo inexistente | Também não havia fallback para o caminho desconhecido. | Mesmo fallback público; rotas administrativas conhecidas e suas proteções mantidas. |

Os três casos do mock eram expectativas desatualizadas. Os seis restantes expunham defeitos reais de navegação/apresentação. `FluxosFrontendF2.test.jsx` e `RoteamentoPublico.test.jsx` passaram **sem qualquer edição**.

## Arquivos alterados

| Arquivo | Alteração |
| --- | --- |
| [Patrimonios.jsx](../frontend/src/pages/Patrimonios/Patrimonios.jsx) | URL como fonte da busca/página; preservação de parâmetros; reset de página ao filtrar; nome acessível da pesquisa. |
| [Mapa.jsx](../frontend/src/pages/Mapa/Mapa.jsx) | Sincronização de busca/categoria com URL, replace durante digitação e nome acessível. Anúncio estabilizado de 400 ms preservado. |
| [App.jsx](../frontend/src/App.jsx) | Import e registro do componente 404 existente. Preservada a alteração externa de indentação no hook de orientação. |
| [Inicio.test.jsx](../frontend/test/Inicio.test.jsx) | Duas asserções, cobrindo três casos, derivadas do contador configurado. |
| [AdminUsuariosFoco.test.jsx](../frontend/test/AdminUsuariosFoco.test.jsx) | Espera pela condição real de foco e nova regressão de rejeição controlada, ordem de foco e limpeza. |
| Este relatório | Diagnóstico e evidências. |

São três fontes e dois testes preexistentes alterados, além deste relatório. Nenhum CSS foi editado. Página inválida ou não positiva usa 1; página além do total continua limitada na apresentação pelo cálculo existente. Não foi introduzida canonicalização automática de URLs inválidas. Parâmetros alheios ao filtro são conservados. Alterações de query não acionam o foco de navegação da VIS-5B.1.

## Investigação separada de AdminUsuariosFoco

Foram examinados o componente, o provider de erro, o efeito do modal e a limpeza dos testes. O fluxo reabilita Editar, restaura seu foco e abre o alerta; o efeito passivo do alerta foca Fechar. A asserção antiga aguardava apenas a presença do `alertdialog`, condição diferente de o efeito de foco ter terminado.

O teste agora aguarda explicitamente **Fechar ser o elemento ativo**, sem pausa fixa ou alteração do timeout. A nova regressão mantém a consulta pendente, verifica Editar desabilitado e ausência de alerta, rejeita a promessa sob `act`, verifica a ordem das chamadas reais de foco (Editar antes de Fechar), testa Escape e reabre criação para conferir que o listener antigo não captura o novo fluxo. O spy delega à implementação nativa; não simula o sucesso do foco.

Não foi encontrada evidência de listener vazando ou necessidade de alterar Usuários, autenticação ou o modal. **A intermitência histórica não foi reproduzida nesta execução**; foi corrigida uma fragilidade concreta de sincronização do teste, sem afirmar que todas as causas históricas foram eliminadas.

Na primeira rodada após as alterações houve 74/75 aprovações: os nove históricos passaram, mas o novo teste de investigação contava eventos `focusin`. No JSDOM, refocar o acionador que permanecia ativo não emitia um novo evento. A instrumentação foi corrigida para observar chamadas nativas de `focus`, mantendo a verificação do foco final. Nenhum comportamento de produção foi ajustado para esse ensaio. [Registro](../.cache/func_0/direcionados.log).

## Validação

| Verificação | Resultado |
| --- | --- |
| Lint | Aprovado, exit 0. |
| Suíte direcionada final | **75/75 aprovados**, seis arquivos, exit 0; 43,89 s. [Log](../.cache/func_0/direcionados_finais.log). |
| Suíte completa | **904 aprovados / 1 falha, 905 testes, 52 arquivos**, exit 1; 249,67 s. |
| Nove casos históricos | Todos aprovados na suíte completa e na rodada direcionada após as correções. |
| Usuários | Cinco testes aprovados na suíte completa, incluindo a nova rejeição controlada. |
| Build | Aprovado, exit 0; 1.478 módulos, 3,26 s. |
| Chromium | **36 registros/capturas**, 320, 390, 768 e 1440 px, exit 0. |
| Diff | `git diff --check` aprovado; índice sem alterações. |

### Pendência externa: Histórico

A única falha da suíte completa está em `AdminAuditoria.test.jsx:97`, caso “troca página usando total do servidor e aplica filtros voltando à primeira”. Procura **Responsável (UUID, opcional)**, enquanto a reformulação externa apresenta **Código do responsável (UUID)** em Filtros avançados; o rótulo do registro alvo também mudou. O componente e o teste permanecem idênticos aos hashes do início da FUNC-0.

Essa incompatibilidade é separada das nove falhas históricas e da intermitência de Usuários. Não foi sobrescrita a reformulação externa nem adaptado seu teste fora do escopo. É necessário reconciliar o teste com o fluxo aprovado de filtros avançados na tarefa responsável pelo Histórico. **A suíte completa não está integralmente aprovada.** [Log completo](../.cache/func_0/suite_completa.log).

### Fluxos no navegador

Foram verificados entrada direta no catálogo com página 2/categoria, digitação com foco preservado e página reiniciada, limpeza, paginação, região, voltar/avançar, favoritos, busca do Mapa com resultado/vazio/limpeza, parâmetros adicionais conservados, fallback público e administrativo e retorno à Home por Enter. O contador da Home permaneceu `+25`.

Cada medição aguarda 750 ms após a interação. Não houve overflow horizontal do documento nem exceção JavaScript não tratada nos cenários finais. As capturas representativas das quatro larguras foram inspecionadas; não houve mudança de CSS ou dimensões. O fallback reutiliza integralmente a aparência existente, sem nova revisão de contraste dessa página.

| Fluxo | 320 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Busca do catálogo | [Captura](../.cache/func_0/depois/catalogo_busca_320.png) | [Captura](../.cache/func_0/depois/catalogo_busca_390.png) | [Captura](../.cache/func_0/depois/catalogo_busca_768.png) | [Captura](../.cache/func_0/depois/catalogo_busca_1440.png) |
| Voltar à página 2 | [Captura](../.cache/func_0/depois/catalogo_voltar_320.png) | [Captura](../.cache/func_0/depois/catalogo_voltar_390.png) | [Captura](../.cache/func_0/depois/catalogo_voltar_768.png) | [Captura](../.cache/func_0/depois/catalogo_voltar_1440.png) |
| Mapa vazio, foco preservado | [Captura](../.cache/func_0/depois/mapa_vazio_320.png) | [Captura](../.cache/func_0/depois/mapa_vazio_390.png) | [Captura](../.cache/func_0/depois/mapa_vazio_768.png) | [Captura](../.cache/func_0/depois/mapa_vazio_1440.png) |
| Fallback público | [Captura](../.cache/func_0/depois/404_publico_320.png) | [Captura](../.cache/func_0/depois/404_publico_390.png) | [Captura](../.cache/func_0/depois/404_publico_768.png) | [Captura](../.cache/func_0/depois/404_publico_1440.png) |

Registros: [URLs, foco, conteúdo e geometria](../.cache/func_0/depois/resultado.json), [log visual](../.cache/func_0/visual.log), [lint](../.cache/func_0/lint.log), [build](../.cache/func_0/build.log), [integridade](../.cache/func_0/integridade.json).

Comandos executados em `cmd.exe`, a partir de `frontend`, com Node 24.22.1 existente:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/Inicio.test.jsx test/FluxosFrontendF2.test.jsx test/RoteamentoPublico.test.jsx test/AdminUsuariosFoco.test.jsx test/MapaAnuncios.test.jsx test/OrientacaoPagina.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe ..\.cache\func_0\visual.mjs
```

## Integridade e limites

A comparação de **968 arquivos preexistentes** identifica somente os cinco arquivos listados nesta entrega como alterados nesta etapa. Reformulações externas em Chart, estilos UI, gráficos, Histórico, Dashboard e CSS global, assim como os arquivos da VIS-5B.5, foram preservados. O diff de App conserva a alteração externa anterior. Nenhum componente administrativo de produção foi editado.

O navegador utilizou Vite isolado (`configFile:false`, `envDir:false`), fixtures, sessão sintética e somente GETs; fontes externas e Google Maps bloqueados. Favoritos foram exercitados apenas no armazenamento local do perfil de ensaio. Os ajustes de seletores/esperas do roteiro temporário não exigiram mudanças no produto. Não houve banco, backend, API real, autenticação real, gravação remota ou dependência instalada.

Não houve novo ensaio de zoom ou leitor de tela nesta etapa; não se afirma homologação integral de acessibilidade. A suíte completa cobre as regressões anteriores existentes, mas sua única falha externa impede aprovação global. O build mantém avisos de chunk maior que 500 kB (principal 747,51 kB; 212,45 kB gzip), import estático/dinâmico de PatrimonioEditor e tempo de plugins. Nenhum aviso suprimido. Evidências em `.cache` são locais e ignoradas pelo Git.

**As nove falhas históricas foram reconciliadas.** A pendência do Histórico exige tratamento separado, preservando o trabalho externo. Sem commit, push ou deploy.
