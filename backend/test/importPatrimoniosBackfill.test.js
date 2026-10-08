import assert from "node:assert/strict";
import { test } from "node:test";
import { importPatrimonios, parseArgs } from "../prisma/import-patrimonios.js";

// Only an in-memory Prisma double is used, including all apply scenarios.
const databaseUrl = "postgresql://unused@127.0.0.1:1/import_test";
const author = { isActive: true, role: "ADMIN" };
const sourceItem = {
    nome: "Casa Teste", endereco: "Rua Teste", bairro: "Centro",
    numero: "10", cep: "07011-040", latitude: -23.4543, longitude: -46.5333,
    detalhes: [
        { icone: "tempo", titulo: " Primeiro ", texto: " Texto original " },
        { icone: null, titulo: "Segundo", texto: "Outro texto" },
    ],
    imagem: "must-not-be-read.png",
};
const base = {
    id: "patrimonio-1", slug: "casa-teste", nome: "Nome administrativo",
    status: "PUBLICADO", descricao: "Preservar", updatedAt: "2026-01-01",
    localizacao: null, detalhes: [], imagens: [{ id: "imagem-preservada" }],
};
const forbiddenIO = new Proxy({}, { get: () => assert.fail("No file access in relation backfills") });
function fake({ existing = [base], user = author, beforeTransaction, failCommit = false } = {}) {
    let rows = structuredClone(existing);
    let transactions = 0;
    let writes = 0;
    let locks = 0;
    const deny = new Proxy({}, { get: (_, key) => assert.fail("Forbidden Prisma operation: " + String(key)) });
    const checked = (object) => new Proxy(object, { get: (target, key) => key in target ? target[key] : deny[key] });
    const prisma = checked({
        user: checked({ findUnique: async () => user }),
        categoria: checked({ findMany: async () => [] }),
        patrimonio: checked({ findMany: async () => structuredClone(rows) }),
        $transaction: async callback => {
            transactions++;
            if (beforeTransaction) beforeTransaction(rows);
            const pending = structuredClone(rows);
            let locked = false;
            const result = await callback(checked({
                $queryRawUnsafe: async sql => {
                    assert.equal(sql, "SELECT pg_advisory_xact_lock(6062026)::text");
                    locks++;
                    locked = true;
                    return [];
                },
                patrimonio: checked({ findUnique: async ({ where }) => {
                    assert.ok(locked);
                    return structuredClone(pending.find(p => p.id === where.id) || null);
                } }),
                localizacao: checked({ create: async ({ data }) => {
                    assert.ok(locked);
                    const row = pending.find(p => p.id === data.patrimonioId);
                    assert.equal(row.localizacao, null);
                    writes++;
                    row.localizacao = { id: "location-1", ...data };
                    return structuredClone(row.localizacao);
                } }),
                patrimonioDetalhe: checked({ createMany: async ({ data }) => {
                    assert.ok(locked);
                    writes++;
                    for (const detail of data) pending.find(p => p.id === detail.patrimonioId).detalhes.push(detail);
                    return { count: data.length };
                } }),
            }));
            if (failCommit) throw new Error("rollback-simulated");
            rows = pending;
            return result;
        },
    });
    return { prisma, state: () => structuredClone(rows), counts: () => ({ transactions, writes, locks }) };
}
const modes = [
    { flag: "--backfill-location", option: "backfillLocation", relation: "localizacao", analyzed: "analisadosLocalizacao", present: "jaComLocalizacao", planned: "vincularLocalizacao", missing: "semLocalizacaoNaFonte", linked: "localizacoesVinculadas", absentAction: "SEM_LOCALIZACAO_NA_FONTE", existing: { id: "existing-location", endereco: "Preservar" } },
    { flag: "--backfill-details", option: "backfillDetails", relation: "detalhes", analyzed: "analisadosDetalhes", present: "jaComDetalhes", planned: "vincularDetalhes", missing: "semDetalhesNaFonte", linked: "detalhesVinculados", absentAction: "SEM_DETALHES_NA_FONTE", existing: [{ id: "existing-detail", titulo: "Preservar" }] },
];
function run(db, mode, { apply = false, source = [sourceItem], options } = {}) {
    return importPatrimonios({
        prisma: db.prisma, databaseUrl, source, io: forbiddenIO,
        options: options || parseArgs([
            apply ? "--apply" : "--dry-run", mode.flag, "--created-by-email=admin@example.test",
            ...(apply ? ["--confirm-db=import_test"] : []),
        ]),
    });
}
function clean(report) {
    assert.deepEqual(report.erros, []);
    assert.deepEqual(report.conflitos, []);
    assert.equal(report.criar, 0);
    assert.equal(report.criados, 0);
}

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

