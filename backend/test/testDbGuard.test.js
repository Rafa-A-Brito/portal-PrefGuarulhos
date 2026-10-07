import assert from "node:assert/strict";
import { test } from "node:test";
import { assertTestDatabase } from "../scripts/assert-test-db.js";
const safe = {
    DATABASE_URL: "postgresql://normal@localhost:5433/portal",
    TEST_DATABASE_URL: "postgresql://test@127.0.0.1:5434/portal_test",
    TEST_DATABASE_EXCLUSIVE: "1",
};
test("guarda aceita somente destino de teste explícito e distinto", () => {
    assert.equal(assertTestDatabase(safe).database, "portal_test");
    for (const patch of [
        { TEST_DATABASE_EXCLUSIVE: "0" },
        { DATABASE_URL: undefined },
        { TEST_DATABASE_URL: "postgresql://test@127.0.0.1:5434/portal" },
        { TEST_DATABASE_URL: "postgresql://test@remote.example:5434/portal_test" },
        { TEST_DATABASE_URL: "postgresql://test@127.0.0.1:5434/portal_test?host=remote.example" },
        { TEST_DATABASE_URL: "mysql://test@127.0.0.1:5434/portal_test" },
        { TEST_DATABASE_URL: "não é URL" },
    ]) assert.throws(() => assertTestDatabase({ ...safe, ...patch }));
});
test("guarda reconhece mesma identidade com credenciais, protocolo, alias ou encoding diferentes", () => {
    for (const normal of [
        "postgres://outro:senha@localhost:5434/portal_test",
        "postgresql://outro@[::1]:5434/portal_test",
        "postgresql://outro@127.0.0.1:5434/portal%5Ftest",
        "postgresql://outro@db_test:5432/portal_test",
    ]) assert.throws(() => assertTestDatabase({ ...safe, DATABASE_URL: normal }));
    assert.throws(() => assertTestDatabase({
        ...safe, DATABASE_URL: "postgresql://a@localhost/portal_test",
        TEST_DATABASE_URL: "postgres://b@127.0.0.1:5432/portal_test",
    }));
});
