# CI-F4 — Diagnóstico dos testes frontend

Data: **04/11/2026**, America/Sao_Paulo. Diagnóstico concluído, sem correção aplicada.

## 1. Conclusão

**Causa comprovada: o job frontend não instala a dependência backend exigida pelo teste de equivalência de contrato F3.** `frontend/test/feedbackPublicoApi.test.js:2` importa `backend/src/schemas/feedbackSchema.js`, cuja primeira linha importa `zod`. No job frontend, `npm ci` instala somente `frontend/node_modules`. A resolução a partir do arquivo em `backend/src/schemas/` não encontra o pacote no diretório irmão `frontend/node_modules`.

Classificação: **falha de configuração do ambiente de testes, com dependência entre projetos não preparada pelo CI**. Não foi demonstrado defeito na implementação pública ou administrativa. A falha é determinística no ambiente limpo reproduzido e ocorre durante a transformação/importação, antes de registrar os 51 casos do arquivo.

Os 619 testes locais passaram porque as dependências dos dois projetos estavam instaladas. No remoto, os jobs backend e frontend usam runners independentes; a instalação feita no job backend não prepara o job frontend. O controle causal Linux confirmou que disponibilizar somente o Zod no caminho de resolução backend elimina a falha, sem modificar fontes ou testes.

## 2. Commit e execução investigados

