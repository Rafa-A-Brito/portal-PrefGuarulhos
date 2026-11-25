import { readFileSync } from "node:fs";
import { useEffect, useRef, useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { useOrientacaoPagina } from "../src/hooks/useOrientacaoPagina";
import { formatarTituloPagina } from "../src/utils/tituloPagina";
import Navbar from "../src/components/Navbar/NavBar";
import PatrimonioDetalhe from "../src/pages/PatrimonioDetalhe/PatrimonioDetalhe";
import { AuthContext } from "../src/context/AuthContextInstance";
import { PatrimoniosContext } from "../src/context/patrimoniosContextInstance";
import { buscarPatrimonioPorId } from "../src/services/patrimoniosApi";

vi.mock("../src/services/patrimoniosApi", async original => ({
  ...await original(), buscarPatrimonioPorId: vi.fn(),
}));
afterEach(() => vi.restoreAllMocks());

function Layout({ aguardando = false }) {
  useOrientacaoPagina(aguardando);
  return <AuthContext.Provider value={{ autenticado: false, carregando: false }}>
    <Navbar />{aguardando ? <p role="status">Carregando painel</p> : <main><Outlet /></main>}
  </AuthContext.Provider>;
}
function Pagina({ nome = "Página", autofocus = false, modal = false }) {
  const campo = useRef(null);
  useEffect(() => { if (autofocus) campo.current.focus(); }, [autofocus]);
  return <><h1>{nome}</h1><input aria-label="Filtro" ref={campo} />
    <button>Ação</button>{modal && <div role="dialog" aria-modal="true"><button autoFocus>Fechar diálogo</button></div>}</>;
}
function abrir(inicio = "/", filhos = [{ path: "*", element: <Pagina /> }], layout = <Layout />) {
  const router = createMemoryRouter([{ element: layout, children: filhos }], { initialEntries: [inicio] });
  render(<RouterProvider router={router} />);
  return router;
}
const navegar = (router, destino) => act(async () => { await router.navigate(destino); });
const quadro = () => act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });

test("documento servido declara português brasileiro", () => {
  const html = readFileSync("index.html", "utf8");
  expect(new DOMParser().parseFromString(html, "text/html").documentElement.lang).toBe("pt-BR");
});

test.each([
  ["/", "Início"], ["/patrimonios", "Patrimônios"], ["/mapa", "Mapa"],
  ["/conheca-mais", "Conheça mais"], ["/conheca-mais/detalhes", "Notícias e eventos"],
  ["/contato", "Contato"], ["/feedback", "Avalie o portal"],
  ["/admin/login", "Entrar no painel"], ["/admin", "Dashboard"],
  ["/admin/patrimonios", "Patrimônios — Administração"], ["/admin/regioes", "Regiões"],
  ["/admin/usuarios", "Usuários"], ["/admin/auditoria", "Histórico de alterações"],
  ["/admin/feedback", "Feedback — Administração"], ["/admin/exposicoes", "Exposições"],
  ["/admin/novidades", "Novidades"], ["/admin/senha", "Alterar senha"],
])("título de %s preserva o portal sem usar query sensível", (rota, titulo) => {
  abrir(rota + "?segredo=nao-expor");
  expect(document.title).toBe(formatarTituloPagina(titulo));
});

test("rota desconhecida não expõe caminho nem inventa uma página 404", () => {
  abrir("/conta-confidencial?token=secreto");
  expect(document.title).toBe(formatarTituloPagina(""));
});

test("fechar busca por teclado retorna à lupa remontada", async () => {
  const user = userEvent.setup(); abrir();
  screen.getByRole("button", { name: "Buscar", exact: true }).focus();
  await user.keyboard("{Enter}");
  expect(document.activeElement).toBe(screen.getByPlaceholderText("Buscar patrimônios..."));
  await user.type(document.activeElement, "Centro");
  await user.tab();await user.keyboard("{Enter}");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Buscar", exact: true }));
  expect(screen.queryByPlaceholderText("Buscar patrimônios...")).toBeNull();
});

