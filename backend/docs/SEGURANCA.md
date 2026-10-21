# Segurança do backend

Todas as correções desta rodada ficam em `.tmp-target-portal`. Não executar deploy,
seeds, reset, db push, recriação de volumes ou alterações de bancos compartilhados
para validar estas mudanças.

## Login, IP e cabeçalhos

`LOGIN_RATE_WINDOW_MS=900000`, `LOGIN_RATE_IP_MAX=100` e
`LOGIN_RATE_ACCOUNT_IP_MAX=10` limitam todas as tentativas na janela, inclusive
logins bem-sucedidos e corpos inválidos. Não há bloqueio permanente de conta.
HTTP 429 mantém o envelope existente e adiciona `error.code=TOO_MANY_REQUESTS`,
mensagem em português, `Cache-Control: no-store` e `Retry-After` em segundos.
O CORS expõe Retry-After para o frontend em outra origem.

O armazenamento do limitador é **em memória, por processo**: reinício perde a
janela e múltiplas réplicas não compartilham contagem. Antes de escalar, integrar
armazenamento compartilhado ou limitação equivalente no gateway, conservando
também a proteção do backend direto. Há teto de 10.000 chaves por mapa e recusa
temporária de novas chaves quando cheio; IPv6 é agrupado por /64.

`TRUST_PROXY_IPS` vazio ignora X-Forwarded-For. Aceita apenas IPs/CIDRs explícitos;
não usar `true`, número de saltos ou sub-redes Docker inteiras indiscriminadamente.
O Compose reserva `172.30.87.2` para o Nginx e confia apenas nesse IP. A API fica
em `.3`; a rede `/29` precisa estar livre no host. Se mudar a rede, ajustar os três
valores juntos. `infra/nginx.conf` sobrescreve X-Forwarded-For, Host e Proto com os
valores observados pelo proxy. Na rodada de infraestrutura, o frontend não teve código alterado: o Compose
monta essa configuração de infraestrutura no Nginx. Acesso direto à porta da API
não é considerado proxy confiável. Revisar a topologia se houver outro balanceador.
Os prefixos `/api/` e `/uploads/` usam `^~` para que a regra de extensões estáticas
não intercepte imagens/documentos da API nem aplique cache público a mídia restrita.

Contas inexistentes/inativas executam bcrypt contra hash fictício constante de
custo 12; erros de credenciais mantêm a mesma mensagem. Isso reduz uma diferença
evidente de tempo, sem prometer tempo constante para banco/rede.

Cabeçalhos equivalentes às proteções básicas do Helmet: nosniff, SAMEORIGIN,
no-referrer, DNS prefetch off, permitted cross-domain policies none e remoção de
X-Powered-By. CSP e CORP não são aplicados globalmente. HSTS deve ser configurado
na terminação HTTPS real, não presumida pelo backend HTTP local.

## Segredos

`JWT_SECRET` exige pelo menos 32 caracteres e rejeita placeholders conhecidos,
sequências numéricas triviais e repetição de um único caractere. O erro informa
o nome da variável, nunca seu valor. Isso não substitui geração aleatória.
Para cada ambiente e cada segredo, execute separadamente em terminal privado:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Não versionar a saída. Os exemplos não contêm credenciais utilizáveis. Senhas
incluídas em URLs PostgreSQL devem ser percent-encoded; hexadecimal evita essa
necessidade. Não foi gerada ou alterada nenhuma credencial real nesta rodada.

## Uploads e mídia

Busboy substitui os parsers manuais e o transporte anterior. Os arquivos são
gravados por chunks com backpressure em descritor criado com `wx` e modo 0600;
não há Buffer.concat do arquivo nem operações síncronas durante a requisição.
Validam-se diretórios reais antes da criação para recusar symlinks/junctions.
Em erro, multipart incompleto ou aborto, espera-se o fechamento da gravação e
remove-se somente cada caminho criado com sucesso pela tentativa.

Limites técnicos finitos, além do limite de arquivo de cada contrato:

| Contrato | Campos | Bytes por campo | Partes | Corpo máximo |
|---|---:|---:|---:|---|
| Imagem/editorial | 24 | 262144 | 25 | maior limite de arquivo aceito + 1 MiB |
| Arquivo de mídia | 12 | 16384 | 13 | limite de arquivo configurado + 256 KiB |
| Referência | 2 | 16384 | 3 | 10 MiB + 64 KiB |

Um arquivo por requisição; nomes de campo até 100 caracteres. Campos duplicados
são recusados. Os schemas continuam validando metadados após o transporte.
O limite de corpo vale também para chunked e acesso direto, sem depender do Nginx.
Os campos de texto editorial de até 20.000 caracteres e os objetos JSON existentes
cabem nesses limites; URLs sem limite anterior passam a ter o teto técnico do campo.

`imagem` conserva JPEG/PNG/WebP/GIF até 10 MiB; `arquivo` de imagem conserva
JPEG/PNG/WebP e `UPLOAD_MAX_IMAGE_BYTES` (padrão 5 MiB). Documentos de mídia
conservam PDF e `UPLOAD_MAX_DOCUMENT_BYTES` (padrão 10 MiB). Referências conservam
PDF/DOC/DOCX/ODT/TXT/MD até 10 MiB. O limite exato de arquivo continua aceito.
Os bytes são preservados; TXT/MD são validados como UTF-8 sem NUL em fluxo.

Assinaturas verificam só marcadores iniciais: ZIP para DOCX/ODT não inspeciona o
pacote completo; OLE para DOC não verifica macros; PDF e imagens não são decodificados
completamente. **Assinatura válida não comprova ausência de malware.** Não há
antivírus externo ou transformação dos arquivos.

