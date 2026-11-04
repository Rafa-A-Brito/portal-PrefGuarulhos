export const TIPOS = { ELOGIO: "Elogio", SUGESTAO: "Sugestão", PROBLEMA: "Problema" };
export const FUSO = "America/Sao_Paulo";
const DIA = 86400000;
const civil = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const horario = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
export function diaFeedback(agora = new Date()) {
  const p = Object.fromEntries(civil.formatToParts(agora).map(p => [p.type, p.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dataBr = dia => dia.length === 7 ? `${dia.slice(5, 7)}/${dia.slice(0, 4)}` : `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
export const dataHoraFeedback = iso => horario.format(new Date(iso));
export const quantidadeFeedback = texto => BigInt(texto).toLocaleString("pt-BR");
export function dataIso(texto) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) throw new Error("Use datas no formato dd/mm/aaaa.");
  const iso = texto.split("/").reverse().join("-");
  const d = new Date(iso + "T12:00:00Z");
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== iso || iso < "1900-01-01") throw new Error("Informe uma data válida.");
  return iso;
}
export function periodoFeedback(agora = new Date()) {
  const fim = diaFeedback(agora), inicio = new Date(Date.parse(fim + "T12:00:00Z") - 29 * DIA).toISOString().slice(0, 10);
  return { inicio: dataBr(inicio), fim: dataBr(fim), tipo: "", granularidade: "dia" };
}
export function filtrosFeedback(form, agora = new Date()) {
  const inicio = dataIso(form.inicio), fim = dataIso(form.fim);
  if (inicio > fim || fim > diaFeedback(agora) || (Date.parse(fim) - Date.parse(inicio)) / DIA >= 366) {
    throw new Error("Use até 366 dias civis, com início anterior ou igual ao fim e sem datas futuras.");
  }
  if ((form.tipo && !Object.hasOwn(TIPOS, form.tipo)) || !["dia", "mes"].includes(form.granularidade)) throw new Error("Confira o tipo e a granularidade.");
  return { inicio, fim, ...(form.tipo && { tipo: form.tipo }), granularidade: form.granularidade };
}
export const graficoSeguro = itens => itens.every(i => BigInt(i.quantidade) <= BigInt(Number.MAX_SAFE_INTEGER));

function exigir(ok) { if (!ok) throw new Error("Resposta de Feedback inválida. Atualize a consulta."); }
const decimal = n => typeof n === "string" && /^(0|[1-9]\d*)$/.test(n);
const instante = n => typeof n === "string" && Number.isFinite(Date.parse(n));
const uuid = n => typeof n === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(n);
export function validarDisponibilidade(d) {
  exigir(d && typeof d.disponivel === "boolean" && (!Object.hasOwn(d, "demonstracao") || d.demonstracao === true));
  if (!d.disponivel) exigir(d.motivo === "DESATIVADA");
  return d.disponivel;
}
function validarMeta(m, q) {
  exigir(m && m.inicio === q.inicio && m.fim === q.fim && m.tipo === (q.tipo || null) && m.fuso === FUSO &&
    instante(m.geradoEm) && m.base === "REGISTROS_RETIDOS" && m.unidade === "FEEDBACK_RECEBIDO" &&
    m.retencaoDias === 180 && typeof m.recorteLimitadoPorRetencao === "boolean");
}
export function validarResumoFeedback(d, q) {
  if (!validarDisponibilidade(d)) return d;
  validarMeta(d.meta, q);
  exigir(d.meta.granularidade === q.granularidade && decimal(d.total) && Array.isArray(d.porTipo) && d.porTipo.length === 3 && Array.isArray(d.serie));
  exigir(d.porTipo.every((t, i) => t.tipo === Object.keys(TIPOS)[i] && decimal(t.quantidade)));
  const esperados = new Set();
  for (let dia = q.inicio; dia <= q.fim; dia = new Date(Date.parse(dia + "T12:00:00Z") + DIA).toISOString().slice(0, 10)) esperados.add(dia.slice(0, q.granularidade === "mes" ? 7 : 10));
  exigir(d.serie.length === esperados.size && d.serie.every((p, i) => p.periodo === [...esperados][i] && decimal(p.quantidade) && typeof p.parcial === "boolean"));
  const soma = itens => itens.reduce((n, i) => n + BigInt(i.quantidade), 0n);
  exigir(soma(d.porTipo) === BigInt(d.total) && soma(d.serie) === BigInt(d.total));
  if (q.tipo) exigir(d.porTipo.every(t => t.tipo === q.tipo || t.quantidade === "0"));
  return d;
}
export function validarListaFeedback(d, q) {
  if (!validarDisponibilidade(d)) return d;
  validarMeta(d.meta, q);
  const p = d.paginacao;
  exigir(p && [p.pagina, p.limite, p.total, p.totalPaginas].every(Number.isSafeInteger) && p.pagina === q.pagina && p.limite === q.limite &&
    p.total >= 0 && p.totalPaginas === Math.ceil(p.total / p.limite) && Array.isArray(d.itens) &&
    d.itens.length === Math.min(p.limite, Math.max(0, p.total - (p.pagina - 1) * p.limite)));
  exigir(new Set(d.itens.map(i => i.id)).size === d.itens.length);
  exigir(d.itens.every((r, i) => uuid(r.id) && Object.hasOwn(TIPOS, r.tipo) && instante(r.createdAt) &&
    (!q.tipo || r.tipo === q.tipo) && !Object.hasOwn(r, "mensagem") &&
    diaFeedback(new Date(r.createdAt)) >= q.inicio && diaFeedback(new Date(r.createdAt)) <= q.fim &&
    (i === 0 || Date.parse(d.itens[i - 1].createdAt) > Date.parse(r.createdAt) ||
      (d.itens[i - 1].createdAt === r.createdAt && d.itens[i - 1].id > r.id))));
  return d;
}
export function validarDetalheFeedback(d, id) {
  if (!validarDisponibilidade(d)) return d;
  const r = d.registro;
  exigir(r && r.id === id && Object.hasOwn(TIPOS, r.tipo) && instante(r.createdAt) && instante(r.expiraEm) &&
    typeof r.mensagem === "string" && [...r.mensagem].length >= 1 && [...r.mensagem].length <= 2000 && typeof r.avisoVersao === "string");
  return d;
}
