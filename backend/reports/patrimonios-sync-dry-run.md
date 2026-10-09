# Dry-run final após correção do upsert de localização

Data: 08/10/2026. Banco: patrimonio_guarulhos. PostgreSQL somente leitura.

Fonte canônica: 34; merges: 2; updates: 34; erros: 0; conflitos: 0; aplicados: 0.

Checksums antes/depois iguais nas nove tabelas verificadas. As 36 linhas físicas permanecem intactas. Seed, dados pesquisados, schema e merges não foram alterados nesta correção. O sync separa o create completo do update parcial e valida todas as localizações antes de gravar. Os diffs abaixo são idênticos aos do dry-run anterior.

## Revisão da fonte

- Estação Ferroviária: a ficha representa a edificação remanescente, modificada e com restauro documentado. PRESERVADO mantido com essa identificação; não se presume integridade original. PDITS municipal, p. 142, registra que o prédio sobreviveu à desativação. A narrativa antiga de demolição e réplica permanece somente como valor atual do banco no diff, para ser substituída após revisão.
- Casa Amarela: confirmada como Casa do Chefe da Estação na Praça Prefeito Paschoal Thomeu, Jardim Santa Francisca, delimitada pela Avenida Antônio de Souza. A referência histórica Praça IV Centenário foi contextualizada. Nº 186 e coordenadas mantidos conforme Maps; a numeração não foi confirmada independentemente.
- E.E. Capistrano de Abreu: descrição corrigida de 385 para 393; endereço confirmado também pela SEDUC.
- Padre Bento: descrição e resumo harmonizados com Gopouva; acesso Avenida Emílio Ribas, 1819, confirmado pela Secretaria da Saúde.

Fontes (estacao): [documento 1](https://antigo.turismo.gov.br/sites/default/turismo/DPROD/PDITS/GUARULHOS/PDITS_MUNICIPIO_DE_GUARULHOS.pdf), [documento 2](https://aapah.org.br/patrimonio/antiga-estacao-de-trem-de-guarulhos-e-casa-amarela/)

Fontes (casa_amarela): [documento 1](https://diariooficial.guarulhos.sp.gov.br/uploads/pdf/1061017623.pdf), [documento 2](https://aapah.org.br/patrimonio/antiga-estacao-de-trem-de-guarulhos-e-casa-amarela/)

Fontes (capistrano): [documento 1](https://transparencia.educacao.sp.gov.br/Home/DetalhesEscola?codesc=5794)

Fontes (padre_bento): [documento 1](https://www.saude.sp.gov.br/resources/crh/gsdrh/pos-graduacao/chpbg.pdf)

## Validação

157 testes aprovados (151 unitários e 6 integrações em PostgreSQL 17 descartável), nenhum ignorado. Prisma validate aprovado.

34/34 localizações resultantes completas e válidas: endereco, numero, bairro, cep, latitude, longitude, cidade e uf. Valores exclusivamente da fonte canônica e do banco. locationCreate contém o resultado completo validado; location contém somente o patch de atualização.

Regressão verificada com Prisma/PostgreSQL real: localização existente, quatro campos no diff (numero, cep, latitude e longitude), apply bem-sucedido no banco descartável, campos obrigatórios e complemento editorial preservados, segundo dry-run sem alterações. Também verificado que o último canônico incompleto bloqueia o lote antes de gravar os 33 anteriores.

Banco real consultado com default_transaction_read_only=on; nenhum apply executado. Checksums das nove tabelas iguais antes e depois. Seed e schema mantêm seus hashes anteriores. Frontend não alterado; lint/build não repetidos nesta correção.

Aviso técnico não bloqueante: depreciação do driver pg.
## Ressalvas

- casa-jose-mauricio: Divergência documental ou localização aproximada registrada nos detalhes da fonte.
- antigo-poco-municipal: Localização e identificação não confirmadas por inventário; manter RASCUNHO.
- casarao-da-familia-albertis-demolido-em-2023: Divergência documental ou localização aproximada registrada nos detalhes da fonte.
- antiga-carbonell-fiacao-e-tecelagem-e-casaroes-gemeos-demolidos: Divergência documental ou localização aproximada registrada nos detalhes da fonte.
- Casa Amarela: número 186 e coordenadas mantidos da pesquisa Maps; número não confirmado independentemente na documentação.

## Estação Ferroviária de Guarulhos

ID: 9fc99478-48b8-4f0f-9c42-11950d840dfd. Slug preservado: estacao-ferroviaria-central-de-guarulhos. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Estação Ferroviária Central de Guarulhos"
~~~

Novo:
~~~json
"Estação Ferroviária de Guarulhos"
~~~

### descricao

Atual:
~~~json
"Estação inaugurada em 1915, principal ponto do Tramway da Cantareira na cidade, demolida pela administração pública após o encerramento da linha em 1965."
~~~

Novo:
~~~json
"Edificação remanescente da antiga estação ferroviária de Guarulhos, no conjunto historicamente referido como Praça IV Centenário. Sua fachada passou por alterações e a AAPAH registra intervenções de restauro. O imóvel é protegido pelo Decreto Municipal nº 21.143/2000."
~~~

### descricaoResumida

Atual:
~~~json
"Estação inaugurada em 1915, principal ponto do Tramway da Cantareira na cidade, demolida pela administração pública após o encerramento da linha em 1965."
~~~

Novo:
~~~json
"Edificação remanescente da estação de Guarulhos, inaugurada em 1915 e desativada em 1965, com fachada alterada e intervenções de restauro no conjunto da Praça IV Centenário."
~~~

### historia

Atual:
~~~json
"Atendia passageiros e o transporte de cargas cerâmicas. Após o encerramento da linha férrea em maio de 1965, o prédio de passageiros em alvenaria e madeira foi demolido por volta de 1968 para reformulação viária do centro. Décadas depois, uma réplica simplificada da fachada foi erguida na praça para abrigar equipamentos comunitários."
~~~

Novo:
~~~json
"Inaugurada em 1915 no ramal Guapira-Guarulhos do Tramway da Cantareira, a estação foi desativada em 1965. O Plano de Desenvolvimento Integrado do Turismo Sustentável de Guarulhos, na página 142, identifica a edificação como remanescente e registra alterações em sua fachada. A AAPAH documenta seu uso posterior pela EMEI da Estação e o restauro. A ficha corresponde a essa edificação histórica modificada ao longo do tempo; a versão anterior de demolição integral seguida de réplica não é sustentada por essas fontes."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Símbolo histórico do início da modernização urbana e industrial do município provocada pela expansão dos meios de transporte."
~~~

### situacao

Atual:
~~~json
"DEMOLIDO"
~~~

Novo:
~~~json
"PRESERVADO"
~~~

### categoriaId

Atual:
~~~json
"117e4cd0-519e-4c74-b2cf-3d31d064701c"
~~~

Novo:
~~~json
"74be0e85-fae0-48f5-9563-f03358d97a70"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07011-040"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.4543
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.5333
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "tempo",
    "titulo": "Inauguração em 1915",
    "texto": "Inaugurada em 24 de fevereiro de 1915, a estaÃ§Ã£o fazia parte do ramal de Guarulhos da Estrada de Ferro da Cantareira, o Tramway da Cantareira.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Um ramal que impulsionou a cidade",
    "texto": "O ramal seguia o traÃ§ado do atual anel viÃ¡rio, com estaÃ§Ãµes em Vila GalvÃ£o, Vila Augusta, GopoÃºva, Torres Tibagi e Guarulhos, e impulsionou a ocupaÃ§Ã£o urbana ao longo do percurso. Teve importÃ¢ncia para o desenvolvimento econÃ´mico e industrial de Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "O fim do ramal",
    "texto": "O ramal foi desativado em 1965, mas a antiga estaÃ§Ã£o permanece como um dos principais elementos da memÃ³ria ferroviÃ¡ria da cidade.",
    "ordem": 2
  },
  {
    "icone": "gente",
    "titulo": "Depois dos trens",
    "texto": "Depois da desativaÃ§Ã£o, o prÃ©dio abrigou a EMEI da EstaÃ§Ã£o, escola municipal desapropriada na dÃ©cada de 1990. A Casa Amarela, ao lado, tambÃ©m pertenceu Ã  escola e chegou a sediar o Arquivo HistÃ³rico de Guarulhos.",
    "ordem": 3
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "A estaÃ§Ã£o foi restaurada e integra o conjunto histÃ³rico da PraÃ§a IV CentenÃ¡rio, que tambÃ©m reÃºne a Casa Amarela e a locomotiva Maria FumaÃ§a. Segundo a AAPAH, em 2024 o prÃ©dio nÃ£o tinha uso definido pela prefeitura e apresentava sinais de vandalismo.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Símbolo histórico do início da modernização urbana e industrial do município provocada pela expansão dos meios de transporte.",
    "ordem": 5
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "tempo",
    "titulo": "Inauguração em 1915",
    "texto": "Inaugurada em 24 de fevereiro de 1915, a estação fazia parte do ramal de Guarulhos da Estrada de Ferro da Cantareira, o Tramway da Cantareira.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Um ramal que impulsionou a cidade",
    "texto": "O ramal seguia o traçado do atual anel viário, com estações em Vila Galvão, Vila Augusta, Gopoúva, Torres Tibagi e Guarulhos, e impulsionou a ocupação urbana ao longo do percurso. Teve importância para o desenvolvimento econômico e industrial de Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "O fim do ramal",
    "texto": "O ramal foi desativado em 1965, mas a antiga estação permanece como um dos principais elementos da memória ferroviária da cidade.",
    "ordem": 2
  },
  {
    "icone": "gente",
    "titulo": "Depois dos trens",
    "texto": "Depois da desativação, o prédio abrigou a EMEI da Estação, escola municipal desapropriada na década de 1990. A Casa Amarela, ao lado, também pertenceu à escola e chegou a sediar o Arquivo Histórico de Guarulhos.",
    "ordem": 3
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "A edificação remanescente passou por intervenções de restauro e integra o conjunto histórico conhecido como Praça IV Centenário, junto à Casa Amarela e à locomotiva Maria Fumaça. A permanência do prédio não significa conservação integral da configuração original. Segundo a AAPAH, em 2024 não tinha uso definido pela prefeitura e apresentava sinais de vandalismo.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Símbolo histórico do início da modernização urbana e industrial do município provocada pela expansão dos meios de transporte.",
    "ordem": 5
  },
  {
    "icone": "historia",
    "titulo": "Edificação remanescente e modificada",
    "texto": "O plano municipal de turismo (PDITS, p. 142) registra que a estação sobreviveu à desativação do ramal, com fachada descaracterizada por intervenções. Esse registro fundamenta a identificação como edificação remanescente; a AAPAH também documenta seu restauro.",
    "ordem": 6
  }
]
~~~

## Parque Bosque Maia

ID: 3784cdc5-92e6-4670-8e09-22dbb4e4ce23. Slug preservado: bosque-maia. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Bosque Maia"
~~~

Novo:
~~~json
"Parque Bosque Maia"
~~~

### descricao

Atual:
~~~json
"Parque Municipal Paulo Faccini, com mais de 170 mil m², criado em 1982 na área da antiga chácara da família Maia, com tombamento paisagístico e ambiental."
~~~

Novo:
~~~json
"Parque urbano e área de preservação ambiental/paisagística situado na Avenida Paulo Faccini, figurando como a maior área verde central da cidade. Preserva remanescentes de Mata Atlântica e ecossistema de várzea do Rio Baquirivu-Guaçu. Abriga obras de arte pública como a escultura \"Índio Guaru\" (em concreto, de Oswaldo Alves) e a Gruta dos Orixás. É tombado municipalmente pelo Decreto nº 21.143/2000."
~~~

### descricaoResumida

Atual:
~~~json
"Parque Municipal Paulo Faccini, com mais de 170 mil m², criado em 1982 na área da antiga chácara da família Maia, com tombamento paisagístico e ambiental."
~~~

Novo:
~~~json
"Maior parque urbano central da cidade, com vegetação de Mata Atlântica, área de várzea e monumentos artísticos, tombado por valor ambiental e paisagístico."
~~~

### historia

Atual:
~~~json
"Diante da expansão imobiliária nas décadas de 1970 e 1980, a área de mata nativa e nascentes do Ribeirão das Lavras foi desapropriada e convertida em parque público em 1982."
~~~

Novo:
~~~json
"O espaço ocupa a área da antiga Chácara Maia, sendo desapropriado e transformado em parque público (Parque Doutor Paulo Faccini) para garantir o lazer e a conservação ambiental no centro urbano."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Relevante como patrimônio ecológico e paisagístico, além de servir como espaço de convivência comunitária, manifestações religiosas e de memória indígena e afro-brasileira."
~~~

### localizacao.endereco

Atual:
~~~json
"Rua Paulo Faccini (esq. Av. Papa João XXIII)"
~~~

Novo:
~~~json
"Avenida Paulo Faccini"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.bairro

Atual:
~~~json
"Cidade Maia"
~~~

Novo:
~~~json
"Centro / Jardim Maia"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07115-260"
~~~

### localizacao.longitude

Atual:
~~~json
-46.5292
~~~

Novo:
~~~json
-46.5262
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "natureza",
    "titulo": "O maior parque urbano",
    "texto": "TambÃ©m conhecido como Parque Recanto das Olaias, Ã© o maior parque urbano de Guarulhos.",
    "ordem": 0
  },
  {
    "icone": "natureza",
    "titulo": "Mata Atlântica no centro",
    "texto": "Preserva espÃ©cies nativas da Mata AtlÃ¢ntica e serve como pulmÃ£o verde no centro urbano.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Proteção paisagística e ambiental",
    "texto": "O parque possui tombamento de carÃ¡ter paisagÃ­stico e ambiental. JÃ¡ constava, em 1990, na relaÃ§Ã£o de imÃ³veis de interesse de preservaÃ§Ã£o da Lei OrgÃ¢nica do MunicÃ­pio e foi tombado em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Relevante como patrimônio ecológico e paisagístico, além de servir como espaço de convivência comunitária, manifestações religiosas e de memória indígena e afro-brasileira.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "natureza",
    "titulo": "O maior parque urbano",
    "texto": "Também conhecido como Parque Recanto das Olaias, é o maior parque urbano de Guarulhos.",
    "ordem": 0
  },
  {
    "icone": "natureza",
    "titulo": "Mata Atlântica no centro",
    "texto": "Preserva espécies nativas da Mata Atlântica e serve como pulmão verde no centro urbano.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Proteção paisagística e ambiental",
    "texto": "O parque possui tombamento de caráter paisagístico e ambiental. Já constava, em 1990, na relação de imóveis de interesse de preservação da Lei Orgânica do Município e foi tombado em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Relevante como patrimônio ecológico e paisagístico, além de servir como espaço de convivência comunitária, manifestações religiosas e de memória indígena e afro-brasileira.",
    "ordem": 3
  }
]
~~~

## Catedral Nossa Senhora da Conceição

ID: 097bf643-7695-410c-8e82-d19c5625ceb1. Slug preservado: catedral-nossa-senhora-da-conceicao. Ação: ATUALIZAR.

### localizacao.endereco

Atual:
~~~json
"Praça Tereza Cristina, 60"
~~~

Novo:
~~~json
"Praça Tereza Cristina"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"1"
~~~

### localizacao.cep

Atual:
~~~json
"07011-040"
~~~

Novo:
~~~json
"07011-010"
~~~

### localizacao.latitude

Atual:
~~~json
-23.455
~~~

Novo:
~~~json
-23.4688
~~~

### localizacao.longitude

Atual:
~~~json
-46.5325
~~~

Novo:
~~~json
-46.5317
~~~

## Complexo Sanatório Padre Bento

ID: 6a50c931-026b-43bb-bdc7-f1ed16ee445c. Slug preservado: sanatorio-padre-bento. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Sanatório Padre Bento"
~~~

Novo:
~~~json
"Complexo Sanatório Padre Bento"
~~~

### descricao

Atual:
~~~json
"Complexo projetado na década de 1920 e inaugurado em 1931 como colônia de isolamento para doentes de hanseníase, hoje integrado à rede pública de saúde como Hospital Geral Padre Bento."
~~~

Novo:
~~~json
"Conjunto arquitetônico e urbano de caráter institucional localizado em Gopouva, com referência de acesso pela Avenida Emílio Ribas, 1819. A arquitetura das edificações reúne influências dos estilos *art déco* e neocolonial, destacando-se como um dos conjuntos institucionais mais expressivos desse período na Região Metropolitana de São Paulo. O espaço abriga o Teatro Padre Bento, a Igreja São João Batista e diversas unidades destinadas à saúde pública e serviços municipais. O perímetro do complexo conta com proteção arquitetônica e ambiental, tendo o tombamento estadual pelo CONDEPHAAT (2011) incidindo especialmente sobre o Cine-Teatro e a Capela."
~~~

