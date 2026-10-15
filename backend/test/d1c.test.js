import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { artefatos, gerarCuradoria } from '../scripts/gerar-curadoria-editorial.js';
import { EDITORIAL_CURADO, SLUGS_CANONICOS } from '../prisma/data/patrimonioEditorialCurado.js';
import { validarManifesto, planejarEditorial, parseEditorialArgs, importarEditorial } from '../prisma/import-editorial-curado.js';

const fixture = () => ({ database: 'editorial_test', patrimonios: SLUGS_CANONICOS.map(slug => ({ id: randomUUID(), slug, status: 'PUBLICADO' })), fatos: [], ligacoes: [], auditoria: [] });
const plan = (estado, manifesto = EDITORIAL_CURADO) => planejarEditorial({ estado, manifesto });
const managed = (estado, change) => {
    const row = { id: randomUUID(), ...change.depois };
    estado[change.tipo].push(row);
    estado.auditoria.push({ id: randomUUID(), createdAt: new Date(), entity: change.tipo === 'fatos' ? 'PatrimonioFato' : 'PatrimonioLigacao',
        action: 'D1C_EDITORIAL_IMPORT', entityId: row.id, newValues: { manifesto: 'D1C-v1', chave: change.chave, item: structuredClone(row) } });
    return row;
};

test('D1C: 83 fatos e 27 ligações têm decisão, apoio e cobertura integral', () => {
    const { auditoria, manifesto, slugsCanonicos } = gerarCuradoria();
    assert.equal(auditoria.fatos.length, 83); assert.equal(auditoria.ligacoes.length, 27);
    assert.equal(new Set(auditoria.fatos.map(f => f.auditoriaId)).size, 83);
    assert.equal(manifesto.fatos.length, 0); assert.equal(manifesto.ligacoes.length, 14);
    assert.deepEqual(auditoria.contagens.fatos, { DUPLICADO_DE_DETALHE: 67, REJEITAR: 5, CONTRADIZ_C1_C2: 6, SEM_SUPORTE_SUFFICIENTE: 5 });
    assert.equal(slugsCanonicos.length, 34);
    assert.ok(slugsCanonicos.includes(auditoria.canonicoAusenteNaEquipePreservado));
    assert.equal(auditoria.cobertura.filter(c => c.resolucao === 'ALIAS').length, 1);
    assert.ok(auditoria.fatos.filter(f => f.idEquipe === '13').every(f => f.slugCanonico === 'casa-jose-mauricio' && f.comparadoCom.length));
    assert.deepEqual(auditoria.ligacoes.filter(l => l.decisao === 'REJEITAR_AUTORRELACAO').map(l => l.auditoriaId), ['L-9>13', 'L-13>9']);
    assert.deepEqual(auditoria.ligacoes.filter(l => l.decisao === 'REJEITAR_DUPLICATA').map(l => l.auditoriaId), ['L-13>11']);
    for (const l of manifesto.ligacoes) assert.ok(auditoria.ligacoes.some(a => a.auditoriaId === l.auditoriaId && a.decisao.startsWith('APROVAR')));
});

test('D1C: geração determinística, sem identidade duplicada, artefatos versionados íntegros', () => {
    assert.deepEqual(gerarCuradoria(), gerarCuradoria());
    assert.deepEqual(validarManifesto(EDITORIAL_CURADO), EDITORIAL_CURADO);
    for (const [path, content] of artefatos()) assert.equal(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), content);
});

test('D1C: manifesto rejeita duplicata, ordem, autorrelação e identidade não canônica', () => {
    const duplicate = structuredClone(EDITORIAL_CURADO);
    duplicate.ligacoes.push(duplicate.ligacoes[0]);
    assert.throws(() => validarManifesto(duplicate), /DUPLICADO/);
    const self = structuredClone(EDITORIAL_CURADO); self.ligacoes[0].destinoSlug = self.ligacoes[0].origemSlug;
    assert.throws(() => validarManifesto(self), /AUTORRELACAO/);
    const legacy = structuredClone(EDITORIAL_CURADO); legacy.ligacoes[0].destinoSlug = 'casarao-da-nossa-historia';
    assert.throws(() => validarManifesto(legacy));
    const unapproved = structuredClone(EDITORIAL_CURADO); unapproved.ligacoes[0].aprovacao = 'RELACAO_FRACA';
    assert.throws(() => validarManifesto(unapproved));
});

