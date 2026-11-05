import { useEffect, useRef, useState } from "react";
import { buscarAuditoria, erroAuditoria, listarAuditoria } from "../../../services/auditoriaApi";
import { listarUsuarios } from "../../../services/adminApi";
import { ACOES_AUDITORIA, RECURSOS_AUDITORIA, acaoAuditoria, dataHoraAuditoria, filtrosAuditoria,
  alvoAuditoria, formatarAuditoria, idAuditoria, recursoAuditoria, responsavelAuditoria } from "../formatarAuditoria";
import styles from "./AdminAuditoria.module.css";

const VAZIO = { inicio: "", fim: "", userId: "", action: "", entity: "", entityId: "" };
const LIMITE = 20;

function Falha({ erro, repetir }) {
  return <div role="alert"><p>{erro.mensagem}</p>
    {![401, 403, 404].includes(erro.status) && <button type="button" className="btn-outline" onClick={repetir}>Tentar novamente</button>}
  </div>;
}

function DetalheAuditoria({ id, fechar }) {
  const dialog = useRef(null);
  const titulo = useRef(null);
  const [revisao, setRevisao] = useState(0);
  const [resultado, setResultado] = useState(null);
  const carregando = resultado?.revisao !== revisao;
  useEffect(() => {
    const modal = dialog.current, anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    modal.showModal();
    titulo.current.focus();
    document.body.style.overflow = "hidden";
    return () => {
      modal.close(); document.body.style.overflow = overflow;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);
  useEffect(() => {
    const c = new AbortController();
    buscarAuditoria(id, c.signal).then(dado => {
      if (!c.signal.aborted) setResultado({ revisao, dado });
    }).catch(erro => {
      if (!c.signal.aborted) setResultado({ revisao, erro: erroAuditoria(erro) });
    });
    return () => c.abort();
  }, [id, revisao]);
  const evento = !carregando && !resultado.erro ? resultado.dado : null;
  const f = evento && formatarAuditoria(evento);
  function manterFoco(e) {
    if (e.key !== "Tab") return;
    const itens = [...dialog.current.querySelectorAll('button:not(:disabled), summary, [tabindex="0"]')];
    const primeiro = itens[0], ultimo = itens.at(-1);
    if (e.shiftKey && [primeiro, titulo.current].includes(document.activeElement)) {
      e.preventDefault(); ultimo?.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primeiro?.focus();
    }
  }
  return <dialog ref={dialog} className={styles.modal} aria-labelledby="auditoria-detalhe-titulo"
    onKeyDown={manterFoco}
    onCancel={e => { e.preventDefault(); fechar(); }}>
    <div className={styles.cabecalhoModal}>
      <h2 id="auditoria-detalhe-titulo" ref={titulo} tabIndex={-1}>Detalhes da alteração</h2>
      <button type="button" className="btn-outline" onClick={fechar}>Fechar detalhes</button>
    </div>
    {carregando ? <p role="status">Carregando alteração…</p> : resultado.erro
      ? <Falha erro={resultado.erro} repetir={() => setRevisao(v => v + 1)} /> : <>
        <div className={styles.ocorrencia}><p className={styles.nota}>O que aconteceu?</p><p>{f.ocorrencia}</p></div>
        <p className={styles.frase}>{f.frase}</p>
        <dl className={styles.metadados}>
          <div><dt>Quem realizou?</dt><dd>{f.responsavel}{evento.user?.email && <small>{evento.user.email}</small>}</dd></div>
          <div><dt>Quem ou o que foi afetado?</dt><dd>{f.alvo.titulo}<small>{f.alvo.origem}</small>
            <small>ID do alvo: {idAuditoria(evento.entityId)}</small></dd></div>
          <div><dt>Quando aconteceu? · America/Sao_Paulo</dt><dd>{dataHoraAuditoria(evento.createdAt)}</dd></div>
          <div><dt>Seção/recurso</dt><dd>{f.recurso}</dd></div>
        </dl>
        <details className={styles.identificadores}><summary>Identificadores do registro</summary><dl className={styles.metadados}>
          <div><dt>Código da ação</dt><dd>{f.codigoAcao}</dd></div>
          <div><dt>Código do recurso</dt><dd>{f.codigoRecurso}</dd></div>
          <div><dt>ID do evento</dt><dd>{idAuditoria(evento.id)}</dd></div>
          <div><dt>{f.reordena ? "ID do patrimônio pai (reordenação)" : "ID do registro alvo"}</dt><dd>{idAuditoria(evento.entityId)}</dd></div>
          <div><dt>ID do responsável</dt><dd>{idAuditoria(evento.userId)}</dd></div>
          {!f.reordena && evento.registro && Object.hasOwn(evento.registro, "patrimonioId") &&
            <div><dt>Patrimônio relacionado (ID)</dt><dd>{idAuditoria(evento.registro.patrimonioId)}</dd></div>}
        </dl></details>
        <p className={styles.nota}>Nome e e-mail do responsável refletem o cadastro atual, não uma fotografia histórica.
          A seção deriva do recurso; não identifica sessão ou página navegada.</p>
        {f.aviso && <p>{f.aviso}</p>}
        {f.linhas.length > 0 && <div className={styles.rolagem} tabIndex={0} role="region" aria-label="Comparação de valores">
          <table className={`admin-table ${styles.comparacao}`}><caption>O que mudou? Valores registrados no evento</caption>
            <thead><tr><th scope="col">Campo</th><th scope="col">Anterior</th><th scope="col">Novo</th></tr></thead>
            <tbody>{f.linhas.map(l => <tr key={l.campo}><th scope="row">{l.campo}</th><td>{l.anterior}</td><td>{l.novo}</td></tr>)}</tbody>
          </table>
        </div>}
      </>}
  </dialog>;
}

export default function AdminAuditoria() {
  const [form, setForm] = useState(VAZIO);
  const [consulta, setConsulta] = useState({ filtros: {}, pagina: 1, revisao: 0 });
  const [resultado, setResultado] = useState(null);
  const [erroFiltro, setErroFiltro] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [pessoas, setPessoas] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState(null);
  const buscaAtual = useRef(null);
  useEffect(() => () => buscaAtual.current?.abort(), []);
  useEffect(() => {
    const c = new AbortController();
    listarAuditoria({ ...consulta.filtros, pagina: consulta.pagina, limite: LIMITE }, c.signal).then(data => {
      if (c.signal.aborted) return;
      if (consulta.pagina > Math.max(1, data.paginacao.totalPaginas)) {
        setConsulta(q => q === consulta ? { ...q, pagina: Math.max(1, data.paginacao.totalPaginas) } : q);
        return;
      }
      setResultado({ consulta, data });
    }).catch(e => { if (!c.signal.aborted) setResultado({ consulta, erro: erroAuditoria(e) }); });
    return () => c.abort();
  }, [consulta]);
  const carregando = resultado?.consulta !== consulta;
  const data = !carregando && !resultado.erro ? resultado.data : null;
  const alterar = (chave, valor) => setForm(f => ({ ...f, [chave]: valor }));
  function aplicar(e) {
    e.preventDefault();
    try { const filtros = filtrosAuditoria(form); setErroFiltro(""); setConsulta({ filtros, pagina: 1, revisao: 0 }); }
    catch (erro) { setErroFiltro(erro.message); }
  }
  async function buscarPessoas() {
    buscaAtual.current?.abort();
    const c = new AbortController(); buscaAtual.current = c;
    setBuscando(true); setErroBusca(null); setPessoas(null);
    try {
      const r = await listarUsuarios({ ...(busca.trim() && { busca: busca.trim() }), pagina: 1, limite: 20 }, c.signal);
      if (!c.signal.aborted) setPessoas(r);
    } catch (e) { if (!c.signal.aborted) setErroBusca(erroAuditoria(e)); }
    finally { if (!c.signal.aborted) setBuscando(false); }
  }
  function limpar() {
    buscaAtual.current?.abort(); setBuscando(false); setPessoas(null); setErroBusca(null); setBusca("");
    setForm(VAZIO); setErroFiltro(""); setConsulta({ filtros: {}, pagina: 1, revisao: 0 });
  }
  return <div className={styles.pagina}>
    <header className="admin-page-head"><h1>Histórico de alterações</h1>
      <p>Consulte as mudanças administrativas registradas. Datas e horários em America/Sao_Paulo.</p>
    </header>
    <form className={`admin-form ${styles.filtros}`} aria-label="Filtros do histórico" onSubmit={aplicar}>
      <div className={styles.grade}>
        <label>Data inicial<input type="date" value={form.inicio} onChange={e => alterar("inicio", e.target.value)} /></label>
        <label>Data final<input type="date" value={form.fim} onChange={e => alterar("fim", e.target.value)} /></label>
        <label>Tipo de ação<select value={form.action} onChange={e => alterar("action", e.target.value)}>
          <option value="">Todas as ações</option>{Object.entries(ACOES_AUDITORIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Seção/recurso<select value={form.entity} onChange={e => alterar("entity", e.target.value)}>
          <option value="">Todos os recursos</option>{Object.entries(RECURSOS_AUDITORIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
      </div>
      <fieldset className={styles.responsavel}><legend>Responsável pela ação</legend>
        <div className={styles.busca}>
          <label>Buscar responsável por nome ou e-mail<input type="search" maxLength={254} value={busca} onChange={e => setBusca(e.target.value)} /></label>
          <button type="button" className="btn-outline" onClick={buscarPessoas}>Buscar responsável</button>
        </div>
        {buscando && <p role="status">Buscando responsáveis…</p>}
        {erroBusca && <Falha erro={erroBusca} repetir={buscarPessoas} />}
        {pessoas && <>
          <label>Selecionar responsável<select value={pessoas.itens.some(p => p.id === form.userId) ? form.userId : ""} onChange={e => alterar("userId", e.target.value)}>
            <option value="">Selecionar ou limpar responsável</option>{pessoas.itens.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.email}</option>)}
          </select></label>
          <p className={styles.nota}>{pessoas.itens.length === 0 ? "Nenhum responsável encontrado." : `Até 20 opções por busca; ${pessoas.paginacao.total} resultados. Refine o nome se necessário.`}</p>
        </>}
        <label>Responsável (UUID, opcional)<input value={form.userId} maxLength={36} autoComplete="off" onChange={e => alterar("userId", e.target.value)} /></label>
      </fieldset>
      <details><summary>Filtro avançado de registro</summary>
        <label>ID do registro alvo (UUID)<input value={form.entityId} maxLength={36} autoComplete="off" onChange={e => alterar("entityId", e.target.value)} /></label>
      </details>
      {erroFiltro && <p role="alert">{erroFiltro}</p>}
      <div className="admin-form-acoes"><button className="btn-solid" type="submit">Aplicar filtros</button>
        <button className="btn-outline" type="button" onClick={limpar}>Limpar filtros</button></div>
    </form>
    <p className={styles.nota}>Responsáveis são identificados pelo cadastro atual. A seção indica o recurso alterado, não a página acessada.
      O histórico abrange as operações instrumentadas, sem reconstrução retroativa.</p>
    {carregando ? <p role="status">Carregando histórico…</p> : resultado.erro
      ? <Falha erro={resultado.erro} repetir={() => setConsulta(q => ({ ...q, revisao: q.revisao + 1 }))} />
      : <>
        <p role="status">{data.paginacao.total} alterações registradas{Object.keys(consulta.filtros).length ? " nos filtros aplicados" : ""}.</p>
        {data.itens.length === 0 ? <p className="empty-state">{Object.keys(consulta.filtros).length ? "Nenhuma alteração encontrada para estes filtros." : "Nenhuma alteração registrada."}</p>
          : <div className={styles.rolagem} tabIndex={0} role="region" aria-label="Lista de alterações">
            <table className={`admin-table ${styles.lista}`}><caption>Alterações em ordem fornecida pelo servidor, mais recentes primeiro</caption>
              <thead><tr><th scope="col">Responsável</th><th scope="col">Data e hora</th><th scope="col">Ação</th><th scope="col">Seção/recurso</th><th scope="col">Registro alvo</th><th scope="col">Detalhes</th></tr></thead>
              <tbody>{data.itens.map(e => <tr key={e.id}>
                <td>{responsavelAuditoria(e)}{e.user?.email && <small>{e.user.email}</small>}</td>
                <td><time dateTime={e.createdAt}>{dataHoraAuditoria(e.createdAt)}</time></td>
                <td>{acaoAuditoria(e)}</td><td>{recursoAuditoria(e)}</td><td>{alvoAuditoria(e).titulo}<small className={styles.identificador}>ID: {idAuditoria(e.entityId)}</small>
                  {["FATO_REORDER", "LIGACAO_REORDER"].includes(e.action) && <small>Patrimônio pai</small>}</td>
                <td><button type="button" className="btn-outline" aria-label={`Detalhes da alteração ${idAuditoria(e.id)}`} onClick={() => setSelecionado(e.id)}>Detalhes</button></td>
              </tr>)}</tbody>
            </table>
          </div>}
        {data.paginacao.totalPaginas > 0 && <nav className={styles.paginacao} aria-label="Paginação do histórico">
          <button className="btn-outline" disabled={consulta.pagina <= 1} onClick={() => setConsulta(q => ({ ...q, pagina: q.pagina - 1 }))}>Anterior</button>
          <span>Página {data.paginacao.pagina} de {data.paginacao.totalPaginas} · {data.paginacao.total} alterações</span>
          <button className="btn-outline" disabled={consulta.pagina >= data.paginacao.totalPaginas || consulta.pagina >= 1000000}
            onClick={() => setConsulta(q => ({ ...q, pagina: q.pagina + 1 }))}>Próxima</button>
        </nav>}
      </>}
    {selecionado && <DetalheAuditoria key={selecionado} id={selecionado} fechar={() => setSelecionado(null)} />}
  </div>;
}
