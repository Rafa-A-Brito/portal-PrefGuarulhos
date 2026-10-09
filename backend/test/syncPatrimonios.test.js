import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importPatrimonios, parseArgs } from "../prisma/import-patrimonios.js";
import { planSync } from "../prisma/sync-patrimonios.js";
import { PATRIMONIOS_SEED as seed } from "../prisma/patrimonioSeedData.js";
import { slugify } from "../src/utils/slug.js";

const databaseUrl = "postgresql://unused@localhost:1/sync_test";
const category = { id: randomUUID(), nome: "Arquitetônico" };
const author = { id: randomUUID(), role: "ADMIN", isActive: true };
const source = seed.filter(p => /^(Casa José Maurício|Casarão da Família Albertis)/.test(p.nome));
const dry = () => parseArgs(["--sync-patrimonios"]);
const apply = () => parseArgs(["--sync-patrimonios", "--apply", "--confirm-db=sync_test", "--created-by-email=admin@example.test"]);
const sourceDir = fileURLToPath(new URL("../src/uploads/patrimonios", import.meta.url));
function row(nome, extra = {}) {
    return { id: randomUUID(), nome, slug: slugify(nome), descricao: "anterior", descricaoResumida: "resumo", historia: "história anterior", importanciaCultural: "importância anterior", situacao: "PRESERVADO", status: "RASCUNHO", createdBy: author.id, updatedBy: randomUUID(), publicadoEm: null, arquivadoEm: null, categoriaId: category.id, localizacao: null, imagens: [], detalhes: [], documentos: [], rotas: [], categoriasAdicionais: [], ...extra };
}
function fixtures() {
    const casa = row(source[0].nome, { status: "PUBLICADO", publicadoEm: "2025-07-01T12:00:00.000Z" });
    const image = { id: randomUUID(), url: "/uploads/patrimonios/casa_jose_mauricio.jpg", textoAlternativo: "Imagem editorial", principal: true, ordem: 4 };
    casa.imagens.push(image);
    casa.detalhes.push({ id: randomUUID(), icone: "historia", titulo: "Detalhe editorial", texto: "Texto do editor", ordem: 20 });
    const duplicate = row("Casarão da Nossa História", { status: "PUBLICADO", localizacao: { id: randomUUID(), endereco: "Preservar no arquivo" },
        imagens: [{ ...image, id: randomUUID() }, { ...image, id: randomUUID(), url: "/uploads/extra.png", credito: "Crédito preservado" }],
        detalhes: [{ id: randomUUID(), titulo: "Detalhe adicional útil", texto: "Memória local", icone: null, ordem: 0 }],
        documentos: [{ id: randomUUID(), titulo: "Inventário", url: "/doc.pdf", tipo: "PDF", fonte: "Arquivo" }],
        categoriasAdicionais: [{ categoriaId: randomUUID() }], rotas: [{ id: randomUUID(), rotaId: "rota1", ordem: 0 }, { id: randomUUID(), rotaId: "rota2", ordem: 3 }],
    });
    casa.rotas.push({ id: randomUUID(), rotaId: "rota1", ordem: 1 });
    return [casa, duplicate, row(source[1].nome, { slug: "casarao-da-familia-albertis" }), row("Casarão do Sítio Ponte Alta")];
}
function fake(initial = fixtures(), { failAudit = false, connected = "sync_test" } = {}) {
    let state = structuredClone(initial), audits = [];
    const calls = [];
    return { calls, get state() { return structuredClone(state); }, get audits() { return structuredClone(audits); },
        async $transaction(callback) {
            const pending = structuredClone(state), logs = structuredClone(audits);
            const get = id => pending.find(p => p.id === id);
            const tx = {
                $executeRawUnsafe: async sql => { calls.push(sql); },
                $queryRawUnsafe: async sql => { calls.push(sql); return [{ banco: connected }]; },
                user: { findUnique: async () => author }, categoria: { findMany: async () => [category] },
                patrimonio: { findMany: async () => structuredClone(pending).map(p => ({ ...p, detalhes: p.detalhes.sort((a,b) => a.ordem-b.ordem), imagens: p.imagens.sort((a,b) => a.ordem-b.ordem) })), update: async ({ where, data }) => { calls.push("write"); Object.assign(get(where.id), data); } },
                localizacao: { upsert: async ({ where, create, update }) => { calls.push("write"); const p = get(where.patrimonioId); p.localizacao = p.localizacao ? { ...p.localizacao, ...update } : { id: randomUUID(), ...create }; } },
                auditLog: { create: async ({ data }) => { calls.push("write"); if (failAudit) throw new Error("rollback-teste"); logs.push(data); } },
            };
            for (const [model, relation] of Object.entries({ patrimonioDetalhe: "detalhes", patrimonioImagem: "imagens", patrimonioDocumento: "documentos", rotaPatrimonio: "rotas", patrimonioCategoria: "categoriasAdicionais" })) {
                tx[model] = {
                    create: async ({ data }) => { calls.push("write"); get(data.patrimonioId)[relation].push({ id: randomUUID(), ...data }); },
                    update: async ({ where, data }) => { calls.push("write"); const parent = pending.find(p => p[relation].some(r => r.id === where.id)); const r = parent[relation].find(r => r.id === where.id); Object.assign(r, data); if (data.patrimonioId && data.patrimonioId !== parent.id) { parent[relation] = parent[relation].filter(x => x !== r); get(data.patrimonioId)[relation].push(r); } },
                    delete: async ({ where }) => { calls.push("write"); for (const p of pending) p[relation] = p[relation].filter(r => where.id ? r.id !== where.id : !(p.id === where.patrimonioId_categoriaId.patrimonioId && r.categoriaId === where.patrimonioId_categoriaId.categoriaId)); },
                    deleteMany: async ({ where }) => { calls.push("write"); const p = get(where.patrimonioId); p[relation] = p[relation].filter(r => !where.id.in.includes(r.id)); },
                };
            }
            tx.patrimonioImagem.count = async ({ where }) => pending.flatMap(p => p.imagens).filter(i => i.url === where.url).length;
            const result = await callback(tx);
            state = pending; audits = logs;
            return result;
        },
    };
}
async function dirs(t) {
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "patrimonio-sync-"));
    t.after(() => { assert.ok(path.resolve(uploadDir).startsWith(path.join(os.tmpdir(), "patrimonio-sync-"))); return fs.rm(uploadDir, { recursive: true, force: true }); });
    return { uploadDir, sourceDir };
}

