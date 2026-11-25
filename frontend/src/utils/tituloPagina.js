const PORTAL = "Portal do Patrimônio Cultural de Guarulhos";
const TITULOS = {
  "/": "Início",
  "/patrimonios": "Patrimônios",
  "/mapa": "Mapa",
  "/conheca-mais": "Conheça mais",
  "/conheca-mais/detalhes": "Notícias e eventos",
  "/contato": "Contato",
  "/feedback": "Avalie o portal",
  "/admin/login": "Entrar no painel",
  "/admin": "Dashboard",
  "/admin/patrimonios": "Patrimônios — Administração",
  "/admin/regioes": "Regiões",
  "/admin/usuarios": "Usuários",
  "/admin/auditoria": "Histórico de alterações",
  "/admin/feedback": "Feedback — Administração",
  "/admin/exposicoes": "Exposições",
  "/admin/novidades": "Novidades",
  "/admin/senha": "Alterar senha",
};

export function formatarTituloPagina(titulo) {
  return titulo ? `${titulo} | ${PORTAL}` : PORTAL;
}

export function tituloDaRota(pathname) {
  const caminho = pathname.replace(/\/+$/, "") || "/";
  if (/^\/patrimonios\/[^/]+$/.test(caminho)) return "Carregando patrimônio";
  // Não usar a URL nem dados da sessão como título de rotas desconhecidas.
  return Object.hasOwn(TITULOS, caminho) ? TITULOS[caminho] : "";
}
