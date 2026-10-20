import { useMemo, useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { MapIcon, MagnifyingGlassIcon, HeartIcon } from "@heroicons/react/24/outline";

import FiltroBar from "../../features/mapa/FiltroBar";

import PlaquetaCard from "../../features/mapa/PlaquetaCard";

import { filtrarPatrimonios } from "../../features/buscarPatrimonios";

import { useFavoritos } from "../../features/favoritos/useFavoritos";
import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";
import { listarRegioes } from "../../services/regioesApi";
import "./Patrimonios.css";

const ITENS_POR_PAGINA = 4;

export default function Patrimonios() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtro = searchParams.get("categoria") || "todos";
  const regiao = searchParams.get("regiao") || "";
  const somenteFavoritos = searchParams.get("favoritos") === "1";
  const temParametroObsoleto = searchParams.has("numeroExibicao");
  // O Nº de exibição não é mais filtro público (apenas texto vindo da API).
  // Links antigos com ?numeroExibicao= continuam abrindo: o parâmetro é ignorado e removido.
  useEffect(() => {
    if (!temParametroObsoleto) return;
    setSearchParams(params => { params.delete("numeroExibicao"); return params; }, { replace: true });
  }, [temParametroObsoleto, setSearchParams]);

  const { ids: favoritos } = useFavoritos();
  const [regioes, setRegioes] = useState([]);
  const [erroRegioes, setErroRegioes] = useState(false);
  const [tentativaRegioes, setTentativaRegioes] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    listarRegioes(abort.signal).then(rows => {
      if (!abort.signal.aborted) { setRegioes(rows); setErroRegioes(false); }
    }).catch(() => { if (!abort.signal.aborted) setErroRegioes(true); });
    return () => abort.abort();
  }, [tentativaRegioes]);

  const [busca, setBusca] = useState(searchParams.get("busca") || "");

  const { patrimonios, carregando, erro, recarregar, setSelecionado } =
    usePatrimoniosContext();

  // Estado para controlar a página atual da paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    return () => setSelecionado(null);
  }, [setSelecionado]);

  const filtrados = useMemo(
    () =>
      filtrarPatrimonios(patrimonios, {
        categoria: filtro,
        busca,
      }).filter(item => (!regiao || item.regiao?.slug === regiao) &&
        (!somenteFavoritos || favoritos.has(item.id))),
    [filtro, busca, patrimonios, regiao, somenteFavoritos, favoritos],
  );
  const totalFavoritosNoCatalogo = useMemo(
    () => patrimonios.filter(item => favoritos.has(item.id)).length,
    [patrimonios, favoritos],
  );

  // CÁLCULOS DE PAGINAÇÃO
  const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA);

  // Ao desfavoritar o último item de uma página (modo "somente favoritos") a página some.
  const paginaCorrigida = Math.min(paginaAtual, Math.max(totalPaginas, 1));

  const indiceInicio = (paginaCorrigida - 1) * ITENS_POR_PAGINA;

  const indiceFim = indiceInicio + ITENS_POR_PAGINA;

  const exibidos = filtrados.slice(indiceInicio, indiceFim);

  const irParaPagina = (pagina) => {
    setPaginaAtual(pagina);

    window.scrollTo({
      top: 300,
      behavior: "smooth",
    });
  };

  const handleFiltro = (novo) => {
    setPaginaAtual(1);

    setSearchParams((params) => {
      if (novo === "todos") {
        params.delete("categoria");
      } else {
        params.set("categoria", novo);
      }

      return params;
    });
  };

  const handleBusca = (valor) => {
    setBusca(valor);

    setSearchParams((params) => {
      if (valor) {
        params.set("busca", valor);
      } else {
        params.delete("busca");
      }

      return params;
    });
  };

  function filtrarEditorial(campo, valor) {
    setPaginaAtual(1);
    setSearchParams(params => { if (valor) params.set(campo, valor); else params.delete(campo); return params; });
  }

  function alternarSomenteFavoritos() {
    setPaginaAtual(1);
    setSearchParams(params => { if (somenteFavoritos) params.delete("favoritos"); else params.set("favoritos", "1"); return params; });
  }

  return (
    <div>
      <div className="page-hero">
        <h1>Patrimônios catalogados</h1>

        <p>
          Explore o acervo completo de bens históricos, culturais e naturais de
          Guarulhos.
        </p>

        <div className="page-hero-hint">
          <MapIcon width={16} height={16} />

          <span>
            Prefere ver a localização de cada um? Use o item "Mapas" no menu.
          </span>
        </div>
      </div>

      <div className="pg-mapa-shell">
        <div className="mapa-search patrimonios-search">
          <MagnifyingGlassIcon width={16} height={16} />

          <input
            value={busca}
            onChange={(e) => handleBusca(e.target.value)}
            placeholder="Buscar por nome, bairro, endereço ou CEP..."
          />
        </div>

        <FiltroBar ativo={filtro} onChange={handleFiltro} />
        <div className="filtros-editoriais">
          {regioes.length > 0 && <label>Região
            <select value={regiao} onChange={e => filtrarEditorial("regiao", e.target.value)}>
              <option value="">Todas as regiões</option>
              {regiao && !regioes.some(r => r.slug === regiao) && <option value={regiao}>Região do filtro atual</option>}
              {regioes.map(r => <option value={r.slug} key={r.id}>{r.nome}</option>)}
            </select>
          </label>}
          <button type="button" className="btn-outline btn-favoritos" aria-pressed={somenteFavoritos} onClick={alternarSomenteFavoritos}>
            <HeartIcon width={16} height={16} aria-hidden="true" />
            Somente favoritos
            <span className="favoritos-contador">{totalFavoritosNoCatalogo}</span>
          </button>
          {regiao && <button type="button" className="btn-outline" onClick={() => {
            setPaginaAtual(1); setSearchParams(params => { params.delete("regiao"); return params; });
          }}>Limpar filtros editoriais</button>}
        </div>
        {erroRegioes && <p role="status">Filtro regional indisponível. <button type="button" onClick={() => setTentativaRegioes(v => v + 1)}>Tentar carregar regiões</button></p>}

        {carregando ? (
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : erro ? (
          <div className="empty-state" role="alert">
            <p>{erro}</p>
            <button type="button" className="btn-outline" onClick={recarregar}>
              Tentar novamente
            </button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state" role="status">
            {somenteFavoritos && totalFavoritosNoCatalogo === 0
              ? "Você ainda não favoritou nenhum patrimônio. Use o coração nos cards para guardar seus favoritos neste navegador."
              : <>
                Nenhum patrimônio encontrado para esse filtro
                {somenteFavoritos ? " entre os seus favoritos" : ""}
                {busca ? ` e o termo "${busca}"` : ""}.
              </>}
            {somenteFavoritos && (
              <div><button type="button" className="btn-outline" onClick={alternarSomenteFavoritos}>Ver todos os patrimônios</button></div>
            )}
          </div>
        ) : (
          <>
            <div className="section-head">
              <div aria-live="polite">
                <h2>
                  {filtrados.length}{" "}
                  {filtrados.length === 1
                    ? "bem encontrado"
                    : "bens encontrados"}
                </h2>

                <p className="sub">
                  Clique em um card para destacá-lo também no mapa.
                </p>
              </div>
            </div>

            <div className="plaque-grid">
              {exibidos.map((item, index) => (
                <div
                  key={item.id}
                  className="plaque-grid-item"
                  style={{
                    animationDelay: `${index * 40}ms`,
                  }}
                  onClick={() => setSelecionado(item)}
                >
                  <PlaquetaCard item={item} />
                </div>
              ))}
            </div>

            {/* CONTROLES DA PAGINAÇÃO */}
            {totalPaginas > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  onClick={() => irParaPagina(paginaCorrigida - 1)}
                  disabled={paginaCorrigida === 1}
                  aria-label="Página anterior"
                >
                  Anterior
                </button>

                {Array.from({ length: totalPaginas }, (_, index) => {
                  const pagina = index + 1;

                  return (
                    <button
                      key={pagina}
                      type="button"
                      onClick={() => irParaPagina(pagina)}
                      className={paginaCorrigida === pagina ? "active" : ""}
                      aria-current={paginaCorrigida === pagina ? "page" : undefined}
                    >
                      {pagina}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => irParaPagina(paginaCorrigida + 1)}
                  disabled={paginaCorrigida === totalPaginas}
                  aria-label="Próxima página"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
