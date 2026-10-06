import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import { useErroModal } from "../../../hooks/useErroModal";

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

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEMPO_SUCESSO_MS = 650;
const DURACAO_TREMOR_MS = 500;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function LoginAdmin() {
  const { login, erro } = useAuth();
  const { mostrarErro } = useErroModal();
  const navigate = useNavigate();
  const location = useLocation();

  const destino = location.state?.from?.pathname || "/admin";
  // O interceptor de api.js manda para cá com ?expirou=1 quando o token vence.
  const sessaoExpirou = new URLSearchParams(location.search).has("expirou");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [tremendo, setTremendo] = useState(false);

  // Um campo só mostra erro depois de a pessoa passar por ele (blur) ou
  // tentar enviar, para não gritar "inválido" enquanto ela ainda digita.
  const [tocado, setTocado] = useState({ email: false, senha: false });

  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const timerTremorRef = useRef(null);

  useEffect(() => {
    const timer = timerTremorRef;
    return () => clearTimeout(timer.current);
  }, []);

  const emailValido = REGEX_EMAIL.test(email.trim());

  const erroEmail =
    tocado.email && !emailValido
      ? email.trim()
        ? "Informe um e-mail válido."
        : "Informe seu e-mail institucional."
      : null;

  const erroSenha = tocado.senha && !senha ? "Informe sua senha." : null;

  const marcarTocado = (campo) =>
    setTocado((anterior) => ({ ...anterior, [campo]: true }));

  const tremer = () => {
    setTremendo(true);
    clearTimeout(timerTremorRef.current);
    timerTremorRef.current = setTimeout(
      () => setTremendo(false),
      DURACAO_TREMOR_MS,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTocado({ email: true, senha: true });

    if (!emailValido || !senha) {
      tremer();
      (!emailValido ? emailRef : senhaRef).current?.focus();
      return;
    }

    setEnviando(true);

    try {
      const ok = await login(email, senha);

      if (ok) {
        // Mostra o "acesso confirmado" por um instante antes de trocar de tela.
        setSucesso(true);
        await esperar(TEMPO_SUCESSO_MS);
        navigate(destino, { replace: true });
        return;
      }

      // Credenciais recusadas: erro de quem digitou, fica no próprio
      // formulário (mensagem do AuthContext + tremor), sem modal.
      tremer();
    } catch (err) {
      // Qualquer outra falha (rede, bug) vai para o modal de erro.
      mostrarErro(err, {
        origem: "LoginAdmin › entrar",
        mensagem: "Não foi possível validar o acesso agora.",
      });
    } finally {
      setEnviando(false);
    }
  };

  const classeCampo = (valido, invalido) =>
    ["admin-login-field", valido && "is-valid", invalido && "is-invalid"]
      .filter(Boolean)
      .join(" ");

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

          <form
            className={`admin-login-card${tremendo ? " is-shaking" : ""}`}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="admin-login-icon-badge">
              <BuildingLibraryIcon width={22} height={22} />
            </div>

            <div className="admin-login-header">
              <span className="admin-login-overline">Área administrativa</span>
              <h1>Entrar no painel</h1>
              <p>Acesso restrito a servidores autorizados.</p>
            </div>

            <div className="admin-login-fields">
              {/* ----- E-mail (rótulo flutuante) ----- */}
              <div className={classeCampo(emailValido, erroEmail)}>
                <div className="admin-login-input-wrap">
                  <EnvelopeIcon
                    width={17}
                    height={17}
                    className="admin-login-input-icon"
                  />
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="servidor@guarulhos.sp.gov.br"
                    value={email}
                    disabled={enviando}
                    aria-invalid={!!erroEmail}
                    aria-describedby={erroEmail ? "email-erro" : undefined}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => marcarTocado("email")}
                  />
                  <label htmlFor="email">E-mail institucional</label>

                  {emailValido && (
                    <CheckCircleIcon
                      width={19}
                      height={19}
                      className="admin-login-status"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {erroEmail && (
                  <p id="email-erro" className="admin-login-field-erro">
                    {erroEmail}
                  </p>
                )}
              </div>

              {/* ----- Senha (rótulo flutuante) ----- */}
              <div className={classeCampo(false, erroSenha)}>
                <div className="admin-login-input-wrap admin-login-senha-wrap">
                  <LockClosedIcon
                    width={17}
                    height={17}
                    className="admin-login-input-icon"
                  />
                  <input
                    ref={senhaRef}
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={senha}
                    disabled={enviando}
                    aria-invalid={!!erroSenha}
                    aria-describedby={erroSenha ? "senha-erro" : undefined}
                    onChange={(e) => setSenha(e.target.value)}
                    onBlur={() => marcarTocado("senha")}
                  />
                  <label htmlFor="senha">Senha</label>

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

                {erroSenha && (
                  <p id="senha-erro" className="admin-login-field-erro">
                    {erroSenha}
                  </p>
                )}
              </div>
            </div>

            {sessaoExpirou && !erro && !enviando && !sucesso && (
              <p className="admin-login-erro" role="status">
                Sua sessão expirou. Entre novamente para continuar.
              </p>
            )}

            {erro && !enviando && !sucesso && (
              <p className="admin-login-erro" role="alert">
                {erro}
              </p>
            )}

            <button
              type="submit"
              className={`btn-solid admin-login-submit${sucesso ? " is-success" : ""}`}
              disabled={enviando}
              aria-live="polite"
            >
              {sucesso ? (
                <>
                  <CheckCircleIcon width={18} height={18} />
                  Acesso confirmado
                </>
              ) : enviando ? (
                <>
                  <ArrowPathIcon width={18} height={18} className="icon-spin" />
                  Validando acesso…
                </>
              ) : (
                <>
                  <PaperAirplaneIcon width={16} height={16} />
                  Entrar
                </>
              )}
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
