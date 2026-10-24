import axios from "axios";
import { CHAVE_SESSAO_MOCK } from "../context/authConstants.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3333/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});
export function lerSessao() {
  try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MOCK) || "null"); }
  catch { return null; }
}
export const tokenDaSessao = () => lerSessao()?.token || null;
const mesmaSessao = (a, b) => (a?.sessionId || b?.sessionId)
  ? !!a?.sessionId && a.sessionId === b?.sessionId
  : !!a?.token && a.token === b?.token;
const rotaDeAutenticacao = url => /(?:^|\/)auth\/(?:login|refresh|logout)(?:\?|$)/.test(url || "");
let renovacao = null;

export function encerrarSessao(snapshot, motivo = "expirou") {
  const atual = lerSessao();
  if (!mesmaSessao(snapshot, atual)) return false;
  sessionStorage.removeItem(CHAVE_SESSAO_MOCK);
  window.dispatchEvent?.(new Event("auth:session-ended"));
  if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
    window.location.assign("/admin/login?" + motivo + "=1");
  }
  return true;
}

async function renovar(snapshot) {
  if (renovacao && mesmaSessao(renovacao.snapshot, snapshot)) return renovacao.promise;
  if (snapshot.renewalUncertain) {
    const error = new Error("Não foi possível confirmar a renovação.");
    error.code = "AUTH_REFRESH_UNCERTAIN";
    throw error;
  }
  const pendente = { snapshot };
  pendente.promise = (async () => {
    try {
      const response = await api.post("/auth/refresh", { refreshToken: snapshot.refreshToken }, { semCredenciais: true });
      const atual = lerSessao();
      if (!mesmaSessao(snapshot, atual) || atual.refreshToken !== snapshot.refreshToken) throw new Error("Sessão substituída durante a renovação.");
      const data = response.data.data;
      if (!data?.token || !data.refreshToken || !Number.isFinite(Date.parse(data.sessionExpiresAt))) throw new Error("Resposta de renovação inválida.");
      const next = { ...atual, token: data.token, refreshToken: data.refreshToken, sessionExpiresAt: data.sessionExpiresAt };
      sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify(next));
      window.dispatchEvent(new Event("auth:session-updated"));
      return next;
    } catch (error) {
      const atual = lerSessao();
      if (mesmaSessao(snapshot, atual) && snapshot.refreshToken === atual.refreshToken) {
        if ([400, 401, 403].includes(error.response?.status)) {
          error.sessaoTratada = true;
          encerrarSessao(snapshot);
        } else {
          // Não reenviar uma credencial cuja rotação pode ter sido confirmada.
          sessionStorage.setItem(CHAVE_SESSAO_MOCK, JSON.stringify({ ...atual, renewalUncertain: true }));
        }
      } else { error.sessaoTratada = true; }
      throw error;
    } finally { if (renovacao === pendente) renovacao = null; }
  })();
  renovacao = pendente;
  return pendente.promise;
}

api.interceptors.request.use(config => {
  const sessao = lerSessao();
  if (!config.semCredenciais && sessao?.token) config.headers.Authorization = `Bearer ${sessao.token}`;
  if (config.semCredenciais) delete config.headers.Authorization;
  config.tokenDaRequisicao = config.semCredenciais ? null : sessao?.token || null;
  config.idDaSessao = config.semCredenciais ? null : sessao?.sessionId || null;
  return config;
});

api.interceptors.response.use(response => response, async error => {
  const config = error.config;
  if (error.response?.status !== 401 || rotaDeAutenticacao(config?.url)) return Promise.reject(error);
  // Downloads de mídia usam Blob, inclusive para o envelope JSON de erro.
  // Decodificar antes da decisão evita tratar expiração renovável como logout.
  if (error.response.data instanceof Blob && error.response.data.type.includes("application/json")) {
    try { error.response.data = JSON.parse(await error.response.data.text()); }
    catch { /* Resposta inválida continua sujeita ao tratamento normal de 401. */ }
  }
  const atual = lerSessao();
  const snapshot = { sessionId: config?.idDaSessao, token: config?.tokenDaRequisicao };
  if (snapshot.token) error.sessaoTratada = true;
  if (!mesmaSessao(snapshot, atual)) return Promise.reject(error);
  if (error.response.data?.error?.code === "ACCESS_TOKEN_EXPIRED" && !config.repetidaAposRenovacao && atual.refreshToken) {
    if (Date.parse(atual.sessionExpiresAt) <= Date.now()) { encerrarSessao(atual); return Promise.reject(error); }
    const next = atual.token !== snapshot.token ? atual : await renovar(atual);
    if (!mesmaSessao(next, lerSessao())) return Promise.reject(error);
    // A API garante rejeição na autenticação, antes de qualquer efeito de negócio.
    config.repetidaAposRenovacao = true;
    return api.request(config);
  }
  // Um 401 antigo não encerra credenciais que já foram renovadas.
  if (atual.token === snapshot.token) encerrarSessao(atual);
  return Promise.reject(error);
});
export default api;
