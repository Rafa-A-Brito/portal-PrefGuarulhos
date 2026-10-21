import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createPatrimonioSchema, updatePatrimonioSchema } from "../src/schemas/patrimonioSchema.js";

process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/r1_test";
process.env.JWT_SECRET = "r1-regression-fixture-with-at-least-32-characters";

test("R1: PATCH geral rejeita fatos/ligacoes e campos adiados, inclusive arrays vazios", async () => {
    const service = await import("../src/services/patrimonioService.js");
    for (const field of ["fatos", "ligacoes", "secoes", "numeroExibicao", "ordemExibicao"]) {
        assert.equal(updatePatrimonioSchema.safeParse({ [field]: [] }).success, false);
    }
    assert.equal(updatePatrimonioSchema.safeParse({ localizacao: { regiao: "CENTRO" } }).success, false);
    for (const field of ["fatos", "ligacoes"]) {
        await assert.rejects(service.updatePatrimonio("unused", { [field]: [] }, { role: "ADMIN" }), { statusCode: 400 });
        await assert.rejects(service.createPatrimonio({ [field]: [] }, "unused"), { statusCode: 400 });
    }
    const valid = { nome: "Bem", descricao: "Descricao", descricaoResumida: "Resumo", categoriaId: "97773ed0-4689-4555-ac43-9aedf11f7d67" };
    assert.equal(createPatrimonioSchema.safeParse(valid).success, true);
    assert.equal(createPatrimonioSchema.safeParse({ ...valid, descricao: null }).success, false);
    assert.equal(createPatrimonioSchema.safeParse({ ...valid, descricao: undefined }).success, false);
    assert.equal(updatePatrimonioSchema.safeParse({ localizacao: { latitude: null, longitude: null } }).success, true);
});

test("R1: fonte C2 e migrations aplicadas permanecem preservadas; trilhas nao colidem", () => {
    const source = readFileSync(new URL("../prisma/patrimonioSeedData.js", import.meta.url));
    assert.equal(createHash("sha256").update(source).digest("hex"), "c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8");
    const active = readdirSync(new URL("../prisma/migrations/", import.meta.url)).filter(n => /^\d/.test(n));
    const team = readdirSync(new URL("../prisma/lineages/equipe/migrations/", import.meta.url)).filter(n => /^\d/.test(n));
    assert.deepEqual(active.sort(), [
        "20260929230000_initial_schema", "20260930120000_add_demolido_situacao",
        "20261005004508_categorias_adicionais", "20261006014922_adicionar_detalhes_e_heroes",
        "20261006180000_exposicoes_novidades", "20261014010000_add_fatos_ligacoes",
        "20261016120000_add_regioes_numero_ordem",
    ]);
    assert.equal(team.length, 8);
    assert.equal(team.includes("20261014010000_add_fatos_ligacoes"), false);
    const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
    for (const name of ["PatrimonioFato", "PatrimonioLigacao"]) assert.equal(schema.match(new RegExp("model " + name + " ", "g")).length, 1);
    assert.doesNotMatch(schema, /PatrimonioSecao|enum RegiaoPatrimonio/);
    const patrimonio = schema.match(/model Patrimonio \{([\s\S]*?)\n\}/)[1];
    assert.match(patrimonio, /descricao\s+String\s+@db.Text/);
    assert.match(patrimonio, /regiaoId\s+String\?/);
    assert.match(patrimonio, /numeroExibicao\s+Int\?\s+@unique/);
    assert.match(patrimonio, /ordemExibicao\s+Int\?\s+@map/);
    assert.equal(schema.match(/model RegiaoPatrimonio \{/g).length, 1);
});
