// [API DESATIVADA TEMPORARIAMENTE] dados em texto puro (db.json) só para visualizar a tela.
// import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UsersIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
// import { listarUsuarios } from "../../../services/adminApi";
// import { listarPatrimonios } from "../../../services/fakeApi";

/**
 * Página inicial do painel: só mostra quantos usuários e patrimônios
 * existem hoje e dá um atalho pra cada tela de gerenciamento. Não tenta
 * fazer mais do que isso de propósito, dashboards ficam melhores quando
 * crescem aos poucos, conforme o time realmente sente falta de algo.
 *
 * Cores dos ícones: usuários em azul e patrimônios em verde (classes
 * --usuarios e --patrimonios, definidas em admin-extras.css).
 */
export default function AdminDashboard() {
  const { usuario } = useAuth();

  /* ----- ORIGINAL (API) — descomentar quando o backend estiver integrado -----
  const [totalUsuarios, setTotalUsuarios] = useState(null);
  const [totalPatrimonios, setTotalPatrimonios] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const [usuarios, patrimonios] = await Promise.all([
          listarUsuarios(),
          listarPatrimonios(),
        ]);

        if (!cancelado) {
          setTotalUsuarios(usuarios.length);
          setTotalPatrimonios(patrimonios.length);
        }
      } catch (err) {
        console.error("[AdminDashboard] Falha ao carregar os números:", err);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, []);
  ----- fim do ORIGINAL (API) ----- */

  // Números do db.json em texto puro (2 usuários, 3 patrimônios).
  const totalUsuarios = 2;
  const totalPatrimonios = 3;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Olá, {usuario?.nome?.split(" ")[0] || "administrador"}</h1>
        <p>
          Aqui você gerencia os usuários e os patrimônios cadastrados no
          sistema.
        </p>
      </div>

      <div className="admin-dashboard-grid">
        <Link to="/admin/usuarios" className="admin-dashboard-card">
          <span className="admin-dashboard-icon admin-dashboard-icon--usuarios">
            <UsersIcon width={22} height={22} />
          </span>
          <div>
            <strong>{totalUsuarios ?? "..."}</strong>
            <span>Usuários cadastrados</span>
          </div>
        </Link>

        <Link to="/admin/patrimonios" className="admin-dashboard-card">
          <span className="admin-dashboard-icon admin-dashboard-icon--patrimonios">
            <BuildingLibraryIcon width={22} height={22} />
          </span>
          <div>
            <strong>{totalPatrimonios ?? "..."}</strong>
            <span>Patrimônios cadastrados</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
