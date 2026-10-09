import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import { PATRIMONIOS_SEED as seed } from "../prisma/patrimonioSeedData.js";
import { normalizarNome, LEGACY_SLUG_ALIASES } from "../prisma/import-patrimonios.js";
import { slugify } from "../src/utils/slug.js";
import { localizacaoSchema } from "../src/schemas/patrimonioSchema.js";

test("fonte canônica: 34 identidades únicas, textos completos, locais e assets válidos", async () => {
    assert.equal(seed.length, 34);
    for (const key of [p => normalizarNome(p.nome), p => slugify(p.nome), p => LEGACY_SLUG_ALIASES.get(slugify(p.nome)) ?? slugify(p.nome)]) assert.equal(new Set(seed.map(key)).size, 34);
    for (const p of seed) {
        for (const field of ["nome", "descricao", "descricaoResumida", "historia", "importanciaCultural", "bairro", "endereco", "numero", "cep", "imagem"]) assert.ok(p[field]?.trim(), p.nome + ": " + field);
        assert.ok(p.descricaoResumida.length <= 500);
        assert.ok(p.detalhes.length > 0);
        assert.equal(new Set(p.detalhes.map(d => normalizarNome(d.titulo))).size, p.detalhes.length);
        for (const d of p.detalhes) assert.ok(d.icone && d.titulo.trim() && d.texto.trim());
        assert.doesNotMatch(JSON.stringify(p), /Ã[\x80-\xBF]|Â[\x80-\xBF]|\uFFFD|\x60{3}\s*eof/);
        assert.equal(typeof p.latitude, "number"); assert.equal(typeof p.longitude, "number");
        const fields = ["bairro", "endereco", "numero", "cep", "latitude", "longitude", "cidade", "uf"];
        const loc = localizacaoSchema.parse(Object.fromEntries(fields.map(k => [k, p[k]])));
        assert.equal(loc.cidade, p.nome === "Parque Ecológico do Tietê" ? "São Paulo" : "Guarulhos");
        assert.equal(loc.uf, "SP");
        assert.doesNotMatch(p.endereco, /,\s*(?:\d+|s\/n)/);
        assert.match(p.imagem, /^[\w-]+\.(jpg|jpeg|png|webp|gif)$/);
        assert.ok((await fs.stat(new URL("../src/uploads/patrimonios/" + p.imagem, import.meta.url))).isFile());
    }
    const placeholder = await fs.readFile(new URL("../src/uploads/patrimonios/patrimonio_sem_imagem.png", import.meta.url));
    assert.equal(placeholder.subarray(1, 4).toString(), "PNG");
});

test("correções documentais e consolidações mantêm as ressalvas", () => {
    const find = text => seed.find(p => p.nome.startsWith(text));
    assert.ok(!find("Casarão da Nossa História")); assert.ok(!find("Casarão do Sítio Ponte Alta"));
    const casa = find("Casa José Maurício");
    assert.match(casa.historia, /1925/); assert.match(casa.historia, /1937/);
    assert.equal(casa.numero, "150"); assert.match(JSON.stringify(casa.detalhes), /207/);
    const carbonell = find("Antiga Carbonell");
    assert.doesNotMatch(JSON.stringify(carbonell), /1923/);
    assert.match(carbonell.historia, /1917/); assert.match(carbonell.historia, /1925/);
    assert.equal(carbonell.numero, "292");
    assert.match(JSON.stringify(carbonell.detalhes), /aproximada/);
    assert.match(find("Casarão da Família").descricao, /remanescente e sede do antigo Sítio Ponte Alta/);
    assert.equal(find("Antigo Paço").numero, "164");
    assert.match(find("Antigo Paço").historia, /1921/);
    assert.equal(find("Capela do Bom Jesus").numero, "898");
    assert.match(find("Antigo Poço").historia, /confirmação documental/);
    assert.ok(["patrimonio_sem_imagem.png", "igreja_nossa_senhora_rosario_homens.jpg"].includes(find("Primitiva Igreja").imagem));
});
