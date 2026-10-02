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
// import LAVRAS_IMG from "../../assets/sitio_lavras_velhas.jpg";

// Imagens de patrimônios históricos demolidos
import CASARAO_SARACENI_IMG from "../../assets/casarao_saraceni_demolido.jpg";
import CASARAO_ALBERTIS_IMG from "../../assets/casarao_albertis_demolido.jpg";
import CARBONELL_IMG from "../../assets/antiga_carbonell_demolida.jpg";

export const patrimoniosMock = [
  // Patrimônios Materiais existentes
  {
    id: "1",
    nome: "Estação Ferroviária de Guarulhos",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Praça Vereador Vicente Alves de Souza, s/n",
    cep: "07011-040",
    resumo:
      "Antiga estação que integrou Guarulhos ao Tramway da Cantareira, marco arquitetônico do Centro.",
    imagemPrincipal: ESTACAO_IMG,
    localizacao: { lat: -23.4543, lng: -46.5333 },
  },
  {
    id: "2",
    nome: "Parque Bosque Maia",
    categoria: "natural",
    bairro: "Jardim Maia",
    endereco: "Rua Alberto Byington, s/n",
    cep: "07097-030",
    resumo:
      "Maior parque urbano de Guarulhos, considerado o pulmão verde do município e área de convivência.",
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
    imagemPrincipal: CATEDRAL_IMG,
    localizacao: { lat: -23.455, lng: -46.5325 },
  },
  {
    id: "4",
    nome: "Complexo Sanatório Padre Bento",
    categoria: "arquitetonico",
    bairro: "Jardim Tranquilidade",
    endereco: "Rua Doutor Ramos de Azevedo, s/n",
    cep: "07020-030",
    resumo:
      "Antigo leprosário em estilo art déco/neocolonial, abriga o Teatro Padre Bento e a Igreja São João Batista.",
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
    endereco: "Rua Silva Bueno, s/n",
    cep: "07162-160",
    resumo:
      "Construção do século XVIII, polo religioso mais tradicional da cidade associado à Festa do Bonsucesso.",
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
      "Celebrada há mais de 280 anos, une religiosidade popular, romarias, gastronomia e feira de artesanato.",
    imagemPrincipal: FESTA_BONSUCESSO_IMG,
    localizacao: { lat: -23.419, lng: -46.4105 },
  },

  // --- 2. NOVOS PATRIMÔNIOS ADICIONADOS ---

  // A. Edificações, Prédios Públicos e Templos (arquitetonico)
  {
    id: "8",
    nome: "Sítio da Candinha (Casa da Candinha)",
    categoria: "arquitetonico",
    bairro: "Bonsucesso",
    endereco: "Região do Bairro de Bonsucesso / Bananal, s/n",
    cep: "07175-000",
    resumo:
      "Raro exemplar em taipa de pilão (séc. XVIII/XIX) vinculado ao ciclo da mineração e agricultura escravagista.",
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
      "Remanescente em taipa de pilão do século XIX no centro histórico, antiga residência de personalidades locais.",
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
    imagemPrincipal: CASA_AMARELA_IMG,
    localizacao: { lat: -23.4545, lng: -46.533 },
  },
  {
    id: "11",
    nome: "Antigo Paço Municipal",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Rua Dom Pedro II, s/n",
    cep: "07011-030",
    resumo:
      "Edificação neoclássica/eclética que foi sede da Prefeitura e da Câmara Municipal ao longo do século XX.",
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
      "Imóvel restaurado com porão histórico, dedicado à preservação do acervo e memória de Guarulhos.",
    imagemPrincipal: CASARAO_HISTORIA_IMG,
    localizacao: { lat: -23.468, lng: -46.5305 },
  },
  {
    id: "14",
    nome: "E.E. Conselheiro Crispiniano",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Rua Arminda de Lima, 57",
    cep: "07095-010",
    resumo:
      "Primeira escola secundária pública da cidade, projetada em 1960 pelo arquiteto Vilanova Artigas.",
    imagemPrincipal: CRISPINIANO_IMG,
    localizacao: { lat: -23.4658, lng: -46.53 },
  },
  {
    id: "15",
    nome: "E.E. Capistrano de Abreu",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Rua Capitão Gabriel, s/n",
    cep: "07011-010",
    resumo:
      "Um dos primeiros grupos escolares do município, construído em alvenaria de tijolos no século XX.",
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
      "Templo herdado da antiga irmandade colonial, símbolo da resistência e da fé afro-brasileira.",
    imagemPrincipal: IGREJA_ROSARIO_IMG,
    localizacao: { lat: -23.4665, lng: -46.5332 },
  },
  {
    id: "18",
    nome: "Igreja do Bom Jesus da Cabeça (Capelinha)",
    categoria: "arquitetonico",
    bairro: "Vila Augusta",
    endereco: "Rua Santa Maria, s/n",
    cep: "07023-000",
    resumo:
      "Templo de devoção popular com origens rurais, marco nos caminhos de fé tradicionais.",
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
      "Trecho da Serra da Cantareira com a barragem de 1908, a 1ª grande obra em concreto armado do Brasil.",
    imagemPrincipal: CABUCU_IMG,
    localizacao: { lat: -23.402, lng: -46.535 },
  },
  // {
  //   id: "27",
  //   nome: "Sítios Arqueológicos das Lavras Velhas do Geraldo",
  //   categoria: "natural",
  //   bairro: "Lavras",
  //   endereco: "Bairro das Lavras",
  //   cep: "07150-000",
  //   resumo:
  //     "Vestígios minerários das antigas lavras de ouro iniciadas em 1590 por Afonso Sardinha.",
  //   imagemPrincipal: LAVRAS_IMG,
  //   localizacao: { lat: -23.42, lng: -46.45 },
  // },

  // D. Patrimônios Materiais Demolidos / Perdidos
  {
    id: "28",
    nome: "Casarão Saraceni (Demolido em 2010)",
    categoria: "demolido",
    bairro: "Itapegica",
    endereco: "Antiga Chácara Saraceni (Anexo ao Internacional Shopping)",
    cep: "07042-040",
    resumo:
      "Construído em estilo art nouveau na região da Vila Itapegica, pertenceu a Giuseppe Saraceni, pioneiro da indústria calçadista e ex-prefeito. Foi demolido na madrugada de 11 de novembro de 2010 após perder o tombamento municipal.",
    imagemPrincipal: CASARAO_SARACENI_IMG,
    localizacao: { lat: -23.479, lng: -46.545 },
  },
  {
    id: "29",
    nome: "Casarão Lima (Demolido em 2026)",
    categoria: "arquitetonico",
    bairro: "Centro",
    endereco: "Av. Monteiro Lobato, 136",
    cep: "07112-000",
    resumo:
      "Residência histórica da primeira metade do século XX demolida durante tramitação de tombamento.",
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
      "Fundada na década de 1920 pelos irmãos Carbonell no centro de Guarulhos, a fábrica e os tradicionais casarões gêmeos da família foram completamente demolidos para dar lugar a um empreendimento imobiliário residencial.",
    imagemPrincipal: CARBONELL_IMG,
    localizacao: { lat: -23.465, lng: -46.531 },
  },
];
