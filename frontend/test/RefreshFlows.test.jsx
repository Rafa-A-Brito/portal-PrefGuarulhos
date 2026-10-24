import { useContext } from "react";
import { Blob as NodeBlob } from "node:buffer";
import { ErroModalProvider } from "../src/context/ErroModalContext";
import { ErroModalContext } from "../src/context/erroModalContextInstance";
import { normalizarErro } from "../src/utils/erros";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../src/services/api";
import { AuthProvider } from "../src/context/AuthContext";
import { CHAVE_SESSAO_MOCK } from "../src/context/authConstants";
import { useAuth } from "../src/hooks/useAuth";
import LoginAdmin from "../src/features/admin/pages/LoginAdmin";
vi.mock("../src/hooks/useErroModal", () => ({ useErroModal: () => ({ mostrarErro: vi.fn() }) }));
const originalAdapter = api.defaults.adapter;
const user = { id:"user",name:"Pessoa",email:"pessoa@example.test",role:"ADMIN" };
const session = (values={}) => { const value={ token:"old-access",refreshToken:"old-refresh",sessionId:"local-session",sessionExpiresAt:new Date(Date.now()+28800000).toISOString(),user,...values };sessionStorage.setItem(CHAVE_SESSAO_MOCK,JSON.stringify(value));return value; };
const stored=()=>JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MOCK));
const fail=(config,status=401,code="ACCESS_TOKEN_EXPIRED")=>Promise.reject({config,response:{status,data:{error:{code}}}});
const ok=(config,data={})=>({config,status:200,headers:{},data});
const renewed=config=>ok(config,{data:{token:"new-access",refreshToken:"new-refresh",sessionExpiresAt:stored().sessionExpiresAt}});
const pause=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
beforeEach(()=>{sessionStorage.clear();vi.spyOn(console,"error").mockImplementation(()=>{});});
afterEach(()=>{cleanup();api.defaults.adapter=originalAdapter;sessionStorage.clear();vi.useRealTimers();vi.restoreAllMocks();});

