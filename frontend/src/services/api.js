import axios from "axios";
import { CHAVE_SESSAO_MOCK } from "../context/authConstants.js";

/**
 * Instância central do axios, usada por toda chamada de rede do front.
 *
 * Em desenvolvimento local (rodando com npm run dev, sem Docker), o
 * backend Express costuma estar na porta 4000, então é esse o valor
 * padrão aqui embaixo. Dentro do Docker Compose, o build do frontend
 * recebe VITE_API_BASE_URL=/api (veja frontend/Dockerfile), e o Nginx que
 * serve os arquivos estáticos encaminha esse /api para o container do
 * backend (veja frontend/nginx.conf). Assim o navegador nunca precisa
 * saber o hostname interno do backend, e não existe problema de CORS.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },

  // ===== PRODUÇÃO, descomentar junto com uma sessão real por cookie =====
  // withCredentials: true,
});

// Antes de cada requisição sair, se tiver um usuário logado (mock, guardado
// no sessionStorage pelo AuthContext), a gente manda quem ele é em dois
// headers simples. É assim que o backend sabe, ainda que de um jeito não
// muito seguro, se quem está chamando uma rota de admin realmente está
// logado como admin. Tem uma explicação mais completa disso em
// backend/src/middlewares/authMiddleware.js.
api.interceptors.request.use((config) => {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO_MOCK);
    const usuario = bruto ? JSON.parse(bruto) : null;

    if (usuario?.email) {
      config.headers["x-user-email"] = usuario.email;
      config.headers["x-user-perfil"] = usuario.perfil ?? "";
    }
  } catch {
    // sessionStorage bloqueado ou JSON corrompido: segue sem os headers,
    // o backend vai tratar isso como requisição sem login.
  }

  return config;
});

// Interceptador para tratamento global de erros nas respostas.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[API Error]:", error.response?.data || error.message);

    // ===== PRODUÇÃO, descomentar quando houver sessão real por cookie =====
    // Sessão expirada ou inválida: derruba o usuário para a tela de login.
    // Cuidado para não entrar em loop quando o próprio /auth/me der 401.
    //
    // const url = error.config?.url || "";
    // const ehRotaDeAuth = url.includes("/auth/");
    //
    // if (error.response?.status === 401 && !ehRotaDeAuth) {
    //   window.location.assign("/admin/login");
    // }

    return Promise.reject(error);
  },
);

export default api;