### descricaoResumida

Atual:
~~~json
"Complexo projetado na década de 1920 e inaugurado em 1931 como colônia de isolamento para doentes de hanseníase, hoje integrado à rede pública de saúde como Hospital Geral Padre Bento."
~~~

Novo:
~~~json
"Conjunto arquitetônico e urbano em estilos *art déco* e neocolonial em Gopouva, abrigando o Teatro Padre Bento, a Igreja São João Batista e equipamentos públicos com proteção ambiental e arquitetônica."
~~~

### historia

Atual:
~~~json
"Idealizado pelo Governo do Estado de São Paulo sob o modelo de \"cidade-sanatório\", funcionava de forma autônoma, com leitos de internação, padaria, correios, barbearia, campos esportivos e espaços de lazer. Destaca-se o Teatro Padre Bento, inaugurado em 1937 em estilo art déco para atividades culturais entre os internos, e a Paróquia São João Batista, integrada ao espaço para assistência religiosa. Com o fim da segregação sanitária forçada nos anos 1960 e os avanços no tratamento da doença, a instituição foi incorporada à rede pública de saúde. O conjunto é tombado pelo COMPHIG e pelo CONDEPHAAT."
~~~

Novo:
~~~json
"Inaugurado na década de 1930, o complexo foi projetado originalmente como uma colônia-asilo destinada ao isolamento compulsório de pacientes diagnosticados com hanseníase. Ao longo das décadas, o espaço passou por reestruturações funcionais, integrando equipamentos municipais de saúde, cultura e serviços."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Representa um marco da arquitetura institucional em São Paulo e um testemunho da memória da saúde pública e das políticas de isolamento sanitário do século XX, ressignificado contemporaneamente como polo comunitário e cultural da cidade."
~~~

### localizacao.endereco

Atual:
~~~json
"Av. Emílio Ribas, 1573"
~~~

Novo:
~~~json
"Avenida Emílio Ribas"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"1819"
~~~

### localizacao.bairro

Atual:
~~~json
"Jardim Tranquilidade"
~~~

Novo:
~~~json
"Gopouva"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07051-000"
~~~

### localizacao.latitude

Atual:
~~~json
-23.453
~~~

Novo:
~~~json
-23.4735
~~~

### localizacao.longitude

Atual:
~~~json
-46.531
~~~

Novo:
~~~json
-46.5451
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um asilo-colônia",
    "texto": "Inaugurado na dÃ©cada de 1930 como leprosÃ¡rio/asilo-colÃ´nia para isolamento compulsÃ³rio de pacientes de hansenÃ­ase.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Art déco e neocolonial",
    "texto": "Constitui um dos conjuntos arquitetÃ´nicos em estilo art dÃ©co/neocolonial mais importantes da cidade.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Proteção estadual e municipal",
    "texto": "O complexo Ã© tombado pelo Condephaat (processo nÂº 33.189/95). No municÃ­pio, a igreja e o cineteatro foram tombados em 1990, e os demais imÃ³veis e a vegetaÃ§Ã£o, em 2000. O campo de futebol do hospital tambÃ©m foi tombado, em 1993.",
    "ordem": 2
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "Abriga o Teatro Padre Bento, a Igreja SÃ£o JoÃ£o Batista e unidades de atendimento Ã  saÃºde pÃºblica.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Representa um marco da arquitetura institucional em São Paulo e um testemunho da memória da saúde pública e das políticas de isolamento sanitário do século XX, ressignificado contemporaneamente como polo comunitário e cultural da cidade.",
    "ordem": 4
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um asilo-colônia",
    "texto": "Inaugurado na década de 1930 como leprosário/asilo-colônia para isolamento compulsório de pacientes de hanseníase.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Art déco e neocolonial",
    "texto": "Constitui um dos conjuntos arquitetônicos em estilo art déco/neocolonial mais importantes da cidade.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Proteção estadual e municipal",
    "texto": "O complexo é tombado pelo Condephaat (processo nº 33.189/95). No município, a igreja e o cineteatro foram tombados em 1990, e os demais imóveis e a vegetação, em 2000. O campo de futebol do hospital também foi tombado, em 1993.",
    "ordem": 2
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "Abriga o Teatro Padre Bento, a Igreja São João Batista e unidades de atendimento à saúde pública.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Representa um marco da arquitetura institucional em São Paulo e um testemunho da memória da saúde pública e das políticas de isolamento sanitário do século XX, ressignificado contemporaneamente como polo comunitário e cultural da cidade.",
    "ordem": 4
  }
]
~~~

## Parque Ecológico do Tietê

ID: 7061ac85-5251-4f58-b2b3-ca4e6b533b7e. Slug preservado: parque-ecologico-do-tiete. Ação: ATUALIZAR.

### descricao

Atual:
~~~json
"Área verde às margens do Rio Tietê, essencial para a preservação e equilíbrio ambiental da região."
~~~

Novo:
~~~json
"Parque ambiental metropolitano implantado na várzea do Rio Tietê, com funções de proteção ambiental, controle de cheias, conservação da biodiversidade, lazer e educação ambiental. O Núcleo Engenheiro Goulart concentra a principal estrutura de visitação pública, enquanto a área ambiental do complexo alcança a região limítrofe e trechos associados ao território de Guarulhos."
~~~

### descricaoResumida

Atual:
~~~json
"Área verde às margens do Rio Tietê, essencial para a preservação e equilíbrio ambiental da região."
~~~

Novo:
~~~json
"Grande parque metropolitano de preservação da várzea do Rio Tietê, com funções ambientais, recreativas e de controle de enchentes."
~~~

### historia

Atual:
~~~json
null
~~~

Novo:
~~~json
"O Parque Ecológico do Tietê foi instituído pelo Decreto Estadual nº 7.868, de 30 de abril de 1976, no contexto das políticas de proteção da várzea e combate às inundações na Região Metropolitana de São Paulo. O Núcleo Engenheiro Goulart consolidou-se como sua principal área pública de lazer, educação ambiental e preservação da biodiversidade."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Possui relevância ambiental, paisagística e social de escala metropolitana, preservando áreas de várzea do Rio Tietê e oferecendo espaços de educação ambiental, lazer e convivência. Sua área se relaciona territorialmente com São Paulo e Guarulhos."
~~~

### localizacao.endereco

Atual:
~~~json
"Av. Tancredo Neves, s/n"
~~~

Novo:
~~~json
"Rodovia Parque"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"8055"
~~~

### localizacao.bairro

Atual:
~~~json
"Cumbica"
~~~

Novo:
~~~json
"Vila Santo Henrique / Engenheiro Goulart"
~~~

### localizacao.cep

Atual:
~~~json
"07231-000"
~~~

Novo:
~~~json
"03719-000"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4368
~~~

Novo:
~~~json
-23.48914
~~~

### localizacao.longitude

Atual:
~~~json
-46.4614
~~~

Novo:
~~~json
-46.52093
~~~

### localizacao.cidade

Atual:
~~~json
"Guarulhos"
~~~

Novo:
~~~json
"São Paulo"
~~~

### detalhes

Atual:
~~~json
[]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Proteção da várzea do Tietê",
    "texto": "O parque foi instituído em 1976 no contexto das políticas metropolitanas de proteção da várzea do Rio Tietê e controle de enchentes.",
    "ordem": 0
  },
  {
    "icone": "natureza",
    "titulo": "Biodiversidade e preservação",
    "texto": "O complexo protege áreas de várzea, lagos, vegetação e fauna, além de desenvolver atividades de educação ambiental.",
    "ordem": 1
  },
  {
    "icone": "gente",
    "titulo": "Lazer metropolitano",
    "texto": "O Núcleo Engenheiro Goulart reúne estruturas de lazer e visitação pública e funciona como importante equipamento ambiental metropolitano.",
    "ordem": 2
  },
  {
    "icone": "localizacao",
    "titulo": "São Paulo e Guarulhos",
    "texto": "O acesso principal do Núcleo Engenheiro Goulart fica no município de São Paulo. A área ambiental do complexo alcança a região limítrofe e trechos relacionados ao território de Guarulhos.",
    "ordem": 3
  }
]
~~~

## Igreja de Nossa Senhora de Bonsucesso

ID: 8cb89b3f-4099-4d06-81d8-3f744bf40b9a. Slug preservado: igreja-de-nossa-senhora-de-bonsucesso-e-nucleo-historico. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Igreja de Nossa Senhora de Bonsucesso e Núcleo Histórico"
~~~

Novo:
~~~json
"Igreja de Nossa Senhora de Bonsucesso"
~~~

### descricao

Atual:
~~~json
"Núcleo religioso originado no início do século XVIII como ponto de apoio para tropeiros, com capela erguida em taipa por volta de 1741."
~~~

Novo:
~~~json
"Conjunto urbano e edificação religiosa localizados no bairro do Bonsucesso. A igreja e a praça no seu entorno preservam a escala, a morfologia e as referências espaciais da tradicional ocupação caipira paulista."
~~~

### descricaoResumida

Atual:
~~~json
"Núcleo religioso originado no início do século XVIII como ponto de apoio para tropeiros, com capela erguida em taipa por volta de 1741."
~~~

Novo:
~~~json
"Centro religioso e praça de ocupação tradicional caipira no bairro do Bonsucesso, remontando às origens rurais do século XVIII."
~~~

### historia

Atual:
~~~json
"A região servia de ponto de descanso para tropeiros e povoadores que viajavam entre São Paulo, o Vale do Paraíba e o Rio de Janeiro. A capela tornou-se o centro da Festa de Nossa Senhora de Bonsucesso, celebrada ininterruptamente desde meados do século XVIII. O entorno preserva o traçado urbano típico dos núcleos rurais paulistas pré-industriais. O tombamento abrange o edifício, seu acervo e a praça central do bairro."
~~~

Novo:
~~~json
"As origens do núcleo vinculam-se a sesmarias e povoamentos rurais do século XVIII na região do Bonsucesso, mantendo-se ao longo dos séculos como espaço catalisador de sociabilidades rurais e eventos comunitários."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"É o coração geográfico de uma das comunidades paulistas mais tradicionais, funcionando como suporte para o patrimônio imaterial, religiosidade popular e identidade regional."
~~~

### localizacao.endereco

Atual:
~~~json
"Praça Nossa Senhora de Bonsucesso, 13"
~~~

Novo:
~~~json
"Rua Dona Catharina Maria de Jesus"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"99"
~~~

### localizacao.bairro

Atual:
~~~json
"Bonsucesso"
~~~

Novo:
~~~json
"Bonsucesso / Pimentas"
~~~

### localizacao.cep

Atual:
~~~json
"07162-160"
~~~

Novo:
~~~json
"07175-500"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4182
~~~

Novo:
~~~json
-23.4243
~~~

### localizacao.longitude

Atual:
~~~json
-46.4111
~~~

Novo:
~~~json
-46.3982
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "tempo",
    "titulo": "Fundada no século XVIII",
    "texto": "Fundada no sÃ©culo XVIII no antigo bairro do Bonsucesso.",
    "ordem": 0
  },
  {
    "icone": "fe",
    "titulo": "Polo religioso e cultural",
    "texto": "Trata-se do polo religioso e cultural mais tradicional do municÃ­pio.",
    "ordem": 1
  },
  {
    "icone": "tradicao",
    "titulo": "Romarias e festa",
    "texto": "A igreja Ã© associada Ã s romarias e Ã  Festa do Bonsucesso.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Tombada em 2000",
    "texto": "A igreja Ã© de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo municÃ­pio em 2000 (Decreto nÂº 21.143).",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "É o coração geográfico de uma das comunidades paulistas mais tradicionais, funcionando como suporte para o patrimônio imaterial, religiosidade popular e identidade regional.",
    "ordem": 4
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "tempo",
    "titulo": "Fundada no século XVIII",
    "texto": "Fundada no século XVIII no antigo bairro do Bonsucesso.",
    "ordem": 0
  },
  {
    "icone": "fe",
    "titulo": "Polo religioso e cultural",
    "texto": "Trata-se do polo religioso e cultural mais tradicional do município.",
    "ordem": 1
  },
  {
    "icone": "tradicao",
    "titulo": "Romarias e festa",
    "texto": "A igreja é associada às romarias e à Festa do Bonsucesso.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Tombada em 2000",
    "texto": "A igreja é de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo município em 2000 (Decreto nº 21.143).",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "É o coração geográfico de uma das comunidades paulistas mais tradicionais, funcionando como suporte para o patrimônio imaterial, religiosidade popular e identidade regional.",
    "ordem": 4
  }
]
~~~

## Festa de Nossa Senhora de Bonsucesso

ID: f2cd70ec-f28f-4257-9045-60446e01b31e. Slug preservado: festa-de-nossa-senhora-de-bonsucesso. Ação: ATUALIZAR.

### localizacao.endereco

Atual:
~~~json
"Rua Silva Bueno, s/n"
~~~

Novo:
~~~json
"Rua Silva Bueno"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

## Sítio da Candinha (Casa da Candinha)

ID: 1674b067-4f80-4d9b-a195-6f9aba028bf6. Slug preservado: sitio-da-candinha-casa-da-candinha. Ação: ATUALIZAR.

### descricao

Atual:
~~~json
"Edificação rural do século XIX em taipa de pilão, ligada a Cândida Maria da Conceição, mulher negra ex-escravizada, hoje sede do Centro de Referência da Cultura Negra de Guarulhos."
~~~

Novo:
~~~json
"Edificação histórica rural e sítio histórico situado no Bairro do Bananal, na região de Lavras. A casa-sede foi construída utilizando a técnica de taipa de pilão, tradicional da arquitetura paulista, com datação estimada em 1825. A área foi declarada de utilidade pública para a criação de um parque científico-cultural e centro de memória da cultura negra, sendo amparada pelo artigo 28 do ADCT da Lei Orgânica Municipal e decretos de preservação e desapropriação."
~~~

### descricaoResumida

Atual:
~~~json
"Edificação rural do século XIX em taipa de pilão, ligada a Cândida Maria da Conceição, mulher negra ex-escravizada, hoje sede do Centro de Referência da Cultura Negra de Guarulhos."
~~~

Novo:
~~~json
"Exemplar preservado de edificação rural em taipa de pilão do século XIX, localizado no Bairro do Bananal e destinado a parque científico-cultural e centro de memória da cultura negra."
~~~

### historia

Atual:
~~~json
"Localizado na região do Taboão/Lavras (antigo Sítio Bananal), o imóvel pertenceu a Cândida Maria da Conceição, que adquiriu terras na região no período pós-abolicionista. A casa servia como moradia familiar e ponto de apoio para trabalhadores rurais. Após desapropriação e tombamento pelo poder público municipal, passou por restauração arquitetônica e arqueológica, sendo convertida em centro de referência para preservar a memória da presença negra e da arquitetura de taipa no município."
~~~

Novo:
~~~json
"Remontando à ocupação agrícola e extrativista do século XIX, a edificação articula-se historicamente à exploração da mineração do ouro no morro do Cangaíba e ao trabalho e vivência das populações escravizadas na região."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"É um dos registros arquitetônicos rurais mais antigos preservados em Guarulhos, fundamental para a salvaguarda da memória da presença negra, do trabalho escravizado e das técnicas construtivas paulistas tradicionais."
~~~

### categoriaId

Atual:
~~~json
"4c1d644f-bfb5-4fe9-8640-17e50a076617"
~~~

Novo:
~~~json
"74be0e85-fae0-48f5-9563-f03358d97a70"
~~~

### localizacao.endereco

Atual:
~~~json
"Bairro do Bananal (região de Lavras)"
~~~

Novo:
~~~json
"Estrada do Bananal"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.bairro

Atual:
~~~json
"Bananal"
~~~

Novo:
~~~json
"Jardim Bananal / Parque do Bananal"
~~~

### localizacao.cep

Atual:
~~~json
"07175-000"
~~~

Novo:
~~~json
"07152-000"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4051
~~~

Novo:
~~~json
-23.3616
~~~

### localizacao.longitude

Atual:
~~~json
-46.402
~~~

