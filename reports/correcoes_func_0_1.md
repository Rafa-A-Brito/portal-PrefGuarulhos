# FUNC-0.1 — Compatibilidade do teste de Histórico com a interface atual

26/11/2026, America/Sao_Paulo. Branch `development/backend`, HEAD `9a803cd28a81eb638b77a84b9849d258cb00ac7f`. Checkout inicialmente limpo; status e referências locais conferidos antes da edição.

## Diagnóstico e correção

Inspecionados `AdminAuditoria.jsx`, `AdminAuditoria.module.css` e o teste existente. Os campos **Código do responsável (UUID)** e **Código do registro alvo (UUID)** ficam no elemento `details` **Filtros avançados**, inicialmente fechado. O teste ainda usava os rótulos antigos. Não foi identificado defeito real no componente nesse fluxo.

Somente [AdminAuditoria.test.jsx](../frontend/test/AdminAuditoria.test.jsx) foi ajustado, além deste relatório. O teste abre os filtros avançados, verifica a abertura e digita os dois UUIDs pelos nomes acessíveis atuais. Todas as asserções anteriores foram preservadas: total de 41 informado pelo servidor apesar de uma única linha retornada, página 2 de 3, período com conversão de fuso, ação, recurso, UUIDs, limite 20 e retorno da consulta à página 1. Foram acrescentadas verificações da página 1 exibida, total filtrado e botão Anterior desabilitado.

## Validação

Executada em `frontend`, via `cmd.exe`, com Node 24.22.1 já disponível em `.cache/d4_final/node24/node.exe`:

| Verificação | Resultado |
| --- | --- |
| Histórico: `node_modules/vitest/vitest.mjs run test/AdminAuditoria.test.jsx --maxWorkers=2` | 18/18 aprovados; exit 0; 28,35 s. |
| Suíte completa: `node_modules/vitest/vitest.mjs run --maxWorkers=2` | **900 aprovados / 5 falhas, 905 testes**; 51 arquivos aprovados / 1 falhou; exit 1; 252,86 s. Histórico aprovado. |
| Lint: `node_modules/eslint/bin/eslint.js .` | Aprovado, exit 0, sem mensagens. |
| Build: `node_modules/vite/bin/vite.js build` | Aprovado, exit 0; 1.478 módulos; 4,24 s. |
| `git diff --check` | Aprovado; somente aviso de normalização futura LF/CRLF do Git. |

Logs locais: [Histórico](../.cache/func_0_1/historico.log), [suíte completa](../.cache/func_0_1/suite_completa.log), [lint](../.cache/func_0_1/lint.log) e [build](../.cache/func_0_1/build.log).

O build mantém avisos de chunk maior que 500 kB (principal: 748,61 kB; gzip: 212,82 kB), importação estática/dinâmica de `PatrimonioEditor` e tempo de plugins. Nenhum aviso foi suprimido.

## Falhas remanescentes fora do Histórico

As cinco falhas estão em `ExposicoesImagens.test.jsx`: quatro entradas sem imagem válida (`undefined`, `null`, string vazia e espaços) não apresentam a imagem alternativa nem o nome acessível esperado; no quinto caso, o erro de carregamento mantém a URL original em vez de `/imagem-indisponivel.svg`. Há também três avisos do React sobre `src` vazio.

A inspeção de [ConhecaMais.jsx](../frontend/src/pages/ConhecaMais/ConhecaMais.jsx), linha 274, confirma que o card renderiza diretamente `<img src={e.imagem} alt={e.titulo} loading="lazy" />`, sem fallback ou tratamento de erro. É um defeito funcional fora do escopo, documentado sem modificar o componente ou enfraquecer seus testes. Esse código e `ExposicoesImagens.test.jsx` não foram alterados nesta execução. O resultado anterior de 904/905 não se repetiu no checkout atual: a incompatibilidade do Histórico foi resolvida, mas **a suíte completa permanece reprovada** por essas cinco falhas.

## Limites e preservação

Sem alterações em componentes de produção, estilos, backend, APIs, autenticação ou banco. Reformulação visual externa e correções VIS-5B/FUNC-0 preservadas. Validação limitada à suíte automatizada do frontend, lint e build; sem nova homologação visual em navegador. Sem commit, push ou deploy.
