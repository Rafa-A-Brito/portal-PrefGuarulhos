import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("config local da equipe exige loopback e confirmacao exata do banco", () => {
    for (const [connection, confirmation, allowed] of [
        ["", "", false],
        ["postgresql://fixture:fixture@db.example.test/local_test", "local_test", false],
        ["postgresql://fixture:fixture@localhost/local_test", "outro_test", false],
        ["https://localhost/local_test", "local_test", false],
        ["postgresql://fixture:fixture@127.0.0.1/local_test", "local_test", true],
    ]) {
        const result = spawnSync(process.execPath, ["--input-type=module", "-e", "await import('./prisma.local-equipe.config.js')"], {
            cwd: fileURLToPath(new URL("../", import.meta.url)),
            env: { ...process.env, LOCAL_EQUIPE_DATABASE_URL: connection, LOCAL_EQUIPE_CONFIRM_DB: confirmation },
            windowsHide: true,
            encoding: "utf8",
            timeout: 10000,
        });
        assert.ifError(result.error);
        assert.equal(result.status === 0, allowed);
    }
});
