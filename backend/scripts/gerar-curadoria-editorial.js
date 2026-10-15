import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PATRIMONIOS } from '../prisma/data/patrimonios.js';
import { PATRIMONIOS_SEED } from '../prisma/patrimonioSeedData.js';
import { REVISAO_FATOS, REVISAO_LIGACOES, REJEICOES_LIGACOES } from '../prisma/data/decisoesEditorialD1C.js';

const root = new URL('../', import.meta.url);
export const CANONICAL_SHA = 'c9f003c7017a045e731785e9f0eb8e8eb7ea4e2e651620c3421e6d26a981f8e8';
const digest = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const decisions = { D: 'DUPLICADO_DE_DETALHE', C: 'CONTRADIZ_C1_C2', P: 'SEM_SUPORTE_SUFFICIENTE', R: 'REJEITAR' };
const missing = 'primitiva-igreja-de-nossa-senhora-do-rosario-dos-homens-pretos-1717';

export function gerarCuradoria() {
    assert.equal(digest('prisma/patrimonioSeedData.js'), CANONICAL_SHA, 'Fonte canônica mudou; exige nova revisão.');
    const map = new Map([...readFileSync(new URL('reports/D1B-auditoria-preliminar-D1C.md', root), 'utf8').matchAll(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| (DIRETA|ALIAS) \|/gm)]
        .map(([, id, nome, slug, resolucao]) => [id, { idEquipe: id, nomeEquipe: nome.trim(), slug: slug.trim(), resolucao }]));
    assert.equal(map.size, 34);
    const canonical = id => {
        const identity = map.get(String(id));
        assert.ok(identity, `ID não mapeado: ${id}`);
        const nome = String(id) === '13' ? 'Casa José Maurício' : identity.nomeEquipe;
        const matches = PATRIMONIOS_SEED.filter(p => p.nome === nome);
        assert.equal(matches.length, 1, nome);
        return matches[0];
    };
    const apoio = (id, campo) => {
        const p = canonical(id);
        const trecho = campo.startsWith('$') ? p[campo.slice(1)] : p.detalhes.find(d => d.titulo === campo)?.texto;
        assert.ok(trecho, `Evidência inexistente: ${id}/${campo}`);
        return { arquivo: 'prisma/patrimonioSeedData.js', sha256: CANONICAL_SHA, slug: map.get(String(id)).slug, campo, trecho,
            natureza: 'CONTEUDO_CANONICO_INCORPORADO', urls: [...trecho.matchAll(/https?:\/\/[^\s)]+/g)].map(m => m[0]) };
    };
    const fatos = [], ligacoes = [], usados = new Set();
    for (const p of PATRIMONIOS) {
        const id = String(p.id), identity = map.get(id);
        canonical(id);
        assert.equal((REVISAO_FATOS[id] ?? []).length, (p.fatos ?? []).length, `Revisões de fatos: ${id}`);
        (p.fatos ?? []).forEach((f, ordem) => {
            const [code, campo, justificativa] = REVISAO_FATOS[id][ordem];
            assert.ok(decisions[code]);
            fatos.push({ auditoriaId: `F-${id}-${ordem}`, idEquipe: id, patrimonioEquipe: p.nome,
                slugCanonico: identity.slug, resolucao: identity.resolucao,
                rotuloOriginal: f.rotulo, valorOriginal: f.valor, ordemOriginal: ordem,
                decisao: decisions[code], justificativa,
                verificacao: ['C', 'P'].includes(code) ? 'EXIGE_VERIFICACAO_DOCUMENTAL' : null,
                fonteApoio: [apoio(id, campo)], rotuloFinal: null, valorFinal: null, ordemFinal: null,
                ...(id === '13' && { comparadoCom: ['F-9-0', 'F-9-3', 'detalhes C2: Numeração documental divergente'] }) });
        });
        let novaOrdem = 0;
        (p.ligacoes ?? []).forEach((l, ordem) => {
            const key = `${id}>${l.id}`;
            const approval = REVISAO_LIGACOES[key], reject = REJEICOES_LIGACOES[key];
            assert.ok(Boolean(approval) !== Boolean(reject), key);
            usados.add(key);
            const destino = map.get(String(l.id));
            assert.ok(destino);
            ligacoes.push({ auditoriaId: `L-${key}`, origemEquipe: id, origemCanonica: identity.slug,
                destinoEquipe: String(l.id), destinoCanonico: destino.slug, textoOriginal: l.texto, ordemOriginal: ordem,
                decisao: approval?.[0] ?? reject[0], justificativa: approval?.[2] ?? reject[1],
                fonteApoio: approval ? approval[3].map(([i, campo]) => apoio(i, campo)) : [apoio(id, '$descricao'), apoio(l.id, '$descricao')],
                textoFinal: approval ? (approval[1] ?? l.texto) : null, ordemFinal: approval ? novaOrdem++ : null });
        });
    }
    assert.equal(fatos.length, 83); assert.equal(ligacoes.length, 27);
    assert.deepEqual([...usados].sort(), [...Object.keys(REVISAO_LIGACOES), ...Object.keys(REJEICOES_LIGACOES)].sort());
    const slugsCanonicos = [...new Set([...map.values()].map(x => x.slug)), missing].sort();
    assert.equal(slugsCanonicos.length, 34);
    const aprovadas = ligacoes.filter(l => l.decisao.startsWith('APROVAR'));
    const manifesto = { fatos: [], ligacoes: aprovadas.map(l => ({
        chave: `relacao:${l.destinoCanonico}`, origemSlug: l.origemCanonica, destinoSlug: l.destinoCanonico,
        texto: l.textoFinal, ordem: l.ordemFinal, aprovacao: l.decisao,
        auditoriaId: l.auditoriaId, fonteApoio: l.fonteApoio,
    })) };
    const contar = rows => rows.reduce((acc, row) => ({ ...acc, [row.decisao]: (acc[row.decisao] ?? 0) + 1 }), {});
    const auditoria = { versao: 'D1C-v1', fonteCanonicaSha256: CANONICAL_SHA,
        fonteEquipeSha256: digest('prisma/data/patrimonios.js'),
        criterio: 'Reuso documental da fonte canônica C1/C2; não é nova certificação externa. Informação nova ou divergente não foi aprovada.',
        cobertura: [...map.values()].map(x => ({ ...x, fatos: fatos.filter(f => f.idEquipe === x.idEquipe).length, ligacoes: ligacoes.filter(l => l.origemEquipe === x.idEquipe).length })),
        canonicoAusenteNaEquipePreservado: missing, contagens: { fatos: contar(fatos), ligacoes: contar(ligacoes) }, fatos, ligacoes };
    return { auditoria, manifesto, slugsCanonicos };
}

