import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
import { SLUGS_CANONICOS, EDITORIAL_CURADO } from "../prisma/data/patrimonioEditorialCurado.js";

// Só conecta à manutenção postgres e aos bancos criados por este processo.
const root = fileURLToPath(new URL("../", import.meta.url));
const cache = path.resolve(root, "../.cache/d2b", randomUUID());
fs.mkdirSync(cache, { recursive: true });
const require = createRequire(import.meta.url);
const cli = require.resolve("prisma/build/index.js");
const configModule = pathToFileURL(require.resolve("prisma/config")).href;
const hash = value => createHash("sha256").update(value).digest("hex");
const canonicalHash = hash(fs.readFileSync(path.join(root, "prisma/patrimonioSeedData.js")));
assert.equal(canonicalHash, "c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8");
const base = new URL(dotenv.parse(fs.readFileSync(path.join(root, ".env"))).DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
assert.equal(base.port || "5432", "5432");
base.search = ""; base.pathname = "/postgres";
const maintenance = new pg.Client({ connectionString: base.href });
const created = new Set();
const evidence = { cache, canonicalHash, realDatabaseAccessed: false, migrations: {}, tests: {} };
const expected = ["20260929230000_initial_schema", "20260930120000_add_demolido_situacao", "20261005004508_categorias_adicionais", "20261006014922_adicionar_detalhes_e_heroes", "20261006180000_exposicoes_novidades", "20261014010000_add_fatos_ligacoes", "20261016120000_add_regioes_numero_ordem"];
const migrations = path.join(root, "prisma/migrations");
assert.deepEqual(fs.readdirSync(migrations).filter(n => /^\d/.test(n)).sort(), expected);
function run(label, args, env) {
    const r = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 48 * 1024 * 1024 });
    fs.writeFileSync(path.join(cache, label + ".log"), (r.stdout ?? "") + (r.stderr ?? ""));
    assert.equal(r.status, 0, `${label} falhou; consulte ${cache}`);
    return (r.stdout ?? "").split("\n").slice(-12).join("\n");
}
async function database(label) {
    const name = `portal_d2b_${label}_${randomUUID().slice(0, 8)}_test`;
    assert.match(name, /^portal_d2b_[a-z0-9_]+_test$/);
    await maintenance.query(`CREATE DATABASE "${name}"`); created.add(name);
    const url = new URL(base); url.pathname = "/" + name; return url.href;
}
async function connect(url) {
    assert.ok(created.has(new URL(url).pathname.slice(1)));
    const client = new pg.Client({ connectionString: url }); await client.connect();
    assert.ok(created.has((await client.query("SELECT current_database() db")).rows[0].db));
    await client.query("SET TIME ZONE 'UTC'"); return client;
}
async function snapshot(client, tables, previousProjection = false) {
    const result = {};
    for (const name of tables) {
        assert.match(name, /^[a-z_]+$/);
        const expr = previousProjection && name === "patrimonio" ? "to_jsonb(t) - 'regiao_id' - 'numero_exibicao' - 'ordem_exibicao'" : "to_jsonb(t)";
        const rows = (await client.query(`SELECT (${expr})::text row FROM "${name}" t ORDER BY (${expr})::text COLLATE "C"`)).rows;
        result[name] = { count: rows.length, sha256: hash(rows.map(r => r.row + "\n").join("")) };
    }
    return result;
}
async function fixture(client) {
    const author = randomUUID(), category = randomUUID(), ids = new Map();
    await client.query("INSERT INTO users(id,name,email,password_hash,role) VALUES($1,'Fixture D2B','fixture-d2b@example.test','unused','ADMIN')", [author]);
    await client.query("INSERT INTO categoria(id,nome,slug) VALUES($1,'Fixture D2B','fixture-d2b')", [category]);
    for (const slug of [...SLUGS_CANONICOS, "casarao-da-nossa-historia", "casarao-do-sitio-ponte-alta"]) {
        const id = randomUUID(); ids.set(slug, id);
        await client.query("INSERT INTO patrimonio(id,name,slug,descricao,descricao_resumida,categoria_id,created_by,status) VALUES($1,$2,$2,'Descrição de fixture preservada','Resumo',$3,$4,$5)", [id, slug, category, author, SLUGS_CANONICOS.includes(slug) ? "PUBLICADO" : "ARQUIVADO"]);
        await client.query("INSERT INTO patrimonio_detalhes(id,patrimonio_id,titulo,texto,ordem) VALUES($1,$2,'História','Texto preservado',0)", [randomUUID(), id]);
        await client.query("INSERT INTO local(patrimonio_id,endereco,numero,bairro) VALUES($1,'Rua de fixture','s/n','Bairro de fixture')", [id]);
        await client.query("INSERT INTO patrimonio_imagens(patrimonio_id,url,alt) VALUES($1,'/fixture.jpg','Imagem de fixture')", [id]);
        await client.query("INSERT INTO patrimonio_documentos(patrimonio_id,titulo,url,tipo) VALUES($1,'Referência','https://example.test','LINK')", [id]);
    }
    for (const l of EDITORIAL_CURADO.ligacoes) {
        await client.query("INSERT INTO patrimonio_ligacoes(patrimonio_origem_id,patrimonio_destino_id,texto,ordem) VALUES($1,$2,$3,$4)", [ids.get(l.origemSlug), ids.get(l.destinoSlug), l.texto, l.ordem]);
    }
    assert.equal(ids.size, 36); assert.equal(EDITORIAL_CURADO.ligacoes.length, 14);
}
try {
    await maintenance.connect();
    assert.equal((await maintenance.query("SELECT current_database() db")).rows[0].db, "postgres");
    const replay = await database("replay");
    run("replay", [cli, "migrate", "deploy"], { DATABASE_URL: replay });
    const upgrade = await database("upgrade");
    const six = path.join(cache, "six-migrations"); fs.mkdirSync(six);
    for (const name of expected.slice(0, 6)) fs.cpSync(path.join(migrations, name), path.join(six, name), { recursive: true });
    fs.copyFileSync(path.join(migrations, "migration_lock.toml"), path.join(six, "migration_lock.toml"));
    const config = path.join(cache, "six.config.mjs");
    fs.writeFileSync(config, `import { defineConfig } from ${JSON.stringify(configModule)}; export default defineConfig({schema:${JSON.stringify(path.join(root, "prisma/schema.prisma"))},datasource:{url:process.env.DATABASE_URL},migrations:{path:${JSON.stringify(six)}}});`);
    run("six", [cli, "migrate", "deploy", "--config", config], { DATABASE_URL: upgrade });
    const client = await connect(upgrade);
    try {
        assert.deepEqual((await client.query("SELECT migration_name FROM _prisma_migrations ORDER BY migration_name")).rows.map(r => r.migration_name), expected.slice(0, 6));
        await fixture(client);
        const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename")).rows.map(r => r.tablename);
        const before = await snapshot(client, tables);
        run("upgrade", [cli, "migrate", "deploy"], { DATABASE_URL: upgrade });
        const after = await snapshot(client, tables, true); assert.deepEqual(after, before);
        const count = async table => (await client.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n;
        assert.equal(await count("regioes_patrimonio"), 0);
        assert.equal(await count("patrimonio"), 36);
        assert.equal(await count("patrimonio_fatos"), 0);
        assert.equal(await count("patrimonio_ligacoes"), 14);
        assert.equal((await client.query("SELECT count(*)::int n FROM patrimonio WHERE regiao_id IS NOT NULL OR numero_exibicao IS NOT NULL OR ordem_exibicao IS NOT NULL")).rows[0].n, 0);
        assert.equal((await client.query("SELECT count(*)::int n FROM patrimonio WHERE status='ARQUIVADO'")).rows[0].n, 2);
        assert.equal((await client.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='patrimonio' AND column_name='descricao'")).rows[0].is_nullable, "NO");
        evidence.migrations.upgrade = { before, after, preserved: true, patrimonios: 36, canonicos: 34, legadosArquivados: 2, fatos: 0, ligacoes: 14, regioes: 0, novosCamposNulos: true };
    } finally { await client.end(); }
    const fresh = await connect(replay);
    try {
        assert.deepEqual((await fresh.query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name")).rows.map(r => r.migration_name), expected);
        evidence.migrations.replay = { names: expected, regionCount: (await fresh.query("SELECT count(*)::int n FROM regioes_patrimonio")).rows[0].n };
    } finally { await fresh.end(); }
    run("validate", [cli, "validate"], { DATABASE_URL: replay });
    run("status", [cli, "migrate", "status"], { DATABASE_URL: replay });
    run("diff", [cli, "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"], { DATABASE_URL: replay });
    const env = { DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/d2b_not_connected", TEST_DATABASE_URL: replay, TEST_DATABASE_EXCLUSIVE: "1" };
    evidence.tests.specific = run("specific-tests", ["--test", "--test-concurrency=1", "test/d2b.test.js", "test/d2b.integration.test.js", "test/syncPatrimonios.test.js", "test/r1.test.js"], env);
    evidence.tests.full = run("backend-suite", ["scripts/run-suite.js"], env);
} catch (error) {
    evidence.failure = error.message; throw error;
} finally {
    for (const name of created) {
        assert.match(name, /^portal_d2b_[a-z0-9_]+_test$/);
        await maintenance.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await maintenance.end(); evidence.removed = [...created];
    fs.writeFileSync(path.join(cache, "validation.json"), JSON.stringify(evidence, null, 2));
    fs.writeFileSync(path.resolve(root, "../.cache/d2b/latest.json"), JSON.stringify({ cache }, null, 2));
}
console.log(JSON.stringify(evidence, null, 2));