test("sync CLI: dry-run padrão, exclusão de backfills e status; confirmação obrigatória", () => {
    assert.equal(dry().apply, false);
    for (const flags of [["--backfill-images"], ["--backfill-location"], ["--backfill-details"], ["--status=PUBLICADO"], ["--status=RASCUNHO"], ["--apply"]]) assert.throws(() => parseArgs(["--sync-patrimonios", ...flags]));
});

test("dry-run tem diff completo, dois merges e zero gravações em banco e disco", async t => {
    const prisma = fake(); const before = prisma.state; const paths = await dirs(t);
    const io = new Proxy(fs, { get(target, key) { if (["mkdir", "copyFile", "writeFile", "unlink"].includes(key)) return () => assert.fail("dry-run tentou escrever"); return target[key]; } });
    const report = await importPatrimonios({ prisma, databaseUrl, source, options: dry(), ...paths, io });
    assert.deepEqual(report.erros, []); assert.deepEqual(report.conflitos, []);
    assert.equal(report.merges_planejados, 2); assert.equal(report.updates_planejados, 2);
    assert.equal(report.aplicados, 0); assert.deepEqual(prisma.state, before);
    assert.equal(prisma.calls[0], "SET TRANSACTION READ ONLY");
    assert.ok(!prisma.calls.includes("write"));
    assert.ok(report.itens[0].diff.some(d => d.campo === "localizacao.numero" && d.novo === "150"));
    assert.ok(report.itens[0].diff.some(d => d.campo === "documentos.adicionar"));
    assert.deepEqual(await fs.readdir(paths.uploadDir), []);
});

