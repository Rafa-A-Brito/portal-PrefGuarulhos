/**
 * NOVIDADES E AGENDA — pesquisa de 29 de setembro de 2026
 * -------------------------------------------------------------------------
 * Conteúdo editorial ESTÁTICO compartilhado por duas páginas:
 *   - pages/ConhecaMais            (resumo na seção "Novidades")
 *   - pages/ConhecaMaisDetalhes    (texto completo, CTAs e referências)
 *
 * Em produção isso deve vir de uma rota real (ex.: GET /novidades) em vez
 * de ficar neste arquivo. Enquanto ela não existe, este mock é a fonte única:
 * editou aqui, muda nas duas páginas.
 *
 * Campos de cada item
 *   id       -> usado como âncora (#id) na página de detalhes
 *   tag      -> rótulo curto da categoria
 *   data     -> data de publicação em ISO (AAAA-MM-DD); só nas notícias
 *   bloco    -> { dia, mes, legenda } exibidos no "selo de data"
 *   titulo   -> manchete
 *   resumo   -> 1 parágrafo curto (home)
 *   texto    -> parágrafo completo (detalhes)
 *   quando   -> linha de data/horário (opcional)
 *   local    -> onde acontece / aconteceu (opcional)
 *   cta      -> ação principal { rotulo, url }
 *   fontes   -> [{ veiculo, assunto, url }]
 *
 * Os links abaixo vieram da lista de referências da pesquisa. Um deles
 * (Diário de Guarulhos, "noticia_visu.php?id=561") parece genérico: confira
 * se abre a matéria certa antes de publicar.
 */

export const ATUALIZADO_EM = "30 de setembro de 2026";

