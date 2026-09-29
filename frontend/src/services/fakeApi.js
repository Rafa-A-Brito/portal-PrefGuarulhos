/**
 * Esta é a camada que as páginas usam para ler a lista de patrimônios. O
 * nome "fakeApi" ficou do tempo em que não existia backend nenhum e tudo
 * vinha só do arquivo local features/mocks/patrimoniosMock.js. Hoje já
 * existe um backend Express de verdade conversando com MySQL (pasta
 * backend/), então essas funções chamam a API real primeiro.
 *
 * O que ainda faz sentido chamar de "fake" aqui é o comportamento de
 * reserva: se a chamada de rede falhar, por exemplo porque alguém abriu o
 * projeto e rodou só o frontend, sem o backend nem o Docker no ar, a gente
 * cai de volta pros dados locais em vez de mostrar a tela vazia. Isso é só
 * pra dev não ficar travado; não é assim que o site deveria se comportar
 * em produção, onde um erro de rede real precisa aparecer como erro.
 */
import api from "./api";
import { patrimoniosMock } from "../features/mocks/patrimoniosMock";

const LATENCIA_MOCK_MS = 300;

function comLatencia(valor) {
  return new Promise((resolve) => setTimeout(() => resolve(valor), LATENCIA_MOCK_MS));
}

function avisarFallback(origem, err) {
  console.warn(
    `[fakeApi] Não deu pra falar com o backend em "${origem}" (${err.message}). ` +
      "Usando o catálogo local (features/mocks/patrimoniosMock.js) como reserva.",
  );
}

/** GET /patrimonios */
export async function listarPatrimonios() {
  try {
    const { data } = await api.get("/patrimonios");
    return data;
  } catch (err) {
    avisarFallback("GET /patrimonios", err);
    return comLatencia(patrimoniosMock);
  }
}

/** GET /patrimonios/:id */
export async function buscarPatrimonioPorId(id) {
  try {
    const { data } = await api.get(`/patrimonios/${id}`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    avisarFallback(`GET /patrimonios/${id}`, err);
    const encontrado = patrimoniosMock.find((p) => String(p.id) === String(id));
    return comLatencia(encontrado ?? null);
  }
}

export async function obterEstatisticas() {
  const patrimonios = await listarPatrimonios();
  const bairros = new Set(patrimonios.map((p) => p.bairro));
  const categorias = new Set(patrimonios.map((p) => p.categoria));

  return {
    totalBens: patrimonios.length,
    totalBairros: bairros.size,
    totalCategorias: categorias.size,
    primeiroTombamento: 1988,
  };
}

export async function listarCategoriasComContagem() {
  const patrimonios = await listarPatrimonios();

  return patrimonios.reduce((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] || 0) + 1;
    return acc;
  }, {});
}
