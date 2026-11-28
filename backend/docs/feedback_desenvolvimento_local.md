# Feedback no desenvolvimento local

Perfil preparado em 27/11/2026 para esta máquina. Use os comandos `dev:feedback` nos terminais do VS Code. Os comandos `dev` originais e os `.env` habituais foram preservados; eles continuam sem ativar Feedback.

## Diagnóstico e destino

O `frontend/.env.local` não tinha `VITE_FEEDBACK_ATIVO`; o `backend/.env` não tinha as flags de recebimento/consulta, origem, transporte, aviso e chave HMAC de Feedback. A ausência desativa a funcionalidade intencionalmente.

O banco habitual `localhost:5432/patrimonio_guarulhos` foi consultado em transação READ ONLY. A tabela existe, mas a conexão usa um papel com superusuário, criação de bancos/papéis e BYPASSRLS. Não foi comprovado que esse banco é exclusivo; nenhuma configuração ou dado dele foi alterado. A mera presença da tabela não valida os privilégios necessários.

O perfil de Feedback utiliza exclusivamente o banco já preparado pelas etapas anteriores:

| Item | Destino |
| --- | --- |
| PostgreSQL | 18.6, `127.0.0.1:5558`, banco `portal_test` |
| Identificador do cluster | `7712578530882550764` |
| Dados existentes | `.cache/fb_int_1/pgdata` |
| API | `http://127.0.0.1:3358`, papel `portal_api` |
| Frontend | `http://127.0.0.1:5238` |

O iniciador permanente `backend/scripts/feedback_local.cjs` não importa scripts temporários. Confere identidade, diretório, migrations/checksums e privilégios em READ ONLY antes de iniciar a aplicação. Recusa destinos diferentes, papel administrativo e permissões UPDATE/DELETE nas tabelas de Feedback. A credencial administrativa local é utilizada somente para inspeção e backup; a API recebe apenas a conexão restrita.

**Não apagar `.cache/fb_int_1/pgdata`: esse diretório contém o banco persistente reutilizado.** Não foi movido para preservar os procedimentos e backups existentes. Uma eventual migração de diretório é uma operação separada. Os scripts não criam banco, aplicam migrations, seeds, permissões ou resets.

## Iniciar no VS Code

Use **cmd.exe** e Node compatível com as dependências instaladas. Os comandos abaixo foram exercitados com o Node 25.9.0 disponível no PATH. Não é necessário instalar dependências.

A validação complementar [FB-INT-3.1](../../reports/feedback_integracao_fb_int_3_1.md) também exercitou o perfil com **Node.js 24.22.1**, incluindo início/parada do banco, conferência, backup, API e Vite. Para usar essa instalação local sem alterar o Node global, a partir da raiz do repositório:

```bat
.cache\d4_final\node24\node.exe backend\scripts\feedback_local.cjs banco
.cache\d4_final\node24\node.exe backend\scripts\feedback_local.cjs api
```

Em outro terminal, use o mesmo executável com `backend\scripts\feedback_local.cjs frontend`. Os subcomandos `conferir`, `backup` e `parar` também aceitam essa execução direta; equivalem às ações dos scripts npm abaixo.

No terminal do backend, a partir da raiz do repositório:

```bat
cd backend
npm run feedback:banco
npm run feedback:conferir
npm run feedback:backup
npm run dev:feedback
```

`feedback:banco` inicia somente o cluster identificado ou confere aquele que já estiver iniciado. O backup custom é salvo em `.secrets/feedback_local/backups`, ignorado pelo Git. Faça backup antes de novas sessões de gravação; nenhum desses comandos restaura ou limpa dados.

Em outro terminal, também a partir da raiz:

```bat
cd frontend
npm run dev:feedback
```

Abra **http://127.0.0.1:5238/contato**. Use exatamente `127.0.0.1`, não `localhost`: a origem pública precisa coincidir com Host e Origin. Para os indicadores, entre em `/admin/login` e acesse `/admin` ou `/admin/feedback` com ADMIN. As credenciais sintéticas existentes estão somente em `.secrets/feedback_local/acesso_local.env`; não as copie para Git ou mensagens. EDITOR continua sem acesso ao Feedback administrativo.

O frontend conserva HMR do Vite. Para recarregar alterações do backend ou variáveis, encerre e execute `npm run dev:feedback` novamente. Ambos os servidores escutam somente em loopback. O perfil não altera o servidor de produção nem a autenticação global; usa a mesma aplicação e o mesmo worker de acesso do início habitual. A consulta e o recebimento não dependem de mocks.

Para encerrar, Ctrl+C nos dois terminais e, no backend:

