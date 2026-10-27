import { test } from "node:test";
import assert from "node:assert/strict";
import { limitesRetencao, observarMetricas } from "../src/services/operacaoMetricasService.js";
import { conectarOperacao } from "../scripts/metricas_operacao.js";

test("retenção: sete dias encerrados, treze meses civis, mês curto/bissexto e meia-noite paulista", () => {
    assert.deepEqual(limitesRetencao(new Date("2026-10-27T02:59:59Z")), { hoje: "2026-10-26", recibos: "2026-10-19", agregados: "2025-09-26" });
    assert.deepEqual(limitesRetencao(new Date("2026-10-27T03:00:00Z")), { hoje: "2026-10-27", recibos: "2026-10-20", agregados: "2025-09-27" });
    assert.equal(limitesRetencao(new Date("2025-03-31T12:00:00Z")).agregados, "2024-02-29");
    assert.equal(limitesRetencao(new Date("2026-03-31T12:00:00Z")).agregados, "2025-02-28");
});
test("executor não usa DATABASE_URL nem conecta com destino incompleto ou redirecionamento", async () => {
    await assert.rejects(conectarOperacao({ DATABASE_URL: "postgresql://nao-acessar/real" }));
    await assert.rejects(conectarOperacao({ METRICAS_OPERACAO_URL: "postgresql://portal_api@127.0.0.1/portal_test" }));
    await assert.rejects(conectarOperacao({ METRICAS_OPERACAO_URL: "postgresql://portal_metricas_operador@127.0.0.1/portal_test?host=outro" }));
});
test("sonda não emite eventos: health, configuração, privilégios e falhas", async () => {
    for (const scenario of ["ok", "off", "http", "config", "privilegios", "rede"]) {
        const commands = []; let gravado;
        const db = { query: async (sql, args) => {
            commands.push(sql);
            if (sql.includes("bool_and")) return { rows: [{ permitido: scenario !== "privilegios" }] };
            if (sql.includes("INSERT INTO sondas")) { gravado = args[2]; return { rows: [{ estado: gravado }] }; }
            return { rows: [] };
        } };
        const result = await observarMetricas(db, { agora: new Date("2026-10-27T12:07:00Z"), healthUrl: "http://proxy.test/api/health",
            configurar: () => { if (scenario === "config") throw new Error(); return { coleta: scenario !== "off" }; },
            request: async (_url, options) => {
                assert.equal(options.redirect, "error"); assert.ok(options.signal);
                if (scenario === "rede") throw new Error();
                return { ok: scenario !== "http", json: async () => ({ data: { status: "ok" } }) };
            } });
        assert.equal(result.estado, scenario === "ok" ? "DISPONIVEL" : scenario === "off" ? "DESATIVADA" : "FALHA");
        assert.equal(result.janelaInicio, "2026-10-27T12:05:00.000Z");
        assert.ok(commands.every(sql => !/INSERT INTO visualizacoes/.test(sql)));
        assert.ok(commands.includes("COMMIT"));
    }
});
