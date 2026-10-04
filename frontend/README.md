## 📁 Estrutura de Pastas e Arquitetura

O projeto adota os princípios de **Clean Architecture**, **Desacoplamento de Camadas** e **Organização por Domínio (Feature-based)**. Abaixo está a especificação da árvore de diretórios e a responsabilidade de cada pasta no Frontend e no Backend.

---

### 🎨 Frontend

Estruturado com foco na separação por funcionalidades (features), reutilização de componentes visuais, roteamento centralizado e isolamento de integrações externas.

```text
src/
├── assets/                 # Mídias estáticas importadas via JS/JSX
├── components/             # Componentes globais e reutilizáveis (ex: Navbar)
├── features/               # Módulos principais isolados por regra de negócio
│   └── mapa/               # Feature: Mapa Interativo de Patrimônios
│       ├── components/     # Componentes específicos do mapa (FiltroBar, Cards, etc.)
│       ├── mocks/          # Dados simulados e mocks da feature de mapa
│       └── styles/         # Estilos específicos da feature
├── pages/                  # Views e páginas mapeadas pelo roteamento da aplicação
│   ├── Inicio/
│   └── Mapa/
├── services/               # Configuração da API e chamadas HTTP desacopladas (api.js)
├── styles/                 # Estilos globais e compartilhados do projeto (global.css)
├── App.css                 # Estilos do componente raiz
├── App.jsx                 # Componente raiz e definição das rotas principais
├── index.css               # Estilos base e resets gerais
└── main.jsx                # Ponto de entrada do React com Vite
```

| Diretório / Pasta | Responsabilidade Principal | Exemplos de Arquivos |
| :--- | :--- | :--- |
| `src/assets/` | Armazena mídias estáticas importadas diretamente nos arquivos JS/JSX. | `logo-guarulhos.svg`, `hero-banner.png` |
| `src/components/` | Concentra componentes genéricos e compartilhados por múltiplas partes do sistema. | `Navbar.jsx`, `Navbar.css` |
| `src/features/mapa/` | Agrupa a lógica, componentes, estilos e dados simulados (mocks) exclusivos do Mapa. | `MapaPatrimonios.jsx`, `patrimoniosMock.json`, `mapa.css` |
| `src/pages/` | Declara as páginas principais que funcionam como contêineres de rotas. | `Inicio.jsx`, `Mapa.jsx` |
| `src/services/` | Centraliza a instância do Axios e as configurações de integração HTTP com a API. | `api.js` |
| `src/styles/` | Contém regras de estilo CSS globais aplicadas em toda a aplicação. | `global.css` |
| `src/App.jsx` | Define a estrutura base do layout e o gerenciamento das rotas principais. | `App.jsx` |
---
