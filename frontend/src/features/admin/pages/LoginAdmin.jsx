import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BuildingLibraryIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";

export default function LoginAdmin() {
  const { login, erro } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destino = location.state?.from?.pathname || "/admin";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setEnviando(true);

    const ok = await login(email, senha);

    setEnviando(false);

    if (ok) {
      navigate(destino, { replace: true });
    }
  };

  return (
    <div className="admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <div className="admin-login-header">
          <div className="admin-login-icon-wrap">
            <BuildingLibraryIcon
              width={28}
              height={28}
              className="admin-login-icon"
            />
          </div>

          <span className="admin-login-overline">Prefeitura de Guarulhos</span>

          <h1>Área Administrativa</h1>

          <p>Acesso restrito a servidores autorizados.</p>
        </div>

        <div className="admin-login-fields">
          <div className="admin-login-field">
            <label htmlFor="email">E-mail institucional</label>

            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              placeholder="servidor@guarulhos.sp.gov.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="admin-login-field">
            <label htmlFor="senha">Senha</label>

            <div className="admin-login-senha-wrap">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              <button
                type="button"
                className="admin-login-toggle-senha"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? (
                  <EyeSlashIcon width={18} height={18} />
                ) : (
                  <EyeIcon width={18} height={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        {erro && <p className="admin-login-erro">{erro}</p>}

        <button
          type="submit"
          className="btn-solid admin-login-submit"
          disabled={enviando}
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>

        <p className="admin-login-aviso">
          Acesso restrito. O uso desta área é destinado exclusivamente a
          usuários autorizados.
        </p>
      </form>
    </div>
  );
}
