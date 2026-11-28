// Perfil opt-in de desenvolvimento. Não carrega o .env habitual nem prepara bancos.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { Client } = require('pg');
const { parse } = require('dotenv');
const root = path.resolve(__dirname, '../..');
const privado = path.join(root, '.secrets/feedback_local');
const perfil = path.join(root, 'backend/.env.feedback.local');
const acao = process.argv[2];
const exigir = (condicao) => { if (!condicao) throw new Error('Perfil local ou identidade divergente; operação recusada.'); };
const sistema = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PATHEXT|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(k)));

function destino(valor, papel) {
    const u = new URL(valor);
    exigir(u.protocol === 'postgresql:' && u.hostname === '127.0.0.1' && u.port === '5558' && u.pathname === '/portal_test' && !u.search && !u.hash);
    if (papel) exigir(u.username === papel);
    return u;
}

async function conferir(c, e) {
    destino(c.inspecao);
    destino(e.DATABASE_URL, 'portal_api');
    const db = new Client({ connectionString: c.inspecao, connectionTimeoutMillis: 3000, statement_timeout: 5000, options: '-c default_transaction_read_only=on' });
    try {
        await db.connect();
        await db.query('BEGIN READ ONLY');
        const id = (await db.query("SELECT current_database() banco, system_identifier::text cluster, current_setting('data_directory') diretorio FROM pg_control_system()")).rows[0];
        exigir(id.banco === 'portal_test' && id.cluster === c.cluster && path.resolve(id.diretorio) === path.resolve(c.diretorio));
        const migrations = (await db.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations')).rows;
        exigir(migrations.length >= 16);
        for (const m of migrations) {
            exigir(m.finished_at && !m.rolled_back_at && /^[a-zA-Z0-9_]+$/.test(m.migration_name));
            exigir(createHash('sha256').update(fs.readFileSync(path.join(root, 'backend/prisma/migrations', m.migration_name, 'migration.sql'))).digest('hex') === m.checksum);
        }
        await db.query('ROLLBACK');
    } finally { await db.end(); }
    const api = new Client({ connectionString: e.DATABASE_URL, connectionTimeoutMillis: 3000, statement_timeout: 5000, options: '-c default_transaction_read_only=on' });
    try {
        await api.connect();
        await api.query('BEGIN READ ONLY');
        const r = (await api.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
        exigir(r && !Object.values(r).some(Boolean));
        for (const tabela of ['feedback', 'feedback_recibo']) {
            const p = (await api.query("SELECT has_table_privilege(current_user,$1,'SELECT') leitura, has_table_privilege(current_user,$1,'INSERT') insercao, has_table_privilege(current_user,$1,'UPDATE') alteracao, has_table_privilege(current_user,$1,'DELETE') exclusao", [tabela])).rows[0];
            exigir(p.leitura && p.insercao && !p.alteracao && !p.exclusao);
        }
        const n = (await api.query('SELECT (SELECT count(*)::text FROM feedback) feedback, (SELECT count(*)::text FROM feedback_recibo) recibos')).rows[0];
        await api.query('ROLLBACK');
        console.log(`Banco exclusivo conferido: 127.0.0.1:5558/portal_test; papel restrito; ${n.feedback} feedbacks, ${n.recibos} recibos.`);
    } finally { await api.end(); }
}

function executar(c, nome, args, env = sistema) {
    // Arquivo evita que o servidor PostgreSQL herde pipes e retenha o terminal no Windows.
    const log = fs.openSync(path.join(privado, 'comando_postgres.log'), 'a');
    try {
        const r = spawnSync(path.join(c.bin, nome), args, { env, windowsHide: true, stdio: ['ignore', log, log] });
        if (r.status !== 0) throw new Error('Comando PostgreSQL falhou; não houve repetição automática.');
    } finally { fs.closeSync(log); }
}

async function main() {
    exigir(['banco', 'parar', 'conferir', 'backup', 'api', 'frontend'].includes(acao));
    const c = JSON.parse(fs.readFileSync(path.join(privado, 'config.json'), 'utf8'));
    const e = parse(fs.readFileSync(perfil));
    exigir(c.cluster === '7712578530882550764' && path.resolve(c.diretorio) === path.join(root, '.cache/fb_int_1/pgdata'));
    destino(c.inspecao);
    destino(e.DATABASE_URL, 'portal_api');
    exigir(e.NODE_ENV === 'development' && e.MOCK_DATA === 'false' && e.PORT === '3358' && e.CORS_ORIGIN === 'http://127.0.0.1:5238' && e.FEEDBACK_ORIGEM === e.CORS_ORIGIN && e.FEEDBACK_TRANSPORTE === 'http-local' && !e.TRUST_PROXY_IPS);
    if (acao === 'banco') {
        const controle = spawnSync(path.join(c.bin, 'pg_controldata.exe'), ['-D', c.diretorio], { env: sistema, windowsHide: true, encoding: 'utf8' });
        exigir(controle.status === 0 && controle.stdout.includes(c.cluster));
        const status = spawnSync(path.join(c.bin, 'pg_ctl.exe'), ['-D', c.diretorio, 'status'], { env: sistema, windowsHide: true, stdio: 'pipe' });
        if (status.status !== 0) {
            exigir(status.status === 3);
            executar(c, 'pg_ctl.exe', ['-D', c.diretorio, '-l', path.join(privado, 'postgres.log'), '-w', 'start']);
        }
    }
    await conferir(c, e);
    if (acao === 'parar') {
        executar(c, 'pg_ctl.exe', ['-D', c.diretorio, '-m', 'fast', '-w', 'stop']);
        console.log('Cluster exclusivo parado; dados preservados.');
    } else if (acao === 'backup') {
        const u = destino(c.inspecao);
        const pasta = path.join(privado, 'backups');
        fs.mkdirSync(pasta, { recursive: true });
        const arquivo = path.join(pasta, `portal_${Date.now()}.dump`);
        executar(c, 'pg_dump.exe', ['-h', u.hostname, '-p', u.port, '-U', decodeURIComponent(u.username), '-d', 'portal_test', '-Fc', '-f', arquivo], { ...sistema, PGPASSWORD: decodeURIComponent(u.password) });
        console.log('Backup local criado em .secrets/feedback_local/backups.');
    } else if (acao === 'api' || acao === 'frontend') {
        // Impede herança de flags/URLs/segredos de outro terminal ou do .env habitual.
        for (const k of Object.keys(process.env)) delete process.env[k];
        Object.assign(process.env, sistema);
        if (acao === 'api') {
            Object.assign(process.env, e, { DOTENV_CONFIG_PATH: perfil });
            process.chdir(path.join(root, 'backend'));
            const importar = p => import(pathToFileURL(path.join(root, 'backend/src', p)).href);
            const { default: app } = await importar('app.js');
            await (await importar('config/storage.js')).garantirPastas();
            (await importar('services/loginAccessService.js')).startAccessWorker();
            const server = app.listen(3358, '127.0.0.1', () => console.log('API local: http://127.0.0.1:3358 (Feedback habilitado pelo perfil privado).'));
            server.on('error', () => { console.error('Não foi possível abrir a porta local da API.'); process.exit(1); });
        } else {
            const f = parse(fs.readFileSync(path.join(root, 'frontend/.env.feedback.local')));
            exigir(Object.keys(f).every(k => ['VITE_FEEDBACK_ATIVO', 'VITE_API_BASE_URL', 'VITE_METRICAS_ATIVAS', 'FEEDBACK_PROXY_TARGET'].includes(k)));
            exigir(f.VITE_API_BASE_URL === 'http://127.0.0.1:3358/api' && f.FEEDBACK_PROXY_TARGET === 'http://127.0.0.1:3358');
            Object.assign(process.env, f);
            const { createServer } = await import(pathToFileURL(path.join(root, 'frontend/node_modules/vite/dist/node/index.js')).href);
            const server = await createServer({ root: path.join(root, 'frontend'), envDir: false, server: { host: '127.0.0.1', port: 5238, strictPort: true } });
            await server.listen();
            console.log('Frontend local: http://127.0.0.1:5238/contato');
        }
    }
}
main().catch(error => { console.error(`Perfil Feedback não iniciado: ${error.code || (error.message.startsWith('Perfil local') || error.message.startsWith('Comando PostgreSQL') ? error.message : 'confira os arquivos privados, banco e portas conforme o guia.')}`); process.exitCode = 1; });