Novo:
~~~json
-46.5309
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Casa-sede da Fazenda Bananal",
    "texto": "Ã uma das construÃ§Ãµes mais antigas de Guarulhos e foi a casa-sede da antiga Fazenda Bananal.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Taipa de pilão e bambu",
    "texto": "A casa foi feita em taipa de pilÃ£o entrelaÃ§ada com bambu e Ã© datada provavelmente de 1825. Guarda um oratÃ³rio colonial com imagens e objetos religiosos.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "A senzala que resiste",
    "texto": "Ã a Ãºnica remanescente do perÃ­odo escravagista que ainda possui senzala na regiÃ£o metropolitana de SÃ£o Paulo, o que a torna um raro registro da ocupaÃ§Ã£o rural e da escravidÃ£o na regiÃ£o.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Proteção",
    "texto": "O sÃ­tio foi tombado pelo Decreto Municipal nÂº 21.143/2000 e desapropriado pela prefeitura em 2004 (Decreto nÂº 22.787/2004).",
    "ordem": 3
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "PatrimÃ´nio histÃ³rico localizado no atual Bairro do Bananal, na regiÃ£o de Lavras.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "É um dos registros arquitetônicos rurais mais antigos preservados em Guarulhos, fundamental para a salvaguarda da memória da presença negra, do trabalho escravizado e das técnicas construtivas paulistas tradicionais.",
    "ordem": 5
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Casa-sede da Fazenda Bananal",
    "texto": "É uma das construções mais antigas de Guarulhos e foi a casa-sede da antiga Fazenda Bananal.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Taipa de pilão e bambu",
    "texto": "A casa foi feita em taipa de pilão entrelaçada com bambu e é datada provavelmente de 1825. Guarda um oratório colonial com imagens e objetos religiosos.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "A senzala que resiste",
    "texto": "É a única remanescente do período escravagista que ainda possui senzala na região metropolitana de São Paulo, o que a torna um raro registro da ocupação rural e da escravidão na região.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Proteção",
    "texto": "O sítio foi tombado pelo Decreto Municipal nº 21.143/2000 e desapropriado pela prefeitura em 2004 (Decreto nº 22.787/2004).",
    "ordem": 3
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "Patrimônio histórico localizado no atual Bairro do Bananal, na região de Lavras.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "É um dos registros arquitetônicos rurais mais antigos preservados em Guarulhos, fundamental para a salvaguarda da memória da presença negra, do trabalho escravizado e das técnicas construtivas paulistas tradicionais.",
    "ordem": 5
  }
]
~~~

## Casa José Maurício

ID: b5ea73fa-79ad-4ac3-a883-0ebd84b451ca. Slug preservado: casa-jose-mauricio. Ação: ATUALIZAR.

Merge planejado: {"id":"7ef1d2a6-cb0e-4827-b8e3-378877a2aec5","slug":"casarao-da-nossa-historia","destinoId":"b5ea73fa-79ad-4ac3-a883-0ebd84b451ca","acao":"ARQUIVAR","preservar":["localizacao","imagens","detalhes","documentos","autoria","publicadoEm"],"rotas":[]}

### descricao

Atual:
~~~json
"Último exemplar remanescente de arquitetura residencial urbana em taipa de pilão do século XIX em Guarulhos, antiga residência de José Maurício de Oliveira."
~~~

Novo:
~~~json
"Casarão histórico de arquitetura eclética que serviu de residência a José Maurício de Oliveira Sobrinho e, após diferentes usos públicos, abandono e um longo processo de restauração, foi reaberto como Casarão da Nossa História, espaço cultural e educativo dedicado à memória de Guarulhos."
~~~

### descricaoResumida

Atual:
~~~json
"Último exemplar remanescente de arquitetura residencial urbana em taipa de pilão do século XIX em Guarulhos, antiga residência de José Maurício de Oliveira."
~~~

Novo:
~~~json
"Antiga residência de José Maurício, restaurada e transformada no Casarão da Nossa História, centro de formação e visitação dedicado à memória de Guarulhos."
~~~

### historia

Atual:
~~~json
"Situada no centro da cidade, foi residência de José Maurício de Oliveira, que ocupou o cargo de intendente (prefeito) durante a República Velha. A construção apresenta técnicas mistas de taipa e alvenaria de tijolos de barro, além de esquadrias de madeira típicas do período imperial. Seu tombamento visou deter a demolição promovida pela expansão comercial no centro urbano."
~~~

Novo:
~~~json
"A edificação remonta às primeiras décadas do século XX. Fontes municipais associam sua construção a 1925, enquanto a AAPAH registra 1937 como marco documental da residência. O imóvel foi residência de José Maurício de Oliveira Sobrinho e posteriormente recebeu diferentes funções públicas, incluindo Fórum, Secretaria de Obras, Junta de Alistamento Militar e Museu Histórico. Após anos de abandono e um longo processo de restauração, foi aberto ao público em julho de 2025 como Casarão da Nossa História."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"É um importante exemplar da arquitetura residencial eclética de Guarulhos e um marco da história política, administrativa e cultural do município, atualmente dedicado à preservação, formação e difusão da memória local."
~~~

### situacao

Atual:
~~~json
"NAO_INFORMADO"
~~~

Novo:
~~~json
"PRESERVADO"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"150"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07012-070"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.4682
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.5298
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "O edifício é um símbolo da trajetória política e administrativa de Guarulhos, além de representar a preservação e reabilitação da arquitetura residencial eclética no núcleo central do município.",
    "ordem": 0
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Residência de um prefeito",
    "texto": "Foi residência de José Maurício de Oliveira Sobrinho. Fontes municipais associam a construção a 1925, enquanto a AAPAH registra 1937; a divergência documental permanece registrada.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Arquitetura eclética",
    "texto": "O imóvel apresenta arquitetura eclética e possui elementos construtivos que preservam parte da memória da cidade.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "Muitas funções ao longo dos anos",
    "texto": "Ao longo dos anos, também foi utilizado para diferentes funções públicas, como Fórum, Secretaria de Obras, Junta de Alistamento Militar e Museu Histórico de Guarulhos.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Abandono e compra pela prefeitura",
    "texto": "Em janeiro de 2011, a AAPAH fez um abraço simbólico no casarão para tentar evitar o destombamento e a demolição, mas o ato teve pouca adesão. Para os herdeiros, restaurar era caro e o terreno valia mais que a casa. Em junho de 2013, a prefeitura comprou o imóvel por R$ 3 milhões, e ele continuou abandonado por anos.",
    "ordem": 3
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "Após o restauro, o imóvel passou a funcionar como o Casarão da Nossa História, espaço de formação, visitação, exposições e atividades relacionadas à história e à memória de Guarulhos. Reaberto em 2025, reúne salas temáticas, maquetes de edificações históricas e exposições de fotografias.",
    "ordem": 4
  },
  {
    "icone": "localizacao",
    "titulo": "Numeração documental divergente",
    "texto": "O cadastro adota Rua Sete de Setembro, 150, conforme a pesquisa do responsável. Publicações operacionais recentes indicam o número 207; essa divergência não foi resolvida.",
    "ordem": 5
  },
  {
    "icone": "historia",
    "titulo": "Importância cultural",
    "texto": "É um importante exemplar da arquitetura residencial eclética de Guarulhos e um marco da história política, administrativa e cultural do município, atualmente dedicado à preservação, formação e difusão da memória local.",
    "ordem": 6
  }
]
~~~

### imagens.adicionar

Atual:
~~~json
[]
~~~

Novo:
~~~json
[
  {
    "url": "/uploads/patrimonios/casarao_nossa_historia.jpg",
    "titulo": null,
    "textoAlternativo": "Casarão da Nossa História",
    "credito": null,
    "fonte": null,
    "ordem": 1,
    "principal": false,
    "createdAt": "2026-10-07T18:44:37.767Z"
  }
]
~~~

### duplicado.status

Atual:
~~~json
"RASCUNHO"
~~~

Novo:
~~~json
"ARQUIVADO"
~~~

## Casa Amarela (Casa do Chefe da Estação)

ID: 30b81008-d041-4e73-a3de-feef49e0728d. Slug preservado: casa-amarela-casa-do-chefe-da-estacao. Ação: ATUALIZAR.

### descricao

Atual:
~~~json
"Erguida por volta de 1915 como moradia oficial do chefe da Estação Ferroviária de Guarulhos, hoje sede do Arquivo Histórico Municipal."
~~~

Novo:
~~~json
"Antiga Casa do Chefe da Estação, situada na Praça Prefeito Paschoal Thomeu, no Jardim Santa Francisca, junto à Avenida Antônio de Souza e à antiga estação ferroviária. O conjunto é historicamente referido como Praça IV Centenário. Apresenta linguagem arquitetônica funcional das infraestruturas ferroviárias paulistas do início do século XX e proteção municipal pelo Decreto nº 21.143/2000."
~~~

### descricaoResumida

Atual:
~~~json
"Erguida por volta de 1915 como moradia oficial do chefe da Estação Ferroviária de Guarulhos, hoje sede do Arquivo Histórico Municipal."
~~~

Novo:
~~~json
"Casa do Chefe da Estação, na Praça Prefeito Paschoal Thomeu, Jardim Santa Francisca, junto à Avenida Antônio de Souza; integra o conjunto conhecido como Praça IV Centenário e é tombada pelo município."
~~~

### historia

Atual:
~~~json
"Construída pela Companhia Cantareira de Esgotos, integrava o complexo do Tramway da Cantareira, linha que ligava Guarulhos à capital paulista. Apresenta arquitetura ferroviária em madeira e alvenaria, cobertura em telhas francesas e pintura externa amarela tradicional. Após o encerramento da ferrovia em 1965, o imóvel foi recuperado pelo município, tombado e adaptado para abrigar o Arquivo Histórico Municipal."
~~~

Novo:
~~~json
"Construída no início do século XX para servir de moradia oficial ao chefe da estação de Guarulhos do ramal da *Tramway da Cantareira*. Com a desativação da linha férrea na década de 1960, o prédio passou a abrigar equipamentos públicos municipais, incluindo o Arquivo Histórico Municipal Araci Borges Dias Martins em períodos anteriores. O Diário Oficial municipal de 8 de julho de 2008 identifica a área da Casa Amarela e da antiga estação como Praça Prefeito Paschoal Thomeu, no Jardim Santa Francisca, entre as avenidas Antônio de Souza e Aniello Pratici e a Rua Soldado José de Andrade."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"É um dos raros remanescentes físicos da infraestrutura do *Tramway da Cantareira*, registrando a era da expansão dos transportes sobre trilhos e o urbanismo da cidade no início do século XX."
~~~

### categoriaId

Atual:
~~~json
"117e4cd0-519e-4c74-b2cf-3d31d064701c"
~~~

Novo:
~~~json
"74be0e85-fae0-48f5-9563-f03358d97a70"
~~~

### localizacao.endereco

Atual:
~~~json
"Praça IV Centenário"
~~~

Novo:
~~~json
"Avenida Antônio de Souza"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"186"
~~~

### localizacao.bairro

Atual:
~~~json
"Centro"
~~~

Novo:
~~~json
"Jardim Santa Francisca"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07013-090"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.4731
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.5273
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Casa do chefe da estação",
    "texto": "ConstruÃ­da no inÃ­cio do sÃ©culo XX para servir de moradia ao chefe da estaÃ§Ã£o ferroviÃ¡ria do antigo ramal Tramway da Cantareira.",
    "ordem": 0
  },
  {
    "icone": "importancia",
    "titulo": "Ligada à linha de trem",
    "texto": "A Tramway da Cantareira foi uma linha de trem fundamental para o transporte e a urbanizaÃ§Ã£o de Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "hoje",
    "titulo": "Depois da ferrovia",
    "texto": "A casa tambÃ©m pertenceu Ã  escola municipal que funcionou na estaÃ§Ã£o e chegou a sediar o Arquivo HistÃ³rico de Guarulhos. Foi tombada em 2000, junto com a estaÃ§Ã£o.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "É um dos raros remanescentes físicos da infraestrutura do *Tramway da Cantareira*, registrando a era da expansão dos transportes sobre trilhos e o urbanismo da cidade no início do século XX.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Casa do chefe da estação",
    "texto": "Construída no início do século XX para servir de moradia ao chefe da estação ferroviária do antigo ramal Tramway da Cantareira.",
    "ordem": 0
  },
  {
    "icone": "importancia",
    "titulo": "Ligada à linha de trem",
    "texto": "A Tramway da Cantareira foi uma linha de trem fundamental para o transporte e a urbanização de Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "hoje",
    "titulo": "Depois da ferrovia",
    "texto": "A casa também pertenceu à escola municipal que funcionou na estação e chegou a sediar o Arquivo Histórico de Guarulhos. Foi tombada em 2000, junto com a estação.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "É um dos raros remanescentes físicos da infraestrutura do *Tramway da Cantareira*, registrando a era da expansão dos transportes sobre trilhos e o urbanismo da cidade no início do século XX.",
    "ordem": 3
  },
  {
    "icone": "localizacao",
    "titulo": "Praça histórica e referência de acesso",
    "texto": "A Casa do Chefe da Estação fica na Praça Prefeito Paschoal Thomeu, na área historicamente referida como Praça IV Centenário. A Avenida Antônio de Souza delimita essa praça, no Jardim Santa Francisca. O cadastro mantém Avenida Antônio de Souza, 186, e as coordenadas da pesquisa Maps do responsável como referência de acesso. A documentação consultada confirma a praça e o bairro, mas não confirma independentemente o número 186.",
    "ordem": 4
  }
]
~~~

## Antigo Paço Municipal

ID: da393d15-dc94-4321-bacd-274d6633be04. Slug preservado: antigo-paco-municipal. Ação: ATUALIZAR.

### descricao

Atual:
~~~json
"Edifício em estilo eclético que funcionou como sede unificada dos poderes Executivo e Legislativo de Guarulhos em meados do século XX."
~~~

Novo:
~~~json
"Edifício histórico da Rua Sete de Setembro, 164, ligado à administração municipal e a diferentes serviços públicos de Guarulhos. As obras começaram em 1921 e o imóvel é protegido pelo Decreto Municipal nº 21.143/2000."
~~~

### descricaoResumida

Atual:
~~~json
"Edifício em estilo eclético que funcionou como sede unificada dos poderes Executivo e Legislativo de Guarulhos em meados do século XX."
~~~

Novo:
~~~json
"Antiga sede administrativa de Guarulhos, com obras iniciadas em 1921, que recebeu serviços públicos e culturais e é protegida pelo Decreto nº 21.143/2000."
~~~

### historia

Atual:
~~~json
"Abrigou a administração pública durante a fase de acelerado crescimento demográfico e industrial do município. Após a mudança dos órgãos administrativos para novas sedes, o imóvel foi protegido por tombamento municipal."
~~~

Novo:
~~~json
"As obras do Antigo Paço Municipal tiveram início em 1921. O edifício abrigou a Prefeitura, a Câmara e a Delegacia, além de receber, em diferentes períodos, o Departamento de Educação e Cultura, o Conservatório, o setor de Obras, parte do Fórum e a primeira Biblioteca Municipal. É protegido pelo Decreto Municipal nº 21.143/2000."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Possui elevado valor histórico e institucional por simbolizar a consolidação do poder público e a centralização administrativa do município no século XX."
~~~

### situacao

Atual:
~~~json
"NAO_INFORMADO"
~~~

Novo:
~~~json
"PRESERVADO"
~~~

### localizacao.endereco

Atual:
~~~json
"Rua Dom Pedro II"
~~~

