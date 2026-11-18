import { STATUS_VISITACAO } from "../visitacao";

export const FUSO_AUDITORIA = "America/Sao_Paulo";
export const RECURSOS_AUDITORIA = {
  User: "Usuários", Patrimonio: "Patrimônios", RegiaoPatrimonio: "Regiões",
  PatrimonioImagem: "Patrimônios · Imagens", PatrimonioDocumento: "Patrimônios · Documentos/referências",
  PatrimonioFato: "Patrimônios · Fatos", PatrimonioLigacao: "Patrimônios · Ligações",
  Exposicao: "Exposições", Novidade: "Novidades",
};
const tipos = {
  USER: ["User", "usuário"], PATRIMONIO: ["Patrimonio", "patrimônio"], REGIAO: ["RegiaoPatrimonio", "região"],
  IMAGEM: ["PatrimonioImagem", "imagem"], DOCUMENTO: ["PatrimonioDocumento", "documento/referência"],
  FATO: ["PatrimonioFato", "fato"], LIGACAO: ["PatrimonioLigacao", "ligação"],
  EXPOSICAO: ["Exposicao", "exposição"], NOVIDADE: ["Novidade", "novidade"],
};
const verbos = {
  CREATE: ["Criação", "criou"], UPDATE: ["Atualização", "alterou"], DELETE: ["Exclusão", "excluiu"],
  PUBLISH: ["Publicação", "publicou"], ARCHIVE: ["Arquivamento", "arquivou"],
  ACTIVATE: ["Ativação", "ativou"], DEACTIVATE: ["Desativação", "desativou"],
  PASSWORD_CHANGE: ["Troca de senha", "alterou a senha de"], REORDER: ["Reordenação", "reordenou"],
};
// Emissores operacionais reais fora da enumeração dos serviços HTTP.
// Não inferir a operação específica de um importador a partir do prefixo.
const operacionais = {
  INITIAL_LOAD_BINDING: { entidades: ["Patrimonio"], rotulo: "Vinculação à carga inicial" },
  SYNC_PATRIMONIO: { entidades: ["Patrimonio"], rotulo: "Sincronização de patrimônio" },
  D1C_EDITORIAL_IMPORT: { entidades: ["PatrimonioFato", "PatrimonioLigacao"], rotulo: "Importação editorial" },
};
export const ACOES_AUDITORIA = { ...Object.fromEntries([
  ...Object.keys(tipos).flatMap(p => ["CREATE", "UPDATE", "DELETE"].map(v => [p, v])),
  ...["PATRIMONIO", "EXPOSICAO", "NOVIDADE"].flatMap(p => ["PUBLISH", "ARCHIVE"].map(v => [p, v])),
  ...["ACTIVATE", "DEACTIVATE", "PASSWORD_CHANGE"].map(v => ["USER", v]),
  ...["FATO", "LIGACAO"].map(p => [p, "REORDER"]),
].map(([p, v]) => [`${p}_${v}`, `${RECURSOS_AUDITORIA[tipos[p][0]]} · ${verbos[v][0]}`])),
...Object.fromEntries(Object.entries(operacionais).map(([acao, dado]) => [acao, dado.rotulo])) };

