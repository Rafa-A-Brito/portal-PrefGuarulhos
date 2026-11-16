import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";
import { integrationDatabaseAvailable } from "../scripts/assert-test-db.js";

const safeDatabase = integrationDatabaseAvailable();
test("PostgreSQL: migration de visitação preenche existentes, mantém dados e usa DATE", {
    skip: !safeDatabase && "Exige TEST_DATABASE_URL exclusivo *_test.",
}, async () => {
    const migration = "20261116120000_add_status_visitacao/migration.sql";
    const sql = await readFile(new URL(`../prisma/migrations/${migration}`, import.meta.url), "utf8");
    assert.equal(sql, await readFile(new URL(`../prisma/lineages/equipe/migrations/${migration}`, import.meta.url), "utf8"));
    const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    const schema = "visitacao_" + randomUUID().replaceAll("-", "");
    await client.connect();
    try {
        await client.query("BEGIN");
        // Um schema exclusivo dentro de uma transação permite executar o SQL
        // real da migration sobre registros anteriores; o ROLLBACK o remove.
        await client.query(`CREATE SCHEMA ${schema}`);
        await client.query(`SET LOCAL search_path TO ${schema}`);
        await client.query("CREATE TABLE patrimonio (id integer PRIMARY KEY, name text, situacao text, status text)");
        await client.query("INSERT INTO patrimonio VALUES (1, 'Existente', 'EM_RESTAURACAO', 'PUBLICADO')");
        await client.query(sql);
        assert.deepEqual((await client.query("SELECT * FROM patrimonio WHERE id=1")).rows[0], {
            id: 1, name: "Existente", situacao: "EM_RESTAURACAO", status: "PUBLICADO",
            status_visitacao: "NAO_INFORMADO", motivo_restricao: null, previsao_reabertura: null,
        });
        await client.query("INSERT INTO patrimonio (id, name) VALUES (2, 'Novo')");
        assert.equal((await client.query("SELECT status_visitacao FROM patrimonio WHERE id=2")).rows[0].status_visitacao, "NAO_INFORMADO");
        const column = (await client.query("SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name='patrimonio' AND column_name='previsao_reabertura'", [schema])).rows[0];
        assert.equal(column.data_type, "date");
        await client.query("UPDATE patrimonio SET previsao_reabertura='2028-02-29'::date WHERE id=1");
        assert.equal((await client.query("SELECT previsao_reabertura::text AS dia FROM patrimonio WHERE id=1")).rows[0].dia, "2028-02-29");
    } finally {
        try { await client.query("ROLLBACK"); } finally { await client.end(); }
    }
});