Novo:
~~~json
"Rua Sete de Setembro"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"164"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07012-070"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.468
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.5296
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "arquitetura",
    "titulo": "Neoclássico, em tijolo maciço",
    "texto": "ConstruÃ­do entre 1919 e 1923 na esquina da Rua Sete de Setembro com a Rua FelÃ­cio Marcondes, Ã© um tÃ­pico exemplar da arquitetura neoclÃ¡ssica, feito em tijolos maciÃ§os e com porÃ£o. A fachada tem frontÃ£o, pinÃ¡culos e uma escultura de rosto feminino que representa DemÃ©ter, deusa grega do trigo.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Sede do poder municipal",
    "texto": "Entre 1923 e 1940 abrigou a CÃ¢mara dos Vereadores (andar superior), a Prefeitura e a Delegacia (tÃ©rreo) e a Cadeia PÃºblica (porÃ£o). A CÃ¢mara saiu em 1951 e a Prefeitura se mudou para a PraÃ§a GetÃºlio Vargas em 1958.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "Depois da prefeitura",
    "texto": "Com a saÃ­da da prefeitura, o prÃ©dio recebeu o Departamento de EducaÃ§Ã£o e Cultura, o ConservatÃ³rio Municipal, o Departamento de Obras e a Junta de Alistamento Militar.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Reformas e perdas",
    "texto": "Ganhou anexos nos anos 1940 e, nos anos 1980, teve as esquadrias originais trocadas e a escada da fachada retirada, o que desfez a simetria tÃ­pica do estilo. Em 2017, um projeto de restauro foi aprovado pelo conselho do patrimÃ´nio, mas parte do forro original foi arrancada um dia depois.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Possui elevado valor histórico e institucional por simbolizar a consolidação do poder público e a centralização administrativa do município no século XX.",
    "ordem": 4
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "arquitetura",
    "titulo": "Neoclássico, em tijolo maciço",
    "texto": "Com obras iniciadas em 1921, o prédio da Rua Sete de Setembro é um exemplar de arquitetura neoclássica em tijolos maciços e com porão. A fachada apresenta frontão, pináculos e escultura de rosto feminino.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Sede do poder municipal",
    "texto": "As obras do Antigo Paço Municipal tiveram início em 1921. O edifício abrigou a Prefeitura, a Câmara e a Delegacia, além de receber, em diferentes períodos, o Departamento de Educação e Cultura, o Conservatório, o setor de Obras, parte do Fórum e a primeira Biblioteca Municipal. É protegido pelo Decreto Municipal nº 21.143/2000.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "Depois da prefeitura",
    "texto": "Com a saída da prefeitura, o prédio recebeu o Departamento de Educação e Cultura, o Conservatório Municipal, o Departamento de Obras e a Junta de Alistamento Militar.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Reformas e perdas",
    "texto": "Ganhou anexos nos anos 1940 e, nos anos 1980, teve as esquadrias originais trocadas e a escada da fachada retirada, o que desfez a simetria típica do estilo. Em 2017, um projeto de restauro foi aprovado pelo conselho do patrimônio, mas parte do forro original foi arrancada um dia depois.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Possui elevado valor histórico e institucional por simbolizar a consolidação do poder público e a centralização administrativa do município no século XX.",
    "ordem": 4
  }
]
~~~

## Centro Municipal de Educação Adamastor

ID: 1635fa98-0c15-4622-83bb-450aede5f51a. Slug preservado: antiga-fabrica-adamastor. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Antiga Fábrica Adamastor"
~~~

Novo:
~~~json
"Centro Municipal de Educação Adamastor"
~~~

### descricao

Atual:
~~~json
"Fábrica de Tecidos e Casimiras Adamastor, um dos primeiros grandes empreendimentos fabris de Guarulhos, hoje Centro Municipal de Educação Adamastor."
~~~

Novo:
~~~json
"Complexo de patrimônio industrial reabilitado localizado próximo à Rodovia Presidente Dutra. O projeto de reciclagem arquitetônica, assinado pelo arquiteto Ruy Ohtake no início dos anos 2000, manteve elementos estruturais originais, com destaque para a chaminé e o pavilhão central com colunas de tijolos aparentes, que contam com proteção por tombamento municipal."
~~~

### descricaoResumida

Atual:
~~~json
"Fábrica de Tecidos e Casimiras Adamastor, um dos primeiros grandes empreendimentos fabris de Guarulhos, hoje Centro Municipal de Educação Adamastor."
~~~

Novo:
~~~json
"Antigo complexo industrial têxtil reabilitado por Ruy Ohtake, preservando a chaminé e o pavilhão central de tijolos para atuar como centro cultural e educacional."
~~~

### historia

Atual:
~~~json
"Fundada no início do século XX, contava com galpões em alvenaria de tijolos aparentes e coberturas em shed para iluminação natural. Operou por décadas até o encerramento das atividades no final do século XX. Em 2002, o imóvel foi desapropriado, restaurado e requalificado pelo município, reabrindo como Centro Municipal de Educação Adamastor, preservando as fachadas originais e abrigando teatros, bibliotecas e auditórios."
~~~

Novo:
~~~json
"Instalado na década de 1940 como Fábrica de Casimiras Adamastor, o parque industrial participou ativamente do surto de industrialização de Guarulhos. Após o encerramento das atividades fabris, a área foi adquirida e reconvertida pela municipalidade em polo educacional, cultural e de eventos."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Exemplo notável de reconversão funcional de patrimônio industrial paulista, conectando a memória do trabalho e da industrialização local ao acesso contemporâneo à cultura e educação."
~~~

### categoriaId

Atual:
~~~json
"ff2c0fcd-f081-4183-97a9-20befd33d6f7"
~~~

Novo:
~~~json
"74be0e85-fae0-48f5-9563-f03358d97a70"
~~~

### localizacao.endereco

Atual:
~~~json
"Av. Monteiro Lobato, 734"
~~~

Novo:
~~~json
"Avenida Monteiro Lobato"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"734"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4632
~~~

Novo:
~~~json
-23.4668
~~~

### localizacao.longitude

Atual:
~~~json
-46.5251
~~~

Novo:
~~~json
-46.5222
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Antiga Fábrica Adamastor",
    "texto": "Relevante complexo fabril construÃ­do em meados do sÃ©culo XX.",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "De vila agrícola a polo industrial",
    "texto": "O complexo simbolizou a transiÃ§Ã£o de Guarulhos de uma vila agrÃ­cola/olaria para um dos maiores polos industriais do paÃ­s.",
    "ordem": 1
  },
  {
    "icone": "arquitetura",
    "titulo": "Reciclagem de uso",
    "texto": "Foi objeto de um grande projeto de reciclagem de uso arquitetÃ´nico.",
    "ordem": 2
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "Polo cultural, educacional e de convenÃ§Ãµes gerido pela Prefeitura.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Exemplo notável de reconversão funcional de patrimônio industrial paulista, conectando a memória do trabalho e da industrialização local ao acesso contemporâneo à cultura e educação.",
    "ordem": 4
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Antiga Fábrica Adamastor",
    "texto": "Relevante complexo fabril construído em meados do século XX.",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "De vila agrícola a polo industrial",
    "texto": "O complexo simbolizou a transição de Guarulhos de uma vila agrícola/olaria para um dos maiores polos industriais do país.",
    "ordem": 1
  },
  {
    "icone": "arquitetura",
    "titulo": "Reciclagem de uso",
    "texto": "Foi objeto de um grande projeto de reciclagem de uso arquitetônico.",
    "ordem": 2
  },
  {
    "icone": "hoje",
    "titulo": "O lugar hoje",
    "texto": "Polo cultural, educacional e de convenções gerido pela Prefeitura.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Exemplo notável de reconversão funcional de patrimônio industrial paulista, conectando a memória do trabalho e da industrialização local ao acesso contemporâneo à cultura e educação.",
    "ordem": 4
  }
]
~~~

## E.E. Conselheiro Crispiniano

ID: 1cbfd08a-4f53-4043-a8e2-2d305ed8cfc6. Slug preservado: escola-estadual-conselheiro-crispiniano. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Escola Estadual Conselheiro Crispiniano"
~~~

Novo:
~~~json
"E.E. Conselheiro Crispiniano"
~~~

### descricao

Atual:
~~~json
"Primeiro ginásio estadual de ensino secundário do município, erguido na década de 1950 em linguagem modernista paulista."
~~~

Novo:
~~~json
"Edificação escolar de arquitetura moderna localizada na Rua Arminda de Lima, nº 57, Vila Progresso. Projetada em 1960 pelos arquitetos João Batista Vilanova Artigas e Carlos Cascaldi, e construída entre 1961 e 1962, destaca-se pela estrutura em concreto armado e iluminação zenital. O pátio interno preserva um painel artístico de Mário Gruber, datado da década de 1970. É protegida pelo CONDEPHAAT (Resolução nº 80/2014) e pelo Decreto Municipal nº 21.143/2000."
~~~

### descricaoResumida

Atual:
~~~json
"Primeiro ginásio estadual de ensino secundário do município, erguido na década de 1950 em linguagem modernista paulista."
~~~

Novo:
~~~json
"Marco da arquitetura moderna paulista projetado por Vilanova Artigas e Carlos Cascaldi, tombado pelo CONDEPHAAT, contendo painel artístico de Mário Gruber."
~~~

### historia

Atual:
~~~json
"A edificação adota os preceitos da arquitetura escolar modernista paulista do período, com volumes retilíneos, pátios cobertos e brise-soleils para ventilação e iluminação natural. Seu tombamento protege o valor arquitetônico do prédio e sua relevância no desenvolvimento do ensino público da cidade."
~~~

Novo:
~~~json
"Criada originalmente sob a denominação de Ginásio Estadual de Guarulhos, a edificação foi concebida no âmbito dos programas estaduais de expansão do ensino público dos anos 1960 com diretrizes arquitetônicas inovadoras."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Representa um dos principais marcos da Escola Paulista de Arquitetura Moderna no município, integrando o patrimônio edificado público a obras de arte integradas."
~~~

### situacao

Atual:
~~~json
"NAO_INFORMADO"
~~~

Novo:
~~~json
"PRESERVADO"
~~~

### categoriaId

Atual:
~~~json
"ae364849-d7dd-4619-aec7-161870d8ad16"
~~~

Novo:
~~~json
"74be0e85-fae0-48f5-9563-f03358d97a70"
~~~

### localizacao.endereco

Atual:
~~~json
"Av. Arminda de Lima, 75 (esq. Rua Marret)"
~~~

Novo:
~~~json
"Rua Arminda de Lima"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"57"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07095-010"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4658
~~~

Novo:
~~~json
-23.4649
~~~

### localizacao.longitude

Atual:
~~~json
-46.53
~~~

Novo:
~~~json
-46.5338
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "ensino",
    "titulo": "Primeira escola secundária pública",
    "texto": "Primeira escola pÃºblica de ensino secundÃ¡rio da cidade. O prÃ©dio original abrigou o âGinÃ¡sio de Guarulhosâ.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Projeto de Vilanova Artigas",
    "texto": "O prÃ©dio foi projetado pelo renomado arquiteto modernista JoÃ£o Batista Vilanova Artigas em 1960.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Marco da arquitetura moderna",
    "texto": "O projeto Ã© marco da arquitetura moderna brasileira, tombado pelo Condephaat (processo nÂº 54.292/05) e tambÃ©m pelo municÃ­pio, em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Representa um dos principais marcos da Escola Paulista de Arquitetura Moderna no município, integrando o patrimônio edificado público a obras de arte integradas.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "ensino",
    "titulo": "Primeira escola secundária pública",
    "texto": "Primeira escola pública de ensino secundário da cidade. O prédio original abrigou o âGinásio de Guarulhosâ.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Projeto de Vilanova Artigas",
    "texto": "O prédio foi projetado pelo renomado arquiteto modernista João Batista Vilanova Artigas em 1960.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Marco da arquitetura moderna",
    "texto": "O projeto é marco da arquitetura moderna brasileira, tombado pelo Condephaat (processo nº 54.292/05) e também pelo município, em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Representa um dos principais marcos da Escola Paulista de Arquitetura Moderna no município, integrando o patrimônio edificado público a obras de arte integradas.",
    "ordem": 3
  }
]
~~~

## E.E. Capistrano de Abreu

ID: 70c26f92-2f28-49b9-9590-156fd4e4a5df. Slug preservado: escola-estadual-capistrano-de-abreu. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Escola Estadual Capistrano de Abreu"
~~~

Novo:
~~~json
"E.E. Capistrano de Abreu"
~~~

### descricao

Atual:
~~~json
"Escola erguida na década de 1930 sobre o terreno do antigo cemitério municipal do século XIX, com linguagem neoclássica e eclética."
~~~

Novo:
~~~json
"Edificação escolar de arquitetura acadêmica construída em alvenaria de tijolos, situada na Rua Capitão Gabriel, nº 393, no centro histórico. Possui amparo de proteção pelo Decreto Municipal nº 21.143/2000."
~~~

### descricaoResumida

Atual:
~~~json
"Escola erguida na década de 1930 sobre o terreno do antigo cemitério municipal do século XIX, com linguagem neoclássica e eclética."
~~~

Novo:
~~~json
"Primeira escola pública agrupada de Guarulhos, inaugurada em 1926 no centro da cidade, com arquitetura em alvenaria de tijolos."
~~~

### historia

Atual:
~~~json
"A escola ocupa o terreno onde existia, no século XIX, o antigo cemitério municipal voltado a vítimas de epidemias como a varíola. Após a desativação do cemitério, a área foi utilizada na década de 1930 para a construção do primeiro Grupo Escolar da cidade. O prédio possui linguagem neoclássica e eclética, típica das construções escolares paulistas da era Vargas, tendo recebido o nome do historiador Capistrano de Abreu em 1947."
~~~

Novo:
~~~json
"Inaugurada em 1º de julho de 1926 sob o nome \"Grupo Escolar de Guarulhos\", foi a primeira escola agrupada instalada no município. Em 1947, teve seu nome alterado para homenagear o historiador João Capistrano de Abreu."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Registro fundamental da história da educação pública guarulhense e da arquitetura escolar paulista da Primeira República."
~~~

### situacao

Atual:
~~~json
"NAO_INFORMADO"
~~~

Novo:
~~~json
"PRESERVADO"
~~~

### categoriaId

Atual:
~~~json
"ae364849-d7dd-4619-aec7-161870d8ad16"
~~~

Novo:
~~~json
"74be0e85-fae0-48f5-9563-f03358d97a70"
~~~

### localizacao.endereco

Atual:
~~~json
"Rua Capitão Gabriel, 385"
~~~

Novo:
~~~json
"Rua Capitão Gabriel"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"393"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4661
~~~

Novo:
~~~json
-23.4658
~~~

### localizacao.longitude

Atual:
~~~json
-46.5315
~~~

Novo:
~~~json
-46.5304
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "ensino",
    "titulo": "Um dos primeiros grupos escolares",
    "texto": "Um dos primeiros grupos escolares construÃ­dos no municÃ­pio.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Arquitetura acadêmica em tijolos",
    "texto": "Apresenta arquitetura acadÃªmica em alvenaria de tijolos.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Expansão da rede pública",
    "texto": "O prÃ©dio Ã© representativo da expansÃ£o da rede pÃºblica de ensino paulista no sÃ©culo XX. JÃ¡ constava, em 1990, na Lei OrgÃ¢nica e foi tombado pelo municÃ­pio em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Registro fundamental da história da educação pública guarulhense e da arquitetura escolar paulista da Primeira República.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "ensino",
    "titulo": "Um dos primeiros grupos escolares",
    "texto": "Um dos primeiros grupos escolares construídos no município.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Arquitetura acadêmica em tijolos",
    "texto": "Apresenta arquitetura acadêmica em alvenaria de tijolos.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Expansão da rede pública",
    "texto": "O prédio é representativo da expansão da rede pública de ensino paulista no século XX. Já constava, em 1990, na Lei Orgânica e foi tombado pelo município em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Registro fundamental da história da educação pública guarulhense e da arquitetura escolar paulista da Primeira República.",
    "ordem": 3
  }
]
~~~

## E.E. Dulce Breves Neves

ID: 6d8a1066-7fdf-4393-8cd2-6c9d891ed005. Slug preservado: e-e-dulce-breves-neves. Ação: ATUALIZAR.

### localizacao.endereco

Atual:
~~~json
"Rua Riolândia, s/n"
~~~

Novo:
~~~json
"Rua Orixá"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"1"
~~~

### localizacao.bairro

Atual:
~~~json
"Vila Galvão"
~~~

Novo:
~~~json
"Jardim dos Afonsos / Cocaia"
~~~

### localizacao.cep

Atual:
~~~json
"07071-020"
~~~

Novo:
~~~json
"07131-410"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4589
~~~

Novo:
~~~json
-23.4326
~~~

### localizacao.longitude

Atual:
~~~json
-46.5501
~~~

Novo:
~~~json
-46.5204
~~~

## Igreja de N. Sra. do Rosário dos Homens Pretos

ID: f6dc84b2-7876-48b6-beaa-26e68bdb1f3f. Slug preservado: igreja-de-nossa-senhora-do-rosario-dos-homens-pretos. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Igreja de Nossa Senhora do Rosário dos Homens Pretos"
~~~

Novo:
~~~json
"Igreja de N. Sra. do Rosário dos Homens Pretos"
~~~

### descricao

Atual:
~~~json
"Igreja do século XIX erguida pela Irmandade dos Homens Pretos, principal marco religioso e cultural da população afro-brasileira no centro de Guarulhos."
~~~

Novo:
~~~json
"Edificação religiosa localizada na Praça do Rosário, na área central de Guarulhos. Foi construída meados do século XX para dar continuidade às atividades religiosas da comunidade local."
~~~

### descricaoResumida

Atual:
~~~json
"Igreja do século XIX erguida pela Irmandade dos Homens Pretos, principal marco religioso e cultural da população afro-brasileira no centro de Guarulhos."
~~~

