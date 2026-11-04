// Opt-in F4: somente cluster novo, backup sintético e processos isolados.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile, stat, access, open } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import net from "node:net";
import pg from "pg";
import bcrypt from "bcrypt";

const raiz = fileURLToPath(new URL("../../", import.meta.url)), backend = fileURLToPath(new URL("../", import.meta.url));
const pasta = new URL("../../.cache/feedback_f4/", import.meta.url), privado = new URL("privado.json", pasta);
const acao = process.argv[2];
function docker(args, env = process.env) {
  const r = spawnSync("docker", args, { cwd: raiz, env, encoding: "utf8", windowsHide: true });
  assert.equal(r.status, 0, "Falha Docker; nenhuma repetição automática."); return r.stdout;
}
async function salvar(s, exclusivo = false) { await writeFile(privado, JSON.stringify(s, null, 2), { flag: exclusivo ? "wx" : "w" }); }
async function conferir(s) {
  const c = JSON.parse(docker(["inspect", s.container]))[0];
  assert.equal(c.Config.Labels["com.docker.compose.project"], s.env.TEST_COMPOSE_PROJECT);
  assert.ok(c.Mounts.some(m => m.Name === s.volume && m.Destination === "/var/lib/postgresql/data"));
  assert.deepEqual(c.HostConfig.PortBindings["5432/tcp"], [{ HostIp: "127.0.0.1", HostPort: "5549" }]);
  const u = new URL(s.env.TEST_DATABASE_URL);
  assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "5549"); assert.equal(u.pathname, "/portal_test"); assert.equal(u.search, "");
  const db = new pg.Client({ connectionString: u.href }); await db.connect();
  try {
    await db.query("BEGIN READ ONLY");
    const [r] = (await db.query("SELECT system_identifier::text cluster,current_database() banco FROM pg_control_system()")).rows;
    const identidade = JSON.parse(await readFile(new URL("identidade.json", pasta)));
    assert.equal(r.cluster, identidade.cluster); assert.equal(r.banco, "portal_test");
    return identidade;
  } finally { await db.query("ROLLBACK"); await db.end(); }
}
function executar(args, env) {
  const r = spawnSync(process.execPath, args, { cwd: backend, env, stdio: "inherit", windowsHide: true });
  assert.equal(r.status, 0, "Etapa falhou; nenhuma escrita será repetida automaticamente.");
}
async function main() {
  assert.equal(process.env.HOMOLOGACAO_FEEDBACK_F4, "1", "Exige autorização de processo HOMOLOGACAO_FEEDBACK_F4=1");
  await mkdir(pasta, { recursive: true });
  if (acao === "preparar") {
    await assert.rejects(access(privado), "Recusa reaproveitar identidade anterior");
    const porta = net.createServer(); await new Promise((resolve, reject) => { porta.once("error", reject); porta.listen(5549, "127.0.0.1", resolve); });
    await new Promise(resolve => porta.close(resolve));
    const projeto = "portal_feedback_f4_" + randomBytes(4).toString("hex"), volume = projeto + "_pg_feedback_test", container = projeto + "-db_test-1";
    assert.equal(docker(["ps", "-aq", "--filter", "name=^/" + container + "$"]).trim(), "");
    assert.equal(docker(["volume", "ls", "-q", "--filter", "name=^" + volume + "$"]).trim(), "");
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (/^(DATABASE|DIRECT_URL|TEST_|SECURITY_|METRICAS_|FEEDBACK_|MOCK_DATA|JWT_|AUTH_)/.test(key)) delete env[key];
    Object.assign(env, { NODE_ENV: "test", DOTENV_CONFIG_PATH: fileURLToPath(new URL("ausente.env", pasta)),
      TEST_COMPOSE_PROJECT: projeto, TEST_POSTGRES_PORT: "5549", TEST_DATABASE_EXCLUSIVE: "1", SECURITY_TEST_DATABASE_EXCLUSIVE: "1", FEEDBACK_TEST_EXCLUSIVE: "1",
      DATABASE_URL: "postgresql://sentinela:inacessivel@127.0.0.1:1/f4_sentinel_test", JWT_SECRET: randomBytes(48).toString("hex"),
      MOCK_DATA: "false", FEEDBACK_RECEBIMENTO_ATIVO: "false", FEEDBACK_CONSULTA_ATIVA: "false", METRICAS_COLETA_ATIVA: "false", METRICAS_CONSULTA_ATIVA: "false" });
    for (const k of ["POSTGRES", "API", "MIGRATION", "METRICAS", "FEEDBACK"]) env[`TEST_${k}_PASSWORD`] = randomBytes(24).toString("hex");
    for (const [key, papel, senha] of [["TEST_DATABASE_URL", "portal_test", "POSTGRES"], ["SECURITY_API_DATABASE_URL", "portal_api", "API"], ["SECURITY_MIGRATION_DATABASE_URL", "portal_migrator", "MIGRATION"], ["METRICAS_OPERACAO_URL", "portal_metricas_operador", "METRICAS"], ["FEEDBACK_OPERACAO_URL", "portal_feedback_operador", "FEEDBACK"]]) env[key] = `postgresql://${papel}:${env[`TEST_${senha}_PASSWORD`]}@127.0.0.1:5549/portal_test`;
    const s = { env, volume, container, criado: false }; await salvar(s, true);
    docker(["compose", "-f", "compose.feedback.test.yml", "-p", projeto, "up", "-d", "--wait"], env);
    s.criado = true; await salvar(s);
    // validar_feedback_f4 exige zero tabelas, confere papéis/cluster e cria backup antes de testar.
    executar(["scripts/validar_feedback_f4.js", "completo"], env);
    s.validado = true; s.cluster = (await conferir(s)).cluster; await salvar(s); return;
  }
  const s = JSON.parse(await readFile(privado));
  assert.equal(s.validado, true); const identidade = await conferir(s);
  const env = { ...s.env, FEEDBACK_TEST_CLUSTER: identidade.cluster, METRICAS_TEST_CLUSTER: identidade.cluster,
    METRICAS_TEST_PORT: "5549", FEEDBACK_OPERACAO_CLUSTER: identidade.cluster, FEEDBACK_OPERACAO_HOST: "127.0.0.1", FEEDBACK_OPERACAO_PORTA: "5549", FEEDBACK_OPERACAO_BANCO: "portal_test",
    FEEDBACK_BACKUP_PATH: fileURLToPath(new URL("antes_fixtures.dump", pasta)) };
  if (acao === "conferir") { console.log(JSON.stringify(identidade)); return; }
  if (acao === "suite" || acao === "integridade") { executar(["scripts/validar_feedback_f4.js", acao], env); return; }
  if (acao === "prisma") { for (const c of ["validate", "generate"]) executar(["node_modules/prisma/build/index.js", c], env); return; }
  if (acao === "fixtures") {
    assert.equal(s.fixtures, undefined, "Não repetir fixtures"); assert.ok((await stat(new URL("antes_fixtures.dump", pasta))).size > 0);
    s.fixtures = "INICIADA"; s.senha = randomBytes(24).toString("base64url") + "!Aa7"; await salvar(s);
    const db = new pg.Client({ connectionString: s.env.TEST_DATABASE_URL }); await db.connect();
    try {
      await db.query("BEGIN READ ONLY");
      const r = (await db.query("SELECT (SELECT count(*)::int FROM users) usuarios,(SELECT count(*)::int FROM feedback) feedback,(SELECT count(*)::int FROM feedback_recibo) recibos")).rows[0];
      assert.deepEqual(r, { usuarios: 0, feedback: 0, recibos: 0 }); await db.query("ROLLBACK");
      const hash = await bcrypt.hash(s.senha, 12); s.usuarios = {};
      await db.query("BEGIN");
      for (const role of ["ADMIN", "EDITOR"]) {
        const id = randomUUID(); s.usuarios[role] = id;
        await db.query('INSERT INTO users(id,name,email,password_hash,role,updated_at) VALUES($1,$2,$3,$4,$5,now())', [id, "Pessoa sintética F4 " + role, role.toLowerCase() + "@f4.example.test", hash, role]);
      }
      await db.query("COMMIT"); s.fixtures = "CONCLUIDA"; await salvar(s);
    } finally { await db.end(); }
    const f = await open(new URL("antes_browser.dump", pasta), "wx");
    try { const r = spawnSync("docker", ["exec", s.container, "pg_dump", "-U", "portal_test", "-d", "portal_test", "-Fc"], { stdio: ["ignore", f.fd, "pipe"], windowsHide: true }); assert.equal(r.status, 0); }
    finally { await f.close(); }
    console.log("Dois usuários exclusivamente sintéticos; backup anterior ao browser criado."); return;
  }
  if (acao === "descarte") { executar(["scripts/descartar_feedback.js", "conferir"], env); executar(["scripts/descartar_feedback.js", "executar"], { ...env, FEEDBACK_DESCARTE_AUTORIZADO: "1" }); return; }
  if (acao === "parar") { docker(["stop", s.container]); console.log("Somente container F4 parado; volume e backups preservados."); return; }
  throw new Error("Etapa desconhecida");
}
main().catch(e => { console.error("F4_FALHOU", e.code || e.message); process.exitCode = 1; });
