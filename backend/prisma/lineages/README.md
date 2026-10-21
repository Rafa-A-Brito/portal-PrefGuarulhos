# R1: duas linhagens, sem reescrever migrations aplicadas

O usuario confirmou que `20261005230000_add_pesquisa_patrimonios` e
`20261013180000_add_regiao_patrimonio` foram aplicadas em outro ambiente relevante.
Foi escolhida a opcao B. Nao se deve unificar historias divergentes por `resolve`,
reset, alteracao de checksum ou exclusao de registros de `_prisma_migrations`.

## Projeto atual: cinco migrations anteriores + D1B

`prisma.config.js` usa `prisma/migrations`: as cinco migrations conhecidas deste
projeto e `20261014010000_add_fatos_ligacoes`, sem alterar seu SQL. O proximo passo
operacional e um novo preflight somente leitura; nenhum deploy real foi feito na R1.

Essa trilha so se aplica a um ambiente cujo historico corresponde exatamente as
cinco migrations anteriores (ou seis, se a D1B ja tiver sido implantada).
Nao usar essa configuracao em um ambiente da equipe: migrations aplicadas ausentes
da trilha escolhida sao impedimento, nao algo a ignorar.

## Equipe: historico preservado + correcao forward-only

`prisma.equipe.config.js` seleciona `prisma/lineages/equipe/migrations` e exige
`EQUIPE_DATABASE_URL`. Recusa explicitamente `patrimonio_guarulhos`.
Os sete arquivos SQL historicos foram preservados byte a byte; incluem as duas
migrations da equipe. A migration de criacao D1B do projeto nao pertence a essa
trilha, pois as tabelas ja existem nela.

A nova `20261014120000_reconcile_d1b_forward` adiciona as restricoes D1B, limita os
tipos e torna descricao obrigatoria. Nao recria tabelas, nao apaga dados e nao
altera IDs. Se encontrar descricao NULL, textos vazios ou comprimentos fora dos
limites, aborta a transacao; a resolucao desses registros exige decisao documental.
As colunas de regiao/numeracao e a tabela de secoes existentes permanecem intactas
e inativas. Nao sao expostas ou escritas pelo contrato atual da aplicacao.

Antes de qualquer operacao nesse outro ambiente, conferir sua lista real de
migrations, checksums e dados. A confirmacao de que houve implantacao nao informa
quais outras migrations esse ambiente possui. Esta trilha foi testada em PostgreSQL
descartavel; nao constitui autorizacao de deploy em ambiente compartilhado.

O schema Prisma da aplicacao representa o escopo aprovado do projeto. Estruturas
adiadas da equipe sao extras historicos preservados fisicamente, nao autorizacao
para gerar migrations destrutivas que as removam. Nunca usar `db push` para
igualar automaticamente essas linhagens.

## Reproducao da validacao

De `backend/`: `node scripts/validate-r1.js`.
O script usa credenciais locais apenas para conectar a `postgres`, cria bancos
exclusivos `portal_r1_*_test`, valida replay/upgrade e executa os testes. Nao conecta
ao banco da aplicacao, nao executa seed e remove somente os bancos que ele criou.
Logs e resultados ficam em `.cache/r1`, ignorada pelo Git.

## Compatibilidade atual da trilha da equipe

A migration adicional `20261021120000_add_current_region_relation` cria somente
a relação atual de regiões e seus índices, preservando `local.regiao`, seções,
numeração e todos os dados existentes. Não converte classificações legadas.
O replay descartável agora confere todas as colunas dos modelos do Prisma nas
duas trilhas. Para banco local exclusivo autorizado cujo nome coincide com o
bloqueio do config normal, usar o config separado `prisma.local-equipe.config.js`,
com conexão loopback e confirmação exata do nome; ver o procedimento acima.
