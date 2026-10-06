/**
 * Camada que as páginas públicas usam para ler patrimônios e categorias.
 * O nome "fakeApi" é herança do tempo do mock; hoje tudo vem da API real
 * (GET /patrimonios, GET /patrimonios/:slug, GET /categorias).
 *
 * Fallback local: SÓ em desenvolvimento (import.meta.env.DEV) e SÓ quando a
 * rede falha (backend desligado). Em produção, erro de rede é erro: a
 * exceção sobe e o PatrimoniosContext mostra a mensagem. O mock é importado
 * dinamicamente, então não entra no bundle de produção que é carregado.
 *
 * ADAPTAÇÃO DE FORMATO (normalizarPatrimonio): o front foi escrito contra um
 * formato achatado ({ categoria: string, bairro, endereco, resumo,
 * imagemPrincipal, localizacao:{lat,lng}, detalhes }). O backend devolve um
 * formato relacional. A conversão acontece só aqui:
 *   - "id" é o SLUG (a rota pública é GET /patrimonios/:slug e a URL do
 *     front é /patrimonios/:id). O UUID fica em "uuid".
 *   - "categoria" é o slug da categoria PRINCIPAL; "categorias" lista a
 *     principal + as adicionais (usado nos filtros).
 *   - "detalhes" é montado a partir de "historia" e "importanciaCultural".
 */
import api from "./api";

const POR_PAGINA = 100; // máximo aceito pelo backend (limite: 1..100)
const MAX_PAGINAS = 50; // trava de segurança contra loop infinito

function avisarFallback(origem, err) {
  console.warn(
    `[fakeApi] Backend indisponível em "${origem}" (${err.message}). ` +
      "Usando o catálogo local (somente em desenvolvimento).",
  );
}

/** Só cai no mock quando é dev E a falha foi de rede (sem resposta HTTP). */
function podeUsarMock(err) {
  return import.meta.env.DEV && !err.response;
}

async function carregarMock() {
  const { patrimoniosMock } = await import("../features/mocks/patrimoniosMock");
  return patrimoniosMock;
}

/**
 * Formato do backend → formato que o resto do front espera. Se "p" já vier
 * achatado (mock local), devolve como está.
 */
export function normalizarPatrimonio(p) {
  if (!p) return p;
  if (typeof p.categoria === "string") return p;

  const detalhes = [
    p.historia && { icone: "historia", titulo: "História", texto: p.historia },
    p.importanciaCultural && {
      icone: "importancia",
      titulo: "Importância cultural",
      texto: p.importanciaCultural,
    },
  ].filter(Boolean);

  const adicionais = p.categoriasAdicionais ?? [];
  const loc = p.localizacao;

  return {
    id: p.slug,
    slug: p.slug,
    uuid: p.id,
    nome: p.nome,
    categoria: p.categoria?.slug ?? "",
    categoriaId: p.categoria?.id ?? null,
    categorias: [p.categoria?.slug, ...adicionais.map((c) => c.slug)].filter(
      Boolean,
    ),
    categoriasAdicionaisIds: adicionais.map((c) => c.id),
    situacao: p.situacao,
    status: p.status, // só vem nas rotas /admin
    bairro: loc?.bairro ?? "",
    endereco: loc?.endereco ?? "",
    numero: loc?.numero ?? "",
    complemento: loc?.complemento ?? "",
    cep: loc?.cep ?? "",
    resumo: p.descricaoResumida,
    descricao: p.descricao,
    historia: p.historia ?? "",
    importanciaCultural: p.importanciaCultural ?? "",
    imagemPrincipal: p.imagens?.[0]?.url ?? "",
    imagens: p.imagens ?? [],
    localizacao:
      loc?.latitude != null && loc?.longitude != null
        ? { lat: Number(loc.latitude), lng: Number(loc.longitude) }
        : null,
    detalhes,
  };
}

/**
 * Percorre todas as páginas de uma listagem paginada do backend
 * ({ success, data: { itens, paginacao: { pagina, totalPaginas } } }).
 */
export async function buscarTodasAsPaginas(caminho, params = {}) {
  const itens = [];

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina += 1) {
    const { data } = await api.get(caminho, {
      params: { ...params, pagina, limite: POR_PAGINA },
    });
    const { itens: lote = [], paginacao } = data.data;
    itens.push(...lote);

    if (!paginacao || pagina >= paginacao.totalPaginas) break;
  }

  return itens;
}

/** GET /patrimonios (somente PUBLICADOS) */
export async function listarPatrimonios() {
  try {
    const itens = await buscarTodasAsPaginas("/patrimonios");
    return itens.map(normalizarPatrimonio);
  } catch (err) {
    if (!podeUsarMock(err)) throw err;
    avisarFallback("GET /patrimonios", err);
    return carregarMock();
  }
}

/** GET /patrimonios/:slug — devolve null se não existir (404). */
export async function buscarPatrimonioPorId(id) {
  try {
    const { data } = await api.get(`/patrimonios/${id}`);
    return normalizarPatrimonio(data.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    if (!podeUsarMock(err)) throw err;
    avisarFallback(`GET /patrimonios/${id}`, err);
    const mock = await carregarMock();
    return mock.find((p) => String(p.id) === String(id)) ?? null;
  }
}

/** GET /categorias → [{ id, nome, slug, descricao }] */
export async function listarCategorias() {
  const { data } = await api.get("/categorias");
  return data.data;
}

// ===== Cálculos locais (sem nova requisição) =====

export function calcularEstatisticas(patrimonios) {
  return {
    totalBens: patrimonios.length,
    totalBairros: new Set(patrimonios.map((p) => p.bairro).filter(Boolean))
      .size,
    totalCategorias: new Set(patrimonios.flatMap((p) => p.categorias ?? [p.categoria]))
      .size,
    primeiroTombamento: 1988,
  };
}

export function contarPorCategoria(patrimonios) {
  return patrimonios.reduce((acc, item) => {
    for (const slug of item.categorias ?? [item.categoria]) {
      acc[slug] = (acc[slug] || 0) + 1;
    }
    return acc;
  }, {});
}