/* ---------------------------------------------------------------- FONTES */
// Cada fonte é declarada uma vez e reaproveitada pelos itens que a citam.
const F = {
  ghCasarao: {
    veiculo: "Guarulhos Hoje",
    assunto: "25 mil visitas",
    url: "https://www.guarulhoshoje.com.br/2026/09/28/casarao-da-nossa-historia-atinge-25-mil-visitas-desde-sua-abertura-em-julho-de-2025/",
  },
  nossaGuarulhos: {
    veiculo: "Nossa Guarulhos",
    assunto: "25 mil visitantes",
    url: "https://nossaguarulhos.com.br/casarao-da-nossa-historia-supera-25-mil-visitantes-em-menos-de-dois-anos/",
  },
  ghBonsucesso: {
    veiculo: "Guarulhos Hoje",
    assunto: "Bonsucesso Cultura e Tradição",
    url: "https://www.guarulhoshoje.com.br/2026/09/23/bonsucesso-cultura-e-tradicao-promove-noite-de-sertanejo-capoeira-sarau-e-atividades-culturais-no-sabado/",
  },
  agoraGuarulhos: {
    veiculo: "Agora Guarulhos",
    assunto: "evento gratuito em Bonsucesso",
    url: "https://jornalagoraguarulhos.com.br/2026/09/23/bonsucesso-cultura-e-tradicao-promove-evento-gratuito-com-sertanejo-raiz-e-atracoes-culturais/",
  },
  clickLago: {
    veiculo: "Click Guarulhos",
    assunto: "Conexão Lago 2026",
    url: "https://www.clickguarulhos.com.br/2026/09/16/guarulhos-inaugura-programa-com-quatro-festivais-tematicos-gratuitos-no-lago-dos-patos/",
  },
  diarioLago: {
    veiculo: "Diário de Guarulhos",
    assunto: "Conexão Lago 2026",
    url: "https://www.diariodeguarulhos.com/noticia_visu.php?id=561",
  },
  gdFesta: {
    veiculo: "Guarulhos Digital",
    assunto: "Festa de Bonsucesso reúne mais de 18 mil pessoas",
    // Removido o parâmetro de rastreamento "?utm_source=chatgpt.com"
    url: "https://www.guarulhosdigital.com.br/noticia/guarulhos/com-recorde-de-publico-festa-de-bonsucesso-reune-mais-de-18-mil-pessoas-em-guarulhos",
  },
  gpFesta: {
    veiculo: "Guarulhos Popular",
    assunto: "Festa de Bonsucesso",
    url: "https://guarulhospopular.com.br/com-recorde-de-publico-festa-de-bonsucesso-reune-mais-de-18-mil-pessoas-em-guarulhos/",
  },
  jornalQuixote: {
    veiculo: "Jornal de Guarulhos",
    assunto: "espetáculo no Teatro Padre Bento",
    url: "https://www.jornaldeguarulhos.com.br/materia/espetaculo-teatral-premiado-teatro-padre-bento",
  },
  symplaQuixote: {
    veiculo: "Sympla",
    assunto: "O Último Sonho de Dom Quixote",
    url: "https://www.sympla.com.br/evento/lgc/3561971",
  },
  guarulhosWebFeira: {
    veiculo: "GuarulhosWeb",
    assunto: "Feira da Economia Solidária em outubro",
    url: "https://guarulhosweb.com.br/feira-da-economia-solidaria-disponibiliza-artesanato-local-em-sete-pontos-de-guarulhos-em-outubro/",
  },
  clickFeira: {
    veiculo: "Click Guarulhos",
    assunto: "programação de outubro da Feira da Economia Solidária",
    url: "https://www.clickguarulhos.com.br/2026/09/28/confira-a-programacao-de-outubro-da-feira-da-economia-solidaria-de-guarulhos/",
  },
  symplaCriArt: {
    veiculo: "Sympla",
    assunto: "Festival CriArt, 4ª edição",
    url: "https://www.sympla.com.br/evento/festival-criart-4a-edicao-volta-ao-mundo/3573682",
  },
  gdSemana: {
    // Na pesquisa original esta fonte aparecia como "Diário Oficial de
    // Guarulhos", mas o link e o título são do Guarulhos Digital.
    veiculo: "Guarulhos Digital",
    assunto: "Semana do Conhecimento 2026 / 13ª FECEG",
    url: "https://www.guarulhosdigital.com.br/noticia/guarulhos/paco-municipal-recebe-lancamento-da-semana-do-conhecimento-2026",
  }, // NOVAS FONTES — NOVEMBRO & DEZEMBRO 2026
  gcMostraCinema: {
    veiculo: "Guarulhos Cultural",
    assunto: "12ª Mostra Guarulhense de Cinema",
    url: "https://guarulhoscultural.com.br/cineclube-incinerante-abre-inscricoes-para-a-12a-mostra-guarulhense-de-cinema/",
  },
  jgMostraCinema: {
    veiculo: "Jornal de Guarulhos",
    assunto: "Edital Mostra Guarulhense de Cinema",
    url: "https://www.jornaldeguarulhos.com.br/materia/mostra-guarulhense-de-cinema-abre-edital",
  },
  jgLagoFestivais: {
    veiculo: "Jornal de Guarulhos",
    assunto: "Festivais no Lago dos Patos",
    url: "https://www.jornaldeguarulhos.com.br/materia/lago-dos-patos-recebe-quatro-festivais-culturais-gratuitos-em-guarulhos",
  },
  gtdConexaoLago: {
    veiculo: "Guarulhos Todo Dia",
    assunto: "Programação Conexão Lago 2026",
    url: "https://guarulhostododia.com.br/noticia/festival-da-gastronomia-e-cultura-coreana-abre-programacao-tematica-no-lago-dos-patos",
  },
  symplaHallyuween: {
    veiculo: "Sympla",
    assunto: "HALLYUWEEN no Adamastor",
    url: "https://www.sympla.com.br/evento/lgc/3587943",
  },
  symplaAbtEscola: {
    veiculo: "Sympla",
    assunto: "Festival de Espetáculos ABT Escola",
    url: "https://www.sympla.com.br/evento/lgc/3567014",
  },
  balloonParadeOficial: {
    veiculo: "Balloon Parade 2026",
    assunto: "Site oficial do evento",
    url: "https://balloon-parade.cenariobaloes.com.br/",
  },
  naCorridaMetropolitana: {
    veiculo: "NaCorrida",
    assunto: "21ª Corrida Folha Metropolitana",
    url: "https://nacorrida.com/metropolitana",
  },
};

