import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { configurarFeedback } from "../src/config/feedback.js";
import { feedbackSchema, chaveFeedbackSchema, listaFeedbackSchema, resumoFeedbackSchema, validarFeedback, validarPeriodo } from "../src/schemas/feedbackSchema.js";
import { confirmarRecibo, conteudoDigest, inicioDia, montarResumo, DIA } from "../src/utils/feedback.js";
import { criarLimiteFeedback, redeFeedback } from "../src/middlewares/limiteFeedback.js";

const body = { tipo: "SUGESTAO", mensagem: "Busca", avisoVersao: "feedback-v1" };
const segredo = randomBytes(32).toString("hex");
const ambiente = { FEEDBACK_RECEBIMENTO_ATIVO: "true", FEEDBACK_CONSULTA_ATIVA: "true", FEEDBACK_ORIGEM: "http://localhost:5173",
    FEEDBACK_TRANSPORTE: "http-local", FEEDBACK_CHAVES_JSON: JSON.stringify([{ id: "v1", segredo }]), FEEDBACK_CHAVE_ATUAL: "v1", FEEDBACK_AVISOS_ACEITOS: "feedback-v1" };
test("configuração desativada não exige segredos; ingestão exige origem, chaves próprias e aviso", () => {
    assert.equal(configurarFeedback({}).recebimento, false); assert.equal(configurarFeedback({}).chaves.length, 0);
    assert.equal(configurarFeedback({ FEEDBACK_CONSULTA_ATIVA: "true" }).consulta, true);
    assert.equal(configurarFeedback(ambiente).atual, "v1");
    for (const patch of [{ FEEDBACK_RECEBIMENTO_ATIVO: "1" }, { NODE_ENV: "production" }, { FEEDBACK_ORIGEM: "http://example.org" },
        { FEEDBACK_ORIGEM: "http://localhost:5173/" }, { FEEDBACK_CHAVE_ATUAL: "ausente" }, { JWT_SECRET: segredo },
        { METRICAS_CHAVES_JSON: JSON.stringify([{ segredo }]) }, { FEEDBACK_AVISOS_ACEITOS: "" }, { FEEDBACK_CHAVES_JSON: "segredo-invalido" }]) {
        assert.throws(() => configurarFeedback({ ...ambiente, ...patch }), /Configuração Feedback inválida/);
    }
});
test("DTO normaliza NFC, CRLF e Unicode; 2000 pontos de código, sem coerção nem campos extras", () => {
    assert.equal(validarFeedback(feedbackSchema, { ...body, mensagem: "  Cafe\u0301\r\n🏛️  " }).mensagem, "Café\n🏛️");
    assert.equal([...validarFeedback(feedbackSchema, { ...body, mensagem: "😀".repeat(2000) }).mensagem].length, 2000);
    for (const patch of [{ mensagem: "😀".repeat(2001) }, { mensagem: " \n " }, { mensagem: "a\u0000b" }, { mensagem: "a\rb" },
        { mensagem: "\ud800" }, { mensagem: 2 }, { tipo: "elogio" }, { nota: 5 }, { nome: "Pessoa" }, { estado: "NOVO" },
        { createdAt: "2026-01-01" }, { avisoVersao: "" }]) assert.throws(() => validarFeedback(feedbackSchema, { ...body, ...patch }), e => e.statusCode === 400 && e.details.length === 0);
    for (const value of [null, [], "texto"]) assert.throws(() => validarFeedback(feedbackSchema, value));
});
test("chave aceita apenas 32 bytes em base64url canônica", () => {
    assert.ok(chaveFeedbackSchema.safeParse(randomBytes(32).toString("base64url")).success);
    for (const key of ["a".repeat(42), "a".repeat(44), "a".repeat(43), "=".repeat(43)]) assert.equal(chaveFeedbackSchema.safeParse(key).success, false);
});
test("filtros rejeitam repetidos, extras, coerção, datas inexistentes, futuro e mais de 366 dias", () => {
    const q = { inicio: "2026-01-01", fim: "2026-11-02" }, agora = new Date("2026-11-02T15:00:00Z");
    assert.equal(validarPeriodo(validarFeedback(listaFeedbackSchema, q), agora).pagina, 1);
    for (const patch of [{ inicio: "2026-02-30" }, { pagina: "1.5" }, { pagina: "10001" }, { limite: "101" }, { tipo: ["ELOGIO"] }, { extra: "x" }]) {
        assert.throws(() => validarFeedback(listaFeedbackSchema, { ...q, ...patch }));
    }
    for (const patch of [{ fim: "2027-01-01" }, { inicio: "2024-01-01" }, { inicio: "2026-11-02", fim: "2026-11-01" }]) assert.throws(() => validarPeriodo({ ...q, ...patch }, agora));
    assert.throws(() => validarFeedback(resumoFeedbackSchema, { ...q, pagina: "1" }));
});
test("fuso IANA cobre dia paulista de 23 horas e mudança histórica de offset", () => {
    assert.equal(inicioDia("2018-11-04").toISOString(), "2018-11-04T03:00:00.000Z");
    assert.equal(inicioDia("2018-11-05") - inicioDia("2018-11-04"), 23 * 3600000);
    assert.equal(inicioDia("2018-12-01").toISOString(), "2018-12-01T02:00:00.000Z");
    assert.equal(inicioDia("2026-11-02").toISOString(), "2026-11-02T03:00:00.000Z");
});
test("HMAC versionado preserva replay, rejeita alteração/expiração e falha se versão antiga faltar", () => {
    const config = configurarFeedback(ambiente), agora = new Date("2026-11-02T15:00:00Z");
    const recibo = { recebidoEm: agora, expiraEm: new Date(+agora + DIA), versaoChave: "v1", conteudoDigest: conteudoDigest(body, "v1", config) };
    assert.equal(confirmarRecibo(recibo, body, { ...config, recebimento: false, avisos: [] }, agora).status, 200);
    assert.throws(() => confirmarRecibo(recibo, { ...body, mensagem: "Outro" }, config, agora), { code: "CHAVE_REUTILIZADA" });
    assert.throws(() => confirmarRecibo(recibo, body, config, recibo.expiraEm), { code: "ENVIO_EXPIRADO" });
    assert.throws(() => confirmarRecibo(recibo, body, { ...config, chaves: [] }, agora), { code: "FEEDBACK_INDISPONIVEL" });
});
test("resumo conserva BigInt, zeros, recorte e parcialidade mensal", () => {
    const r = montarResumo({ inicio: "2026-10-15", fim: "2026-11-02", granularidade: "mes" }, new Date("2026-11-02T15:00:00Z"),
        new Map([["ELOGIO", "9007199254740993"]]), new Map([["2026-10", "9007199254740993"]]));
    assert.equal(r.total, "9007199254740993"); assert.equal(r.porTipo[1].quantidade, "0");
    assert.ok(r.serie.every(s => s.parcial)); assert.equal(r.serie[1].quantidade, "0");
    assert.deepEqual(r.notas, { disponivel: false });
});
test("IPv4 mapeado e IPv6 /64 não permitem escapar da quota por grafia", () => {
    for (const ip of ["::ffff:192.0.2.1", "::ffff:c000:201", "0:0:0:0:0:ffff:c000:0201"]) assert.equal(redeFeedback(ip), "192.0.2.1");
    assert.equal(redeFeedback("2001:db8:0:1::1"), redeFeedback("2001:0db8:0000:0001:ffff::1"));
});
test("quotas minuto/hora, global, saturação e expiração de memória", () => {
    let time = 0; const res = { setHeader() {} }, req = ip => ({ ip });
    const limit = criarLimiteFeedback({ now: () => time });
    for (let m = 0; m < 4; m++) { time = m * 60000; for (let i = 0; i < 5; i++) limit(req("192.0.2.1"), res, () => {}); }
    time += 60000; assert.throws(() => limit(req("192.0.2.1"), res, () => {}), { code: "TOO_MANY_REQUESTS" });
    time = 3600000; limit(req("192.0.2.1"), res, () => {});
    const minute = criarLimiteFeedback({ now: () => 0 });
    for (let i = 0; i < 5; i++) minute(req("192.0.2.1"), res, () => {});
    assert.throws(() => minute(req("::ffff:c000:201"), res, () => {}), { statusCode: 429 });
    const global = criarLimiteFeedback({ now: () => 0 });
    for (let i = 0; i < 60; i++) global(req(`192.0.2.${i}`), res, () => {});
    assert.throws(() => global(req("198.51.100.1"), res, () => {}), { statusCode: 429 });
    const cheio = criarLimiteFeedback({ now: () => time, maxEntries: 1 });
    cheio(req("192.0.2.1"), res, () => {}); assert.throws(() => cheio(req("192.0.2.2"), res, () => {}), { statusCode: 429 });
    time += 3600000; cheio(req("192.0.2.2"), res, () => {});
});
