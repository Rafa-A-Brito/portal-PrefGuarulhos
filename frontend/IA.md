# IA — Mapeamento de tendências culturais com Gemini

Este documento descreve a proposta de implementação do módulo de inteligência
artificial do Portal do Patrimônio Cultural de Guarulhos utilizando a **Gemini
API**, da Google.

O objetivo é identificar quais patrimônios, categorias e exposições estão
"em alta" a partir dos dados reais de engajamento e utilizar o Gemini para
analisar esses dados, gerar explicações em linguagem natural e auxiliar o
administrador no painel `/admin`.

A IA não deve substituir o cálculo dos indicadores. O sistema primeiro coleta
e calcula os dados de engajamento de forma determinística e, depois, envia
somente os dados necessários ao Gemini para interpretação.

A implementação deve ser incremental e compatível com a arquitetura atual do
projeto.

---

## 1. Por que isso importa

Hoje o `PatrimoniosProvider` já calcula `estatisticas` (total de bens, total
de categorias) — dado agregado, mas estático: não diz quais patrimônios as
pessoas mais visitam, buscam ou favoritam.

Um módulo de tendências resolve duas necessidades:

- **Para o visitante público** — a seção "Destaques"
  (`.destaques-carousel`, já existente na Home) pode refletir os patrimônios
  com maior engajamento recente.
- **Para o admin** — o painel `/admin` pode apresentar os patrimônios em alta,
  a variação do engajamento e uma explicação gerada pelo Gemini para facilitar
  a interpretação dos dados.

O Gemini entra principalmente como camada de **análise e explicação**, e não
como fonte dos números.

---

## 2. De onde vêm os dados (sinais de engajamento)

Nenhum desses sinais existe ainda de forma completa no código atual —
precisam ser instrumentados primeiro.

| Sinal | Onde capturar | Esforço |
| --- | --- | --- |
| Visualização de página de detalhe | `PatrimonioDetalhe` (`/patrimonios/:id`) | Baixo |
| Clique em card na Home/carousel | `.destaque-card` (`onClick`) | Baixo |
| Seleção no mapa | `mapa-sidebar-item` / marcador no `Mapa.jsx` | Baixo |
| Favoritar | `.destaque-fav` | Baixo |
| Termo buscado | Input de busca / `.mapa-search` | Baixo |
| Tempo de permanência | `document.visibilitychange` + timestamp | Médio |
| Menções externas | API externa | Alto — opcional |

Cada evento pode ser enviado para o backend:

```http
POST /eventos
Content-Type: application/json

{
  "tipo": "visualizacao",
  "patrimonioId": "2",
  "timestamp": "..."
}
```

No protótipo com `json-server`, pode existir uma coleção `eventos` no
`db.json`. Na implementação real, os eventos devem ser persistidos pelo
backend no **Neon DB/PostgreSQL**.

O frontend não deve acessar o Neon diretamente.

---

## 3. Do dado bruto ao "em alta"

### Fase 1 — Score sem IA

Antes de utilizar o Gemini, calcular um score ponderado simples:

```text
score(patrimonio) =
    3 × visualizações_7d
  + 5 × favoritos_7d
  + 2 × cliques_no_mapa_7d
  + 4 × aparições_em_busca_7d
```

O score é calculado pelo sistema e permanece reproduzível e explicável.

Ordenar os patrimônios por esse score já permite identificar o que está em
alta na semana e fornece uma base para a análise posterior do Gemini.

### Fase 2 — Tendência por variação

"Em alta" não significa apenas "mais visto".

Um patrimônio pode possuir muitas visualizações de forma estável há meses,
sem apresentar crescimento recente.

Por isso:

```text
tendencia(patrimonio) =
    score_semana_atual / média(score_últimas_4_semanas)
```

Valores maiores que `1` indicam crescimento em relação à média anterior.

A classificação deve continuar sendo calculada pelo sistema. O Gemini não deve
inventar o score nem decidir sozinho se um patrimônio está em alta.

### Fase 3 — Análise com Gemini

Depois que existirem dados históricos suficientes, o backend poderá enviar ao
Gemini um conjunto reduzido de informações já calculadas.

Exemplo:

```json
{
  "periodo": "últimos 7 dias",
  "patrimonios": [
    {
      "id": "2",
      "nome": "Estação Ferroviária",
      "categoria": "Patrimônio Histórico",
      "scoreAtual": 184,
      "media4Semanas": 121,
      "variacao": 1.52,
      "visualizacoes": 143,
      "favoritos": 18,
      "cliquesMapa": 11
    }
  ]
}
```

O Gemini pode então produzir uma análise com:

- resumo da tendência;
- principais sinais que contribuíram para o crescimento;
- possíveis interpretações do comportamento;
- texto curto para exibição no painel administrativo.

O Gemini deve tratar os valores recebidos como dados de entrada e não deve
alterá-los.

---

## 4. Implementação do Gemini

### 4.1 SDK

A integração deve utilizar o SDK oficial atual da Google para JavaScript:

```bash
npm install @google/genai
```

A API atual disponibiliza o pacote `@google/genai` para aplicações
JavaScript/Node.js e suporta respostas estruturadas em JSON.

