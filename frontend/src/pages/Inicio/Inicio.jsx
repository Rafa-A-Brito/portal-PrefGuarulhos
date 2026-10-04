import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  BookOpenIcon as BookOpenIconSolid,
  MapPinIcon as MapPinIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
} from "@heroicons/react/24/solid";
import { heroDestaqueMock } from "../../features/mocks/destaquesMock";
import { CATEGORIA_META, CATEGORIAS_ORDEM } from "../../features/categoriaMeta";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";
import BACKGROUND_IMAGE from "../../assets/viaduto_cid_guarulhos.png";

const CARD_SCROLL_STEP = 236; // largura do card (220px) + gap (16px)
const QTD_DESTAQUES = 6;

export default function Inicio() {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const { patrimonios, carregando } = usePatrimoniosContext();
  const destaques = patrimonios.slice(0, QTD_DESTAQUES);
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

  const rolarDestaques = (direcao = "next") => {
    const track = trackRef.current;
    if (!track) return;

    if (direcao === "prev") {
      const noInicio = track.scrollLeft <= 0;
      track.scrollTo({
        left: noInicio
          ? track.scrollWidth
          : track.scrollLeft - CARD_SCROLL_STEP,
        behavior: "smooth",
      });
    } else {
      const noFinal =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollTo({
        left: noFinal ? 0 : track.scrollLeft + CARD_SCROLL_STEP,
        behavior: "smooth",
      });
    }
  };

  return (
    <div>
      {/* ===== HERO ===== */}
      <section
        className="hero hero-v2"
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
                <span className="hfc-bairro">{heroDestaqueMock.bairro}</span>
              </div>
              <button className="hfc-next" aria-label="Próximo destaque">
                <ChevronRightIcon width={16} height={16} />
              </button>
            </div>
            <p className="hfc-resumo">{heroDestaqueMock.resumo}</p>
            <div className="hfc-thumbs">
              {heroDestaqueMock.imagens.map((img, i) => (
                <img key={i} src={img} alt="" />
              ))}
              <span className="hfc-extra">+{heroDestaqueMock.extra}</span>
            </div>
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
            Organizado por
            <span className="ordenar-select-box">
              Todos <ChevronDownIcon width={14} height={14} />
            </span>
          </label>
        </div>

        {carregando ? (
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : (
          <div className="destaques-carousel">
            <button
              className="destaques-arrow"
              aria-label="Ver mais destaques"
              onClick={rolarDestaques}
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
                  <article
                    key={item.id}
                    className="destaque-card"
                    onClick={() =>
                      navigate(`/patrimonios?categoria=${item.categoria}`)
                    }
                  >
                    <figure>
                      <img
                        src={item.imagemPrincipal}
                        alt={item.nome}
                        loading="lazy"
                      />
                      <button
                        className="destaque-fav"
                        aria-label="Favoritar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HeartIcon width={16} height={16} />
                      </button>
                      <span className={`destaque-badge cat-${item.categoria}`}>
                        {meta?.label.toUpperCase()}
                      </span>
                    </figure>
                    <div className="destaque-body">
                      <h3>{item.nome}</h3>
                      <span className="destaque-bairro">
                        <MapPinIcon width={13} height={13} />
                        {item.bairro}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
            <button
              className="destaques-arrow"
              aria-label="Ver mais destaques"
              onClick={rolarDestaques}
            >
              <ChevronRightIcon width={18} height={18} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
