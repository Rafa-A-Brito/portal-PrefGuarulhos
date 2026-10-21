import { NavLink, Outlet } from "react-router-dom";
import {
  Squares2X2Icon,
  UsersIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  PhotoIcon,
  NewspaperIcon,
  ArrowLeftIcon,
  ArrowLeftStartOnRectangleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import "../admin.css";
import "../admin-extras.css";
// Acréscimos visuais do painel (cores dos ícones, selos de perfil e de
// categoria, upload). Vem DEPOIS do admin.css de propósito: em regras de
// mesma força, a última declarada vence.

// Classe usada por todos os links do menu para marcar o item ativo.
const classeAtiva = ({ isActive }) => (isActive ? "active" : "");

/**
 * Layout que toda página do painel admin usa por baixo: uma barra lateral
 * fixa com os links e, ao lado, o conteúdo de cada página (via Outlet, do
 * react-router). Assim cada página só precisa se preocupar com o próprio
 * conteúdo, sem repetir menu nem cabeçalho.
 *
 * Os links são agrupados por assunto e cada grupo tem uma cor da paleta
 * (ver .admin-sidebar-group--* no admin.css):
 *   Visão geral (azul) · Acervo (verde) · Conteúdo (laranja) · Gestão (oliva)
 */
export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const ehAdmin = usuario?.perfil === "ADMIN";
  const inicial = usuario?.nome?.trim()?.charAt(0)?.toUpperCase() || "?";

  const sair = async () => {
    await logout();
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <BuildingLibraryIcon width={22} height={22} aria-hidden="true" />
          <span>Painel Admin</span>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Menu do painel">
          <section
            className="admin-sidebar-group admin-sidebar-group--visao"
            aria-labelledby="grp-visao"
          >
            <h2 className="admin-sidebar-label" id="grp-visao">
              Visão geral
            </h2>
            <NavLink to="/admin" end className={classeAtiva}>
              <Squares2X2Icon width={18} height={18} aria-hidden="true" />
              Dashboard
            </NavLink>
          </section>

          <section
            className="admin-sidebar-group admin-sidebar-group--acervo"
            aria-labelledby="grp-acervo"
          >
            <h2 className="admin-sidebar-label" id="grp-acervo">
              Acervo
            </h2>
            <NavLink to="/admin/patrimonios" className={classeAtiva}>
              <BuildingLibraryIcon width={18} height={18} aria-hidden="true" />
              Patrimônios
            </NavLink>
            {ehAdmin && (
              <NavLink to="/admin/regioes" className={classeAtiva}>
                <MapPinIcon width={18} height={18} aria-hidden="true" />
                Regiões
              </NavLink>
            )}
          </section>

          <section
            className="admin-sidebar-group admin-sidebar-group--conteudo"
            aria-labelledby="grp-conteudo"
          >
            <h2 className="admin-sidebar-label" id="grp-conteudo">
              Conteúdo
            </h2>
            <NavLink to="/admin/exposicoes" className={classeAtiva}>
              <PhotoIcon width={18} height={18} aria-hidden="true" />
              Exposições
            </NavLink>
            <NavLink to="/admin/novidades" className={classeAtiva}>
              <NewspaperIcon width={18} height={18} aria-hidden="true" />
              Novidades
            </NavLink>
          </section>

          {ehAdmin && (
            <section
              className="admin-sidebar-group admin-sidebar-group--gestao"
              aria-labelledby="grp-gestao"
            >
              <h2 className="admin-sidebar-label" id="grp-gestao">
                Gestão
              </h2>
              <NavLink to="/admin/usuarios" className={classeAtiva}>
                <UsersIcon width={18} height={18} aria-hidden="true" />
                Usuários
              </NavLink>
            </section>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-usuario">
            <span className="admin-sidebar-avatar" aria-hidden="true">
              {inicial}
            </span>
            <div className="admin-sidebar-usuario-info">
              <strong title={usuario?.nome}>{usuario?.nome}</strong>
              <span
                className="admin-sidebar-usuario-email"
                title={usuario?.email}
              >
                {usuario?.email}
              </span>
              <span
                className="admin-sidebar-perfil"
                data-perfil={usuario?.perfil}
              >
                {ehAdmin ? "Administrador" : "Editor"}
              </span>
            </div>
          </div>

          <div className="admin-sidebar-acoes">
            <NavLink to="/admin/senha" className="admin-sidebar-sair">
              <LockClosedIcon width={18} height={18} aria-hidden="true" />
              Alterar senha
            </NavLink>
            <NavLink to="/" className="admin-sidebar-sair">
              <ArrowLeftIcon width={18} height={18} aria-hidden="true" />
              Voltar ao site
            </NavLink>
            <button type="button" className="admin-sidebar-sair" onClick={sair}>
              <ArrowLeftStartOnRectangleIcon
                width={18}
                height={18}
                aria-hidden="true"
              />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
