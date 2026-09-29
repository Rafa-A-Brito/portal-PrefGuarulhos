import { useEffect, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import * as adminApi from "../../../services/adminApi";

const FORMULARIO_VAZIO = { nome: "", email: "", senha: "", perfil: "tecnico" };

export default function AdminUsuarios() {
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Quando editandoId é null, o formulário está fechado. Quando é "novo",
  // o formulário está aberto pra criar um usuário. Quando é um id de
  // verdade, está editando aquele usuário específico.
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function carregarUsuarios() {
    setCarregando(true);
    setErro(null);

    try {
      const lista = await adminApi.listarUsuarios();
      setUsuarios(lista);
    } catch (err) {
      setErro(adminApi.extrairMensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarUsuarios();
  }, []);

  function abrirNovo() {
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setEditandoId("novo");
  }

  function abrirEdicao(usuario) {
    setFormulario({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
    });
    setErroFormulario(null);
    setEditandoId(usuario.id);
  }

  function fecharFormulario() {
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErroFormulario(null);

    try {
      if (editandoId === "novo") {
        await adminApi.criarUsuario(formulario);
      } else {
        // Se a senha ficou em branco na edição, não manda o campo, assim o
        // backend sabe que é pra manter a senha atual.
        const dados = { ...formulario };
        if (!dados.senha) delete dados.senha;
        await adminApi.atualizarUsuario(editandoId, dados);
      }

      fecharFormulario();
      await carregarUsuarios();
    } catch (err) {
      setErroFormulario(adminApi.extrairMensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(usuario) {
    const confirmou = window.confirm(
      `Excluir o usuário "${usuario.nome}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmou) return;

    try {
      await adminApi.excluirUsuario(usuario.id);
      await carregarUsuarios();
    } catch (err) {
      window.alert(adminApi.extrairMensagemDeErro(err));
    }
  }

  return (
    <div>
      <div className="admin-page-head admin-page-head-row">
        <div>
          <h1>Usuários</h1>
          <p>Quem pode entrar no painel administrativo e com qual perfil.</p>
        </div>

        <button type="button" className="btn-solid" onClick={abrirNovo}>
          <PlusIcon width={16} height={16} />
          Novo usuário
        </button>
      </div>

      {editandoId && (
        <form className="admin-form" onSubmit={salvar}>
          <h2>{editandoId === "novo" ? "Novo usuário" : "Editar usuário"}</h2>

          <div className="admin-form-grid">
            <label>
              Nome
              <input
                required
                value={formulario.nome}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, nome: e.target.value }))
                }
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                required
                value={formulario.email}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, email: e.target.value }))
                }
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                placeholder={
                  editandoId === "novo" ? "" : "Deixe em branco para manter a atual"
                }
                required={editandoId === "novo"}
                value={formulario.senha}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, senha: e.target.value }))
                }
              />
            </label>

            <label>
              Perfil
              <select
                value={formulario.perfil}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, perfil: e.target.value }))
                }
              >
                <option value="admin">Administrador</option>
                <option value="tecnico">Técnico</option>
              </select>
            </label>
          </div>

          {erroFormulario && <p className="admin-form-erro">{erroFormulario}</p>}

          <div className="admin-form-acoes">
            <button type="submit" className="btn-solid" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" className="btn-outline" onClick={fecharFormulario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="empty-state">Carregando usuários...</p>
      ) : erro ? (
        <p className="empty-state">{erro}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`admin-badge-perfil admin-badge-${u.perfil}`}>
                    {u.perfil === "admin" ? "Administrador" : "Técnico"}
                  </span>
                </td>
                <td className="admin-table-acoes">
                  <button
                    type="button"
                    aria-label={`Editar ${u.nome}`}
                    onClick={() => abrirEdicao(u)}
                  >
                    <PencilIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${u.nome}`}
                    disabled={u.id === usuarioLogado?.id}
                    title={
                      u.id === usuarioLogado?.id
                        ? "Você não pode excluir o próprio usuário enquanto está logado com ele"
                        : undefined
                    }
                    onClick={() => excluir(u)}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