Novo:
~~~json
"Templo religioso edificado em meados do século XX na Praça do Rosário, mantendo a devoção da Irmandade dos Homens Pretos."
~~~

### historia

Atual:
~~~json
"A Irmandade dos Homens Pretos foi criada por pessoas escravizadas e libertas para garantir apoio mútuo, alforrias e celebrações religiosas. A edificação colonial em taipa passou por reformas ao longo do século XX que revestiram sua fachada em alvenaria."
~~~

Novo:
~~~json
"Erguida em substituição à igreja colonial original de taipa de pilão (localizada na antiga Rua Dom Pedro II e demolida entre 1928 e 1930 para readequação viária), a atual igreja foi construída para acolher a Irmandade dos Homens Pretos e seus devotos."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Espaço fundamental de preservação da memória, da devoção católica negra e da permanência da presença afro-brasileira no centro urbano de Guarulhos."
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07010-015"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.4673
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.5292
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "gente",
    "titulo": "Irmandades negras",
    "texto": "Templo ligado Ã s irmandades negras da cidade.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Quase 200 anos na Rua Dom Pedro II",
    "texto": "Fundada em meados do sÃ©culo XVIII, a igreja permaneceu por quase 200 anos no mesmo lugar, na atual Rua Dom Pedro II.",
    "ordem": 1
  },
  {
    "icone": "processo",
    "titulo": "Demolida e reconstruída em 1930",
    "texto": "Em 1930, o templo foi demolido, realocado, renomeado e reconstruÃ­do nas proximidades do sÃ­tio original.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Memória e apagamento",
    "texto": "Historiadores locais relacionam a mudanÃ§a ao afastamento da presenÃ§a negra da regiÃ£o central. Em 2006, uma mancha escura foi aplicada ao calÃ§amento da Rua Dom Pedro II para marcar o provÃ¡vel local da igreja original; segundo estudo publicado em 2017, o sÃ­tio ainda nÃ£o tinha reconhecimento oficial como patrimÃ´nio.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Fé e resistência",
    "texto": "A igreja Ã© sÃ­mbolo da fÃ© e da resistÃªncia afro-brasileira em Guarulhos.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Espaço fundamental de preservação da memória, da devoção católica negra e da permanência da presença afro-brasileira no centro urbano de Guarulhos.",
    "ordem": 5
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "gente",
    "titulo": "Irmandades negras",
    "texto": "Templo ligado às irmandades negras da cidade.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Quase 200 anos na Rua Dom Pedro II",
    "texto": "Fundada em meados do século XVIII, a igreja permaneceu por quase 200 anos no mesmo lugar, na atual Rua Dom Pedro II.",
    "ordem": 1
  },
  {
    "icone": "processo",
    "titulo": "Demolida e reconstruída em 1930",
    "texto": "Em 1930, o templo foi demolido, realocado, renomeado e reconstruído nas proximidades do sítio original.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Memória e apagamento",
    "texto": "Historiadores locais relacionam a mudança ao afastamento da presença negra da região central. Em 2006, uma mancha escura foi aplicada ao calçamento da Rua Dom Pedro II para marcar o provável local da igreja original; segundo estudo publicado em 2017, o sítio ainda não tinha reconhecimento oficial como patrimônio.",
    "ordem": 3
  },
  {
    "icone": "importancia",
    "titulo": "Fé e resistência",
    "texto": "A igreja é símbolo da fé e da resistência afro-brasileira em Guarulhos.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Espaço fundamental de preservação da memória, da devoção católica negra e da permanência da presença afro-brasileira no centro urbano de Guarulhos.",
    "ordem": 5
  }
]
~~~

## Igreja do Bom Jesus da Cabeça

ID: 5e955358-0cf7-490e-b96b-120bb6798085. Slug preservado: igreja-do-bom-jesus-da-cabeca. Ação: ATUALIZAR.

### descricao

Atual:
~~~json
"Igreja rural erguida nas primeiras décadas do século XX para atender trabalhadores agrícolas do Cabuçu, com traços neoclássicos vernaculares."
~~~

Novo:
~~~json
"Edificação religiosa de caráter rural situada no bairro do Cabuçu. O templo passou por remodelações ao longo do século XX, mas preserva características de capela de bairro e acolhe manifestações locais de devoção popular."
~~~

### descricaoResumida

Atual:
~~~json
"Igreja rural erguida nas primeiras décadas do século XX para atender trabalhadores agrícolas do Cabuçu, com traços neoclássicos vernaculares."
~~~

Novo:
~~~json
"Capela rural no bairro do Cabuçu associada à religiosidade popular e à memória da população negra da região."
~~~

### historia

Atual:
~~~json
"Sua denominação faz referência à devoção católica popular voltada à representação do Senhor Bom Jesus centrada na imagem da cabeça do Cristo. O edifício apresenta linhas arquitetônicas simples e vernaculares com traços neoclássicos, servindo como ponto comunitário e histórico da ocupação rural da Serra da Cantareira."
~~~

Novo:
~~~json
"A igreja desenvolveu-se a partir de uma capela erguida por volta de 1850. A historiografia local e a tradição oral atribuem sua fundação a Raimundo Fortes, homem negro escravizado e liberto."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Relevante marco da religiosidade popular rural e da história da população negra liberta no território de Guarulhos durante o período imperial."
~~~

### situacao

Atual:
~~~json
"NAO_INFORMADO"
~~~

Novo:
~~~json
"PRESERVADO"
~~~

### localizacao.endereco

Atual:
~~~json
"Estrada do Cabuçu, 58"
~~~

Novo:
~~~json
"Rua Hans Heitel Hohl"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"53"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07144-287"
~~~

### localizacao.latitude

Atual:
~~~json
-23.475
~~~

Novo:
~~~json
-23.4093
~~~

### localizacao.longitude

Atual:
~~~json
-46.538
~~~

Novo:
~~~json
-46.5398
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Devoção popular",
    "texto": "Tradicional templo de devoÃ§Ã£o popular, com raÃ­zes rurais.",
    "ordem": 0
  },
  {
    "icone": "fe",
    "titulo": "Caminhos de fé",
    "texto": "Representa a religiosidade e as caminhadas de fÃ© que marcaram os caminhos de passagem da cidade.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Tombada em 2000",
    "texto": "A igreja Ã© de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo municÃ­pio em 2000 (Decreto nÂº 21.143).",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Relevante marco da religiosidade popular rural e da história da população negra liberta no território de Guarulhos durante o período imperial.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Devoção popular",
    "texto": "Tradicional templo de devoção popular, com raízes rurais.",
    "ordem": 0
  },
  {
    "icone": "fe",
    "titulo": "Caminhos de fé",
    "texto": "Representa a religiosidade e as caminhadas de fé que marcaram os caminhos de passagem da cidade.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Tombada em 2000",
    "texto": "A igreja é de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo município em 2000 (Decreto nº 21.143).",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Relevante marco da religiosidade popular rural e da história da população negra liberta no território de Guarulhos durante o período imperial.",
    "ordem": 3
  }
]
~~~

## Capela do Bom Jesus do Macedo

ID: bf3a1eda-cace-420d-8498-632ce8d786a0. Slug preservado: capela-do-bom-jesus-do-macedo. Ação: ATUALIZAR.

### historia

Atual:
~~~json
null
~~~

Novo:
~~~json
"A capela tem origem por volta de 1900, ligada à religiosidade popular do antigo bairro do Macedo. A construção foi posteriormente refeita em alvenaria, com registro de reconstrução em 1935. Em 1972, a área foi declarada de utilidade pública para um projeto de alargamento da Avenida Monteiro Lobato, mas a desapropriação e a demolição não se concretizaram."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"É um dos marcos religiosos e comunitários da antiga ocupação do Macedo e um raro remanescente das transformações entre a paisagem rural e a urbanização de Guarulhos."
~~~

### localizacao.endereco

Atual:
~~~json
"Av. Monteiro Lobato, s/n"
~~~

Novo:
~~~json
"Avenida Monteiro Lobato"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"898"
~~~

### localizacao.latitude

Atual:
~~~json
-23.462
~~~

Novo:
~~~json
-23.4659
~~~

### localizacao.longitude

Atual:
~~~json
-46.521
~~~

Novo:
~~~json
-46.5211
~~~

## Locomotiva Maria Fumaça (Nº 33) e Vagão

ID: 77a15464-b001-4daf-9f61-7b25be4f90a6. Slug preservado: locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Locomotiva \"Maria Fumaça\" (Nº 33), Vagão e Caixa D'Água"
~~~

Novo:
~~~json
"Locomotiva Maria Fumaça (Nº 33) e Vagão"
~~~

### descricao

Atual:
~~~json
"Conjunto de bens móveis do Tramway da Cantareira (1915–1965): locomotiva a vapor alemã Borsig, vagão de madeira e caixa d'água metálica."
~~~

Novo:
~~~json
"Conjunto patrimonial móvel e monumento urbano situado na Praça IV Centenário, composto pela locomotiva a vapor nº 33, um vagão de passageiros e uma caixa d'água metálica para abastecimento de caldeiras."
~~~

### descricaoResumida

Atual:
~~~json
"Conjunto de bens móveis do Tramway da Cantareira (1915–1965): locomotiva a vapor alemã Borsig, vagão de madeira e caixa d'água metálica."
~~~

Novo:
~~~json
"Monumento ferroviário exposto na Praça IV Centenário com locomotiva a vapor nº 33, vagão e caixa d'água original."
~~~

### historia

Atual:
~~~json
"A locomotiva e o vagão eram responsáveis pelo transporte de passageiros, alunos e insumos industriais entre Guarulhos e São Paulo. A caixa d'água servia para o reabastecimento das caldeiras a vapor dos trens. Após a desativação do ramal ferroviário, as peças foram restauradas e tombadas como monumento público."
~~~

Novo:
~~~json
"O conjunto foi trazido e instalado na praça como monumento público com o objetivo de preservar a memória da linha férrea do *Tramway da Cantareira*, que funcionou no município de 1915 a 1965."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Elemento de resgate da memória visual do transporte ferroviário, que impulsionou o povoamento e a integração de Guarulhos à capital paulista no século XX."
~~~

### categoriaId

Atual:
~~~json
"117e4cd0-519e-4c74-b2cf-3d31d064701c"
~~~

Novo:
~~~json
"74be0e85-fae0-48f5-9563-f03358d97a70"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07011-040"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.4544
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.5328
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um conjunto ferroviário",
    "texto": "Conjunto formado pela locomotiva, pelo vagÃ£o e pela caixa d'Ã¡gua, na PraÃ§a IV CentenÃ¡rio.",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "Memória do Trenzinho",
    "texto": "O monumento preserva a memÃ³ria do Tramway da Cantareira (âTrenzinho de Guarulhosâ), operante atÃ© a dÃ©cada de 1960.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Elemento de resgate da memória visual do transporte ferroviário, que impulsionou o povoamento e a integração de Guarulhos à capital paulista no século XX.",
    "ordem": 2
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um conjunto ferroviário",
    "texto": "Conjunto formado pela locomotiva, pelo vagão e pela caixa d'água, na Praça IV Centenário.",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "Memória do Trenzinho",
    "texto": "O monumento preserva a memória do Tramway da Cantareira (âTrenzinho de Guarulhosâ), operante até a década de 1960.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Elemento de resgate da memória visual do transporte ferroviário, que impulsionou o povoamento e a integração de Guarulhos à capital paulista no século XX.",
    "ordem": 2
  }
]
~~~

## Dia da Carpição

ID: e2c31ddc-113e-48c4-a65d-b52671af4f5b. Slug preservado: dia-da-carpicao. Ação: ATUALIZAR.

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "tradicao",
    "titulo": "Tradição centenária",
    "texto": "Tradição religiosa e comunitária centenária que antecede a Festa do Bonsucesso.",
    "ordem": 0
  },
  {
    "icone": "fe",
    "titulo": "Limpeza como ato de fé",
    "texto": "Os fiéis limpam e carpem o entorno da igreja como ato de fé, pagamento de promessas e mutirão comunitário.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Importante bem imaterial da sociabilidade rural caipira e da religiosidade de matriz comunitária do estado de São Paulo.",
    "ordem": 2
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "tradicao",
    "titulo": "Tradição centenária",
    "texto": "Tradição religiosa e comunitária centenária que antecede a Festa do Bonsucesso.",
    "ordem": 0
  },
  {
    "icone": "fe",
    "titulo": "Limpeza como ato de fé",
    "texto": "Os fiéis limpam e carpem o entorno da igreja como ato de fé, pagamento de promessas e mutirão comunitário.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Importante bem imaterial da sociabilidade rural caipira e da religiosidade de matriz comunitária do estado de São Paulo.",
    "ordem": 2
  },
  {
    "icone": "localizacao",
    "titulo": "Referência territorial",
    "texto": "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
    "ordem": 3
  }
]
~~~

## Corporação Musical Banda Lira de Guarulhos

ID: 76088bd7-3dd9-4964-97dc-f903dd2272d6. Slug preservado: corporacao-musical-banda-lira-de-guarulhos. Ação: ATUALIZAR.

### localizacao.endereco

Atual:
~~~json
"Praça Getúlio Vargas, s/n"
~~~

Novo:
~~~json
"Praça Getúlio Vargas"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

## Cultura e Presença Indígena (Wassu Cocal e Krenak/Pankararu)

ID: 322b6f30-533b-4dde-b1b0-4ddada7f2228. Slug preservado: cultura-e-presenca-indigena-wassu-cocal-e-krenak-pankararu. Ação: ATUALIZAR.

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Os povos originários",
    "texto": "A história de Guarulhos possui uma forte relação com os povos indígenas que habitavam a região antes da colonização, especialmente os povos associados aos Guarus ou Guaramomis.",
    "ordem": 0
  },
  {
    "icone": "gente",
    "titulo": "Comunidades de hoje",
    "texto": "Atualmente, o município também possui comunidades indígenas de diferentes etnias, incluindo Wassu-Cocal, Pankararu, Pankararé, Guajajara e Tupi-Guarani.",
    "ordem": 1
  },
  {
    "icone": "tradicao",
    "titulo": "Tradições vivas",
    "texto": "A presença dessas comunidades ajuda a manter vivas diferentes tradições, memórias, histórias e formas de expressão cultural.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Matriz fundadora da ocupação do território, essencial para o combate ao apagamento histórico e para a afirmação das identidades, saberes e rituais originários.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Os povos originários",
    "texto": "A história de Guarulhos possui uma forte relação com os povos indígenas que habitavam a região antes da colonização, especialmente os povos associados aos Guarus ou Guaramomis.",
    "ordem": 0
  },
  {
    "icone": "gente",
    "titulo": "Comunidades de hoje",
    "texto": "Atualmente, o município também possui comunidades indígenas de diferentes etnias, incluindo Wassu-Cocal, Pankararu, Pankararé, Guajajara e Tupi-Guarani.",
    "ordem": 1
  },
  {
    "icone": "tradicao",
    "titulo": "Tradições vivas",
    "texto": "A presença dessas comunidades ajuda a manter vivas diferentes tradições, memórias, histórias e formas de expressão cultural.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Matriz fundadora da ocupação do território, essencial para o combate ao apagamento histórico e para a afirmação das identidades, saberes e rituais originários.",
    "ordem": 3
  },
  {
    "icone": "localizacao",
    "titulo": "Referência territorial",
    "texto": "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
    "ordem": 4
  }
]
~~~

## Praça Getúlio Vargas

ID: 0b3ce18c-8eed-4366-927c-88593b775306. Slug preservado: praca-getulio-vargas. Ação: ATUALIZAR.

### localizacao.endereco

Atual:
~~~json
"Praça Getúlio Vargas, s/n"
~~~

Novo:
~~~json
"Praça Presidente Getúlio Vargas / Av. Tiradentes"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.cep

Atual:
~~~json
"07011-000"
~~~

Novo:
~~~json
"07010-000"
~~~

## Cemitério São João Batista

ID: abf4351a-b8e3-4d73-8349-bdfc71bf1edc. Slug preservado: cemiterio-sao-joao-batista. Ação: ATUALIZAR.

### localizacao.endereco

Atual:
~~~json
"Rua Felício Marcondes, s/n"
~~~

Novo:
~~~json
"Rua Felício Marcondes"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"320"
~~~

### localizacao.latitude

Atual:
~~~json
-23.464
~~~

Novo:
~~~json
-23.4646
~~~

### localizacao.longitude

Atual:
~~~json
-46.532
~~~