As duas rotas de exclusão resolvem URLs novas e legadas no mesmo utilitário e
usam as mesmas operações de quarentena, restauração exclusiva e limpeza. Arquivos
compartilhados são preservados; URLs externas e caminhos inválidos não são removidos.
A quarentena fica sob a raiz do arquivo original para preservar rename no mesmo
volume quando UPLOAD_ROOT e UPLOAD_DIR forem distintos.
Falhas de limpeza pós-commit continuam registradas para recuperação operacional.
Banco e filesystem não são atômicos: queda do processo na janela de quarentena
continua exigindo recuperação operacional; não foi criada política de auditoria.

A entrega consulta todos os vínculos da URL no modelo correspondente. Qualquer
patrimônio PUBLICADO torna o arquivo público; exclusivamente RASCUNHO/ARQUIVADO
exige usuário ativo ADMIN/EDITOR. HEAD, no-store, Vary Authorization e proteção de
caminho permanecem. A publicidade de exposições, novidades e pesquisa permanece.

## Docker e bancos novos

O processo Node executa como `node` (UID/GID 1000). O código da imagem fica sob
root, sem escrita pelo processo; o Compose monta o filesystem da API somente para
leitura, com `/app/uploads` gravável e `/tmp` efêmero.
O volume novo herda a propriedade dessa pasta. A API não executa migrações.
`POSTGRES_USER` é apenas a conta administrativa de inicialização do PostgreSQL;
não é usada em DATABASE_URL da API nem como fallback.

Para **volume novo**, `infra/postgres/10-roles.sh` cria:

- `portal_api`: login sem SUPERUSER/CREATEDB/CREATEROLE/REPLICATION, USAGE no
  schema, CRUD em tabelas e USAGE/SELECT em sequências criadas pelo migrador.
- `portal_migrator`: login sem os privilégios administrativos acima, com CREATE
  no schema public e propriedade dos objetos que suas migrações criarem.

`API_DB_PASSWORD` e `MIGRATION_DB_PASSWORD` são obrigatórias e distintas da senha
administrativa. O serviço `migrate` recebe apenas MIGRATION_DATABASE_URL, executa
`node scripts/migrate-deploy.js` (Prisma migrate deploy com o config exclusivo),
revoga os privilégios da API sobre `_prisma_migrations` e termina. A API só inicia
após sucesso. O config normal do Prisma continua disponível para ferramentas
existentes; use explicitamente o config de migração no procedimento de deploy.
Não foi alterada a escolha das trilhas de migração. Ambientes com trilha da equipe
devem conservar seu procedimento e a conexão exclusiva de migração correspondente.

## Transição de instalações existentes (procedimento para DBA)

O script de inicialização **não roda em volumes já existentes**. Não remover ou
recriar volumes para forçar sua execução. Não iniciar a configuração nova antes
de preparar e revisar a transição:

1. Fazer backup e ensaiar restauração em ambiente descartável; identificar a trilha
   realmente aplicada e todos os proprietários dos objetos existentes.
2. Criar as duas contas com senhas exclusivas em canal privado. Revogar CREATE de
   PUBLIC no schema; conceder USAGE à API e USAGE/CREATE ao migrador.
3. Revisar a transferência de propriedade **apenas dos objetos da aplicação** para
   o migrador, incluindo a tabela de histórico Prisma, tabelas, tipos e sequências.
   Não usar REASSIGN OWNED indiscriminadamente em banco compartilhado.
4. Conceder SELECT/INSERT/UPDATE/DELETE nas tabelas da aplicação e USAGE/SELECT nas
   sequências existentes à API; aplicar ALTER DEFAULT PRIVILEGES para cada papel
   que continuará criando objetos. Não tornar a API membro do migrador ou dona
   de banco/schema/tabelas. Não conceder privilégios administrativos.
5. Validar CRUD e recusa de DDL num clone descartável. Atualizar DATABASE_URL da
   API e fornecer MIGRATION_DATABASE_URL somente ao job de migração.
6. Conferir propriedade do volume de uploads existente. Se necessário, operador
   ajusta **somente a pasta de dados** para UID/GID 1000 após backup, sem chmod
   amplo do código e sem recriar volume. Montagens tmpfs de teste precisam desses
   UID/GID (compose.test.yml já define).

Nenhuma etapa acima foi executada em bancos/volumes existentes nesta rodada.

## Validação e contratos

Executar `npm run lint` e `npm test` no backend. Os testes sem banco usam mocks e
pastas temporárias, nunca arquivos reais da aplicação. Integrações existentes
mantêm seus guardas e não devem receber a URL de um banco compartilhado.

O teste `test/securityPrivileges.integration.test.js` é opt-in. Para executá-lo,
provisionar PostgreSQL descartável com banco de nome terminado em `_test`, usando
o script de inicialização acima e as duas contas. Definir
`SECURITY_API_DATABASE_URL`, `SECURITY_MIGRATION_DATABASE_URL` para o mesmo banco,
`SECURITY_TEST_DATABASE_EXCLUSIVE=1`, e executar:

```sh
node --test test/securityPrivileges.integration.test.js
```

Ele cria e remove somente uma tabela de fixture com nome aleatório, testa CRUD,
privilégios e recusa de CREATE/ALTER/DROP/SET ROLE. Sem URLs fica explicitamente
ignorado; não é evidência de privilégios validados. O Docker daemon não estava
disponível na implementação, portanto build, execução non-root, Nginx real e
privilégios reais ainda precisam dessa validação descartável.
