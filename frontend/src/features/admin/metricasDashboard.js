const DIA = 86400000;
const MAXIMO = BigInt(Number.MAX_SAFE_INTEGER);
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
export function diaPaulista(data = new Date()) {
  const partes = Object.fromEntries(formatoDia.formatToParts(data).map(p => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}
export function periodoInicial(agora = new Date()) {
  const fim = diaPaulista(agora);
  return { inicio: new Date(Date.parse(fim) - 29 * DIA).toISOString().slice(0, 10), fim };
}
function dataValida(data) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data ?? "") && Number.isFinite(Date.parse(data)) && new Date(data).toISOString().slice(0, 10) === data;
}
export function validarPeriodo({ inicio, fim }, hoje = diaPaulista()) {
  if (!dataValida(inicio) || !dataValida(fim)) return "Informe duas datas válidas.";
  if (inicio > fim) return "A data inicial deve ser anterior ou igual à final.";
  if (fim > hoje) return "O período não pode incluir datas futuras em São Paulo.";
  if ((Date.parse(fim) - Date.parse(inicio)) / DIA >= 366) return "Selecione no máximo 366 dias, incluindo as duas datas.";
  return "";
}
export const formatarDia = dia => dia.split("-").reverse().join("/");
function inteiro(valor) {
  if (typeof valor !== "string" || !/^\d+$/.test(valor)) throw new Error("Resposta de métricas inválida.");
  return BigInt(valor);
}
export const quantidadeExata = valor => inteiro(valor).toLocaleString("pt-BR");
export function quantidadeGrafica(valor) {
  if (valor === null) return null;
  const n = inteiro(valor);
  return n <= MAXIMO ? Number(n) : null;
}
export const serieSegura = itens => itens.every(i => i.quantidade === null || quantidadeGrafica(i.quantidade) !== null);

// Rejeita DTO incompleto/incoerente: ausência nunca vira um total zero.
export function validarMetricas(dados) {
  const falhar = () => { throw new Error("Resposta de métricas inválida."); };
  if (dados?.disponivel === false) return dados;
  if (dados?.disponivel !== true) return falhar();
  const { meta, visualizacoes: v } = dados;
  if (!meta || meta.fuso !== "America/Sao_Paulo" || meta.granularidade !== "dia" ||
    meta.unidade !== "IDENTIDADE_PATRIMONIO_DIA" || meta.regiaoReferencia !== "CADASTRO_ATUAL" ||
    !Number.isFinite(Date.parse(meta.geradoEm)) || validarPeriodo(meta, diaPaulista(new Date(meta.geradoEm)))) return falhar();
  if (!v || !Array.isArray(v.porRegiao) || !Array.isArray(v.serie) || !Array.isArray(v.porPatrimonio?.itens)) return falhar();
  const total = inteiro(v.totalRegistrado), soma = lista => lista.reduce((n, i) => n + inteiro(i.quantidade), 0n);
  if (soma(v.porRegiao) + inteiro(v.semRegiao) !== total || soma(v.serie) !== total || soma(v.porPatrimonio.itens) > total) return falhar();
  const p = v.porPatrimonio.paginacao;
  if (!p || ![p.pagina, p.limite, p.total].every(Number.isSafeInteger) || p.pagina < 1 || p.pagina > 10000 ||
    p.limite < 1 || p.limite > 100 || p.total < v.porPatrimonio.itens.length || v.porPatrimonio.itens.length > p.limite) return falhar();
  const datas = new Set();
  for (const i of v.serie) {
    if (!dataValida(i.data) || i.data < meta.inicio || i.data > meta.fim || datas.has(i.data)) return falhar();
    datas.add(i.data);
  }
  for (const i of [...v.porRegiao, ...v.porPatrimonio.itens]) if (!i.id || typeof i.nome !== "string") return falhar();
  if (meta.cobertura === "SONDAGEM_5_MIN") {
    const o = meta.observacao, campos = ["esperadas", "disponiveis", "desativadas", "falhas", "desconhecidas"];
    if (!o || !Array.isArray(o.porDia) || !o.resumo || !Number.isFinite(Date.parse(o.inicioObservacao))) return falhar();
    const datasCobertura = new Set();
    for (const d of [...o.porDia, o.resumo]) {
      if (!campos.every(k => Number.isSafeInteger(d[k]) && d[k] >= 0) || d.esperadas !== d.disponiveis + d.desativadas + d.falhas + d.desconhecidas) return falhar();
    }
    for (const d of o.porDia) {
      if (!dataValida(d.data) || d.data < meta.inicio || d.data > meta.fim || datasCobertura.has(d.data) ||
        !["FORA_DA_RETENCAO", "DISPONIVEL_NAS_SONDAS", "SEM_OBSERVACAO", "PARCIAL"].includes(d.estado)) return falhar();
      datasCobertura.add(d.data);
    }
    if (!campos.every(k => o.porDia.reduce((n, d) => n + d[k], 0) === o.resumo[k])) return falhar();
    if (meta.inicioDisponivel !== null && !dataValida(meta.inicioDisponivel)) return falhar();
  }
  return dados;
}
export function serieComLacunas(dados) {
  const mapa = new Map(dados.visualizacoes.serie.map(i => [i.data, i.quantidade]));
  const resultado = [];
  for (let time = Date.parse(dados.meta.inicio); time <= Date.parse(dados.meta.fim); time += DIA) {
    const data = new Date(time).toISOString().slice(0, 10);
    resultado.push({ data, quantidade: mapa.get(data) ?? null });
  }
  return resultado;
}
