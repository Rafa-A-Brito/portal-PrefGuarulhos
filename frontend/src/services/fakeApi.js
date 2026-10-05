/**
 * Esta é a camada que as páginas usam para ler a lista de patrimônios. O
 * nome "fakeApi" ficou do tempo em que não existia backend nenhum e tudo
 * vinha só do arquivo local features/mocks/patrimoniosMock.js. Hoje já
 * existe um backend Express de verdade conversando com Postgres via
 * Prisma (pasta backend/), então essas funções chamam a API real primeiro.
 *
 * O que ainda faz sentido chamar de "fake" aqui é o comportamento de
 * reserva: se a chamada de rede falhar, por exemplo porque alguém abriu o
 * projeto e rodou só o frontend, sem o backend nem o Docker no ar, a gente
 * cai de volta pros dados locais em vez de mostrar a tela vazia. Isso é só
 * pra dev não ficar travado; não é assim que o site deveria se comportar
 * em produção, onde um erro de rede real precisa aparecer como erro.
 *
 * ADAPTAÇÃO DE FORMATO — o motivo de normalizarPatrimonio existir:
 * O resto do frontend (PlaquetaCard, PatrimonioDetalhe, FiltroBar,
 * buscarPatrimonios...) foi escrito contra o formato achatado do mock
 * local: { id, nome, categoria (string), bairro, endereco, cep, resumo,
 * imagemPrincipal, localizacao:{lat,lng}, detalhes:[{icone,titulo,texto}] }.
 * O backend devolve um formato relacional bem diferente: categoria é um
 * objeto { id, nome, slug }, endereço/bairro/cep ficam dentro de
 * "localizacao", a imagem é um array "imagens", e em vez de "detalhes"
 * existem dois campos de texto livre, "historia" e "importanciaCultural".
 * Em vez de reescrever cada componente que consome isso, a normalização
 * acontece aqui, nesta única fronteira — assim o resto do app continua
 * funcionando sem precisar saber que a forma dos dados mudou por baixo.
 *
 * Dois detalhes que vêm desse mapeamento e valem registrar:
 *   - "id" aqui é o SLUG do patrimônio, não o UUID do banco. O resto do
 *     app só usa "id" para montar a URL (/patrimonios/:id) e para comparar
 *     com "String(a.id) === String(b.id)" — nunca faz conta com ele —, e a
 *     rota pública do backend busca por slug (GET /patrimonios/:slug), não
 *     por UUID. Usar o slug aqui faz o roteamento inteiro continuar
 *     funcionando sem mexer em mais nenhum arquivo.
 *   - O badge "Nº 001" do PlaquetaCard (String(item.id).padStart(3,"0"))
 *     foi pensado pros ids sequenciais do mock antigo. Com o slug (ou com
 *     o UUID) no lugar, ele deixa de fazer sentido visualmente — não
 *     quebra, só fica estranho. Isso é uma decisão de produto (dropar o
 *     "Nº", trocar por outra coisa, ou o backend ganhar um número de
 *     tombamento de verdade) que não dá pra resolver só nesta camada.
 */
import api from "./api";
import { patrimoniosMock } from "../features/mocks/patrimoniosMock";

const LATENCIA_MOCK_MS = 300;

function comLatencia(valor) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(valor), LATENCIA_MOCK_MS),
  );
}

function avisarFallback(origem, err) {
  console.warn(
    `[fakeApi] Não deu pra falar com o backend em "${origem}" (${err.message}). ` +
      "Usando o catálogo local (features/mocks/patrimoniosMock.js) como reserva.",
  );
}

/**
 * Formato do backend → formato que o resto do front já espera (ver o
 * comentário grande no topo do arquivo). Se "p" já vier nesse formato
 * achatado (por exemplo, vindo do fallback local patrimoniosMock), ela
 * devolve como está — detecta isso pelo "categoria" já ser string.
 */
function normalizarPatrimonio(p) {
  if (!p) return p;
  if (typeof p.categoria === "string") return p; // já está no formato achatado (mock local)

  const detalhes = [
    p.historia && {
      icone: "historia",
      titulo: "História",
      texto: p.historia,
    },
    p.importanciaCultural && {
      icone: "importancia",
      titulo: "Importância cultural",
      texto: p.importanciaCultural,
    },
  ].filter(Boolean);

  return {
    id: p.slug,
    slug: p.slug,
    uuid: p.id,
    nome: p.nome,
    categoria: p.categoria?.slug ?? "",
    situacao: p.situacao,
    bairro: p.localizacao?.bairro ?? "",
    endereco: p.localizacao?.endereco ?? "",
    cep: p.localizacao?.cep ?? "",
    resumo: p.descricaoResumida,
    descricao: p.descricao,
    imagemPrincipal: p.imagens?.[0]?.url ?? "",
    localizacao:
      p.localizacao?.latitude != null && p.localizacao?.longitude != null
        ? {
            lat: Number(p.localizacao.latitude),
            lng: Number(p.localizacao.longitude),
          }
        : null,
    detalhes,
  };
}

/** GET /patrimonios */
export async function listarPatrimonios() {
  try {
    const { data } = await api.get("/patrimonios");
    // Envelope do backend: { success, data: { itens, paginacao } }.
    return (data.data.itens ?? []).map(normalizarPatrimonio);
  } catch (err) {
    avisarFallback("GET /patrimonios", err);
    return comLatencia(patrimoniosMock);
  }
}

/**
 * Busca por slug (que é o que vira "id" depois de normalizarPatrimonio —
 * ver comentário no topo do arquivo). O nome do parâmetro continua "id"
 * só pra não mudar a assinatura que PatrimonioDetalhe.jsx já chama.
 */
export async function buscarPatrimonioPorId(id) {
  try {
    const { data } = await api.get(`/patrimonios/${id}`);
    return normalizarPatrimonio(data.data);
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
