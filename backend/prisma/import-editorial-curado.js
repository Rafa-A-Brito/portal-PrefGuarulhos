import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { hashEstado, ordenarRelacoes } from '../src/utils/estadoHash.js';
import { LEGADOS_EDITORIAIS } from '../src/utils/identidadeEditorial.js';
import { EDITORIAL_CURADO, SLUGS_CANONICOS, FONTE_CANONICA_SHA256 } from './data/patrimonioEditorialCurado.js';

const ACTION = 'D1C_EDITORIAL_IMPORT';
const NAMESPACE = 'D1C-v1';
const approval = z.enum(['APROVAR', 'APROVAR_COM_REESCRITA']);
const text = max => z.string().trim().min(1).max(max);
const slug = z.enum(SLUGS_CANONICOS);
const base = { chave: text(300), ordem: z.number().int().min(0).max(2147483647), aprovacao: approval,
    auditoriaId: text(100), fonteApoio: z.array(z.object({ arquivo: text(500), trecho: text(20000) }).passthrough()).min(1) };
const manifestSchema = z.object({
    fatos: z.array(z.object({ ...base, patrimonioSlug: slug, rotulo: text(200), valor: text(10000) }).strict()),
    ligacoes: z.array(z.object({ ...base, origemSlug: slug, destinoSlug: slug, texto: text(2000) }).strict()),
}).strict();
const kind = tipo => tipo === 'fatos' ? 'PatrimonioFato' : 'PatrimonioLigacao';
const model = tipo => tipo === 'fatos' ? 'patrimonioFato' : 'patrimonioLigacao';
const ownerField = tipo => tipo === 'fatos' ? 'patrimonioId' : 'patrimonioOrigemId';
const origin = (tipo, item) => tipo === 'fatos' ? item.patrimonioSlug : item.origemSlug;
const keyOf = (tipo, item) => `${tipo}/${origin(tipo, item)}/${item.chave}`;
const normalize = value => value.normalize('NFKC').trim().toLocaleLowerCase('pt-BR');

export function validarManifesto(value) {
    const result = manifestSchema.parse(value);
    for (const tipo of ['fatos', 'ligacoes']) {
        const keys = new Set(), orders = new Set(), identities = new Set();
        for (const item of result[tipo]) {
            const parent = origin(tipo, item), key = keyOf(tipo, item), order = `${parent}/${item.ordem}`;
            const identity = `${parent}/${tipo === 'fatos' ? normalize(item.rotulo) : item.destinoSlug}`;
            if (keys.has(key) || orders.has(order) || identities.has(identity)) throw new Error('MANIFESTO_DUPLICADO: ' + key);
            if (tipo === 'ligacoes' && parent === item.destinoSlug) throw new Error('AUTORRELACAO: ' + key);
            keys.add(key); orders.add(order); identities.add(identity);
        }
    }
    return result;
}

