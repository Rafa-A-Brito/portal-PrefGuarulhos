// [API DESATIVADA TEMPORARIAMENTE] dados em texto puro (db.json) só para visualizar a tela.
import { useState } from "react";
// import { useEffect, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import { useErroModal } from "../../../hooks/useErroModal";
// import * as adminApi from "../../../services/adminApi";

const FORMULARIO_VAZIO = { nome: "", email: "", senha: "", perfil: "tecnico" };

// Mínimo exigido no formulário (o backend precisa validar de novo: o front
// é só conforto de uso, nunca a barreira de segurança).
const TAMANHO_MIN_SENHA = 8;

// Usuários do db.json em texto puro (a lista da API nunca traz a senha).
const USUARIOS_MOCK = [
  {
    id: 1,
    nome: "Administrador",
    email: "admin@guarulhos.sp.gov.servidor.br",
    perfil: "admin",
  },
  {
    id: 2,
    nome: "Técnico de Patrimônio",
    email: "tecnico@guarulhos.sp.gov.br",
    perfil: "tecnico",
  },
];

export default function AdminUsuarios() {
  const { usuario: usuarioLogado } = useAuth();
  const { mostrarErro } = useErroModal();

  // const [usuarios, setUsuarios] = useState([]);
  // const [carregando, setCarregando] = useState(true);
  // const [erro, setErro] = useState(null);
  const [usuarios, setUsuarios] = useState(USUARIOS_MOCK);
  const [carregando] = useState(false);
  const [erro] = useState(null);

  // Quando editandoId é null, o formulário está fechado. Quando é "novo",
  // o formulário está aberto pra criar um usuário. Quando é um id de
  // verdade, está editando aquele usuário específico.
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erroFormulario, setErroFormulario] = useState(null);
  // const [salvando, setSalvando] = useState(false);
  const [salvando] = useState(false);

  /* ----- ORIGINAL (API) — descomentar quando o backend estiver integrado -----
  async function carregarUsuarios() {
    setCarregando(true);
    setErro(null);

    try {
      const lista = await adminApi.listarUsuarios();
      setUsuarios(lista);
    } catch (err) {
      setErro("Não foi possível carregar os usuários.");
      mostrarErro(err, { origem: "AdminUsuarios › carregar" });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarUsuarios();
  }, []);
  ----- fim do ORIGINAL (API) ----- */

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

  /* ----- ORIGINAL (API) — descomentar quando o backend estiver integrado -----
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
      mostrarErro(err, { origem: "AdminUsuarios › salvar" });
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
      mostrarErro(err, { origem: "AdminUsuarios › excluir" });
    }
  }
  ----- fim do ORIGINAL (API) ----- */

  /* ---------- MOCK TEMPORÁRIO: altera só a lista em memória (some no F5) ---------- */
  function salvar(e) {
    e.preventDefault();
    setErroFormulario(null);

    try {
      const { nome, email, perfil } = formulario;

      if (editandoId === "novo") {
        setUsuarios((lista) => [
          ...lista,
          { id: Date.now(), nome, email, perfil },
        ]);
      } else {
        setUsuarios((lista) =>
          lista.map((u) =>
            u.id === editandoId ? { ...u, nome, email, perfil } : u,
          ),
        );
      }

      fecharFormulario();
    } catch (err) {
      mostrarErro(err, { origem: "AdminUsuarios › salvar" });
    }
  }

  function excluir(usuario) {
    const confirmou = window.confirm(
      `Excluir o usuário "${usuario.nome}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmou) return;

    try {
      setUsuarios((lista) => lista.filter((u) => u.id !== usuario.id));
    } catch (err) {
      mostrarErro(err, { origem: "AdminUsuarios › excluir" });
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
                autoComplete="off"
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
                autoComplete="off"
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
                autoComplete="new-password"
                minLength={TAMANHO_MIN_SENHA}
                placeholder={
                  editandoId === "novo"
                    ? `Mínimo de ${TAMANHO_MIN_SENHA} caracteres`
                    : "Deixe em branco para manter a atual"
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

          {erroFormulario && (
            <p className="admin-form-erro">{erroFormulario}</p>
          )}

          <div className="admin-form-acoes">
            <button type="submit" className="btn-solid" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={fecharFormulario}
            >
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
                  <span
                    className={`admin-badge-perfil admin-badge-${u.perfil}`}
                  >
                    {u.perfil === "admin" ? (
                      <ShieldCheckIcon width={14} height={14} />
                    ) : (
                      <WrenchScrewdriverIcon width={14} height={14} />
                    )}
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
