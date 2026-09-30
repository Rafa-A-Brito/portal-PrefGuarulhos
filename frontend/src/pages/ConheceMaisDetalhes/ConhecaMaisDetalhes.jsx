import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  FireIcon,
  ListBulletIcon,
  MapPinIcon,
  MegaphoneIcon,
  MusicalNoteIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  TicketIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ATUALIZADO_EM,
  noticiasSetembro,
  eventosOutubro,
  referenciasGerais,
  listarFontes,
} from "../../features/mocks/novidadesMock";

/**
 * NOTÍCIAS E EVENTOS RECENTES — página de detalhes de "Conheça mais"
 * -------------------------------------------------------------------------
 * Estrutura pensada em torno de CTAs (chamadas para ação):
 *   1. Topo: dois caminhos claros ("Ver agenda de outubro" / "Ver fontes").
 *   2. Cada item: UMA ação principal (botão azul) + fontes como links
 *      secundários. Nada de vários botões competindo.
 *   3. Rodapé da página: próximos passos (explorar acervo, mapa, contato).
 *
 * Os dados vêm de mocks/novidadesMock.js, o mesmo usado na página
 * ConhecaMais, então as duas sempre mostram o mesmo conteúdo.
 *
 * ÍNDICE LATERAL ("Nesta página")
 *   - Desktop (>= 1100px): coluna fixa (sticky) ao lado do conteúdo.
 *   - Mobile/tablet: uma aba na borda direita aparece após a rolagem, mostra
 *     o ícone e o mês do item atual e abre um painel com a lista completa.
 *   - O item ativo acompanha a rolagem (IntersectionObserver).
 *   - Os nomes curtos vêm do campo "rotulo" de cada item no mock.
 */

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
  fontes: DocumentTextIcon,
};

// "Set · 28", "Out · 17–18", "Out · várias datas"
function dataCurta(item, mes) {
  const dia = item.bloco.dia.replace(/^0/, "");
  return /^\d/.test(dia) ? `${mes} · ${dia}` : `${mes} · ${item.bloco.legenda}`;
}

const GRUPOS = [
  {
    id: "setembro",
    titulo: "Setembro",
    sigla: "SET",
    itens: noticiasSetembro.map((i) => ({
      id: i.id,
      titulo: i.rotulo,
      data: dataCurta(i, "Set"),
    })),
  },
  {
    id: "outubro",
    titulo: "Outubro",
    sigla: "OUT",
    itens: eventosOutubro.map((i) => ({
      id: i.id,
      titulo: i.rotulo,
      data: dataCurta(i, "Out"),
    })),
  },
  {
    id: "referencias",
    titulo: "Referências",
    sigla: "FONTES",
    itens: [
      {
        id: "fontes",
        titulo: "Fontes e referências",
        data: `${listarFontes().length} fontes`,
      },
    ],
  },
];

const TODOS_ITENS = GRUPOS.flatMap((g) =>
  g.itens.map((i) => ({ ...i, sigla: g.sigla })),
);
const IDS = TODOS_ITENS.map((i) => i.id);

// Lista de links do índice (usada na coluna do desktop e no painel do mobile)
function IndicePagina({ ativo, onEscolher }) {
  return (
    <nav className="detalhes-indice" aria-label="Nesta página">
      {GRUPOS.map((g) => (
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
  const ehEvento = item.tipo === "evento";

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

        <p>{item.texto}</p>

        <div className="detalhes-cta">
          <a
            className="btn-solid"
            href={item.cta.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.cta.rotulo} →
          </a>
          <p className="detalhes-fontes">
            Fontes:{" "}
            {item.fontes.map((f, i) => (
              <span key={f.url}>
                {i > 0 && " · "}
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  {f.veiculo}
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function ConhecaMaisDetalhes() {
  const { hash } = useLocation();
  const [ativo, setAtivo] = useState(IDS[0]);
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
  }, [hash]);

  // Scrollspy: marca como ativo o item que cruza a faixa entre 20% e 30% da
  // altura da tela. Os elementos são fixos (IDS), então roda uma vez ([]).
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
    IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observador.observe(el);
    });
    return () => observador.disconnect();
  }, []);

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

  const itemAtivo = TODOS_ITENS.find((i) => i.id === ativo) ?? TODOS_ITENS[0];
  const IconeAtivo = ICONES[itemAtivo.id] ?? ListBulletIcon;

  const fontesNoticias = listarFontes();

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
          fazem parte da história de Guarulhos: as notícias de setembro e a
          programação já divulgada para outubro de 2026.
        </p>
        <div className="detalhes-hero-cta">
          <Link className="btn-solid" to="#outubro" replace>
            Ver agenda de outubro
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
          <IndicePagina ativo={ativo} onEscolher={escolher} />
        </aside>

        <div className="detalhes-conteudo">
          {/* ===== Setembro ===== */}
          <section id="setembro" className="detalhes-secao">
            <div>
              <div className="section-head">
                <div>
                  <h2>Setembro de 2026</h2>
                  <p className="sub">Notícias e atividades recentes.</p>
                </div>
              </div>
              <div className="detalhes-lista">
                {noticiasSetembro.map((n) => (
                  <ItemLinha key={n.id} item={n} />
                ))}
              </div>
            </div>
          </section>

          {/* ===== Outubro ===== */}
          <section id="outubro" className="detalhes-secao">
            <div>
              <div className="section-head">
                <div>
                  <h2>Outubro de 2026</h2>
                  <p className="sub">Eventos já anunciados.</p>
                </div>
              </div>
              <p className="detalhes-aviso">
                Esta é a programação divulgada até {ATUALIZADO_EM}. Como outubro
                ainda não começou, ela é uma previsão e pode sofrer alterações
                pelos organizadores. Confirme datas e horários na fonte antes de
                ir.
              </p>
              <div className="detalhes-lista">
                {eventosOutubro.map((e) => (
                  <ItemLinha key={e.id} item={e} />
                ))}
              </div>
            </div>
          </section>

          {/* ===== Fontes e referências ===== */}
          <section id="fontes" className="detalhes-secao">
            <div>
              <div className="section-head">
                <div>
                  <h2>Fontes e referências</h2>
                  <p className="sub">
                    Pesquisa realizada em {ATUALIZADO_EM}. Todos os links abrem
                    o site original.
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

              <h3 className="detalhes-refs-titulo">Referências gerais</h3>
              <ul className="detalhes-refs">
                {referenciasGerais.map((r) => (
                  <li key={r.assunto}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.veiculo}
                      </a>
                    ) : (
                      <span className="detalhes-ref-nome">{r.veiculo}</span>
                    )}{" "}
                    — {r.assunto}
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
            <IndicePagina ativo={ativo} onEscolher={escolher} />
          </aside>
        </div>
      )}
    </div>
  );
}