Documentação oficial:

- https://ai.google.dev/gemini-api/docs/get-started
- https://ai.google.dev/gemini-api/docs/structured-output

### 4.2 Onde o Gemini deve ficar

A chamada ao Gemini deve ocorrer **no backend**, nunca diretamente nos
componentes React.

Fluxo:

```text
React
  ↓
Backend / API
  ↓
Serviço Gemini
  ↓
Gemini API
```

Quando houver dados persistidos:

```text
React
  ↓
Backend / API
  ↓
Neon DB / PostgreSQL
  ↓
Dados de engajamento
  ↓
Serviço Gemini
  ↓
Análise
```

O frontend recebe somente o resultado necessário para a interface.

### 4.3 Chave da API

A chave do Gemini deve permanecer exclusivamente no ambiente do backend.

Exemplo:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

O nome do modelo deve ficar configurável pelo backend para evitar acoplar a
aplicação a um modelo específico.

Nunca colocar a chave em:

- `VITE_*`;
- arquivos dentro de `src/`;
- componentes JSX;
- Context API;
- hooks;
- `public/`;
- código enviado ao navegador;
- Git.

### 4.4 Serviço dedicado

A integração deve ficar isolada em um serviço do backend, por exemplo:

```text
backend/
└── src/
    └── services/
        └── geminiService.js
```

O nome e a localização devem ser adaptados à estrutura real do backend antes
da implementação.

Responsabilidades do serviço:

1. receber somente os dados necessários;
2. montar o prompt;
3. enviar a solicitação ao Gemini;
4. validar a resposta;
5. retornar o resultado para a camada de negócio;
6. tratar erros da API;
7. registrar informações úteis para monitoramento sem expor a chave.

---

## 5. Prompt da análise de tendências

O prompt deve deixar claro que o Gemini está analisando dados fornecidos pelo
sistema.

Exemplo conceitual:

```text
Você é o assistente de análise do Portal do Patrimônio Cultural de Guarulhos.

Analise os dados de engajamento fornecidos pelo sistema.

Regras:
- Não invente números.
- Não altere os valores recebidos.
- Não crie patrimônios que não estejam na entrada.
- Baseie a explicação somente nos dados fornecidos.
- Diferencie crescimento de alto volume absoluto.
- Seja objetivo.
- Gere uma explicação adequada para um administrador público.

Dados:
[JSON dos patrimônios e indicadores]
```

O prompt deve permanecer no backend.

Não é necessário enviar ao Gemini todos os eventos individuais. Sempre que
possível, o backend deve enviar dados agregados.

---

## 6. Resposta estruturada

Quando a resposta precisar ser consumida pelo código, preferir uma resposta
estruturada em JSON em vez de depender de texto livre.

Exemplo de estrutura esperada:

```json
{
  "resumo": "A Estação Ferroviária apresentou crescimento de engajamento.",
  "patrimonios": [
    {
      "patrimonioId": "2",
      "tendencia": "alta",
      "motivo": "O score atual está acima da média das últimas quatro semanas.",
      "variacao": 1.52
    }
  ]
}
```

A estrutura deve ser validada no backend antes de ser enviada ao frontend.

O Gemini oferece suporte a saídas estruturadas com JSON Schema, o que reduz a
dependência de interpretar respostas textuais manualmente.

---

## 7. Controle de consumo e créditos

O projeto deve controlar explicitamente o uso da Gemini API.

A análise de tendências não deve chamar o Gemini:

- a cada renderização do React;
- a cada abertura da Home;
- a cada mudança de estado visual;
- repetidamente para o mesmo conjunto de dados;
- para cada evento individual de navegação.

Estratégia:

```text
Eventos
   ↓
Agregação
   ↓
Score
   ↓
Análise Gemini
   ↓
Resultado armazenado/cacheado
   ↓
Frontend
```

### Regras de economia

- Agrupar vários patrimônios em uma única análise.
- Enviar dados agregados, não todo o histórico bruto.
- Reutilizar uma análise enquanto os dados não mudarem de forma relevante.
- Executar a análise em intervalos controlados.
- Evitar chamadas duplicadas.
- Definir limite de tamanho dos dados enviados.
- Registrar quantidade de chamadas realizadas.
- Registrar erros e tempo de resposta.
- Manter o modelo configurável pelo backend.
- Não usar Gemini para cálculos que podem ser feitos pelo código.

---

## 8. Gemini não substitui o cálculo do sistema

A divisão de responsabilidades deve permanecer clara.

### Código/backend

Responsável por:

- contar visualizações;
- contar favoritos;
- contar cliques;
- calcular scores;
- calcular médias;
- calcular variações;
- filtrar períodos;
- ordenar patrimônios;
- validar os dados.

### Gemini

Responsável por:

- interpretar os indicadores;
- produzir uma explicação em linguagem natural;
- resumir tendências;
- classificar uma situação dentro de categorias previamente definidas;
- auxiliar o administrador na leitura dos dados.

Isso evita utilizar IA para operações matemáticas simples e reduz custo e
possibilidade de inconsistência.