/* ------------------------------------------------- SETEMBRO: NOTÍCIAS */
// Ordem: da mais recente para a mais antiga.
// Na home: [0] = destaque grande, [1] = segundo destaque, [2..] = linha de cards.
export const noticiasSetembro = [
  {
    id: "casarao-25-mil-visitas",
    tipo: "noticia",
    tag: "Patrimônio restaurado",
    data: "2026-09-28",
    bloco: { dia: "28", mes: "SET", legenda: "publicada" },
    titulo: "Casarão da Nossa História supera 25 mil visitas",
    resumo:
      "O Centro Municipal de Educação já passou de 25 mil visitas desde a inauguração, em julho de 2025, com exposições, cursos, saraus e atividades pedagógicas.",
    texto:
      "O Centro Municipal de Educação Casarão da Nossa História já ultrapassou 25 mil visitas desde a inauguração, em julho de 2025. Segundo as reportagens, foram cerca de 10,2 mil acessos em 2025 e mais de 15,4 mil somente nos primeiros oito meses de 2026. O local reúne exposições, atividades pedagógicas, cursos, saraus e encontros culturais. O número ajuda a entender como um patrimônio restaurado pode continuar fazendo parte da rotina da cidade, recebendo estudantes, famílias e pessoas interessadas na memória de Guarulhos.",
    local: "Centro Municipal de Educação Casarão da Nossa História",
    imagem: "/src/assets/novidades/visita_casarao_nossa_historia.jpeg",
    cta: { rotulo: "Ler a matéria", url: F.ghCasarao.url },
    fontes: [F.ghCasarao, F.nossaGuarulhos],
  },
  {
    id: "bonsucesso-cultura-e-tradicao",
    tipo: "noticia",
    tag: "Patrimônio vivo",
    data: "2026-09-23",
    bloco: { dia: "23", mes: "SET", legenda: "publicada" },
    titulo:
      "Bonsucesso Cultura e Tradição leva manifestações populares ao bairro",
    resumo:
      "Noite cultural no Centro de Cultura Popular Carpição reuniu sertanejo raiz, sarau, poesia, dança, capoeira e atividades para crianças, mantendo viva a tradição de Bonsucesso.",
    texto:
      "O projeto Bonsucesso Cultura e Tradição realizou uma noite cultural no Centro de Cultura Popular Carpição, na Praça Nossa Senhora do Bonsucesso. A programação reuniu sertanejo raiz, sarau, poesia, dança, capoeira e atividades para crianças. O evento se relaciona diretamente com a identidade cultural de Bonsucesso, região ligada à tradicional Festa de Nossa Senhora de Bonsucesso. É um exemplo de patrimônio vivo: as tradições continuam sendo praticadas e compartilhadas pela comunidade, em vez de permanecerem apenas como registros do passado.",
    quando: "Evento em 26 de setembro de 2026",
    local:
      "Centro de Cultura Popular Carpição, Praça Nossa Senhora do Bonsucesso",
    imagem: "/src/assets/novidades/projeto_bonsucesso_cultura_e_tradicao.jpeg",
    cta: { rotulo: "Ler a matéria", url: F.ghBonsucesso.url },
    fontes: [F.ghBonsucesso, F.agoraGuarulhos],
  },
  {
    id: "conexao-lago-2026",
    tipo: "noticia",
    tag: "Patrimônio paisagístico",
    data: "2026-09-16",
    bloco: { dia: "16", mes: "SET", legenda: "publicada" },
    titulo: "Conexão Lago 2026 movimenta o Lago dos Patos",
    resumo:
      "Quatro festivais gratuitos no entorno do Lago dos Patos unem música, dança, oficinas e artesanato. A segunda etapa, o Arraiá Vixi Maria, acontece em outubro.",
    texto:
      "O programa Conexão Lago 2026 foi divulgado com quatro festivais gratuitos no entorno do Lago dos Patos. A proposta mistura música, dança, oficinas, artes visuais, cultura popular, artesanato e economia criativa. A primeira edição aconteceu em setembro e a segunda está marcada para outubro, com o Arraiá Vixi Maria nos dias 17 e 18. Como o Lago dos Patos é um dos patrimônios paisagísticos da cidade, a programação mostra uma ligação entre a preservação do espaço, a convivência comunitária e a produção cultural atual.",
    local: "Lago dos Patos",
    imagem: "/src/assets/novidades/lago_dos_patos.jpg",
    cta: { rotulo: "Ver a programação", url: F.clickLago.url },
    fontes: [F.clickLago, F.diarioLago],
  },
  {
    id: "festa-nossa-senhora-de-bonsucesso",
    tipo: "noticia",
    tag: "Patrimônio imaterial",
    data: "2026-09-03",
    bloco: { dia: "03", mes: "SET", legenda: "publicada" },
    titulo:
      "285ª Festa de Nossa Senhora de Bonsucesso reúne mais de 18 mil pessoas",
    resumo:
      "A edição reuniu mais de 18 mil pessoas em dois dias de celebrações religiosas, cortejos e apresentações musicais, mostrando uma tradição que segue viva.",
    texto:
      "Em setembro foram divulgados dados sobre a 285ª Festa de Nossa Senhora de Bonsucesso. A edição reuniu mais de 18 mil pessoas durante dois dias, com celebrações religiosas, manifestações culturais, cortejos e apresentações musicais. Embora a festa tenha acontecido no fim de agosto, a notícia mostra a continuidade de uma tradição classificada como patrimônio imaterial de Guarulhos. A grande participação do público indica como uma prática histórica continua presente na vida cultural do município.",
    quando: "Edição realizada no fim de agosto de 2026",
    imagem: "/src/assets/novidades/285_festa_bonsucesso.jpg",
    cta: { rotulo: "Ler a matéria", url: F.gdFesta.url },
    fontes: [F.gdFesta, F.gpFesta],
  },
];

