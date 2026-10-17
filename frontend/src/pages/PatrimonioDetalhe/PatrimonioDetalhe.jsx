import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  MapPinIcon,
  MapIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";
import { CATEGORIA_META } from "../../features/categoriaMeta";
import PatrimoniosRelacionados from "./PatrimoniosRelacionados";
import SecoesAcordeao from "./SecoesAcordeao";
import MetadataEditorial from "../../components/MetadataEditorial/MetadataEditorial";
import { buscarPatrimonioPorId } from "../../services/fakeApi";
import { formatarEndereco } from "../../features/mapa/endereco";
import { criarUrlRota } from "../../features/mapa/rota";
import { classificarLocalizacao } from "../../features/mapa/politicaLocalizacao";
import "./PatrimonioDetalhe.css";

export default function PatrimonioDetalhe() {
  const { id } = useParams();
  return <DetalhePorSlug key={id} slug={id} />;
}

function DetalhePorSlug({ slug }) {
  const navigate = useNavigate();
  const { patrimonios = [], setSelecionado } = usePatrimoniosContext();
  const [estado, setEstado] = useState({
    carregando: true,
    detalhe: null,
    erro: false,
  });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscarPatrimonioPorId(slug).then(
      (detalhe) => {
        if (ativo) setEstado({ carregando: false, detalhe, erro: false });
      },
      () => {
        if (ativo) setEstado({ carregando: false, detalhe: null, erro: true });
      },
    );
    return () => {
      ativo = false;
    };
  }, [slug, tentativa]);

  const recarregar = () => {
    setEstado({ carregando: true, detalhe: null, erro: false });
    setTentativa((valor) => valor + 1);
  };
  const item =
    estado.detalhe ??
    (estado.carregando
      ? patrimonios.find((p) => String(p.id) === String(slug))
      : null);

  const verNoMapa = () => {
    if (item) setSelecionado(item);
    navigate("/mapa");
  };

  if (estado.carregando && !item) {
    return (
      <div className="detalhe-page">
        <p role="status">Carregando patrimônio...</p>
        <div className="detalhe-hero detalhe-hero-skeleton" />
        <div className="detalhe-body">
          <div className="detalhe-content">
            <div className="skeleton-card" style={{ height: 220 }} />
          </div>
        </div>
      </div>
    );
  }

  if (estado.erro) {
    return (
      <div className="page-hero" role="alert">
        <h1>Não foi possível carregar</h1>
        <p>
          Não foi possível carregar os detalhes do patrimônio. Verifique sua
          conexão e tente novamente.
        </p>
        <button type="button" className="btn-outline" onClick={recarregar}>
          Tentar novamente
        </button>
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
  const detalhes = (item.detalhes ?? [])
    .filter((sec) => sec?.texto?.trim())
    .slice()
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const secoes = [
    { titulo: "História", icone: "historia", texto: item.historia },
    {
      titulo: "Importância cultural",
      icone: "importancia",
      texto: item.importanciaCultural,
    },
  ]
    .filter(
      (sec) =>
        sec.texto?.trim() &&
        !detalhes.some((d) => d.texto.trim() === sec.texto.trim()),
    )
    .concat(detalhes);
  const rotaUrl = criarUrlRota(item);
  const politica = classificarLocalizacao(item);
  const endereco = politica.exibirEndereco ? formatarEndereco(item) : [];
  const referencias = item.referencias ?? [];
  const imagens = (item.imagens ?? []).filter((imagem) => imagem.url);
  const resumo = item.descricaoResumida ?? item.resumo;
  const temLocalizacao =
    endereco.length > 0 ||
    Boolean(politica.aviso) ||
    Boolean(politica.coordenadasMarcador || rotaUrl);

  return (
    <div className="detalhe-page">
      {estado.carregando && (
        <p role="status">Carregando detalhes completos...</p>
      )}
      <div
        className="detalhe-hero"
        style={
          item.imagemPrincipal
            ? { backgroundImage: `url(${item.imagemPrincipal})` }
            : undefined
        }
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
            {!meta && item.categoriasInfo?.[0]?.nome && (
              <span className="cat-badge">{item.categoriasInfo[0].nome}</span>
            )}
            {(item.categorias ?? [])
              .filter((categoria) => categoria !== item.categoria)
              .map((categoria) => (
                <span className={`cat-badge cat-${categoria}`} key={categoria}>
                  {CATEGORIA_META[categoria]?.label ??
                    item.categoriasInfo?.find((c) => c.slug === categoria)
                      ?.nome ??
                    categoria}
                </span>
              ))}
            {item.situacao === "DEMOLIDO" && (
              <span className="cat-badge situacao-demolido">Demolido</span>
            )}
            <h1>{item.nome}</h1>
            <MetadataEditorial item={item} />
            {politica.exibirEndereco && item.bairro && (
              <span className="detalhe-bairro">
                <MapPinIcon width={16} height={16} /> {item.bairro}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="detalhe-body detalhe-body--ficha">
        <div
          className={`detalhe-ficha${temLocalizacao ? " detalhe-ficha--com-local" : ""}`}
        >
          <div className="detalhe-content">
            {resumo && <p className="detalhe-resumo">{resumo}</p>}
            {item.descricao && item.descricao !== resumo && (
              <div className="detalhe-descricao">
                {item.descricao.split("\n\n").map((texto, i) => (
                  <p key={i}>{texto}</p>
                ))}
              </div>
            )}
          </div>

          {temLocalizacao && (
            <aside className="detalhe-local" aria-label="Localização">
              <p className="detalhe-local-rotulo" aria-hidden="true">
                Localização
              </p>
              {endereco.length > 0 && (
                <div className="detalhe-endereco-card">
                  <MapPinIcon width={18} height={18} />
                  <div>
                    {endereco.map((linha, i) =>
                      i === 0 ? (
                        <strong key={i}>{linha}</strong>
                      ) : (
                        <span key={i}>{linha}</span>
                      ),
                    )}
                  </div>
                </div>
              )}
              {politica.aviso && (
                <p className="local-aproximado">{politica.aviso}</p>
              )}

              {(politica.coordenadasMarcador || rotaUrl) && (
                <div className="detalhe-actions">
                  {politica.coordenadasMarcador && (
                    <button className="btn-solid" onClick={verNoMapa}>
                      <MapIcon width={16} height={16} /> Ver no mapa
                    </button>
                  )}
                  {rotaUrl && (
                    <a
                      className="btn-outline"
                      href={rotaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ArrowTopRightOnSquareIcon width={16} height={16} />
                      {politica.rotuloRota}
                    </a>
                  )}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {secoes.length > 0 && (
        <div className="detalhe-body detalhe-body--secoes">
          <SecoesAcordeao key={item.id} secoes={secoes} />
        </div>
      )}

      <div className="detalhe-body detalhe-body--fim">
        {imagens.length > 0 && (
          <section className="detalhe-galeria" aria-labelledby="galeria-titulo">
            <h2 id="galeria-titulo">Imagens</h2>
            <div className="detalhe-galeria-grid">
              {imagens.map((imagem, i) => (
                <figure key={imagem.id ?? i}>
                  <img
                    src={imagem.url}
                    alt={imagem.textoAlternativo || imagem.titulo || item.nome}
                    loading="lazy"
                  />
                  {(imagem.titulo || imagem.credito) && (
                    <figcaption>
                      {imagem.titulo && (
                        <span className="detalhe-legenda-titulo">
                          {imagem.titulo}
                        </span>
                      )}
                      {imagem.credito && (
                        <span className="detalhe-legenda-credito">
                          {imagem.credito}
                        </span>
                      )}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}
        {referencias.length > 0 && (
          <section
            className="detalhe-referencias"
            aria-labelledby="referencias-titulo"
          >
            <h2 id="referencias-titulo">Fontes e referências</h2>
            <ul className="detalhe-referencias-lista">
              {referencias.map((referencia, i) => (
                <li key={referencia.id ?? i}>
                  <strong className="detalhe-referencia-titulo">
                    {referencia.descricao || referencia.nomeArquivo}
                  </strong>
                  {/^(https?:\/\/|\/(?!\/))/i.test(referencia.url ?? "") && (
                    <a
                      href={referencia.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {referencia.tipo === "ARQUIVO"
                        ? "Abrir documento"
                        : "Abrir link"}
                      <ArrowTopRightOnSquareIcon
                        width={14}
                        height={14}
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        : {referencia.descricao || referencia.nomeArquivo} (nova
                        aba)
                      </span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {item.rotas?.length > 0 && (
          <section className="detalhe-rotas" aria-labelledby="rotas-titulo">
            <h2 id="rotas-titulo">Rotas culturais</h2>
            <ul className="detalhe-rotas-lista">
              {item.rotas.map((rota) => (
                <li key={rota.slug}>
                  <strong>{rota.nome}</strong>
                  {rota.descricao && <p>{rota.descricao}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <PatrimoniosRelacionados ligacoes={item.ligacoes} />
      </div>
    </div>
  );
}
