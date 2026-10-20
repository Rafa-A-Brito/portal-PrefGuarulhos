/**
 * Store de favoritos do navegador (sem servidor, sem login).
 *
 * - Guarda SOMENTE identificadores públicos estáveis (item.id = slug), como um
 *   array JSON em localStorage, na chave versionada CHAVE_FAVORITOS.
 *   Nada de dados pessoais, nada de registros completos, nada de número editorial.
 * - Local a este navegador/perfil: não há sincronização entre dispositivos.
 * - Se o localStorage não existir ou falhar (modo privado, cota, bloqueio), o
 *   estado continua funcionando em memória durante a sessão da página.
 *   Enquanto uma gravação não tiver sucesso (`gravacaoPendente`), a MEMÓRIA é a
 *   fonte da verdade: não relemos o storage (que ficou desatualizado) a cada
 *   interação. Na próxima gravação/recarga bem-sucedida, a memória é gravada e o
 *   fluxo normal volta. Limitação: com o storage permanentemente bloqueado os
 *   favoritos duram só até recarregar a página e não sincronizam entre abas.
 * - Conteúdo inválido/corrompido é ignorado; entradas fora do formato são
 *   descartadas. Ids que não existem mais no catálogo permanecem guardados
 *   (o catálogo pode estar parcial/carregando) mas simplesmente não aparecem.
 *
 * Mudando o formato no futuro, troque o sufixo ":v1" da chave.
 */
export const CHAVE_FAVORITOS = "portal-guarulhos:favoritos:v1";
export const MAX_FAVORITOS = 500;
const MAX_TAMANHO_ID = 200;

const VAZIO = Object.freeze([]);
const listeners = new Set();
let estado = null; // array congelado; null = ainda não carregado
let ouvindoStorage = false;
let gravacaoPendente = false; // true = a última tentativa de gravar falhou

function idValido(valor) {
  return typeof valor === "string" && valor.length > 0 && valor.length <= MAX_TAMANHO_ID;
}

/** Aceita qualquer coisa; devolve array congelado de ids únicos e válidos. */
export function sanitizarFavoritos(bruto) {
  if (!Array.isArray(bruto)) return VAZIO;
  const vistos = new Set();
  for (const valor of bruto) {
    if (idValido(valor)) vistos.add(valor);
    if (vistos.size >= MAX_FAVORITOS) break;
  }
  return vistos.size ? Object.freeze([...vistos]) : VAZIO;
}

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // acesso bloqueado lança SecurityError
  }
}

/** null = armazenamento indisponível; [] = vazio ou conteúdo inválido. */
function lerArmazenamento() {
  const s = storage();
  if (!s) return null;
  try {
    const texto = s.getItem(CHAVE_FAVORITOS);
    if (texto == null) return VAZIO;
    return sanitizarFavoritos(JSON.parse(texto));
  } catch {
    return VAZIO; // JSON inválido ou getItem falhou
  }
}

/** Devolve true se gravou. Falha (cota/bloqueio/ausência): segue só em memória. */
function gravarArmazenamento(lista) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(CHAVE_FAVORITOS, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
}

function iguais(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function notificar() {
  listeners.forEach(fn => fn());
}

function aoMudarStorage(evento) {
  // key === null: localStorage.clear() em outra aba
  if (evento.key !== null && evento.key !== CHAVE_FAVORITOS) return;
  recarregarFavoritos();
}

/** Relê o armazenamento (usado pelo evento "storage" e pelos testes). */
export function recarregarFavoritos() {
  if (gravacaoPendente && estado !== null) {
    // A memória manda: tenta persistir; se não der, mantém o que o usuário fez.
    gravacaoPendente = !gravarArmazenamento(estado);
    if (gravacaoPendente) return;
  }
  const lido = lerArmazenamento();
  const proximo = lido ?? estado ?? VAZIO;
  if (estado === null || !iguais(estado, proximo)) {
    estado = proximo;
    notificar();
  }
}

export function obterFavoritos() {
  if (estado === null) estado = lerArmazenamento() ?? VAZIO;
  return estado;
}

export function assinarFavoritos(fn) {
  listeners.add(fn);
  if (!ouvindoStorage && typeof window !== "undefined") {
    window.addEventListener("storage", aoMudarStorage);
    ouvindoStorage = true;
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size && ouvindoStorage) {
      window.removeEventListener("storage", aoMudarStorage);
      ouvindoStorage = false;
    }
  };
}

/** Adiciona ou remove o id. Ids inválidos são ignorados. */
export function alternarFavorito(id) {
  if (!idValido(id)) return;
  // Com gravação pendente a memória é autoritativa; senão parte do que está
  // gravado agora (outra aba pode ter mudado) quando legível.
  const base = gravacaoPendente ? obterFavoritos() : (lerArmazenamento() ?? obterFavoritos());
  let proximo;
  if (base.includes(id)) proximo = base.filter(x => x !== id);
  else proximo = [...base, id].slice(-MAX_FAVORITOS); // no limite, descarta o mais antigo
  estado = sanitizarFavoritos(proximo);
  gravacaoPendente = !gravarArmazenamento(estado);
  notificar();
}

/** Zera o estado do módulo e relê o armazenamento (usado nos testes). */
export function reiniciarFavoritos() {
  gravacaoPendente = false;
  estado = null;
  obterFavoritos();
  notificar();
}