export function planejarEditorial({ manifesto = EDITORIAL_CURADO, estado }) {
    manifesto = validarManifesto(manifesto);
    const report = { source_total: manifesto.fatos.length + manifesto.ligacoes.length, creates: 0, updates: 0, unchanged: 0,
        conflicts: [], errors: [], applied: 0, diff: [], preservados: [],
        estado_hash: hashEstado({ fonte: FONTE_CANONICA_SHA256, manifesto, estado: ordenarRelacoes(estado) }) };
    const conflict = (key, motivo) => report.conflicts.push({ chave: key, motivo });
    const touched = new Set();
    for (const tipo of ['fatos', 'ligacoes']) for (const item of manifesto[tipo]) {
        const key = keyOf(tipo, item), slugOrigem = origin(tipo, item);
        const parents = estado.patrimonios.filter(p => p.slug === slugOrigem);
        const destinations = tipo === 'ligacoes' ? estado.patrimonios.filter(p => p.slug === item.destinoSlug) : [];
        if (parents.length !== 1 || (tipo === 'ligacoes' && destinations.length !== 1)) { conflict(key, 'IDENTIDADE_AUSENTE_OU_AMBIGUA'); continue; }
        const parent = parents[0], destination = destinations[0];
        if ([parent, destination].filter(Boolean).some(p => LEGADOS_EDITORIAIS.some(l => l.id === p.id || l.slug === p.slug))) {
            conflict(key, 'LEGADO_CONSOLIDADO'); continue;
        }
        if (destination?.id === parent.id) { conflict(key, 'AUTORRELACAO'); continue; }
        const desired = tipo === 'fatos' ? { patrimonioId: parent.id, rotulo: item.rotulo, valor: item.valor, ordem: item.ordem }
            : { patrimonioOrigemId: parent.id, patrimonioDestinoId: destination.id, texto: item.texto, ordem: item.ordem };
        const logs = estado.auditoria.filter(a => a.action === ACTION && a.entity === kind(tipo) && a.newValues?.manifesto === NAMESPACE && a.newValues?.chave === key);
        const ids = new Set(logs.map(l => l.entityId));
        if (ids.size > 1) { conflict(key, 'PROPRIEDADE_AMBIGUA'); continue; }
        const latest = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id.localeCompare(a.id))[0];
        // Empates de timestamp com snapshots diferentes não permitem escolher por UUID aleatório.
        if (latest && logs.some(l => new Date(l.createdAt).getTime() === new Date(latest.createdAt).getTime() && hashEstado(l.newValues.item) !== hashEstado(latest.newValues.item))) {
            conflict(key, 'AUDITORIA_AMBIGUA'); continue;
        }
        const current = latest ? estado[tipo].find(r => r.id === latest.entityId) : null;
        if (latest && (!current || current[ownerField(tipo)] !== parent.id)) { conflict(key, 'ITEM_GERENCIADO_AUSENTE_OU_MOVIDO'); continue; }
        if (current && estado.auditoria.some(a => a.entityId === current.id && a.newValues?.manifesto === NAMESPACE && a.newValues.chave !== key)) {
            conflict(key, 'PROPRIEDADE_AMBIGUA'); continue;
        }
        if (current && hashEstado(current) !== hashEstado(latest.newValues.item)) { conflict(key, 'CONTEUDO_ADMINISTRATIVO_ALTERADO'); continue; }
        const others = estado[tipo].filter(r => r[ownerField(tipo)] === parent.id && r.id !== current?.id);
        if (others.some(r => r.ordem === item.ordem)) { conflict(key, 'COLISAO_ORDEM'); continue; }
        if (others.some(r => tipo === 'fatos' ? normalize(r.rotulo) === normalize(item.rotulo) : r.patrimonioDestinoId === desired.patrimonioDestinoId)) {
            conflict(key, tipo === 'fatos' ? 'COLISAO_ROTULO' : 'DUPLICATA_ORIGEM_DESTINO'); continue;
        }
        if (current) touched.add(current.id);
        const after = { ...(current && { id: current.id }), ...desired };
        const acao = !current ? 'CRIAR' : hashEstado(current) === hashEstado(after) ? 'MANTER' : 'ATUALIZAR';
        report[acao === 'CRIAR' ? 'creates' : acao === 'ATUALIZAR' ? 'updates' : 'unchanged']++;
        report.diff.push({ chave: key, tipo, slug: slugOrigem, acao, antes: current ?? null, depois: after,
            campos: Object.keys(desired).filter(k => current?.[k] !== desired[k]).map(campo => ({ campo, antes: current?.[campo] ?? null, depois: desired[campo] })) });
    }
    report.preservados = [...estado.fatos, ...estado.ligacoes].filter(r => !touched.has(r.id)).map(r => r.id);
    return report;
}

export function parseEditorialArgs(args) {
    const options = { apply: false };
    const seen = new Set();
    for (const arg of args) {
        const [key, ...parts] = arg.split('='), value = parts.join('=');
        if (seen.has(key)) throw new Error('Argumento repetido: ' + key);
        seen.add(key);
        if (key === '--apply' && !parts.length) options.apply = true;
        else if (key === '--dry-run' && !parts.length) options.apply = false;
        else if (key === '--expected-state-hash' && /^[a-f0-9]{64}$/.test(value)) options.expectedStateHash = value;
        else if (key === '--confirm-database' && /^[a-zA-Z0-9_]+$/.test(value)) options.confirmDatabase = value;
        else if (key === '--author-id' && z.uuid().safeParse(value).success) options.authorId = value;
        else throw new Error('Argumento inválido: ' + key);
    }
    if (seen.has('--apply') && seen.has('--dry-run')) throw new Error('Modos incompatíveis.');
    if (options.apply && (!options.expectedStateHash || !options.confirmDatabase || !options.authorId)) throw new Error('Apply exige hash revisado, confirmação do banco e autor.');
    return options;
}