test("apply preserva identidades/editoria/relações, arquiva duplicados e segunda execução muda zero", async t => {
    const prisma = fake(), before = prisma.state, paths = await dirs(t);
    const args = { prisma, databaseUrl, source, options: apply(), ...paths };
    const report = await importPatrimonios(args);
    assert.deepEqual(report.conflitos, []); assert.deepEqual(report.erros, []); assert.equal(report.aplicados, 2);
    assert.ok(prisma.calls.indexOf("SELECT pg_advisory_xact_lock(6062026)::text") < prisma.calls.indexOf("write"));
    const [casa, duplicate, albertis, ponte] = prisma.state;
    for (const field of ["id", "slug", "status", "publicadoEm", "createdBy", "updatedBy"]) assert.deepEqual(casa[field], before[0][field]);
    assert.equal(albertis.slug, "casarao-da-familia-albertis");
    assert.equal(duplicate.status, "ARQUIVADO"); assert.equal(ponte.status, "ARQUIVADO");
    assert.deepEqual(duplicate.localizacao, before[1].localizacao);
    assert.deepEqual(duplicate.imagens, before[1].imagens);
    assert.equal(casa.imagens.length, 2); assert.equal(casa.imagens.filter(i => i.principal).length, 1);
    assert.ok(casa.detalhes.some(d => d.titulo === "Detalhe editorial"));
    assert.ok(casa.detalhes.some(d => d.titulo === "Detalhe adicional útil"));
    assert.equal(casa.documentos[0].fonte, "Arquivo");
    assert.equal(casa.categoriasAdicionais.length, 1); assert.equal(casa.rotas.length, 2); assert.equal(duplicate.rotas.length, 0);
    assert.equal(prisma.audits.length, 2);
    const snapshot = prisma.state;
    const repeat = await importPatrimonios(args);
    assert.equal(repeat.updates_planejados, 0); assert.equal(repeat.merges_planejados, 0); assert.equal(repeat.aplicados, 0);
    assert.deepEqual(prisma.state, snapshot); assert.equal(prisma.audits.length, 2);
});

test("falha transacional desfaz tudo e compensa arquivos criados", async t => {
    const prisma = fake(undefined, { failAudit: true }), before = prisma.state, paths = await dirs(t);
    await assert.rejects(importPatrimonios({ prisma, databaseUrl, source, options: apply(), ...paths }), /rollback-teste/);
    assert.deepEqual(prisma.state, before); assert.deepEqual(prisma.audits, []);
    // A capa já referenciada antes do rollback deve continuar disponível.
    assert.deepEqual(await fs.readdir(path.join(paths.uploadDir, "patrimonios")), [source[0].imagem]);
});

test("ambiguidade, ausência, fonte duplicada e Poço publicado bloqueiam o lote antes de gravar", async t => {
    const paths = await dirs(t), poco = seed.find(p => p.nome === "Antigo Poço Municipal");
    for (const [rows, inputs] of [[[], source], [[...fixtures(), row(source[1].nome)].flat(), source], [fixtures(), [source[0], source[0]]], [[row(poco.nome, { status: "PUBLICADO" })], [poco]]]) {
        const prisma = fake(rows);
        const report = await importPatrimonios({ prisma, databaseUrl, source: inputs, options: apply(), ...paths });
        assert.ok(report.conflitos.length); assert.ok(!prisma.calls.includes("write"));
    }
    const report = planSync({ source: [poco], existing: [row(poco.nome)], categories: [category] }).report;
    assert.equal(report.itens[0].acao, "ATUALIZAR_COM_RESSALVA");
});