---

## 9. Onde isso aparece na interface

### Home / carousel de destaques

Ordenar `.destaques-track` usando o resultado do sistema.

Adicionar um selo visual reaproveitando o padrão de `.novidade-tag`:

```text
Em alta
```

O texto exibido ao visitante deve ser baseado nos indicadores calculados e não
em uma afirmação inventada pelo modelo.

### Painel `/admin`

O painel pode apresentar:

- patrimônio;
- score atual;
- média das últimas semanas;
- variação;
- principais sinais de engajamento;
- resumo gerado pelo Gemini;
- data da última análise.

Exemplo:

```text
Estação Ferroviária

Score atual: 184
Variação: +52%

Análise:
O patrimônio apresentou crescimento de engajamento em relação à
média das últimas quatro semanas, principalmente pelas visualizações
e interações no mapa.
```

### ConhecaMais

A mesma estrutura pode futuramente ser utilizada para exposições e artistas,
desde que existam eventos e indicadores correspondentes.

---

## 10. Privacidade e segurança

Eventos de navegação não devem carregar dados pessoais identificáveis sem
necessidade.

Um `sessionId` anônimo pode ser utilizado para diferenciar sessões sem
associar o comportamento a uma identidade pessoal.

Também devem ser evitados no prompt do Gemini:

- nome de usuários;
- e-mails;
- senhas;
- tokens;
- cookies;
- identificadores pessoais desnecessários;
- dados administrativos que não sejam necessários para a análise.

O backend deve enviar somente o conjunto mínimo de dados necessário para a
tarefa.

---

## 11. Neon DB e Gemini

Quando o projeto migrar do `json-server` para o Neon DB:

```text
React
  ↓
Backend
  ├── Neon DB → eventos e indicadores
  │
  └── Gemini API → análise dos indicadores
```

O Gemini não deve acessar o Neon DB diretamente.

O backend consulta o banco, prepara os dados e decide exatamente o que será
enviado ao modelo.

Isso permite:

- controlar os dados enviados;
- reduzir o volume do prompt;
- proteger informações do banco;
- aplicar regras de autorização;
- armazenar o resultado da análise;
- controlar o consumo da API.

---

## 12. O que não fazer

Não:

- colocar `GEMINI_API_KEY` no frontend;
- chamar o Gemini diretamente de `Patrimonios.jsx`;
- colocar a chave em `.env` com prefixo `VITE_`;
- enviar todos os eventos brutos sem necessidade;
- usar IA para calcular o score;
- confiar em números produzidos pelo modelo;
- criar endpoints ou tabelas sem verificar o backend atual;
- substituir o Neon DB por outro banco;
- criar uma nova arquitetura de pastas sem necessidade;
- adicionar outra biblioteca de IA sem solicitação;
- fazer chamadas ao Gemini em loops ou renderizações;
- considerar uma resposta do Gemini como verdade absoluta.

---

## 13. Implementação incremental

A implementação deve seguir esta ordem:

### Etapa 1 — Eventos

1. Criar a estrutura de `eventos`.
2. Registrar visualização de patrimônio.
3. Registrar clique em destaque.
4. Registrar interação relevante no mapa.
5. Validar os eventos.

### Etapa 2 — Indicadores

1. Calcular visualizações por período.
2. Calcular favoritos.
3. Calcular cliques no mapa.
4. Calcular score.
5. Calcular variação em relação às semanas anteriores.

### Etapa 3 — Backend Gemini

1. Verificar a estrutura atual do backend.
2. Instalar `@google/genai`.
3. Criar o serviço do Gemini na estrutura real do backend.
4. Configurar `GEMINI_API_KEY`.
5. Configurar `GEMINI_MODEL`.
6. Criar o prompt.
7. Enviar somente os indicadores agregados.
8. Validar a resposta estruturada.
9. Tratar erros e indisponibilidade da API.

### Etapa 4 — Cache e controle

1. Evitar análises duplicadas.
2. Armazenar ou cachear o resultado.
3. Definir quando uma nova análise deve ocorrer.
4. Registrar chamadas e falhas.
5. Monitorar o consumo.

### Etapa 5 — Interface

1. Exibir os indicadores no `/admin`.
2. Exibir a análise do Gemini.
3. Integrar os destaques da Home.
4. Adicionar o selo "Em alta".
5. Testar o comportamento quando a API estiver indisponível.

---

## 14. Próximo passo concreto

O menor incremento útil para começar a implementação é:

1. manter os eventos e o score independentes do Gemini;
2. verificar a estrutura atual do backend;
3. configurar `GEMINI_API_KEY` somente no backend;
4. instalar `@google/genai` no backend;
5. criar um serviço dedicado para o Gemini;
6. criar uma rota interna para solicitar a análise;
7. enviar ao Gemini somente um conjunto pequeno de indicadores;
8. validar a resposta;
9. retornar o resultado ao `/admin`;
10. depois adicionar cache e controle de consumo.

A implementação deve ser feita por etapas, preservando a estrutura existente e
confirmando qualquer mudança de fluxo, banco, autenticação ou arquitetura antes
de aplicá-la.
