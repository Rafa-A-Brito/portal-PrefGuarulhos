import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { importPatrimonios, parseArgs } from "../prisma/import-patrimonios.js";
import { PATRIMONIOS_SEED } from "../prisma/patrimonioSeedData.js";
import { slugify } from "../src/utils/slug.js";

const category = { id: randomUUID(), nome: "Histórico" };
const author = { id: randomUUID(), isActive: true, role: "ADMIN" };
const item = { nome: "Casa Teste", descricao: "Descrição", descricaoResumida: "Resumo", categoria: category.nome };
const url = "postgresql://unused@127.0.0.1:1/import_test";
function fake({ existing = [], categories = [category], user = author, fail } = {}) {
    const created = [];
    return {
        created, user: { findUnique: async () => user },
        categoria: { findMany: async () => categories },
        patrimonio: { findMany: async () => existing },
        $transaction: async callback => {
            if (fail) throw fail;
            return callback({
                $queryRawUnsafe: async () => [],
                patrimonio: { findMany: async () => existing, create: async ({ data }) => created.push(data) },
            });
        },
    };
}
async function temp(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "lote06-import-"));
    t.after(async () => {
        assert.ok(root.startsWith(path.join(os.tmpdir(), "lote06-import-")));
        await fs.rm(root, { recursive: true, force: true });
    });
    const sourceDir = path.join(root, "source");
    await fs.mkdir(sourceDir);
    await fs.writeFile(path.join(sourceDir, "imagem.png"), "imagem");
    return { sourceDir, uploadDir: path.join(root, "runtime") };
}
const apply = () => parseArgs(["--apply", "--confirm-db=import_test", "--created-by-email=admin@example.test"]);

test("CLI é conservador e rejeita modos/flags incompatíveis", () => {
    assert.equal(parseArgs([]).apply, false);
    assert.equal(parseArgs([]).status, "RASCUNHO");
    for (const args of [
        ["--apply"], ["--apply", "--confirm-db=import_test"], ["--overwrite=nome"],
        ["--fill-missing"], ["--status=ARQUIVADO"], ["--dry-run", "--apply"],
        ["--apply=false"], ["--json=no"], ["--status=PUBLICADO", "--status=RASCUNHO"],
    ]) assert.throws(() => parseArgs(args));
});

test("dry-run lê imagens mas não cria diretório, autor, categoria ou registro", async t => {
    const dirs = await temp(t);
    const prisma = fake();
    const report = await importPatrimonios({ prisma, databaseUrl: url, source: [{ ...item, imagem: "imagem.png" }], ...dirs });
    assert.equal(report.criar, 1);
    assert.equal(report.criados, 0);
    assert.deepEqual(prisma.created, []);
    assert.equal(report.erros.length, 0);
    await assert.rejects(fs.access(dirs.uploadDir), { code: "ENOENT" });
});

test("ignora slug existente e recusa duplicatas por nome normalizado", async () => {
    const prisma = fake({ existing: [{ slug: "outro-slug", nome: "Cása Teste" }, { slug: "ja-existe", nome: "Outro" }] });
    const report = await importPatrimonios({ prisma, databaseUrl: url, source: [item, { ...item, nome: "Já Existe" }] });
    assert.equal(report.conflitos.length, 1);
    assert.equal(report.ignorar, 1);
    const repeated = await importPatrimonios({ prisma: fake(), databaseUrl: url, source: [item, { ...item, nome: "Cása teste" }] });
    assert.equal(repeated.conflitos.length, 2);
});

test("categoria ausente e coordenadas inválidas são erros sem criação", async () => {
    for (const source of [
        [{ ...item, categoria: "Inexistente" }],
        [{ ...item, latitude: -23 }],
        [{ ...item, latitude: 91, longitude: 0 }],
        [{ ...item, latitude: "0", longitude: 0 }],
    ]) {
        const report = await importPatrimonios({ prisma: fake(), databaseUrl: url, source });
        assert.equal(report.erros.length, 1);
        assert.equal(report.criar, 0);
    }
});

test("aplicar exige confirmação e autor ativo válido antes de qualquer escrita", async () => {
    for (const user of [null, { ...author, isActive: false }, { ...author, role: "VISITANTE" }]) {
        await assert.rejects(importPatrimonios({ prisma: fake({ user }), databaseUrl: url, options: apply(), source: [item] }), /Autor/);
    }
    await assert.rejects(importPatrimonios({ prisma: fake(), databaseUrl: url, options: { ...apply(), confirmDb: "errado" }, source: [item] }), /Confirmação/);
});