export async function importarEditorial({ prisma, options = {}, manifesto = EDITORIAL_CURADO }) {
    // A API programática mantém as mesmas barreiras da CLI.
    if (options.apply && (!/^[a-f0-9]{64}$/.test(options.expectedStateHash ?? '') || !options.confirmDatabase || !z.uuid().safeParse(options.authorId).success)) {
        throw new Error('Apply exige hash revisado, confirmação do banco e autor.');
    }
    const actualHash = createHash('sha256').update(readFileSync(new URL('./patrimonioSeedData.js', import.meta.url))).digest('hex');
    if (actualHash !== FONTE_CANONICA_SHA256) throw new Error('Fonte canônica mudou; revisar curadoria.');
    manifesto = validarManifesto(manifesto);
    const slugs = [...new Set([...manifesto.fatos.map(f => f.patrimonioSlug), ...manifesto.ligacoes.flatMap(l => [l.origemSlug, l.destinoSlug])])].sort();
    return prisma.$transaction(async tx => {
        if (!options.apply) await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        const [identity] = await tx.$queryRawUnsafe('SELECT current_database() AS database, current_setting(\'transaction_read_only\') AS read_only');
        if (options.confirmDatabase && options.confirmDatabase !== identity.database) throw new Error('Banco diferente da confirmação.');
        if (!options.apply && identity.read_only !== 'on') throw new Error('Dry-run deve ser somente leitura.');
        if (options.apply) {
            // Mesmo protocolo de locks do CRUD D1B: pais em ordem determinística.
            const ids = await tx.patrimonio.findMany({ where: { slug: { in: slugs } }, select: { id: true }, orderBy: { id: 'asc' } });
            for (const { id } of ids) await tx.$queryRawUnsafe('SELECT id FROM patrimonio WHERE id = $1::uuid FOR UPDATE', id);
            await tx.$queryRawUnsafe('SELECT id FROM users WHERE id = $1::uuid FOR SHARE', options.authorId);
        }
        const patrimonios = await tx.patrimonio.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, status: true } });
        const ids = patrimonios.map(p => p.id);
        const estado = { database: identity.database, patrimonios,
            fatos: await tx.patrimonioFato.findMany({ where: { patrimonioId: { in: ids } } }),
            ligacoes: await tx.patrimonioLigacao.findMany({ where: { patrimonioOrigemId: { in: ids } } }),
            auditoria: await tx.auditLog.findMany({ where: { action: ACTION }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
        };
        const report = { ...planejarEditorial({ manifesto, estado }), database: identity.database, somente_leitura: !options.apply };
        if (options.expectedStateHash && report.estado_hash !== options.expectedStateHash) report.conflicts.push({ motivo: 'ESTADO_DESATUALIZADO' });
        if (!options.apply || report.conflicts.length) return report;
        const author = await tx.user.findUnique({ where: { id: options.authorId } });
        const origins = new Set(report.diff.filter(d => d.acao !== 'MANTER').map(d => d.slug));
        if (!author?.isActive || !['ADMIN', 'EDITOR'].includes(author.role) || (author.role === 'EDITOR' && patrimonios.some(p => origins.has(p.slug) && p.status !== 'RASCUNHO'))) {
            report.conflicts.push({ motivo: 'AUTOR_SEM_PERMISSAO' }); return report;
        }
        for (const change of report.diff.filter(d => d.acao !== 'MANTER')) {
            const { id: _id, ...data } = change.depois;
            const row = change.acao === 'CRIAR' ? await tx[model(change.tipo)].create({ data })
                : await tx[model(change.tipo)].update({ where: { id: change.antes.id }, data });
            await tx.auditLog.create({ data: { userId: author.id, action: ACTION, entity: kind(change.tipo), entityId: row.id,
                ...(change.antes && { oldValues: change.antes }),
                newValues: { manifesto: NAMESPACE, chave: change.chave, item: row, manifestoHash: hashEstado(manifesto) } } });
            change.id = row.id;
            report.applied++;
        }
        return report;
    }, { isolationLevel: options.apply ? 'Serializable' : 'RepeatableRead', timeout: 30000 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    let prisma;
    try {
        const options = parseEditorialArgs(process.argv.slice(2));
        ({ default: prisma } = await import('../src/config/prisma.js'));
        const report = await importarEditorial({ prisma, options });
        console.log(JSON.stringify(report, null, 2));
        if (report.conflicts.length || report.errors.length) process.exitCode = 1;
    } catch (error) { console.error(error.message); process.exitCode = 1; }
    finally { await prisma?.$disconnect(); }
}