- Branch: `development/backend`.
- HEAD: `5047f3d8ecf37b28201ad73ddb6637c98fed497d`.
- Histórico publicado: `28551f9` → `f74d888` → `5047f3d`.
- [Execução 41768699438](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41768699438), **tentativa 1**, evento `push`, mesmo SHA.
- [Job Frontend / interface, 126373063459](https://github.com/Rafa-A-Brito/portal-PrefGuarulhos/actions/runs/41768699438/job/126373063459).
- Etapa com falha: `Run npm test -- --maxWorkers=2`, saída **1**.

Branch, HEAD, árvore e índice limpos foram confirmados antes do diagnóstico. Não houve fetch, commit, push, alteração de workflow ou nova execução remota nesta fase.

## 3. Recuperação dos logs reais

`gh auth status` não pôde executar: GitHub CLI ausente no PATH. A consulta pública ao download de logs retornou novamente HTTP 403; a anotação pública informava somente `Process completed with exit code 1.`.

Foi então utilizada a credencial existente do gerenciador Git, somente em memória e sem interação ou exposição do token. A API autenticada confirmou a conta `Rafa-A-Brito`, o SHA e a tentativa 1. O download do log completo do job frontend retornou **HTTP 200**. Portanto, este diagnóstico se apoia no log real, além dos estados das etapas; a limitação de acesso da verificação anterior foi superada.

Resultados remotos comprovados:

| Item | Resultado |
| --- | --- |
| Checkout, Node, `npm ci`, lint frontend | Sucesso |
| Arquivos de teste | **33 aprovados, 1 falhou ao carregar; 34 no total** |
| Casos efetivamente executados | **568 aprovados** |
| Casos do arquivo que não carregou | 51, confirmados pela execução local e pelo controle isolado |
| Duração Vitest | 46,15 s |
| Build e audit frontend | Ignorados após a falha; sem aprovação remota nesta execução |
| Job backend | Sucesso, incluindo etapa de 12 migrations/integridade/regressões, proxy, audit e limpeza |

Não se trata de 51 asserções reprovadas: esses casos sequer foram coletados no remoto.

## 4. Erro e stack trace

Arquivo de suíte: `frontend/test/feedbackPublicoApi.test.js`. Import iniciador, linha 2:

```js
import { feedbackSchema } from "../../backend/src/schemas/feedbackSchema.js";
```

Erro remoto, preservado do log:

```text
FAIL test/feedbackPublicoApi.test.js
Error: Failed to resolve import "zod" from "../backend/src/schemas/feedbackSchema.js". Does the file exist?
Plugin: vite:import-analysis
File: /home/runner/work/portal-PrefGuarulhos/portal-PrefGuarulhos/backend/src/schemas/feedbackSchema.js:1:18
1 | import { z } from "zod";

TransformPluginContext._formatLog node_modules/vite/dist/node/chunks/node.js:31317:39
TransformPluginContext.error node_modules/vite/dist/node/chunks/node.js:31314:14
normalizeUrl node_modules/vite/dist/node/chunks/node.js:28253:18
node_modules/vite/dist/node/chunks/node.js:28323:30
TransformPluginContext.transform node_modules/vite/dist/node/chunks/node.js:28289:4
EnvironmentPluginContainer.transform node_modules/vite/dist/node/chunks/node.js:31102:14
loadAndTransform node_modules/vite/dist/node/chunks/node.js:20837:26
```

O arquivo backend foi encontrado. O pacote importado por ele não foi resolvido. Zod 4.6.7 também aparece transitivamente no lockfile frontend, mas essa instalação no diretório irmão não satisfaz a resolução originada no backend. Adicionar apenas Zod ao manifesto frontend não corrige, por si só, essa localização.

## 5. Comparação de ambientes

| Aspecto | Actions real | Windows com Node 24 | Linux isolado |
| --- | --- | --- | --- |
| Sistema | Ubuntu 24.04.5, imagem 20261025.353.1 | Windows, checkout existente | Debian 12, imagem local `integration_backend_frontend-backend:latest` |
| Node | 24.22.1 | 24.22.1 | 24.21.0 |
| npm | 11.19.1 | 11.12.1 | 11.19.0 |
| Instalação | `npm ci` em frontend, runner limpo | Dependências existentes de frontend e backend | `npm ci` somente em frontend, cópia limpa do HEAD |
| Vite / Vitest / jsdom | 8.2.4 / 4.1.12 / 29.1.1 pelo lockfile; Vitest confirmado no log | Mesmas versões instaladas | Mesmas versões conferidas após `npm ci` |
| Workers | `--maxWorkers=2` | `--maxWorkers=2` | `--maxWorkers=2` |
| CI / TZ | Não definidos explicitamente no job; valores do processo de teste não foram impressos | Ambos ausentes; fuso efetivo America/Sao_Paulo | `CI=true`, `TZ=UTC`; fuso efetivo UTC |
| Zod backend | Não instalado pelo job frontend | 4.6.7 presente | Ausente no ensaio negativo; 4.6.7 acessível no controle positivo |

O Linux isolado não replica cada versão do runner remoto; reproduz a preparação de dependências e o mesmo erro, mantendo a comparação negativa/positiva no mesmo container e runtime.

Configuração compartilhada: `frontend/vitest.config.js` seleciona jsdom, `test/**/*.test.{js,jsx}`, `test/setup.js` e `VITE_API_BASE_URL=http://localhost:3333/api`. O setup limpa DOM e sessionStorage após cada teste. O job frontend não define flags de Feedback; os testes as controlam com `vi.stubEnv`. Os exemplos permanecem falsos e nenhuma configuração pública foi ativada.

A cópia Linux contém somente arquivos versionados, sem `.env.local` ou dependências do checkout. No Windows, o arquivo local já existente foi preservado. O fuso de negócio é explicitamente `America/Sao_Paulo` nos utilitários; timers e relógios simulados não chegam a executar no arquivo que falha na importação.

## 6. Reprodução executada

1. **Comando literal inicial no Windows:** `npm test -- --maxWorkers=2`. O PATH usou Node **25.9.0**, npm 11.12.1. Resultado: 584 aprovados, 35 reprovados, 4 arquivos com falha, 153,15 s. Erros distintos: `localStorage.clear is not a function` e `localStorage.setItem is not a function`, com avisos `--localstorage-file`. O arquivo `feedbackPublicoApi.test.js` carregou. Essa rodada não reproduz a falha remota; registra uma incompatibilidade observada no runtime diferente, sem investigação ou correção adicional nesta fase.
2. **Windows alinhado ao Node remoto:** mesmo script npm e argumentos, executados pelo Node **24.22.1**, também colocado no PATH dos filhos. **619/619 aprovados, 34 arquivos, 157,90 s, saída 0**. Nenhuma reinstalação ou edição de dependências locais.
3. **Primeira preparação Linux:** falhou no `npm ci` com `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, antes dos testes. Não é evidência da causa remota, onde `npm ci` passou. O container foi removido automaticamente.
4. **Preparação Linux com confiança TLS corrigida:** novo container, somente CAs públicas já confiadas pelo Windows via `NODE_EXTRA_CA_CERTS`, sem desabilitar TLS ou instalar certificados no host. `npm ci` concluiu, 332 pacotes instalados. Código obtido por `git archive HEAD`, montado somente para leitura e extraído em `/tmp/ci_f4`; nenhum `node_modules` do host montado.
5. **Suíte completa Linux:** `npm test -- --maxWorkers=2`. **568 casos aprovados, 33 arquivos aprovados, 1 arquivo falhou ao carregar**, 69,52 s, saída 1. Mesma mensagem de Zod e mesma origem no schema backend do remoto.
6. **Reprodução reduzida:** `npm test -- --maxWorkers=2 test/feedbackPublicoApi.test.js`. Mesma falha de importação, nenhum caso coletado, 1,33 s, saída 1. O arquivo é a unidade mínima pertinente porque o import de topo falha antes de selecionar um caso individual.
7. **Controle causal:** apenas no sistema de arquivos descartável, criado `backend/node_modules/zod` como link para o Zod 4.6.7 já instalado em `frontend/node_modules/zod`. Sem editar fonte, teste, manifesto, lockfile, timeout ou configuração. Executado o mesmo comando reduzido: **51/51 aprovados, 1,45 s, saída 0**. Esse link é um experimento de resolução, não uma correção aplicada ou proposta para produção.

Não houve retry para obter aprovação da mesma condição, skip ou aumento de timeout: a execução reduzida isolou a falha; o controle mudou explicitamente uma única condição de resolução. Containers com `--rm`, sem Compose, volumes persistentes ou conexão a banco. As escritas ocorreram apenas no sistema de arquivos temporário do container e em `.cache/` para evidências.

## 7. Hipóteses e classificação

- **Comprovada:** dependência backend não preparada no job frontend, escondida pela instalação local de ambos os projetos. Explica a diferença entre 619 locais e 568 remotos: faltam os 51 casos do arquivo que não carregou.
- **Não é erro de download/instalação no runner:** `npm ci` remoto passou. O pacote falta no contexto de resolução backend, não por falha reportada de npm.
- **Capitalização e separadores descartados como causa deste erro:** o log Linux localiza corretamente o schema; somente o bare import `zod` falha. O controle mantém todos os nomes e caminhos dos fontes.
- **Fuso, datas brasileiras, timers, concorrência e intermitência não sustentados:** erro anterior à execução dos casos; manteve-se na suíte completa e reduzida. Com os mesmos workers, UTC e `CI=true`, disponibilizar Zod permitiu os 51 casos.
- **Diferença Windows/Linux não é a causa suficiente:** dentro do mesmo Linux a condição de resolução explica falha e sucesso. As versões minor de Node/npm da reprodução não são idênticas ao runner, mas o log remoto comprova o mesmo problema.
- **Problema separado:** falhas de localStorage com Node 25 no primeiro ensaio Windows. Não ocorreram no log remoto nem na repetição Node 24; não são usadas para explicar o CI-F4.
- **Sem evidência de defeito da aplicação ou falha externa no job remoto.** A limitação TLS foi exclusiva da preparação local e foi registrada separadamente.

## 8. Correção mínima recomendada — não aplicada

Preservar o teste de equivalência com o schema real e **declarar sua preparação no job frontend**: antes dos testes, instalar as dependências backend com o lockfile existente, em uma etapa própria com `working-directory: backend`. Para esse contrato, `npm ci --ignore-scripts` é uma opção mínima: o caminho importado usa Zod e módulos puros, sem Prisma gerado, bcrypt nativo ou conexão a banco.

Arquivo que precisaria mudar: **`.github/workflows/predeploy.yml`**, somente o job frontend. Não há necessidade demonstrada de alterar implementação F1–F4, schema, testes, dependências ou lockfiles. O custo é a instalação adicional de dependências backend nesse runner; ele deve ficar explícito na revisão.

Alternativa mais ampla seria reorganizar o teste de contrato para uma etapa com ambos os projetos preparados, preservando todos os casos. Não recomendar remover o import, simular o schema, copiar sua lógica para o teste ou excluir a suíte: isso perderia a verificação de equivalência que motivou o teste.

Após aprovação da correção, validar em checkout limpo Linux com Node 24: instalações bloqueadas pelos lockfiles, teste reduzido com 51 casos e suíte completa com 619, lint, build e `npm audit --audit-level=high`. Depois, mediante autorização de publicação, conferir nova execução remota no SHA corrigido e ambos os jobs. O controle com link não substitui essa validação da futura alteração de workflow.

## 9. Evidências e estado final

Logs privados preservados em `.cache/ci_f4/`: `frontend_remoto.log`, `frontend_remoto_limpo.log`, `windows_node24.log`, `linux.log` (falha TLS) e `linux_ca.log` (reprodução e controle). A rodada inicial Node 25 está em `.cache/ci_f4_windows.log`. Scripts, arquivo de fontes e CAs públicas temporárias permanecem ignorados; tokens não foram salvos.

Estado final: branch `development/backend`, HEAD `5047f3d8ecf37b28201ad73ddb6637c98fed497d`, índice vazio; **somente este relatório novo fora do Git**. Os 71 arquivos do checkpoint F1–F4 foram novamente comparados por SHA-256 e preservados byte a byte. Nenhuma alteração de código, testes, workflow, dependências versionadas, flags ou infraestrutura. `git diff --check` aprovado. Sem commit, push, deploy, acesso a `patrimonio_guarulhos`, migrations, Compose normal ou nova execução remota. A correção aguarda revisão da causa demonstrada.
