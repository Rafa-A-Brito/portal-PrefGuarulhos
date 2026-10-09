// Fonte canônica; decisões e ressalvas documentadas em prisma/SYNC_PATRIMONIOS.md.
export const PATRIMONIOS_SEED = [
    {
        nome: "Estação Ferroviária de Guarulhos",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Praça IV Centenário",
        numero: "s/n",
        cep: "07011-040",
        latitude: -23.4543,
        longitude: -46.5333,
        descricao:
            "Edificação remanescente da antiga estação ferroviária de Guarulhos, no conjunto historicamente referido como Praça IV Centenário. Sua fachada passou por alterações e a AAPAH registra intervenções de restauro. O imóvel é protegido pelo Decreto Municipal nº 21.143/2000.",
        descricaoResumida:
            "Edificação remanescente da estação de Guarulhos, inaugurada em 1915 e desativada em 1965, com fachada alterada e intervenções de restauro no conjunto da Praça IV Centenário.",
        historia:
            "Inaugurada em 1915 no ramal Guapira-Guarulhos do Tramway da Cantareira, a estação foi desativada em 1965. O Plano de Desenvolvimento Integrado do Turismo Sustentável de Guarulhos, na página 142, identifica a edificação como remanescente e registra alterações em sua fachada. A AAPAH documenta seu uso posterior pela EMEI da Estação e o restauro. A ficha corresponde a essa edificação histórica modificada ao longo do tempo; a versão anterior de demolição integral seguida de réplica não é sustentada por essas fontes.",
        importanciaCultural:
            "Símbolo histórico do início da modernização urbana e industrial do município provocada pela expansão dos meios de transporte.",
        imagem: "estacao_ferroviaria.png",
        detalhes: [
            {
                icone: "tempo",
                titulo: "Inauguração em 1915",
                texto: "Inaugurada em 24 de fevereiro de 1915, a estação fazia parte do ramal de Guarulhos da Estrada de Ferro da Cantareira, o Tramway da Cantareira.",
            },
            {
                icone: "historia",
                titulo: "Um ramal que impulsionou a cidade",
                texto: "O ramal seguia o traçado do atual anel viário, com estações em Vila Galvão, Vila Augusta, Gopoúva, Torres Tibagi e Guarulhos, e impulsionou a ocupação urbana ao longo do percurso. Teve importância para o desenvolvimento econômico e industrial de Guarulhos.",
            },
            {
                icone: "tempo",
                titulo: "O fim do ramal",
                texto: "O ramal foi desativado em 1965, mas a antiga estação permanece como um dos principais elementos da memória ferroviária da cidade.",
            },
            {
                icone: "gente",
                titulo: "Depois dos trens",
                texto: "Depois da desativação, o prédio abrigou a EMEI da Estação, escola municipal desapropriada na década de 1990. A Casa Amarela, ao lado, também pertenceu à escola e chegou a sediar o Arquivo Histórico de Guarulhos.",
            },
            {
                icone: "hoje",
                titulo: "O lugar hoje",
                texto: "A edificação remanescente passou por intervenções de restauro e integra o conjunto histórico conhecido como Praça IV Centenário, junto à Casa Amarela e à locomotiva Maria Fumaça. A permanência do prédio não significa conservação integral da configuração original. Segundo a AAPAH, em 2024 não tinha uso definido pela prefeitura e apresentava sinais de vandalismo.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Símbolo histórico do início da modernização urbana e industrial do município provocada pela expansão dos meios de transporte.",
            },
            {
                icone: "historia",
                titulo: "Edificação remanescente e modificada",
                texto: "O plano municipal de turismo (PDITS, p. 142) registra que a estação sobreviveu à desativação do ramal, com fachada descaracterizada por intervenções. Esse registro fundamenta a identificação como edificação remanescente; a AAPAH também documenta seu restauro.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Parque Bosque Maia",
        categoria: "Ambiental",
        situacao: "PRESERVADO",
        bairro: "Centro / Jardim Maia",
        endereco: "Avenida Paulo Faccini",
        numero: "s/n",
        cep: "07115-260",
        latitude: -23.4565,
        longitude: -46.5262,
        descricao:
            'Parque urbano e área de preservação ambiental/paisagística situado na Avenida Paulo Faccini, figurando como a maior área verde central da cidade. Preserva remanescentes de Mata Atlântica e ecossistema de várzea do Rio Baquirivu-Guaçu. Abriga obras de arte pública como a escultura "Índio Guaru" (em concreto, de Oswaldo Alves) e a Gruta dos Orixás. É tombado municipalmente pelo Decreto nº 21.143/2000.',
        descricaoResumida:
            "Maior parque urbano central da cidade, com vegetação de Mata Atlântica, área de várzea e monumentos artísticos, tombado por valor ambiental e paisagístico.",
        historia:
            "O espaço ocupa a área da antiga Chácara Maia, sendo desapropriado e transformado em parque público (Parque Doutor Paulo Faccini) para garantir o lazer e a conservação ambiental no centro urbano.",
        importanciaCultural:
            "Relevante como patrimônio ecológico e paisagístico, além de servir como espaço de convivência comunitária, manifestações religiosas e de memória indígena e afro-brasileira.",
        imagem: "bosque_maia.jpg",
        detalhes: [
            {
                icone: "natureza",
                titulo: "O maior parque urbano",
                texto: "Também conhecido como Parque Recanto das Olaias, é o maior parque urbano de Guarulhos.",
            },
            {
                icone: "natureza",
                titulo: "Mata Atlântica no centro",
                texto: "Preserva espécies nativas da Mata Atlântica e serve como pulmão verde no centro urbano.",
            },
            {
                icone: "importancia",
                titulo: "Proteção paisagística e ambiental",
                texto: "O parque possui tombamento de caráter paisagístico e ambiental. Já constava, em 1990, na relação de imóveis de interesse de preservação da Lei Orgânica do Município e foi tombado em 2000.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Relevante como patrimônio ecológico e paisagístico, além de servir como espaço de convivência comunitária, manifestações religiosas e de memória indígena e afro-brasileira.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Catedral Nossa Senhora da Conceição",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Praça Tereza Cristina",
        numero: "1",
        cep: "07011-010",
        latitude: -23.4688,
        longitude: -46.5317,
        descricao:
            "Edificação religiosa e marco urbano situada na Praça Tereza Cristina, centro de Guarulhos, sendo a sede da Diocese municipal. A construção atual apresenta linhas ecléticas com elementos neoclássicos, resultante de reformas e reconstruções do século XX. Não possui tombamento oficial homologado devido às contínuas alterações arquitetônicas ao longo do tempo.",
        descricaoResumida:
            "Sede da Diocese de Guarulhos no centro urbano, com linhas ecléticas e neoclássicas construídas no século XX sobre o sítio de fundação histórica da cidade.",
        historia:
            "O local marca o sítio original do aldeamento jesuítico de 1560 e da elevação a Freguesia em 1685. A igreja acolheu sucessivas edificações, incluindo a antiga matriz em taipa de pilão (concluída em 1743), que foi sendo desmontada gradativamente a partir dos anos 1930 para dar lugar ao templo atual.",
        importanciaCultural:
            "Apesar de descaracterizada em sua estrutura colonial original, a Catedral permanece como a principal referência geográfica, simbólica e religiosa da fundação e identidade da cidade.",
        imagem: "catedral_conceicao.png",
        detalhes: [
            {
                icone: "historia",
                titulo: "Sede da diocese",
                texto: "Igreja Matriz e sede da Diocese de Guarulhos.",
            },
            {
                icone: "arquitetura",
                titulo: "Estilo neoclássico e eclético",
                texto: "A atual edificação, em estilo neoclássico/eclético, foi erguida em meados do século XX.",
            },
            {
                icone: "tempo",
                titulo: "No lugar da primeira matriz",
                texto: "O prédio ocupa o local da primitiva igreja matriz de taipa de pilão, do período colonial, ligada ao aldeamento jesuítico fundado em 1560 em torno da capela de Nossa Senhora da Conceição.",
            },
            {
                icone: "historia",
                titulo: "O coração da cidade antiga",
                texto: "Foi nas imediações da catedral que começou a ser construída a cidade. A Rua Dom Pedro II e a Praça Tereza Cristina são os dois logradouros mais antigos de Guarulhos.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Apesar de descaracterizada em sua estrutura colonial original, a Catedral permanece como a principal referência geográfica, simbólica e religiosa da fundação e identidade da cidade.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Complexo Sanatório Padre Bento",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Gopouva",
        endereco: "Avenida Emílio Ribas",
        numero: "1819",
        cep: "07051-000",
        latitude: -23.4735,
        longitude: -46.5451,
        descricao:
            "Conjunto arquitetônico e urbano de caráter institucional localizado em Gopouva, com referência de acesso pela Avenida Emílio Ribas, 1819. A arquitetura das edificações reúne influências dos estilos *art déco* e neocolonial, destacando-se como um dos conjuntos institucionais mais expressivos desse período na Região Metropolitana de São Paulo. O espaço abriga o Teatro Padre Bento, a Igreja São João Batista e diversas unidades destinadas à saúde pública e serviços municipais. O perímetro do complexo conta com proteção arquitetônica e ambiental, tendo o tombamento estadual pelo CONDEPHAAT (2011) incidindo especialmente sobre o Cine-Teatro e a Capela.",
        descricaoResumida:
            "Conjunto arquitetônico e urbano em estilos *art déco* e neocolonial em Gopouva, abrigando o Teatro Padre Bento, a Igreja São João Batista e equipamentos públicos com proteção ambiental e arquitetônica.",
        historia:
            "Inaugurado na década de 1930, o complexo foi projetado originalmente como uma colônia-asilo destinada ao isolamento compulsório de pacientes diagnosticados com hanseníase. Ao longo das décadas, o espaço passou por reestruturações funcionais, integrando equipamentos municipais de saúde, cultura e serviços.",
        importanciaCultural:
            "Representa um marco da arquitetura institucional em São Paulo e um testemunho da memória da saúde pública e das políticas de isolamento sanitário do século XX, ressignificado contemporaneamente como polo comunitário e cultural da cidade.",
        imagem: "sanatorio_padre_bento.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Um asilo-colônia",
                texto: "Inaugurado na década de 1930 como leprosário/asilo-colônia para isolamento compulsório de pacientes de hanseníase.",
            },
            {
                icone: "arquitetura",
                titulo: "Art déco e neocolonial",
                texto: "Constitui um dos conjuntos arquitetônicos em estilo art déco/neocolonial mais importantes da cidade.",
            },
            {
                icone: "importancia",
                titulo: "Proteção estadual e municipal",
                texto: "O complexo é tombado pelo Condephaat (processo nº 33.189/95). No município, a igreja e o cineteatro foram tombados em 1990, e os demais imóveis e a vegetação, em 2000. O campo de futebol do hospital também foi tombado, em 1993.",
            },
            {
                icone: "hoje",
                titulo: "O lugar hoje",
                texto: "Abriga o Teatro Padre Bento, a Igreja São João Batista e unidades de atendimento à saúde pública.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Representa um marco da arquitetura institucional em São Paulo e um testemunho da memória da saúde pública e das políticas de isolamento sanitário do século XX, ressignificado contemporaneamente como polo comunitário e cultural da cidade.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Parque Ecológico do Tietê",
        categoria: "Ambiental",
        situacao: "PRESERVADO",
        bairro: "Vila Santo Henrique / Engenheiro Goulart",
        endereco: "Rodovia Parque",
        numero: "8055",
        cep: "03719-000",
        latitude: -23.48914,
        longitude: -46.52093,
        descricao:
            "Parque ambiental metropolitano implantado na várzea do Rio Tietê, com funções de proteção ambiental, controle de cheias, conservação da biodiversidade, lazer e educação ambiental. O Núcleo Engenheiro Goulart concentra a principal estrutura de visitação pública, enquanto a área ambiental do complexo alcança a região limítrofe e trechos associados ao território de Guarulhos.",
        descricaoResumida:
            "Grande parque metropolitano de preservação da várzea do Rio Tietê, com funções ambientais, recreativas e de controle de enchentes.",
        historia:
            "O Parque Ecológico do Tietê foi instituído pelo Decreto Estadual nº 7.868, de 30 de abril de 1976, no contexto das políticas de proteção da várzea e combate às inundações na Região Metropolitana de São Paulo. O Núcleo Engenheiro Goulart consolidou-se como sua principal área pública de lazer, educação ambiental e preservação da biodiversidade.",
        importanciaCultural:
            "Possui relevância ambiental, paisagística e social de escala metropolitana, preservando áreas de várzea do Rio Tietê e oferecendo espaços de educação ambiental, lazer e convivência. Sua área se relaciona territorialmente com São Paulo e Guarulhos.",
        imagem: "parque_eco_tiete.png",
        detalhes: [
            {
                icone: "historia",
                titulo: "Proteção da várzea do Tietê",
                texto: "O parque foi instituído em 1976 no contexto das políticas metropolitanas de proteção da várzea do Rio Tietê e controle de enchentes.",
            },
            {
                icone: "natureza",
                titulo: "Biodiversidade e preservação",
                texto: "O complexo protege áreas de várzea, lagos, vegetação e fauna, além de desenvolver atividades de educação ambiental.",
            },
            {
                icone: "gente",
                titulo: "Lazer metropolitano",
                texto: "O Núcleo Engenheiro Goulart reúne estruturas de lazer e visitação pública e funciona como importante equipamento ambiental metropolitano.",
            },
            {
                icone: "localizacao",
                titulo: "São Paulo e Guarulhos",
                texto: "O acesso principal do Núcleo Engenheiro Goulart fica no município de São Paulo. A área ambiental do complexo alcança a região limítrofe e trechos relacionados ao território de Guarulhos.",
            },
        ],
        cidade: "São Paulo",
        uf: "SP",
    },
    {
        nome: "Igreja de Nossa Senhora de Bonsucesso",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Bonsucesso / Pimentas",
        endereco: "Rua Dona Catharina Maria de Jesus",
        numero: "99",
        cep: "07175-500",
        latitude: -23.4243,
        longitude: -46.3982,
        descricao:
            "Conjunto urbano e edificação religiosa localizados no bairro do Bonsucesso. A igreja e a praça no seu entorno preservam a escala, a morfologia e as referências espaciais da tradicional ocupação caipira paulista.",
        descricaoResumida:
            "Centro religioso e praça de ocupação tradicional caipira no bairro do Bonsucesso, remontando às origens rurais do século XVIII.",
        historia:
            "As origens do núcleo vinculam-se a sesmarias e povoamentos rurais do século XVIII na região do Bonsucesso, mantendo-se ao longo dos séculos como espaço catalisador de sociabilidades rurais e eventos comunitários.",
        importanciaCultural:
            "É o coração geográfico de uma das comunidades paulistas mais tradicionais, funcionando como suporte para o patrimônio imaterial, religiosidade popular e identidade regional.",
        imagem: "capela_bonsucesso.png",
        detalhes: [
            {
                icone: "tempo",
                titulo: "Fundada no século XVIII",
                texto: "Fundada no século XVIII no antigo bairro do Bonsucesso.",
            },
            {
                icone: "fe",
                titulo: "Polo religioso e cultural",
                texto: "Trata-se do polo religioso e cultural mais tradicional do município.",
            },
            {
                icone: "tradicao",
                titulo: "Romarias e festa",
                texto: "A igreja é associada às romarias e à Festa do Bonsucesso.",
            },
            {
                icone: "importancia",
                titulo: "Tombada em 2000",
                texto: "A igreja é de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo município em 2000 (Decreto nº 21.143).",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "É o coração geográfico de uma das comunidades paulistas mais tradicionais, funcionando como suporte para o patrimônio imaterial, religiosidade popular e identidade regional.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Festa de Nossa Senhora de Bonsucesso",
        categoria: "Imaterial",
        situacao: "PRESERVADO",
        bairro: "Bonsucesso",
        endereco: "Rua Silva Bueno",
        numero: "s/n",
        cep: "07162-160",
        latitude: -23.419,
        longitude: -46.4105,
        descricao:
            "Festividade popular e religiosa celebrada anualmente no bairro do Bonsucesso, englobando missas, procissões, apresentações de música caipira, feiras artesanais e culinária tradicional paulista.",
        descricaoResumida:
            "Celebrada há mais de 280 anos no bairro do Bonsucesso, é a maior e mais antiga festa religiosa e popular de Guarulhos.",
        historia:
            "Com mais de 280 anos de tradição ininterrupta, a festa originou-se no século XVIII no entorno da capela de Nossa Senhora de Bonsucesso, consolidando-se como o maior ciclo festivo tradicional da região.",
        importanciaCultural:
            "Bem cultural de alta relevância para a identidade, religiosidade popular e preservação das tradições caipiras paulistas no município.",
        imagem: "festa_bonsucesso.jpg",
        detalhes: [
            {
                icone: "tempo",
                titulo: "Quase três séculos de tradição",
                texto: "Celebrada ininterruptamente desde meados do século XVIII no Bairro do Bonsucesso, em agosto, em louvor a Nossa Senhora do Bonsucesso.",
            },
            {
                icone: "tradicao",
                titulo: "Fé, cultura e sabores",
                texto: "Une religiosidade popular católica, manifestações culturais, apresentações folclóricas, gastronomia tradicional e feiras de artesanato.",
            },
            {
                icone: "tradicao",
                titulo: "A Benção da Terra",
                texto: "A programação inclui a Benção da Terra, conhecida como Carpição.",
            },
            {
                icone: "gente",
                titulo: "Romeiros de várias partes do país",
                texto: "A festa atrai romeiros de várias partes do país.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Bem cultural de alta relevância para a identidade, religiosidade popular e preservação das tradições caipiras paulistas no município.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Sítio da Candinha (Casa da Candinha)",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Jardim Bananal / Parque do Bananal",
        endereco: "Estrada do Bananal",
        numero: "s/n",
        cep: "07152-000",
        latitude: -23.3616,
        longitude: -46.5309,
        descricao:
            "Edificação histórica rural e sítio histórico situado no Bairro do Bananal, na região de Lavras. A casa-sede foi construída utilizando a técnica de taipa de pilão, tradicional da arquitetura paulista, com datação estimada em 1825. A área foi declarada de utilidade pública para a criação de um parque científico-cultural e centro de memória da cultura negra, sendo amparada pelo artigo 28 do ADCT da Lei Orgânica Municipal e decretos de preservação e desapropriação.",
        descricaoResumida:
            "Exemplar preservado de edificação rural em taipa de pilão do século XIX, localizado no Bairro do Bananal e destinado a parque científico-cultural e centro de memória da cultura negra.",
        historia:
            "Remontando à ocupação agrícola e extrativista do século XIX, a edificação articula-se historicamente à exploração da mineração do ouro no morro do Cangaíba e ao trabalho e vivência das populações escravizadas na região.",
        importanciaCultural:
            "É um dos registros arquitetônicos rurais mais antigos preservados em Guarulhos, fundamental para a salvaguarda da memória da presença negra, do trabalho escravizado e das técnicas construtivas paulistas tradicionais.",
        imagem: "casa_da_candinha.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Casa-sede da Fazenda Bananal",
                texto: "É uma das construções mais antigas de Guarulhos e foi a casa-sede da antiga Fazenda Bananal.",
            },
            {
                icone: "arquitetura",
                titulo: "Taipa de pilão e bambu",
                texto: "A casa foi feita em taipa de pilão entrelaçada com bambu e é datada provavelmente de 1825. Guarda um oratório colonial com imagens e objetos religiosos.",
            },
            {
                icone: "tempo",
                titulo: "A senzala que resiste",
                texto: "É a única remanescente do período escravagista que ainda possui senzala na região metropolitana de São Paulo, o que a torna um raro registro da ocupação rural e da escravidão na região.",
            },
            {
                icone: "importancia",
                titulo: "Proteção",
                texto: "O sítio foi tombado pelo Decreto Municipal nº 21.143/2000 e desapropriado pela prefeitura em 2004 (Decreto nº 22.787/2004).",
            },
            {
                icone: "hoje",
                titulo: "O lugar hoje",
                texto: "Patrimônio histórico localizado no atual Bairro do Bananal, na região de Lavras.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "É um dos registros arquitetônicos rurais mais antigos preservados em Guarulhos, fundamental para a salvaguarda da memória da presença negra, do trabalho escravizado e das técnicas construtivas paulistas tradicionais.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Casa José Maurício",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Rua Sete de Setembro",
        numero: "150",
        cep: "07012-070",
        latitude: -23.4682,
        longitude: -46.5298,
        descricao:
            "Casarão histórico de arquitetura eclética que serviu de residência a José Maurício de Oliveira Sobrinho e, após diferentes usos públicos, abandono e um longo processo de restauração, foi reaberto como Casarão da Nossa História, espaço cultural e educativo dedicado à memória de Guarulhos.",
        descricaoResumida:
            "Antiga residência de José Maurício, restaurada e transformada no Casarão da Nossa História, centro de formação e visitação dedicado à memória de Guarulhos.",
        historia:
            "A edificação remonta às primeiras décadas do século XX. Fontes municipais associam sua construção a 1925, enquanto a AAPAH registra 1937 como marco documental da residência. O imóvel foi residência de José Maurício de Oliveira Sobrinho e posteriormente recebeu diferentes funções públicas, incluindo Fórum, Secretaria de Obras, Junta de Alistamento Militar e Museu Histórico. Após anos de abandono e um longo processo de restauração, foi aberto ao público em julho de 2025 como Casarão da Nossa História.",
        importanciaCultural:
            "É um importante exemplar da arquitetura residencial eclética de Guarulhos e um marco da história política, administrativa e cultural do município, atualmente dedicado à preservação, formação e difusão da memória local.",
        imagem: "casa_jose_mauricio.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Residência de um prefeito",
                texto: "Foi residência de José Maurício de Oliveira Sobrinho. Fontes municipais associam a construção a 1925, enquanto a AAPAH registra 1937; a divergência documental permanece registrada.",
            },
            {
                icone: "arquitetura",
                titulo: "Arquitetura eclética",
                texto: "O imóvel apresenta arquitetura eclética e possui elementos construtivos que preservam parte da memória da cidade.",
            },
            {
                icone: "tempo",
                titulo: "Muitas funções ao longo dos anos",
                texto: "Ao longo dos anos, também foi utilizado para diferentes funções públicas, como Fórum, Secretaria de Obras, Junta de Alistamento Militar e Museu Histórico de Guarulhos.",
            },
            {
                icone: "processo",
                titulo: "Abandono e compra pela prefeitura",
                texto: "Em janeiro de 2011, a AAPAH fez um abraço simbólico no casarão para tentar evitar o destombamento e a demolição, mas o ato teve pouca adesão. Para os herdeiros, restaurar era caro e o terreno valia mais que a casa. Em junho de 2013, a prefeitura comprou o imóvel por R$ 3 milhões, e ele continuou abandonado por anos.",
            },
            {
                icone: "hoje",
                titulo: "O lugar hoje",
                texto: "Após o restauro, o imóvel passou a funcionar como o Casarão da Nossa História, espaço de formação, visitação, exposições e atividades relacionadas à história e à memória de Guarulhos. Reaberto em 2025, reúne salas temáticas, maquetes de edificações históricas e exposições de fotografias.",
            },
            {
                icone: "localizacao",
                titulo: "Numeração documental divergente",
                texto: "O cadastro adota Rua Sete de Setembro, 150, conforme a pesquisa do responsável. Publicações operacionais recentes indicam o número 207; essa divergência não foi resolvida.",
            },
            {
                icone: "historia",
                titulo: "Importância cultural",
                texto: "É um importante exemplar da arquitetura residencial eclética de Guarulhos e um marco da história política, administrativa e cultural do município, atualmente dedicado à preservação, formação e difusão da memória local.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Casa Amarela (Casa do Chefe da Estação)",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Jardim Santa Francisca",
        endereco: "Avenida Antônio de Souza",
        numero: "186",
        cep: "07013-090",
        latitude: -23.4731,
        longitude: -46.5273,
        descricao:
            "Antiga Casa do Chefe da Estação, situada na Praça Prefeito Paschoal Thomeu, no Jardim Santa Francisca, junto à Avenida Antônio de Souza e à antiga estação ferroviária. O conjunto é historicamente referido como Praça IV Centenário. Apresenta linguagem arquitetônica funcional das infraestruturas ferroviárias paulistas do início do século XX e proteção municipal pelo Decreto nº 21.143/2000.",
        descricaoResumida:
            "Casa do Chefe da Estação, na Praça Prefeito Paschoal Thomeu, Jardim Santa Francisca, junto à Avenida Antônio de Souza; integra o conjunto conhecido como Praça IV Centenário e é tombada pelo município.",
        historia:
            "Construída no início do século XX para servir de moradia oficial ao chefe da estação de Guarulhos do ramal da *Tramway da Cantareira*. Com a desativação da linha férrea na década de 1960, o prédio passou a abrigar equipamentos públicos municipais, incluindo o Arquivo Histórico Municipal Araci Borges Dias Martins em períodos anteriores. O Diário Oficial municipal de 8 de julho de 2008 identifica a área da Casa Amarela e da antiga estação como Praça Prefeito Paschoal Thomeu, no Jardim Santa Francisca, entre as avenidas Antônio de Souza e Aniello Pratici e a Rua Soldado José de Andrade.",
        importanciaCultural:
            "É um dos raros remanescentes físicos da infraestrutura do *Tramway da Cantareira*, registrando a era da expansão dos transportes sobre trilhos e o urbanismo da cidade no início do século XX.",
        imagem: "casa_amarela.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Casa do chefe da estação",
                texto: "Construída no início do século XX para servir de moradia ao chefe da estação ferroviária do antigo ramal Tramway da Cantareira.",
            },
            {
                icone: "importancia",
                titulo: "Ligada à linha de trem",
                texto: "A Tramway da Cantareira foi uma linha de trem fundamental para o transporte e a urbanização de Guarulhos.",
            },
            {
                icone: "hoje",
                titulo: "Depois da ferrovia",
                texto: "A casa também pertenceu à escola municipal que funcionou na estação e chegou a sediar o Arquivo Histórico de Guarulhos. Foi tombada em 2000, junto com a estação.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "É um dos raros remanescentes físicos da infraestrutura do *Tramway da Cantareira*, registrando a era da expansão dos transportes sobre trilhos e o urbanismo da cidade no início do século XX.",
            },
            {
                icone: "localizacao",
                titulo: "Praça histórica e referência de acesso",
                texto: "A Casa do Chefe da Estação fica na Praça Prefeito Paschoal Thomeu, na área historicamente referida como Praça IV Centenário. A Avenida Antônio de Souza delimita essa praça, no Jardim Santa Francisca. O cadastro mantém Avenida Antônio de Souza, 186, e as coordenadas da pesquisa Maps do responsável como referência de acesso. A documentação consultada confirma a praça e o bairro, mas não confirma independentemente o número 186.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Antigo Paço Municipal",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Rua Sete de Setembro",
        numero: "164",
        cep: "07012-070",
        latitude: -23.468,
        longitude: -46.5296,
        descricao:
            "Edifício histórico da Rua Sete de Setembro, 164, ligado à administração municipal e a diferentes serviços públicos de Guarulhos. As obras começaram em 1921 e o imóvel é protegido pelo Decreto Municipal nº 21.143/2000.",
        descricaoResumida:
            "Antiga sede administrativa de Guarulhos, com obras iniciadas em 1921, que recebeu serviços públicos e culturais e é protegida pelo Decreto nº 21.143/2000.",
        historia:
            "As obras do Antigo Paço Municipal tiveram início em 1921. O edifício abrigou a Prefeitura, a Câmara e a Delegacia, além de receber, em diferentes períodos, o Departamento de Educação e Cultura, o Conservatório, o setor de Obras, parte do Fórum e a primeira Biblioteca Municipal. É protegido pelo Decreto Municipal nº 21.143/2000.",
        importanciaCultural:
            "Possui elevado valor histórico e institucional por simbolizar a consolidação do poder público e a centralização administrativa do município no século XX.",
        imagem: "antigo_paco_municipal.jpg",
        detalhes: [
            {
                icone: "arquitetura",
                titulo: "Neoclássico, em tijolo maciço",
                texto: "Com obras iniciadas em 1921, o prédio da Rua Sete de Setembro é um exemplar de arquitetura neoclássica em tijolos maciços e com porão. A fachada apresenta frontão, pináculos e escultura de rosto feminino.",
            },
            {
                icone: "historia",
                titulo: "Sede do poder municipal",
                texto: "As obras do Antigo Paço Municipal tiveram início em 1921. O edifício abrigou a Prefeitura, a Câmara e a Delegacia, além de receber, em diferentes períodos, o Departamento de Educação e Cultura, o Conservatório, o setor de Obras, parte do Fórum e a primeira Biblioteca Municipal. É protegido pelo Decreto Municipal nº 21.143/2000.",
            },
            {
                icone: "tempo",
                titulo: "Depois da prefeitura",
                texto: "Com a saída da prefeitura, o prédio recebeu o Departamento de Educação e Cultura, o Conservatório Municipal, o Departamento de Obras e a Junta de Alistamento Militar.",
            },
            {
                icone: "processo",
                titulo: "Reformas e perdas",
                texto: "Ganhou anexos nos anos 1940 e, nos anos 1980, teve as esquadrias originais trocadas e a escada da fachada retirada, o que desfez a simetria típica do estilo. Em 2017, um projeto de restauro foi aprovado pelo conselho do patrimônio, mas parte do forro original foi arrancada um dia depois.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Possui elevado valor histórico e institucional por simbolizar a consolidação do poder público e a centralização administrativa do município no século XX.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Centro Municipal de Educação Adamastor",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Macedo",
        endereco: "Avenida Monteiro Lobato",
        numero: "734",
        cep: "07112-000",
        latitude: -23.4668,
        longitude: -46.5222,
        descricao:
            "Complexo de patrimônio industrial reabilitado localizado próximo à Rodovia Presidente Dutra. O projeto de reciclagem arquitetônica, assinado pelo arquiteto Ruy Ohtake no início dos anos 2000, manteve elementos estruturais originais, com destaque para a chaminé e o pavilhão central com colunas de tijolos aparentes, que contam com proteção por tombamento municipal.",
        descricaoResumida:
            "Antigo complexo industrial têxtil reabilitado por Ruy Ohtake, preservando a chaminé e o pavilhão central de tijolos para atuar como centro cultural e educacional.",
        historia:
            "Instalado na década de 1940 como Fábrica de Casimiras Adamastor, o parque industrial participou ativamente do surto de industrialização de Guarulhos. Após o encerramento das atividades fabris, a área foi adquirida e reconvertida pela municipalidade em polo educacional, cultural e de eventos.",
        importanciaCultural:
            "Exemplo notável de reconversão funcional de patrimônio industrial paulista, conectando a memória do trabalho e da industrialização local ao acesso contemporâneo à cultura e educação.",
        imagem: "centro_adamastor.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Antiga Fábrica Adamastor",
                texto: "Relevante complexo fabril construído em meados do século XX.",
            },
            {
                icone: "tempo",
                titulo: "De vila agrícola a polo industrial",
                texto: "O complexo simbolizou a transição de Guarulhos de uma vila agrícola/olaria para um dos maiores polos industriais do país.",
            },
            {
                icone: "arquitetura",
                titulo: "Reciclagem de uso",
                texto: "Foi objeto de um grande projeto de reciclagem de uso arquitetônico.",
            },
            {
                icone: "hoje",
                titulo: "O lugar hoje",
                texto: "Polo cultural, educacional e de convenções gerido pela Prefeitura.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Exemplo notável de reconversão funcional de patrimônio industrial paulista, conectando a memória do trabalho e da industrialização local ao acesso contemporâneo à cultura e educação.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "E.E. Conselheiro Crispiniano",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Vila Progresso",
        endereco: "Rua Arminda de Lima",
        numero: "57",
        cep: "07095-010",
        latitude: -23.4649,
        longitude: -46.5338,
        descricao:
            "Edificação escolar de arquitetura moderna localizada na Rua Arminda de Lima, nº 57, Vila Progresso. Projetada em 1960 pelos arquitetos João Batista Vilanova Artigas e Carlos Cascaldi, e construída entre 1961 e 1962, destaca-se pela estrutura em concreto armado e iluminação zenital. O pátio interno preserva um painel artístico de Mário Gruber, datado da década de 1970. É protegida pelo CONDEPHAAT (Resolução nº 80/2014) e pelo Decreto Municipal nº 21.143/2000.",
        descricaoResumida:
            "Marco da arquitetura moderna paulista projetado por Vilanova Artigas e Carlos Cascaldi, tombado pelo CONDEPHAAT, contendo painel artístico de Mário Gruber.",
        historia:
            "Criada originalmente sob a denominação de Ginásio Estadual de Guarulhos, a edificação foi concebida no âmbito dos programas estaduais de expansão do ensino público dos anos 1960 com diretrizes arquitetônicas inovadoras.",
        importanciaCultural:
            "Representa um dos principais marcos da Escola Paulista de Arquitetura Moderna no município, integrando o patrimônio edificado público a obras de arte integradas.",
        imagem: "escola_crispiniano.jpg",
        detalhes: [
            {
                icone: "ensino",
                titulo: "Primeira escola secundária pública",
                texto: "Primeira escola pública de ensino secundário da cidade. O prédio original abrigou o âGinásio de Guarulhosâ.",
            },
            {
                icone: "arquitetura",
                titulo: "Projeto de Vilanova Artigas",
                texto: "O prédio foi projetado pelo renomado arquiteto modernista João Batista Vilanova Artigas em 1960.",
            },
            {
                icone: "importancia",
                titulo: "Marco da arquitetura moderna",
                texto: "O projeto é marco da arquitetura moderna brasileira, tombado pelo Condephaat (processo nº 54.292/05) e também pelo município, em 2000.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Representa um dos principais marcos da Escola Paulista de Arquitetura Moderna no município, integrando o patrimônio edificado público a obras de arte integradas.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "E.E. Capistrano de Abreu",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Rua Capitão Gabriel",
        numero: "393",
        cep: "07011-010",
        latitude: -23.4658,
        longitude: -46.5304,
        descricao:
            "Edificação escolar de arquitetura acadêmica construída em alvenaria de tijolos, situada na Rua Capitão Gabriel, nº 393, no centro histórico. Possui amparo de proteção pelo Decreto Municipal nº 21.143/2000.",
        descricaoResumida:
            "Primeira escola pública agrupada de Guarulhos, inaugurada em 1926 no centro da cidade, com arquitetura em alvenaria de tijolos.",
        historia:
            'Inaugurada em 1º de julho de 1926 sob o nome "Grupo Escolar de Guarulhos", foi a primeira escola agrupada instalada no município. Em 1947, teve seu nome alterado para homenagear o historiador João Capistrano de Abreu.',
        importanciaCultural:
            "Registro fundamental da história da educação pública guarulhense e da arquitetura escolar paulista da Primeira República.",
        imagem: "escola_capistrano.jpg",
        detalhes: [
            {
                icone: "ensino",
                titulo: "Um dos primeiros grupos escolares",
                texto: "Um dos primeiros grupos escolares construídos no município.",
            },
            {
                icone: "arquitetura",
                titulo: "Arquitetura acadêmica em tijolos",
                texto: "Apresenta arquitetura acadêmica em alvenaria de tijolos.",
            },
            {
                icone: "importancia",
                titulo: "Expansão da rede pública",
                texto: "O prédio é representativo da expansão da rede pública de ensino paulista no século XX. Já constava, em 1990, na Lei Orgânica e foi tombado pelo município em 2000.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Registro fundamental da história da educação pública guarulhense e da arquitetura escolar paulista da Primeira República.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "E.E. Dulce Breves Neves",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Jardim dos Afonsos / Cocaia",
        endereco: "Rua Orixá",
        numero: "1",
        cep: "07131-410",
        latitude: -23.4326,
        longitude: -46.5204,
        descricao:
            "Edificação escolar localizada na Rua Orixá, nº 75, no Jardim dos Afonsos (região dos Morros). Trata-se de um equipamento público com proteção conferida pela Lei Municipal nº 7.014/2012.",
        descricaoResumida:
            "Equipamento público de ensino edificado no início dos anos 1970 no Jardim dos Afonsos, protegido por lei municipal.",
        historia:
            'Erguida no início da década de 1970 com o nome inicial de "Escola de Primeiro Grau do Bairro dos Morros", a instituição nasceu para atender à demanda de expansão demográfica e urbanização da região dos Morros. Posteriormente, foi batizada em homenagem à educadora Dulce Breves Neves (1893–1968).',
        importanciaCultural:
            "Testemunho do processo de expansão da infraestrutura educacional pública para a periferia urbana em consolidação durante a segunda metade do século XX.",
        imagem: "escola_dulce_breves.jpg",
        detalhes: [
            {
                icone: "ensino",
                titulo: "Prédio escolar tradicional",
                texto: "Prédio escolar tradicional de Guarulhos.",
            },
            {
                icone: "importancia",
                titulo: "Valor comunitário e arquitetônico",
                texto: "Tem relevante valor comunitário e arquitetônico para a memória da educação pública em Guarulhos.",
            },
            {
                icone: "processo",
                titulo: "Tombada em 2012",
                texto: "A escola foi tombada pelo município pela Lei nº 7.014, de 2 de abril de 2012.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Testemunho do processo de expansão da infraestrutura educacional pública para a periferia urbana em consolidação durante a segunda metade do século XX.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Igreja de N. Sra. do Rosário dos Homens Pretos",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Praça do Rosário",
        numero: "s/n",
        cep: "07010-015",
        latitude: -23.4673,
        longitude: -46.5292,
        descricao:
            "Edificação religiosa localizada na Praça do Rosário, na área central de Guarulhos. Foi construída meados do século XX para dar continuidade às atividades religiosas da comunidade local.",
        descricaoResumida:
            "Templo religioso edificado em meados do século XX na Praça do Rosário, mantendo a devoção da Irmandade dos Homens Pretos.",
        historia:
            "Erguida em substituição à igreja colonial original de taipa de pilão (localizada na antiga Rua Dom Pedro II e demolida entre 1928 e 1930 para readequação viária), a atual igreja foi construída para acolher a Irmandade dos Homens Pretos e seus devotos.",
        importanciaCultural:
            "Espaço fundamental de preservação da memória, da devoção católica negra e da permanência da presença afro-brasileira no centro urbano de Guarulhos.",
        imagem: "igreja_rosario_pretos.jpg",
        detalhes: [
            {
                icone: "gente",
                titulo: "Irmandades negras",
                texto: "Templo ligado às irmandades negras da cidade.",
            },
            {
                icone: "historia",
                titulo: "Quase 200 anos na Rua Dom Pedro II",
                texto: "Fundada em meados do século XVIII, a igreja permaneceu por quase 200 anos no mesmo lugar, na atual Rua Dom Pedro II.",
            },
            {
                icone: "processo",
                titulo: "Demolida e reconstruída em 1930",
                texto: "Em 1930, o templo foi demolido, realocado, renomeado e reconstruído nas proximidades do sítio original.",
            },
            {
                icone: "importancia",
                titulo: "Memória e apagamento",
                texto: "Historiadores locais relacionam a mudança ao afastamento da presença negra da região central. Em 2006, uma mancha escura foi aplicada ao calçamento da Rua Dom Pedro II para marcar o provável local da igreja original; segundo estudo publicado em 2017, o sítio ainda não tinha reconhecimento oficial como patrimônio.",
            },
            {
                icone: "importancia",
                titulo: "Fé e resistência",
                texto: "A igreja é símbolo da fé e da resistência afro-brasileira em Guarulhos.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Espaço fundamental de preservação da memória, da devoção católica negra e da permanência da presença afro-brasileira no centro urbano de Guarulhos.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Igreja do Bom Jesus da Cabeça",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Cabuçu",
        endereco: "Rua Hans Heitel Hohl",
        numero: "53",
        cep: "07144-287",
        latitude: -23.4093,
        longitude: -46.5398,
        descricao:
            "Edificação religiosa de caráter rural situada no bairro do Cabuçu. O templo passou por remodelações ao longo do século XX, mas preserva características de capela de bairro e acolhe manifestações locais de devoção popular.",
        descricaoResumida:
            "Capela rural no bairro do Cabuçu associada à religiosidade popular e à memória da população negra da região.",
        historia:
            "A igreja desenvolveu-se a partir de uma capela erguida por volta de 1850. A historiografia local e a tradição oral atribuem sua fundação a Raimundo Fortes, homem negro escravizado e liberto.",
        importanciaCultural:
            "Relevante marco da religiosidade popular rural e da história da população negra liberta no território de Guarulhos durante o período imperial.",
        imagem: "igreja_bom_jesus_cabeca.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Devoção popular",
                texto: "Tradicional templo de devoção popular, com raízes rurais.",
            },
            {
                icone: "fe",
                titulo: "Caminhos de fé",
                texto: "Representa a religiosidade e as caminhadas de fé que marcaram os caminhos de passagem da cidade.",
            },
            {
                icone: "importancia",
                titulo: "Tombada em 2000",
                texto: "A igreja é de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo município em 2000 (Decreto nº 21.143).",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Relevante marco da religiosidade popular rural e da história da população negra liberta no território de Guarulhos durante o período imperial.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Capela do Bom Jesus do Macedo",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Macedo",
        endereco: "Avenida Monteiro Lobato",
        numero: "898",
        cep: "07112-000",
        latitude: -23.4659,
        longitude: -46.5211,
        descricao:
            "Templo católico comunitário que atuou como núcleo de povoamento na primeira metade do século XX.",
        descricaoResumida:
            "Templo católico comunitário que atuou como núcleo de povoamento na primeira metade do século XX.",
        historia:
            "A capela tem origem por volta de 1900, ligada à religiosidade popular do antigo bairro do Macedo. A construção foi posteriormente refeita em alvenaria, com registro de reconstrução em 1935. Em 1972, a área foi declarada de utilidade pública para um projeto de alargamento da Avenida Monteiro Lobato, mas a desapropriação e a demolição não se concretizaram.",
        importanciaCultural:
            "É um dos marcos religiosos e comunitários da antiga ocupação do Macedo e um raro remanescente das transformações entre a paisagem rural e a urbanização de Guarulhos.",
        imagem: "capela_macedo.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Capela de bairro histórico",
                texto: "A Capela do Bom Jesus do Macedo é um templo católico de bairro histórico.",
            },
            {
                icone: "gente",
                titulo: "Núcleo de povoamento",
                texto: "Serviu como núcleo de povoamento e de convivência comunitária na primeira metade do século XX.",
            },
            {
                icone: "importancia",
                titulo: "Protegida desde 1990",
                texto: "A igreja já constava, em 1990, na relação de imóveis de interesse de preservação cultural da Lei Orgânica do Município.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Locomotiva Maria Fumaça (Nº 33) e Vagão",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Praça IV Centenário",
        numero: "s/n",
        cep: "07011-040",
        latitude: -23.4544,
        longitude: -46.5328,
        descricao:
            "Conjunto patrimonial móvel e monumento urbano situado na Praça IV Centenário, composto pela locomotiva a vapor nº 33, um vagão de passageiros e uma caixa d'água metálica para abastecimento de caldeiras.",
        descricaoResumida:
            "Monumento ferroviário exposto na Praça IV Centenário com locomotiva a vapor nº 33, vagão e caixa d'água original.",
        historia:
            "O conjunto foi trazido e instalado na praça como monumento público com o objetivo de preservar a memória da linha férrea do *Tramway da Cantareira*, que funcionou no município de 1915 a 1965.",
        importanciaCultural:
            "Elemento de resgate da memória visual do transporte ferroviário, que impulsionou o povoamento e a integração de Guarulhos à capital paulista no século XX.",
        imagem: "locomotiva_maria_fumaca.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Um conjunto ferroviário",
                texto: "Conjunto formado pela locomotiva, pelo vagão e pela caixa d'água, na Praça IV Centenário.",
            },
            {
                icone: "tempo",
                titulo: "Memória do Trenzinho",
                texto: "O monumento preserva a memória do Tramway da Cantareira (âTrenzinho de Guarulhosâ), operante até a década de 1960.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Elemento de resgate da memória visual do transporte ferroviário, que impulsionou o povoamento e a integração de Guarulhos à capital paulista no século XX.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Dia da Carpição",
        categoria: "Imaterial",
        situacao: "PRESERVADO",
        bairro: "Bonsucesso",
        endereco: "Entorno da Igreja de Bonsucesso",
        numero: "s/n",
        cep: "07162-160",
        latitude: -23.4182,
        longitude: -46.4111,
        descricao:
            "Prática comunitária e ritual religioso realizado no entorno do santuário do Bonsucesso, antecedendo o calendário da Festa de Nossa Senhora de Bonsucesso.",
        descricaoResumida:
            "Mutirão comunitário e religioso de preparação do solo e pagamento de promessas antes da Festa do Bonsucesso.",
        historia:
            "Prática secular transmitida por gerações, na qual fiéis e voluntários reúnem-se para carpir o mato e preparar o solo do terreno da igreja, mesclando trabalho coletivo, promessas e fé.",
        importanciaCultural:
            "Importante bem imaterial da sociabilidade rural caipira e da religiosidade de matriz comunitária do estado de São Paulo.",
        imagem: "dia_da_carpicao.jpg",
        detalhes: [
            {
                icone: "tradicao",
                titulo: "Tradição centenária",
                texto: "Tradição religiosa e comunitária centenária que antecede a Festa do Bonsucesso.",
            },
            {
                icone: "fe",
                titulo: "Limpeza como ato de fé",
                texto: "Os fiéis limpam e carpem o entorno da igreja como ato de fé, pagamento de promessas e mutirão comunitário.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Importante bem imaterial da sociabilidade rural caipira e da religiosidade de matriz comunitária do estado de São Paulo.",
            },
            {
                icone: "localizacao",
                titulo: "Referência territorial",
                texto: "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Corporação Musical Banda Lira de Guarulhos",
        categoria: "Imaterial",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Praça Getúlio Vargas",
        numero: "s/n",
        cep: "07011-000",
        latitude: -23.466,
        longitude: -46.531,
        descricao:
            "Instituição musical imaterial atuante em apresentações públicas, concertos em praças, solenidades cívicas e procissões. Foi declarada oficialmente Bem Cultural de Natureza Imaterial do Município de Guarulhos em junho de 2025.",
        descricaoResumida:
            "Banda centenária fundada em 1908, reconhecida em 2025 como Patrimônio Cultural Imaterial de Guarulhos.",
        historia:
            "Fundada em 15 de maio de 1908, a banda manteve sua formação e apresentações ativas de forma centenária, formando gerações de músicos e instrumentistas locais.",
        importanciaCultural:
            "Representa a tradição das retretas e bandas de coreto paulistas, salvaguardando o ensino e a execução da música instrumental e das artes performáticas comunitárias.",
        imagem: "banda_lira_guarulhos.jpg",
        detalhes: [
            {
                icone: "musica",
                titulo: "Uma banda centenária",
                texto: "Centenária banda de música fundada na primeira metade do século XX.",
            },
            {
                icone: "tradicao",
                titulo: "Bem Cultural Imaterial",
                texto: "Registrada como Bem Cultural Imaterial pela sua contribuição à formação musical e às retretas em praças públicas.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Representa a tradição das retretas e bandas de coreto paulistas, salvaguardando o ensino e a execução da música instrumental e das artes performáticas comunitárias.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Cultura e Presença Indígena (Wassu Cocal e Krenak/Pankararu)",
        categoria: "Imaterial",
        situacao: "PRESERVADO",
        bairro: "Cabuçu",
        endereco: "Aldeias e territórios urbanos de Guarulhos",
        numero: "s/n",
        cep: "07084-000",
        latitude: -23.41,
        longitude: -46.54,
        descricao:
            "Patrimônio imaterial e memória histórica vinculados aos povos originários (Guarus e Maromomis) e à presença contemporânea de diversas etnias (como Wassu-Cocal, Pankararu, Pankararé, Guajajara e Tupi-Guarani), reunidas na Aldeia Multiétnica no Cabuçu e no espaço urbano.",
        descricaoResumida:
            "Presença e memória viva das populações originárias e comunidades indígenas multiétnicas contemporâneas que habitam a cidade.",
        historia:
            "O território guarulhense foi originalmente habitado por populações nativas associadas aos Guarus e Maromomis. Na contemporaneidade, a presença Indígena é mantida e renovada através da Aldeia Multiétnica do Cabuçu e organizações urbanas.",
        importanciaCultural:
            "Matriz fundadora da ocupação do território, essencial para o combate ao apagamento histórico e para a afirmação das identidades, saberes e rituais originários.",
        imagem: "cultura_indigena_guarulhos.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Os povos originários",
                texto: "A história de Guarulhos possui uma forte relação com os povos indígenas que habitavam a região antes da colonização, especialmente os povos associados aos Guarus ou Guaramomis.",
            },
            {
                icone: "gente",
                titulo: "Comunidades de hoje",
                texto: "Atualmente, o município também possui comunidades indígenas de diferentes etnias, incluindo Wassu-Cocal, Pankararu, Pankararé, Guajajara e Tupi-Guarani.",
            },
            {
                icone: "tradicao",
                titulo: "Tradições vivas",
                texto: "A presença dessas comunidades ajuda a manter vivas diferentes tradições, memórias, histórias e formas de expressão cultural.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Matriz fundadora da ocupação do território, essencial para o combate ao apagamento histórico e para a afirmação das identidades, saberes e rituais originários.",
            },
            {
                icone: "localizacao",
                titulo: "Referência territorial",
                texto: "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Praça Getúlio Vargas",
        categoria: "Ambiental",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Praça Presidente Getúlio Vargas / Av. Tiradentes",
        numero: "s/n",
        cep: "07010-000",
        latitude: -23.466,
        longitude: -46.531,
        descricao:
            "Espaço público e conjunto urbano situado no centro expandido de Guarulhos, estruturado por traçado paisagístico e protegido pelo Decreto Municipal nº 21.143/2000.",
        descricaoResumida:
            "Principal praça pública do centro expandido, local de feiras, eventos culturais e sociabilidade comunitária.",
        historia:
            "Projetada em meados do século XX durante as reformas de expansão da malha central, a praça passou a abrigar comícios, feiras artesanais e apresentações públicas ao longo das décadas.",
        importanciaCultural:
            "Palco central das expressões socioculturais, manifestações políticas e da vida comunitária do município.",
        imagem: "praca_getulio_vargas.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Um espaço público central",
                texto: "Espaço público central projetado em meados do século XX.",
            },
            {
                icone: "gente",
                titulo: "Palco da cidade",
                texto: "Palco de eventos políticos, culturais e manifestações populares da cidade.",
            },
            {
                icone: "tempo",
                titulo: "Sede do poder municipal",
                texto: "A Prefeitura mudou-se para a Praça Getúlio Vargas em 1958 e a Câmara Municipal, em 1976.",
            },
            {
                icone: "natureza",
                titulo: "Um pau-brasil histórico",
                texto: "A praça abriga um pau-brasil considerado de valor histórico, protegido pela legislação municipal.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Palco central das expressões socioculturais, manifestações políticas e da vida comunitária do município.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Cemitério São João Batista",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Rua Felício Marcondes",
        numero: "320",
        cep: "07010-030",
        latitude: -23.4646,
        longitude: -46.5292,
        descricao:
            "Necrópole pública e acervo de arte tumular situada na área central. Abriga jazigos de famílias históricas da cidade e exemplares decorativos e esculpidos em mármore e ferro fundido.",
        descricaoResumida:
            "Necrópole mais antiga do centro urbano, detentora de acervo de arte tumular do final do século XIX e início do século XX.",
        historia:
            "Inaugurado na segunda metade do século XIX, o cemitério substituiu os sepultamentos anteriormente realizados nas igrejas e seus arredores, registrando a história da demografia e das elites locais.",
        importanciaCultural:
            "Importante fonte para a pesquisa historiográfica local e preservação da memória das famílias pioneiras e da arte funerária dos séculos XIX e XX.",
        imagem: "cemiterio_sao_joao_batista.jpg",
        detalhes: [
            {
                icone: "tempo",
                titulo: "O mais antigo da cidade",
                texto: "O cemitério público mais antigo de Guarulhos, fundado no século XIX.",
            },
            {
                icone: "arquitetura",
                titulo: "Arte tumular neoclássica",
                texto: "Abriga túmulos em arte tumular neoclássica.",
            },
            {
                icone: "gente",
                titulo: "Famílias fundadoras",
                texto: "Reúne os jazigos de famílias fundadoras e personalidades locais.",
            },
            {
                icone: "importancia",
                titulo: "Um dos primeiros tombados",
                texto: "A Lei nº 3.642, de 1990, determinou o tombamento do cemitério, um dos poucos bens tombados pelo município antes do grande decreto de 2000.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Importante fonte para a pesquisa historiográfica local e preservação da memória das famílias pioneiras e da arte funerária dos séculos XIX e XX.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Reserva e Represa do Cabuçu",
        categoria: "Ambiental",
        situacao: "PRESERVADO",
        bairro: "Jardim São Luís / Cabuçu",
        endereco: "Avenida Pedro de Souza Lopes",
        numero: "7903",
        cep: "07075-170",
        latitude: -23.4021,
        longitude: -46.5273,
        descricao:
            "Patrimônio ambiental e de engenharia localizado no Núcleo Cabuçu da Serra da Cantareira. O local abriga a Represa do Cabuçu, cuja barragem mede 15 metros de altura por 50 metros de extensão. A área possui tombamento estadual (CONDEPHAAT, Resolução nº 18/1983) e municipal (Decreto nº 21.143/2000).",
        descricaoResumida:
            "Reserva ambiental na Cantareira que abriga a histórica Barragem do Cabuçu (1908), obra pioneira do concreto armado no Brasil.",
        historia:
            "Concluída em 1908 para integrar o sistema de abastecimento de água da Região Metropolitana, a barragem do Cabuçu é reconhecida como a primeira obra de grande porte construída em concreto armado no Brasil.",
        importanciaCultural:
            "Une relevância ecológica extrema (preservação da Mata Atlântica) a um marco histórico da engenharia civil e infraestrutura sanitária brasileira.",
        imagem: "reserva_cabucu.jpg",
        detalhes: [
            {
                icone: "natureza",
                titulo: "Serra da Cantareira",
                texto: "Compreende o trecho guarulhense da Serra da Cantareira (do Cabuçu ao Bonsucesso), no Parque Estadual da Serra da Cantareira.",
            },
            {
                icone: "historia",
                titulo: "Uma represa pioneira",
                texto: "A barragem da Represa do Cabuçu foi projetada com o perfil do engenheiro norte-americano Edward Wegmann, solução considerada revolucionária na época. Foi a primeira vez que o concreto armado foi usado em estruturas no Brasil, segundo tese da USP.",
            },
            {
                icone: "importancia",
                titulo: "Abastecimento e proteção",
                texto: "O conjunto é essencial para a história do abastecimento de água. A Reserva Estadual da Cantareira é tombada pelo Condephaat (processo nº 20.536/78), e o trecho do Cabuçu ao Bonsucesso também foi tombado pelo município em 2000.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Une relevância ecológica extrema (preservação da Mata Atlântica) a um marco histórico da engenharia civil e infraestrutura sanitária brasileira.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Sítios Arqueológicos das Lavras Velhas do Geraldo",
        categoria: "Ambiental",
        situacao: "PRESERVADO",
        bairro: "Lavras",
        endereco: "Bairro das Lavras",
        numero: "s/n",
        cep: "07150-000",
        latitude: -23.42,
        longitude: -46.45,
        descricao:
            "Geossítio e sítio arqueológico localizado no Bairro das Lavras. Conserva registros físicos no subsolo e na superfície, tais como cavas de mineração, galerias e tanques de lavagem do ouro, integrando o projeto do Geoparque Ciclo do Ouro.",
        descricaoResumida:
            "Sítio arqueológico e histórico com cavas e galerias do primeiro ciclo de mineração aurífera das Américas (séculos XVI e XVII).",
        historia:
            "A mineração aurífera na Capitania de São Vicente desenvolveu-se na região entre o final do século XVI e meados do século XVII (com documentação cobrindo o período de 1590 a 1638), antecedendo o ciclo do ouro nas Minas Gerais.",
        importanciaCultural:
            "Área de altíssimo valor científico e arqueológico para o estudo das origens da mineração colonial no Brasil e da exploração do trabalho indígena e africano no período pombalino/quinhentista.",
        imagem: "sitio_lavras_velhas.png",
        detalhes: [
            {
                icone: "historia",
                titulo: "Mineração de ouro",
                texto: "Área relacionada às antigas atividades de mineração de ouro na região de Lavras, com registros que remontam ao final do século XVI.",
            },
            {
                icone: "importancia",
                titulo: "O primeiro ciclo econômico",
                texto: "O local representa uma parte importante do primeiro ciclo econômico ligado à formação histórica de Guarulhos.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Área de altíssimo valor científico e arqueológico para o estudo das origens da mineração colonial no Brasil e da exploração do trabalho indígena e africano no período pombalino/quinhentista.",
            },
            {
                icone: "localizacao",
                titulo: "Referência territorial",
                texto: "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Complexo do Lago dos Patos",
        categoria: "Ambiental",
        situacao: "PRESERVADO",
        bairro: "Vila Rosália / Vila Galvão",
        endereco: "Avenida Francisco Conde",
        numero: "723",
        cep: "07074-030",
        latitude: -23.4568,
        longitude: -46.554,
        descricao:
            "Conjunto urbano, paisagístico e cultural na Vila Galvão englobando o espelho d'água do lago, o Estádio Municipal Cícero Miranda, o Teatro Nelson Rodrigues, o Museu Histórico Municipal de Guarulhos, a Biblioteca Paulo do Carmo Dias, o Centro Permanente de Exposições Professor José Ismael e a Academia Guarulhense de Letras. Foi tombado pelo COMPHAC em 2019 (Decreto nº 35.715).",
        descricaoResumida:
            "Polo de lazer e cultura na Vila Galvão composto por lago, parque, estádio, museu, teatro, biblioteca e centro de exposições, tombado em 2019.",
        historia:
            "Formado a partir do represamento artificial para urbanização da Vila Galvão no século XX, o espaço consolidou-se ao longo dos anos como um centro de convergência de equipamentos culturais e de lazer do município.",
        importanciaCultural:
            "Constitui o principal espaço de referência cultural, artística, esportiva e de convivência social da zona sul guarulhense.",
        imagem: "complexo_lago_dos_patos.jpg",
        detalhes: [
            {
                icone: "natureza",
                titulo: "Um lago na Vila Galvão",
                texto: "O Lago da Vila Galvão, também conhecido como Lago dos Patos, tem mais de 20 mil m², com água doce e vegetação.",
            },
            {
                icone: "natureza",
                titulo: "Paisagem da Vila Galvão",
                texto: "O Lago dos Patos faz parte da história e da paisagem da Vila Galvão e integra um conjunto de áreas de convivência, vegetação e equipamentos públicos que possuem importância para a memória da região.",
            },
            {
                icone: "importancia",
                titulo: "Tombado desde 2019",
                texto: "O complexo é tombado como patrimônio cultural do município desde 2019.",
            },
            {
                icone: "hoje",
                titulo: "O lugar hoje",
                texto: "O espaço continua sendo utilizado para atividades de lazer, esporte, convivência e eventos culturais, como o programa Conexão Lago 2026.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Constitui o principal espaço de referência cultural, artística, esportiva e de convivência social da zona sul guarulhense.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Antigo Poço Municipal",
        categoria: "Arquitetônico",
        situacao: "PRESERVADO",
        bairro: "Centro",
        endereco: "Entorno da Praça Presidente Getúlio Vargas",
        numero: "s/n",
        cep: "07010-000",
        latitude: -23.4655,
        longitude: -46.5318,
        descricao:
            "Estrutura histórica associada às antigas formas de captação e abastecimento de água na região central de Guarulhos, anterior à consolidação da rede moderna de saneamento.",
        descricaoResumida:
            "Registro da memória do abastecimento de água no centro de Guarulhos, quando poços e bicas ainda eram importantes para a população.",
        historia:
            "Nas primeiras décadas do século XX, antes da consolidação da rede pública de abastecimento, moradores de Guarulhos dependiam de poços, córregos e bicas. O cadastro local associa este ponto a uma antiga estrutura de captação de água na região central. A identificação e a localização exata do equipamento ainda exigem confirmação documental no inventário ou no Arquivo Histórico Municipal.",
        importanciaCultural:
            "O registro remete à história da infraestrutura urbana, do saneamento e do acesso à água em Guarulhos, preservando a memória das formas de abastecimento anteriores à expansão da rede pública.",
        imagem: "antigo_poco_municipal.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Água antes do encanamento",
                texto: "Nas primeiras décadas do século XX, antes da consolidação da rede pública de abastecimento, moradores de Guarulhos dependiam de poços, córregos e bicas. O cadastro local associa este ponto a uma antiga estrutura de captação de água na região central. A identificação e a localização exata do equipamento ainda exigem confirmação documental no inventário ou no Arquivo Histórico Municipal.",
            },
            {
                icone: "alerta",
                titulo: "Localização em pesquisa",
                texto: "A identificação e a localização exatas deste antigo equipamento ainda precisam ser confirmadas em documentação do inventário municipal ou do Arquivo Histórico. O ponto exibido no mapa é uma referência aproximada da região central.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "O registro remete à história da infraestrutura urbana, do saneamento e do acesso à água em Guarulhos, preservando a memória das formas de abastecimento anteriores à expansão da rede pública.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Casarão Saraceni (Demolido em 2010)",
        categoria: "Arquitetônico",
        situacao: "DEMOLIDO",
        bairro: "Itapegica",
        endereco: "Antiga Chácara Saraceni (Anexo ao Internacional Shopping)",
        numero: "s/n",
        cep: "07042-040",
        latitude: -23.479,
        longitude: -46.545,
        descricao:
            "Edificação residencial urbana em estilo *Art Nouveau* de alta relevância arquitetônica, com varandas e vitrais florais, localizada historicamente no bairro do Itapegica.",
        descricaoResumida:
            "Casarão em estilo *Art Nouveau* situado no Itapegica, tombado em 2000 e demolido ilegalmente em 2010.",
        historia:
            "Erguido no início do século XX para a família de José Saraceni, o imóvel esteve ligado ao período de transição agrícola-industrial da cidade. Foi tombado pelo Decreto Municipal nº 21.143/2000, mas teve seu destombamento aprovado de forma irregular e acabou demolido na madrugada de 5 de novembro de 2010, fato que gerou condenações judiciais por improbidade administrativa.",
        importanciaCultural:
            "Apesar de destruído, o caso tornou-se um marco jurídico e pedagógico sobre a luta contra a especulação imobiliária e em defesa do patrimônio histórico local.",
        imagem: "casarao_saraceni_demolido.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Uma família pioneira",
                texto: "Construído no início do século XX na antiga Chácara Saraceni, no bairro Itapegica, o casarão em estilo Art Nouveau pertenceu a uma das famílias pioneiras da cidade, proprietária também da primeira fábrica de sapatos e perneiras do município.",
            },
            {
                icone: "tempo",
                titulo: "Da chácara à Olivetti",
                texto: "Com a mudança do perfil econômico do Itapegica, a área passou a abrigar as instalações da fábrica de máquinas de escrever Olivetti. O imóvel era um raro exemplar mantido da arquitetura residencial da elite fabril do início do século passado.",
            },
            {
                icone: "arquitetura",
                titulo: "Art Nouveau",
                texto: "Apresentava características do estilo Art Nouveau, com elementos decorativos na fachada, grandes esquadrias, varandas e outros detalhes que representavam a arquitetura residencial do início do século XX.",
            },
            {
                icone: "processo",
                titulo: "Tombado em 2000",
                texto: "O casarão foi tombado em 2000 pelo Decreto Municipal nº 21.143. O lote pertencia ao Internacional Shopping Guarulhos.",
            },
            {
                icone: "processo",
                titulo: "O destombamento",
                texto: "A proteção foi revogada por uma emenda à Lei Orgânica do Município, votada pelos vereadores. O conselho do patrimônio também aprovou o destombamento, com base em um parecer técnico que considerava a obra pouco relevante.",
            },
            {
                icone: "alerta",
                titulo: "A demolição",
                texto: "Na madrugada de 5 de novembro de 2010, o casarão foi demolido em poucas horas. O episódio causou grande polêmica na cidade, e seus ecos ainda eram sentidos anos depois no conselho do patrimônio.",
            },
            {
                icone: "processo",
                titulo: "Condenações em 2024",
                texto: "Em ação do Ministério Público iniciada em 2011, o Tribunal de Justiça de São Paulo condenou por improbidade administrativa, em acórdão publicado em março de 2024, o município, duas empresas e 39 pessoas físicas, entre elas o prefeito e ex-vereadores, pelo destombamento irregular. As penas incluem perda da função pública, suspensão dos direitos políticos por três anos e multa.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Apesar de destruído, o caso tornou-se um marco jurídico e pedagógico sobre a luta contra a especulação imobiliária e em defesa do patrimônio histórico local.",
            },
            {
                icone: "localizacao",
                titulo: "Referência territorial",
                texto: "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Casarão Lima (Demolido em 2026)",
        categoria: "Arquitetônico",
        situacao: "DEMOLIDO",
        bairro: "Centro",
        endereco: "Av. Monteiro Lobato",
        numero: "136",
        cep: "07112-000",
        latitude: -23.4668,
        longitude: -46.529,
        descricao:
            "Edificação residencial urbana construída na Avenida Monteiro Lobato, centro de Guarulhos, representativa do padrão construtivo residencial da primeira metade do século XX.",
        descricaoResumida:
            "Residência histórica da Av. Monteiro Lobato, demolida em junho de 2026 por falha administrativa municipal.",
        historia:
            "Construído na expansão urbana pré-1950, teve seu tombamento requerido em 2021 pela AAPAH (PA 48.324/2021). Em março de 2026, a Justiça concedeu liminar embargando obras no imóvel; contudo, uma falha de comunicação entre secretarias levou à emissão de alvará e à sua demolição em junho de 2026.",
        importanciaCultural:
            "Exemplificava a arquitetura residencial urbana das primeiras décadas do século XX no eixo expandido do centro de Guarulhos.",
        imagem: "casarao_jorge_lima.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Um casarão no centro",
                texto: "Situado no número 136 da Avenida Monteiro Lobato, no centro de Guarulhos, este imóvel residencial foi erguido na primeira metade do século XX, refletindo o processo de expansão urbana e consolidação da classe média mercantil ao longo do eixo viário que conectava o centro aos bairros em crescimento.",
            },
            {
                icone: "arquitetura",
                titulo: "Arquitetura residencial urbana",
                texto: "Era um exemplar da arquitetura residencial urbana pré-1950, mantendo linhas tradicionais da ocupação do centro expandido antes da verticalização e do avanço irrestrito do comércio popular sobre as residências históricas.",
            },
            {
                icone: "processo",
                titulo: "Pedido de tombamento",
                texto: "Em 2021, a Associação Amigos do Patrimônio e Arquivo Histórico (AAPAH) formalizou o pedido de tombamento municipal sob o Processo Administrativo nº 48.324/2021.",
            },
            {
                icone: "processo",
                titulo: "Alvará de demolição",
                texto: "Enquanto o processo andava no conselho, os proprietários obtiveram alvará de demolição junto à Secretaria de Desenvolvimento Urbano, expondo a falta de articulação do poder público.",
            },
            {
                icone: "alerta",
                titulo: "A demolição",
                texto: "Em meados de 2026, o casarão foi inteiramente demolido.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Exemplificava a arquitetura residencial urbana das primeiras décadas do século XX no eixo expandido do centro de Guarulhos.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Casarão da Família Albertis (Demolido em 2023)",
        categoria: "Arquitetônico",
        situacao: "DEMOLIDO",
        bairro: "Ponte Alta",
        endereco: "Rua Zumbi dos Palmares",
        numero: "s/n",
        cep: "07179-330",
        latitude: -23.4115,
        longitude: -46.4285,
        descricao:
            "Casarão residencial da década de 1940, remanescente e sede do antigo Sítio Ponte Alta, associado à família Alberts/Albertis e marcado por elementos artísticos integrados, como vitrais da Casa Conrado e painel de azulejos de Lisbeth Forell.",
        descricaoResumida:
            "Sede remanescente do antigo Sítio Ponte Alta, construída na década de 1940 e demolida em 2023, conhecida como Casarão da Família Albertis.",
        historia:
            "Construído provavelmente na década de 1940 em estilo Neocolonial Missões, o casarão era a sede remanescente do antigo Sítio Ponte Alta e esteve associado à família Alberts. Possuía vitrais produzidos pela Casa Conrado e painel de azulejos da artista Lisbeth Forell. A AAPAH protocolou pedido de tombamento em 19 de setembro de 2022, sob o processo administrativo nº 49511/2022. O imóvel foi demolido em 20 de abril de 2023 antes da conclusão do processo de proteção.",
        importanciaCultural:
            "Representava um raro exemplar da arquitetura residencial da região de Ponte Alta e reunia obras de arte integradas de relevante valor histórico e artístico. Sua demolição tornou-se referência para o debate sobre a proteção preventiva do patrimônio cultural de Guarulhos.",
        imagem: "casarao_albertis_demolido.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Um casarão dos anos 1940",
                texto: "Provavelmente construído na década de 1940, era remanescente e sede do antigo Sítio Ponte Alta, associado à família Alberts/Albertis e à história de Ponte Alta, Anita Garibaldi e Santa Paula.",
            },
            {
                icone: "arquitetura",
                titulo: "Neocolonial Missões",
                texto: "Em estilo Neocolonial Missões, o casarão era único e uma evidência do processo de ocupação da região na primeira metade do século XX.",
            },
            {
                icone: "arquitetura",
                titulo: "Um acervo artístico singular",
                texto: "Possuía um acervo decorativo e artístico integrado de valor histórico singular: continha vitrais originais encomendados e produzidos pela prestigiada Casa Conrado (famoso ateliê paulistano responsável pelos vitrais do Mercado Municipal de São Paulo) e um painel de azulejos assinado pela renomada artista tcheco-brasileira Lisbeth Forell.",
            },
            {
                icone: "processo",
                titulo: "Pedido de tombamento",
                texto: "A AAPAH solicitou o tombamento do imóvel em 19 de setembro de 2022, sob o Processo Administrativo nº 49.511/2022.",
            },
            {
                icone: "alerta",
                titulo: "A demolição",
                texto: "Em 20 de abril de 2023, antes da deliberação do conselho, o novo proprietário optou pela demolição completa da casa. Da construção restou o entulho, levado em um cortejo de caminhões.",
            },
            {
                icone: "importancia",
                titulo: "O que foi resgatado",
                texto: "Ativistas da memória local conseguiram retirar os vitrais da Casa Conrado e os azulejos de Lisbeth Forell a tempo, antes da destruição total do imóvel.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Representava um raro exemplar da arquitetura residencial da região de Ponte Alta e reunia obras de arte integradas de relevante valor histórico e artístico. Sua demolição tornou-se referência para o debate sobre a proteção preventiva do patrimônio cultural de Guarulhos.",
            },
            {
                icone: "localizacao",
                titulo: "Localização histórica aproximada",
                texto: "A Rua Zumbi dos Palmares e as coordenadas são referências aproximadas da localização histórica. O centro exato do antigo lote não foi confirmado independentemente.",
            },
            {
                icone: "historia",
                titulo: "História",
                texto: "Construído provavelmente na década de 1940 em estilo Neocolonial Missões, o casarão era a sede remanescente do antigo Sítio Ponte Alta e esteve associado à família Alberts. Possuía vitrais produzidos pela Casa Conrado e painel de azulejos da artista Lisbeth Forell. A AAPAH protocolou pedido de tombamento em 19 de setembro de 2022, sob o processo administrativo nº 49511/2022. O imóvel foi demolido em 20 de abril de 2023 antes da conclusão do processo de proteção.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Antiga Carbonell Fiação e Tecelagem e Casarões Gêmeos (Demolidos)",
        categoria: "Industrial",
        situacao: "DEMOLIDO",
        bairro: "Centro",
        endereco: "Rua Força Pública",
        numero: "292",
        cep: "07012-030",
        latitude: -23.47254,
        longitude: -46.53156,
        descricao:
            "Antigo complexo têxtil ligado à família Carbonell e ao processo inicial de industrialização de Guarulhos. A fábrica e os casarões residenciais associados desapareceram com as transformações urbanas do centro.",
        descricaoResumida:
            "Complexo têxtil histórico da família Carbonell, ligado à industrialização de Guarulhos no início do século XX e posteriormente demolido.",
        historia:
            "A implantação da Carbonell Fiação e Tecelagem possui divergência documental. Um guia de educação patrimonial de Guarulhos registra a fábrica em funcionamento em 1917, fundada por Henrique Carbonell. Pesquisa acadêmica da USP baseada na cronologia de João Ranali registra o início das atividades em 2 de abril de 1925, pelos irmãos Hilário e Henrique Carbonell, na Rua Força Pública, nº 292, com cerca de 160 operários. O complexo integrou o primeiro ciclo de industrialização da cidade e esteve associado a casarões residenciais da família. As estruturas foram posteriormente demolidas com a transformação imobiliária da região.",
        importanciaCultural:
            "O conjunto representa a primeira fase da industrialização de Guarulhos, a relação entre ferrovia, indústria e urbanização do centro e a memória do trabalho têxtil no município.",
        imagem: "antiga_carbonell_demolida.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "Pioneiros da indústria têxtil",
                texto: "A implantação da Carbonell Fiação e Tecelagem possui divergência documental. Um guia de educação patrimonial de Guarulhos registra a fábrica em funcionamento em 1917, fundada por Henrique Carbonell. Pesquisa acadêmica da USP baseada na cronologia de João Ranali registra o início das atividades em 2 de abril de 1925, pelos irmãos Hilário e Henrique Carbonell, na Rua Força Pública, nº 292, com cerca de 160 operários. O complexo integrou o primeiro ciclo de industrialização da cidade e esteve associado a casarões residenciais da família. As estruturas foram posteriormente demolidas com a transformação imobiliária da região.",
            },
            {
                icone: "arquitetura",
                titulo: "Dois casarões idênticos",
                texto: "Junto à fábrica havia dois casarões idênticos da família. Um já havia sido descaracterizado; o outro abrigou, até pouco antes da demolição, o Colégio Eleonora Carbonell, nome que homenageia a esposa de Henrique Carbonell.",
            },
            {
                icone: "tempo",
                titulo: "O fim da fábrica",
                texto: "A fábrica fechou as portas na década de 1990 e já havia desaparecido do terreno quando o último casarão foi demolido.",
            },
            {
                icone: "alerta",
                titulo: "A demolição em 2009",
                texto: "O último casarão foi demolido em poucos dias, em 2009, com a anuência da prefeitura, para dar lugar a torres residenciais de uma construtora. Segundo o site São Paulo Antiga, nenhum jornal da cidade noticiou o fato.",
            },
            {
                icone: "processo",
                titulo: "Datas históricas divergentes",
                texto: "As fontes consultadas não são unânimes quanto ao início da fábrica: há registro municipal de 1917 e pesquisa acadêmica baseada em João Ranali que aponta 2 de abril de 1925. Por isso, o cadastro preserva a divergência em vez de adotar uma única data como absoluta.",
            },
            {
                icone: "localizacao",
                titulo: "Localização histórica",
                texto: "A Rua Força Pública, nº 292, é documentada como endereço da fábrica em pesquisa acadêmica. As coordenadas usadas no mapa são uma referência aproximada do logradouro atual, não a confirmação do centro exato do antigo lote fabril.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Antiga Igreja Matriz Colonial de N. Sra. da Conceição (Demolida)",
        categoria: "Arquitetônico",
        situacao: "DEMOLIDO",
        bairro: "Centro",
        endereco: "Praça Tereza Cristina (atual Catedral)",
        numero: "s/n",
        cep: "07011-040",
        latitude: -23.455,
        longitude: -46.5325,
        descricao:
            "Edificação religiosa colonial de grande porte construída em taipa de pilão, com paredes espessas e telhas capa-e-canal, situada na atual Praça Tereza Cristina.",
        descricaoResumida:
            "Igreja colonial de taipa de pilão concluída em 1743 e gradativamente desmantelada entre os anos 1930 e 1960.",
        historia:
            "Originada no aldeamento jesuítico de 1560, a igreja de taipa teve sua estrutura definitiva concluída em 1743. Considerada ultrapassada para o crescimento demográfico do século XX, foi desmontada por partes entre as décadas de 1930 e 1960 para abrir espaço à atual Catedral.",
        importanciaCultural:
            "Principal monumento colonial paulista da cidade, cuja destruição representou a perda do maior testemunho edificado dos séculos XVII e XVIII no centro urbano.",
        imagem: "matriz_colonial_demolida.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "A missão jesuítica",
                texto: "A primeira edificação religiosa no local data de meados do século XVI (por volta de 1560), originada na missão jesuítica junto aos povos indígenas nativos (Maromomis/Guarus).",
            },
            {
                icone: "tempo",
                titulo: "A matriz em taipa de pilão",
                texto: "Ao longo do século XVII, uma estrutura definitiva em taipa de pilão foi erguida, tornando-se a Igreja Matriz da Freguesia de Nossa Senhora da Conceição dos Guarulhos.",
            },
            {
                icone: "importancia",
                titulo: "O marco zero de Guarulhos",
                texto: "Tratava-se do marco zero fundacional de Guarulhos.",
            },
            {
                icone: "arquitetura",
                titulo: "Colonial barroca paulista",
                texto: "A matriz colonial era um exemplar puro da arquitetura colonial barroca paulista, caracterizada por paredes espessas de taipa de pilão, piso em barro batido/madeira, telhamento de capa e canal e altares esculpidos em madeira retalhada.",
            },
            {
                icone: "processo",
                titulo: "Uma igreja “acanhada”",
                texto: "Com o crescimento populacional no início do século XX, a edificação colonial passou a ser considerada acanhada e de difícil manutenção.",
            },
            {
                icone: "alerta",
                titulo: "Desmanchada em etapas",
                texto: "Entre as décadas de 1930 e meados de 1950, a ancestral matriz de taipa foi gradualmente desmanchada e demolida em etapas para dar lugar à atual Catedral em estilo neoclássico.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "Principal monumento colonial paulista da cidade, cuja destruição representou a perda do maior testemunho edificado dos séculos XVII e XVIII no centro urbano.",
            },
            {
                icone: "localizacao",
                titulo: "Referência territorial",
                texto: "O endereço e as coordenadas identificam uma referência territorial ou histórica, sem numeração de imóvel aplicável. Não representam a confirmação do centro exato de um lote.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
    {
        nome: "Primitiva Igreja de Nossa Senhora do Rosário dos Homens Pretos (1717)",
        categoria: "Arquitetônico",
        situacao: "DEMOLIDO",
        bairro: "Centro",
        endereco: "Calçadão da Rua Dom Pedro II / Praça Conselheiro Crispiniano",
        numero: "s/n",
        cep: "07010-003",
        latitude: -23.4671,
        longitude: -46.5312,
        descricao:
            "Sítio histórico da antiga igreja colonial de Nossa Senhora do Rosário dos Homens Pretos, construída no centro de Guarulhos e vinculada às irmandades negras da cidade.",
        descricaoResumida:
            "Antiga igreja da Irmandade dos Homens Pretos, erguida no período colonial e demolida nas reformas urbanas do início do século XX; seu sítio é hoje lembrado por marcação no piso do centro.",
        historia:
            "A igreja foi construída no período colonial pela Irmandade dos Homens Pretos e tornou-se espaço de fé, sociabilidade, ajuda mútua e resistência da população negra escravizada e liberta de Guarulhos. O templo ficava na antiga Rua Dom Pedro II e foi demolido no processo de remodelação urbana do centro entre o final da década de 1920 e 1930. Atualmente, uma marcação no piso da região da Praça Conselheiro Crispiniano preserva a referência espacial de sua existência.",
        importanciaCultural:
            "É um marco fundamental da memória da população negra de Guarulhos e da história das irmandades religiosas afro-brasileiras, além de representar um caso emblemático de apagamento e posterior recuperação da memória urbana.",
        imagem: "igreja_nossa_senhora_rosario_homens.jpg",
        detalhes: [
            {
                icone: "historia",
                titulo: "História",
                texto: "A igreja foi construída no período colonial pela Irmandade dos Homens Pretos e tornou-se espaço de fé, sociabilidade, ajuda mútua e resistência da população negra escravizada e liberta de Guarulhos. O templo ficava na antiga Rua Dom Pedro II e foi demolido no processo de remodelação urbana do centro entre o final da década de 1920 e 1930. Atualmente, uma marcação no piso da região da Praça Conselheiro Crispiniano preserva a referência espacial de sua existência.",
            },
            {
                icone: "importancia",
                titulo: "Importância cultural",
                texto: "É um marco fundamental da memória da população negra de Guarulhos e da história das irmandades religiosas afro-brasileiras, além de representar um caso emblemático de apagamento e posterior recuperação da memória urbana.",
            },
            {
                icone: "localizacao",
                titulo: "Sítio de memória",
                texto: "As coordenadas representam a marcação contemporânea associada à antiga igreja, no Calçadão da Rua Dom Pedro II / Praça Conselheiro Crispiniano. Não há templo existente neste ponto.",
            },
        ],
        cidade: "Guarulhos",
        uf: "SP",
    },
];