const comuns = ["slug", "status", "publicadoEm", "arquivadoEm"];
// Lista positiva independente de dados recebidos. Nunca mostrar JSON bruto por fallback.
const campos = {
  User: ["name", "email", "role", "isActive"], RegiaoPatrimonio: ["nome", "slug", "descricao", "ativo"],
  Patrimonio: [...comuns, "nome", "regiaoId", "numeroExibicao", "ordemExibicao", "descricao", "descricaoResumida", "historia", "importanciaCultural", "situacao", "statusVisitacao", "motivoRestricao", "previsaoReabertura", "categoriaId", "categoriasAdicionais", "localizacao"],
  PatrimonioImagem: ["patrimonioId", "titulo", "textoAlternativo", "credito", "fonte", "ordem", "principal", "url", "principais", "principaisSubstituidas"],
  PatrimonioDocumento: ["patrimonioId", "titulo", "descricao", "url", "tipo", "fonte", "dataDocumento", "mimeType"],
  PatrimonioFato: ["patrimonioId", "rotulo", "valor", "ordem", "itens"],
  PatrimonioLigacao: ["patrimonioOrigemId", "patrimonioDestinoId", "texto", "ordem", "itens"],
  Exposicao: [...comuns, "titulo", "artista", "local", "periodo", "bio", "imagemUrl", "ctaSaibaMais"],
  Novidade: [...comuns, "tipo", "tag", "data", "titulo", "resumo", "texto", "quando", "local", "imagemUrl", "blocoDia", "blocoMes", "blocoLegenda", "ctaRotulo", "ctaUrl", "fontes"],
};
const local = { endereco: "Endereço", numero: "Número", complemento: "Complemento", bairro: "Bairro", cidade: "Cidade", uf: "UF", cep: "CEP", latitude: "Latitude", longitude: "Longitude" };
const rotulos = {
  name: "Nome", nome: "Nome", email: "E-mail", role: "Perfil", isActive: "Ativo", ativo: "Ativa", slug: "Slug", descricao: "Descrição",
  regiaoId: "Região (ID)", numeroExibicao: "Número de exibição", ordemExibicao: "Ordem de exibição", descricaoResumida: "Resumo",
  historia: "História", importanciaCultural: "Importância cultural", situacao: "Conservação", status: "Publicação", categoriaId: "Categoria principal (ID)",
  statusVisitacao: "Visitação", motivoRestricao: "Motivo da restrição", previsaoReabertura: "Previsão de reabertura",
  categoriasAdicionais: "Categorias adicionais (IDs)", localizacao: "Localização", publicadoEm: "Publicado em", arquivadoEm: "Arquivado em",
  patrimonioId: "Patrimônio (ID)", patrimonioOrigemId: "Patrimônio de origem (ID)", patrimonioDestinoId: "Patrimônio de destino (ID)",
  titulo: "Título", textoAlternativo: "Texto alternativo", credito: "Crédito", fonte: "Fonte", ordem: "Ordem", principal: "Principal", url: "URL",
  principais: "Imagens principais (IDs)", principaisSubstituidas: "Principais substituídas (IDs)", tipo: "Tipo", dataDocumento: "Data do documento",
  mimeType: "Tipo de arquivo", rotulo: "Rótulo", valor: "Valor", itens: "Itens reordenados (ID e ordem)", texto: "Texto", artista: "Artista",
  local: "Local", periodo: "Período", bio: "Biografia", imagemUrl: "Imagem", ctaSaibaMais: "Link Saiba mais", tag: "Tag", data: "Data",
  resumo: "Resumo", quando: "Quando", blocoDia: "Dia do bloco", blocoMes: "Mês do bloco", blocoLegenda: "Legenda do bloco",
  ctaRotulo: "Rótulo do link", ctaUrl: "Destino do link", fontes: "Fontes documentais",
};
const urls = new Set(["url", "imagemUrl", "ctaSaibaMais", "ctaUrl", "fonte"]);
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export const idAuditoria = v => typeof v === "string" && uuid.test(v) ? v : "Não disponível";
const texto = v => typeof v === "string" ? v : "";
const possui = (obj, key) => obj && typeof obj === "object" && Object.hasOwn(obj, key);
const codigo = v => /^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(v ?? "") ? v : "Não disponível";
export function responsavelAuditoria(evento) {
  return texto(evento.user?.name) || texto(evento.user?.email) || "Responsável não disponível no registro";
}
export function dataHoraAuditoria(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "Data não disponível";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_AUDITORIA, dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}
export const recursoAuditoria = e => Object.hasOwn(RECURSOS_AUDITORIA, e.entity) ? RECURSOS_AUDITORIA[e.entity] : "Recurso não identificado";
export function acaoAuditoria(e) {
  if (!Object.hasOwn(ACOES_AUDITORIA, e.action)) return "Ação não identificada";
  if (Object.hasOwn(operacionais, e.action)) return operacionais[e.action].entidades.includes(e.entity)
    ? operacionais[e.action].rotulo : "Ação não identificada";
  return tipos[e.action.split("_")[0]]?.[0] === e.entity
    ? verbos[e.action.split("_").slice(1).join("_")][0] : "Ação não identificada";
}
const alvos = {
  User: ["Conta administrativa", "name", "email"], Patrimonio: ["Patrimônio", "nome", "slug"],
  RegiaoPatrimonio: ["Região", "nome", "slug"], PatrimonioImagem: ["Imagem", "titulo", "textoAlternativo"],
  PatrimonioDocumento: ["Documento/referência", "titulo"], PatrimonioFato: ["Fato", "rotulo"],
  PatrimonioLigacao: ["Ligação entre patrimônios", "texto"], Exposicao: ["Exposição", "titulo", "slug"],
  Novidade: ["Novidade", "titulo", "slug"],
};
export function alvoAuditoria(evento) {
  const reordena = ["FATO_REORDER", "LIGACAO_REORDER"].includes(evento.action) && acaoAuditoria(evento) !== "Ação não identificada";
  const [tipo, ...identificadores] = Object.hasOwn(alvos, evento.entity) ? alvos[evento.entity] : ["Registro"];
  // Nunca usa evento.user: identifica o ator atual, não o alvo histórico.
  if (!reordena && evento.action !== "USER_PASSWORD_CHANGE" && acaoAuditoria(evento) !== "Ação não identificada") {
    for (const origem of ["newValues", "oldValues"]) for (const campo of identificadores) {
      const nome = texto(evento[origem]?.[campo]).trim();
      if (nome) return { titulo: nome, tipo, origem: origem === "newValues" ? "Identificação nos valores posteriores" : "Identificação nos valores anteriores" };
    }
  }
  return { titulo: reordena ? "Itens do patrimônio" : tipo, tipo,
    origem: reordena ? "Reordenação no patrimônio identificado abaixo" : "Nome do alvo não informado neste evento" };
}

