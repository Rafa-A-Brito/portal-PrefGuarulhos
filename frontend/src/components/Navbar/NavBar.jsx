import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");

  const linkClass = ({ isActive }) => (isActive ? "active" : "");
  const fechar = () => setMenuAberto(false);

  /**
   * Mesma função de busca da Home (Inicio.jsx: irParaPatrimonios) — aqui
   * duplicada em vez de importada porque é só uma linha; se crescer, vale
   * extrair pra um hook compartilhado (ex.: useBuscaPatrimonios).
   */
  const buscar = (e) => {
    e.preventDefault();
    const termo = termoBusca.trim();
    navigate(
      termo
        ? `/patrimonios?busca=${encodeURIComponent(termo)}`
        : "/patrimonios",
    );
    setBuscaAberta(false);
    setTermoBusca("");
  };

  const itensNav = (
    <>
      <NavLink to="/" end className={linkClass} onClick={fechar}>
        Início
      </NavLink>
      <NavLink to="/mapa" className={linkClass} onClick={fechar}>
        Mapas
      </NavLink>
      <NavLink to="/patrimonios" className={linkClass} onClick={fechar}>
        Patrimônios
      </NavLink>
      <NavLink to="/conheca-mais" className={linkClass} onClick={fechar}>
        Conheça mais
      </NavLink>
      <NavLink to="/contato" className={linkClass} onClick={fechar}>
        Contato
      </NavLink>
    </>
  );

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <img
          src="/logo_guarulhos.png"
          alt="Prefeitura de Guarulhos"
          className="brand-logo"
        />
        <span className="brand-sep" />
        <span className="brand-text">
          Patrimônio
          <br />
          Cultural
        </span>
      </div>

      <nav className="navbar-nav navbar-nav-desktop">{itensNav}</nav>

      <div className="navbar-actions">
        {buscaAberta ? (
          <form className="navbar-busca" onSubmit={buscar}>
            <MagnifyingGlassIcon width={16} height={16} />
            <input
              type="text"
              autoFocus
              placeholder="Buscar patrimônios..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
            <button
              type="button"
              className="navbar-busca-fechar"
              aria-label="Fechar busca"
              onClick={() => {
                setBuscaAberta(false);
                setTermoBusca("");
              }}
            >
              <XMarkIcon width={15} height={15} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="navbar-search-btn"
            aria-label="Buscar"
            onClick={() => setBuscaAberta(true)}
          >
            <MagnifyingGlassIcon width={18} height={18} />
          </button>
        )}

        {/* Acesso administrativo — só a "porta de entrada" visual.
            A segurança de verdade está em RotaProtegida + backend. */}
        <Link
          to="/admin/login"
          className="navbar-search-btn"
          aria-label="Área administrativa"
          title="Área administrativa"
        >
          <UserCircleIcon width={20} height={20} />
        </Link>
        <button
          className="navbar-toggle"
          onClick={() => setMenuAberto((v) => !v)}
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
        >
          {menuAberto ? (
            <XMarkIcon width={22} height={22} />
          ) : (
            <Bars3Icon width={22} height={22} />
          )}
        </button>
      </div>

      {menuAberto && (
        <nav className="navbar-nav navbar-nav-mobile">{itensNav}</nav>
      )}
    </header>
  );
}
