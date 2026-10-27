import { Component, lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UsersIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import { extrairMensagemDeErro } from "../../../services/adminApi";
import { buscarDashboard } from "../../../services/dashboardApi";
import styles from "./AdminDashboard.module.css";
import SecaoMetricas from "../components/SecaoMetricas";

const GraficosDashboard = lazy(() => import("../components/GraficosDashboard"));

class ErroGraficos extends Component {
  state = { erro: false };
  static getDerivedStateFromError() { return { erro: true }; }
  render() {
    if (this.state.erro) return <div role="alert" className={styles.message}>
      <p>Não foi possível carregar os gráficos.</p>
      <button type="button" className="btn-outline" onClick={() => window.location.reload()}>Recarregar página</button>
    </div>;
    return this.props.children;
  }
}

/**
 * Agregações da mesma fotografia da API; não carrega o catálogo inteiro.
 * Recharts só entra quando este painel tem dados para apresentar.
 */
export default function AdminDashboard() {
  const { usuario } = useAuth();
  const [contagem, setContagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const controller = new AbortController();

    async function carregar() {
      try {
        const dados = await buscarDashboard(controller.signal);
        if (cancelado) return;
        setContagem(dados);
      } catch (err) {
        if (!cancelado) {
          setErro(extrairMensagemDeErro(err));
        }
      }
    }

    carregar();
    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [tentativa]);

  const eAdmin = usuario?.perfil === "ADMIN";

  return (
    <div className={styles.dashboard}>
      <div className="admin-page-head">
        <span className={styles.eyebrow}>PORTAL DO PATRIMÔNIO CULTURAL</span>
        <h1>Visão geral do acervo</h1>
        <p>Olá, {usuario?.nome?.split(" ")[0] || "administrador"}. Acompanhe a conservação, a distribuição e a publicação dos patrimônios.</p>
      </div>

      {erro ? <div role="alert" className={styles.message}>
        <p>{erro}</p><button type="button" className="btn-outline" onClick={() => { setErro(null); setTentativa(t => t + 1); }}>Tentar novamente</button>
      </div> : !contagem && <div role="status" className={styles.loading}>Carregando dados do acervo…</div>}

      <div className="admin-dashboard-grid">
        <Link to="/admin/patrimonios" className="admin-dashboard-card">
          <span className="admin-dashboard-icon admin-dashboard-icon--patrimonios">
            <BuildingLibraryIcon width={22} height={22} />
          </span>
          <div>
            <strong>{contagem?.total ?? "—"}</strong>
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
      {contagem && <>
        <p className={styles.base}>Base administrativa: <strong>{contagem.total} registros · todos os status</strong>. Os legados permanecem incluídos nas contagens.</p>
        {contagem.legados.total > 0 && <details className={styles.legacy}>
          <summary>{contagem.legados.total} registros legados identificados · {contagem.legados.arquivados} arquivados</summary>
          <ul>{contagem.legados.itens.map(item => <li key={item.id}>
            <strong>{item.nome}</strong> — {item.status === "ARQUIVADO" ? "Arquivado" : item.status}. Identidade canônica: <Link to={`/patrimonios/${item.canonico}`}>{item.canonico}</Link>
          </li>)}</ul>
        </details>}
        {contagem.total === 0 ? <div role="status" className={styles.empty}>
          <h2>Nenhum patrimônio cadastrado</h2><p>Os gráficos aparecerão quando houver registros no acervo.</p>
        </div> : <ErroGraficos><Suspense fallback={<p role="status" className={styles.loading}>Carregando gráficos…</p>}>
          <GraficosDashboard dados={contagem} />
        </Suspense></ErroGraficos>}
      </>}
      <SecaoMetricas />
    </div>
  );
}