test("status padrão, publicação explícita e localização mínima", async () => {
    for (const status of ["RASCUNHO", "PUBLICADO"]) {
        const prisma = fake();
        const report = await importPatrimonios({
            prisma, databaseUrl: url, options: { ...apply(), status },
            source: [{ ...item, endereco: "Rua", bairro: "Centro", latitude: 0, longitude: 0 }],
        });
        assert.equal(report.criados, 1);
        assert.equal(prisma.created[0].status, status);
        assert.equal(Boolean(prisma.created[0].publicadoEm), status === "PUBLICADO");
        assert.equal(prisma.created[0].localizacao.create.latitude, 0);
        assert.equal(report.warnings.length, 1);
    }
});

test("imagem insegura, inexistente ou diferente no destino impede importação", async t => {
    const dirs = await temp(t);
    await fs.mkdir(path.join(dirs.uploadDir, "patrimonios"), { recursive: true });
    await fs.writeFile(path.join(dirs.uploadDir, "patrimonios", "imagem.png"), "anterior");
    for (const imagem of ["../imagem.png", "imagem.svg", "ausente.png", "imagem.png"]) {
        const report = await importPatrimonios({ prisma: fake(), databaseUrl: url, options: apply(), source: [{ ...item, imagem }], ...dirs });
        assert.equal(report.erros.length, 1);
        assert.equal(report.criados, 0);
    }
    assert.equal(await fs.readFile(path.join(dirs.uploadDir, "patrimonios", "imagem.png"), "utf8"), "anterior");
});

test("falha transacional compensa só a imagem criada pela tentativa", async t => {
    const dirs = await temp(t);
    const args = { prisma: fake({ fail: new Error("erro-original") }), databaseUrl: url, options: apply(), source: [{ ...item, imagem: "imagem.png" }], ...dirs };
    const report = await importPatrimonios(args);
    assert.equal(report.erros[0].motivo, "erro-original");
    const destination = path.join(dirs.uploadDir, "patrimonios", "imagem.png");
    await assert.rejects(fs.access(destination), { code: "ENOENT" });
    await fs.writeFile(destination, "imagem");
    const repeat = await importPatrimonios(args);
    assert.equal(repeat.erros[0].motivo, "erro-original");
    assert.equal(await fs.readFile(destination, "utf8"), "imagem");
});

test("falha de compensação mantém erro original e identifica possível órfão", async t => {
    const dirs = await temp(t);
    const report = await importPatrimonios({
        prisma: fake({ fail: new Error("erro-original") }), databaseUrl: url, options: apply(),
        source: [{ ...item, imagem: "imagem.png" }], ...dirs,
        io: { ...fs, unlink: async () => { throw new Error("limpeza-negada"); } },
    });
    assert.equal(report.erros[0].motivo, "erro-original");
    assert.ok(report.warnings.some(w => w.arquivoOrfao && w.motivo === "limpeza-negada"));
});

const legacyAliases = [
    ["centro-municipal-de-educacao-adamastor","antiga-fabrica-adamastor"],
    ["antiga-igreja-matriz-colonial-de-n-sra-da-conceicao-demolida","antiga-igreja-matriz-colonial-de-nossa-senhora-da-conceicao"],
    ["parque-bosque-maia","bosque-maia"],
    ["casarao-da-familia-albertis-demolido-em-2023","casarao-da-familia-albertis"],
    ["casarao-lima-demolido-em-2026","casarao-lima"],
    ["casarao-saraceni-demolido-em-2010","casarao-saraceni"],
    ["e-e-capistrano-de-abreu","escola-estadual-capistrano-de-abreu"],
    ["e-e-conselheiro-crispiniano","escola-estadual-conselheiro-crispiniano"],
    ["estacao-ferroviaria-de-guarulhos","estacao-ferroviaria-central-de-guarulhos"],
    ["igreja-de-nossa-senhora-de-bonsucesso","igreja-de-nossa-senhora-de-bonsucesso-e-nucleo-historico"],
    ["igreja-de-n-sra-do-rosario-dos-homens-pretos","igreja-de-nossa-senhora-do-rosario-dos-homens-pretos"],
    ["locomotiva-maria-fumaca-n-33-e-vagao","locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua"],
    ["reserva-e-represa-do-cabucu","represa-do-cabucu"],
    ["complexo-sanatorio-padre-bento","sanatorio-padre-bento"],
];

