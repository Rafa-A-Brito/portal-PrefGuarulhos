import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { resumirFeedback, erroFeedbackAdmin } from "../../../services/feedbackApi";
import { dataBr, dataHoraFeedback, filtrosFeedback, periodoFeedback, TIPOS } from "../feedbackDashboard";
import FeedbackDashboard from "./FeedbackDashboard";
import FiltrosFeedback from "./FiltrosFeedback";
import styles from "../pages/AdminFeedback.module.css";

export default function SecaoFeedback() {
  const id = useId(), filtroRef = useRef(null);
  const [form, setForm] = useState(periodoFeedback);
  const [consulta, setConsulta] = useState(() => ({ filtros: filtrosFeedback(periodoFeedback()) }));
  const [resultado, setResultado] = useState(null), [erroFiltro, setErroFiltro] = useState("");
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
  const atualizar = () => setConsulta(q => ({ filtros: q.filtros }));
  function aplicar(e) {
    e.preventDefault();
    try { const filtros = filtrosFeedback(form); setErroFiltro(""); setConsulta({ filtros }); }
    catch (e) { setErroFiltro(e.message); filtroRef.current?.focus(); }
  }
  function limpar() {
    const inicial = periodoFeedback(); setForm(inicial); setErroFiltro(""); setConsulta({ filtros: filtrosFeedback(inicial) });
  }
  return <section className={`${styles.pagina} ${styles.secaoDashboard}`} aria-labelledby={id}>
    <header><h2 id={id}>Feedback e participação do público</h2>
      <p>Contribuições sobre a experiência de uso do portal: elogios, sugestões e problemas de uso.</p>
      <Link className={styles.linkFeedback} to="/admin/feedback">Consultar comentários e lista de feedbacks</Link></header>
    <FiltrosFeedback form={form} setForm={setForm} erro={erroFiltro} inputRef={filtroRef}
      aplicar={aplicar} limpar={limpar} atualizar={atualizar} nome="Filtros de participação" />
    <p className={styles.nota}>Recorte aplicado: {dataBr(consulta.filtros.inicio)} a {dataBr(consulta.filtros.fim)} · {TIPOS[consulta.filtros.tipo] || "Todos os tipos"}.</p>
    {carregando ? <p role="status">Carregando resumo de feedback…</p> : erro ? <div role="alert">
      <p>{erro.mensagem}</p>{![401, 403].includes(erro.status) && <button className="btn-outline" type="button" onClick={atualizar}>Tentar novamente</button>}
    </div> : !dados.disponivel ? <p role="status">Consulta de feedback desativada. Os dados não estão disponíveis.</p> : <>
      {dados.demonstracao && <p role="status">Demonstração: dados fictícios em memória, descartados ao reiniciar.</p>}
      {agora - Date.parse(dados.meta.geradoEm) >= 300000 && <p role="status">Dados desatualizados. Use “Atualizar dados” para consultar novamente.</p>}
      <FeedbackDashboard dados={dados} />
      <p className={styles.nota}>Resumo consultado em <time dateTime={dados.meta.geradoEm}>{dataHoraFeedback(dados.meta.geradoEm)}</time> · America/Sao_Paulo.</p>
    </>}
  </section>;
}
