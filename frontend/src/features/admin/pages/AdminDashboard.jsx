import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UsersIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import { useErroModal } from "../../../hooks/useErroModal";
import { listarPatrimoniosAdmin } from "../../../services/adminApi";

/**
 * Página inicial do painel: quantos patrimônios existem (por status) e
 * atalhos. O backend não tem endpoint para listar/contar usuários, por isso
 * não há contador de usuários; ADMIN só vê o atalho para cadastrar novos.
 */
export default function AdminDashboard() {
  const { usuario } = useAuth();
  const { mostrarErro } = useErroModal();
  const [contagem, setContagem] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const lista = await listarPatrimoniosAdmin();
        if (cancelado) return;

        setContagem({
          total: lista.length,
          RASCUNHO: lista.filter((p) => p.status === "RASCUNHO").length,
          PUBLICADO: lista.filter((p) => p.status === "PUBLICADO").length,
          ARQUIVADO: lista.filter((p) => p.status === "ARQUIVADO").length,
        });
      } catch (err) {
        if (!cancelado) {
          mostrarErro(err, { origem: "AdminDashboard › carregar" });
        }
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [mostrarErro]);

  const eAdmin = usuario?.perfil === "ADMIN";

  return (
    <div>
      <div className="admin-page-head">
        <h1>Olá, {usuario?.nome?.split(" ")[0] || "administrador"}</h1>
        <p>
          {eAdmin
            ? "Aqui você gerencia os patrimônios e cadastra novos usuários."
            : "Aqui você cadastra e edita rascunhos de patrimônios. A publicação é feita por um administrador."}
        </p>
      </div>

      <div className="admin-dashboard-grid">
        <Link to="/admin/patrimonios" className="admin-dashboard-card">
          <span className="admin-dashboard-icon admin-dashboard-icon--patrimonios">
            <BuildingLibraryIcon width={22} height={22} />
          </span>
          <div>
            <strong>{contagem?.total ?? "..."}</strong>
            <span>Patrimônios cadastrados</span>
            {contagem && (
              <small>
                {contagem.PUBLICADO} publicados · {contagem.RASCUNHO} rascunhos
                · {contagem.ARQUIVADO} arquivados
              </small>
            )}
          </div>
        </Link>

        {eAdmin && (
          <Link to="/admin/usuarios" className="admin-dashboard-card">
            <span className="admin-dashboard-icon admin-dashboard-icon--usuarios">
              <UsersIcon width={22} height={22} />
            </span>
            <div>
              <strong>Usuários</strong>
              <span>Cadastrar administrador ou editor</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
