import axios from "axios";

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
const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3333/api";

const api = axios.create({
  baseURL: API_URL,
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
  const token = sessionStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptador para tratamento global de erros nas respostas.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[API Error]:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("usuario");
    }

    return Promise.reject(error);
  },
);

export async function listarPatrimonios(params = {}) {
  const response = await api.get("/patrimonios", {
    params,
  });

  return response.data?.data ?? [];
}

export async function buscarPatrimonioPorSlug(slug) {
  const response = await api.get(`/patrimonios/${encodeURIComponent(slug)}`);

  return response.data?.data ?? null;
}

export async function login(credentials) {
  const response = await api.post("/auth/login", credentials);

  return response.data?.data ?? response.data;
}

export default api;