export function artefatos() {
    const { auditoria, manifesto, slugsCanonicos } = gerarCuradoria();
    const json = v => JSON.stringify(v, null, 2) + '\n';
    const cell = v => (v === null ? '—' : String(v)).replaceAll('|', '\\|').replaceAll('\n', ' ');
    const table = (headers, rows) => `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(r => `| ${r.map(cell).join(' | ')} |`).join('\n')}\n`;
    const source = a => a.fonteApoio.map(s => `${s.slug}: ${s.campo}`).join('; ');
    return new Map([
        ['prisma/data/patrimonioEditorialCurado.js', '// Gerado por scripts/gerar-curadoria-editorial.js; somente itens aprovados.\n'
            + `export const FONTE_CANONICA_SHA256 = ${JSON.stringify(CANONICAL_SHA)};\nexport const SLUGS_CANONICOS = ${json(slugsCanonicos).trimEnd()};\nexport const EDITORIAL_CURADO = ${json(manifesto).trimEnd()};\n`],
        ['reports/D1C-auditoria-editorial.json', json(auditoria)],
        ['reports/D1C-excluidos-editoriais.json', json({ fatos: auditoria.fatos, ligacoes: auditoria.ligacoes.filter(l => !l.decisao.startsWith('APROVAR')) })],
        ['reports/D1C-auditoria-editorial.md', '# D1C — auditoria item a item\n\n'
            + auditoria.criterio + ' Os trechos integrais, hashes e URLs documentais constam no JSON homônimo. Ordem original começa em zero. Campos finais nulos significam exclusão desta versão.\n\n'
            + '## Contagens\n\n```json\n' + json(auditoria.contagens) + '```\n\n'
            + '## Fatos (83)\n\n' + table(['ID auditoria', 'ID equipe', 'Patrimônio equipe', 'Slug canônico', 'Resolução', 'Rótulo original', 'Valor original', 'Ordem original', 'Decisão', 'Justificativa', 'Fonte/apoio', 'Rótulo final', 'Valor final', 'Ordem final'], auditoria.fatos.map(f => [f.auditoriaId, f.idEquipe, f.patrimonioEquipe, f.slugCanonico, f.resolucao, f.rotuloOriginal, f.valorOriginal, f.ordemOriginal, f.decisao, f.justificativa, source(f), f.rotuloFinal, f.valorFinal, f.ordemFinal]))
            + '\n## Ligações (27)\n\n' + table(['Origem equipe', 'Origem canônica', 'Destino equipe', 'Destino canônico', 'Texto original', 'Ordem original', 'Decisão', 'Justificativa', 'Fonte/apoio', 'Texto final', 'Ordem final'], auditoria.ligacoes.map(l => [l.origemEquipe, l.origemCanonica, l.destinoEquipe, l.destinoCanonico, l.textoOriginal, l.ordemOriginal, l.decisao, l.justificativa, source(l), l.textoFinal, l.ordemFinal]))
            + '\n## Cobertura sem inventar conteúdo\n\n' + table(['ID equipe', 'Slug', 'Fatos', 'Ligações'], auditoria.cobertura.map(c => [c.idEquipe, c.slug, c.fatos, c.ligacoes]))
            + `\nO canônico \`${auditoria.canonicoAusenteNaEquipePreservado}\` permanece preservado, embora ausente na equipe. Nenhum fato novo para Poço, Lavras ou Cultura Indígena. Alias 13→9 consolida identidade, sem criar patrimônio.\n\nOs cinco fatos sem suporte ficam pendentes. Os seis classificados CONTRADIZ_C1_C2 também exigem verificação documental antes de qualquer reconsideração, mas são contados como rejeitados nesta versão para não duplicar totais.\n`],
    ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const args = process.argv.slice(2);
    assert.ok(args.length <= 1 && (!args[0] || ['--check', '--write'].includes(args[0])));
    for (const [path, content] of artefatos()) {
        if (args[0] === '--write') writeFileSync(new URL(path, root), content);
        else assert.equal(readFileSync(new URL(path, root), 'utf8'), content, `${path} desatualizado`);
    }
    console.log('Curadoria: 83 fatos e 27 ligações auditados; artefatos consistentes.');
}
