import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
for (const mock of ["false", "true"]) test(`fixtures da interface correspondem ao serviço de auditoria MOCK_DATA=${mock}`, () => {
    execFileSync(process.execPath, [fileURLToPath(new URL("./fixtures/auditoria_interface.mjs", import.meta.url))], {
        env: { ...process.env, MOCK_DATA: mock, NODE_ENV: "test", DOTENV_CONFIG_PATH: ".cache/ambiente_h1_inexistente",
            DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/h1_test", JWT_SECRET: "h1-isolado-sem-banco-segredo-de-teste-123456",
            METRICAS_COLETA_ATIVA: "false", METRICAS_CONSULTA_ATIVA: "false" },
        timeout: 30000, stdio: "pipe",
    });
});
