import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource, planImport, parseArgs, importNovidades } from "../scripts/import-novidades.js";
import { serializarNovidade } from "../src/utils/novidadeData.js";
import * as source from "../../frontend/src/features/mocks/novidadesMock.js";
const groups = [source.noticiasSetembro, source.eventosOutubro, source.eventosNovembro, source.eventosDezembro];

test("16/16 itens preservam todos os campos editoriais, fontes, CTA e quatro imagens existentes", async () => {
    const items = await loadSource();
    assert.equal(items.length, 16);
    assert.equal(items.filter(x => x.asset).length, 4);
    for (const original of groups.flat()) {
        const item = items.find(x => x.slug === original.id);
        const dto = serializarNovidade(item.record);
        for (const field of ["tag", "titulo", "resumo", "texto", "quando", "local", "bloco", "cta", "fontes"]) {
            assert.deepEqual(dto[field] ?? null, original[field] ?? null, original.id + ":" + field);
        }
        assert.equal(dto.tipo, original.tipo.toUpperCase());
        if (original.data) assert.equal(dto.data, original.data);
        if (original.imagem) assert.match(dto.imagemUrl, /^\/uploads\/novidades\/[a-f0-9]+\.(jpg|jpeg)$/);
    }
    assert.equal(serializarNovidade(items.find(x => x.slug === "feira-economia-solidaria").record).data, "2026-10-01");
    assert.equal(items.filter(x => x.aviso).length, 1);
    assert.equal(serializarNovidade(items.find(x => x.slug === "arraia-vixi-maria").record).data, "2026-10-17");
});

test("planejamento é idempotente e diferenças administrativas são conflitos", async () => {
    const items = await loadSource();
    assert.ok(planImport(items, [], "RASCUNHO").every(x => x.acao === "CRIAR"));
    const existing = items.map(x => ({ ...x.record, slug: x.slug, status: "RASCUNHO" }));
    assert.ok(planImport(items, existing, "RASCUNHO").every(x => x.acao === "IGNORAR"));
    existing[0].texto = "Edição administrativa";
    assert.deepEqual(planImport(items, existing, "RASCUNHO")[0].campos, ["texto"]);
    existing[1].status = "ARQUIVADO";
    assert.equal(planImport(items, existing, "RASCUNHO")[1].acao, "CONFLITO");
    existing[2].slug = "outro-slug";
    assert.match(planImport(items, existing, "RASCUNHO")[2].motivo, /outro-slug/);
});

test("CLI exige autor, confirmação no apply e argumentos conhecidos", () => {
    assert.throws(() => parseArgs([]), /created-by-email/);
    assert.deepEqual(parseArgs(["--created-by-email=a@b.com"]), { apply: false, status: "RASCUNHO", createdByEmail: "a@b.com" });
    for (const extra of [["--apply"], ["--apply", "--dry-run"], ["--force"], ["--status=ARQUIVADO"], ["--dry-run", "--dry-run"]]) {
        assert.throws(() => parseArgs(["--created-by-email=a@b.com", ...extra]));
    }
});

test("destino errado aborta antes de qualquer acesso Prisma", async () => {
    await assert.rejects(importNovidades({ prisma: {}, options: { apply: true, confirmDb: "outro", createdByEmail: "a@b.com", status: "RASCUNHO" }, database: "patrimonio_guarulhos" }), /confirm-db/);
});

test("imagem ausente, referência inválida e ID duplicado bloqueiam a fonte", async () => {
    await assert.rejects(loadSource({ assetsDir: new URL("./inexistente/", import.meta.url).pathname }), /ENOENT/);
    const changed = structuredClone(groups);
    changed[0][0].imagem = "/src/assets/novidades/../segredo.jpg";
    await assert.rejects(loadSource({ groups: changed.map((x,i) => [x, String(9+i)]) }), /Imagem local/);
    changed[0][0].imagem = null;
    changed[0][1].id = changed[0][0].id;
    await assert.rejects(loadSource({ groups: changed.map((x,i) => [x, String(9+i)]) }), /duplicado/);
});