for (const mode of modes) {
    test(mode.flag + " parses only explicit valid flags and preserves confirmation", async () => {
        assert.equal(parseArgs([])[mode.option], undefined);
        assert.equal(parseArgs([mode.flag])[mode.option], true);
        for (const args of [[mode.flag, mode.flag], [mode.flag + "=true"], [mode.flag, "--apply"], [mode.flag, "--backfill-images"], [mode.flag, "--apply", "--dry-run"]]) {
            assert.throws(() => parseArgs(args));
        }
        for (const options of [
            { ...parseArgs([mode.flag]), apply: true, confirmDb: "wrong", createdByEmail: "admin@example.test" },
            { ...parseArgs([mode.flag]), apply: true, confirmDb: "import_test" },
        ]) {
            const db = fake();
            await assert.rejects(run(db, mode, { options }), /Confirma/);
            assert.equal(db.counts().transactions, 0);
        }
        for (const user of [null, { ...author, isActive: false }, { ...author, role: "VISITANTE" }]) {
            const db = fake({ user });
            await assert.rejects(run(db, mode, { apply: true }), /Autor/);
            assert.equal(db.counts().transactions, 0);
        }
    });

    test(mode.flag + " dry-run plans without writes, transactions or filesystem access", async () => {
        const db = fake();
        const before = db.state();
        const report = await run(db, mode);
        clean(report);
        assert.equal(report[mode.analyzed], 1);
        assert.equal(report[mode.planned], 1);
        assert.equal(report[mode.linked], 0);
        assert.deepEqual(db.state(), before);
        assert.deepEqual(db.counts(), { transactions: 0, writes: 0, locks: 0 });
    });

    test(mode.flag + " ignores existing relations even with invalid source", async () => {
        const db = fake({ existing: [{ ...base, [mode.relation]: mode.existing }] });
        const before = db.state();
        const report = await run(db, mode, { apply: true, source: [{ nome: sourceItem.nome, endereco: 42, detalhes: "invalid" }] });
        clean(report);
        assert.equal(report[mode.present], 1);
        assert.equal(report.itens[0].acao, "IGNORAR");
        assert.equal(db.counts().transactions, 0);
        assert.deepEqual(db.state(), before);
    });

    test(mode.flag + " reports missing source and never creates patrimonios", async () => {
        const missingSources = mode.option === "backfillLocation"
            ? [{ nome: sourceItem.nome }, { nome: sourceItem.nome, endereco: "Rua" }, { nome: sourceItem.nome, endereco: " ", bairro: "Centro" }]
            : [{ nome: sourceItem.nome }, { nome: sourceItem.nome, detalhes: null }, { nome: sourceItem.nome, detalhes: [] }];
        for (const item of missingSources) {
            const db = fake();
            const report = await run(db, mode, { apply: true, source: [item] });
            clean(report);
            assert.equal(report[mode.missing], 1);
            assert.equal(report.itens[0].acao, mode.absentAction);
            assert.equal(db.counts().transactions, 0);
        }
        const report = await run(fake({ existing: [] }), mode, { apply: true });
        assert.equal(report.conflitos.length, 1);
        assert.equal(report[mode.linked], 0);
    });

    test(mode.flag + " supports all 14 aliases, exact slugs and unique normalized names", async () => {
        assert.equal(legacyAliases.length, 14);
        for (const [sourceSlug, legacySlug] of legacyAliases) {
            const db = fake({ existing: [{ ...base, slug: legacySlug }] });
            const report = await run(db, mode, { apply: true, source: [{ ...sourceItem, nome: sourceSlug }] });
            clean(report);
            assert.equal(report[mode.linked], 1);
            assert.equal(db.state()[0].slug, legacySlug);
        }
        const report = await run(fake({ existing: [{ ...base, slug: "other", nome: "CASA TESTE" }] }), mode);
        clean(report);
        assert.equal(report[mode.planned], 1);
        const ambiguous = await run(fake({ existing: [
            { ...base, slug: "other", nome: "CASA TESTE" },
            { ...base, id: "other-id", slug: "other-2", nome: "Casa teste" },
        ] }), mode);
        assert.equal(ambiguous.conflitos.length, 1);
    });

    test(mode.flag + " writes only absent relations and is idempotent", async () => {
        const db = fake();
        const report = await run(db, mode, { apply: true, source: [sourceItem, sourceItem] });
        clean(report);
        assert.equal(report[mode.linked], 1);
        assert.equal(report[mode.present], 1);
        const after = db.state();
        const { [mode.relation]: relation, ...fields } = after[0];
        const { [mode.relation]: ignored, ...beforeFields } = base;
        assert.deepEqual(fields, beforeFields);
        if (mode.option === "backfillLocation") {
            assert.deepEqual(relation, {
                id: "location-1", patrimonioId: base.id, endereco: sourceItem.endereco,
                bairro: sourceItem.bairro, cidade: "Guarulhos", uf: "SP", numero: sourceItem.numero,
                cep: sourceItem.cep, latitude: sourceItem.latitude, longitude: sourceItem.longitude,
            });
        } else {
            assert.deepEqual(relation, sourceItem.detalhes.map((d, ordem) => ({ ...d, ordem, patrimonioId: base.id })));
        }
        const repeat = await run(db, mode, { apply: true });
        clean(repeat);
        assert.equal(repeat[mode.linked], 0);
        assert.equal(repeat[mode.present], 1);
        assert.deepEqual(db.state(), after);
        assert.deepEqual(db.counts(), { transactions: 1, writes: 1, locks: 1 });
    });

    test(mode.flag + " rechecks relations under lock and ignores concurrent creation", async () => {
        const db = fake({ beforeTransaction: rows => { rows[0][mode.relation] = structuredClone(mode.existing); } });
        const report = await run(db, mode, { apply: true });
        clean(report);
        assert.equal(report[mode.linked], 0);
        assert.equal(report[mode.planned], 0);
        assert.equal(report[mode.present], 1);
        assert.equal(report.itens[0].acao, "IGNORAR");
        assert.equal(db.counts().writes, 0);
        assert.deepEqual(db.state()[0][mode.relation], mode.existing);
    });

    test(mode.flag + " reports disappeared patrimonio without writing", async () => {
        const db = fake({ beforeTransaction: rows => { rows.length = 0; } });
        const report = await run(db, mode, { apply: true });
        assert.equal(report.erros.length, 1);
        assert.equal(report[mode.linked], 0);
        assert.equal(db.counts().writes, 0);
    });

    test(mode.flag + " failed commit rolls back all relations and does not report success", async () => {
        const db = fake({ failCommit: true });
        const before = db.state();
        const report = await run(db, mode, { apply: true });
        assert.equal(report.erros[0].motivo, "rollback-simulated");
        assert.equal(report[mode.linked], 0);
        assert.equal(report.itens[0].acao, "ERRO");
        assert.deepEqual(db.state(), before);
    });
}

