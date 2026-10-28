import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import pg from "pg";
assert.equal(process.env.HOMOLOGACAO_METRICAS_EXCLUSIVA, "1");
const s = JSON.parse(await readFile("/evidencias/privado.json", "utf8"));
const destino = new URL(process.env.TEST_DATABASE_URL);
assert.equal(destino.hostname, "db_test"); assert.equal(destino.pathname, "/portal_test"); assert.equal(destino.port, "5432");
const db = new pg.Client({ connectionString: destino.href }); await db.connect();
try {
    await db.query("BEGIN READ ONLY");
    const { rows: [id] } = await db.query("SELECT current_database() banco,current_user papel,system_identifier::text cluster FROM pg_control_system()");
    assert.equal(id.banco, "portal_test"); assert.equal(id.papel, "portal_test"); assert.equal(id.cluster, s.cluster);
    await db.query("ROLLBACK");
    const env = { ...process.env, METRICAS_OPERACAO_URL: s.env.METRICAS_OPERACAO_URL.replace("127.0.0.1:5438", "db_test:5432"),
        METRICAS_OPERACAO_HOST: "db_test", METRICAS_OPERACAO_PORTA: "5432", METRICAS_OPERACAO_BANCO: "portal_test", METRICAS_OPERACAO_CLUSTER: s.cluster,
        METRICAS_HEALTH_URL: "https://portal.test/api/health", NODE_EXTRA_CA_CERTS: "/evidencias/ca.pem" };
    const resultados = [];
    for (const script of ["observar_metricas.js", "observar_metricas.js", "reter_metricas.js", "reter_metricas.js"]) {
        const r = spawnSync(process.execPath, ["scripts/" + script], { env, encoding: "utf8" });
        assert.equal(r.status, 0, script + ": " + r.stderr);
        const resultado = JSON.parse(r.stdout.trim()); resultados.push({ script, resultado });
    }
    assert.equal(resultados[0].resultado.estado, "DISPONIVEL");
    assert.equal(resultados[2].resultado.estado, "CONCLUIDA"); assert.equal(resultados[3].resultado.recibos, 0);
    // EXPLAIN usa apenas massa sintética não confirmada. O rollback preserva os eventos do navegador.
    await db.query("BEGIN"); await db.query("SET LOCAL statement_timeout='15000ms'");
    await db.query("CREATE TEMP TABLE bens_carga(id uuid PRIMARY KEY)");
    await db.query(`WITH novos AS (INSERT INTO patrimonio(id,name,slug,descricao,descricao_resumida,categoria_id,created_by,status,regiao_id)
        SELECT gen_random_uuid(),'Carga '||n,'carga-e2e-'||n,'Teste','Teste',$1,$2,'PUBLICADO',$3 FROM generate_series(1,1000) n RETURNING id)
        INSERT INTO bens_carga SELECT id FROM novos`, [s.fixture.categorias[0], s.fixture.admin, s.fixture.regioes[0]]);
    await db.query(`INSERT INTO visualizacoes_totais_dia(dia,patrimonio_id,quantidade)
        SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date-n,id,1 FROM bens_carga CROSS JOIN generate_series(0,365) n`);
    await db.query("ANALYZE visualizacoes_totais_dia; ANALYZE patrimonio");
    const filtro = "v.dia >= (now() AT TIME ZONE 'America/Sao_Paulo')::date-89 AND v.dia <= (now() AT TIME ZONE 'America/Sao_Paulo')::date";
    const consultas = {
        total: `SELECT COALESCE(sum(v.quantidade),0)::text quantidade,count(DISTINCT p.id)::int bens FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id WHERE ${filtro}`,
        ranking: `SELECT p.id,p.name,p.status,sum(v.quantidade)::text quantidade FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id WHERE ${filtro} GROUP BY p.id ORDER BY sum(v.quantidade) DESC,p.id LIMIT 10`,
        regioes: `SELECT p.regiao_id,r.nome,r.slug,r.ativo,sum(v.quantidade)::text quantidade FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id LEFT JOIN regioes_patrimonio r ON r.id=p.regiao_id WHERE ${filtro} GROUP BY p.regiao_id,r.nome,r.slug,r.ativo`,
        serie: `SELECT v.dia::text data,sum(v.quantidade)::text quantidade FROM visualizacoes_totais_dia v JOIN patrimonio p ON p.id=v.patrimonio_id WHERE ${filtro} GROUP BY v.dia ORDER BY v.dia`,
    };
    const desempenho = {};
    for (const [nome, query] of Object.entries(consultas)) {
        const { rows } = await db.query("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) " + query);
        const amostras = [];
        for (let i = 0; i < 10; i++) { const inicio = performance.now(); await db.query(query); amostras.push(performance.now() - inicio); }
        amostras.sort((a, b) => a - b); desempenho[nome] = { plano: rows[0]["QUERY PLAN"], amostras: 10, p95Ms: amostras[9] };
    }
    await db.query("ROLLBACK");
    await db.query("BEGIN READ ONLY");
    const { rows: [persistencia] } = await db.query("SELECT (SELECT count(*)::int FROM patrimonio) bens,(SELECT count(*)::int FROM visualizacoes_unicas_dia) recibos,(SELECT sum(quantidade)::text FROM visualizacoes_totais_dia) total");
    assert.equal(persistencia.bens, 6); assert.equal(persistencia.total, "3");
    await db.query("ROLLBACK");
    await writeFile("/evidencias/operacao_desempenho.json", JSON.stringify({ id, resultados, massa: { bens: 1000, agregados: 366000, diasConsultados: 90, destino: "ROLLBACK" }, desempenho, persistencia }, null, 2));
    console.log(JSON.stringify({ resultados, persistencia, tempos: Object.fromEntries(Object.entries(desempenho).map(([k, v]) => [k, v.p95Ms])) }, null, 2));
} finally { await db.query("ROLLBACK"); await db.end(); }
