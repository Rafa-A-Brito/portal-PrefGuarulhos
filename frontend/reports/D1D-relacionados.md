# D1D — patrimônios relacionados no detalhe público

Implementação sobre o commit `55ec1b90d759cc621cf87668dbe48fc49cf26ff0`, com working tree inicialmente limpo. Alterações restritas ao frontend, seus testes, smoke e este relatório. Banco real não acessado.

## Resultado

A página `PatrimonioDetalhe` apresenta a seção **Patrimônios relacionados** somente quando há ligações válidas. Cada card contém o nome do destino, texto editorial e link **Conhecer patrimônio** para `/patrimonios/<destino.slug>`. A sequência recebida da API é preservada, sem ordenação, relações inversas ou consulta à listagem para resolver destinos.

O normalizador antes descartava `ligacoes`; agora preserva o array público. A implementação antiga procurava o destino comparando o ID da ligação com IDs da listagem e navegava por esse ID. Foi substituída pelo componente `PatrimoniosRelacionados`. O bloco que deduzia sugestões pela categoria também foi removido, conforme a regra de não recalcular relações no frontend. O bloco legado “Em resumo”, baseado em `fatos`, não é renderizado nesta etapa.

Itens com destino ausente, nome vazio/inválido ou slug inválido são ignorados. O componente também trata coleção malformada e texto editorial ausente/inválido sem quebrar a ficha. Slugs devem seguir o formato público alfanumérico em minúsculas, separado por hífens, com até 220 caracteres; não há fallback para UUID, ID numérico ou nome. Se nenhum item for válido, não há seção vazia. Texto editorial é renderizado como texto React, sem HTML executável.

## Contrato consumido

`GET /api/patrimonios/:slug`, através de `buscarPatrimonioPorId` e `normalizarPatrimonio` existentes:

```js
{
  ligacoes: [
    {
      id: "UUID da ligação", // somente chave interna de renderização
      ordem: 0,              // frontend preserva a sequência, não reordena
      texto: "Texto editorial da relação",
      destino: {
        id: "UUID do destino", // não exibido nem usado na navegação
        slug: "slug-publico-do-destino",
        nome: "Nome do patrimônio"
      }
    }
  ]
}
```

O contrato foi conferido no select público do backend atual: destinos filtrados pelo backend e relações já ordenadas editorialmente. Nenhuma mudança de contrato/backend foi necessária. Os testes passam pela normalização real e funcionam com Context/listagem vazios, inclusive ao navegar entre fichas. Nenhuma ligação é usada para mapa, endereço ou rota; `fatos` não é consumido.

## Arquivos

| Situação | Caminho relativo a frontend/ | Função |
| --- | --- | --- |
| Alterado | `src/services/fakeApi.js` | Preserva `ligacoes` na normalização |
| Alterado | `src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx` | Integra a seção e remove blocos legados de relações inferidas/fatos |
| Criado | `src/pages/PatrimonioDetalhe/PatrimoniosRelacionados.jsx` | Validação de apresentação e cards editoriais |
| Criado | `src/pages/PatrimonioDetalhe/PatrimoniosRelacionados.css` | Estilo isolado, responsivo e foco visível |
| Alterado | `test/PatrimonioDetalhe.test.jsx` | Contrato, navegação e regressões da página completa |
| Criado | `test/PatrimoniosRelacionados.test.jsx` | Estados vazios/inválidos, ordem, teclado e conteúdo |
| Criado | `scripts/smoke-relacionados.mjs` | Smoke reproduzível com Chrome e API simulada |
| Criado | `reports/D1D-relacionados.md` | Este relatório |

## Layout e acessibilidade

Cards discretos com borda, cores da identidade atual, grid adaptável e texto com quebra de linha. A seção usa `section` nomeada por `h2`, lista semântica, títulos `h3` e links nativos. O nome acessível de cada link inclui “Conhecer patrimônio” e o nome do destino. Ícones são decorativos, sem UUIDs visíveis.

Os links têm altura mínima de 44 px, sublinhado e foco `:focus-visible` com contorno de 3 px. Contraste calculado a partir dos tokens CSS: navy `#2b255c` sobre paper `#f7f8fa` = 12,99:1; texto `#171331` sobre o mesmo fundo = 16,83:1. Smoke confirmou foco visível e navegação por Tab/Enter no navegador. Não se trata de uma auditoria completa de acessibilidade do portal.

## Validação

Executado na pasta `frontend`:

| Verificação | Resultado |
| --- | --- |
| `npm test -- test/PatrimoniosRelacionados.test.jsx test/PatrimonioDetalhe.test.jsx test/rota.test.js` | 102 aprovados em 3 arquivos |
| `npm test` | 220 aprovados em 11 arquivos |
| `npm run lint` | Aprovado |
| `npm run build` | Aprovado |
| `git diff --check` | Aprovado |
| `node scripts/smoke-relacionados.mjs` | Aprovado em 1440, 390 e 320 px |

O build emitiu aviso de bundle minificado acima de 500 kB (bundle principal aproximadamente 612 kB, 172 kB gzip), sem erro. Não foi alterada a estratégia de divisão do bundle nesta etapa.

Cobertura específica: sem ligações, uma/múltiplas, ordem da API mesmo com campo `ordem` fora de sequência, destinos inválidos intercalados, texto editorial, slug na URL e na requisição de detalhe, ausência de UUID visível, ausência de sugestão por categoria, nenhuma inversa gerada, segurança de renderização textual, teclado e nenhum consumo de fatos. Regressões cobrem referências, endereço separado, rota do bem atual, seleção no mapa e todos os casos C3 sem rota/sem endereço.

## Smoke e capturas

Página real, backend simulado por middleware local do Vite e listagem vazia. Nenhuma API real ou banco acessado. Verificações: cards e textos esperados, ordem, item inválido omitido, referências presentes, navegação por slug usando Enter, destino sem ligações sem seção vazia, foco visível e ausência de overflow horizontal. Zero exceções JavaScript.

A primeira tentativa no sandbox expirou ao habilitar Runtime do Chrome. A repetição autorizada fora do sandbox passou. O script usa janela oculta, perfil temporário próprio e encerra o navegador/servidor ao terminar.

- [Desktop 1440 px](../../.cache/d1d-smoke/relacionados-1440.png)
- [Mobile 390 px](../../.cache/d1d-smoke/relacionados-390.png)
- [Mobile 320 px](../../.cache/d1d-smoke/relacionados-320.png)
- [Resultado estruturado](../../.cache/d1d-smoke/resultado.json)

Capturas desktop/320 px também inspecionadas visualmente. Evidências em `.cache/d1d` e `.cache/d1d-smoke`, ignoradas pelo Git; não são incorporadas ao código-fonte. O script reproduzível permanece versionável em `frontend/scripts`.

## Preservação

Comparação de hashes dos 581 arquivos versionados no início: somente os três arquivos existentes listados acima foram alterados. Backend inteiro, schema, migrations, seed, sincronização, importador editorial, manifesto D1C, fonte canônica e todos os arquivos de `frontend/src/features/mapa` permaneceram idênticos. Política C3 preservada. Nenhuma escrita nem consulta ao banco nesta etapa. Gestão administrativa de ligações não iniciada.

D1D CONCLUÍDA

LIGAÇÕES EXIBIDAS NO FRONTEND