Novo:
~~~json
-46.5292
~~~

## Reserva e Represa do Cabuçu

ID: aa70b9e0-cc00-4c2b-a12e-b70eaacc2d61. Slug preservado: represa-do-cabucu. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Represa do Cabuçu"
~~~

Novo:
~~~json
"Reserva e Represa do Cabuçu"
~~~

### descricao

Atual:
~~~json
"Inaugurada em 1908 no Parque Estadual da Cantareira, foi a primeira grande obra de saneamento da Região Metropolitana de São Paulo em concreto armado."
~~~

Novo:
~~~json
"Patrimônio ambiental e de engenharia localizado no Núcleo Cabuçu da Serra da Cantareira. O local abriga a Represa do Cabuçu, cuja barragem mede 15 metros de altura por 50 metros de extensão. A área possui tombamento estadual (CONDEPHAAT, Resolução nº 18/1983) e municipal (Decreto nº 21.143/2000)."
~~~

### descricaoResumida

Atual:
~~~json
"Inaugurada em 1908 no Parque Estadual da Cantareira, foi a primeira grande obra de saneamento da Região Metropolitana de São Paulo em concreto armado."
~~~

Novo:
~~~json
"Reserva ambiental na Cantareira que abriga a histórica Barragem do Cabuçu (1908), obra pioneira do concreto armado no Brasil."
~~~

### historia

Atual:
~~~json
"Projetada pela Repartição de Águas e Esgotos (RAE) para mitigar a escassez de água na capital, a barragem curvo-gravitacional preserva suas comportas e a casa de máquinas originais, sendo tombada como patrimônio tecnológico e ambiental."
~~~

Novo:
~~~json
"Concluída em 1908 para integrar o sistema de abastecimento de água da Região Metropolitana, a barragem do Cabuçu é reconhecida como a primeira obra de grande porte construída em concreto armado no Brasil."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Une relevância ecológica extrema (preservação da Mata Atlântica) a um marco histórico da engenharia civil e infraestrutura sanitária brasileira."
~~~

### localizacao.endereco

Atual:
~~~json
"Av. Pedro de Souza Lopes, s/n"
~~~

Novo:
~~~json
"Avenida Pedro de Souza Lopes"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"7903"
~~~

### localizacao.bairro

Atual:
~~~json
"Cabuçu"
~~~

Novo:
~~~json
"Jardim São Luís / Cabuçu"
~~~

### localizacao.cep

Atual:
~~~json
"07084-000"
~~~

Novo:
~~~json
"07075-170"
~~~

### localizacao.latitude

Atual:
~~~json
-23.402
~~~

Novo:
~~~json
-23.4021
~~~

### localizacao.longitude

Atual:
~~~json
-46.535
~~~

Novo:
~~~json
-46.5273
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "natureza",
    "titulo": "Serra da Cantareira",
    "texto": "Compreende o trecho guarulhense da Serra da Cantareira (do CabuÃ§u ao Bonsucesso), no Parque Estadual da Serra da Cantareira.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Uma represa pioneira",
    "texto": "A barragem da Represa do CabuÃ§u foi projetada com o perfil do engenheiro norte-americano Edward Wegmann, soluÃ§Ã£o considerada revolucionÃ¡ria na Ã©poca. Foi a primeira vez que o concreto armado foi usado em estruturas no Brasil, segundo tese da USP.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Abastecimento e proteção",
    "texto": "O conjunto Ã© essencial para a histÃ³ria do abastecimento de Ã¡gua. A Reserva Estadual da Cantareira Ã© tombada pelo Condephaat (processo nÂº 20.536/78), e o trecho do CabuÃ§u ao Bonsucesso tambÃ©m foi tombado pelo municÃ­pio em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Une relevância ecológica extrema (preservação da Mata Atlântica) a um marco histórico da engenharia civil e infraestrutura sanitária brasileira.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "natureza",
    "titulo": "Serra da Cantareira",
    "texto": "Compreende o trecho guarulhense da Serra da Cantareira (do Cabuçu ao Bonsucesso), no Parque Estadual da Serra da Cantareira.",
    "ordem": 0
  },
  {
    "icone": "historia",
    "titulo": "Uma represa pioneira",
    "texto": "A barragem da Represa do Cabuçu foi projetada com o perfil do engenheiro norte-americano Edward Wegmann, solução considerada revolucionária na época. Foi a primeira vez que o concreto armado foi usado em estruturas no Brasil, segundo tese da USP.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Abastecimento e proteção",
    "texto": "O conjunto é essencial para a história do abastecimento de água. A Reserva Estadual da Cantareira é tombada pelo Condephaat (processo nº 20.536/78), e o trecho do Cabuçu ao Bonsucesso também foi tombado pelo município em 2000.",
    "ordem": 2
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Une relevância ecológica extrema (preservação da Mata Atlântica) a um marco histórico da engenharia civil e infraestrutura sanitária brasileira.",
    "ordem": 3
  }
]
~~~

## Sítios Arqueológicos das Lavras Velhas do Geraldo

ID: 455ea7a1-af41-46a5-8837-bbc6a2be6e83. Slug preservado: sitios-arqueologicos-das-lavras-velhas-do-geraldo. Ação: ATUALIZAR.

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Mineração de ouro",
    "texto": "Área relacionada às antigas atividades de mineração de ouro na região de Lavras, com registros que remontam ao final do século XVI.",
    "ordem": 0
  },
  {
    "icone": "importancia",
    "titulo": "O primeiro ciclo econômico",
    "texto": "O local representa uma parte importante do primeiro ciclo econômico ligado à formação histórica de Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Área de altíssimo valor científico e arqueológico para o estudo das origens da mineração colonial no Brasil e da exploração do trabalho indígena e africano no período pombalino/quinhentista.",
    "ordem": 2
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Mineração de ouro",
    "texto": "Área relacionada às antigas atividades de mineração de ouro na região de Lavras, com registros que remontam ao final do século XVI.",
    "ordem": 0
  },
  {
    "icone": "importancia",
    "titulo": "O primeiro ciclo econômico",
    "texto": "O local representa uma parte importante do primeiro ciclo econômico ligado à formação histórica de Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Área de altíssimo valor científico e arqueológico para o estudo das origens da mineração colonial no Brasil e da exploração do trabalho indígena e africano no período pombalino/quinhentista.",
    "ordem": 2
  },
  {
    "icone": "localizacao",
    "titulo": "Referência territorial",
    "texto": "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
    "ordem": 3
  }
]
~~~

## Complexo do Lago dos Patos

ID: 4d40a562-4a68-49a7-8b78-b19efe0b4038. Slug preservado: complexo-do-lago-dos-patos. Ação: ATUALIZAR.

### localizacao.endereco

Atual:
~~~json
"Praça Cícero Miranda, s/nº"
~~~

Novo:
~~~json
"Avenida Francisco Conde"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"723"
~~~

### localizacao.bairro

Atual:
~~~json
"Vila Galvão"
~~~

Novo:
~~~json
"Vila Rosália / Vila Galvão"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07074-030"
~~~

### localizacao.latitude

Atual:
~~~json
-23.4589
~~~

Novo:
~~~json
-23.4568
~~~

### localizacao.longitude

Atual:
~~~json
-46.5501
~~~

Novo:
~~~json
-46.554
~~~

## Antigo Poço Municipal

ID: 0d5d972f-ce0e-495b-91d4-07cfeafe79d5. Slug preservado: antigo-poco-municipal. Ação: ATUALIZAR_COM_RESSALVA.

### descricao

Atual:
~~~json
"Equipamento urbano histórico preservado no centro da cidade, composto por uma estrutura física de alvenaria destinada à captação de água do lençol freático."
~~~

Novo:
~~~json
"Estrutura histórica associada às antigas formas de captação e abastecimento de água na região central de Guarulhos, anterior à consolidação da rede moderna de saneamento."
~~~

### descricaoResumida

Atual:
~~~json
"Remanescente de poço público de captação de água das primeiras décadas do século XX no centro histórico."
~~~

Novo:
~~~json
"Registro da memória do abastecimento de água no centro de Guarulhos, quando poços e bicas ainda eram importantes para a população."
~~~

### historia

Atual:
~~~json
"Construído e utilizado nas primeiras décadas do século XX, o poço servia para a captação de água potável pela população urbana antes do estabelecimento das redes encanadas e do saneamento básico moderno."
~~~

Novo:
~~~json
"Nas primeiras décadas do século XX, antes da consolidação da rede pública de abastecimento, moradores de Guarulhos dependiam de poços, córregos e bicas. O cadastro local associa este ponto a uma antiga estrutura de captação de água na região central. A identificação e a localização exata do equipamento ainda exigem confirmação documental no inventário ou no Arquivo Histórico Municipal."
~~~

### importanciaCultural

Atual:
~~~json
"Testemunho da infraestrutura serviços urbanos primários e dos modos de vida cotidianos no início do processo de urbanização do centro de Guarulhos."
~~~

Novo:
~~~json
"O registro remete à história da infraestrutura urbana, do saneamento e do acesso à água em Guarulhos, preservando a memória das formas de abastecimento anteriores à expansão da rede pública."
~~~

### localizacao.endereco

Atual:
~~~json
"Região Central de Guarulhos"
~~~

Novo:
~~~json
"Entorno da Praça Presidente Getúlio Vargas"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07010-000"
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Água antes do encanamento",
    "texto": "Estrutura histórica de abastecimento de água utilizada pela população no início do século XX, antes do saneamento encanado.",
    "ordem": 0
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Testemunho da infraestrutura serviços urbanos primários e dos modos de vida cotidianos no início do processo de urbanização do centro de Guarulhos.",
    "ordem": 1
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Água antes do encanamento",
    "texto": "Nas primeiras décadas do século XX, antes da consolidação da rede pública de abastecimento, moradores de Guarulhos dependiam de poços, córregos e bicas. O cadastro local associa este ponto a uma antiga estrutura de captação de água na região central. A identificação e a localização exata do equipamento ainda exigem confirmação documental no inventário ou no Arquivo Histórico Municipal.",
    "ordem": 0
  },
  {
    "icone": "alerta",
    "titulo": "Localização em pesquisa",
    "texto": "A identificação e a localização exatas deste antigo equipamento ainda precisam ser confirmadas em documentação do inventário municipal ou do Arquivo Histórico. O ponto exibido no mapa é uma referência aproximada da região central.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "O registro remete à história da infraestrutura urbana, do saneamento e do acesso à água em Guarulhos, preservando a memória das formas de abastecimento anteriores à expansão da rede pública.",
    "ordem": 2
  }
]
~~~

## Casarão Saraceni (Demolido em 2010)

ID: e6a6ecf1-73fe-4bd0-b3a6-210015577384. Slug preservado: casarao-saraceni. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Casarão Saraceni"
~~~

Novo:
~~~json
"Casarão Saraceni (Demolido em 2010)"
~~~

### descricao

Atual:
~~~json
"Casarão eclético do início do século XX, tombado em 2000 pelo COMPHIG e demolido em 2010, após revogação do tombamento, para expansão de estacionamento de shopping."
~~~

Novo:
~~~json
"Edificação residencial urbana em estilo *Art Nouveau* de alta relevância arquitetônica, com varandas e vitrais florais, localizada historicamente no bairro do Itapegica."
~~~

### descricaoResumida

Atual:
~~~json
"Casarão eclético do início do século XX, tombado em 2000 pelo COMPHIG e demolido em 2010, após revogação do tombamento, para expansão de estacionamento de shopping."
~~~

Novo:
~~~json
"Casarão em estilo *Art Nouveau* situado no Itapegica, tombado em 2000 e demolido ilegalmente em 2010."
~~~

### historia

Atual:
~~~json
"Construído na antiga Chácara Saraceni, pertenceu à família pioneira na industrialização local. Em novembro de 2010, após disputas judiciais e a revogação da portaria de proteção, a edificação foi demolida pela iniciativa privada para a expansão do estacionamento do shopping center construído no terreno."
~~~

Novo:
~~~json
"Erguido no início do século XX para a família de José Saraceni, o imóvel esteve ligado ao período de transição agrícola-industrial da cidade. Foi tombado pelo Decreto Municipal nº 21.143/2000, mas teve seu destombamento aprovado de forma irregular e acabou demolido na madrugada de 5 de novembro de 2010, fato que gerou condenações judiciais por improbidade administrativa."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Apesar de destruído, o caso tornou-se um marco jurídico e pedagógico sobre a luta contra a especulação imobiliária e em defesa do patrimônio histórico local."
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Uma família pioneira",
    "texto": "ConstruÃ­do no inÃ­cio do sÃ©culo XX na antiga ChÃ¡cara Saraceni, no bairro Itapegica, o casarÃ£o em estilo Art Nouveau pertenceu a uma das famÃ­lias pioneiras da cidade, proprietÃ¡ria tambÃ©m da primeira fÃ¡brica de sapatos e perneiras do municÃ­pio.",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "Da chácara à Olivetti",
    "texto": "Com a mudanÃ§a do perfil econÃ´mico do Itapegica, a Ã¡rea passou a abrigar as instalaÃ§Ãµes da fÃ¡brica de mÃ¡quinas de escrever Olivetti. O imÃ³vel era um raro exemplar mantido da arquitetura residencial da elite fabril do inÃ­cio do sÃ©culo passado.",
    "ordem": 1
  },
  {
    "icone": "arquitetura",
    "titulo": "Art Nouveau",
    "texto": "Apresentava caracterÃ­sticas do estilo Art Nouveau, com elementos decorativos na fachada, grandes esquadrias, varandas e outros detalhes que representavam a arquitetura residencial do inÃ­cio do sÃ©culo XX.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Tombado em 2000",
    "texto": "O casarÃ£o foi tombado em 2000 pelo Decreto Municipal nÂº 21.143. O lote pertencia ao Internacional Shopping Guarulhos.",
    "ordem": 3
  },
  {
    "icone": "processo",
    "titulo": "O destombamento",
    "texto": "A proteÃ§Ã£o foi revogada por uma emenda Ã  Lei OrgÃ¢nica do MunicÃ­pio, votada pelos vereadores. O conselho do patrimÃ´nio tambÃ©m aprovou o destombamento, com base em um parecer tÃ©cnico que considerava a obra pouco relevante.",
    "ordem": 4
  },
  {
    "icone": "alerta",
    "titulo": "A demolição",
    "texto": "Na madrugada de 5 de novembro de 2010, o casarÃ£o foi demolido em poucas horas. O episÃ³dio causou grande polÃªmica na cidade, e seus ecos ainda eram sentidos anos depois no conselho do patrimÃ´nio.",
    "ordem": 5
  },
  {
    "icone": "processo",
    "titulo": "Condenações em 2024",
    "texto": "Em aÃ§Ã£o do MinistÃ©rio PÃºblico iniciada em 2011, o Tribunal de JustiÃ§a de SÃ£o Paulo condenou por improbidade administrativa, em acÃ³rdÃ£o publicado em marÃ§o de 2024, o municÃ­pio, duas empresas e 39 pessoas fÃ­sicas, entre elas o prefeito e ex-vereadores, pelo destombamento irregular. As penas incluem perda da funÃ§Ã£o pÃºblica, suspensÃ£o dos direitos polÃ­ticos por trÃªs anos e multa.",
    "ordem": 6
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Apesar de destruído, o caso tornou-se um marco jurídico e pedagógico sobre a luta contra a especulação imobiliária e em defesa do patrimônio histórico local.",
    "ordem": 7
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Uma família pioneira",
    "texto": "Construído no início do século XX na antiga Chácara Saraceni, no bairro Itapegica, o casarão em estilo Art Nouveau pertenceu a uma das famílias pioneiras da cidade, proprietária também da primeira fábrica de sapatos e perneiras do município.",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "Da chácara à Olivetti",
    "texto": "Com a mudança do perfil econômico do Itapegica, a área passou a abrigar as instalações da fábrica de máquinas de escrever Olivetti. O imóvel era um raro exemplar mantido da arquitetura residencial da elite fabril do início do século passado.",
    "ordem": 1
  },
  {
    "icone": "arquitetura",
    "titulo": "Art Nouveau",
    "texto": "Apresentava características do estilo Art Nouveau, com elementos decorativos na fachada, grandes esquadrias, varandas e outros detalhes que representavam a arquitetura residencial do início do século XX.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Tombado em 2000",
    "texto": "O casarão foi tombado em 2000 pelo Decreto Municipal nº 21.143. O lote pertencia ao Internacional Shopping Guarulhos.",
    "ordem": 3
  },
  {
    "icone": "processo",
    "titulo": "O destombamento",
    "texto": "A proteção foi revogada por uma emenda à Lei Orgânica do Município, votada pelos vereadores. O conselho do patrimônio também aprovou o destombamento, com base em um parecer técnico que considerava a obra pouco relevante.",
    "ordem": 4
  },
  {
    "icone": "alerta",
    "titulo": "A demolição",
    "texto": "Na madrugada de 5 de novembro de 2010, o casarão foi demolido em poucas horas. O episódio causou grande polêmica na cidade, e seus ecos ainda eram sentidos anos depois no conselho do patrimônio.",
    "ordem": 5
  },
  {
    "icone": "processo",
    "titulo": "Condenações em 2024",
    "texto": "Em ação do Ministério Público iniciada em 2011, o Tribunal de Justiça de São Paulo condenou por improbidade administrativa, em acórdão publicado em março de 2024, o município, duas empresas e 39 pessoas físicas, entre elas o prefeito e ex-vereadores, pelo destombamento irregular. As penas incluem perda da função pública, suspensão dos direitos políticos por três anos e multa.",
    "ordem": 6
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Apesar de destruído, o caso tornou-se um marco jurídico e pedagógico sobre a luta contra a especulação imobiliária e em defesa do patrimônio histórico local.",
    "ordem": 7
  },
  {
    "icone": "localizacao",
    "titulo": "Referência territorial",
    "texto": "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
    "ordem": 8
  }
]
~~~