/* --------------------------------------------------- OUTUBRO: AGENDA */
// Ordem: a mesma da pesquisa. Programação prevista, sujeita a alteração.
export const eventosOutubro = [
  {
    id: "dom-quixote-teatro-padre-bento",
    tipo: "evento",
    tag: "Teatro",
    bloco: { dia: "2", mes: "OUT", legenda: "20h" },
    titulo: "O Último Sonho de Dom Quixote no Teatro Padre Bento",
    texto:
      "A Academia Brasileira de Teatro apresenta no Teatro Padre Bento o espetáculo “O Último Sonho de Dom Quixote”, depois de a montagem receber prêmios na 4ª Mostra Cultural de Cesário Lange e participar de uma mostra em Barueri. A sessão em Guarulhos coloca novamente uma produção artística dentro de um dos espaços do Complexo Sanatório Padre Bento, o que mostra o uso contínuo de um patrimônio histórico, agora como palco para uma manifestação artística contemporânea.",
    quando: "2 de outubro de 2026, às 20h",
    local: "Teatro Padre Bento (Complexo Sanatório Padre Bento)",
    cta: { rotulo: "Ver ingressos e detalhes", url: F.symplaQuixote.url },
    fontes: [F.jornalQuixote, F.symplaQuixote],
  },
  {
    id: "feira-economia-solidaria",
    tipo: "evento",
    tag: "Economia solidária",
    bloco: { dia: "Out", mes: "2026", legenda: "várias datas" },
    titulo: "Feira da Economia Solidária em outubro",
    texto:
      "A Feira da Economia Solidária terá várias edições em outubro, incluindo datas no Bosque Maia e no Lago dos Patos. A iniciativa reúne artesãos e expositores do município para comercializar trabalhos manuais e peças produzidas localmente. Além da geração de renda, o evento valoriza o artesanato e transforma espaços públicos em pontos de convivência. A programação mostra que esses lugares também podem continuar sendo usados de forma social e cultural pela população.",
    quando: "Calendário divulgado em 28 de setembro de 2026",
    local: "Sete pontos da cidade, incluindo Bosque Maia e Lago dos Patos",
    cta: { rotulo: "Ver o calendário completo", url: F.clickFeira.url },
    fontes: [F.guarulhosWebFeira, F.clickFeira],
  },
  {
    id: "arraia-vixi-maria",
    tipo: "evento",
    tag: "Cultura nordestina",
    bloco: { dia: "17–18", mes: "OUT", legenda: "11h às 22h" },
    titulo: "Arraiá Vixi Maria no Lago dos Patos",
    texto:
      "O Arraiá Vixi Maria será a segunda etapa do Conexão Lago 2026 e está anunciado para os dias 17 e 18 de outubro, no Lago dos Patos, na Vila Galvão. A programação pretende levar manifestações da cultura nordestina para o espaço, com música, dança, oficinas, artesanato e outras atividades. O evento é gratuito e integra um calendário que continua até dezembro. A escolha do Lago dos Patos reforça a presença do patrimônio paisagístico como cenário de atividades culturais atuais.",
    quando: "17 e 18 de outubro de 2026, das 11h às 22h",
    local: "Lago dos Patos, Vila Galvão",
    cta: { rotulo: "Ver a programação", url: F.clickLago.url },
    fontes: [F.clickLago, F.diarioLago],
  },
  {
    id: "festival-criart",
    tipo: "evento",
    tag: "Festival",
    bloco: { dia: "18", mes: "OUT", legenda: "15h às 19h30" },
    titulo: "Festival CriArt, 4ª edição, no Teatro Padre Bento",
    texto:
      "O Teatro Padre Bento também recebe, segundo a programação publicada, a 4ª edição do Festival CriArt, com o tema “Volta ao Mundo”. O evento reúne pole dance, chair dance e outras formas de expressão artística. Apesar de ser uma produção contemporânea, a atividade ocupa um espaço histórico da cidade e mostra como o patrimônio pode continuar recebendo novas linguagens culturais e públicos diferentes.",
    quando: "18 de outubro de 2026, das 15h às 19h30",
    local: "Teatro Padre Bento",
    cta: { rotulo: "Ver ingressos e detalhes", url: F.symplaCriArt.url },
    fontes: [F.symplaCriArt],
  },
  {
    id: "semana-do-conhecimento-2026",
    tipo: "evento",
    tag: "Educação e ciência",
    bloco: { dia: "19–23", mes: "OUT", legenda: "13ª FECEG" },
    titulo: "Semana do Conhecimento 2026 no CME Adamastor",
    texto:
      "O CME Adamastor, antiga Fábrica Adamastor, será sede da Semana do Conhecimento 2026 e da 13ª Feira de Ciências e Engenharia de Guarulhos (FECEG). O evento reúne ações de ciência, pesquisa e tecnologia e faz parte do calendário anual do município. O caso do Adamastor chama atenção porque um antigo complexo industrial continua sendo utilizado para finalidades atuais, ligadas à educação, à cultura e à realização de encontros públicos.",
    quando: "19 a 23 de outubro de 2026",
    local: "CME Adamastor (antiga Fábrica Adamastor)",
    cta: { rotulo: "Saiba mais", url: F.gdSemana.url },
    fontes: [F.gdSemana],
  },
];

