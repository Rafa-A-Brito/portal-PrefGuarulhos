import { useNavigate, Link } from "react-router-dom";
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
import { listarExposicoes, listarNovidades } from "../../services/conteudoApi";
import { useConteudoPublico } from "../../hooks/useConteudoPublico";
import EstadoConteudo from "../../components/EstadoConteudo";

const ROTA_DETALHES = "/conheca-mais/detalhes";
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
  if (!noticia.imagem) return null;
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
    <Link
      className="verlink noticia-link"
      to={`${ROTA_DETALHES}#${noticia.id}`}
    >
      Leia mais
      <ArrowRightIcon width={12} height={12} />
    </Link>
  );
}

export default function ConhecaMais() {
  const navigate = useNavigate();
  const { estatisticas, carregando } = usePatrimoniosContext();

  const novidades = useConteudoPublico(listarNovidades);
  const exposicoesEstado = useConteudoPublico(listarExposicoes);
  const exposicoes = exposicoesEstado.itens;
  const noticias = novidades.itens.filter((item) => item.tipo === "NOTICIA");
  const eventos = novidades.itens.filter((item) => item.tipo === "EVENTO");
  const [destaque, segundo, ...demais] = noticias;

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
          <div className="sobre-layout">
            <div className="sobre-intro">
              <h2>Nossa missão</h2>
              <p>
                Cada praça, igreja e casarão de Guarulhos guarda uma história.
                Este portal existe para que ela seja conhecida, cuidada e
                passada adiante.
              </p>
            </div>

            <div className="sobre-missoes">
              <div className="missao-item">
                <div className="missao-icon">
                  <AcademicCapIcon width={24} height={24} />
                </div>

                <div className="missao-content">
                  <h3>Educar</h3>
                  <p>
                    Transformar a história da cidade em algo que dá vontade de
                    aprender, para estudantes, professores e qualquer pessoa
                    curiosa.
                  </p>
                </div>
              </div>

              <div className="missao-item">
                <div className="missao-icon">
                  <SparklesIcon width={24} height={24} />
                </div>

                <div className="missao-content">
                  <h3>Preservar</h3>
                  <p>
                    Reunir fotos, documentos e curiosidades de cada bem tombado
                    num só lugar, para que nada se perca com o tempo.
                  </p>
                </div>
              </div>

              <div className="missao-item">
                <div className="missao-icon">
                  <UsersIcon width={24} height={24} />
                </div>

                <div className="missao-content">
                  <h3>Conectar</h3>
                  <p>
                    Aproximar moradores e visitantes dos lugares que fazem
                    Guarulhos ser Guarulhos, e dar um bom motivo para
                    conhecê-los de perto.
                  </p>
                </div>
              </div>
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
                Notícias recentes e a agenda de eventos nos patrimônios e nas
                comunidades de Guarulhos.
              </p>
            </div>
          </div>

          <EstadoConteudo estado={novidades} nome="novidades" />
          <div className="noticias">
            <div className="noticias-main">
              <div className="noticias-top">
                {[destaque, segundo].filter(Boolean).map((n) => (
                  <article
                    key={n.id}
                    className="noticia-card noticia-card--destaque"
                  >
                    <NoticiaImagem noticia={n} />
                    <div className="noticia-body">
                      <NoticiaTag>{n.tag}</NoticiaTag>
                      <time className="noticia-data" dateTime={n.data}>
                        {formatarData(n.data)}
                      </time>
                      <h3>{n.titulo}</h3>
                      <p>{n.resumo}</p>
                      <NoticiaLink noticia={n} />
                    </div>
                  </article>
                ))}
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
                      <p>{n.resumo}</p>
                      <NoticiaLink noticia={n} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="noticias-side" aria-label="Agenda de eventos">
              <h3>Agenda de eventos</h3>
              <ul>
                {eventos.map((e) => (
                  <li key={e.id}>
                    <Link to={`${ROTA_DETALHES}#${e.id}`} className="ultima">
                      <span className="ultima-data">
                        <strong>{e.bloco.dia}</strong>
                        <span>{e.bloco.mes}</span>
                      </span>
                      <div>
                        <span className="ultima-titulo">{e.titulo}</span>
                        <span className="noticia-data">{e.tag}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="noticias-todas" to={ROTA_DETALHES}>
                Ver agenda completa
                <ArrowRightIcon width={14} height={14} />
              </Link>
            </aside>
          </div>

          <div className="noticias-cta">
            <Link className="btn-solid" to={ROTA_DETALHES}>
              Ver todas as notícias e fontes
            </Link>
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

          <EstadoConteudo estado={exposicoesEstado} nome="exposições" />
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
                  {e.ctaSaibaMais && <div className="expo-cta-row">
                    <a
                      className="btn-solid"
                      href={e.ctaSaibaMais}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Saiba mais
                    </a>
                  </div>}
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
            <h2>Por onde começar</h2>
            <p className="sub">
              Já são {carregando ? "vários" : (estatisticas?.totalBens ?? 0)}{" "}
              bens catalogados, em{" "}
              {carregando ? "algumas" : (estatisticas?.totalCategorias ?? 0)}{" "}
              categorias. Escolha o jeito que preferir de explorar.
            </p>
          </div>
        </div>
        <div className="sobre-grid">
          <div className="sobre-card">
            <Squares2X2Icon width={24} height={24} />
            <h3>Folheie o acervo</h3>
            <p>
              Filtre por categoria e descubra a história por trás de cada
              patrimônio, em resumos curtos e fáceis de ler.
            </p>
            <button
              className="map-cta-btn"
              onClick={() => navigate("/patrimonios")}
            >
              Ver patrimônios
            </button>
          </div>
          <div className="sobre-card">
            <MapIcon width={24} height={24} />
            <h3>Passeie pelo mapa</h3>
            <p>
              Veja onde cada bem fica na cidade e compare a distância entre eles
              antes de sair de casa.
            </p>
            <button className="map-cta-btn" onClick={() => navigate("/mapa")}>
              Abrir o mapa
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
