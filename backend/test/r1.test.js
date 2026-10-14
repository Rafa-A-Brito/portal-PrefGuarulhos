import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createPatrimonioSchema, updatePatrimonioSchema } from "../src/schemas/patrimonioSchema.js";

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
    assert.equal(active.length, 6); assert.equal(team.length, 8);
    assert.equal(active.some(n => /pesquisa|regiao/.test(n)), false);
    assert.equal(team.includes("20261014010000_add_fatos_ligacoes"), false);
    const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
    for (const name of ["PatrimonioFato", "PatrimonioLigacao"]) assert.equal(schema.match(new RegExp("model " + name + " ", "g")).length, 1);
    assert.doesNotMatch(schema, /RegiaoPatrimonio|PatrimonioSecao|numeroExibicao|ordemExibicao/);
});
