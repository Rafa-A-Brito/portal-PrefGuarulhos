import ESTACAO_IMG from "../../assets/estacao_ferroviaria.png";
import BOSQUE_MAIA_IMG from "../../assets/bosque_maia.jpg";
import CATEDRAL_IMG from "../../assets/catedral_conceicao.png";
import SANATORIO_IMG from "../../assets/sanatorio_padre_bento.jpg";
import PARQUE_TIETE_IMG from "../../assets/parque_eco_tiete.png";
import CAPELA_BONSUCESSO_IMG from "../../assets/capela_bonsucesso.png";
import FESTA_BONSUCESSO_IMG from "../../assets/festa_bonsucesso.jpg";

// Novas imagens para os patrimônios adicionados
import CANDINHA_IMG from "../../assets/casa_da_candinha.jpg";
import CASA_MAURICIO_IMG from "../../assets/casa_jose_mauricio.jpg";
import CASA_AMARELA_IMG from "../../assets/casa_amarela.jpg";
import PACO_MUNICIPAL_IMG from "../../assets/antigo_paco_municipal.jpg";
import ADAMASTOR_IMG from "../../assets/centro_adamastor.jpg";
import CASARAO_HISTORIA_IMG from "../../assets/casarao_nossa_historia.jpg";
import CRISPINIANO_IMG from "../../assets/escola_crispiniano.jpg";
import CAPISTRANO_IMG from "../../assets/escola_capistrano.jpg";
import DULCE_BREVES_IMG from "../../assets/escola_dulce_breves.jpg";
import IGREJA_ROSARIO_IMG from "../../assets/igreja_rosario_pretos.jpg";
import BOM_JESUS_CABECA_IMG from "../../assets/igreja_bom_jesus_cabeca.jpg";
import CAPELA_MACEDO_IMG from "../../assets/capela_macedo.jpg";
import MARIA_FUMACA_IMG from "../../assets/locomotiva_maria_fumaca.jpg";
import CARPICAO_IMG from "../../assets/dia_da_carpicao.jpg";
import BANDA_LIRA_IMG from "../../assets/banda_lira_guarulhos.jpg";
import INDIGENAS_IMG from "../../assets/cultura_indigena_guarulhos.jpg"; // Wassu
import GETULIO_VARGAS_IMG from "../../assets/praca_getulio_vargas.jpg";
import CEMITERIO_IMG from "../../assets/cemiterio_sao_joao_batista.jpg";
import CABUCU_IMG from "../../assets/reserva_cabucu.jpg";
import CASARAO_LIMA_IMG from "../../assets/casarao_jorge_lima.jpg";

// TODO: estes 3 arquivos ainda precisam existir em src/assets (nomes sugeridos).
// Se preferir, comente o import e o item correspondente até ter a imagem.
import LAVRAS_IMG from "../../assets/sitio_lavras_velhas.png";
import LAGO_PATOS_IMG from "../../assets/complexo_lago_dos_patos.jpg";
import POCO_MUNICIPAL_IMG from "../../assets/antigo_poco_municipal.jpg";

// Imagens de patrimônios históricos demolidos
import CASARAO_SARACENI_IMG from "../../assets/casarao_saraceni_demolido.jpg";
import CASARAO_ALBERTIS_IMG from "../../assets/casarao_albertis_demolido.jpg";
import CARBONELL_IMG from "../../assets/antiga_carbonell_demolida.jpg";
import MATRIZ_COLONIAL_IMG from "../../assets/matriz_colonial_demolida.jpg"; // TODO: criar

/*
  Estrutura de cada item:
  - resumo:   texto CURTO, usado nos cards e no topo da página de detalhe.
  - detalhes: pesquisa completa, exibida em seções na página de detalhe.
              Todas as chaves são opcionais (seção sem conteúdo não aparece):
                historia     → história / origem e contexto / sobre a tradição
                importancia  → importância arquitetônica e cultural (demolidos)
                processo     → tombamento, proteção e demolição (demolidos)
                hoje         → função do lugar atualmente
              Cada chave aceita string ou { titulo, texto } para título próprio.
              Use "\n\n" dentro do texto para separar parágrafos.
*/
// Casa José Maurício e Casarão da Nossa História são o mesmo imóvel na pesquisa.
const DETALHES_CASA_JOSE_MAURICIO = [
  {
    icone: "historia",
    titulo: "Residência de um prefeito",
    texto:
      "Construída em 1925 para servir de residência a José Maurício de Oliveira Sobrinho, que foi prefeito de Guarulhos.",
  },
  {
    icone: "arquitetura",
    titulo: "Arquitetura eclética",
    texto:
      "O imóvel apresenta arquitetura eclética e possui elementos construtivos que preservam parte da memória da cidade.",
  },
  {
    icone: "tempo",
    titulo: "Muitas funções ao longo dos anos",
    texto:
      "Ao longo dos anos, também foi utilizado para diferentes funções públicas, como Fórum, Secretaria de Obras, Junta de Alistamento Militar e Museu Histórico de Guarulhos.",
  },
  {
    icone: "processo",
    titulo: "Abandono e compra pela prefeitura",
    texto:
      "Em janeiro de 2011, a AAPAH fez um abraço simbólico no casarão para tentar evitar o destombamento e a demolição, mas o ato teve pouca adesão. Para os herdeiros, restaurar era caro e o terreno valia mais que a casa. Em junho de 2013, a prefeitura comprou o imóvel por R$ 3 milhões, e ele continuou abandonado por anos.",
  },
  {
    icone: "hoje",
    titulo: "O lugar hoje",
    texto:
      "Após o restauro, o imóvel passou a funcionar como o Casarão da Nossa História, espaço de formação, visitação, exposições e atividades relacionadas à história e à memória de Guarulhos. Reaberto em 2025, reúne salas temáticas, maquetes de edificações históricas e exposições de fotografias.",
  },
];