test("somente campos definidos mudam; coordenadas Decimal comparam numericamente", () => {
    const existing = row("Nome apenas", { localizacao: { endereco: "Rua", numero: "1", cep: "07010-000", bairro: "Centro", cidade: "São Paulo", uf: "SP", latitude: "-23.4", longitude: "-46.5", complemento: "Preservar" } });
    const plan = planSync({ source: [{ nome: existing.nome, latitude: -23.4, longitude: -46.5 }], existing: [existing], categories: [] });
    assert.deepEqual(plan.report.conflitos, []); assert.equal(plan.report.updates_planejados, 0);
});

test("confirmação, autor e identidade conectada protegem apply", async t => {
    const paths = await dirs(t);
    await assert.rejects(importPatrimonios({ prisma: fake(), databaseUrl, source, options: { ...apply(), confirmDb: "real" }, ...paths }), /Confirmação/);
    await assert.rejects(importPatrimonios({ prisma: fake(undefined, { connected: "outro" }), databaseUrl, source, options: apply(), ...paths }), /Banco conectado/);
});

test("imagem ausente ou destino diferente bloqueia o lote; nenhum download", async t => {
    const paths = await dirs(t), prisma = fake();
    for (const imagem of ["ausente.png", "https://example.test/imagem.png", "../imagem.png"]) {
        const report = await importPatrimonios({ prisma, databaseUrl, source: [{ ...source[0], imagem }], options: apply(), ...paths });
        assert.equal(report.erros.length, 1); assert.ok(!prisma.calls.includes("write"));
    }
    await fs.mkdir(path.join(paths.uploadDir, "patrimonios"));
    await fs.writeFile(path.join(paths.uploadDir, "patrimonios", source[0].imagem), "conteúdo divergente");
    const report = await importPatrimonios({ prisma, databaseUrl, source, options: apply(), ...paths });
    assert.ok(report.erros.length); assert.ok(!prisma.calls.includes("write"));
});

test("localização completa é exigida mesmo sem patch, sem defaults inventados; zero é coordenada válida", () => {
    const complete = { endereco: "Rua", numero: "s/n", bairro: "Centro", cep: "07010-000", latitude: 0, longitude: 0, cidade: "São Paulo", uf: "SP" };
    for (const key of Object.keys(complete)) {
        for (const value of [undefined, null, " "]) {
            for (const inSource of [false, true]) {
                const localizacao = { ...complete, [key]: value };
                const existing = row("Localização inválida", { localizacao: inSource ? complete : localizacao });
                const item = inSource ? { nome: existing.nome, ...localizacao } : { nome: existing.nome };
                // undefined na fonte significa preservar o banco, não apagar.
                if (inSource && value === undefined) continue;
                const plan = planSync({ source: [item], existing: [existing], categories: [] });
                assert.equal(plan.report.conflitos.length, 1, key);
                assert.match(plan.report.conflitos[0].motivo, new RegExp(key));
                assert.equal(plan.operations.length, 0);
            }
        }
    }
    for (const patch of [{ cep: "inválido" }, { latitude: 91 }, { longitude: -181 }, { uf: "S" }, { numero: 1 }]) {
        const existing = row("Localização inválida", { localizacao: complete });
        assert.equal(planSync({ source: [{ nome: existing.nome, ...patch }], existing: [existing], categories: [] }).report.conflitos.length, 1);
    }
    const existing = row("Coordenadas zero", { localizacao: complete });
    const plan = planSync({ source: [{ nome: existing.nome, numero: "2" }], existing: [existing], categories: [] });
    assert.deepEqual(plan.report.conflitos, []);
    assert.deepEqual(plan.operations[0].location, { numero: "2" });
    assert.deepEqual(plan.operations[0].locationCreate, { ...complete, numero: "2" });
});