/* -------------------------------------------------- NOVEMBRO: AGENDA */
export const eventosNovembro = [
  {
    id: "mostra-guarulhense-de-cinema",
    tipo: "evento",
    tag: "Cinema",
    bloco: { dia: "7–8", mes: "NOV", legenda: "2026" },
    titulo: "12ª Mostra Guarulhense de Cinema",
    texto:
      "A 12ª Mostra Guarulhense de Cinema será realizada nos dias 7 e 8 de novembro pelo Cineclube Incinerante. O evento é voltado para filmes de curta-metragem produzidos em Guarulhos e tem como objetivo dar espaço para os artistas e produtores da própria cidade. A mostra valoriza a produção cultural local, aproximando os moradores dos trabalhos feitos por pessoas que vivem e atuam no município.",
    quando: "7 e 8 de novembro de 2026",
    local: "Local a divulgar (Guarulhos)",
    cta: { rotulo: "Saiba mais", url: F.gcMostraCinema.url },
    fontes: [F.gcMostraCinema, F.jgMostraCinema],
  },
  {
    id: "mangiare-italiafest",
    tipo: "evento",
    tag: "Gastronomia e Cultura",
    bloco: { dia: "7–8", mes: "NOV", legenda: "11h às 22h" },
    titulo: "Mangiare ItaliaFest no Lago dos Patos",
    texto:
      "O Lago dos Patos terá mais uma etapa do programa Conexão Lago 2026 com o Mangiare ItaliaFest. O evento será dedicado à cultura italiana, com gastronomia, música, apresentações, oficinas, artesanato e outras atividades culturais. O evento evidencia como um local ligado à história e à paisagem da cidade continua sendo utilizado para reunir a população em atividades culturais.",
    quando: "7 e 8 de novembro de 2026, das 11h às 22h",
    local: "Lago dos Patos, Vila Galvão",
    cta: { rotulo: "Ver detalhes", url: F.jgLagoFestivais.url },
    fontes: [F.jgLagoFestivais, F.gtdConexaoLago],
  },
  {
    id: "hallyuween-adamastor",
    tipo: "evento",
    tag: "Cultura Pop",
    bloco: { dia: "8", mes: "NOV", legenda: "16h às 19h" },
    titulo: "HALLYUWEEN no CME Adamastor",
    texto:
      "O Centro Municipal de Educação Adamastor recebe o evento HALLYUWEEN, organizado pela Hallyuland Eventos. A programação é voltada para a cultura coreana com temática de Halloween no Auditório 6. O evento chama atenção para o reuso do antigo espaço industrial da Fábrica Adamastor, atual equipamento cultural e educacional da cidade.",
    quando: "8 de novembro de 2026, das 16h às 19h",
    local: "CME Adamastor (Auditório 6)",
    cta: { rotulo: "Ver ingressos no Sympla", url: F.symplaHallyuween.url },
    fontes: [F.symplaHallyuween],
  },
  {
    id: "balloon-parade-2026",
    tipo: "evento",
    tag: "Desfile / Arte",
    bloco: { dia: "22", mes: "NOV", legenda: "a partir das 10h" },
    titulo: "Balloon Parade 2026 no Bosque Maia",
    texto:
      "A Avenida Paulo Faccini, em frente ao Bosque Maia, receberá a Balloon Parade 2026 com o tema “Dinossauros”. O desfile contará com carros alegóricos, esculturas gigantes e estruturas produzidas com balões. Entrada gratuita com incentivo à doação de 1 kg de alimento não perecível. Utiliza uma das áreas públicas e paisagísticas mais conhecidas da cidade para uma grande manifestação artística.",
    quando: "22 de novembro de 2026, a partir das 10h",
    local: "Av. Paulo Faccini (em frente ao Bosque Maia)",
    cta: { rotulo: "Site oficial do evento", url: F.balloonParadeOficial.url },
    fontes: [F.balloonParadeOficial],
  },
  {
    id: "abt-escola-teatro-padre-bento",
    tipo: "evento",
    tag: "Teatro",
    bloco: { dia: "29", mes: "NOV", legenda: "2026" },
    titulo: "Festival de Espetáculos ABT Escola no Teatro Padre Bento",
    texto:
      "O Teatro Padre Bento terá apresentações do Festival de Espetáculos ABT Escola. O projeto reúne estudantes de diferentes instituições de ensino que participam de atividades teatrais durante o ano para apresentar seus trabalhos ao público. Exemplo do uso contínuo de um espaço histórico do Complexo Sanatório Padre Bento para atividades artísticas.",
    quando: "29 de novembro de 2026",
    local: "Teatro Padre Bento (Complexo Sanatório Padre Bento)",
    cta: { rotulo: "Ver ingressos no Sympla", url: F.symplaAbtEscola.url },
    fontes: [F.symplaAbtEscola],
  },
];

