import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  BookOpenIcon as BookOpenIconSolid,
  MapPinIcon as MapPinIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
} from "@heroicons/react/24/solid";
import SituacaoPatrimonio from "../../features/patrimonio/SituacaoPatrimonio";
import ImagemPatrimonio from "../../components/ImagemPatrimonio";
import { normalizarUrlImagem } from "../../utils/urlImagem";
import { heroDestaqueMock } from "../../features/mocks/destaquesMock";
import VisitacaoPatrimonio from "../../components/VisitacaoPatrimonio/VisitacaoPatrimonio";
import { CATEGORIA_META, CATEGORIAS_ORDEM } from "../../features/categoriaMeta";
import FavoritoButton from "../../components/FavoritoButton/FavoritoButton";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";
import BACKGROUND_IMAGE from "../../assets/patrimonios/viaduto_cid_guarulhos.png";
import "./InicioFiltroDestaques.css";
import "./InicioHero.css";

const CARD_SCROLL_STEP = 236; // largura do card (220px) + gap (16px)
const QTD_DESTAQUES = 6;

export default function Inicio() {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  // `categorias` já vem do contexto (contagem por slug, calculada da mesma
  // lista de GET /patrimonios): nenhuma requisição nova.
  const { patrimonios, categorias, carregando, erro, recarregar } = usePatrimoniosContext();
  const [categoriaDestaque, setCategoriaDestaque] = useState("todos");
  // Nome das categorias que não estão em CATEGORIA_META (futuras categorias).
  const nomesCategorias = useMemo(() => {
    const nomes = {};
    for (const item of patrimonios) {
      for (const cat of item.categoriasInfo ?? []) nomes[cat.slug] = cat.nome;
    }
    return nomes;
  }, [patrimonios]);
  const rotuloCategoria = (slug) =>
    CATEGORIA_META[slug]?.label ?? nomesCategorias[slug] ?? slug;
  // Ordem preferencial (CATEGORIAS_ORDEM) primeiro; as demais categorias
  // existentes nos dados entram depois, em ordem alfabética.
  const slugsComBens = Object.keys(categorias ?? {}).filter(
    (slug) => categorias[slug] > 0,
  );
  const opcoesCategoria = [
    ...CATEGORIAS_ORDEM.filter((slug) => slugsComBens.includes(slug)),
    ...slugsComBens
      .filter((slug) => !CATEGORIAS_ORDEM.includes(slug))
      .sort((a, b) =>
        rotuloCategoria(a).localeCompare(rotuloCategoria(b), "pt-BR"),
      ),
  ];
  const categoriaAtiva = opcoesCategoria.includes(categoriaDestaque)
    ? categoriaDestaque
    : "todos";
  const destaques = (
    categoriaAtiva === "todos"
      ? patrimonios
      : patrimonios.filter((item) => (item.categorias ?? [item.categoria]).includes(categoriaAtiva))
  ).slice(0, QTD_DESTAQUES);
  // Conteúdo original restrito ao card flutuante; destaques seguem o acervo.
  const heroImagens = heroDestaqueMock.imagens.map(normalizarUrlImagem).filter(Boolean);
  const imagensAdicionais = heroDestaqueMock.extra;
  const [termoBusca, setTermoBusca] = useState("");

  const irParaPatrimonios = (termo) => {
    navigate(
      termo
        ? `/patrimonios?busca=${encodeURIComponent(termo)}`
        : "/patrimonios",
    );
  };

  const buscar = (e) => {
    e.preventDefault();
    irParaPatrimonios(termoBusca.trim());
  };

  const trocarCategoriaDestaque = (slug) => {
    setCategoriaDestaque(slug);
    trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
  };

  const rolarDestaques = (direcao = "next") => {
    const track = trackRef.current;
    if (!track) return;
    const limite = Math.max(0, track.scrollWidth - track.clientWidth);

    if (direcao === "prev") {
      const noInicio = track.scrollLeft <= 0;
      track.scrollTo({
        left: noInicio
          ? limite
          : Math.max(0, track.scrollLeft - CARD_SCROLL_STEP),
        behavior: "smooth",
      });
    } else {
      const noFinal =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollTo({
        left: noFinal
          ? 0
          : Math.min(limite, track.scrollLeft + CARD_SCROLL_STEP),
        behavior: "smooth",
      });
    }
  };

  return (
    <div>
      {/* ===== HERO ===== */}
      <section
        className="hero hero-v2 inicio-hero"
        style={{
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
        }}
      >
        <div className="hero-inner hero-inner-v2">
          <div className="hero-copy">
            <span className="eyebrow">Guarulhos, nossa história</span>
            <h1>
              Conheça e valorize o<br />
              patrimônio de <span className="hl">Guarulhos</span>
            </h1>
            <p className="lede">
              Explore os bens culturais, históricos e naturais que fazem parte
              da nossa identidade. Preserve a nossa história para o futuro.
            </p>

            <form className="searchbar" onSubmit={buscar}>
              <MagnifyingGlassIcon
                width={18}
                height={18}
                className="searchbar-icon"
              />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                aria-label="Buscar patrimônios no acervo"
                placeholder="Busque por nome, bairro, CEP ou categoria..."
              />
              <button type="submit">
                Buscar <ChevronRightIcon width={16} height={16} />
              </button>
            </form>

            <div className="sugestoes-row">
              <span className="sugestoes-label">Sugestões:</span>
              {CATEGORIAS_ORDEM.map((slug) => (
                <button
                  key={slug}
                  className="sugestao-pill"
                  onClick={() => navigate(`/patrimonios?categoria=${slug}`)}
                >
                  {CATEGORIA_META[slug].label}
                </button>
              ))}
            </div>
          </div>

          <aside className="hero-float-card">
            <div className="hfc-head">
              <MapPinIcon width={16} height={16} />
              <div>
                <h3>{heroDestaqueMock.nome}</h3>
                {heroDestaqueMock.bairro && <span className="hfc-bairro">{heroDestaqueMock.bairro}</span>}
              </div>
              <Link
                to="/patrimonios"
                className="hfc-next"
                aria-label="Explorar patrimônios"
                title="Explorar patrimônios"
              >
                <ChevronRightIcon width={16} height={16} />
              </Link>
            </div>
            <p className="hfc-resumo">
              {heroDestaqueMock.resumo}
            </p>
            {heroImagens.length > 0 && (
              <div className="hfc-thumbs">
                {heroImagens.map(img => <ImagemPatrimonio key={img} src={img} alt="" loading="lazy" />)}
                {imagensAdicionais > 0 && <span className="hfc-extra">
                  <span aria-hidden="true">+{imagensAdicionais}</span>
                  <span className="sr-only">Mais {imagensAdicionais} {imagensAdicionais === 1 ? "imagem" : "imagens"}</span>
                </span>}
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* ===== FAIXA DE RECURSOS ===== */}
      <div className="feature-bar">
        <div className="feature-bar-inner">
          <div className="feature-item">
            <span className="feature-icon">
              <BookOpenIconSolid width={18} height={18} />
            </span>
            <div>
              <strong>Conheça a história</strong>
              <span className="feature-item-sub">Explore nossa identidade</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">
              <MapPinIconSolid width={18} height={18} />
            </span>
            <div>
              <strong>Explore o mapa</strong>
              <span className="feature-item-sub">Localize os patrimônios</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">
              <UserGroupIconSolid width={18} height={18} />
            </span>
            <div>
              <strong>Participe</strong>
              <span className="feature-item-sub">
                Contribua com informações
              </span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">
              <ShieldCheckIconSolid width={18} height={18} />
            </span>
            <div>
              <strong>Preserve</strong>
              <span className="feature-item-sub">
                Ajude a manter viva nossa cultura
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== DESTAQUES ===== */}
      <section className="destaques">
        <div className="section-head">
          <div>
            <h2>Destaques</h2>
            <p className="sub">
              Conheça alguns dos bens tombados e espaços mais relevantes de
              Guarulhos.
            </p>
          </div>
          <label className="ordenar-select">
            Filtrar destaques por categoria
            <span className="ordenar-select-box">
              <select
                value={categoriaAtiva}
                onChange={(e) => trocarCategoriaDestaque(e.target.value)}
              >
                <option value="todos">Todos</option>
                {opcoesCategoria.map((slug) => (
                  <option key={slug} value={slug}>
                    {rotuloCategoria(slug)} ({categorias[slug]})
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                width={14}
                height={14}
                aria-hidden="true"
              />
            </span>
          </label>
        </div>

        {carregando ? (
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : erro ? (
          <div className="empty-state" role="alert">
            <p>{erro}</p>
            <button type="button" className="btn-outline" onClick={recarregar}>Tentar novamente</button>
          </div>
        ) : destaques.length === 0 ? (
          <p className="empty-state" role="status">Nenhum patrimônio disponível para exibir.</p>
        ) : (
          <div className="destaques-carousel">
            <button
              className="destaques-arrow"
              aria-label="Destaques anteriores"
              onClick={() => rolarDestaques("prev")}
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <div
              className="destaques-track"
              ref={trackRef}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
                e.currentTarget.scrollBy({ left: e.deltaY, behavior: "auto" });
                e.preventDefault();
              }}
            >
              {destaques.map((item) => {
                const meta = CATEGORIA_META[item.categoria];
                return (
                  <article key={item.id} className="destaque-card">
                    <Link
                      className="destaque-link"
                      to={`/patrimonios?categoria=${item.categoria}`}
                      aria-label={`Explorar ${item.nome}`}
                    >
                      <figure>
                        <ImagemPatrimonio src={item.imagemPrincipal} alt={item.nome} loading="lazy" />
                        <VisitacaoPatrimonio item={item} />
                        <span
                          className={`destaque-badge cat-${item.categoria}`}
                        >
                          {meta?.label.toUpperCase()}
                        </span>
                      </figure>
                      <div className="destaque-body">
                        <h3>{item.nome}</h3>
                        <SituacaoPatrimonio situacao={item.situacao} />
                        <span className="destaque-bairro">
                          <MapPinIcon width={13} height={13} />
                          {item.bairro}
                        </span>
                      </div>
                    </Link>
                    <FavoritoButton item={item} className="destaque-fav" />
                  </article>
                );
              })}
            </div>
            <button
              className="destaques-arrow"
              aria-label="Próximos destaques"
              onClick={() => rolarDestaques("next")}
            >
              <ChevronRightIcon width={18} height={18} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
