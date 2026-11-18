# VIS-4B.1 — Correções prioritárias administrativas

18/11/2026, America/Sao_Paulo. Branch `development/backend`; HEAD `0b36c5aa14b577f2ee74371824c3d6ef4d34a0d4`. Sem fetch, commit, push ou deploy.

## Escopo e confirmação prévia

A referência foi a [auditoria VIS-4A](auditoria_visual_vis_4a.md), confrontada novamente com o código atual. Antes das edições havia uma mudança externa em `frontend/src/features/mocks/destaquesMock.js` e o relatório VIS-4A não rastreado; ambos foram preservados. Um manifesto de hashes inicial e 20 capturas anteriores foram produzidos nesta execução.

Foram corrigidos exclusivamente **V4A-01, V4A-02 e V4A-03**. Nenhuma alteração em Home, favoritos, apresentação pública de conservação/visitação, backend, Prisma, banco, Docker, autenticação, serviços HTTP ou contratos. V4A-04, V4A-05 e V4A-06 continuam pendentes.

## Causas, alterações e arquivos

| Item | Causa confirmada | Alteração |
| --- | --- | --- |
| V4A-01 | Botões herdavam `#3ea3dc` do CSS público; o grupo Dashboard usava o mesmo azul com texto branco. Contraste computado de 2,81:1. | Em [admin.css](../frontend/src/features/admin/admin.css), azul administrativo `#176b9a` para botões e fundo ativo do Dashboard. Hover primário usa navy; outline conserva fundo claro. Todos os seletores de botão ficam sob `.admin-shell`. Regras locais como navy em Regiões continuam prevalecendo. Não foi editado `global.css`. |
| V4A-02 | O botão Editar era desabilitado durante a consulta e o formulário abria sem receber foco; o modal de erro acabava memorizando o `body`. | Em [AdminUsuarios.jsx](../frontend/src/features/admin/pages/AdminUsuarios.jsx), refs guardam o acionador e o campo Nome. Um pedido de foco é consumido após a renderização e o fim do carregamento. Criação/edição focam Nome; cancelamento retorna ao acionador conectado e habilitado. Na falha, o acionador é focado após reabilitação e antes de abrir o modal existente, permitindo seu retorno ao fechar. Nenhuma alteração no modal compartilhado ou nas permissões. |
| V4A-03 | A lista positiva de `formatarAuditoria` não incluía os três campos já permitidos nos eventos da API. | Em [formatarAuditoria.js](../frontend/src/features/admin/formatarAuditoria.js), adicionados visitação, motivo e previsão, com rótulos legíveis. Estados conhecidos reutilizam a lista existente de visitação; códigos futuros continuam literais, sem presumir acesso. A data é validada e apresentada como dia civil. |

Testes: [AdminUsuariosFoco.test.jsx](../frontend/test/AdminUsuariosFoco.test.jsx), novo, e [formatarAuditoria.test.js](../frontend/test/formatarAuditoria.test.js), ampliado. Este relatório é o sexto arquivo de entrega: **três fontes, dois testes e um relatório**. Roteiros de navegador e evidências ficaram somente em `.cache/vis_4b_1/`.

### Semântica do Histórico

- Campo ausente dos dois lados não cria linha. Ausência de um lado mantém “Valor anterior não disponível” ou “Novo valor não disponível”.
- `null` aparece como “Sem valor”; string vazia permanece “Texto vazio”. Limpeza explícita não é confundida com ausência de informação.
- Valores iguais continuam comparáveis nas duas colunas; quando todas as linhas exibidas são iguais, permanece o aviso existente de diferença não disponível. Não se deduz mudança apenas pelo código da ação.
- `2027-03-15` aparece como **15/03/2027**, sem conversão de fuso. Há compatibilidade com serialização UTC à meia-noite (`2027-03-15T00:00:00.000Z`). Calendário inválido ou outros formatos não são convertidos silenciosamente: aparecem como “Data não disponível”.
- Motivo permanece texto literal renderizado pelo React. Identificação de responsável/alvo, filtros de campos, sanitização de URLs, tratamento de senha e eventos desconhecidos foram preservados.

## Validação e medições antes/depois

| Verificação | Resultado |
| --- | --- |
| ESLint frontend | Aprovado, exit 0. |
| Vitest direcionado | **130/130 testes**, cinco arquivos, exit 0; 30,97 s. |
| Build de produção | Aprovado, exit 0; 1.471 módulos, 7,03 s. |
| Navegador | 20 capturas antes e **36 depois**: 28 no roteiro principal e oito complementares. 320, 390, 768 e 1440 px. Sem overflow horizontal do documento ou exceções JavaScript não tratadas nos roteiros concluídos. |
| Integridade | `git diff --check` aprovado; índice sem alterações. Comparação de hashes confirma somente os quatro arquivos preexistentes listados nesta entrega modificados; mock e relatório VIS-4A permanecem idênticos ao início. |

Os cinco arquivos testados são `AdminUsuariosFoco`, `formatarAuditoria`, `AdminAuditoria`, `ForcaSenha` e `NavegacaoAdmin`. Incluem consulta pendente, abertura de formulário, Tab para E-mail, cancelamento, erro com modal real, acionador removido por filtro, datas bissextas/inválidas, omissões/null/vazio, estados conhecidos/futuros, ator/alvo, sanitização e navegação/permissões existentes. Não houve execução da suíte completa.

