import api from "./api";
import { buscarTodasAsPaginas, resolverUrlPublica } from "./fakeApi";

function normalizar(item) {
  const imagemUrl = resolverUrlPublica(item.imagemUrl ?? item.imagem);
  const data = item.data?.slice(0, 10);
  return {
    ...item, imagemUrl, imagem: imagemUrl,
    ...(data && {
      data,
      bloco: {
        dia: item.bloco?.dia || data.slice(8, 10),
        mes: item.bloco?.mes || new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
        legenda: item.bloco?.legenda || "",
      },
    }),
    fontes: item.fontes ?? [],
  };
}

async function listarPublico(recurso) {
  try {
    return (await buscarTodasAsPaginas(`/${recurso}`)).map(normalizar);
  } catch (error) {
    const falhaRede = !error.response && ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error.code);
    if (!import.meta.env.DEV || !falhaRede) throw error;
    console.warn(`[conteudoApi] ${recurso}: servidor indisponível; exemplos locais somente em DEV.`);
    const { conteudoMock } = await import("../features/mocks/conteudoMock");
    return conteudoMock[recurso].map((item) => ({ ...normalizar(item), demonstracao: true }));
  }
}
export const listarExposicoes = () => listarPublico("exposicoes");
export const listarNovidades = () => listarPublico("novidades");

function criarApiAdmin(recurso) {
  const rota = `/admin/${recurso}`;
  async function salvar(id, dados, arquivo) {
    let body = dados;
    let config;
    if (arquivo) {
      body = new FormData();
      for (const [nome, valor] of Object.entries(dados)) {
        if (valor !== undefined) body.append(nome, typeof valor === "string" ? valor : JSON.stringify(valor));
      }
      body.append("imagem", arquivo);
      config = { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 };
    }
    const { data } = id ? await api.patch(`${rota}/${id}`, body, config) : await api.post(rota, body, config);
    return normalizar(data.data);
  }
  return {
    listar: async () => (await buscarTodasAsPaginas(rota)).map(normalizar),
    detalhe: async (id) => normalizar((await api.get(`${rota}/${id}`)).data.data),
    criar: (dados, arquivo) => salvar(null, dados, arquivo),
    atualizar: (id, dados, arquivo) => salvar(id, dados, arquivo),
    publicar: async (id) => (await api.patch(`${rota}/${id}/publicar`)).data.data,
    arquivar: async (id) => (await api.patch(`${rota}/${id}/arquivar`)).data.data,
    excluir: async (id) => (await api.delete(`${rota}/${id}`)).data.data,
  };
}
export const exposicoesAdminApi = criarApiAdmin("exposicoes");
export const novidadesAdminApi = criarApiAdmin("novidades");
