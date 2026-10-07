import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  BuildingLibraryIcon,
  CakeIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  FaceSmileIcon,
  FilmIcon,
  FireIcon,
  FlagIcon,
  ListBulletIcon,
  MapPinIcon,
  MegaphoneIcon,
  MusicalNoteIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  TicketIcon,
  TrophyIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { listarNovidades } from "../../services/conteudoApi";
import { useConteudoPublico } from "../../hooks/useConteudoPublico";
import EstadoConteudo from "../../components/EstadoConteudo";



// Ícone de cada item no índice (chave = id do item)
const ICONES = {
  "casarao-25-mil-visitas": BuildingLibraryIcon,
  "bonsucesso-cultura-e-tradicao": MusicalNoteIcon,
  "conexao-lago-2026": SunIcon,
  "festa-nossa-senhora-de-bonsucesso": SparklesIcon,
  "dom-quixote-teatro-padre-bento": TicketIcon,
  "feira-economia-solidaria": ShoppingBagIcon,
  "arraia-vixi-maria": FireIcon,
  "festival-criart": StarIcon,
  "semana-do-conhecimento-2026": AcademicCapIcon,
  // --- novembro ---
  "mostra-guarulhense-de-cinema": FilmIcon,
  "mangiare-italiafest": CakeIcon,
  "hallyuween-adamastor": FaceSmileIcon,
  "balloon-parade-2026": FlagIcon,
  "abt-escola-teatro-padre-bento": TicketIcon,
  // --- dezembro ---
  "corrida-folha-metropolitana": TrophyIcon,
  "burguerland-festival": CakeIcon,
  fontes: DocumentTextIcon,
};

function agruparNovidades(itens) {
  const mapa = new Map();
  for (const item of itens) {
    const chave = item.data.slice(0, 7);
    if (!mapa.has(chave)) {
      const data = new Date(`${chave}-01T12:00:00`);
      mapa.set(chave, {
        id: `mes-${chave}`,
        titulo: data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        sigla: data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
        itens: [],
      });
    }
    mapa.get(chave).itens.push(item);
  }
  return [...mapa.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, grupo]) => grupo);
}

