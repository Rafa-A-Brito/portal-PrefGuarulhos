# Saneamento e sincronização de patrimônios

A fonte canônica é patrimonioSeedData.js: 34 patrimônios, com textos, localizações, detalhes e imagens locais. SiteHero e o schema não foram alterados. Não há migration nova.

## Operação

Execute no diretório backend:

~~~powershell
node prisma/import-patrimonios.js --sync-patrimonios --dry-run
node prisma/import-patrimonios.js --sync-patrimonios --dry-run --json
~~~

O modo sync é exclusivo: não pode ser combinado com backfills nem com --status. Os modos de importação e backfills continuam disponíveis, agora respeitando cidade/uf opcionais e os defaults Guarulhos/SP.

O dry-run usa transação PostgreSQL READ ONLY, snapshot RepeatableRead e verifica current_database(). Não escreve arquivos de upload nem registros. O JSON exibe cada campo, seu valor atual e seu valor proposto, além das relações a incorporar e duplicados a arquivar. Autor é opcional no dry-run; se informado, deve ser ADMIN/EDITOR ativo.

O sync exige registros canônicos existentes. Procura a união dos candidatos por slug da fonte, alias legado e nome normalizado. Ausência ou ambiguidade bloqueia o lote; ele nunca cria um terceiro patrimônio para resolver identidade duvidosa.

Após revisão humana do diff e backup externo, o comando de apply futuro é:

~~~powershell
pg_dump -U postgres -h localhost -p 5432 -Fc patrimonio_guarulhos -f patrimonio_guarulhos_pre_sync_final.dump
node prisma/import-patrimonios.js --sync-patrimonios --apply --confirm-db=patrimonio_guarulhos --created-by-email=EMAIL_DO_RESPONSAVEL
~~~

Esse comando não foi executado no banco real nesta entrega. O backup e a revisão são pré-condições operacionais, não automatizadas pelo script.

## Garantias e relações

- O lote inteiro é validado antes de qualquer escrita. Erros e conflitos impedem o apply completo.
- Apply confirma o banco da URL e o banco conectado, exige autor ativo e usa transação Serializable, advisory lock 6062026 (compartilhado com os importadores) e bloqueio das linhas de patrimônio. Uma falha de serialização aborta; rode novamente após revisão, sem retry oculto.
- IDs, slugs, status, publicadoEm, createdBy e updatedBy dos canônicos são preservados. updatedAt pode avançar quando os campos saneados mudam.
- Somente campos definidos pela fonte são comparados/atualizados; cidade/uf seguem os defaults de compatibilidade. Complemento omitido é preservado. Coordenadas Decimal são comparadas como números.
- Localização é criada/atualizada por upsert. Detalhes conhecidos são corrigidos por título normalizado, preservando IDs e detalhes editoriais de títulos adicionais. Títulos repetidos são consolidados. A fonte revisada prevalece sobre versões antigas do mesmo título.
- Imagens são reconciliadas por URL, preservando capa e metadados existentes. Apenas arquivos locais permitidos são copiados, com hash, cópia exclusiva e validação contra links simbólicos. Não há download.
- Documentos são incorporados por URL/título/tipo; categorias adicionais são unidas. Uma categoria que virou principal deixa de ser adicional.
- Relações de rota são movidas ao canônico; quando a rota já contém o canônico, somente a associação redundante é consolidada. A ordem da associação canônica é preservada.
- Casa José Maurício recebe Casarão da Nossa História; o slug legado de Albertis recebe Casarão do Sítio Ponte Alta. Os duplicados passam a ARQUIVADO com arquivadoEm, sem exclusão física. Localizações e mídias originais permanecem nos arquivos, além das incorporações ao canônico.
- Cada operação registra AuditLog com os snapshots anteriores do canônico e duplicado e o diff aplicado, incluindo detalhes e vínculos consolidados.
- A compensação de arquivos após rollback retoma o advisory lock e verifica referências no banco: só remove arquivos criados pela tentativa, sem referências, com inode e hash preservados. Arquivos já reutilizados ficam disponíveis; falhas de compensação são reportadas.
- O Poço Municipal deve estar em RASCUNHO. Se estiver publicado ou arquivado, o lote informa conflito para revisão editorial e não muda o status. A importação normal também recusa sua publicação automática.
- Uma segunda execução sobre a mesma fonte e estado resulta em zero mudanças.

## Pesquisa e incertezas

O documento fornecido pelo responsável (pesquisa_final_seeddata_codex.md) orientou a revisão. Endereços pesquisados no Maps prevalecem sobre o seed anterior. Dados legados sem pesquisa nova foram mantidos; referências territoriais sem endereço de imóvel receberam ressalva nos detalhes.

- Casa José Maurício: construção em 1925 nas fontes municipais e 1937 na AAPAH; número adotado 150, com divergência operacional de 207 registrada. Fonte: https://aapah.org.br/patrimonio/casa-jose-mauricio/ e https://portaleducacao.guarulhos.sp.gov.br/siseduc/portal/site/detalhar/conteudo/6646/
- Carbonell: fontes apontam 1917 e 02/04/1925. Não se afirma 1923. Rua Força Pública, 292; coordenadas são referência aproximada do logradouro. Fonte: https://teses.usp.br/teses/disponiveis/8/8136/tde-04022010-100806/publico/NILTON_OLIVEIRA_GAMA.pdf
- Albertis/Ponte Alta: identidade consolidada; endereço e coordenadas são históricos/aproximados. Fonte consultada: https://aapah.org.br/casarao-da-decada-de-1940/
- Poço Municipal: identificação e ponto exatos ainda dependem de inventário/Arquivo Histórico; permanece rascunho. Contexto: https://aapah.org.br/entre-o-poco-e-o-cano-a-agua-que-nao-subia-a-quebrada/
- Parque Ecológico: cidade São Paulo identifica o acesso do Núcleo Engenheiro Goulart; a relação territorial com Guarulhos está descrita. Fonte indicada: https://semil.sp.gov.br/sma/parques-urbanos/
- Primitiva Igreja: coordenadas representam o sítio de memória. Uma imagem local foi adicionada ao workspace durante o trabalho e sua escolha no seed foi preservada em cópia com nome ASCII. Os arquivos originais adicionados em paralelo não foram removidos. O placeholder patrimonio_sem_imagem.png continua disponível para fallback; não foi fabricada fotografia histórica.

A revisão web corroborou as identidades Casa José Maurício/Casarão da Nossa História e Albertis/Ponte Alta. As demais correções seguem a pesquisa fornecida; não são apresentadas como levantamento independente completo.

## Validação desta entrega

Em 08/10/2026: 150 testes unitários passaram; as cinco integrações passaram em PostgreSQL 17 descartável, incluindo importação normal, sync, rollback e concorrência. Lint do frontend e Prisma validate passaram. O backend não tem script de lint; os módulos novos foram verificados pelo Node. Não foi necessário regenerar Prisma.

Relatórios revisáveis em ../reports/patrimonios-sync-dry-run.md e .json: 34 canônicos, 34 updates planejados, dois merges, zero erros, zero conflitos. As 36 linhas físicas do banco real permaneceram intactas. Checksums antes/depois das nove tabelas verificadas são registrados no JSON. O relatório tem quatro warnings documentais, descritos acima.

O driver pg emite uma DeprecationWarning de consultas concorrentes durante o carregamento de relações pelo Prisma, também observada nos testes existentes; não ocasionou falhas. Nenhum aviso foi ocultado.
