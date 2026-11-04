import { useEffect, useRef, useState } from "react";
import { listarFeedback, resumirFeedback, detalharFeedback, erroFeedbackAdmin } from "../../../services/feedbackApi";
import { dataBr, dataHoraFeedback, filtrosFeedback, periodoFeedback, quantidadeFeedback, TIPOS } from "../feedbackDashboard";
import FeedbackDashboard from "../components/FeedbackDashboard";
import styles from "./AdminFeedback.module.css";

function Falha({ erro, repetir }) {
  return <div role="alert"><p>{erro.mensagem}</p>{![401, 403, 404].includes(erro.status) &&
    <button className="btn-outline" type="button" onClick={repetir}>Tentar novamente</button>}</div>;
}
function Detalhe({ id, fechar }) {
  const dialog = useRef(null), titulo = useRef(null);
  const [revisao, setRevisao] = useState(0), [resultado, setResultado] = useState(null);
  useEffect(() => {
    const modal = dialog.current, anterior = document.activeElement, overflow = document.body.style.overflow;
    modal.showModal(); titulo.current.focus(); document.body.style.overflow = "hidden";
    return () => { modal.close(); document.body.style.overflow = overflow; if (anterior?.isConnected) anterior.focus(); };
  }, []);
  useEffect(() => {
    const c = new AbortController();
    detalharFeedback(id, c.signal).then(dados => { if (!c.signal.aborted) setResultado({ revisao, dados }); })
      .catch(e => { if (!c.signal.aborted) setResultado({ revisao, erro: erroFeedbackAdmin(e) }); });
    return () => c.abort();
  }, [id, revisao]);
  const carregando = resultado?.revisao !== revisao, r = !carregando && resultado.dados?.registro;
  function manterFoco(e) {
    if (e.key !== "Tab") return;
    const itens = [...dialog.current.querySelectorAll('button:not(:disabled), [tabindex="0"]')], primeiro = itens[0], ultimo = itens.at(-1);
    if (e.shiftKey && [primeiro, titulo.current].includes(document.activeElement)) { e.preventDefault(); ultimo?.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
  }
  return <dialog ref={dialog} className={styles.modal} aria-labelledby="feedback-detalhe-titulo" onKeyDown={manterFoco}
    onCancel={e => { e.preventDefault(); fechar(); }}>
    <div className={styles.cabecalhoModal}><h2 id="feedback-detalhe-titulo" tabIndex={-1} ref={titulo}>Detalhes do feedback</h2>
      <button className="btn-outline" type="button" onClick={fechar}>Fechar detalhes</button></div>
    {carregando ? <p role="status">Carregando detalhe…</p> : resultado.erro ? <Falha erro={resultado.erro} repetir={() => setRevisao(v => v + 1)} />
      : !resultado.dados.disponivel ? <p role="status">Consulta de feedback desativada.</p> : <>
        {resultado.dados.demonstracao && <p>Demonstração: dados fictícios em memória, descartados ao reiniciar.</p>}
        <dl><dt>Data e hora · America/Sao_Paulo</dt><dd><time dateTime={r.createdAt}>{dataHoraFeedback(r.createdAt)}</time></dd>
          <dt>Tipo</dt><dd>{TIPOS[r.tipo]}</dd></dl>
        <h3>Comentário</h3><div className={styles.mensagem} tabIndex={0} role="region" aria-label="Comentário completo">{r.mensagem}</div>
      </>}
  </dialog>;
}

export default function AdminFeedback() {
  const [form, setForm] = useState(periodoFeedback);
  const [consulta, setConsulta] = useState(() => ({ filtros: filtrosFeedback(periodoFeedback()), pagina: 1, revisao: 0 }));
  const [lista, setLista] = useState(null), [resumo, setResumo] = useState(null), [erroFiltro, setErroFiltro] = useState("");
  const [selecionado, setSelecionado] = useState(null), [agora, setAgora] = useState(Date.now);
  const filtroRef = useRef(null);
  useEffect(() => {
    const c = new AbortController(), { inicio, fim, tipo } = consulta.filtros;
    const filtros = { inicio, fim, ...(tipo && { tipo }) };
    listarFeedback({ ...filtros, pagina: consulta.pagina, limite: 20 }, c.signal).then(dados => {
      if (c.signal.aborted) return;
      if (dados.disponivel && consulta.pagina > Math.max(1, dados.paginacao.totalPaginas)) {
        setConsulta(q => q === consulta ? { ...q, pagina: Math.max(1, Math.min(10000, dados.paginacao.totalPaginas)) } : q); return;
      }
      setLista({ consulta, dados });
    }).catch(e => { if (!c.signal.aborted) setLista({ consulta, erro: erroFeedbackAdmin(e) }); });
    return () => c.abort();
  }, [consulta]);
  useEffect(() => {
    const c = new AbortController();
    resumirFeedback(consulta.filtros, c.signal).then(dados => { if (!c.signal.aborted) setResumo({ filtros: consulta.filtros, revisao: consulta.revisao, dados }); })
      .catch(e => { if (!c.signal.aborted) setResumo({ filtros: consulta.filtros, revisao: consulta.revisao, erro: erroFeedbackAdmin(e) }); });
    return () => c.abort();
  }, [consulta.filtros, consulta.revisao]);
  useEffect(() => { const timer = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const carregandoLista = lista?.consulta !== consulta;
  const carregandoResumo = resumo?.filtros !== consulta.filtros || resumo?.revisao !== consulta.revisao;
  const l = !carregandoLista && lista.dados, r = !carregandoResumo && resumo.dados;
  const erroAcesso = [lista, resumo].find(e => e && [401, 403].includes(e.erro?.status) && (e.consulta === consulta || (e.filtros === consulta.filtros && e.revisao === consulta.revisao)))?.erro;
  const desativado = l?.disponivel === false || r?.disponivel === false;
  const atualizar = () => { setSelecionado(null); setConsulta(q => ({ ...q, revisao: q.revisao + 1 })); };
  const antigo = [l, r].some(d => d?.disponivel && agora - Date.parse(d.meta.geradoEm) >= 300000);
  const divergente = l?.disponivel && r?.disponivel && String(l.paginacao.total) !== r.total;
  function aplicar(e) {
    e.preventDefault();
    try { const filtros = filtrosFeedback(form); setErroFiltro(""); setSelecionado(null); setConsulta({ filtros, pagina: 1, revisao: 0 }); }
    catch (e) { setErroFiltro(e.message); filtroRef.current?.focus(); }
  }
  function limpar() {
    const inicial = periodoFeedback(); setForm(inicial); setErroFiltro(""); setSelecionado(null);
    setConsulta({ filtros: filtrosFeedback(inicial), pagina: 1, revisao: 0 });
  }
  return <div className={styles.pagina}>
    <header className="admin-page-head"><h1>Feedback do portal</h1><p>Consulte contribuições ainda retidas. Datas no formato brasileiro, no fuso America/Sao_Paulo.</p></header>
    <form className={`admin-form ${styles.filtros}`} aria-label="Filtros de feedback" onSubmit={aplicar} noValidate>
      <div className={styles.grade}>
        {[['inicio', 'Data inicial'], ['fim', 'Data final']].map(([chave, rotulo]) => <label key={chave}>{rotulo}
          <input ref={chave === "inicio" ? filtroRef : undefined} value={form[chave]} onChange={e => setForm(f => ({ ...f, [chave]: e.target.value }))}
            type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} required aria-describedby="feedback-datas-ajuda" aria-invalid={Boolean(erroFiltro)} />
        </label>)}
        <label>Tipo de feedback<select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
          <option value="">Todos os tipos</option>{Object.entries(TIPOS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>
        <label>Granularidade<select value={form.granularidade} onChange={e => setForm(f => ({ ...f, granularidade: e.target.value }))}>
          <option value="dia">Diária</option><option value="mes">Mensal</option></select></label>
      </div>
      <p id="feedback-datas-ajuda" className={styles.nota}>Use dd/mm/aaaa. Datas inclusivas, até 366 dias, sem futuro. Padrão: últimos 30 dias civis, incluindo hoje.</p>
      {erroFiltro && <p role="alert">{erroFiltro}</p>}
      <div className={styles.acoes}><button type="submit" className="btn-solid">Aplicar filtros</button>
        <button type="button" className="btn-outline" onClick={limpar}>Limpar filtros</button>
        <button type="button" className="btn-outline" onClick={atualizar}>Atualizar dados</button></div>
    </form>
    <p>Recorte aplicado: {dataBr(consulta.filtros.inicio)} a {dataBr(consulta.filtros.fim)} · {TIPOS[consulta.filtros.tipo] || "Todos os tipos"}.</p>
    {erroAcesso ? <Falha erro={erroAcesso} /> : desativado ? <p role="status">Consulta de feedback desativada. Os dados não estão disponíveis.</p> : <>
      {(l?.demonstracao || r?.demonstracao) && <p role="status">Demonstração: dados fictícios em memória, descartados ao reiniciar.</p>}
      {(antigo || divergente) && <p role="status">Dados desatualizados ou consultados em instantes diferentes. Use “Atualizar dados” para consultar novamente.</p>}
      {carregandoResumo ? <p role="status">Carregando resumo…</p> : resumo.erro ? <Falha erro={resumo.erro} repetir={atualizar} /> : r?.disponivel && <>
        <FeedbackDashboard dados={r} /><p className={styles.nota}>Resumo consultado em {dataHoraFeedback(r.meta.geradoEm)}.</p>
      </>}
      <section aria-labelledby="feedback-lista"><h2 id="feedback-lista">Contribuições</h2>
        {carregandoLista ? <p role="status">Carregando lista…</p> : lista.erro ? <Falha erro={lista.erro} repetir={atualizar} /> : l?.disponivel && <>
          <p className={styles.nota}>Lista consultada em {dataHoraFeedback(l.meta.geradoEm)}. Lista e resumo são consultas independentes; podem refletir novos envios ou expiração entre as leituras.</p>
          {l.itens.length === 0 ? <p>Nenhum registro nesta página do recorte.</p> : <div className={styles.rolagem} tabIndex={0} role="region" aria-label="Lista de feedbacks">
            <table className={`admin-table ${styles.lista}`}><caption>Mais recentes primeiro, na ordem fornecida pelo servidor</caption>
              <thead><tr><th scope="col">Data e hora</th><th scope="col">Tipo</th><th scope="col">Detalhes</th></tr></thead>
              <tbody>{l.itens.map(i => <tr key={i.id}><td><time dateTime={i.createdAt}>{dataHoraFeedback(i.createdAt)}</time></td><td>{TIPOS[i.tipo]}</td>
                <td><button type="button" className="btn-outline" aria-label={`Detalhes de ${TIPOS[i.tipo]} em ${dataHoraFeedback(i.createdAt)}`} onClick={() => setSelecionado(i.id)}>Detalhes</button></td></tr>)}</tbody>
            </table></div>}
          {l.paginacao.totalPaginas > 0 && <nav className={styles.paginacao} aria-label="Paginação de feedback">
            <button className="btn-outline" disabled={consulta.pagina === 1} onClick={() => setConsulta(q => ({ ...q, pagina: q.pagina - 1 }))}>Anterior</button>
            <span>Página {l.paginacao.pagina} de {quantidadeFeedback(String(l.paginacao.totalPaginas))} · {quantidadeFeedback(String(l.paginacao.total))} registros</span>
            <button className="btn-outline" disabled={consulta.pagina >= l.paginacao.totalPaginas || consulta.pagina >= 10000} onClick={() => setConsulta(q => ({ ...q, pagina: q.pagina + 1 }))}>Próxima</button>
          </nav>}
        </>}
      </section>
    </>}
    {selecionado && !erroAcesso && !desativado && <Detalhe key={selecionado} id={selecionado} fechar={() => setSelecionado(null)} />}
  </div>;
}
