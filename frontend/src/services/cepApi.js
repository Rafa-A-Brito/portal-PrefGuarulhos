// Contrato público: https://viacep.com.br/ (sem sessão/token do backend).
const cache = new Map();
const TIMEOUT_MS = 8000;

export function normalizarCep(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function erroCep(codigo, mensagem) {
  return Object.assign(new Error(mensagem), { codigo });
}

export async function consultarCep(valor, { signal } = {}) {
  const cep = normalizarCep(valor);
  if (!/^\d{8}$/.test(cep)) {
    throw erroCep("CEP_INVALIDO", "Informe um CEP válido, com 8 dígitos.");
  }
  if (signal?.aborted) throw new DOMException("Consulta cancelada.", "AbortError");
  if (cache.has(cep)) return { ...cache.get(cep) };

  const controller = new AbortController();
  const cancelar = () => controller.abort();
  signal?.addEventListener("abort", cancelar, { once: true });
  const timeout = setTimeout(cancelar, TIMEOUT_MS);

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      credentials: "omit",
    });
    if (!resposta.ok) throw new Error("Falha HTTP na consulta de CEP.");
    const dados = await resposta.json();
    // Mesmo um transporte que termine após o cancelamento não alimenta o cache.
    if (controller.signal.aborted) throw new DOMException("Consulta cancelada.", "AbortError");
    if (dados?.erro === true || dados?.erro === "true") {
      throw erroCep("CEP_NAO_ENCONTRADO", "CEP não encontrado. Preencha o endereço manualmente.");
    }
    if (
      normalizarCep(dados?.cep) !== cep ||
      typeof dados?.logradouro !== "string" ||
      typeof dados?.bairro !== "string" ||
      typeof dados?.localidade !== "string" || !dados.localidade.trim() ||
      typeof dados?.uf !== "string" || !/^[A-Z]{2}$/.test(dados.uf)
    ) {
      throw new Error("Resposta inválida do serviço de CEP.");
    }
    const resultado = {
      cep,
      endereco: dados.logradouro.trim(),
      bairro: dados.bairro.trim(),
      cidade: dados.localidade.trim(),
      uf: dados.uf,
    };
    cache.set(cep, resultado);
    return { ...resultado };
  } catch (erro) {
    if (signal?.aborted) throw new DOMException("Consulta cancelada.", "AbortError");
    if (erro.codigo === "CEP_NAO_ENCONTRADO") throw erro;
    throw erroCep("CEP_INDISPONIVEL", "Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancelar);
  }
}