// Lista de links do índice (usada na coluna do desktop e no painel do mobile)
function IndicePagina({ ativo, onEscolher, grupos }) {
  return (
    <nav className="detalhes-indice" aria-label="Nesta página">
      {grupos.map((g) => (
        <div key={g.id} className={`indice-grupo indice-grupo--${g.id}`}>
          <p className="indice-grupo-titulo">{g.titulo}</p>
          <ul>
            {g.itens.map((it) => {
              const Icone = ICONES[it.id] ?? MegaphoneIcon;
              const ehAtivo = ativo === it.id;
              return (
                <li key={it.id}>
                  <Link
                    to={`#${it.id}`}
                    replace
                    className={`indice-item${ehAtivo ? " ativo" : ""}`}
                    aria-current={ehAtivo ? "location" : undefined}
                    onClick={() => onEscolher(it.id)}
                  >
                    <Icone width={20} height={20} aria-hidden="true" />
                    <span>
                      <strong>{it.titulo}</strong>
                      <small>{it.data}</small>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// Um item da lista (serve para notícia e para evento)
function ItemLinha({ item }) {
  const ehEvento = item.tipo === "EVENTO";

  return (
    <article
      id={item.id}
      className={`detalhes-item${ehEvento ? " detalhes-item--evento" : ""}`}
    >
      <div className="detalhes-data">
        <strong>{item.bloco.dia}</strong>
        <span>{item.bloco.mes}</span>
        {item.bloco.legenda && <small>{item.bloco.legenda}</small>}
      </div>

      <div className="detalhes-corpo">
        <span className="novidade-tag">
          <MegaphoneIcon width={12} height={12} />
          {item.tag}
        </span>

        <h3>{item.titulo}</h3>

        {(item.quando || item.local) && (
          <ul className="detalhes-meta">
            {item.quando && (
              <li>
                <CalendarDaysIcon width={16} height={16} />
                {item.quando}
              </li>
            )}
            {item.local && (
              <li>
                <MapPinIcon width={16} height={16} />
                {item.local}
              </li>
            )}
          </ul>
        )}

        {item.imagemUrl && <img src={item.imagemUrl} alt="" loading="lazy" style={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain" }} />}
        <p>{item.texto}</p>

        <div className="detalhes-cta">
          {item.cta?.url && <a
            className="btn-solid"
            href={item.cta.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.cta.rotulo} →
          </a>}
          {item.fontes.length > 0 && <p className="detalhes-fontes">
            Fontes:{" "}
            {item.fontes.map((f, i) => (
              <span key={f.url}>
                {i > 0 && " · "}
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  {f.veiculo}
                </a>
              </span>
            ))}
          </p>}
        </div>
      </div>
    </article>
  );
}

export default function ConhecaMaisDetalhes() {
  const { hash } = useLocation();
  const novidades = useConteudoPublico(listarNovidades);
  const grupos = useMemo(() => agruparNovidades(novidades.itens), [novidades.itens]);
  const fontesNoticias = useMemo(() => [...new Map(novidades.itens.flatMap((item) => item.fontes).map((fonte) => [fonte.url, fonte])).values()], [novidades.itens]);
  const gruposIndice = useMemo(() => [
    ...grupos,
    ...(fontesNoticias.length ? [{ id: "referencias", titulo: "Referências", sigla: "FONTES", itens: [{ id: "fontes", titulo: "Fontes e referências", data: `${fontesNoticias.length} fontes` }] }] : []),
  ], [grupos, fontesNoticias]);
  const todosItens = useMemo(() => gruposIndice.flatMap((g) => g.itens.map((item) => ({ ...item, sigla: g.sigla }))), [gruposIndice]);
  const ids = useMemo(() => todosItens.map((item) => item.id), [todosItens]);
  const [ativo, setAtivo] = useState("");
  const [painelAberto, setPainelAberto] = useState(false);
  const [mostrarAtalho, setMostrarAtalho] = useState(false);
  // Enquanto a página rola após um clique no índice, o observador espera,
  // para o destaque não "piscar" pelos itens do meio do caminho.
  const travadoAte = useRef(0);

  // Rola até o item indicado na URL (ex.: /conheca-mais/detalhes#festival-criart).
  // Roda ao abrir a página e sempre que o hash muda (dependência: [hash]).
  // Sem hash, volta ao topo.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const alvo = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!alvo) return;
    const reduzir = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    alvo.scrollIntoView({
      behavior: reduzir ? "auto" : "smooth",
      block: "start",
    });
  }, [hash, ids]);

  // Scrollspy: marca como ativo o item que cruza a faixa entre 20% e 30% da
  // altura da tela. O observador acompanha os itens carregados da API.
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        if (Date.now() < travadoAte.current) return;
        const dentro = entradas.filter((e) => e.isIntersecting);
        if (!dentro.length) return;
        dentro.sort(
          (a, b) => b.boundingClientRect.top - a.boundingClientRect.top,
        );
        setAtivo(dentro[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observador.observe(el);
    });
    return () => observador.disconnect();
  }, [ids]);

  // A aba do mobile só aparece depois de sair do topo da página.
  useEffect(() => {
    const aoRolar = () => setMostrarAtalho(window.scrollY > 260);
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // Painel aberto: Esc fecha, a página de trás não rola, e ele fecha sozinho
  // se a janela crescer até o layout de desktop (dependência: [painelAberto]).
  useEffect(() => {
    if (!painelAberto) return;
    const aoTeclar = (e) => {
      if (e.key === "Escape") setPainelAberto(false);
    };
    const desktop = window.matchMedia("(min-width: 1100px)");
    const aoMudar = (e) => {
      if (e.matches) setPainelAberto(false);
    };
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoTeclar);
    desktop.addEventListener("change", aoMudar);
    return () => {
      document.body.style.overflow = overflowAntes;
      window.removeEventListener("keydown", aoTeclar);
      desktop.removeEventListener("change", aoMudar);
    };
  }, [painelAberto]);

  const escolher = useCallback((id) => {
    travadoAte.current = Date.now() + 1000;
    setAtivo(id);
    setPainelAberto(false);
  }, []);

  const itemAtivo = todosItens.find((i) => i.id === ativo) ?? todosItens[0] ?? { id: "", titulo: "Conteúdo", sigla: "ÍNDICE" };
  const IconeAtivo = ICONES[itemAtivo.id] ?? ListBulletIcon;



  return (
    <div>
      {/* ===== Topo ===== */}
      <div className="page-hero">
        <Link to="/conheca-mais" className="detalhes-voltar">
          <ArrowLeftIcon width={14} height={14} />
          Conheça mais
        </Link>
        <h1>Notícias e eventos recentes</h1>
        <p>
          O que está acontecendo agora nos patrimônios e nas comunidades que
          fazem parte da história de Guarulhos.
        </p>
        <div className="detalhes-hero-cta">
          <Link className="btn-solid" to={grupos.length ? `#${grupos[0].id}` : "#conteudo-novidades"} replace>
            Ver notícias e agenda
          </Link>
          <Link className="detalhes-link-sec" to="#fontes" replace>
            Ver fontes
          </Link>
        </div>
      </div>

      {/* ===== Índice lateral + conteúdo ===== */}
      <div className="detalhes-layout">
        <aside className="detalhes-rail">
          <p className="detalhes-rail-titulo">Nesta página</p>
          <IndicePagina ativo={ativo} onEscolher={escolher} grupos={gruposIndice} />
        </aside>

        <div className="detalhes-conteudo" id="conteudo-novidades">
          <EstadoConteudo estado={novidades} nome="novidades" />
          {grupos.map((grupo) => (
            <section id={grupo.id} className="detalhes-secao" key={grupo.id}>
              <div className="section-head"><div><h2>{grupo.titulo}</h2></div></div>
              <div className="detalhes-lista">
                {grupo.itens.map((item) => <ItemLinha key={item.id} item={item} />)}
              </div>
            </section>
          ))}

          {/* ===== Fontes e referências ===== */}
          <section id="fontes" className="detalhes-secao">
            <div>
              <div className="section-head">
                <div>
                  <h2>Fontes e referências</h2>
                  <p className="sub">
                    Fontes dos conteúdos publicados. Todos os links abrem o site original.
                  </p>
                </div>
              </div>

              <h3 className="detalhes-refs-titulo">Notícias e eventos</h3>
              <ul className="detalhes-refs">
                {fontesNoticias.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {f.veiculo}
                    </a>{" "}
                    — {f.assunto}
                  </li>
                ))}
              </ul>


            </div>
          </section>
        </div>
      </div>

      {/* ===== Próximos passos ===== */}
      <section className="detalhes-fecho">
        <div className="detalhes-fecho-inner">
          <div>
            <h2>Continue explorando Guarulhos</h2>
            <p>
              Conheça os bens catalogados, veja onde cada um fica no mapa ou
              envie uma informação para a equipe de Patrimônio Cultural.
            </p>
          </div>
          <div className="detalhes-fecho-acoes">
            <Link className="btn-solid" to="/patrimonios">
              Ver patrimônios
            </Link>
            <Link className="detalhes-btn-borda" to="/mapa">
              Abrir o mapa
            </Link>
            <Link className="detalhes-btn-borda" to="/contato">
              Enviar informação
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Índice no mobile: aba na lateral + painel ===== */}
      <button
        type="button"
        className={`detalhes-atalho${mostrarAtalho ? " visivel" : ""}`}
        aria-label={`Abrir índice da página. Você está em: ${itemAtivo.titulo}`}
        aria-expanded={painelAberto}
        aria-controls="detalhes-painel"
        onClick={() => setPainelAberto(true)}
      >
        <IconeAtivo width={22} height={22} aria-hidden="true" />
        <span>{itemAtivo.sigla}</span>
      </button>

      {painelAberto && (
        <div className="detalhes-painel-wrap">
          <button
            type="button"
            className="detalhes-painel-fundo"
            aria-label="Fechar índice"
            onClick={() => setPainelAberto(false)}
          />
          <aside
            id="detalhes-painel"
            className="detalhes-painel"
            role="dialog"
            aria-modal="true"
            aria-label="Nesta página"
          >
            <div className="detalhes-painel-topo">
              <p>Nesta página</p>
              <button
                type="button"
                className="detalhes-painel-fechar"
                aria-label="Fechar índice"
                onClick={() => setPainelAberto(false)}
              >
                <XMarkIcon width={18} height={18} />
              </button>
            </div>
            <IndicePagina ativo={ativo} onEscolher={escolher} grupos={gruposIndice} />
          </aside>
        </div>
      )}
    </div>
  );
}
