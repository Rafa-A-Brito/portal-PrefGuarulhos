import { useEffect, useRef, useState } from "react";
import { listarRegioesAtivasAdmin, criarRegiao, erroRegiao } from "../../../services/regioesApi";
import "./OrganizacaoEditorial.css";

const NOVA = { nome: "", slug: "", descricao: "", ativo: true };
const PADRAO_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Sugestão de slug a partir do nome (o usuário pode editar). "Praça Brasil" -> "praca-brasil".
function sugerirSlug(nome) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");

/**
 * Esta seção vive DENTRO do <form> de Patrimônios: o cadastro rápido de região
 * é um grupo de campos (sem <form> aninhado) e Enter nele não envia o formulário
 * do patrimônio. `podeCriarRegiao` (somente ADMIN) vem da página; o backend
 * continua sendo a autoridade de permissão.
 */
export default function OrganizacaoEditorial({ formulario, atualizar, podeCriarRegiao = false, onBusyChange, onDirtyChange }) {
  const [regioes, setRegioes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [painelAberto, setPainelAberto] = useState(false);
  const [nova, setNova] = useState(NOVA);
  const [slugEditado, setSlugEditado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState("");
  const [aviso, setAviso] = useState("");
  const nomeRef = useRef(null);
  const abrirRef = useRef(null);
  const selectRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    listarRegioesAtivasAdmin(controller.signal).then(rows => {
      if (!controller.signal.aborted) { setRegioes(rows); setErro(""); }
    }).catch(error => {
      if (!controller.signal.aborted) setErro(erroRegiao(error));
    }).finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [tentativa]);
  useEffect(() => { if (painelAberto) nomeRef.current?.focus(); }, [painelAberto]);
  const sujo = painelAberto && (nova.nome !== "" || nova.slug !== "" || nova.descricao !== "" || !nova.ativo);
  useEffect(() => { onDirtyChange?.(sujo); }, [sujo, onDirtyChange]);

  const atual = formulario.regiaoAtual;
  const foraDoCatalogo = atual && !regioes.some(r => r.id === atual.id);

  function abrir() { setNova(NOVA); setSlugEditado(false); setErroCadastro(""); setAviso(""); setPainelAberto(true); }
  function fechar() {
    setPainelAberto(false); setErroCadastro("");
    setTimeout(() => abrirRef.current?.focus(), 0);
  }
  function mudarNome(nome) {
    setNova(n => ({ ...n, nome, slug: slugEditado ? n.slug : sugerirSlug(nome) }));
  }
  async function salvarRegiao() {
    if (salvando) return;
    const nome = nova.nome.trim(); const slug = nova.slug.trim();
    if (!nome) { setErroCadastro("Informe o nome da região."); nomeRef.current?.focus(); return; }
    if (!slug || slug.length > 120 || !PADRAO_SLUG.test(slug)) {
      setErroCadastro("Informe um slug com letras minúsculas, números e hífens (ex.: centro-historico)."); return;
    }
    setSalvando(true); setErroCadastro("");
    onBusyChange?.(true);
    try {
      const criada = await criarRegiao({ nome, slug, descricao: nova.descricao.trim() || null, ativo: nova.ativo });
      if (criada.ativo !== false) {
        setRegioes(atuais => [...atuais.filter(r => r.id !== criada.id), criada].sort(porNome));
        atualizar("regiaoId", criada.id); // só o campo região muda; o resto do formulário fica como está
        setAviso(`Região "${criada.nome}" cadastrada e selecionada.`);
        setPainelAberto(false);
        setTimeout(() => selectRef.current?.focus(), 0);
      } else {
        setAviso(`Região "${criada.nome}" cadastrada como inativa; ela não pode ser atribuída a patrimônios até ser reativada em Regiões.`);
        setPainelAberto(false);
        setTimeout(() => abrirRef.current?.focus(), 0);
      }
    } catch (error) {
      setErroCadastro(erroRegiao(error)); // mantém o painel aberto com o que foi digitado
    } finally { setSalvando(false); onBusyChange?.(false); }
  }
  // Enter num campo do cadastro rápido salva a região, não o patrimônio.
  function teclaNoCadastro(e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") { e.preventDefault(); salvarRegiao(); }
    else if (e.key === "Escape") { e.stopPropagation(); if (!salvando) fechar(); }
  }

  return <fieldset className="admin-form-col-2 organizacao-editorial">
    <legend>Organização editorial</legend>
    <p className="admin-ajuda">Classificação e apresentação no portal. Estes campos não alteram o endereço ou a rota.</p>
    <div className="organizacao-editorial-regiao">
      <label>Região
        <select ref={selectRef} value={formulario.regiaoId} onChange={e => atualizar("regiaoId", e.target.value)} disabled={carregando || !!erro}>
          <option value="">Não informada</option>
          {foraDoCatalogo && <option value={atual.id} disabled>{atual.nome} ({atual.ativo === false ? "inativa — vínculo atual" : "vínculo atual"})</option>}
          {regioes.map(r => <option key={r.id} value={r.id}>{r.nome} — {r.slug}</option>)}
        </select>
      </label>
      {podeCriarRegiao && <button type="button" ref={abrirRef} className="btn-outline organizacao-editorial-nova" aria-expanded={painelAberto} aria-controls="organizacao-nova-regiao" disabled={carregando || !!erro || painelAberto} onClick={abrir}>+ Nova região</button>}
    </div>
    {carregando && <p role="status">Carregando regiões…</p>}
    {aviso && <p role="status" className="organizacao-editorial-aviso">{aviso}</p>}
    {!carregando && !erro && regioes.length === 0 && <p className="admin-ajuda">Nenhuma região ativa cadastrada. A classificação pode ficar vazia{podeCriarRegiao ? " ou você pode cadastrar uma região agora." : "."}</p>}
    {erro && <div role="alert" className="admin-form-erro">{erro} <button type="button" className="btn-outline" onClick={() => { setCarregando(true); setTentativa(t => t + 1); }}>Tentar carregar regiões novamente</button></div>}
    {podeCriarRegiao && painelAberto && <div id="organizacao-nova-regiao" role="group" aria-labelledby="organizacao-nova-regiao-titulo" className="organizacao-editorial-painel" onKeyDown={teclaNoCadastro}>
      <h3 id="organizacao-nova-regiao-titulo">Nova região</h3>
      <label>Nome da região
        <input ref={nomeRef} maxLength={100} value={nova.nome} disabled={salvando} onChange={e => mudarNome(e.target.value)} />
      </label>
      <label>Slug da região
        <input maxLength={120} value={nova.slug} disabled={salvando} onChange={e => { setSlugEditado(true); setNova(n => ({ ...n, slug: e.target.value })); }} aria-describedby="organizacao-slug-ajuda" />
      </label>
      <p id="organizacao-slug-ajuda" className="admin-ajuda">Identificador público com letras minúsculas, números e hífens. Não muda depois de criado.</p>
      <label>Descrição (opcional)
        <textarea maxLength={2000} rows={3} value={nova.descricao} disabled={salvando} onChange={e => setNova(n => ({ ...n, descricao: e.target.value }))} />
      </label>
      <label className="organizacao-editorial-check">
        <input type="checkbox" checked={nova.ativo} disabled={salvando} onChange={e => setNova(n => ({ ...n, ativo: e.target.checked }))} />Região ativa
      </label>
      {erroCadastro && <p role="alert" className="admin-form-erro">{erroCadastro}</p>}
      <div className="admin-form-acoes">
        <button type="button" className="btn-solid" disabled={salvando} onClick={salvarRegiao}>{salvando ? "Salvando…" : "Salvar região"}</button>
        <button type="button" className="btn-outline" disabled={salvando} onClick={fechar}>Cancelar</button>
      </div>
    </div>}
    <div className="organizacao-editorial-numeros">
      <div className="organizacao-editorial-campo">
        <label>Número de exibição
          <input type="number" min="1" max="2147483647" step="1" value={formulario.numeroExibicao} onChange={e => atualizar("numeroExibicao", e.target.value)} aria-describedby="numero-editorial-ajuda" />
        </label>
        <p id="numero-editorial-ajuda" className="admin-ajuda">Número apresentado ao visitante. Não é o número do endereço. Se estiver vazio ao publicar, recebe o próximo número disponível.</p>
      </div>
      <div className="organizacao-editorial-campo">
        <label>Ordem de exibição
          <input type="number" min="0" max="2147483647" step="1" value={formulario.ordemExibicao} onChange={e => atualizar("ordemExibicao", e.target.value)} aria-describedby="ordem-editorial-ajuda" />
        </label>
        <p id="ordem-editorial-ajuda" className="admin-ajuda">Menores valores aparecem primeiro; zero é válido. Empates usam nome. Se estiver vazia ao publicar, recebe a próxima ordem disponível.</p>
      </div>
    </div>
  </fieldset>;
}
