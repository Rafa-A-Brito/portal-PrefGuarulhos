import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

test("raio: migration aditiva preserva existentes e aceita fracionarios", {
    skip: !integrationDatabaseAvailable() && "Exige banco exclusivo de teste.",
}, async () => {
    const migration = "20261118120000_add_raio_protecao_entorno/migration.sql";
    const sql = await readFile(new URL(`../prisma/migrations/${migration}`, import.meta.url), "utf8");
    assert.equal(sql, await readFile(new URL(`../prisma/lineages/equipe/migrations/${migration}`, import.meta.url), "utf8"));
    const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    const schema = "raio_" + randomUUID().replaceAll("-", "");
    await client.connect();
    try {
        await client.query("BEGIN");
        await client.query(`CREATE SCHEMA ${schema}`);
        await client.query(`SET LOCAL search_path TO ${schema}`);
        await client.query("CREATE TABLE patrimonio (id integer PRIMARY KEY, name text)");
        await client.query("INSERT INTO patrimonio VALUES (1, 'Existente')");
        await client.query(sql);
        assert.deepEqual((await client.query("SELECT * FROM patrimonio")).rows[0], { id: 1, name: "Existente", raio_protecao_entorno_metros: null });
        await client.query("INSERT INTO patrimonio (id, name) VALUES (2, 'Novo')");
        assert.equal((await client.query("SELECT raio_protecao_entorno_metros AS raio FROM patrimonio WHERE id=2")).rows[0].raio, null);
        await client.query("UPDATE patrimonio SET raio_protecao_entorno_metros=125.375 WHERE id=1");
        assert.equal((await client.query("SELECT raio_protecao_entorno_metros AS raio FROM patrimonio WHERE id=1")).rows[0].raio, "125.375");
    } finally {
        await client.query("ROLLBACK");
        await client.end();
    }
});