test("troca de página, voltar e avançar orientam ao título sem adicionar parada de Tab", async () => {
  const router = abrir("/", [
    {path:"/",element:<Pagina key="inicio" nome="Início"/>}, {path:"/mapa",element:<Pagina key="mapa" nome="Mapa"/>},
  ]);
  expect(document.activeElement).toBe(document.body);
  await navegar(router,"/mapa");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Mapa"})));
  expect(document.activeElement.tabIndex).toBe(-1);
  await userEvent.setup().tab();expect(document.activeElement).toBe(screen.getByLabelText("Filtro"));
  expect(screen.getByRole("heading").hasAttribute("tabindex")).toBe(false);
  await navegar(router,-1);await quadro();expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Início"}));
  await navegar(router,1);await quadro();expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Mapa"}));
});

test("digitação, query, hash e histórico de filtro não capturam foco", async () => {
  const router=abrir("/patrimonios");const campo=screen.getByLabelText("Filtro");
  await userEvent.setup().type(campo,"Centro");
  await navegar(router,"/patrimonios?busca=Centro");await quadro();expect(document.activeElement).toBe(campo);
  await navegar(router,"/patrimonios?busca=Centro#fontes");await quadro();expect(document.activeElement).toBe(campo);
  await navegar(router,-1);await quadro();expect(document.activeElement).toBe(campo);
  expect(document.title).toBe(formatarTituloPagina("Patrimônios"));
});

test.each(["formulario","dialogo"])("respeita foco local de %s na nova página", async modo => {
  const router=abrir("/",[{path:"/",element:<Pagina/>},{path:"/contato",element:<Pagina autofocus={modo==="formulario"} modal={modo==="dialogo"}/>}]);
  await navegar(router,"/contato");await quadro();
  expect(document.activeElement).toBe(modo==="formulario"?screen.getByLabelText("Filtro"):screen.getByRole("button",{name:"Fechar diálogo"}));
});

test("troca com âncora conserva gestão local e não foca título da página", async () => {
  const router=abrir();await navegar(router,"/conheca-mais/detalhes#fontes");await quadro();
  expect(document.activeElement).not.toBe(screen.getByRole("heading"));
});

test("transição administrativa informa carregamento e foca somente quando o conteúdo chega", async () => {
  let liberar;
  function Transicao(){const [pendente,setPendente]=useState(true);useEffect(()=>{liberar=()=>setPendente(false);},[]);return <Layout aguardando={pendente}/>;}
  const router=abrir("/",[{path:"*",element:<Pagina nome="Dashboard"/>}],<Transicao/>);
  await navegar(router,"/admin");await quadro();
  expect(document.title).toBe(formatarTituloPagina("Carregando Dashboard"));
  expect(document.activeElement).toBe(document.body);
  await act(async()=>liberar());await quadro();
  expect(document.title).toBe(formatarTituloPagina("Dashboard"));
  expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Dashboard"}));
});

function detalhe(){return <PatrimoniosContext.Provider value={{patrimonios:[],setSelecionado:vi.fn()}}><PatrimonioDetalhe/></PatrimoniosContext.Provider>;}
test("detalhe usa nome real após carregamento e não recupera foco durante atualização", async () => {
  let resolver;buscarPatrimonioPorId.mockReturnValue(new Promise(r=>{resolver=r;}));
  const router=abrir("/",[{path:"/",element:<Pagina/>},{path:"/contato",element:<Pagina/>},{path:"/patrimonios/:id",element:detalhe()}]);
  await navegar(router,"/patrimonios/bem-real");await quadro();
  expect(document.title).toBe(formatarTituloPagina("Carregando patrimônio"));
  expect(document.activeElement).toBe(screen.getByRole("main"));
  const lupa=screen.getByRole("button",{name:"Buscar",exact:true});lupa.focus();
  await act(async()=>resolver({id:"bem-real",nome:"Casa & Memória <histórica>",imagens:[]}));
  expect(document.title).toBe(formatarTituloPagina("Casa & Memória <histórica>"));
  expect(document.activeElement).toBe(lupa);
  await navegar(router,"/contato");await quadro();expect(document.title).toBe(formatarTituloPagina("Contato"));
});

test.each(["erro","ausente"])("título do detalhe distingue estado %s", async estado => {
  if(estado==="erro")buscarPatrimonioPorId.mockRejectedValue(new Error("informação privada"));
  else buscarPatrimonioPorId.mockResolvedValue(null);
  abrir("/patrimonios/inexistente",[{path:"/patrimonios/:id",element:detalhe()}]);
  await waitFor(()=>expect(document.title).toBe(formatarTituloPagina(estado==="erro"?"Não foi possível carregar o patrimônio":"Patrimônio não encontrado")));
  expect(document.title).not.toContain("privada");
});