/* -------------------------------------------------- DEZEMBRO: AGENDA */
export const eventosDezembro = [
  {
    id: "corrida-folha-metropolitana",
    tipo: "evento",
    tag: "Esporte / Convivência",
    bloco: { dia: "6", mes: "DEZ", legenda: "a partir das 7h" },
    titulo: "21ª Corrida Folha Metropolitana no Bosque Maia",
    texto:
      "O Bosque Maia receberá a 21ª Corrida Folha Metropolitana, com provas de 5 km, 10 km e caminhada de 3 km. A concentração acontece na área do parque e a largada na Avenida Paulo Faccini. Demonstra como o espaço ambiental urbano é utilizado para atividades esportivas e convivência comunitária.",
    quando: "6 de dezembro de 2026, a partir das 7h",
    local: "Bosque Maia e Av. Paulo Faccini",
    cta: { rotulo: "Inscrições e detalhes", url: F.naCorridaMetropolitana.url },
    fontes: [F.naCorridaMetropolitana],
  },
  {
    id: "burguerland-festival",
    tipo: "evento",
    tag: "Gastronomia e Cultura",
    bloco: { dia: "12–13", mes: "DEZ", legenda: "11h às 22h" },
    titulo: "Burguerland Festival no Lago dos Patos",
    texto:
      "Encerramento do programa Conexão Lago 2026 com o Burguerland Festival. Voltado para a cultura urbana contemporânea, reunindo gastronomia, música, artesanato, atividades culturais e economia criativa no espaço de convivência do Lago dos Patos.",
    quando: "12 e 13 de dezembro de 2026, das 11h às 22h",
    local: "Lago dos Patos, Vila Galvão",
    cta: { rotulo: "Ver matérias", url: F.jgLagoFestivais.url },
    fontes: [F.jgLagoFestivais, F.gtdConexaoLago],
  },
];

