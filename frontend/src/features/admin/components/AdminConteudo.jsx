import { useCallback, useEffect, useState } from "react";
import { PencilIcon, TrashIcon, CheckBadgeIcon, ArchiveBoxArrowDownIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import { useErroModal } from "../../../hooks/useErroModal";
import { extrairMensagemDeErro, validarArquivoImagem } from "../../../services/adminApi";

const STATUS = { RASCUNHO: "Rascunho", PUBLICADO: "Publicado", ARQUIVADO: "Arquivado" };
const CAMPOS_EXPO = [
  ["titulo", "Título", true, 200], ["artista", "Artista", true, 200],
  ["local", "Local", true, 250], ["periodo", "Período", true, 200],
  ["bio", "Biografia", true, 20000, "textarea"], ["ctaSaibaMais", "Link para saber mais", false, 2000, "url"],
];
const CAMPOS_NOVIDADE = [
  ["titulo", "Título", true, 200], ["tag", "Tag", true, 100],
  ["data", "Data", true, 10, "date"], ["resumo", "Resumo", false, 2000, "textarea"],
  ["texto", "Texto", true, 20000, "textarea"], ["quando", "Quando", false, 250],
  ["local", "Local", false, 250], ["blocoDia", "Dia no bloco", false, 30],
  ["blocoMes", "Mês no bloco", false, 30], ["blocoLegenda", "Legenda do bloco", false, 150],
  ["ctaRotulo", "Texto do botão", false, 150], ["ctaUrl", "Link do botão", false, 2000, "url"],
];
function formularioInicial(item = {}) {
  return { ...item, tipo: item.tipo || "NOTICIA",
    blocoDia: item.bloco?.dia || "", blocoMes: item.bloco?.mes || "", blocoLegenda: item.bloco?.legenda || "",
    ctaRotulo: item.cta?.rotulo || "", ctaUrl: item.cta?.url || "",
    fontes: (item.fontes ?? []).map((f) => ({ ...f })), removerImagem: false,
  };
}
export default function AdminConteudo({ tipo, api }) {
  const novidade = tipo === "novidades";
  const titulo = novidade ? "Novidades" : "Exposições";
  const campos = novidade ? CAMPOS_NOVIDADE : CAMPOS_EXPO;
  const { usuario } = useAuth();
  const { mostrarErro } = useErroModal();
  const admin = usuario?.perfil === "ADMIN";
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formularioInicial);
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [filtro, setFiltro] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try { setItens(await api.listar()); setErro(""); }
    catch (error) { setErro(extrairMensagemDeErro(error)); }
    finally { setCarregando(false); }
  }, [api]);
  useEffect(() => {
    let ativo = true;
    api.listar().then(
      (lista) => { if (ativo) { setItens(lista); setErro(""); setCarregando(false); } },
      (error) => { if (ativo) { setErro(extrairMensagemDeErro(error)); setCarregando(false); } },
    );
    return () => { ativo = false; };
  }, [api]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const alterar = (nome, valor) => setForm((anterior) => ({ ...anterior, [nome]: valor }));
  function abrir(item) {
    setFormKey((key) => key + 1);
    setForm(formularioInicial(item));
    setEditando(item?.id || "novo");
    setArquivo(null); setPreview(""); setErroForm(""); setSucesso("");
  }
  async function editar(id) {
    setOcupado(true);
    try { abrir(await api.detalhe(id)); }
    catch (error) { mostrarErro(error, { origem: titulo }); }
    finally { setOcupado(false); }
  }
  function selecionarImagem(event) {
    const nova = event.target.files?.[0] || null;
    const problema = nova && validarArquivoImagem(nova);
    if (problema) { setErroForm(problema); setArquivo(null); setPreview(""); event.target.value = ""; return; }
    setArquivo(nova); setPreview(nova ? URL.createObjectURL(nova) : ""); setErroForm("");
    if (nova) alterar("removerImagem", false);
  }
  async function salvar(event) {
    event.preventDefault();
    if (!novidade && editando === "novo" && !arquivo) { setErroForm("Envie a imagem da exposição."); return; }
    if (novidade && Boolean(form.ctaRotulo?.trim()) !== Boolean(form.ctaUrl?.trim())) {
      setErroForm("Preencha o texto e o link do botão juntos."); return;
    }
    setOcupado(true); setErroForm(""); setSucesso("");
    const dados = Object.fromEntries(campos.filter(([nome]) => !nome.startsWith("bloco") && !nome.startsWith("cta") || nome === "ctaSaibaMais")
      .map(([nome]) => [nome, (form[nome] || "").trim()]));
    if (novidade) {
      Object.assign(dados, {
        tipo: form.tipo,
        bloco: { dia: form.blocoDia.trim(), mes: form.blocoMes.trim(), legenda: form.blocoLegenda.trim() },
        cta: form.ctaUrl?.trim() ? { rotulo: form.ctaRotulo.trim(), url: form.ctaUrl.trim() } : null,
        fontes: form.fontes.map((fonte) => ({ veiculo: fonte.veiculo.trim(), assunto: (fonte.assunto || "").trim(), url: fonte.url.trim() })),
        ...(form.removerImagem && editando !== "novo" && { imagemUrl: null }),
      });
    }
    try {
      if (editando === "novo") await api.criar(dados, arquivo);
      else await api.atualizar(editando, dados, arquivo);
      setEditando(null); setArquivo(null); setPreview(""); setSucesso("Conteúdo salvo.");
      await carregar();
    } catch (error) { setErroForm(extrairMensagemDeErro(error)); mostrarErro(error, { origem: titulo }); }
    finally { setOcupado(false); }
  }
  async function executar(acao, item) {
    if (!window.confirm(`${{ publicar: "Publicar", arquivar: "Arquivar", excluir: "Excluir definitivamente" }[acao]} “${item.titulo}”?`)) return;
    setOcupado(true); setSucesso("");
    try {
      await api[acao](item.id);
      if (editando === item.id) { setEditando(null); setArquivo(null); setPreview(""); }
      setSucesso("Operação concluída."); await carregar();
    } catch (error) { mostrarErro(error, { origem: titulo }); }
    finally { setOcupado(false); }
  }
  const imagem = arquivo ? preview : form.removerImagem ? "" : form.imagemUrl;
  const visiveis = itens.filter((item) => (!filtro || item.status === filtro) && item.titulo.toLocaleLowerCase().includes(busca.toLocaleLowerCase()));
  return <div>
    <div className="admin-page-head admin-page-head-row"><div><h1>{titulo}</h1><p>Cadastre, revise e publique o conteúdo do portal.</p></div>
      <button className="btn-solid" type="button" disabled={ocupado} onClick={() => abrir()}>Novo conteúdo</button></div>
    {sucesso && <p role="status">{sucesso}</p>}
    {editando && <form className="admin-form" onSubmit={salvar}>
      <h2>{editando === "novo" ? "Novo conteúdo" : "Editar conteúdo"}</h2>
      <fieldset disabled={ocupado} style={{ border: 0, padding: 0 }}>
        <div className="admin-form-grid">
          {novidade && <label>Tipo<select value={form.tipo} onChange={(e) => alterar("tipo", e.target.value)}><option value="NOTICIA">Notícia</option><option value="EVENTO">Evento</option></select></label>}
          {campos.map(([nome, rotulo, obrigatorio, max, tipoCampo = "text"]) => <label key={nome} className={tipoCampo === "textarea" ? "admin-form-col-2" : ""}>{rotulo}
            {tipoCampo === "textarea" ? <textarea rows={4} required={obrigatorio || (nome === "resumo" && form.tipo === "NOTICIA")} maxLength={max} value={form[nome] || ""} onChange={(e) => alterar(nome, e.target.value)} />
              : <input type={tipoCampo} required={obrigatorio} maxLength={max} value={form[nome] || ""} onChange={(e) => alterar(nome, e.target.value)} />}</label>)}
          <label className="admin-form-col-2">Imagem {!novidade && editando === "novo" ? "(obrigatória)" : "(opcional)"}
            <input key={formKey} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selecionarImagem} required={!novidade && editando === "novo"} /></label>
          {imagem && <div className="admin-form-col-2"><img src={imagem} alt="Prévia da imagem" style={{ maxWidth: "100%", width: 280, maxHeight: 220, objectFit: "contain" }} /></div>}
          {novidade && form.imagemUrl && !arquivo && <label><input type="checkbox" checked={form.removerImagem} onChange={(e) => alterar("removerImagem", e.target.checked)} /> Remover imagem atual</label>}
          {novidade && <div className="admin-form-col-2"><h3>Fontes</h3>
            {form.fontes.map((fonte, index) => <div className="admin-form-grid" key={index}>
              {[["veiculo", "Veículo"], ["assunto", "Assunto"], ["url", "URL"]].map(([nome, label]) => <label key={nome}>{label}<input type={nome === "url" ? "url" : "text"} required={nome !== "assunto"} maxLength={nome === "veiculo" ? 200 : nome === "assunto" ? 500 : 2000} value={fonte[nome] || ""} onChange={(e) => alterar("fontes", form.fontes.map((f, i) => i === index ? { ...f, [nome]: e.target.value } : f))} /></label>)}
              <button className="btn-outline" type="button" onClick={() => alterar("fontes", form.fontes.filter((_, i) => i !== index))}>Remover fonte</button>
            </div>)}
            <button className="btn-outline" type="button" disabled={form.fontes.length >= 50} onClick={() => alterar("fontes", [...form.fontes, { veiculo: "", assunto: "", url: "" }])}>Adicionar fonte</button>
          </div>}
        </div>
      </fieldset>
      {erroForm && <p className="admin-form-erro" role="alert">{erroForm}</p>}
      <div className="admin-form-acoes"><button className="btn-solid" disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar"}</button><button className="btn-outline" type="button" disabled={ocupado} onClick={() => { setEditando(null); setArquivo(null); setPreview(""); }}>Cancelar</button></div>
    </form>}
    <div className="admin-form admin-form-grid"><label>Buscar título<input value={busca} onChange={(e) => setBusca(e.target.value)} /></label><label>Status<select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todos</option>{Object.entries(STATUS).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}</select></label></div>
    {carregando ? <p role="status">Carregando…</p> : erro ? <div role="alert"><p>{erro}</p><button className="btn-outline" onClick={carregar}>Tentar novamente</button></div>
      : !visiveis.length ? <p className="empty-state">Nenhum conteúdo encontrado.</p> : <div style={{ overflowX: "auto" }}><table className="admin-table">
        <thead><tr><th>Título</th><th>Status</th><th>Ações</th></tr></thead><tbody>{visiveis.map((item) => <tr key={item.id}>
          <td>{item.titulo}</td><td><span className={`admin-status admin-status--${item.status}`}>{STATUS[item.status]}</span></td>
          <td><div className="admin-table-acoes">
            {(admin || item.status === "RASCUNHO") && <button type="button" disabled={ocupado} title="Editar" aria-label={`Editar ${item.titulo}`} onClick={() => editar(item.id)}><PencilIcon width={18} /></button>}
            {admin && <><button type="button" disabled={ocupado || item.status === "PUBLICADO"} title="Publicar" aria-label={`Publicar ${item.titulo}`} onClick={() => executar("publicar", item)}><CheckBadgeIcon width={18} /></button>
              <button type="button" disabled={ocupado || item.status === "ARQUIVADO"} title="Arquivar" aria-label={`Arquivar ${item.titulo}`} onClick={() => executar("arquivar", item)}><ArchiveBoxArrowDownIcon width={18} /></button>
              <button type="button" disabled={ocupado} title="Excluir" aria-label={`Excluir ${item.titulo}`} onClick={() => executar("excluir", item)}><TrashIcon width={18} /></button></>}
          </div></td></tr>)}</tbody></table></div>}
  </div>;
}
