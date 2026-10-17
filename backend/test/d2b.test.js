import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { updatePatrimonioSchema, listPatrimoniosQuerySchema } from "../src/schemas/patrimonioSchema.js";
import { createRegiaoSchema, updateRegiaoSchema, listRegioesSchema } from "../src/schemas/regiaoSchema.js";
import openapi from "../src/docs/openapi.js";

test("D2 payloads estritos: int32, zero, NULL, omissão e região UUID", () => {
    for (const [field, minimum] of [["numeroExibicao", 1], ["ordemExibicao", 0]]) {
        for (const value of [null, minimum, 2147483647]) assert.deepEqual(updatePatrimonioSchema.parse({ [field]: value }), { [field]: value });
        for (const value of [minimum - 1, 2147483648, 1.5, "", "0", false, []]) assert.equal(updatePatrimonioSchema.safeParse({ [field]: value }).success, false);
    }
    assert.deepEqual(updatePatrimonioSchema.parse({ nome: "Outro" }), { nome: "Outro" });
    for (const value of [null, randomUUID()]) assert.equal(updatePatrimonioSchema.safeParse({ regiaoId: value }).success, true);
    for (const value of ["", "CENTRO", 1]) assert.equal(updatePatrimonioSchema.safeParse({ regiaoId: value }).success, false);
    assert.equal(updatePatrimonioSchema.safeParse({ localizacao: { regiao: "CENTRO" } }).success, false);
});
test("D2 filtros exatos independentes da busca livre", () => {
    const query = listPatrimoniosQuerySchema.parse({ regiao: "regiao-teste", numeroExibicao: "12", busca: "07010", categoria: "historico" });
    assert.equal(query.numeroExibicao, 12); assert.equal(query.busca, "07010");
    for (const value of ["", "0", "-1", "1.2", "2147483648", "1e2", " 1 "]) assert.equal(listPatrimoniosQuerySchema.safeParse({ numeroExibicao: value }).success, false);
    assert.equal(listRegioesSchema.parse({ ativo: "false" }).ativo, false);
});
test("D2 catálogo: slug estável, nomes/descrição limitados, ausência não inventa região", () => {
    assert.deepEqual(createRegiaoSchema.parse({ nome: " Teste ", slug: "teste" }), { nome: "Teste", slug: "teste" });
    for (const data of [{ nome: " " }, { descricao: "x".repeat(2001) }, { slug: "outro" }, {}, { ativo: "false" }]) assert.equal(updateRegiaoSchema.safeParse(data).success, false);
    assert.deepEqual(updateRegiaoSchema.parse({ descricao: null, ativo: false }), { descricao: null, ativo: false });
});
test("D2 OpenAPI documenta catálogo, filtros e campos sem abrir DELETE", () => {
    for (const path of ["/api/regioes", "/api/admin/regioes", "/api/admin/regioes/{id}"]) assert.ok(openapi.paths[path]);
    assert.equal(openapi.paths["/api/admin/regioes/{id}"].delete, undefined);
    for (const field of ["regiaoId", "numeroExibicao", "ordemExibicao"]) {
        assert.equal(openapi.components.schemas.PatrimonioPatch.properties[field].nullable, true);
    }
    for (const field of ["regiao", "numeroExibicao"]) assert.ok(openapi.paths["/api/patrimonios"].get.parameters.some(p => p.name === field));
});
