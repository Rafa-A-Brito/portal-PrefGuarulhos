import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { importPatrimonios, parseArgs } from "../prisma/import-patrimonios.js";

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