| Elemento / estado | Antes | Depois |
| --- | --- | --- |
| Novo usuário / Salvar alterações: branco sobre azul | 2,81:1 | **5,82:1** |
| Ações outline: azul sobre branco | 2,81:1 | **5,82:1** |
| Dashboard ativo: branco sobre fundo azul | 2,81:1 | **5,82:1**, inclusive hover |
| Botão primário em hover | — | **13,80:1** |
| Botão outline em hover | — | **5,13:1** |
| Foco após editar / novo usuário | Não chegava ao campo Nome | Nome recebe foco nas quatro larguras |
| Cancelar edição / fechar erro de abertura | Não voltava ao Editar | Retorno correto nas quatro larguras |
| Cancelar criação | Retorno já observado | Preservado nas quatro larguras |
| Evento com apenas visitação, motivo e previsão | “Detalhes dessa alteração não disponíveis” | Três linhas com valores anteriores e posteriores |

Contraste calculado com cores computadas no navegador, sem arredondar antes da comparação. O menor valor medido nos estados habilitados identificados foi **5,13:1**, acima de 4,5:1. Controles disabled conservaram comportamento e opacidade `0.55`; não foram incluídos na alegação de contraste mínimo de controles habilitados. O foco do Dashboard conserva contorno branco de 3 px. Não foram alteradas dimensões dos botões.

Os cinco cenários de foco do roteiro — edição, retorno da edição, criação, retorno da criação e retorno do erro — passaram em **20/20 verificações** após a correção. A comparação do Histórico também foi percorrida por Tab e seta direita; em mobile, os novos valores continuam acessíveis pela rolagem interna existente. Não se comprimiu a tabela para fazê-la caber integralmente na viewport.

Comandos em `cmd.exe`, a partir de `frontend`, usando Node 24.22.1 já disponível:

```bat
..\.cache\d4_final\node24\node.exe node_modules\eslint\bin\eslint.js .
..\.cache\d4_final\node24\node.exe node_modules\vitest\vitest.mjs run test/AdminUsuariosFoco.test.jsx test/formatarAuditoria.test.js test/AdminAuditoria.test.jsx test/ForcaSenha.test.jsx test/NavegacaoAdmin.test.jsx --maxWorkers=2
..\.cache\d4_final\node24\node.exe node_modules\vite\bin\vite.js build
..\.cache\d4_final\node24\node.exe ..\.cache\vis_4b_1\visual.mjs --antes
..\.cache\d4_final\node24\node.exe ..\.cache\vis_4b_1\visual_depois.mjs
..\.cache\d4_final\node24\node.exe ..\.cache\vis_4b_1\complemento.mjs
```

## Evidências

| Usuários — edição com foco | Antes | Depois |
| --- | --- | --- |
| 320 px | [Captura](../.cache/vis_4b_1/antes/usuarios_editar_320.png) | [Captura](../.cache/vis_4b_1/depois/usuarios_editar_320.png) |
| 390 px | [Captura](../.cache/vis_4b_1/antes/usuarios_editar_390.png) | [Captura](../.cache/vis_4b_1/depois/usuarios_editar_390.png) |
| 768 px | [Captura](../.cache/vis_4b_1/antes/usuarios_editar_768.png) | [Captura](../.cache/vis_4b_1/depois/usuarios_editar_768.png) |
| 1440 px | [Captura](../.cache/vis_4b_1/antes/usuarios_editar_1440.png) | [Captura](../.cache/vis_4b_1/depois/usuarios_editar_1440.png) |

- Histórico: [antes 1440](../.cache/vis_4b_1/antes/historico_1440.png), [depois 1440](../.cache/vis_4b_1/depois/historico_1440.png), [novos valores acessados por teclado em 320](../.cache/vis_4b_1/depois/historico_valores_320.png).
- Dashboard: [antes 390](../.cache/vis_4b_1/antes/dashboard_390.png), [depois 390](../.cache/vis_4b_1/depois/dashboard_390.png), [hover/foco 1440](../.cache/vis_4b_1/depois/dashboard_hover_foco_1440.png).
- Hover: [primário 320](../.cache/vis_4b_1/depois/usuarios_hover_btn-solid_320.png), [outline 320](../.cache/vis_4b_1/depois/usuarios_hover_btn-outline_320.png).
- [Comparação de medições e hashes](../.cache/vis_4b_1/comparacao.json), [resultado principal](../.cache/vis_4b_1/depois/resultado.json), [verificação complementar](../.cache/vis_4b_1/depois/complemento.json).
- [Lint](../.cache/vis_4b_1/lint.log), [testes](../.cache/vis_4b_1/testes.log), [build](../.cache/vis_4b_1/build.log), [log visual](../.cache/vis_4b_1/visual_depois.log).

## Pendências e limites

**V4A-01 a V4A-03 validados no ambiente local descrito.** Permanecem V4A-04 (checkbox), V4A-05 (alturas) e V4A-06 (falhas duplicadas do Feedback). A conferência complementar confirmou checkbox em coluna, botões de 40 px e cor navy original de Regiões; o código de Feedback não foi editado.

O build mantém avisos conhecidos de chunk acima de 500 kB (principal 738,31 kB; 209,34 kB gzip), import estático/dinâmico do editor e diagnóstico de tempo de plugins. Nenhum aviso foi suprimido. As capturas de Dashboard em página inteira podem omitir desenhos SVG, artefato já documentado na VIS-4A; aqui servem para conferir o menu, sem alegar nova homologação dos gráficos.

O navegador usou servidor local isolado, `configFile:false`, `envDir:false`, sessão e respostas sintéticas, somente GETs. Os erros 503 foram provocados para validar foco e produzem logs esperados. Não houve conexão ao backend, gravação, alteração de conta ou envio real. Testes/navegador usaram execução local autorizada fora do sandbox. Nenhuma dependência instalada.

Não foram ensaiados leitor de tela, aparelho físico, zoom 200% ou integração com API real nesta rodada. As evidências em `.cache` são locais e ignoradas pelo Git. Não há alegação de certificação integral de acessibilidade ou liberação de produção.