## Casarão Lima (Demolido em 2026)

ID: bec0a64f-95f1-46a0-af89-f79f65ab32a6. Slug preservado: casarao-lima. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Casarão Lima"
~~~

Novo:
~~~json
"Casarão Lima (Demolido em 2026)"
~~~

### descricao

Atual:
~~~json
"Casarão residencial da primeira metade do século XX na Avenida Monteiro Lobato, demolido em 2026 durante o processo administrativo de tombamento."
~~~

Novo:
~~~json
"Edificação residencial urbana construída na Avenida Monteiro Lobato, centro de Guarulhos, representativa do padrão construtivo residencial da primeira metade do século XX."
~~~

### descricaoResumida

Atual:
~~~json
"Casarão residencial da primeira metade do século XX na Avenida Monteiro Lobato, demolido em 2026 durante o processo administrativo de tombamento."
~~~

Novo:
~~~json
"Residência histórica da Av. Monteiro Lobato, demolida em junho de 2026 por falha administrativa municipal."
~~~

### historia

Atual:
~~~json
"Representava a arquitetura das elites comerciantes do centro urbano de Guarulhos. Enquanto o processo administrativo para a efetivação do seu tombamento tramitava no COMPHIG (Processo Administrativo nº 48.324/2021), a estrutura foi demolida por proprietários particulares em 2026, após obtenção de alvará de demolição junto à Secretaria de Desenvolvimento Urbano."
~~~

Novo:
~~~json
"Construído na expansão urbana pré-1950, teve seu tombamento requerido em 2021 pela AAPAH (PA 48.324/2021). Em março de 2026, a Justiça concedeu liminar embargando obras no imóvel; contudo, uma falha de comunicação entre secretarias levou à emissão de alvará e à sua demolição em junho de 2026."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Exemplificava a arquitetura residencial urbana das primeiras décadas do século XX no eixo expandido do centro de Guarulhos."
~~~

### localizacao.endereco

Atual:
~~~json
"Avenida Monteiro Lobato"
~~~

Novo:
~~~json
"Av. Monteiro Lobato"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07112-000"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.4668
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.529
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um casarão no centro",
    "texto": "Situado no nÃºmero 136 da Avenida Monteiro Lobato, no centro de Guarulhos, este imÃ³vel residencial foi erguido na primeira metade do sÃ©culo XX, refletindo o processo de expansÃ£o urbana e consolidaÃ§Ã£o da classe mÃ©dia mercantil ao longo do eixo viÃ¡rio que conectava o centro aos bairros em crescimento.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Arquitetura residencial urbana",
    "texto": "Era um exemplar da arquitetura residencial urbana prÃ©-1950, mantendo linhas tradicionais da ocupaÃ§Ã£o do centro expandido antes da verticalizaÃ§Ã£o e do avanÃ§o irrestrito do comÃ©rcio popular sobre as residÃªncias histÃ³ricas.",
    "ordem": 1
  },
  {
    "icone": "processo",
    "titulo": "Pedido de tombamento",
    "texto": "Em 2021, a AssociaÃ§Ã£o Amigos do PatrimÃ´nio e Arquivo HistÃ³rico (AAPAH) formalizou o pedido de tombamento municipal sob o Processo Administrativo nÂº 48.324/2021.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Alvará de demolição",
    "texto": "Enquanto o processo andava no conselho, os proprietÃ¡rios obtiveram alvarÃ¡ de demoliÃ§Ã£o junto Ã  Secretaria de Desenvolvimento Urbano, expondo a falta de articulaÃ§Ã£o do poder pÃºblico.",
    "ordem": 3
  },
  {
    "icone": "alerta",
    "titulo": "A demolição",
    "texto": "Em meados de 2026, o casarÃ£o foi inteiramente demolido.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Exemplificava a arquitetura residencial urbana das primeiras décadas do século XX no eixo expandido do centro de Guarulhos.",
    "ordem": 5
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um casarão no centro",
    "texto": "Situado no número 136 da Avenida Monteiro Lobato, no centro de Guarulhos, este imóvel residencial foi erguido na primeira metade do século XX, refletindo o processo de expansão urbana e consolidação da classe média mercantil ao longo do eixo viário que conectava o centro aos bairros em crescimento.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Arquitetura residencial urbana",
    "texto": "Era um exemplar da arquitetura residencial urbana pré-1950, mantendo linhas tradicionais da ocupação do centro expandido antes da verticalização e do avanço irrestrito do comércio popular sobre as residências históricas.",
    "ordem": 1
  },
  {
    "icone": "processo",
    "titulo": "Pedido de tombamento",
    "texto": "Em 2021, a Associação Amigos do Patrimônio e Arquivo Histórico (AAPAH) formalizou o pedido de tombamento municipal sob o Processo Administrativo nº 48.324/2021.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Alvará de demolição",
    "texto": "Enquanto o processo andava no conselho, os proprietários obtiveram alvará de demolição junto à Secretaria de Desenvolvimento Urbano, expondo a falta de articulação do poder público.",
    "ordem": 3
  },
  {
    "icone": "alerta",
    "titulo": "A demolição",
    "texto": "Em meados de 2026, o casarão foi inteiramente demolido.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Exemplificava a arquitetura residencial urbana das primeiras décadas do século XX no eixo expandido do centro de Guarulhos.",
    "ordem": 5
  }
]
~~~

## Casarão da Família Albertis (Demolido em 2023)

ID: 8a87d1b0-66c0-43e2-906c-1dbc94e76d92. Slug preservado: casarao-da-familia-albertis. Ação: ATUALIZAR.

Merge planejado: {"id":"c6d445ab-7259-4196-b422-26d2a5069858","slug":"casarao-do-sitio-ponte-alta","destinoId":"8a87d1b0-66c0-43e2-906c-1dbc94e76d92","acao":"ARQUIVAR","preservar":["localizacao","imagens","detalhes","documentos","autoria","publicadoEm"],"rotas":[]}

### nome

Atual:
~~~json
"Casarão da Família Albertis"
~~~

Novo:
~~~json
"Casarão da Família Albertis (Demolido em 2023)"
~~~

### descricao

Atual:
~~~json
"Casarão da década de 1940 com acervo artístico integrado (vitrais da Casa Conrado e painéis de Lisbeth Forell), demolido em 2023 durante estudos técnicos de tombamento."
~~~

Novo:
~~~json
"Casarão residencial da década de 1940, remanescente e sede do antigo Sítio Ponte Alta, associado à família Alberts/Albertis e marcado por elementos artísticos integrados, como vitrais da Casa Conrado e painel de azulejos de Lisbeth Forell."
~~~

### descricaoResumida

Atual:
~~~json
"Casarão da década de 1940 com acervo artístico integrado (vitrais da Casa Conrado e painéis de Lisbeth Forell), demolido em 2023 durante estudos técnicos de tombamento."
~~~

Novo:
~~~json
"Sede remanescente do antigo Sítio Ponte Alta, construída na década de 1940 e demolida em 2023, conhecida como Casarão da Família Albertis."
~~~

### historia

Atual:
~~~json
"Erguido no bairro Gopouva, continha vitrais do ateliê Casa Conrado e painéis de azulejos da artista Lisbeth Forell. Durante 2023, no decorrer dos estudos técnicos para a instrução de seu tombamento municipal (Processo Administrativo nº 49.511/2022), o imóvel foi demolido por iniciativa privada. Ativistas conseguiram resgatar os vitrais e o painel de azulejos antes da destruição final."
~~~

Novo:
~~~json
"Construído provavelmente na década de 1940 em estilo Neocolonial Missões, o casarão era a sede remanescente do antigo Sítio Ponte Alta e esteve associado à família Alberts. Possuía vitrais produzidos pela Casa Conrado e painel de azulejos da artista Lisbeth Forell. A AAPAH protocolou pedido de tombamento em 19 de setembro de 2022, sob o processo administrativo nº 49511/2022. O imóvel foi demolido em 20 de abril de 2023 antes da conclusão do processo de proteção."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Representava um raro exemplar da arquitetura residencial da região de Ponte Alta e reunia obras de arte integradas de relevante valor histórico e artístico. Sua demolição tornou-se referência para o debate sobre a proteção preventiva do patrimônio cultural de Guarulhos."
~~~

### localizacao.endereco

Atual:
~~~json
"Rua Zumbi dos Palmares, s/n"
~~~

Novo:
~~~json
"Rua Zumbi dos Palmares"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.bairro

Atual:
~~~json
"Gopouva"
~~~

Novo:
~~~json
"Ponte Alta"
~~~

### localizacao.cep

Atual:
~~~json
"07090-000"
~~~

Novo:
~~~json
"07179-330"
~~~

### localizacao.latitude

Atual:
~~~json
-23.471
~~~

Novo:
~~~json
-23.4115
~~~

### localizacao.longitude

Atual:
~~~json
-46.535
~~~

Novo:
~~~json
-46.4285
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um casarão dos anos 1940",
    "texto": "ConstruÃ­do provavelmente na dÃ©cada de 1940 no bairro Gopouva (ao final da Rua Zumbi dos Palmares), o casarÃ£o pertenceu Ã  famÃ­lia Albertis. Para a AAPAH, era a casa mais antiga da regiÃ£o dos bairros Anita Garibaldi, Santa Paula e Ponte Alta.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Neocolonial Missões",
    "texto": "Em estilo Neocolonial MissÃµes, o casarÃ£o era Ãºnico e uma evidÃªncia do processo de ocupaÃ§Ã£o da regiÃ£o na primeira metade do sÃ©culo XX.",
    "ordem": 1
  },
  {
    "icone": "arquitetura",
    "titulo": "Um acervo artístico singular",
    "texto": "PossuÃ­a um acervo decorativo e artÃ­stico integrado de valor histÃ³rico singular: continha vitrais originais encomendados e produzidos pela prestigiada Casa Conrado (famoso ateliÃª paulistano responsÃ¡vel pelos vitrais do Mercado Municipal de SÃ£o Paulo) e um painel de azulejos assinado pela renomada artista tcheco-brasileira Lisbeth Forell.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Pedido de tombamento",
    "texto": "A AAPAH solicitou o tombamento do imÃ³vel em 19 de setembro de 2022, sob o Processo Administrativo nÂº 49.511/2022.",
    "ordem": 3
  },
  {
    "icone": "alerta",
    "titulo": "A demolição",
    "texto": "Em 20 de abril de 2023, antes da deliberaÃ§Ã£o do conselho, o novo proprietÃ¡rio optou pela demoliÃ§Ã£o completa da casa. Da construÃ§Ã£o restou o entulho, levado em um cortejo de caminhÃµes.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "O que foi resgatado",
    "texto": "Ativistas da memÃ³ria local conseguiram retirar os vitrais da Casa Conrado e os azulejos de Lisbeth Forell a tempo, antes da destruiÃ§Ã£o total do imÃ³vel.",
    "ordem": 5
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Representava o patrimônio edificado do bairro Gopouva e guardava elementos raros das artes decorativas aplicadas à arquitetura residencial paulista.",
    "ordem": 6
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Um casarão dos anos 1940",
    "texto": "Provavelmente construído na década de 1940, era remanescente e sede do antigo Sítio Ponte Alta, associado à família Alberts/Albertis e à história de Ponte Alta, Anita Garibaldi e Santa Paula.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Neocolonial Missões",
    "texto": "Em estilo Neocolonial Missões, o casarão era único e uma evidência do processo de ocupação da região na primeira metade do século XX.",
    "ordem": 1
  },
  {
    "icone": "arquitetura",
    "titulo": "Um acervo artístico singular",
    "texto": "Possuía um acervo decorativo e artístico integrado de valor histórico singular: continha vitrais originais encomendados e produzidos pela prestigiada Casa Conrado (famoso ateliê paulistano responsável pelos vitrais do Mercado Municipal de São Paulo) e um painel de azulejos assinado pela renomada artista tcheco-brasileira Lisbeth Forell.",
    "ordem": 2
  },
  {
    "icone": "processo",
    "titulo": "Pedido de tombamento",
    "texto": "A AAPAH solicitou o tombamento do imóvel em 19 de setembro de 2022, sob o Processo Administrativo nº 49.511/2022.",
    "ordem": 3
  },
  {
    "icone": "alerta",
    "titulo": "A demolição",
    "texto": "Em 20 de abril de 2023, antes da deliberação do conselho, o novo proprietário optou pela demolição completa da casa. Da construção restou o entulho, levado em um cortejo de caminhões.",
    "ordem": 4
  },
  {
    "icone": "importancia",
    "titulo": "O que foi resgatado",
    "texto": "Ativistas da memória local conseguiram retirar os vitrais da Casa Conrado e os azulejos de Lisbeth Forell a tempo, antes da destruição total do imóvel.",
    "ordem": 5
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Representava um raro exemplar da arquitetura residencial da região de Ponte Alta e reunia obras de arte integradas de relevante valor histórico e artístico. Sua demolição tornou-se referência para o debate sobre a proteção preventiva do patrimônio cultural de Guarulhos.",
    "ordem": 6
  },
  {
    "icone": "localizacao",
    "titulo": "Localização histórica aproximada",
    "texto": "A Rua Zumbi dos Palmares e as coordenadas são referências aproximadas da localização histórica. O centro exato do antigo lote não foi confirmado independentemente.",
    "ordem": 7
  },
  {
    "icone": "historia",
    "titulo": "História",
    "texto": "Construído provavelmente na década de 1940 em estilo Neocolonial Missões, o casarão era a sede remanescente do antigo Sítio Ponte Alta e esteve associado à família Alberts. Possuía vitrais produzidos pela Casa Conrado e painel de azulejos da artista Lisbeth Forell. A AAPAH protocolou pedido de tombamento em 19 de setembro de 2022, sob o processo administrativo nº 49511/2022. O imóvel foi demolido em 20 de abril de 2023 antes da conclusão do processo de proteção.",
    "ordem": 8
  }
]
~~~

### duplicado.status

Atual:
~~~json
"RASCUNHO"
~~~

Novo:
~~~json
"ARQUIVADO"
~~~

## Antiga Carbonell Fiação e Tecelagem e Casarões Gêmeos (Demolidos)

ID: e578c50a-15a9-46b9-8542-f7d21c521a19. Slug preservado: antiga-carbonell-fiacao-e-tecelagem-e-casaroes-gemeos-demolidos. Ação: ATUALIZAR.

### descricao

Atual:
~~~json
"Fábrica têxtil dos irmãos Carbonell (1923) e seus casarões gêmeos; o último casarão caiu em 2009 para dar lugar a torres residenciais."
~~~

Novo:
~~~json
"Antigo complexo têxtil ligado à família Carbonell e ao processo inicial de industrialização de Guarulhos. A fábrica e os casarões residenciais associados desapareceram com as transformações urbanas do centro."
~~~

### descricaoResumida

Atual:
~~~json
"Fábrica têxtil dos irmãos Carbonell (1923) e seus casarões gêmeos; o último casarão caiu em 2009 para dar lugar a torres residenciais."
~~~

Novo:
~~~json
"Complexo têxtil histórico da família Carbonell, ligado à industrialização de Guarulhos no início do século XX e posteriormente demolido."
~~~

### historia

Atual:
~~~json
null
~~~

