import { useMemo, useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { MapIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import FiltroBar from "../../features/mapa/FiltroBar";

import PlaquetaCard from "../../features/mapa/PlaquetaCard";

import { filtrarPatrimonios } from "../../features/buscarPatrimonios";

import { usePatrimoniosContext } from "../../hooks/usePatrimoniosContext";

const ITENS_POR_PAGINA = 4;

export default function Patrimonios() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtro = searchParams.get("categoria") || "todos";

  const [busca, setBusca] = useState(searchParams.get("busca") || "");

  const { patrimonios, carregando, setSelecionado } = usePatrimoniosContext();

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
      }),
    [filtro, busca, patrimonios],
  );

  // CÁLCULOS DE PAGINAÇÃO
  const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA);

  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;

  const indiceFim = indiceInicio + ITENS_POR_PAGINA;

  const exibidos = filtrados.slice(indiceInicio, indiceFim);

  const irParaPagina = (numero) => {
    setPaginaAtual(numero);

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

        {carregando ? (
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">
            Nenhum patrimônio encontrado para esse filtro
            {busca ? ` e o termo "${busca}"` : ""}.
          </div>
        ) : (
          <>
            <div className="section-head">
              <div>
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
                  onClick={() => irParaPagina(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                  aria-label="Página anterior"
                >
                  Anterior
                </button>

                {Array.from({ length: totalPaginas }, (_, index) => {
                  const numero = index + 1;

                  return (
                    <button
                      key={numero}
                      type="button"
                      onClick={() => irParaPagina(numero)}
                      className={paginaAtual === numero ? "active" : ""}
                      aria-current={paginaAtual === numero ? "page" : undefined}
                    >
                      {numero}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => irParaPagina(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
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
