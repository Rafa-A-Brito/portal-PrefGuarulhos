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
 * precisa acontecer no backend, e é exatamente isso que o middleware
 * exigirAdmin em backend/src/middlewares/authMiddleware.js faz hoje: toda
 * rota de criar, editar ou apagar usuário e patrimônio passa por ele antes
 * de chegar no controller.
 *
 * Sobre o login em si, hoje existe um backend Express real (pasta backend/)
 * conversando com MySQL, mas o login ainda é um mock por dentro. Ele
 * funciona assim:
 *
 *   login   chama GET /usuarios?email=...&senha=... e confere se voltou
 *           algum usuário com esse email e essa senha
 *   sessão  fica guardada no sessionStorage do navegador, só pra
 *           sobreviver a um F5 durante o desenvolvimento
 *   logout  simplesmente limpa esse sessionStorage
 *
 * Isso só é aceitável porque estamos com dados de teste. A senha viaja em
 * texto puro na query string, fica salva no histórico do navegador e nos
 * logs do backend, e o usuário logado pode ser trocado por qualquer pessoa
 * que abra o DevTools e edite o sessionStorage. Nada disso pode ir pra
 * produção. Quando chegar a hora de trocar por autenticação de verdade, o
 * caminho é mais ou menos esse:
 *
 *   1. o backend passa a ter uma rota de login que gera uma sessão real,
 *      com senha com hash (bcrypt, por exemplo) em vez de texto puro
 *   2. essa rota devolve um cookie HttpOnly com SameSite=Lax ou Strict, em
 *      vez de mandar os dados do usuário direto na resposta
 *   3. o axios em src/services/api.js liga withCredentials para esse
 *      cookie viajar sozinho em toda requisição
 *   4. o front para de guardar qualquer coisa de sessão no
 *      sessionStorage, porque um cookie HttpOnly não pode ser lido por
 *      JavaScript, e é isso que protege contra XSS roubando a sessão
 *   5. o middleware exigirAdmin do backend passa a validar esse cookie em
 *      vez de confiar em headers que o próprio front manda
 */

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // ===========================================================================
  // verificarSessao, roda uma vez na montagem do Provider
  // ===========================================================================

  /* ---------- MOCK (login simples via sessionStorage), ATIVO ---------- */
  const verificarSessao = useCallback(async () => {
    setCarregando(true);

    try {
      const bruto = sessionStorage.getItem(CHAVE_SESSAO_MOCK);

      if (!bruto) {
        setUsuario(null);
        return;
      }

      const salvo = JSON.parse(bruto);

      // Confere o formato mínimo antes de confiar no que veio do storage.
      if (salvo?.id && salvo?.email) {
        setUsuario(salvo);
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

  /* ---------- PRODUÇÃO (sessão real), descomentar quando existir ----------
  const verificarSessao = useCallback(async () => {
    setCarregando(true);
    try {
      // O cookie HttpOnly vai junto por causa do withCredentials da instância.
      const { data } = await api.get("/auth/me");
      setUsuario(data);
    } catch (err) {
      if (!err.response) {
        console.warn("[Auth] Backend inacessível. Assumindo usuário deslogado.");
      }
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);
  ------------------------------------------------------------------- */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verificarSessao();
  }, [verificarSessao]);

  // ===========================================================================
  // login
  // ===========================================================================

  /* ---------- MOCK (login simples via sessionStorage), ATIVO ---------- */
  const login = useCallback(async (email, senha) => {
    setErro(null);

    try {
      // O backend tem uma rota que filtra usuários por email e senha (é
      // basicamente o mesmo contrato que o json-server tinha antes, então
      // essa comparação continua acontecendo do lado do servidor).
      const { data } = await api.get("/usuarios", {
        params: { email: email.trim().toLowerCase(), senha },
      });

      const encontrado = Array.isArray(data) ? data[0] : null;

      if (!encontrado) {
        // Mensagem genérica de propósito: não revela se o e-mail existe.
        setErro("E-mail ou senha inválidos.");
        return false;
      }

      // Nunca deixar a senha entrar no estado do React nem no storage.
      const usuarioSeguro = { ...encontrado };
      delete usuarioSeguro.senha;

      sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify(usuarioSeguro));
      setUsuario(usuarioSeguro);
      return true;
    } catch (err) {
      if (!err.response) {
        setErro(
          "Não foi possível falar com o backend (confira se ele está " +
            "rodando, seja via docker compose ou via npm run dev na pasta backend).",
        );
      } else {
        setErro("E-mail ou senha inválidos.");
      }
      return false;
    }
  }, []);

  /* ---------- PRODUÇÃO (sessão real), descomentar quando existir ----------
  const login = useCallback(async (email, senha) => {
    setErro(null);
    try {
      // O backend responde 200 + dados públicos do usuário e seta o cookie
      // HttpOnly de sessão no Set-Cookie. O front nunca vê o token.
      const { data } = await api.post("/auth/login", { email, senha });
      setUsuario(data);
      return true;
    } catch {
      setErro("E-mail ou senha inválidos.");
      return false;
    }
  }, []);
  ------------------------------------------------------------------- */

  // ===========================================================================
  // logout
  // ===========================================================================

  /* ---------- MOCK (login simples via sessionStorage), ATIVO ---------- */
  const logout = useCallback(async () => {
    sessionStorage.removeItem(CHAVE_SESSAO_MOCK);
    setUsuario(null);
  }, []);

  /* ---------- PRODUÇÃO (sessão real), descomentar quando existir ----------
  const logout = useCallback(async () => {
    try {
      // Quem invalida a sessão é o servidor (limpa o cookie).
      await api.post("/auth/logout");
    } finally {
      setUsuario(null);
    }
  }, []);
  ------------------------------------------------------------------- */

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
