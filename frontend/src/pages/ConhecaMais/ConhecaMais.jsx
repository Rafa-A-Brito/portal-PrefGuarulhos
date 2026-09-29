import { useNavigate } from "react-router-dom";
import {
  AcademicCapIcon,
  SparklesIcon,
  UsersIcon,
  MapIcon,
  Squares2X2Icon,
  MegaphoneIcon,
  PaintBrushIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";

/**
 * NOVIDADES
 * -------------------------------------------------------------------------
 * Mock de conteúdo editorial, transcrito da tela de referência. Em produção
 * isso deve vir de uma rota real (ex.: GET /novidades) em vez de ficar
 * hardcoded aqui.
 *
 * A ORDEM DO ARRAY define o layout:
 *   [0]      -> destaque grande
 *   [1]      -> segundo destaque (ao lado do grande)
 *   [2..4]   -> linha de três cards
 *   todos    -> lista "Últimas notícias" na lateral
 *
 * "data" usa formato ISO (AAAA-MM-DD) e é formatada na tela.
 * "url" aponta para o portal oficial porque ainda não existe uma rota
 * "/novidades/:id" neste app.
 * "imagem" segue o padrão do projeto (/src/assets/...); os arquivos ainda
 * precisam ser adicionados. Sem o arquivo, o espaço da imagem fica vazio.
 */
const PORTAL_PREFEITURA = "https://www.guarulhos.sp.gov.br";

const novidades = [
  {
    id: "casarao-monteiro-lobato",
    tag: "Patrimônio histórico",
    data: "2025-05-16",
    titulo:
      "Conselho do Patrimônio Histórico obtém vitória contra demolição de casarão da Avenida Monteiro Lobato",
    resumo: [
      "Após análise técnica e histórica, o Conselho Municipal de Preservação do Patrimônio Histórico, Cultural, Artístico, Paisagístico e Ambiental da Cidade de Guarulhos impediu a demolição do casarão localizado na Avenida Monteiro Lobato, 787, no Macedo.",
      "A decisão reforça o compromisso do município com a preservação da memória urbana e da identidade cultural da cidade.",
    ],
    imagem: "/src/assets/novidades/casarao_monteiro_lobato.jpg",
    url: PORTAL_PREFEITURA,
  },
  {
    id: "evannir-penna-casarao",
    tag: "Exposição em destaque",
    data: "2025-05-10",
    titulo: "Evannir Penna em exposição no Casarão da Nossa Senhora do Rosário",
    resumo: [
      "O artista guarulhense Evannir Penna apresenta suas obras no Casarão da Nossa Senhora do Rosário, em uma mostra que celebra a arte, a fé e a ancestralidade.",
      "A exposição reúne pinturas, esculturas e instalações inspiradas na religiosidade popular e na cultura afro-brasileira.",
      "Visite e conheça essa experiência única!",
    ],
    imagem: "/src/assets/novidades/evannir_penna.jpg",
    url: PORTAL_PREFEITURA,
  },
  {
    id: "teatro-padre-bento",
    tag: "Cultura",
    data: "2025-04-30",
    titulo: "Teatro Padre Bento recebe programação especial em maio",
    resumo: [
      "Espetáculos gratuitos celebram a história e a produção cultural de Guarulhos.",
    ],
    imagem: "/src/assets/novidades/teatro_padre_bento.jpg",
    url: PORTAL_PREFEITURA,
  },
  {
    id: "antigo-forum",
    tag: "Preservação",
    data: "2025-04-22",
    titulo: "Restauro do Prédio do Antigo Fórum avança",
    resumo: [
      "Obra de restauração segue em andamento para devolver ao prédio sua importância histórica.",
    ],
    imagem: "/src/assets/novidades/antigo_forum.jpg",
    url: PORTAL_PREFEITURA,
  },
  {
    id: "bosque-maia",
    tag: "Memória",
    data: "2025-04-15",
    titulo: "Bosque Maia completa 44 anos",
    resumo: [
      "Símbolo de lazer e preservação ambiental em Guarulhos, o Bosque Maia celebra mais um aniversário.",
    ],
    imagem: "/src/assets/novidades/bosque_maia.jpg",
    url: PORTAL_PREFEITURA,
  },
];

/**
 * EXPOSIÇÕES E ARTISTAS EM DESTAQUE
 * -------------------------------------------------------------------------
 * Conteúdo de exemplo/placeholder (mantido como estava). Antes de publicar,
 * troque "bio" e "imagem" pelo material real da Secretaria de Cultura.
 */
const exposicoes = [
  {
    id: "expo-roberto-farias",
    periodo: "Em cartaz",
    titulo: "Mostra individual — Roberto Farias",
    artista: "Roberto Faria",
    local: "Centro Cultural de Guarulhos",
    bio: "Artista convidado desta edição. [Substituir por biografia oficial fornecida pela Secretaria de Cultura.]",
    imagem: "/src/assets/exposicoes/roberto_farias.jpg",
    ctaSaibaMais: PORTAL_PREFEITURA,
  },
  {
    id: "expo-coletiva-bairros",
    periodo: "Próxima edição",
    titulo: "Coletiva de artistas dos bairros",
    artista: "Diversos artistas locais",
    local: "A definir",
    bio: "Mostra coletiva reunindo produção de artistas visuais ligados aos Pontos de Cultura do município. [Conteúdo de exemplo — atualizar com a programação real.]",
    imagem: "/src/assets/exposicoes/coletiva_bairros.jpg",
    ctaSaibaMais: PORTAL_PREFEITURA,
  },
];

/**
 * E-mail de contato do CTA "Quero expor meu trabalho". Endereço ilustrativo:
 * troque pelo canal real da Secretaria de Cultura antes de publicar.
 */
const EMAIL_CULTURA = "cultura@guarulhos.sp.gov.br";

// "2025-05-16" -> "16 de maio de 2025". O "T12:00:00" evita que o fuso
// horário empurre a data para o dia anterior.
function formatarData(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Se o arquivo de imagem ainda não existe, esconde o ícone de imagem quebrada.
function esconderImagemQuebrada(e) {
  e.currentTarget.style.visibility = "hidden";
}

function NoticiaImagem({ noticia }) {
  return (
    <figure className="noticia-figure">
      <img
        src={noticia.imagem}
        alt=""
        loading="lazy"
        onError={esconderImagemQuebrada}
      />
    </figure>
  );
}

function NoticiaTag({ children }) {
  return (
    <span className="novidade-tag">
      <MegaphoneIcon width={12} height={12} />
      {children}
    </span>
  );
}

function NoticiaLink({ noticia }) {
  return (
    <a
      className="verlink noticia-link"
      href={noticia.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Leia mais
      <ArrowRightIcon width={12} height={12} />
    </a>
  );
}

export default function ConhecaMais() {
  const navigate = useNavigate();
  const { estatisticas, carregando } = usePatrimoniosContext();

  const [destaque, segundo, ...demais] = novidades;

  return (
    <div>
      <div className="page-hero">
        <h1>Conheça mais sobre o projeto</h1>
        <p>
          Um mapeamento colaborativo da memória histórica e cultural de
          Guarulhos, feito para aproximar a população da própria história.
        </p>
      </div>

      <section className="sobre" style={{ marginTop: 0 }}>
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <h2>Nossa missão</h2>
              <p className="sub">
                Três frentes guiam o que essa plataforma se propõe a fazer.
              </p>
            </div>
          </div>
          <div className="sobre-grid">
            <div className="sobre-card">
              <AcademicCapIcon width={24} height={24} />
              <h3>Educar</h3>
              <p>
                Aproximar estudantes e o público jovem da história e da memória
                artística de Guarulhos.
              </p>
            </div>
            <div className="sobre-card">
              <SparklesIcon width={24} height={24} />
              <h3>Preservar</h3>
              <p>
                Centralizar documentos, imagens e curiosidades sobre cada bem
                tombado num só lugar.
              </p>
            </div>
            <div className="sobre-card">
              <UsersIcon width={24} height={24} />
              <h3>Conectar</h3>
              <p>
                Incentivar o turismo cultural e aproximar moradores e visitantes
                da própria história.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Novidades ===== */}
      <section className="sobre">
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <h2>Novidades</h2>
              <p className="sub">
                Acompanhe as últimas notícias sobre o patrimônio histórico e
                cultural de Guarulhos.
              </p>
            </div>
          </div>

          <div className="noticias">
            <div className="noticias-main">
              <div className="noticias-top">
                <article className="noticia-card noticia-card--destaque">
                  <NoticiaImagem noticia={destaque} />
                  <div className="noticia-body">
                    <NoticiaTag>{destaque.tag}</NoticiaTag>
                    <time className="noticia-data" dateTime={destaque.data}>
                      {formatarData(destaque.data)}
                    </time>
                    <h3>{destaque.titulo}</h3>
                    {destaque.resumo.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                    <NoticiaLink noticia={destaque} />
                  </div>
                </article>

                <article className="noticia-card noticia-card--destaque">
                  <NoticiaImagem noticia={segundo} />
                  <div className="noticia-body">
                    <NoticiaTag>{segundo.tag}</NoticiaTag>
                    <time className="noticia-data" dateTime={segundo.data}>
                      {formatarData(segundo.data)}
                    </time>
                    <h3>{segundo.titulo}</h3>
                    {segundo.resumo.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                    <NoticiaLink noticia={segundo} />
                  </div>
                </article>
              </div>

              <div className="noticias-row">
                {demais.map((n) => (
                  <article key={n.id} className="noticia-card">
                    <NoticiaImagem noticia={n} />
                    <div className="noticia-body">
                      <div className="noticia-meta">
                        <NoticiaTag>{n.tag}</NoticiaTag>
                        <time className="noticia-data" dateTime={n.data}>
                          {formatarData(n.data)}
                        </time>
                      </div>
                      <h3>{n.titulo}</h3>
                      <p>{n.resumo[0]}</p>
                      <NoticiaLink noticia={n} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="noticias-side" aria-label="Últimas notícias">
              <h3>Últimas notícias</h3>
              <ul>
                {novidades.map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ultima"
                    >
                      <figure className="ultima-thumb">
                        <img
                          src={n.imagem}
                          alt=""
                          loading="lazy"
                          onError={esconderImagemQuebrada}
                        />
                      </figure>
                      <div>
                        <time className="noticia-data" dateTime={n.data}>
                          {formatarData(n.data)}
                        </time>
                        <span className="ultima-titulo">{n.titulo}</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
              <a
                className="noticias-todas"
                href={PORTAL_PREFEITURA}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver todas as notícias
                <ArrowRightIcon width={14} height={14} />
              </a>
            </aside>
          </div>
        </div>
      </section>

      {/* ===== Exposições e artistas em destaque ===== */}
      <section className="sobre">
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <h2>Exposições e artistas em destaque</h2>
              <p className="sub">
                Mostras em cartaz e artistas locais apoiados pela política
                cultural do município.
              </p>
            </div>
          </div>

          <div className="expo-grid">
            {exposicoes.map((e) => (
              <article key={e.id} className="expo-card">
                <figure>
                  <img src={e.imagem} alt={e.titulo} loading="lazy" />
                </figure>
                <div className="expo-card-body">
                  <span className="periodo">{e.periodo}</span>
                  <h3>{e.titulo}</h3>
                  <span className="artista">{e.artista}</span>
                  <span className="local">{e.local}</span>
                  <p>{e.bio}</p>
                  <div className="expo-cta-row">
                    <a
                      className="btn-solid"
                      href={e.ctaSaibaMais}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Saiba mais
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="expo-callout">
            <div>
              <h3>É artista e quer expor em Guarulhos?</h3>
              <p>
                Fale com a Secretaria de Cultura e saiba como participar dos
                Pontos de Cultura e dos editais municipais.
              </p>
            </div>
            <a className="btn-solid" href={`mailto:${EMAIL_CULTURA}`}>
              <PaintBrushIcon width={16} height={16} />
              Quero expor meu trabalho
            </a>
          </div>
        </div>
      </section>

      <section className="destaques">
        <div className="section-head">
          <div>
            <h2>Como usar a plataforma</h2>
            <p className="sub">
              Hoje o acervo reúne{" "}
              {carregando ? "vários" : (estatisticas?.totalBens ?? 0)} bens
              catalogados em{" "}
              {carregando ? "algumas" : (estatisticas?.totalCategorias ?? 0)}{" "}
              categorias diferentes.
            </p>
          </div>
        </div>
        <div className="sobre-grid">
          <div className="sobre-card">
            <Squares2X2Icon width={24} height={24} />
            <h3>Navegue pelo acervo</h3>
            <p>
              Filtre por categoria e leia o resumo histórico de cada patrimônio
              catalogado.
            </p>
            <button
              className="map-cta-btn"
              style={{
                marginTop: 12,
                color: "#fff",
                background: "var(--blue)",
              }}
              onClick={() => navigate("/patrimonios")}
            >
              Ver patrimônios
            </button>
          </div>
          <div className="sobre-card">
            <MapIcon width={24} height={24} />
            <h3>Explore no mapa</h3>
            <p>
              Veja onde cada bem está localizado na cidade e compare distâncias
              entre eles.
            </p>
            <button
              className="map-cta-btn"
              style={{
                marginTop: 12,
                color: "#fff",
                background: "var(--blue)",
              }}
              onClick={() => navigate("/mapa")}
            >
              Abrir o mapa
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
