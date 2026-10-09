import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLICATION_SLUGS, parsePublicationArgs, assertPublicationTarget } from "../scripts/publish-patrimonios-14.js";

test("publicação operacional: dry-run padrão, autor obrigatório, flags fechadas e confirmação exata", () => {
    const email = "--created-by-email=admin@example.test";
    assert.deepEqual(parsePublicationArgs([email]), { apply: false, createdByEmail: "admin@example.test" });
    assert.equal(parsePublicationArgs(["--created-by-email", "Admin@Example.Test", "--dry-run"]).createdByEmail, "admin@example.test");
    assert.equal(parsePublicationArgs([email, "--apply", "--confirm-db=patrimonio_guarulhos"]).apply, true);
    for (const args of [
        [], ["--dry-run"], ["--apply", "--confirm-db=patrimonio_guarulhos"],
        [email, "--apply"], [email, "--apply", "--confirm-db=outro"],
        [email, "--apply", "--dry-run", "--confirm-db=patrimonio_guarulhos"],
        [email, "--dry-run", "--dry-run"], [email, "--slugs=antigo-poco-municipal"],
        [email, "--apply=false"], ["--created-by-email=inválido"],
        ["--created-by-email", "--apply"], [email, email],
        [email, "--confirm-db=patrimonio_guarulhos", "--confirm-db=outro"],
    ]) assert.throws(() => parsePublicationArgs(args), args.join(" "));
});

test("publicação operacional: banco restrito, allowlist imutável com 14 únicos e Poço excluído", () => {
    assert.equal(PUBLICATION_SLUGS.length, 14);
    assert.equal(new Set(PUBLICATION_SLUGS).size, 14);
    assert.ok(!PUBLICATION_SLUGS.includes("antigo-poco-municipal"));
    assert.ok(Object.isFrozen(PUBLICATION_SLUGS));
    assert.throws(() => PUBLICATION_SLUGS.push("antigo-poco-municipal"));
    assert.equal(assertPublicationTarget("postgresql://unused@localhost/patrimonio_guarulhos").database, "patrimonio_guarulhos");
    for (const url of ["postgresql://unused@localhost/outro", "postgresql://unused@localhost/patrimonio_guarulhos?dbname=outro", "file:test"]) {
        assert.throws(() => assertPublicationTarget(url));
    }
});
