import { useEffect, useState } from "react";
import { PlusIcon, ShieldCheckIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { useErroModal } from "../../../hooks/useErroModal";
import { useAuth } from "../../../hooks/useAuth";
import * as adminApi from "../../../services/adminApi";

const FORMULARIO_VAZIO = { nome: "", email: "", password: "", role: "EDITOR" };
const ROTULO_PERFIL = { ADMIN: "Administrador", EDITOR: "Editor" };
const LIMITE = 20;

export default function AdminUsuarios() {
  const { mostrarErro } = useErroModal();
  const { usuario, atualizarUsuario } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({ busca: "", role: "", ativo: "" });
  const [revisao, setRevisao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [abrindo, setAbrindo] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(null);
  const ocupado = salvando || abrindo || alterandoStatus !== null;
  const propriaConta = editando?.id === usuario?.id;

  useEffect(() => {
    const controller = new AbortController();
    const params = { pagina, limite: LIMITE };
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== "") params[campo] = valor;
    }
    adminApi.listarUsuarios(params, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        // Um filtro/status alterado pode remover o último item desta página.
        if (pagina > Math.max(1, data.paginacao.totalPaginas)) {
          setPagina(Math.max(1, data.paginacao.totalPaginas));
          return;
        }
        setUsuarios(data.itens);
        setPaginacao(data.paginacao);
        setErroLista(null);
        setCarregando(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setErroLista(adminApi.extrairMensagemDeErro(err));
        setCarregando(false);
      });
    return () => controller.abort();
  }, [filtros, pagina, revisao]);

  function recarregar() {
    setCarregando(true);
    setErroLista(null);
    setRevisao((atual) => atual + 1);
  }

  function filtrar(campo, valor) {
    setCarregando(true);
    setErroLista(null);
    setPagina(1);
    setFiltros((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function mudarPagina(nova) {
    setCarregando(true);
    setPagina(nova);
  }

  function abrir() {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setAberto(true);
  }

  async function editar(id) {
    setAbrindo(true);
    try {
      const atual = await adminApi.buscarUsuario(id);
      setEditando(atual);
      setFormulario({ nome: atual.nome, email: atual.email, role: atual.role });
      setErroFormulario(null);
      setAberto(true);
    } catch (err) {
      mostrarErro(err, { origem: "AdminUsuarios › editar" });
    } finally {
      setAbrindo(false);
    }
  }

  function fechar() {
    setAberto(false);
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
  }

  async function salvar(event) {
    event.preventDefault();
    setErroFormulario(null);
    if (!editando && Array.from(formulario.password).length < 12) {
      setErroFormulario("A senha deve ter pelo menos 12 caracteres.");
      return;
    }
    if (!editando && new TextEncoder().encode(formulario.password).length > 72) {
      setErroFormulario("A senha deve ter no máximo 72 bytes.");
      return;
    }
    setSalvando(true);
    try {
      const dados = { nome: formulario.nome.trim(), email: formulario.email.trim(), role: formulario.role };
      if (editando) {
        const atualizado = await adminApi.atualizarUsuario(editando.id, dados);
        if (atualizado.id === usuario?.id) atualizarUsuario(atualizado);
      } else {
        await adminApi.criarUsuario({ ...dados, password: formulario.password });
      }
      fechar();
      recarregar();
    } catch (err) {
      if ([400, 409].includes(err.response?.status)) {
        setErroFormulario(adminApi.extrairMensagemDeErro(err));
      } else {
        mostrarErro(err, { origem: "AdminUsuarios › salvar" });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(conta) {
    if (conta.id === usuario?.id && conta.ativo) return;
    if (conta.ativo && !window.confirm(`Desativar ${conta.nome}? Essa pessoa perderá o acesso ao painel imediatamente.`)) return;
    setAlterandoStatus(conta.id);
    try {
      await adminApi.alterarStatusUsuario(conta.id, !conta.ativo);
      recarregar();
    } catch (err) {
      mostrarErro(err, { origem: "AdminUsuarios › alterar status" });
    } finally {
      setAlterandoStatus(null);
    }
  }

  return (
    <div className="admin-usuarios">
      <div className="admin-page-head admin-page-head-row">
        <div><h1>Usuários</h1><p>Gerencie os dados, o perfil e o acesso ao painel.</p></div>
        <button type="button" className="btn-solid" onClick={abrir} disabled={ocupado}>
          <PlusIcon width={16} height={16} /> Novo usuário
        </button>
      </div>
      {aberto && (
        <form className="admin-form" onSubmit={salvar}>
          <h2>{editando ? "Editar usuário" : "Novo usuário"}</h2>
          <fieldset className="admin-usuarios-campos" disabled={ocupado}>
            <div className="admin-form-grid">
              <label>Nome
                <input required maxLength={100} autoComplete="off" value={formulario.nome}
                  onChange={(e) => setFormulario((f) => ({ ...f, nome: e.target.value }))} />
              </label>
              <label>E-mail
                <input type="email" required maxLength={254} autoComplete="off" value={formulario.email}
                  onChange={(e) => setFormulario((f) => ({ ...f, email: e.target.value }))} />
              </label>
              {!editando && <label>Senha
                <input type="password" required autoComplete="new-password" placeholder="Mínimo de 12 caracteres"
                  value={formulario.password} onChange={(e) => setFormulario((f) => ({ ...f, password: e.target.value }))} />
              </label>}
              <label>Perfil
                <select value={formulario.role} disabled={propriaConta}
                  aria-describedby={propriaConta ? "aviso-proprio-perfil" : undefined}
                  onChange={(e) => setFormulario((f) => ({ ...f, role: e.target.value }))}>
                  <option value="EDITOR">Editor (edita rascunhos)</option>
                  <option value="ADMIN">Administrador (acesso total)</option>
                </select>
              </label>
            </div>
          </fieldset>
          {propriaConta && <p id="aviso-proprio-perfil">Você não pode rebaixar o perfil da própria conta.</p>}
          {erroFormulario && <p className="admin-form-erro" role="alert">{erroFormulario}</p>}
          <div className="admin-form-acoes">
            <button type="submit" className="btn-solid" disabled={ocupado}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}
            </button>
            <button type="button" className="btn-outline" disabled={ocupado} onClick={fechar}>Cancelar</button>
          </div>
        </form>
      )}
      <form className="admin-form" role="search" onSubmit={(e) => { e.preventDefault(); filtrar("busca", busca.trim()); }}>
        <div className="admin-form-grid">
          <label>Buscar por nome ou e-mail
            <input type="search" maxLength={254} value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <label>Perfil
            <select value={filtros.role} onChange={(e) => filtrar("role", e.target.value)}>
              <option value="">Todos os perfis</option><option value="ADMIN">Administrador</option><option value="EDITOR">Editor</option>
            </select>
          </label>
          <label>Situação
            <select value={filtros.ativo} onChange={(e) => filtrar("ativo", e.target.value)}>
              <option value="">Ativos e inativos</option><option value="true">Ativo</option><option value="false">Inativo</option>
            </select>
          </label>
        </div>
        <div className="admin-form-acoes"><button type="submit" className="btn-outline">Buscar</button></div>
      </form>
      {abrindo && <p role="status">Carregando dados do usuário...</p>}
      {carregando ? <p role="status">Carregando usuários...</p> : erroLista ? (
        <div role="alert"><p>{erroLista}</p><button type="button" className="btn-outline" onClick={recarregar}>Tentar novamente</button></div>
      ) : usuarios.length === 0 ? <p className="empty-state">Nenhum usuário encontrado.</p> : (
        <>
          <div className="admin-usuarios-tabela">
            <table className="admin-table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead>
              <tbody>{usuarios.map((conta) => (
                <tr key={conta.id}>
                  <td>{conta.nome}{conta.id === usuario?.id && " (você)"}</td><td>{conta.email}</td>
                  <td><span className={`admin-badge-perfil admin-badge-${conta.role === "ADMIN" ? "admin" : "tecnico"}`}>
                    {conta.role === "ADMIN" ? <ShieldCheckIcon width={14} height={14} /> : <WrenchScrewdriverIcon width={14} height={14} />}
                    {ROTULO_PERFIL[conta.role]}
                  </span></td>
                  <td><span className={`admin-badge-perfil admin-usuario-${conta.ativo ? "ativo" : "inativo"}`}>{conta.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td><div className="admin-usuarios-acoes">
                    <button type="button" className="btn-outline" disabled={ocupado} onClick={() => editar(conta.id)} aria-label={`Editar ${conta.nome}`}>Editar</button>
                    <button type="button" className="btn-outline" disabled={ocupado || conta.id === usuario?.id}
                      title={conta.id === usuario?.id ? "Você não pode desativar a própria conta." : undefined}
                      aria-label={`${conta.ativo ? "Desativar" : "Ativar"} ${conta.nome}`} onClick={() => alterarStatus(conta)}>
                      {alterandoStatus === conta.id ? "Salvando..." : conta.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <nav className="admin-usuarios-paginacao" aria-label="Paginação de usuários">
            <button type="button" className="btn-outline" disabled={pagina <= 1} onClick={() => mudarPagina(pagina - 1)}>Anterior</button>
            <span>Página {pagina} de {paginacao.totalPaginas} · {paginacao.total} usuários</span>
            <button type="button" className="btn-outline" disabled={pagina >= paginacao.totalPaginas} onClick={() => mudarPagina(pagina + 1)}>Próxima</button>
          </nav>
        </>
      )}
    </div>
  );
}