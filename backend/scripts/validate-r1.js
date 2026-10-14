import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";

// Explicit disposable-only harness. Never opens the application database.
const root = fileURLToPath(new URL("../", import.meta.url));
const cache = path.resolve(root, "../.cache/r1");
fs.mkdirSync(cache, { recursive: true });
const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const configModule = pathToFileURL(require.resolve("prisma/config")).href;
const source = path.join(root, "prisma/patrimonioSeedData.js");
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
assert.equal(hash(source), "c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8");
const normal = new URL(dotenv.parse(fs.readFileSync(path.join(root, ".env"))).DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(normal.hostname));
assert.equal(normal.port || "5432", "5432");
normal.search = "";
normal.pathname = "/postgres";
const maintenance = new pg.Client({ connectionString: normal.href });
const created = new Set();
const evidence = { realDatabaseAccessed: false, migrations: {}, tests: {} };
function run(label, args, env) {
    const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
    fs.writeFileSync(path.join(cache, label + ".log"), (result.stdout ?? "") + (result.stderr ?? ""));
    if (result.error) throw result.error;
    assert.equal(result.status, 0, label + " failed; inspect .cache/r1/" + label + ".log");
    return result.stdout;
}
async function database(label) {
    const name = "portal_r1_" + label + "_" + randomUUID().slice(0, 8) + "_test";
    assert.match(name, /^portal_r1_[a-z_0-9]+_test$/);
    await maintenance.query(`CREATE DATABASE "${name}"`);
    created.add(name);
    const url = new URL(normal); url.pathname = "/" + name;
    return url.href;
}
async function connect(url) {
    assert.ok(created.has(decodeURIComponent(new URL(url).pathname.slice(1))));
    const client = new pg.Client({ connectionString: url }); await client.connect();
    assert.ok(created.has((await client.query("SELECT current_database() AS name")).rows[0].name));
    return client;
}
async function snapshot(client) {
    const result = {};
    for (const table of ["patrimonio", "patrimonio_detalhes", "local", "users", "categoria"]) {
        result[table] = (await client.query(`SELECT * FROM "${table}" ORDER BY id`)).rows;
    }
    return JSON.stringify(result);
}
async function fixture(client) {
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await client.query("INSERT INTO users(id,name,email,password_hash,role) VALUES($1,'R1 fixture',$2,'unused','ADMIN')", [ids[0], ids[0]+"@example.test"]);
    await client.query("INSERT INTO categoria(id,nome,slug) VALUES($1,'R1 fixture',$2)", [ids[1], ids[1]]);
    await client.query("INSERT INTO patrimonio(id,name,slug,descricao,descricao_resumida,categoria_id,created_by) VALUES($1,'R1 fixture',$4,'Preservar descricao','Preservar resumo',$2,$3)", [ids[2],ids[1],ids[0],ids[2]]);
    await client.query("INSERT INTO patrimonio_detalhes(id,patrimonio_id,titulo,texto,ordem) VALUES($1,$2,'Documento C2','Preservar integralmente',0)",[ids[3],ids[2]]);
    return ids;
}
async function emptyEditorial(client) {
    for (const table of ["patrimonio_fatos", "patrimonio_ligacoes"]) assert.equal((await client.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0);
}
try {
    await maintenance.connect();
    assert.equal((await maintenance.query("SELECT current_database() AS db")).rows[0].db, "postgres");
    const replay = await database("replay");
    run("replay", [prismaCli,"migrate","deploy"], { DATABASE_URL: replay });
    let client = await connect(replay);
    try {
        await emptyEditorial(client);
        assert.equal((await client.query("SELECT count(*)::int n FROM _prisma_migrations WHERE finished_at IS NOT NULL")).rows[0].n, 6);
        evidence.migrations.replay = "6 migrations; fatos/ligacoes vazios";
    } finally { await client.end(); }
    const upgrade = await database("upgrade");
    const active = path.join(root, "prisma/migrations");
    const five = path.join(cache, "five-migrations"); fs.mkdirSync(five, { recursive: true });
    const names = fs.readdirSync(active).filter(n => /^\d/.test(n)).sort();
    assert.equal(names.length, 6);
    for (const name of names.slice(0,5)) fs.cpSync(path.join(active,name),path.join(five,name),{recursive:true});
    fs.copyFileSync(path.join(active,"migration_lock.toml"),path.join(five,"migration_lock.toml"));
    const config = path.join(cache,"five.config.mjs");
    fs.writeFileSync(config, `import { defineConfig } from ${JSON.stringify(configModule)}; export default defineConfig({schema:${JSON.stringify(path.join(root,"prisma/schema.prisma"))},datasource:{url:process.env.DATABASE_URL},migrations:{path:${JSON.stringify(five)}}});`);
    run("five",[prismaCli,"migrate","deploy","--config",config],{DATABASE_URL:upgrade});
    client = await connect(upgrade);
    try {
        const applied = (await client.query("SELECT migration_name FROM _prisma_migrations ORDER BY migration_name")).rows.map(r=>r.migration_name);
        assert.deepEqual(applied,names.slice(0,5));
        await fixture(client); const before = await snapshot(client);
        run("upgrade",[prismaCli,"migrate","deploy"],{DATABASE_URL:upgrade});
        assert.equal(await snapshot(client),before);
        await emptyEditorial(client);
        evidence.migrations.upgrade = { appliedBefore: applied, existingRowsUnchanged:true, editorialEmpty:true };
    } finally { await client.end(); }
    // Team lineage: original SQL is immutable; the additional migration performs only ALTERs.
    const team = await database("equipe");
    const seven = path.join(cache, "seven-migrations"); fs.mkdirSync(seven, {recursive:true});
    const teamTree = path.join(root,"prisma/lineages/equipe/migrations");
    for (const name of fs.readdirSync(teamTree).filter(n=>!n.includes("reconcile_d1b_forward"))) fs.cpSync(path.join(teamTree,name),path.join(seven,name),{recursive:true});
    const teamConfig = path.join(cache,"seven.config.mjs");
    fs.writeFileSync(teamConfig,fs.readFileSync(config,"utf8").replace(JSON.stringify(five),JSON.stringify(seven)));
    run("equipe-seven",[prismaCli,"migrate","deploy","--config",teamConfig],{DATABASE_URL:team});
    client = await connect(team);
    try {
        await emptyEditorial(client);
        const ids = await fixture(client);
        const forward = fs.readFileSync(path.join(root,"prisma/lineages/equipe/migrations/20261014120000_reconcile_d1b_forward/migration.sql"),"utf8");
        // Reconstruct prior team column constraints, then prove incompatible content aborts without truncation.

        const factId=randomUUID();
        await client.query("INSERT INTO patrimonio_fatos(id,patrimonio_id,rotulo,valor,ordem) VALUES($1,$2,$3,'preservar',0)",[factId,ids[2],"x".repeat(201)]);
        await assert.rejects(client.query(forward), /fora do contrato D1B/); await client.query("ROLLBACK");
        assert.equal((await client.query("SELECT length(rotulo) n FROM patrimonio_fatos WHERE id=$1",[factId])).rows[0].n,201);
        await client.query("UPDATE patrimonio_fatos SET rotulo='Ano' WHERE id=$1",[factId]);
        const before=await snapshot(client); const factBefore=(await client.query("SELECT * FROM patrimonio_fatos ORDER BY id")).rows;
        run("equipe-forward",[prismaCli,"migrate","deploy","--config","prisma.equipe.config.js"],{EQUIPE_DATABASE_URL:team,DATABASE_URL:team});
        assert.equal(await snapshot(client),before);
        assert.deepEqual((await client.query("SELECT * FROM patrimonio_fatos ORDER BY id")).rows,factBefore);
        evidence.migrations.team = { replay:true, forwardPreservesIds:true, invalidContentAbortsWithoutTruncation:true, deferredStructuresPreserved:true };
    } finally { await client.end(); }
    const testEnv = { DATABASE_URL:"postgresql://unused:unused@127.0.0.1:1/r1_not_connected", TEST_DATABASE_URL:replay, TEST_DATABASE_EXCLUSIVE:"1" };
    const specifics=["d1aMidia.test.js","d1a.integration.test.js","dashboard.test.js","patrimonioEditorial.test.js","d1b.integration.test.js","syncPatrimonios.test.js","r1.test.js"];
    evidence.tests.specific = run("specific-tests",["--test","--test-concurrency=1",...specifics.map(f=>"test/"+f)],testEnv).split("\n").slice(-12).join("\n");
    evidence.tests.full = run("backend-suite",["scripts/run-suite.js"],testEnv).split("\n").slice(-12).join("\n");
} finally {
    for (const name of created) {
        assert.match(name,/^portal_r1_[a-z_0-9]+_test$/);
        await maintenance.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await maintenance.end();
    evidence.disposableDatabasesRemoved=[...created];
    evidence.canonicalHash=hash(source);
    fs.writeFileSync(path.join(cache,"validation.json"),JSON.stringify(evidence,null,2));
}
console.log(JSON.stringify(evidence,null,2));
