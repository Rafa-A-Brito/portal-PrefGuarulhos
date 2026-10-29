import { store } from "./store.js";
import { page, find, clone } from "./helpers.js";

const entities = { USER: "Usuário", PATRIMONIO: "Patrimônio", IMAGEM: "Imagem", DOCUMENTO: "Documento", REGIAO: "Região", FATO: "Fato", LIGACAO: "Ligação", EXPOSICAO: "Exposição", NOVIDADE: "Novidade" };
const verbs = { CREATE: "criação", UPDATE: "edição", DELETE: "exclusão", PUBLISH: "publicação", ARCHIVE: "arquivamento", ACTIVATE: "ativação", DEACTIVATE: "desativação", REORDER: "reordenação", PASSWORD_CHANGE: "troca de senha" };
function summary(row) {
    const { oldValues: _old, newValues: _new, ...rest } = row, user = store.users.find(u => u.id === row.userId);
    const [prefix, ...verb] = row.action.split("_");
    return { ...clone(rest), user: user ? { id: user.id, name: user.name, email: user.email } : null,
        resumo: `${entities[prefix]}: ${verbs[verb.join("_")]}` };
}
export async function listarAuditoria(q) {
    return page(store.audit.filter(r => ["userId", "action", "entity", "entityId"].every(k => !q[k] || q[k] === r[k]) &&
        (!q.inicio || r.createdAt >= q.inicio) && (!q.fim || r.createdAt <= q.fim))
        .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).map(summary), q);
}
export async function detalharAuditoria(id) {
    const row = find(store.audit, id, "Evento de auditoria não encontrado."), registro = { id: row.entityId };
    if (["PatrimonioImagem", "PatrimonioDocumento", "PatrimonioFato", "PatrimonioLigacao"].includes(row.entity)) {
        const related = store.audit.filter(r => r.entity === row.entity && r.entityId === row.entityId);
        registro.patrimonioId = row.action.endsWith("_REORDER") ? row.entityId : related.flatMap(r => [r.newValues, r.oldValues])
            .map(v => v?.patrimonioId ?? v?.patrimonioOrigemId).find(Boolean)
            ?? store.patrimonios.find(p => [...p.imagens, ...p.documentos, ...p.fatos, ...p.ligacoes].some(r => r.id === row.entityId))?.id ?? null;
    }
    return { ...summary(row), registro, oldValues: clone(row.oldValues), newValues: clone(row.newValues) };
}
