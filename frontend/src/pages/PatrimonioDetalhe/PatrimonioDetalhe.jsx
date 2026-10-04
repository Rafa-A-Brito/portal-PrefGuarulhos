import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  MapPinIcon,
  MapIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  SparklesIcon,
  ClockIcon,
  UsersIcon,
  AcademicCapIcon,
  GlobeAmericasIcon,
  HeartIcon,
  MusicalNoteIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";
import { CATEGORIA_META } from "../../features/categoriaMeta";
import PlaquetaCard from "../../features/mapa/PlaquetaCard";

// Ícone de cada seção, escolhido pelo campo `icone` em item.detalhes (ver mock).
const ICONES = {
  historia: BookOpenIcon,
  tempo: ClockIcon,
  arquitetura: BuildingLibraryIcon,
  importancia: BuildingLibraryIcon,
  gente: UsersIcon,
  ensino: AcademicCapIcon,
  natureza: GlobeAmericasIcon,
  tradicao: HeartIcon,
  fe: HeartIcon,
  musica: MusicalNoteIcon,
  processo: ScaleIcon,
  alerta: ExclamationTriangleIcon,
  hoje: SparklesIcon,
};

export default function PatrimonioDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patrimonios, carregando, setSelecionado } = usePatrimoniosContext();

  const item = patrimonios.find((p) => String(p.id) === String(id));

  const verNoMapa = () => {
    if (item) setSelecionado(item);
    navigate("/mapa");
  };

  if (carregando) {
    return (
      <div className="detalhe-page">
        <div className="detalhe-hero detalhe-hero-skeleton" />
        <div className="detalhe-body">
          <div className="detalhe-content">
            <div className="skeleton-card" style={{ height: 220 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-hero">
        <h1>Patrimônio não encontrado</h1>
        <p>Esse bem pode ter sido removido ou o link está incorreto.</p>
        <Link to="/patrimonios" className="detalhe-voltar-inline">
          <ArrowLeftIcon width={16} height={16} /> Voltar aos patrimônios
        </Link>
      </div>
    );
  }

  const meta = CATEGORIA_META[item.categoria];
  const Icon = meta?.Icon;
  const secoes = (item.detalhes ?? []).filter((sec) => sec?.texto);
  const ligacoes = (item.ligacoes ?? [])
    .map((l) => ({
      ...l,
      alvo: patrimonios.find((p) => String(p.id) === String(l.id)),
    }))
    .filter((l) => l.alvo);
  const relacionados = patrimonios
    .filter((p) => p.categoria === item.categoria && p.id !== item.id)
    .slice(0, 3);
  const rotaUrl = item.localizacao
    ? `https://www.google.com/maps/dir/?api=1&destination=${item.localizacao.lat},${item.localizacao.lng}`
    : null;

  return (
    <div className="detalhe-page">
      <div
        className="detalhe-hero"
        style={{ backgroundImage: `url(${item.imagemPrincipal})` }}
      >
        <div className="detalhe-hero-overlay">
          <Link to="/patrimonios" className="detalhe-voltar">
            <ArrowLeftIcon width={16} height={16} /> Voltar aos patrimônios
          </Link>
          <div className="detalhe-hero-info">
            {meta && (
              <span className={`cat-badge cat-${item.categoria}`}>
                {Icon && <Icon className="badge-icon" aria-hidden="true" />}
                {meta.label}
              </span>
            )}
            <h1>{item.nome}</h1>
            <span className="detalhe-bairro">
              <MapPinIcon width={16} height={16} /> {item.bairro}
            </span>
          </div>
        </div>
      </div>

      <div className="detalhe-body">
        <div className="detalhe-content">
          <span className="num">Nº {String(item.id).padStart(3, "0")}</span>
          <p className="detalhe-resumo">{item.resumo}</p>

          {(item.endereco || item.cep) && (
            <div className="detalhe-endereco-card">
              <MapPinIcon width={18} height={18} />
              <div>
                <strong>{item.endereco || item.bairro}</strong>
                <span>
                  {item.bairro}, Guarulhos – SP
                  {item.cep ? ` · CEP ${item.cep}` : ""}
                </span>
              </div>
            </div>
          )}

          <div className="detalhe-actions">
            <button className="btn-solid" onClick={verNoMapa}>
              <MapIcon width={16} height={16} /> Ver no mapa
            </button>
            {rotaUrl && (
              <a
                className="btn-outline"
                href={rotaUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowTopRightOnSquareIcon width={16} height={16} /> Traçar rota
              </a>
            )}
          </div>
        </div>

        {item.fatos?.length > 0 && (
          <div className="detalhe-fatos">
            <h2 className="detalhe-bloco-titulo">Em resumo</h2>
            <div className="detalhe-fatos-grid">
              {item.fatos.map((f) => (
                <div className="detalhe-fato" key={f.rotulo}>
                  <span className="detalhe-fato-rotulo">{f.rotulo}</span>
                  <strong className="detalhe-fato-valor">{f.valor}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {secoes.length > 0 && (
        <div className="detalhe-secoes">
          {secoes.map((secao, i) => {
            const SecaoIcon = ICONES[secao.icone] ?? BookOpenIcon;
            const lado = i % 2 === 0 ? "esq" : "dir";
            return (
              <section
                key={`${item.id}-${i}`}
                className={`detalhe-secao detalhe-secao--${lado}`}
                aria-labelledby={`secao-${i}`}
              >
                <div className="detalhe-secao-inner">
                  <div className="detalhe-secao-titulo">
                    <span className="detalhe-secao-icone" aria-hidden="true">
                      <SecaoIcon width={22} height={22} />
                    </span>
                    <h2 id={`secao-${i}`}>{secao.titulo}</h2>
                  </div>
                  <div className="detalhe-secao-texto">
                    {secao.texto.split("\n\n").map((p, k) => (
                      <p key={k}>{p}</p>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="detalhe-body detalhe-body--fim">
        {ligacoes.length > 0 && (
          <div className="detalhe-ligacoes">
            <h2 className="detalhe-bloco-titulo">Continue explorando</h2>
            <div className="detalhe-ligacoes-grid">
              {ligacoes.map((l) => (
                <Link
                  key={l.id}
                  to={`/patrimonios/${l.id}`}
                  className="detalhe-ligacao"
                >
                  <strong>{l.alvo.nome}</strong>
                  <span>{l.texto}</span>
                  <ArrowRightIcon width={20} height={20} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {relacionados.length > 0 && (
          <div className="detalhe-relacionados">
            <h2>Outros patrimônios {meta?.label.toLowerCase()}</h2>
            <div className="plaque-grid">
              {relacionados.map((rel) => (
                <PlaquetaCard key={rel.id} item={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
