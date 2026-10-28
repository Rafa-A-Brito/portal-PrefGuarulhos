import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import api, { tokenDaSessao, lerSessao, encerrarSessao } from "../services/api";
import { prazoRetryAfter } from "../utils/retryAfter.js";
import { normalizarErro } from "../utils/erros.js";
import { AuthContext } from "./AuthContextInstance.js";
import { CHAVE_SESSAO_MOCK } from "./authConstants.js";

/** Sessão Bearer renovável no sessionStorage. Scripts com XSS podem ler ambas
 * as credenciais; nenhuma delas deve aparecer em URL, cookie ou localStorage. */

/**
 * O backend devolve o usuário como { id, name, email, role } e role é
 * "ADMIN" ou "EDITOR". O resto do front lê "nome" e "perfil", então a
 * conversão acontece aqui, num único ponto.
 */
function paraUsuario(user) {
  return {
    id: user.id,
    nome: user.name,
    email: user.email,
    perfil: user.role,
  };
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [retryAt, setRetryAt] = useState(null);
  const [motivoSaida, setMotivoSaida] = useState(null);
  const loginPendente = useRef(false);
  const geracao = useRef(0);

  // ===========================================================================
  // verificarSessao — roda uma vez na montagem do Provider
  // ===========================================================================
  const verificarSessao = useCallback(async () => {
    setCarregando(true);

    try {
      const bruto = sessionStorage.getItem(CHAVE_SESSAO_MOCK);

      if (!bruto) {
        setUsuario(null);
        return;
      }

      const salva = JSON.parse(bruto);

      // Confere o formato mínimo antes de confiar no que veio do storage.
      if (salva?.token && salva?.refreshToken && salva.sessionId && Date.parse(salva.sessionExpiresAt) > Date.now() && salva?.user?.id && salva?.user?.email) {
        setUsuario(paraUsuario(salva.user));
      } else {
        sessionStorage.removeItem(CHAVE_SESSAO_MOCK);
        setUsuario(null);
        setMotivoSaida("expirou");
      }
    } catch {
      // JSON corrompido / storage bloqueado: trata como deslogado.
      try { sessionStorage.removeItem(CHAVE_SESSAO_MOCK); }
      catch { /* O navegador pode bloquear também a limpeza do storage. */ }
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verificarSessao();
  }, [verificarSessao]);

  useEffect(() => {
    let timer;
    const agendar = () => {
      clearTimeout(timer);
      const sessao = lerSessao();
      if (!sessao?.sessionExpiresAt) return;
      timer = setTimeout(() => encerrarSessao(sessao), Math.max(0, Date.parse(sessao.sessionExpiresAt) - Date.now()));
    };
    const encerrar = () => { geracao.current++; clearTimeout(timer); setUsuario(null); setMotivoSaida("expirou"); };
    window.addEventListener("auth:session-ended", encerrar);
    window.addEventListener("auth:session-updated", agendar);
    agendar();
    return () => { clearTimeout(timer); window.removeEventListener("auth:session-ended", encerrar); window.removeEventListener("auth:session-updated", agendar); };
  }, []);

  const limparEspera = useCallback(() => { setRetryAt(null); setErro(null); }, []);

  // ===========================================================================
  // login
  // ===========================================================================
  const login = useCallback(async (email, senha) => {
    if (loginPendente.current || (retryAt && retryAt > Date.now())) return false;
    loginPendente.current = true;
    const tentativa = ++geracao.current;
    setErro(null);
    setRetryAt(null);

    try {
      // O backend espera "password", não "senha" (backend/src/schemas/authSchema.js).
      const { data } = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password: senha,
      });

      // Envelope padrão do backend: { success, data: { token, user } }.
      const { token, user, refreshToken, sessionExpiresAt } = data.data;
      if (tentativa !== geracao.current) return false;
      if (!token || !refreshToken || !Number.isFinite(Date.parse(sessionExpiresAt))) throw new Error("Resposta de login inválida.");

      sessionStorage.setItem(
        CHAVE_SESSAO_MOCK,
        JSON.stringify({ token, user, refreshToken, sessionExpiresAt, sessionId: crypto.randomUUID() }),
      );
      setUsuario(paraUsuario(user));
      window.dispatchEvent(new Event("auth:session-updated"));
      setMotivoSaida(null);
      return true;
    } catch (err) {
      if (!err.response) {
        setErro(
          "Não foi possível falar com o backend (confira se ele está " +
            "rodando, seja via docker compose ou via npm run dev na pasta backend).",
        );
      } else if (err.response.status === 429) {
        const header = err.response.headers?.get?.("retry-after") ?? err.response.headers?.["retry-after"];
        const prazo = prazoRetryAfter(header);
        setRetryAt(prazo);
        const minutos = prazo ? Math.ceil((prazo - Date.now()) / 60000) : null;
        setErro(!prazo ? "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente." : minutos <= 1
          ? "Muitas tentativas de acesso. Aguarde um instante e tente novamente."
          : `Muitas tentativas de acesso. Tente novamente em aproximadamente ${minutos} minutos.`);
      } else if ([400, 401].includes(err.response.status)) {
        // 401 (credenciais erradas) e 400 (validação) viram a mesma
        // mensagem genérica de propósito: não revela se o e-mail existe.
        setErro("E-mail ou senha inválidos.");
      } else {
        setErro(normalizarErro(err).mensagem);
      }
      return false;
    } finally {
      loginPendente.current = false;
    }
  }, [retryAt]);

  // ===========================================================================
  // logout
  // ===========================================================================
  const logout = useCallback(async (expectedToken, motivo = "logout") => {
    if (expectedToken !== undefined && expectedToken !== tokenDaSessao()) return false;
    const sessao = lerSessao();
    geracao.current++;
    setMotivoSaida(motivo);
    sessionStorage.removeItem(CHAVE_SESSAO_MOCK);
    window.dispatchEvent(new Event("auth:session-updated"));
    setUsuario(null);
    if (sessao?.refreshToken && motivo !== "senhaAlterada") {
      try { await api.post("/auth/logout", { refreshToken: sessao.refreshToken }, { semCredenciais: true }); }
      catch {
        // A limpeza local já ocorreu; não declarar revogação remota confirmada.
        if (!lerSessao()) setMotivoSaida("logoutLocal");
      }
    }
    return true;
  }, []);

  // Usa somente o DTO confirmado pela API e mantém o token e demais dados.
  const atualizarUsuario = useCallback((atualizado) => {
    const salva = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MOCK) || "null");
    if (!salva?.token || salva.user?.id !== atualizado.id) return;
    const user = {
      ...salva.user,
      name: atualizado.nome,
      email: atualizado.email,
      role: atualizado.role,
    };
    sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify({ ...salva, user }));
    setUsuario(paraUsuario(user));
  }, []);

  const value = useMemo(
    () => ({
      usuario,
      carregando,
      erro,
      retryAt,
      limparEspera,
      motivoSaida,
      autenticado: !!usuario,
      login,
      logout,
      atualizarUsuario,
    }),
    [usuario, carregando, erro, retryAt, limparEspera, motivoSaida, login, logout, atualizarUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