test("backfill modes cannot be combined even through programmatic options", async () => {
    assert.throws(() => parseArgs(modes.map(m => m.flag)), /backfill/);
    const db = fake();
    await assert.rejects(run(db, modes[0], { options: { ...parseArgs([]), backfillLocation: true, backfillDetails: true } }), /backfill/);
    assert.equal(db.counts().transactions, 0);
});

test("location validates coordinate pairs, ranges, finite numbers and address fields", async () => {
    for (const patch of [
        { longitude: undefined }, { latitude: null }, { latitude: 91 }, { longitude: 181 },
        { latitude: NaN }, { longitude: Infinity }, { latitude: "-23" },
        { cep: "invalid" }, { numero: 123 }, { endereco: "x".repeat(251) },
    ]) {
        const db = fake();
        const report = await run(db, modes[0], { apply: true, source: [{ ...sourceItem, ...patch }] });
        assert.equal(report.erros.length, 1, JSON.stringify(patch));
        assert.equal(report.localizacoesVinculadas, 0);
        assert.equal(db.counts().transactions, 0);
    }
});

test("location omits absent optional fields and preserves zero coordinates", async () => {
    for (const coords of [{}, { latitude: 0, longitude: 0 }]) {
        const db = fake();
        const report = await run(db, modes[0], { apply: true, source: [{
            nome: sourceItem.nome, endereco: "Rua", bairro: "Centro", numero: null, cep: null,
            cidade: "Other", uf: "RJ", ...coords,
        }] });
        clean(report);
        assert.deepEqual(db.state()[0].localizacao, {
            id: "location-1", patrimonioId: base.id, endereco: "Rua", bairro: "Centro",
            cidade: "Guarulhos", uf: "SP", ...coords,
        });
    }
});

test("details validates the entire list before any write", async () => {
    for (const detalhes of ["invalid", {}, [null], [{ titulo: " ", texto: "text" }],
        [sourceItem.detalhes[0], { titulo: "Invalid", texto: 42 }],
        [{ icone: 42, titulo: "Title", texto: "Text" }],
    ]) {
        const db = fake();
        const report = await run(db, modes[1], { apply: true, source: [{ ...sourceItem, detalhes }] });
        assert.equal(report.erros.length, 1);
        assert.equal(report.detalhesVinculados, 0);
        assert.equal(db.counts().transactions, 0);
    }
});