describe("renovacao central do cliente HTTP",()=>{
 it.each(["ACCESS_TOKEN_EXPIRED", "UNAUTHORIZED"])("trata 401 JSON em Blob de mídia: %s", async code => {
  vi.stubGlobal("Blob", NodeBlob);
  try {
   session();
   const adapter = vi.fn(async config => {
    if (config.url === "/auth/refresh") return renewed(config);
    if (config.headers.Authorization === "Bearer old-access") {
     throw { config, response: { status: 401, data: new Blob([JSON.stringify({ error: { code } })], { type: "application/json; charset=utf-8" }) } };
    }
    return ok(config, new Blob(["imagem"], { type: "image/png" }));
   });
   api.defaults.adapter = adapter;
   const request = api.get("http://localhost:3333/uploads/exposicoes/teste.png", { responseType: "blob" });
   if (code === "ACCESS_TOKEN_EXPIRED") {
    expect((await request).data.type).toBe("image/png");
    expect(stored().token).toBe("new-access");
    expect(adapter).toHaveBeenCalledTimes(3);
   } else {
    await expect(request).rejects.toBeDefined();
    expect(stored()).toBeNull();
    expect(adapter).toHaveBeenCalledTimes(1);
   }
  } finally { vi.unstubAllGlobals(); }
 });
 it("modal nao registra Authorization nem refresh bruto em erros Axios",async()=>{
  function Falhar(){const {mostrarErro}=useContext(ErroModalContext);return <button onClick={()=>mostrarErro({message:"offline",config:{headers:{Authorization:"Bearer access-secreto"},data:JSON.stringify({refreshToken:"refresh-secreto"})}})}>Falhar</button>;}
  render(<ErroModalProvider><Falhar/></ErroModalProvider>);await act(async()=>fireEvent.click(screen.getByText("Falhar")));
  const logs=JSON.stringify(console.error.mock.calls);expect(logs).not.toContain("access-secreto");expect(logs).not.toContain("refresh-secreto");
  expect(normalizarErro({code:"AUTH_REFRESH_UNCERTAIN"}).mensagem).toContain("Saia e entre novamente");
 });

 it("compartilha uma renovacao e repete cada escrita/upload apenas uma vez",async()=>{
  session();const pending=pause();const seen=[];
  const adapter=vi.fn(async config=>{
   seen.push({url:config.url,body:config.data});
   if(config.url==="/auth/refresh"){await pending.promise;return renewed(config);}
   if(config.headers.Authorization==="Bearer old-access")return fail(config);
   return ok(config,{success:true});
  });api.defaults.adapter=adapter;
  const body=new FormData();body.append("arquivo",new Blob(["fixture"],{type:"image/png"}),"imagem.png");
  const a=api.post("/admin/items",{titulo:"Titulo"});const b=api.post("/admin/upload",body,{headers:{"Content-Type":"multipart/form-data"}});const c=api.get("/admin/items");
  await vi.waitFor(()=>expect(seen.filter(r=>r.url==="/auth/refresh")).toHaveLength(1));pending.resolve();await Promise.all([a,b,c]);
  expect(adapter).toHaveBeenCalledTimes(7);expect(stored().token).toBe("new-access");
  const uploads=seen.filter(r=>r.url==="/admin/upload");expect(uploads).toHaveLength(2);expect(uploads[0].body).toBe(body);expect(uploads[1].body).toBe(body);
  const writes=seen.filter(r=>r.url==="/admin/items"&&r.body);expect(writes[0].body).toBe(writes[1].body);
 });
 it("reaproveita tokens novos para uma resposta expirada atrasada sem rotacionar novamente",async()=>{
  session();const late=pause();let refreshes=0;
  api.defaults.adapter=async config=>{if(config.url==="/auth/refresh"){refreshes++;return renewed(config);}if(config.url==="/late"&&!config.repetidaAposRenovacao){await late.promise;return fail(config);}if(config.headers.Authorization==="Bearer old-access")return fail(config);return ok(config);};
  const old=api.get("/late");await api.get("/first");late.resolve();await old;expect(refreshes).toBe(1);
 });
 it("nao renova credencial invalida, nem login, refresh ou logout",async()=>{
  session();const adapter=vi.fn(config=>fail(config,401,"UNAUTHORIZED"));api.defaults.adapter=adapter;
  await expect(api.get("/admin/items")).rejects.toBeDefined();expect(stored()).toBe(null);expect(adapter).toHaveBeenCalledTimes(1);
  for(const route of ["login","refresh","logout"]){session();await expect(api.post("/auth/"+route,{})).rejects.toBeDefined();expect(stored()).not.toBe(null);}
  expect(adapter).toHaveBeenCalledTimes(4);
 });
 it("rejeicao definitiva da renovacao limpa credenciais",async()=>{
  session();api.defaults.adapter=config=>fail(config,401,config.url==="/auth/refresh"?"UNAUTHORIZED":"ACCESS_TOKEN_EXPIRED");
  await expect(api.get("/admin/items")).rejects.toMatchObject({sessaoTratada:true});expect(stored()).toBe(null);
 });
 it.each(["rede",503,429])("falha %s preserva sessao e nao repete refresh de resultado incerto",async type=>{
  session();let refreshes=0;api.defaults.adapter=config=>{if(config.url==="/auth/refresh"){refreshes++;return type==="rede"?Promise.reject(new Error("network")):fail(config,type);}return fail(config);};
  await expect(api.post("/admin/items",{})).rejects.toBeDefined();expect(stored().renewalUncertain).toBe(true);
  await expect(api.post("/admin/items",{})).rejects.toBeDefined();expect(refreshes).toBe(1);expect(stored()).not.toBe(null);
 });
 it("nao repete depois de uma segunda expiracao nem renova por rede ou 403",async()=>{
  session();let count=0;api.defaults.adapter=async config=>{count++;return config.url==="/auth/refresh"?renewed(config):fail(config);};
  await expect(api.get("/admin/items")).rejects.toBeDefined();expect(count).toBe(3);
  for(const status of [403,500]){session();const adapter=vi.fn(config=>fail(config,status));api.defaults.adapter=adapter;await expect(api.post("/admin/items",{})).rejects.toBeDefined();expect(adapter).toHaveBeenCalledTimes(1);expect(stored()).not.toBe(null);}
 });
 it("renovacao pendente nao sobrescreve novo login nem repete a escrita antiga",async()=>{
  session();const pending=pause();let requests=0;api.defaults.adapter=async config=>{if(config.url==="/auth/refresh"){await pending.promise;return ok(config,{data:{token:"late",refreshToken:"late-refresh",sessionExpiresAt:new Date(Date.now()+10000).toISOString()}});}requests++;return fail(config);};
  const request=api.post("/admin/items",{}).catch(error=>error);await vi.waitFor(()=>expect(requests).toBe(1));
  await new Promise(resolve=>setTimeout(resolve,0));session({token:"other-access",refreshToken:"other-refresh",sessionId:"other-session"});pending.resolve();await request;
  expect(stored().token).toBe("other-access");expect(requests).toBe(1);
 });
 it("logout local durante refresh impede recriar sessao; falha remota e informada",async()=>{
  session();const pending=pause();let refreshing=false;
  api.defaults.adapter=async config=>{if(config.url==="/auth/refresh"){refreshing=true;await pending.promise;return ok(config,{data:{token:"late",refreshToken:"late-refresh",sessionExpiresAt:new Date(Date.now()+10000).toISOString()}});}if(config.url==="/auth/logout")throw new Error("offline");return fail(config);};
  function Estado(){const {autenticado,logout,motivoSaida}=useAuth();return <><span>{autenticado?"ativa":"encerrada"}</span><span>{motivoSaida}</span><button onClick={()=>logout()}>Sair</button></>;}
  render(<AuthProvider><Estado/></AuthProvider>);await screen.findByText("ativa");
  const request=api.get("/admin/items").catch(error=>error);await vi.waitFor(()=>expect(refreshing).toBe(true));
  await act(async()=>{fireEvent.click(screen.getByText("Sair"));});pending.resolve();await request;
  expect(stored()).toBe(null);expect(screen.getByText("encerrada")).toBeDefined();expect(screen.getByText("logoutLocal")).toBeDefined();
 });
 it("fim do prazo absoluto encerra localmente com relogio controlado",async()=>{
  vi.useFakeTimers();session({sessionExpiresAt:new Date(Date.now()+2000).toISOString()});
  function Estado(){const {autenticado}=useAuth();return <span>{autenticado?"ativa":"encerrada"}</span>;}
  render(<AuthProvider><Estado/></AuthProvider>);expect(screen.getByText("ativa")).toBeDefined();
  await act(async()=>{vi.advanceTimersByTime(2001);});expect(stored()).toBe(null);expect(screen.getByText("encerrada")).toBeDefined();
 });
});