for (const [sourceSlug, legacySlug] of legacyAliases) {
    test(`alias legado ${sourceSlug} é ignorado sem escrita ou alteração`, async () => {
        const sourceItem = PATRIMONIOS_SEED.find(p => slugify(p.nome) === sourceSlug);
        assert.ok(sourceItem, "Alias deve corresponder a um item real da fonte");
        const existing = [{
            id: randomUUID(), slug: legacySlug, nome: "Nome administrativo preservado",
            status: "PUBLICADO", descricao: "Descrição administrativa preservada",
        }];
        const before = structuredClone(existing);
        const prisma = fake({ existing });
        prisma.$transaction = async () => assert.fail("Alias existente não deve iniciar transação");
        const io = new Proxy({}, { get: () => assert.fail("Alias existente não deve acessar imagens") });
        const report = await importPatrimonios({
            prisma, databaseUrl: url, source: [sourceItem], io,
            options: parseArgs(["--dry-run"]),
        });
        assert.equal(report.fonte, 1);
        assert.equal(report.existentes, 1);
        assert.equal(report.ignorar, 1);
        assert.equal(report.criar, 0);
        assert.equal(report.criados, 0);
        assert.deepEqual(report.conflitos, []);
        assert.deepEqual(report.erros, []);
        assert.deepEqual(report.itens, [{ nome: sourceItem.nome, slug: sourceSlug, acao: "IGNORAR" }]);
        assert.deepEqual(prisma.created, []);
        assert.deepEqual(existing, before);
    });
}

test("alias sem destino cadastrado mantém criação prevista e slug da fonte", async () => {
    const prisma = fake();
    const report = await importPatrimonios({
        prisma, databaseUrl: url,
        source: legacyAliases.map(([slug]) => ({ ...item, nome: slug })),
    });
    assert.equal(report.criar, legacyAliases.length);
    assert.equal(report.existentes, 0);
    assert.equal(report.ignorar, 0);
    assert.equal(report.criados, 0);
    assert.deepEqual(report.conflitos, []);
    assert.deepEqual(report.erros, []);
    assert.deepEqual(report.itens.map(p => [p.slug, p.acao]), legacyAliases.map(([slug]) => [slug, "CRIAR"]));
    assert.deepEqual(prisma.created, []);
});

test("slug exato continua sendo ignorado mesmo sem o destino legado", async () => {
    const source = legacyAliases.map(([slug]) => ({ ...item, nome: slug }));
    const prisma = fake({ existing: source.map(p => ({ slug: p.nome, nome: "Outro nome" })) });
    const report = await importPatrimonios({ prisma, databaseUrl: url, source });
    assert.equal(report.ignorar, source.length);
    assert.equal(report.existentes, source.length);
    assert.equal(report.criar, 0);
    assert.deepEqual(report.conflitos, []);
    assert.deepEqual(report.erros, []);
});

test("aliases são exatos e não incluem variantes nem equivalências inversas", async () => {
    const [sourceSlug, legacySlug] = legacyAliases[0];
    const prisma = fake({ existing: [
        { slug: sourceSlug, nome: "Nome fonte preservado" },
        { slug: legacySlug, nome: "Nome legado preservado" },
    ] });
    const similar = await importPatrimonios({
        prisma, databaseUrl: url, source: [{ ...item, nome: sourceSlug + "-novo" }],
    });
    assert.equal(similar.criar, 1);
    assert.equal(similar.ignorar, 0);
    assert.deepEqual(similar.erros, []);
    const reverse = await importPatrimonios({
        prisma: fake({ existing: [{ slug: sourceSlug, nome: "Nome fonte preservado" }] }),
        databaseUrl: url, source: [{ ...item, nome: legacySlug }],
    });
    assert.equal(reverse.criar, 1);
    assert.equal(reverse.ignorar, 0);
    assert.deepEqual(reverse.erros, []);
});

test("alias surgido na releitura transacional impede duplicata", async () => {
    const [sourceSlug, legacySlug] = legacyAliases[0];
    const existing = [];
    const prisma = fake({ existing });
    const transaction = prisma.$transaction;
    prisma.$transaction = async callback => {
        existing.push({ slug: legacySlug, nome: "Registro criado concorrentemente", status: "PUBLICADO" });
        return transaction(callback);
    };
    // Apenas Prisma simulado: nenhuma conexão ou aplicação no banco real.
    const report = await importPatrimonios({
        prisma, databaseUrl: url, options: apply(), source: [{ ...item, nome: sourceSlug }],
    });
    assert.equal(report.criados, 0);
    assert.equal(report.erros.length, 1);
    assert.match(report.erros[0].motivo, /apareceu durante a importação/);
    assert.deepEqual(prisma.created, []);
    assert.deepEqual(existing, [{ slug: legacySlug, nome: "Registro criado concorrentemente", status: "PUBLICADO" }]);
});
