# Visitação dos patrimônios no frontend

O normalizador compartilhado de lista, detalhe e cadastro administrativo repassa
`statusVisitacao`, `motivoRestricao` e `previsaoReabertura`. Registros antigos
assumem `NAO_INFORMADO`; mocks achatados continuam compatíveis.

## Exibição

| Status | Selo no card | Aviso no detalhe |
| --- | --- | --- |
| `TEMPORARIAMENTE_FECHADO` | Fechado | Temporariamente fechado para visitação |
| `ACESSO_PARCIAL` | Acesso parcial | Acesso parcial |
| `SEM_VISITACAO_PUBLICA` | Sem visitação pública | Sem visitação pública |
| `ABERTO`, `NAO_INFORMADO` ou ausente | Sem selo | Sem aviso |

O componente compartilhado usa Heroicons, tokens de cor e bordas do portal.
O selo ocupa o canto superior esquerdo da imagem e reserva espaço à direita
para o favorito ou o botão de fechar. O favorito dos cards tem alvo de 44 × 44 px.

O aviso fica junto ao título, sem substituir a conservação (inclusive Demolido).
O motivo é renderizado como texto React, sem HTML. A previsão é exibida somente
quando preenchida, com `YYYY-MM-DD` reorganizado para `DD/MM/YYYY`, sem `Date`
ou conversão de fuso.

## Editor

A seção Situação agrupa Conservação e Visitação. As restrições mostram motivo
e previsão opcionais. Motivo aceita até 2000 caracteres. Valores apagados são
enviados como `null`; selecionar Aberto ou Não informado limpa ambos no formulário
e na gravação. O POST/PATCH e as permissões seguem os fluxos existentes.

## Validação executada

```powershell
cd frontend
npm.cmd test -- --maxWorkers=2
npm.cmd run lint
npm.cmd run build
```

- 35 arquivos de teste e 661 testes aprovados.
- Lint e build aprovados; o build mantém avisos de tamanho de chunks e de import
  estático/dinâmico do editor.
- Cobertura de mapeamento de lista/detalhe, três restrições, registros antigos,
  ausência de selo em Aberto/Não informado, preservação de conservação,
  motivo literal, previsão vazia, preservação no formulário e limpeza com `null`.
- Chrome headless com backend integrado em modo demonstração exclusivo na porta
  3335 e frontend em 5173, nas resoluções 1440 × 1000, 390 × 844 e 320 × 740.
  Usado `espaco-imaginario-2-demo`, fictício e fechado por reforma, com data
  2027-03-15. Conferidos lista, detalhe, painel do mapa e editor.
- Clique/toque real no favorito, alvo de 44 px, ausência de sobreposição com
  selo e ausência de rolagem horizontal. Conferido também o selo longo
  Sem visitação pública e o detalhe sem previsão.
- Gravação pelo formulário real com a previsão apagada: API retornou `null`,
  mantendo o motivo e o status restrito.

O mapa foi conferido no modo sem chave Google, que compartilha o mesmo painel
selecionado. Não houve validação de tiles ou credenciais Google Maps. A inspeção
visual ocorreu em emulação de celular, sem aparelho físico.

As capturas e medições locais ficam em `.cache/visitacao-ui/` (ignorada pelo Git).
O backend e o frontend usados nesse teste foram temporários; nenhum arquivo
do backend foi modificado.

## Arquivos alterados

- `src/services/patrimoniosApi.js` e `src/features/visitacao.js`.
- `src/components/VisitacaoPatrimonio/VisitacaoPatrimonio.jsx` e `.css`.
- `src/components/FavoritoButton/FavoritoButton.css`.
- `src/features/mapa/PlaquetaCard.jsx`.
- `src/pages/Mapa/Mapa.jsx` e `Mapa.css`.
- `src/pages/PatrimonioDetalhe/PatrimonioDetalhe.jsx`.
- `src/features/admin/components/PatrimonioEditor.jsx` e `.css`.
- Testes `PlaquetaCard`, `MapaPatrimonios`, `PatrimonioDetalhe`,
  `AdminPatrimonios` e `visitacaoApi`.
- Este guia.
