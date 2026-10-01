import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  BuildingLibraryIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";

/**
 * As três imagens da composição do painel esquerdo, em ordem de
 * profundidade (fundo → frente). Nenhuma é cortada/esticada — todas são
 * <img> normais, redimensionadas só por largura (altura automática),
 * então a proporção original de cada uma é sempre preservada.
 *
 * Salve os três arquivos em src/assets/ (ajuste os caminhos abaixo se
 * usar outros nomes):
 *   - prefeitura-guarulhos-selo.png     → camada intermediária (o selo
 *     com os ícones em grade, mais discreto)
 *   - textura-geometrica.png            → camada de fundo (textura
 *     abstrata, recolorida via CSS para branco translúcido)
 *   - prefeitura-guarulhos-brand.png    → camada principal (skyline +
 *     logotipo + "Guarulhos", maior destaque)
 */
import prefeituraSelo from "../../../assets/prefeitura-guarulhos-brand_2.png";
import texturaGeometrica from "../../../assets/prefeitura-guarulhos-brand_3.png";
import prefeituraBrand from "../../../assets/prefeitura-guarulhos-brand.png";

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
      {/* ===== Painel visual — colagem em camadas (some no mobile) ===== */}
      <div className="admin-login-visual">
        <div className="admin-login-collage">
          <img
            src={texturaGeometrica}
            alt=""
            aria-hidden="true"
            className="admin-login-collage-textura"
          />
          <img
            src={prefeituraBrand}
            alt=""
            aria-hidden="true"
            className="admin-login-collage-secundaria"
          />
          <img
            src={prefeituraSelo}
            alt="Cidade de Guarulhos — logotipo sobre vista aérea do município"
            className="admin-login-collage-principal"
          />
        </div>
      </div>

      {/* ===== Painel do formulário ===== */}
      <div className="admin-login-panel">
        <div className="admin-login-panel-inner">
          <Link to="/" className="admin-login-back">
            <ArrowLeftIcon width={15} height={15} />
            Voltar ao site
          </Link>

          <form className="admin-login-card" onSubmit={handleSubmit}>
            <div className="admin-login-icon-badge">
              <BuildingLibraryIcon width={22} height={22} />
            </div>

            <div className="admin-login-header">
              <span className="admin-login-overline">Área administrativa</span>
              <h1>Entrar no painel</h1>
              <p>Acesso restrito a servidores autorizados.</p>
            </div>

            <div className="admin-login-fields">
              <div className="admin-login-field">
                <label htmlFor="email">E-mail institucional</label>

                <div className="admin-login-input-wrap">
                  <EnvelopeIcon
                    width={17}
                    height={17}
                    className="admin-login-input-icon"
                  />
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
              </div>

              <div className="admin-login-field">
                <label htmlFor="senha">Senha</label>

                <div className="admin-login-input-wrap admin-login-senha-wrap">
                  <LockClosedIcon
                    width={17}
                    height={17}
                    className="admin-login-input-icon"
                  />
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
                    aria-label={
                      mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                    }
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
              <PaperAirplaneIcon width={16} height={16} />

              {enviando ? "Entrando…" : "Entrar"}
            </button>

            <p className="admin-login-aviso">
              Acesso restrito. O uso desta área é destinado exclusivamente a
              usuários autorizados.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
