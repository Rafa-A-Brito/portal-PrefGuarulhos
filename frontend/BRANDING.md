# Identidade visual — Portal do Patrimônio Cultural de Guarulhos

Este documento explica de onde vêm as cores, a fonte e as escalas de
tamanho usadas no front-end, e onde cada uma está declarada no código
(`src/styles/global.css`, tokens em `:root`). O objetivo é manter a
interface alinhada à identidade oficial da Prefeitura de Guarulhos
("Guarulhos, que faz e que cuida!"), em vez de uma paleta genérica.

## 1. Logotipo

- Arquivo: [`public/logo_guarulhos.png`](public/logo_guarulhos.png) — logo oficial
  fornecido pela Prefeitura, usado na Navbar (`src/components/Navbar/NavBar.jsx`)
  via `<img src="/logo_guarulhos.png" className="brand-logo" />`.
- Exibido em **34px de altura** sobre fundo branco (`.navbar { background: #fff }`),
  porque o wordmark "Guarulhos" do logo é impresso em navy escuro (`#2B255C`) e
  perde contraste sobre fundos escuros — por isso a barra de navegação é clara,
  diferente de versões anteriores do protótipo que usavam navbar navy.
- Ao lado do logo, um separador vertical (`.brand-sep`, 1px, `var(--line)`) e o
  texto secundário "Patrimônio Cultural" (`.brand-text`) identificam a sub-marca
  do projeto dentro do guarda-chuva da Prefeitura.
- Não distorcer, não recolorir, não aplicar sombras/efeitos sobre o logo oficial.

## 2. Paleta de cores

Fonte: brasão de Guarulhos ("Cores do brasão") + paleta complementar oficial da
marca "Guarulhos, que faz e que cuida!" ("Cores complementares"), com os valores
Pantone/CMYK/RGB/HEX fornecidos pela Prefeitura.

Todas as cores estão centralizadas como CSS custom properties em `:root`
(topo de `src/styles/global.css`), então qualquer ajuste de tom deve ser feito
ali — nunca com hex "solto" espalhado pelos componentes.

| Token CSS         | Hex       | Pantone | Origem                        | Uso principal                                                        |
| ------------------ | --------- | ------- | ------------------------------ | --------------------------------------------------------------------- |
| `--navy`           | `#2B255C` | 2738 C  | Brasão / wordmark do logo      | Navbar (texto ativo), footer, títulos de destaque, `--ink` de apoio   |
| `--navy-soft`      | `#3D3579` | —       | Variação clara do navy         | Estados hover sobre navy (uso pontual)                                |
| `--blue`           | `#3EA3DC` | 2985 C  | Complementar da marca          | Botões primários (Buscar, Contribua), links/ícones de destaque        |
| `--indigo`         | `#2B7FB3` | —       | Azul escurecido (não oficial)  | Hover/estado dos botões azuis (`--blue` ~15% mais escuro)             |
| `--green`          | `#1CA141` | 382 C   | Complementar da marca          | `--accent`: eyebrow, sublinhado do link ativo, dot da categoria "Ambiental" |
| `--olive`          | `#95B53D` | 375 C   | Brasão                         | Reserva de paleta (categorias/gráficos futuros)                       |
| `--yellow`         | `#FFD970` | 113 C   | Brasão                         | Reserva de paleta (categorias/gráficos futuros)                       |
| `--orange`         | `#FAB748` | 143 C   | Brasão                         | Dot da categoria "Religioso" nos cards de destaque                    |
| `--orange-dark`    | `#F39433` | 1495 C  | Brasão                         | Reserva de paleta / variação mais saturada do laranja                 |
| `--accent`          | = `--green` | 382 C | Complementar da marca          | Alias semântico usado no CSS para "cor de destaque" (ver acima)       |
| `--accent-dark`     | `#158534`  | —      | Verde escurecido (não oficial) | Hover de elementos que usam `--accent`                                |
| `--gray` / `--line` | `#E2E5EA`  | —      | Neutro (não faz parte do brasão) | Bordas, divisores, skeleton loading                                 |
| `--paper`           | `#F7F8FA`  | —      | Neutro                        | Fundo geral da página (fora do hero)                                  |
| `--ink`             | `#171331`  | —      | Derivado do navy               | Cor de texto padrão do corpo                                          |
| `--ink-soft`        | `#5B6472`  | —      | Neutro                        | Texto secundário (legendas, metadados, parágrafos de apoio)           |

Notas:

- `--indigo` e `--accent-dark` **não** vêm da tabela oficial — são variações
  calculadas (mais escuras) de `--blue` e `--green` só para estados de
  `:hover`, já que a paleta fornecida não define tons de interação.
