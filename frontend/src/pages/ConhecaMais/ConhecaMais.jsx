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
import ImagemPatrimonio from "../../components/ImagemPatrimonio";

const ROTA_DETALHES = "/conheca-mais/detalhes";
const EMAIL_CULTURA = "cultura@guarulhos.sp.gov.br";
// A agenda da home mostra só os próximos eventos; o resto fica na página de detalhes.
const MAX_EVENTOS_AGENDA = 4;

// "YYYY-MM-DD" de hoje no fuso local (toISOString usaria UTC e viraria o dia à noite).
function hojeISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

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

// Rola até a seção e leva o foco ao título, para teclado e leitor de tela.
function irPara(e, id) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  e.preventDefault();
  alvo.scrollIntoView();
  alvo.querySelector("h2, h3")?.focus({ preventScroll: true });
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
  const todosEventos = novidades.itens.filter((item) => item.tipo === "EVENTO");
  // Próximos eventos primeiro (do mais perto para o mais longe); se não houver
  // nenhum futuro, mostra os mais recentes para a agenda não ficar vazia.
  const hoje = hojeISO();
  const futuros = todosEventos
    .filter((e) => e.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data));
  const eventosOrdenados = futuros.length
    ? futuros
    : [...todosEventos].sort((a, b) => b.data.localeCompare(a.data));
  const eventos = eventosOrdenados.slice(0, MAX_EVENTOS_AGENDA);
  const eventosRestantes = todosEventos.length - eventos.length;
  const [destaque, segundo, ...demais] = noticias;

  // Contagens no topo só aparecem com dados reais já carregados da API.
  const pronto = (estado) =>
    !estado.carregando &&
    !estado.erro &&
    !estado.itens.some((i) => i.demonstracao);
  const atalhos = [
    {
      id: "novidades",
      rotulo: "Notícias",
      qtd: pronto(novidades) ? noticias.length : null,
    },
    {
      id: "agenda",
      rotulo: "Eventos",
      qtd: pronto(novidades) ? todosEventos.length : null,
    },
    {
      id: "exposicoes",
      rotulo: "Exposições",
      qtd: pronto(exposicoesEstado) ? exposicoes.length : null,
    },
  ];

  return (
    <div className="conheca-mais">
      <div className="page-hero cm-hero">
        <span className="cm-eyebrow">Cultura em Guarulhos</span>
        <h1>Notícias, eventos e exposições de Guarulhos</h1>
        <p>
          Acompanhe as novidades, a agenda de eventos, as exposições e os
          artistas que movimentam a vida cultural da cidade.
        </p>
        <nav aria-label="Nesta página">
          <ul className="cm-atalhos">
            {atalhos.map((a) => (
              <li key={a.id}>
                <a href={`#${a.id}`} onClick={(e) => irPara(e, a.id)}>
                  {a.rotulo}
                  {a.qtd !== null && <strong>{a.qtd}</strong>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ===== Novidades ===== */}
      <section id="novidades" className="sobre">
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <span className="cm-eyebrow">Notícias e agenda</span>
              <h2 tabIndex={-1}>Novidades</h2>
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

            <aside
              id="agenda"
              className="noticias-side"
              aria-label="Agenda de eventos"
            >
              <h3 tabIndex={-1}>Agenda de eventos</h3>
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
                {eventosRestantes > 0
                  ? `Veja mais ${eventosRestantes} ${eventosRestantes === 1 ? "evento" : "eventos"}`
                  : "Ver agenda completa"}
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
      <section id="exposicoes" className="sobre cm-expo">
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <span className="cm-eyebrow">Exposições e artistas</span>
              <h2 tabIndex={-1}>Exposições e artistas em destaque</h2>
              <p className="sub">
                Mostras em cartaz e artistas locais apoiados pela política
                cultural do município.
              </p>
            </div>
          </div>

          <EstadoConteudo estado={exposicoesEstado} nome="exposições" />
          <div
            className={`expo-grid${exposicoes.length === 1 ? " cm-expo-grid--unica" : exposicoes.length === 2 ? " cm-expo-grid--dupla" : ""}`}
          >
            {exposicoes.map((e) => (
              <article key={e.id} className="expo-card">
                <figure>
                  <ImagemPatrimonio src={e.imagem} alt={e.titulo} loading="lazy" />
                </figure>
                <div className="expo-card-body">
                  <span className="periodo">{e.periodo}</span>
                  <h3>{e.titulo}</h3>
                  <span className="artista">{e.artista}</span>
                  <span className="local">{e.local}</span>
                  <p>{e.bio}</p>
                  {e.ctaSaibaMais && (
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
                  )}
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

      {/* ===== Nossa missão: seção secundária, compacta ===== */}
      <section className="sobre cm-missao" aria-labelledby="cm-missao-titulo">
        <div className="sobre-inner">
          <div className="cm-missao-intro">
            <span className="cm-eyebrow">Conheça mais sobre o projeto</span>
            <h2 id="cm-missao-titulo">Nossa missão</h2>
            <p>
              Um mapeamento colaborativo da memória histórica e cultural de
              Guarulhos, feito para aproximar a população da própria história.
            </p>
            <p>
              Cada praça, igreja e casarão de Guarulhos guarda uma história.
              Este portal existe para que ela seja conhecida, cuidada e passada
              adiante.
            </p>
          </div>

          <ul className="cm-pilares">
            <li className="cm-pilar cm-pilar--azul">
              <AcademicCapIcon width={24} height={24} aria-hidden="true" />
              <h3>Educar</h3>
              <p>
                Transformar a história da cidade em algo que dá vontade de
                aprender, para estudantes, professores e qualquer pessoa
                curiosa.
              </p>
            </li>
            <li className="cm-pilar cm-pilar--verde">
              <SparklesIcon width={24} height={24} aria-hidden="true" />
              <h3>Preservar</h3>
              <p>
                Reunir fotos, documentos e curiosidades de cada bem tombado num
                só lugar, para que nada se perca com o tempo.
              </p>
            </li>
            <li className="cm-pilar cm-pilar--laranja">
              <UsersIcon width={24} height={24} aria-hidden="true" />
              <h3>Conectar</h3>
              <p>
                Aproximar moradores e visitantes dos lugares que fazem Guarulhos
                ser Guarulhos, e dar um bom motivo para conhecê-los de perto.
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