describe("mensagem fixa de espera",()=>{
 it.each([[121,"aproximadamente 3 minutos"],[60,"Aguarde um instante"],[undefined,"Aguarde alguns minutos"],["invalido","Aguarde alguns minutos"]])("Retry-After %s usa mensagem fixa e prazo interno",async(header,message)=>{
  vi.useFakeTimers();const adapter=vi.fn(config=>Promise.reject({config,response:{status:429,headers:{"retry-after":header},data:{}}}));api.defaults.adapter=adapter;
  const view=render(<MemoryRouter><AuthProvider><Routes><Route path="/" element={<LoginAdmin/>}/></Routes></AuthProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("E-mail institucional"),{target:{value:"pessoa@example.test"}});fireEvent.change(screen.getByLabelText("Senha"),{target:{value:"SenhaInicial123!"}});
  await act(async()=>fireEvent.submit(screen.getByRole("button",{name:"Entrar"}).closest("form")));
  expect(screen.getByRole("alert").textContent).toContain(message);const original=screen.getByRole("alert").textContent;
  if(typeof header==="number"){
   expect(screen.getByRole("button",{name:"Entrar"}).disabled).toBe(true);await act(async()=>vi.advanceTimersByTime(1000));expect(screen.getByRole("alert").textContent).toBe(original);
   await act(async()=>vi.advanceTimersByTime(header*1000));expect(screen.queryByRole("alert")).toBe(null);expect(screen.getByRole("button",{name:"Entrar"}).disabled).toBe(false);
  }else expect(screen.getByRole("button",{name:"Entrar"}).disabled).toBe(false);
  expect(screen.getByLabelText("E-mail institucional").value).toBe("pessoa@example.test");expect(adapter).toHaveBeenCalledTimes(1);view.unmount();expect(vi.getTimerCount()).toBe(0);
 });
});