- As categorias de patrimônio (Histórico / Ambiental / Religioso) usam,
  respectivamente, `--blue`, `--green` e `--orange` como "dot" de identificação
  nos cards de destaque (`.destaque-badge.cat-*::before`), em vez do antigo
  esquema arco-íris de pastéis — mais alinhado à paleta oficial e mais fácil de
  ler como sistema.
- `--yellow`, `--olive` e `--orange-dark` estão declaradas mas ainda não têm um
  uso fixo na Home — ficam disponíveis para novas categorias, gráficos ou
  estados (ex.: "em análise", "não catalogado") sem inventar cores novas.

## 3. Tipografia

A identidade oficial usa **Clan Pro** (Bold para títulos/wordmark, Regular para
texto de apoio) — é uma fonte comercial (FontFont/Linotype), não distribuída
pelo Google Fonts e sem licença web confirmada para este projeto. Em seu lugar,
o front usa **[Poppins](https://fonts.google.com/specimen/Poppins)**, importada
via Google Fonts no topo de `global.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap");
```

Poppins foi escolhida por ser a fonte gratuita mais próxima do Clan Pro:
geométrica, com terminações levemente arredondadas e a mesma sensação
"amigável, porém institucional" do logo — ao contrário de uma sans neutra tipo
Inter/Helvetica, que achataria a personalidade da marca.

- **Peso 700/800 (Bold)** → títulos, wordmark, CTAs — equivalente ao "Clan Pro Bold".
- **Peso 400/500 (Regular/Medium)** → parágrafos, textos de apoio, navegação — equivalente ao "Clan Pro Regular".
- Toda a aplicação herda a fonte a partir de `body { font-family: "Poppins", system-ui, -apple-system, sans-serif; }`; não é preciso declarar `font-family` em cada componente.

Se no futuro a Prefeitura ceder os arquivos `.woff2` do Clan Pro com licença de
uso web, basta trocar o `@import` por um bloco `@font-face` e o `font-family`
em `body` — o restante do CSS (pesos, tamanhos) não muda.

## 4. Escala tipográfica

| Elemento                                   | Tamanho                    | Peso | Onde                                                        |
| ------------------------------------------- | --------------------------- | ---- | ------------------------------------------------------------ |
| H1 — headline do Hero                       | `clamp(26px, 4vw, 42px)`    | 700  | `.hero h1`                                                    |
| H1 — título de página interna               | `clamp(24px, 3.4vw, 32px)`  | 700  | `.page-hero h1`                                                |
| H2 — título de seção ("Destaques" etc.)     | `22px`                      | 700  | `.section-head h2`                                             |
| H3 — título de card (destaque/plaqueta)     | `14–15px`                   | 600–700 | `.destaque-body h3`, `.plaqueta-body h3`                    |
| Eyebrow (rótulo acima do H1)                | `11.5px`, versalete, `0.14em` tracking | 600 | `.eyebrow`                                    |
| Corpo de texto (lede, resumos)              | `13–14.5px`                 | 400  | `.hero .lede`, `.destaque-fav`, resumos de card                |
| Navegação (Navbar)                          | `14px`                      | 500 (700 no item ativo) | `.navbar-nav a`                                    |
| Botões (Buscar, Contribua)                  | `13–13.5px`                 | 600–700 | `.searchbar button`, `.navbar-cta`                           |
| Badge/label (categoria, número de tombamento) | `10–11px`, versalete       | 600–700 | `.destaque-badge`, `.plaqueta-body .num`                     |
| Texto auxiliar (bairro, legendas, footer)   | `11–12.5px`                 | 400–600 | `.destaque-bairro`, `.footer-col a`                           |

Regras gerais (`global.css`, topo do arquivo):

- `h1, h2, h3, h4 { font-weight: 700; letter-spacing: -0.015em; }` — todos os
  títulos partem desse padrão; tamanhos específicos são definidos por seletor.
- Texto de corpo não tem `letter-spacing` customizado (só títulos/eyebrows).

## 5. Outros tokens de UI

| Token              | Valor                                              | Uso                                   |
| ------------------- | --------------------------------------------------- | -------------------------------------- |
| `--radius-card`     | `12px`                                              | Raio padrão de cards, inputs, botões maiores |
| `--shadow-plaque`   | `0 1px 0 rgba(43,37,92,.04), 0 4px 14px rgba(43,37,92,.08)` | Sombra discreta (tingida de navy) para cards e barras flutuantes |
| `--container`       | `1180px`                                            | Largura máxima do conteúdo centralizado |

Sombras e gradientes fortes/animados foram deliberadamente evitados (ver
histórico de commits) — a interface usa cor sólida + borda fina (`var(--line)`)
como principal forma de separar elementos, em vez de glow ou gradiente animado,
para reforçar uma leitura "institucional e tecnológica", não "gerada por IA".
