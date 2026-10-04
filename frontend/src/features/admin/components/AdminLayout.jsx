import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Squares2X2Icon,
  UsersIcon,
  BuildingLibraryIcon,
  ArrowLeftStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import "../admin.css";
import "../admin-extras.css";
// Acréscimos visuais do painel (hover da lateral, cores dos ícones, selos de
// perfil e de categoria, upload). Vem DEPOIS do admin.css de propósito: em
// regras de mesma força, a última declarada vence.

/**
 * Layout que toda página do painel admin usa por baixo: uma barra lateral
 * fixa com os links e, ao lado, o conteúdo de cada página (via Outlet, do
 * react-router). Assim cada página como AdminUsuarios ou AdminPatrimonios
 * só precisa se preocupar com o próprio conteúdo, sem repetir menu nem
 * cabeçalho.
 */
export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const sair = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <BuildingLibraryIcon width={22} height={22} />
          <span>Painel Admin</span>
        </div>

        <nav className="admin-sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Squares2X2Icon width={18} height={18} />
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/usuarios"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <UsersIcon width={18} height={18} />
            Usuários
          </NavLink>

          <NavLink
            to="/admin/patrimonios"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <BuildingLibraryIcon width={18} height={18} />
            Patrimônios
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-usuario">
            <strong>{usuario?.nome}</strong>
            <span>{usuario?.email}</span>
          </div>

          <button type="button" className="admin-sidebar-sair" onClick={sair}>
            <ArrowLeftStartOnRectangleIcon width={18} height={18} />
            Sair
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