function urlSegura(v, campo) {
  if (campo === "fonte" && !/^[a-z][a-z\d+.-]*:|^\/|\\/i.test(v)) return v;
  if (/^\/(?:api\/uploads|uploads|arquivos\/patrimonios|patrimonios|conheca-mais|mapa)(?:\/|$)/.test(v) && !v.includes("\\")) {
    const p = v.split(/[?#]/)[0];
    try { if (!decodeURIComponent(p).split("/").some(s => s === "." || s === "..")) return p; } catch { /* inválida */ }
    return "Valor não disponível";
  }
  try {
    const u = new URL(v);
    if (!["https:", "http:"].includes(u.protocol)) return "Valor não disponível";
    u.username = ""; u.password = ""; u.search = ""; u.hash = "";
    return u.toString();
  } catch { return "Valor não disponível"; }
}
function diaCivil(v) {
  // Aceita o dia civil atual e a serialização UTC à meia-noite de registros antigos.
  // Valida o calendário sem converter o dia para um instante no fuso local.
  const partes = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/.exec(v);
  if (!partes) return "Data não disponível";
  const [, ano, mes, dia] = partes;
  const a = Number(ano), m = Number(mes), d = Number(dia);
  const bissexto = a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0);
  const limite = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return a > 0 && d > 0 && d <= limite ? `${dia}/${mes}/${ano}` : "Data não disponível";
}
function valor(v, campo) {
  if (v === null) return "Sem valor";
  if (v === "") return "Texto vazio";
  if (campo === "previsaoReabertura") return typeof v === "string" ? diaCivil(v) : "Data não disponível";
  if (campo === "statusVisitacao" && typeof v === "string") return STATUS_VISITACAO.find(s => s.valor === v)?.rotulo ?? v;
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "Valor não disponível";
  if (typeof v === "string") return urls.has(campo) ? urlSegura(v, campo) : v;
  if (Array.isArray(v)) {
    if (!v.length) return "Lista vazia";
    if (["categoriasAdicionais", "principais", "principaisSubstituidas"].includes(campo)) return v.map(idAuditoria).join("\n");
    if (campo === "itens") return v.map(i => `ID: ${idAuditoria(i?.id)} · Ordem: ${valor(i?.ordem, "ordem")}`).join("\n");
    if (campo === "fontes") return v.map(f => ["veiculo", "assunto", "url"].filter(k => possui(f, k))
      .map(k => `${({ veiculo: "Veículo", assunto: "Assunto", url: "URL" })[k]}: ${valor(f[k], k)}`).join("; ")).join("\n");
  }
  return "Valor não disponível";
}

export function formatarAuditoria(evento) {
  const acao = acaoAuditoria(evento), recurso = recursoAuditoria(evento);
  const [prefixo, ...partes] = texto(evento.action).split("_"), verbo = partes.join("_");
  const conhecida = acao !== "Ação não identificada";
  const senha = evento.action === "USER_PASSWORD_CHANGE";
  const reordena = conhecida && verbo === "REORDER";
  const identificacao = alvoAuditoria(evento);
  const alvo = reordena ? `itens de ${recurso.toLowerCase()} do patrimônio identificado abaixo`
    : identificacao.titulo !== identificacao.tipo ? `${tipos[prefixo]?.[1] || "registro"} “${identificacao.titulo}”`
      : `${evento.entity === "User" ? "usuário" : "registro"} identificado abaixo`;
  const data = dataHoraAuditoria(evento.createdAt), responsavel = responsavelAuditoria(evento);
  let frase = `Atividade administrativa registrada em ${data}.`;
  if (conhecida && Object.hasOwn(operacionais, evento.action)) frase = `Em ${data}, foi registrada ${acao.toLowerCase()} em ${recurso}.`;
  else if (conhecida && evento.user) frase = senha && evento.userId === evento.entityId
    ? `Em ${data}, ${responsavel} alterou sua senha.`
    : `Em ${data}, ${responsavel} ${verbos[verbo][1]} ${alvo}.`;
  else if (conhecida) frase = `Em ${data}, foi registrada ${acao.toLowerCase()} em ${recurso}. Responsável não disponível no registro.`;
  const linhas = [];
  if (conhecida && !senha) for (const campo of campos[evento.entity] || []) {
    const antes = evento.oldValues, depois = evento.newValues;
    if (!possui(antes, campo) && !possui(depois, campo)) continue;
    if (campo === "localizacao" && antes?.[campo] !== null && depois?.[campo] !== null) {
      for (const [chave, nome] of Object.entries(local)) {
        if (!possui(antes?.localizacao, chave) && !possui(depois?.localizacao, chave)) continue;
        linhas.push({ campo: `Localização · ${nome}`,
          anterior: possui(antes?.localizacao, chave) ? valor(antes.localizacao[chave], chave) : "Valor anterior não disponível",
          novo: possui(depois?.localizacao, chave) ? valor(depois.localizacao[chave], chave) : "Novo valor não disponível" });
      }
    } else {
      const exibir = (origem, ausente) => !possui(origem, campo) ? ausente : campo === "localizacao" && origem[campo] !== null
        ? Object.entries(local).filter(([k]) => possui(origem[campo], k)).map(([k, n]) => `${n}: ${valor(origem[campo][k], k)}`).join("\n") || "Valor não disponível"
        : evento.entity === "User" && campo === "isActive" && typeof origem[campo] === "boolean"
          ? origem[campo] ? "Ativa" : "Desativada" : valor(origem[campo], campo);
      linhas.push({ campo: evento.entity === "User" && campo === "isActive" ? "Situação da conta" : rotulos[campo], anterior: exibir(antes, "Valor anterior não disponível"), novo: exibir(depois, "Novo valor não disponível") });
    }
  }
  const ocorrencia = conhecida && evento.action === "USER_DEACTIVATE" ? "Conta administrativa desativada"
    : conhecida && evento.action === "USER_ACTIVATE" ? "Conta administrativa ativada"
      : conhecida ? `${acao} · ${recurso}` : "Atividade administrativa registrada";
  return { acao, recurso, frase, linhas, responsavel, alvo: identificacao, ocorrencia,
    codigoAcao: codigo(evento.action), codigoRecurso: codigo(evento.entity), reordena,
    aviso: senha ? "Valores de senha nunca são apresentados." : !linhas.length ? "Detalhes dessa alteração não disponíveis."
      : linhas.every(l => l.anterior === l.novo) ? "A ocorrência foi registrada, mas a diferença não está disponível nos valores apresentados." : null };
}

// Procura o primeiro instante do dia civil no fuso IANA. Cobre o dia de 23/25 h
// e a meia-noite inexistente no início histórico do horário de verão brasileiro.
const calendario = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_AUDITORIA, year: "numeric", month: "2-digit", day: "2-digit" });
function chaveDia(ms) {
  const p = Object.fromEntries(calendario.formatToParts(ms).map(v => [v.type, v.value]));
  return Number(p.year) * 10000 + Number(p.month) * 100 + Number(p.day);
}
function inicioDia(data, seguinte = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !Number.isFinite(Date.parse(data)) || new Date(data).toISOString().slice(0, 10) !== data) throw new Error("Informe uma data válida.");
  const referencia = new Date(`${data}T12:00:00Z`);
  if (seguinte) referencia.setUTCDate(referencia.getUTCDate() + 1);
  const chave = referencia.getUTCFullYear() * 10000 + (referencia.getUTCMonth() + 1) * 100 + referencia.getUTCDate();
  let a = referencia.getTime() - 36 * 3600000, b = referencia.getTime() + 36 * 3600000;
  while (a < b) { const meio = Math.floor((a + b) / 2); if (chaveDia(meio) < chave) a = meio + 1; else b = meio; }
  return a;
}
export function filtrosAuditoria(form) {
  if (form.inicio && form.fim && form.inicio > form.fim) throw new Error("O fim deve ser igual ou posterior ao início.");
  const q = {};
  if (form.inicio) q.inicio = new Date(inicioDia(form.inicio)).toISOString();
  if (form.fim) q.fim = new Date(inicioDia(form.fim, true) - 1).toISOString();
  for (const k of ["userId", "entityId"]) if (form[k]?.trim()) {
    if (!uuid.test(form[k].trim())) throw new Error("Informe um UUID válido para o responsável ou registro.");
    q[k] = form[k].trim().toLowerCase();
  }
  for (const k of ["action", "entity"]) if (form[k]) q[k] = form[k];
  return q;
}