Novo:
~~~json
"A implantação da Carbonell Fiação e Tecelagem possui divergência documental. Um guia de educação patrimonial de Guarulhos registra a fábrica em funcionamento em 1917, fundada por Henrique Carbonell. Pesquisa acadêmica da USP baseada na cronologia de João Ranali registra o início das atividades em 2 de abril de 1925, pelos irmãos Hilário e Henrique Carbonell, na Rua Força Pública, nº 292, com cerca de 160 operários. O complexo integrou o primeiro ciclo de industrialização da cidade e esteve associado a casarões residenciais da família. As estruturas foram posteriormente demolidas com a transformação imobiliária da região."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"O conjunto representa a primeira fase da industrialização de Guarulhos, a relação entre ferrovia, indústria e urbanização do centro e a memória do trabalho têxtil no município."
~~~

### localizacao.endereco

Atual:
~~~json
"Região Central de Guarulhos"
~~~

Novo:
~~~json
"Rua Força Pública"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"292"
~~~

### localizacao.cep

Atual:
~~~json
"07010-000"
~~~

Novo:
~~~json
"07012-030"
~~~

### localizacao.latitude

Atual:
~~~json
-23.465
~~~

Novo:
~~~json
-23.47254
~~~

### localizacao.longitude

Atual:
~~~json
-46.531
~~~

Novo:
~~~json
-46.53156
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Pioneiros da indústria têxtil",
    "texto": "Os irmãos Hilário e Henrique Carbonell inauguraram em 1923, em Guarulhos, a Fábrica de Tecidos Carbonell (Carbonell Fiação e Tecelagem), uma das mais importantes indústrias têxteis da época.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Dois casarões idênticos",
    "texto": "Junto à fábrica havia dois casarões idênticos da família. Um já havia sido descaracterizado; o outro abrigou, até pouco antes da demolição, o Colégio Eleonora Carbonell, nome que homenageia a esposa de Henrique Carbonell.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "O fim da fábrica",
    "texto": "A fábrica fechou as portas na década de 1990 e já havia desaparecido do terreno quando o último casarão foi demolido.",
    "ordem": 2
  },
  {
    "icone": "alerta",
    "titulo": "A demolição em 2009",
    "texto": "O último casarão foi demolido em poucos dias, em 2009, com a anuência da prefeitura, para dar lugar a torres residenciais de uma construtora. Segundo o site São Paulo Antiga, nenhum jornal da cidade noticiou o fato.",
    "ordem": 3
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "Pioneiros da indústria têxtil",
    "texto": "A implantação da Carbonell Fiação e Tecelagem possui divergência documental. Um guia de educação patrimonial de Guarulhos registra a fábrica em funcionamento em 1917, fundada por Henrique Carbonell. Pesquisa acadêmica da USP baseada na cronologia de João Ranali registra o início das atividades em 2 de abril de 1925, pelos irmãos Hilário e Henrique Carbonell, na Rua Força Pública, nº 292, com cerca de 160 operários. O complexo integrou o primeiro ciclo de industrialização da cidade e esteve associado a casarões residenciais da família. As estruturas foram posteriormente demolidas com a transformação imobiliária da região.",
    "ordem": 0
  },
  {
    "icone": "arquitetura",
    "titulo": "Dois casarões idênticos",
    "texto": "Junto à fábrica havia dois casarões idênticos da família. Um já havia sido descaracterizado; o outro abrigou, até pouco antes da demolição, o Colégio Eleonora Carbonell, nome que homenageia a esposa de Henrique Carbonell.",
    "ordem": 1
  },
  {
    "icone": "tempo",
    "titulo": "O fim da fábrica",
    "texto": "A fábrica fechou as portas na década de 1990 e já havia desaparecido do terreno quando o último casarão foi demolido.",
    "ordem": 2
  },
  {
    "icone": "alerta",
    "titulo": "A demolição em 2009",
    "texto": "O último casarão foi demolido em poucos dias, em 2009, com a anuência da prefeitura, para dar lugar a torres residenciais de uma construtora. Segundo o site São Paulo Antiga, nenhum jornal da cidade noticiou o fato.",
    "ordem": 3
  },
  {
    "icone": "processo",
    "titulo": "Datas históricas divergentes",
    "texto": "As fontes consultadas não são unânimes quanto ao início da fábrica: há registro municipal de 1917 e pesquisa acadêmica baseada em João Ranali que aponta 2 de abril de 1925. Por isso, o cadastro preserva a divergência em vez de adotar uma única data como absoluta.",
    "ordem": 4
  },
  {
    "icone": "localizacao",
    "titulo": "Localização histórica",
    "texto": "A Rua Força Pública, nº 292, é documentada como endereço da fábrica em pesquisa acadêmica. As coordenadas usadas no mapa são uma referência aproximada do logradouro atual, não a confirmação do centro exato do antigo lote fabril.",
    "ordem": 5
  }
]
~~~

## Antiga Igreja Matriz Colonial de N. Sra. da Conceição (Demolida)

ID: e3bf1831-a531-4850-8546-c6677d074c35. Slug preservado: antiga-igreja-matriz-colonial-de-nossa-senhora-da-conceicao. Ação: ATUALIZAR.

### nome

Atual:
~~~json
"Antiga Igreja Matriz Colonial de Nossa Senhora da Conceição"
~~~

Novo:
~~~json
"Antiga Igreja Matriz Colonial de N. Sra. da Conceição (Demolida)"
~~~

### descricao

Atual:
~~~json
"Igreja colonial barroca em taipa de pilão, marco zero da fundação de Guarulhos, desmantelada entre as décadas de 1930 e 1950 para dar lugar à atual Catedral."
~~~

Novo:
~~~json
"Edificação religiosa colonial de grande porte construída em taipa de pilão, com paredes espessas e telhas capa-e-canal, situada na atual Praça Tereza Cristina."
~~~

### descricaoResumida

Atual:
~~~json
"Igreja colonial barroca em taipa de pilão, marco zero da fundação de Guarulhos, desmantelada entre as décadas de 1930 e 1950 para dar lugar à atual Catedral."
~~~

Novo:
~~~json
"Igreja colonial de taipa de pilão concluída em 1743 e gradativamente desmantelada entre os anos 1930 e 1960."
~~~

### historia

Atual:
~~~json
"Erguida em taipa de pilão a partir do século XVII sob orientação jesuítica, era o marco zero da fundação de Guarulhos, com paredes espessas de taipa, piso em barro batido/madeira e altares esculpidos em madeira. Entre as décadas de 1930 e 1950, a estrutura foi totalmente desmantelada e demolida em etapas para abrir espaço à construção da atual Catedral de Guarulhos."
~~~

Novo:
~~~json
"Originada no aldeamento jesuítico de 1560, a igreja de taipa teve sua estrutura definitiva concluída em 1743. Considerada ultrapassada para o crescimento demográfico do século XX, foi desmontada por partes entre as décadas de 1930 e 1960 para abrir espaço à atual Catedral."
~~~

### importanciaCultural

Atual:
~~~json
null
~~~

Novo:
~~~json
"Principal monumento colonial paulista da cidade, cuja destruição representou a perda do maior testemunho edificado dos séculos XVII e XVIII no centro urbano."
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "A missão jesuítica",
    "texto": "A primeira edificaÃ§Ã£o religiosa no local data de meados do sÃ©culo XVI (por volta de 1560), originada na missÃ£o jesuÃ­tica junto aos povos indÃ­genas nativos (Maromomis/Guarus).",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "A matriz em taipa de pilão",
    "texto": "Ao longo do sÃ©culo XVII, uma estrutura definitiva em taipa de pilÃ£o foi erguida, tornando-se a Igreja Matriz da Freguesia de Nossa Senhora da ConceiÃ§Ã£o dos Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "O marco zero de Guarulhos",
    "texto": "Tratava-se do marco zero fundacional de Guarulhos.",
    "ordem": 2
  },
  {
    "icone": "arquitetura",
    "titulo": "Colonial barroca paulista",
    "texto": "A matriz colonial era um exemplar puro da arquitetura colonial barroca paulista, caracterizada por paredes espessas de taipa de pilÃ£o, piso em barro batido/madeira, telhamento de capa e canal e altares esculpidos em madeira retalhada.",
    "ordem": 3
  },
  {
    "icone": "processo",
    "titulo": "Uma igreja “acanhada”",
    "texto": "Com o crescimento populacional no inÃ­cio do sÃ©culo XX, a edificaÃ§Ã£o colonial passou a ser considerada acanhada e de difÃ­cil manutenÃ§Ã£o.",
    "ordem": 4
  },
  {
    "icone": "alerta",
    "titulo": "Desmanchada em etapas",
    "texto": "Entre as dÃ©cadas de 1930 e meados de 1950, a ancestral matriz de taipa foi gradualmente desmanchada e demolida em etapas para dar lugar Ã  atual Catedral em estilo neoclÃ¡ssico.",
    "ordem": 5
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Principal monumento colonial paulista da cidade, cuja destruição representou a perda do maior testemunho edificado dos séculos XVII e XVIII no centro urbano.",
    "ordem": 6
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "A missão jesuítica",
    "texto": "A primeira edificação religiosa no local data de meados do século XVI (por volta de 1560), originada na missão jesuítica junto aos povos indígenas nativos (Maromomis/Guarus).",
    "ordem": 0
  },
  {
    "icone": "tempo",
    "titulo": "A matriz em taipa de pilão",
    "texto": "Ao longo do século XVII, uma estrutura definitiva em taipa de pilão foi erguida, tornando-se a Igreja Matriz da Freguesia de Nossa Senhora da Conceição dos Guarulhos.",
    "ordem": 1
  },
  {
    "icone": "importancia",
    "titulo": "O marco zero de Guarulhos",
    "texto": "Tratava-se do marco zero fundacional de Guarulhos.",
    "ordem": 2
  },
  {
    "icone": "arquitetura",
    "titulo": "Colonial barroca paulista",
    "texto": "A matriz colonial era um exemplar puro da arquitetura colonial barroca paulista, caracterizada por paredes espessas de taipa de pilão, piso em barro batido/madeira, telhamento de capa e canal e altares esculpidos em madeira retalhada.",
    "ordem": 3
  },
  {
    "icone": "processo",
    "titulo": "Uma igreja “acanhada”",
    "texto": "Com o crescimento populacional no início do século XX, a edificação colonial passou a ser considerada acanhada e de difícil manutenção.",
    "ordem": 4
  },
  {
    "icone": "alerta",
    "titulo": "Desmanchada em etapas",
    "texto": "Entre as décadas de 1930 e meados de 1950, a ancestral matriz de taipa foi gradualmente desmanchada e demolida em etapas para dar lugar à atual Catedral em estilo neoclássico.",
    "ordem": 5
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Principal monumento colonial paulista da cidade, cuja destruição representou a perda do maior testemunho edificado dos séculos XVII e XVIII no centro urbano.",
    "ordem": 6
  },
  {
    "icone": "localizacao",
    "titulo": "Referência territorial",
    "texto": "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
    "ordem": 7
  }
]
~~~

## Primitiva Igreja de Nossa Senhora do Rosário dos Homens Pretos (1717)

ID: 558965e3-a5af-4682-9b45-3526eb49c838. Slug preservado: primitiva-igreja-de-nossa-senhora-do-rosario-dos-homens-pretos-1717. Ação: ATUALIZAR.

### descricao

Atual:
~~~json
"Edificação religiosa colonial em taipa de pilão construída na antiga Rua Dom Pedro II, centro urbano de Guarulhos."
~~~

Novo:
~~~json
"Sítio histórico da antiga igreja colonial de Nossa Senhora do Rosário dos Homens Pretos, construída no centro de Guarulhos e vinculada às irmandades negras da cidade."
~~~

### descricaoResumida

Atual:
~~~json
"Igreja colonial em taipa de pilão erguida em 1717 na antiga Rua Dom Pedro II e demolida entre 1928 e 1930."
~~~

Novo:
~~~json
"Antiga igreja da Irmandade dos Homens Pretos, erguida no período colonial e demolida nas reformas urbanas do início do século XX; seu sítio é hoje lembrado por marcação no piso do centro."
~~~

### historia

Atual:
~~~json
"Erguida em 1717 pela Irmandade dos Homens Pretos, foi a primeira igreja dedicada à população negra no município. O templo foi demolido entre 1928 e 1930 no âmbito das reformas urbanísticas de ampliação viária central. Atualmente, há uma marcação no piso do centro indicando sua localização original."
~~~

Novo:
~~~json
"A igreja foi construída no período colonial pela Irmandade dos Homens Pretos e tornou-se espaço de fé, sociabilidade, ajuda mútua e resistência da população negra escravizada e liberta de Guarulhos. O templo ficava na antiga Rua Dom Pedro II e foi demolido no processo de remodelação urbana do centro entre o final da década de 1920 e 1930. Atualmente, uma marcação no piso da região da Praça Conselheiro Crispiniano preserva a referência espacial de sua existência."
~~~

### importanciaCultural

Atual:
~~~json
"Marco pioneiro da sociabilidade, religiosidade e resistência da população negra escravizada e liberta no período colonial guarulhense. ``` eof"
~~~

Novo:
~~~json
"É um marco fundamental da memória da população negra de Guarulhos e da história das irmandades religiosas afro-brasileiras, além de representar um caso emblemático de apagamento e posterior recuperação da memória urbana."
~~~

### localizacao.endereco

Atual:
~~~json
null
~~~

Novo:
~~~json
"Calçadão da Rua Dom Pedro II / Praça Conselheiro Crispiniano"
~~~

### localizacao.numero

Atual:
~~~json
null
~~~

Novo:
~~~json
"s/n"
~~~

### localizacao.bairro

Atual:
~~~json
null
~~~

Novo:
~~~json
"Centro"
~~~

### localizacao.cep

Atual:
~~~json
null
~~~

Novo:
~~~json
"07010-003"
~~~

### localizacao.latitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-23.4671
~~~

### localizacao.longitude

Atual:
~~~json
null
~~~

Novo:
~~~json
-46.5312
~~~

### localizacao.cidade

Atual:
~~~json
null
~~~

Novo:
~~~json
"Guarulhos"
~~~

### localizacao.uf

Atual:
~~~json
null
~~~

Novo:
~~~json
"SP"
~~~

### detalhes

Atual:
~~~json
[
  {
    "icone": "historia",
    "titulo": "História",
    "texto": "Erguida em 1717 pela Irmandade dos Homens Pretos, foi a primeira igreja dedicada à população negra no município. O templo foi demolido entre 1928 e 1930 no âmbito das reformas urbanísticas de ampliação viária central. Atualmente, há uma marcação no piso do centro indicando sua localização original.",
    "ordem": 0
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "Marco pioneiro da sociabilidade, religiosidade e resistência da população negra escravizada e liberta no período colonial guarulhense. ``` eof",
    "ordem": 1
  }
]
~~~

Novo:
~~~json
[
  {
    "icone": "historia",
    "titulo": "História",
    "texto": "A igreja foi construída no período colonial pela Irmandade dos Homens Pretos e tornou-se espaço de fé, sociabilidade, ajuda mútua e resistência da população negra escravizada e liberta de Guarulhos. O templo ficava na antiga Rua Dom Pedro II e foi demolido no processo de remodelação urbana do centro entre o final da década de 1920 e 1930. Atualmente, uma marcação no piso da região da Praça Conselheiro Crispiniano preserva a referência espacial de sua existência.",
    "ordem": 0
  },
  {
    "icone": "importancia",
    "titulo": "Importância cultural",
    "texto": "É um marco fundamental da memória da população negra de Guarulhos e da história das irmandades religiosas afro-brasileiras, além de representar um caso emblemático de apagamento e posterior recuperação da memória urbana.",
    "ordem": 1
  },
  {
    "icone": "localizacao",
    "titulo": "Sítio de memória",
    "texto": "As coordenadas representam a marcação contemporânea associada à antiga igreja, no Calçadão da Rua Dom Pedro II / Praça Conselheiro Crispiniano. Não há templo existente neste ponto.",
    "ordem": 2
  }
]
~~~

### imagens.adicionar

Atual:
~~~json
[]
~~~

Novo:
~~~json
[
  {
    "url": "/uploads/patrimonios/igreja_nossa_senhora_rosario_homens.jpg",
    "textoAlternativo": "Primitiva Igreja de Nossa Senhora do Rosário dos Homens Pretos (1717)",
    "principal": true,
    "ordem": 0
  }
]
~~~

### imagem.arquivoLocal

Atual:
~~~json
null
~~~

Novo:
~~~json
"/uploads/patrimonios/igreja_nossa_senhora_rosario_homens.jpg"
~~~