```bat
npm run feedback:parar
```

O comando confere o destino antes de parar somente esse cluster. Para voltar ao ambiente habitual, use os comandos `npm run dev` originais; eles continuam carregando seus arquivos anteriores.

## Arquivos locais e variáveis

Estão preparados e ignorados pelo Git:

- `backend/.env.feedback.local`: configuração completa do processo API, com conexão restrita e segredos próprios do ambiente sintético.
- `frontend/.env.feedback.local`: somente variáveis públicas e destino do proxy.
- `.secrets/feedback_local/config.json`: identidade fixada, localização do PostgreSQL/dados e credencial privada de inspeção/backup.
- `.secrets/feedback_local/acesso_local.env`: acesso sintético já existente.

Os iniciadores carregam explicitamente esses arquivos, isolam variáveis herdadas de outros terminais e não mesclam o `.env` habitual. Não copie a configuração administrativa para o frontend. Os arquivos privados não acompanham um clone; os comandos recusam iniciar se estiverem ausentes. O perfil é deliberadamente vinculado ao cluster exclusivo desta máquina, e não um provisionador genérico.

| Processo | Configuração necessária neste perfil |
| --- | --- |
| Vite | `VITE_FEEDBACK_ATIVO=true`, `VITE_API_BASE_URL=http://127.0.0.1:3358/api`, `FEEDBACK_PROXY_TARGET=http://127.0.0.1:3358`, `VITE_METRICAS_ATIVAS=false` |
| API | `NODE_ENV=development`, `MOCK_DATA=false`, `PORT=3358`, `CORS_ORIGIN=http://127.0.0.1:5238`, `TRUST_PROXY_IPS` vazio |
| Feedback API | `FEEDBACK_RECEBIMENTO_ATIVO=true`, `FEEDBACK_CONSULTA_ATIVA=true`, `FEEDBACK_ORIGEM=http://127.0.0.1:5238`, `FEEDBACK_TRANSPORTE=http-local`, `FEEDBACK_AVISOS_ACEITOS=feedback-v1` |
| Somente backend | `DATABASE_URL` restrita, `JWT_SECRET`, `AUTH_SECURITY_SECRET`, `FEEDBACK_CHAVE_ATUAL`, `FEEDBACK_CHAVES_JSON` com segredo HMAC próprio de 32 bytes representados por 64 caracteres hexadecimais |

O cliente público usa `/api/feedback`, não `VITE_API_BASE_URL`. Por isso o destino do proxy também é necessário; o iniciador o exporta no processo Vite. `VITE_API_BASE_URL` atende o cliente administrativo. Métricas ficam desativadas neste perfil, independentemente de Feedback. Uploads locais ficam em `.secrets/feedback_local/uploads`.

As chaves existentes do ambiente exclusivo foram preservadas para manter compatibilidade com recibos. Não regenere chaves a cada início nem remova chaves antigas durante a janela de idempotência. Para suspender novos envios, altere somente `FEEDBACK_RECEBIMENTO_ATIVO=false` no perfil privado e reinicie a API, preservando origem/chaves; consulta e interface têm controles independentes. Os exemplos e padrões versionados permanecem desativados.

## Conferências realizadas e limites

- `npm run feedback:banco`, `feedback:backup`, `feedback:conferir`, `feedback:parar` e os dois `dev:feedback` executados; API e frontend abriram nas portas isoladas. A retenção inicial do terminal por pipes herdados do PostgreSQL no Windows foi corrigida no iniciador; o ciclo final retornou normalmente.
- Página Contato HTTP 200 e código servido pelo Vite com flag pública verdadeira; preflight através do proxy 204. Corpo inválido retornou 400, sem gravação.
- ADMIN real: resumo 200 e total 5. EDITOR real: 403. Público: 401. Sessões de conferência encerradas por logout, somente no banco exclusivo.
- Preservados cinco feedbacks e cinco recibos. Não foi enviado novo feedback válido nesta configuração; a persistência de novos envios não foi reensaiada. O perfil está preparado para o teste manual autorizado, com backup e papel restrito.
- Não foram executadas suítes de testes, lint ou build nesta tarefa de configuração. Não houve edição de design, serviços, testes existentes, proteções, migrations ou `.env.example`. A verificação se limitou à sintaxe, integridade do diff, configuração, SQL READ ONLY e HTTP descritos acima. Os serviços de conferência foram encerrados.
- Sem homologação de produção/HTTPS ou aprovação institucional. O transporte HTTP local é exclusivo de desenvolvimento em loopback. Nenhuma ativação pública foi autorizada.
