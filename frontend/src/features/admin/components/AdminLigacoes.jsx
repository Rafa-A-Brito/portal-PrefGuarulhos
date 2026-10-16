import { useEffect, useId, useRef, useState } from "react";
import * as api from "../../../services/ligacoesApi";
import "./AdminLigacoes.css";

// Apenas filtro de seleção/UX. O backend valida identidade e permissão novamente.
const legados = new Set([
  "casarao-da-nossa-historia", "casarao-do-sitio-ponte-alta",
  "7ef1d2a6-cb0e-4827-b8e3-378877a2aec5", "c6d445ab-7259-4196-b422-26d2a5069858",
]);
const statusNome = { PUBLICADO: "Publicado", RASCUNHO: "Rascunho", ARQUIVADO: "Arquivado" };
function mensagemErro(err) {
  const status = err.response?.status;
  return ({
    400: "Confira o texto (até 2.000 caracteres) e o destino. Não é possível relacionar um patrimônio a ele mesmo.",
    401: "Sua sessão expirou. Entre novamente para continuar.",
    403: "Você não tem permissão para esta ação. Editores só podem editar ligações de origens em rascunho. Reabra a ficha para conferir o status atual.",
    404: "O patrimônio ou a ligação não está mais disponível. Atualize as ligações ou reabra a ficha.",
    409: "Não foi possível salvar: o destino pode já estar relacionado, ser uma identidade consolidada ou a ordem ter mudado. Não são permitidas autorrelações. Atualize as ligações antes de tentar novamente.",
  })[status] ?? "Não foi possível concluir a operação. Tente novamente em instantes.";
}

