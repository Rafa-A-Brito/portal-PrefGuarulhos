import { useState, useCallback, useMemo, useEffect } from "react";
import api from "../services/api";
import { AuthContext } from "./AuthContextInstance.js";
import { CHAVE_SESSAO_MOCK } from "./authConstants.js";

/**
 * Um aviso importante antes de mexer neste arquivo: o que está aqui é um
 * guard de experiência do usuário, não um guard de segurança de verdade.
 *
 * Esse contexto só decide o que o React mostra na tela, tipo esconder um
 * botão ou redirecionar uma rota. Ele não impede ninguém de chamar a API
 * diretamente pelo Postman ou pelo DevTools. A autorização de verdade
 * acontece no backend, nos middlewares authenticate.js + authorize.js
 * (backend/src/middlewares/) — toda rota de criar/editar/apagar passa por
 * eles antes de chegar no controller.
 *
 * SOBRE O LOGIN (atualizado — já fala com o backend real):
 *
 * O backend não usa cookie de sessão. POST /api/auth/login devolve um JWT
 * no CORPO da resposta ({ token, user }), e esse token precisa ser
 * reenviado manualmente em todo request daqui pra frente, no header
 * "Authorization: Bearer <token>" (isso já é feito pelo interceptor em
 * services/api.js). Não existe rota GET /api/auth/me nem POST
 * /api/auth/logout no backend hoje — por isso:
 *
 *   - "verificarSessao" não bate na API: ela só relê o que já estava
 *     salvo no sessionStorage (token + usuário) de um login anterior.
 *     Isso significa que, se o token expirar (JWT_TTL_SECONDS, 900s =
 *     15min por padrão) enquanto a aba está aberta, o front só vai
 *     perceber no próximo request que levar um 401 — não tem como saber
 *     antes disso sem decodificar o token no cliente.
 *   - "logout" é 100% local: só apaga o sessionStorage. Não existe nada
 *     pra invalidar no servidor (o JWT continua "válido" do ponto de
 *     vista do backend até expirar sozinho).
 *
 * Trade-off consciente: igual o cookie de sessão que a gente usava antes
 * do backend real existir, guardar o token no sessionStorage é legível
 * por qualquer script que rode na página (XSS). A alternativa de verdade
 * seria o backend passar a setar um cookie HttpOnly no login — mas isso
 * é mudança de backend, não só de frontend, então fica registrado aqui
 * como próximo passo, não implementado agora.
 */

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

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
      if (salva?.token && salva?.user?.id && salva?.user?.email) {
        setUsuario(salva.user);
      } else {
        sessionStorage.removeItem(CHAVE_SESSAO_MOCK);
        setUsuario(null);
      }
    } catch {
      // JSON corrompido / storage bloqueado: trata como deslogado.
      sessionStorage.removeItem(CHAVE_SESSAO_MOCK);
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verificarSessao();
  }, [verificarSessao]);

  // ===========================================================================
  // login
  // ===========================================================================
  const login = useCallback(async (email, senha) => {
    setErro(null);

    try {
      // O backend espera "password", não "senha" (backend/src/schemas/authSchema.js).
      const { data } = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password: senha,
      });

      // Envelope padrão do backend: { success, data: { token, user } }.
      const { token, user } = data.data;

      sessionStorage.setItem(
        CHAVE_SESSAO_MOCK,
        JSON.stringify({ token, user }),
      );
      setUsuario(user);
      return true;
    } catch (err) {
      if (!err.response) {
        setErro(
          "Não foi possível falar com o backend (confira se ele está " +
            "rodando, seja via docker compose ou via npm run dev na pasta backend).",
        );
      } else {
        // 401 (credenciais erradas) e 400 (validação) viram a mesma
        // mensagem genérica de propósito: não revela se o e-mail existe.
        setErro("E-mail ou senha inválidos.");
      }
      return false;
    }
  }, []);

  // ===========================================================================
  // logout
  // ===========================================================================
  const logout = useCallback(async () => {
    // Nada pra invalidar no servidor (não existe POST /api/auth/logout
    // hoje) — só derruba a sessão local mesmo.
    sessionStorage.removeItem(CHAVE_SESSAO_MOCK);
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({
      usuario,
      carregando,
      erro,
      autenticado: !!usuario,
      login,
      logout,
    }),
    [usuario, carregando, erro, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
