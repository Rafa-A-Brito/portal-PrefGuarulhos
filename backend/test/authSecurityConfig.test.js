import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";

function config(patch = {}) {
    const url = new URL("../src/config/authSecurity.js", import.meta.url).href;
    return spawnSync(process.execPath, ["--input-type=module", "-e", `const {security}=await import(${JSON.stringify(url)});console.log(JSON.stringify({enabled:security.AUTH_ALERT_ENABLED,failures:security.LOGIN_ACCOUNT_FAILURES,ttl:security.LOGIN_ACCOUNT_TTL_SECONDS}));`], {
        encoding: "utf8", windowsHide: true, env: { ...process.env, MOCK_DATA: "false", DOTENV_CONFIG_PATH: "auth-security-no-dotenv-fixture",
            DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unavailable", JWT_SECRET: "configuration-security-fixture-69e147d4",
            AUTH_SECURITY_SECRET: "", AUTH_ALERT_ENABLED: "false", AUTH_ALERT_URL: "", AUTH_ALERT_TOKEN: "", AUTH_LOCATION_URL: "",
            LOGIN_ACCOUNT_FAILURES: "5", LOGIN_ACCOUNT_WAIT_SECONDS: "30", LOGIN_ACCOUNT_MAX_WAIT_SECONDS: "900",
            LOGIN_ACCOUNT_TTL_SECONDS: "86400", AUTH_ACCESS_RETENTION_DAYS: "30", AUTH_ALERT_COOLDOWN_SECONDS: "86400", ...patch },
    });
}

test("segurança: padrões não habilitam e-mail nem exigem provedor/localização", () => {
    const result = config(); assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { enabled: false, failures: 5, ttl: 86400 });
});

test("segurança: habilitação exige HTTPS e credencial; erros não expõem configurações", () => {
    const token = "token-privado-simulado-6be72e9a";
    for (const patch of [{ AUTH_ALERT_ENABLED: "true" }, { AUTH_ALERT_ENABLED: "true", AUTH_ALERT_URL: "https://mail.invalid" },
        { AUTH_ALERT_ENABLED: "true", AUTH_ALERT_URL: "http://mail.invalid/privado", AUTH_ALERT_TOKEN: token },
        { AUTH_LOCATION_URL: "http://location.invalid/privado" }]) {
        const result = config(patch); assert.notEqual(result.status, 0);
        assert.doesNotMatch(result.stderr, /token-privado-simulado|mail\.invalid|location\.invalid/);
    }
    const result = config({ AUTH_ALERT_ENABLED: "true", AUTH_ALERT_URL: "https://mail.invalid", AUTH_ALERT_TOKEN: token });
    assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).enabled, true);
});

test("segurança: rejeita segredo fraco e relações incoerentes entre espera, retenção e cooldown", () => {
    for (const patch of [{ AUTH_SECURITY_SECRET: "a".repeat(40) }, { LOGIN_ACCOUNT_MAX_WAIT_SECONDS: "10" },
        { AUTH_ACCESS_RETENTION_DAYS: "1", AUTH_ALERT_COOLDOWN_SECONDS: "172800" }]) {
        const result = config(patch); assert.notEqual(result.status, 0);
        assert.ok(!result.stderr.includes("a".repeat(40)));
    }
});
