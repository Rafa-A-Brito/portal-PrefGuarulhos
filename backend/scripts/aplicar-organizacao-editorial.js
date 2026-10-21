/**
 * Operação controlada, sem seed/migration. Sem --apply: somente leitura.
 * --apply --confirm-db=patrimonio_guarulhos --confirm-instance=localhost:5432
 * exige autorização humana prévia. Snapshot JSON e pg_dump -Fc antes de DML.
 * Qualquer divergência antes do COMMIT causa ROLLBACK de toda a operação.
 * Não importa ligacoesPropostas; preserva relações e demais campos dos bens.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { INSTANCE, LOCK_SQL, conferirInstancia, conferirLock, criarDump } from "./recuperacao-editorial.js";

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.dirname(BACKEND);
const DATABASE = "patrimonio_guarulhos";
const PLANO = path.join(BACKEND, "reports/organizacao-editorial-dry-run.json");
const PLANO_SHA256 = "6b4ab72dc486033b996a3445d2a39325bf87d9d8197d01b0e6a27222bc3e509b";
const REGIOES = [
    { slug: "centro", nome: "Centro", quantidade: 23 },
    { slug: "sao-joao-bonsucesso", nome: "São João / Bonsucesso", quantidade: 7 },
    { slug: "cantareira", nome: "Cantareira", quantidade: 4 },
];
const SEM_REGIAO = new Set([
    "cultura-e-presenca-indigena-wassu-cocal-e-krenak-pankararu",
    "parque-ecologico-do-tiete",
]);
const SEM_NUMERO = new Map([
    ["antigo-poco-municipal", "RASCUNHO"],
    ["casarao-da-nossa-historia", "ARQUIVADO"],
    ["casarao-do-sitio-ponte-alta", "ARQUIVADO"],
]);
const hash = value => createHash("sha256").update(value).digest("hex");
function exigir(ok, mensagem) {
    if (!ok) throw new Error(mensagem);
}
function igual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

async function lerPlano() {
    const bytes = await fs.readFile(PLANO);
    exigir(hash(bytes) === PLANO_SHA256, "Relatório mudou desde a preparação; exige nova revisão.");
    const { editorial } = JSON.parse(bytes.toString("utf8"));
    exigir(editorial.length === 36 && new Set(editorial.map(p => p.id)).size === 36
        && new Set(editorial.map(p => p.slug)).size === 36, "Esperados 36 IDs/slugs distintos.");
    const publicados = editorial.filter(p => p.statusEsperado === "PUBLICADO");
    for (const campo of ["numeroExibicao", "ordemExibicao"]) {
        exigir(igual(publicados.map(p => p[campo]).sort((a, b) => a - b),
            Array.from({ length: 33 }, (_, i) => i + 1)), `Sequência inválida: ${campo}.`);
    }
    for (const p of editorial) {
        exigir(SEM_REGIAO.has(p.slug) === (p.regiaoSlug === null), "Vínculo territorial protegido alterado.");
        if (SEM_NUMERO.has(p.slug)) {
            exigir(p.statusEsperado === SEM_NUMERO.get(p.slug) && p.numeroExibicao === null
                && p.ordemExibicao === null, "Bem sem numeração alterado no plano.");
        } else exigir(p.statusEsperado === "PUBLICADO", "Status inesperado no plano.");
    }
    for (const r of REGIOES) exigir(editorial.filter(p => p.regiaoSlug === r.slug).length === r.quantidade,
        `Quantidade regional divergente: ${r.slug}.`);
    return editorial;
}

export async function snapshot(client) {
    // JSONB mantém datas/decimais e todos os campos sem conversão pelo driver.
    const bens = (await client.query('SELECT to_jsonb(p) AS row FROM public.patrimonio p ORDER BY id')).rows.map(r => r.row);
    const regioes = (await client.query('SELECT to_jsonb(r) AS row FROM public.regioes_patrimonio r ORDER BY id')).rows.map(r => r.row);
    const ligacoes = (await client.query('SELECT to_jsonb(l) AS row FROM public.patrimonio_ligacoes l ORDER BY id')).rows.map(r => r.row);
    return { bens, regioes, ligacoes };
}

function validarAntes(antes, plano) {
    exigir(antes.bens.length === 36, "Catálogo mudou: esperados exatamente 36 patrimônios.");
    exigir(antes.ligacoes.length === 14, "Quantidade de relações mudou: exige nova revisão.");
    for (const p of plano) {
        const atual = antes.bens.find(b => b.id === p.id);
        exigir(atual && atual.slug === p.slug && atual.status === p.statusEsperado,
            `ID, slug ou status divergente: ${p.slug}.`);
        // Baseline validada: nenhum valor editorial ainda preenchido. Nunca
        // sobrescreve escolhas feitas entre a validação e a futura execução.
        exigir(atual.numero_exibicao === null && atual.ordem_exibicao === null && atual.regiao_id === null,
            `Campos editoriais já preenchidos: ${p.slug}. Aplicação bloqueada.`);
        if (p.numeroExibicao !== null) exigir(!antes.bens.some(b => b.id !== p.id
            && (b.numero_exibicao === p.numeroExibicao || b.ordem_exibicao === p.ordemExibicao)),
        `Colisão de número/ordem: ${p.slug}.`);
    }
    for (const r of REGIOES) {
        const atual = antes.regioes.find(item => item.slug === r.slug);
        exigir(!atual || (atual.ativo === true && atual.nome === r.nome),
            `Região existente inativa ou com nome diferente: ${r.slug}.`);
    }
}

export async function salvarBackup(antes, identidade) {
    const payload = { versao: 1, criadoEm: new Date().toISOString(), identidade,
        planoSha256: PLANO_SHA256, escopo: "Backup lógico integral: patrimonio, regioes_patrimonio, patrimonio_ligacoes",
        observacao: "Estado anterior; a existência deste arquivo não confirma COMMIT. Não contém credenciais.", antes };
    const texto = JSON.stringify(payload, null, 2) + "\n";
    const digest = hash(texto);
    const diretorio = path.join(ROOT, ".cache/backups/organizacao-editorial");
    await fs.mkdir(diretorio, { recursive: true });
    const arquivo = path.join(diretorio, `${Date.now()}-${randomUUID()}.json`);
    const handle = await fs.open(arquivo, "wx", 0o600);
    try { await handle.writeFile(texto, "utf8"); await handle.sync(); }
    finally { await handle.close(); }
    exigir(hash(await fs.readFile(arquivo)) === digest, "Backup não passou na conferência SHA256.");
    const checksum = await fs.open(arquivo + ".sha256", "wx", 0o600);
    try { await checksum.writeFile(`${digest}  ${path.basename(arquivo)}\n`); await checksum.sync(); }
    finally { await checksum.close(); }
    console.log(JSON.stringify({ backup: arquivo, sha256: digest }));
    return arquivo;
}

async function main() {
    const args = process.argv.slice(2);
    exigir(new Set(args).size === args.length && args.every(a => ["--apply", `--confirm-db=${DATABASE}`, `--confirm-instance=${INSTANCE}`].includes(a)),
        "Argumentos permitidos: --apply --confirm-db=patrimonio_guarulhos --confirm-instance=localhost:5432. Sem --apply: somente leitura.");
    const aplicar = args.includes("--apply");
    exigir(!aplicar || args.includes(`--confirm-db=${DATABASE}`), "Falta --confirm-db=patrimonio_guarulhos.");
    exigir(!aplicar || args.includes(`--confirm-instance=${INSTANCE}`), "Falta --confirm-instance=localhost:5432.");
    await conferirLock(path.join(BACKEND, "src/services/patrimonioService.js"));
    const plano = await lerPlano();
    dotenv.config({ path: path.join(BACKEND, ".env"), quiet: true });
    const url = new URL(process.env.DATABASE_URL);
    exigir(["postgres:", "postgresql:"].includes(url.protocol) && decodeURIComponent(url.pathname.slice(1)) === DATABASE,
        "DATABASE_URL aponta para outro banco.");
    url.searchParams.set("options", `-c default_transaction_read_only=${aplicar ? "off" : "on"} -c statement_timeout=30000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=300000`);
    const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000 });
    let transacao = false, enviouCommit = false;
    try {
        await client.connect();
        await conferirInstancia(client, url);
        await client.query(aplicar ? "BEGIN ISOLATION LEVEL READ COMMITTED" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        transacao = true;
        const identidade = (await client.query("SELECT current_database() AS banco, inet_server_addr()::text AS servidor, inet_server_port() AS porta, current_setting('transaction_read_only') AS somente_leitura")).rows[0];
        exigir(identidade.banco === DATABASE && identidade.somente_leitura === (aplicar ? "off" : "on"), "Banco/modo transacional inesperado.");
        if (aplicar) {
            // Mesmo lock da numeração do service. Locks de tabela impedem
            // mudanças externas durante snapshot, backup e pós-validação.
            await client.query(LOCK_SQL);
            await client.query("LOCK TABLE public.patrimonio, public.regioes_patrimonio, public.patrimonio_ligacoes IN EXCLUSIVE MODE");
        }
        const antes = await snapshot(client);
        validarAntes(antes, plano);
        if (!aplicar) {
            await client.query("ROLLBACK"); transacao = false;
            console.log(JSON.stringify({ modo: "dry-run-read-only", banco: DATABASE, patrimonios: 36,
                numerosEOrdens: 33, vinculosRegionais: 34, regioesACriar: REGIOES.filter(r => !antes.regioes.some(a => a.slug === r.slug)),
                relacoesPreservadas: 14, gravacoes: 0 }));
            return;
        }
        const backup = await salvarBackup(antes, identidade); // obrigatório ANTES do primeiro INSERT/UPDATE
        const dump = await criarDump(client, url, backup); // falha de dump também impede qualquer DML
        const regioes = new Map(antes.regioes.map(r => [r.slug, r.id]));
        const criadas = [];
        for (const r of REGIOES) {
            if (regioes.has(r.slug)) continue;
            const id = randomUUID();
            const result = await client.query("INSERT INTO public.regioes_patrimonio (id,nome,slug,descricao,ativo,created_at,updated_at) VALUES ($1::uuid,$2,$3,NULL,true,now(),now()) RETURNING to_jsonb(regioes_patrimonio) AS row", [id, r.nome, r.slug]);
            criadas.push(result.rows[0].row);
            regioes.set(r.slug, id);
        }
        for (const p of plano) {
            const result = await client.query("UPDATE public.patrimonio SET numero_exibicao=$1, ordem_exibicao=$2, regiao_id=$3::uuid WHERE id=$4::uuid AND slug=$5 AND status::text=$6 AND numero_exibicao IS NULL AND ordem_exibicao IS NULL AND regiao_id IS NULL",
                [p.numeroExibicao, p.ordemExibicao, p.regiaoSlug === null ? null : regioes.get(p.regiaoSlug), p.id, p.slug, p.statusEsperado]);
            exigir(result.rowCount === 1, `Pré-condição de atualização falhou: ${p.slug}.`);
        }
        const depois = await snapshot(client);
        const esperado = antes.bens.map(b => {
            const p = plano.find(p => p.id === b.id);
            return { ...b, numero_exibicao: p.numeroExibicao, ordem_exibicao: p.ordemExibicao,
                regiao_id: p.regiaoSlug === null ? null : regioes.get(p.regiaoSlug) };
        });
        // JSONB devolve chaves ordenadas; comparar objetos por campo ignora
        // somente a ordem das chaves, sem ignorar qualquer valor do registro.
        exigir(depois.bens.length === esperado.length && depois.bens.every((b, i) =>
            Object.keys(b).length === Object.keys(esperado[i]).length && Object.keys(b).every(k => igual(b[k], esperado[i][k]))),
        "Pós-validação falhou: patrimônio/campo não autorizado foi alterado.");
        exigir(igual(antes.ligacoes, depois.ligacoes), "Relações foram alteradas; rollback obrigatório.");
        const regioesEsperadas = [...antes.regioes, ...criadas].sort((a, b) => a.id.localeCompare(b.id));
        exigir(igual(regioesEsperadas, depois.regioes), "Regiões divergentes; rollback obrigatório.");
        enviouCommit = true;
        await client.query("COMMIT"); transacao = false;
        console.log(JSON.stringify({ resultado: "APLICADO", backup, dump, regioesCriadas: criadas.length,
            numerosEOrdens: 33, vinculosRegionais: 34, semRegiaoPreservados: 2, semNumeroPreservados: 3, relacoesPreservadas: 14 }));
    } catch (error) {
        if (transacao) {
            try { await client.query("ROLLBACK"); }
            catch { console.error("Falha ao confirmar ROLLBACK; conferir estado antes de repetir."); }
        }
        if (enviouCommit) console.error("Falha durante confirmação do COMMIT: resultado incerto. Conferir banco e backup antes de repetir.");
        throw error;
    } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => {
    console.error("Operação não concluída:", error.message);
    process.exitCode = 1;
});
