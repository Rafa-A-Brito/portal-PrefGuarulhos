import axios from "axios";
import { CHAVE_SESSAO_MOCK } from "../context/authConstants.js";

/**
 * Instância central do axios, usada por toda chamada de rede do front.
 *
 * Em desenvolvimento local (rodando com npm run dev, sem Docker), o
 * backend Express fica em http://localhost:3333, e TODAS as rotas dele
 * vivem sob o prefixo /api (backend/src/app.js: app.use("/api", routes)).
 * Por isso o padrão abaixo já inclui o /api — sem ele, qualquer chamada
 * cai 404. Dentro do Docker Compose, o build do frontend recebe
 * VITE_API_BASE_URL=/api (veja frontend/Dockerfile), e o Nginx que serve
 * os arquivos estáticos encaminha esse /api para o container do backend
 * (veja frontend/nginx.conf). Assim o navegador nunca precisa saber o
 * hostname interno do backend, e não existe problema de CORS.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3333/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * O backend autentica por JWT Bearer (backend/src/middlewares/authenticate.js
 * lê o header Authorization e confere o token — não existe cookie de sessão
 * nem rota /auth/me). Por isso a sessão fica guardada inteira (token + dados
 * do usuário) no sessionStorage pelo AuthContext, e aqui a gente só lê esse
 * token pra anexar em toda requisição, se existir.
 *
 * Isso é um Bearer token comum em sessionStorage, então herda a limitação
 * de sempre: um XSS no front consegue ler esse storage e roubar o token.
 * Não tem como evitar isso sem o backend passar a emitir cookie HttpOnly
 * (o que ele não faz hoje — ver o aviso em context/AuthContext.jsx).
 */
api.interceptors.request.use((config) => {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO_MOCK);
    const sessao = bruto ? JSON.parse(bruto) : null;

    if (sessao?.token) {
      config.headers.Authorization = `Bearer ${sessao.token}`;
    }
  } catch {
    // sessionStorage bloqueado ou JSON corrompido: segue sem o header,
    // o backend vai tratar isso como requisição sem login (401).
  }

  return config;
});

// Tratamento global de erros nas respostas.
//
// 401 em rota autenticada = token expirado (JWT_TTL_SECONDS, 15 min por padrão)
// ou conta desativada. Não existe refresh token, então a sessão local é
// descartada e a pessoa volta para o login. O próprio POST /auth/login também
// responde 401 (senha errada): esse caso NÃO é sessão expirada, é tratado pelo
// AuthContext.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const ehLogin = error.config?.url?.includes("/auth/login");

    if (status === 401 && !ehLogin) {
      try {
        if (sessionStorage.getItem(CHAVE_SESSAO_MOCK)) {
          sessionStorage.removeItem(CHAVE_SESSAO_MOCK);

          if (
            window.location.pathname.startsWith("/admin") &&
            window.location.pathname !== "/admin/login"
          ) {
            window.location.assign("/admin/login?expirou=1");
          }
        }
      } catch {
        // storage bloqueado: nada a limpar.
      }
    }

    if (import.meta.env.DEV) {
      console.error("[API Error]:", error.response?.data || error.message);
    }
    return Promise.reject(error);
  },
);

export default api;