export const patrimoniosMock = [
  // Patrimônios Materiais existentes
  {
    id: "1",
    nome: "Estação Ferroviária de Guarulhos",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Praça IV Centenário, s/n",
    cep: "07011-040",
    resumo:
      "Antiga estação que integrou Guarulhos ao Tramway da Cantareira, marco arquitetônico do Centro.",
    detalhes: [
      {
        icone: "tempo",
        titulo: "Inauguração em 1915",
        texto:
          "Inaugurada em 24 de fevereiro de 1915, a estação fazia parte do ramal de Guarulhos da Estrada de Ferro da Cantareira, o Tramway da Cantareira.",
      },
      {
        icone: "historia",
        titulo: "Um ramal que impulsionou a cidade",
        texto:
          "O ramal seguia o traçado do atual anel viário, com estações em Vila Galvão, Vila Augusta, Gopoúva, Torres Tibagi e Guarulhos, e impulsionou a ocupação urbana ao longo do percurso. Teve importância para o desenvolvimento econômico e industrial de Guarulhos.",
      },
      {
        icone: "tempo",
        titulo: "O fim do ramal",
        texto:
          "O ramal foi desativado em 1965, mas a antiga estação permanece como um dos principais elementos da memória ferroviária da cidade.",
      },
      {
        icone: "gente",
        titulo: "Depois dos trens",
        texto:
          "Depois da desativação, o prédio abrigou a EMEI da Estação, escola municipal desapropriada na década de 1990. A Casa Amarela, ao lado, também pertenceu à escola e chegou a sediar o Arquivo Histórico de Guarulhos.",
      },
      {
        icone: "hoje",
        titulo: "O lugar hoje",
        texto:
          "A estação foi restaurada e integra o conjunto histórico da Praça IV Centenário, que também reúne a Casa Amarela e a locomotiva Maria Fumaça. Segundo a AAPAH, em 2024 o prédio não tinha uso definido pela prefeitura e apresentava sinais de vandalismo.",
      },
    ],
    fatos: [
      { rotulo: "Inauguração", valor: "24 de fevereiro de 1915" },
      { rotulo: "Ramal", valor: "Tramway da Cantareira" },
      { rotulo: "Ramal desativado", valor: "1965" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
    ],
    ligacoes: [
      { id: "10", texto: "A casa do chefe da estação, ao lado." },
      { id: "20", texto: "A locomotiva que lembra o Trenzinho de Guarulhos." },
    ],
    imagemPrincipal: ESTACAO_IMG,
    localizacao: { lat: -23.4543, lng: -46.5333 },
  },
  {
    id: "2",
    nome: "Parque Bosque Maia",
    categoria: "natural",
    bairro: "Cidade Maia",
    endereco: "Rua Paulo Faccini (esq. Av. Papa João XXIII)",
    resumo:
      "Maior parque urbano de Guarulhos, considerado o pulmão verde do município e área de convivência.",
    detalhes: [
      {
        icone: "natureza",
        titulo: "O maior parque urbano",
        texto:
          "Também conhecido como Parque Recanto das Olaias, é o maior parque urbano de Guarulhos.",
      },
      {
        icone: "natureza",
        titulo: "Mata Atlântica no centro",
        texto:
          "Preserva espécies nativas da Mata Atlântica e serve como pulmão verde no centro urbano.",
      },
      {
        icone: "importancia",
        titulo: "Proteção paisagística e ambiental",
        texto:
          "O parque possui tombamento de caráter paisagístico e ambiental. Já constava, em 1990, na relação de imóveis de interesse de preservação da Lei Orgânica do Município e foi tombado em 2000.",
      },
    ],
    // TODO: endereço atualizado conforme o decreto de 2000 (Rua Paulo Faccini, Cidade Maia); conferir a coordenada e o CEP
    fatos: [
      { rotulo: "Tipo", valor: "Parque urbano" },
      { rotulo: "Bioma", valor: "Mata Atlântica" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
    ],
    imagemPrincipal: BOSQUE_MAIA_IMG,
    localizacao: { lat: -23.4565, lng: -46.5292 },
  },
  {
    id: "3",
    nome: "Catedral Nossa Senhora da Conceição",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Praça Tereza Cristina, 60",
    cep: "07011-040",
    resumo:
      "Sede da Diocese de Guarulhos em estilo neoclássico, construída no local da primitiva matriz colonial.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Sede da diocese",
        texto: "Igreja Matriz e sede da Diocese de Guarulhos.",
      },
      {
        icone: "arquitetura",
        titulo: "Estilo neoclássico e eclético",
        texto:
          "A atual edificação, em estilo neoclássico/eclético, foi erguida em meados do século XX.",
      },
      {
        icone: "tempo",
        titulo: "No lugar da primeira matriz",
        texto:
          "O prédio ocupa o local da primitiva igreja matriz de taipa de pilão, do período colonial, ligada ao aldeamento jesuítico fundado em 1560 em torno da capela de Nossa Senhora da Conceição.",
      },
      {
        icone: "historia",
        titulo: "O coração da cidade antiga",
        texto:
          "Foi nas imediações da catedral que começou a ser construída a cidade. A Rua Dom Pedro II e a Praça Tereza Cristina são os dois logradouros mais antigos de Guarulhos.",
      },
    ],
    // TODO: datas da primeira igreja divergem entre as fontes (cerca de 1560, 1685 e 1741); revisar antes de publicar
    fatos: [
      { rotulo: "Sede", valor: "Diocese de Guarulhos" },
      { rotulo: "Estilo", valor: "Neoclássico/eclético" },
      { rotulo: "Construção atual", valor: "Meados do século XX" },
    ],
    ligacoes: [
      {
        id: "34",
        texto: "A primeira matriz, em taipa de pilão, desmanchada em etapas.",
      },
    ],
    imagemPrincipal: CATEDRAL_IMG,
    localizacao: { lat: -23.455, lng: -46.5325 },
  },
  {
    id: "4",
    nome: "Complexo Sanatório Padre Bento",
    categoria: "arquitetonico",
    bairro: "Jardim Tranquilidade",
    endereco: "Av. Emílio Ribas, 1573",
    resumo:
      "Antigo leprosário em estilo art déco/neocolonial, abriga o Teatro Padre Bento e a Igreja São João Batista.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Um asilo-colônia",
        texto:
          "Inaugurado na década de 1930 como leprosário/asilo-colônia para isolamento compulsório de pacientes de hanseníase.",
      },
      {
        icone: "arquitetura",
        titulo: "Art déco e neocolonial",
        texto:
          "Constitui um dos conjuntos arquitetônicos em estilo art déco/neocolonial mais importantes da cidade.",
      },
      {
        icone: "importancia",
        titulo: "Proteção estadual e municipal",
        texto:
          "O complexo é tombado pelo Condephaat (processo nº 33.189/95). No município, a igreja e o cineteatro foram tombados em 1990, e os demais imóveis e a vegetação, em 2000. O campo de futebol do hospital também foi tombado, em 1993.",
      },
      {
        icone: "hoje",
        titulo: "O lugar hoje",
        texto:
          "Abriga o Teatro Padre Bento, a Igreja São João Batista e unidades de atendimento à saúde pública.",
      },
    ],
    // TODO: endereço atualizado conforme o decreto de 2000 (Av. Emílio Ribas, 1573); conferir CEP
    fatos: [
      { rotulo: "Inauguração", valor: "Década de 1930" },
      { rotulo: "Estilo", valor: "Art déco/neocolonial" },
      { rotulo: "Tombamento estadual", valor: "Condephaat, proc. 33.189/95" },
    ],
    imagemPrincipal: SANATORIO_IMG,
    localizacao: { lat: -23.453, lng: -46.531 },
  },
  {
    id: "5",
    nome: "Parque Ecológico do Tietê",
    categoria: "natural",
    bairro: "Cumbica",
    endereco: "Av. Tancredo Neves, s/n",
    cep: "07231-000",
    resumo:
      "Área verde às margens do Rio Tietê, essencial para a preservação e equilíbrio ambiental da região.",
    imagemPrincipal: PARQUE_TIETE_IMG,
    localizacao: { lat: -23.4368, lng: -46.4614 },
  },
  {
    id: "6",
    nome: "Igreja de Nossa Senhora de Bonsucesso",
    categoria: "arquitetonico",
    bairro: "Bonsucesso",
    endereco: "Praça Nossa Senhora de Bonsucesso, 13",
    cep: "07162-160",
    resumo:
      "Construção do século XVIII, polo religioso mais tradicional da cidade associado à Festa do Bonsucesso.",
    detalhes: [
      {
        icone: "tempo",
        titulo: "Fundada no século XVIII",
        texto: "Fundada no século XVIII no antigo bairro do Bonsucesso.",
      },
      {
        icone: "fe",
        titulo: "Polo religioso e cultural",
        texto:
          "Trata-se do polo religioso e cultural mais tradicional do município.",
      },
      {
        icone: "tradicao",
        titulo: "Romarias e festa",
        texto: "A igreja é associada às romarias e à Festa do Bonsucesso.",
      },
      {
        icone: "importancia",
        titulo: "Tombada em 2000",
        texto:
          "A igreja é de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo município em 2000 (Decreto nº 21.143).",
      },
    ],
    fatos: [
      { rotulo: "Origem", valor: "Século XVIII" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
      { rotulo: "Festa", valor: "Agosto" },
    ],
    ligacoes: [
      { id: "7", texto: "A festa que reúne romeiros todo mês de agosto." },
      { id: "21", texto: "A Carpição, mutirão de fé no entorno da igreja." },
    ],
    imagemPrincipal: CAPELA_BONSUCESSO_IMG,
    localizacao: { lat: -23.4182, lng: -46.4111 },
  },
  {
    id: "7",
    nome: "Festa de Nossa Senhora de Bonsucesso",
    categoria: "imaterial",
    bairro: "Bonsucesso",
    endereco: "Rua Silva Bueno, s/n",
    cep: "07162-160",
    resumo:
      "Celebrada desde meados do século XVIII, une religiosidade popular, romarias, gastronomia e feira de artesanato.",
    detalhes: [
      {
        icone: "tempo",
        titulo: "Quase três séculos de tradição",
        texto:
          "Celebrada ininterruptamente desde meados do século XVIII no Bairro do Bonsucesso, em agosto, em louvor a Nossa Senhora do Bonsucesso.",
      },
      {
        icone: "tradicao",
        titulo: "Fé, cultura e sabores",
        texto:
          "Une religiosidade popular católica, manifestações culturais, apresentações folclóricas, gastronomia tradicional e feiras de artesanato.",
      },
      {
        icone: "tradicao",
        titulo: "A Benção da Terra",
        texto:
          "A programação inclui a Benção da Terra, conhecida como Carpição.",
      },
      {
        icone: "gente",
        titulo: "Romeiros de várias partes do país",
        texto: "A festa atrai romeiros de várias partes do país.",
      },
    ],
    // TODO: o resumo antigo dizia “mais de 280 anos”; a fonte acadêmica diz “desde meados do século XVIII”
    fatos: [
      { rotulo: "Quando", valor: "Agosto" },
      { rotulo: "Origem", valor: "Meados do século XVIII" },
      { rotulo: "Local", valor: "Bairro do Bonsucesso" },
    ],
    ligacoes: [
      { id: "6", texto: "A igreja que abriga a devoção." },
      { id: "21", texto: "A Carpição, que antecede a festa." },
    ],
    imagemPrincipal: FESTA_BONSUCESSO_IMG,
    localizacao: { lat: -23.419, lng: -46.4105 },
  },

  // --- 2. NOVOS PATRIMÔNIOS ADICIONADOS ---

  // A. Edificações, Prédios Públicos e Templos (arquitetonico)
  {
    id: "8",
    nome: "Sítio da Candinha (Casa da Candinha)",
    categoria: "arquitetonico",
    bairro: "Bananal",
    endereco: "Bairro do Bananal (região de Lavras)",
    cep: "07175-000",
    resumo:
      "Casa-sede da antiga Fazenda Bananal, em taipa de pilão, é a única remanescente escravagista com senzala na região metropolitana de São Paulo.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Casa-sede da Fazenda Bananal",
        texto:
          "É uma das construções mais antigas de Guarulhos e foi a casa-sede da antiga Fazenda Bananal.",
      },
      {
        icone: "arquitetura",
        titulo: "Taipa de pilão e bambu",
        texto:
          "A casa foi feita em taipa de pilão entrelaçada com bambu e é datada provavelmente de 1825. Guarda um oratório colonial com imagens e objetos religiosos.",
      },
      {
        icone: "tempo",
        titulo: "A senzala que resiste",
        texto:
          "É a única remanescente do período escravagista que ainda possui senzala na região metropolitana de São Paulo, o que a torna um raro registro da ocupação rural e da escravidão na região.",
      },
      {
        icone: "importancia",
        titulo: "Proteção",
        texto:
          "O sítio foi tombado pelo Decreto Municipal nº 21.143/2000 e desapropriado pela prefeitura em 2004 (Decreto nº 22.787/2004).",
      },
      {
        icone: "hoje",
        titulo: "O lugar hoje",
        texto:
          "Patrimônio histórico localizado no atual Bairro do Bananal, na região de Lavras.",
      },
    ],
    // TODO: o bairro mudou de Bonsucesso para Bananal conforme a prefeitura; conferir a coordenada
    fatos: [
      { rotulo: "Casa-sede", valor: "Provavelmente de 1825" },
      { rotulo: "Técnica", valor: "Taipa de pilão" },
      { rotulo: "Singularidade", valor: "Senzala preservada" },
      { rotulo: "Tombamento", valor: "2000" },
    ],
    imagemPrincipal: CANDINHA_IMG,
    localizacao: { lat: -23.4051, lng: -46.402 },
  },
  {
    id: "9",
    nome: "Casa José Maurício",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Rua Sete de Setembro, s/n",
    cep: "07011-020",
    resumo:
      "Residência do ex-prefeito José Maurício de Oliveira Sobrinho, construída em 1925 e hoje restaurada como espaço de memória.",
    detalhes: DETALHES_CASA_JOSE_MAURICIO,
    // TODO: o resumo antigo dizia “taipa de pilão do século XIX”, que não bate com a data oficial (1925); material da construção não confirmado
    fatos: [
      { rotulo: "Construída", valor: "1925" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
      { rotulo: "Comprada pela prefeitura", valor: "2013" },
      { rotulo: "Reabertura", valor: "2025" },
    ],
    ligacoes: [
      { id: "13", texto: "O mesmo imóvel, como Casarão da Nossa História." },
      { id: "11", texto: "O antigo Paço, na mesma esquina." },
    ],
    imagemPrincipal: CASA_MAURICIO_IMG,
    localizacao: { lat: -23.4688, lng: -46.5312 },
  },
  {
    id: "10",
    nome: "Casa Amarela (Casa do Chefe da Estação)",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Praça IV Centenário, s/n",
    cep: "07011-040",
    resumo:
      "Moradia do chefe da estação do Tramway da Cantareira, construída no início do século XX.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Casa do chefe da estação",
        texto:
          "Construída no início do século XX para servir de moradia ao chefe da estação ferroviária do antigo ramal Tramway da Cantareira.",
      },
      {
        icone: "importancia",
        titulo: "Ligada à linha de trem",
        texto:
          "A Tramway da Cantareira foi uma linha de trem fundamental para o transporte e a urbanização de Guarulhos.",
      },
      {
        icone: "hoje",
        titulo: "Depois da ferrovia",
        texto:
          "A casa também pertenceu à escola municipal que funcionou na estação e chegou a sediar o Arquivo Histórico de Guarulhos. Foi tombada em 2000, junto com a estação.",
      },
    ],
    fatos: [
      { rotulo: "Construída", valor: "Início do século XX" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
      { rotulo: "Usos", valor: "Moradia, escola e arquivo" },
    ],
    ligacoes: [
      { id: "1", texto: "A estação ao lado, inaugurada em 1915." },
      { id: "20", texto: "A Maria Fumaça, na mesma praça." },
    ],
    imagemPrincipal: CASA_AMARELA_IMG,
    localizacao: { lat: -23.4545, lng: -46.533 },
  },
  {
    id: "11",
    nome: "Antigo Paço Municipal",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco:
      "Rua Sete de Setembro, 146, 156 e 166 (esq. Rua Felício Marcondes)",
    resumo:
      "Prédio neoclássico construído entre 1919 e 1923, sede da Prefeitura até 1958 e da Câmara Municipal até 1951.",
    detalhes: [
      {
        icone: "arquitetura",
        titulo: "Neoclássico, em tijolo maciço",
        texto:
          "Construído entre 1919 e 1923 na esquina da Rua Sete de Setembro com a Rua Felício Marcondes, é um típico exemplar da arquitetura neoclássica, feito em tijolos maciços e com porão. A fachada tem frontão, pináculos e uma escultura de rosto feminino que representa Deméter, deusa grega do trigo.",
      },
      {
        icone: "historia",
        titulo: "Sede do poder municipal",
        texto:
          "Entre 1923 e 1940 abrigou a Câmara dos Vereadores (andar superior), a Prefeitura e a Delegacia (térreo) e a Cadeia Pública (porão). A Câmara saiu em 1951 e a Prefeitura se mudou para a Praça Getúlio Vargas em 1958.",
      },
      {
        icone: "tempo",
        titulo: "Depois da prefeitura",
        texto:
          "Com a saída da prefeitura, o prédio recebeu o Departamento de Educação e Cultura, o Conservatório Municipal, o Departamento de Obras e a Junta de Alistamento Militar.",
      },
      {
        icone: "processo",
        titulo: "Reformas e perdas",
        texto:
          "Ganhou anexos nos anos 1940 e, nos anos 1980, teve as esquadrias originais trocadas e a escada da fachada retirada, o que desfez a simetria típica do estilo. Em 2017, um projeto de restauro foi aprovado pelo conselho do patrimônio, mas parte do forro original foi arrancada um dia depois.",
      },
    ],
    // TODO: endereço corrigido conforme o inventário da prefeitura (antes: Rua Dom Pedro II); CEP removido até conferência
    fatos: [
      { rotulo: "Construção", valor: "1919 a 1923" },
      { rotulo: "Estilo", valor: "Neoclássico" },
      { rotulo: "Prefeitura até", valor: "1958" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
    ],
    ligacoes: [
      { id: "9", texto: "A casa do ex-prefeito, na mesma esquina." },
      { id: "24", texto: "Para onde a prefeitura se mudou em 1958." },
    ],
    imagemPrincipal: PACO_MUNICIPAL_IMG,
    localizacao: { lat: -23.467, lng: -46.532 },
  },
  {
    id: "12",
    nome: "Centro Municipal de Educação Adamastor",
    categoria: "arquitetonico",
    bairro: "Macedo",
    endereco: "Av. Monteiro Lobato, 734",
    cep: "07112-000",
    resumo:
      "Antigo complexo fabril reciclado para uso cultural, educacional e centro de convenções da prefeitura.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Antiga Fábrica Adamastor",
        texto: "Relevante complexo fabril construído em meados do século XX.",
      },
      {
        icone: "tempo",
        titulo: "De vila agrícola a polo industrial",
        texto:
          "O complexo simbolizou a transição de Guarulhos de uma vila agrícola/olaria para um dos maiores polos industriais do país.",
      },
      {
        icone: "arquitetura",
        titulo: "Reciclagem de uso",
        texto:
          "Foi objeto de um grande projeto de reciclagem de uso arquitetônico.",
      },
      {
        icone: "hoje",
        titulo: "O lugar hoje",
        texto:
          "Polo cultural, educacional e de convenções gerido pela Prefeitura.",
      },
    ],
    fatos: [
      { rotulo: "Construção", valor: "Meados do século XX" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
      { rotulo: "Uso atual", valor: "Polo cultural e educacional" },
    ],
    imagemPrincipal: ADAMASTOR_IMG,
    localizacao: { lat: -23.4632, lng: -46.5251 },
  },
  {
    id: "13",
    nome: "Casarão da Nossa História",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Rua Sete de Setembro, s/n",
    cep: "07011-020",
    resumo:
      "Antiga casa do ex-prefeito José Maurício, restaurada e reaberta em 2025 como museu e centro de formação sobre a história de Guarulhos.",
    detalhes: DETALHES_CASA_JOSE_MAURICIO,
    fatos: [
      { rotulo: "Construída", valor: "1925" },
      { rotulo: "Reabertura", valor: "2025" },
      { rotulo: "Esquina", valor: "Sete de Setembro com Felício Marcondes" },
    ],
    ligacoes: [
      { id: "9", texto: "A mesma casa, vista como Casa José Maurício." },
      { id: "11", texto: "O antigo Paço, na mesma esquina." },
    ],
    imagemPrincipal: CASARAO_HISTORIA_IMG,
    localizacao: { lat: -23.468, lng: -46.5305 },
  },
  {
    id: "14",
    nome: "E.E. Conselheiro Crispiniano",
    categoria: "arquitetonico",
    bairro: "Vila Progresso",
    endereco: "Av. Arminda de Lima, 75 (esq. Rua Marret)",
    resumo:
      "Primeira escola secundária pública da cidade, projetada em 1960 pelo arquiteto Vilanova Artigas.",
    detalhes: [
      {
        icone: "ensino",
        titulo: "Primeira escola secundária pública",
        texto:
          "Primeira escola pública de ensino secundário da cidade. O prédio original abrigou o “Ginásio de Guarulhos”.",
      },
      {
        icone: "arquitetura",
        titulo: "Projeto de Vilanova Artigas",
        texto:
          "O prédio foi projetado pelo renomado arquiteto modernista João Batista Vilanova Artigas em 1960.",
      },
      {
        icone: "importancia",
        titulo: "Marco da arquitetura moderna",
        texto:
          "O projeto é marco da arquitetura moderna brasileira, tombado pelo Condephaat (processo nº 54.292/05) e também pelo município, em 2000.",
      },
    ],
    // TODO: endereço e bairro atualizados conforme o decreto de 2000; conferir coordenada e CEP
    fatos: [
      { rotulo: "Projeto", valor: "1960" },
      { rotulo: "Arquiteto", valor: "Vilanova Artigas" },
      { rotulo: "Tombamento estadual", valor: "Condephaat, proc. 54.292/05" },
    ],
    imagemPrincipal: CRISPINIANO_IMG,
    localizacao: { lat: -23.4658, lng: -46.53 },
  },
  {
    id: "15",
    nome: "E.E. Capistrano de Abreu",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Rua Capitão Gabriel, 385",
    cep: "07011-010",
    resumo:
      "Um dos primeiros grupos escolares do município, construído em alvenaria de tijolos no século XX.",
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
        texto:
          "O prédio é representativo da expansão da rede pública de ensino paulista no século XX. Já constava, em 1990, na Lei Orgânica e foi tombado pelo município em 2000.",
      },
    ],
    fatos: [
      { rotulo: "Técnica", valor: "Alvenaria de tijolos" },
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
    ],
    imagemPrincipal: CAPISTRANO_IMG,
    localizacao: { lat: -23.4661, lng: -46.5315 },
  },
  {
    id: "16",
    nome: "E.E. Dulce Breves Neves",
    categoria: "arquitetonico",
    bairro: "Vila Galvão",
    endereco: "Rua Riolândia, s/n",
    cep: "07071-020",
    resumo:
      "Prédio escolar tradicional e marco arquitetônico da expansão da rede pública de ensino.",
    detalhes: [
      {
        icone: "ensino",
        titulo: "Prédio escolar tradicional",
        texto: "Prédio escolar tradicional de Guarulhos.",
      },
      {
        icone: "importancia",
        titulo: "Valor comunitário e arquitetônico",
        texto:
          "Tem relevante valor comunitário e arquitetônico para a memória da educação pública em Guarulhos.",
      },
      {
        icone: "processo",
        titulo: "Tombada em 2012",
        texto:
          "A escola foi tombada pelo município pela Lei nº 7.014, de 2 de abril de 2012.",
      },
    ],
    fatos: [{ rotulo: "Tombamento", valor: "Lei nº 7.014/2012" }],
    imagemPrincipal: DULCE_BREVES_IMG,
    localizacao: { lat: -23.4589, lng: -46.5501 },
  },
  {
    id: "17",
    nome: "Igreja de N. Sra. do Rosário dos Homens Pretos",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Praça do Rosário, s/n",
    cep: "07011-000",
    resumo:
      "Templo ligado às irmandades negras, fundado em meados do século XVIII e reconstruído em 1930 perto do local original.",
    detalhes: [
      {
        icone: "gente",
        titulo: "Irmandades negras",
        texto: "Templo ligado às irmandades negras da cidade.",
      },
      {
        icone: "historia",
        titulo: "Quase 200 anos na Rua Dom Pedro II",
        texto:
          "Fundada em meados do século XVIII, a igreja permaneceu por quase 200 anos no mesmo lugar, na atual Rua Dom Pedro II.",
      },
      {
        icone: "processo",
        titulo: "Demolida e reconstruída em 1930",
        texto:
          "Em 1930, o templo foi demolido, realocado, renomeado e reconstruído nas proximidades do sítio original.",
      },
      {
        icone: "importancia",
        titulo: "Memória e apagamento",
        texto:
          "Historiadores locais relacionam a mudança ao afastamento da presença negra da região central. Em 2006, uma mancha escura foi aplicada ao calçamento da Rua Dom Pedro II para marcar o provável local da igreja original; segundo estudo publicado em 2017, o sítio ainda não tinha reconhecimento oficial como patrimônio.",
      },
      {
        icone: "importancia",
        titulo: "Fé e resistência",
        texto:
          "A igreja é símbolo da fé e da resistência afro-brasileira em Guarulhos.",
      },
    ],
    // TODO: texto corrigido: a igreja atual NÃO ocupa o sítio original (fonte: Unicamp/Resgate, 2017)
    // TODO: conferir o endereço atual (Praça do Rosário)
    fatos: [
      { rotulo: "Fundação", valor: "Meados do século XVIII" },
      { rotulo: "Reconstruída", valor: "1930" },
      { rotulo: "Local original", valor: "Rua Dom Pedro II" },
    ],
    imagemPrincipal: IGREJA_ROSARIO_IMG,
    localizacao: { lat: -23.4665, lng: -46.5332 },
  },
  {
    id: "18",
    nome: "Igreja do Bom Jesus da Cabeça",
    categoria: "arquitetonico",
    bairro: "Cabuçu",
    endereco: "Estrada do Cabuçu, 58",
    resumo:
      "Templo de devoção popular com origens rurais, marco nos caminhos de fé tradicionais.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Devoção popular",
        texto: "Tradicional templo de devoção popular, com raízes rurais.",
      },
      {
        icone: "fe",
        titulo: "Caminhos de fé",
        texto:
          "Representa a religiosidade e as caminhadas de fé que marcaram os caminhos de passagem da cidade.",
      },
      {
        icone: "importancia",
        titulo: "Tombada em 2000",
        texto:
          "A igreja é de propriedade da Mitra Diocesana de Guarulhos e foi tombada pelo município em 2000 (Decreto nº 21.143).",
      },
    ],
    // TODO: Bom Jesus da Cabeça (Cabuçu) e Bom Jesus da Capelinha (Estrada de Nazaré Paulista, km 36) são DUAS igrejas tombadas; a pesquisa as tratava como uma só
    // TODO: a coordenada abaixo ainda é a antiga (Vila Augusta); atualizar para a Estrada do Cabuçu, 58
    // TODO: considerar criar um item separado para a Igreja Bom Jesus da Capelinha
    fatos: [
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
      { rotulo: "Bairro", valor: "Cabuçu" },
    ],
    imagemPrincipal: BOM_JESUS_CABECA_IMG,
    localizacao: { lat: -23.475, lng: -46.538 },
  },
  {
    id: "19",
    nome: "Capela do Bom Jesus do Macedo",
    categoria: "arquitetonico",
    bairro: "Macedo",
    endereco: "Av. Monteiro Lobato, s/n",
    cep: "07112-000",
    resumo:
      "Templo católico comunitário que atuou como núcleo de povoamento na primeira metade do século XX.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Capela de bairro histórico",
        texto:
          "A Capela do Bom Jesus do Macedo é um templo católico de bairro histórico.",
      },
      {
        icone: "gente",
        titulo: "Núcleo de povoamento",
        texto:
          "Serviu como núcleo de povoamento e de convivência comunitária na primeira metade do século XX.",
      },
      {
        icone: "importancia",
        titulo: "Protegida desde 1990",
        texto:
          "A igreja já constava, em 1990, na relação de imóveis de interesse de preservação cultural da Lei Orgânica do Município.",
      },
    ],
    // TODO: a Igreja São João Batista dos Morros (Praça Nello Poli, Cocaia) é outro templo tombado, em outro bairro; falta um item próprio com imagem e coordenada
    fatos: [{ rotulo: "Proteção", valor: "Lei Orgânica, 1990" }],
    imagemPrincipal: CAPELA_MACEDO_IMG,
    localizacao: { lat: -23.462, lng: -46.521 },
  },
  {
    id: "20",
    nome: "Locomotiva Maria Fumaça (Nº 33) e Vagão",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Praça IV Centenário, s/n",
    cep: "07011-040",
    resumo:
      "Monumento ferroviário preservado que homenageia a memória do 'Trenzinho de Guarulhos'.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Um conjunto ferroviário",
        texto:
          "Conjunto formado pela locomotiva, pelo vagão e pela caixa d'água, na Praça IV Centenário.",
      },
      {
        icone: "tempo",
        titulo: "Memória do Trenzinho",
        texto:
          "O monumento preserva a memória do Tramway da Cantareira (“Trenzinho de Guarulhos”), operante até a década de 1960.",
      },
    ],
    fatos: [
      { rotulo: "Local", valor: "Praça IV Centenário" },
      { rotulo: "Memória", valor: "Tramway da Cantareira" },
      { rotulo: "Operou até", valor: "Década de 1960" },
    ],
    ligacoes: [
      { id: "1", texto: "A estação inaugurada em 1915." },
      { id: "10", texto: "A casa do chefe da estação." },
    ],
    imagemPrincipal: MARIA_FUMACA_IMG,
    localizacao: { lat: -23.4544, lng: -46.5328 },
  },

  // B. Patrimônio Imaterial (imaterial)
  {
    id: "21",
    nome: "Dia da Carpição",
    categoria: "imaterial",
    bairro: "Bonsucesso",
    endereco: "Entorno da Igreja de Bonsucesso",
    cep: "07162-160",
    resumo:
      "Tradição centenária de mutirão comunitário onde fiéis limpam o entorno da igreja como ato de fé.",
    detalhes: [
      {
        icone: "tradicao",
        titulo: "Tradição centenária",
        texto:
          "Tradição religiosa e comunitária centenária que antecede a Festa do Bonsucesso.",
      },
      {
        icone: "fe",
        titulo: "Limpeza como ato de fé",
        texto:
          "Os fiéis limpam e carpem o entorno da igreja como ato de fé, pagamento de promessas e mutirão comunitário.",
      },
    ],
    fatos: [
      { rotulo: "Quando", valor: "Antes da Festa de agosto" },
      { rotulo: "Origem", valor: "Tradição centenária" },
    ],
    ligacoes: [
      { id: "7", texto: "A festa que a Carpição antecede." },
      { id: "6", texto: "A igreja cujo entorno é limpo pelos fiéis." },
    ],
    imagemPrincipal: CARPICAO_IMG,
    localizacao: { lat: -23.4182, lng: -46.4111 },
  },
  {
    id: "22",
    nome: "Corporação Musical Banda Lira de Guarulhos",
    categoria: "imaterial",
    bairro: "Centro",
    endereco: "Praça Getúlio Vargas, s/n",
    cep: "07011-000",
    resumo:
      "Centenária banda registrada como Bem Imaterial, conhecida pelas tradicionais retretas em praças.",
    detalhes: [
      {
        icone: "musica",
        titulo: "Uma banda centenária",
        texto:
          "Centenária banda de música fundada na primeira metade do século XX.",
      },
      {
        icone: "tradicao",
        titulo: "Bem Cultural Imaterial",
        texto:
          "Registrada como Bem Cultural Imaterial pela sua contribuição à formação musical e às retretas em praças públicas.",
      },
    ],
    imagemPrincipal: BANDA_LIRA_IMG,
    localizacao: { lat: -23.466, lng: -46.531 },
  },
  {
    id: "23",
    nome: "Cultura e Presença Indígena (Wassu Cocal e Krenak/Pankararu)",
    categoria: "imaterial",
    bairro: "Cabuçu",
    endereco: "Aldeias e territórios urbanos de Guarulhos",
    cep: "07084-000",
    resumo:
      "Memória e ritos ancestrais vivos dos povos indígenas originários que deram nome ao município.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Os povos originários",
        texto:
          "A história de Guarulhos possui uma forte relação com os povos indígenas que habitavam a região antes da colonização, especialmente os povos associados aos Guarus ou Guaramomis.",
      },
      {
        icone: "gente",
        titulo: "Comunidades de hoje",
        texto:
          "Atualmente, o município também possui comunidades indígenas de diferentes etnias, incluindo Wassu-Cocal, Pankararu, Pankararé, Guajajara e Tupi-Guarani.",
      },
      {
        icone: "tradicao",
        titulo: "Tradições vivas",
        texto:
          "A presença dessas comunidades ajuda a manter vivas diferentes tradições, memórias, histórias e formas de expressão cultural.",
      },
    ],
    imagemPrincipal: INDIGENAS_IMG,
    localizacao: { lat: -23.41, lng: -46.54 },
  },

  // C. Parques, Praças e Sítios Arqueológicos (natural)
  {
    id: "24",
    nome: "Praça Getúlio Vargas",
    categoria: "natural",
    bairro: "Centro",
    endereco: "Praça Getúlio Vargas, s/n",
    cep: "07011-000",
    resumo:
      "Praça pública central projetada em meados do século XX, polo de eventos culturais e sociais.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Um espaço público central",
        texto: "Espaço público central projetado em meados do século XX.",
      },
      {
        icone: "gente",
        titulo: "Palco da cidade",
        texto:
          "Palco de eventos políticos, culturais e manifestações populares da cidade.",
      },
      {
        icone: "tempo",
        titulo: "Sede do poder municipal",
        texto:
          "A Prefeitura mudou-se para a Praça Getúlio Vargas em 1958 e a Câmara Municipal, em 1976.",
      },
      {
        icone: "natureza",
        titulo: "Um pau-brasil histórico",
        texto:
          "A praça abriga um pau-brasil considerado de valor histórico, protegido pela legislação municipal.",
      },
    ],
    fatos: [
      { rotulo: "Tombamento", valor: "2000 (Decreto nº 21.143)" },
      { rotulo: "Prefeitura desde", valor: "1958" },
    ],
    ligacoes: [
      { id: "11", texto: "O antigo Paço, de onde a prefeitura saiu em 1958." },
    ],
    imagemPrincipal: GETULIO_VARGAS_IMG,
    localizacao: { lat: -23.466, lng: -46.531 },
  },
  {
    id: "25",
    nome: "Cemitério São João Batista",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Rua Felício Marcondes, s/n",
    cep: "07010-030",
    resumo:
      "Cemitério municipal mais antigo (séc. XIX), com acervo de arte tumular neoclássica.",
    detalhes: [
      {
        icone: "tempo",
        titulo: "O mais antigo da cidade",
        texto:
          "O cemitério público mais antigo de Guarulhos, fundado no século XIX.",
      },
      {
        icone: "arquitetura",
        titulo: "Arte tumular neoclássica",
        texto: "Abriga túmulos em arte tumular neoclássica.",
      },
      {
        icone: "gente",
        titulo: "Famílias fundadoras",
        texto:
          "Reúne os jazigos de famílias fundadoras e personalidades locais.",
      },
      {
        icone: "importancia",
        titulo: "Um dos primeiros tombados",
        texto:
          "A Lei nº 3.642, de 1990, determinou o tombamento do cemitério, um dos poucos bens tombados pelo município antes do grande decreto de 2000.",
      },
    ],
    fatos: [
      { rotulo: "Fundação", valor: "Século XIX" },
      { rotulo: "Tombamento", valor: "Lei nº 3.642/1990" },
    ],
    imagemPrincipal: CEMITERIO_IMG,
    localizacao: { lat: -23.464, lng: -46.532 },
  },
  {
    id: "26",
    nome: "Reserva e Represa do Cabuçu",
    categoria: "natural",
    bairro: "Cabuçu",
    endereco: "Av. Pedro de Souza Lopes, s/n",
    cep: "07084-000",
    resumo:
      "Trecho da Serra da Cantareira com a represa projetada por Edward Wegmann, pioneira no uso do concreto armado no Brasil.",
    detalhes: [
      {
        icone: "natureza",
        titulo: "Serra da Cantareira",
        texto:
          "Compreende o trecho guarulhense da Serra da Cantareira (do Cabuçu ao Bonsucesso), no Parque Estadual da Serra da Cantareira.",
      },
      {
        icone: "historia",
        titulo: "Uma represa pioneira",
        texto:
          "A barragem da Represa do Cabuçu foi projetada com o perfil do engenheiro norte-americano Edward Wegmann, solução considerada revolucionária na época. Foi a primeira vez que o concreto armado foi usado em estruturas no Brasil, segundo tese da USP.",
      },
      {
        icone: "importancia",
        titulo: "Abastecimento e proteção",
        texto:
          "O conjunto é essencial para a história do abastecimento de água. A Reserva Estadual da Cantareira é tombada pelo Condephaat (processo nº 20.536/78), e o trecho do Cabuçu ao Bonsucesso também foi tombado pelo município em 2000.",
      },
    ],
    // TODO: ano da barragem diverge entre as fontes (1904 e 1908); por isso o resumo não cita o ano
    fatos: [
      { rotulo: "Projeto da barragem", valor: "Edward Wegmann" },
      { rotulo: "Tombamento estadual", valor: "Condephaat, proc. 20.536/78" },
      { rotulo: "Tombamento municipal", valor: "2000" },
    ],
    imagemPrincipal: CABUCU_IMG,
    localizacao: { lat: -23.402, lng: -46.535 },
  },
  {
    id: "27",
    nome: "Sítios Arqueológicos das Lavras Velhas do Geraldo",
    categoria: "natural",
    bairro: "Lavras",
    endereco: "Bairro das Lavras",
    cep: "07150-000",
    resumo:
      "Vestígios minerários das antigas lavras de ouro iniciadas em 1590 por Afonso Sardinha.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Mineração de ouro",
        texto:
          "Área relacionada às antigas atividades de mineração de ouro na região de Lavras, com registros que remontam ao final do século XVI.",
      },
      {
        icone: "importancia",
        titulo: "O primeiro ciclo econômico",
        texto:
          "O local representa uma parte importante do primeiro ciclo econômico ligado à formação histórica de Guarulhos.",
      },
    ],
    imagemPrincipal: LAVRAS_IMG,
    localizacao: { lat: -23.42, lng: -46.45 },
  },
  {
    id: "32",
    nome: "Complexo do Lago dos Patos",
    categoria: "natural",
    bairro: "Vila Galvão",
    endereco: "Praça Cícero Miranda, s/nº",
    resumo:
      "Área de lazer e convivência da Vila Galvão, tombada como patrimônio cultural do município desde 2019.",
    detalhes: [
      {
        icone: "natureza",
        titulo: "Um lago na Vila Galvão",
        texto:
          "O Lago da Vila Galvão, também conhecido como Lago dos Patos, tem mais de 20 mil m², com água doce e vegetação.",
      },
      {
        icone: "natureza",
        titulo: "Paisagem da Vila Galvão",
        texto:
          "O Lago dos Patos faz parte da história e da paisagem da Vila Galvão e integra um conjunto de áreas de convivência, vegetação e equipamentos públicos que possuem importância para a memória da região.",
      },
      {
        icone: "importancia",
        titulo: "Tombado desde 2019",
        texto:
          "O complexo é tombado como patrimônio cultural do município desde 2019.",
      },
      {
        icone: "hoje",
        titulo: "O lugar hoje",
        texto:
          "O espaço continua sendo utilizado para atividades de lazer, esporte, convivência e eventos culturais, como o programa Conexão Lago 2026.",
      },
    ],
    // TODO: tombamento de 2019 e programa Conexão Lago 2026 vêm da pesquisa; não consegui confirmar em fonte oficial
    // TODO: endereço vem de um guia de 2012; conferir CEP e coordenada
    fatos: [
      { rotulo: "Área", valor: "Mais de 20 mil m²" },
      { rotulo: "Também chamado de", valor: "Lago da Vila Galvão" },
      { rotulo: "Tombamento", valor: "2019" },
    ],
    imagemPrincipal: LAGO_PATOS_IMG,
    // TODO: conferir endereço, CEP e coordenada (valor aproximado, na região da Vila Galvão)
    localizacao: { lat: -23.4589, lng: -46.5501 },
  },
  {
    id: "33",
    nome: "Antigo Poço Municipal",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Região Central de Guarulhos",
    resumo:
      "Estrutura histórica de abastecimento de água usada pela população antes do saneamento encanado.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Água antes do encanamento",
        texto:
          "Estrutura histórica de abastecimento de água utilizada pela população no início do século XX, antes do saneamento encanado.",
      },
    ],
    imagemPrincipal: POCO_MUNICIPAL_IMG,
    // TODO: conferir endereço e coordenada (valor aproximado, no Centro)
    localizacao: { lat: -23.4655, lng: -46.5318 },
  },

  // D. Patrimônios Materiais Demolidos / Perdidos
  {
    id: "28",
    nome: "Casarão Saraceni (Demolido em 2010)",
    categoria: "demolido",
    bairro: "Itapegica",
    endereco: "Antiga Chácara Saraceni (Anexo ao Internacional Shopping)",
    cep: "07042-040",
    resumo:
      "Casarão art nouveau da antiga Chácara Saraceni, tombado em 2000 e demolido em 5 de novembro de 2010 depois de perder a proteção.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Uma família pioneira",
        texto:
          "Construído no início do século XX na antiga Chácara Saraceni, no bairro Itapegica, o casarão em estilo Art Nouveau pertenceu a uma das famílias pioneiras da cidade, proprietária também da primeira fábrica de sapatos e perneiras do município.",
      },
      {
        icone: "tempo",
        titulo: "Da chácara à Olivetti",
        texto:
          "Com a mudança do perfil econômico do Itapegica, a área passou a abrigar as instalações da fábrica de máquinas de escrever Olivetti. O imóvel era um raro exemplar mantido da arquitetura residencial da elite fabril do início do século passado.",
      },
      {
        icone: "arquitetura",
        titulo: "Art Nouveau",
        texto:
          "Apresentava características do estilo Art Nouveau, com elementos decorativos na fachada, grandes esquadrias, varandas e outros detalhes que representavam a arquitetura residencial do início do século XX.",
      },
      {
        icone: "processo",
        titulo: "Tombado em 2000",
        texto:
          "O casarão foi tombado em 2000 pelo Decreto Municipal nº 21.143. O lote pertencia ao Internacional Shopping Guarulhos.",
      },
      {
        icone: "processo",
        titulo: "O destombamento",
        texto:
          "A proteção foi revogada por uma emenda à Lei Orgânica do Município, votada pelos vereadores. O conselho do patrimônio também aprovou o destombamento, com base em um parecer técnico que considerava a obra pouco relevante.",
      },
      {
        icone: "alerta",
        titulo: "A demolição",
        texto:
          "Na madrugada de 5 de novembro de 2010, o casarão foi demolido em poucas horas. O episódio causou grande polêmica na cidade, e seus ecos ainda eram sentidos anos depois no conselho do patrimônio.",
      },
      {
        icone: "processo",
        titulo: "Condenações em 2024",
        texto:
          "Em ação do Ministério Público iniciada em 2011, o Tribunal de Justiça de São Paulo condenou por improbidade administrativa, em acórdão publicado em março de 2024, o município, duas empresas e 39 pessoas físicas, entre elas o prefeito e ex-vereadores, pelo destombamento irregular. As penas incluem perda da função pública, suspensão dos direitos políticos por três anos e multa.",
      },
    ],
    // TODO: o resumo antigo trazia 11/11/2010 e “Giuseppe Saraceni, ex-prefeito”; nenhuma das duas informações foi confirmada
    // TODO: o MPSP informa que a decisão é de 2024; confirmar se houve recurso antes de publicar
    fatos: [
      { rotulo: "Tombado", valor: "2000" },
      { rotulo: "Estilo", valor: "Art Nouveau" },
      { rotulo: "Demolido", valor: "5 de novembro de 2010" },
      { rotulo: "Condenações", valor: "Acórdão de março de 2024" },
    ],
    ligacoes: [
      {
        id: "29",
        texto: "Outro casarão demolido durante pedido de tombamento.",
      },
      { id: "30", texto: "Casarão demolido em 2023, com acervo resgatado." },
    ],
    imagemPrincipal: CASARAO_SARACENI_IMG,
    localizacao: { lat: -23.479, lng: -46.545 },
  },
  {
    id: "29",
    nome: "Casarão Lima (Demolido em 2026)",
    categoria: "demolido",
    bairro: "Centro",
    endereco: "Av. Monteiro Lobato, 136",
    cep: "07112-000",
    resumo:
      "Residência histórica da primeira metade do século XX demolida durante tramitação de tombamento.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Um casarão no centro",
        texto:
          "Situado no número 136 da Avenida Monteiro Lobato, no centro de Guarulhos, este imóvel residencial foi erguido na primeira metade do século XX, refletindo o processo de expansão urbana e consolidação da classe média mercantil ao longo do eixo viário que conectava o centro aos bairros em crescimento.",
      },
      {
        icone: "arquitetura",
        titulo: "Arquitetura residencial urbana",
        texto:
          "Era um exemplar da arquitetura residencial urbana pré-1950, mantendo linhas tradicionais da ocupação do centro expandido antes da verticalização e do avanço irrestrito do comércio popular sobre as residências históricas.",
      },
      {
        icone: "processo",
        titulo: "Pedido de tombamento",
        texto:
          "Em 2021, a Associação Amigos do Patrimônio e Arquivo Histórico (AAPAH) formalizou o pedido de tombamento municipal sob o Processo Administrativo nº 48.324/2021.",
      },
      {
        icone: "processo",
        titulo: "Alvará de demolição",
        texto:
          "Enquanto o processo andava no conselho, os proprietários obtiveram alvará de demolição junto à Secretaria de Desenvolvimento Urbano, expondo a falta de articulação do poder público.",
      },
      {
        icone: "alerta",
        titulo: "A demolição",
        texto: "Em meados de 2026, o casarão foi inteiramente demolido.",
      },
    ],
    // TODO: não encontrei fonte independente para a demolição de 2026 nem para o processo nº 48.324/2021; confirmar com a AAPAH antes de publicar
    fatos: [
      { rotulo: "Pedido de tombamento", valor: "2021" },
      { rotulo: "Demolição", valor: "2026" },
    ],
    ligacoes: [
      { id: "28", texto: "O caso Saraceni, que abriu o debate." },
      {
        id: "30",
        texto: "Outro casarão demolido antes da decisão do conselho.",
      },
    ],
    imagemPrincipal: CASARAO_LIMA_IMG,
    localizacao: { lat: -23.4668, lng: -46.529 },
  },
  {
    id: "30",
    nome: "Casarão da Família Albertis (Demolido em 2023)",
    categoria: "demolido",
    bairro: "Gopouva",
    endereco: "Rua Zumbi dos Palmares, s/n",
    cep: "07090-000",
    resumo:
      "Imóvel dos anos 1940 que possuía vitrais da Casa Conrado e painel de Lisbeth Forell (resgatados antes da demolição).",
    detalhes: [
      {
        icone: "historia",
        titulo: "Um casarão dos anos 1940",
        texto:
          "Construído provavelmente na década de 1940 no bairro Gopouva (ao final da Rua Zumbi dos Palmares), o casarão pertenceu à família Albertis. Para a AAPAH, era a casa mais antiga da região dos bairros Anita Garibaldi, Santa Paula e Ponte Alta.",
      },
      {
        icone: "arquitetura",
        titulo: "Neocolonial Missões",
        texto:
          "Em estilo Neocolonial Missões, o casarão era único e uma evidência do processo de ocupação da região na primeira metade do século XX.",
      },
      {
        icone: "arquitetura",
        titulo: "Um acervo artístico singular",
        texto:
          "Possuía um acervo decorativo e artístico integrado de valor histórico singular: continha vitrais originais encomendados e produzidos pela prestigiada Casa Conrado (famoso ateliê paulistano responsável pelos vitrais do Mercado Municipal de São Paulo) e um painel de azulejos assinado pela renomada artista tcheco-brasileira Lisbeth Forell.",
      },
      {
        icone: "processo",
        titulo: "Pedido de tombamento",
        texto:
          "A AAPAH solicitou o tombamento do imóvel em 19 de setembro de 2022, sob o Processo Administrativo nº 49.511/2022.",
      },
      {
        icone: "alerta",
        titulo: "A demolição",
        texto:
          "Em 20 de abril de 2023, antes da deliberação do conselho, o novo proprietário optou pela demolição completa da casa. Da construção restou o entulho, levado em um cortejo de caminhões.",
      },
      {
        icone: "importancia",
        titulo: "O que foi resgatado",
        texto:
          "Ativistas da memória local conseguiram retirar os vitrais da Casa Conrado e os azulejos de Lisbeth Forell a tempo, antes da destruição total do imóvel.",
      },
    ],
    // TODO: a AAPAH cita os bairros Anita Garibaldi, Santa Paula e Ponte Alta; o mock usa Gopouva; conferir o bairro
    fatos: [
      { rotulo: "Construção", valor: "Década de 1940" },
      { rotulo: "Estilo", valor: "Neocolonial Missões" },
      { rotulo: "Pedido de tombamento", valor: "19 de setembro de 2022" },
      { rotulo: "Demolição", valor: "20 de abril de 2023" },
    ],
    ligacoes: [
      { id: "28", texto: "O caso Saraceni, de 2010." },
      {
        id: "29",
        texto: "Outro casarão demolido durante o processo de tombamento.",
      },
    ],
    imagemPrincipal: CASARAO_ALBERTIS_IMG,
    localizacao: { lat: -23.471, lng: -46.535 },
  },
  {
    id: "31",
    nome: "Antiga Carbonell Fiação e Tecelagem e Casarões Gêmeos (Demolidos)",
    categoria: "demolido",
    bairro: "Centro",
    endereco: "Região Central de Guarulhos",
    cep: "07010-000",
    resumo:
      "Fábrica têxtil dos irmãos Carbonell (1923) e seus casarões gêmeos; o último casarão caiu em 2009 para dar lugar a torres residenciais.",
    detalhes: [
      {
        icone: "historia",
        titulo: "Pioneiros da indústria têxtil",
        texto:
          "Os irmãos Hilário e Henrique Carbonell inauguraram em 1923, em Guarulhos, a Fábrica de Tecidos Carbonell (Carbonell Fiação e Tecelagem), uma das mais importantes indústrias têxteis da época.",
      },
      {
        icone: "arquitetura",
        titulo: "Dois casarões idênticos",
        texto:
          "Junto à fábrica havia dois casarões idênticos da família. Um já havia sido descaracterizado; o outro abrigou, até pouco antes da demolição, o Colégio Eleonora Carbonell, nome que homenageia a esposa de Henrique Carbonell.",
      },
      {
        icone: "tempo",
        titulo: "O fim da fábrica",
        texto:
          "A fábrica fechou as portas na década de 1990 e já havia desaparecido do terreno quando o último casarão foi demolido.",
      },
      {
        icone: "alerta",
        titulo: "A demolição em 2009",
        texto:
          "O último casarão foi demolido em poucos dias, em 2009, com a anuência da prefeitura, para dar lugar a torres residenciais de uma construtora. Segundo o site São Paulo Antiga, nenhum jornal da cidade noticiou o fato.",
      },
    ],
    // TODO: detalhes baseados no site São Paulo Antiga (2009) e em depoimento de descendente; falta fonte oficial
    fatos: [
      { rotulo: "Fábrica inaugurada", valor: "1923" },
      { rotulo: "Fábrica fechada", valor: "Década de 1990" },
      { rotulo: "Último casarão", valor: "Demolido em 2009" },
    ],
    imagemPrincipal: CARBONELL_IMG,
    localizacao: { lat: -23.465, lng: -46.531 },
  },
  {
    id: "34",
    nome: "Antiga Igreja Matriz Colonial de N. Sra. da Conceição (Demolida)",
    categoria: "demolido",
    bairro: "Centro",
    endereco: "Praça Tereza Cristina (atual Catedral)",
    cep: "07011-040",
    resumo:
      "Primeira matriz da freguesia, em taipa de pilão, marco zero fundacional de Guarulhos, desmanchada entre as décadas de 1930 e 1950.",
    detalhes: [
      {
        icone: "historia",
        titulo: "A missão jesuítica",
        texto:
          "A primeira edificação religiosa no local data de meados do século XVI (por volta de 1560), originada na missão jesuítica junto aos povos indígenas nativos (Maromomis/Guarus).",
      },
      {
        icone: "tempo",
        titulo: "A matriz em taipa de pilão",
        texto:
          "Ao longo do século XVII, uma estrutura definitiva em taipa de pilão foi erguida, tornando-se a Igreja Matriz da Freguesia de Nossa Senhora da Conceição dos Guarulhos.",
      },
      {
        icone: "importancia",
        titulo: "O marco zero de Guarulhos",
        texto: "Tratava-se do marco zero fundacional de Guarulhos.",
      },
      {
        icone: "arquitetura",
        titulo: "Colonial barroca paulista",
        texto:
          "A matriz colonial era um exemplar puro da arquitetura colonial barroca paulista, caracterizada por paredes espessas de taipa de pilão, piso em barro batido/madeira, telhamento de capa e canal e altares esculpidos em madeira retalhada.",
      },
      {
        icone: "processo",
        titulo: "Uma igreja “acanhada”",
        texto:
          "Com o crescimento populacional no início do século XX, a edificação colonial passou a ser considerada acanhada e de difícil manutenção.",
      },
      {
        icone: "alerta",
        titulo: "Desmanchada em etapas",
        texto:
          "Entre as décadas de 1930 e meados de 1950, a ancestral matriz de taipa foi gradualmente desmanchada e demolida em etapas para dar lugar à atual Catedral em estilo neoclássico.",
      },
    ],
    // TODO: inventário da prefeitura cita 1741 para a primeira edificação; datas divergem, revisar
    fatos: [
      { rotulo: "Origem", valor: "Cerca de 1560" },
      { rotulo: "Estrutura em taipa", valor: "Século XVII" },
      { rotulo: "Desmanche", valor: "Entre as décadas de 1930 e 1950" },
    ],
    ligacoes: [
      { id: "3", texto: "A catedral que ocupa o lugar da antiga matriz." },
    ],
    imagemPrincipal: MATRIZ_COLONIAL_IMG,
    localizacao: { lat: -23.455, lng: -46.5325 },
  },
];
