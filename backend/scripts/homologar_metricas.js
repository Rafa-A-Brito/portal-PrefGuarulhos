// Homologação opt-in, exclusivamente descartável. Etapas não se repetem automaticamente.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import bcrypt from "bcrypt";

const root = fileURLToPath(new URL("../../", import.meta.url));
const out = path.join(root, ".cache/v214c");
const arquivo = path.join(out, "privado.json");
const projeto = "portal_v214c_test", rede = projeto + "_e2e";
const etapa = process.argv[2];
const nodeImage = process.env.TEST_BACKEND_IMAGE ?? "integration_backend_frontend-backend:latest";
const nginxImage = process.env.TEST_NGINX_IMAGE ?? "integration_backend_frontend-frontend:latest";
const browserImage = "portal-v214c-navegador:test";
assert.equal(process.env.HOMOLOGACAO_METRICAS_EXCLUSIVA, "1");
function executar(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { cwd: root, windowsHide: true, encoding: "utf8", maxBuffer: 8e6, ...opts });
    if (r.status !== 0) throw new Error("Etapa falhou: " + cmd + " " + (r.stderr ?? r.error?.message ?? ""));
    return r.stdout;
}
const docker = args => executar("docker", args);
const salvar = s => writeFile(arquivo, JSON.stringify(s, null, 2));
async function buildFrontend() {
    const { build } = await import(pathToFileURL(path.join(root, "frontend/node_modules/vite/dist/node/index.js")));
    const { default: react } = await import(pathToFileURL(path.join(root, "frontend/node_modules/@vitejs/plugin-react/dist/index.js")));
    await build({ root: path.join(root, "frontend"), configFile: false, envDir: false, plugins: [react()], define: {
        "import.meta.env.VITE_METRICAS_ATIVAS": '"true"', "import.meta.env.VITE_API_BASE_URL": '"/api"', "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": '""',
    }, build: { outDir: path.join(out, "dist"), emptyOutDir: false } });
}
async function identificar(s) {
    const u = new URL(s.env.TEST_DATABASE_URL);
    assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "5438"); assert.equal(u.pathname, "/portal_test");
    const c = new pg.Client({ connectionString: u.href }); await c.connect();
    try {
        await c.query("BEGIN READ ONLY");
        const { rows: [id] } = await c.query("SELECT current_database() banco,current_user papel,system_identifier::text cluster,inet_server_port() porta FROM pg_control_system()");
        assert.equal(id.banco, "portal_test"); assert.equal(id.papel, "portal_test"); assert.equal(id.porta, 5432);
        if (s.cluster) assert.equal(id.cluster, s.cluster);
        await c.query("ROLLBACK"); console.log(JSON.stringify({ host: u.hostname, portaPublicada: u.port, ...id }));
        return { c, id };
    } catch (e) { await c.end(); throw e; }
}
async function preparar() {
    await mkdir(out, { recursive: true });
    await assert.rejects(access(arquivo));
    assert.ok(!docker(["volume", "ls", "--format", "{{.Name}}"]).split(/\r?\n/).includes(projeto + "_pg_test"));
    assert.ok(!docker(["ps", "-a", "--format", "{{.Names}}"]).includes(projeto));
    const env = { TEST_POSTGRES_PORT: "5438", TEST_DATABASE_EXCLUSIVE: "1", SECURITY_TEST_DATABASE_EXCLUSIVE: "1",
        DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/isolated_test", JWT_SECRET: randomBytes(32).toString("hex"),
        DOTENV_CONFIG_PATH: path.join(out, "nao_existe.env"), METRICAS_COLETA_ATIVA: "false", METRICAS_CONSULTA_ATIVA: "false", NODE_OPTIONS: "--use-system-ca" };
    for (const key of ["TEST_POSTGRES_PASSWORD", "TEST_API_PASSWORD", "TEST_MIGRATION_PASSWORD", "TEST_METRICAS_PASSWORD"]) env[key] = randomBytes(24).toString("hex");
    for (const [key, role, pw] of [["TEST_DATABASE_URL", "portal_test", "TEST_POSTGRES_PASSWORD"], ["SECURITY_API_DATABASE_URL", "portal_api", "TEST_API_PASSWORD"], ["SECURITY_MIGRATION_DATABASE_URL", "portal_migrator", "TEST_MIGRATION_PASSWORD"], ["METRICAS_OPERACAO_URL", "portal_metricas_operador", "TEST_METRICAS_PASSWORD"]]) env[key] = `postgresql://${role}:${env[pw]}@127.0.0.1:5438/portal_test`;
    const s = { env }; await salvar(s);
    executar("docker", ["compose", "-f", "compose.metricas.test.yml", "-p", projeto, "up", "-d", "--wait", "db_test"], { env: { ...process.env, ...env } });
    const info = JSON.parse(docker(["inspect", projeto + "-db_test-1"]))[0];
    assert.deepEqual(info.HostConfig.PortBindings["5432/tcp"], [{ HostIp: "127.0.0.1", HostPort: "5438" }]);
    assert.equal(info.Mounts.find(m => m.Destination === "/var/lib/postgresql/data").Name, projeto + "_pg_test");
    const { c, id } = await identificar(s);
    try {
        assert.equal((await c.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 0);
        assert.equal((await c.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()")).rows[0].n, 0);
        s.cluster = id.cluster; await salvar(s);
    } finally { await c.end(); }
}
async function main() {
    if (etapa === "preparar") return preparar();
    const s = JSON.parse(await readFile(arquivo, "utf8"));
    if (etapa === "validar") {
        const { c } = await identificar(s); await c.end();
        executar(process.execPath, ["scripts/validar_metricas_test.js"], { cwd: path.join(root, "backend"), env: { ...process.env, ...s.env, METRICAS_TEST_CLUSTER: s.cluster }, stdio: "inherit" });
        s.validado = true; return salvar(s);
    }
    assert.equal(s.validado, true);
    if (etapa === "rebuild") return buildFrontend();
    if (etapa === "fixtures") {
        assert.equal(s.fixture, undefined);
        const { c } = await identificar(s);
        try {
            assert.equal((await c.query("SELECT count(*)::int n FROM patrimonio")).rows[0].n, 0);
            const f = { senha: randomBytes(16).toString("hex"), admin: randomUUID(), editor: randomUUID(), categorias: Array.from({ length: 7 }, () => randomUUID()), regioes: Array.from({ length: 3 }, () => randomUUID()), bens: Array.from({ length: 6 }, () => randomUUID()) };
            await c.query("BEGIN");
            const hash = await bcrypt.hash(f.senha, 10);
            for (const role of ["ADMIN", "EDITOR"]) await c.query("INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)", [f[role.toLowerCase()], "Homologação " + role, role.toLowerCase() + "@example.test", hash, role]);
            const categorias = ["Arquitetônico", "Imaterial", "Ferroviário", "Industrial", "Educacional", "Ambiental", "Histórico"];
            for (let i = 0; i < 7; i++) await c.query("INSERT INTO categoria(id,nome,slug) VALUES($1,$2,$3)", [f.categorias[i], categorias[i], "categoria-teste-" + i]);
            for (let i = 0; i < 3; i++) await c.query("INSERT INTO regioes_patrimonio(id,nome,slug) VALUES($1,$2,$3)", [f.regioes[i], ["Centro", "São João / Bonsucesso", "Cantareira"][i], "regiao-teste-" + i]);
            for (let i = 0; i < 6; i++) {
                await c.query(`INSERT INTO patrimonio(id,name,slug,descricao,descricao_resumida,historia,importancia_cultural,categoria_id,created_by,status,regiao_id,situacao,published_at,numero_exibicao,ordem_exibicao)
                    VALUES($1,$2,$3,'Conteúdo sintético exclusivo da homologação.','Fixture de teste','História de teste','Teste isolado',$4,$5,$6,$7,'PRESERVADO',now(),$8,$8)`,
                [f.bens[i], "Patrimônio de teste " + (i + 1), i === 5 ? "casarao-da-nossa-historia" : "patrimonio-teste-" + (i + 1), f.categorias[i % 2], f.admin, i === 3 ? "ARQUIVADO" : i === 4 ? "RASCUNHO" : "PUBLICADO", i === 2 ? null : f.regioes[i % 3], i + 1]);
            }
            await c.query("COMMIT"); s.fixture = f; await salvar(s); console.log("Fixtures sintéticas criadas: seis bens, sete categorias, três regiões, ADMIN e EDITOR.");
        } catch (e) { await c.query("ROLLBACK"); throw e; } finally { await c.end(); }
        return;
    }
    const envInterno = { ...s.env, DATABASE_URL: s.env.SECURITY_API_DATABASE_URL.replace("127.0.0.1:5438", "db_test:5432"),
        NODE_ENV: "production", DOTENV_CONFIG_PATH: "/tmp/nao_existe.env", NODE_OPTIONS: "", PORT: "3333", UPLOAD_ROOT: "/tmp/uploads",
        CORS_ORIGIN: "https://portal.test", METRICAS_ORIGEM: "https://portal.test", METRICAS_COOKIE_MODO: "https",
        METRICAS_COLETA_ATIVA: "true", METRICAS_CONSULTA_ATIVA: "true", TRUST_PROXY_IPS: "172.30.90.2" };
    s.segredo ??= randomBytes(32).toString("hex"); await salvar(s);
    envInterno.METRICAS_CHAVES_JSON = JSON.stringify([{ id: "ensaio", desde: "2026-01-01", segredo: s.segredo }]);
    const montar = (source, target, ro = true) => ["--mount", `type=bind,source=${path.join(root, source)},target=${target}${ro ? ",readonly" : ""}`];
    const mounts = ["src", "scripts", "node_modules", "prisma", "test/fixtures", "package.json"].flatMap(p => montar("backend/" + p, "/app/" + p));
    if (etapa === "iniciar") {
        assert.ok(s.fixture); assert.equal(s.iniciado, undefined);
        await writeFile(path.join(out, "openssl.cnf"), "[req]\ndistinguished_name=dn\n[dn]\n");
        const openssl = process.platform === "win32" ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl";
        executar(openssl, ["req", "-config", path.join(out, "openssl.cnf"), "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2", "-subj", "/CN=Portal homologacao CA", "-addext", "basicConstraints=critical,CA:TRUE", "-keyout", path.join(out, "ca.key"), "-out", path.join(out, "ca.pem")]);
        executar(openssl, ["req", "-config", path.join(out, "openssl.cnf"), "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=portal.test", "-keyout", path.join(out, "server.key"), "-out", path.join(out, "server.csr")]);
        await writeFile(path.join(out, "server.ext"), "subjectAltName=DNS:portal.test\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n");
        executar(openssl, ["x509", "-req", "-in", path.join(out, "server.csr"), "-CA", path.join(out, "ca.pem"), "-CAkey", path.join(out, "ca.key"), "-CAcreateserial", "-days", "2", "-extfile", path.join(out, "server.ext"), "-out", path.join(out, "server.pem")]);
        await buildFrontend();
        const conf = (await readFile(path.join(root, "infra/nginx.conf"), "utf8")).replace("listen 80;", "listen 80;\n    listen 443 ssl;\n    ssl_certificate /certs/server.pem;\n    ssl_certificate_key /certs/server.key;");
        await writeFile(path.join(out, "nginx.conf"), conf);
        docker(["network", "create", "--subnet", "172.30.90.0/28", rede]);
        docker(["network", "connect", "--alias", "db_test", "--ip", "172.30.90.4", rede, projeto + "-db_test-1"]);
        const backendEnv = Object.fromEntries(Object.entries(envInterno).filter(([k]) => !/^(TEST_|SECURITY_|METRICAS_OPERACAO)/.test(k)));
        await writeFile(path.join(out, "backend.env"), Object.entries(backendEnv).map(([k, v]) => k + "=" + v).join("\n"));
        docker(["run", "-d", "--name", projeto + "_backend", "--network", rede, "--network-alias", "backend", "--ip", "172.30.90.3", "--read-only", "--tmpfs", "/tmp", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--env-file", path.join(out, "backend.env"), ...mounts, "-w", "/app", "-u", "node", nodeImage, "node", "src/server.js"]);
        docker(["run", "-d", "--name", projeto + "_nginx", "--network", rede, "--network-alias", "portal.test", "--ip", "172.30.90.2", "-p", "127.0.0.1:8448:443", ...montar(".cache/v214c/nginx.conf", "/etc/nginx/conf.d/default.conf"), ...montar(".cache/v214c/server.pem", "/certs/server.pem"), ...montar(".cache/v214c/server.key", "/certs/server.key"), ...montar(".cache/v214c/dist", "/usr/share/nginx/html"), nginxImage]);
        console.log(docker(["exec", projeto + "_nginx", "nginx", "-t"]));
        s.iniciado = true; return salvar(s);
    }
    if (["navegador", "navegador-retomar", "navegador-admin", "navegador-bloqueado", "operacao", "falhas", "banco-indisponivel"].includes(etapa)) {
        const { c } = await identificar(s); await c.end();
        await writeFile(path.join(out, "navegador.env"), Object.entries({ ...envInterno, TEST_DATABASE_URL: s.env.TEST_DATABASE_URL.replace("127.0.0.1:5438", "db_test:5432"), METRICAS_TEST_CLUSTER: s.cluster, HOMOLOGACAO_METRICAS_EXCLUSIVA: "1" }).map(([k, v]) => k + "=" + v).join("\n"));
        if (etapa === "banco-indisponivel") {
            const teste = modo => executar("docker", ["run", "--rm", "--name", projeto + "_falha", "--network", rede, "--env-file", path.join(out, "navegador.env"), ...mounts, ...montar(".cache/v214c", "/evidencias", false), "-w", "/app", browserImage, "node", "test/fixtures/falha_banco_metricas.js", modo], { stdio: "inherit" });
            docker(["stop", projeto + "-db_test-1"]);
            try { teste("indisponivel"); }
            finally { docker(["start", projeto + "-db_test-1"]); }
            await new Promise(resolve => setTimeout(resolve, 3000));
            const { c: conferido } = await identificar(s);
            try {
                await conferido.query("BEGIN READ ONLY");
                assert.equal((await conferido.query("SELECT sum(quantidade)::text total FROM visualizacoes_totais_dia")).rows[0].total, "3");
                await conferido.query("ROLLBACK");
            } finally { await conferido.end(); }
            teste("recuperado"); return;
        }
        executar("docker", ["run", "--rm", "--name", projeto + "_navegador", "--network", rede, "--shm-size", "512m", "--env-file", path.join(out, "navegador.env"), ...mounts, ...montar(".cache/v214c", "/evidencias", false), "-w", "/app", browserImage, "node", "test/fixtures/" + (etapa === "operacao" ? "operacao_homologacao.js" : etapa === "falhas" ? "falhas_metricas.js" : "homologacao_metricas.js"), etapa], { stdio: "inherit" });
        return;
    }
    if (etapa === "linux") {
        console.log(docker(["run", "--rm", ...montar("infra/systemd", "/unidades"), browserImage, "systemd-analyze", "verify", "/unidades/portal-metricas-sonda.service", "/unidades/portal-metricas-sonda.timer", "/unidades/portal-metricas-retencao.service", "/unidades/portal-metricas-retencao.timer"]));
        return;
    }
    if (etapa === "encerrar") {
        for (const suffix of ["_nginx", "_backend"]) docker(["rm", "-f", projeto + suffix]);
        docker(["network", "disconnect", rede, projeto + "-db_test-1"]); docker(["network", "rm", rede]);
        console.log("Somente serviços E2E encerrados; volume descartável preservado para inspeção."); return;
    }
    throw new Error("Etapa desconhecida.");
}
main().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[URL omitida]")); process.exitCode = 1; });
