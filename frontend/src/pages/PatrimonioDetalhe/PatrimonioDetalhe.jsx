import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  MapPinIcon,
  MapIcon,
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";
import { CATEGORIA_META } from "../../features/categoriaMeta";
import PatrimoniosRelacionados from "./PatrimoniosRelacionados";
import SecoesAcordeao from "./SecoesAcordeao";
import MetadataEditorial from "../../components/MetadataEditorial/MetadataEditorial";
import { AuthContext } from "../../context/AuthContextInstance.js";
import { buscarPatrimonioPorId } from "../../services/patrimoniosApi";
import { buscarPatrimonioAdmin } from "../../services/adminApi";
import EditarPatrimonioModal from "../../features/admin/components/EditarPatrimonioModal";
import { formatarEndereco } from "../../features/mapa/endereco";
import { criarUrlRota } from "../../features/mapa/rota";
import { classificarLocalizacao } from "../../features/mapa/politicaLocalizacao";
import "./PatrimonioDetalhe.css";
import "./PatrimonioDetalheEdicao.css";

export default function PatrimonioDetalhe() {
  const { id } = useParams();
  return <DetalhePorSlug key={id} slug={id} />;
}

function DetalhePorSlug({ slug }) {
  const navigate = useNavigate();
  const {
    patrimonios = [],
    setSelecionado,
    recarregar: recarregarCatalogo,
  } = usePatrimoniosContext();
  const [estado, setEstado] = useState({
    carregando: true,
    detalhe: null,
    erro: false,
  });
  const [tentativa, setTentativa] = useState(0);
  const { usuario, carregando: verificandoSessao } =
    useContext(AuthContext) ?? {};
  const [editando, setEditando] = useState(false);
  const [erroSincronizacao, setErroSincronizacao] = useState(false);

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

  // Depois de editar no modal: busca a ficha pública de novo SEM trocar a tela
  // por "carregando". Se o nome mudou e o backend gerou outro slug, a ficha
  // antiga dá 404; então descobre o slug novo pelo detalhe admin (UUID) e
  // troca a URL. Falha ao atualizar mantém a ficha atual na tela.
  const atualizarAposEdicao = useCallback(
    async (uuid) => {
      try {
        // Atualiza também as listas e o mapa que compartilham o catálogo.
        await recarregarCatalogo?.();
        const detalhe = await buscarPatrimonioPorId(slug);
        if (detalhe) {
          setEstado({ carregando: false, detalhe, erro: false });
          setSelecionado((atual) => (atual?.uuid === uuid ? detalhe : atual));
          setErroSincronizacao(false);
          return true;
        }
        const admin = await buscarPatrimonioAdmin(uuid);
        if (admin?.slug && admin.slug !== slug) {
          setErroSincronizacao(false);
          navigate(`/patrimonios/${encodeURIComponent(admin.slug)}`, {
            replace: true,
          });
          return true;
        }
      } catch {
        // Gravação e atualização da página são ações diferentes.
      }
      // Se o GET público falhou, não dizer que a página foi atualizada.
      setErroSincronizacao(true);
      return false;
    },
    [slug, navigate, recarregarCatalogo, setSelecionado],
  );

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

  // A API admin usa o UUID (item.uuid), nunca o slug. O backend continua
  // sendo quem valida a permissão de verdade (401/403 aparecem no modal).
  const podeEditar =
    !verificandoSessao &&
    !estado.carregando &&
    usuario?.perfil === "ADMIN" &&
    Boolean(item.uuid);

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
        {podeEditar && (
          <>
            <div className="detalhe-admin-bar">
              <button
                type="button"
                className="btn-outline"
                aria-haspopup="dialog"
                onClick={() => setEditando(true)}
              >
                <PencilSquareIcon width={16} height={16} aria-hidden="true" />
                Editar patrimônio
              </button>
            </div>
            {erroSincronizacao && (
              <div className="detalhe-admin-atualizacao-erro" role="alert">
                <span>
                  A alteração pode ter sido salva, mas a ficha pública não pôde
                  ser atualizada.
                </span>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => void atualizarAposEdicao(item.uuid)}
                >
                  Tentar atualizar a ficha
                </button>
              </div>
            )}
          </>
        )}
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
        <PatrimoniosRelacionados
          ligacoes={item.ligacoes}
          patrimonios={patrimonios}
        />
      </div>

      {podeEditar && editando && (
        <EditarPatrimonioModal
          uuid={item.uuid}
          nome={item.nome}
          onSalvo={({ uuid }) => atualizarAposEdicao(uuid)}
          onClose={({ atualizar } = {}) => {
            setEditando(false);
            if (atualizar) void atualizarAposEdicao(item.uuid);
          }}
        />
      )}
    </div>
  );
}
