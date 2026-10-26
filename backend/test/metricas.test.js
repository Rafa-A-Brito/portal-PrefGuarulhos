import { test } from "node:test";
import assert from "node:assert/strict";
import { configurarMetricas } from "../src/config/metricas.js";
import { diaSaoPaulo, fimDiaSaoPaulo } from "../src/utils/dataMetricas.js";
import { emitirCookieMetricas, validarCookieMetricas, chaveVisualizacao, lerCookieMetricas } from "../src/services/cookieMetricasService.js";

const segredo = "af31509c86de2470b8f19d65c02e3a74b82f061c7a4d9352e610cf892dba4706";
const env = { METRICAS_COLETA_ATIVA: "true", METRICAS_ORIGEM: "https://portal.example", METRICAS_COOKIE_MODO: "https",
    METRICAS_CHAVES_JSON: JSON.stringify([{ id: "k1", desde: "2026-01-01", segredo }, { id: "k2", desde: "2026-10-27", segredo: segredo.split("").reverse().join("") }]) };
const hoje = new Date("2026-10-26T12:00:00Z");

test("flags desligadas dispensam segredos; coleta exige configuração estrita sem expor valores", () => {
    assert.deepEqual(configurarMetricas({ METRICAS_CHAVES_JSON: "invalido" }), { coleta: false, consulta: false });
    assert.deepEqual(configurarMetricas({ METRICAS_CONSULTA_ATIVA: "true" }), { coleta: false, consulta: true });
    for (const change of [{ METRICAS_COLETA_ATIVA: "1" }, { METRICAS_CHAVES_JSON: "privado-invalido" },
        { METRICAS_ORIGEM: "https://portal.example/" }, { METRICAS_COOKIE_MODO: "http-local" }, { JWT_SECRET: segredo }]) {
        assert.throws(() => configurarMetricas({ ...env, ...change }, hoje), e => !e.message.includes("privado-invalido") && !e.message.includes(segredo));
    }
    assert.throws(() => configurarMetricas({ ...env, METRICAS_ORIGEM: "http://localhost:5173", METRICAS_COOKIE_MODO: "http-local", NODE_ENV: "production" }, hoje));
});

test("dia paulista, expiração fixa, assinatura, finalidades separadas e rotação futura", () => {
    const config = configurarMetricas(env, hoje);
    assert.equal(diaSaoPaulo(new Date("2026-10-27T02:59:59Z")), "2026-10-26");
    assert.equal(fimDiaSaoPaulo(hoje).toISOString(), "2026-10-27T03:00:00.000Z");
    const a = emitirCookieMetricas(null, config, hoje);
    assert.equal(emitirCookieMetricas(a.token, config, hoje).token, a.token);
    const identidade = validarCookieMetricas(a.token, config, hoje);
    assert.ok(identidade); assert.equal(identidade.chave.id, "k1");
    assert.equal(validarCookieMetricas(a.token + "x", config, hoje), null);
    assert.equal(validarCookieMetricas(a.token.replace("v1", "v2"), config, hoje), null);
    assert.equal(validarCookieMetricas(a.token, config, new Date("2026-10-27T03:00:00Z")), null);
    assert.equal(validarCookieMetricas(emitirCookieMetricas(null, config, new Date("2026-10-27T04:00:00Z")).token,
        config, new Date("2026-10-27T04:00:00Z")).chave.id, "k2");
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    assert.equal(chaveVisualizacao(identidade, id), chaveVisualizacao(identidade, id.toUpperCase()));
    assert.notEqual(chaveVisualizacao(identidade, id), chaveVisualizacao(identidade, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"));
    assert.notEqual(chaveVisualizacao(identidade, id), a.token.split(".").at(-1));
    assert.equal(lerCookieMetricas(`${config.cookie}=${a.token}; ${config.cookie}=outro`, config), null);
});