/* ------------------------------------------------ REFERÊNCIAS GERAIS */
// Fontes de pesquisa sobre os patrimônios (não são notícias). Só há URL
// onde ela foi informada; nenhum link foi inventado.
export const referenciasGerais = [
  {
    veiculo: "Wikipédia",
    assunto:
      "Lista de bens tombados pelo patrimônio cultural e histórico de Guarulhos",
    url: null,
  },
  {
    veiculo: "Prefeitura de Guarulhos",
    assunto: "Patrimônios históricos",
    url: "https://www.guarulhos.sp.gov.br/patrimonioshistoricos",
  },
  {
    veiculo: "AAPAH",
    assunto: "Patrimônio Cultural de Guarulhos",
    url: null,
  },
  {
    veiculo: "AAPAH",
    assunto: "Nota crítica: a desolação do patrimônio histórico de Guarulhos",
    url: null,
  },
  {
    veiculo: "Portal do Patrimônio Cultural",
    assunto: "Portal do Patrimônio Cultural",
    url: null,
  },
];

/* ---------------------------------------------------------- UTILITÁRIOS */
// Junta as fontes de todos os itens, sem repetir a mesma URL.
export function listarFontes() {
  const vistas = new Set();
  return [
    ...noticiasSetembro,
    ...eventosOutubro,
    ...eventosNovembro,
    ...eventosDezembro,
  ]
    .flatMap((item) => item.fontes)
    .filter((f) => {
      if (!f.url || vistas.has(f.url)) return false;
      vistas.add(f.url);
      return true;
    });
}
