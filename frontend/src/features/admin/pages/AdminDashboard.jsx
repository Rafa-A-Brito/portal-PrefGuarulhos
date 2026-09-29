import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UsersIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import { listarUsuarios } from "../../../services/adminApi";
import { listarPatrimonios } from "../../../services/fakeApi";

/**
 * Página inicial do painel: só mostra quantos usuários e patrimônios
 * existem hoje e dá um atalho pra cada tela de gerenciamento. Não tenta
 * fazer mais do que isso de propósito, dashboards ficam melhores quando
 * crescem aos poucos, conforme o time realmente sente falta de algo.
 */
export default function AdminDashboard() {
  const { usuario } = useAuth();
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

  return (
    <div>
      <div className="admin-page-head">
        <h1>Olá, {usuario?.nome?.split(" ")[0] || "administrador"}</h1>
        <p>Aqui você gerencia os usuários e os patrimônios cadastrados no sistema.</p>
      </div>

      <div className="admin-dashboard-grid">
        <Link to="/admin/usuarios" className="admin-dashboard-card">
          <span className="admin-dashboard-icon">
            <UsersIcon width={22} height={22} />
          </span>
          <div>
            <strong>{totalUsuarios ?? "..."}</strong>
            <span>Usuários cadastrados</span>
          </div>
        </Link>

        <Link to="/admin/patrimonios" className="admin-dashboard-card">
          <span className="admin-dashboard-icon">
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