export default function AdminLigacoes({ patrimonioId, status, perfil, bloqueado = false, onBusyChange }) {
  const uid = useId();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [revisao, setRevisao] = useState(0);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [indisponivel, setIndisponivel] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [ordem, setOrdem] = useState(null);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");
  const [destino, setDestino] = useState(null);
  const operacao = useRef(false), campoTexto = useRef(null), titulo = useRef(null);
  const permitido = perfil === "ADMIN" || (perfil === "EDITOR" && status === "RASCUNHO");
  const travado = bloqueado || ocupado || carregando || indisponivel || !permitido;
  const exibidos = ordem ?? lista;
  const elegivel = p => p?.id && p.nome && p.id !== patrimonioId &&
    !legados.has(p.id) && !legados.has(p.slug) &&
    ["PUBLICADO", "RASCUNHO"].includes(p.status) &&
    !lista.some(l => (l.patrimonioDestinoId ?? l.destino?.id) === p.id);

  useEffect(() => {
    const controller = new AbortController();
    api.listarLigacoes(patrimonioId, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setLista(items); setIndisponivel(false); setErro(""); setCarregando(false);
    }).catch(err => {
      if (controller.signal.aborted) return;
      setErro(mensagemErro(err)); setIndisponivel(true); setCarregando(false);
    });
    return () => controller.abort();
  }, [patrimonioId, revisao]);

  useEffect(() => {
    if (!busca) return;
    const controller = new AbortController();
    api.buscarDestinos(busca.termo, busca.pagina, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setResultados(data.itens); setTotalPaginas(data.paginacao?.totalPaginas ?? 1); setBuscando(false);
    }).catch(err => {
      if (controller.signal.aborted) return;
      setErroBusca(mensagemErro(err)); setBuscando(false);
    });
    return () => controller.abort();
  }, [busca]);

  function pesquisar(pagina = 1) {
    if (!termo.trim() || travado) return;
    setErroBusca(""); setResultados([]); setBuscando(true); setDestino(null);
    setBusca({ termo: termo.trim(), pagina });
  }
  function limparEdicao() { setEditando(null); setDestino(null); setTexto(""); }
  function atualizar() {
    if (ocupado || bloqueado) return;
    setCarregando(true); setErro(""); setSucesso(""); setOrdem(null); setExcluindo(null);
    limparEdicao(); setRevisao(n => n + 1);
  }
  async function executar(fn, mensagem) {
    if (travado || operacao.current) return;
    operacao.current = true; setOcupado(true); onBusyChange?.(true); setErro(""); setSucesso("");
    try { await fn(); setSucesso(mensagem); }
    catch (err) {
      setErro(mensagemErro(err));
      if ([401, 403, 404, 409].includes(err.response?.status)) setIndisponivel(true);
    } finally { operacao.current = false; setOcupado(false); onBusyChange?.(false); }
  }
  function salvar(event) {
    event.preventDefault();
    if (ordem || !texto.trim() || texto.trim().length > 2000 || (!editando && !elegivel(destino))) return;
    executar(async () => {
      if (editando) {
        const salvo = await api.editarLigacao(patrimonioId, editando.id, texto.trim());
        setLista(items => items.map(l => l.id === salvo.id ? salvo : l));
      } else {
        const salvo = await api.criarLigacao(patrimonioId, destino.id, texto.trim());
        setLista(items => [...items, salvo]);
      }
      limparEdicao();
    }, editando ? "Texto da ligação atualizado." : "Ligação adicionada.");
  }
  function mover(index, delta) {
    const next = [...exibidos];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setOrdem(next); setSucesso(""); setExcluindo(null);
  }

  return <section className="admin-form admin-ligacoes" aria-labelledby={`${uid}-titulo`} aria-busy={ocupado || carregando}>
    <h2 id={`${uid}-titulo`} tabIndex={-1} ref={titulo}>Patrimônios relacionados</h2>
    <p>As ligações são salvas separadamente dos demais dados do patrimônio.</p>
    {!permitido && <p>Somente ADMIN pode editar ligações em qualquer status. EDITOR pode editar apenas origens em rascunho.</p>}
    {carregando && <p role="status">Carregando ligações…</p>}
    {erro && <p role="alert" className="admin-form-erro">{erro}</p>}
    {sucesso && <p role="status">{sucesso}</p>}
    <button type="button" className="btn-outline" disabled={ocupado || bloqueado || carregando} onClick={atualizar}>Atualizar ligações</button>
    {!carregando && !erro && lista.length === 0 && <p>Nenhuma ligação cadastrada.</p>}
    <ol className="admin-ligacoes-lista">
      {exibidos.map((l, index) => <li key={l.id}>
        <h3>{l.destino?.nome ?? "Destino indisponível"}</h3>
        <span className="admin-ligacoes-status">{statusNome[l.destino?.status] ?? "Status indisponível"}</span>
        <p>{l.texto}</p>
        {permitido && <div className="admin-ligacoes-acoes">
          <button type="button" disabled={travado || !!ordem || !!editando} onClick={() => {
            setEditando(l); setTexto(l.texto); setExcluindo(null); setSucesso(""); campoTexto.current?.focus();
          }} aria-label={`Editar relação com ${l.destino?.nome ?? "destino indisponível"}`}>Editar texto</button>
          <button type="button" disabled={travado || !!ordem || !!editando} onClick={() => setExcluindo(l.id)} aria-label={`Excluir relação com ${l.destino?.nome ?? "destino indisponível"}`}>Excluir ligação</button>
          <button type="button" disabled={travado || index === 0 || !!editando} onClick={() => mover(index, -1)} aria-label={`Mover ${l.destino?.nome} para cima`}>Mover para cima</button>
          <button type="button" disabled={travado || index === exibidos.length - 1 || !!editando} onClick={() => mover(index, 1)} aria-label={`Mover ${l.destino?.nome} para baixo`}>Mover para baixo</button>
        </div>}
        {excluindo === l.id && <div role="group" aria-label="Confirmar exclusão da ligação">
          <p>Excluir esta ligação? O patrimônio relacionado será preservado.</p>
          <div className="admin-ligacoes-acoes">
            <button type="button" disabled={travado} onClick={() => executar(async () => {
              await api.excluirLigacao(patrimonioId, l.id);
              setLista(items => items.filter(item => item.id !== l.id)); setExcluindo(null); titulo.current?.focus();
            }, "Ligação excluída. O patrimônio foi preservado.")}>Confirmar exclusão</button>
            <button type="button" disabled={ocupado} onClick={() => setExcluindo(null)}>Cancelar exclusão</button>
          </div>
        </div>}
      </li>)}
    </ol>
    {ordem && <div>
      <p role="status">Ordem ainda não salva. Salve ou cancele antes de editar as ligações.</p>
      <div className="admin-ligacoes-acoes">
        <button type="button" disabled={travado} onClick={() => executar(async () => {
          const items = await api.ordenarLigacoes(patrimonioId, ordem.map(l => l.id));
          setLista(items); setOrdem(null);
        }, "Ordem das ligações salva.")}>Salvar ordem</button>
        <button type="button" disabled={ocupado} onClick={() => setOrdem(null)}>Cancelar ordem</button>
      </div>
    </div>}
    {permitido && <>
      <form onSubmit={event => { event.preventDefault(); pesquisar(); }}>
        <fieldset disabled={travado || !!ordem || !!editando}>
          <legend>Adicionar ligação</legend>
          <label htmlFor={`${uid}-busca`}>Buscar patrimônio relacionado</label>
          <div className="admin-ligacoes-acoes">
            <input id={`${uid}-busca`} value={termo} maxLength={200} onChange={event => {
              setTermo(event.target.value); setBusca(null); setResultados([]); setDestino(null); setBuscando(false); setErroBusca("");
            }} />
            <button type="submit" disabled={!termo.trim() || buscando}>Buscar patrimônios</button>
          </div>
          {buscando && <p role="status">Buscando destinos…</p>}
          {erroBusca && <p role="alert">{erroBusca}</p>}
          {busca && !buscando && !erroBusca && <>
            <p>Resultados: página {busca.pagina} de {Math.max(totalPaginas, 1)}. O próprio patrimônio, arquivados, legados e destinos já relacionados são omitidos.</p>
            {!resultados.some(elegivel) && <p>Nenhum destino disponível nesta página.</p>}
            {resultados.filter(elegivel).map(p => <label className="admin-ligacoes-opcao" key={p.id}>
              <input type="radio" name={`${uid}-destino`} checked={destino?.id === p.id} onChange={() => setDestino(p)} />
              <span>{p.nome} — {statusNome[p.status]}<small>{p.slug}</small></span>
            </label>)}
            <div className="admin-ligacoes-acoes">
              <button type="button" disabled={busca.pagina <= 1} onClick={() => pesquisar(busca.pagina - 1)}>Página anterior de destinos</button>
              <button type="button" disabled={busca.pagina >= totalPaginas} onClick={() => pesquisar(busca.pagina + 1)}>Próxima página de destinos</button>
            </div>
          </>}
        </fieldset>
      </form>
      <form onSubmit={salvar}>
        <fieldset disabled={travado || !!ordem}>
          <legend>{editando ? "Editar ligação" : "Nova ligação"}</legend>
          <p>Patrimônio relacionado: {editando?.destino?.nome ?? destino?.nome ?? "Selecione um resultado da busca."}</p>
          <label htmlFor={`${uid}-texto`}>Texto da relação</label>
          <textarea id={`${uid}-texto`} ref={campoTexto} rows={3} maxLength={2000} required value={texto} onChange={event => setTexto(event.target.value)} />
          <div className="admin-ligacoes-acoes">
            <button type="submit" disabled={!texto.trim() || (!editando && !elegivel(destino))}>{editando ? "Salvar texto da ligação" : "Adicionar ligação"}</button>
            {editando && <button type="button" onClick={limparEdicao}>Cancelar edição da ligação</button>}
          </div>
        </fieldset>
      </form>
    </>}
  </section>;
}
