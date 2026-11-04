import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import http from "node:http";
import pg from "pg";
import { criarServicoFeedback } from "../src/services/feedbackService.js";
import { configurarFeedback } from "../src/config/feedback.js";
import { chaveDigest, conteudoDigest, diaCivil, proximoDia, DIA } from "../src/utils/feedback.js";
import { conferirDestinoFeedback, descartarFeedback } from "../scripts/descartar_feedback.js";
import { hashPassword } from "../src/utils/password.js";

const ativo = process.env.FEEDBACK_TEST_EXCLUSIVE === "1";
test("F2 PostgreSQL 17 exclusivo: persistência, concorrência, privilégios e retenção", { skip: ativo ? false : "Exige descartável F2 identificado; não homologado em memória." }, async t => {
    const e = process.env;
    assert.equal(e.TEST_DATABASE_EXCLUSIVE, "1"); assert.ok(e.FEEDBACK_TEST_CLUSTER);
    const principal = new URL(e.TEST_DATABASE_URL);
    assert.equal(principal.hostname, "127.0.0.1"); assert.equal(principal.pathname, "/portal_test"); assert.equal(principal.port, e.TEST_POSTGRES_PORT); assert.equal(principal.search, "");
    for (const key of ["SECURITY_API_DATABASE_URL", "FEEDBACK_OPERACAO_URL", "METRICAS_OPERACAO_URL"]) {
        const u = new URL(e[key]); assert.equal(u.host + u.pathname, principal.host + principal.pathname); assert.equal(u.search, "");
    }
    const admin = new pg.Client({ connectionString: principal.href }), operador = new pg.Client({ connectionString: e.FEEDBACK_OPERACAO_URL }),
        metricas = new pg.Client({ connectionString: e.METRICAS_OPERACAO_URL });
    const pool = new pg.Pool({ connectionString: e.SECURITY_API_DATABASE_URL, max: 12, connectionTimeoutMillis: 5000 });
    const pool2 = new pg.Pool({ connectionString: e.SECURITY_API_DATABASE_URL, max: 12, connectionTimeoutMillis: 5000 });
    await Promise.all([admin.connect(), operador.connect(), metricas.connect()]);
    await admin.query("BEGIN READ ONLY");
    const identity = (await admin.query("SELECT current_database() banco, system_identifier::text cluster, current_setting('server_version_num')::int versao FROM pg_control_system()")).rows[0];
    assert.equal(identity.cluster, e.FEEDBACK_TEST_CLUSTER); assert.equal(identity.banco, "portal_test"); assert.ok(identity.versao >= 170000 && identity.versao < 180000);
    assert.equal((await admin.query("SELECT count(*)::int n FROM feedback")).rows[0].n, 0, "Somente fixtures próprias sobre tabelas vazias.");
    await admin.query("ROLLBACK");
    await conferirDestinoFeedback(operador);
    const ids = [], processos = [];
    t.after(async () => {
        for (const p of processos) if (p.exitCode === null) p.kill();
        await admin.query("ROLLBACK; SELECT pg_advisory_unlock_all()");
        await admin.query("DROP TRIGGER IF EXISTS feedback_falha_teste ON feedback_recibo");
        await admin.query("DROP FUNCTION IF EXISTS feedback_falha_teste()");
        // Somente tabelas novas inicialmente vazias, neste cluster exclusivo conferido.
        await admin.query("DELETE FROM feedback_recibo; DELETE FROM feedback");
        if (ids.length) await admin.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
        await Promise.all([pool.end(), pool2.end(), admin.end(), operador.end(), metricas.end()]);
    });
    const segredo = randomBytes(32).toString("hex"), ambiente = {
        FEEDBACK_RECEBIMENTO_ATIVO: "true", FEEDBACK_CONSULTA_ATIVA: "true", FEEDBACK_ORIGEM: "http://localhost:5173", FEEDBACK_TRANSPORTE: "http-local",
        FEEDBACK_CHAVES_JSON: JSON.stringify([{ id: "v1", segredo }]), FEEDBACK_CHAVE_ATUAL: "v1", FEEDBACK_AVISOS_ACEITOS: "feedback-v1",
    };
    const cfg = { ...configurarFeedback(ambiente) }, service = criarServicoFeedback({ pool, configuracao: cfg }), service2 = criarServicoFeedback({ pool: pool2, configuracao: cfg });
    const body = { tipo: "SUGESTAO", mensagem: "Fixture F2: contribuição sintética 🏛️", avisoVersao: "feedback-v1" };
    const chave = () => randomBytes(32).toString("base64url");
    const contar = async () => (await admin.query("SELECT (SELECT count(*)::int FROM feedback) feedback, (SELECT count(*)::int FROM feedback_recibo) recibos")).rows[0];
    const limpar = async () => admin.query("DELETE FROM feedback_recibo; DELETE FROM feedback");
    await t.test("20 envios simultâneos por dois pools: um commit, 19 replays, um Feedback e um recibo", async () => {
        const key = chave();
        const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? service : service2).receber(body, key)));
        assert.equal(rs.filter(r => r.status === 201).length, 1); assert.equal(rs.filter(r => r.status === 200).length, 19);
        assert.equal(new Set(rs.map(r => r.data.recebidoEm)).size, 1); assert.deepEqual(await contar(), { feedback: 1, recibos: 1 });
        await assert.rejects(service.receber({ ...body, mensagem: "Outra" }, key), { code: "CHAVE_REUTILIZADA" });
        cfg.recebimento = false; cfg.avisos = [];
        assert.equal((await service.receber(body, key)).status, 200);
        await assert.rejects(service.receber(body, chave()), { code: "FEEDBACK_DESATIVADO" });
        cfg.recebimento = true; cfg.avisos = ["feedback-v1"];
        await assert.rejects(service.receber({ ...body, avisoVersao: "antigo" }, chave()), { code: "AVISO_DESATUALIZADO" });
        await limpar();
    });
    await t.test("unicidade continua autoridade sem lock cooperativo; rollback antes da leitura do vencedor", async () => {
        const key = chave(), digest = chaveDigest(key); let inserido = false;
        const concorrente = { async connect() {
            const client = await pool.connect(); return { release: () => client.release(), async query(sql, args) {
                const r = await client.query(sql, args);
                if (sql.includes("FROM feedback_recibo WHERE chave_digest") && !inserido) {
                    await admin.query("BEGIN");
                    const id = (await admin.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,expira_em) VALUES($1,$2,$3,now()+interval '180 days') RETURNING id", [body.tipo, body.mensagem, body.avisoVersao])).rows[0].id;
                    await admin.query("INSERT INTO feedback_recibo(chave_digest,conteudo_digest,versao_chave,feedback_id,expira_em) VALUES($1,$2,$3,$4,now()+interval '24 hours')", [digest, conteudoDigest(body, cfg.atual, cfg), cfg.atual, id]);
                    await admin.query("COMMIT"); inserido = true;
                } return r;
            } };
        } };
        assert.equal((await criarServicoFeedback({ pool: concorrente, configuracao: cfg }).receber(body, key)).status, 200);
        assert.deepEqual(await contar(), { feedback: 1, recibos: 1 }); await limpar();
    });
    await t.test("rotação usa versão persistida; segredo ausente não aceita duplicata", async () => {
        const key = chave(); await service.receber(body, key);
        cfg.chaves = [...cfg.chaves, { id: "v2", segredo: randomBytes(32).toString("hex") }]; cfg.atual = "v2";
        assert.equal((await service.receber(body, key)).status, 200);
        await service.receber(body, chave());
        assert.deepEqual((await admin.query("SELECT versao_chave v FROM feedback_recibo ORDER BY v")).rows.map(r => r.v), ["v1", "v2"]);
        const chaves = cfg.chaves; cfg.chaves = chaves.filter(c => c.id !== "v1");
        await assert.rejects(service.receber(body, key), { code: "FEEDBACK_INDISPONIVEL" });
        assert.deepEqual(await contar(), { feedback: 2, recibos: 2 }); cfg.chaves = chaves; await limpar();
    });
    await t.test("recibo expirado conflita; após descarte a garantia terminou", async () => {
        const key = chave(); await service.receber(body, key);
        await admin.query("UPDATE feedback_recibo SET recebido_em=now()-interval '2 days',expira_em=now()-interval '1 day' WHERE chave_digest=$1", [chaveDigest(key)]);
        await assert.rejects(service.receber(body, key), { code: "ENVIO_EXPIRADO" });
        const preview = await descartarFeedback(operador); assert.equal(preview.recibos, "1"); assert.equal(preview.executar, false);
        assert.equal((await descartarFeedback(operador, { executar: true, lote: 1 })).recibos, "1");
        assert.equal((await service.receber(body, key)).status, 201); assert.deepEqual(await contar(), { feedback: 2, recibos: 1 }); await limpar();
    });
    await t.test("espera de concorrência revalida prazo; lock excedido retorna 503 sem nova gravação", async () => {
        const key = chave(); await service.receber(body, key); const digest = chaveDigest(key);
        await admin.query("UPDATE feedback_recibo SET recebido_em=now()-interval '1 day',expira_em=clock_timestamp()+interval '250 milliseconds' WHERE chave_digest=$1", [digest]);
        await admin.query("SELECT pg_advisory_lock(21402,hashtext($1))", [digest]);
        const pending = assert.rejects(service.receber(body, key), { code: "ENVIO_EXPIRADO" });
        await new Promise(r => setTimeout(r, 400)); await admin.query("SELECT pg_advisory_unlock(21402,hashtext($1))", [digest]); await pending;
        const nova = chave(), d = chaveDigest(nova); await admin.query("SELECT pg_advisory_lock(21402,hashtext($1))", [d]);
        await assert.rejects(service2.receber(body, nova), { code: "FEEDBACK_INDISPONIVEL" });
        await admin.query("SELECT pg_advisory_unlock(21402,hashtext($1))", [d]); assert.deepEqual(await contar(), { feedback: 1, recibos: 1 }); await limpar();
    });
    await t.test("falha intencional no INSERT do recibo faz rollback do Feedback sem órfãos", async () => {
        await admin.query("CREATE FUNCTION feedback_falha_teste() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha sintetica' USING ERRCODE='23514'; END $$");
        await admin.query("CREATE TRIGGER feedback_falha_teste BEFORE INSERT ON feedback_recibo FOR EACH ROW EXECUTE FUNCTION feedback_falha_teste()");
        await assert.rejects(service.receber(body, chave()), { statusCode: 500 }); assert.deepEqual(await contar(), { feedback: 0, recibos: 0 });
        await admin.query("DROP TRIGGER feedback_falha_teste ON feedback_recibo; DROP FUNCTION feedback_falha_teste()");
    });
    await t.test("API sem UPDATE/DELETE; limpeza sem mensagem/usuários/métricas; operador V2 sem Feedback", async () => {
        for (const sql of ["UPDATE feedback SET mensagem='proibido'", "DELETE FROM feedback", "UPDATE feedback_recibo SET versao_chave='x'", "DELETE FROM feedback_recibo"]) {
            await assert.rejects(pool.query(sql), { code: "42501" });
        }
        for (const sql of ["SELECT mensagem FROM feedback", "SELECT conteudo_digest FROM feedback_recibo", "SELECT * FROM users", "SELECT * FROM visualizacoes_totais_dia", "UPDATE feedback SET mensagem='x'", "SET ROLE portal_migrator"]) {
            await assert.rejects(operador.query(sql), { code: "42501" });
        }
        for (const sql of ["SELECT * FROM feedback", "SELECT * FROM feedback_recibo"]) await assert.rejects(metricas.query(sql), { code: "42501" });
        await assert.rejects(pool.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,expira_em) VALUES('ELOGIO',' ','feedback-v1',now()+interval '180 days')"), { code: "23514" });
        await assert.rejects(pool.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,expira_em) VALUES('ELOGIO','ok','',now()+interval '180 days')"), { code: "23514" });
        await assert.rejects(pool.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,expira_em) VALUES('ELOGIO','ok','feedback-v1',now()-interval '1 day')"), { code: "23514" });
    });
    await t.test("retenção atrasada exclui leitura; limpeza mantém recibo válido via FK SET NULL", async () => {
        const key = chave(); await service.receber(body, key);
        const id = (await admin.query("SELECT id FROM feedback")).rows[0].id;
        await admin.query("UPDATE feedback SET created_at=now()-interval '181 days',expira_em=now()-interval '1 day' WHERE id=$1", [id]);
        await assert.rejects(service.detalhar(id), { statusCode: 404 });
        const dia = diaCivil(new Date()), q = { inicio: diaCivil(new Date(Date.now() - 182 * DIA)), fim: dia, pagina: 1, limite: 20 };
        assert.equal((await service.listar(q)).paginacao.total, 0);
        assert.equal((await service.resumir({ ...q, granularidade: "dia" })).total, "0");
        const r = await descartarFeedback(operador, { executar: true }); assert.equal(r.feedback, "1"); assert.equal(r.recibos, "0");
        assert.equal((await admin.query("SELECT feedback_id FROM feedback_recibo")).rows[0].feedback_id, null);
        assert.equal((await service.receber(body, key)).status, 200); await limpar();
    });
    await t.test("snapshot Repeatable Read READ ONLY, agregados exatos, paginação e fuso", async () => {
        const hoje = diaCivil(new Date());
        // Datas civis usam o PostgreSQL IANA; nenhum offset fixo na consulta.
        for (const [tipo, day, time] of [["ELOGIO", "2018-11-04", "03:00:00"], ["PROBLEMA", "2018-11-05", "01:59:59"], ["SUGESTAO", "2018-11-05", "02:00:00"]]) {
            await admin.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,created_at,expira_em) VALUES($1,'sintético','feedback-v1',$2,now()+interval '1 day')", [tipo, day + "T" + time + "Z"]);
        }
        const q = { inicio: "2018-11-04", fim: "2018-11-04", pagina: 1, limite: 1 };
        const lista = await service.listar(q); assert.equal(lista.paginacao.total, 2); assert.equal(lista.itens.length, 1); assert.equal(lista.itens[0].mensagem, undefined);
        const resumo = await service.resumir({ ...q, granularidade: "dia" }); assert.equal(resumo.total, "2"); assert.equal(resumo.serie[0].quantidade, "2");
        assert.equal((await service.resumir({ ...q, tipo: "ELOGIO", granularidade: "mes" })).total, "1");
        assert.equal((await service.listar({ ...q, pagina: 99 })).itens.length, 0);
        let inserido = false;
        const interceptado = { async connect() {
            const client = await pool.connect(); return { release: () => client.release(), async query(sql, args) {
                const r = await client.query(sql, args);
                if (sql.startsWith("SELECT count(*)::text") && !inserido) {
                    const mode = (await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only; assert.equal(mode, "on");
                    assert.equal((await client.query("SHOW transaction_isolation")).rows[0].transaction_isolation, "repeatable read");
                    await admin.query("INSERT INTO feedback(tipo,mensagem,aviso_versao,created_at,expira_em) VALUES('ELOGIO','concorrente','feedback-v1','2018-11-04T12:00:00Z',now()+interval '1 day')"); inserido = true;
                } return r;
            } };
        } };
        const coerente = await criarServicoFeedback({ pool: interceptado, configuracao: cfg }).listar({ ...q, limite: 100 });
        assert.equal(coerente.paginacao.total, 2); assert.equal(coerente.itens.length, 2);
        assert.equal((await service.listar(q)).paginacao.total, 3);
        const vazio = await service.resumir({ inicio: hoje, fim: hoje, granularidade: "dia" }); assert.equal(vazio.total, "0"); assert.equal(vazio.serie[0].parcial, true);
        await assert.rejects(service.listar({ ...q, fim: proximoDia(hoje) }), { statusCode: 400 });
        await limpar();
    });
    await t.test("flags falsas não abrem conexão nem exigem novas tabelas", async () => {
        const off = criarServicoFeedback({ pool: { connect() { throw Error("não conectar"); } }, configuracao: configurarFeedback({}) });
        assert.deepEqual(await off.listar({}), { disponivel: false, motivo: "DESATIVADA" });
        assert.deepEqual(await off.resumir({}), { disponivel: false, motivo: "DESATIVADA" });
        assert.deepEqual(await off.detalhar(randomUUID()), { disponivel: false, motivo: "DESATIVADA" });
        await assert.rejects(off.receber(body, chave()), { code: "FEEDBACK_DESATIVADO" });
    });
    await t.test("conexão indisponível retorna 503, nunca coleção vazia ou sucesso", async () => {
        const broken = new pg.Pool({ connectionString: "postgresql://unused:unused@127.0.0.1:1/portal_test", connectionTimeoutMillis: 500 });
        try {
            const s = criarServicoFeedback({ pool: broken, configuracao: cfg });
            await assert.rejects(s.receber(body, chave()), { code: "FEEDBACK_INDISPONIVEL" });
            await assert.rejects(s.listar({ inicio: diaCivil(new Date()), fim: diaCivil(new Date()), pagina: 1, limite: 20 }), { code: "FEEDBACK_INDISPONIVEL" });
        } finally { await broken.end(); }
    });
    async function iniciar(recebimento = "true") {
        const child = fork(new URL("fixtures/feedback_api.mjs", import.meta.url), [], {
            env: { ...e, ...ambiente, DATABASE_URL: e.SECURITY_API_DATABASE_URL, FEEDBACK_RECEBIMENTO_ATIVO: recebimento, MOCK_DATA: "false", NODE_ENV: "test" },
            stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true,
        }); processos.push(child);
        const porta = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Error("API não iniciou")), 10000);
            child.once("message", m => { clearTimeout(timer); resolve(m.porta); }); child.once("exit", code => { clearTimeout(timer); reject(Error("API encerrou " + code)); });
        }); return { child, porta };
    }
    const parar = async child => { const done = new Promise(r => child.once("exit", r)); child.send("parar"); await done; };
    function httpCall(porta, path, { method = "GET", payload, token, key, perder = false } = {}) {
        return new Promise((resolve, reject) => {
            const r = http.request({ hostname: "127.0.0.1", port: porta, path, method, headers: {
                Host: "localhost:5173", Origin: "http://localhost:5173", "X-Portal-Feedback": "1", "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }), ...(key && { "Idempotency-Key": key }),
            } }, res => {
                if (perder) { res.destroy(); resolve({ status: res.statusCode }); return; }
                let text = ""; res.on("data", b => { text += b; }); res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
            }); r.on("error", reject); r.end(payload ? JSON.stringify(payload) : undefined);
        });
    }
    await t.test("duas APIs em processos distintos confirmam uma única gravação concorrente", async () => {
        const a = await iniciar(), b = await iniciar(), key = chave();
        const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => httpCall(i % 2 ? a.porta : b.porta,
            "/api/feedback", { method: "POST", payload: body, key })));
        assert.equal(rs.filter(r => r.status === 201).length, 1); assert.equal(rs.filter(r => r.status === 200).length, 7);
        assert.equal(new Set(rs.map(r => r.body.data.recebidoEm)).size, 1);
        assert.deepEqual(await contar(), { feedback: 1, recibos: 1 });
        await parar(a.child); await parar(b.child); await limpar();
    });
    await t.test("HTTP real: resposta perdida após commit e replay após reiniciar API com ingestão suspensa", async () => {
        const key = chave(), first = await iniciar();
        assert.equal((await httpCall(first.porta, "/api/feedback", { method: "POST", payload: body, key, perder: true })).status, 201);
        await parar(first.child); const segundo = await iniciar("false");
        const replay = await httpCall(segundo.porta, "/api/feedback", { method: "POST", payload: body, key });
        assert.equal(replay.status, 200); assert.equal(replay.body.data.demonstracao, undefined); assert.deepEqual(await contar(), { feedback: 1, recibos: 1 });
        assert.equal((await httpCall(segundo.porta, "/api/feedback", { method: "POST", payload: body, key: chave() })).status, 503);
        await parar(segundo.child); await limpar();
    });
    await t.test("HTTP PostgreSQL: ADMIN/EDITOR, sessão revogada, lista e resumo com autenticação existente", async () => {
        const senha = "Fixture-F2!apenas-teste", passwordHash = await hashPassword(senha);
        for (const role of ["ADMIN", "EDITOR"]) {
            const id = randomUUID(); ids.push(id);
            await admin.query("INSERT INTO users(id,name,email,password_hash,role,updated_at) VALUES($1,'Fixture F2',$2,$3,$4,now())", [id, `${id}@feedback.invalid`, passwordHash, role]);
        }
        await service.receber(body, chave()); const api = await iniciar();
        const tokens = [];
        for (const id of ids) {
            const r = await httpCall(api.porta, "/api/auth/login", { method: "POST", payload: { email: `${id}@feedback.invalid`, password: senha } });
            assert.equal(r.status, 200); tokens.push(r.body.data.token);
        }
        const hoje = diaCivil(new Date()), id = (await admin.query("SELECT id FROM feedback")).rows[0].id;
        for (const path of [`/api/admin/feedback?inicio=${hoje}&fim=${hoje}`, `/api/admin/feedback/resumo?inicio=${hoje}&fim=${hoje}`, `/api/admin/feedback/${id}`]) {
            for (const [token, status] of [[null, 401], [tokens[1], 403], [tokens[0], 200]]) assert.equal((await httpCall(api.porta, path, { token })).status, status);
        }
        await admin.query("UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1", [ids[0]]);
        assert.equal((await httpCall(api.porta, `/api/admin/feedback/${id}`, { token: tokens[0] })).status, 401);
        await parar(api.child); await limpar();
    });
});
