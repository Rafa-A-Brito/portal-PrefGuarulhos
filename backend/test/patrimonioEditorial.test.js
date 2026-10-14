import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createFatoSchema, updateFatoSchema, createLigacaoSchema, updateLigacaoSchema, ordenarEditorialSchema } from "../src/schemas/patrimonioEditorialSchema.js";
import { LEGADOS_EDITORIAIS, legadoEditorial, destinoPublicoWhere } from "../src/utils/identidadeEditorial.js";

test("fatos: valida conteúdo, tamanho, ordem inteira e PATCH estrito", () => {
    assert.deepEqual(createFatoSchema.parse({ rotulo: " Ano ", valor: " 1900 " }), { rotulo: "Ano", valor: "1900" });
    for (const data of [{ rotulo: " ", valor: "x" }, { rotulo: "x", valor: "\n\t" }, { rotulo: "x".repeat(201), valor: "x" }, { rotulo: "x", valor: "x".repeat(10001) }, ...[-1, 0.1, 2147483648, "0", null].map(ordem => ({ rotulo: "x", valor: "y", ordem }))]) {
        assert.equal(createFatoSchema.safeParse(data).success, false);
    }
    for (const data of [{}, { id: randomUUID() }, { patrimonioId: randomUUID() }, { valor: null }]) assert.equal(updateFatoSchema.safeParse(data).success, false);
    assert.equal(updateFatoSchema.safeParse({ ordem: 2147483647 }).success, true);
});
test("ligações: UUID, texto obrigatório, limites e campos imutáveis", () => {
    const data = { patrimonioDestinoId: randomUUID(), texto: " Veja também " };
    assert.equal(createLigacaoSchema.parse(data).texto, "Veja também");
    for (const patch of [{ patrimonioDestinoId: "slug" }, { texto: " " }, { texto: "x".repeat(2001) }, { ordem: -1 }, { patrimonioOrigemId: randomUUID() }]) assert.equal(createLigacaoSchema.safeParse({ ...data, ...patch }).success, false);
    assert.equal(updateLigacaoSchema.safeParse({}).success, false);
});
test("reordenação exige IDs únicos e consolidações são reconhecidas por UUID ou slug", () => {
    const id = randomUUID();
    assert.equal(ordenarEditorialSchema.safeParse({ ids: [id, id] }).success, false);
    assert.equal(ordenarEditorialSchema.safeParse({ ids: [] }).success, true);
    for (const legacy of LEGADOS_EDITORIAIS) {
        assert.equal(legadoEditorial({ id: legacy.id, slug: "renomeado" }).canonico, legacy.canonico);
        assert.equal(legadoEditorial({ id: randomUUID(), slug: legacy.slug }).canonico, legacy.canonico);
        assert.ok(destinoPublicoWhere.id.notIn.includes(legacy.id));
        assert.ok(destinoPublicoWhere.slug.notIn.includes(legacy.slug));
    }
});
