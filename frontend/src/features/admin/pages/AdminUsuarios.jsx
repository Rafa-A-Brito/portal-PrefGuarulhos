import { useState } from "react";
import {
  PlusIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useErroModal } from "../../../hooks/useErroModal";
import * as adminApi from "../../../services/adminApi";

/**
 * Cadastro de usuários do painel.
 *
 * O backend só oferece POST /api/admins (somente ADMIN). Não existe rota
 * para listar, editar, desativar ou excluir usuários, então esta tela só
 * CRIA. A lista abaixo mostra apenas as contas criadas nesta sessão (fica
 * em memória e some no F5), como confirmação de que deu certo.
 *
 * Perfis do backend: ADMIN (tudo) e EDITOR (cria e edita rascunhos).
 */

const FORMULARIO_VAZIO = { nome: "", email: "", password: "", role: "EDITOR" };

// Mesma regra do backend (adminSchema.js): 12+ caracteres, até 72 bytes.
const TAMANHO_MIN_SENHA = 12;

const ROTULO_PERFIL = { ADMIN: "Administrador", EDITOR: "Editor" };

export default function AdminUsuarios() {
  const { mostrarErro } = useErroModal();

  const [aberto, setAberto] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [criados, setCriados] = useState([]);

  function abrir() {
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
  }

  async function salvar(e) {
    e.preventDefault();
    setErroFormulario(null);

    if (Array.from(formulario.password).length < TAMANHO_MIN_SENHA) {
      setErroFormulario(
        `A senha deve ter pelo menos ${TAMANHO_MIN_SENHA} caracteres.`,
      );
      return;
    }

    if (new TextEncoder().encode(formulario.password).length > 72) {
      setErroFormulario("A senha deve ter no máximo 72 bytes.");
      return;
    }

    setSalvando(true);

    try {
      const criado = await adminApi.criarUsuario({
        nome: formulario.nome.trim(),
        email: formulario.email.trim(),
        role: formulario.role,
        password: formulario.password,
      });
      setCriados((lista) => [criado, ...lista]);
      fechar();
    } catch (err) {
      // 400 (dado inválido) e 409 (e-mail já existe) são erros de quem
      // preencheu: ficam no formulário. O resto vai para o modal.
      const status = err.response?.status;

      if (status === 400 || status === 409) {
        setErroFormulario(adminApi.extrairMensagemDeErro(err));
      } else {
        mostrarErro(err, { origem: "AdminUsuarios › salvar" });
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head admin-page-head-row">
        <div>
          <h1>Usuários</h1>
          <p>Cadastre quem pode entrar no painel e com qual perfil.</p>
        </div>

        <button type="button" className="btn-solid" onClick={abrir}>
          <PlusIcon width={16} height={16} />
          Novo usuário
        </button>
      </div>

      {aberto && (
        <form className="admin-form" onSubmit={salvar}>
          <h2>Novo usuário</h2>

          <div className="admin-form-grid">
            <label>
              Nome
              <input
                required
                maxLength={100}
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
                maxLength={254}
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
                required
                autoComplete="new-password"
                minLength={TAMANHO_MIN_SENHA}
                placeholder={`Mínimo de ${TAMANHO_MIN_SENHA} caracteres`}
                value={formulario.password}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, password: e.target.value }))
                }
              />
            </label>

            <label>
              Perfil
              <select
                value={formulario.role}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, role: e.target.value }))
                }
              >
                <option value="EDITOR">Editor (edita rascunhos)</option>
                <option value="ADMIN">Administrador (acesso total)</option>
              </select>
            </label>
          </div>

          {erroFormulario && (
            <p className="admin-form-erro" role="alert">
              {erroFormulario}
            </p>
          )}

          <div className="admin-form-acoes">
            <button type="submit" className="btn-solid" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar usuário"}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={salvando}
              onClick={fechar}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {criados.length === 0 ? (
        <p className="empty-state">
          Os usuários já cadastrados não são listados aqui: o backend ainda não
          tem uma rota de listagem. As contas criadas nesta sessão aparecem
          abaixo.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
            </tr>
          </thead>
          <tbody>
            {criados.map((u) => (
              <tr key={u.id}>
                <td>{u.name ?? u.nome}</td>
                <td>{u.email}</td>
                <td>
                  <span
                    className={`admin-badge-perfil admin-badge-${
                      u.role === "ADMIN" ? "admin" : "tecnico"
                    }`}
                  >
                    {u.role === "ADMIN" ? (
                      <ShieldCheckIcon width={14} height={14} />
                    ) : (
                      <WrenchScrewdriverIcon width={14} height={14} />
                    )}
                    {ROTULO_PERFIL[u.role] ?? u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