test('D1C: plano sem mutação, hash determinístico e idempotência com UUIDs preservados', () => {
    const estado = fixture(), before = structuredClone(estado), first = plan(estado);
    assert.equal(first.creates, 14); assert.equal(first.applied, 0); assert.deepEqual(estado, before);
    assert.equal(first.estado_hash, plan({ ...estado, patrimonios: [...estado.patrimonios].reverse() }).estado_hash);
    for (const change of first.diff) managed(estado, change);
    const second = plan(estado);
    assert.equal(second.unchanged, 14); assert.equal(second.creates + second.updates + second.conflicts.length, 0);
    assert.deepEqual(second.diff.map(d => d.depois.id), estado.ligacoes.map(l => l.id));
    const revised = structuredClone(EDITORIAL_CURADO); revised.ligacoes[0].texto += ' Texto revisto.';
    const update = plan(estado, revised);
    assert.equal(update.updates, 1); assert.equal(update.diff[0].depois.id, estado.ligacoes[0].id);
    assert.notEqual(update.estado_hash, second.estado_hash);
});

test('D1C: detecta ordem e par ocupados, não adota conteúdo administrativo', () => {
    for (const samePair of [false, true]) {
        const estado = fixture(), change = plan(estado).diff[0];
        estado.ligacoes.push({ id: randomUUID(), ...change.depois, ordem: samePair ? 99 : change.depois.ordem,
            patrimonioDestinoId: samePair ? change.depois.patrimonioDestinoId : randomUUID() });
        const result = plan(estado);
        assert.ok(result.conflicts.some(c => c.motivo === (samePair ? 'DUPLICATA_ORIGEM_DESTINO' : 'COLISAO_ORDEM')));
        assert.ok(result.preservados.includes(estado.ligacoes[0].id));
    }
});

test('D1C: extras preservados; edição/exclusão manual de item gerenciado bloqueia sobrescrita/recriação', () => {
    const estado = fixture(), first = plan(estado), row = managed(estado, first.diff[0]);
    const extra = { id: randomUUID(), patrimonioOrigemId: row.patrimonioOrigemId, patrimonioDestinoId: randomUUID(), texto: 'Admin', ordem: 99 };
    estado.ligacoes.push(extra);
    assert.ok(plan(estado).preservados.includes(extra.id));
    row.texto = 'Edição manual';
    assert.ok(plan(estado).conflicts.some(c => c.motivo === 'CONTEUDO_ADMINISTRATIVO_ALTERADO'));
    estado.ligacoes = [extra];
    assert.ok(plan(estado).conflicts.some(c => c.motivo === 'ITEM_GERENCIADO_AUSENTE_OU_MOVIDO'));
});

test('D1C: colisão de rótulo de fato e identidade inexistente', () => {
    const estado = fixture();
    const manifesto = { fatos: [{ chave: 'data', patrimonioSlug: SLUGS_CANONICOS[0], rotulo: 'Data', valor: '1900', ordem: 0, aprovacao: 'APROVAR', auditoriaId: 'sintetico', fonteApoio: [{ arquivo: 'teste', trecho: 'Somente fixture' }] }], ligacoes: [] };
    estado.fatos.push({ id: randomUUID(), patrimonioId: estado.patrimonios[0].id, rotulo: 'DATA', valor: 'Admin', ordem: 5 });
    assert.equal(plan(estado, manifesto).conflicts[0].motivo, 'COLISAO_ROTULO');
    estado.patrimonios = [];
    assert.equal(plan(estado, manifesto).conflicts[0].motivo, 'IDENTIDADE_AUSENTE_OU_AMBIGUA');
});

test('D1C: CLI padrão dry-run; apply só com hash, autor e banco explícitos', () => {
    assert.equal(parseEditorialArgs([]).apply, false);
    assert.throws(() => parseEditorialArgs(['--apply']), /exige/);
    assert.throws(() => parseEditorialArgs(['--apply', '--dry-run']));
    assert.throws(() => parseEditorialArgs(['--seed']));
    assert.throws(() => parseEditorialArgs(['--dry-run', '--dry-run']));
});

test('D1C: dry-run inicia READ ONLY; hash desatualizado produz zero escritas', async () => {
    const estado = fixture(), commands = [];
    const tx = { $executeRawUnsafe: async s => commands.push(s), $queryRawUnsafe: async s => {
        commands.push(s); return s.startsWith('SELECT current_database') ? [{ database: estado.database, read_only: 'on' }] : [];
    }, patrimonio: { findMany: async () => estado.patrimonios }, patrimonioFato: { findMany: async () => [] }, patrimonioLigacao: { findMany: async () => [] }, auditLog: { findMany: async () => [] } };
    const prisma = { $transaction: async cb => cb(tx) };
    const dry = await importarEditorial({ prisma });
    assert.equal(commands[0], 'SET TRANSACTION READ ONLY'); assert.equal(dry.applied, 0);
    const stale = await importarEditorial({ prisma, options: { apply: true, expectedStateHash: '0'.repeat(64), authorId: randomUUID(), confirmDatabase: estado.database } });
    assert.ok(stale.conflicts.some(c => c.motivo === 'ESTADO_DESATUALIZADO')); assert.equal(stale.applied, 0);
});
