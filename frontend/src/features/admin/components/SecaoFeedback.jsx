import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowPathIcon, ArrowRightIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { resumirFeedback, erroFeedbackAdmin } from "../../../services/feedbackApi";
import { dataBr, dataHoraFeedback, filtrosFeedback, periodoFeedback, TIPOS } from "../feedbackDashboard";
import FeedbackDashboard from "./FeedbackDashboard";
import styles from "../pages/AdminFeedback.module.css";

// Visão geral compacta: período padrão de 30 dias e sem filtros. A análise detalhada fica em /admin/feedback.
export default function SecaoFeedback() {
  const id = useId();
  const [consulta, setConsulta] = useState(() => ({ filtros: filtrosFeedback(periodoFeedback()) }));
  const [resultado, setResultado] = useState(null);
  const [agora, setAgora] = useState(Date.now);
  useEffect(() => {
    const c = new AbortController();
    resumirFeedback(consulta.filtros, c.signal)
      .then(dados => { if (!c.signal.aborted) setResultado({ consulta, dados }); })
      .catch(e => { if (!c.signal.aborted) setResultado({ consulta, erro: erroFeedbackAdmin(e) }); });
    return () => c.abort();
  }, [consulta]);
  useEffect(() => { const timer = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const carregando = resultado?.consulta !== consulta;
  const dados = !carregando && resultado.dados, erro = !carregando && resultado.erro;
  const atualizar = () => setConsulta({ filtros: filtrosFeedback(periodoFeedback()) });
  return <section className={`${styles.pagina} ${styles.secaoDashboard}`} aria-labelledby={id}>
    <header className={styles.cabecalhoSecao}>
      <div><h2 id={id}>Feedback e participação do público</h2>
        <p>Contribuições sobre a experiência de uso do portal: elogios, sugestões e problemas de uso.</p></div>
      <div className={styles.acoesSecao}>
        <button className="btn-outline" type="button" onClick={atualizar}><ArrowPathIcon width={18} height={18} aria-hidden="true" />Atualizar dados</button>
        <Link className={`btn-solid ${styles.linkFeedback}`} to="/admin/feedback">Consultar comentários e lista de feedbacks<ArrowRightIcon width={16} height={16} aria-hidden="true" /></Link>
      </div>
    </header>
    <p className={styles.recorte}><span className={styles.selo}>Últimos 30 dias</span>
      Recorte aplicado: {dataBr(consulta.filtros.inicio)} a {dataBr(consulta.filtros.fim)} · {TIPOS[consulta.filtros.tipo] || "Todos os tipos"}.</p>
    {carregando ? <p role="status" className={styles.estado}>Carregando resumo de feedback…</p> : erro ? <div role="alert" className={`${styles.estado} ${styles.estadoErro}`}>
      <p>{erro.mensagem}</p>{![401, 403].includes(erro.status) && <button className="btn-outline" type="button" onClick={atualizar}>Tentar novamente</button>}
    </div> : !dados.disponivel ? <p role="status" className={styles.estado}><InformationCircleIcon width={22} height={22} aria-hidden="true" />Consulta de feedback desativada. Os dados não estão disponíveis.</p> : <>
      {dados.demonstracao && <p role="status" className={styles.estado}>Demonstração: dados fictícios em memória, descartados ao reiniciar.</p>}
      {agora - Date.parse(dados.meta.geradoEm) >= 300000 && <p role="status" className={styles.estado}>Dados desatualizados. Use “Atualizar dados” para consultar novamente.</p>}
      <FeedbackDashboard dados={dados} compacto />
      <p className={styles.nota}>Resumo consultado em <time dateTime={dados.meta.geradoEm}>{dataHoraFeedback(dados.meta.geradoEm)}</time> · America/Sao_Paulo.</p>
    </>}
  </section>;
}
