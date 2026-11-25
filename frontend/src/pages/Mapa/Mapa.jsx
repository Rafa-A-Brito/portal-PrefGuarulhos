import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import MapaPatrimonios from "../../features/mapa/MapaPatrimonios";
import FiltroBar from "../../features/mapa/FiltroBar";
import { formatarEndereco } from "../../features/mapa/endereco";
import { criarUrlRota } from "../../features/mapa/rota";
import { classificarLocalizacao } from "../../features/mapa/politicaLocalizacao";
import "./Mapa.css";
import { CATEGORIA_META, CATEGORIAS_ORDEM } from "../../features/categoriaMeta";
import { filtrarPatrimonios } from "../../features/buscarPatrimonios";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";
import VisitacaoPatrimonio from "../../components/VisitacaoPatrimonio/VisitacaoPatrimonio";
import SituacaoPatrimonio from "../../features/patrimonio/SituacaoPatrimonio";
import ImagemPatrimonio from "../../components/ImagemPatrimonio";

export default function Mapa() {
  const {
    patrimonios,
    carregando,
    erro,
    recarregar,
    selecionado,
    setSelecionado,
  } = usePatrimoniosContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const busca = searchParams.get("busca") || "";
  const filtro = searchParams.get("categoria") || "todos";
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const filtrados = useMemo(
    () => filtrarPatrimonios(patrimonios, { categoria: filtro, busca }),
    [patrimonios, filtro, busca],
  );

  const [resumoResultados, setResumoResultados] = useState("");
  useEffect(() => {
    if (carregando || erro) return;
    // A lista continua imediata; apenas o resumo aguarda a última interação.
    const timer = setTimeout(() => {
      setResumoResultados(filtrados.length === 0
        ? "Nenhum patrimônio encontrado"
        : `${filtrados.length} ${filtrados.length === 1 ? "patrimônio encontrado" : "patrimônios encontrados"}`);
    }, 400);
    return () => clearTimeout(timer);
  }, [busca, filtro, filtrados.length, carregando, erro]);

  const politica = classificarLocalizacao(selecionado);
  const rotaUrl = criarUrlRota(selecionado);
  const endereco = politica.exibirEndereco ? formatarEndereco(selecionado) : [];

  const handleFiltro = (novo) => {
    setSearchParams(atuais => {
      const params = new URLSearchParams(atuais);
      if (novo === "todos") params.delete("categoria");
      else params.set("categoria", novo);
      return params;
    });
    setFiltrosAbertos(false);
  };

  function handleBusca(valor) {
    setSearchParams(atuais => {
      const params = new URLSearchParams(atuais);
      if (valor) params.set("busca", valor);
      else params.delete("busca");
      return params;
    }, { replace: true });
  }

  return (
    <div>
      <div className="page-hero">
        <h1>Mapa do patrimônio</h1>
        <p>
          Explore os patrimônios históricos, culturais e naturais de Guarulhos.
        </p>
      </div>

      <div className="mapa-shell">
        {/* ===== SIDEBAR ===== */}
        <aside className="mapa-sidebar">
          <div className="mapa-sidebar-count" role="status" aria-atomic="true">
            {carregando
              ? "Carregando…"
              : erro ? "" : resumoResultados || "\u00a0"}
          </div>
          <div className="mapa-sidebar-list">
            {carregando ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="mapa-sidebar-skeleton" />
              ))
            ) : erro ? (
              <div className="mockup-empty" role="alert">
                <p>{erro}</p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={recarregar}
                >
                  Tentar novamente
                </button>
              </div>
            ) : filtrados.length === 0 ? (
              <p className="mockup-empty">Nenhum patrimônio encontrado.</p>
            ) : (
              filtrados.map((item) => (
                <button
                  key={item.id}
                  className={`mapa-sidebar-item ${selecionado?.id === item.id ? "active" : ""}`}
                  onClick={() => setSelecionado(item)}
                >
                  <ImagemPatrimonio
                    src={item.imagemPrincipal}
                    alt={item.nome}
                  />
                  <span className="mapa-sidebar-item-text">
                    <strong>{item.nome}</strong>
                    <SituacaoPatrimonio situacao={item.situacao} />
                    <VisitacaoPatrimonio item={item} emLinha />
                    <small>{classificarLocalizacao(item).aviso || item.bairro}</small>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link to="/patrimonios" className="mapa-sidebar-vertodos">
            Ver todos os patrimônios →
          </Link>
        </aside>

        {/* ===== MAPA ===== */}
        <div className="mapa-central">
          <div className="mapa-toolbar">
            <div className="mapa-search">
              <MagnifyingGlassIcon width={16} height={16} />
              <input
                aria-label="Pesquisar patrimônios no mapa por nome, bairro ou CEP"
                value={busca}
                onChange={(e) => handleBusca(e.target.value)}
                placeholder="Pesquisar por nome, bairro ou CEP..."
              />
            </div>
            <button
              className="mapa-filtros-btn"
              onClick={() => setFiltrosAbertos((v) => !v)}
            >
              <FunnelIcon width={16} height={16} /> Filtros
            </button>
          </div>

          {filtrosAbertos && (
            <div style={{ marginBottom: 12 }}>
              <FiltroBar ativo={filtro} onChange={handleFiltro} />
            </div>
          )}

          <div className="mapa-map-area">
            <MapaPatrimonios
              patrimonios={filtrados}
              selecionado={selecionado}
              onSelecionar={setSelecionado}
            />

            <div className="mapa-legenda">
              <strong>Legenda</strong>
              {CATEGORIAS_ORDEM.map((valor) => (
                <span key={valor} className="mapa-legenda-item">
                  <i className={`legenda-dot cat-${valor}`} />
                  {CATEGORIA_META[valor].label}
                </span>
              ))}
            </div>

            {/* ===== PAINEL DE DETALHE — sobe ao selecionar um item ===== */}
            {selecionado && (
              <div className="mapa-detail-panel" role="region" aria-label="Patrimônio selecionado">
                <button
                  className="mapa-detail-close"
                  aria-label="Fechar detalhes"
                  onClick={() => setSelecionado(null)}
                >
                  <XMarkIcon width={16} height={16} />
                </button>
                <div className="mapa-detail-imagem">
                  <ImagemPatrimonio
                    src={selecionado.imagemPrincipal}
                    alt={selecionado.nome}
                    className="mapa-detail-img"
                  />
                  <VisitacaoPatrimonio item={selecionado} />
                </div>
                <div className="mapa-detail-body">
                  <h3>{selecionado.nome}</h3>
                  <SituacaoPatrimonio situacao={selecionado.situacao} />
                  {endereco.map((linha, i) => (
                    <span className="mapa-detail-endereco" key={i}>{linha}</span>
                  ))}
                  {politica.aviso && (
                    <p className="local-aproximado">{politica.aviso}</p>
                  )}
                  {politica.permiteRota && !politica.coordenadasMarcador && (
                    <span className="mapa-detail-endereco">
                      Este patrimônio ainda não tem posição no mapa.
                    </span>
                  )}
                  <p>{selecionado.resumo}</p>
                  <div className="mapa-detail-actions">
                    <Link
                      className="btn-outline"
                      to={`/patrimonios/${selecionado.id}`}
                    >
                      <InformationCircleIcon width={16} height={16} /> Ver
                      detalhes
                    </Link>
                    {rotaUrl && (
                      <a
                        className="btn-solid"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={rotaUrl}
                      >
                        <ArrowTopRightOnSquareIcon width={16} height={16} />
                        {politica.rotuloRota}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
